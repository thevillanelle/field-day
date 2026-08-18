-- Field Day — Row Level Security policies
--
-- IMPORTANT: this app authenticates via NextAuth (Google OAuth), not Supabase
-- Auth. Requests made with the anon key never carry a Supabase-issued JWT, so
-- auth.uid() is always NULL for them — every request lands in the `anon`
-- role, logged in or not. Writing "auth.uid() = user_id"-style policies here
-- would silently match nothing while looking secure. Don't add them.
--
-- The real pattern: all user-specific reads/writes go through Next.js server
-- actions using the service-role client (src/lib/supabase/admin.ts), which
-- bypasses RLS and is authorized in application code against the NextAuth
-- session (auth().user.id). RLS's job is narrower: keep the anon key locked
-- to genuinely public, non-sensitive data. Every table not listed below is
-- intentionally left with RLS enabled and zero policies — anon gets nothing,
-- service role (server actions) gets everything, which is the correct
-- default-deny posture until each feature defines its own safe-read shape.

-- ─── Games — public catalog, no PII ───────────────────────────────────────
create policy "games are publicly readable"
  on games for select
  to anon
  using (true);

-- ─── Question decks — public catalog, no PII ──────────────────────────────
create policy "question decks are publicly readable"
  on question_decks for select
  to anon
  using (true);

-- ─── Everything else: users, profiles, vertical_enrollments,
-- school_profiles, events, registrations, matches, game_sessions,
-- play_again_signals, field_notes, connections — no anon policies.
-- `profiles` in particular is deliberately NOT opened here even for
-- is_public = true rows: a "browse public profiles" feature needs to decide
-- its exact safe column set (e.g. never expose `location`) before anon gets
-- any access to that table. That's Phase 1 UI work, not this migration.
