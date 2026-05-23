from fastapi import APIRouter, HTTPException, Query
from app.db.models import get_detection, get_image
from app.schemas.detection import GeoJsonExport, GeoFeature

router = APIRouter(prefix="/export", tags=["export"])


def _pixel_bbox_to_polygon(
    bbox: dict,
    img_width: int,
    img_height: int,
    min_lng: float,
    min_lat: float,
    max_lng: float,
    max_lat: float,
) -> list[list[float]]:
    """
    Convert a pixel bounding box to a GeoJSON polygon ring.
    Maps pixel (x, y) to geographic coordinates using linear interpolation
    over the image's geographic bounds.

    Pixel origin is top-left; latitude increases upward (south→north).
    """
    lng_per_px = (max_lng - min_lng) / img_width
    lat_per_px = (max_lat - min_lat) / img_height

    x, y, w, h = bbox["x"], bbox["y"], bbox["width"], bbox["height"]

    west = min_lng + x * lng_per_px
    east = min_lng + (x + w) * lng_per_px
    # y=0 is top of image = max_lat (north)
    north = max_lat - y * lat_per_px
    south = max_lat - (y + h) * lat_per_px

    # GeoJSON polygon ring: [lng, lat], closed
    return [
        [west, north],
        [east, north],
        [east, south],
        [west, south],
        [west, north],
    ]


@router.get("/geojson/{detection_id}", response_model=GeoJsonExport)
async def export_detection_geojson(
    detection_id: str,
    min_lng: float = Query(None, description="West bound of image (longitude)"),
    min_lat: float = Query(None, description="South bound of image (latitude)"),
    max_lng: float = Query(None, description="East bound of image (longitude)"),
    max_lat: float = Query(None, description="North bound of image (latitude)"),
):
    """
    Export detection bounding boxes as geographic GeoJSON polygons.

    Geographic bounds can be provided via query params or are read from the
    image record in the database (set during upload with georeferenced images).
    """
    detection = await get_detection(detection_id)
    if not detection:
        raise HTTPException(404, "Detection not found.")

    image = await get_image(detection.imageId)
    if not image:
        raise HTTPException(404, "Associated image not found.")

    if not image.width or not image.height:
        raise HTTPException(422, "Image dimensions unknown. Cannot convert to geographic coordinates.")

    # Resolve bounds: query params override DB values
    bounds_min_lng = min_lng if min_lng is not None else getattr(image, "boundsMinLng", None)
    bounds_min_lat = min_lat if min_lat is not None else getattr(image, "boundsMinLat", None)
    bounds_max_lng = max_lng if max_lng is not None else getattr(image, "boundsMaxLng", None)
    bounds_max_lat = max_lat if max_lat is not None else getattr(image, "boundsMaxLat", None)

    if None in (bounds_min_lng, bounds_min_lat, bounds_max_lng, bounds_max_lat):
        raise HTTPException(
            422,
            "Geographic bounds required. Provide min_lng, min_lat, max_lng, max_lat "
            "as query parameters or store them on the image record.",
        )

    # Parse detections from stored JSON
    detections_data = detection.detectionsJson
    if not detections_data:
        return GeoJsonExport(features=[])

    items = detections_data.get("detections", [])

    features = []
    for item in items:
        bbox = item.get("bbox")
        if not bbox:
            continue

        polygon_ring = _pixel_bbox_to_polygon(
            bbox=bbox,
            img_width=image.width,
            img_height=image.height,
            min_lng=bounds_min_lng,
            min_lat=bounds_min_lat,
            max_lng=bounds_max_lng,
            max_lat=bounds_max_lat,
        )

        features.append(GeoFeature(
            geometry={
                "type": "Polygon",
                "coordinates": [polygon_ring],
            },
            properties={
                "class": item.get("label"),
                "confidence": item.get("confidence"),
                "pixel_area": item.get("pixel_area"),
                "color": item.get("color"),
                "detection_id": detection_id,
            },
        ))

    return GeoJsonExport(features=features)
