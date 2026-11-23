create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  master_cv_id uuid not null references public.master_cvs (id) on delete cascade,
  mode text not null default 'voice'
    check (mode in ('voice', 'text')),
  status text not null default 'created'
    check (status in ('created', 'in_progress', 'completed', 'abandoned', 'failed')),
  livekit_room text unique,
  plan jsonb not null default '{}'::jsonb,
  transcript jsonb not null default '[]'::jsonb,
  feedback jsonb not null default '{}'::jsonb,
  overall_score integer check (overall_score between 0 and 100),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds >= 0),
  model text,
  prompt_version text,
  created_at timestamptz not null default now(),
  check (status <> 'completed' or ended_at is not null)
);

create index interviews_user_created_idx
  on public.interviews (user_id, created_at desc);

alter table public.interviews enable row level security;

create policy "Users can read own interviews"
  on public.interviews for select
  to authenticated
  using ((select auth.uid()) = user_id);