from workers.sources.remotive import fetch_remotive, parse_remotive_jobs

raw_jobs = fetch_remotive(search="python", limit=10)
jobs = parse_remotive_jobs(raw_jobs)

print(f"Fetched {len(raw_jobs)}, parsed {len(jobs)}")
for job in jobs[:3]:
    print("-", job.title, "|", job.company)
    print("  regions:", job.eligible_regions, "| salary:", job.salary_text)
    print("  link:", job.apply_url)