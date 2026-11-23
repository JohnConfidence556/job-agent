create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  origin text not null default 'agent'
    check (origin in ('agent', 'manual')),
  fit_score integer check (fit_score between 0 and 100),
  fit_analysis jsonb not null default '{}'::jsonb,
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'applied', 'interviewing', 'closed', 'dismissed')),
  applied_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id),
  check (status not in ('applied', 'interviewing') or applied_at is not null)
);

create index matches_user_score_idx
  on public.matches (user_id, fit_score desc);

alter table public.matches enable row level security;

create policy "Users can read own matches"
  on public.matches for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can update own matches"
  on public.matches for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke update on public.matches from authenticated;
grant update (status, applied_at, notes) on public.matches to authenticated;

create policy "Users can read jobs they are matched to"
  on public.jobs for select
  to authenticated
  using (
    exists (
      select 1 from public.matches
      where matches.job_id = jobs.id
        and matches.user_id = (select auth.uid())
    )
  );