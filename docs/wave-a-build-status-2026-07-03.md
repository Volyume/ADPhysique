# WAVE A + FOUNDER DEFECT PASS — BUILD STATUS & RESUME (2026-07-03)

Single source of truth for the world-class usability **Wave A** build and the
interleaved **founder device-screenshot defect pass**. Written so a fresh
session can resume with zero context loss. Points to SOURCE FILES by full
path; records every decision + rationale. Nothing here is a summary to build
from — open the cited files.

Branch: `claude/codebase-audit-docs-pv6mjd`. **Everything below is committed
AND pushed** (verified `git rev-list --left-right --count origin/…​...HEAD` =
`0 0`). Working tree clean.

Governing directive: `docs/directive-2026-07-03-usability-disposition.md`
(the approved wave plan + PROTECT list + STANDING CORRECTIONS).
Decision pack: `docs/decision-pack-2026-07-03-d1-d7.md` (D1–D7 resolved).
Model-tier rule: STRONG (session model) hands-on for engine/safety/consent/
paywall/planning; FAST subagents ('sonnet'/'haiku', enforced by
`.claude/hooks/agent-tier-guard.py`) for find/count/measure/verify +
well-specified surfaces. Every completed item verified against current source
by a FAST agent BEFORE build (the audit was a day old).

---

## 0. STANDING CORRECTIONS (founder, verbatim — preserve exactly)

1. The founder performs **NO tests, NO device walks, NO data capture, NO
   dashboard reading, NO commands/scripts, EVER.** He has no facility to.
   Every verification is Claude's: unit/guard suites, the CI emulator,
   Maestro. "Device checklist" deliverables are retired. Never ask the
   founder to run, measure, confirm on device, or provide data.
2. **Anything store-related is OUT OF SCOPE** — Play Console vitals, ASO,
   listing, submission assets, growth. The work is improving the app. iOS
   ships only when BOTH platforms are ready, on the founder's call (not yet
   made). Do not prepare submission assets.
3. **No commit attribution of any kind** (founder rule 2026-06-12). British
   English, no em dash in user copy. Decisions written to `docs/` the moment
   made.

---

## 1. THE CI FIX (founder's "you keep breaking things. Fix this") — SHIPPED, GREEN

Founder reported the "Build Release APK + AAB" workflow failing for days; no
downloadable APK. Two independent causes, both fixed:

- **Cause 1 — Node version.** `src/lib/food/__tests__/localCacheFts.test.js`
  uses `require('node:sqlite')` (needs Node ≥22); all six workflow pins were
  `node-version: 20.19.4`. Local dev runs 22 unflagged, which masked it.
  **Fix `a67589c`:** all six pins (`.github/workflows/build-android.yml`,
  `build-ios.yml`, `main-ci.yml` ×3, `refresh-off-snapshot.yml`) → `22.22.2`;
  `package.json` engines.node → `>=22.13.0`.
- **Cause 2 — release gate exit 1 with all tests passing.** The read-only
  guard suite `src/components/__tests__/ProGate.readOnlyGuard.test.js`
  mounted `GuardedScreen` without unmounting; `withReadOnlyProGuard`
  (`src/components/ProGate.js:250`) arms a real 4s fail-closed timer that
  only clears on unmount, so five free-tier tests each left a live timer that
  fired after the run → Jest counts a log-after-teardown as a run failure.
  **Only `--runInBand` exposes it** (workers kill the stray timer with the
  worker process), which is why `npm test` and local runs looked green while
  `release:check` (which runs `jest --runInBand`) failed. **Fix `df4f3cf`:**
  track every rendered tree, unmount in `afterEach`.

CI RESULT: run 2047 (df4f3cf) went fully green — APK built + uploaded, release
gate passed. **Founder confirmed "the apk launches too."** The four later
pushes each passed the identical local `jest --runInBand` gate.

**Lesson pinned for the future: the release gate runs `jest --runInBand`
(package.json `release:check`). Local `npx jest` (workers) can be green while
the gate fails on stray timers/handles. Always run `npx jest --runInBand`
before declaring the tree green for a build.**

---

## 2. FOUNDER DEFECT PASS (device screenshots) — SHIPPED

Source of the brief: founder message 2026-07-03 (6 issues). Disposition:

