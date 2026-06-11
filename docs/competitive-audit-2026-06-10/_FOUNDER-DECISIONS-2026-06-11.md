# Founder decisions — questionnaire of 2026-06-11

Answers to the decision groups queued in `_SESSION-HANDOFF.md`. These are
binding for the build phase. Anything not listed here keeps its blueprint
default.

## 1. Billing — HOLD ALL BILLING WORK
COMP-007 (annual-first flip + paywall social proof) stays research-only.
Nothing in `src/lib/payments/` or the paywall/upgrade/tier-strip screens is
to be touched. This also holds every billing-adjacent line queued by other
blueprints: COMP-012's paywall footer line, COMP-025 Phase B (store win-back
offers). COMP-025 Phase A (cancel-reason capture, no billing files) is NOT
held.

## 2. SKU-id mismatch — DOCS WERE WRONG, NOW FIXED
Founder confirmed the live Play product ids are `pro_monthly` / `pro_annual`
(what `catalogue.js` ships). `CLAUDE.md` and `docs/rules/billing.md`
corrected this session. No code change.

## 3. Dependencies — ALL FOUR APPROVED
- `@bacons/expo-apple-targets` (COMP-020 watch, COMP-019 widgets/Live
  Activity) — still subject to the issue-#175 go/no-go spike.
- `react-native-android-widget` (COMP-019 stage 2).
- `expo-system-ui` (COMP-029 light theme; native rebuild).
- `expo-video` (NEW-001 demo loops).
Approval covers installation when the owning feature starts, not before.

## 4. Spend — NOTHING APPROVED YET
Founder: "No extra costs yet unless needed gym animations is a bad choice
perhaps." Read as: no money moves now. NEW-001's $599 purchase NOT approved;
its £0 Phase 0 (licensing questions in writing + 30 free-clip validation)
may still run since it costs nothing, and the spend question returns after
Phase 0 results. COMP-016 contracted data-ops (~£4–6k) parked — the
engineering-only parts wait with it. Supabase Pro backup ($25/mo) parked;
the backup/DR brief stays open as a known risk.

## 5. Trial-notification bug — FOLD INTO COMP-023
The restoreNotifications() cascade-wipe bug (day-12/14 trial pushes
destroyed on every launch) is fixed inside the COMP-023 build, not as a
standalone PR. Until COMP-023 lands, trial users may reach day 14 unwarned —
accepted by the founder. Raises COMP-023's build priority.

## 6. Colour — WARNING RETUNE APPROVED
warning `#FFC107` → Okabe-Ito yellow `#F0E442` per COMP-027. One token
change, propagates via stateColors aliases.

## 7. NEW-002 free/Pro split — FULLY FREE
Training partners: up to three partners for ALL users. Overrides the
blueprint's one-free/three-Pro proposal. No Pro gate anywhere in NEW-002.

## 9. Second questionnaire — answers of 2026-06-11 (afternoon)
- **Next build:** COMP-018 streak only. SHIPPED v0 (881d948): deload query +
  pure streak.js + read-only Progress strip. UI follow-ups deferred.
- **COMP-001 step 6:** DROP the logged-set cap. No cap was ever added, so
  step 6 is CLOSED as shipped (compact timer only). The nav-pill clamp
  concern is moot; the middle-out nav truncation helper is dropped as
  unneeded polish.
- **Billing:** STAYS FULLY HELD. COMP-007 and COMP-025 Phase B remain
  research-only.
- **Spend:**
  - **COMP-016 UK food layer — DROPPED COMPLETELY.** Founder: "no chance at
    any stage." Removed from the roadmap; blueprint marked rejected. Its
    foods.source CHECK locked-doc amendment is therefore also dropped.
  - **NEW-001 Gym Animations $599 — DROPPED.** Founder: cheaper/better
    alternatives exist. The $599 vendor is rejected; NEW-001 Phase 0 is
    repurposed to source cheaper alternatives (£0 research) before any
    direction is chosen.
  - **NEW-001 Phase 0 (£0) — RUN.** Licensing questions + sourcing cheaper
    exercise-demo-loop options. No money moves. See
    `gaps/new-001-phase0-demo-sourcing.md`.
  - **Supabase Pro backup $25/mo — DEFERRED (not rejected).** "Not needed
    now, maybe for the future." Backup/DR risk stays on the books.

