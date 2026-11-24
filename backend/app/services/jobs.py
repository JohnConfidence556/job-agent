from collections import Counter
from datetime import datetime, timezone

from app.db import get_supabase
from app.services.tailoring import NotFoundError, load_current_tailored

JOB_FIELDS = (
    "id,title,company,location_text,remote,salary_text,posted_at,"
    "source,source_url,apply_url"
)
STRONG_MATCH = 60


def list_matches(
    user_id: str, min_score: int = 0, status: str | None = None, limit: int = 50, offset: int = 0
) -> list[dict]:
    query = (
        get_supabase()
        .table("matches")
        .select(f"id,fit_score,fit_analysis,status,applied_at,created_at,jobs({JOB_FIELDS})")
        .eq("user_id", user_id)
    )
    if min_score:
        query = query.gte("fit_score", min_score)
    query = query.eq("status", status) if status else query.neq("status", "dismissed")
    return (
        query.order("fit_score", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
        .data
    )


def get_match_detail(user_id: str, match_id: str) -> dict:
    rows = (
        get_supabase()
        .table("matches")
        .select("*,jobs(*)")
        .eq("id", match_id)
        .eq("user_id", user_id)
        .execute()
        .data
    )
    if not rows:
        raise NotFoundError("Match not found")
    return {"match": rows[0], "tailored": load_current_tailored(match_id)}


def update_match(user_id: str, match_id: str, changes: dict) -> dict:
    client = get_supabase()
    rows = (
        client.table("matches")
        .select("id,applied_at")
        .eq("id", match_id)
        .eq("user_id", user_id)
        .execute()
        .data
    )
    if not rows:
        raise NotFoundError("Match not found")

    update = dict(changes)
    if update.get("status") in ("applied", "interviewing") and not rows[0]["applied_at"]:
        update["applied_at"] = datetime.now(timezone.utc).isoformat()
    if not update:
        return rows[0]

    result = (
        client.table("matches")
        .update(update)
        .eq("id", match_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0]


def home_summary(user_id: str) -> dict:
    client = get_supabase()
    rows = client.table("matches").select("status,fit_score").eq("user_id", user_id).execute().data
    counts = Counter(row["status"] for row in rows)
    strong_new = sum(
        1 for row in rows if row["status"] == "new" and (row["fit_score"] or 0) >= STRONG_MATCH
    )
    has_cv = bool(
        client.table("master_cvs")
        .select("id")
        .eq("user_id", user_id)
        .eq("is_current", True)
        .limit(1)
        .execute()
        .data
    )
    return {"counts": dict(counts), "new_strong_matches": strong_new, "has_cv": has_cv}