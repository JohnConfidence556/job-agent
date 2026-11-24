import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import jobs, me, search

from app.config import get_settings
from app.db import get_supabase

logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(title="Job Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().frontend_origin],
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(me.router)
app.include_router(jobs.router)
app.include_router(search.router)


@app.get("/health")
def health():
    return {"status": "ok", "environment": settings.environment}


@app.get("/health/db")
def health_db():
    try:
        result = (
            get_supabase()
            .table("profiles")
            .select("id", count="exact")
            .limit(1)
            .execute()
        )
    except Exception:
        logger.exception("Database health check failed")
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"database": "ok", "profiles": result.count}