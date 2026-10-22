-- Liftoff database. Paste this whole file into Supabase > SQL Editor and click Run.
-- Row level security is on with no policies, so only the server (service role key) can read or write.

create table if not exists players (
  id uuid primary key,
  token_hash text not null,
  name text not null default '',
  best int not null default 0,
  total int not null default 0,
  runs int not null default 0,
  jackpots int not null default 0,
  best_pick int not null default 0,
  best_combo int not null default 0,
  badges text[] not null default '{}',
  recent jsonb not null default '[]',
  daily_date date,
  daily_score int,
  daily_rounds int,
  daily_grid text,
  daily_streak int not null default 0,
  last_daily date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists players_best_idx on players (best desc);
create index if not exists players_total_idx on players (total desc);
create index if not exists players_daily_idx on players (daily_date, daily_score desc);

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  mode text not null check (mode in ('daily', 'unlimited')),
  daily_date date,
  score int not null default 0,
  lives int not null default 3,
  rounds int not null default 0,
  combo int not null default 0,
  max_combo int not null default 0,
  clean int not null default 0,
  jackpots int not null default 0,
  best_pick int not null default 0,
  issued jsonb not null default '[]',
  answered jsonb not null default '[]',
  log jsonb not null default '[]',
  finished boolean not null default false,
  created_at timestamptz not null default now()
);
-- One Daily Flight per pilot per day.
create unique index if not exists runs_one_daily on runs (player_id, daily_date) where mode = 'daily';
create index if not exists runs_player_created_idx on runs (player_id, created_at desc);

create table if not exists daily (
  day date primary key,
  prompts jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists answer_lists (
  prompt_key text primary key,
  prompt text not null,
  list jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists usage (
  day date not null,
  key text not null,
  calls int not null default 0,
  primary key (day, key)
);

-- Counts AI calls and requests per day, atomically.
create or replace function bump_usage(p_day date, p_key text) returns int
language sql as $$
  insert into usage (day, key, calls) values (p_day, p_key, 1)
  on conflict (day, key) do update set calls = usage.calls + 1
  returning calls;
$$;

alter table players enable row level security;
alter table runs enable row level security;
alter table daily enable row level security;
alter table answer_lists enable row level security;
alter table usage enable row level security;
