create table public.tailored_cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  master_cv_id uuid not null references public.master_cvs (id) on delete cascade,
  version integer not null default 1,
  is_current boolean not null default true,
  content jsonb not null default '{}'::jsonb,
  validation_status text not null default 'pending'
    check (validation_status in ('pending', 'passed', 'failed')),
  validation_report jsonb not null default '{}'::jsonb,
  file_path text,
  model text,
  prompt_version text,
  created_at timestamptz not null default now(),
  unique (match_id, version)
);

create unique index one_current_tailored_cv_per_match
  on public.tailored_cvs (match_id)
  where is_current;

create index tailored_cvs_user_idx
  on public.tailored_cvs (user_id);

alter table public.tailored_cvs enable row level security;

create policy "Users can read own validated tailored CVs"
  on public.tailored_cvs for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and validation_status = 'passed'
  );