# START HERE — next session entry point

Written 2026-06-11 at the end of a long build session, as the single clean
hand-off. Read this first. Two companion docs hold the detail:
- `_FOUNDER-DECISIONS-2026-06-11.md` — every founder decision + the full
  per-commit build log (authoritative for "what was decided / shipped").
- `_SESSION-HANDOFF.md` — the index of what the competitive audit produced
  (the 28 blueprints + gap reports).

---

## UPDATE 2026-06-11 (session 3 — COMP-019-1b / 018 / 022 SHIPPED) — READ THIS FIRST

A third build session shipped three more items on
`claude/main-branch-content-update-dcqicf`, each lint-clean, full suite green,
and reviewed (a finder/verify pass + a "review fixes" commit each):

- **COMP-019 Stage 1b** — interactive charts (6 commits). New
  `src/components/VolyumeChart.js`: a tap-and-hold **scrub** (crosshair +
  tooltip, per-point selection haptic, Reduce-Motion-safe, screen-reader
  announce) on the weight + e1RM line charts, plus a **bar variant** wired into
  the per-muscle volume rows (`MuscleTrendRow`). `nearestPointIndex` added to
  `chartGeometry.js` (tested). **Deliberate deviation:** rendered via the
  existing SVG engine, NOT Skia — the chart is static during a scrub so Skia
  bought no user-visible benefit while adding font/canvas risk I couldn't verify
  blind; keeps ONE chart engine, swappable to Skia later behind the same API.
  Flagged for founder review.
- **COMP-018** — shame-free weekly consistency streak v1 (6 commits). Completes
  the v0 (which shipped the pure state machine + Progress strip): new
  `src/lib/streakState.js` (AsyncStorage: pause spans, manual goal, high-water
  run, milestones-seen; 14 tests), the **ConsistencyScreen "Your weeks"**
  section (12-week CVD-safe glyph strip, Longest run, **Pause** sheet,
  manual-goal editor), **milestones** (4/12/26/52 in-app + ShareCard at
  12/26/52), 3 telemetry events (**migrate_078**). Hidden entirely under
  ED/wellbeing suppression. **Review caught a real blueprint violation:** a plan
  was auto-raising the user's manual goal — now the lower of plan-vs-goal wins
  (§4.1). **Unblocks the COMP-019 consistency widget + NEW-002 partners** (both
  consume this streak object; v1 is AsyncStorage — NEW-002 needs it moved to a
  synced table).
- **COMP-022** — barcode-miss chain visual layer (4 commits). Completes the two
  earlier slices: ScanLabel **arrival choice card** (scan-the-label / type-it-in,
  honest online-vs-offline copy via a NetInfo pre-check — no scan-hot-path
  change), a **persistent "Type it in" escape** during capture (the mid-capture
  dead-end), a **duplicate-barcode banner** on AddCustomFood, and a **one-time
  Diary OFF-consent card** after a first completed heal chain. `from:'scan_manual'`
  telemetry tag added. No new deps, no migration.

**Health baseline is now: 0 errors, 4 pre-existing warnings, 210 suites / 3311
tests (3308 pass, 3 skip).** Fewer suites or more warnings = a regression.

**CARRY-FORWARDS (not blockers; pending the founder):**
1. **Server migrations `072`–`078` pending manual apply** (founder applies, per
   docs/rules/supabase.md). `078` (COMP-018 streak telemetry: streak_week_resolved
   / streak_milestone_reached / streak_paused) is new this session. All such
   events no-op server-side until applied; the local app is unaffected.
2. **Copy gate now also covers COMP-019-1b / 018 / 022** — all blueprint copy,
   founder reviews exact strings at PR. New copy: the COMP-018 §4.6 set
   (run/milestone/pause), the COMP-022 §4 arrival/banner/consent strings.
