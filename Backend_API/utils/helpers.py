"""Small shared helpers."""
import re
from datetime import datetime


def slugify(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return text.strip("-") or "item"


def generate_order_number(shop_id: int) -> str:
    ts = datetime.utcnow().strftime("%y%m%d%H%M%S")
    return f"ORD-{shop_id:04d}-{ts}"


def sanitize_filename(name: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9._-]", "_", name)
    return name[-80:] if len(name) > 80 else name
