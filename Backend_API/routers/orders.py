"""Order endpoints: public create/list, owner management, receipts."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from security import (get_current_customer, get_current_shop_user, get_current_user,
                      log_activity, require_shop_access)
from services import pdf_service
from utils.helpers import generate_order_number
from routers.payments import _mark_paid, _process_first_payment

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("")
def create_order(data: schemas.OrderCreate, db: Session = Depends(get_db),
                 customer: models.Customer = Depends(get_current_customer)):
    """
    Create an order. REQUIRES a valid customer JWT (real Telegram login).

    If the customer is not logged in via Telegram, this returns 401 so the
    storefront blocks checkout until the user logs in.
    """
    shop = db.query(models.Shop).filter(models.Shop.id == data.shop_id).first()
    if not shop or shop.status != "active":
        raise HTTPException(status_code=404, detail="Shop not found or unavailable")
    if not data.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")
    if customer.shop_id != data.shop_id:
        raise HTTPException(status_code=403, detail="This account is not registered at this shop")

    # Link the order to the logged-in Telegram customer
    customer_telegram = data.customer_telegram or customer.telegram or f"tg{customer.telegram_id}"
    order = models.Order(
        shop_id=data.shop_id,
        customer_id=customer.id,
        order_number=generate_order_number(data.shop_id),
        customer_name=data.customer_name or customer.name,
        customer_email=data.customer_email,
        customer_phone=data.customer_phone or customer.phone,
        customer_telegram=customer_telegram,
        customer_address=data.customer_address,
        customer_city=data.customer_city,
        customer_country=data.customer_country,
        customer_note=data.customer_note,
        shipping_fee=data.shipping_fee,
        discount=data.discount,
        currency=data.currency or shop.currency or "USD",
    )

    items_total = 0.0
    for item in data.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        unit_price = item.price
        if product:
            unit_price = product.sale_price if product.sale_price is not None else product.price
            # Stock is NOT deducted here — it is deducted automatically when the
            # payment is confirmed successful (see payments._mark_paid).
        items_total += float(unit_price) * item.quantity
        db.add(models.OrderItem(
            order=order,
            product_id=item.product_id,
            product_name=item.name or (product.name if product else "Product"),
            price=float(unit_price),
            quantity=item.quantity,
            variations=models.JSONText.dumps(item.variations),
        ))

    order.items_total = round(items_total, 2)
    order.total = round(items_total + float(data.shipping_fee) - float(data.discount), 2)

    # Upsert customer for the shop (the logged-in Telegram customer is primary)
    existing = db.query(models.Customer).filter(
        models.Customer.shop_id == data.shop_id,
        models.Customer.telegram_id == customer.telegram_id).first()
    if not existing:
        existing = db.query(models.Customer).filter(
            models.Customer.shop_id == data.shop_id,
            models.Customer.phone == data.customer_phone,
            models.Customer.name == data.customer_name).first()
    if existing:
        existing.telegram_id = customer.telegram_id or existing.telegram_id
        existing.telegram = data.customer_telegram or customer.telegram or existing.telegram
        existing.phone = data.customer_phone or existing.phone
        existing.address = data.customer_address or existing.address
        existing.city = data.customer_city or existing.city
        existing.country = data.customer_country or existing.country
        existing.email = data.customer_email or existing.email
    else:
        db.add(models.Customer(
            shop_id=data.shop_id, name=data.customer_name or customer.name,
            phone=data.customer_phone or customer.phone,
            telegram=data.customer_telegram or customer.telegram,
            telegram_id=customer.telegram_id,
            email=data.customer_email, address=data.customer_address,
            city=data.customer_city, country=data.customer_country))

    db.add(order)
    db.commit()
    db.refresh(order)

    # NOTE: no "new order" Telegram notification here — the shop's Telegram group
    # only receives a message when the payment is CONFIRMED SUCCESSFUL
    # (full details + updated stock; see payments._process_first_payment).

    log_activity(db, "create_order", f"New order #{order.order_number} ({order.total} {order.currency})",
                 data.shop_id)
    db.commit()
    return order.to_dict()


@router.post("/pos")
def create_pos_order(data: schemas.POSOrderCreate, db: Session = Depends(get_db),
                     user: models.User = Depends(get_current_shop_user)):
    """
    POS sale created by the shop owner.
      - payment_method 'cash' (បង់ប្រាក់ផ្ទាល់): order is paid immediately →
        stock is deducted and the full payment-success message is sent to Telegram.
      - payment_method 'khqr': order stays pending; the frontend then calls
        /api/payments/aba/create and only when payment is confirmed does stock
        decrease and Telegram get notified.
    """
    require_shop_access(data.shop_id, user)
    shop = db.query(models.Shop).filter(models.Shop.id == data.shop_id).first()
    if not shop or shop.status != "active":
        raise HTTPException(status_code=404, detail="Shop not found")
    if not data.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    order = models.Order(
        shop_id=data.shop_id,
        order_number=generate_order_number(data.shop_id),
        customer_name=data.customer_name or "POS Customer",
        customer_phone=data.customer_phone or "",
        customer_note=data.customer_note or "POS sale",
        shipping_fee=0,
        discount=data.discount or 0,
        currency=shop.currency or "USD",
        payment_method=data.payment_method if data.payment_method in ("cash", "khqr") else "cash",
    )

    items_total = 0.0
    for item in data.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product or product.shop_id != data.shop_id:
            raise HTTPException(status_code=400, detail=f"Product #{item.product_id} not found in this shop")

        # Resolve price: variation price > sale price > base price.
        unit_price = product.sale_price if product.sale_price is not None else product.price
        if item.variations:
            try:
                variations = models.JSONText.loads(product.variations, []) if product.variations else []
                for v in variations:
                    attrs = v.get("attrs") or {}
                    if all(str(attrs.get(k)) == str(val) for k, val in (item.variations or {}).items()):
                        if v.get("price"):
                            unit_price = float(v["price"])
                        break
            except Exception:
                pass

        items_total += float(unit_price or 0) * int(item.quantity or 1)
        db.add(models.OrderItem(
            order=order,
            product_id=item.product_id,
            product_name=item.name or product.name,
            price=round(float(unit_price or 0), 2),
            quantity=item.quantity,
            variations=models.JSONText.dumps(item.variations or {}),
        ))

    order.items_total = round(items_total, 2)
    order.total = round(items_total - float(data.discount or 0), 2)
    db.add(order)
    db.commit()
    db.refresh(order)

    log_activity(db, "pos_order", f"{user.username} created POS order #{order.order_number} "
                 f"({order.total} {order.currency})", data.shop_id, user)
    db.commit()

    result = {"order": order.to_dict(), "paid": False}

    # Cash payment (បង់ប្រាក់ផ្ទាល់): mark paid now → stock deducts + Telegram sends.
    if order.payment_method == "cash":
        newly = _mark_paid(db, order, f"POS-{order.id}", order.total)
        if newly:
            _process_first_payment(db, order, shop)
        db.refresh(order)
        result["paid"] = True
        result["order"] = order.to_dict()

    return result


@router.post("/public/history")
def customer_order_history(data: schemas.CustomerHistoryRequest, db: Session = Depends(get_db)):
    """
    Customer order history (secure per-shop).

    The customer "logs in" with their phone number and/or Telegram username —
    matching ONLY their own orders for this shop, so one customer cannot see
    another customer's history. At least one of phone / telegram is required.
    """
    if not data.phone.strip() and not data.telegram.strip():
        raise HTTPException(status_code=400,
                            detail="Please provide your phone number or Telegram username")

    q = db.query(models.Order).filter(models.Order.shop_id == data.shop_id)
    if data.phone.strip() and data.telegram.strip():
        q = q.filter(or_(models.Order.customer_phone == data.phone.strip(),
                         models.Order.customer_telegram == data.telegram.strip()))
    elif data.phone.strip():
        q = q.filter(models.Order.customer_phone == data.phone.strip())
    else:
        q = q.filter(models.Order.customer_telegram == data.telegram.strip())

    orders = q.order_by(models.Order.id.desc()).all()
    return {
        "shop_id": data.shop_id,
        "customer": {
            "phone": data.phone.strip(),
            "telegram": data.telegram.strip(),
        },
        "count": len(orders),
        "orders": [o.to_dict() for o in orders],
    }


@router.get("/public/track")
def track_order(order_number: str = Query(...), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.order_number == order_number).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order.to_dict()


@router.get("")
def list_orders(shop_id: int = Query(...), status: str = "",
                db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_shop_access(shop_id, user)
    q = db.query(models.Order).filter(models.Order.shop_id == shop_id)
    if status:
        q = q.filter(models.Order.order_status == status)
    orders = q.order_by(models.Order.id.desc()).all()
    return [o.to_dict() for o in orders]


@router.get("/all")
def list_all_orders(db: Session = Depends(get_db), admin: models.User = Depends(get_current_user)):
    orders = db.query(models.Order).order_by(models.Order.id.desc()).limit(500).all()
    return [o.to_dict() for o in orders]


@router.get("/{order_id}")
def get_order(order_id: int, db: Session = Depends(get_db),
              user: models.User = Depends(get_current_user)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    require_shop_access(order.shop_id, user)
    return order.to_dict()


@router.put("/{order_id}/status")
def update_order_status(order_id: int, data: schemas.OrderStatusUpdate, db: Session = Depends(get_db),
                        user: models.User = Depends(get_current_user)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    require_shop_access(order.shop_id, user)
    if data.order_status:
        order.order_status = data.order_status
    if data.payment_status:
        order.payment_status = data.payment_status
    log_activity(db, "update_order", f"{user.username} updated order #{order.order_number} "
                 f"(status={order.order_status}, payment={order.payment_status})", order.shop_id, user)
    db.commit()
    return order.to_dict()


@router.get("/{order_id}/receipt")
def generate_order_receipt(order_id: int, db: Session = Depends(get_db),
                           user: models.User = Depends(get_current_user)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    require_shop_access(order.shop_id, user)
    shop = db.query(models.Shop).filter(models.Shop.id == order.shop_id).first()
    items = [i.to_dict() for i in order.items]
    try:
        url = pdf_service.generate_receipt(order, shop, items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Receipt generation failed: {e}")
    order.receipt_url = url
    db.commit()
    return {"receipt_url": url}


@router.delete("/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db),
                 user: models.User = Depends(get_current_user)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    require_shop_access(order.shop_id, user)
    db.delete(order)
    db.commit()
    return {"ok": True}

