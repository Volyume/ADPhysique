# UX world-class audit — handover and resume note

===============================================================================
## ★ FRESH SESSION START HERE (2026-07-23, chat cleared, founder moving to PC) ★
===============================================================================

**Read this block, then `docs/TASKBOARD.md`, then `CLAUDE.md`, then
`git status`. The 2026-07-10 block below is SUPERSEDED and kept only as
history.**

**BRANCH:** `claude/codebase-audit-docs-pv6mjd`, pushed and EVEN with
`origin/main` (verified `git rev-list --left-right --count origin/main...HEAD`
= `0 0` at `44f0c4d`). Tree is settled and green: **lint clean, 775 suites /
9,107 tests pass, exit 0**. Everything below is already merged to main.

**WHY THIS SESSION ENDED:** the founder is switching to their PC to get
working Sentry and Supabase connectors. TWO ORDERED TASKS ARE UNSTARTED AND
BLOCKED ON THAT, not parked (see FIRST ACTIONS below).

### FIRST ACTIONS IN THE NEW SESSION (both were founder-ordered, both blocked)

**1. Sentry triage, last two weeks.** Founder: "you have access to my Sentry,
please browse and fix any issues reported in the last two weeks." The
Sentry MCP disconnected mid-session and never returned; checked three times,
never actioned. Known state from earlier in the session (org `volyume`,
region `https://de.sentry.io`):
- `VOLYUME-2N` TypeError "Cannot read property 'filter' of undefined", scope
  `ActiveWorkoutScreen.handleFinishWorkout` -- ALREADY FIXED this session
  (`b312969`, commit says `Fixes VOLYUME-2N`); should auto-resolve on deploy.
  If it recurs with a timestamp AFTER that build ships, it is a NEW bug.
- `VOLYUME-2E` "Calling the 'getValueWithKeyAsync' function has failed",
  ~1,011 events / 3 users, secure-store related. This is the loudest open
  issue and the obvious next target. NOT investigated.
- Also open and unlooked-at: `VOLYUME-2D/2C/2F` (anonymous, high count),
  `VOLYUME-2H` "food_sync_pull: not authenticated", `VOLYUME-2G` "SQLCipher
  key unavailable and existing DB is not plaintext-readable".

**2. Apple review test accounts.** Founder: "create two generic accounts,
fully activated one with Pro, one with Free ... generic email addresses that
anyone can login with and secure complex passwords. Ensure it's all safe."
Supabase MCP disconnected; NOT created. The prepared plan, and WHY it is
shaped this way:
- Do NOT hand-seed `auth.users` via SQL. Consent goes through the
  `record_health_consent` RPC (`supabase/migrate_019_health_consent.sql`) and
  profile/onboarding/consent state must line up; untested seeding SQL risks a
  half-formed account that fails App Review, which is worse than none.
- SAFE PATH: create both accounts through the app's own email/password
  sign-up (shipped 2026-07-21, `src/screens/LoginScreen.js`) and walk
  onboarding once each. Every gate, consent row and profile field is then
  correct by construction.
- Then ONE statement flips the Pro account:
  `update users_profile set trial_state = 'paid_pro' where id = (select id
  from auth.users where email = '<pro address>');`
  `paid_pro` deliberately, NOT a trial state, so it cannot expire during
  review. Free account stays `free`. Both values verified against the CHECK
  constraint in `supabase/migrate_030_tier_infrastructure.sql`.
- STILL NEEDED FROM FOUNDER: the two email addresses, and whether Supabase
  has email confirmation switched on (if it does, they must be addresses the
  founder can actually receive mail at).
- CREDENTIALS: two strong reviewer-typeable passwords were generated and
  given to the founder IN CHAT ONLY on 2026-07-23. They are deliberately NOT
  in this repo and must never be committed. If the founder did not save them,
  generate fresh ones. Disable both accounts once review completes.

### ⚠ THE MIGRATION DEPLOY PATH IS BROKEN (diagnosed 2026-07-27, ACT ON THIS)

The founder gave "run against production" for migrate_128. It was NOT applied.
Two independent blockers, both proven, neither guessed:

1. **The workflow secret is missing.** `.github/workflows/deploy-migrations.yml`
   has failed on its last FIVE runs (run numbers 6-10, latest 2026-07-01, run
   id 28527653093), every one at the very first step. Job log, verbatim:
   `env: SUPABASE_DB_URL:` (empty) then
   `##[error]SUPABASE_DB_URL is empty.` The workflow's own header comment
   claims the secret was "already configured per founder, 2026-06-06" -- that
   comment is WRONG, or the secret was removed since. This is why production
   sits at migrate_116 while TWELVE files (117-128) are pending, and why every
   migration to date had to be pasted in by hand.
   FIX: repo Settings -> Secrets and variables -> Actions -> add
   `SUPABASE_DB_URL` = the Supabase Postgres connection string (Project
   Settings -> Database -> Connection string, URI form, INCLUDING the
   password). Nothing else in the workflow needs changing.

