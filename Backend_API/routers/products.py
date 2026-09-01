"""Product CRUD endpoints with dynamic attributes and variations."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from security import get_current_user, log_activity, require_shop_access
from utils.helpers import slugify

router = APIRouter(prefix="/api/products", tags=["products"])


def _product_query(db, shop_id):
    return db.query(models.Product).filter(models.Product.shop_id == shop_id)


@router.get("/public")
def list_public_products(shop_id: int = Query(...), category_id: int = None,
                         search: str = "", featured_only: bool = False,
                         sort: str = "newest",
                         db: Session = Depends(get_db)):
    """Public product listing for a shop."""
    q = _product_query(db, shop_id).filter(models.Product.status == "active")
    if category_id:
        q = q.filter(models.Product.category_id == category_id)
    if search:
        q = q.filter(models.Product.name.ilike(f"%{search}%"))
    if featured_only:
        q = q.filter(models.Product.featured.is_(True))
    products = q.all()
    if sort == "price_asc":
        products.sort(key=lambda p: (p.sale_price if p.sale_price is not None else p.price))
    elif sort == "price_desc":
        products.sort(key=lambda p: (p.sale_price if p.sale_price is not None else p.price), reverse=True)
    else:
        products.sort(key=lambda p: p.created_at, reverse=True)
    return [p.to_dict() for p in products]


@router.get("/{product_id}/public")
def get_public_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id,
                                             models.Product.status == "active").first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product.to_dict()


@router.get("")
def list_products(shop_id: int = Query(...), db: Session = Depends(get_db),
                  user: models.User = Depends(get_current_user)):
    require_shop_access(shop_id, user)
    # Newest products first (largest id on top).
    products = (db.query(models.Product)
                .filter(models.Product.shop_id == shop_id)
                .order_by(models.Product.id.desc()).all())
    return [p.to_dict() for p in products]


@router.get("/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db),
                user: models.User = Depends(get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    require_shop_access(product.shop_id, user)
    return product.to_dict()


@router.post("")
def create_product(data: schemas.ProductCreate, db: Session = Depends(get_db),
                   user: models.User = Depends(get_current_user)):
    require_shop_access(data.shop_id, user)
    if user.role != "admin":
        shop = db.query(models.Shop).filter(models.Shop.id == data.shop_id).first()
        if shop and shop.max_products is not None:
            current = db.query(models.Product).filter(models.Product.shop_id == shop.id).count()
            if current >= shop.max_products:
                raise HTTPException(
                    status_code=400,
                    detail=f"Product limit reached ({current}/{shop.max_products}). "
                           "Contact the platform admin to increase your limit.")
    product = models.Product(
        shop_id=data.shop_id,
        category_id=data.category_id,
        name=data.name,
        description=data.description,
        price=data.price,
        sale_price=data.sale_price,
        quantity=data.quantity,
        images=models.JSONText.dumps(data.images),
        custom_attributes=models.JSONText.dumps(data.custom_attributes),
        variations=models.JSONText.dumps(data.variations),
        metadata_json=models.JSONText.dumps(data.metadata),
        featured=data.featured,
        status=data.status,
    )
    db.add(product)
    log_activity(db, "create_product", f"{user.username} created product '{data.name}'", data.shop_id, user)
    db.commit()
    db.refresh(product)
    return product.to_dict()


@router.put("/{product_id}")
def update_product(product_id: int, data: schemas.ProductUpdate, db: Session = Depends(get_db),
                   user: models.User = Depends(get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    require_shop_access(product.shop_id, user)

    for field in ("category_id", "name", "description", "price", "sale_price",
                  "quantity", "featured", "status"):
        val = getattr(data, field)
        if val is not None:
            setattr(product, field, val)
    if data.images is not None:
        product.images = models.JSONText.dumps(data.images)
    if data.custom_attributes is not None:
        product.custom_attributes = models.JSONText.dumps(data.custom_attributes)
    if data.variations is not None:
        product.variations = models.JSONText.dumps(data.variations)
    if data.metadata is not None:
        product.metadata_json = models.JSONText.dumps(data.metadata)

    log_activity(db, "update_product", f"{user.username} updated product '{product.name}'", product.shop_id, user)
    db.commit()
    db.refresh(product)
    return product.to_dict()


@router.post("/{product_id}/stock")
def update_product_stock(product_id: int, data: dict, db: Session = Depends(get_db),
                         user: models.User = Depends(get_current_user)):
    """Quick stock update. mode='set' sets exact quantity; mode='add' adds to current."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    require_shop_access(product.shop_id, user)

    qty = int(data.get("quantity", 0))
    mode = data.get("mode", "set")
    if mode == "add":
        product.quantity = (product.quantity or 0) + qty
    else:
        product.quantity = max(0, qty)
    log_activity(db, "update_stock", f"{user.username} set stock of '{product.name}' to {product.quantity}",
                 product.shop_id, user)
    db.commit()
    return {"id": product.id, "name": product.name, "quantity": product.quantity}


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db),
                   user: models.User = Depends(get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    require_shop_access(product.shop_id, user)
    name = product.name
    db.delete(product)
    log_activity(db, "delete_product", f"{user.username} deleted product '{name}'", product.shop_id, user)
    db.commit()
    return {"ok": True}
