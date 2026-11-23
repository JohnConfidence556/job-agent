create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    check (kind in ('ingest', 'user_search')),
  user_id uuid references public.profiles (id) on delete cascade,
  source text
    check (source in ('remotive', 'himalayas', 'weworkremotely', 'remoteok')),
  origin text not null default 'scheduled'
    check (origin in ('scheduled', 'manual')),
  run_date date not null,
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'partial', 'failed')),
  stats jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  check (
    (kind = 'user_search' and user_id is not null and source is null)
    or (kind = 'ingest' and user_id is null and source is not null)
  ),
  check (status = 'running' or finished_at is not null)
);

create unique index one_scheduled_search_per_user_per_day
  on public.agent_runs (user_id, run_date)
  where kind = 'user_search' and origin = 'scheduled' and status <> 'failed';

create index agent_runs_user_started_idx
  on public.agent_runs (user_id, started_at desc);

alter table public.agent_runs enable row level security;

create policy "Users can read own runs"
  on public.agent_runs for select
  to authenticated
  using ((select auth.uid()) = user_id);

alter table public.profiles drop column last_run_on;