- **Issue 1a — Log set clipped by the nav bar (CRITICAL).** Root cause: E15's
  `VolyumeTabBar` returns null while ActiveWorkout is focused
  (`src/components/VolyumeTabBar.js:73`), so nothing absorbs the system inset;
  the bar's flat `spacing.md` left Log set behind the gesture pill. Fix
  `a30086f`: `ActiveWorkoutScreen.js` bottom bar →
  `Math.max(spacing.md, insets.bottom + spacing.sm)`. Guard
  `src/__tests__/bottomBarInset.guard.test.js`. The greyed look was the
  clipping alone (no weight/reps disabled state; only a `saving` dim).
- **Issue 1c — app-wide safe-area rollout (`7285f33`).** The founder's
  Workout-complete screenshot exposed the INVERSE bug: a sticky footer adding
  `insets.bottom` on a screen where the tab band IS visible → double gap.
  FINAL RULE (pinned in `bottomBarInset.guard.test.js`, documented in
  `docs/audit/bottom-inset-inventory-2026-07-03.md`): band hidden/outside tab
  nav → `Math.max(token, inset+lift)`; band visible → flat token; bottom
  Modal sheets overlay everything → absorb inset themselves (fixed once in
  `src/components/BottomSheet.js`, mirrored in `FeedbackSheet.js`,
  `PeekMenu.js`, `ProGate.js` upsell sheet, `FoodSearchScreen.js` plate
  modal). WorkoutSummary footer → flat token.
- **Issue 2 — dead Diary Pro-lock teaser (`09b2da8`).** `TodaysPlateTeaser`
  cards were inert (`pointerEvents="none"`). Whole teaser now one tap target →
  `ProUpgrade` (`src/components/ProGate.js` `ProLocked`). D6 flag recorded:
  three different lock treatments exist (0.35 inline dim / no-dim full-screen
  / 0.55 not-enough-data) — a real D6 decision when wanted, NOT done.
- **Issue 3 — tab icon weights.** VERIFIED already correct (every tab uses
  `focused ? 'x' : 'x-outline'`); no code change. Guard added
  `src/__tests__/tabIcons.guard.test.js` (`7503dff`). If the filled-house
  effect still shows on device, next suspect is the focus/pill state — chase
  from a fresh screenshot.
- **Issue 4 — plan-name drift (`6c9299a`).** New `src/lib/planDisplay.js` owns
  the convention (plan name verbatim + "Day X of Y"; session = routine name);
  Home hero routes through it. Mesocycle name ("Your block") and the
  Welcome/trial marketing line deliberately left — different concepts. Adjacent
  finding logged: the home widget names the plan's FIRST routine, not the next.
- **Issue 5 — first-time hint (`a30086f`, same commit as 1a).** The amber hint
  now dismisses permanently on the first logged set via the same
  `@volyume_seen_workout_info` flag the ⋯ tap writes. ⋯ menu stays.
- **Issue 6 — Train home lower-third.** CONFIRMATION ONLY: the Train body is
  one ScrollView; the S3 daily-brief/runway strip slots below the plan card
  with no redesign. Not built.
- **E15-3 glow — founder on-device revision (`8f06974`).** Founder saw the
  shipped CTA glow ("strange glow"), chose **"2. Static only"**: breathe loop
  retired permanently, faint fixed bloom + calm/ED suppression + single-
  importer guard stay. Recorded in `docs/decisions-2026-07-02-e15-e8-e9.md`.
  DO NOT reintroduce the animation without a new founder decision.

