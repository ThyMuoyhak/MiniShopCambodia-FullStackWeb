# -*- coding: utf-8 -*-
"""
Mini Shop - Backend_Telegram_Mini_App (background bot worker)

Polls Telegram getUpdates 24/7 for EVERY shop bot that an owner connected in the
Dashboard ("Check & Save Bot" + Mini App URL). When a customer presses /start
(or writes any private message), the bot auto-replies with:

   1.  Shop banner photo (falls back to logo)
   2.  Shop name + bio + FULL description + contact (real owner data)
   3.  "Open Shop" button that opens the shop's Telegram Mini App

This worker is meant to run as a Render BACKGROUND WORKER (always on), separate
from the main Mini Shop web API. The main API must be configured with the same
secret so it disables webhooks for these bots (Telegram forbids webhook +
getUpdates at the same time):

    BOT_SERVICE_KEY=some-long-random-secret
    BOT_SERVICE_ENABLED=true

Worker environment:
    MINI_BACKEND_BASE_URL   main API base, e.g. https://localhost:8000
    MINI_BOT_SERVICE_KEY    same secret as the main API
    LOOP_SECONDS            seconds between poll passes (default 2)
"""
import logging
import os
import sys
import time

import httpx
from urllib.parse import urlparse, urlunparse

BASE_URL = (os.getenv("MINI_BACKEND_BASE_URL",
                      "http://localhost:8000").rstrip("/"))
# LOCAL STUDY COPY: never ship real secrets. Create your OWN secret and set the
# SAME value as BOT_SERVICE_KEY on the Backend_API this worker connects to.
DEFAULT_SERVICE_KEY = ""
SERVICE_KEY = os.getenv("MINI_BOT_SERVICE_KEY", "").strip()
LOOP_SECONDS = float(os.getenv("LOOP_SECONDS", "0.5"))  # seconds
TG_API = "https://api.telegram.org"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S")
logging.getLogger("httpx").setLevel(logging.WARNING)  # keep bot logs readable
log = logging.getLogger("minishop-bot-worker")


# ---------------------------------------------------------------------------
# Telegram low-level helpers
# ---------------------------------------------------------------------------
def _escape_html(value) -> str:
    return (str(value or "").replace("&", "&amp;")
            .replace("<", "&lt;").replace(">", "&gt;"))


def _short(token: str) -> str:
    return (token or "")[:12] + "..."


def _tg_post(token: str, method: str, payload: dict, timeout: float = 25):
    """POST to the Telegram Bot API; returns parsed JSON or None."""
    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(f"{TG_API}/bot{token}/{method}", json=payload)
            data = resp.json()
            if not data.get("ok") and method in ("sendMessage", "sendPhoto", "getUpdates"):
                log.warning("Telegram %s error for %s: %s %s",
                            method, _short(token),
                            data.get("error_code"), data.get("description"))
            return data
    except Exception as exc:
        log.warning("Telegram %s failed for bot %s: %s", method, _short(token), exc)
        return None


def _delete_webhook(token: str) -> bool:
    data = _tg_post(token, "deleteWebhook", {"drop_pending_updates": False}, timeout=12)
    return bool(data and data.get("ok"))


def _send_message(token: str, chat_id, text: str, keyboard=None) -> bool:
    payload = {"chat_id": chat_id, "text": text, "disable_web_page_preview": True}
    for use_html in (True, False):
        p = dict(payload)
        if use_html:
            p["parse_mode"] = "HTML"
        if keyboard:
            p["reply_markup"] = {"inline_keyboard": keyboard}
        data = _tg_post(token, "sendMessage", p)
        if data and data.get("ok"):
            return True
        if use_html and data and data.get("ok") is False:
            # Invalid HTML -> retry as plain text with the same button.
            continue
        if not use_html:
            break
    return False


def _send_photo(token: str, chat_id, photo_url: str, caption: str = "",
                keyboard=None) -> bool:
    payload = {"chat_id": chat_id, "photo": photo_url, "caption": caption,
               "parse_mode": "HTML"}
    if keyboard:
        payload["reply_markup"] = {"inline_keyboard": keyboard}
    data = _tg_post(token, "sendPhoto", payload, timeout=30)
    if data and data.get("ok"):
        return True
    # A photo caption with invalid HTML should never lose the button.
    if data and data.get("ok") is False:
        payload.pop("parse_mode", None)
        data = _tg_post(token, "sendPhoto", payload, timeout=30)
        return bool(data and data.get("ok"))
    return False


