from __future__ import annotations

import os
import secrets
import importlib
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


class ObjectStorageConfigError(RuntimeError):
    pass


def _cloudinary_enabled() -> bool:
    return all(
        [
            os.getenv("CLOUDINARY_CLOUD_NAME", "").strip(),
            os.getenv("CLOUDINARY_API_KEY", "").strip(),
            os.getenv("CLOUDINARY_API_SECRET", "").strip(),
        ]
    )


def _configure_cloudinary() -> None:
    cloudinary = importlib.import_module("cloudinary")

    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True,
    )


def save_product_image(data: bytes, content_type: str) -> str:
    allowed = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
    if content_type not in allowed:
        raise ObjectStorageConfigError("Unsupported image format")

    extension = allowed[content_type]

    if _cloudinary_enabled():
        cloudinary_uploader = importlib.import_module("cloudinary.uploader")

        _configure_cloudinary()
        folder = os.getenv("CLOUDINARY_FOLDER", "rent-prague/products")
        result = cloudinary_uploader.upload(
            data,
            folder=folder,
            public_id=secrets.token_urlsafe(10),
            resource_type="image",
            overwrite=False,
        )
        secure_url = str(result.get("secure_url", "")).strip()
        if not secure_url:
            raise ObjectStorageConfigError("Failed to upload image to object storage")
        return secure_url

    file_name = f"{secrets.token_urlsafe(10)}.{extension}"
    file_path = UPLOADS_DIR / file_name
    file_path.write_bytes(data)
    return f"/uploads/{file_name}"