2. **The session token cannot dispatch workflows.** `run_workflow` on
   deploy-migrations.yml returned `403 Resource not accessible by integration`.
   Actions READ works (run history and job logs were both retrieved), so this
   is a missing `actions: write` scope, not connectivity. Either grant that
   scope or click "Run workflow" once in the GitHub UI after fixing the secret.

WHEN IT RUNS, IT APPLIES ALL TWELVE PENDING FILES (117-128), not just 128 --
the workflow loops every untracked `migrate_*.sql` (049/059 stay HELD). All
are required to be additive and idempotent and each runs in a single
transaction with ON_ERROR_STOP, so a re-apply is a no-op and a failure rolls
back that file loudly. Check the run log afterwards: migrate_128 ends with a
verification SELECT that prints the seeded account state.

migrate_128 STATUS: written, reviewed, merged to main, NOT APPLIED. The two
Apple review accounts DO NOT EXIST yet and will not sign in.

### WHAT SHIPPED THIS SESSION (all on main, all green)

Device-reported fixes: `d96bec9` Log-button height; `674f98d` eight
row-alignment defects from a 4-agent sweep; `1309081` numeric-keypad Done bar
plus 8s idle dismiss (iOS decimal/number pads have no Done key); `f5c8aa7` PR
toast clearing the Dynamic Island; `b312969` the Finish crash (VOLYUME-2N).

`251e92a` (D86) Coaching-decision page rebuilt for end users: photo talk out
of the lead card and compacted low on the page, machine voice rewritten,
StatChips de-buttoned, bottom jargon row removed. ENGINE UNTOUCHED.

`d99dc7e` (D87) live personal-record line under the weight/reps steppers,
reusing `detectPR` so it can never promise a record the celebration withholds.

`fbce1d3`..`44f0c4d` (D88) five-lane copy/design/trust audit and its
remediation: raw crash text removed from three setup paths, first-person AI
voice fixed at source in `planExplain.js`, kJ/kcal double-total, duration and
estimated-max unified, en dashes and curly apostrophes, terminology drift,
destructive-confirm consequences, and the PR-not-PB standardisation.

### TWO CORRECTIONS ON RECORD (read before trusting old notes)
- The "Settings > Health is a reachable ghost feature" finding was WRONG and
  is withdrawn (D88). The row is gated on `isHealthAvailable()`, which is
  always false by design. No change was made.
- CLAUDE.md's "Apple + Google OAuth ONLY" line was stale and is corrected:
  email/password is live and ungated since 2026-07-21. Do not "restore" its
  removal.

### DECISIONS ADDED THIS SESSION
`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`: **D86**
(coaching-decision simplification), **D87** (live record indicator), **D88**
(audit remediation, the withdrawn Health finding, and the PR/PB ruling with
its evidence).

### OPEN, NOT BLOCKED (founder decisions still outstanding)
- kJ users cannot log custom foods in kJ: `AddCustomFoodScreen.js` and
  `components/food/QuickAddSheet.js` have ZERO energy-unit awareness while
  `DiaryScreen.js` has it; `NutritionEducationScreen.js` teaches in kcal only.
  Not data corruption (all stored kcal) but a real inconsistency. This is a
  build, not a copy tweak, and was never approved.
- `ProUpgradeScreen` FAQ describes only the 14-day trial and omits the store's
  further 7 free days. The founder confirmed 2026-07-23 that the 7 days ARE
  configured, so the accountNote claim is CORRECT and was left untouched;
  the FAQ simply undersells it. Billing copy is founder-gated.

===============================================================================

===============================================================================
===============================================================================
## ARCHIVE POINTER + STANDING TOKEN-HYGIENE RULE (D41, founder 2026-07-11)
The day-by-day historical campaign log now lives in
`_HANDOVER-ARCHIVE.md` (same folder — full history, never deleted).
STANDING RULE: at every landing, stage-log entries older than the
current resume point roll into the archive; this live file stays under
~600 lines so a fresh session (and every agent brief citing it) reads
it in one cheap pass. Landed-item detail on docs/TASKBOARD.md moves to
the archive at the same time; the board holds only in-flight / queued /
held. Agent briefs cap final reports: structured, evidence-first, no
narrative padding (detail-bearing audit evidence exempt).
===============================================================================