# ---------------------------------------------------------------------------
# Config source: the main Mini Shop API
# ---------------------------------------------------------------------------
def fetch_shops():
    """Pull the list of connected shop bots from the main API.

    Uses MINI_BOT_SERVICE_KEY, which must match BOT_SERVICE_KEY configured on
    the Backend_API this worker talks to."""
    candidates = [SERVICE_KEY] + ([DEFAULT_SERVICE_KEY] if DEFAULT_SERVICE_KEY and DEFAULT_SERVICE_KEY != SERVICE_KEY else [])
    last_error = None
    for key in candidates:
        headers = {"X-Bot-Service-Key": key} if key else {}
        try:
            with httpx.Client(timeout=25) as client:
                resp = client.get(f"{BASE_URL}/api/bot-service/config", headers=headers)
                if resp.status_code == 403:
                    last_error = RuntimeError("Forbidden - wrong MINI_BOT_SERVICE_KEY")
                    continue
                resp.raise_for_status()
                return resp.json()
        except httpx.HTTPStatusError as exc:
            last_error = exc
    raise last_error if last_error else RuntimeError("Could not reach the main API")

# ---------------------------------------------------------------------------
# Reply building (same experience as the web storefront)
# ---------------------------------------------------------------------------
def build_about(shop: dict) -> str:
    """Full shop About card: name, bio, complete description, contact."""
    name = _escape_html(shop.get("shop_name") or shop.get("username") or "Shop")
    owner = (shop.get("bio") or "").strip()
    descr = (shop.get("description") or "").strip()
    contact = (shop.get("contact") or "").strip()
    lines = [f"\U0001F3EA <b>{name}</b>"]
    if owner:
        lines += ["", "\U0001F4DD " + _escape_html(owner[:1800])]
    if descr and descr != owner:
        lines += ["", "\U0001F4C4 " + _escape_html(descr[:3600])]
    if contact:
        lines += ["", "\U0001F4CD " + _escape_html(contact[:500])]
    return "\n".join(lines)


def _fix_media(url):
    """Return a Telegram-fetchable http(s) URL for a banner/logo, or ''."""
    url = str(url or "").strip()
    if not url:
        return ""
    if not (url.startswith("http://") or url.startswith("https://")):
        return ""
    try:
        p = urlparse(url)
        host = (p.hostname or "").lower()
        if host in ("localhost", "127.0.0.1"):
            # A photo URL pointing at a local dev machine cannot be fetched by
            # Telegram - point it at the deployed backend host instead.
            base = urlparse(BASE_URL)
            out_host = (base.hostname or host)
            netloc = out_host
            if base.port and base.scheme == "https":
                netloc = f"{out_host}:{base.port}"
            url = urlunparse((base.scheme or p.scheme, netloc, p.path,
                              p.params, p.query, p.fragment))
    except Exception:
        return url
    return url


def _app_url(mini_url, username):
    """Append ?shop=<username> so one shared Mini App opens the right shop."""
    mini_url = str(mini_url or "").strip()
    if not mini_url or not username:
        return mini_url
    sep = "&" if "?" in mini_url else "?"
    return f"{mini_url}{sep}shop={username}"


