"""Generate shop QR codes with the shop logo embedded in the center."""
import io

import qrcode
from PIL import Image, ImageDraw


def generate_shop_qr(url: str, logo_path: str = "") -> bytes:
    """
    Build a PNG QR code for `url` and paste a rounded version of the shop logo
    in the middle. High error-correction is used so the logo never breaks scanning.
    """
    qr = qrcode.QRCode(version=None,
                       error_correction=qrcode.constants.ERROR_CORRECT_H,
                       box_size=10, border=2)
    qr.add_data(url or "https://localhost:3000")
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    if logo_path:
        try:
            logo = Image.open(logo_path).convert("RGBA")
            size = max(24, img.size[0] // 4)  # ~25% of the QR width
            logo = logo.resize((size, size), Image.LANCZOS)

            # Round mask so the logo blends with the QR instead of a square box.
            mask = Image.new("L", (size, size), 0)
            draw = ImageDraw.Draw(mask)
            draw.ellipse((0, 0, size, size), fill=255)

            pos = ((img.size[0] - size) // 2, (img.size[1] - size) // 2)
            img.paste(logo, pos, mask)
        except Exception:
            pass  # logo is decorative — never fail the QR because of it

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
