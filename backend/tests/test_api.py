from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient

from app import auth
from app.llm import LLMError
from app.routers import jobs as jobs_router
from app.routers import me as me_router
from app.routers import search as search_router
from app.schemas.api import PreferencesUpdate
from app.services import cv_storage, runs
from app.services import jobs as jobs_service
from app.services.tailoring import NotFoundError, TailorLimitError

USER = "user-1"


class FakeQuery:
    """Records every call so tests can check that queries are scoped to the user."""

    def __init__(self, data=None, count=None):
        self.data, self.count, self.calls = data if data is not None else [], count, []

    def __getattr__(self, name):
        def method(*args, **kwargs):
            self.calls.append((name, args, kwargs))
            return self
        return method

    def execute(self):
        return SimpleNamespace(data=self.data, count=self.count)

    def has(self, name, *args):
        return any(call[0] == name and call[1] == args for call in self.calls)


class FakeClient:
    def __init__(self, data=None, count=None):
        self.query = FakeQuery(data, count)
        self.storage_calls = []
        self.storage = SimpleNamespace(from_=self._bucket)

    def table(self, name):
        self.query.calls.append(("table", (name,), {}))
        return self.query

    def _bucket(self, name):
        def upload(path, data, options):
            self.storage_calls.append((name, path, options))
        return SimpleNamespace(upload=upload)


def app_with(*routers):
    app = FastAPI()
    for router in routers:
        app.include_router(router)
    app.dependency_overrides[auth.current_user_id] = lambda: USER
    return app


# ---------- auth ----------

def test_auth_rejects_missing_and_malformed_headers():
    app = FastAPI()
    app.include_router(me_router.router)
    client = TestClient(app)
    assert client.get("/me").status_code == 401
    assert client.get("/me", headers={"Authorization": "Token abc"}).status_code == 401
    assert client.get("/me", headers={"Authorization": "Bearer "}).status_code == 401


def test_auth_accepts_valid_token_and_rejects_invalid(monkeypatch):
    class Auth:
        def get_user(self, token):
            if token != "good":
                raise RuntimeError("bad token")
            return SimpleNamespace(user=SimpleNamespace(id="abc-123"))

    monkeypatch.setattr(auth, "get_supabase", lambda: SimpleNamespace(auth=Auth()))

    def creds(token):
        return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    assert auth.current_user_id(creds("good")) == "abc-123"
    with pytest.raises(Exception) as err:
        auth.current_user_id(creds("nope"))
    assert err.value.status_code == 401


# ---------- preferences validation ----------

def test_preferences_validation():
    ok = PreferencesUpdate(target_roles=[" AI Engineer ", ""], job_types=["remote"], run_time="18:00",
                           timezone="Africa/Lagos", salary_currency="ngn")
    assert ok.target_roles == ["AI Engineer"] and ok.salary_currency == "NGN"
    for bad in ({"job_types": ["moon"]}, {"run_time": "25:99"}, {"timezone": "Mars/Base"},
                {"salary_min": -5}, {"target_roles": ["x"] * 11}):
        with pytest.raises(ValueError):
            PreferencesUpdate(**bad)


def test_update_profile_only_sends_fields_the_client_set(monkeypatch):
    client_db = FakeClient(data=[{"id": USER, "run_time": "19:00"}])
    monkeypatch.setattr(me_router, "get_supabase", lambda: client_db)
    client = TestClient(app_with(me_router.router))
    response = client.patch("/me", json={"run_time": "19:00"})
    assert response.status_code == 200
    update_call = next(c for c in client_db.query.calls if c[0] == "update")
    assert update_call[1] == ({"run_time": "19:00"},)
    assert client_db.query.has("eq", "id", USER)


# ---------- CV upload ----------

def upload(client, name="cv.pdf", content=b"x" * 10):
    return client.post("/me/cv", files={"file": (name, content, "application/pdf")})


