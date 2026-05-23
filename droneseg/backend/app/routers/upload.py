import uuid
from io import BytesIO
from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image as PILImage, UnidentifiedImageError
from app.core.security import validate_file_type, read_and_validate_size, sanitize_filename
from app.db.models import create_image
from app.services.storage_service import storage_service
from app.schemas.detection import UploadResponse

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/", response_model=UploadResponse, status_code=201)
async def upload_image(file: UploadFile = File(...)):
    # 1. Validate extension and content type (JPEG/PNG only)
    validate_file_type(file)

    # 2. Read file and enforce 50MB limit
    content = await read_and_validate_size(file)

    # 3. Sanitize original filename to prevent path traversal
    safe_filename = sanitize_filename(file.filename)

    # 4. Validate image integrity with Pillow
    try:
        img = PILImage.open(BytesIO(content))
        img.verify()  # checks for corruption
        # Re-open after verify (verify closes the stream)
        img = PILImage.open(BytesIO(content))
        width, height = img.size
    except (UnidentifiedImageError, Exception):
        raise HTTPException(status_code=422, detail="File is not a valid image or is corrupted.")

    # 5. Ensure Pillow-detected format matches allowed types
    fmt = img.format
    if fmt not in ("JPEG", "PNG"):
        raise HTTPException(status_code=400, detail=f"Image format '{fmt}' not allowed. Only JPEG and PNG.")

    # 6. Generate UUID filename to prevent collisions and path attacks
    ext = "jpg" if fmt == "JPEG" else "png"
    stored_name = f"{uuid.uuid4()}.{ext}"

    # 7. Persist to storage
    file_path = await storage_service.save_upload(content, stored_name)

    # 8. Store metadata in PostgreSQL
    image = await create_image(
        original_filename=safe_filename,
        stored_filename=stored_name,
        file_path=file_path,
        size_bytes=len(content),
        mime_type=f"image/{ext}",
        width=width,
        height=height,
    )

    # 9. Return response
    return UploadResponse(
        image_id=image.id,
        image_url=storage_service.get_upload_url(stored_name),
        width=width,
        height=height,
        size_bytes=len(content),
        filename=safe_filename,
    )
