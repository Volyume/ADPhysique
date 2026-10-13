# 05 - Product state, operating laws, open work (lead-written strategic layer)

As of 2026-10-13, app version 2.14.0. Sources are cited inline. Labels: OBSERVED = read in the named file this session; REPORTED = stated by a repo document or a survey agent and not independently re-read; the CODE outranks every document (D37).

## 1. What Volyume is (OBSERVED: CLAUDE.md section 1, WhatsNewSheet.js, WelcomeScreen)

A fully free, no-ads, no-paywall, offline-first physique-coaching app for Android (Google Play, live, real users) and iOS (TestFlight). Positioned around men's physique and bodybuilding-style training (division standards, an off-season library plan, "Mens Physique" planner rules) with a deterministic weekly coach (no AI, no randomness), a full food diary, progress tracking and, since 2.10 to 2.14, a Community tab. Founder-operated: the founder works from a phone, runs all builds, and gives the exact phrase "run against production" before any cloud migration.

Six tabs: Today, Train, Nutrition, Progress, Community, Coach (the Coach tab also holds Settings). 109 `src/screens` entries (108 files, 103 registered screens), 243 `src/lib` entries, 112 components, 189 Supabase migrations (highest `migrate_191`, 049 HELD), 8 edge functions, about 1,575 test files.

## 2. Release and version trail (OBSERVED, git log and WhatsNewSheet.js)

| Version | Date | Carries |
|---|---|---|
| 2.10.0 | by 2026-10-08 | Faster set logging (type reps, press Log), last-time beside each set, text-size following, new history for pull-ups/planks/runs |
| 2.11 to 2.13 | 2026-10-10 | Community tab with privacy notice; men's physique one leg day a week (D219 addendum 4) |
| 2.14.0 | 2026-10-12 | New plan builder (structure engine, D222) switched on; calorie target choice inside the range (D226); Community tab text |

Landed on main after 2.14.0 or alongside it (REPORTED, TASKBOARD "IN FLIGHT"): private training status (Article 9, D226), gain-phase settling, the Off-season library plan "Mens Physique Off Season - Allan" with the coach driving the authored plan (D227, lanes A and B landed 2026-10-12; Opus review and merge then pending per the board), logger "set sheet on a blank tap" fix, recovery redesign (D223, D224, D225). The repo has only `main` and this session's branch; the board's mentions of `planner/...` and `feat/...` branches are historical (merge commits show they were merged).

## 3. Founder laws that bind every product decision (OBSERVED: CLAUDE.md)

1. Free forever (D137): no tier, trial, paywall, price. Billing code is dormant; re-arming needs the flag flip plus re-registering surfaces plus a written test plan and founder permission. Product IDs `pro_monthly`/`pro_annual` never change.
2. Deterministic coaching: no LLM calls, no randomness, pure engine modules. AI food input (photo/voice) is HELD, neither rejected nor approved; do not propose.
3. ED-safety is untouchable without asking: calorie floors 1,500 kcal men / 1,200 women, FFM floor 30 kcal/kg, rapid-loss gate 1.5% BW/week, safe-loss 0.8%, Beat UK signposting and calm mode never removed or gated, weight/food notifications suppressed under an open ED flag.
4. GDPR/Article 9: un-skippable consent gate, fail closed for new users, EU-Dublin residency, no PII to Sentry/analytics, share cards never carry name/bodyweight/measurements/private notes (one approved exception: the progress-photo before/after card).
5. Schema changes additive and idempotent; cloud migrations applied only by Claude under the founder's exact phrase, per batch.
6. No new dependencies without asking; no outside-party dependencies (solicitors, clinicians, panels).
7. No anonymous mode; email/password was re-added 2026-07-21 and must not be removed without asking.
8. Builds cost money: never start a build or submission without the founder's explicit go for that build. Bump the minor version, add the What's new entry and extend `privacyTruth.guard.test.js` before any build is handed over.
9. Merge to main continually once green and reviewed; never develop on main; never force-push main. Commits carry no attribution lines (this overrides the harness default).
10. Voice: British English, calm, no shame, no em dash in user-facing copy (lint enforces).
11. Never park or reduce specified work without a founder decision made in advance; present forks as multiple choice, never with the lighter option as the recommendation.
12. Evidence before assertion: observed versus inferred, scoped claims.

