"""Category CRUD endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from security import get_current_user, log_activity, require_shop_access
from utils.helpers import slugify

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("/public")
def list_public_categories(shop_id: int = Query(...), db: Session = Depends(get_db)):
    cats = (db.query(models.Category).filter(models.Category.shop_id == shop_id)
            .order_by(models.Category.sort_order).all())
    out = []
    for c in cats:
        d = c.to_dict()
        d["product_count"] = db.query(models.Product).filter(
            models.Product.category_id == c.id,
            models.Product.status == "active").count()
        out.append(d)
    return out


@router.get("")
def list_categories(shop_id: int = Query(...), db: Session = Depends(get_db),
                    user: models.User = Depends(get_current_user)):
    require_shop_access(shop_id, user)
    cats = (db.query(models.Category).filter(models.Category.shop_id == shop_id)
            .order_by(models.Category.sort_order).all())
    out = []
    for c in cats:
        d = c.to_dict()
        d["product_count"] = db.query(models.Product).filter(models.Product.category_id == c.id).count()
        out.append(d)
    return out


@router.post("")
def create_category(data: schemas.CategoryCreate, db: Session = Depends(get_db),
                    user: models.User = Depends(get_current_user)):
    require_shop_access(data.shop_id, user)
    if user.role != "admin":
        shop = db.query(models.Shop).filter(models.Shop.id == data.shop_id).first()
        if shop and shop.max_categories is not None:
            current = db.query(models.Category).filter(models.Category.shop_id == shop.id).count()
            if current >= shop.max_categories:
                raise HTTPException(
                    status_code=400,
                    detail=f"Category limit reached ({current}/{shop.max_categories}). "
                           "Contact the platform admin to increase your limit.")
    cat = models.Category(
        shop_id=data.shop_id,
        name=data.name,
        slug=data.slug or slugify(data.name),
        parent_id=data.parent_id,
        image=data.image,
        sort_order=data.sort_order,
    )
    db.add(cat)
    log_activity(db, "create_category", f"{user.username} created category '{data.name}'", data.shop_id, user)
    db.commit()
    db.refresh(cat)
    return cat.to_dict()


@router.put("/{category_id}")
def update_category(category_id: int, data: schemas.CategoryUpdate, db: Session = Depends(get_db),
                    user: models.User = Depends(get_current_user)):
    cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    require_shop_access(cat.shop_id, user)
    if data.name is not None:
        cat.name = data.name
    if data.slug is not None:
        cat.slug = data.slug
    elif data.name is not None:
        cat.slug = slugify(data.name)
    if data.parent_id is not None:
        cat.parent_id = data.parent_id
    if data.image is not None:
        cat.image = data.image
    if data.sort_order is not None:
        cat.sort_order = data.sort_order
    log_activity(db, "update_category", f"{user.username} updated category '{cat.name}'", cat.shop_id, user)
    db.commit()
    return cat.to_dict()


@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db),
                    user: models.User = Depends(get_current_user)):
    cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    require_shop_access(cat.shop_id, user)
    name = cat.name
    db.delete(cat)
    log_activity(db, "delete_category", f"{user.username} deleted category '{name}'", cat.shop_id, user)
    db.commit()
    return {"ok": True}
