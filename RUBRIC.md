# Field Day — Launch Rubric

Success bar: **public launch** (not private beta, not demo). MVP-critical verticals: **Dating + Friends**. School and Work are visible on the platform as "Coming Soon" but not functional at launch. No hard deadline — build to this bar, not a date.

---

## 1. Core User Journey (Dating + Friends, must work end-to-end, no dead ends)

- [ ] Sign up via Google OAuth → session persists → logout works
- [ ] Onboarding: profile → vertical selection → vibe quiz, all data actually lands in Supabase (not just UI state)
- [ ] User can enroll in Dating and/or Friends independently, with separate intent/orientation per vertical
- [ ] Discover/matching produces a real pair via `runMatching`, not placeholder data
- [ ] Match → suggested game → play session (async and live) → result records to `game_sessions`
- [ ] Field notes thread works both directions; "play again" mutual-signal → creates a `connections` row
- [ ] Every screen has a next action — no page a user can land on and get stuck

## 2. Matching Engine Quality

- [ ] Verified against real seeded data (10–50 users), not just unit logic
- [ ] Edge cases don't crash: empty pool, odd-numbered pool, all-same-vibe pool, user with no `vibe_type`
- [ ] Dating-specific: orientation/gender compatibility respected as a **hard filter**, not just a scoring weight
- [ ] Blocked pairs are never matched
- [ ] Re-matching doesn't repeatedly pair the same two people without a cooldown/exclusion

## 3. Trust & Safety (non-negotiable at public-launch bar)

- [ ] Report user / report match flow exists and reaches a human-reviewable place (even if that's just a Supabase table + manual review at first)
- [ ] Block user — blocked pairs excluded from future matching
- [ ] No exact location or last name surfaced pre-match; only after mutual connection, if at all
- [ ] Field notes/messaging can't be used to harvest external contact info undetected (flag, don't necessarily block, in v1)
- [ ] Age gate enforced (Dating vertical minimum age, matches `profiles.age`)
- [ ] Minimal but real Terms of Service + Privacy Policy, linked from signup, before any public account creation

## 4. Security & Privacy

- [ ] `002_rls.sql` written and applied — every table has explicit policies (not just RLS-enabled-with-nothing)
- [ ] Policies tested from the anon/authenticated role, not just service role — a user can only read/write their own rows, and only public-profile fields of others
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never referenced in any client component or `NEXT_PUBLIC_*` var
- [ ] Admin routes (`src/app/admin`) gated on `ADMIN_EMAILS`, server-side, before any data fetch
- [ ] `NEXT_PUBLIC_DEV_BYPASS` and `src/app/api/dev-preview/` cannot be reachable in a production build — verify the Vercel env var directly, don't assume
- [ ] No PII in source — real emails/names only via env vars or seeded-at-runtime data

## 5. Technical Quality

- [ ] `npm run build` clean, no type errors, no `any` creeping into `types.ts`-adjacent code
- [ ] Follows current Next 16 conventions — per `AGENTS.md`, checked against `node_modules/next/dist/docs/` before writing anything that touches routing/data-fetching
- [ ] No console errors/warnings on core journey pages
- [ ] Auth failure, network failure, and empty-state UI handled (not blank screens)

## 6. Design / Brand

- [ ] Field Day has its own voice — playful, low-stakes, game-first — distinct from Elle's personal brand
- [ ] Responsive on mobile (most traffic will be mobile)
- [ ] Onboarding quiz and matching feel like play, not a form

## 7. Ops

- [ ] Deploys clean on Vercel with `krystine.hall@gmail.com` git identity
- [ ] All secrets in Vercel env vars, `.env.example` stays placeholder-only
- [ ] Every merged change came in via PR with what/how/test checklist, no direct-to-main

---

## Explicit Non-Goals (parameters to stay within — don't build these yet)

- School and Work verticals — schema/matching weights can stay in place, but no functional UI/launch push this phase
- No push notifications
- No payments/monetization plumbing
- No native app — web only
- No real-time chat beyond structured field notes (no open-ended DM)
- No automated moderation/ML abuse detection — manual review is fine for v1
- Don't over-build the admin panel beyond what's needed to review reports and manage events

---

## Addendum: Coming Soon + Future Vertical Spec

### "Coming Soon" — required as part of the Dating + Friends MVP (not deferred)

- [ ] Vertical picker (onboarding + main nav) always shows all 4 verticals — Dating, Friends live; School, Work marked "Coming Soon"
- [ ] Coming-soon cards share the same visual language as live ones, but the primary action is disabled/replaced with a waitlist capture, not a dead link into an empty route
- [ ] Waitlist interest captured via `vertical_enrollments` with a `status: 'waitlist'` value rather than a new table
- [ ] No route in `(verticals)/school` or `(verticals)/work` is reachable and empty

### Future Spec: School vertical (self-report verification)

**Already scaffolded:** `school_profiles` table (school_name, major, year, campus, verified_at); matching engine already treats School as a domain-diversity vertical.

**What launching it later requires:**
- [ ] `school_name` as free-text or picker input — self-report, no domain check, `verified_at` stays null until a verification tier is added later
- [ ] Campus as free text to start (a seeded picker list is a later upgrade)
- [ ] Trust & Safety bar is the **same as Dating** — real students, real campuses, report/block required the day this launches
- [ ] Resolve matching-pool grouping: self-reported `school_name` is the only grouping signal without domain verification — needs light normalization (e.g. "NYU" vs "New York University") so the pool doesn't fragment
- [ ] `.edu` domain verification can be layered on later without a schema change — `verified_at` is already there waiting for it

### Future Spec: Work vertical (intra-company B2B tool)

**Already scaffolded, and one thing that's now known-wrong:** `events`/`registrations` tables fit a B2B model; `SLACK_WEBHOOK_URL` env var already stubbed for match notifications. `matching.ts`'s current "never same-domain" constraint assumes Work spans multiple companies — for an intra-company tool everyone shares one domain, so that rule is currently a no-op (falls through to its fallback on every pair). **When Work gets built for real, that constraint needs to become department/team diversity**, which requires a `department`/`team` field that doesn't exist yet.

**What launching it later requires:**
- [ ] Company onboarding — admin registers a company + its email domain allowlist
- [ ] `department`/`team` field added to support the corrected diversity constraint
- [ ] Slack app/webhook integration code (env var exists, integration doesn't)
- [ ] Safety/conduct framing shifts to workplace-appropriate (still needs a report path, different tone/review process than Dating/Friends)
- [ ] Go-to-market is B2B — likely gated behind a company invite code rather than open self-serve
