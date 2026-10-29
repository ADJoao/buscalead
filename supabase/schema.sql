-- BuscaLead — rode este arquivo inteiro no Supabase: SQL Editor > New query > Run.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  place_id text,
  stage text not null default 'novo',
  score int not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists leads_user_place on public.leads (user_id, place_id);
create index if not exists leads_user_stage on public.leads (user_id, stage);

create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  lead_name text,
  model text,
  input_tokens int,
  output_tokens int,
  web_searches int,
  cost_usd numeric(10, 4) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_date on public.ai_usage (user_id, created_at);

alter table public.leads enable row level security;
alter table public.user_settings enable row level security;
alter table public.ai_usage enable row level security;

drop policy if exists "leads do dono" on public.leads;
create policy "leads do dono" on public.leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "settings do dono" on public.user_settings;
create policy "settings do dono" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "uso de ia do dono" on public.ai_usage;
create policy "uso de ia do dono" on public.ai_usage
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
