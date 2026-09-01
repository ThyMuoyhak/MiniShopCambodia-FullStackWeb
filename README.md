# 🛍️ MiniShop — Multi-Store E-Commerce Platform (Full-Stack)

> A complete multi-tenant e-commerce platform built with **FastAPI + React**. Every shop gets its own
> storefront, dashboard, POS, ABA Pay (KHQR) checkout, PDF invoices and Telegram notifications.
> **Free 1-month Starter plan** for new shops.

**This is a 100% code-only repository** — all data, databases, uploads, backups and production secrets
have been removed so you can safely clone it, learn from it and build your own project.

---

## ✨ Features at a glance

| Feature | Details |
|---|---|
| 🏪 **Multi-shop** | Each shop has its own `/:username` storefront, logo, banner, theme colors & fonts |
| 🎛️ **Self-serve signup** | Customers create their own shop, pick a plan (free 1-month starter, 6-month, 1-year) and pay via ABA |
| 💳 **ABA Pay (KHQR)** | Real KHQRcc checkout — QR image generated locally, sandbox & live modes, auto-confirm + webhook |
| 🧾 **PDF invoices** | Bilingual (Khmer + English) invoices with shop logo & theme color |
| 🛗 **POS** | In-store POS sale screen for shop staff |
| 💾 **Backup / Import** | JSON / ZIP / Excel backups — **ZIPs embed the real image files** and import restores them |
| 🤖 **Telegram** | Payment alerts, order notifications & low-stock alerts to the shop's group |
| 💸 **Resellers** | Referral codes, commissions %, promo discounts, per-shop revenue view |
| 🌐 **Bilingual** | Full Khmer (ភាសាខ្មែរ) + English UI, `Asia/Phnom_Penh` timezone |
| 🌗 **Dark / Light mode** | Every shop storefront supports both themes |
| 🔐 **Secure login** | bcrypt + JWT, role-based access, **failed-attempt lockout** (3 wrong → locked, escalating 5/10/15 min) |

---

## 🧰 Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3 · **FastAPI** · SQLAlchemy · SQLite (dev) / PostgreSQL (prod) · Uvicorn |
| Frontends | **React 18 (Create React App)** · Tailwind CSS · react-router-dom · recharts · chart.js |
| Auth | bcrypt · PyJWT (JWT bearer tokens) |
| Payments | ABA PayWay / KHQRcc (sandbox + live) |
| PDF | reportlab + optional headless Edge/Chromium for high-quality HTML invoices |
| Deploy | Render (backend) · Netlify (frontends) |

---

## 📁 Project structure (all 5 apps)