3. **COMP-019-1b deferred bits:** the remaining static `SvgLineChart` callers
   (`WeightTrendCard`, `MesocycleBuilder`, `FatigueTrendCard`) can migrate to
   `VolyumeChart` (interactive off) host-by-host whenever — low priority;
   `Sparkline` stays SVG permanently. Also deferred (measurement, scan hot path):
   COMP-022's waterfall miss-vs-unreachable reason tagging + the `local_custom`
   healed-hit telemetry split.
4. **Everything from session 2 still stands:** COMP-013 hero variant to reconcile
   with COMP-027 Part B; COMP-019 volume trend defaults to `4W` not `3M`.
5. **All three features are VISUAL** (charts/scrub/haptics, the ConsistencyScreen
   section + sheets, the food-scan cards) — logic is unit-tested but the look +
   feel need on-device review at PR.

**Where the list stands now:**
- Done across all sessions: COMP-001, 002, 003, 004, 005, 006, 008, 009, 010,
  011, 012, 013, 015, 018 (v1), 019 (1a + 1b), 022 (full), 023, 027-Part-A.
- **Next unbuilt by priority (unattended-safe code):** there is **no large
  unblocked code-only item left** — the remaining work is gated:
  - **COMP-024 / COMP-026 engine shadow builds** — approved (§12/§13) but
    **ATTENDED + shadow-mode mandatory** (engine/safety seam, founder maths gate).
  - **COMP-019 Stage 2 (widgets)** — **2 new deps + native targets + EAS signing
    + founder approval**, not OTA. Stage 3 (Live Activity) needs Stage 2's target.
  - **COMP-020 Apple Watch** — native, starts after COMP-001 ships.
  - **COMP-007 paywall** — BLOCKED on real reviews; billing held.
  - **COMP-027 Part B** (Home reorder) / **COMP-029** (light theme) — on-device
    eyes / dep approval. **COMP-030** (quiz-first) / **NEW-002** (partners) —
    DPO/legal gate. **NEW-001** (exercise media) — research-first gate.
    **COMP-016** (UK food layer) — a data-ops programme, not a code sprint.
  - **Small code-only leftovers:** the COMP-019-1b static-chart migrations
    (cosmetic) and COMP-025-A cancellation-reason capture (no billing files,
    not held) are the only unattended bits remaining.

---

## UPDATE 2026-06-11 (session 2 — COMP-013 / 023 / 019-1a SHIPPED) — READ THIS FIRST

A second build session shipped three more items, all on
`claude/main-branch-content-update-dcqicf`, each lint-clean with the full suite
green and reviewed (a finder/verify pass per item; fixes folded in as a final
"review fixes" commit each):

- **COMP-013** plan reveal moment + 15-minute starter (7 commits). `applyTimeCrunch`
  gained an optional starter-trim arg (`{maxSetsPerExercise, maxExercises}`, off by
  default); a staged "Building your plan" sequence in ProOnboarding (Reduce-Motion
  skips it; a failed generation aborts to ProSetupComplete, no celebratory hold); a
  reveal receipt line + week-view-open-by-default; a true-subset 15-min starter session
  (ActiveWorkout `starterSession` route param, reuses the time-crunch machinery,
  index-based mapping); a Home hero first-run variant (retires the old standalone cue
  row); a first-session line on the summary (suppressed under calm/ED). Telemetry
  `first_session_choice` (**migrate_076**).
- **COMP-023** day-3 trial value moment (4 commits). New pure `src/lib/trialActivation.js`
  (variant S1/S2/S3 + the unlock-date maths) with a **gate-parity invariant test** so the
  promised date can never disagree with the check-in gate; `FIRST_CHECKIN_MIN_DAYS` /
  `MIN_WEIGH_INS` now live there as the single source of truth and `WeeklyCheckInScreen`
  imports them back. One day-3 push + one Home banner (2nd priority in the single-banner
  stack, ED-neutral fallback). No new telemetry event (uses the existing allowlist).
  **Adjacent fix (founder-approved):** `restoreNotifications` now re-lays the cascade-gate
  (day 12/14) AND the day-3 pushes — they were silently wiped on every app launch before.
  Touched `cascade.js` (one fire-and-forget schedule line, founder-approved, no billing
  logic).
