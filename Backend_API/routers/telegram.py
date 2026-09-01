"""Telegram notification endpoints + bot webhook + activity log endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

import models
import schemas
from config import config
from database import get_db
from security import get_current_admin, get_current_user, require_shop_access
from services import stock_service, telegram_service

router = APIRouter(prefix="/api", tags=["telegram"])


@router.post("/telegram/webhook/{token}")
async def telegram_bot_webhook(token: str, request: Request, db: Session = Depends(get_db)):
    """
    Telegram bot webhook. The bot sends every user message here.

    Commands:
      /start            → welcome + how to link this chat to a shop
      LINK <ProfileID> <SecretKey>  → verify and link this chat to that shop
      /shop             → show the currently linked shop info
    After linking, the shop's notifications are delivered to this chat.
    """
    update = await request.json()

    # Bot added to a group → auto-welcome with the LINK command so the owner
    # can copy-paste it right there. my_chat_member arrives when the bot is
    # added/removed; status "member" means it was just added to the chat.
    my_chat_member = update.get("my_chat_member") or {}
    if my_chat_member:
        new_status = (my_chat_member.get("new_chat_member") or {}).get("status")
        new_chat = my_chat_member.get("chat") or {}
        new_chat_id = new_chat.get("id")
        if new_status == "member" and new_chat_id:
            for s in db.query(models.Shop).all():
                if (s.telegram_dict().get("bot_token") or "").strip() == token:
                    tg = telegram_service.ensure_shop_profile(s)
                    db.commit()
                    telegram_service.send_telegram_message(
                        token, str(new_chat_id),
                        f"👋 ស្វាគមន៍! Bot របស់ <b>{s.shop_name or s.username}</b> ត្រូវបានបន្ថែមចូលក្រុមនេះ! 🏪\n\n"
                        "ដើម្បីទទួល <b>ការជូនដំណឹងការបង់ប្រាក់ជោគជ័យ</b> របស់ហាងនៅទីនេះ "
                        "សូមផ្ញើ:\n\n"
                        f"<code>LINK {tg.get('profile_id')} {tg.get('secret_key')}</code>\n\n"
                        "អ្នកនឹងទទួលបានតែការជូនដំណឹងពេលអតិថិជនបង់ប្រាក់រួច "
                        "ជាមួយព័ត៌មានលម្អិត + ស្តុក។")
                    break
        return {"ok": True}

    message = update.get("message") or {}
    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    text = (message.get("text") or "").strip()
    if not chat_id or not text:
        return {"ok": True}

    # Find the shop that owns this bot token
    shop = None
    for s in db.query(models.Shop).all():
        if (s.telegram_dict().get("bot_token") or "").strip() == token:
            shop = s
            break
    if not shop:
        return {"ok": True}

    bot_token = token
    lower = text.lower()

    if lower == "/start" or lower == "start":
        tg = telegram_service.ensure_shop_profile(shop)
        db.commit()
        reply = (
            f"សូមស្វាគមន៍មកកាន់ <b>{shop.shop_name or shop.username}</b>! 🏪\n\n"
            "ដើម្បីទទួល <b>ការជូនដំណឹងនៅពេលអតិថិជនបង់ប្រាក់ជោគជ័យ</b> "
            "(ព័ត៌មានលម្អិតទំនិញ + ស្តុក) នៅក្នុង chat នេះ សូមផ្ញើ:\n\n"
            f"<code>LINK {tg.get('profile_id')} {tg.get('secret_key')}</code>\n\n"
            "អ្នកអាចរក Profile ID និង Secret Key នៅក្នុង "
            "<b>Shop Dashboard → Telegram Bot</b> ។"
        )
        telegram_service.send_telegram_message(bot_token, chat_id, reply)

    elif lower.startswith("link "):
        parts = text.split()
        if len(parts) >= 3:
            pid, sec = parts[1], parts[2]
            matched = None
            for s in db.query(models.Shop).all():
                tg = s.telegram_dict()
                if (tg.get("profile_id") or "") == pid and (tg.get("secret_key") or "") == sec:
                    matched = s
                    break
            if matched:
                tg = matched.telegram_dict()
                chats = list(tg.get("linked_chats") or [])
                if chat_id not in chats:
                    chats.append(chat_id)
                    tg["linked_chats"] = chats
                    matched.telegram_settings = models.JSONText.dumps(tg)
                    db.commit()
                telegram_service.send_telegram_message(
                    bot_token, chat_id,
                    f"✅ បានភ្ជាប់ជាមួយ <b>{matched.shop_name or matched.username}</b> ដោយជោគជ័យ! "
                    "ចាប់ពីពេលនេះ អ្នកនឹងទទួលបានការជូនដំណឹងការបង់ប្រាក់ជោគជ័យរបស់ហាងនៅទីនេះ។")
            else:
                telegram_service.send_telegram_message(
                    bot_token, chat_id,
                    "❌ Profile ID ឬ Secret Key មិនត្រឹមត្រូវ។ "
                    "សូមពិនិត្យមើល <b>Shop Dashboard → Telegram Bot</b> សម្រាប់ព័ត៌មាន។")
        else:
            telegram_service.send_telegram_message(
                bot_token, chat_id,
                "សូមផ្ញើតាមទម្រង់នេះ៖\n<code>LINK &lt;ProfileID&gt; &lt;SecretKey&gt;</code>")

    elif lower == "/shop":
        tg = shop.telegram_dict()
        telegram_service.send_telegram_message(
            bot_token, chat_id,
            f"🏪 <b>{shop.shop_name or shop.username}</b>\n"
            f"Profile ID: <code>{tg.get('profile_id', '')}</code>\n"
            f"ចំនួន chat ដែលបានភ្ជាប់: {len(tg.get('linked_chats') or [])}")

    return {"ok": True}


@router.post("/telegram/setwebhook")
def set_telegram_webhook(shop_id: int, db: Session = Depends(get_db),
                         user: models.User = Depends(get_current_user)):
    """Register the backend webhook URL with the shop's bot (required for /start + LINK)."""
    require_shop_access(shop_id, user)
    shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    tg = telegram_service.ensure_shop_profile(shop)
    db.commit()
    bot_token = (tg.get("bot_token") or "").strip()
    if not bot_token:
        raise HTTPException(status_code=400, detail="Bot token is not configured")

    import httpx
    webhook_url = f"{config.BASE_URL}/api/telegram/webhook/{bot_token}"
    try:
        with httpx.Client(timeout=20) as client:
            resp = client.post(
                f"https://api.telegram.org/bot{bot_token}/setWebhook",
                json={"url": webhook_url, "allowed_updates": ["message", "my_chat_member"]})
            data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not reach Telegram: {e}")

    if not data.get("ok"):
        raise HTTPException(status_code=400, detail=data.get("description", "setWebhook failed"))

    return {
        "ok": True,
        "detail": "Webhook registered. Users can now start the bot and link your shop.",
        "profile_id": tg.get("profile_id"),
        "secret_key": tg.get("secret_key"),
        "webhook_url": webhook_url,
        "linked_chats": tg.get("linked_chats", []),
    }


