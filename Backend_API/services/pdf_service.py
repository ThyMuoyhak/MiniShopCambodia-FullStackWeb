"""PDF receipt generation with reportlab (shop logo + order details + items)."""
import os
from datetime import datetime

from config import BASE_DIR, config

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfgen import canvas
    from reportlab.platypus import (Paragraph, SimpleDocTemplate, Spacer, Table,
                                    TableStyle)
    REPORTLAB_AVAILABLE = True
except ImportError:  # pragma: no cover
    REPORTLAB_AVAILABLE = False


# --- Khmer (Unicode) font support -------------------------------------------
# reportlab's built-in fonts (Helvetica/Times/Courier) only cover Latin-1, so
# Khmer characters in shop / product / customer names render as blank boxes.
# We embed a Khmer-capable TrueType font instead. Windows 10+ ships Noto Sans
# Khmer; the other candidates cover older Windows installs (KhmerOS, KhmerUI).

_WINDOWS_FONT_DIR = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")
_KHMER_REGULAR_CANDIDATES = (
    "NotoSansKhmer-Regular.ttf",
    "NotoSansKhmerUI-Regular.ttf",
    "KhmerOSbattambang.ttf",
    "KhmerOS.ttf",
    "KhmerUI.ttf",
)
_KHMER_BOLD_CANDIDATES = (
    "NotoSansKhmer-Bold.ttf",
    "KhmerOSbattambang.ttf",
    "KhmerOSmuol.ttf",
    "KhmerUIb.ttf",
    "KhmerOSmuollight.ttf",
)
_REGISTERED_KHMER = {"normal": None, "bold": None}


def _find_font(candidates):
    """Return the first candidate TTF path that exists, or None."""
    for name in candidates:
        path = os.path.join(_WINDOWS_FONT_DIR, name)
        if os.path.exists(path):
            return path
    return None


def _register_khmer_fonts():
    """Register Khmer-capable TTFs once. Returns (normal_font, bold_font).

    Falls back to Helvetica/Helvetica-Bold when no Khmer font is found or
    reportlab is missing, so receipts never break on other systems.
    """
    if _REGISTERED_KHMER["normal"] is not None:
        return _REGISTERED_KHMER["normal"], _REGISTERED_KHMER["bold"]

    normal, bold = "Helvetica", "Helvetica-Bold"
    if REPORTLAB_AVAILABLE:
        normal_path = _find_font(_KHMER_REGULAR_CANDIDATES)
        if normal_path:
            try:
                pdfmetrics.registerFont(TTFont("KhmerReceipt", normal_path))
                normal = "KhmerReceipt"
            except Exception:
                normal = "Helvetica"

        bold_path = _find_font(_KHMER_BOLD_CANDIDATES)
        if bold_path:
            try:
                pdfmetrics.registerFont(TTFont("KhmerReceipt-Bold", bold_path))
                bold = "KhmerReceipt-Bold"
            except Exception:
                bold = "KhmerReceipt" if normal != "Helvetica" else "Helvetica-Bold"

        # No separate bold face -> reuse the regular Khmer face for bold text.
        if normal != "Helvetica" and bold == "Helvetica-Bold":
            bold = normal
        if normal == "Helvetica":
            bold = "Helvetica-Bold"

        # Let reportlab resolve <b>...</b> inside Khmer paragraphs.
        if normal != "Helvetica":
            try:
                pdfmetrics.registerFontFamily(
                    "KhmerReceipt", normal="KhmerReceipt",
                    bold="KhmerReceipt-Bold", italic="KhmerReceipt",
                    boldItalic="KhmerReceipt-Bold")
            except Exception:
                pass

    _REGISTERED_KHMER["normal"] = normal
    _REGISTERED_KHMER["bold"] = bold
    return normal, bold


def _parse_price(amount):
    try:
        return float(amount)
    except (TypeError, ValueError):
        return 0.0


