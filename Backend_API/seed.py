"""Seed the database with the default admin account and a demo shop."""
from sqlalchemy.orm import Session

import models
from config import config
from security import hash_password


def seed_database(db: Session):
    # 1) Default admin account
    admin = db.query(models.User).filter(models.User.username == config.DEFAULT_ADMIN_USERNAME).first()
    if not admin:
        admin = models.User(
            username=config.DEFAULT_ADMIN_USERNAME,
            email=config.DEFAULT_ADMIN_EMAIL,
            password_hash=hash_password(config.DEFAULT_ADMIN_PASSWORD),
            role="admin",
        )
        db.add(admin)
        db.commit()

    # 2) Demo shop (only on a fresh database)
    if not db.query(models.Shop).filter(models.Shop.username == "demo").first():
        demo_shop = models.Shop(
            username="demo",
            shop_name="Demo Fashion Store",
            bio="Your friendly neighbourhood demo shop for trying the Mini Shop platform.",
            description=("Welcome to our demo store! Browse our products, pick your favourites, "
                         "and experience the full checkout flow with ABA Pay (sandbox mode)."),
            slideshow=models.JSONText.dumps([
                "/uploads/demo/banner1.jpg",
                "/uploads/demo/banner2.jpg",
            ]),
            social_media=models.JSONText.dumps({
                "facebook": "https://facebook.com/demostore",
                "instagram": "https://instagram.com/demostore",
                "telegram": "https://t.me/your_telegram",
                "tiktok": "https://tiktok.com/@demostore",
                "youtube": "",
                "whatsapp": "",
                "twitter": "",
            }),
            theme=models.JSONText.dumps({
                "primary": "#6366f1",
                "secondary": "#ec4899",
                "font_family": "Inter",
            }),
            aba_settings=models.JSONText.dumps({
                "profile_id": "",
                "secret_key": "",
                "test_mode": True,
            }),
            telegram_settings=models.JSONText.dumps({
                "bot_token": config.TELEGRAM_BOT_TOKEN,
                "chat_id": "",
                "enabled": False,
            }),
            currency="USD",
            contact="Phnom Penh, Cambodia | Telegram: @your_telegram",
        )
        db.add(demo_shop)
        db.flush()

        # Demo owner account
        db.add(models.User(
            username="demo",
            email="demo@minishop.com",
            password_hash=hash_password("demo123"),
            role="shop_owner",
            shop_id=demo_shop.id,
        ))

        # Demo categories
        cat_men = models.Category(shop_id=demo_shop.id, name="Men", slug="men", sort_order=1)
        cat_women = models.Category(shop_id=demo_shop.id, name="Women", slug="women", sort_order=2)
        cat_accessories = models.Category(shop_id=demo_shop.id, name="Accessories", slug="accessories", sort_order=3)
        db.add_all([cat_men, cat_women, cat_accessories])
        db.flush()

        # Demo products
        db.add_all([
            models.Product(
                shop_id=demo_shop.id, category_id=cat_men.id,
                name="Classic White T-Shirt",
                description="Soft cotton t-shirt, perfect for everyday wear. Available in multiple sizes.",
                price=12.00, sale_price=9.99, quantity=100, featured=True,
                images=models.JSONText.dumps(["/uploads/demo/tshirt.jpg", "/uploads/demo/tshirt2.jpg"]),
                custom_attributes=models.JSONText.dumps([
                    {"name": "material", "label": "Material", "type": "text", "value": "100% Cotton", "options": "", "required": False},
                    {"name": "color", "label": "Color", "type": "color", "value": "#ffffff", "options": "White,Black,Blue", "required": True},
                    {"name": "size", "label": "Size", "type": "select", "value": "", "options": "S,M,L,XL", "required": True},
                ]),
                variations=models.JSONText.dumps([
                    {"attrs": {"size": "S"}, "price": 9.99, "quantity": 30, "sku": "TS-W-S"},
                    {"attrs": {"size": "M"}, "price": 9.99, "quantity": 40, "sku": "TS-W-M"},
                    {"attrs": {"size": "L"}, "price": 9.99, "quantity": 30, "sku": "TS-W-L"},
                ]),
                status="active",
            ),
            models.Product(
                shop_id=demo_shop.id, category_id=cat_women.id,
                name="Summer Floral Dress",
                description="Light and breezy floral dress for the summer season.",
                price=29.99, quantity=50, featured=True,
                images=models.JSONText.dumps(["/uploads/demo/dress.jpg"]),
                custom_attributes=models.JSONText.dumps([
                    {"name": "material", "label": "Material", "type": "text", "value": "Polyester Blend", "options": "", "required": False},
                    {"name": "size", "label": "Size", "type": "select", "value": "", "options": "XS,S,M,L", "required": True},
                ]),
                status="active",
            ),
            models.Product(
                shop_id=demo_shop.id, category_id=cat_accessories.id,
                name="Leather Crossbody Bag",
                description="Premium PU leather crossbody bag with adjustable strap.",
                price=19.99, sale_price=15.99, quantity=25, featured=False,
                images=models.JSONText.dumps(["/uploads/demo/bag.jpg"]),
                custom_attributes=models.JSONText.dumps([
                    {"name": "color", "label": "Color", "type": "color", "value": "#8b4513", "options": "Brown,Black", "required": True},
                ]),
                status="active",
            ),
            models.Product(
                shop_id=demo_shop.id, category_id=cat_men.id,
                name="Denim Jacket",
                description="Classic denim jacket with a modern fit.",
                price=39.99, quantity=15, featured=False,
                images=models.JSONText.dumps(["/uploads/demo/jacket.jpg"]),
                custom_attributes=models.JSONText.dumps([
                    {"name": "size", "label": "Size", "type": "select", "value": "", "options": "M,L,XL,XXL", "required": True},
                ]),
                status="active",
            ),
        ])
        db.commit()