@router.get("/telegram/settings")
def get_telegram_settings(shop_id: int, db: Session = Depends(get_db),
                          user: models.User = Depends(get_current_user)):
    """Owner: view the shop's bot profile (Profile ID, Secret Key, linked chats)."""
    require_shop_access(shop_id, user)
    shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    tg = telegram_service.ensure_shop_profile(shop)
    db.commit()
    return {
        "bot_token": tg.get("bot_token", ""),
        "chat_id": tg.get("chat_id", ""),
        "enabled": tg.get("enabled", False),
        "profile_id": tg.get("profile_id", ""),
        "secret_key": tg.get("secret_key", ""),
        "linked_chats": tg.get("linked_chats", []),
        "bot_username": telegram_service.get_bot_username(tg.get("bot_token", "")),
    }


@router.post("/telegram/test")
def test_telegram(data: schemas.TelegramTest, db: Session = Depends(get_db),
                  user: models.User = Depends(get_current_user)):
    """Send a test notification using a shop's configured bot token + chat id."""
    if data.shop_id:
        require_shop_access(data.shop_id, user)
        shop = db.query(models.Shop).filter(models.Shop.id == data.shop_id).first()
        if not shop:
            raise HTTPException(status_code=404, detail="Shop not found")
        tg = shop.telegram_dict()
        bot_token = tg.get("bot_token", "")
        chat_id = tg.get("chat_id", "")
    else:
        if user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin privileges required")
        bot_token = __import__("config").config.TELEGRAM_BOT_TOKEN
        chat_id = data.message  # admin supplies chat id in message body placeholder
        chat_id = ""

    if not bot_token or not chat_id:
        raise HTTPException(status_code=400, detail="Bot token or chat ID is not configured")

    ok = telegram_service.send_telegram_message(
        bot_token, chat_id,
        f"{data.message}\n\n— Sent from Mini Shop Platform ({user.username})")
    return {"ok": ok, "detail": "Notification sent" if ok else "Failed to send notification"}


@router.post("/telegram/stock-alert")
def send_stock_alert(shop_id: int, db: Session = Depends(get_db),
                     user: models.User = Depends(get_current_user)):
    """Send a low-stock alert to the shop's Telegram group using the shop's bot token."""
    require_shop_access(shop_id, user)
    shop = db.query(models.Shop).filter(models.Shop.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    ok = stock_service.send_low_stock_alerts(db, shop)
    if not ok:
        raise HTTPException(status_code=400,
                            detail="No low-stock items, or the bot token / chat ID is not configured "
                                   "in Telegram Settings")
    return {"ok": True, "detail": "Low-stock alert sent to your Telegram group"}


@router.get("/activity")
def list_activity(shop_id: int = None, username: str = "", limit: int = 100,
                  db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Activity logs, filterable by shop/user. Admin sees all."""
    q = db.query(models.ActivityLog)
    if user.role != "admin":
        q = q.filter(models.ActivityLog.shop_id == user.shop_id)
    if shop_id is not None and user.role == "admin":
        q = q.filter(models.ActivityLog.shop_id == shop_id)
    if username:
        q = q.filter(models.ActivityLog.username.ilike(f"%{username}%"))
    logs = q.order_by(models.ActivityLog.id.desc()).limit(limit).all()
    return [l.to_dict() for l in logs]
