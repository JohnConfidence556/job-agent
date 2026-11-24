import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import current_user_id
from app.config import get_settings
from app.llm import LLMError
from app.schemas.api import MatchStatus, MatchUpdate
from app.services import jobs as jobs_service
from app.services.runs import latest_run
from app.services.tailoring import NotFoundError, TailorLimitError, tailor_for_match
from app.services.usage import count_today

logger = logging.getLogger(__name__)
router = APIRouter(tags=["jobs"])


@router.get("/home")
def home(user_id: str = Depends(current_user_id)):
    summary = jobs_service.home_summary(user_id)
    limit = get_settings().tailor_daily_limit
    summary["last_run"] = latest_run(user_id)
    summary["tailorings_left"] = max(0, limit - count_today(user_id, "cv_tailor"))
    return summary


@router.get("/jobs")
def list_jobs(
    min_score: int = Query(0, ge=0, le=100),
    status: MatchStatus | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(current_user_id),
):
    return jobs_service.list_matches(user_id, min_score, status, limit, offset)


@router.get("/jobs/{match_id}")
def job_detail(match_id: str, user_id: str = Depends(current_user_id)):
    try:
        return jobs_service.get_match_detail(user_id, match_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.patch("/jobs/{match_id}")
def update_job(match_id: str, changes: MatchUpdate, user_id: str = Depends(current_user_id)):
    try:
        return jobs_service.update_match(user_id, match_id, changes.model_dump(exclude_unset=True))
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/jobs/{match_id}/tailor")
def tailor(match_id: str, regenerate: bool = False, user_id: str = Depends(current_user_id)):
    try:
        return tailor_for_match(user_id, match_id, regenerate)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except TailorLimitError as exc:
        raise HTTPException(status_code=429, detail=str(exc))
    except LLMError:
        raise HTTPException(status_code=503, detail="The AI service is busy. Try again in a minute.")