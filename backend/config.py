from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    openai_api_key: str
    tavily_api_key: str = "tvly-dev-placeholder"
    frontend_url: str = "http://localhost:3000"
    database_url: str = "sqlite+aiosqlite:///./zamp.db"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
