"""Generate simple placeholder demo images for the demo shop."""
import os

from PIL import Image, ImageDraw, ImageFont

from config import config

DEMO_DIR = os.path.join(config.UPLOAD_DIR, "demo")
os.makedirs(DEMO_DIR, exist_ok=True)


def make_gradient(size, color_top, color_bottom, text, filename, sub_text=""):
    w, h = size
    img = Image.new("RGB", (w, h))
    top = tuple(int(color_top[i:i + 2], 16) for i in (1, 3, 5))
    bottom = tuple(int(color_bottom[i:i + 2], 16) for i in (1, 3, 5))
    for y in range(h):
        t = y / h
        row = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        for x in range(w):
            img.putpixel((x, y), row)
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", 56)
        font_small = ImageFont.truetype("arial.ttf", 24)
    except Exception:
        font = ImageFont.load_default()
        font_small = font
    draw.text((w // 2, h // 2 - 20), text, fill="white", anchor="mm", font=font)
    if sub_text:
        draw.text((w // 2, h // 2 + 40), sub_text, fill=(255, 255, 255, 200), anchor="mm", font=font_small)
    img.save(os.path.join(DEMO_DIR, filename))


def make_product_image(size, bg, text, filename):
    w, h = size
    img = Image.new("RGB", (w, h), bg)
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", 40)
    except Exception:
        font = ImageFont.load_default()
    draw.text((w // 2, h // 2), text, fill="white", anchor="mm", font=font)
    img.save(os.path.join(DEMO_DIR, filename))


if __name__ == "__main__":
    make_gradient((1200, 400), "#6366f1", "#8b5cf6", "Demo Fashion Store",
                  "banner1.jpg", "Summer Sale — Up to 50% Off")
    make_gradient((1200, 400), "#ec4899", "#f97316", "New Arrivals",
                  "banner2.jpg", "Shop the latest collection")
    make_product_image((600, 600), "#93c5fd", "T-Shirt", "tshirt.jpg")
    make_product_image((600, 600), "#a7f3d0", "T-Shirt 2", "tshirt2.jpg")
    make_product_image((600, 600), "#fbcfe8", "Dress", "dress.jpg")
    make_product_image((600, 600), "#d6d3d1", "Bag", "bag.jpg")
    make_product_image((600, 600), "#bfdbfe", "Jacket", "jacket.jpg")
    print("Demo images generated in", DEMO_DIR)
