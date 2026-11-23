from datetime import datetime
from typing import Literal

from pydantic import BaseModel

JobSource = Literal["remotive", "himalayas", "weworkremotely", "remoteok", "manual"]
SalaryPeriod = Literal["hour", "day", "week", "month", "year"]


class JobCreate(BaseModel):
    source: JobSource
    source_job_id: str | None = None
    title: str
    company: str
    description: str
    source_url: str
    apply_url: str
    location_text: str | None = None
    remote: bool = False
    eligible_regions: list[str] = []
    employment_type: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str | None = None
    salary_period: SalaryPeriod | None = None
    salary_text: str | None = None
    posted_at: datetime | None = None
    dedupe_hash: str