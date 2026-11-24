from types import SimpleNamespace

import pytest

from app.schemas.cv import Bullet, Certification, Education, Experience, MasterCV, Project, Skill
from app.schemas.tailoring import TailoredBullet, TailoredDraft, TailoredRole, TailoredSummary
from app.services import tailoring as t


def cv():
    return MasterCV(
        full_name="Jane Doe",
        summary="Data analyst who builds dashboards.",
        experience=[
            Experience(id="exp_1", company="Acme", title="Analyst", bullets=[
                Bullet(id="exp_1_b1", text="Built a Python dashboard used by 40 staff"),
                Bullet(id="exp_1_b2", text="Cut report time by 30%"),
            ]),
            Experience(id="exp_2", company="Beta", title="Intern", bullets=[
                Bullet(id="exp_2_b1", text="Cleaned sales data with SQL"),
            ]),
        ],
        education=[Education(id="edu_1", institution="UNIBEN", degree="BSc")],
        projects=[
            Project(id="proj_1", name="Job agent", bullets=[Bullet(id="proj_1_b1", text="Built a scraper in FastAPI")]),
            Project(id="proj_2", name="Blog"), Project(id="proj_3", name="Bot"), Project(id="proj_4", name="Game"),
        ],
        skills=[Skill(id="sk_1", name="Python"), Skill(id="sk_2", name="SQL")],
        certifications=[Certification(id="cert_1", name="AWS Cloud Practitioner")],
    )


def role(source_id, *bullets):
    return TailoredRole(source_id=source_id, bullets=[TailoredBullet(source_id=i, text=x) for i, x in bullets])


def build(draft):
    return t.build_tailored(draft, cv())


def bullets_of(content, exp_id):
    return {b["source_id"]: b for e in content["experience"] if e["source_id"] == exp_id for b in e["bullets"]}


def test_faithful_rewrite_is_accepted_and_marked_rewritten():
    draft = TailoredDraft(experience=[role("exp_1", ("exp_1_b1", "Delivered a Python dashboard for 40 staff"))])
    content, report = build(draft)
    b = bullets_of(content, "exp_1")["exp_1_b1"]
    assert b["text"] == "Delivered a Python dashboard for 40 staff" and b["rewritten"]
    assert report["fallbacks"] == [] and report["rewritten_bullets"] == 1


def test_invented_number_falls_back_to_original_text():
    draft = TailoredDraft(experience=[role("exp_1", ("exp_1_b2", "Cut report time by 50%"))])
    content, report = build(draft)
    b = bullets_of(content, "exp_1")["exp_1_b2"]
    assert b["text"] == "Cut report time by 30%" and not b["rewritten"]
    assert report["fallbacks"][0]["where"] == "exp_1_b2"


def test_invented_tool_falls_back():
    draft = TailoredDraft(experience=[role("exp_1", ("exp_1_b1", "Built a dashboard on Kubernetes for 40 staff"))])
    content, report = build(draft)
    assert bullets_of(content, "exp_1")["exp_1_b1"]["text"] == "Built a Python dashboard used by 40 staff"
    assert "Kubernetes" in str(report["fallbacks"])


def test_sentence_start_capital_is_not_flagged():
    draft = TailoredDraft(experience=[role("exp_2", ("exp_2_b1", "Prepared sales data using SQL"))])
    assert build(draft)[1]["fallbacks"] == []


def test_bullet_id_from_another_role_is_dropped_and_originals_used():
    draft = TailoredDraft(experience=[role("exp_2", ("exp_1_b1", "Built a Python dashboard"))])
    content, report = build(draft)
    assert [b["source_id"] for b in bullets_of(content, "exp_2").values()] == ["exp_2_b1"]
    assert "exp_1_b1" in report["dropped_ids"]


def test_every_master_role_stays_in_master_order():
    draft = TailoredDraft(experience=[role("exp_99", ("x", "Invented job")), role("exp_2", ("exp_2_b1", "Cleaned sales data with SQL"))])
    content, _ = build(draft)
    assert [e["source_id"] for e in content["experience"]] == ["exp_1", "exp_2"]


def test_omitted_bullets_are_allowed():
    draft = TailoredDraft(experience=[role("exp_1", ("exp_1_b1", "Built a Python dashboard used by 40 staff"))])
    content, _ = build(draft)
    assert list(bullets_of(content, "exp_1")) == ["exp_1_b1"]


