"""Security helpers: password hashing, JWT tokens, current-user dependencies."""
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

import models
from config import config
from database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.status != "active":
        raise HTTPException(status_code=403, detail="Your account has been suspended")
    return user


def get_current_admin(user: models.User = Depends(get_current_user)) -> models.User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


def get_current_shop_user(user: models.User = Depends(get_current_user)) -> models.User:
    if user.role not in ("shop_owner", "staff"):
        raise HTTPException(status_code=403, detail="Shop account required")
    return user


def get_current_customer(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.Customer:
    """Customer JWT dependency — used to require Telegram login before checkout."""
    payload = decode_token(token)
    if payload.get("role") != "customer":
        raise HTTPException(status_code=401, detail="Please login with Telegram to continue")
    customer_id = payload.get("sub")
    if customer_id is None:
        raise HTTPException(status_code=401, detail="Invalid customer token")
    customer = db.query(models.Customer).filter(models.Customer.id == int(customer_id)).first()
    if not customer:
        raise HTTPException(status_code=401, detail="Customer not found")
    return customer


def require_shop_access(shop_id: int, user: models.User) -> None:
    """Admin can access any shop; shop users only their own shop."""
    if user.role == "admin":
        return
    if user.shop_id != shop_id:
        raise HTTPException(status_code=403, detail="You do not have access to this shop")


def log_activity(db: Session, action: str, description: str, shop_id: Optional[int] = None,
                 user: Optional[models.User] = None) -> None:
    db.add(models.ActivityLog(
        shop_id=shop_id,
        user_id=user.id if user else None,
        username=user.username if user else "system",
        action=action,
        description=description,
    ))
