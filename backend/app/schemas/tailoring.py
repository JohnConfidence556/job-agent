from pydantic import BaseModel


class TailoredBullet(BaseModel):
    source_id: str
    text: str


class TailoredRole(BaseModel):
    source_id: str
    bullets: list[TailoredBullet] = []


class TailoredSummary(BaseModel):
    text: str
    source_ids: list[str] = []


class TailoredDraft(BaseModel):
    summary: TailoredSummary | None = None
    experience: list[TailoredRole] = []
    projects: list[TailoredRole] = []
    skill_ids: list[str] = []
    gaps: list[str] = []