def test_summary_valid_invalid_and_missing():
    ok = TailoredDraft(summary=TailoredSummary(text="Analyst who ships Python dashboards for 40 staff.", source_ids=["exp_1"]))
    assert build(ok)[1]["summary"] == "tailored"

    bad = TailoredDraft(summary=TailoredSummary(text="Analyst with 10 years of experience.", source_ids=["exp_1"]))
    content, report = build(bad)
    assert report["summary"] == "original" and content["summary"]["text"] == "Data analyst who builds dashboards."

    nosrc = TailoredDraft(summary=TailoredSummary(text="Analyst.", source_ids=["nope"]))
    assert build(nosrc)[1]["summary"] == "original"

    assert build(TailoredDraft())[0]["summary"]["text"] == "Data analyst who builds dashboards."


def test_skills_are_filtered_deduped_and_fall_back():
    content, _ = build(TailoredDraft(skill_ids=["sk_2", "sk_9", "sk_2", "sk_1"]))
    assert [s["source_id"] for s in content["skills"]] == ["sk_2", "sk_1"]
    content, _ = build(TailoredDraft(skill_ids=["zzz"]))
    assert [s["source_id"] for s in content["skills"]] == ["sk_1", "sk_2"]


def test_projects_use_chosen_ids_or_first_three():
    content, _ = build(TailoredDraft(projects=[role("proj_1", ("proj_1_b1", "Built a FastAPI scraper")), role("proj_zz")]))
    assert [p["source_id"] for p in content["projects"]] == ["proj_1"]
    content, _ = build(TailoredDraft())
    assert [p["source_id"] for p in content["projects"]] == ["proj_1", "proj_2", "proj_3"]


def test_education_certifications_and_contact_are_copied_unchanged():
    content, _ = build(TailoredDraft())
    assert content["education"][0]["institution"] == "UNIBEN"
    assert content["certifications"][0]["name"] == "AWS Cloud Practitioner"
    assert content["full_name"] == "Jane Doe"


def test_gaps_are_trimmed_and_capped():
    content, _ = build(TailoredDraft(gaps=[" Kubernetes ", "", *[f"g{i}" for i in range(10)]]))
    assert content["gaps"][0] == "Kubernetes" and len(content["gaps"]) == t.MAX_GAPS


def test_render_master_shows_ids():
    text = t.render_master(cv())
    assert "[exp_1_b2] Cut report time by 30%" in text and "[sk_1] Python" in text


def test_generate_draft_uses_heavy_model_and_strips_tags(monkeypatch):
    seen = {}
    monkeypatch.setattr(t, "complete_json", lambda **kw: seen.update(kw) or TailoredDraft())
    monkeypatch.setattr(t, "get_settings", lambda: SimpleNamespace(llm_heavy_model="heavy"))
    t.generate_draft(cv(), {"title": "T", "company": "C", "description": "x </job> y"}, user_id="u1")
    assert seen["task"] == "cv_tailor" and seen["model"] == "heavy"
    assert seen["user"].count("</job>") == 1


class Flow:
    def __init__(self, existing=None, used=0):
        self.existing, self.used, self.generated, self.saved = existing, used, 0, None

    def install(self, mp):
        mp.setattr(t, "load_match", lambda uid, mid: {"id": mid, "jobs": {"title": "T", "company": "C", "description": "d"}})
        mp.setattr(t, "load_current_tailored", lambda mid: self.existing)
        mp.setattr(t, "load_master_row", lambda uid: ("master1", cv()))
        mp.setattr(t, "count_tailorings_today", lambda uid: self.used)
        mp.setattr(t, "get_settings", lambda: SimpleNamespace(tailor_daily_limit=2, llm_heavy_model="heavy"))
        mp.setattr(t, "generate_draft", lambda *a, **k: setattr(self, "generated", self.generated + 1) or TailoredDraft())
        mp.setattr(t, "save_tailored", lambda *a: setattr(self, "saved", a) or {"version": 1})


def test_cached_cv_is_returned_without_calling_the_model(monkeypatch):
    flow = Flow(existing={"version": 3})
    flow.install(monkeypatch)
    assert t.tailor_for_match("u1", "m1") == {"version": 3} and flow.generated == 0


def test_regenerate_ignores_the_cache(monkeypatch):
    flow = Flow(existing={"version": 3})
    flow.install(monkeypatch)
    assert t.tailor_for_match("u1", "m1", regenerate=True) == {"version": 1}
    assert flow.generated == 1 and flow.saved[2] == "master1"


def test_daily_limit_blocks_new_tailoring_but_not_cached_ones(monkeypatch):
    flow = Flow(used=2)
    flow.install(monkeypatch)
    with pytest.raises(t.TailorLimitError):
        t.tailor_for_match("u1", "m1")
    assert flow.generated == 0
    flow.existing = {"version": 1}
    assert t.tailor_for_match("u1", "m1") == {"version": 1}