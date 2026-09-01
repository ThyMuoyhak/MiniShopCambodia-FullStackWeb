"""Global configuration for the Mini Shop Platform backend."""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class Config:
    SECRET_KEY = os.getenv("MINISHOP_SECRET_KEY", "mini-shop-platform-secret-key-change-me")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

    DATA_DIR = os.getenv("DATA_DIR", os.path.join(BASE_DIR, "data"))
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///" + os.path.join(DATA_DIR, "minishop.db"))

    UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(BASE_DIR, "uploads"))
    RECEIPT_DIR = os.getenv("RECEIPT_DIR", os.path.join(UPLOAD_DIR, "receipts"))
    BACKUP_DIR = os.getenv("BACKUP_DIR", os.path.join(BASE_DIR, "backups"))
    QR_DIR = os.getenv("QR_DIR", os.path.join(UPLOAD_DIR, "qr"))

    for d in (UPLOAD_DIR, RECEIPT_DIR, BACKUP_DIR, QR_DIR, DATA_DIR):
        os.makedirs(d, exist_ok=True)

    MAX_UPLOAD_SIZE = 8 * 1024 * 1024  # 8 MB
    ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    ALLOWED_FILE_EXT = {".json", ".zip", ".xlsx"}

    RATE_LIMIT_REQUESTS = 60
    RATE_LIMIT_PERIOD = "minute"

    # CORS: localhost for development + any origins in the CORS_ORIGINS env var
    # (comma-separated, e.g. "https://user.example.com,https://admin.example.com")
    _cors_env = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
    CORS_ORIGINS = _cors_env + [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3005",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3005",
    ]

    # ABA Pay
    ABA_CHECKOUT_URL = "https://checkout.payway.com.kh"
    ABA_API_URL = "https://api.payway.com.kh"

    # Default Telegram bot token used for platform-level notifications.
    # Provide via the TELEGRAM_BOT_TOKEN environment variable; never hard-code.
    TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

    # Default admin account (single admin for the whole platform)
    DEFAULT_ADMIN_USERNAME = "admin"
    DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")  # CHANGE ME in production!
    DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@example.com")

    BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")


config = Config()