```
MiniShopCambodia-FullStackWeb
├── Backend_API/                  # FastAPI backend (single API for all frontends)
│   ├── main.py                   # App entry, migrations, static mounts, docs
│   ├── config.py                 # Config (env-driven — all secrets via env vars)
│   ├── database.py               # SQLAlchemy engine + session
│   ├── models.py                 # ORM models (Shop, User, Product, Order, …)
│   ├── schemas.py                # Pydantic request/response schemas
│   ├── security.py               # bcrypt, JWT, role guards
│   ├── seed.py                   # Seeds default admin + demo shop (fresh DB)
│   ├── routers/                  # API endpoints by domain
│   │   ├── auth.py               # login, telegram login, register users
│   │   ├── shops.py              # public shop lookup + admin CRUD + owner check
│   │   ├── products.py           # product CRUD + public listing
│   │   ├── categories.py         # category CRUD
│   │   ├── orders.py             # order CRUD + POS
│   │   ├── payments.py           # ABA Pay (KHQR) create/verify
│   │   ├── reports.py            # sales/product/customer/stock reports
│   │   ├── plans.py              # plans, self-serve register, upgrade, confirm, resellers
│   │   ├── backup.py             # backup & import (ZIP with images)
│   │   ├── uploads.py            # image uploads
│   │   ├── telegram.py           # Telegram bot + notifications
│   │   └── settings.py           # stats, platform settings
│   ├── services/
│   │   ├── aba_service.py        # ABA PayWay/KHQRcc integration
│   │   ├── invoice_service.py    # PDF invoices (bilingual, theme color)
│   │   ├── telegram_service.py   # Telegram bot helpers
│   │   ├── backup_service.py     # ZIP-with-images backup/restore
│   │   └── qr_service.py         # QR image generation
│   └── requirements.txt          # Python dependencies
│
├── Frontend_User/                # 🛍️ Storefront + self-serve signup (port 3000)
│   └── src/
│       ├── App.js                # Routes: home, /create-shop, /:username/*
│       ├── contexts/             # Shop, Cart, Customer, Owner, Theme
│       ├── components/           # Header, search, product cards/rows, slideshow…
│       └── pages/                # HomePage, CreateShop, ShopHome, Products,
│                                 # ProductDetail, Checkout, OrderSuccess, MyOrders, Profile, About
│
├── Frontend_Admin/               # 👨‍💼 Platform admin panel (port 3001)
│   └── src/pages/                # Dashboard (charts), Shops, Users, Resellers,
│                                 # ResellerDetail, Backup, ActivityLogs, Settings
│
├── Frontend_Dashboard_User/      # 🧑‍💼 Shop owner dashboard (port 3002)
│   └── src/pages/                # Dashboard, POS, Products, Categories, Stock, Orders,
│                                 # Customers, Reports, Receipts, PaymentSettings,
│                                 # TelegramSettings, UpgradePlan, Backup, ShopSettings
│
└── Frontend_Reseller/            # 💸 Reseller dashboard (port 3005)
    └── src/pages/                # Dashboard (charts), Shops, Commissions, Promo,
                                  # Backup, Settings
```

---

## 🚀 Getting started — from 0 to 100%

### 0. Prerequisites
- **Python 3.10+** and **Node.js 16+**
- A terminal (Git Bash / PowerShell / VS Code terminal)

> All secrets are loaded from **environment variables**. The defaults in the code are
> safe placeholders — copy them into a local `.env` (backend) / `.env.local` (frontends)
> and never commit real credentials.

### 1. Clone
```bash
git clone https://github.com/ThyMuoyhak/MiniShopCambodia-FullStackWeb.git
cd MiniShopCambodia-FullStackWeb
```

### 2. Start the Backend API  ⚙️
```bash
cd Backend_API
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
# create your .env from the environment-variables table below
uvicorn main:app --reload --port 8000
```
- ✅ On first start the database tables are created automatically + the default **admin** account is seeded.
- 📄 Interactive API docs: **http://localhost:8000/docs**

### 3. Start the Storefront — Frontend_User  🛍️ (port 3000)
```bash
cd Frontend_User
npm install
npm start          # opens http://localhost:3000
```

### 4. Start the Platform Admin — Frontend_Admin  👨‍💼 (port 3001)
```bash
cd Frontend_Admin
npm install
npm start          # opens http://localhost:3001  → login as admin
```

### 5. Start the Shop Dashboard — Frontend_Dashboard_User  🧑‍💻 (port 3002)
```bash
cd Frontend_Dashboard_User
npm install
npm start          # opens http://localhost:3002  → login as a shop owner
```

### 6. Start the Reseller Dashboard — Frontend_Reseller  💸 (port 3005)
```bash
cd Frontend_Reseller
npm install
npm start          # opens http://localhost:3005  → login as a reseller
```

> Tip: run all 5 with a tool like **concurrently** or open 5 terminals.
> The frontends talk to `http://localhost:8000` by default (settable via `REACT_APP_API_URL`).

### 7. Default accounts (created by the seed on a fresh database)
| Role | Username | Password | Where to login |
|---|---|---|---|
| Platform admin | `admin` | `ChangeMe123!` | Frontend_Admin (3001) |
| Shop owner (demo) | `demo` | `demo123` | Frontend_Dashboard_User (3002) / storefront owner login |
| Shop owner (self-serve) | *your username* | *you choose* | Frontend_Dashboard_User — created via `/create-shop` |

> ⚠️ **Change these immediately** in production via environment variables
> (`DEFAULT_ADMIN_PASSWORD`, or update the demo shop password in the dashboard).

