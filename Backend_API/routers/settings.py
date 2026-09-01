"""Platform & shop settings endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from security import get_current_admin, get_current_user, require_shop_access

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _get_setting(db, shop_id, key):
    q = db.query(models.Setting)
    if shop_id is None:
        q = q.filter(models.Setting.shop_id.is_(None))
    else:
        q = q.filter(models.Setting.shop_id == shop_id)
    return q.filter(models.Setting.key == key).first()


@router.get("")
def list_settings(shop_id: int = None, db: Session = Depends(get_db),
                  user: models.User = Depends(get_current_user)):
    """List settings. shop_id omitted => platform settings (admin only)."""
    if shop_id is None and user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    if shop_id is not None:
        require_shop_access(shop_id, user)
        q = db.query(models.Setting).filter(models.Setting.shop_id == shop_id)
    else:
        q = db.query(models.Setting).filter(models.Setting.shop_id.is_(None))
    return [s.to_dict() for s in q.all()]


@router.post("")
def update_setting(data: schemas.SettingUpdate, db: Session = Depends(get_db),
                   user: models.User = Depends(get_current_user)):
    if data.shop_id is None and user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    if data.shop_id is not None:
        require_shop_access(data.shop_id, user)

    setting = _get_setting(db, data.shop_id, data.key)
    import json
    value_str = json.dumps(data.value) if isinstance(data.value, (dict, list, bool)) else str(data.value)
    if setting:
        setting.value = value_str
    else:
        setting = models.Setting(shop_id=data.shop_id, key=data.key, value=value_str)
        db.add(setting)
    db.commit()
    return setting.to_dict()


@router.get("/platform")
def get_platform_settings(db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    """Admin: aggregated platform settings as a convenient JSON object."""
    settings = db.query(models.Setting).filter(models.Setting.shop_id.is_(None)).all()
    result = {}
    for s in settings:
        val = s.value
        try:
            import json
            result[s.key] = json.loads(val) if val.startswith(("{", "[")) else val
        except Exception:
            result[s.key] = val
    result["default_admin"] = "admin"
    result["contact_telegram"] = "@your_telegram"
    return result


@router.get("/stats")
def platform_stats(db: Session = Depends(get_db), admin: models.User = Depends(get_current_admin)):
    """Admin platform statistics."""
    shops = db.query(models.Shop).count()
    active_shops = db.query(models.Shop).filter(models.Shop.status == "active").count()
    products = db.query(models.Product).count()
    orders = db.query(models.Order).count()
    paid_orders = db.query(models.Order).filter(models.Order.payment_status == "paid").all()
    revenue = round(sum(o.total for o in paid_orders), 2)
    customers = db.query(models.Customer).count()
    users = db.query(models.User).count()
    resellers = db.query(models.User).filter(models.User.role == "reseller").count()
    return {
        "shops": shops, "active_shops": active_shops, "products": products,
        "orders": orders, "revenue": revenue, "customers": customers, "users": users,
        "resellers": resellers,
    }