## 8. Copy + locked docs — APPROVE IN PRINCIPLE
Build with blueprint copy as written (COMP-006 methodology, COMP-015
adjustment lines, COMP-011 cardio explainer, COMP-010 effort vocabulary,
COMP-008 survey strings); founder reviews at PR time only if something
jumps out. Locked-doc amendments (COMP-030 quiz-first, COMP-016
foods.source CHECK, NEW-002 RLS/DPO, backup vs BUDGET_POSTURE_LOCKED) still
come to the founder individually before any amendment is made.

## Resulting build queue (dependency order, billing/spend items removed)
1. **Quick wins:** COMP-003 quick add (~90 min) → COMP-011 cardio explainer
   (copy) → COMP-002 meal-slot memory (~4–6 h).
2. **Mandate:** COMP-001 workout screen redesign (~6 days; unblocks
   COMP-013, COMP-015 slot, COMP-020).
3. **COMP-008 survey diet** (must precede COMP-015) → **COMP-015**.
4. **COMP-023 day-3 trial moment** + the cascade-wipe bug fix (decision 5).
5. **COMP-027 colour grammar/Home** (token migration precedes COMP-029) →
   **COMP-004 daily trend** (precedes COMP-026) → COMP-029 light theme.
6. **COMP-018 streak** (precedes NEW-002) → NEW-002 (fully free).
7. Remainder per the integration map: COMP-006, 012, 013, 022, 024, 025-A,
   026, 010, 005, 009, 019, 020, 030.
Parked pending money/billing: COMP-007, COMP-016, NEW-001 purchase,
COMP-025-B, Supabase Pro backup.

## Build log — session of 2026-06-11 (same day as the questionnaire)
SHIPPED on this branch, each commit lint-clean with the full suite green:
- **COMP-003** quick add (8103261): Quick add row in every meal card,
  QuickAddSheet wired into DiaryScreen, quick_add telemetry source.
  Optional name field deferred per blueprint's builder decision.
- **COMP-001 steps 1–5 + telemetry** (dc56186, 3a0cbb6, d8425a4, 49e67e6,
  bd646ef): three-line card header with tappable beat line; 5-button row →
  2 + overflow sheet; logged sets above the fold; one-row 3-control rest
  timer with long-press repeat; ghost nav / muscle line / time-crunch bar
  deleted (glyph in header, revert in overflow); M2–M4 audit events;
  countProgressSets extracted to src/lib/workoutHelpers.js; compact timer
  on <700pt screens. Blueprint deviations (deliberate): 'Add exercise'
  label kept truthful (blueprint's 'Add set' named the exercise-picker
  handler); first-set hint copy points at ⋯.
- **COMP-011** cardio explainer (9ca4917): three surfaces, locked
  vocabulary, blueprint copy as written.
- **COMP-002** meal-slot memory (2f3c314): food_slot_recents client-only
  table, 'Add again' tab, last-used portion pre-fill, unit tests.
- **COMP-027 Part A** colour grammar (87f99ac): stateColors aliases,
  warning #FFC107 → #F0E442 Okabe-Ito retune (founder-approved), the 3
  Class B/C migrations (CoachOutput trend chip, BodyMetrics delta, Home
  deload banner), tests. Implementation note appended to the blueprint.
- **COMP-004** 'Your trend' card (2cd74f4): pure deriveWeightTrend +
  useWeightTrend hook + WeightTrendCard on Progress, states 0-3, Class B
  rules, 8 unit tests.
- **COMP-018 v0** (881d948): getDeloadWeeksInRange query + pure streak.js
  (10 tests) + read-only 'weeks running' Progress strip.
- **COMP-012** (94649a6): Welcome trust row + Play 'Your data, plainly'
  block; duplicate 'offline' bullet trimmed. Paywall footer left (billing).
- **COMP-010** (ec7b842): BlockShapeCard week dots (Ease in/Build/Push/
  Recover) via the tappable Home meso chip. PlanDetail mount deferred.
- **COMP-022 (partial)** (6e12f6f): deterministic custom-barcode resolution
  (ORDER BY updated_at).
- **COMP-022 (save slice)** (ae86b66): OFF write-back relocated from
  ScanLabel capture to AddCustomFood's confirmed save (sends the values the
  user actually confirmed + name/brand, no orphan queue entry, consent gate
  intact); healing toast 'Saved. Next time this barcode scans instantly.';
  from:'scan_chain' telemetry tag.

