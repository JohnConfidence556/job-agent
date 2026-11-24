from datetime import datetime, timedelta, timezone

from app.db import get_supabase
from app.services.usage import start_of_today

STALE_AFTER = timedelta(minutes=15)


def latest_run(user_id: str) -> dict | None:
    rows = (
        get_supabase()
        .table("agent_runs")
        .select("id,origin,status,stats,error,started_at,finished_at")
        .eq("user_id", user_id)
        .eq("kind", "user_search")
        .order("started_at", desc=True)
        .limit(1)
        .execute()
        .data
    )
    return rows[0] if rows else None


def has_running_search(user_id: str) -> bool:
    since = (datetime.now(timezone.utc) - STALE_AFTER).isoformat()
    rows = (
        get_supabase()
        .table("agent_runs")
        .select("id")
        .eq("user_id", user_id)
        .eq("kind", "user_search")
        .eq("status", "running")
        .gte("started_at", since)
        .limit(1)
        .execute()
        .data
    )
    return bool(rows)


def manual_searches_today(user_id: str) -> int:
    response = (
        get_supabase()
        .table("agent_runs")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("kind", "user_search")
        .eq("origin", "manual")
        .gte("started_at", start_of_today())
        .execute()
    )
    return response.count or 0