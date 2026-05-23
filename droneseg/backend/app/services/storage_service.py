from pathlib import Path
import aiofiles
from app.core.config import get_settings


class StorageService:
    """Local file storage. Swap this class for S3/GCS in production."""

    def __init__(self):
        settings = get_settings()
        self.upload_dir = Path(settings.upload_dir)
        self.results_dir = Path(settings.results_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.results_dir.mkdir(parents=True, exist_ok=True)

    async def save_upload(self, content: bytes, filename: str) -> str:
        path = self.upload_dir / filename
        async with aiofiles.open(path, "wb") as f:
            await f.write(content)
        return str(path)

    async def save_result(self, data: bytes, filename: str) -> str:
        path = self.results_dir / filename
        async with aiofiles.open(path, "wb") as f:
            await f.write(data)
        return str(path)

    def get_upload_path(self, filename: str) -> Path:
        return self.upload_dir / filename

    def get_result_path(self, filename: str) -> Path:
        return self.results_dir / filename

    def get_upload_url(self, filename: str) -> str:
        return f"/api/v1/images/{filename}"


storage_service = StorageService()
