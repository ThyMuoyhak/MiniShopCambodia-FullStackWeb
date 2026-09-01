"""ABA Pay payment endpoints: create checkout, verify, webhook."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from security import get_current_user, log_activity, require_shop_access
from services import aba_service, pdf_service, stock_service, telegram_service
from services.aba_service import PaymentNotConfigured

router = APIRouter(prefix="/api/payments", tags=["payments"])


def _mark_paid(db, order, transaction_id, amount=None):
    """
    Mark an order paid atomically and deduct stock exactly ONCE.

    The verify endpoint is polled every 3 seconds AND the ABA webhook + success
    redirect can arrive at the same time. A naive check-and-set can cause both
    requests to see payment_status == 'pending' and each deduct stock (the
    double-deduction bug). Using a conditional UPDATE ... WHERE payment_status != 'paid'
    guarantees only the first request wins (SQLite serializes writers), so stock
    is deducted exactly once.
    """
    from datetime import datetime
    from sqlalchemy import update as sa_update

    if order.payment_status == "paid":
        return False

    tx = transaction_id or order.transaction_id
    result = db.execute(
        sa_update(models.Order)
        .where(models.Order.id == order.id,
               models.Order.payment_status != "paid")
        .values(payment_status="paid", paid_at=datetime.utcnow(),
                transaction_id=tx)
    )
    db.commit()
    if result.rowcount == 0:
        # Another request (webhook / poll / redirect) already marked it paid.
        db.refresh(order)
        return False

    db.refresh(order)
    # ⬇️ Auto-deduct stock on payment success (only the winning request reaches here)
    order._stock_summary = stock_service.deduct_stock_for_order(db, order)
    db.commit()
    return True


def _process_first_payment(db, order, shop):
    """Side effects for the FIRST successful payment confirmation:
    generate receipt, send Telegram payment alert, low-stock alert, activity log."""
    try:
        items = [i.to_dict() for i in order.items]
        order.receipt_url = pdf_service.generate_receipt(order, shop, items)
    except Exception:
        pass
    tg = shop.telegram_dict()
    if tg.get("enabled"):
        # Full-detail payment-success notification (items, customer, stock left)
        telegram_service.notify_shop_payment_success_full(
            shop, order, getattr(order, "_stock_summary", None))
    try:
        stock_service.send_low_stock_alerts(db, shop)
    except Exception:
        pass
    db.commit()
    log_activity(db, "payment_success", f"Payment confirmed for #{order.order_number} "
                 f"({order.total} {order.currency})", order.shop_id)
    db.commit()


@router.get("/aba/status")
def payment_status(shop_id: int, db: Session = Depends(get_db)):
    """Public: whether a shop has ABA Pay configured (controls QR display)."""
    shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return {"shop_id": shop_id, "configured": aba_service.is_configured(shop)}


@router.post("/aba/create")
def create_aba_payment(data: schemas.PaymentCreate, db: Session = Depends(get_db)):
    """Create a REAL ABA Pay (KHQRcc) checkout URL + KHQR for an order (public)."""
    order = db.query(models.Order).filter(models.Order.id == data.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    shop = db.query(models.Shop).filter(models.Shop.id == order.shop_id).first()

    try:
        result = aba_service.build_checkout_url(
            order, shop, success_url=data.success_url, error_url=data.error_url, cancel_url=data.cancel_url)
    except PaymentNotConfigured as e:
        raise HTTPException(status_code=400, detail=str(e))

    order.transaction_id = result["transaction_id"]
    db.commit()
    return result


@router.post("/aba/verify")
def verify_aba_payment(data: schemas.PaymentVerify, db: Session = Depends(get_db)):
    """Verify payment against the real KHQRcc Verify V2 API."""
    order = db.query(models.Order).filter(models.Order.id == data.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    shop = db.query(models.Shop).filter(models.Shop.id == order.shop_id).first()

    result = aba_service.verify_payment(order, shop, transaction_id=data.transaction_id)
    if result.get("verified"):
        newly_paid = _mark_paid(db, order, result.get("transaction_id") or data.transaction_id, result.get("amount"))
        if newly_paid:
            _process_first_payment(db, order, shop)
    return result


@router.post("/aba/webhook")
async def aba_webhook(request: Request, db: Session = Depends(get_db)):
    """Webhook callback for ABA Pay. Accepts form/JSON payloads."""
    try:
        payload = await request.json()
    except Exception:
        form = await request.form()
        payload = {k: v for k, v in form.items()}

    tran_id = payload.get("tran_id") or payload.get("transaction_id") or ""
    status = payload.get("status") or payload.get("transaction_status") or ""
    order = db.query(models.Order).filter(models.Order.transaction_id == tran_id).first()
    if not order:
        return {"ok": False, "detail": "transaction not found"}

    if str(status).lower() in ("successful", "success", "approved", "paid", "SUCCESS"):
        newly_paid = _mark_paid(db, order, tran_id, payload.get("amount"))
        if newly_paid:
            shop = db.query(models.Shop).filter(models.Shop.id == order.shop_id).first()
            _process_first_payment(db, order, shop)
    elif str(status).lower() in ("failed", "cancelled", "declined"):
        order.payment_status = "failed"
        db.commit()
    return {"ok": True}


@router.get("/aba/success")
def aba_success(order_id: int, db: Session = Depends(get_db)):
    """Success landing page redirect (customer-friendly)."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if order:
        newly_paid = _mark_paid(db, order, order.transaction_id, None)
        if newly_paid:
            shop = db.query(models.Shop).filter(models.Shop.id == order.shop_id).first()
            _process_first_payment(db, order, shop)
    return {"ok": True, "detail": "Payment success", "order_id": order_id}


@router.get("/aba/error")
def aba_error(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if order:
        order.payment_status = "failed"
        db.commit()
    return {"ok": False, "detail": "Payment error", "order_id": order_id}


@router.post("/aba/test")
def test_payment(shop_id: int, db: Session = Depends(get_db),
                 user: models.User = Depends(get_current_user)):
    """Test ABA configuration by building a real KHQRcc checkout URL."""
    require_shop_access(shop_id, user)
    shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    aba = shop.aba_dict()
    profile_id = aba.get("profile_id", "")
    secret_key = aba.get("secret_key", "")
    if not profile_id or not secret_key:
        raise HTTPException(status_code=400, detail="ABA Pay profile ID and secret key are not configured")
    tran_id = aba_service.generate_transaction_id("TEST")
    amount = "1.00"
    success_url = "http://localhost:3000"
    remark = "Mini Shop platform test"
    h = aba_service.aba_hash(secret_key, tran_id, amount, success_url, remark)
    checkout_url = (
        f"{aba_service.KHQRCC_BASE}/payment/requestv2/{profile_id}"
        f"?transaction_id={tran_id}&amount={amount}&success_url={success_url}"
        f"&remark={remark}&hash={h}"
    )
    return {
        "ok": True,
        "profile_id": profile_id,
        "transaction_id": tran_id,
        "amount": amount,
        "hash": h,
        "checkout_url": checkout_url,
    }

