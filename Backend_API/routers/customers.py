"""Customer CRUD endpoints + customer account auth (signup / signin)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from security import (create_access_token, get_current_customer, get_current_user,
                      hash_password, log_activity, require_shop_access, verify_password)

router = APIRouter(prefix="/api/customers", tags=["customers"])


def _customer_token(customer) -> dict:
    token = create_access_token({"sub": str(customer.id), "role": "customer",
                                 "shop_id": customer.shop_id})
    return {"access_token": token, "token_type": "bearer", "customer": customer.to_dict()}


def _normalize_username(value: str) -> str:
    """Usernames are case-insensitive login identifiers, stored trimmed."""
    return (value or "").strip()


@router.post("/auth/signup")
def customer_signup(data: schemas.CustomerSignup, db: Session = Depends(get_db)):
    """Customer account registration (username, first name, last name, gender, gmail, phone, telegram...)."""
    shop = db.query(models.Shop).filter(models.Shop.id == data.shop_id).first()
    if not shop or shop.status != "active":
        raise HTTPException(status_code=404, detail="Shop not found")
    if len(data.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    if not data.phone.strip():
        raise HTTPException(status_code=400, detail="Phone number is required")

    username = _normalize_username(data.username)
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    # Full name — accept a single "full_name" or the legacy first/last split.
    full_name = (data.full_name or "").strip()
    if not full_name:
        full_name = " ".join(x for x in [data.first_name.strip(), data.last_name.strip()] if x)
    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required")
    name_parts = full_name.split()
    first_name = name_parts[0]
    last_name = " ".join(name_parts[1:])

    existing = db.query(models.Customer).filter(
        models.Customer.shop_id == data.shop_id,
        or_(models.Customer.phone == data.phone.strip(),
            (models.Customer.email == data.email.strip() if data.email.strip() else False),
            func.lower(models.Customer.username) == username.lower())).first()
    if existing:
        raise HTTPException(status_code=400,
                            detail="An account with this username, phone or email already exists")

    telegram_handle = f"@{data.telegram_username}" if data.telegram_username else data.telegram_phone
    customer = models.Customer(
        shop_id=data.shop_id,
        username=username,
        first_name=first_name,
        last_name=last_name,
        gender=data.gender,
        name=full_name,
        phone=data.phone.strip(),
        email=data.email.strip(),
        password_hash=hash_password(data.password),
        telegram=telegram_handle,
        telegram_username=data.telegram_username,
        telegram_phone=data.telegram_phone,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    log_activity(db, "customer_signup", f"Customer {customer.name} signed up at shop {shop.id}", shop.id)
    db.commit()
    return _customer_token(customer)


@router.post("/auth/signin")
def customer_signin(data: schemas.CustomerSignin, db: Session = Depends(get_db)):
    """Customer login with username, email (gmail) or phone + password."""
    identifier = data.identifier.strip().lower()
    if not identifier:
        raise HTTPException(status_code=400, detail="Please enter your username, email or phone")
    customer = db.query(models.Customer).filter(
        models.Customer.shop_id == data.shop_id,
        or_(models.Customer.phone == identifier,
            models.Customer.email == identifier,
            func.lower(models.Customer.username) == identifier)).first()
    if not customer or not customer.password_hash:
        raise HTTPException(status_code=401, detail="No account found. Please sign up first.")
    if not verify_password(data.password, customer.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")
    return _customer_token(customer)


@router.get("/auth/me")
def customer_me(customer: models.Customer = Depends(get_current_customer)):
    return customer.to_dict()


@router.put("/auth/me")
def customer_update_me(data: schemas.CustomerUpdateSelf, db: Session = Depends(get_db),
                       customer: models.Customer = Depends(get_current_customer)):
    """Customer edits their own profile (name, username, gender, contacts, address)."""
    username = _normalize_username(data.username)
    if username:
        dup = db.query(models.Customer).filter(
            models.Customer.shop_id == customer.shop_id,
            func.lower(models.Customer.username) == username.lower(),
            models.Customer.id != customer.id).first()
        if dup:
            raise HTTPException(status_code=400, detail="Username already taken")
        customer.username = username

    full_name = (data.full_name or "").strip()
    if full_name:
        parts = full_name.split()
        customer.name = full_name
        customer.first_name = parts[0]
        customer.last_name = " ".join(parts[1:])
    if data.gender:
        customer.gender = data.gender
    if data.email.strip():
        customer.email = data.email.strip()
    if data.phone.strip():
        customer.phone = data.phone.strip()
    if data.telegram_username.strip():
        customer.telegram = f"@{data.telegram_username.strip()}"
        customer.telegram_username = data.telegram_username.strip()
    if data.telegram_phone.strip():
        customer.telegram_phone = data.telegram_phone.strip()
    if data.address is not None:
        customer.address = data.address
    if data.city is not None:
        customer.city = data.city
    if data.country is not None:
        customer.country = data.country

    db.commit()
    db.refresh(customer)
    log_activity(db, "customer_update_profile", f"Customer {customer.name} updated their profile",
                 customer.shop_id)
    db.commit()
    return customer.to_dict()


@router.post("/auth/change-password")
def customer_change_password(data: schemas.CustomerChangePassword, db: Session = Depends(get_db),
                             customer: models.Customer = Depends(get_current_customer)):
    """Customer changes their own password (requires the current password)."""
    if not customer.password_hash or not verify_password(data.current_password, customer.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters")
    customer.password_hash = hash_password(data.new_password)
    db.commit()
    return {"ok": True, "detail": "Password updated"}


@router.get("/auth/orders")
def customer_my_orders(customer: models.Customer = Depends(get_current_customer),
                       db: Session = Depends(get_db)):
    """Logged-in customer's full order history.

    Privacy: only the customer's OWN orders are returned (linked by customer_id).
    Legacy orders that have no customer link are included ONLY when they match
    this customer's phone OR telegram, so nobody else's orders ever leak.
    """
    conditions = [models.Order.customer_id == customer.id]
    legacy = []
    if customer.phone:
        legacy.append(and_(models.Order.customer_phone != "",
                           models.Order.customer_phone == customer.phone))
    if customer.telegram:
        legacy.append(and_(models.Order.customer_telegram != "",
                           models.Order.customer_telegram == customer.telegram))
    if legacy:
        conditions.append(and_(models.Order.customer_id.is_(None), or_(*legacy)))

    q = db.query(models.Order).filter(
        models.Order.shop_id == customer.shop_id,
        or_(*conditions))
    orders = q.order_by(models.Order.id.desc()).all()
    return {"customer": customer.to_dict(), "count": len(orders),
            "orders": [o.to_dict() for o in orders]}


@router.get("")
def list_customers(shop_id: int = Query(...), search: str = "",
                   db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_shop_access(shop_id, user)
    q = db.query(models.Customer).filter(models.Customer.shop_id == shop_id)
    if search:
        like = f"%{search}%"
        q = q.filter((models.Customer.name.ilike(like)) | (models.Customer.phone.ilike(like))
                     | (models.Customer.telegram.ilike(like)))
    customers = q.order_by(models.Customer.id.desc()).all()
    out = []
    for c in customers:
        d = c.to_dict()
        d["order_count"] = db.query(models.Order).filter(
            models.Order.customer_phone == c.phone,
            models.Order.shop_id == shop_id).count()
        out.append(d)
    return out


@router.get("/{customer_id}")
def get_customer(customer_id: int, db: Session = Depends(get_db),
                 user: models.User = Depends(get_current_user)):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    require_shop_access(customer.shop_id, user)
    d = customer.to_dict()
    d["orders"] = [o.to_dict() for o in db.query(models.Order).filter(
        models.Order.customer_phone == customer.phone,
        models.Order.shop_id == customer.shop_id).order_by(models.Order.id.desc()).all()]
    return d


@router.post("")
def create_customer(data: schemas.CustomerCreate, db: Session = Depends(get_db),
                    user: models.User = Depends(get_current_user)):
    require_shop_access(data.shop_id, user)
    customer = models.Customer(
        shop_id=data.shop_id, name=data.name, phone=data.phone,
        telegram=data.telegram, email=data.email, address=data.address,
        city=data.city, country=data.country, notes=data.notes)
    db.add(customer)
    log_activity(db, "create_customer", f"{user.username} created customer '{data.name}'", data.shop_id, user)
    db.commit()
    db.refresh(customer)
    return customer.to_dict()


@router.put("/{customer_id}")
def update_customer(customer_id: int, data: schemas.CustomerUpdate, db: Session = Depends(get_db),
                    user: models.User = Depends(get_current_user)):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    require_shop_access(customer.shop_id, user)
    for field in ("name", "phone", "telegram", "email", "address", "city", "country", "notes"):
        val = getattr(data, field)
        if val is not None:
            setattr(customer, field, val)
    log_activity(db, "update_customer", f"{user.username} updated customer '{customer.name}'",
                 customer.shop_id, user)
    db.commit()
    return customer.to_dict()


@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db),
                    user: models.User = Depends(get_current_user)):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    require_shop_access(customer.shop_id, user)
    db.delete(customer)
    db.commit()
    return {"ok": True}
