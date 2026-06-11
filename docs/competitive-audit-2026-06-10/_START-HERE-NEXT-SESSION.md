# START HERE — next session entry point

Written 2026-06-11 at the end of a long build session, as the single clean
hand-off. Read this first. Two companion docs hold the detail:
- `_FOUNDER-DECISIONS-2026-06-11.md` — every founder decision + the full
  per-commit build log (authoritative for "what was decided / shipped").
- `_SESSION-HANDOFF.md` — the index of what the competitive audit produced
  (the 28 blueprints + gap reports).

---

## ⏩ RESTART HERE — the next session's first move (written end of session 7)

**Branch:** `claude/main-branch-content-update-dcqicf` (NOT main). Everything
below is committed + pushed there. If the container reset and local is behind:
`git fetch origin claude/main-branch-content-update-dcqicf` then
`git merge --ff-only origin/claude/main-branch-content-update-dcqicf`.

**Health baseline (verify before you start — `npm run lint && npm test`):**
0 errors, 4 pre-existing warnings, **221 suites / 3432 tests** (3429 pass, 3
skip). Fewer suites / more warnings = a regression you introduced.

**Session 7 shipped COMP-026 in full (LIVE, no shadow), 5 commits.** Both the
dormant adaptive-TDEE resize activation (A) AND the step-trend modifier (B).
Real users with 4+ weeks of weight now get energy-balance-sized calorie changes;
a sustained, agreeing step shift speeds the update (gain 0.50→max 0.65), bounded
by every senior safety clamp (proven by new BLOCKING invariants + the full
simulator suite). Surfaces: COMP-004 card line (Progress + Diary), CoachOutput
receipt, COMP-006 methodology section. Telemetry `step_tdee_modifier_evaluated`
+ `migrate_080` (file only, STAGING, founder applies). See impl-COMP-026's
"SHIPPED LIVE — session 7" block + FOUNDER-DECISIONS §14 session-7 log.

**Locked founder decisions from sessions 5–6 — DO NOT re-ask (detail in
FOUNDER-DECISIONS §14):**
- **NO SHADOW MODE, anywhere.** Founder: "I don't have capability to flip
  anything … no shadows. Do them all in full." This OVERRIDES the
  shadow-mandatory gate in §12/§13. Build engine work **live/active** on the
  branch. The real production gate is the founder's eventual PR-merge to main.
- **Dependencies APPROVED (all three):** `expo-system-ui` (COMP-029),
  `react-native-android-widget` + `@bacons/expo-apple-targets` (COMP-019 Stage
  2 / COMP-020). Write the JS/config; the **signed native build runs on the
  founder's EAS** — this cloud container cannot sign or run a device.
- **Billing: still HELD.** Nothing in `src/lib/payments/*`. COMP-007 + COMP-025
  Phase B stay untouched.
- **COMP-004 Home door: "both surfaces"** — host the "Your trend" card on
  Progress AND Diary; the TodayStrip logged-weight cell links to Progress.
- **Hard lines that still bind despite "do it all":** never touch `main`; never
  edit `src/coaching/` safety presentation; never move the 1,200/1,500 calorie
  floors or the −1.5%/wk rapid-loss threshold or `edPatternDetector` thresholds.
  New engine maths routes THROUGH those clamps, never around them.

**Recommended next-step ORDER (all build live, no shadow):**
1. ~~**COMP-026**~~ — **DONE (session 7).** Built live with blocking safety
   invariants + the full simulator suite as the gate. See the session-7 notes.
2. **COMP-004 door** (the remaining piece) — the card now hosts on Progress AND
   Diary (both-surfaces done). What's left is wiring the TodayStrip
   logged-weight cell as the tap-through deep-link to the Progress trend card.
   Pure UI, low risk, quick win — do this FIRST next.
3. **COMP-029 light theme** — `expo-system-ui` + the 122-site token migration
   (JS/config; native rebuild on EAS).
