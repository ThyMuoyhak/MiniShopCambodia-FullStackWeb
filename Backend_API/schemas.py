"""Pydantic schemas for request/response validation."""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class RegisterRequest(BaseModel):
    username: str
    email: str = ""
    password: str
    role: str = "shop_owner"  # admin | shop_owner | staff
    shop_id: Optional[int] = None
    shop_name: str = ""
    shop_username: str = ""


class UserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    shop_id: Optional[int] = None
    status: Optional[str] = None


class ShopCreate(BaseModel):
    username: str
    shop_name: str = ""
    email: str = ""
    password: str
    currency: str = "USD"


class ShopUpdate(BaseModel):
    shop_name: Optional[str] = None
    username: Optional[str] = None
    logo: Optional[str] = None
    banner: Optional[str] = None
    bio: Optional[str] = None
    description: Optional[str] = None
    slideshow: Optional[List[str]] = None
    social_media: Optional[Dict[str, Any]] = None
    theme: Optional[Dict[str, Any]] = None
    aba_settings: Optional[Dict[str, Any]] = None
    telegram_settings: Optional[Dict[str, Any]] = None
    currency: Optional[str] = None
    contact: Optional[str] = None
    status: Optional[str] = None


class ShopExpirySet(BaseModel):
    """Admin sets/extends a shop subscription. days=0 clears the expiry."""
    days: int = 30


class ShopLimitsSet(BaseModel):
    """Admin sets product/category creation limits. 0 or None = unlimited.

    A value of 0 clears the limit; a positive integer sets it; None = no change.
    """
    max_products: Optional[int] = None
    max_categories: Optional[int] = None


class ShopRegister(BaseModel):
    """Public self-serve shop registration with a paid plan."""
    username: str
    shop_name: str = ""
    email: str = ""
    phone: str = ""
    password: str
    plan: str = "starter"
    currency: str = "USD"
    referral_code: str = ""
    discount: float = 0        # reseller-promo discount in $ (0 to reseller.discount_max)
    success_url: str = ""


class PlanConfirm(BaseModel):
    """Confirm a plan payment; activates the shop on success."""
    order_id: int
    shop_id: int
    transaction_id: str = ""


class PlanUpgrade(BaseModel):
    """Shop owner upgrades their shop to a new plan (1 month free / 6 / 12)."""
    shop_id: int
    plan: str = "starter"
    success_url: str = ""


class ResellerCreate(BaseModel):
    """Admin creates a reseller who earns commission on referred plan sales."""
    username: str
    email: str = ""
    password: str
    referral_code: str = ""
    commission_rate: float = 10.0


class ResellerUpdate(BaseModel):
    """Admin edits a reseller (commission, discount, code, status, password)."""
    email: Optional[str] = None
    password: Optional[str] = None
    referral_code: Optional[str] = None
    commission_rate: Optional[float] = None
    discount_max: Optional[float] = None
    status: Optional[str] = None
    commission_paid: Optional[str] = None  # not_yet | paid


class ResellerPromo(BaseModel):
    """Reseller sets their default promo discount (auto-applied with their code)."""
    promo_discount: float = 0


class CustomerUpdateSelf(BaseModel):
    """Customer updates their own profile."""
    full_name: str = ""
    username: str = ""
    gender: str = ""
    email: str = ""
    phone: str = ""
    telegram_username: str = ""
    telegram_phone: str = ""
    address: str = ""
    city: str = ""
    country: str = ""


class CustomerChangePassword(BaseModel):
    current_password: str
    new_password: str


class UserChangePassword(BaseModel):
    current_password: str
    new_password: str


class CategoryCreate(BaseModel):
    shop_id: int
    name: str
    slug: str = ""
    parent_id: Optional[int] = None
    image: str = ""
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    parent_id: Optional[int] = None
    image: Optional[str] = None
    sort_order: Optional[int] = None


