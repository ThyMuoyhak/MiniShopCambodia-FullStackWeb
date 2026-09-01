"""ABA Pay (KHQR) integration service.

Uses the real KHQR gateway (ABA Pay in Cambodia):

  Managed Checkout (redirect flow):
      GET https://khqr.cc/api/payment/requestv2/{profile_id}?transaction_id=..&amount=..&success_url=..&remark=..&hash=..

  Direct QR API (headless JSON, real KHQR):
      POST https://khqr.cc/api/{profile_id}/payment-gateway/v1/payments/qr-api-khqrcc

  Verify / Check Transaction V2 (polling):
      POST https://khqr.cc/api/{profile_id}/payment-gateway/v1/payments/check-transv2-khqrcc

Hash formulas (from KHQR docs):
  checkout / QR  : sha1(secret + transaction_id + amount + success_url + remark)
  verify         : sha1(secret + transaction_id)

Behavior:
  - If the shop has no Profile ID / Secret Key, no QR is ever shown:
    a PaymentNotConfigured error is raised so the frontend can display a clear message.
  - Payment verification ALWAYS calls the real Verify V2 API. A payment is only
    marked "paid" when the gateway reports status = success.
"""
import hashlib
import os
import secrets
import time
from urllib.parse import quote

import httpx
import qrcode
from config import config

KHQRCC_BASE = "https://khqr.cc/api"


class PaymentNotConfigured(Exception):
    """Raised when a shop has not configured its ABA Pay credentials."""


def aba_hash(secret_key: str, transaction_id: str, amount: str, success_url: str, remark: str) -> str:
    raw = f"{secret_key}{transaction_id}{amount}{success_url}{remark}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def verify_hash(secret_key: str, transaction_id: str) -> str:
    """Verify-V2 hash: sha1(secret + transaction_id)."""
    raw = f"{secret_key}{transaction_id}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def generate_transaction_id(order_number: str = "") -> str:
    return f"MS{int(time.time())}{secrets.randbelow(9000) + 1000}"


def _aba_config(shop):
    aba = shop.aba_dict()
    return (aba.get("profile_id") or "").strip(), (aba.get("secret_key") or "").strip()


def is_configured(shop) -> bool:
    profile_id, secret_key = _aba_config(shop)
    return bool(profile_id and secret_key)


def generate_qr_image(data: str, filename: str) -> str:
    """Render a raw KHQR EMV string into a PNG image; returns the public URL path."""
    os.makedirs(config.QR_DIR, exist_ok=True)
    filepath = os.path.join(config.QR_DIR, filename)
    img = qrcode.make(data)
    img.save(filepath)
    return f"/uploads/qr/{filename}"


def request_direct_qr(profile_id: str, secret_key: str, transaction_id: str,
                      amount: str, success_url: str, remark: str) -> dict:
    """Call the Direct QR API and return the parsed JSON response."""
    url = f"{KHQRCC_BASE}/{profile_id}/payment-gateway/v1/payments/qr-api-khqrcc"
    payload = {
        "transaction_id": transaction_id,
        "amount": amount,
        "success_url": success_url,
        "remark": remark,
        "hash": aba_hash(secret_key, transaction_id, amount, success_url, remark),
    }
    with httpx.Client(timeout=30) as client:
        resp = client.post(url, data=payload)
    return resp.json()


def build_checkout_url(order, shop, success_url="", error_url="", cancel_url="") -> dict:
    """
    Build a REAL KHQRcc managed-checkout redirect URL for an order and fetch a
    real KHQR image from the Direct QR API.

    Raises PaymentNotConfigured when the shop has no Profile ID / Secret Key.
    """
    profile_id, secret_key = _aba_config(shop)
    if not profile_id or not secret_key:
        raise PaymentNotConfigured(
            "ABA Pay is not configured for this shop yet. "
            "The shop owner must enter their ABA Pay Profile ID and Secret Key "
            "in the Shop Dashboard → Payment Settings before customers can pay online."
        )

    tran_id = generate_transaction_id(order.order_number)
    amount = f"{order.total:.2f}"
    remark = f"Payment for order #{order.order_number}"
    success_url = success_url or f"{config.BASE_URL}/api/payments/aba/success?order_id={order.id}"
    error_url = error_url or f"{config.BASE_URL}/api/payments/aba/error?order_id={order.id}"
    h = aba_hash(secret_key, tran_id, amount, success_url, remark)

    checkout_url = (
        f"{KHQRCC_BASE}/payment/requestv2/{profile_id}"
        f"?transaction_id={tran_id}&amount={amount}"
        f"&success_url={quote(success_url, safe='')}&remark={quote(remark, safe='')}"
        f"&cancel_url={quote(cancel_url, safe='')}&hash={h}"
    )

    result = {
        "transaction_id": tran_id,
        "amount": amount,
        "remark": remark,
        "sandbox": False,
        "checkout_url": checkout_url,
        "success_url": success_url,
        "error_url": error_url,
        "hash": h,
    }

    # Fetch a REAL KHQR (EMV) image from the Direct QR API.
    # If the gateway is unreachable the QR is simply omitted — the frontend then
    # shows only the "Pay with ABA Pay" redirect button (never a fake QR).
    try:
        qr = request_direct_qr(profile_id, secret_key, tran_id, amount, success_url, remark)
        if qr.get("responseCode") == 0 and qr.get("data"):
            emv = qr["data"].get("qr", "")
            qr_url = qr["data"].get("qr_url", "")
            if emv:
                result["qr_content"] = emv
                # Always render the QR locally (PNG served by this API host) so the
                # frontend can display it reliably — remote gateway image URLs can
                # time out / be blocked in the customer's browser.
                result["qr_code_url"] = generate_qr_image(emv, f"qr_{tran_id}.png")
            elif qr_url:
                result["qr_code_url"] = qr_url
    except Exception:
        pass

    return result


def verify_payment(order, shop, transaction_id: str = "") -> dict:
    """
    Poll the real KHQRcc Verify V2 API.

    Returns verified=True ONLY when the gateway reports status = success.
    pending -> verified=False, status="pending"  (frontend keeps polling)
    """
    profile_id, secret_key = _aba_config(shop)
    if not profile_id or not secret_key:
        return {"verified": False, "status": "not_configured",
                "error": "ABA Pay is not configured for this shop"}

    tx = (transaction_id or order.transaction_id or "").strip()
    if not tx:
        return {"verified": False, "status": "pending", "detail": "No transaction id yet"}

    url = f"{KHQRCC_BASE}/{profile_id}/payment-gateway/v1/payments/check-transv2-khqrcc"
    payload = {"transaction_id": tx, "hash": verify_hash(secret_key, tx)}
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(url, data=payload)
        result = resp.json()
    except Exception as e:
        return {"verified": False, "status": "error", "detail": str(e), "transaction_id": tx}

    if result.get("responseCode") == 0:
        data = result.get("data") or {}
        status = data.get("status", "pending")
        if status == "success":
            return {
                "verified": True,
                "status": "success",
                "amount": data.get("amount"),
                "transaction_id": tx,
                "detail": result,
            }
        return {"verified": False, "status": status, "transaction_id": tx, "detail": result}

    return {"verified": False, "status": "error",
            "detail": result.get("responseMessage", "Unknown verification error"),
            "transaction_id": tx}

