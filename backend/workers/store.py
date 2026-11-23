import logging
from datetime import datetime, timezone

from app.db import get_supabase
from app.schemas.job import JobCreate

logger = logging.getLogger(__name__)

BATCH_SIZE = 50


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _chunks(items: list, size: int):
    for start in range(0, len(items), size):
        yield items[start : start + size]


def start_ingest_run(source: str) -> str:
    response = (
        get_supabase()
        .table("agent_runs")
        .insert(
            {
                "kind": "ingest",
                "source": source,
                "origin": "scheduled",
                "run_date": datetime.now(timezone.utc).date().isoformat(),
            }
        )
        .execute()
    )
    return response.data[0]["id"]


def finish_run(
    run_id: str, status: str, stats: dict, error: str | None = None
) -> None:
    (
        get_supabase()
        .table("agent_runs")
        .update(
            {
                "status": status,
                "stats": stats,
                "error": error,
                "finished_at": _now(),
            }
        )
        .eq("id", run_id)
        .execute()
    )


def save_jobs(jobs: list[JobCreate]) -> dict:
    unique = {}
    for job in jobs:
        unique.setdefault(job.dedupe_hash, job)
    rows = [job.model_dump(mode="json") for job in unique.values()]

    client = get_supabase()

    new_count = 0
    for batch in _chunks(rows, BATCH_SIZE):
        response = (
            client.table("jobs")
            .upsert(batch, on_conflict="dedupe_hash", ignore_duplicates=True)
            .execute()
        )
        new_count += len(response.data)

    seen = {"last_seen_at": _now(), "is_active": True}
    for batch in _chunks(list(unique.keys()), BATCH_SIZE):
        client.table("jobs").update(seen).in_("dedupe_hash", batch).execute()

    return {
        "unique": len(rows),
        "new": new_count,
        "duplicates_in_batch": len(jobs) - len(rows),
    }