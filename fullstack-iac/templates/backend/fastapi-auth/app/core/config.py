"""
Application configuration management using Pydantic Settings.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from datetime import timedelta

class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # Application
    PROJECT_NAME: str = "FastAPI Auth Template"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"  # MUST change in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080"
    ]

    # Database (for future use)
    DATABASE_URL: str = "sqlite:///./app.db"

    # Password hashing
    PWD_CONTEXT_SCHEMES: List[str] = ["bcrypt"]
    PWD_CONTEXT_DEPRECATED: str = "auto"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="allow"
    )

    @property
    def access_token_expire(self) -> timedelta:
        """Get access token expiration as timedelta"""
        return timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)

    @property
    def refresh_token_expire(self) -> timedelta:
        """Get refresh token expiration as timedelta"""
        return timedelta(days=self.REFRESH_TOKEN_EXPIRE_DAYS)

# Create global settings instance
settings = Settings()
