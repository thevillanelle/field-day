-- Field Day — Trust & Safety schema
--
-- Same access pattern as 002_rls.sql: no anon-role policies here. Reports
-- and blocks are written and read exclusively through server actions using
-- the service-role client, authorized against the NextAuth session.

-- ─── Reports ─────────────────────────────────────────────────────────────
create table reports (
  id                uuid primary key default gen_random_uuid(),
  reporter_id       uuid not null references users(id),
  reported_user_id  uuid not null references users(id),
  match_id          uuid references matches(id),
  reason            text not null,
  details           text,
  status            text not null default 'open',
  created_at        timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);

create index reports_reported_user_idx on reports(reported_user_id);
alter table reports enable row level security;

-- ─── Blocks ──────────────────────────────────────────────────────────────
create table blocks (
  id          uuid primary key default gen_random_uuid(),
  blocker_id  uuid not null references users(id),
  blocked_id  uuid not null references users(id),
  created_at  timestamptz not null default now(),
  check (blocker_id <> blocked_id),
  unique (blocker_id, blocked_id)
);

create index blocks_blocker_idx on blocks(blocker_id);
alter table blocks enable row level security;

-- ─── Dating compatibility fields ────────────────────────────────────────
-- `vertical_enrollments.orientation` was a single free-text value with no
-- defined meaning (identity? preference? both?) — not enough to build a
-- real hard filter on. Splitting it: `orientation` stays as a self-
-- descriptor (informational), `seeking` is the explicit list of who a user
-- wants to be matched with, used by the matching engine's compatibility
-- gate. `profiles.gender` is the self-described field the other side's
-- `seeking` is checked against.
alter table profiles add column gender text;
alter table vertical_enrollments add column seeking text[] not null default '{}';