- **COMP-019 Stage 1a** charts (4 commits): window chips + recomputed takeaway. New pure
  `src/lib/chartWindows.js` + shared `src/components/WindowChips.js`; the weight, e1RM and
  volume hero charts now window by DATE (not count) with a one-line takeaway (average +
  first-to-last delta). Weight suppresses rate-of-change under calm/ED. Telemetry
  `chart_window_changed` (**migrate_077**). The review caught — and fixed — that the
  telemetry was firing with `userId=null` (dropped by `postEvent`); now live.

**Health baseline is now: 0 errors, 4 pre-existing warnings, 209 suites / 3288 tests
(3285 pass, 3 skip).** (Up from 207/3240.) Fewer suites or more warnings = a regression.

**CARRY-FORWARDS (not blockers; pending the founder):**
1. **Server migrations `072`–`077` pending manual apply** (founder applies, per
   docs/rules/supabase.md — nothing run against prod by Claude). New this session:
   `076` (first_session_choice), `077` (chart_window_changed). Those two events silently
   no-op server-side until applied; the local app is unaffected.
2. **Copy gate now spans COMP-005 / 006 / 015 (prior) + COMP-013 / 023 / 019 (this
   session)** — all built with blueprint copy as written; founder reviews exact strings at
   PR before merge to main. New copy to eyeball: the COMP-013 receipt/stage/starter
   strings, the COMP-023 push/banner strings, and the COMP-019 takeaway sentences.
3. **COMP-013's Home hero first-run variant was built against the CURRENT hero.**
   COMP-027 Part B rebuilds that hero — reconcile the variant when Part B lands (the §4c
   coupling the blueprint flagged; founder chose to build now anyway).
4. **COMP-019 volume trend defaults to `4W`** (blueprint specced `3M`) to avoid cramped
   week-bars — a one-line flip if the founder prefers 3M. **COMP-019 Stage 1a is visual**
   across three screens: logic is unit-tested, layout needs on-device eyes.

**Where the list stands now:**
- Done across all sessions: COMP-001, 002, 003, 004, 005, 006, 008, 009, 010, 011, 012,
  013, 015, 018-v0, 019-1a, 022 (2 slices), 023, 027-Part-A.
- **Next unbuilt by priority:**
  - **COMP-019 Stage 1b** — `VolyumeChart` on Skia (already-shipped dep) + tap-and-hold
    scrub with haptic ticks. Option A (hand-rolled on the existing Skia + chartGeometry.js,
    **no new deps**), OTA-patchable; migrate hosts one at a time. Cleanest next code-only
    slice.
  - **COMP-024 / COMP-026 engine shadow builds** — decision-approved (§12/§13) but
    **ATTENDED + shadow-mode mandatory**; they touch the engine/safety seam (founder maths
    gate). Do NOT start unattended.
  - **COMP-019 Stage 2 (widgets)** — needs **2 new deps + native targets + EAS signing +
    founder approval**, NOT OTA-patchable. Stage 3 (Live Activity re-enable + the
    set-index fix) needs Stage 2's iOS target.
  - **COMP-007 paywall (4.0)** — BLOCKED on collecting real reviews; billing held regardless.
  - **COMP-027 Part B** (Home hero reorder) + **COMP-029** (light theme) — need on-device
    eyes. **COMP-030** (quiz-first) + **NEW-002** (partners) — DPO/legal gate.
    **NEW-001** (exercise media) — research-first gate.

---

## UPDATE 2026-06-11 (build session — engine cluster SHIPPED) — READ THIS FIRST

The attended decisions below (§10–13) were then BUILT. Shipped this session, all
on `claude/main-branch-content-update-dcqicf`, each lint-clean with the full
suite green:

