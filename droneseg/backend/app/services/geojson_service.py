from app.schemas.detection import GeoJsonExport, GeoFeature


def build_geojson_from_jobs(jobs: list) -> GeoJsonExport:
    """Convert completed jobs with coordinates into a GeoJSON FeatureCollection."""
    features = []
    for job in jobs:
        if job.latitude is None or job.longitude is None:
            continue
        feature = GeoFeature(
            geometry={
                "type": "Point",
                "coordinates": [job.longitude, job.latitude],
            },
            properties={
                "job_id": job.id,
                "filename": job.filenameOriginal,
                "status": job.status,
                "width": job.width,
                "height": job.height,
                "class_breakdown": job.classBreakdown,
                "created_at": job.createdAt.isoformat() if job.createdAt else None,
            },
        )
        features.append(feature)
    return GeoJsonExport(features=features)
