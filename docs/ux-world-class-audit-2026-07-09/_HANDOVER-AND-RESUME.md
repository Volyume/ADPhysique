# UX world-class audit — handover and resume note

===============================================================================
## ★ FRESH SESSION START HERE (2026-08-10, Campaign 2: comprehension) ★
===============================================================================

**Read this block, then `docs/TASKBOARD.md` (the Campaign 2 entry in the
appendix is the live spec pointer), then `CLAUDE.md`, then `git status`.
Every block below this one is SUPERSEDED and kept as history.**

Since the 2026-07-27 block below: the adaptive-mesocycle campaign landed
(D91, blueprint `docs/blueprint-adaptive-mesocycle-2026-08-09.md`, incl.
migrate_129-131; 131 applied to production on the founder's phrase); the
full product map was built (`docs/_FULL-APP-PRODUCT-MAP.md` + its
handover); Campaign 1 (Product Integrity, D92) landed and merged to main
at `0a552cc4` with 9,681 tests passing, lint clean, and migrations
132-135 written but NOT applied (founder-gated).

**COMPLETE: Campaign 2 — comprehension, explanation, terminology** (merged to main 2026-08-10; record in docs/comprehension-audit-2026-08-10/ + D93; STOPPED after Campaign 2 per the order)
on branch `claude/campaign2-comprehension`. The founder's full order is
preserved verbatim in the session scratchpad
(`c2/CAMPAIGN2-ORDER.txt`) and summarised on the taskboard. Hard
constraints: migrations 132-135 stay unrun, no EAS builds, D92-11
(ED-flag propagation) unaltered, no new cross-device sensitive-data
paths, cardio permanently out of scope (D92-1), Campaign 1 pins stay
green, STOP after Campaign 2. Rulings go to the register as D93.

**Recovery path if this session dies:** read the Campaign 2 block on the
taskboard, the D93 register entries made so far, and the phase evidence
files in the scratchpad `c2/` directory; verify `git status`; uncommitted
work is lead-reviewed against the order before landing, never discarded,
never blindly committed.

===============================================================================
## SUPERSEDED — (2026-07-27, final pre-release sweep) ★
===============================================================================

**Read this block, then `docs/TASKBOARD.md`, then `CLAUDE.md`, then
`git status`. Every block below this one is SUPERSEDED and kept as history.**

Branch: `claude/codebase-audit-docs-pv6mjd`. Working tree green at the last
landing: lint clean, full suite passing.

### What happened this session

**Connectors came back.** The founder removed and re-authorised them, so the
Supabase and Sentry MCP connectors both work. Everything that was blocked on
them is now done.

**Migration 128 applied to production** on the founder's "run against
production". Both Apple App Review accounts exist and were verified live:
`appreview.pro@volyume.app` (pro / paid_pro) and `appreview.free@volyume.app`
(free / free), email-confirmed, onboarding complete, health consent recorded.
The bcrypt hashes originally committed did not validate under `crypt()`; they
were re-derived during the run and the migration file now matches the issued
credentials. Passwords live in chat only, never in the repo.

**CORRECTION to a long-standing wrong note.** Production was NOT stuck at
migration 116 with 117-128 pending. The live history shows 117, 118, 120-124,
126 and 127 already applied under drifted names. The real gap was three files;
128 is now applied, and **119 and 125 remain unapplied and unauthorised** —
surfaced to the founder in TASKBOARD section 3.

**Sentry triage: complete, zero unresolved issues remain.** 13 issues were
open. Nine of them were ONE failure chain and a genuine data bug, not noise:
with the phone locked, the Supabase refresh timer kept ticking in the
background, the iOS Keychain refused the session read, the client continued
with no user JWT, `auth.uid()` came back NULL, and every RLS policy of the form
`(auth.uid() = user_id)` rejected the write with 42501. **User data was being
dropped.** Fixed in `f4327e8`. RLS policies were deliberately NOT loosened —
they were correct; the session was missing. Evidence:
`docs/audit/sentry-triage-2026-07-27.md`.

**Full adversarial pre-release sweep** run by four read-only audit agents
(share cards, data entry/keyboard, layout/sizing, crash safety). All findings
and the lead rulings on every fork are in
`docs/audit/pre-release-sweep-2026-07-27.md` and
`docs/audit/share-card-audit-2026-07-27.md`. Read those before touching any of
those surfaces — the rulings are made, not open.

### Landed commits (in order)

- `f4327e8` background session loss dropping cloud writes + Sentry flood guard
- `f64c012` share-card brand lockup: cannot export unbranded, one lockup size
  across formats, descender/empty-hero/PB fixes, ED suppression now fails closed
- `08b80d6` pre-release sweep audit findings and lead rulings
- `3fdc7ac` comma-decimal corruption of typed numbers + two unusable numeric
  inputs
- `791cd45` taskboard update

### IN FLIGHT at the time of writing

Two Sonnet build agents were dispatched against
`docs/audit/pre-release-sweep-2026-07-27.md`:
- **Lane A** (keyboard): centralise the iOS numeric Done bar in
  `src/components/TextField.js`, add `keyboardShouldPersistTaps="handled"`,
  strip dead `returnKeyType` from numeric pads.
- **Lane C/D** (errors + layout): stop raw exception text reaching users in the
  plan rebuild and snapshot restore; font-scale ceilings on fixed containers;
  toast safe-area bottom inset; Analytics hero wrap; plan-name capping;
  body-metrics label wrap.

**Recovery path if this session died mid-flight:** their work is uncommitted in
the working tree. Lead-review each diff against the ruling it cites in the
sweep doc, run `npm run lint && npm test`, then land it. Do not discard it and
do not commit it blind. The edit-gate (`.claude/edit-gate`) is armed against
`docs/audit/pre-release-sweep-2026-07-27.md`; it is a SHARED single file, so
never let two agents rewrite it concurrently.

### Still open, needing the founder

All in `docs/TASKBOARD.md` section 3: whether to apply migrations 119 and 125;
deleting the review accounts after review; a one-line CLAUDE.md correction (the
weekly recap card is a SECOND founder-approved bodyweight exception, ruled
2026-06-22 and recorded at `src/lib/shareCard/greatWeek.js:13-19`, but Section 2
still says there is only one); the share-card 1:1 vs 4:5 canvas question; and
the still-empty `SUPABASE_DB_URL` secret.

===============================================================================
## SUPERSEDED (2026-07-23, chat cleared, founder moving to PC)
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

### ADAPTIVE MESOCYCLE BUILD — LIVE CAMPAIGN (2026-08-09, founder GO)

Authority: `docs/blueprint-adaptive-mesocycle-2026-08-09.md` §3.9 + the
founder's staged order (8 stages, test-first). LIVE STATE AND PER-STAGE
DETAIL: `docs/TASKBOARD.md`, "ADAPTIVE MESOCYCLE BUILD" entry — that entry
is the resume point, not this file.

- Stage 1 LANDED (`6d0d59c6`): completed_awaiting_decision block state,
  no week wrap, honest "Block finished" copy across surfaces, ledger seam.
- Stage 1 review remediation LANDED (`5193dd87`): all 12 adversarial-review
  findings fixed (partner milestone, ActiveWorkout/MesocycleBuilder/
  CoachOutput honesty, advisor phase-aware copy, live PlansScreen intent
  seam, widened creation pin, strengthened test pins).
- Stage 2 LANDED (`1b6fd27a`): pure Block Ledger `src/lib/interBlock.js`
  (36 tests written first; founder retention rule enforced).
- Stages 3-8 LANDED (see the taskboard entry for per-stage detail and
  commits): performance metric (blockMetrics), fatigue context + PR
  density (weeklyCoach), learned working range (learnedRange), the full
  ledger wiring (gather/runner/seeding/PlansScreen, createMesocycle
  deleted), strain-aware deload, and the explanation layer
  (blockExplain + four surfaces). Reviews: ALL EIGHT stages adversarially
  reviewed and remediated (Stage 6 review + the founder's final delta +
  the Stage 7-8 review landed 2026-08-09 as the FINAL REMEDIATION BATCH -
  see the taskboard record and D91 rulings 14-25; one explicit deferral,
  D91-24; e2e synthetic-athlete suite adaptiveBlock.e2e.test.js).

ADDITIONAL DEVICE CHECKS for Stages 6-8 (same single EAS build):
10) Finish a block (start date 6+ weeks back), open Train: the decision
   card now reads "Continue with adjustments" and shows up to four
   muscle-by-muscle lines in the coach's words (e.g. "Chest responded
   well, so the next block starts 1 set higher."). If several strain
   signals ran together, a 10-day recovery line appears, ending "Your
   call."