### 8. Try the full flow 🎯
1. Open **http://localhost:3000** → homepage → **Create your own shop** (Starter plan is FREE — 1 month)
2. The shop opens instantly at **http://localhost:3000/<your-shop>** (no payment needed)
3. Login to **Frontend_Dashboard_User (3002)** with your new username/password → add products, categories, logo
4. Back on the storefront, browse → checkout with **ABA Pay (sandbox)** or place a test order
5. Admin panel (3001) → manage shops, plans, resellers, backup/import, view live charts

---


## 🔑 Environment variables (backend — `Backend_API/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///data/minishop.db` | SQLite for dev; use `postgresql://…` in production |
| `DATA_DIR` | `./data` | Where the SQLite DB lives (persistent disk in prod) |
| `UPLOAD_DIR` | `./uploads` | Product images, logos, QR codes, receipts |
| `BACKUP_DIR` | `./backups` | Backup/export files |
| `BASE_URL` | `http://localhost:8000` | Public backend URL (used in receipts/links) |
| `MINISHOP_SECRET_KEY` | dev placeholder | **JWT signing key — change in production!** |
| `DEFAULT_ADMIN_USERNAME` | `admin` | Seed admin username |
| `DEFAULT_ADMIN_PASSWORD` | `ChangeMe123!` | Seed admin password |
| `DEFAULT_ADMIN_EMAIL` | `admin@example.com` | Seed admin email |
| `TELEGRAM_BOT_TOKEN` | *(empty)* | Platform-level Telegram bot token |
| `PLATFORM_SHOP_USERNAME` | `demo` | Which shop collects plan payments (ABA) |
| `STORE_URL` | `http://localhost:3000` | Storefront URL used in referral links |
| `DASHBOARD_URL` | `http://localhost:3002` | Shop-dashboard URL opened from the storefront |
| `CORS_ORIGINS` | localhost:3000/3001/3002/3005 | Comma-separated extra CORS origins |
| `EDGE_PATH` / `CHROME_PATH` | *(empty)* | Path to Edge/Chromium for high-quality HTML→PDF invoices |
| `ABA_*` (PayWay/KHQRcc) | via Payment Settings UI | Profile ID + Secret Key are stored per-shop (never hard-coded) |

**Frontends** (`Frontend_User/.env.local`, etc.):
| Variable | Default | Purpose |
|---|---|---|
| `REACT_APP_API_URL` | `http://localhost:8000` | Backend API base URL |
| `REACT_APP_DASHBOARD_URL` | `http://localhost:3002` | Dashboard URL for the "ផ្ទាំងគ្រប់គ្រង" button |

---

## 🧠 How the platform works (concept → code)

1. **Shop = a storefront.** Every shop lives at `GET /api/shops/:username` (public) and has its own
   dashboard at `/:username` in `Frontend_User`. Theme, logo, banner and social links are per-shop.
2. **Self-serve registration.** `POST /api/plans/register` creates the shop + owner + a plan order.
   The **Starter plan is free** (1 month) so the shop activates immediately at `$0`; paid plans
   (6-month / 1-year) create an ABA order that is confirmed via `POST /api/plans/confirm`.
   Upgrading an existing shop goes through `POST /api/plans/upgrade` (owner-only) — the expiry is
   **extended** from the later of today/current expiry.
3. **Payments.** `services/aba_service.py` builds a PayWay/KHQRcc checkout URL, generates a local
   QR PNG under `/uploads/qr`, and `POST /api/payments/aba/verify` confirms it. Sandbox mode auto-succeeds.
4. **PDF invoices.** `services/invoice_service.py` renders bilingual (Khmer + English) invoices with
   the shop logo + theme color — using reportlab (always works) or headless Edge/Chromium for nicer output.
5. **Telegram.** `services/telegram_service.py` sends new-order, payment and low-stock alerts to the
   shop's group. Receipt links are sanitized to public `/uploads/receipts/…` URLs only.