def send_shop_welcome(token: str, chat_id, shop: dict) -> bool:
    """Banner/logo photo + full About + Open Shop button (always auto-replies)."""
    name = shop.get("shop_name") or shop.get("username") or "Shop"
    mini_url = _app_url((shop.get("mini_app_url") or "").strip(),
                        shop.get("username") or shop.get("shop_username") or "")
    button = None
    if mini_url:
        button = [[{"text": "Open Shop", "web_app": {"url": mini_url}}]]

    # 1) Photo first: banner (or logo) with a short welcome caption.
    media = _fix_media((shop.get("banner") or "").strip() or (shop.get("logo") or "").strip())
    if media:
        cap = f"\U0001F3EA <b>{_escape_html(name)}</b>"
        wkm = (shop.get("welcome_km") or "").strip()
        wen = (shop.get("welcome_en") or "").strip()
        if wkm or wen:
            cap += "\n" + _escape_html(wkm or wen)
        _send_photo(token, chat_id, media, caption=cap[:1000], keyboard=button)

    # 2) Full About text message.
    about = build_about(shop)
    if button:
        ok = _send_message(token, chat_id, about, keyboard=button)
        if not ok:  # never lose the reply
            _send_message(token, chat_id, about)
    else:
        _send_message(token, chat_id, about)
    return True



# ---------------------------------------------------------------------------
# Platform payment bot (guided Profile ID + Secret Key linking)
# ---------------------------------------------------------------------------
def _api_link(profile_id, secret_key, chat_id):
    """Ask the main API to verify the pair and link this chat for payment alerts."""
    payload = {"profile_id": profile_id, "secret_key": secret_key, "chat_id": str(chat_id)}
    for key in ([SERVICE_KEY] + ([DEFAULT_SERVICE_KEY] if DEFAULT_SERVICE_KEY and
                                 DEFAULT_SERVICE_KEY != SERVICE_KEY else [])):
        try:
            with httpx.Client(timeout=25) as client:
                resp = client.post(f"{BASE_URL}/api/bot-service/link",
                                   json=payload,
                                   headers={"X-Bot-Service-Key": key})
                if resp.status_code == 200:
                    return resp.json()
        except Exception:
            continue
    return {"ok": False, "detail": "Main API unreachable - try again in a minute."}


INTRO = ("👋 សូមស្វាគមន៍មកកាន់ Mini Shop Payment Bot!\n"
         "Welcome! This bot sends FULL payment-success alerts for your shop.\n\n"
         "1️⃣ Start\n"
         "2️⃣ ផ្ញើ Profile ID របស់ហាង / send your shop Profile ID\n"
         "3️⃣ ផ្ញើ Secret Key / send your Secret Key\n\n"
         "Profile ID + Secret Key: Dashboard → Telegram Mini App → Payment Alerts\n\n"
         "👥 Added this bot to your team group? Then send:\n"
         "/link <Profile ID> <Secret Key>")

STEPS = ("1️⃣ Start\n"
         "2️⃣ ផ្ញើ Profile ID / send Profile ID\n"
         "3️⃣ ផ្ញើ Secret Key / send Secret Key")


def handle_platform_update(update, bot, states):
    token = (bot.get("token") or "").strip()
    if not token:
        return
    member = update.get("my_chat_member") or {}
    if member:
        new_status = (member.get("new_chat_member") or {}).get("status")
        chat = member.get("chat") or {}
        if new_status in ("member", "administrator") and chat.get("id"):
            _send_message(token, chat["id"], INTRO)
        return

    msg = update.get("message") or {}
    text = (msg.get("text") or "").strip()
    chat = msg.get("chat") or {}
    chat_id = chat.get("id")
    if not chat_id or not text:
        return
    key = f"{token}:{chat_id}"
    state = states.get(key)
    lower = text.lower()

    if lower.startswith("/link "):
        parts = text.split()
        if len(parts) >= 3:
            res = _api_link(parts[1].strip(), parts[2].strip(), chat_id)
            states.pop(key, None)
            if res and res.get("ok"):
                log.info("Linked chat %s to shop %s for payment alerts",
                         chat_id, res.get("shop_username"))
                _send_message(token, chat_id, "✅ " + (res.get("detail") or "Linked!"))
            else:
                _send_message(token, chat_id,
                              "❌ " + ((res.get("detail") if res else "") or
                                       "Invalid Profile ID or Secret Key.")
                              + "\n\n" + STEPS)
        else:
            _send_message(token, chat_id,
                          "Usage: /link <Profile ID> <Secret Key>")
        return

    if lower in ("/start", "start", "/menu", "menu", "/help", "help") or not state:
        states[key] = {"step": "await_profile", "pid": ""}
        log.info("Platform payment bot got %s from chat %s", text[:12], chat_id)
        _send_message(token, chat_id, INTRO)
        return

    if state.get("step") == "await_profile":
        states[key] = {"step": "await_secret", "pid": text}
        _send_message(token, chat_id,
                      "✅ Profile ID បានទទួល!\n"
                      "🔑 Now send your Secret Key / ផ្ញើ Secret Key ឥឡូវនេះ")
        return

    if state.get("step") == "await_secret":
        pid = state.get("pid", "")
        res = _api_link(pid, text, chat_id)
        if res and res.get("ok"):
            states.pop(key, None)
            _send_message(token, chat_id, "✅ " + (res.get("detail") or "Linked!"))
            log.info("Linked chat %s to shop %s for payment alerts",
                     chat_id, res.get("shop_username"))
        else:
            states.pop(key, None)
            _send_message(token, chat_id,
                          "❌ " + ((res.get("detail") if res else "") or
                                   "Invalid Profile ID or Secret Key.")
                          + "\n\n" + STEPS + "\nPress /start to try again.")


