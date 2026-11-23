create table public.master_cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  version integer not null default 1,
  is_current boolean not null default true,
  content jsonb not null default '{}'::jsonb,
  source_file_path text,
  created_at timestamptz not null default now(),
  unique (user_id, version)
);

create unique index one_current_cv_per_user
  on public.master_cvs (user_id)
  where is_current;

alter table public.master_cvs enable row level security;

create policy "Users can read own CVs"
  on public.master_cvs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add own CVs"
  on public.master_cvs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own CVs"
  on public.master_cvs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);