import logging
from pathlib import Path
from uuid import uuid4

from app.db import get_supabase

logger = logging.getLogger(__name__)

BUCKET = "cvs"
CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def store_cv_file(user_id: str, data: bytes, filename: str) -> str | None:
    extension = Path(filename).suffix.lower()
    if extension not in CONTENT_TYPES:
        return None
    path = f"{user_id}/uploads/{uuid4().hex}{extension}"
    try:
        get_supabase().storage.from_(BUCKET).upload(
            path, data, {"content-type": CONTENT_TYPES[extension]}
        )
    except Exception:
        logger.exception("Could not store the uploaded CV file for %s", user_id)
        return None
    return path