def generate_receipt(order, shop, items, output_path=None) -> str:
    """Build a printable invoice PDF. Returns the public URL path.

    Preferred path: an HTML invoice rendered by headless Edge/Chromium, which
    shapes Khmer (and English) correctly via HarfBuzz. Falls back to reportlab.
    """
    os.makedirs(config.RECEIPT_DIR, exist_ok=True)
    order_number = order.order_number.replace("/", "_").replace("\\", "_")
    filename = f"receipt_{order_number}.pdf"
    if output_path is None:
        output_path = os.path.join(config.RECEIPT_DIR, filename)

    # Preferred: HTML invoice via system browser (correct Khmer/English shaping).
    try:
        from services.invoice_service import generate_invoice
        if generate_invoice(order, shop, items, output_path):
            return f"/uploads/receipts/{filename}"
    except Exception:
        pass

    if not REPORTLAB_AVAILABLE:
        _write_minimal_pdf(output_path, order, shop, items)
        return f"/uploads/receipts/{filename}"

    doc = SimpleDocTemplate(output_path, pagesize=A4,
                            rightMargin=18 * mm, leftMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=16 * mm)
    styles = getSampleStyleSheet()
    khmer_font, khmer_font_bold = _register_khmer_fonts()
    title_style = ParagraphStyle("ShopTitle", parent=styles["Title"], fontSize=22,
                                 fontName=khmer_font_bold,
                                 spaceAfter=2, textColor=colors.HexColor("#1f2937"))
    sub_style = ParagraphStyle("Sub", parent=styles["Normal"], fontSize=10,
                               fontName=khmer_font,
                               textColor=colors.HexColor("#6b7280"), spaceAfter=10)
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13,
                        fontName=khmer_font_bold,
                        textColor=colors.HexColor("#111827"), spaceBefore=14, spaceAfter=6)
    cell = ParagraphStyle("Cell", parent=styles["Normal"], fontSize=9, leading=12,
                          fontName=khmer_font)
    cell_b = ParagraphStyle("CellB", parent=cell, fontName=khmer_font_bold)
    story = []

    # Header: logo + shop name
    logo_path = None
    if shop.logo:
        candidate = shop.logo.replace(config.BASE_URL, "").lstrip("/")
        p = os.path.join(BASE_DIR, candidate) if not os.path.isabs(candidate) else candidate
        if os.path.exists(p):
            logo_path = p
    if logo_path:
        try:
            from reportlab.platypus import Image
            story.append(Image(logo_path, width=70, height=70, hAlign="CENTER"))
        except Exception:
            pass
    story.append(Paragraph(shop.shop_name or shop.username, title_style))
    story.append(Paragraph(f"Receipt for order #{order.order_number}", sub_style))
    story.append(Spacer(1, 4))

    # Order info block
    info_data = [
        [Paragraph("<b>Order</b>", cell_b), Paragraph(f"#{order.order_number}", cell)],
        [Paragraph("<b>Date</b>", cell_b),
         Paragraph(order.created_at.strftime("%Y-%m-%d %H:%M") if order.created_at else "", cell)],
        [Paragraph("<b>Payment</b>", cell_b), Paragraph(order.payment_status.upper(), cell)],
        [Paragraph("<b>Transaction</b>", cell_b), Paragraph(order.transaction_id or "-", cell)],
    ]
    info_table = Table(info_data, colWidths=[30 * mm, 120 * mm])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), khmer_font),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#374151")),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(info_table)

    # Customer block
    story.append(Paragraph("Customer Information", h2))
    cust_data = [
        [Paragraph("<b>Name</b>", cell_b), Paragraph(order.customer_name or "-", cell)],
        [Paragraph("<b>Phone</b>", cell_b), Paragraph(order.customer_phone or "-", cell)],
        [Paragraph("<b>Telegram</b>", cell_b), Paragraph(order.customer_telegram or "-", cell)],
        [Paragraph("<b>Email</b>", cell_b), Paragraph(order.customer_email or "-", cell)],
        [Paragraph("<b>Address</b>", cell_b),
         Paragraph(f"{order.customer_address}, {order.customer_city}, {order.customer_country}".strip(", ") or "-", cell)],
    ]
    cust_table = Table(cust_data, colWidths=[30 * mm, 120 * mm])
    cust_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#374151")),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(cust_table)

    # Items table
    story.append(Paragraph("Order Items", h2))
    header = [Paragraph(x, cell_b) for x in ["#", "Item", "Variations", "Price", "Qty", "Subtotal"]]
    rows = [header]
    for idx, item in enumerate(items, start=1):
        var_text = ""
        var = item.get("variations") or {}
        if isinstance(var, dict) and var:
            var_text = ", ".join(f"{k}: {v}" for k, v in var.items())
        rows.append([
            Paragraph(str(idx), cell),
            Paragraph(item.get("product_name", ""), cell),
            Paragraph(var_text, cell),
            Paragraph(f"{_parse_price(item.get('price')):,.2f}", cell),
            Paragraph(str(item.get("quantity", 1)), cell),
            Paragraph(f"{_parse_price(item.get('price')) * int(item.get('quantity', 1)):,.2f}", cell),
        ])
    items_table = Table(rows, colWidths=[8 * mm, 55 * mm, 40 * mm, 22 * mm, 12 * mm, 25 * mm])
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 8))

    # Totals
    currency = order.currency or "USD"
    total_rows = [
        [Paragraph("Items Total", cell), Paragraph(f"{_parse_price(order.items_total):,.2f} {currency}", cell)],
        [Paragraph("Shipping", cell), Paragraph(f"{_parse_price(order.shipping_fee):,.2f} {currency}", cell)],
        [Paragraph("Discount", cell), Paragraph(f"-{_parse_price(order.discount):,.2f} {currency}", cell)],
        [Paragraph("<b>GRAND TOTAL</b>", cell_b), Paragraph(f"<b>{_parse_price(order.total):,.2f} {currency}</b>", cell_b)],
    ]
    total_table = Table(total_rows, colWidths=[120 * mm, 30 * mm])
    total_table.setStyle(TableStyle([
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 2), (-1, 2), 0.4, colors.HexColor("#d1d5db")),
    ]))
    story.append(total_table)
    story.append(Spacer(1, 14))

    footer_style = ParagraphStyle("Footer", parent=styles["Normal"],
                                  fontName=khmer_font)
    story.append(Paragraph("Thank you for your purchase!", footer_style))
    if shop.contact:
        story.append(Paragraph(shop.contact, sub_style))

    doc.build(story)
    return f"/uploads/receipts/{filename}"


