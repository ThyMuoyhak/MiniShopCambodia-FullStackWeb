"""Authentication endpoints."""
import hashlib
import secrets
import time
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from security import (create_access_token, get_current_admin, get_current_customer,
                      get_current_user, hash_password, log_activity, verify_password)
from services import telegram_service

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Lockout policy: 3 wrong passwords -> account locked.
# First lock = 5 minutes; every further lock adds 5 more (5, 10, 15, 20 ...).
MAX_FAILED_ATTEMPTS = 3
BASE_LOCK_MINUTES = 5

# In-memory protection for usernames that don't exist (no DB row to count on).
_unknown_attempts = {}


def _fmt_lock_wait(wait_seconds: int) -> str:
    m, s = int(wait_seconds // 60), int(wait_seconds % 60)
    if m and s:
        return f"{m} min {s} sec"
    if m:
        return f"{m} min"
    return f"{s} sec"


def _lock_minutes_for(user) -> int:
    """Escalating lock length: 5 minutes for the first lock, +5 each time."""
    return BASE_LOCK_MINUTES * ((user.login_locked_count or 0) + 1)


def _check_lock(user, db, now):
    """Raise 429 while an account is locked; clear expired locks."""
    if user.login_locked_until and user.login_locked_until > now:
        wait = int((user.login_locked_until - now).total_seconds())
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. Account is locked — try again in {_fmt_lock_wait(wait)}.")
    if user.login_locked_until:
        # lock expired -> give a fresh set of attempts
        user.login_locked_until = None
        user.login_failed_count = 0
        db.commit()
    return now


def _register_failed_attempt(user, db, now):
    """Count a wrong password; lock the account when the limit is reached."""
    user.login_failed_count = (user.login_failed_count or 0) + 1
    if user.login_failed_count >= MAX_FAILED_ATTEMPTS:
        user.login_locked_count = (user.login_locked_count or 0) + 1
        minutes = BASE_LOCK_MINUTES * (user.login_locked_count or 1)  # 5, 10, 15 ...
        user.login_locked_until = now + timedelta(minutes=minutes)
        user.login_failed_count = 0
        db.commit()
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. Account locked for {minutes} minutes — try again later.")
    remaining = MAX_FAILED_ATTEMPTS - user.login_failed_count
    next_minutes = _lock_minutes_for(user)
    db.commit()
    raise HTTPException(
        status_code=401,
        detail=f"Invalid username or password — {remaining} attempt(s) left, then your account is locked for {next_minutes} minutes.")


def _attempt_login(db, username: str, password: str) -> models.User:
    """Validate credentials with failed-attempt lockout. Returns the user or raises."""
    now = datetime.utcnow()
    user = db.query(models.User).filter(
        or_(models.User.username == username,
            models.User.email == username)).first()

    if not user:
        # Unknown username -> lightweight in-memory lockout (reset on restart).
        key = (username or "").strip().lower()
        if key:
            ent = _unknown_attempts.setdefault(key, {"count": 0, "locked_until": 0, "level": 0})
            if ent["locked_until"] and time.time() < ent["locked_until"]:
                raise HTTPException(
                    status_code=429,
                    detail=f"Too many failed attempts. Account is locked — try again in {_fmt_lock_wait(int(ent['locked_until'] - time.time()))}.")
            ent["count"] += 1
            if ent["count"] >= MAX_FAILED_ATTEMPTS:
                ent["level"] += 1
                minutes = BASE_LOCK_MINUTES * ent["level"]
                ent["locked_until"] = time.time() + minutes * 60
                ent["count"] = 0
                raise HTTPException(
                    status_code=429,
                    detail=f"Too many failed attempts. Account locked for {minutes} minutes — try again later.")
            remaining = MAX_FAILED_ATTEMPTS - ent["count"]
            raise HTTPException(
                status_code=401,
                detail=f"Invalid username or password — {remaining} attempt(s) left, then your account is locked for {BASE_LOCK_MINUTES * (ent['level'] + 1)} minutes.")
        raise HTTPException(status_code=401, detail="Invalid username or password")

    _check_lock(user, db, now)
    if not verify_password(password, user.password_hash):
        _register_failed_attempt(user, db, now)  # always raises
    # Success: clear any failed-attempt state
    user.login_failed_count = 0
    user.login_locked_until = None
    db.commit()
    return user


@router.post("/telegram/login")
def telegram_login(data: schemas.TelegramAuthRequest, db: Session = Depends(get_db)):
    """
    Customer login via the real Telegram Login Widget.

    Verifies the HMAC-SHA256 signature using the SHOP's own bot token, then
    creates / returns the customer JWT that is REQUIRED to place an order.
    """
    shop = db.query(models.Shop).filter(models.Shop.id == data.shop_id).first()
    if not shop or shop.status != "active":
        raise HTTPException(status_code=404, detail="Shop not found")

    tg = shop.telegram_dict()
    bot_token = (tg.get("bot_token") or "").strip()
    if not bot_token:
        raise HTTPException(status_code=400,
                            detail="Telegram login is not enabled for this shop yet")

    auth_payload = data.model_dump(exclude_unset=True, exclude={"shop_id"})
    if not telegram_service.verify_telegram_login(bot_token, auth_payload):
        raise HTTPException(status_code=401, detail="Telegram authentication failed")

    telegram_handle = f"@{data.username}" if data.username else f"tg{data.id}"
    display_name = " ".join(x for x in [data.first_name, data.last_name] if x) or f"User {data.id}"

    # Find or create the customer record for this shop + telegram account
    customer = db.query(models.Customer).filter(
        models.Customer.shop_id == shop.id,
        models.Customer.telegram_id == data.id).first()
    if not customer:
        customer = models.Customer(
            shop_id=shop.id,
            name=display_name,
            telegram=telegram_handle,
            telegram_id=data.id,
            notes=f"Telegram login · tg://user?id={data.id}",
        )
        db.add(customer)
        db.flush()

    # Keep display info fresh
    customer.name = display_name
    if data.username:
        customer.telegram = telegram_handle
    db.commit()
    db.refresh(customer)

    token = create_access_token({"sub": str(customer.id), "role": "customer",
                                 "shop_id": shop.id, "tg_id": data.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "customer": customer.to_dict(),
    }


@router.post("/telegram/request-code")
def request_telegram_code(data: schemas.TelegramCodeRequest, db: Session = Depends(get_db)):
    """
    Fallback Telegram login (no BotFather domain needed): sends a 6-digit code
    to the customer's Telegram account via the shop's bot.
    """
    shop = db.query(models.Shop).filter(models.Shop.id == data.shop_id).first()
    if not shop or shop.status != "active":
        raise HTTPException(status_code=404, detail="Shop not found")
    tg = shop.telegram_dict()
    bot_token = (tg.get("bot_token") or "").strip()
    if not bot_token:
        raise HTTPException(status_code=400, detail="Telegram login is not enabled for this shop yet")

    code = f"{secrets.randbelow(900000) + 100000}"  # 6-digit
    from datetime import datetime, timedelta
    # Remove old unused codes for this shop + user
    db.query(models.TelegramCode).filter(
        models.TelegramCode.shop_id == shop.id,
        models.TelegramCode.telegram_id == data.telegram_id).delete()
    db.add(models.TelegramCode(
        shop_id=shop.id,
        telegram_id=data.telegram_id,
        code_hash=hashlib.sha256(code.encode()).hexdigest(),
        expires_at=datetime.utcnow() + timedelta(minutes=5),
    ))
    db.commit()

    ok = telegram_service.send_verification_code(bot_token, data.telegram_id, code)
    if not ok:
        bot_username = telegram_service.get_bot_username(bot_token) or "the bot"
        raise HTTPException(status_code=400,
                            detail=f"Could not send the code. The customer must open @{bot_username} "
                                   "in Telegram and press Start first.")
    return {"ok": True, "detail": "Verification code sent to your Telegram"}


@router.post("/telegram/verify-code")
def verify_telegram_code(data: schemas.TelegramCodeVerifyRequest, db: Session = Depends(get_db)):
    """Verify the code and create the customer session (fallback login)."""
    from datetime import datetime
    shop = db.query(models.Shop).filter(models.Shop.id == data.shop_id).first()
    if not shop or shop.status != "active":
        raise HTTPException(status_code=404, detail="Shop not found")

    record = db.query(models.TelegramCode).filter(
        models.TelegramCode.shop_id == shop.id,
        models.TelegramCode.telegram_id == data.telegram_id).first()
    if not record:
        raise HTTPException(status_code=400, detail="No code was requested. Please request a new code.")
    if record.expires_at and record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="The code has expired. Please request a new code.")
    if record.code_hash != hashlib.sha256(data.code.strip().encode()).hexdigest():
        raise HTTPException(status_code=401, detail="Invalid verification code")

    # Code is used — remove it
    db.delete(record)

    telegram_handle = f"tg{data.telegram_id}"
    customer = db.query(models.Customer).filter(
        models.Customer.shop_id == shop.id,
        models.Customer.telegram_id == data.telegram_id).first()
    if not customer:
        customer = models.Customer(
            shop_id=shop.id, name=f"User {data.telegram_id}",
            telegram=telegram_handle, telegram_id=data.telegram_id,
            notes=f"Telegram login (code) · tg://user?id={data.telegram_id}")
        db.add(customer)
        db.flush()

    db.commit()
    db.refresh(customer)

    token = create_access_token({"sub": str(customer.id), "role": "customer",
                                 "shop_id": shop.id, "tg_id": data.telegram_id})
    return {"access_token": token, "token_type": "bearer", "customer": customer.to_dict()}


@router.get("/telegram/me")
def telegram_me(customer: models.Customer = Depends(get_current_customer)):
    return customer.to_dict()


@router.post("/login", response_model=schemas.TokenResponse)
def login(form: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Login for admin, shop owner and staff (username or email).

    Failed-attempt lockout: 3 wrong passwords lock the account for 5 minutes,
    and every additional lock adds 5 more minutes (5, 10, 15 ...).
    """
    user = _attempt_login(db, form.username, form.password)
    if user.status != "active":
        raise HTTPException(status_code=403, detail="Account is suspended. Contact admin via Telegram @your_telegram")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    log_activity(db, "login", f"{user.username} logged in", user.shop_id, user)
    db.commit()
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "username": user.username, "email": user.email,
                 "role": user.role, "shop_id": user.shop_id, "status": user.status},
    }


@router.post("/login/oauth2")
def login_oauth2(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = _attempt_login(db, form.username, form.password)
    if user.status != "active":
        raise HTTPException(status_code=403, detail="Account is suspended")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/register", response_model=schemas.TokenResponse)
def register(data: schemas.RegisterRequest, db: Session = Depends(get_db),
             admin: models.User = Depends(get_current_admin)):
    """Admin only: create a shop account (no self registration)."""
    if db.query(models.User).filter(models.User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    shop_id = data.shop_id
    if data.shop_username or data.shop_name:
        shop = db.query(models.Shop).filter(models.Shop.username == (data.shop_username or "")).first()
        if not shop and data.shop_username:
            shop = models.Shop(username=data.shop_username, shop_name=data.shop_name)
            db.add(shop)
            db.flush()
        if shop:
            shop_id = shop.id

    user = models.User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role if data.role in ("admin", "shop_owner", "staff") else "shop_owner",
        shop_id=shop_id,
    )
    db.add(user)
    log_activity(db, "create_user", f"Admin created user {user.username} (role={user.role})", shop_id, admin)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "username": user.username, "email": user.email,
                 "role": user.role, "shop_id": user.shop_id, "status": user.status},
    }


@router.post("/change-password")
def change_password(data: schemas.UserChangePassword, db: Session = Depends(get_db),
                    user: models.User = Depends(get_current_user)):
    """Admin / shop owner / staff change their own password."""
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"ok": True, "detail": "Password updated"}


@router.get("/me")
def me(user: models.User = Depends(get_current_user)):
    return {"id": user.id, "username": user.username, "email": user.email,
            "role": user.role, "shop_id": user.shop_id, "status": user.status}


@router.get("/users")
def list_users(db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    users = db.query(models.User).order_by(models.User.id).all()
    return [{"id": u.id, "username": u.username, "email": u.email, "role": u.role,
             "shop_id": u.shop_id, "shop_name": u.shop.shop_name if u.shop else None,
             "status": u.status, "created_at": models._iso(u.created_at)}
            for u in users]


@router.put("/users/{user_id}")
def update_user(user_id: int, data: schemas.UserUpdate, db: Session = Depends(get_db),
                admin: models.User = Depends(get_current_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.email is not None:
        user.email = data.email
    if data.role is not None:
        user.role = data.role
    if data.shop_id is not None:
        user.shop_id = data.shop_id
    if data.status is not None:
        user.status = data.status
    if data.password:
        user.password_hash = hash_password(data.password)
    log_activity(db, "update_user", f"Admin updated user {user.username}", user.shop_id, admin)
    db.commit()
    return {"ok": True}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin" and user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account")
    db.delete(user)
    db.commit()
    return {"ok": True}
