"""Mini Shop Platform - FastAPI backend entrypoint."""
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

import models
from config import config
from database import Base, SessionLocal, engine
from routers import (auth, backup, categories, customers, orders, payments,
                     plans, products, reports, settings, shops, telegram, uploads)
from seed import seed_database


def _migrate_columns():
    """Lightweight migration for SQLite: add missing columns to existing tables."""
    from sqlalchemy import inspect as sa_inspect, text as sa_text
    insp = sa_inspect(engine)
    if insp.has_table("customers"):
        cols = [c["name"] for c in insp.get_columns("customers")]
        additions = {
            "telegram_id": "INTEGER",
            "first_name": "VARCHAR DEFAULT ''",
            "last_name": "VARCHAR DEFAULT ''",
            "gender": "VARCHAR DEFAULT ''",
            "username": "VARCHAR DEFAULT ''",
            "password_hash": "VARCHAR DEFAULT ''",
            "telegram_username": "VARCHAR DEFAULT ''",
            "telegram_phone": "VARCHAR DEFAULT ''",
        }
        with engine.begin() as conn:
            for col, ddl in additions.items():
                if col not in cols:
                    conn.execute(sa_text(f"ALTER TABLE customers ADD COLUMN {col} {ddl}"))
    if insp.has_table("shops"):
        cols = [c["name"] for c in insp.get_columns("shops")]
        with engine.begin() as conn:
            if "expires_at" not in cols:
                conn.execute(sa_text("ALTER TABLE shops ADD COLUMN expires_at DATETIME"))
            if "max_products" not in cols:
                conn.execute(sa_text("ALTER TABLE shops ADD COLUMN max_products INTEGER"))
            if "max_categories" not in cols:
                conn.execute(sa_text("ALTER TABLE shops ADD COLUMN max_categories INTEGER"))
            if "plan" not in cols:
                conn.execute(sa_text("ALTER TABLE shops ADD COLUMN plan VARCHAR DEFAULT ''"))
            if "plan_price" not in cols:
                conn.execute(sa_text("ALTER TABLE shops ADD COLUMN plan_price FLOAT DEFAULT 0"))
            if "plan_started_at" not in cols:
                conn.execute(sa_text("ALTER TABLE shops ADD COLUMN plan_started_at DATETIME"))
            if "plan_discount" not in cols:
                conn.execute(sa_text("ALTER TABLE shops ADD COLUMN plan_discount FLOAT DEFAULT 0"))
            if "reseller_id" not in cols:
                conn.execute(sa_text("ALTER TABLE shops ADD COLUMN reseller_id INTEGER"))

    if insp.has_table("users"):
        cols = [c["name"] for c in insp.get_columns("users")]
        with engine.begin() as conn:
            if "referral_code" not in cols:
                conn.execute(sa_text("ALTER TABLE users ADD COLUMN referral_code VARCHAR"))
            if "commission_rate" not in cols:
                conn.execute(sa_text("ALTER TABLE users ADD COLUMN commission_rate FLOAT DEFAULT 0"))
            if "discount_max" not in cols:
                conn.execute(sa_text("ALTER TABLE users ADD COLUMN discount_max FLOAT DEFAULT 1"))
            if "promo_discount" not in cols:
                conn.execute(sa_text("ALTER TABLE users ADD COLUMN promo_discount FLOAT DEFAULT 0"))
            if "commission_paid" not in cols:
                conn.execute(sa_text("ALTER TABLE users ADD COLUMN commission_paid VARCHAR DEFAULT 'not_yet'"))
            if "commission_paid_at" not in cols:
                conn.execute(sa_text("ALTER TABLE users ADD COLUMN commission_paid_at DATETIME"))
            if "login_failed_count" not in cols:
                conn.execute(sa_text("ALTER TABLE users ADD COLUMN login_failed_count INTEGER DEFAULT 0"))
            if "login_locked_count" not in cols:
                conn.execute(sa_text("ALTER TABLE users ADD COLUMN login_locked_count INTEGER DEFAULT 0"))
            if "login_locked_until" not in cols:
                conn.execute(sa_text("ALTER TABLE users ADD COLUMN login_locked_until DATETIME"))

    if insp.has_table("orders"):
        cols = [c["name"] for c in insp.get_columns("orders")]
        with engine.begin() as conn:
            if "customer_id" not in cols:
                conn.execute(sa_text("ALTER TABLE orders ADD COLUMN customer_id INTEGER"))


def _backfill_order_customers():
    """Link legacy orders (no customer_id) to their customer account.

    Only links when exactly ONE customer in the same shop matches the order's
    phone OR telegram, so orders are never mis-attributed.
    """
    db = SessionLocal()
    try:
        orders = db.query(models.Order).filter(models.Order.customer_id.is_(None)).all()
        linked = 0
        for o in orders:
            candidates = db.query(models.Customer).filter(
                models.Customer.shop_id == o.shop_id).all()
            matches = [
                c for c in candidates
                if (o.customer_phone and c.phone and c.phone == o.customer_phone)
                or (o.customer_telegram and c.telegram and c.telegram == o.customer_telegram)
            ]
            if len(matches) == 1:
                o.customer_id = matches[0].id
                linked += 1
        db.commit()
        if linked:
            print(f"[migrate] linked {linked} legacy orders to customers")
    except Exception:
        db.rollback()
    finally:
        db.close()


# Create tables + migrate
Base.metadata.create_all(bind=engine)
_migrate_columns()
_backfill_order_customers()

# Seed default admin + demo data
_seed_db = SessionLocal()
try:
    seed_database(_seed_db)
finally:
    _seed_db.close()

# Rate limiting (60 requests / minute)
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{config.RATE_LIMIT_REQUESTS}/{config.RATE_LIMIT_PERIOD}"])

# Initialize FastAPI with docs hidden - these endpoints will return 404
app = FastAPI(
    title="Mini Shop Platform API",
    version="1.0.0",
    docs_url=None,      # /docs will return 404 Not Found
    redoc_url=None,     # /redoc will return 404 Not Found
    openapi_url=None    # /openapi.json will return 404 Not Found
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS for the 3 frontend ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Receipt PDFs are regenerated in-place (same filename, new content), so tell
# browsers to always re-validate instead of serving a cached old PDF.
@app.middleware("http")
async def no_cache_receipts(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/uploads/receipts/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


# Static file mounts
os.makedirs(config.UPLOAD_DIR, exist_ok=True)
os.makedirs(config.BACKUP_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=config.UPLOAD_DIR), name="uploads")
app.mount("/backups", StaticFiles(directory=config.BACKUP_DIR), name="backups")


@app.exception_handler(RateLimitExceeded)
async def ratelimit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded. Please try again later."})


@app.get("/")
def root():
    # The docs link has been removed from the response
    return {"app": "Mini Shop Platform API", "version": "1.0.0",
            "contact_telegram": "@your_telegram"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Routers
app.include_router(auth.router)
app.include_router(shops.router)
app.include_router(products.router)
app.include_router(categories.router)
app.include_router(orders.router)
app.include_router(customers.router)
app.include_router(payments.router)
app.include_router(backup.router)
app.include_router(uploads.router)
app.include_router(reports.router)
app.include_router(telegram.router)
app.include_router(settings.router)
app.include_router(plans.router)
