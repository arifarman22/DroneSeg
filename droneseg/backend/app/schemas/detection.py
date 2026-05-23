from pydantic import BaseModel, Field
from datetime import datetime


# ─── Upload ───────────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    image_id: str
    image_url: str
    width: int
    height: int
    size_bytes: int
    filename: str


# ─── Detect ───────────────────────────────────────────────────────────────────

class DetectRequest(BaseModel):
    image_id: str
    confidence_threshold: float = Field(default=0.5, ge=0.0, le=1.0)


class BBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class DetectionItem(BaseModel):
    label: str
    confidence: float
    bbox: BBox
    pixel_area: int
    color: list[int]


class DetectResponse(BaseModel):
    detection_id: str
    image_id: str
    model_used: str
    inference_time_ms: int
    mask_url: str
    detections: list[DetectionItem]


# ─── History / General ────────────────────────────────────────────────────────

class ImageResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    originalFilename: str
    storedFilename: str
    filePath: str
    width: int | None = None
    height: int | None = None
    sizeBytes: int
    mimeType: str
    createdAt: datetime


class ImageListResponse(BaseModel):
    images: list[ImageResponse]
    total: int


class DetectionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    imageId: str
    modelUsed: str
    detectionsJson: dict
    maskPath: str | None = None
    inferenceTimeMs: int
    confidenceThreshold: float
    createdAt: datetime


class ImageDetailResponse(ImageResponse):
    detections: list[DetectionResponse] = []


class GeoFeature(BaseModel):
    type: str = "Feature"
    geometry: dict
    properties: dict


class GeoJsonExport(BaseModel):
    type: str = "FeatureCollection"
    features: list[GeoFeature]