def poll_platform(bot, offsets, states):
    token = (bot.get("token") or "").strip()
    if not token:
        return
    offset = offsets.get(token, 0)
    params = {"offset": offset + 1, "timeout": 0,  # short-poll = instant replies
              "allowed_updates": ["message", "my_chat_member"]}
    try:
        with httpx.Client(timeout=15) as client:
            resp = client.get(f"{TG_API}/bot{token}/getUpdates", params=params)
            data = resp.json()
    except Exception as exc:
        log.warning("getUpdates failed for %s: %s", _short(token), exc)
        return
    if not (data or {}).get("ok"):
        desc = ((data or {}).get("description") or "")
        if "webhook" in desc.lower() or resp.status_code == 409:
            _delete_webhook(token)
        else:
            log.error("getUpdates failed for %s: %s %s",
                      _short(token), data.get("error_code"), desc)
        return
    for upd in (data.get("result") or []):
        try:
            handle_platform_update(upd, bot, states)
        except Exception as exc:
            log.exception("Platform bot update error: %s", exc)
        offsets[token] = max(offsets.get(token, 0), upd.get("update_id", 0))


# ---------------------------------------------------------------------------
# Update handling
# ---------------------------------------------------------------------------
def handle_update(update: dict, shop: dict):
    token = (shop.get("bot_token") or "").strip()
    if not token:
        return

    # Bot was added to a chat/group -> welcome them too.
    member = update.get("my_chat_member") or {}
    if member:
        new_status = (member.get("new_chat_member") or {}).get("status")
        chat = member.get("chat") or {}
        if new_status in ("member", "administrator") and chat.get("id"):
            send_shop_welcome(token, chat["id"], shop)
        return

    msg = update.get("message") or {}
    if not msg.get("text"):
        return
    chat = msg.get("chat") or {}
    chat_id = chat.get("id")
    text = (msg.get("text") or "").strip()
    if not chat_id or not text:
        return

    parts = text.split()
    cmd = (parts[0] if parts else text).lower()
    lower = text.lower()
    chat_type = chat.get("type") or "private"

    # Owner linking (order alerts) still works - do NOT hijack these.
    if lower.startswith(("link ", "/link")) or cmd in ("/shop",):
        return  # handled by the main web API flow when webhook is used

    # /start, /menu, /help, "about", or any private message -> auto reply.
    if cmd in ("/start", "start", "/menu", "menu", "/help", "help",
               "/about", "about", "/info", "info"):
        log.info("Shop bot @%s got %s from chat %s",
                 shop.get("bot_username") or shop.get("username"), text[:12], chat_id)
        send_shop_welcome(token, chat_id, shop)
        return
    if chat_type == "private":
        log.info("Shop bot @%s got private message from chat %s",
                 shop.get("bot_username") or shop.get("username"), chat_id)
        send_shop_welcome(token, chat_id, shop)

