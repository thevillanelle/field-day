-- Field Day — live session capability token
--
-- Live game sessions use a Supabase Realtime Broadcast channel named after
-- this token, not the raw game_sessions.id. Same auth constraint as
-- everywhere else: the browser Realtime client only has the anon key, no
-- Supabase-issued JWT, so there's no auth.uid()-based way to restrict who
-- can subscribe to a channel. Instead the token itself is the capability —
-- an unguessable UUID that's only ever handed to the two match participants
-- by a server action that checks the NextAuth session against
-- matches.player_1_id/player_2_id. Never expose this token in any list/
-- public query, only in the single-match detail fetch for its participants.
alter table game_sessions
  add column realtime_token uuid not null default gen_random_uuid();
