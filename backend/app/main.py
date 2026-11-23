from fastapi import FastAPI

from app.config import get_settings

settings = get_settings()

app = FastAPI(title="Job Agent API")


@app.get("/health")
def health():
    return {"status": "ok", "environment": settings.environment}