"""File upload endpoints (logo, banner, product images, slideshow)."""
import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image

from config import config
from security import get_current_user

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


def _validate_image(content: bytes, filename: str) -> None:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in config.ALLOWED_IMAGE_EXT:
        raise HTTPException(status_code=400, detail=f"Image extension {ext} not allowed")
    if len(content) > config.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 8MB)")
    try:
        img = Image.open(__import__("io").BytesIO(content))
        img.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")


@router.post("")
async def upload_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    """Upload an image. Returns the public URL path."""
    content = await file.read()
    _validate_image(content, file.filename or "image.png")
    ext = os.path.splitext(file.filename or ".png")[1].lower()
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(config.UPLOAD_DIR, filename)
    with open(dest, "wb") as f:
        f.write(content)
    return {"url": f"/uploads/{filename}", "filename": filename}


@router.post("/product")
async def upload_product_images(files: list[UploadFile] = File(...), user=Depends(get_current_user)):
    """Upload multiple product images at once."""
    urls = []
    for file in files:
        content = await file.read()
        _validate_image(content, file.filename or "image.png")
        ext = os.path.splitext(file.filename or ".png")[1].lower()
        filename = f"{uuid.uuid4().hex}{ext}"
        with open(os.path.join(config.UPLOAD_DIR, filename), "wb") as f:
            f.write(content)
        urls.append(f"/uploads/{filename}")
    return {"urls": urls}
