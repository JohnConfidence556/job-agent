from collections import Counter
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from workers import scheduler, search

NOW = datetime(2026, 11, 25, 17, 30, tzinfo=timezone.utc)  # 18:30 in Lagos


def profile(id="u1", run_time="18:00:00", tz="Africa/Lagos", paused=False):
    return {"id": id, "run_time": run_time, "timezone": tz, "search_paused": paused}


def due(profiles, with_cv=("u1", "u2", "u3"), done=(), failures=None, now=NOW):
    return scheduler.due_users(now, profiles, set(with_cv), set(done), failures or Counter())


def test_user_is_due_only_after_their_run_time():
    assert due([profile()]) == [("u1", "2026-11-25")]
    assert due([profile(run_time="19:00:00")]) == []
    assert due([profile(run_time="18:30")]) == [("u1", "2026-11-25")]


def test_timezone_decides_when_the_user_is_due_and_which_date_it_is():
    new_york = profile("u2", tz="America/New_York")  # 12:30 local
    auckland = profile("u3", run_time="06:00:00", tz="Pacific/Auckland")  # 06:30 on the 26th
    assert due([new_york, auckland]) == [("u3", "2026-11-26")]


def test_paused_users_and_users_without_a_cv_are_skipped():
    assert due([profile(paused=True)]) == []
    assert due([profile()], with_cv=()) == []


def test_users_who_already_ran_today_are_skipped_but_not_other_days():
    assert due([profile()], done={("u1", "2026-11-25")}) == []
    assert due([profile()], done={("u1", "2026-11-24")}) == [("u1", "2026-11-25")]


def test_failed_attempts_are_retried_twice_then_left_alone():
    assert due([profile()], failures=Counter({("u1", "2026-11-25"): 1})) == [("u1", "2026-11-25")]
    assert due([profile()], failures=Counter({("u1", "2026-11-25"): 2})) == []


def test_earliest_run_time_goes_first():
    profiles = [profile("u1", "18:20:00"), profile("u2", "18:00:00")]
    assert [u for u, _ in due(profiles)] == ["u2", "u1"]


def test_bad_timezone_falls_back_to_lagos():
    assert due([profile(tz="Mars/Base")]) == [("u1", "2026-11-25")]


def test_ingest_slots_and_catch_up():
    noon = datetime(2026, 11, 25, 12, 40, tzinfo=timezone.utc)  # latest slot 11:00
    assert scheduler.ingest_due(noon, None)
    assert not scheduler.ingest_due(noon, noon.replace(hour=11, minute=5))
    assert scheduler.ingest_due(noon, noon.replace(hour=10, minute=59))

    early = datetime(2026, 11, 25, 3, 0, tzinfo=timezone.utc)  # latest slot: yesterday 16:00
    yesterday = early - timedelta(days=1)
    assert not scheduler.ingest_due(early, yesterday.replace(hour=16, minute=10))
    assert scheduler.ingest_due(early, yesterday.replace(hour=12))


class TickFakes:
    def __init__(self, profiles, ingest_is_due=False, crash_for=()):
        self.ingested, self.searched, self.profiles = 0, [], profiles
        self.ingest_is_due, self.crash_for = ingest_is_due, crash_for

    def install(self, mp):
        mp.setattr(scheduler, "last_ingest_started", lambda: None)
        mp.setattr(scheduler, "ingest_due", lambda now, last: self.ingest_is_due)
        mp.setattr(scheduler, "run_ingest", lambda sel: setattr(self, "ingested", self.ingested + 1))
        ids = {p["id"] for p in self.profiles}
        mp.setattr(scheduler, "load_state", lambda now: (self.profiles, ids, set(), Counter()))

        def fake_search(user_id, origin, run_date):
            if user_id in self.crash_for:
                raise RuntimeError("boom")
            self.searched.append((user_id, origin, run_date))
        mp.setattr(scheduler, "run_user_search", fake_search)


def test_tick_runs_ingest_only_when_due_and_searches_due_users(monkeypatch):
    fakes = TickFakes([profile("u1"), profile("u2", run_time="23:00:00")], ingest_is_due=True)
    fakes.install(monkeypatch)
    result = scheduler.tick(NOW)
    assert fakes.ingested == 1 and fakes.searched == [("u1", "scheduled", "2026-11-25")]
    assert result == {"ingested": True, "searched": 1, "errors": 0}

    fakes.ingest_is_due = False
    scheduler.tick(NOW)
    assert fakes.ingested == 1


def test_tick_caps_users_and_survives_a_crashing_user(monkeypatch):
    profiles = [profile(f"u{n}", run_time=f"18:0{n}:00") for n in range(7)]
    fakes = TickFakes(profiles, crash_for={"u0"})
    fakes.install(monkeypatch)
    result = scheduler.tick(NOW)
    assert result["errors"] == 1 and result["searched"] == scheduler.MAX_USERS_PER_TICK - 1
    assert len(fakes.searched) == scheduler.MAX_USERS_PER_TICK - 1


def test_claim_run_uses_the_given_local_date(monkeypatch):
    sent = {}

    class Table:
        def insert(self, payload):
            sent.update(payload)
            return self

        def execute(self):
            return SimpleNamespace(data=[{"id": "run1"}])

    monkeypatch.setattr(search, "get_supabase", lambda: SimpleNamespace(table=lambda name: Table()))
    assert search.claim_run("u1", "scheduled", "2026-11-26") == "run1"
    assert sent["run_date"] == "2026-11-26" and sent["origin"] == "scheduled"