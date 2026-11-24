from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.auth import current_user_id
from app.config import get_settings
from app.services.runs import has_running_search, latest_run, manual_searches_today
from workers.search import run_user_search

router = APIRouter(prefix="/search", tags=["search"])


@router.post("/run", status_code=202)
def start_search(background: BackgroundTasks, user_id: str = Depends(current_user_id)):
    if has_running_search(user_id):
        raise HTTPException(status_code=409, detail="A search is already running")
    limit = get_settings().manual_search_daily_limit
    if manual_searches_today(user_id) >= limit:
        raise HTTPException(status_code=429, detail=f"Limit of {limit} manual searches per day reached")
    background.add_task(run_user_search, user_id, "manual")
    return {"status": "started"}


@router.get("/latest")
def latest(user_id: str = Depends(current_user_id)):
    return latest_run(user_id) or {"status": "never"}