"""
Query helpers wrapping the Prisma client for Image and Detection models.
"""
from prisma import Json
from app.db.database import db


# ─── Image ────────────────────────────────────────────────────────────────────

async def create_image(
    original_filename: str,
    stored_filename: str,
    file_path: str,
    size_bytes: int,
    mime_type: str,
    width: int | None = None,
    height: int | None = None,
):
    return await db.image.create(
        data={
            "originalFilename": original_filename,
            "storedFilename": stored_filename,
            "filePath": file_path,
            "sizeBytes": size_bytes,
            "mimeType": mime_type,
            "width": width,
            "height": height,
        }
    )


async def get_image(image_id: str):
    return await db.image.find_unique(where={"id": image_id}, include={"detections": True})


async def list_images(skip: int = 0, limit: int = 20):
    images = await db.image.find_many(skip=skip, take=limit, order={"createdAt": "desc"})
    total = await db.image.count()
    return images, total


# ─── Detection ────────────────────────────────────────────────────────────────

async def create_detection(
    image_id: str,
    model_used: str,
    detections_json: dict,
    mask_path: str | None,
    inference_time_ms: int,
    confidence_threshold: float,
):
    return await db.detection.create(
        data={
            "image": {"connect": {"id": image_id}},
            "modelUsed": model_used,
            "detectionsJson": Json(detections_json),
            "maskPath": mask_path,
            "inferenceTimeMs": inference_time_ms,
            "confidenceThreshold": confidence_threshold,
        }
    )


async def get_detection(detection_id: str):
    return await db.detection.find_unique(where={"id": detection_id}, include={"image": True})


async def list_detections_for_image(image_id: str):
    return await db.detection.find_many(
        where={"imageId": image_id},
        order={"createdAt": "desc"},
    )