- **COMP-008** survey diet + Fast Check-In (4 commits: e6461f3, 0124047,
  74ecc12, 0651d9b). Pre-workout readiness capture (soreness/sleep/energy) on the
  intent prompt; soreness + weekly sleep re-sourced PRE-session per §10;
  post-workout block trimmed; condensed weekly Fast Check-In. Schema: nullable
  `sleep_quality` + `energy_score` on `workouts` (local SQLite migration +
  `supabase/migrate_072_workouts_readiness_columns.sql`).
- **COMP-015** visible per-muscle session autoregulation (4 commits: 9510adb,
  b11a2c7, ff02b18, 37c8ad3). Built LIVE (no shadow) per §10: pure engine +
  tests, read helper + input assembler, run-at-session-start (Pro), then visible
  surfaces + revert + `session_adjustment_shown` telemetry. ±1 set, max 2
  exercises/session, clamped [mev,mrv], never written to routines. Engine
  boundary + ED safety untouched.
- **COMP-006** methodology page (4 commits: 50e1fbd, 640b0f0, d5496dd, a6306ce).
  MethodologyScreen + nav + You-tab row, methodology receipts on coach output,
  identity line on Welcome, `methodology_opened` telemetry. The §11 corrections
  are baked in (−2..+3 volume range; cooldown safety-exception carve-out; FFM
  floor figure published, absolute floor kept qualitative; "fat-free mass"
  wording). No engine code changed.
- **COMP-005** monthly/block recap (8 commits: 9b3ccd9 → d792b6e). Fixed a
  tonnageDelta projection bug, window-bounded getRecapData aggregates, month +
  block story variants, Recaps tile + ephemeral card, monthly notification +
  deep link, block-end entry points, `recap_opened` telemetry.
- **COMP-009** account snapshots + cross-account guard (3 commits: 688465c,
  2e7a98e, 59caa6e). Pre-migration SQLite snapshots, Snapshots restore screen +
  settings entry, and the Keep/Switch modal gated AHEAD of the optimistic restore
  on cross-account sign-in (Keep signs out without wiping; Switch snapshots then
  wipes). **§4b "careful reorder" is DONE — do not re-open.**

**Health baseline is now: 0 errors, 4 pre-existing warnings, 207 suites /
3240 tests (3237 pass, 3 skip).** (Up from 204/3159.) If you see fewer suites or
more warnings, something regressed.

**TWO carry-forwards from this session (NOT blockers, but pending the founder):**
1. **Server migrations pending manual apply (founder applies, per
   docs/rules/supabase.md — nothing run against prod by Claude):**
   `migrate_072` (workouts readiness columns), `migrate_073`
   (session_adjustment telemetry allow-list), `migrate_074` (methodology
   telemetry), `migrate_075` (recap telemetry). The LOCAL SQLite side of 072
   ships automatically with the app on device upgrade; the SERVER files wait.
   Telemetry for COMP-015/006/005 silently no-ops on the server until applied.
2. **User-facing copy across COMP-005 / COMP-006 / COMP-015 is still behind the
   founder copy gate** — built with blueprint copy as written (copy-in-principle,
   §8); founder reviews exact strings at PR before merge to main.

**Where the list stands now:**
- Done across both sessions: COMP-001, 002, 003, 004, 005, 006, 008, 009, 010,
  011, 012, 015, 018-v0, 022 (2 slices), 027-Part-A.
- **Next unbuilt by priority: COMP-013 plan reveal moment (3.5)** — honest staged
  "Building your plan" sequence + a 15-minute starter session as the first action
  after the reveal. Visual; the blueprint also flags a `timeCrunch` floor code
  gap. Read its blueprint + ground claims, then plan.
- COMP-007 paywall (4.0) stays BLOCKED on collecting real reviews first (and
  billing is held anyway).
- The rest of §4 below (COMP-023 trial moment + cascade fix, COMP-024/026 engine
  shadow builds, COMP-019, COMP-027-B, COMP-029, COMP-030, NEW-002) is unchanged.

---

## UPDATE 2026-06-11 (attended decisions session) — READ THIS

An attended "walk the questionnaire" session locked the engine-gated cluster.
All decisions are in `_FOUNDER-DECISIONS-2026-06-11.md` **sections 10–13**
(authoritative). No code was written — these are build-ready decisions:

