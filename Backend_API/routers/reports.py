"""Reports endpoints: sales, products, customers."""
import csv
import io
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import models
from database import get_db
from security import get_current_user, require_shop_access
from services import stock_service

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/sales")
def sales_report(shop_id: int, period: str = "daily", days: int = 30,
                 db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Sales report grouped by day. period: daily | weekly | monthly."""
    require_shop_access(shop_id, user)
    since = datetime.utcnow() - timedelta(days=days)
    orders = db.query(models.Order).filter(
        models.Order.shop_id == shop_id,
        models.Order.created_at >= since,
        models.Order.payment_status == "paid",
    ).all()

    buckets = {}
    for o in orders:
        d = o.created_at
        if period == "weekly":
            key = d.strftime("%Y-W%W")
        elif period == "monthly":
            key = d.strftime("%Y-%m")
        else:
            key = d.strftime("%Y-%m-%d")
        entry = buckets.setdefault(key, {"date": key, "orders": 0, "revenue": 0.0})
        entry["orders"] += 1
        entry["revenue"] += o.total

    data = sorted(buckets.values(), key=lambda x: x["date"])
    totals = {"orders": sum(x["orders"] for x in data), "revenue": round(sum(x["revenue"] for x in data), 2)}
    return {"period": period, "days": days, "totals": totals, "data": data}


@router.get("/overview")
def shop_overview(shop_id: int, db: Session = Depends(get_db),
                  user: models.User = Depends(get_current_user)):
    """Dashboard overview statistics."""
    require_shop_access(shop_id, user)
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    orders = db.query(models.Order).filter(models.Order.shop_id == shop_id).all()
    today_orders = [o for o in orders if o.created_at and o.created_at >= today]
    paid = [o for o in orders if o.payment_status == "paid"]

    return {
        "today_orders": len(today_orders),
        "today_revenue": round(sum(o.total for o in today_orders if o.payment_status == "paid"), 2),
        "total_orders": len(orders),
        "total_revenue": round(sum(o.total for o in paid), 2),
        "pending_orders": len([o for o in orders if o.order_status == "pending"]),
        "total_products": db.query(models.Product).filter(models.Product.shop_id == shop_id).count(),
        "total_customers": db.query(models.Customer).filter(models.Customer.shop_id == shop_id).count(),
        "total_categories": db.query(models.Category).filter(models.Category.shop_id == shop_id).count(),
        "recent_orders": [o.to_dict() for o in sorted(orders, key=lambda x: x.id, reverse=True)[:10]],
    }


@router.get("/products")
def product_report(shop_id: int, db: Session = Depends(get_db),
                   user: models.User = Depends(get_current_user)):
    """Product performance report (units sold + revenue per product)."""
    require_shop_access(shop_id, user)
    items = (db.query(models.OrderItem)
             .join(models.Order, models.Order.id == models.OrderItem.order_id)
             .filter(models.Order.shop_id == shop_id).all())
    agg = {}
    for it in items:
        e = agg.setdefault(it.product_name, {"name": it.product_name, "units": 0, "revenue": 0.0})
        e["units"] += it.quantity
        e["revenue"] += it.price * it.quantity
    data = sorted(agg.values(), key=lambda x: x["revenue"], reverse=True)
    return data


@router.get("/customers")
def customer_report(shop_id: int, db: Session = Depends(get_db),
                    user: models.User = Depends(get_current_user)):
    require_shop_access(shop_id, user)
    customers = db.query(models.Customer).filter(models.Customer.shop_id == shop_id).all()
    out = []
    for c in customers:
        orders = db.query(models.Order).filter(
            models.Order.shop_id == shop_id,
            models.Order.customer_phone == c.phone).all()
        paid_total = sum(o.total for o in orders if o.payment_status == "paid")
        out.append({**c.to_dict(), "order_count": len(orders), "total_spent": round(paid_total, 2)})
    return out


@router.get("/stock")
def stock_report(shop_id: int, low: int = 5, high: int = 50,
                 db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Stock report: out-of-stock / low / normal / high stock classification."""
    require_shop_access(shop_id, user)
    return stock_service.get_stock_report(db, shop_id, low=low, high=high)


@router.get("/sales/export")
def export_sales_csv(shop_id: int, period: str = "daily", days: int = 30,
                     db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    require_shop_access(shop_id, user)
    report = sales_report(shop_id, period, days, db, user)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Date", "Orders", "Revenue"])
    for row in report["data"]:
        writer.writerow([row["date"], row["orders"], row["revenue"]])
    writer.writerow(["TOTAL", report["totals"]["orders"], report["totals"]["revenue"]])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=sales_report_{shop_id}.csv"})