def poll_bot(shop: dict, offsets: dict):
    token = (shop.get("bot_token") or "").strip()
    if not token:
        return
    offset = offsets.get(token, 0)
    params = {"offset": offset + 1, "timeout": 0,  # short-poll = instant replies
              "allowed_updates": ["message", "my_chat_member"]}
    try:
        with httpx.Client(timeout=15) as client:
            resp = client.get(f"{TG_API}/bot{token}/getUpdates", params=params)
            data = resp.json()
    except Exception as exc:
        log.warning("getUpdates failed for %s: %s", _short(token), exc)
        return

    if not (data or {}).get("ok"):
        desc = ((data or {}).get("description") or "")
        if "webhook" in desc.lower() or resp.status_code == 409:
            log.info("Webhook active for %s -> deleting it so polling works", _short(token))
            _delete_webhook(token)
        else:
            log.error("getUpdates failed for %s: %s %s",
                      _short(token), data.get("error_code"), desc)
        return

    updates = data.get("result") or []
    for upd in updates:
        try:
            handle_update(upd, shop)
        except Exception as exc:
            log.exception("Error handling update %s for %s", upd.get("update_id"), _short(token))
        offsets[token] = max(offsets.get(token, 0), upd.get("update_id", 0))


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
def main():
    if not SERVICE_KEY:
        log.error("MINI_BOT_SERVICE_KEY is not set. Create your own secret and put "
                  "the SAME value as BOT_SERVICE_KEY on the Backend_API you run. Exiting.")
        sys.exit(1)
    if DEFAULT_SERVICE_KEY and SERVICE_KEY != DEFAULT_SERVICE_KEY:
        log.info("Using MINI_BOT_SERVICE_KEY (must match BOT_SERVICE_KEY on the main API).")

    # Telegram HTTP headers only allow plain ASCII. A secret copied from a chat
    # message often contains an em dash / fancy quote and breaks every request.
    def _plain_ascii(value, name):
        try:
            value.encode("ascii")
            return True
        except UnicodeEncodeError as exc:
            log.error("%s contains a non-ASCII character (%r) at position %s. "
                      "Use only plain letters/numbers (no — “ ” ’ etc.) and set "
                      "the SAME value as BOT_SERVICE_KEY on the main API.",
                      name, value[exc.start], exc.start)
            return False

    if not _plain_ascii(SERVICE_KEY, "MINI_BOT_SERVICE_KEY") or \
       not _plain_ascii(BASE_URL, "MINI_BACKEND_BASE_URL"):
        sys.exit(1)

    offsets = {}
    states = {}
    webhook_cleared = set()
    last_beat = 0.0
    log.info("Mini Shop bot worker started - backend %s", BASE_URL)
    log.info("Polling every %s seconds for all dashboard-connected shop bots.", LOOP_SECONDS)

    cfg_cache = {"data": None, "at": 0.0}
    while True:
        try:
            if cfg_cache["data"] is None or time.time() - cfg_cache["at"] >= 15:
                cfg_cache["data"] = fetch_shops()
                cfg_cache["at"] = time.time()
            data = cfg_cache["data"]
            shops = data.get("shops") or []
        except Exception as exc:
            log.error("Could not load shops from %s: %s - retrying in 5s", BASE_URL, exc)
            cfg_cache["data"] = None
            time.sleep(5)
            continue

        # Platform payment bot (@minishoppaymentautobot) is answered through the
        # webhook on the always-on main API (guided /start + /link), so it is no
        # longer polled here (Telegram forbids webhook + getUpdates at once).
        pb = data.get("payment_bot") or {}
        ptok = (pb.get("token") or "").strip()

        for shop in shops:
            token = (shop.get("bot_token") or "").strip()
            if not token:
                continue
            if token not in webhook_cleared:
                if _delete_webhook(token):
                    webhook_cleared.add(token)
                    log.info("Polling mode ready for %s (%s)",
                             shop.get("bot_username") or shop.get("username"),
                             _short(token))
            poll_bot(shop, offsets)

        # Heartbeat so you can see the worker is alive and polling.
        if time.time() - last_beat >= 60:
            last_beat = time.time()
            log.info("heartbeat ok - %d shop bot(s) + platform bot %s",
                     len(shops), ("@" + str(pb.get('username'))) if ptok else "(none)")

        time.sleep(min(LOOP_SECONDS, 1.0))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("Worker stopped by user.")
        sys.exit(0)
