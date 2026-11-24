create table public.llm_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  task text not null,
  model text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index llm_usage_user_created_idx
  on public.llm_usage (user_id, created_at desc);

alter table public.llm_usage enable row level security;