4. **COMP-019 Stage 2 widgets** — JS/config (native build on EAS; the
   `@bacons/expo-apple-targets` issue-#175 spike still applies).
5. **COMP-024 decision-promotion** (the held piece) — only if you first rework
   the smoother so it tracks sustained trends (see the COMP-024 lesson).

**⚠️ THE COMP-024 LESSON (read before COMP-026) — the concrete cost of "no
shadow":** I promoted the cycle-robust trend into the coaching DECISIONS and the
`bulk_aggressive` simulator caught a real regression — the asymmetric
upward-innovation clamp damps *sustained* gains, not just transient water-weight
spikes, so a fast bulk stopped triggering the downward calorie pull. That is
exactly what shadow-divergence review existed to vet. The test harness caught it
instead, and I **held** the decision-promotion (decisions + safety stay on the
plain EWMA). Takeaway for COMP-026: build live, but lean HARD on the
engine-invariant + simulator scenarios as the validation gate, and add a
blocking invariant for every safety interlock the change touches. If a simulator
scenario regresses, that is a real finding — hold that piece, don't force it.

---

## UPDATE 2026-06-11 (session 6 — COMP-024 SHIPPED LIVE, no shadow) — READ THIS FIRST

Founder directed: **no shadow mode anywhere — build live, in full** ("I don't
have capability to flip anything"). So §12/§13's shadow-mandatory gate is
overridden. COMP-024 built live on `claude/main-branch-content-update-dcqicf`
(2 commits). Hard lines held: no `main`, no `src/coaching` safety edits, calorie
floors + the −1.5% rapid-loss threshold + `edPatternDetector` untouched.

What shipped (COMP-024 cycle-robust weight smoothing):
- **`src/lib/robustTrend.js`** — the founder-approved Candidate A (asymmetric
  Huber-clamped robust-innovation EWMA) + a number-array form; pure, 11
  fixtures (§5: F1 excursion ~80% damped, F2 weekend, F3 loss undamped, F6
  fat-finger, F7 sparse, F8 determinism).
- **DISPLAY promotion is LIVE:** the BodyMetrics weight-trend takeaway smooths
  with the robust trend (raw dots still shown). The blueprint's "display first"
  step.
- **F4 safety invariant (blocking)** in `engine-invariants.test.js`: a genuine
  rapid loss still fires `rapidWeightLossFlag` + ED s1. Safety reads never touch
  the robust trend.

**IMPORTANT FINDING — the cost of dropping shadow is already concrete.** I wired
the robust trend into the coaching DECISIONS (on-target / off-target sizing)
first; the **bulk_aggressive simulator caught a real regression** — the
asymmetric upward clamp damps *sustained* gains, not only transient water-weight
spikes, so a fast bulk stopped triggering downward calorie pulls. This is
exactly what shadow-divergence review exists to vet. With shadow waived, the
test harness caught it instead, and I **held the decision-promotion** (decisions
+ safety stay on the plain EWMA — no regression) rather than ship broken bulk
coaching. To promote the coaching decisions to the robust trend safely, the
clamp needs reworking so it tracks sustained trends (e.g. a median-prefilter, or
a trend-aware scale) — that work, and its validation, is the remaining COMP-024
piece. **Health baseline: 0 errors, 4 warnings, 219 suites / 3395 tests.**

**STILL TO DO from the founder's "do them all" (NOT yet built this session):**
- **COMP-026** (adaptive-TDEE resize activation + step modifier) — the other
  engine change. Large + safety-adjacent (FFM floors, ±5% cap, rapid-loss
  interlocks). Approved deps not needed here; it's pure engine. Build live next,
  with the same safety-invariant discipline. **Do this fresh, not at the tail of
  a long session — it changes live calorie SIZING.**
- **COMP-004 door** — founder chose **"both surfaces"**: host the trend card on
  Progress + Diary; the TodayStrip logged cell links to Progress. Pure UI.
- **COMP-029 light theme** (`expo-system-ui` approved) — the 122-site token
  migration + system background; JS/config here, native rebuild on founder EAS.
- **COMP-019 Stage 2 widgets** (`react-native-android-widget` +
  `@bacons/expo-apple-targets` approved) — JS/config here; signed native build
  on founder EAS. The #175 spike still applies to the Apple targets.
- **Billing stays HELD** (founder kept it held).

---

## UPDATE 2026-06-11 (session 5 — COMP-027 PART B SHIPPED) — READ THIS FIRST

Founder said "just do them, no supervision"; I held the hard gates (billing,
engine/safety, deps, native/EAS, DPO) and asked which lane to take — founder
chose **COMP-027 Part B (Home reorder)**, the one pure-JS/RN item with no gate.
Shipped on `claude/main-branch-content-update-dcqicf` in 3 lint-clean,
full-suite-green commits.

What shipped (blueprint `implementation/impl-COMP-027-colour-home.md` Part B):
- **New `src/components/TodayStrip.js`** — the "one big thing" glance row that
  now sits directly under the session hero, replacing the three stacked utility
  cards (morning weight, steps, cardio) that used to push the hero ~150pt down.
  Up to three divided cells; degradation 3→2→1; larger-text stacks; the only
  state colour is the logged tick (Part A Class B — no red on weight). Weight
  cell keeps one-tap logging across four states (logged / logged-under-ED /
  compact-empty after the morning window / morning-window expanded input, pre
  11:00, suppressed during an active session). 11 unit tests.
- **HomeScreen reorder:** hero first, strip under it, free-tier teaser moved
  below the hero, skeleton order flipped to teach the hierarchy.
  `handleLogWeight(weightKg)` now takes a parsed kg (the strip owns the draft +
  parsing); HomeScreen stays the weight-data owner. New `edFlagOpen` state from
  the existing ED-flag read drops the sparkline under a wellbeing flag.
- **Retired** `StepsCard.js` + `CardioCard.js` (loaders absorbed into the
  strip) and the dead morning-weight-card styles.

**Health baseline is now: 0 errors, 4 pre-existing warnings, 218 suites / 3385
tests (3382 pass, 3 skip).**

**CARRY-FORWARDS (Part B):**
1. **On-device review needed at PR (the blueprint's guardrail, §8):** the
   morning-state salience + the weigh-in-completion metric (must not drop >5%),
   keyboard behaviour with the expanded cell under the hero (verify auto-scroll
   into view on focus), and the small-screen / larger-text (2+1) layouts.
2. **COMP-004 Home door deferred:** the logged weight cell taps to *edit*
   (the existing weigh-in-correction path preserved). Wiring it as the
   tap-through *door* to COMP-004's "Your trend" card still waits on where
   COMP-004 lands (Diary top vs Progress) — a host decision, not built here.
3. **COMP-013 hero first-run variant** is untouched and still lives inside the
   hero block (the strip is separate), so the §4c coupling the blueprint flagged
   is moot — they no longer fight over the same surface.

---

## UPDATE 2026-06-11 (session 4 — COMP-025-A FULL PHASE A SHIPPED) — READ THIS FIRST

A fourth build session shipped **COMP-025-A in full (Phase A)** on
`claude/main-branch-content-update-dcqicf`, in 8 lint-clean, full-suite-green
commits (the last is a self-review fixes commit). **Attended founder decision
this session:** asked whether to stop at the unattended-safe core or build the
entitlement-seam pieces too — founder chose **"build both now"**, so Moment 2 +
the win-back were built unattended (defensively, heavy tests). No billing files
touched (the §9 boundary held); Phase B (store offers) remains billing-gated and
NOT built.

What shipped (blueprint `implementation/impl-COMP-025-winback.md`):
- **Reason capture, both moments (§4a).** Moment 1: `CancelReasonSheet` replaces
  the bare confirm alert on SubscriptionScreen — five single-select reasons, a
  conditional free-text (missing_feature / switching) routed to `user_feedback`,
  the store handoff ALWAYS enabled (anti-dark-pattern: never gated on
  answering). Moment 2: `PostLapseSheet` (one-time, first-open-after-lapse) with
  the data-safety body + the same question only if none captured this episode.
  Shared via `src/lib/cancelReason.js` + `src/components/ReasonPicker.js` so the
  two can't drift. New telemetry `cancel_reason_captured { reason, surface }`
  (enum only) — **migrate_079**.
- **Lapse experience (§4b).** A held-seat line on `ProLocked` ("Everything you
  logged is saved … if you come back"). Binary gate unchanged (read-only diary
  stays a deferred founder gating call).
- **Win-back (§4c).** `scheduleWinbackNotification` on the cascade-gate pattern:
  one local notification per episode (+30d default, or the §4d stated-return
  window), re-laid each open while future to keep session counts fresh, ED-
  suppressed, single-shot enforced by `src/lib/payments/winbackState.js` (one per
  episode + a 180-day cross-episode floor). Pure copy in `winbackContent.js`
  (numbers the hero, never a zero, no discount clause). New `WINBACK` category +
  tap route → Subscription. **No new telemetry event** — uses existing
  notification_sent/_tapped (category winback) per §8.
- **Lapse detection (§4a Moment-2 trigger).** `src/lib/payments/lapseDetect.js`
  reads the existing `reconcilePaidEntitlement` result (makes no entitlement
  decision): a real client-confirmed paid_pro→free lapse arms the loop; the
  stale-entitlement lockdown (reason `stale_*`) and trial auto-downgrade never
  do (blueprint risk #4). Wired fire-and-forget into RootNavigator's reconcile
  helper at both auth-enter call sites. **Note:** in production today the RTDN
  Pub/Sub push is NOT wired, so the client reconcile IS the authoritative churn
  signal — this path is the real one, not an edge case.
- **Temporary-break (§4d).** A break-window chip row on Moment 1
  (In a month / 2-3 months / Not sure) stored locally (never telemetry) to shift
  the single win-back; an Android-only "Play can pause instead" line.

**Health baseline is now: 0 errors, 4 pre-existing warnings, 217 suites / 3374
tests (3371 pass, 3 skip).** Fewer suites or more warnings = a regression.

**ALSO this session — COMP-019-1b static-chart migration completed.** The last
static `SvgLineChart` *line* callers (WeightTrendCard + BodyMetricsScreen's two
trend charts) now render through `VolyumeChart` (interactive off) — prop-for-prop,
pixel-identical, zero visual diff. `SvgLineChart.js` was fully orphaned by that
and has been **deleted**, consolidating the app onto ONE line-chart engine.
(The `SvgBarSparkline` callers — FatigueTrendCard, MesocycleBuilderScreen — are
the bar-sparkline family, like `Sparkline`; they stay SVG by design and were
never line-chart targets, despite the looser session-3 wording.)

**CARRY-FORWARDS (not blockers; pending the founder):**
1. **Server migration `079`** (`cancel_reason_captured` allow-list) joins
   `072`–`078` pending manual apply. The event no-ops server-side until applied;
   the local app is unaffected.
2. **Copy gate now also covers COMP-025-A** — all blueprint copy: the cancel-sheet
   question + disclosure, the post-lapse data-safety body, the win-back push
   strings, the ProLocked held-seat line, the break-window prompt + Android pause
   line. Founder reviews exact strings at PR. (Note: em dashes were swapped for
   colons/commas to satisfy the no-em-dash lint rule — e.g. the cancel title and
   the win-back body.)
3. **COMP-025 Phase B NOT built (billing-gated):** App Store Connect + Play
   Console win-back offers (console config) + the Billing-Library offer-tag
   surfacing + the iOS 18 StoreKit win-back sheet. Touches `src/lib/payments/*`
   — needs explicit founder billing permission. The win-back copy already leaves
   the offer clause out by design until then.
4. **Named-and-deferred (not built):** read-only lapsed diary (founder gating
   call); RTDN type-3 early-cancel signal; the server-push win-back worker (which
   would reach users who never reopen — the accepted v1 local-notification gap).
5. **All four surfaces are VISUAL** (the two cancel/lapse sheets, the ProLocked
   line, the win-back notification) — logic is unit-tested but the look + feel,
   and the on-device lapse→sheet→win-back flow, need a device pass at PR.

**Where the list stands now:**
- Done across all sessions: COMP-001, 002, 003, 004, 005, 006, 008, 009, 010,
  011, 012, 013, 015, 018 (v1), 019 (1a + 1b), 022 (full), 023, **025-A (full
  Phase A)**, 027-Part-A.
- **Next unbuilt:** the remaining work is all gated — COMP-024/026 engine shadow
  (attended), COMP-019 Stage 2 widgets (deps + native), COMP-020 watch (native),
  COMP-007 paywall (billing/reviews), COMP-027 Part B + COMP-029 (on-device /
  deps), COMP-030 + NEW-002 (DPO), NEW-001 (research), COMP-016 (data-ops),
  COMP-025 Phase B (billing). **There is now NO unattended code-only item left
  at all** — the COMP-019-1b static-chart migration (the last one) shipped this
  session. Every remaining item needs the founder: attended supervision, a
  dependency/native build, billing permission, DPO/legal, on-device eyes, or a
  data-ops programme.

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
