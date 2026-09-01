# minishop_backend_api

# Backend API — Mini Shop Platform

FastAPI + SQLite backend for the multi-shop e-commerce platform.

## Quick start (Windows)

```
start.bat
```

Or manually:

```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python generate_demo_images.py   # generates demo shop placeholder images
uvicorn main:app --reload --port 8000
```

## Default accounts (seeded automatically)

| Role       | Username     | Password            |
|------------|--------------|---------------------|
| Admin      | admin        | set in `config.py` / env (no default shown) |
| Demo owner | demo         | `demo123` (demo data only) |

> Users cannot self-register. New shop accounts are created by the platform
> admin only (contact via Telegram: **@your_telegram**).

## API docs

- Swagger UI: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

## Key endpoints

- `POST /api/auth/login` — login (admin / shop owner / staff)
- `POST /api/auth/register` — admin only, create accounts
- `GET /api/shops/{username}` — public shop page data
- `GET/POST/PUT/DELETE /api/products` — product CRUD (dynamic attributes + variations)
- `POST /api/orders` — public order creation (checkout)
- `POST /api/payments/aba/create` — ABA Pay checkout URL + QR
- `POST /api/payments/aba/verify` — verify payment (sandbox auto-passes)
- `POST /api/backup/shop/{id}/create|import` — shop backups
- `POST /api/backup/admin/create|import` — system backups
- `GET /api/reports/sales`, `/api/reports/products`, `/api/reports/overview`

## Rate limiting

Default 60 requests/minute per IP (configurable in `config.py`).

## Note on ABA Pay

When a shop has not configured real ABA `profile_id`/`secret_key` (or has
`test_mode: true`), payments run in **sandbox mode** — a sandbox checkout URL
and QR code are generated and verification always succeeds. Configure real
credentials under Shop Settings → Payment to enable live mode. The hash format
follows the spec: `sha1(secret + transaction_id + amount + success_url + remark)`.
