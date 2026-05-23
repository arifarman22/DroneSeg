from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.db.models import list_images, get_image
from app.services.storage_service import storage_service
from app.schemas.detection import ImageListResponse, ImageResponse, ImageDetailResponse

router = APIRouter(prefix="/history", tags=["history"])


@router.get("/", response_model=ImageListResponse)
async def get_history(skip: int = 0, limit: int = 20):
    images, total = await list_images(skip, limit)
    return ImageListResponse(
        images=[ImageResponse.model_validate(img, from_attributes=True) for img in images],
        total=total,
    )


@router.get("/{image_id}", response_model=ImageDetailResponse)
async def get_image_detail(image_id: str):
    image = await get_image(image_id)
    if not image:
        raise HTTPException(404, "Image not found")
    return image


@router.get("/{image_id}/file")
async def get_image_file(image_id: str):
    image = await get_image(image_id)
    if not image:
        raise HTTPException(404, "Image not found")
    path = storage_service.get_upload_path(image.storedFilename)
    if not path.exists():
        raise HTTPException(404, "File missing from storage")
    return FileResponse(path, media_type=image.mimeType)
