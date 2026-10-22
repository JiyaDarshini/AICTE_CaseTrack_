from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    DATABASE_URL: str = "sqlite+aiosqlite:///casetrack.db"
    SYNC_DATABASE_URL: str = "sqlite:///casetrack.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    JWT_SECRET: str = "aicte_casetrack_super_secret_jwt_key_2026_sih_secure_token_key_change_in_prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"]

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "noreply@aicte-casetrack.gov.in"

    SIMILARITY_HIGH_THRESHOLD: float = 0.75
    SIMILARITY_MEDIUM_THRESHOLD: float = 0.55
    CELERY_TASK_ALWAYS_EAGER: bool = True


settings = Settings()
