from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    supabase_service_key: str
    environment: str = "development"
    groq_api_key: str
    llm_heavy_model: str = "openai/gpt-oss-120b"
    llm_light_model: str = "openai/gpt-oss-20b"
    match_max_jobs: int = 8
    match_call_delay_seconds: float = 0.0


@lru_cache
def get_settings() -> Settings:
    return Settings()

