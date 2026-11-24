import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from app.auth import current_user_id
from app.config import get_settings
from app.db import get_supabase
from app.llm import LLMError
from app.schemas.api import PreferencesUpdate
from app.services.cv import extract_cv_text, parse_cv_text, save_master_cv
from app.services.cv_storage import store_cv_file
from app.services.tailoring import NotFoundError, load_master_row
from app.services.usage import count_today

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/me", tags=["me"])

MAX_UPLOAD_BYTES = 5 * 1024 * 1024


@router.get("")
def get_profile(user_id: str = Depends(current_user_id)):
    rows = get_supabase().table("profiles").select("*").eq("id", user_id).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Profile not found")
    return rows[0]


@router.patch("")
def update_profile(changes: PreferencesUpdate, user_id: str = Depends(current_user_id)):
    data = changes.model_dump(exclude_unset=True)
    if not data:
        return get_profile(user_id)
    rows = get_supabase().table("profiles").update(data).eq("id", user_id).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Profile not found")
    return rows[0]


@router.get("/cv")
def get_master_cv(user_id: str = Depends(current_user_id)):
    try:
        master_id, cv = load_master_row(user_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {"id": master_id, "cv": cv}


@router.post("/cv")
def upload_cv(file: UploadFile, user_id: str = Depends(current_user_id)):
    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than 5 MB")

    limit = get_settings().cv_upload_daily_limit
    if count_today(user_id, "cv_parse") >= limit:
        raise HTTPException(status_code=429, detail=f"Limit of {limit} CV uploads per day reached")

    filename = file.filename or ""
    try:
        text = extract_cv_text(data, filename)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    try:
        cv = parse_cv_text(text, user_id=user_id)
    except LLMError:
        raise HTTPException(status_code=503, detail="The AI service is busy. Try again in a minute.")

    path = store_cv_file(user_id, data, filename)
    row = save_master_cv(user_id, cv, path)
    return {"version": row["version"], "cv": cv}