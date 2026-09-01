"""Stock management service: deduct on payment, stock report, low-stock alerts."""
from datetime import datetime

import models
from services import telegram_service

DEFAULT_LOW = 5
DEFAULT_HIGH = 50


def deduct_stock_for_order(db, order) -> dict:
    """
    Deduct the ordered quantities from product stock AND from the matching
    variation (label/value combination) when the product has variations.

    Returns a summary of deductions:
    {product_id: {name, deducted, remaining,
                  variation?: {"label": "...", "remaining": int}}}
    """
    summary = {}
    for item in order.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            continue

        before = product.quantity or 0
        product.quantity = max(0, before - item.quantity)

        entry = {
            "name": product.name,
            "deducted": min(before, item.quantity),
            "remaining": product.quantity,
        }

        # The customer's selected label/value combination, e.g. {"Size": "L"}.
        ordered = {}
        try:
            ordered = models.JSONText.loads(item.variations, {}) if item.variations else {}
        except Exception:
            ordered = {}

        if ordered:
            # Decrease the matching variation's own stock too.
            try:
                variations = models.JSONText.loads(product.variations, []) if product.variations else []
            except Exception:
                variations = []
            if variations:
                for v in variations:
                    attrs = v.get("attrs") or {}
                    if all(str(attrs.get(k)) == str(val) for k, val in ordered.items()):
                        v_qty = int(v.get("quantity") or 0)
                        v["quantity"] = max(0, v_qty - item.quantity)
                        entry["variation"] = {
                            "label": ", ".join(f"{k}: {val}" for k, val in ordered.items()),
                            "deducted": min(v_qty, item.quantity),
                            "remaining": v["quantity"],
                        }
                        break
                product.variations = models.JSONText.dumps(variations)

        summary[product.id] = entry
    db.flush()
    return summary


def get_stock_report(db, shop_id: int, low: int = DEFAULT_LOW, high: int = DEFAULT_HIGH) -> dict:
    """Classify a shop's products into out / low / normal / high stock groups."""
    products = db.query(models.Product).filter(models.Product.shop_id == shop_id).all()
    groups = {"out_of_stock": [], "low_stock": [], "normal": [], "high_stock": []}
    for p in products:
        qty = p.quantity or 0
        item = p.to_dict()
        if qty <= 0:
            groups["out_of_stock"].append(item)
        elif qty <= low:
            groups["low_stock"].append(item)
        elif qty >= high:
            groups["high_stock"].append(item)
        else:
            groups["normal"].append(item)

    total = len(products)
    return {
        "shop_id": shop_id,
        "low_threshold": low,
        "high_threshold": high,
        "total_products": total,
        "counts": {k: len(v) for k, v in groups.items()},
        "groups": groups,
    }


def collect_low_stock_items(db, shop, low: int = DEFAULT_LOW) -> list:
    """Return [(product_name, quantity), ...] for out-of-stock / low-stock products."""
    items = []
    for p in db.query(models.Product).filter(models.Product.shop_id == shop.id).all():
        qty = p.quantity or 0
        if qty <= low:
            items.append((p.name, qty))
    return items


def send_low_stock_alerts(db, shop, low: int = DEFAULT_LOW) -> bool:
    """Send a Telegram alert to all of the shop's linked chats if stock is low / out."""
    low_items = collect_low_stock_items(db, shop, low)
    if not low_items:
        return False

    lines = [f"• {name} — នៅសល់ {qty}"]
    text = (
        f"⚠️ <b>ការជូនដំណឹងស្តុកទំនិញទាប</b>\n\n"
        f"🏪 <b>ហាង:</b> {shop.shop_name or shop.username}\n"
        f"📦 <b>{len(low_items)} មុខទំនិញ</b> នៅសល់ {low} ឬតិចជាង:\n"
        + "\n".join(lines)
        + f"\n\n🕒 {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    )
    return telegram_service.send_shop_notification(shop, text)
