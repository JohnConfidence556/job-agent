import logging
import re
from datetime import datetime, timezone

import httpx

from app.schemas.job import JobCreate
from workers.sources.common import html_to_text, make_dedupe_hash

logger = logging.getLogger(__name__)

REMOTIVE_URL = "https://remotive.com/api/remote-jobs"


def fetch_remotive(
    search: str | None = None,
    category: str | None = None,
    limit: int | None = None,
) -> list[dict]:
    params = {}
    if search:
        params["search"] = search
    if category:
        params["category"] = category
    if limit:
        params["limit"] = limit

    response = httpx.get(REMOTIVE_URL, params=params, timeout=httpx.Timeout(10, read=90))
    response.raise_for_status()
    return response.json()["jobs"]


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _split_regions(value: str) -> list[str]:
    return [part.strip() for part in re.split(r"[,;/]", value) if part.strip()]


def parse_remotive_job(raw: dict) -> JobCreate:
    location = (raw.get("candidate_required_location") or "").strip()
    salary = (raw.get("salary") or "").strip()

    return JobCreate(
        source="remotive",
        source_job_id=str(raw["id"]),
        title=raw["title"].strip(),
        company=raw["company_name"].strip(),
        description=html_to_text(raw["description"]),
        source_url=raw["url"],
        apply_url=raw["url"],
        location_text=location or None,
        remote=True,
        eligible_regions=_split_regions(location),
        employment_type=raw.get("job_type") or None,
        salary_text=salary or None,
        posted_at=_parse_date(raw.get("publication_date")),
        dedupe_hash=make_dedupe_hash(raw["company_name"], raw["title"]),
    )


def parse_remotive_jobs(raw_jobs: list[dict]) -> list[JobCreate]:
    jobs = []
    for raw in raw_jobs:
        try:
            jobs.append(parse_remotive_job(raw))
        except (KeyError, TypeError, ValueError, AttributeError):
            logger.warning(
                "Skipping malformed Remotive job %s", raw.get("id"), exc_info=True
            )
    return jobs