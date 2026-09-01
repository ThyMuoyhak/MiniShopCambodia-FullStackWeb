"""Backup & restore endpoints (shop + system level)."""
import os
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

import models
from config import config
from database import get_db
from security import (get_current_admin, get_current_user, log_activity,
                      require_shop_access)
from services import backup_service

router = APIRouter(prefix="/api/backup", tags=["backup"])


def _save_upload(upload: UploadFile) -> str:
    os.makedirs(config.BACKUP_DIR, exist_ok=True)
    filename = f"import_{upload.filename.replace('/', '_')}"
    dest = os.path.join(config.BACKUP_DIR, filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(upload.file, f)
    return dest


def _serve_export(db, export_format: str, shop_id=None):
    """Create a backup and return it as a file download. Supports json/zip/xlsx."""
    fmt = (export_format or "xlsx").lower()
    if fmt == "xlsx":
        path = backup_service.export_backup_excel(db, shop_id=shop_id)
    else:
        # force the requested container (zip/json), never auto-fallback
        result = backup_service.create_backup(db, shop_id=shop_id, fmt=fmt)
        path = result["filepath"]
    if path.endswith(".xlsx"):
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    elif path.endswith(".zip"):
        media = "application/zip"
    else:
        media = "application/json"
    return FileResponse(path, filename=os.path.basename(path), media_type=media)


@router.get("/admin/export")
def export_system(export_format: str = "xlsx",
                  db: Session = Depends(get_db),
                  admin: models.User = Depends(get_current_admin)):
    """Admin: download the full system backup as JSON, ZIP or Excel."""
    return _serve_export(db, export_format)


@router.get("/shop/{shop_id}/export")
def export_shop(shop_id: int, export_format: str = "xlsx",
                db: Session = Depends(get_db),
                user: models.User = Depends(get_current_user)):
    """Shop owner/admin: download one shop's backup as JSON, ZIP or Excel."""
    require_shop_access(shop_id, user)
    return _serve_export(db, export_format, shop_id=shop_id)



@router.post("/shop/{shop_id}/create")
def create_shop_backup(shop_id: int, format: str = "",
                       db: Session = Depends(get_db),
                       user: models.User = Depends(get_current_user)):
    require_shop_access(shop_id, user)
    result = backup_service.create_backup(db, shop_id=shop_id, fmt=format)
    log_activity(db, "create_backup", f"{user.username} created shop backup {result['filename']}",
                 shop_id, user)
    db.commit()
    return result


@router.post("/shop/{shop_id}/import")
def import_shop_backup(shop_id: int, file: UploadFile = File(...), db: Session = Depends(get_db),
                       user: models.User = Depends(get_current_user)):
    require_shop_access(shop_id, user)
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in config.ALLOWED_FILE_EXT:
        raise HTTPException(status_code=400, detail="Only .json, .zip or .xlsx files are allowed")
    filepath = _save_upload(file)
    try:
        count, skipped, images_restored = backup_service.import_shop_backup(db, shop_id, filepath)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {e}")
    log_activity(db, "import_backup", f"{user.username} imported shop backup ({count} records, "
                 f"{skipped} duplicates skipped, {images_restored} images)", shop_id, user)
    db.commit()
    return {"ok": True, "records_restored": count, "duplicates_skipped": skipped,
            "images_restored": images_restored}


@router.post("/admin/create")
def create_system_backup(format: str = "", db: Session = Depends(get_db),
                         admin: models.User = Depends(get_current_admin)):
    result = backup_service.create_backup(db, shop_id=None, fmt=format)
    log_activity(db, "system_backup", f"Admin created system backup {result['filename']}", None, admin)
    db.commit()
    return result


@router.post("/admin/import")
def import_system_backup(file: UploadFile = File(...), db: Session = Depends(get_db),
                         admin: models.User = Depends(get_current_admin)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in config.ALLOWED_FILE_EXT:
        raise HTTPException(status_code=400, detail="Only .json, .zip or .xlsx files are allowed")
    filepath = _save_upload(file)
    try:
        count, skipped, images_restored = backup_service.import_system_backup(db, filepath)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {e}")
    log_activity(db, "system_import", f"Admin imported system backup ({count} records, "
                 f"{skipped} duplicates skipped, {images_restored} images)", None, admin)
    db.commit()
    return {"ok": True, "records_restored": count, "duplicates_skipped": skipped,
            "images_restored": images_restored}


@router.get("/history")
def backup_history(shop_id: int = None, db: Session = Depends(get_db),
                   user: models.User = Depends(get_current_user)):
    q = db.query(models.BackupHistory)
    if shop_id is not None:
        require_shop_access(shop_id, user)
        q = q.filter(models.BackupHistory.shop_id == shop_id)
    else:
        if user.role != "admin":
            q = q.filter(models.BackupHistory.shop_id == user.shop_id)
    items = q.order_by(models.BackupHistory.id.desc()).all()
    return [b.to_dict() for b in items]


@router.get("/download")
def download_backup(filename: str, db: Session = Depends(get_db),
                    user: models.User = Depends(get_current_user)):
    """Return a download URL for a backup file."""
    safe = os.path.basename(filename)
    path = os.path.join(config.BACKUP_DIR, safe)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Backup file not found")
    record = db.query(models.BackupHistory).filter(models.BackupHistory.filename == safe).first()
    if record and record.shop_id is not None:
        require_shop_access(record.shop_id, user)
    return {"url": f"/backups/{safe}", "filename": safe}
