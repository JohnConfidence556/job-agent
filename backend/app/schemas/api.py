import re
from typing import Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, Field, field_validator

JobType = Literal["local", "remote", "international"]
MatchStatus = Literal["new", "reviewed", "applied", "interviewing", "closed", "dismissed"]


def _short_strings(values: list[str], max_items: int, max_len: int) -> list[str]:
    cleaned = [v.strip() for v in values if v and v.strip()]
    if len(cleaned) > max_items or any(len(v) > max_len for v in cleaned):
        raise ValueError(f"At most {max_items} items of {max_len} characters")
    return cleaned


class PreferencesUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    target_roles: list[str] | None = None
    job_types: list[JobType] | None = None
    locations: list[str] | None = None
    experience_level: str | None = Field(default=None, max_length=40)
    salary_min: int | None = Field(default=None, ge=0)
    salary_currency: str | None = Field(default=None, min_length=3, max_length=3)
    run_time: str | None = None
    timezone: str | None = None
    search_paused: bool | None = None

    @field_validator("target_roles")
    @classmethod
    def check_roles(cls, value):
        return None if value is None else _short_strings(value, 10, 80)

    @field_validator("locations")
    @classmethod
    def check_locations(cls, value):
        return None if value is None else _short_strings(value, 10, 80)

    @field_validator("run_time")
    @classmethod
    def check_run_time(cls, value):
        if value is not None and not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", value):
            raise ValueError("run_time must look like 18:00")
        return value

    @field_validator("timezone")
    @classmethod
    def check_timezone(cls, value):
        if value is not None:
            try:
                ZoneInfo(value)
            except Exception:
                raise ValueError("Unknown timezone, e.g. Africa/Lagos")
        return value

    @field_validator("salary_currency")
    @classmethod
    def upper_currency(cls, value):
        return value.upper() if value else value


class MatchUpdate(BaseModel):
    status: MatchStatus | None = None
    notes: str | None = Field(default=None, max_length=5000)