11) Tap "Continue with adjustments": a new block starts; open the Home
   block sheet - up to three lines like "Chest: 11 sets in week 1,
   building to 17 by week 4, then a recovery week (set by how your last
   block went)". A first-ever block shows NO such lines (nothing to
   claim). If the card instead offered "Continue this programme" (a
   true repeat), the muscle-by-muscle rationale lines do NOT appear on
   it (they would promise changes that button does not make); the full
   story still shows on the old block's Block summary.
12) Open the old block's Block summary: a "What this block showed"
   section lists each muscle's verdict.
13) Weekly coach, mid-block: the training note opens "Week N of M in
   your block.", names the climb only when next week's written plan is
   genuinely higher ("The planned climb adds N sets next week."), and
   only mentions the coach adding sets AFTER you tapped Apply AND it
   changed at least one muscle.
14) Coach deload apply mid-block: every muscle's recovery target drops
   below its current row (never a no-op), scaled 60% down to 40% of its
   recent working volume as the week's recovery read worsens; the
   applied row states the share. The dose can sit below MEV now
   (founder ruling: MEV is not a recovery-week minimum).
15) Calm-mode spot-check on the new block: seed lines never propose
   more than the last block ran (suppression degrades to repeat).

RELEASE GATE LIFTED (2026-08-09): migrate_131 was applied to EU-Dublin
production and verified (column present jsonb/nullable, 11 rows
untouched, ledger ordered after 129/130) under the founder's staged
order, after re-verifying all four preconditions (reviews remediated;
lint + full suite green on main; strain monotonicity executed; e2e
regression green). Artefacts built from main at/after 30fb2f53 are
clear to ship. The next EAS build can go whenever the founder is ready
to device-walk the checklist above.
16) Calm-mode / open-ED-flag deload spot-check: with calm mode on,
   restarting with adjustments never sizes the recovery week above the
   flat MEV week, and no seed starts above the last block's own
   numbers.

