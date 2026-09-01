# 🛍️ MiniShop — Multi-Store E-Commerce Platform (Full-Stack)

> A complete **multi-tenant e-commerce platform** where every shop gets its own storefront, dashboard,
> POS, **ABA Pay (KHQR)** checkout, PDF invoices, Telegram notifications and **reseller commissions**.
> Built with **FastAPI + React (5 apps)** and a **free 1-month Starter plan** for new shops.

**This repository is 100% code** — all data, databases, uploads, backups and production secrets have
been removed so you can safely clone it, study it and build your own project.

---

## 🌐 Live Demo (production)

| Link | What you'll see |
|---|---|
| **https://minishopcambodia.store** | Public storefront homepage (bilingual, plans, pricing) |
| **https://minishopcambodia.store/demo** | A real working shop (products, cart, ABA checkout, orders) |
| `/create-shop` | Self-serve shop registration — Starter plan is **FREE (1 month)** |

> Demo admin / owner credentials are shown in the deployed apps' login pages (demo / demo123).

---

## 👨‍💻 Developed by

**Thy Muoyhak** — aka **HakSimpleDev**

| | |
|---|---|
| 💬 Telegram | [t.me/your_telegram](https://t.me/your_telegram) |
| 🐙 GitHub | [github.com/ThyMuoyhak](https://github.com/ThyMuoyhak) |
| 🎓 Purpose | Learn, strengthen skills, and build a portfolio with a production-grade full-stack project |

---

## ✨ Features at a glance

| Feature | Details |
|---|---|
| 🏪 **Multi-shop** | Each shop has its own `/:username` storefront, logo, banner, theme colors & fonts |
| 🎛️ **Self-serve signup** | Customers create their own shop, pick a plan (free 1-month starter, 6-month, 1-year) and pay via ABA |
| 💳 **ABA Pay (KHQR)** | Real KHQR payment — QR image generated locally, sandbox & live modes, auto-confirm + webhook |
| 🧾 **PDF invoices** | Bilingual (Khmer + English) invoices with shop logo & theme color |
| 🛗 **POS** | In-store POS sale screen for shop staff |
| 💾 **Backup / Import** | JSON / ZIP / Excel backups — **ZIPs embed the real image files** and import restores them |
| 🤖 **Telegram** | Payment alerts, order notifications & low-stock alerts to the shop's group |
| 💸 **Resellers** | Referral codes, commissions %, promo discounts, per-shop revenue view |
| 🔐 **Secure login** | bcrypt + JWT, role-based access, **failed-attempt lockout** (3 wrong → locked, escalating 5/10/15 min) |
| 🌐 **Bilingual** | Full Khmer (ភាសាខ្មែរ) + English UI, `Asia/Phnom_Penh` timezone |
| 🌗 **Dark / Light mode** | Every shop storefront supports both themes |
| 📊 **Dashboards** | Admin (6 charts), shop owner, and reseller dashboards with real data |

---

## 🏗️ Architecture

```mermaid
graph TB
    subgraph Frontend_Apps
        FU["Frontend_User 🛍️<br/>Storefront + signup<br/>:3000"]
        FA["Frontend_Admin 👨‍💼<br/>Platform admin<br/>:3001"]
        FD["Frontend_Dashboard_User 🧑‍💻<br/>Shop owner dashboard<br/>:3002"]
        FR["Frontend_Reseller 💸<br/>Reseller dashboard<br/>:3005"]
    end

    API["FastAPI Backend 🐍<br/>uvicorn :8000<br/>routers/ + services/"]

    DB[("Database<br/>SQLite (dev)<br/>PostgreSQL (prod)")]
    UPL[("Uploads<br/>images · QR · receipts")]
    ABA["ABA Pay / KHQR<br/>PayWay gateway"]
    TG["Telegram Bot"]

    FU --> API
    FA --> API
    FD --> API
    FR --> API

    API --> DB
    API --> UPL
    API --> ABA
    API --> TG

    FU -- "receipt / QR url" --> UPL
    API -- "payment webhook" --> ABA
```

---

## 🔄 Core flows

### 1) Self-serve shop registration + FREE plan

```mermaid
sequenceDiagram
    participant U as Customer (Storefront)
    participant F as Frontend_User
    participant A as Backend API
    participant DB as Database
    participant ABA as ABA Pay (KHQR)

    U->>F: Opens /create-shop
    U->>F: Picks Starter (FREE 1 month) / Growth / Premium
    F->>A: POST /api/plans/register {shop, owner, plan}
    A->>DB: Create shop + owner account + plan order
    alt Free plan (Starter)
        A->>DB: Shop ACTIVE at $0, expires +30 days
        A-->>F: {free: true, access_token}
        F->>U: 🎉 Shop open! auto-login + Dashboard button
    else Paid plan (6 / 12 months)
        A->>ABA: Build checkout (QR)
        ABA-->>A: checkout_url + qr_code_url
        A-->>F: {payment}
        F->>ABA: Customer pays via ABA app
        F->>A: POST /api/plans/confirm
        A->>DB: Shop ACTIVE, expiry +N days
        A-->>F: verified ✅
    end
```

### 2) Customer checkout + ABA payment

```mermaid
sequenceDiagram
    participant C as Customer
    participant F as Frontend_User
    participant A as Backend API
    participant ABA as ABA Pay (KHQR)
    participant T as Telegram

    C->>F: Adds to cart → Checkout
    F->>A: POST /api/orders (create order)
    F->>A: POST /api/payments/aba/create
    A->>ABA: Build PayWay checkout
    ABA-->>A: QR image + checkout URL
    A-->>F: payment (qr_code_url, checkout_url)
    C->>ABA: Scans QR / pays in ABA app
    A->>ABA: Verify / webhook
    ABA-->>A: confirmed ✅
    A->>A: Generate PDF invoice (Khmer + English)
    A->>T: Send order + payment notification
    A-->>F: verified → Order success page 🎉
```

### 3) Backup & import (ZIP includes real images)

```mermaid
flowchart LR
    subgraph Export
        B1["Admin clicks Download ZIP"] --> B2["Backend scans every /uploads/… ref"]
        B2 --> B3["Copies real files into images/ folder"]
        B3 --> B4["Rewrites JSON refs to images/…"]
        B4 --> B5["system_backup_*.zip"]
    end

    subgraph Import
        I1["Same ZIP on another machine"] --> I2["Backend extracts images/"]
        I2 --> I3["Files copied into UPLOAD_DIR"]
        I3 --> I4["Refs rewritten to /uploads/…"]
        I4 --> I5["Shop + images fully restored ✅"]
    end

    B5 -. portable .-> I1
```

---


## 🧰 Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3.10+ · **FastAPI** · SQLAlchemy · SQLite (dev) / PostgreSQL (prod) · Uvicorn |
| Frontends | **React 18 (Create React App)** · Tailwind CSS · react-router-dom · recharts · chart.js |
| Auth | bcrypt · PyJWT (JWT bearer tokens) · role guards + failed-login lockout |
| Payments | **ABA Pay (KHQR)** — PayWay gateway (sandbox + live) |
| PDF | reportlab + optional headless Edge/Chromium for high-quality HTML invoices |
| Deploy | Render / Railway / VPS (backend) · Netlify / Vercel (frontends) |

---

## 📁 Project structure (all 5 apps)

```
MiniShopCambodia-FullStackWeb
├── Backend_API/                  # FastAPI backend — ONE API for all frontends
│   ├── main.py                   # App entry, auto-migrations, static mounts, docs
│   ├── config.py                 # Config — every secret comes from env vars
│   ├── database.py               # SQLAlchemy engine + session
│   ├── models.py                 # ORM models (Shop, User, Product, Order, …)
│   ├── schemas.py                # Pydantic request / response schemas
│   ├── security.py               # bcrypt, JWT, role guards
│   ├── seed.py                   # Seeds default admin + demo shop (fresh DB)
│   ├── .env.example              # Environment-variable template
│   ├── routers/                  # API endpoints by domain
│   │   ├── auth.py               # login, telegram login, user registration
│   │   ├── shops.py              # public shop lookup, admin CRUD, owner check
│   │   ├── products.py           # product CRUD + public listing (search/sort)
│   │   ├── categories.py         # category CRUD
│   │   ├── orders.py             # order CRUD + POS orders
│   │   ├── payments.py           # ABA Pay (KHQR) create / verify / test
│   │   ├── reports.py            # sales / product / customer / stock reports
│   │   ├── plans.py              # plans, register, upgrade, confirm, resellers
│   │   ├── backup.py             # backup & import (ZIP with images)
│   │   ├── uploads.py            # image upload
│   │   ├── telegram.py           # Telegram bot + notifications
│   │   └── settings.py           # stats + platform settings
│   ├── services/
│   │   ├── aba_service.py        # ABA Pay / KHQR integration
│   │   ├── invoice_service.py    # PDF invoices (bilingual, theme color)
│   │   ├── telegram_service.py   # Telegram helpers (safe public URLs)
│   │   ├── backup_service.py     # ZIP-with-images backup / restore
│   │   └── qr_service.py         # QR image generation
│   └── requirements.txt
│
├── Frontend_User/                # 🛍️ Storefront + self-serve signup (port 3000)
│   └── src/
│       ├── App.js                # Routes: /, /create-shop, /:username/*
│       ├── contexts/             # Shop, Cart, Customer, Owner, Theme
│       ├── components/           # Header, search bar, product cards/rows, slideshow…
│       └── pages/                # HomePage, CreateShop, ShopHome, Products,
│                                 # ProductDetail, Checkout, OrderSuccess, MyOrders, Profile, About
│
├── Frontend_Admin/               # 👨‍💼 Platform admin panel (port 3001)
│   └── src/pages/                # Dashboard (6 charts), Shops, Users, Resellers,
│                                 # ResellerDetail, Backup, ActivityLogs, Settings
│
├── Frontend_Dashboard_User/      # 🧑‍💻 Shop owner dashboard (port 3002)
│   └── src/pages/                # Dashboard, POS, Products, Categories, Stock, Orders,
│                                 # Customers, Reports, Receipts, PaymentSettings,
│                                 # TelegramSettings, UpgradePlan, Backup, ShopSettings
│
└── Frontend_Reseller/            # 💸 Reseller dashboard (port 3005)
    └── src/pages/                # Dashboard (charts), Shops, Commissions, Promo,
                                  # Backup, Settings
```


## 🚀 Getting started — from 0 to 100%

### 0. Prerequisites
- **Python 3.10+** and **Node.js 16+**
- A terminal (Git Bash / PowerShell / VS Code terminal)

> All secrets are loaded from **environment variables**. The defaults in the code are
> safe placeholders — copy the template into a local `.env` and **never commit real credentials**.

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
cp .env.example .env          # then edit values (see the env table below)
uvicorn main:app --reload --port 8000
```
- ✅ Tables are created + the default **admin** account is seeded on first start.
- 📄 Interactive API docs: **http://localhost:8000/docs**

### 3. Start the Storefront — Frontend_User  🛍️ (3000)
```bash
cd Frontend_User
npm install
npm start
```

### 4. Start the Platform Admin — Frontend_Admin  👨‍💼 (3001)
```bash
cd Frontend_Admin
npm install
npm start          # login as admin
```

### 5. Start the Shop Dashboard — Frontend_Dashboard_User  🧑‍💻 (3002)
```bash
cd Frontend_Dashboard_User
npm install
npm start          # login as a shop owner (demo)
```

### 6. Start the Reseller Dashboard — Frontend_Reseller  💸 (3005)
```bash
cd Frontend_Reseller
npm install
npm start          # login as a reseller
```

### 7. Default accounts (seeded on a fresh database)
| Role | Username | Password | Login at |
|---|---|---|---|
| Platform admin | `admin` | `ChangeMe123!` | Frontend_Admin :3001 |
| Shop owner (demo) | `demo` | `demo123` | Frontend_Dashboard_User :3002 |
| Shop owner (self-serve) | *your username* | *you choose* | created via `/create-shop` |

> ⚠️ **Change these in production** (env vars + dashboard settings).

### 8. Try the full flow 🎯
1. Storefront (**3000**) → **Create your own shop** (Starter = FREE 1 month) → shop opens instantly
2. Login to the shop dashboard (**3002**) → add products, categories, logo, theme
3. Back on the storefront → browse → **checkout with ABA Pay (sandbox)**
4. Admin (**3001**) → manage shops / resellers / backups → watch the live charts

---


## 🗄️ Using PostgreSQL instead of SQLite

The app ships with **SQLite** so you can run it with zero setup. For production, **PostgreSQL** is
recommended (concurrency, persistence, reliability). Switching is **just a config change** — no code edits:

### 1. Create the database
```sql
CREATE DATABASE minishop;
CREATE USER minishop_user WITH PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE minishop TO minishop_user;
```

### 2. Set `DATABASE_URL` in `.env`
```env
DATABASE_URL=postgresql://minishop_user:your-strong-password@localhost:5432/minishop
```

### 3. Install the PostgreSQL driver
Add to `Backend_API/requirements.txt` (or pip install):
```
psycopg2-binary
```
```bash
pip install psycopg2-binary
```

### 4. Restart the backend
```bash
uvicorn main:app --reload --port 8000
```
- On startup the app **auto-creates the tables** and **auto-migrates** missing columns,
  exactly like SQLite — no Alembic required.
- JSON fields (`settings`, `slideshow`, `theme`, `aba_settings`, …) are stored as JSON strings,
  which works the same on both databases.

### 5. Move existing data (optional)
Export a **ZIP backup** from the admin panel (Backup → Download ZIP) on the SQLite server, then
**import it** on the PostgreSQL server — shops, users, orders **and images** are restored automatically.

> 💡 Tip: set `DATA_DIR` / `UPLOAD_DIR` / `BACKUP_DIR` to a **persistent disk** on your host so
> uploads survive redeploys.

---

## 🔑 Environment variables (backend — `Backend_API/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///data/minishop.db` | SQLite for dev; `postgresql://…` for production |
| `DATA_DIR` | `./data` | Where the DB lives (use a persistent disk in prod) |
| `UPLOAD_DIR` | `./uploads` | Product images, logos, QR codes, receipts |
| `BACKUP_DIR` | `./backups` | Backup / export files |
| `BASE_URL` | `http://localhost:8000` | Public backend URL (used in receipts/links) |
| `MINISHOP_SECRET_KEY` | dev placeholder | **JWT signing key — change in production!** |
| `DEFAULT_ADMIN_USERNAME` | `admin` | Seed admin username |
| `DEFAULT_ADMIN_PASSWORD` | `ChangeMe123!` | Seed admin password |
| `DEFAULT_ADMIN_EMAIL` | `admin@example.com` | Seed admin email |
| `TELEGRAM_BOT_TOKEN` | *(empty)* | Platform-level Telegram bot token |
| `PLATFORM_SHOP_USERNAME` | `demo` | Which shop collects plan payments (ABA) |
| `STORE_URL` | `http://localhost:3000` | Storefront URL used in referral links |
| `DASHBOARD_URL` | `http://localhost:3002` | Shop-dashboard URL (ផ្ទាំងគ្រប់គ្រង button) |
| `CORS_ORIGINS` | localhost:3000/3001/3002/3005 | Extra comma-separated CORS origins |
| `EDGE_PATH` / `CHROME_PATH` | *(empty)* | Path to Edge/Chromium for high-quality PDF invoices |
| ABA (PayWay/KHQR) | via Payment Settings UI | Profile ID + Secret Key stored per-shop (never hard-coded) |

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
   The **Starter plan is free (1 month)** so the shop activates immediately at `$0`; paid plans
   (6-month / 1-year) create an ABA order confirmed via `POST /api/plans/confirm`.
   Upgrading an existing shop goes through `POST /api/plans/upgrade` (owner-only) — the expiry is
   **extended** from the later of today/current expiry.
3. **Payments.** `services/aba_service.py` builds a PayWay checkout URL, generates a local QR PNG
   under `/uploads/qr`, and `POST /api/payments/aba/verify` confirms it. Sandbox mode auto-succeeds.
4. **PDF invoices.** `services/invoice_service.py` renders bilingual (Khmer + English) invoices with
   the shop logo + theme color — reportlab always works; headless Edge/Chromium gives nicer output.
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
| POST | `/payments/aba/create` | public | Create ABA Pay (KHQR) payment |
| POST | `/payments/aba/verify` | public | Verify ABA payment |
| GET | `/plans` | public | Available plans (free offer + expiry) |
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

- **Backend → Render / Railway / any VPS**
  - Set the env vars from the table above (use PostgreSQL)
  - Use a **persistent disk** for `DATA_DIR`, `UPLOAD_DIR`, `BACKUP_DIR`
  - Set `BASE_URL` to your public backend URL and `CORS_ORIGINS` to your frontend domains
- **Frontends → Netlify / Vercel**: `npm run build`, set `REACT_APP_API_URL` to your deployed backend
- **ABA Pay (KHQR):** fill Profile ID + Secret Key in each shop's **Payment Settings** (sandbox first).
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

## 🙏 Support the project

- ⭐ Star this repo and share it with other learners
- 💬 Questions / ideas → Telegram [t.me/your_telegram](https://t.me/your_telegram)
- 🌍 Live demo → **https://minishopcambodia.store** · **https://minishopcambodia.store/demo**

**Happy building! 🚀**

