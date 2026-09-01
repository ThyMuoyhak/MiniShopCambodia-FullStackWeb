"""Telegram bot notification + Login Widget verification service."""
import hashlib
import hmac
import secrets
import time

import httpx

import models
from config import config


def send_telegram_message(bot_token: str, chat_id: str, text: str) -> bool:
    """Send a text message via the Telegram Bot API. Returns True on success.

    If the HTML-styled send fails (e.g. very long message / an unescaped character),
    it automatically retries as plain text so the notification is never lost.
    """
    if not bot_token or not chat_id:
        return False
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payloads = (
        {"chat_id": chat_id, "text": text, "parse_mode": "HTML", "disable_web_page_preview": True},
        {"chat_id": chat_id, "text": text, "disable_web_page_preview": True},
    )
    for payload in payloads:
        try:
            with httpx.Client(timeout=15) as client:
                resp = client.post(url, json=payload)
                data = resp.json()
            if resp.status_code == 200 and data.get("ok") is True:
                return True
        except Exception:
            continue
    return False


def ensure_shop_profile(shop) -> dict:
    """
    Make sure the shop has a bot Profile ID (used to link the Telegram bot to a shop)
    and a linked_chats list. Stores them in shop.telegram_settings.
    """
    tg = shop.telegram_dict()
    changed = False
    if not tg.get("profile_id"):
        tg["profile_id"] = f"SHOP{shop.id}-{secrets.token_hex(4).upper()}"
        changed = True
    if not tg.get("secret_key"):
        tg["secret_key"] = secrets.token_hex(8)
        changed = True
    if "linked_chats" not in tg:
        tg["linked_chats"] = []
        changed = True
    if changed:
        shop.telegram_settings = models.JSONText.dumps(tg)
    return tg


def send_shop_notification(shop, text: str) -> bool:
    """Send a message to every chat linked to the shop (configured chat_id + bot-linked chats)."""
    tg = shop.telegram_dict()
    bot_token = (tg.get("bot_token") or "").strip()
    if not bot_token:
        return False
    chat_ids = set()
    if tg.get("chat_id"):
        chat_ids.add(str(tg["chat_id"]))
    for c in (tg.get("linked_chats") or []):
        chat_ids.add(str(c))
    sent = False
    for cid in chat_ids:
        if send_telegram_message(bot_token, cid, text):
            sent = True
    return sent


def notify_shop_new_order(shop, order_number, amount, currency, customer_name) -> bool:
    text = (
        f"🛒 <b>New Order Placed!</b>\n\n"
        f"🏪 <b>Shop:</b> {shop.shop_name or shop.username}\n"
        f"🧾 <b>Order:</b> #{order_number}\n"
        f"💰 <b>Amount:</b> {amount:,.2f} {currency}\n"
        f"👤 <b>Customer:</b> {customer_name}"
    )
    return send_shop_notification(shop, text)


def notify_shop_payment_success(shop, order_number, amount, currency, customer_name) -> bool:
    text = (
        f"✅ <b>Payment Successful!</b>\n\n"
        f"🏪 <b>Shop:</b> {shop.shop_name or shop.username}\n"
        f"🧾 <b>Order:</b> #{order_number}\n"
        f"💰 <b>Amount:</b> {amount:,.2f} {currency}\n"
        f"👤 <b>Customer:</b> {customer_name}\n"
        f"🕒 <b>Time:</b> {time.strftime('%Y-%m-%d %H:%M:%S')}"
    )
    return send_shop_notification(shop, text)


def send_verification_code(bot_token: str, chat_id, code: str) -> bool:
    """Send a one-time login verification code to a Telegram user via the bot."""
    text = (
        f"🔐 <b>Mini Shop Login</b>\n\n"
        f"Your verification code is:\n\n"
        f"<b>{code}</b>\n\n"
        f"Enter it on the website to complete your Telegram login. "
        f"It expires in 5 minutes."
    )
    return send_telegram_message(bot_token, str(chat_id), text)


def get_bot_username(bot_token: str):
    """Resolve a bot token to its public @username via the getMe API."""
    if not bot_token:
        return None
    try:
        with httpx.Client(timeout=15) as client:
            resp = client.get(f"https://api.telegram.org/bot{bot_token}/getMe")
            data = resp.json()
        if data.get("ok"):
            return data.get("result", {}).get("username")
    except Exception:
        pass
    return None


