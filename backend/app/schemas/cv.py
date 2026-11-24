from pydantic import BaseModel


class ParsedExperience(BaseModel):
    company: str
    title: str
    location: str | None = None
    start: str | None = None
    end: str | None = None
    bullets: list[str] = []


class ParsedEducation(BaseModel):
    institution: str
    degree: str | None = None
    field: str | None = None
    start: str | None = None
    end: str | None = None


class ParsedProject(BaseModel):
    name: str
    description: str | None = None
    technologies: list[str] = []
    bullets: list[str] = []


class ParsedCV(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    links: list[str] = []
    summary: str | None = None
    experience: list[ParsedExperience] = []
    education: list[ParsedEducation] = []
    projects: list[ParsedProject] = []
    skills: list[str] = []
    certifications: list[str] = []


class Bullet(BaseModel):
    id: str
    text: str


class Experience(BaseModel):
    id: str
    company: str
    title: str
    location: str | None = None
    start: str | None = None
    end: str | None = None
    bullets: list[Bullet] = []


class Education(BaseModel):
    id: str
    institution: str
    degree: str | None = None
    field: str | None = None
    start: str | None = None
    end: str | None = None


class Project(BaseModel):
    id: str
    name: str
    description: str | None = None
    technologies: list[str] = []
    bullets: list[Bullet] = []


class Skill(BaseModel):
    id: str
    name: str


class Certification(BaseModel):
    id: str
    name: str


class MasterCV(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    links: list[str] = []
    summary: str | None = None
    experience: list[Experience] = []
    education: list[Education] = []
    projects: list[Project] = []
    skills: list[Skill] = []
    certifications: list[Certification] = []


def _bullets(prefix: str, texts: list[str]) -> list[Bullet]:
    cleaned = [text.strip() for text in texts if text and text.strip()]
    return [
        Bullet(id=f"{prefix}_b{n}", text=text) for n, text in enumerate(cleaned, start=1)
    ]


def _unique(values: list[str]) -> list[str]:
    seen = set()
    result = []
    for value in values:
        value = value.strip()
        key = value.lower()
        if value and key not in seen:
            seen.add(key)
            result.append(value)
    return result


def assign_ids(parsed: ParsedCV) -> MasterCV:
    experience = [
        Experience(
            id=f"exp_{n}",
            **item.model_dump(exclude={"bullets"}),
            bullets=_bullets(f"exp_{n}", item.bullets),
        )
        for n, item in enumerate(parsed.experience, start=1)
    ]
    education = [
        Education(id=f"edu_{n}", **item.model_dump())
        for n, item in enumerate(parsed.education, start=1)
    ]
    projects = [
        Project(
            id=f"proj_{n}",
            **item.model_dump(exclude={"bullets"}),
            bullets=_bullets(f"proj_{n}", item.bullets),
        )
        for n, item in enumerate(parsed.projects, start=1)
    ]
    skills = [
        Skill(id=f"sk_{n}", name=name)
        for n, name in enumerate(_unique(parsed.skills), start=1)
    ]
    certifications = [
        Certification(id=f"cert_{n}", name=name)
        for n, name in enumerate(_unique(parsed.certifications), start=1)
    ]

    return MasterCV(
        **parsed.model_dump(
            exclude={"experience", "education", "projects", "skills", "certifications"}
        ),
        experience=experience,
        education=education,
        projects=projects,
        skills=skills,
        certifications=certifications,
    )