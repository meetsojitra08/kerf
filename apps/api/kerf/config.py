from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://kerf:kerf_secret@localhost:5434/kerf"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    JWT_SECRET: str = "dev_kerf_jwt_secret_key_change_in_production_min32chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_MINUTES: int = 1440

    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000


settings = Settings()
