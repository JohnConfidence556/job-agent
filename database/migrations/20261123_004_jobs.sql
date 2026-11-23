create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null
    check (source in ('remotive', 'himalayas', 'weworkremotely', 'remoteok', 'manual')),
  source_job_id text,
  title text not null,
  company text not null,
  description text not null,
  source_url text not null,
  apply_url text not null,
  location_text text,
  remote boolean not null default false,
  eligible_regions text[] not null default '{}',
  employment_type text,
  salary_min integer,
  salary_max integer,
  salary_currency text,
  salary_period text
    check (salary_period in ('hour', 'day', 'week', 'month', 'year')),
  salary_text text,
  posted_at timestamptz,
  dedupe_hash text not null unique,
  is_active boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index jobs_posted_at_idx on public.jobs (posted_at desc);

alter table public.jobs enable row level security;