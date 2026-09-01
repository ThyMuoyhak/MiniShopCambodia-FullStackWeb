"""Professional invoice PDF generation via headless Edge/Chromium.

Renders a clean HTML invoice to PDF using the system browser engine, which
shapes text with HarfBuzz — Khmer and English (and mixed) all render
correctly, unlike reportlab's built-in fonts. If no browser is found the
caller (pdf_service) falls back to reportlab.
"""
import base64
import html as html_mod
import os
import re
import shutil
import subprocess
import tempfile
from datetime import datetime

from config import BASE_DIR, config

_BROWSER_CANDIDATES = [
    os.environ.get("EDGE_PATH", ""),
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    os.environ.get("CHROME_PATH", ""),
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]

_CSS = """
@page { size: A4; margin: 12mm 13mm 14mm 13mm; }
* { box-sizing: border-box; }
body { font-family: "Noto Sans Khmer", "Khmer OS Battambang", "Khmer OS",
       "Khmer UI", "Leelawadee UI", "Segoe UI", system-ui, sans-serif;
       font-size: 12px; color: #1f2937; line-height: 1.5; margin: 0; }
.inv { max-width: 100%; }
.head { display: flex; align-items: center; gap: 14px; padding-bottom: 12px;
        border-bottom: 3px solid #1f4e8c; }
.logo { width: 64px; height: 64px; border-radius: 12px; object-fit: cover; }
.shop-name { font-size: 20px; font-weight: 700; color: #1f4e8c; margin: 0; }
.shop-meta { font-size: 11px; color: #6b7280; margin: 0; }
.title-row { display: flex; justify-content: space-between; align-items: flex-end;
             margin-top: 14px; }
.inv-title { font-size: 21px; font-weight: 800; color: #111827; margin: 0;
             letter-spacing: .5px; }
.inv-no { font-size: 12px; color: #374151; margin-top: 2px; }
.chip { display: inline-block; padding: 2px 10px; border-radius: 999px;
        font-size: 11px; font-weight: 600; margin-right: 6px; }
.chip-paid, .chip-delivered { background: #d1fae5; color: #065f46; }
.chip-pending { background: #fef3c7; color: #92400e; }
.chip-processing { background: #dbeafe; color: #1e40af; }
.chip-shipped { background: #f3e8ff; color: #6b21a8; }
.chip-cancelled { background: #fee2e2; color: #991b1b; }
.grid { display: flex; gap: 14px; margin-top: 12px; }
.box { flex: 1; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; }
.box h3 { margin: 0 0 6px; font-size: 10.5px; text-transform: uppercase;
          letter-spacing: .6px; color: #1f4e8c; }
.box p { margin: 2px 0; font-size: 12px; word-break: break-word; }
.lbl { color: #6b7280; }
table.items { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11.5px; }
table.items th { background: #1f4e8c; color: #fff; padding: 7px 8px; text-align: left; font-weight: 600; }
table.items td { border-bottom: 1px solid #e5e7eb; padding: 7px 8px; vertical-align: top; }
table.items tr:nth-child(even) td { background: #f9fafb; }
.num { text-align: right; white-space: nowrap; }
.totals { margin-left: auto; width: 250px; margin-top: 12px; }
.trow { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
.trow.grand { border-top: 2px solid #111827; font-weight: 800; font-size: 14px;
              margin-top: 6px; padding-top: 8px; }
.foot { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px;
        font-size: 11px; color: #6b7280; text-align: center; }
"""


def _find_browser():
    for path in _BROWSER_CANDIDATES:
        if path and os.path.exists(path):
            return path
    return None


def _esc(value):
    return html_mod.escape(str(value if value is not None else ""))


def _price(value, currency):
    try:
        return f"{float(value):,.2f} {currency}"
    except (TypeError, ValueError):
        return f"0.00 {currency}"


def _variations_text(var):
    if isinstance(var, dict) and var:
        return " \u00b7 ".join(f"{_esc(k)}: {_esc(v)}" for k, v in var.items())
    return ""


def _logo_data_uri(shop):
    if not shop.logo:
        return ""
    candidate = shop.logo.replace(config.BASE_URL, "").lstrip("/")
    path = os.path.join(BASE_DIR, candidate) if not os.path.isabs(candidate) else candidate
    if not os.path.exists(path):
        return ""
    ext = os.path.splitext(path)[1].lower().lstrip(".")
    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "webp": "image/webp", "gif": "image/gif"}.get(ext, "image/png")
    try:
        with open(path, "rb") as f:
            return f"data:{mime};base64," + base64.b64encode(f.read()).decode("ascii")
    except Exception:
        return ""


def _to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _to_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return 1