def patch_upload(monkeypatch, used=0):
    saved = {}
    monkeypatch.setattr(me_router, "count_today", lambda uid, task: used)
    monkeypatch.setattr(me_router, "extract_cv_text", lambda data, name: "cv text")
    monkeypatch.setattr(me_router, "parse_cv_text", lambda text, user_id=None: {"parsed": True})
    monkeypatch.setattr(me_router, "store_cv_file", lambda uid, data, name: "u/uploads/a.pdf")
    monkeypatch.setattr(
        me_router, "save_master_cv",
        lambda uid, cv, path=None: saved.update(uid=uid, path=path) or {"version": 2},
    )
    return saved


def test_cv_upload_happy_path(monkeypatch):
    saved = patch_upload(monkeypatch)
    response = upload(TestClient(app_with(me_router.router)))
    assert response.status_code == 200 and response.json()["version"] == 2
    assert saved == {"uid": USER, "path": "u/uploads/a.pdf"}


def test_cv_upload_limits_and_errors(monkeypatch):
    client = TestClient(app_with(me_router.router))

    patch_upload(monkeypatch, used=5)
    assert upload(client).status_code == 429

    patch_upload(monkeypatch)
    monkeypatch.setattr(me_router, "MAX_UPLOAD_BYTES", 5)
    assert upload(client, content=b"123456").status_code == 413
    monkeypatch.setattr(me_router, "MAX_UPLOAD_BYTES", 5 * 1024 * 1024)

    def unreadable(data, name):
        raise ValueError("Unsupported file type.")
    monkeypatch.setattr(me_router, "extract_cv_text", unreadable)
    assert upload(client, "cv.txt").status_code == 422

    patch_upload(monkeypatch)

    def busy(text, user_id=None):
        raise LLMError("rate limited")
    monkeypatch.setattr(me_router, "parse_cv_text", busy)
    assert upload(client).status_code == 503


def test_store_cv_file_uses_user_folder_and_rejects_other_types(monkeypatch):
    fake = FakeClient()
    monkeypatch.setattr(cv_storage, "get_supabase", lambda: fake)
    path = cv_storage.store_cv_file("u1", b"data", "My CV.PDF")
    assert path.startswith("u1/uploads/") and path.endswith(".pdf")
    assert fake.storage_calls[0][0] == "cvs"
    assert cv_storage.store_cv_file("u1", b"data", "evil.exe") is None


def test_store_cv_file_failure_returns_none(monkeypatch):
    class Boom:
        storage = SimpleNamespace(from_=lambda b: SimpleNamespace(upload=lambda *a: 1 / 0))
    monkeypatch.setattr(cv_storage, "get_supabase", lambda: Boom())
    assert cv_storage.store_cv_file("u1", b"d", "cv.pdf") is None


# ---------- jobs service: every query is scoped to the user ----------

def test_list_matches_is_scoped_and_hides_dismissed_by_default(monkeypatch):
    fake = FakeClient(data=[{"id": "m1"}])
    monkeypatch.setattr(jobs_service, "get_supabase", lambda: fake)
    jobs_service.list_matches(USER, min_score=50)
    q = fake.query
    assert q.has("eq", "user_id", USER) and q.has("gte", "fit_score", 50)
    assert q.has("neq", "status", "dismissed")


def test_list_matches_status_filter_replaces_dismissed_filter(monkeypatch):
    fake = FakeClient()
    monkeypatch.setattr(jobs_service, "get_supabase", lambda: fake)
    jobs_service.list_matches(USER, status="applied")
    assert fake.query.has("eq", "status", "applied") and not fake.query.has("neq", "status", "dismissed")


def test_match_detail_is_scoped_and_404s_for_other_users(monkeypatch):
    fake = FakeClient(data=[])
    monkeypatch.setattr(jobs_service, "get_supabase", lambda: fake)
    with pytest.raises(NotFoundError):
        jobs_service.get_match_detail(USER, "m1")
    assert fake.query.has("eq", "user_id", USER) and fake.query.has("eq", "id", "m1")


