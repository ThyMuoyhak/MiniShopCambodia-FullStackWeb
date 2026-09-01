"""Shop endpoints (public lookup, admin management, owner settings)."""
import os

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

import models
import schemas
from config import config
from database import get_db
from security import (get_current_admin, get_current_shop_user, get_current_user,
                      hash_password, log_activity, require_shop_access)
from services import qr_service
from services.telegram_service import get_bot_username

router = APIRouter(prefix="/api/shops", tags=["shops"])


@router.get("/{username}")
def get_shop_by_username(username: str, db: Session = Depends(get_db)):
    """Public: get shop by username."""
    shop = db.query(models.Shop).filter(models.Shop.username == username).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    if shop.status != "active" or shop.is_expired():
        raise HTTPException(status_code=404, detail="Shop not found or unavailable")
    d = shop.to_dict(include_private=False)
    aba = shop.aba_dict()
    d["payment_configured"] = bool((aba.get("profile_id") or "").strip()
                                   and (aba.get("secret_key") or "").strip())
    # Telegram login (real "Login with Telegram" widget)
    tg = shop.telegram_dict()
    bot_token = (tg.get("bot_token") or "").strip()
    d["telegram_login_enabled"] = bool(bot_token)
    d["telegram_bot_username"] = get_bot_username(bot_token) if bot_token else None
    return d


@router.get("/public/{shop_id}")
def get_shop_by_id_public(shop_id: int, db: Session = Depends(get_db)):
    shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    if shop.status != "active" or shop.is_expired():
        raise HTTPException(status_code=404, detail="Shop not found or unavailable")
    return shop.to_dict(include_private=False)


@router.get("")
def list_shops(db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    shops = db.query(models.Shop).order_by(models.Shop.id).all()
    out = []
    for s in shops:
        d = s.to_dict(include_private=True)
        d["product_count"] = db.query(models.Product).filter(models.Product.shop_id == s.id).count()
        d["category_count"] = db.query(models.Category).filter(models.Category.shop_id == s.id).count()
        d["order_count"] = db.query(models.Order).filter(models.Order.shop_id == s.id).count()
        d["user_count"] = db.query(models.User).filter(models.User.shop_id == s.id).count()
        out.append(d)
    return out


@router.get("/{shop_id}/detail")
def get_shop_detail(shop_id: int, db: Session = Depends(get_db),
                    user: models.User = Depends(get_current_user)):
    require_shop_access(shop_id, user)
    shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    d = shop.to_dict(include_private=True)
    d["product_count"] = db.query(models.Product).filter(models.Product.shop_id == shop.id).count()
    d["category_count"] = db.query(models.Category).filter(models.Category.shop_id == shop.id).count()
    d["order_count"] = db.query(models.Order).filter(models.Order.shop_id == shop.id).count()
    d["user_count"] = db.query(models.User).filter(models.User.shop_id == shop.id).count()
    return d


@router.get("/{shop_id}/owner")
def check_shop_owner(shop_id: int, db: Session = Depends(get_db),
                     user: models.User = Depends(get_current_user)):
    """Return whether the logged-in account owns this shop (server-side check).

    The storefront shows the "Dashboard" button for a shop only when this
    endpoint confirms the signed-in user is that shop's owner/staff.
    """
    is_owner = (user.shop_id == shop_id and user.role in ("shop_owner", "staff"))
    return {"shop_id": shop_id, "is_owner": is_owner, "role": user.role}


@router.post("")
def create_shop(data: schemas.ShopCreate, db: Session = Depends(get_db),
                admin: models.User = Depends(get_current_admin)):
    """Admin creates a new shop + its owner account."""
    if db.query(models.Shop).filter(models.Shop.username == data.username).first():
        raise HTTPException(status_code=400, detail="Shop username already exists")
    shop = models.Shop(username=data.username, shop_name=data.shop_name or data.username,
                       currency=data.currency)
    db.add(shop)
    db.flush()
    owner = models.User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        role="shop_owner",
        shop_id=shop.id,
    )
    db.add(owner)
    log_activity(db, "create_shop", f"Admin created shop {shop.username}", shop.id, admin)
    db.commit()
    return shop.to_dict(include_private=True)