## Second "build all you can" pass — what shipped vs stopped (2026-06-11 eve)
Founder ticked COMP-022, COMP-006, COMP-010, COMP-019. Outcome:
- COMP-010 — already shipped earlier this session (ec7b842). Done.
- COMP-022 — shipped the two high-confidence, testable slices above
  (determinism + the save-side consent/toast). REMAINING (deferred, fresh
  context / on-device look): the ScanLabel arrival-choice 'fix it once'
  state + offline-vs-miss copy, the waterfall miss-vs-unreachable tagging,
  the duplicate-barcode banner, and the one-time Diary OFF-consent card.
- COMP-006 methodology page — NOT built. The page makes specific engine
  claims (2-week cooldown, volume matrix, FFM floor) and the blueprint says
  founder review against the engine is non-negotiable because wrong copy
  damages trust. Needs claim-by-claim verification against weeklyCoach.js /
  whyThisTemplates.js with the founder; deferred rather than risk shipping
  a subtly-wrong claim unattended.
- COMP-019 stage 1a — NOT built. It is a 3-screen visual change
  (BodyMetrics + ExerciseDetail + VolumeHeatmap: window chips + recomputed
  takeaway copy + date-window queries), unverifiable without a device.
  Deferred to an attended pass.
Stopped deliberately at the point where remaining work is copy-correctness-
or visual-verification-gated, on a live paying app, after a long session.
- NEW-001 MoveKit samples validated (format+quality pass; 2 caveats), then
  PAUSED low-priority per founder; brief ready for revisit.

(Container reset once mid-session at ~commit a2cc7f3; recovered by
fast-forward to origin per the handoff note. Nothing lost.)

## "Build all you can of the free updates" — what's left and why it waits
After the safe free items above, the remaining audit items are NOT
unattended-safe and were deliberately NOT built:
- **COMP-022 rest** (OFF write-back consent relocation, scan arrival-choice
  state, miss-vs-unreachable waterfall tagging, one-time consent card):
  privacy-sensitive (data leaving device to Open Food Facts) + scan hot
  path. Attended.
- **COMP-006 methodology page:** makes specific engine claims (2-week
  cooldown, volume matrix, FFM floor); blueprint says founder review
  against the engine is non-negotiable because wrong copy damages trust.
  Verify claims with founder before building.
- **COMP-013 plan reveal:** animation/labour-illusion sequence + a
  timeCrunch floor code gap; visual, unverifiable unattended.
- **COMP-019 charts/widgets:** Stage 1a (window chips) is OTA-able but
  visual; Stages 2-3 need the native widget/Live-Activity targets.
- **COMP-024 / COMP-026:** coaching-ENGINE algorithm changes (weight
  smoother / step TDEE). CLAUDE.md bars touching the engine without sign-
  off; both need a founder maths gate + shadow mode.
- **COMP-005 recap, COMP-025-A, COMP-030, NEW-002:** large/visual, or
  billing-adjacent (025), or DPO-gated (030, NEW-002).
- **COMP-018 UI follow-ups** (pause/goal/ConsistencyScreen/milestones):
  need a synced pause/goal table + copy review.

PARKED (founder eyes wanted, not blockers):
- COMP-001 step 6 remainder: logged-set cap + 'All sets (N)' expander
  contradicts the blueprint's own above-the-fold screenshot thesis; nav
  maxHeight 40 clamp conflicts with the new 40pt pill sizing; nav-pill
  middle-out truncation helper under-specified. Decide at COMP-001 visual
  review.
- COMP-027 **Part B** (Home TodayStrip reorder): 3-4 day visual rebuild
  with the weigh-in-completion guardrail; needs the founder's eyes on the
  live layout. Part A stands alone and unblocks COMP-029.