def test_marking_applied_sets_applied_at_once(monkeypatch):
    fake = FakeClient(data=[{"id": "m1", "applied_at": None}])
    monkeypatch.setattr(jobs_service, "get_supabase", lambda: fake)
    jobs_service.update_match(USER, "m1", {"status": "applied"})
    update = next(c for c in fake.query.calls if c[0] == "update")[1][0]
    assert update["status"] == "applied" and update["applied_at"]

    fake = FakeClient(data=[{"id": "m1", "applied_at": "2026-11-01T00:00:00+00:00"}])
    monkeypatch.setattr(jobs_service, "get_supabase", lambda: fake)
    jobs_service.update_match(USER, "m1", {"status": "interviewing"})
    update = next(c for c in fake.query.calls if c[0] == "update")[1][0]
    assert "applied_at" not in update


def test_update_of_someone_elses_match_is_404(monkeypatch):
    monkeypatch.setattr(jobs_service, "get_supabase", lambda: FakeClient(data=[]))
    with pytest.raises(NotFoundError):
        jobs_service.update_match(USER, "m1", {"notes": "x"})


def test_home_summary_counts(monkeypatch):
    class Multi(FakeClient):
        def table(self, name):
            self.query = FakeQuery(
                [{"status": "new", "fit_score": 80}, {"status": "new", "fit_score": 40},
                 {"status": "applied", "fit_score": 90}] if name == "matches" else [{"id": "cv"}]
            )
            return self.query
    monkeypatch.setattr(jobs_service, "get_supabase", lambda: Multi())
    summary = jobs_service.home_summary(USER)
    assert summary == {"counts": {"new": 2, "applied": 1}, "new_strong_matches": 1, "has_cv": True}


# ---------- jobs routes ----------

def test_tailor_route_maps_errors(monkeypatch):
    client = TestClient(app_with(jobs_router.router))
    cases = [(NotFoundError("nope"), 404), (TailorLimitError("cap"), 429), (LLMError("busy"), 503)]
    for error, code in cases:
        def fail(uid, mid, regenerate, error=error):
            raise error
        monkeypatch.setattr(jobs_router, "tailor_for_match", fail)
        assert client.post("/jobs/m1/tailor").status_code == code

    monkeypatch.setattr(jobs_router, "tailor_for_match", lambda uid, mid, regenerate: {"uid": uid, "regen": regenerate})
    assert client.post("/jobs/m1/tailor?regenerate=true").json() == {"uid": USER, "regen": True}


def test_job_routes_validate_input(monkeypatch):
    client = TestClient(app_with(jobs_router.router))
    monkeypatch.setattr(jobs_router.jobs_service, "list_matches", lambda *a: [])
    assert client.get("/jobs?min_score=500").status_code == 422
    assert client.get("/jobs?status=bogus").status_code == 422
    assert client.get("/jobs?limit=0").status_code == 422
    assert client.patch("/jobs/m1", json={"status": "hired"}).status_code == 422
    assert client.get("/jobs").status_code == 200


# ---------- search routes ----------

def test_search_run_checks_running_and_daily_limit(monkeypatch):
    started = []
    monkeypatch.setattr(search_router, "run_user_search", lambda uid, origin: started.append((uid, origin)))
    client = TestClient(app_with(search_router.router))

    monkeypatch.setattr(search_router, "has_running_search", lambda uid: True)
    assert client.post("/search/run").status_code == 409

    monkeypatch.setattr(search_router, "has_running_search", lambda uid: False)
    monkeypatch.setattr(search_router, "manual_searches_today", lambda uid: 3)
    assert client.post("/search/run").status_code == 429
    assert started == []

    monkeypatch.setattr(search_router, "manual_searches_today", lambda uid: 0)
    response = client.post("/search/run")
    assert response.status_code == 202 and started == [(USER, "manual")]


def test_latest_run_when_none(monkeypatch):
    monkeypatch.setattr(search_router, "latest_run", lambda uid: None)
    assert TestClient(app_with(search_router.router)).get("/search/latest").json() == {"status": "never"}


def test_run_queries_are_scoped_to_the_user(monkeypatch):
    fake = FakeClient(data=[], count=0)
    monkeypatch.setattr(runs, "get_supabase", lambda: fake)
    runs.latest_run(USER)
    runs.has_running_search(USER)
    runs.manual_searches_today(USER)
    assert fake.query.calls.count(("eq", ("user_id", USER), {})) == 3