6. **Backup with images.** `services/backup_service.py` bundles **every referenced image** into the ZIP
   under `images/` and rewrites paths to portable `images/…`; import extracts them back and rewrites to
   `/uploads/…` so the shop looks identical on another machine.
7. **Security.** bcrypt password hashes, JWT bearer tokens, role guards (`get_current_admin`,
   `get_current_shop_user`, `require_shop_access`), rate limiting, and a **failed-login lockout**
   (3 wrong passwords → 5 min lock, each further lock +5 min — enforced server-side).

---


## 🔌 Key API endpoints (`/api/…`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/login` | public | Login admin / shop owner / staff (with lockout) |
| GET | `/shops/:username` | public | Public shop lookup |
| GET | `/shops/:id/detail` | owner/admin | Full shop detail (settings, counts) |
| GET | `/shops/:id/owner` | any user | `{ is_owner }` — server-verifies the Dashboard button |
| GET | `/products/public` | public | Public product listing (search, category, sort) |
| GET | `/categories` | owner/admin | Categories |
| POST | `/orders` | public | Create a customer order |
| POST | `/orders/pos` | owner | POS sale |
| POST | `/payments/aba/create` | public | Create ABA PayWay payment (QR) |
| POST | `/payments/aba/verify` | public | Verify ABA payment |
| GET | `/plans` | public | Available plans (with free offer + expiry) |
| POST | `/plans/register` | public | Self-serve shop + plan registration (returns owner token) |
| POST | `/plans/upgrade` | owner | Upgrade / extend the shop plan |
| POST | `/plans/confirm` | public | Confirm plan payment / free activation |
| GET | `/plans/charts` | admin | Platform-wide dashboard charts |
| POST | `/plans/resellers` | admin | Reseller CRUD |
| GET | `/backup/admin/export` | admin | Export system backup (JSON/ZIP/Excel) |
| POST | `/backup/admin/import` | admin | Import backup (ZIP restores images too) |
| GET | `/reports/overview` | owner | Shop dashboard stats |
| POST | `/telegram/test` | owner | Test Telegram bot |

Full interactive docs: **http://localhost:8000/docs**

---

## ☁️ Deployment notes

- **Backend → Render / Railway / any VPS:**
  - Set the env vars from the table above
  - Use a **persistent disk** for `DATA_DIR`, `UPLOAD_DIR`, `BACKUP_DIR`
  - Set `BASE_URL` to your public backend URL and `CORS_ORIGINS` to your frontend domains
- **Frontends → Netlify / Vercel:** build with `npm run build`; set `REACT_APP_API_URL` to your deployed backend
- **ABA Pay:** fill Profile ID + Secret Key in each shop's **Payment Settings** (sandbox first).
  Until configured, checkout shows "Online payment unavailable".
- **PDF quality:** install Edge/Chromium on the server and set `EDGE_PATH`/`CHROME_PATH`
  for full-quality bilingual invoices (reportlab is the automatic fallback).

---

## 🔒 Security & privacy (this repository)

This public repository contains **code only**. The following were intentionally removed/scrubbed:

- ❌ Databases (`*.db`, `data/`) — no customer/order/user data
- ❌ `uploads/`, `backups/` — no real images, receipts, QR codes or exports
- ❌ `node_modules/`, `build/`, `venv/` — install dependencies yourself
- ❌ Real admin password, admin email, personal Telegram handle and production URLs —
  replaced with safe placeholders loaded from environment variables
- ✅ `.env` files are git-ignored — never commit real credentials

**Best practices for your own project:**
- Always store secrets in environment variables, never in code
- Change `MINISHOP_SECRET_KEY` and admin passwords before going live
- Keep `UPLOAD_DIR`/`DATA_DIR`/`BACKUP_DIR` on a persistent disk in production
- Enable HTTPS on the backend and set a strict `CORS_ORIGINS` allow-list

---

## 📜 License

This project is shared **for learning and portfolio purposes**. You may clone it to study the
architecture and build your own project. If you use parts of it, a credit/link back is appreciated.
No warranty is provided — use at your own risk.

---

**Happy building! 🚀** If this helped you, give the repo a ⭐ and share it with other learners.

