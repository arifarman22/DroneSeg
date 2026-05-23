from fastapi import UploadFile, HTTPException
from pathlib import PurePosixPath
from app.core.config import get_settings

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}
ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg"}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50MB


def validate_file_type(file: UploadFile) -> None:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")
    ext = PurePosixPath(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type '{ext}'. Only JPEG and PNG are accepted.")
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid content type '{file.content_type}'. Only image/jpeg and image/png are accepted.")


async def read_and_validate_size(file: UploadFile) -> bytes:
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 50MB size limit.")
    return content


def sanitize_filename(filename: str) -> str:
    """Strip path components to prevent path traversal attacks."""
    return PurePosixPath(filename).name
