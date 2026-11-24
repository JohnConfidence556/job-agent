import logging

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.db import get_supabase

logger = logging.getLogger(__name__)

bearer = HTTPBearer(auto_error=False)


def current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> str:
    token = credentials.credentials.strip() if credentials else ""
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        response = get_supabase().auth.get_user(token)
        user = response.user if response else None
    except Exception:
        logger.info("Token rejected", exc_info=True)
        user = None
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return str(user.id)