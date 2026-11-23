from workers.sources.remoteok import parse_remoteok_job, parse_remoteok_jobs


def make_raw(**overrides):
    raw = {
        "id": "123456",
        "slug": "senior-data-analyst-acme-123456",
        "epoch": 1700000000,
        "date": "2023-11-14T22:13:20+00:00",
        "company": "Acme Ltd",
        "position": " Senior Data Analyst ",
        "tags": ["data", "analyst"],
        "description": "<p>Analyse <b>data</b></p><ul><li>SQL</li></ul>",
        "location": "Worldwide",
        "salary_min": 0,
        "salary_max": 0,
        "url": "https://remoteok.com/remote-jobs/senior-data-analyst-acme-123456",
        "apply_url": "https://remoteok.com/remote-jobs/l/123456",
    }
    raw.update(overrides)
    return raw


def test_parses_core_fields():
    job = parse_remoteok_job(make_raw())

    assert job.source == "remoteok"
    assert job.source_job_id == "123456"
    assert job.title == "Senior Data Analyst"
    assert job.company == "Acme Ltd"
    assert job.remote is True
    assert job.source_url.endswith("acme-123456")
    assert job.apply_url.endswith("/l/123456")
    assert "SQL" in job.description
    assert "<" not in job.description
    assert job.posted_at.isoformat() == "2023-11-14T22:13:20+00:00"


def test_location_is_split_into_regions():
    job = parse_remoteok_job(make_raw(location="North America, Europe"))
    assert job.eligible_regions == ["North America", "Europe"]


def test_empty_location_stays_unknown():
    job = parse_remoteok_job(make_raw(location=""))
    assert job.location_text is None
    assert job.eligible_regions == []


def test_zero_salary_means_not_published():
    job = parse_remoteok_job(make_raw(salary_min=0, salary_max=0))
    assert job.salary_min is None
    assert job.salary_text is None


def test_salary_range_is_stored_as_annual_usd():
    job = parse_remoteok_job(make_raw(salary_min=50000, salary_max=70000))
    assert job.salary_min == 50000
    assert job.salary_max == 70000
    assert job.salary_currency == "USD"
    assert job.salary_period == "year"
    assert job.salary_text == "USD 50,000 - 70,000 (annual)"


def test_only_one_end_of_salary_range():
    job = parse_remoteok_job(make_raw(salary_min=50000, salary_max=0))
    assert job.salary_min == 50000
    assert job.salary_max is None
    assert job.salary_text == "USD 50,000 (annual)"


def test_missing_apply_url_falls_back_to_job_page():
    raw = make_raw()
    del raw["apply_url"]
    job = parse_remoteok_job(raw)
    assert job.apply_url == job.source_url


def test_job_without_description_is_skipped():
    assert parse_remoteok_jobs([make_raw(description="")]) == []


def test_legal_notice_item_is_skipped_not_fatal():
    jobs = parse_remoteok_jobs([{"legal": "terms of use"}, make_raw()])
    assert len(jobs) == 1


def test_garbled_text_is_repaired():
    job = parse_remoteok_job(
        make_raw(
            company="IntermarchÃ©",
            description="<p>Based in SÃ£o Paulo</p>",
        )
    )
    assert job.company == "Intermarché"
    assert "São Paulo" in job.description