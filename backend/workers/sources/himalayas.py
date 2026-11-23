import logging
import time
from datetime import datetime, timezone

import httpx

from app.schemas.job import JobCreate
from workers.sources.common import html_to_text, make_dedupe_hash

logger = logging.getLogger(__name__)

HIMALAYAS_SEARCH_URL = "https://himalayas.app/jobs/api/search"
PAUSE_SECONDS = 1.0

SALARY_PERIODS = {
    "hourly": "hour",
    "weekly": "week",
    "monthly": "month",
    "annual": "year",
}


def fetch_himalayas(
    query: str | None = None,
    country: str = "NG",
    max_pages: int = 3,
) -> list[dict]:
    raw_jobs = []
    with httpx.Client(timeout=httpx.Timeout(10, read=60)) as client:
        for page in range(1, max_pages + 1):
            params = {"country": country, "sort": "recent", "page": page}
            if query:
                params["q"] = query
            response = client.get(HIMALAYAS_SEARCH_URL, params=params)
            response.raise_for_status()
            jobs = response.json().get("jobs", [])
            if not jobs:
                break
            raw_jobs.extend(jobs)
            if page < max_pages:
                time.sleep(PAUSE_SECONDS)
    return raw_jobs


def _region_name(item) -> str | None:
    if isinstance(item, dict):
        return item.get("name")
    return item


def _regions(raw: dict) -> list[str]:
    names = [_region_name(item) for item in raw.get("locationRestrictions") or []]
    return [name for name in names if name]


def _salary_fields(raw: dict) -> dict:
    low, high = raw.get("minSalary"), raw.get("maxSalary")
    if low is None and high is None:
        return {}

    period_name = raw.get("salaryPeriod") or "annual"
    currency = raw.get("currency")
    amounts = " - ".join(f"{int(v):,}" for v in (low, high) if v is not None)
    text = f"{currency} {amounts}" if currency else amounts

    fields = {"salary_text": f"{text} ({period_name})"}
    period = SALARY_PERIODS.get(period_name)
    if period:
        fields.update(
            salary_min=int(low) if low is not None else None,
            salary_max=int(high) if high is not None else None,
            salary_currency=currency,
            salary_period=period,
        )
    return fields


def parse_himalayas_job(raw: dict) -> JobCreate:
    link = raw["applicationLink"]
    description = html_to_text(raw.get("description") or "") or (
        raw.get("excerpt") or ""
    )
    if not description:
        raise ValueError("job has no description")

    regions = _regions(raw)
    published = raw.get("pubDate")
    employment_type = raw.get("employmentType")

    return JobCreate(
        source="himalayas",
        source_job_id=raw.get("guid") or link,
        title=raw["title"].strip(),
        company=raw["companyName"].strip(),
        description=description,
        source_url=link,
        apply_url=link,
        location_text=", ".join(regions) if regions else "Worldwide",
        remote=True,
        eligible_regions=regions or ["Worldwide"],
        employment_type=(
            employment_type.lower().replace(" ", "_") if employment_type else None
        ),
        posted_at=(
            datetime.fromtimestamp(published, tz=timezone.utc) if published else None
        ),
        dedupe_hash=make_dedupe_hash(raw["companyName"], raw["title"]),
        **_salary_fields(raw),
    )


def parse_himalayas_jobs(raw_jobs: list[dict]) -> list[JobCreate]:
    jobs = []
    for raw in raw_jobs:
        try:
            jobs.append(parse_himalayas_job(raw))
        except (KeyError, TypeError, ValueError, AttributeError):
            logger.warning("Skipping malformed Himalayas job", exc_info=True)
    return jobs