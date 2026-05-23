from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.core.config import get_settings
from app.core.logging import logger
from app.db.database import connect_db, disconnect_db
from app.services.segmentation_service import segmentation_service
from app.routers import upload, detect, history, export


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting DroneSeg Vision Platform")
    await connect_db()
    logger.info("Database connected")
    try:
        segmentation_service.load_model()
    except RuntimeError as e:
        logger.error(f"Model load failed: {e}. Inference endpoints unavailable.")
    yield
    await disconnect_db()
    logger.info("Shutdown complete")


app = FastAPI(
    title="DroneSeg Vision Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url=None,
    lifespan=lifespan,
)

settings = get_settings()

# ─── CORS whitelist (env-driven) ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Global exception handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(upload.router, prefix="/api")
app.include_router(detect.router, prefix="/api")
app.include_router(history.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")

# ─── Static file serving ──────────────────────────────────────────────────────
upload_dir = Path(settings.upload_dir)
upload_dir.mkdir(parents=True, exist_ok=True)
results_dir = Path(settings.results_dir)
results_dir.mkdir(parents=True, exist_ok=True)
app.mount("/api/v1/images", StaticFiles(directory=str(upload_dir)), name="images")
app.mount("/api/v1/masks", StaticFiles(directory=str(results_dir)), name="masks")


# ─── Health check ─────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": segmentation_service.is_ready,
        "model_name": settings.model_name,
        "version": "1.0.0",
    }