- COMP-004 follow-ups: Home TodayStrip tap-through door (waits on Part B);
  dashed goal-band chart overlay (visual polish); State 4 high-confidence
  maintenance (firms up with COMP-026's 90-day window).
- COMP-012/COMP-006: each wants a Welcome/paywall trust line — paywall
  lines are HELD with billing anyway.

DEFERRED (need founder/attended session, not done unattended):
- COMP-008 survey diet: blueprint file is present again, but it changes
  the createWorkout call path and the TIMING of coaching-engine inputs
  (soreness/sleep/energy) - engine-sensitive, do with founder available.
  COMP-015 hard-depends on it.
- COMP-023 + trial-push cascade fix: revenue-relevant (decision 5) but a
  2-2.5 day notification/scheduler/banner build; do attended.
- COMP-029 light theme: needs expo-system-ui install + native rebuild +
  the 122-site zero-visual-diff Phase 0 migration; heavily visual.

COMP-018 streak — BLOCKED on a data source (found while scoping it
2026-06-11). The run-length rule requires knowing whether each PAST
calendar week was an engine-prescribed deload (those count as 'resting',
never 'missed'). `mesocycle_weeks` is keyed by week-index within a
mesocycle, not by calendar week, and only `getCurrentMesocycleWeek`
exists. Without a `getDeloadWeeksInRange(userId, fromMonday, toMonday)`
(or equivalent calendar-week→is_deload mapping), a correctly-deloaded
user would see their run wrongly lapse — the exact delayed-punishment bug
the blueprint is built to avoid. Prereq: add that query (maps mesocycle
start date + week_index → calendar Monday), THEN build the pure
`src/lib/streak.js` + the read-only Progress strip. Pause/goal editor,
ConsistencyScreen 'Your weeks' section, and milestones are a second pass
(need a synced pause/goal table per the blueprint, + founder copy review).

NEXT IN QUEUE (clean, unattended-safe): none remaining that are both
unblocked and non-visual. Everything left needs founder eyes (COMP-027
Part B, COMP-029, COMP-018 UI), a missing data source (COMP-018 deload
history), engine-timing review (COMP-008→COMP-015), billing (COMP-007,
COMP-025-B), or spend (COMP-016, NEW-001). Recommend the next session be
attended for the visual/engine items, or start with the COMP-018 deload
query (pure, testable) as the one remaining non-visual prerequisite.

## 10. COMP-008 → COMP-015 decisions (attended session, 2026-06-11)
Walked with the founder. Binding for the build phase. COMP-008 ships FIRST
(it lays the pre-session capture + schema that COMP-015 reads); COMP-015 builds
on the populated columns afterwards.

### COMP-008 — survey diet + fast check-in (APPROVED to build)
- **Engine soreness input — re-source to PRE-workout.** The post-workout
  adaptive engine (`WorkoutSummaryScreen.js:222`) currently reads
  `feedback.soreness24hBefore` from a post-session rating. After COMP-008 it
  reads the pre-workout soreness answer written to the workout row. Founder's
  reasoning accepted: concurrent capture is more accurate than tired
  retrospective recall; no engine signal is lost, the input just arrives from a
  better capture point. This is the ONLY engine-input change in COMP-008.
- **Weekly sleep write — KEEP, sourced pre-session.** The weekly recovery
  record still receives a sleep value, now from the most recent session's
  pre-workout `sleepQuality`. The weekly coach's available inputs are unchanged.
- **Schema — APPROVED.** Add nullable `sleep_quality` and `energy_score` to the
  `workouts` table (reuse existing `soreness_24h_before`, no re-add). New LOCAL
  SQLite migration version + matching SUPABASE migration file, both columns
  wired into `rowToCamel` + the sync column lists. Per docs/rules/supabase.md:
  migration FILES only — NOTHING is run against production; the founder applies.
- Post-workout block becomes 4 rows + notes (difficulty, pump, joint, fatigue),
  not 3 — `fatigueLevel` stays (read by getRecentWorkoutFeedback/buildCoachBrief).
  Pre-workout chips optional; Skip starts the session instantly, no confirmation.

### COMP-015 — visible per-muscle session autoregulation (APPROVED to build)
- **Scope — DROPS + ADDS, as specified.** Full blueprint rule matrix R0–R6:
  −1 set on a still-sore/recovering muscle (R2); +1 set on an under-stimulated,
  well-recovered muscle (R4). Adds hard-capped at +1/muscle/week from the
  session layer and blocked under weekly 'reduce'/deload/safety hold. Drops
  always allowed (safety right-of-way). Session-scoped only: ±1 set, max 2
  adjusted exercises/session, clamped [mev, mrv], floor 1 set, NEVER written to
  routines/planned volume/mesocycle (preserves the 2026-05-28 decision).
- **Rollout — BUILD LIVE DIRECTLY.** No shadow-mode warm-up. Relies on the
  pure/fuzz/golden test coverage + the caps. Coverage telemetry
  (`session_adjustment_shown`, target 15–30%) still ships for monitoring.
- **Copy — REVIEW AT PR.** Build with blueprint copy as written (§4.4/§4.5);
  founder signs off exact strings at PR. Consistent with the copy-in-principle
  decision.
- Determinism is mandatory (no LLM/AI/randomness; caller passes `now`). Engine
  boundary honoured. ED safety system not touched. Line-3 coaching slot
  confirmed present (`ActiveWorkoutScreen.js:1535`, "stalled advice > coach
  reason" priority) — COMP-015 inserts session adjustment at the top of it.
- Stale comment noted, NOT fixed here: `WorkoutSummaryScreen.js:362` references
  an "Engine Log on the You tab" that does not exist.

## 11. COMP-006 methodology page — claims verified against engine (2026-06-11)
Walked with the founder. The page publishes claims about how the engine works,
so every claim was checked against source before approval (blueprint Risk 1).

**Verified ACCURATE (publish as-is):**
- Two-week calorie cooldown — `weeklyCoach.js:662` (`lastCalAdjustmentWeeksAgo
  >= 2`). True for normal adjustments.
- FFM floor = 30 kcal/kg fat-free mass — `nutritionEngine.js:119`
  (`FFM_FLOOR_KCAL_PER_KG = 30`), sourced from Mountjoy 2014/2023 IOC RED-S
  consensus (`weeklyCoach.js:761`). True.

**CORRECTIONS REQUIRED before build (blueprint copy was wrong/incomplete):**
- **Volume range is −2 to +3 sets, NOT "1 to 3".** `weeklyCoach.js:169`
  `volumeDelta: -2|-1|0|1|2|3`. The §4.4 Example 4 copy understated the drop
  side (a recovery cut removes up to 2 sets; −2 is the deload path). Page copy
  must say "removes up to 2 sets or adds up to 3", reviewed at PR.
- **Cooldown has a safety exception.** `weeklyCoach.js:292`: rapid weight loss +
  low energy RAISES calories immediately, bypassing the two-week rule. The page
  must carve this out — and it is a better story ("safety can raise your
  calories sooner than the two-week rule"). An absolute "changes at most once
  every two weeks" claim would break trust the first time safety overrides it.

**Floor-disclosure decision — FFM exact + absolute qualitative.** The page
states the FFM floor figure (30 kcal/kg fat-free mass, already shown in-app to
affected users) but describes the absolute floor qualitatively ("there is also
a fixed minimum below which we never suggest cutting") WITHOUT printing the
exact 1,500/1,200 numbers — especially on the PUBLIC web page — to avoid handing
a pro-ana visitor a precise target. The absolute floor lives at
`nutritionEngine.js:616` (1,500 male / 1,200 female); it is a sacred ED-safety
number per CLAUDE.md.

**Terminology:** use "fat-free mass" (matches the engine's own reason strings
and the RED-S literature), not "lean mass", throughout the page copy.

**No engine code changes.** COMP-006 is a new static screen + web page + two
nav links; `weeklyCoach.js` / `whyThisTemplates.js` are NOT modified. Copy
reviewed at PR (locked copy-in-principle approach).

## 12. COMP-024 cycle-robust weight smoothing — engine maths gate (2026-06-11)
Walked with the founder. Touches the coaching engine maths AND the ED-safety
seam, so this is a maths-gate decision. Code facts verified: two distinct EWMAs
(`nutritionEngine.js:171` fast ~0.28 display; `weeklyCoach.js:36` slow 0.1
coaching+safety); `RAPID_LOSS_PCT_PER_WEEK = -1.5` (`edPatternDetector.js:30`);
`cycleOverride` action-hold seam (`weeklyCoach.js:510/648/654/900/1085`).

- **Algorithm — Candidate A (asymmetric Huber-clamped robust-innovation EWMA).**
  Damps upward water-weight spikes, lets downward (loss) innovations pass
  through. Keeps alpha=0.1 memory (no blanket lag). One clamp line + a MAD
  helper. Candidate B (median prefilter) / C (dual-EWMA blend) NOT chosen.
- **Scope — UNIVERSAL (all users), no bioSex branch.** Water-weight noise is
  universal; avoids special-category inference, no medical claim, framed as
  "water weight" never "cycle". The bioSex-conditioned alternative is rejected.
- **Safety design — APPROVED.** Three-lock guard: (1) asymmetric clamp
  (downward losses undamped); (2) the rapid-loss/ED detectors read their OWN
  less-damped `safetyTrendPct`, and safety WINS any −1.5% disagreement; (3) F4
  hard-gate test (synthetic −1.8%/wk must still fire `rapidLossOverride` +
  ED-flag) becomes a permanent blocking engine-invariant. Calorie floors and the
  −1.5% threshold untouched. `edPatternDetector.js` thresholds untouched.
- **Constants — APPROVED as shadow starting point** (k≈1.5, alpha=0.1, MAD
  window N≈14, scale floor 0.25 kg, downward knee 4·s); re-tuned after the
  founder reviews real shadow divergence before any default flip.
- **Rollout — SHADOW MODE MANDATORY** (blueprint requirement given the safety
  seam): land behind a default-OFF flag, compute both trends, emit a no-PII
  `weight_trend_shadow_divergence` telemetry event, promote consumers one at a
  time (display/BodyMetrics first, never the safety series), founder reviews
  divergence before any default change.
- **The manual `cycleOverride` flag STAYS** — complementary, not replaced.
  Smoothing fixes the trend READING; `cycleOverride` HOLDS calorie decisions.
  Do not delete or auto-set it. ED safety system not modified.

## 13. COMP-026 step-informed TDEE — engine maths gate (2026-06-11)
Walked with the founder. Coaching-engine maths change; maths gate. Verified the
blueprint's load-bearing claims against source:
- **Dormant adaptive-TDEE resize CONFIRMED dead in production.** The live caller
  `CoachOutputScreen.js:997` fetches only `getMorningWeightsLast14Days` (14d);
  `nutritionEngine.js:290` `weeks = floor(ewmaData.length / 7)` ≤ 2;
  `nutritionEngine.js:313` `confidence = weeks >= 4 ? 'high'...`; so
  `weeklyCoach.js:701` `useAdaptiveCal = confidence === 'high'` is NEVER true.
  Today every calorie change uses blunt fixed ±100/125/150 steps. The 50%
  damping COMP-026 parameterises is the literal `* 0.5` at `nutritionEngine.js:309`.

COMP-026 is therefore TWO coupled engine-maths changes:
- **(A) Activate the dormant adaptive-TDEE resize** — widen the weight window to
  ~42 days (via `getMorningWeights(userId, limit)`) + make `weeks` date-span-
  based not row-count-based (so same-day weigh-ins can't inflate confidence).
  This turns on adaptive calorie SIZING (from real energy balance) for users
  with ≥4 weeks of weight, replacing the blunt fixed steps. The bigger change.
- **(B) Step-trend modifier** layered on top: update gain 0.50 → max 0.65, ONLY
  when a sustained step shift AGREES with the weight-trend discrepancy direction.
  Steps never produce/size/reverse an adjustment and are NEVER given a kcal
  value. Bounded ×1.3 on an already-damped, ±5%-capped, FFM-floor-clamped number.

**Decisions:**
- **Approach — BOTH TOGETHER, shadowed jointly.** Activate (A) and add (B) in one
  shadow phase, reviewed together before enable. (Founder chose this over
  sequencing; accept that shadow review must look at (A) and (B) jointly.)
- **Design + constants — APPROVED as shadow starting point.** Mechanism as
  specified; constants 1,500-step delta / 0.20 ratio / 4,000 floor / 1,000
  persistence / 0.65 cap / 10-of-14 + 14-of-28 day gates. Re-tuned after founder
  reviews shadow activation-rate (target 10–25% of runs) + gain distribution
  before the enable flip (`STEP_TDEE_GAIN_ENABLED`).
- **Safety — all interlocks stay SENIOR and verified:** FFM floor (after
  damping), rapid-loss upward-only override, `cycleOverride`/`scoffPositive`
  hold, ED-pattern lockout, ±5% weekly cap, absolute 1,200/1,500 floors. The
  "moving less" line is SUPPRESSED whenever a wellbeing/ED flag is open.
- **Rollout — SHADOW MODE (one full release)** with no-PII
  `step_tdee_modifier_evaluated` telemetry (needs a server CHECK migration —
  STAGING only per DB rules), then a constant flip. No schema change to
  `daily_steps`. Display surface is COMP-004's trend card (shipped).
- Mention-only (pre-existing, not fixed here): the dead `useAdaptiveCal` path
  predates this work; `weeklyCoach.js:676` comment says "~4 weeks" but the
  production caller supplies 14 days.

## Build log — engine-cluster build session (2026-06-11, after §10–13)
The §10–13 decisions were built. All on `claude/main-branch-content-update-dcqicf`,
each commit lint-clean with the full suite green. Final baseline after the
session: **0 errors, 4 pre-existing warnings, 207 suites / 3240 tests
(3237 pass, 3 skip)**.

- **COMP-008 survey diet + Fast Check-In** — SHIPPED per §10.
  - e6461f3 schema + sync: nullable `sleep_quality` + `energy_score` on
    `workouts` (soreness_24h_before reused, not re-added). Local SQLite
    migration (additive, nullable, benign-duplicate-tolerant) + matching
    `supabase/migrate_072_workouts_readiness_columns.sql`; both wired into
    rowToCamel + sync column lists. MIGRATION FILES ONLY — server side pending
    founder apply.
  - 0124047 capture pre-workout readiness (soreness/sleep/energy chips) on the
    intent prompt; Skip starts the session instantly with NULLs.
  - 74ecc12 trim post-workout block + re-source soreness to the pre-workout
    answer and the weekly sleep write to the most recent session's pre-workout
    `sleepQuality` (the only engine-input change, per §10). `fatigueLevel`
    kept.
  - 0651d9b condensed weekly Fast Check-In.
- **COMP-015 visible session autoregulation** — SHIPPED LIVE (no shadow) per §10.
  - 9510adb Stage 1: pure session-autoregulation engine + tests, no wiring
    (R0–R6 matrix, ±1 set, max 2 exercises/session, clamp [mev,mrv], floor 1,
    adds blocked under reduce/deload/safety, deterministic — caller passes
    `now`).
  - b11a2c7 Stage 2: read helper + pure input assembler.
  - ff02b18 Stage 3: run engine at session start, log events (Pro, no UI yet).
  - 37c8ad3 Stage 4+5: visible surfaces (top of the line-3 coaching slot at
    ActiveWorkoutScreen.js:1535) + per-exercise revert + `session_adjustment_shown`
    telemetry (target 15–30%). Engine boundary + ED safety untouched; nothing
    written to routines/planned volume/mesocycle.
- **COMP-006 methodology page** — SHIPPED with the §11 corrections baked in.
  - 50e1fbd MethodologyScreen + navigation + You-tab row.
  - 640b0f0 methodology receipts on coach output.
  - d5496dd identity line on Welcome.
  - a6306ce `methodology_opened` telemetry (server allow-list:
    `supabase/migrate_074_methodology_telemetry.sql`).
  - §11 corrections applied: volume range stated as "removes up to 2 / adds up
    to 3"; cooldown safety-exception carve-out present; FFM floor 30 kcal/kg
    published, absolute 1,200/1,500 floor kept QUALITATIVE (no exact numbers on
    the public page); "fat-free mass" wording throughout. No engine code
    modified.
- **COMP-005 monthly/block recap** — SHIPPED.
  - 9b3ccd9 fix tonnageDelta (block-progress) projection bug.
  - 974f83e getRecapData window-bounded aggregates.
  - 123e61b month + block recap story variants.
  - edd75e1 Recaps tile + ephemeral recap card.
  - 7a0c5b1 monthly recap notification + deep link.
  - 87d96f8 block-end recap entry points.
  - d792b6e `recap_opened` telemetry (server allow-list:
    `supabase/migrate_075_recap_telemetry.sql`).
- **COMP-009 account snapshots + cross-account guard** — SHIPPED; §4b
  "careful reorder" decision is DONE.
  - 688465c (commits 1+2) pre-migration SQLite snapshots.
  - 2e7a98e Snapshots restore screen + settings entry.
  - 59caa6e cross-account sign-in Keep/Switch modal: the modal is gated AHEAD
    of the optimistic restore. Keep signs out WITHOUT wiping; Switch snapshots
    THEN wipes. (This re-litigated nothing — it is the careful-reorder option
    the founder confirmed.)

### Carry-forwards from this session (NOT blockers)
- **Server migrations pending the founder's manual apply** (per
  docs/rules/supabase.md — Claude ran nothing against prod): `migrate_072`
  (workouts readiness cols), `migrate_073` (session_adjustment telemetry
  allow-list), `migrate_074` (methodology telemetry), `migrate_075` (recap
  telemetry). The local SQLite half of 072 ships with the app automatically;
  the COMP-015/006/005 telemetry no-ops server-side until the allow-list
  migrations are applied.
- **Copy gate still open** for COMP-005 / COMP-006 / COMP-015 user-facing
  strings — built with blueprint copy as written (§8 copy-in-principle);
  founder signs off exact strings at PR before any merge to main.

### Next unbuilt by priority
- **COMP-013 plan reveal moment (3.5)** — honest staged "Building your plan"
  sequence + a 15-minute starter session as the first post-reveal action.
  Visual; blueprint flags a `timeCrunch` floor code gap to resolve. Read the
  blueprint + ground its claims, then plan before building.
- **COMP-007 paywall (4.0)** — BLOCKED on collecting real reviews first; billing
  held regardless.
- Everything else unchanged: COMP-023 (trial moment + cascade-wipe fix),
  COMP-024 / COMP-026 (engine shadow builds), COMP-019, COMP-027 Part B,
  COMP-029, COMP-030, NEW-002.

---

## SESSION 2 BUILD LOG (2026-06-11) — COMP-013 / 023 / 019-1a

All on `claude/main-branch-content-update-dcqicf`, each unit lint-clean + full
suite green, each item closed with a finder/verify review pass and a "review
fixes" commit. Baseline at session end: **209 suites / 3288 tests** (3285 pass,
3 skip), 0 errors, 4 pre-existing warnings.

### COMP-013 — plan reveal moment + 15-min starter (commits 1–7)
- c1 `applyTimeCrunch` optional starter arg `{maxSetsPerExercise, maxExercises}`
  — off by default (every existing caller byte-identical); deterministic
  first-N-in-plan-order + set cap. Pure-engine, tested.
- c2 staged "Building your plan" sequence in ProOnboarding (4 honest stage lines
  mapped to real `_generatePlanInner` phases, 3.2s min display, Reduce-Motion
  skip, abort-on-failure).
- c3 reveal receipt line (`getSetupReceiptLine`) + week view open-by-default.
- c4 15-min starter session in ActiveWorkout (`starterSession` route param;
  reuses time-crunch snapshot/revert; visible banner).
- c5 Home hero first-run variant; retires the standalone first-run cue row;
  `first_session_choice` telemetry + **migrate_076**.
- c6 first-session line on WorkoutSummary, gated on first session ever,
  suppressed under calm / open ED flag.
- c7 review fixes: starter banner now names the real routine (route param, not
  the nameless workout row); index-based starter mapping (no duplicate-name
  collisions); starter keeps first N in plan order (bypasses isolation drop);
  plan-fail navigates to ProSetupComplete (no form-strand); double-submit guard;
  `!initialLoading` hero guard; WorkoutSummary `Promise.all`.
- **Founder decisions:** build all four parts now (incl. the starter against the
  CURRENT Home hero, ahead of COMP-027 Part B — reconcile later); copy ships as
  blueprint copy, reviewed at PR.

### COMP-023 — day-3 trial value moment (commits 1–4)
- c1 pure `src/lib/trialActivation.js` — `firstReviewUnlockDate` (midnight-safe
  so the named day is open at any hour), `selectTrialVariant` (S1/S2/S3), copy
  builders. `FIRST_CHECKIN_MIN_DAYS`/`MIN_WEIGH_INS` moved here as the single
  source of truth; `WeeklyCheckInScreen` imports them back. Gate-parity invariant
  test included.
- c2 `scheduleTrialDay3Notification` (trial start + 3d, 10:00, quiet-hours-shifted,
  ED-suppressed) + categories/route/cascade wiring. **Adjacent fix:**
  `restoreNotifications` now re-lays cascade-gate + day-3 pushes (previously wiped
  on every launch).
- c3 Home value-countdown banner at 2nd priority (coach > trial > deload > phase),
  ED-neutral fallback, retires on first review.
- c4 review fixes.
- **Founder decisions:** fix the cascade-gate-wipe bug in this PR; the one
  `cascade.js` schedule line is OK (not billing logic). No new telemetry event.

### COMP-019 Stage 1a — chart windows + takeaway (commits 1–4)
- c1 pure `src/lib/chartWindows.js` (windows, date filter, widen-on-sparse,
  takeaway builders) + 14 tests.
- c2 weight chart: `WindowChips` shared component, date windows, EWMA takeaway
  (rate-of-change suppressed under calm/ED); `chart_window_changed` telemetry +
  **migrate_077**.
- c3 e1RM + volume charts (e1RM uncaps sessions for the chart but keeps the last-8
  history list/best; volume trend gains its own window).
- c4 review fixes: telemetry was firing with `userId=null` (dropped by
  `postEvent`) — now passes the real id; volume takeaway no longer mislabels a
  rest week as "All N weeks".
- **Founder decisions:** build all three charts now; add the telemetry + migration.
- **Open visual notes:** Stage 1a is visual (needs on-device eyes); volume trend
  defaults to `4W` not the blueprint's `3M` (flip if preferred).

### Carry-forwards from session 2 (NOT blockers)
- Server migrations **`076`** (first_session_choice) + **`077`** (chart_window_changed)
  join `072`–`075` pending the founder's manual apply. Those events no-op
  server-side until applied; local app unaffected.
- Copy gate now also covers COMP-013 / 023 / 019 user-facing strings.
- COMP-013's hero first-run variant must be reconciled when COMP-027 Part B
  reorders Home.