- **§10 COMP-008 → COMP-015** APPROVED to build. COMP-008 first (pre-workout
  soreness feeds the engine; weekly sleep write kept pre-session; schema
  approved, migration files only — nothing run against prod). COMP-015 full
  drops+adds, build live, copy at PR.
- **§11 COMP-006** methodology claims verified; 3 corrections required before
  build (volume range is −2..+3 not "1 to 3"; cooldown has a safety exception;
  publish FFM floor figure but keep the absolute 1,200/1,500 floor qualitative).
- **§12 COMP-024** cycle-robust smoothing: Candidate A, universal, safety design
  approved, constants as shadow start. **Shadow mode mandatory.**
- **§13 COMP-026** step-TDEE: activate the dormant adaptive-TDEE resize + the
  step modifier, BOTH shadowed jointly; design+constants approved as shadow
  start. Found + confirmed the adaptive resize is dead in production today.

**Still open (next attended session):** the DPO cluster — **COMP-030 quiz-first**
(IDENTITY_AND_OWNERSHIP + ONBOARDING_SEQUENCE locked-doc amendments + DPO Q1–Q7)
and **NEW-002 training partners** (partnership tables → RLS + DPO; free/Pro
already decided: fully free). Also still pending: the `@bacons/expo-apple-targets`
issue-#175 spike, and NEW-001 Phase 0 £0 sourcing.

Build-order note: COMP-024 + COMP-026 both touch the engine/safety seam and are
shadow-gated; COMP-008 is the COMP-015 prerequisite. Suggested first build when
attended: COMP-008 (clean, well-specified, unblocks COMP-015).

---

## 1. Where the code is

- **Branch:** `claude/main-branch-content-update-dcqicf` (NOT main — CLAUDE.md
  forbids touching main). Everything below is committed and pushed there.
- **Recovery if the container resets:** the container reset twice during this
  work and rolled local back to an old ancestor. The fix is always:
  `git fetch origin claude/main-branch-content-update-dcqicf` then
  `git merge --ff-only origin/claude/main-branch-content-update-dcqicf`.
  Nothing is ever lost — the remote is the source of truth. Commit and push
  each unit of work the moment it is green.
- **Health gate:** `npm run lint && npm test` after every change. Current
  baseline = **0 errors, 4 pre-existing warnings**, **204 suites / 3159
  tests pass**. If you see more than 4 warnings, you added one.

## 2. Shipped this session (all green, all pushed)

Quick wins + the mandate + the safe slices:
- **COMP-003** quick add from every meal card.
- **COMP-001** workout-screen redesign, steps 1–5 + telemetry + compact rest
  timer. Step 6 CLOSED (founder dropped the logged-set cap).
