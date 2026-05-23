from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str
    cors_origins: str = "http://localhost:3000"
    upload_dir: str = "./uploads"
    results_dir: str = "./results"
    model_name: str = "nvidia/segformer-b0-finetuned-ade-512-512"
    hf_token: str = ""
    max_file_size_mb: int = 50
    max_inference_size: int = 1024
    log_level: str = "INFO"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
