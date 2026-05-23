import time
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.db.models import get_image, create_detection, get_detection, list_detections_for_image
from app.services.segmentation_service import segmentation_service
from app.services.storage_service import storage_service
from app.schemas.detection import (
    DetectRequest, DetectResponse, DetectionItem, BBox, DetectionResponse,
)
from app.core.config import get_settings
from app.core.logging import logger

router = APIRouter(prefix="/detect", tags=["detect"])


@router.post("/", response_model=DetectResponse, status_code=200)
async def run_detection(body: DetectRequest):
    # 1. Check model readiness
    if not segmentation_service.is_ready:
        raise HTTPException(503, "Segmentation model is not loaded. Try again later.")

    # 2. Find image in PostgreSQL
    image = await get_image(body.image_id)
    if not image:
        raise HTTPException(404, f"Image '{body.image_id}' not found.")

    # 3. Run inference
    upload_path = storage_service.get_upload_path(image.storedFilename)
    if not upload_path.exists():
        raise HTTPException(404, "Image file missing from storage.")

    start = time.perf_counter()
    result = segmentation_service.run_inference(upload_path)
    inference_ms = int((time.perf_counter() - start) * 1000)

    # 4. Filter detections by confidence threshold
    detections: list[DetectionItem] = []
    for cls in result["classes"]:
        if cls["confidence"] < body.confidence_threshold:
            continue
        for bbox_raw in cls["bounding_boxes"]:
            detections.append(DetectionItem(
                label=cls["class_name"],
                confidence=cls["confidence"],
                bbox=BBox(**bbox_raw),
                pixel_area=cls["pixel_count"],
                color=cls["color"],
            ))

    # 5. Save mask to outputs/
    mask_filename = f"{body.image_id}_mask.png"
    await storage_service.save_result(result["mask_png"], mask_filename)

    # 6. Persist detection record in PostgreSQL
    settings = get_settings()
    detection_record = await create_detection(
        image_id=body.image_id,
        model_used=settings.model_name,
        detections_json={"detections": [d.model_dump() for d in detections]},
        mask_path=mask_filename,
        inference_time_ms=inference_ms,
        confidence_threshold=body.confidence_threshold,
    )

    logger.info(f"Detection {detection_record.id} completed for image {body.image_id} in {inference_ms}ms")

    # 7. Return response
    return DetectResponse(
        detection_id=detection_record.id,
        image_id=body.image_id,
        model_used=settings.model_name,
        inference_time_ms=inference_ms,
        mask_url=f"/api/v1/detect/mask/{detection_record.id}",
        detections=detections,
    )


# ─── Supporting GET endpoints ─────────────────────────────────────────────────

@router.get("/mask/{detection_id}")
async def get_mask_image(detection_id: str):
    detection = await get_detection(detection_id)
    if not detection or not detection.maskPath:
        raise HTTPException(404, "Mask not available.")
    path = storage_service.get_result_path(detection.maskPath)
    if not path.exists():
        raise HTTPException(404, "Mask file missing from storage.")
    return FileResponse(path, media_type="image/png")


@router.get("/{image_id}", response_model=list[DetectionResponse])
async def get_detections_for_image(image_id: str):
    detections = await list_detections_for_image(image_id)
    if not detections:
        raise HTTPException(404, "No detections found for this image.")
    return detections


@router.get("/result/{detection_id}", response_model=DetectionResponse)
async def get_detection_detail(detection_id: str):
    detection = await get_detection(detection_id)
    if not detection:
        raise HTTPException(404, "Detection not found.")
    return detection