class ProductCreate(BaseModel):
    shop_id: int
    category_id: Optional[int] = None
    name: str
    description: str = ""
    price: float = 0
    sale_price: Optional[float] = None
    quantity: int = 0
    images: List[str] = []
    custom_attributes: List[Dict[str, Any]] = []
    variations: List[Dict[str, Any]] = []
    metadata: Dict[str, Any] = {}
    featured: bool = False
    status: str = "active"


class ProductUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    quantity: Optional[int] = None
    images: Optional[List[str]] = None
    custom_attributes: Optional[List[Dict[str, Any]]] = None
    variations: Optional[List[Dict[str, Any]]] = None
    metadata: Optional[Dict[str, Any]] = None
    featured: Optional[bool] = None
    status: Optional[str] = None


class OrderItemIn(BaseModel):
    product_id: int
    name: str = ""
    price: float = 0
    quantity: int = 1
    variations: Dict[str, Any] = {}
    image: str = ""


class OrderCreate(BaseModel):
    shop_id: int
    customer_name: str
    customer_email: str = ""
    customer_phone: str
    customer_telegram: str = ""
    customer_address: str = ""
    customer_city: str = ""
    customer_country: str = ""
    customer_note: str = ""
    items: List[OrderItemIn]
    shipping_fee: float = 0
    discount: float = 0
    currency: str = "USD"


class POSOrderCreate(BaseModel):
    """POS (point of sale) order created by the shop owner.
    payment_method: 'cash' (បង់ប្រាក់ផ្ទាល់) marks it paid instantly,
    'khqr' creates a pending order for ABA KHQR checkout."""
    shop_id: int
    customer_name: str = "POS Customer"
    customer_phone: str = ""
    customer_note: str = ""
    items: List[OrderItemIn]
    payment_method: str = "cash"   # cash | khqr
    discount: float = 0


class OrderStatusUpdate(BaseModel):
    order_status: Optional[str] = None
    payment_status: Optional[str] = None


class CustomerHistoryRequest(BaseModel):
    """Customer login via Telegram/phone to view their order history for a shop."""
    shop_id: int
    phone: str = ""
    telegram: str = ""


class TelegramAuthRequest(BaseModel):
    """Data sent by the Telegram Login Widget (onTelegramAuth callback)."""
    shop_id: int
    id: int
    first_name: str = ""
    last_name: str = ""
    username: str = ""
    photo_url: str = ""
    auth_date: int = 0
    hash: str = ""


class TelegramCodeRequest(BaseModel):
    """Fallback Telegram login: ask for a verification code to be sent to a user."""
    shop_id: int
    telegram_id: int


class TelegramCodeVerifyRequest(BaseModel):
    """Fallback Telegram login: verify the code and create the customer session."""
    shop_id: int
    telegram_id: int
    code: str


class CustomerSignup(BaseModel):
    """Customer account registration (username, full name, gender, gmail, phone, telegram)."""
    shop_id: int
    username: str = ""
    full_name: str = ""
    first_name: str = ""
    last_name: str = ""
    gender: str = ""          # male | female | other
    email: str = ""           # gmail
    phone: str
    telegram_username: str = ""
    telegram_phone: str = ""
    password: str


class CustomerSignin(BaseModel):
    """Customer login with username, email, or phone + password."""
    shop_id: int
    identifier: str           # username | email | phone
    password: str


class CustomerCreate(BaseModel):
    shop_id: int
    name: str
    phone: str = ""
    telegram: str = ""
    email: str = ""
    address: str = ""
    city: str = ""
    country: str = ""
    notes: str = ""


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    telegram: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None


class PaymentCreate(BaseModel):
    order_id: int
    success_url: str = ""
    error_url: str = ""
    cancel_url: str = ""


class PaymentVerify(BaseModel):
    order_id: int
    transaction_id: str = ""
    amount: Optional[float] = None


class SettingUpdate(BaseModel):
    key: str
    value: Any
    shop_id: Optional[int] = None


class TelegramTest(BaseModel):
    shop_id: Optional[int] = None
    message: str = "🧪 Test notification from Mini Shop Platform"
