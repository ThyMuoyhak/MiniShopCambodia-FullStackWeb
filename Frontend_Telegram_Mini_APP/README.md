# Frontend_Telegram_Mini_APP - LOCAL STUDY COPY

> This folder is shared for learning only. It contains NO live credentials,
> NO real bot token and NO hosted API URL. Everything points to your local
> backend (`http://localhost:8000`) by default.

# Frontend_Telegram_Mini_APP

A per-shop **Telegram Mini App** storefront for MiniShop Cambodia. Customers open
it inside the shop's Telegram bot, see the **shop banner first + a Khmer
welcome**, browse products, and pay with the **same ABA Pay (KHQR)** system used
by the web/mobile storefronts. Orders/payments appear in the shop dashboard
and the owner's Telegram, just like web orders.

## Features (this stage)

- Banner + logo + shop name shown first (owner uploads in the Dashboard).
- Khmer + English welcome text for the owner shop.
- Auto-login with Telegram: the app sends the Web App `initData` to
  `POST /api/auth/telegram/mini/login`; the backend verifies the signature with
  the SHOP's bot token and returns the customer JWT (same accounts as the web
  customer login).
- Categories, product grid, product sheet (price/sale/qty), cart.
- Checkout: creates an order (`POST /api/orders`) then an ABA KHQR payment
  (`POST /api/payments/aba/create`), shows the QR/checkout, and verifies with
  `POST /api/payments/aba/verify`.
- The backend bot sends a welcome photo (banner) + "Open Shop" Web App button
  on `/start` and can set the bot chat menu button
  (`POST /api/telegram/mini/menu`).

## Run locally (development)

```bash
cd Frontend_Telegram_Mini_APP
npm install
cp .env.example .env.local     # set REACT_APP_API_URL=http://localhost:8000
npm start                      # http://localhost:3006/?shop=demo
```

Add `http://localhost:3006` to the backend CORS origins so the browser test
works (real Telegram clients do not need CORS).

Open in Telegram (production): host this app on HTTPS and enter its URL as the
shop's Telegram **Mini App URL**; then from the Dashboard:
1. Set the shop **bot token + bot username**,
2. Save the **Mini App URL** (stored in the shop telegram settings as
   `mini_app_url`),
3. Press **Set Mini App button** (menu button) - or simply share the bot
   `/start` link; the bot replies with the banner + "Open Shop" button.

## Backend endpoints used

| Purpose | Endpoint |
|---|---|

## Deploy to Netlify

1. Push this repo to GitHub (done: `minishop_frontend_telegram_mini_app`).
2. In Netlify: **Add new site -> Import an existing project -> pick the repo**.
3. No build settings needed - `netlify.toml` is already included:
   - Build: `npm run build`, publish folder: `build`.
   - `/api/*` is **proxied** to `http://localhost:8000`, so
     there are **no CORS errors** and you do **not** need to set
     `REACT_APP_API_URL` in Netlify (leave it unset).
   - Images load directly from the backend host (override with
     `REACT_APP_MEDIA_URL` if you run a different backend).
4. After the deploy you get an HTTPS URL, e.g.
   `https://<your-site>.netlify.app`.

### Connect it to your shop bot
In the shop Dashboard -> **Telegram Mini App**:
1. Verify + save your bot token/username.
2. Paste the Netlify URL as the **Mini App URL**.
3. Press **Set bot menu button**, or share the bot `/start` link.

Telegram opens Mini Apps only over **HTTPS**, which Netlify provides for free.

| Shop page | GET /api/shops/{username} |
| Categories / Products | GET /api/categories/public, GET /api/products/public |
| Telegram Mini auto-login | POST /api/auth/telegram/mini/login |
| Place order | POST /api/orders (customer JWT) |
| ABA KHQR payment | POST /api/payments/aba/create, /api/payments/aba/verify |
| Mini config (dashboard) | GET /api/telegram/mini/config |
| Set bot menu button | POST /api/telegram/mini/menu |

> This is a local-only development project. No real user data or secrets are
> stored in this folder.