DEVICE CHECKLIST for the lifecycle changes (single EAS build, physical
Android; run with a block whose start date is set 6+ weeks back so it is
finished): 1) Home chip reads "Block finished. Targets hold at
recovery-week volume until you choose what comes next." — never "Deload
week" or a wrapped "Week 1". 2) Tapping the chip opens the block sheet:
all dots done, "Block finished" line, and a "Choose your next block"
button that lands on the Train tab's decision card. 3) That card's body
never says "After your recovery week"; its primary button reads "Restart
this programme" (adjust) or "Continue this programme" (repeat). 4) Start
a workout: the banner says "Block finished" with the holding line, NOT
"Recovery week"; targets still show the light recovery numbers.
5) Training blocks screen: plan card and dashboard read "Block finished",
no "Week 6 of 6 · recovery week". 6) Finish a session: no gold "Block
complete" celebration re-fires; the block strip shows the finished line.
7) Coach tab weekly review: the training card explains volume changes
have nowhere to land and points at the Train tab (no silent dead Apply).
8) Progress tab: "This week's plan" header reads "Block finished";
pulse card reads "Block finished", not "Week 5 of 5 · 100% complete".
9) ED-safety spot-check: enable calm mode — widget and streak surfaces
unchanged from before (suppression untouched by this campaign).

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