- **COMP-011** cardio "already counted" explainer (3 surfaces).
- **COMP-002** meal-slot memory ("Add again" tab, `food_slot_recents`).
- **COMP-027 Part A** colour grammar: `stateColors` aliases, the
  founder-approved `warning` retune (#FFC107 → #F0E442 Okabe-Ito), 3 Class
  B/C migrations. Part B (Home TodayStrip reorder) PARKED.
- **COMP-004** "Your trend" weight card on Progress (states 0–3).
- **COMP-018 v0** "weeks running" strip on Progress + the new
  `getDeloadWeeksInRange` query + pure `streak.js`.
- **COMP-012** Welcome trust row + Play "Your data, plainly" block.
- **COMP-010** visible periodisation (block-shape week dots via the meso chip).
- **COMP-022** two slices: deterministic custom-barcode resolution, and the
  OFF write-back relocated to the confirmed save + healing toast.
- Plus: SKU-id doc fix (`pro_monthly`/`pro_annual` are the live ids), and the
  NEW-001 Phase 0 sourcing brief with the 2 MoveKit samples validated.

## 3. Founder decisions locked (do not re-litigate)

- **Billing: FULLY HELD.** No billing-adjacent files. COMP-007 and COMP-025
  Phase B stay research-only.
- **Spend:** UK food layer (COMP-016) **DROPPED COMPLETELY**. Gym Animations
  $599 **DROPPED** (MoveKit ~$99 is the cheaper lead, but NEW-001 is **PAUSED,
  low priority**). Supabase Pro backup **DEFERRED** (maybe future).
- **Colour:** warning retune to #F0E442 — done.
- **NEW-002 training partners: FULLY FREE** (up to 3 partners, all tiers) when
  built.
- **Copy:** approved in principle — build blueprint copy as written, founder
  reviews at PR; locked-doc amendments still come individually.
- **Trial-notification cascade bug:** fix is folded into COMP-023 (not
  standalone).

## 4. What to do next — recommended order

**A. Highest priority — revenue-relevant, do when attended:**
- **COMP-023 day-3 trial moment + the restoreNotifications cascade-wipe fix.**
  The bug is still live: `restoreNotifications` (scheduler.js, called from
  RootNavigator each launch) wipes ALL scheduled notifications and re-lays
  only morning + check-in, so the day-12/14 trial-ending pushes are destroyed
  and never fire. Trial users can reach day 14 with no warning. ~2–2.5 day
  build (notifications + Home banner + the fix together).

**B. On-device visual pass (needs eyes, not unattended):**
- Confirm the new Progress/Home surfaces render right: COMP-004 trend card,
  COMP-010 block-shape sheet, COMP-018 weeks-running strip, COMP-027 warning
  hue across the app.
- **COMP-027 Part B** (Home TodayStrip reorder) — 3–4 day visual rebuild with
  a weigh-in-completion guardrail.
- **COMP-029 light theme** — deps approved (expo-system-ui); needs the
  122-site zero-visual-diff token migration + native rebuild.

**C. Needs founder/engine review before building:**
- **COMP-008 → COMP-015** (survey-diet timing then autoregulation): changes
  the `createWorkout` call path and the timing of coaching-engine inputs.
- **COMP-006 methodology page:** verify every engine claim (2-week cooldown,
  volume matrix, FFM floor) against `weeklyCoach.js`/`whyThisTemplates.js`
  with the founder before merge.
- **COMP-024 cycle smoothing, COMP-026 step TDEE:** coaching-ENGINE algorithm
  changes — founder maths gate + shadow mode required.
- **COMP-030 quiz-first, NEW-002 partners:** locked-doc amendments + DPO.

**D. Free code-only remainder (can be unattended, but visual/copy-gated):**
- **COMP-022 visual layer:** ScanLabel "fix it once" arrival state +
  offline-vs-miss copy, waterfall miss/unreachable tagging, duplicate-barcode
  banner, one-time Diary OFF-consent card.
- **COMP-019 stage 1a:** window chips + recomputed takeaway on the BodyMetrics
  / ExerciseDetail / VolumeHeatmap charts (3-screen visual change).
- **COMP-018 UI follow-ups:** pause control, manual-goal editor,
  ConsistencyScreen "Your weeks" section, milestones — need a synced
  pause/goal table + copy review.
- **COMP-013 plan reveal, COMP-005 recap** — visual.

## 5. Known caveats carried forward

- **COMP-018 deload gap:** `getDeloadWeeksInRange` infers a deload week from a
  completed workout linked to a deload mesocycle_week. A deload week with
  ZERO sessions can't be detected (no workout to link); a single such week is
  covered by the one-week repair. Fine for realistic 1-week deloads.
- **COMP-004:** State 4 (high-confidence maintenance) firms up once COMP-026's
  90-day window prerequisite lands; the Home tap-through door waits on
  COMP-027 Part B.
- **NEW-001 / MoveKit:** samples passed (muted H.264 1080p loops, consistent
  grey model). Two open questions if revisited: no red muscle-highlight in the
  samples, and a baked light-grey background vs the dark theme. Brief +
  8 vendor questions ready in `gaps/new-001-phase0-demo-sourcing.md`.
