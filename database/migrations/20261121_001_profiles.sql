create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  target_roles text[] not null default '{}',
  job_types text[] not null default '{}'
    check (job_types <@ array['local', 'remote', 'international']),
  locations text[] not null default '{}',
  experience_level text,
  salary_min integer,
  salary_currency text not null default 'NGN',
  run_time time not null default '18:00',
  timezone text not null default 'Africa/Lagos',
  search_paused boolean not null default false,
  last_run_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);