def _build_invoice_html(order, shop, items, logo_data_uri):
    # Invoice colors follow the shop's theme (fallback: classic ABA-ish blue).
    theme = shop.theme_dict() if hasattr(shop, "theme_dict") else {}
    primary = (theme or {}).get("primary") or "#1f4e8c"
    if not re.match(r"^#[0-9a-fA-F]{3,8}$", str(primary)):
        primary = "#1f4e8c"
    css = _CSS.replace("#1f4e8c", primary)
    currency = _esc(order.currency or "USD")
    shop_name = _esc(shop.shop_name or shop.username)
    shop_contact = _esc(shop.contact or "")
    created = order.created_at.strftime("%Y-%m-%d %H:%M") if order.created_at else "-"
    paid = order.paid_at.strftime("%Y-%m-%d %H:%M") if order.paid_at else ""

    status = _esc((order.payment_status or "pending").lower())
    order_status = _esc((order.order_status or "").lower())
    chips = [f'<span class="chip chip-{status}">{_esc((status or "pending").upper())}</span>']
    if order_status and order_status != "pending":
        chips.append(f'<span class="chip chip-{order_status}">{_esc(order_status.upper())}</span>')

    logo_html = f'<img class="logo" src="{logo_data_uri}" alt="">' if logo_data_uri else ""

    address = ", ".join(x for x in [order.customer_address, order.customer_city,
                                    order.customer_country] if x)

    rows = []
    for idx, item in enumerate(items, start=1):
        var = _variations_text(item.get("variations") or {})
        price = _price(item.get("price"), currency)
        qty = _esc(item.get("quantity", 1))
        subtotal = _price((_to_float(item.get("price")) * _to_int(item.get("quantity", 1))), currency)
        rows.append(
            f'<tr><td class="num">{idx}</td>'
            f'<td>{_esc(item.get("product_name", ""))}</td>'
            f'<td>{var}</td>'
            f'<td class="num">{price}</td>'
            f'<td class="num">{qty}</td>'
            f'<td class="num">{subtotal}</td></tr>'
        )

    total_rows = (
        f'<div class="trow"><span>Items Total</span><span>{_price(order.items_total, currency)}</span></div>'
        + (f'<div class="trow"><span>Shipping</span><span>+{_price(order.shipping_fee, currency)}</span></div>'
           if _to_float(order.shipping_fee) > 0 else "")
        + (f'<div class="trow"><span>Discount</span><span>-{_price(order.discount, currency)}</span></div>'
           if _to_float(order.discount) > 0 else "")
        + f'<div class="trow grand"><span>GRAND TOTAL</span><span>{_price(order.total, currency)}</span></div>'
    )

    return f"""<!DOCTYPE html>
<html lang="km">
<head><meta charset="utf-8"><title>Invoice {_esc(order.order_number)}</title>
<style>{css}</style></head>
<body>
<div class="inv">
  <div class="head">
    {logo_html}
    <div>
      <p class="shop-name">{shop_name}</p>
      <p class="shop-meta">{shop_contact}</p>
    </div>
  </div>

  <div class="title-row">
    <div>
      <h1 class="inv-title">INVOICE · វិក្កយបត្រ</h1>
      <p class="inv-no">#{_esc(order.order_number)} · {_esc(created)}</p>
    </div>
    <div>{''.join(chips)}</div>
  </div>

  <div class="grid">
    <div class="box">
      <h3>Order · លំដាប់</h3>
      <p><span class="lbl">Order / លេខការបញ្ជាទិញ:</span> {_esc(order.order_number)}</p>
      <p><span class="lbl">Date / កាលបរិច្ឆេទ:</span> {_esc(created)}</p>
      <p><span class="lbl">Paid / បង់ប្រាក់:</span> {_esc(paid or "-")}</p>
      <p><span class="lbl">Payment / វិធីបង់ប្រាក់:</span> {_esc(order.payment_method or "ABA")}</p>
      <p><span class="lbl">Transaction / លេខប្រតិបត្តិការ:</span> {_esc(order.transaction_id or "-")}</p>
    </div>
    <div class="box">
      <h3>Bill To · អ្នកទិញ</h3>
      <p><span class="lbl">Name / ឈ្មោះ:</span> {_esc(order.customer_name or "-")}</p>
      <p><span class="lbl">Phone / ទូរស័ព្ទ:</span> {_esc(order.customer_phone or "-")}</p>
      <p><span class="lbl">Telegram:</span> {_esc(order.customer_telegram or "-")}</p>
      <p><span class="lbl">Email / អ៊ីមែល:</span> {_esc(order.customer_email or "-")}</p>
      <p><span class="lbl">Address / អាសយដ្ឋាន:</span> {_esc(address or "-")}</p>
    </div>
  </div>

  <table class="items">
    <thead><tr>
      <th style="width:6%">#</th>
      <th style="width:30%">Item / ទំនិញ</th>
      <th style="width:28%">Variations / ព័ត៌មាន</th>
      <th style="width:13%">Price / តម្លៃ</th>
      <th style="width:8%">Qty / ចំនួន</th>
      <th style="width:15%">Subtotal / សរុប</th>
    </tr></thead>
    <tbody>{''.join(rows)}</tbody>
  </table>

  <div class="totals">{total_rows}</div>

  <div class="foot">
    <p style="font-size:12px; color:#1f2937;">សូមអរគុណសម្រាប់ការទិញ! Thank you for your purchase!</p>
    {f'<p>{shop_contact}</p>' if shop_contact else ""}
    <p>Generated / បង្កើត: {datetime.utcnow().strftime("%Y-%m-%d %H:%M")}</p>
  </div>
</div>
</body>
</html>"""


def generate_invoice(order, shop, items, output_path) -> bool:
    """Render the invoice PDF via headless Edge/Chromium. Returns True on success."""
    browser = _find_browser()
    if not browser:
        return False

    logo = _logo_data_uri(shop)
    html_doc = _build_invoice_html(order, shop, items, logo)
    tmp_html = os.path.join(tempfile.gettempdir(), f"invoice_{order.id}.html")
    with open(tmp_html, "w", encoding="utf-8") as f:
        f.write(html_doc)

    profile = tempfile.mkdtemp(prefix="edge_invoice_")
    try:
        url = "file:///" + tmp_html.replace("\\", "/")
        cmd = [browser, "--headless=new", "--disable-gpu",
               f"--user-data-dir={profile}", "--no-pdf-header-footer",
               f"--print-to-pdf={output_path}", "--virtual-time-budget=3000", url]
        subprocess.run(cmd, timeout=45, capture_output=True)
    except Exception:
        return False
    finally:
        shutil.rmtree(profile, ignore_errors=True)
        try:
            os.remove(tmp_html)
        except OSError:
            pass
    return os.path.exists(output_path) and os.path.getsize(output_path) > 500
