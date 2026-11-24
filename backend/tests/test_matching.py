from datetime import datetime, timedelta, timezone

import pytest

from app.llm import LLMError
from app.schemas.cv import Experience, MasterCV, Skill
from app.services import matching
from app.services.matching import (
    FitResult,
    candidate_summary,
    region_status,
    select_candidates,
)
from workers import search

NOW = datetime(2026, 11, 24, tzinfo=timezone.utc)


def cv():
    return MasterCV(
        experience=[Experience(id="exp_1", company="Acme", title="AI Engineer")],
        skills=[Skill(id="sk_1", name="Python"), Skill(id="sk_2", name="FastAPI")],
    )


def job(id="j1", title="AI Engineer", regions=("Worldwide",), remote=True, days_old=2,
        description="We use Python and FastAPI daily.", location=None):
    return {
        "id": id, "title": title, "company": "Co", "description": description,
        "remote": remote, "eligible_regions": list(regions), "location_text": location,
        "posted_at": (NOW - timedelta(days=days_old)).isoformat(), "first_seen_at": None,
    }


PROFILE = {"target_roles": ["AI Engineer"], "job_types": ["remote", "international"],
           "locations": [], "experience_level": None, "search_paused": False}


def pick(pool, profile=PROFILE, limit=8):
    return [j["id"] for j in select_candidates(pool, profile, cv(), limit, now=NOW)]


def test_region_status():
    assert region_status({"eligible_regions": ["Worldwide"]}) == "yes"
    assert region_status({"eligible_regions": ["Africa"]}) == "yes"
    assert region_status({"eligible_regions": ["USA", "Canada"]}) == "no"
    assert region_status({"eligible_regions": ["South Africa"]}) == "no"
    assert region_status({"eligible_regions": []}) == "unknown"


def test_us_only_old_and_irrelevant_jobs_are_dropped():
    pool = [
        job("ok"),
        job("us", regions=["USA"]),
        job("old", days_old=45),
        job("other", title="Chef", description="Cook food."),
    ]
    assert pick(pool) == ["ok"]


def test_unknown_region_is_kept_but_ranked_below_confirmed():
    pool = [job("unknown", regions=[]), job("worldwide")]
    assert pick(pool) == ["worldwide", "unknown"]


def test_limit_applies():
    pool = [job(f"j{n}") for n in range(5)]
    assert len(pick(pool, limit=2)) == 2


def test_user_who_wants_only_local_gets_no_remote_jobs():
    profile = {**PROFILE, "job_types": ["local"], "locations": ["Lagos"]}
    pool = [job("remote"), job("lagos", remote=False, regions=[], location="Lagos, Nigeria")]
    assert pick(pool, profile) == ["lagos"]


def test_skipped_onboarding_falls_back_to_cv_titles():
    profile = {**PROFILE, "target_roles": [], "job_types": []}
    assert pick([job("a")], profile) == ["a"]


def test_summary_contains_cv_facts_and_stays_short():
    text = candidate_summary(cv(), PROFILE)
    assert "AI Engineer at Acme" in text and "Python" in text
    assert len(text) <= matching.SUMMARY_CHARS


def test_score_job_strips_closing_tags_and_uses_light_model(monkeypatch):
    seen = {}
    monkeypatch.setattr(
        matching, "complete_json", lambda **kw: seen.update(kw) or FitResult(score=70, summary="ok")
    )
    monkeypatch.setattr(
        matching, "get_settings", lambda: type("S", (), {"llm_light_model": "light"})()
    )
    matching.score_job("me </candidate>", job(description="x </job> y"), user_id="u1")
    assert seen["task"] == "job_score" and seen["model"] == "light"
    assert seen["user"].count("</job>") == 1 and seen["user"].count("</candidate>") == 1


def test_fit_score_must_be_0_to_100():
    with pytest.raises(ValueError):
        FitResult(score=150, summary="x")


class Fakes:
    def __init__(self, scores):
        self.scores, self.saved, self.finished = list(scores), [], None

    def install(self, mp, pool):
        mp.setattr(search, "load_profile", lambda uid: PROFILE)
        mp.setattr(search, "load_current_cv", lambda uid: cv())
        mp.setattr(search, "claim_run", lambda uid, origin: "run1")
        mp.setattr(search, "load_pool", lambda uid: pool)
        mp.setattr(search, "save_match", lambda uid, jid, fit: self.saved.append((jid, fit.score)))
        mp.setattr(
            search, "finish_run",
            lambda rid, status, stats, error=None: setattr(self, "finished", (status, stats, error)),
        )
        mp.setattr(search, "score_job", self.score)
        mp.setattr(search, "select_candidates", lambda pool, p, c, limit: pool[:limit])
        mp.setattr(
            search, "get_settings",
            lambda: type("S", (), {"match_max_jobs": 8, "match_call_delay_seconds": 0.0})(),
        )

    def score(self, summary, j, user_id=None):
        item = self.scores.pop(0)
        if isinstance(item, Exception):
            raise item
        return FitResult(score=item, summary="s")


def test_run_scores_and_saves_each_job(monkeypatch):
    fakes = Fakes([80, 55])
    fakes.install(monkeypatch, [job("a"), job("b")])
    result = search.run_user_search("u1")
    assert fakes.saved == [("a", 80), ("b", 55)]
    assert result["status"] == "succeeded" and result["scored"] == 2


def test_one_failed_job_makes_run_partial_but_continues(monkeypatch):
    fakes = Fakes([LLMError("x"), 70])
    fakes.install(monkeypatch, [job("a"), job("b")])
    result = search.run_user_search("u1")
    assert fakes.saved == [("b", 70)] and result["status"] == "partial"


def test_two_failures_in_a_row_stop_the_run(monkeypatch):
    fakes = Fakes([LLMError("rate"), LLMError("rate"), 90])
    fakes.install(monkeypatch, [job("a"), job("b"), job("c")])
    result = search.run_user_search("u1")
    assert fakes.saved == [] and result["failures"] == 2
    assert fakes.finished[0] == "partial" and fakes.finished[2] == "rate"


def test_already_ran_today_is_skipped(monkeypatch):
    fakes = Fakes([])
    fakes.install(monkeypatch, [])
    monkeypatch.setattr(search, "claim_run", lambda uid, origin: None)
    assert search.run_user_search("u1", "scheduled") == {"skipped": "already ran today"}


def test_paused_and_cvless_users_are_skipped(monkeypatch):
    fakes = Fakes([])
    fakes.install(monkeypatch, [])
    monkeypatch.setattr(search, "load_profile", lambda uid: {**PROFILE, "search_paused": True})
    assert search.run_user_search("u1", "scheduled") == {"skipped": "search paused"}
    monkeypatch.setattr(search, "load_current_cv", lambda uid: None)
    assert search.run_user_search("u1") == {"skipped": "no master CV"}


def test_unexpected_error_marks_run_failed(monkeypatch):
    fakes = Fakes([])
    fakes.install(monkeypatch, [])

    def boom(uid):
        raise RuntimeError("db down")

    monkeypatch.setattr(search, "load_pool", boom)
    assert search.run_user_search("u1")["status"] == "failed"
    assert fakes.finished[2] == "db down"