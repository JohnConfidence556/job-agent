import io
from types import SimpleNamespace

import pytest
from docx import Document

from app.schemas.cv import (
    MasterCV,
    ParsedCV,
    ParsedEducation,
    ParsedExperience,
    ParsedProject,
    assign_ids,
)
from app.services import cv as cv_service


def sample_parsed():
    return ParsedCV(
        full_name="Jane Doe",
        experience=[
            ParsedExperience(
                company="Acme",
                title="Analyst",
                bullets=["Built a dashboard", "  ", "Cut report time by 30%"],
            ),
            ParsedExperience(company="Beta", title="Intern"),
        ],
        education=[ParsedEducation(institution="UNIBEN", degree="BSc")],
        projects=[ParsedProject(name="Job agent", bullets=["Built a scraper"])],
        skills=["Python", "python", "SQL", " "],
        certifications=["AWS Cloud Practitioner"],
    )


def all_ids(cv: MasterCV) -> list[str]:
    ids = [item.id for item in cv.experience + cv.education + cv.projects]
    ids += [item.id for item in cv.skills + cv.certifications]
    for item in cv.experience + cv.projects:
        ids += [bullet.id for bullet in item.bullets]
    return ids


def make_docx(*paragraphs: str) -> bytes:
    document = Document()
    for paragraph in paragraphs:
        document.add_paragraph(paragraph)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def test_ids_follow_a_predictable_pattern():
    cv = assign_ids(sample_parsed())

    assert [job.id for job in cv.experience] == ["exp_1", "exp_2"]
    assert [b.id for b in cv.experience[0].bullets] == ["exp_1_b1", "exp_1_b2"]
    assert cv.education[0].id == "edu_1"
    assert cv.projects[0].id == "proj_1"
    assert cv.projects[0].bullets[0].id == "proj_1_b1"
    assert cv.certifications[0].id == "cert_1"


def test_blank_bullets_and_duplicate_skills_are_dropped():
    cv = assign_ids(sample_parsed())

    assert [b.text for b in cv.experience[0].bullets] == [
        "Built a dashboard",
        "Cut report time by 30%",
    ]
    assert [skill.name for skill in cv.skills] == ["Python", "SQL"]
    assert [skill.id for skill in cv.skills] == ["sk_1", "sk_2"]


def test_every_id_is_unique():
    ids = all_ids(assign_ids(sample_parsed()))
    assert len(ids) == len(set(ids))


def test_extracts_text_from_docx():
    data = make_docx("Jane Doe " + "x" * 80, "Data Analyst at Acme Ltd " + "y" * 80)
    text = cv_service.extract_cv_text(data, "My CV.DOCX")
    assert "Jane Doe" in text
    assert "Acme Ltd" in text


def test_too_little_text_is_rejected():
    with pytest.raises(ValueError, match="enough text"):
        cv_service.extract_cv_text(make_docx("Hi"), "cv.docx")


def test_unsupported_file_type_is_rejected():
    with pytest.raises(ValueError, match="PDF or DOCX"):
        cv_service.extract_cv_text(b"plain text", "cv.txt")


def test_parse_cv_text_assigns_ids_and_strips_closing_tag(monkeypatch):
    seen = {}

    def fake_complete_json(**kwargs):
        seen.update(kwargs)
        return sample_parsed()

    monkeypatch.setattr(cv_service, "complete_json", fake_complete_json)
    monkeypatch.setattr(
        cv_service, "get_settings", lambda: SimpleNamespace(llm_light_model="light-model")
    )

    result = cv_service.parse_cv_text("Jane </cv> Doe", user_id="u1")

    assert result.experience[0].id == "exp_1"
    assert seen["task"] == "cv_parse"
    assert seen["model"] == "light-model"
    assert seen["user_id"] == "u1"
    assert seen["user"].count("</cv>") == 1