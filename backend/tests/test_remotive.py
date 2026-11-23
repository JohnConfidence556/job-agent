from workers.sources.remotive import parse_remotive_job, parse_remotive_jobs


def make_raw(**overrides):
    raw = {
        "id": 2091177,
        "url": "https://remotive.com/remote-jobs/data/data-analyst-2091177",
        "title": "  Data Analyst ",
        "company_name": "Acme Ltd",
        "category": "Data",
        "job_type": "full_time",
        "publication_date": "2026-11-20T10:23:26",
        "candidate_required_location": "USA, Canada",
        "salary": "$85k - $155k",
        "description": "<p>Analyse <b>data</b></p><ul><li>SQL</li></ul>",
    }
    raw.update(overrides)
    return raw


def test_parses_core_fields():
    job = parse_remotive_job(make_raw())

    assert job.source == "remotive"
    assert job.source_job_id == "2091177"
    assert job.title == "Data Analyst"
    assert job.company == "Acme Ltd"
    assert job.remote is True
    assert job.employment_type == "full_time"
    assert job.salary_text == "$85k - $155k"
    assert job.apply_url == job.source_url
    assert "SQL" in job.description
    assert "<" not in job.description


def test_splits_regions_into_a_list():
    job = parse_remotive_job(make_raw(candidate_required_location="USA, Canada"))
    assert job.eligible_regions == ["USA", "Canada"]


def test_worldwide_is_kept_as_a_region():
    job = parse_remotive_job(make_raw(candidate_required_location="Worldwide"))
    assert job.eligible_regions == ["Worldwide"]


def test_empty_optional_fields_become_none():
    job = parse_remotive_job(
        make_raw(salary="", job_type="", candidate_required_location="")
    )
    assert job.salary_text is None
    assert job.employment_type is None
    assert job.location_text is None
    assert job.eligible_regions == []


def test_date_without_timezone_is_treated_as_utc():
    job = parse_remotive_job(make_raw())
    assert job.posted_at.isoformat() == "2026-11-20T10:23:26+00:00"


def test_same_job_with_different_spelling_gets_same_hash():
    first = parse_remotive_job(make_raw(id=1))
    second = parse_remotive_job(
        make_raw(id=2, company_name="ACME  ltd", title="data analyst")
    )
    assert first.dedupe_hash == second.dedupe_hash


def test_malformed_job_is_skipped_not_fatal():
    raw_jobs = [make_raw(), {"id": 5}, make_raw(id=3, title="Other Role")]
    jobs = parse_remotive_jobs(raw_jobs)
    assert len(jobs) == 2