import logging
from datetime import datetime, timezone

import httpx

from app.schemas.job import JobCreate
from workers.sources.common import fix_text, html_to_text, make_dedupe_hash, split_regions

logger = logging.getLogger(__name__)

REMOTEOK_URL = "https://remoteok.com/api"
CONTACT_EMAIL = "your-email@example.com"  # replace with your own address
HEADERS = {"User-Agent": "job-agent/0.1", "From": CONTACT_EMAIL}


def fetch_remoteok(tags: list[str] | None = None) -> list[dict]:
    params = {"tags": ",".join(tags)} if tags else None
    response = httpx.get(
        REMOTEOK_URL,
        params=params,
        headers=HEADERS,
        timeout=httpx.Timeout(10, read=60),
    )
    response.raise_for_status()

    data = response.json()
    if not isinstance(data, list):
        raise ValueError("Unexpected RemoteOK response format")
    return [item for item in data if isinstance(item, dict) and "position" in item]


def _salary_fields(raw: dict) -> dict:
    low = int(raw.get("salary_min") or 0)
    high = int(raw.get("salary_max") or 0)
    if not low and not high:
        return {}

    amounts = " - ".join(f"{value:,}" for value in (low, high) if value)
    return {
        "salary_min": low or None,
        "salary_max": high or None,
        "salary_currency": "USD",
        "salary_period": "year",
        "salary_text": f"USD {amounts} (annual)",
    }


def parse_remoteok_job(raw: dict) -> JobCreate:
    title = fix_text(raw["position"]).strip()
    company = fix_text(raw["company"]).strip()
    description = html_to_text(fix_text(raw.get("description") or ""))
    if not description:
        raise ValueError("job has no description")

    url = raw["url"]
    location = fix_text(raw.get("location") or "").strip()
    epoch = raw.get("epoch")

    return JobCreate(
        source="remoteok",
        source_job_id=str(raw["id"]),
        title=title,
        company=company,
        description=description,
        source_url=url,
        apply_url=raw.get("apply_url") or url,
        location_text=location or None,
        remote=True,
        eligible_regions=split_regions(location),
        posted_at=datetime.fromtimestamp(epoch, tz=timezone.utc) if epoch else None,
        dedupe_hash=make_dedupe_hash(company, title),
        **_salary_fields(raw),
    )


def parse_remoteok_jobs(raw_jobs: list[dict]) -> list[JobCreate]:
    jobs = []
    for raw in raw_jobs:
        try:
            jobs.append(parse_remoteok_job(raw))
        except (KeyError, TypeError, ValueError, AttributeError):
            logger.warning("Skipping malformed RemoteOK job", exc_info=True)
    return jobs