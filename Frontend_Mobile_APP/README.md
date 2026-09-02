# 📱 Frontend_Mobile_APP (Flutter)

The **mobile storefront** for MiniShop Cambodia — a Flutter app that mirrors the
`Frontend_User` (web storefront) and talks to the same **FastAPI backend**.

## ✨ What it does

| Feature | How |
|---|---|
| 🔍 Open any shop by username | `GET /api/shops/{username}` |
| 🏪 Shop home (banner, logo, theme colors) | shop `theme.primary` / `secondary` |
| 🗂️ Categories + product grid | `GET /api/categories/public`, `GET /api/products/public` |
| 🛒 Product detail (gallery, variations, qty) | `GET /api/products/{id}/public` |
| 🧺 Cart (add / qty / remove / totals) | local state (Provider) |
| 👤 Customer login / signup | `POST /api/customers/auth/signin` · `/signup` |
| 🛍️ Checkout + **ABA Pay (KHQR)** | `POST /api/orders` → `/api/payments/aba/create` → poll `/verify` |
| 📦 My Orders + track order | `GET /api/customers/auth/orders` · `/api/orders/public/track` |
| 🚀 Create your own shop (FREE starter) | `POST /api/plans/register` → `/confirm` |
| 🌗 Dark / light mode | shop-theme aware |

## 🚀 Run it

```bash
cd Frontend_Mobile_APP
flutter pub get

# Default: LOCAL backend (http://localhost:8000)
flutter run -d chrome

# Android emulator (backend on the host):
flutter run --dart-define=API_URL=http://10.0.2.2:8000

# Point at your own deployed backend:
flutter run --dart-define=API_URL=https://your-api.onrender.com
```

> ⚠️ **CORS**: when running as a **web app** in Chrome against a remote backend,
> the browser blocks requests unless that backend's `CORS_ORIGINS` includes your
> origin — add `http://localhost:8080` (then redeploy) for local web testing.
> Native Android/iOS builds have **no CORS restriction**.

### Requirements
- Flutter SDK **3.27+** (https://docs.flutter.dev/get-started/install)
- The backend running on port `8000` (see the root README)

## 🧩 Structure

```
lib/
├── main.dart                 # App entry + theme wiring
├── config.dart               # API base URL (--dart-define)
├── models/                   # Shop, Product, Category, Customer, Order, Plan, CartItem
├── services/                 # ApiClient + Shop/Product/Customer/Order services
├── providers/                # Shop, Cart, Customer, Theme (Provider state)
├── screens/                  # Splash, Home, ShopHome, Products, ProductDetail,
│                             # Cart, Checkout, OrderSuccess, MyOrders, Auth, Profile, CreateShop
└── widgets/                  # ProductCard, CategoryChip, ShopHeader, QtyStepper…
```

## 🔌 Backend endpoints used

See the root README → "Complete API reference". Key ones for this app:

- `GET  /api/shops/{username}`
- `GET  /api/categories/public?shop_id=`
- `GET  /api/products/public?shop_id=&category_id=&search=&sort=`
- `GET  /api/products/{id}/public`
- `POST /api/plans/register` · `POST /api/plans/confirm`
- `POST /api/customers/auth/signup|signin` · `GET /api/customers/auth/me|orders`
- `POST /api/orders` *(requires customer Bearer token)*
- `POST /api/payments/aba/create` · `POST /api/payments/aba/verify`
- `GET  /api/orders/public/track?order_number=`

## 📝 Note

The backend currently requires a **logged-in customer** to create an order
(identical to the web storefront), so the Checkout screen shows login/signup
first. Payment works in **sandbox mode** (auto-succeeds) or real ABA Pay when
the shop has configured its Profile ID + Secret Key.
