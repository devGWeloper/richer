from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import json


class Settings(BaseSettings):
    APP_NAME: str = "Richer"
    DEBUG: bool = True
    SQL_ECHO: bool = False  # SQL 쿼리 로깅 (True면 모든 쿼리 출력)
    SECRET_KEY: str = "change-me-to-a-random-secret-key-at-least-32-chars"
    FERNET_KEY: str = ""

    DATABASE_URL: str = "sqlite+aiosqlite:///./richer.db"

    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: str = '["http://localhost:5173","http://localhost:3000"]'

    LOG_LEVEL: str = "DEBUG"
    LOG_DIR: str = "logs"

    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.CORS_ORIGINS)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
