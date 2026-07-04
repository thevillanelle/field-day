-- Field Day — Initial Schema
-- Run this against your Supabase project once to bootstrap all tables.

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────
create type vertical_type   as enum ('dating', 'school', 'friends', 'work');
create type vibe_type       as enum ('explorer', 'challenger', 'creator', 'wanderer');
create type game_type       as enum ('daily-puzzle', 'competitive', 'creative', 'collaborative', 'storytelling');
create type game_mode       as enum ('async', 'live');
create type match_status    as enum ('active', 'expired', 'completed');
create type event_status    as enum ('draft', 'open', 'matching', 'active', 'closed');
create type event_mode      as enum ('rolling', 'batch');
create type field_note_type as enum ('game_result', 'question_answer', 'message', 'live_invite');
create type session_status  as enum ('waiting', 'player1_done', 'player2_done', 'complete');
create type school_year     as enum ('freshman', 'sophomore', 'junior', 'senior', 'grad');
create type question_type   as enum ('text', 'choice', 'scale');
create type question_timing as enum ('pre-game', 'post-game');

-- ─── Users ───────────────────────────────────────────────────────────────────
create table users (
  id           uuid primary key default gen_random_uuid(),
  email        text unique not null,
  name         text not null,
  avatar_url   text,
  google_id    text unique not null,
  email_domain text not null,
  created_at   timestamptz not null default now()
);

-- ─── Profiles ────────────────────────────────────────────────────────────────
create table profiles (
  user_id      uuid primary key references users(id) on delete cascade,
  bio          text,
  age          int check (age >= 13),
  location     text,
  vibe_type    vibe_type,
  quiz_answers jsonb,
  skills       text[]   not null default '{}',
  interests    text[]   not null default '{}',
  hobbies      text[]   not null default '{}',
  is_public    boolean  not null default true,
  updated_at   timestamptz not null default now()
);

-- ─── Vertical enrollments ────────────────────────────────────────────────────
create table vertical_enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  vertical    vertical_type not null,
  intent      text,
  orientation text,
  enrolled_at timestamptz not null default now(),
  unique (user_id, vertical)
);

-- ─── School profiles ─────────────────────────────────────────────────────────
create table school_profiles (
  user_id     uuid primary key references users(id) on delete cascade,
  school_name text not null,
  major       text,
  year        school_year,
  campus      text,
  verified_at timestamptz not null default now()
);

-- ─── Events ──────────────────────────────────────────────────────────────────
create table events (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  vertical             vertical_type not null,
  status               event_status  not null default 'draft',
  mode                 event_mode    not null default 'rolling',
  registration_opens   timestamptz,
  registration_closes  timestamptz,
  match_drop_at        timestamptz,
  play_window_start    timestamptz,
  play_window_end      timestamptz,
  created_by           uuid references users(id),
  created_at           timestamptz not null default now()
);

-- ─── Registrations ───────────────────────────────────────────────────────────
create table registrations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  status        text not null default 'registered',
  registered_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- ─── Games ───────────────────────────────────────────────────────────────────
create table games (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text unique not null,
  name                  text not null,
  description           text not null,
  type                  game_type not null,
  duration_min          int not null,
  duration_max          int not null,
  is_native             boolean not null default false,
  external_url          text,
  compatible_verticals  vertical_type[] not null default '{}',
  vibe_tags             vibe_type[]     not null default '{}'
);

-- ─── Question decks ──────────────────────────────────────────────────────────
create table question_decks (
  id        uuid primary key default gen_random_uuid(),
  game_id   uuid not null references games(id) on delete cascade,
  vertical  vertical_type not null,
  questions jsonb not null default '[]',
  unique (game_id, vertical)
);

-- ─── Matches ─────────────────────────────────────────────────────────────────
create table matches (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid references events(id),
  player_1_id    uuid not null references users(id),
  player_2_id    uuid not null references users(id),
  vertical       vertical_type not null,
  suggested_game text not null,
  match_score    numeric(4,3) not null default 0,
  match_reason   jsonb not null default '{}',
  status         match_status not null default 'active',
  expires_at     timestamptz,
  created_at     timestamptz not null default now(),
  check (player_1_id <> player_2_id)
);

create index matches_player1_idx on matches(player_1_id);
create index matches_player2_idx on matches(player_2_id);

-- ─── Game sessions ───────────────────────────────────────────────────────────
create table game_sessions (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references matches(id) on delete cascade,
  game_slug    text not null,
  mode         game_mode      not null default 'async',
  status       session_status not null default 'waiting',
  result       jsonb,
  started_at   timestamptz not null default now(),
  completed_at timestamptz
);

-- ─── Play-again signals ──────────────────────────────────────────────────────
create table play_again_signals (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references matches(id) on delete cascade,
  from_user_id uuid not null references users(id),
  signaled_at  timestamptz not null default now(),
  unique (match_id, from_user_id)
);

-- ─── Field notes ─────────────────────────────────────────────────────────────
create table field_notes (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references matches(id) on delete cascade,
  from_user_id uuid not null references users(id),
  to_user_id   uuid not null references users(id),
  type         field_note_type not null,
  content      jsonb not null default '{}',
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

create index field_notes_match_idx on field_notes(match_id);
create index field_notes_to_user_idx on field_notes(to_user_id) where not is_read;

-- ─── Connections ─────────────────────────────────────────────────────────────
create table connections (
  id           uuid primary key default gen_random_uuid(),
  user_1_id    uuid not null references users(id),
  user_2_id    uuid not null references users(id),
  vertical     vertical_type not null,
  match_id     uuid references matches(id),
  connected_at timestamptz not null default now(),
  -- canonical order: user_1_id < user_2_id
  check (user_1_id < user_2_id),
  unique (user_1_id, user_2_id, vertical)
);

-- ─── Row Level Security ──────────────────────────────────────────────────────
-- Enable RLS on all tables (policies defined in 002_rls.sql)
alter table users              enable row level security;
alter table profiles           enable row level security;
alter table vertical_enrollments enable row level security;
alter table school_profiles    enable row level security;
alter table events             enable row level security;
alter table registrations      enable row level security;
alter table games              enable row level security;
alter table question_decks     enable row level security;
alter table matches            enable row level security;
alter table game_sessions      enable row level security;
alter table play_again_signals enable row level security;
alter table field_notes        enable row level security;
alter table connections        enable row level security;