def verify_telegram_login(bot_token: str, auth_data: dict) -> bool:
    """
    Verify the signature of the Telegram Login Widget callback.

    The widget returns the logged-in user as {id, first_name, last_name, username,
    photo_url, auth_date, hash}. The hash is an HMAC-SHA256 signature:

        secret_key        = SHA256(bot_token)
        data_check_string = sorted "key=value" lines (excluding hash), joined by \n
        hash              = HMAC_SHA256(data_check_string, secret_key) hex

    Also rejects stale auth_data (older than 24h).
    """
    received = (auth_data or {}).get("hash", "")
    if not received or not bot_token:
        return False

    check = dict(auth_data or {})
    check.pop("hash", None)

    # Freshness check
    try:
        if time.time() - int(check.get("auth_date", 0)) > 24 * 3600:
            return False
    except (TypeError, ValueError):
        return False

    secret_key = hashlib.sha256(bot_token.encode("utf-8")).digest()
    data_check_string = "\n".join(f"{k}={check[k]}" for k in sorted(check))
    calculated = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(calculated, received)


def notify_payment_success(bot_token: str, chat_id: str, order_number: str, amount: float,
                           currency: str, customer_name: str, shop_name: str) -> bool:
    """Send a payment-success notification to a Telegram group/channel."""
    text = (
        f"✅ <b>Payment Successful!</b>\n\n"
        f"🏪 <b>Shop:</b> {shop_name}\n"
        f"🧾 <b>Order:</b> #{order_number}\n"
        f"💰 <b>Amount:</b> {amount:,.2f} {currency}\n"
        f"👤 <b>Customer:</b> {customer_name}\n"
        f"🕒 <b>Time:</b> {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    )
    return send_telegram_message(bot_token, chat_id, text)


def notify_new_order(bot_token: str, chat_id: str, order_number: str, amount: float,
                     currency: str, customer_name: str, shop_name: str) -> bool:
    text = (
        f"🛒 <b>New Order Placed!</b>\n\n"
        f"🏪 <b>Shop:</b> {shop_name}\n"
        f"🧾 <b>Order:</b> #{order_number}\n"
        f"💰 <b>Amount:</b> {amount:,.2f} {currency}\n"
        f"👤 <b>Customer:</b> {customer_name}"
    )
    return send_telegram_message(bot_token, chat_id, text)


def send_default_payment_notification(order_number: str, amount: float, currency: str, shop_name: str) -> bool:
    """Fallback notification using the platform-wide default bot token (no chat id)."""
    return False


def _html(text) -> str:
    """Escape text for Telegram HTML parse mode (safe inside <b>/<code> tags)."""
    return (str(text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def _money(amount, currency) -> str:
    return f"{float(amount or 0):,.2f} {currency}"


def _public_receipt_url(order) -> str:
    """Build a safe, public receipt URL for Telegram.

    Never sends filesystem/database paths: a raw path (e.g. C:\\...\\receipt.pdf,
    /data/minishop.db) is reduced to just the filename and re-built as a clean
    /uploads/receipts/<name> URL. Non-PDF values (like the database file) are
    dropped entirely.
    """
    raw = str(getattr(order, "receipt_url", "") or "").strip()
    if not raw:
        return ""
    if raw.startswith(("http://", "https://")):
        return raw
    if raw.lower().endswith(".pdf"):
        name = raw.replace("\\", "/").split("/")[-1]
        return f"{config.BASE_URL}/uploads/receipts/{name}"
    return ""


def notify_shop_payment_success_full(shop, order, stock_summary=None) -> bool:
    """
    Send a FULL payment-success notification (in Khmer) to every chat linked to
    the shop. Includes: order number, payment method + transaction id, paid time,
    complete customer details, every ordered item (name, variations, qty x price,
    line total), subtotal / shipping / discount / grand total, remaining stock per
    product, and the receipt link.

    stock_summary: optional dict from stock_service.deduct_stock_for_order, shaped
    {product_id: {"name": str, "deducted": int, "remaining": int}}.
    """
    from datetime import datetime

    if not telegram_settings_enabled(shop):
        return False

    # Force-load every related row now (items relationship) before building text.
    _ = [i for i in order.items]

    currency = order.currency or "USD"
    txn = order.transaction_id or ""
    paid_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    if getattr(order, "paid_at", None):
        try:
            paid_time = order.paid_at.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            pass

    sep = "━━━━━━━━━━━━"
    method_label = {
        "cash": "បង់ប្រាក់ផ្ទាល់ (Cash)",
        "khqr": "ABA Pay (KHQR)",
        "aba": "ABA Pay (KHQR)",
    }.get((order.payment_method or "aba").lower(), order.payment_method or "ABA Pay")
    lines = [
        "✅ <b>ការទូទាត់បានជោគជ័យ!</b> 🎉",
        "",
        f"🏪 <b>ហាង:</b> {_html(shop.shop_name or shop.username)}",
        f"🧾 <b>លេខកុម្ម៉ង់:</b> #{_html(order.order_number)}",
        f"💳 <b>វិធីបង់ប្រាក់:</b> {method_label}",
        f"🔢 <b>លេខប្រតិបត្តិការ:</b> <code>{_html(txn)}</code>",
        f"🕒 <b>ពេលបង់ប្រាក់:</b> {paid_time}",
        "",
        sep,
        "🛍️ <b>ទំនិញដែលបានទិញ</b>",
    ]

    stock_by_pid = {pid: s for pid, s in (stock_summary or {}).items()}
    for i in order.items:
        name = i.product_name or f"Product #{i.product_id}"
        var = ""
        try:
            v = models.JSONText.loads(i.variations, {}) if i.variations else {}
            if v:
                var = " (" + ", ".join(f"{k}: {val}" for k, val in v.items()) + ")"
        except Exception:
            var = ""
        line_total = float(i.price or 0) * int(i.quantity or 1)
        lines.append(
            f"▫️ <b>{_html(name)}</b>{_html(var)}\n"
            f"    {int(i.quantity)} × {_money(i.price, currency)} = "
            f"<b>{_money(line_total, currency)}</b>"
        )
        s = stock_by_pid.get(i.product_id)
        if s:
            if s.get("variation"):
                lines.append(
                    f"    📦 ស្តុក ({_html(s['variation']['label'])}) នៅសល់: "
                    f"<b>{int(s['variation']['remaining'])}</b>"
                )
            else:
                lines.append(f"    📦 ស្តុកនៅសល់: <b>{int(s.get('remaining', 0))}</b>")

    lines += [
        "",
        sep,
        f"សរុបទំនិញ: {_money(order.items_total, currency)}",
    ]
    if float(order.shipping_fee or 0) > 0:
        lines.append(f"ថ្លៃដឹកជញ្ជូន: +{_money(order.shipping_fee, currency)}")
    if float(order.discount or 0) > 0:
        lines.append(f"បញ្ចុះតម្លៃ: -{_money(order.discount, currency)}")
    lines += [
        f"<b>ថ្លៃសរុប: {_money(order.total, currency)}</b>",
        "",
        sep,
        "👤 <b>ព័ត៌មានអតិថិជន</b>",
        f"ឈ្មោះ: {_html(order.customer_name or '-')}",
    ]
    if order.customer_phone:
        lines.append(f"ទូរស័ព្ទ: {_html(order.customer_phone)}")
    if order.customer_email:
        lines.append(f"អ៊ីមែល: {_html(order.customer_email)}")
    if order.customer_telegram:
        lines.append(f"Telegram: {_html(order.customer_telegram)}")
    if order.customer_address:
        lines.append(f"អាសយដ្ឋាន: {_html(order.customer_address)}")
    city_country = ", ".join(x for x in [order.customer_city, order.customer_country] if x)
    if city_country:
        lines.append(f"ទីក្រុង/ប្រទេស: {_html(city_country)}")
    if order.customer_note:
        lines.append(f"កំណត់ចំណាំ: {_html(order.customer_note)}")
    receipt_link = _public_receipt_url(order)
    if receipt_link:
        lines.append("")
        lines.append(f"🧾 <b>បង្កាន់ដៃ:</b> {_html(receipt_link)}")

    return send_shop_notification(shop, "\n".join(lines))


def telegram_settings_enabled(shop) -> bool:
    """Master switch: is Telegram notification delivery enabled for this shop?"""
    tg = shop.telegram_dict()
    return bool(tg.get("enabled"))
