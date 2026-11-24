import logging
import sys
import time
from datetime import datetime, timezone

from postgrest.exceptions import APIError

from app.config import get_settings
from app.db import get_supabase
from app.llm import LLMError
from app.services.matching import (
    candidate_summary,
    load_current_cv,
    load_pool,
    load_profile,
    save_match,
    score_job,
    select_candidates,
)
from workers.store import finish_run

logger = logging.getLogger(__name__)

MAX_CONSECUTIVE_FAILURES = 2
UNIQUE_VIOLATION = "23505"


def claim_run(user_id: str, origin: str) -> str | None:
    try:
        response = (
            get_supabase()
            .table("agent_runs")
            .insert(
                {
                    "kind": "user_search",
                    "user_id": user_id,
                    "origin": origin,
                    "run_date": datetime.now(timezone.utc).date().isoformat(),
                }
            )
            .execute()
        )
    except APIError as exc:
        if exc.code == UNIQUE_VIOLATION:
            return None
        raise
    return response.data[0]["id"]


def run_user_search(user_id: str, origin: str = "manual") -> dict:
    profile = load_profile(user_id)
    if profile is None:
        return {"skipped": "no profile"}
    if origin == "scheduled" and profile["search_paused"]:
        return {"skipped": "search paused"}
    cv = load_current_cv(user_id)
    if cv is None:
        return {"skipped": "no master CV"}

    run_id = claim_run(user_id, origin)
    if run_id is None:
        return {"skipped": "already ran today"}

    settings = get_settings()
    stats = {"pool": 0, "candidates": 0, "scored": 0, "failures": 0}
    status, error = "succeeded", None

    try:
        pool = load_pool(user_id)
        stats["pool"] = len(pool)
        chosen = select_candidates(pool, profile, cv, limit=settings.match_max_jobs)
        stats["candidates"] = len(chosen)

        summary = candidate_summary(cv, profile)
        streak = 0
        for job in chosen:
            try:
                fit = score_job(summary, job, user_id=user_id)
            except LLMError as exc:
                stats["failures"] += 1
                streak += 1
                logger.warning("Scoring failed for job %s: %s", job["id"], exc)
                if streak >= MAX_CONSECUTIVE_FAILURES:
                    error = str(exc)
                    break
                continue
            streak = 0
            save_match(user_id, job["id"], fit)
            stats["scored"] += 1
            if settings.match_call_delay_seconds:
                time.sleep(settings.match_call_delay_seconds)
        if stats["failures"]:
            status = "partial"
    except Exception as exc:
        logger.exception("User search failed for %s", user_id)
        status, error = "failed", str(exc)

    finish_run(run_id, status, stats, error)
    return {"status": status, **stats}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    if len(sys.argv) != 2:
        sys.exit("Usage: python -m workers.search <user_id>")
    print(run_user_search(sys.argv[1]))