@router.put("/{shop_id}/update")
def update_shop(shop_id: int, data: schemas.ShopUpdate, db: Session = Depends(get_db),
                user: models.User = Depends(get_current_user)):
    """Owner or admin updates shop settings."""
    require_shop_access(shop_id, user)
    shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    fields = {
        "shop_name": "shop_name", "username": "username", "logo": "logo",
        "banner": "banner", "bio": "bio", "description": "description",
        "currency": "currency", "contact": "contact", "status": "status",
    }
    for src, dst in fields.items():
        val = getattr(data, src)
        if val is not None:
            setattr(shop, dst, val)
    if data.slideshow is not None:
        shop.slideshow = models.JSONText.dumps(data.slideshow)
    if data.social_media is not None:
        shop.social_media = models.JSONText.dumps(data.social_media)
    if data.theme is not None:
        shop.theme = models.JSONText.dumps(data.theme)
    if data.aba_settings is not None:
        shop.aba_settings = models.JSONText.dumps(data.aba_settings)
    if data.telegram_settings is not None:
        shop.telegram_settings = models.JSONText.dumps(data.telegram_settings)

    log_activity(db, "update_shop", f"{user.username} updated shop {shop.username}", shop.id, user)
    db.commit()
    return shop.to_dict(include_private=True)


@router.put("/{shop_id}/status")
def toggle_shop_status(shop_id: int, data: dict, db: Session = Depends(get_db),
                       admin: models.User = Depends(get_current_admin)):
    shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    shop.status = data.get("status", shop.status)
    log_activity(db, "shop_status", f"Admin set shop {shop.username} status={shop.status}", shop.id, admin)
    db.commit()
    return shop.to_dict(include_private=True)


@router.delete("/{shop_id}")
def delete_shop(shop_id: int, db: Session = Depends(get_db),
                admin: models.User = Depends(get_current_admin)):
    shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    db.delete(shop)
    db.commit()
    return {"ok": True}


@router.post("/{shop_id}/set-expiry")
def set_shop_expiry(shop_id: int, data: schemas.ShopExpirySet, db: Session = Depends(get_db),
                    admin: models.User = Depends(get_current_admin)):
    """Admin sets/extends a shop subscription. days=0 clears the expiry date."""
    from datetime import datetime, timedelta

    shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    if data.days < 0:
        raise HTTPException(status_code=400, detail="Days cannot be negative")
    if data.days == 0:
        shop.expires_at = None
    else:
        base = shop.expires_at if (shop.expires_at and shop.expires_at > datetime.utcnow()) else datetime.utcnow()
        shop.expires_at = base + timedelta(days=data.days)
    log_activity(db, "set_shop_expiry",
                 f"Admin set shop {shop.username} expiry to "
                 f"{shop.expires_at.isoformat() if shop.expires_at else 'none'} "
                 f"({data.days} days)", shop.id, admin)
    db.commit()
    return shop.to_dict(include_private=True)


@router.post("/{shop_id}/set-limits")
def set_shop_limits(shop_id: int, data: schemas.ShopLimitsSet, db: Session = Depends(get_db),
                    admin: models.User = Depends(get_current_admin)):
    """Admin sets a shop's product/category creation limits (0/None = unlimited)."""
    shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    for field in ("max_products", "max_categories"):
        value = getattr(data, field)
        if value is None:
            continue
        if value < 0:
            raise HTTPException(status_code=400, detail=f"{field} cannot be negative")
        setattr(shop, field, value if value > 0 else None)
    log_activity(db, "set_shop_limits",
                 f"Admin set shop {shop.username} limits "
                 f"(products={shop.max_products or 'unlimited'}, "
                 f"categories={shop.max_categories or 'unlimited'})", shop.id, admin)
    db.commit()
    return shop.to_dict(include_private=True)


@router.get("/{username}/qr")
def shop_qr_code(username: str, url: str = "", db: Session = Depends(get_db)):
    """Public: PNG QR code that links to the shop's storefront, with the shop logo."""
    shop = db.query(models.Shop).filter(models.Shop.username == username).first()
    if not shop or shop.status != "active" or shop.is_expired():
        raise HTTPException(status_code=404, detail="Shop not found")

    target = url or f"{config.BASE_URL}/{shop.username}"
    logo_path = ""
    if shop.logo:
        candidate = os.path.join(config.UPLOAD_DIR, os.path.basename(shop.logo))
        if os.path.exists(candidate):
            logo_path = candidate
    png = qr_service.generate_shop_qr(target, logo_path)
    return Response(content=png, media_type="image/png",
                    headers={"Content-Disposition": f'inline; filename="{shop.username}-qr.png"'})