DO-NOT-FIX (founder, correct as-is): Workout-complete 0kg/0 sets (empty test
session); the readiness sheet (that's D2, a decision not a defect); the
feedback-sheet body-data-stripped disclosure.

---

## 3. WAVE A ITEM STATUS (world-class audit Tier-0 groups A/B/C + D-decisions + T3 + S6)

Audit source: `docs/world-class-audit-2026-07-03/` (tracks 01–06 + `_SYNTHESIS.md`).

### Group A — first-week trust leaks — ALL SHIPPED
- A1 false first-set PR → `first_lift` quiet ack (celebration layer only,
  engine untouched): `6059c7d`. Test `detectPR.firstLift.test.js`.
- A2 first-food-log toast+Undo (sheet Add-to-diary + quick add): `13e0de6`.
  `FoodSearchScreen.js`; test `FoodSearchScreen.test.js`.
- A3 day-0 "Copy yesterday" → "Try a suggested meal": `13e0de6`.
  `EmptyDiary.js`, `DiaryScreen.js`.
- A4 Progress day-0 empty-state CTA: `13e0de6`. `AnalyticsScreen.js`.
- A5 ProOnboarding Step 2 "About you" + age/height why-hints: `13e0de6`.
- A6 wire GLOSSARY.volume onto onboarding jargon: `13e0de6`. Test
  `proOnboarding.volumeTooltips.test.js`.
- A7 OAuth spinner caption + cancelled-OAuth feedback: `13e0de6`. `LoginScreen.js`;
  test `LoginScreen.test.js`.

### Group B — comprehension / locked-spec conformance — ALL SHIPPED
- B1 GoalLockConsent locked-copy regression (2 dropped sentences restored +
  docstring): `6059c7d`. Test `goalLockConsent.lockedCopy.guard.test.js`.
- B2 Methodology "fat-free mass"→"lean mass" (Pattern 10) + deep-link:
  `6059c7d`. Test `methodology.pattern10.guard.test.js`.
- B3 "How Precision Coaching works" links + 14-day arc: `6059c7d`.
- B4 next check-in DATE on ProGoalSetup footer: `6059c7d`.
- B5 primer above the numbers: `6059c7d`.
- B6 CoachOutput why-line, hold-week non-applyable hero, confidence caption,
  history link, share tint: `6059c7d`.
- B7 InfoTooltips (Recomposition + adaptiveBurn): `6059c7d`.
- B8 WorkloadCard status-line ranges (`6059c7d`) + one-line takeaway
  `workloadTakeaway` in `src/lib/chartWindows.js` (`e82b4c2`).
- B9 cardioVerdictLabel wired + icon-differentiated rows: `6059c7d`.

### Group C — flow friction — ALL SHIPPED (C11 was already done in part 1)
- C1 LiftProgress search + last-time line: `d29a613`. Test `LiftProgressScreen.test.js`.
- C2 tappable WorkoutHistory exercise rows → ExerciseDetail: `c40feb7`.
- C3 visible + cancellable auto-advance ("Stay here"): `e84d123`.
- C4 merged stacked plan-activation dialogs (one 3-button appAlert): `03856b4`.
- C5 diary day-swipe (Fling, gesture-handler already in tree): `927015f`.
  Test `DiaryScreen.daySwipe.guard.test.js`.
- C6 saved-meal optimistic write + full Undo: `bac2c63`. `applySavedMealToDiary`
  now returns `{logged, entryIds}`. Tests `savedMeals.test.js`, `MyMealsScreen.test.js`.
- C7 3 long-press fast paths get one-time captions (`HintCaption.js`): `1b8720d`.
- C8 remember OCR skip-name: `29bf73c`. Test `ScanLabelScreen.test.js`.
- C9 flatten notification settings 4→3 taps (deleted `SettingsNotificationsScreen`): `9d48040`.
- C10 widget discovery (Settings row + What's New): `9d48040`.
- C11 great-week share celebratory (non-amber) — ALREADY shipped in `6059c7d`.
- C12 training-reminder push references plan name — **NOT DONE (see §4).**
- C13 tokenise Toast/PRCelebration motion (springs left raw, documented): `3f652f2`.
- C14 stale assets + dead route params removed: `509511b`.

### D-decisions (from the decision pack) — ALL RESOLVED + BUILT
- D1 = Option 2: verb-only meal chip in TodayStrip, hidden on free, deep-links
  FoodSearch. Rule of record: Home never carries food NUMBERS. Built `88c137d`.
- D2 = Option A: remember-skip toggle for the readiness ask. NEVER fabricates
  coaching input (opt-out == Skip, all-null; `getReadinessTweak(null)===null`).
  Built `ac8dcb1`. Guard `intentPromptOptOut.guard.test.js`.
- D3 = Option 1: merge 3 commercial banners into one `AttentionCard` with
  internal priority recorded in-component (`pickAttentionVariant`). Built `a867031`.
- D4 = Option 1: no visual missed-glyph key, code comment + a11y "Quiet week".
  Built `896dcfb`. `StreakWeeksSection.js`.
- D5 = CONFIRMED: Home always shows the NEXT session (round-robin, no calendar
  rest day). ATTACHED CONDITION: the A2 rest-day surface must NEVER assert
  "today is your rest day" as a plan fact — a revised A2 pack must go to the
  founder before build (A2 rest-day surface is HELD, see §4).
- D7 = suppress: GoalChangeSummary performs the ProSetupComplete
  getOpenEdPatternFlag check; deficit framing + diet-break notice suppressed
  under an open flag; receipt stays honest. Built `896dcfb`. Test
  `goalChangeSummary.edFlag.test.js`.
- D6 (media) HELD; D8 (CoachReview free-tier drift) = separate correctness
  pass, NOT part of Wave A; D9 (quiz-first) HELD OFF; D10 = checklist line.

### T3 — cross-tab navigation helper — SHIPPED
`src/navigation/navigateCrossTab.js` (`5cd4321`): 16 hand-rolled
`getParent()?.navigate` sites across 8 screens converted; helper hardcodes
`initial: false` (F6b lazy-tab rule) and routes via parent tab nav (F4
dead-tap class). Guard `src/__tests__/navigateCrossTab.guard.test.js` bans the
raw idiom. Re-anchored: `navigationTargets.guard.test.js`,
`plateauBanner.guard.test.js`, `lazyScreens.guard.test.js`.

### S6 — activation instrumentation — **NOT DONE (see §4).**

---

## 4. RESUME POINT — WHAT REMAINS

Wave A is **two items** from complete:

1. **C12 — training-reminder push references the plan name.**
   `src/lib/notifications/trainingReminders.js:129-132` deliberately kept
   generic to avoid a DB dependency (comment says so). HANDS-ON (locked
   `docs/NOTIFICATIONS_LOCKED.md`). Wiring only: pass the active plan/routine
   name into the scheduled copy without weakening quiet-hours/ED suppression.

2. **S6 — day-14 activation instrumentation.** Research: <3 sessions in first
   14 days = 3–4× churn. `migrate_099_funnel_telemetry.sql` already added the
   funnel events; `src/lib/telemetry/firsts.js` + `engineTelemetry.js` are the
   rails; install date derives from `session.user.created_at`
   (`RootNavigator.js:1015`). Add ONE derived event/report for sessions-in-
   first-14-days (behaviour only, allow-listed, opt-out honoured, NO health
   values). Needs a small ADDITIVE cloud migration for the new event name in
   the server CHECK list (founder-applied manually per supabase rules).
   Adopt the 90s install-to-first-set benchmark as a standing test.

Then: **Wave A final hostile self-review of the whole wave diff, full
`jest --runInBand` gate, delivery note.**

### HELD (needs explicit founder word before build)
- **A2 rest-day notification surface.** NOTIFICATIONS_LOCKED deviation; a
  revised schedule-truth pack (trigger + copy, must never assert rest day as a
  plan fact per D5) goes to the founder first. NOT folded into any wording
  delegation.

### After Wave A (founder's approved sequence, each plan→GO first)
- Wave B: S1 coach memory + S2 forgiveness story.
- Wave C: S3 daily brief/runway + S5 plan-authoring spine (incl. giant-set
  integrity fix — cap at pairs).
- Wave D: S4 mini-story/shares + Tier-2 (T1,T2,T4–T9).
- D8 CoachReview free-tier derivation drift — separate correctness pass.
- Never concurrent with the E1 programme.

### Background engineering (fills windows, never concurrent with E1)
- **Trial-ledger reset SQL for the founder** (his 3 test emails re-register as
  free): delivered in chat, `supabase/migrate_071_trial_ledger.sql` header
  documents it — `DELETE FROM private.trial_ledger WHERE email_hash IN
  (private.email_trial_hash('<email>'), …)` in the PROD SQL editor.
- A1 UK food hit-rate measurement (assembler agents were mid-run; scratchpad
  `a1-testset/`).
- Bundle cut 4 (.dat conversion + useFormTip hook) — needs dedicated window.
- A3 sync one-family migration plan.

---

## 5. VERIFICATION STATE AT HANDOVER

- Local gate green CI-identically: `npm run lint` (0 errors), `npx tsc
  --noEmit` (clean), `npm run check:imports` (OK, 767 files), `npx jest
  --runInBand` → **391 suites / 5,462 passed / 5 skipped / exit 0**.
- CI: last founder-confirmed green APK on `df4f3cf` ("the apk launches");
  subsequent pushes passed the identical local release gate. A fresh APK is
  building from the latest push (`e82b4c2`).
- New guard tests this session (all green): `bottomBarInset.guard`,
  `tabIcons.guard`, `planDisplay`, `navigateCrossTab.guard`,
  `intentPromptOptOut.guard`, plus updates to `navigationTargets.guard`,
  `plateauBanner.guard`, `coachLedger.wiring.guard`, `differentialBanner.guard`.

---

## 6. PROTECT LIST (regression-tested, never touch without founder approval)
ED/safety machinery + copy verbatim; streak model mechanics; insufficient-data
receipts; 14-day trial length; calm notification register; one-amber rule;
free on-ramp. No AI, no feed, no punitive mechanics, no free/Pro change. See
CLAUDE.md §2 INVIOLABLE CONSTRAINTS for the full list.