def _write_minimal_pdf(path, order, shop, items):
    """Fallback minimal PDF when reportlab is unavailable."""
    khmer_font, khmer_font_bold = _register_khmer_fonts()
    c = canvas.Canvas(path, pagesize=A4)
    c.setFont(khmer_font_bold, 20)
    c.drawString(40, 800, shop.shop_name or shop.username)
    c.setFont(khmer_font, 11)
    c.drawString(40, 780, f"Receipt for order #{order.order_number}")
    c.drawString(40, 760, f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    c.drawString(40, 740, f"Customer: {order.customer_name}")
    y = 710
    c.setFont(khmer_font_bold, 11)
    c.drawString(40, y, "Item")
    c.drawString(250, y, "Price")
    c.drawString(320, y, "Qty")
    c.drawString(400, y, "Subtotal")
    c.setFont(khmer_font, 11)
    y -= 20
    for item in items:
        c.drawString(40, y, item.get("product_name", "")[:40])
        c.drawString(250, y, f"{_parse_price(item.get('price')):.2f}")
        c.drawString(320, y, str(item.get("quantity", 1)))
        c.drawString(400, y, f"{_parse_price(item.get('price')) * int(item.get('quantity', 1)):.2f}")
        y -= 18
    c.setFont(khmer_font_bold, 12)
    c.drawString(40, y - 10, f"TOTAL: {_parse_price(order.total):.2f} {order.currency or 'USD'}")
    c.save()

