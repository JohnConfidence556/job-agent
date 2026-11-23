from workers.sources.himalayas import parse_himalayas_job, parse_himalayas_jobs


def make_raw(**overrides):
    raw = {
        "title": " Senior Data Analyst ",
        "excerpt": "Short summary",
        "companyName": "Acme Ltd",
        "companySlug": "acme-ltd",
        "employmentType": "Full Time",
        "minSalary": None,
        "maxSalary": None,
        "salaryPeriod": "annual",
        "currency": "USD",
        "seniority": ["Senior"],
        "locationRestrictions": [],
        "timezoneRestrictions": [],
        "description": "<p>Analyse <b>data</b></p><ul><li>SQL</li></ul>",
        "pubDate": 1700000000,
        "applicationLink": "https://himalayas.app/companies/acme-ltd/jobs/senior-data-analyst",
        "guid": "https://himalayas.app/companies/acme-ltd/jobs/senior-data-analyst",
    }
    raw.update(overrides)
    return raw


def test_parses_core_fields():
    job = parse_himalayas_job(make_raw())

    assert job.source == "himalayas"
    assert job.title == "Senior Data Analyst"
    assert job.company == "Acme Ltd"
    assert job.source_job_id == job.apply_url == job.source_url
    assert job.remote is True
    assert job.employment_type == "full_time"
    assert "SQL" in job.description
    assert "<" not in job.description
    assert job.posted_at.isoformat() == "2023-11-14T22:13:20+00:00"


def test_regions_given_as_objects():
    regions = [
        {"alpha2": "NG", "name": "Nigeria", "slug": "nigeria"},
        {"alpha2": "GH", "name": "Ghana", "slug": "ghana"},
    ]
    job = parse_himalayas_job(make_raw(locationRestrictions=regions))
    assert job.eligible_regions == ["Nigeria", "Ghana"]
    assert job.location_text == "Nigeria, Ghana"


def test_regions_given_as_plain_strings():
    job = parse_himalayas_job(make_raw(locationRestrictions=["Argentina", "Austria"]))
    assert job.eligible_regions == ["Argentina", "Austria"]


def test_empty_restrictions_mean_worldwide():
    job = parse_himalayas_job(make_raw(locationRestrictions=[]))
    assert job.eligible_regions == ["Worldwide"]
    assert job.location_text == "Worldwide"


def test_annual_salary_fills_numbers_and_text():
    job = parse_himalayas_job(
        make_raw(minSalary=50000, maxSalary=70000, salaryPeriod="annual")
    )
    assert job.salary_min == 50000
    assert job.salary_max == 70000
    assert job.salary_currency == "USD"
    assert job.salary_period == "year"
    assert job.salary_text == "USD 50,000 - 70,000 (annual)"


def test_fortnightly_salary_keeps_only_text():
    job = parse_himalayas_job(
        make_raw(minSalary=1000, maxSalary=1500, salaryPeriod="fortnightly")
    )
    assert job.salary_min is None
    assert job.salary_period is None
    assert job.salary_text == "USD 1,000 - 1,500 (fortnightly)"


def test_no_salary_leaves_everything_empty():
    job = parse_himalayas_job(make_raw())
    assert job.salary_text is None
    assert job.salary_min is None
    assert job.salary_period is None


def test_job_without_description_is_skipped():
    jobs = parse_himalayas_jobs([make_raw(description="", excerpt="")])
    assert jobs == []


def test_malformed_job_is_skipped_not_fatal():
    jobs = parse_himalayas_jobs([make_raw(), {"title": "No link or company"}])
    assert len(jobs) == 1