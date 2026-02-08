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

    # 공개 시장 데이터 조회용 기본 KIS API 설정 (선택적)
    KIS_APP_KEY: str = ""
    KIS_APP_SECRET: str = ""
    KIS_ACCOUNT_NO: str = ""
    KIS_MOCK: bool = True  # True면 모의투자

    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: str = '["http://localhost:5173","http://localhost:3000"]'

    LOG_LEVEL: str = "DEBUG"
    LOG_DIR: str = "logs"

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS or self.CORS_ORIGINS.strip() == "":
            return ["http://localhost:5173", "http://localhost:3000"]
        try:
            return json.loads(self.CORS_ORIGINS)
        except json.JSONDecodeError:
            # 단일 URL이 들어온 경우 처리
            return [self.CORS_ORIGINS.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
