# Backend_Telegram_Mini_App - LOCAL STUDY COPY

> This folder is shared for learning only. It contains NO live bot token and
> NO shared secret. You must create your own `MINI_BOT_SERVICE_KEY` and run it
> against your own local `Backend_API` (`http://localhost:8000`).

# Backend_Telegram_Mini_App

A standalone **background bot worker** for Mini Shop. It runs 24/7 on Render and
**auto-replies to every customer who presses /start** on any shop bot that an owner
connected in the Dashboard:

1. 🖼 sends the shop **banner photo** first (falls back to the logo),
2. 📋 then a message with the **shop name + bio + FULL description + contact**
   (the real owner data from the shop),
3. 🛍️ with an **Open Shop button** below it that opens the shop's Telegram Mini App
   (which shows the full storefront like Frontend_User).

It uses Telegram **long-polling (`getUpdates`)** — not webhooks — so it works even
when the main web API is busy or sleeping.

## How it works

- The worker asks the **main Mini Shop API** for the list of connected shop bots:
  `GET {MINI_BACKEND_BASE_URL}/api/bot-service/config`
  with header `X-Bot-Service-Key: {MINI_BOT_SERVICE_KEY}`.
- For every shop that has saved a bot token (+ Mini App URL), it polls Telegram
  and replies to `/start`, `/menu`, `/help`, and any private message.

## Setup (2 places)

### 1) Main Mini Shop backend API (no required variables anymore)
A built-in default secret is already shared between the API and the worker, so it
works out of the box. For stronger security you may set:
```
BOT_SERVICE_KEY=your-own-secret     # OPTIONAL (must match the worker if set)
BOT_SERVICE_ENABLED=true            # RECOMMENDED (stops webhook registration)
```
Then redeploy the main API.

### 2) This worker (Render background service)
- Push this folder to its own GitHub repo.
- Render → **New + → Background Worker** → connect the repo.
- Add environment variables:
  - `MINI_BACKEND_BASE_URL` = your main API, e.g. `http://localhost:8000`
  - `MINI_BOT_SERVICE_KEY` = **only needed if you set a custom BOT_SERVICE_KEY on
    the main API** — otherwise delete it and the built-in default is used
  - `LOOP_SECONDS` = `2`
- Start command: `python bot_worker.py`

## Local test
```
pip install -r requirements.txt
set MINI_BOT_SERVICE_KEY=your-secret   (PowerShell) / export ... (bash)
python bot_worker.py
```

## Owner flow reminder (in the Dashboard)
1. Create the bot in @BotFather.
2. Dashboard → Telegram Mini App → paste **Bot Token + Bot Username** → **Check & Save Bot**.
3. Save the **Mini App URL** (your deployed Telegram Mini App).
4. Customer presses **Start** on the bot → banner + full shop info + **Open Shop** button appear automatically.

## Note
- `link <ProfileID> <SecretKey>` order-alert linking is a main-API (webhook) feature;
  this worker intentionally ignores those commands so they are never hijacked.
- The worker deletes any existing webhook on the bots it manages (needed for polling).
