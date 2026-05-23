import uuid
from io import BytesIO
from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image as PILImage, UnidentifiedImageError
from app.core.security import validate_file_type, read_and_validate_size, sanitize_filename
from app.core.logging import logger
from app.db.models import create_image
from app.services.storage_service import storage_service
from app.schemas.detection import UploadResponse

router = APIRouter(prefix="/upload", tags=["upload"])

ALLOWED_PIL_FORMATS = {"JPEG", "PNG", "MPO"}


@router.post("/", response_model=UploadResponse, status_code=201)
async def upload_image(file: UploadFile = File(...)):
    # 1. Validate extension and MIME type
    validate_file_type(file)

    # 2. Read file and enforce 50MB limit
    content = await read_and_validate_size(file)

    # 3. Sanitize original filename
    safe_filename = sanitize_filename(file.filename)

    logger.info(f"Upload received: filename='{safe_filename}', mime='{file.content_type}', size={len(content)}")

    # 4. Validate image integrity with Pillow
    try:
        img = PILImage.open(BytesIO(content))
        img.verify()
        # Re-open after verify
        img = PILImage.open(BytesIO(content))
    except (UnidentifiedImageError, Exception):
        raise HTTPException(status_code=422, detail="File is not a valid image or is corrupted.")

    # 5. Check Pillow-detected format
    detected_format = img.format
    logger.info(f"Pillow detected format: '{detected_format}'")

    if detected_format not in ALLOWED_PIL_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Image format '{detected_format}' not allowed. Only JPEG, PNG, and MPO are supported."
        )

    # 6. Process based on format
    stored_name = f"{uuid.uuid4()}"
    buf = BytesIO()

    if detected_format == "MPO":
        # MPO: extract first frame, convert to standard JPEG
        img.seek(0)
        img = img.convert("RGB")
        img.save(buf, format="JPEG", quality=95)
        stored_name += ".jpg"
        mime_type = "image/jpeg"
        final_format = "JPEG"

    elif detected_format == "JPEG":
        # JPEG: ensure RGB, re-save as clean JPEG
        img = img.convert("RGB")
        img.save(buf, format="JPEG", quality=95)
        stored_name += ".jpg"
        mime_type = "image/jpeg"
        final_format = "JPEG"

    elif detected_format == "PNG":
        # PNG: preserve as-is (keeps transparency)
        img.save(buf, format="PNG")
        stored_name += ".png"
        mime_type = "image/png"
        final_format = "PNG"

    saved_content = buf.getvalue()
    width, height = img.size

    # 7. Persist to storage
    file_path = await storage_service.save_upload(saved_content, stored_name)

    logger.info(f"Saved: format={final_format}, path='{file_path}', size={len(saved_content)}, dims={width}x{height}")

    # 8. Store metadata in PostgreSQL
    image = await create_image(
        original_filename=safe_filename,
        stored_filename=stored_name,
        file_path=file_path,
        size_bytes=len(saved_content),
        mime_type=mime_type,
        width=width,
        height=height,
    )

    # 9. Return response
    return UploadResponse(
        image_id=image.id,
        image_url=storage_service.get_upload_url(stored_name),
        width=width,
        height=height,
        size_bytes=len(saved_content),
        filename=safe_filename,
    )
