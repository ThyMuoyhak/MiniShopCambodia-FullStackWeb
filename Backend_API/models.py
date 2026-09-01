"""SQLAlchemy ORM models for the Mini Shop Platform."""
import json
from datetime import datetime, timezone

from sqlalchemy import (Boolean, Column, DateTime, Float, ForeignKey, Integer,
                        String, Text)
from sqlalchemy.orm import relationship

from database import Base


def _iso(dt):
    """Serialize a UTC datetime with an explicit offset.

    Without an offset, JavaScript treats a bare ISO string as *local* time,
    which corrupts timezone conversion (e.g. Asia/Phnom_Penh display).
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


class JSONText:
    """Mixin helpers to store/load JSON inside Text columns."""

    @staticmethod
    def dumps(value):
        return json.dumps(value, ensure_ascii=False) if value is not None else None

    @staticmethod
    def loads(value, default=None):
        if value is None or value == "":
            return default if default is not None else []
        try:
            return json.loads(value)
        except (ValueError, TypeError):
            return default if default is not None else []


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, default="")
    password_hash = Column(String, nullable=False)
    role = Column(String, default="shop_owner")  # admin | shop_owner | staff | reseller
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=True)
    status = Column(String, default="active")  # active | suspended
    referral_code = Column(String, nullable=True, index=True)   # resellers: signup link code
    commission_rate = Column(Float, default=0)                  # resellers: % commission on plan sales
    discount_max = Column(Float, default=1.0)                   # resellers: max $ discount they may give
    promo_discount = Column(Float, default=0)                   # resellers: default $ discount auto-applied
    commission_paid = Column(String, default="not_yet")         # resellers: not_yet | paid
    commission_paid_at = Column(DateTime, nullable=True)        # when admin marked commission as paid
    login_failed_count = Column(Integer, default=0)             # consecutive failed login attempts
    login_locked_count = Column(Integer, default=0)             # how many times the account has been locked
    login_locked_until = Column(DateTime, nullable=True)        # locked until this time (5 min, then +5 min per lock)
    created_at = Column(DateTime, default=datetime.utcnow)

    shop = relationship("Shop", back_populates="users", foreign_keys=[shop_id])


class Shop(Base):
    __tablename__ = "shops"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    shop_name = Column(String, default="")
    logo = Column(String, default="")
    banner = Column(String, default="")
    bio = Column(Text, default="")
    description = Column(Text, default="")
    slideshow = Column(Text, default="[]")          # JSON list of image urls
    social_media = Column(Text, default="{}")        # JSON dict
    theme = Column(Text, default="{}")               # JSON dict {primary, secondary, font_family}
    aba_settings = Column(Text, default="{}")        # JSON dict {profile_id, secret_key, test_mode}
    telegram_settings = Column(Text, default="{}")   # JSON dict {bot_token, chat_id, enabled}
    currency = Column(String, default="USD")
    status = Column(String, default="active")        # active | suspended | pending
    expires_at = Column(DateTime, nullable=True)     # subscription expiry (admin-set / plan)
    max_products = Column(Integer, nullable=True)    # product creation limit; None = unlimited
    max_categories = Column(Integer, nullable=True)  # category creation limit; None = unlimited
    plan = Column(String, default="")                # starter | growth | premium
    plan_price = Column(Float, default=0)            # price actually paid for the current plan
    plan_discount = Column(Float, default=0)         # reseller-promo discount applied ($)
    plan_started_at = Column(DateTime, nullable=True) # when the current plan period started
    reseller_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # referred by
    contact = Column(Text, default="")               # contact info / address
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="shop", cascade="all, delete-orphan",
                         foreign_keys=[User.shop_id])
    products = relationship("Product", back_populates="shop", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="shop", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="shop", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="shop", cascade="all, delete-orphan")

    def slideshow_list(self):
        return JSONText.loads(self.slideshow, [])

    def social_media_dict(self):
        return JSONText.loads(self.social_media, {})

    def theme_dict(self):
        return JSONText.loads(self.theme, {})

    def aba_dict(self):
        return JSONText.loads(self.aba_settings, {})

    def telegram_dict(self):
        return JSONText.loads(self.telegram_settings, {})

    def is_expired(self):
        """True when the subscription has passed its expiry date (never = active)."""
        return bool(self.expires_at) and self.expires_at < datetime.utcnow()

    def to_dict(self, include_private=False):
        d = {
            "id": self.id,
            "username": self.username,
            "shop_name": self.shop_name,
            "logo": self.logo,
            "banner": self.banner,
            "bio": self.bio,
            "description": self.description,
            "slideshow": self.slideshow_list(),
            "social_media": self.social_media_dict(),
            "theme": self.theme_dict(),
            "currency": self.currency,
            "status": self.status,
            "max_products": self.max_products,
            "max_categories": self.max_categories,
            "plan": self.plan,
            "plan_price": self.plan_price,
            "plan_discount": self.plan_discount,
            "plan_started_at": _iso(self.plan_started_at),
            "contact": self.contact,
            "created_at": _iso(self.created_at),
        }
        if include_private:
            d["aba_settings"] = self.aba_dict()
            d["telegram_settings"] = self.telegram_dict()
            d["expires_at"] = _iso(self.expires_at)
            d["reseller_id"] = self.reseller_id
        return d


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, default="")
    parent_id = Column(Integer, nullable=True)
    image = Column(String, default="")
    sort_order = Column(Integer, default=0)

    shop = relationship("Shop", back_populates="categories")
    products = relationship("Product", back_populates="category")

    def to_dict(self):
        return {
            "id": self.id,
            "shop_id": self.shop_id,
            "name": self.name,
            "slug": self.slug,
            "parent_id": self.parent_id,
            "image": self.image,
            "sort_order": self.sort_order,
        }


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    price = Column(Float, default=0)
    sale_price = Column(Float, nullable=True)
    quantity = Column(Integer, default=0)
    images = Column(Text, default="[]")            # JSON list of urls
    custom_attributes = Column(Text, default="[]")  # JSON list [{name,label,type,value,options,required}]
    variations = Column(Text, default="[]")         # JSON list [{attrs:{},price,quantity,sku}]
    metadata_json = Column(Text, default="{}")      # JSON dict (extra meta / featured etc.)
    featured = Column(Boolean, default=False)
    status = Column(String, default="active")       # active | hidden
    created_at = Column(DateTime, default=datetime.utcnow)

    shop = relationship("Shop", back_populates="products")
    category = relationship("Category", back_populates="products")

    def to_dict(self):
        return {
            "id": self.id,
            "shop_id": self.shop_id,
            "category_id": self.category_id,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "sale_price": self.sale_price,
            "quantity": self.quantity,
            "images": JSONText.loads(self.images, []),
            "custom_attributes": JSONText.loads(self.custom_attributes, []),
            "variations": JSONText.loads(self.variations, []),
            "metadata": JSONText.loads(self.metadata_json, {}),
            "featured": bool(self.featured),
            "status": self.status,
            "created_at": _iso(self.created_at),
            "category_name": self.category.name if self.category else None,
        }


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    order_number = Column(String, unique=True, index=True, nullable=False)

    customer_name = Column(String, default="")
    customer_email = Column(String, default="")
    customer_phone = Column(String, default="")
    customer_telegram = Column(String, default="")
    customer_address = Column(String, default="")
    customer_city = Column(String, default="")
    customer_country = Column(String, default="")
    customer_note = Column(Text, default="")

    items_total = Column(Float, default=0)
    shipping_fee = Column(Float, default=0)
    discount = Column(Float, default=0)
    total = Column(Float, default=0)
    currency = Column(String, default="USD")

    payment_method = Column(String, default="aba")
    payment_status = Column(String, default="pending")  # pending | paid | failed | refunded
    transaction_id = Column(String, default="")
    payment_detail = Column(Text, default="{}")          # JSON payment response

    order_status = Column(String, default="pending")     # pending|processing|shipped|delivered|cancelled
    receipt_url = Column(String, default="")

    created_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)

    shop = relationship("Shop", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    def to_dict(self, include_items=True):
        d = {
            "id": self.id,
            "shop_id": self.shop_id,
            "customer_id": self.customer_id,
            "order_number": self.order_number,
            "customer_name": self.customer_name,
            "customer_email": self.customer_email,
            "customer_phone": self.customer_phone,
            "customer_telegram": self.customer_telegram,
            "customer_address": self.customer_address,
            "customer_city": self.customer_city,
            "customer_country": self.customer_country,
            "customer_note": self.customer_note,
            "items_total": self.items_total,
            "shipping_fee": self.shipping_fee,
            "discount": self.discount,
            "total": self.total,
            "currency": self.currency,
            "payment_method": self.payment_method,
            "payment_status": self.payment_status,
            "transaction_id": self.transaction_id,
            "order_status": self.order_status,
            "receipt_url": self.receipt_url,
            "created_at": _iso(self.created_at),
            "paid_at": _iso(self.paid_at),
            "shop_name": self.shop.shop_name if self.shop else None,
            "shop_username": self.shop.username if self.shop else None,
        }
        if include_items:
            d["items"] = [i.to_dict() for i in self.items]
        return d


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, nullable=True)
    product_name = Column(String, default="")
    price = Column(Float, default=0)
    quantity = Column(Integer, default=1)
    variations = Column(Text, default="{}")  # JSON dict of selected variations

    order = relationship("Order", back_populates="items")

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "product_id": self.product_id,
            "product_name": self.product_name,
            "price": self.price,
            "quantity": self.quantity,
            "variations": JSONText.loads(self.variations, {}),
        }


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False, index=True)
    first_name = Column(String, default="")
    last_name = Column(String, default="")
    gender = Column(String, default="")  # male | female | other
    name = Column(String, default="")   # full name (derived)
    username = Column(String, default="")  # login username
    phone = Column(String, default="")
    email = Column(String, default="")
    password_hash = Column(String, default="")
    telegram = Column(String, default="")          # @username
    telegram_username = Column(String, default="")
    telegram_phone = Column(String, default="")
    telegram_id = Column(Integer, nullable=True)   # numeric id (bot linking)
    address = Column(String, default="")
    city = Column(String, default="")
    country = Column(String, default="")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    shop = relationship("Shop", back_populates="customers")

    def to_dict(self):
        return {
            "id": self.id,
            "shop_id": self.shop_id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "gender": self.gender,
            "name": self.name,
            "username": self.username,
            "phone": self.phone,
            "email": self.email,
            "telegram": self.telegram,
            "telegram_username": self.telegram_username,
            "telegram_phone": self.telegram_phone,
            "telegram_id": self.telegram_id,
            "address": self.address,
            "city": self.city,
            "country": self.country,
            "notes": self.notes,
            "created_at": _iso(self.created_at),
        }


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, nullable=True)  # None => platform level
    key = Column(String, nullable=False)
    value = Column(Text, default="")

    def to_dict(self):
        return {"id": self.id, "shop_id": self.shop_id, "key": self.key, "value": self.value}


class BackupHistory(Base):
    __tablename__ = "backup_history"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, nullable=True)  # None => system backup
    filename = Column(String, default="")
    filepath = Column(String, default="")
    kind = Column(String, default="shop")  # shop | system
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "shop_id": self.shop_id,
            "filename": self.filename,
            "filepath": self.filepath,
            "kind": self.kind,
            "created_at": _iso(self.created_at),
        }


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, nullable=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String, default="")
    action = Column(String, default="")
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "shop_id": self.shop_id,
            "user_id": self.user_id,
            "username": self.username,
            "action": self.action,
            "description": self.description,
            "created_at": _iso(self.created_at),
        }


class TelegramCode(Base):
    """One-time verification codes for the fallback Telegram login flow."""
    __tablename__ = "telegram_codes"

    id = Column(Integer, primary_key=True, index=True)
    shop_id = Column(Integer, nullable=False, index=True)
    telegram_id = Column(Integer, nullable=False, index=True)
    code_hash = Column(String, default="")
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


