from datetime import datetime, timezone

from app.db import get_supabase


def start_of_today() -> str:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


def count_today(user_id: str, task: str) -> int:
    response = (
        get_supabase()
        .table("llm_usage")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("task", task)
        .gte("created_at", start_of_today())
        .execute()
    )
    return response.count or 0