import logging
import sys
import time
from collections import Counter
from datetime import datetime, time as clock_time, timedelta, timezone
from zoneinfo import ZoneInfo
from app.timeutil import parse_timestamp

from app.db import get_supabase
from workers.ingest import main as run_ingest
from workers.search import run_user_search

logger = logging.getLogger(__name__)

TICK_SECONDS = 600
MAX_USERS_PER_TICK = 5
MAX_ATTEMPTS_PER_DAY = 2
INGEST_HOURS_UTC = (5, 11, 16)  # 06:00, 12:00 and 17:00 in Lagos
DEFAULT_TIMEZONE = "Africa/Lagos"


def parse_run_time(value: str) -> clock_time:
    hours, minutes = value.split(":")[:2]
    return clock_time(int(hours), int(minutes))


def local_now(now: datetime, tz_name: str) -> datetime:
    try:
        return now.astimezone(ZoneInfo(tz_name))
    except Exception:
        logger.warning("Unknown timezone %r, using %s", tz_name, DEFAULT_TIMEZONE)
        return now.astimezone(ZoneInfo(DEFAULT_TIMEZONE))


def due_users(
    now: datetime,
    profiles: list[dict],
    with_cv: set[str],
    done: set[tuple[str, str]],
    failures: Counter,
) -> list[tuple[str, str]]:
    due = []
    for profile in profiles:
        user_id = profile["id"]
        if profile.get("search_paused") or user_id not in with_cv:
            continue
        local = local_now(now, profile["timezone"])
        run_time = parse_run_time(profile["run_time"])
        if local.time() < run_time:
            continue
        key = (user_id, local.date().isoformat())
        if key in done or failures[key] >= MAX_ATTEMPTS_PER_DAY:
            continue
        due.append((run_time, user_id, key[1]))
    due.sort()
    return [(user_id, run_date) for _, user_id, run_date in due]


def latest_slot(now: datetime) -> datetime:
    slots = [now.replace(hour=h, minute=0, second=0, microsecond=0) for h in INGEST_HOURS_UTC]
    passed = [slot for slot in slots if slot <= now]
    if passed:
        return max(passed)
    yesterday = now - timedelta(days=1)
    return yesterday.replace(hour=max(INGEST_HOURS_UTC), minute=0, second=0, microsecond=0)


def ingest_due(now: datetime, last_started: datetime | None) -> bool:
    return last_started is None or last_started < latest_slot(now)


def last_ingest_started() -> datetime | None:
    rows = (
        get_supabase()
        .table("agent_runs")
        .select("started_at")
        .eq("kind", "ingest")
        .order("started_at", desc=True)
        .limit(1)
        .execute()
        .data
    )
    return parse_timestamp(rows[0]["started_at"]) if rows else None


def load_state(now: datetime):
    # Each query returns at most 1000 rows (Supabase default): fine for now.
    client = get_supabase()
    profiles = (
        client.table("profiles")
        .select("id,run_time,timezone,search_paused")
        .eq("search_paused", False)
        .execute()
        .data
    )
    with_cv = {
        row["user_id"]
        for row in client.table("master_cvs").select("user_id").eq("is_current", True).execute().data
    }
    since = (now.date() - timedelta(days=2)).isoformat()
    runs = (
        client.table("agent_runs")
        .select("user_id,run_date,status")
        .eq("kind", "user_search")
        .eq("origin", "scheduled")
        .gte("run_date", since)
        .execute()
        .data
    )
    done = {(r["user_id"], r["run_date"]) for r in runs if r["status"] != "failed"}
    failures = Counter((r["user_id"], r["run_date"]) for r in runs if r["status"] == "failed")
    return profiles, with_cv, done, failures


def tick(now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    result = {"ingested": False, "searched": 0, "errors": 0}

    if ingest_due(now, last_ingest_started()):
        run_ingest([])
        result["ingested"] = True

    profiles, with_cv, done, failures = load_state(now)
    for user_id, run_date in due_users(now, profiles, with_cv, done, failures)[:MAX_USERS_PER_TICK]:
        try:
            run_user_search(user_id, "scheduled", run_date)
            result["searched"] += 1
        except Exception:
            logger.exception("Scheduled search crashed for %s", user_id)
            result["errors"] += 1
    return result


def main(once: bool = False) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logger.info("Scheduler started (checking every %s seconds)", TICK_SECONDS)
    try:
        while True:
            try:
                logger.info("Tick finished: %s", tick())
            except Exception:
                logger.exception("Tick failed")
            if once:
                return
            time.sleep(TICK_SECONDS)
    except KeyboardInterrupt:
        logger.info("Scheduler stopped")


if __name__ == "__main__":
    main(once="--once" in sys.argv)