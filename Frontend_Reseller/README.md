# Mini Shop — Reseller Dashboard

Professional dashboard for **resellers** who earn commission by referring new shops.

## Features

- **Login** — reseller accounts created by the platform admin
- **Dashboard** — registered shops, plan sales, commission (rate %), promo code
- **Shops** — every shop registered with your promo code (plan, price, discount, status, expiry)
- **Commissions** — per-shop commission breakdown + totals
- **Promo Code** — your referral code + signup link; give customers up to `discount_max` ($1 by default) off the plan price
- **Backup & Import** — export all your data (ZIP full backup / JSON / Excel) and import it back (`.zip`/`.json` only your shops)
- **Settings** — profile + change password

## How commission works

- Admin sets your commission rate (e.g. **10%**)
- Customer pays for a plan using your code → e.g. a **$9.99** Starter plan pays you **$0.99**
- You may offer a discount of **$0–$1** (admin-set `discount_max`); the customer pays `plan price − discount`, and your commission is based on the final paid price

## Setup

```bash
npm install
npm start          # dev on http://localhost:3005
npm run build      # production build
```

API base defaults to `http://localhost:8000` — override with `REACT_APP_API_URL`
(already set to the Render backend in `netlify.toml` for Netlify deploys).