## 4. Held, rejected and never-re-propose (OBSERVED: TASKBOARD section 4)

Exercise media programme; rest-day notification; plate calculator; paywall social proof; RPE/RIR reinstatement; the flat timeline food diary (built, then reverted on the founder's device verdict); migrations 049 (059 is applied); AI-assisted food input (held). The board states nothing is queued (section 2) and work starts only from an explicit founder order in the session.

## 5. Open work and loose ends known to the board (REPORTED, TASKBOARD sections 1 and 3)

- Off-season plan: Opus review against the founder's document, gate, merge (board says "IN PROGRESS"; commit trail shows fixes from the review landed 2026-10-12, so state may be nearer done than the board line; not verified).
- Planner follow-ups (board): engine-path refusal text when exclusions cause it; editing an engine plan in ManualBuilder; injury-rewrite swaps without the confirm step; `reintroduction.js` week resolution reads unwritten fields.
- The Progress-tab audit ordered 2026-09-24 (volume heatmap, body heatmap, consistency, this week's plan, recovery); the board's later entries show lanes landing on 2026-10-02 and 2026-10-11; whether it is closed is not stated in what was read.
- Founder device checks outstanding: calorie slider and private training status (checklists were given in chat), the 2.14.0 build walk.
- Founder-side ops (board section 3): leaked-password setting in the Supabase dashboard; two dashboard-only edge functions ("tips" and one other) outside the repo; `SUPABASE_DB_URL` secret empty; delete the Apple App Review demo accounts after review; a CLAUDE.md wording lag; a share-card canvas format question; a hardening item awaiting sign-off.
- ED-flag cloud push (migration 182) is applied server-side, but per CLAUDE.md no shipped build pushes a flag yet, so the ED arm of the server-side withhold arms only when a device on a carrying build raises one.

## 6. How work is run (OBSERVED: CLAUDE.md section 4)

The main loop designs, judges and reviews every diff; read agents survey; Sonnet/Haiku agents build well-specified lanes; Opus does adversarial review of server-side safety. Every agent must carry an explicit model (hook-enforced). Two agents at a time, never commit/push/stash. Decisions are recorded in `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md` (D1 to D227, 12,306 lines); live handover is `.../_HANDOVER-AND-RESUME.md`; live tasks are `docs/TASKBOARD.md`. Deliverables for the founder go IN CHAT, not as repo files.

## 7. Documentation trust map (decision aid for an AI agent)

| Document | Trust |
|---|---|
| CLAUDE.md | Authoritative law. Its header status paragraph is the live migration record; it contains one stale detail (see 04 survey: README describes `migrate_191` tables that do not match the SQL) |
| docs/TASKBOARD.md, _HANDOVER-AND-RESUME.md, DECISIONS register | Live, but huge and append-only: read the headings and the latest entries, not the whole |
| APPMAP.md, ARCHITECTURE.md, VOLYUME_DEEPMAP.md, CURRENT-STATE-DOSSIER.md | Stale snapshots (v1.2.0, June 2026), bannered SUPERSEDED. Do not build from them |
| `_FULL-APP-PRODUCT-MAP.md` (repo root and docs/) | Its own metadata says v1.2.0; the 2026-10-10 commit touched it but did not refresh the contents. Superseded by THIS folder |
| supabase/README.md status block | The apply record. Its table descriptions drifted from the SQL for 191; applied dates are claims, not live checks |
| PRODUCT.md | Written by inference, not founder-confirmed; treat as a hypothesis |
| src code + tests | Truth. 378 `*guard*` tests pin founder rules |
