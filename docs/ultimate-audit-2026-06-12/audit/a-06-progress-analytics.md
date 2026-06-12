# a-06 — Progress & Analytics (code-verified internal audit)

> ULTIMATE-APP MANDATE, Phase 1, Area 06. Branch `claude/admiring-bohr-2kb7pd`.
> Method: read the live code — `src/screens/AnalyticsScreen.js`,
> `VolumeHeatmapScreen.js`, `LiftProgressScreen.js`, `ExerciseDetailScreen.js`,
> `ConsistencyScreen.js`, `WorkoutHistoryScreen.js`, `BodyMetricsScreen.js`,
> `YearOfLiftsScreen.js`, `ShareCardScreen.js`; `src/hooks/useProgressData.js`,
> `useWeeklyStreak`, `useWeightTrend`; `src/components/VolyumeChart.js`,
> `WeeklyStreakStrip.js`, `StreakWeeksSection.js`, `ReadinessCards.js`,
> `PRCelebration.js`; `src/lib/chartWindows.js`, `liftProgress.js`,
> `insightsEngine.js`; `src/navigation/RootNavigator.js`. Prior art re-verified:
> `int-04-progress-retention-gamification.md` (§1 map + F1–F10).
> **Verdict up front: the prior map is broadly accurate, BUT one load-bearing
> claim is WRONG — Body Metrics is fully Pro-gated (`withProGuard`), not
> "manual for Free". Year of Lifts and Recaps confirmed; D1 milestone ladder
> (F1) is partly built (ReadinessCards milestone bar) but NOT the
> PRCelebration-driven win ladder F1 proposed.**

---

## 0. Re-verification of int-04 §1 / F1–F10

| Prior claim | Status on this branch | Evidence |
|---|---|---|
| BodyMetrics "auto-on Pro, manual for Free; calm-mode gate" | **PARTLY WRONG — fully Pro-gated** | `RootNavigator.js:151,347,386` register it as `GatedBodyMetrics = withProGuard(BodyMetricsScreen, 'Body metrics')` on **every** stack including Progress. The internal opt-in/calm gates (`BodyMetricsScreen.js:368–382,684–712`) only ever run **after** the Pro guard passes. A free user tapping the "Body Metrics" tile (`AnalyticsScreen.js:340`) hits the paywall. |
| D1 milestone ladder shipped | **PARTLY — a different, weaker thing shipped** | `ReadinessCards.js:29–41,168–191` has a 1/10/25/50/100/250/500-session milestone *progress bar* (Pro path lives on Consistency). The COMP-018 streak ribbon (4/12/26/52) is on Analytics (`AnalyticsScreen.js:27–32,180–195`). F1's proposed `PRCelebration`-fired early-win overlay (first workout, first 3, first full week, back-after-gap) is **NOT built**. |
| D2 programme-arc strip + phase celebration | **CONFIRMED** | `ConsistencyScreen.js:86–92` renders `BlockShapeCard` ("Week N of M" + effort word) when `plannedWeeks >= 2`; `StreakWeeksSection.js:68–115` surfaces the silent streak-repair ("you came back"). |
| Workout delete shipped | **CONFIRMED** | `WorkoutHistoryScreen.js:149–181` `handleDeleteWorkout` → `deleteWorkoutAndSets` local + `deleteWorkoutFromCloud`/queued `workout_delete` op. Quiet neutral trash affordance (`:960–968`), destructive confirm dialog. |
| "Weight" tile renamed to "Body Metrics" | **CONFIRMED** | `AnalyticsScreen.js:334–340` comment + label. |
| F2 share cards have no viral pull | **CONFIRMED — still none** | `ShareCardScreen.js`: footer draws wordmark + "SMARTER TRAINING" + `volyume.app` (`:233–252`) only. No QR, no deep link, no referral code anywhere. Privacy note `:1106–1108`. |
| F5 no data export | **CONFIRMED** | No CSV anywhere; only the per-card **PDF** (`ShareCardScreen.js:995–1015`), which is one branded card, not a data export. |
| Year of Lifts locked 365 days | **CONFIRMED** | `AnalyticsScreen.js:375–388` tile only renders once `Date.now() - earliestWorkoutAt >= 365 days`. |
| Recaps unlock at 10 sessions | **CONFIRMED** | `AnalyticsScreen.js:352–374` `RECAP_GATE = 10`. |
| Streak run number null without target | **CONFIRMED** | `WeeklyStreakStrip.js:35–40` shows the run only `if (!suppressed && hasTarget)`; plan-less users get session count only until they set a manual goal (`StreakWeeksSection.js:122–143`). |

---

## 1. WHAT — every screen, card, chart, derived metric, state

### 1.1 AnalyticsScreen — the Progress hub (`Analytics` route, headerShown:false)
Vertical order (`AnalyticsScreen.js:157–391`), each section self-hides:
1. **This-week strip** (`WeeklyStreakStrip`, COMP-018) — "N of T sessions this
   week" + "X weeks running" / "Recovery week. Your run carries on." Free, all
   tiers; hidden for brand-new users and under an open ED/wellbeing flag
   (`scoffScore` → `useWeeklyStreak`).
2. **Milestone ribbon** — one-line celebration when run crosses 4/12/26/52
   (`STREAK_MILESTONE_COPY`), fires once via `markMilestoneSeen`; a "Make a card"
   CTA appears only at `>= 12` (`:184–193`) → ShareCard milestone variant. In-app
   only, no confetti, no push.
3. **Empty state** — `EmptyChartIllustration` + "No data yet" when `allSets===0`.
4. **Recap nudge card** (COMP-005) — first 7 days of month, `completedWorkoutCount
   >= 10`, per-month dismiss key (`:144–232`); opens `RecapStory` (month variant).
5. **Insight stack ("For you")** — up to 3 rows from `runInsightsEngine`
   (`insightsEngine.js`): under-MEV muscle, stalled lift, peaked lift, recovery
   warning, deload-due, gentle-rhythm. Severity → icon/colour (`:35–39`),
   jargon-free copy by rule (`insightsEngine.js:8`). Dismissable.
6. **Your trend** (COMP-004) — `WeightTrendCard`, **Pro only** AND self-hides
   until morning weights exist (`:76,247–254`).
7. **Recent sessions** — last 3 completed (name, date, duration, difficulty chip).
8. **This week's volume** — `VolumeSummaryStrip`: count of muscles trained +
   "N below target / N over max" flags, drills into VolumeHeatmap (`:422–476`).
9. **Cardio this week** — Pro, `cardioEnabled !== false` (`:295–304`).
10. **New personal bests** — `PRSparkline`, requires `enoughForTrends` (≥3
    sessions); 30d/90d toggle (`handlePrWindowToggle`, `:400–404`); "N new bests
    in W days" + gold bars.
11. **Explore nav grid** — Consistency, Lifts, Body Metrics, Partner, Full
    History, Recaps (locked < 10 sessions, shows "N sessions to go"), Year of
    Lifts (only after 365 days).

### 1.2 VolumeHeatmapScreen (`VolumeHeatmap`, **Free, no gate**)
- `BodyDiagramHeatmap` anatomical diagram, tap a muscle → scrolls to its bar
  (`:207–212,231–234`).
- Rolling-window selector 1/2/4 weeks (`WINDOW_OPTIONS`) for the bars.
- Per-muscle bars: fill vs MRV, MEV/MAV tick marks, **ghost previous-week bar**
  (`:328–337`), sets/MRV count, last-trained chip (`:341–348`).
- **Volume trend** section (COMP-019): `WindowChips` 4W/8W/3M/6M, persisted to
  `@volyume_chart_window_volume`, one-line `volumeTakeaway` (`chartWindows.js:149`),
  per-muscle `VolyumeChart` bar-variant sparklines with tap-and-hold scrub
  (count surfaces in the trailing label, `:437–490`).
- **Editable custom landmarks** (`saveLandmarks`/`resetToDefaults`), synced via
  `syncUserPref` to `@volyume_landmarks_${user.id}` (`:117–161`).
- Legend with `InfoTooltip` translating MEV/MAV/MRV into plain English (`:280–287`).

### 1.3 LiftProgressScreen (`LiftProgress`, **Free**)
- Header: overall strength **standing** ("Intermediate overall across N lifts")
  + nearest-next ("X kg from Advanced on Y") + per-lift **relative-strength**
  rows (×bodyweight ratio + Beginner→Elite badge), requires a logged bodyweight;
  else a "Add your body weight" prompt → BodyMetrics (`:148,194–211`).
- Filter tabs: All lifts / Recent bests.
- Per-lift rows: name + PR tag, muscle, sessions, last-trained, **est. max** +
  delta %, `Sparkline` of e1RM trend. Tap → ExerciseDetail; long-press → PeekMenu
  with "View exercise detail" + "Share this PR" → ShareCard (`:111–135`).
- Rows built by `buildLiftProgressRows` (`liftProgress.js`): **logged working
  sets only**, e1RM via Epley `calculate1RM`, one point per session (best e1RM),
  `deltaPct` null for single-session lifts.

### 1.4 ExerciseDetailScreen (`ExerciseDetail`) — reachable only post-logging
- Overview: muscle/subregion/equipment/compound/difficulty tags, "Also works",
  estimated max (`InfoTooltip`), SFR "Quality" / Fatigue / Rep-range tiles.
- Personal-bests highlight card + "All-time bests" list (1RM estimate / heaviest
  / most reps, `🥇🏋️🔁` glyphs) — **computed locally on the fly** from working
  sets (`:134–153`), not a stored PR table.
- **Goal** card: target weight + optional date, progress bar, auto-detect
  achievement → animated congrats banner (`:155–164,427–433`).
- **Plateau** banner (`detectPlateau`).
- **Strength trend chart** (COMP-019): WindowChips 1M/3M/6M/Y, `e1rmTakeaway`,
  Max-weight/Est-max toggle, interactive `VolyumeChart` scrub, Epley note.
- History (last 8 sessions), Similar exercises (swap-engine top 4), coaching cue,
  "How to do it" form tip.

### 1.5 ConsistencyScreen (`Consistency`, **Free**, Pro adds depth)
Reads the **same `useProgressData`** hook (`:29–35`). Sections:
- `StreakWeeksSection` ("Your weeks": run number, 12-week CVD-safe glyph strip,
  longest run, repair line, **manual weekly-goal editor** for plan-less users,
  Pause control with 1/2/4/8-week options).
- `PartnerRow` (NEW-002) → Partner screen.
- Deload banner (`shouldDeload`).
- Training block: `BlockShapeCard` (D2 week-N-of-M dots), `MesocyclePulseCard`
  (tonnage sparkline), `FatigueTrendCard`, `BlockProgressCard` (planned vs actual).
- `ReadinessCards`: session-milestone progress bar (free); **Recovery gauges**
  (soreness/fatigue/joint EMA), cardio-load note; **Muscle readiness chips +
  recovery-trend insight are Pro-only** (`ReadinessCards.js:139–148,215,240`).
- ACWR `WorkloadCard` (free, self-hides when ratio null).
- Session-length trend, training-frequency table, 12-week training calendar — all
  gated behind `enoughForTrends` (≥3 sessions).

### 1.6 WorkoutHistoryScreen (`WorkoutHistory`, **Free**)
- "N sessions" + list/calendar toggle; filters All/This month/Upper/Lower/Full
  (name+exercise-name substring match — crude, `:246–263`).
- Cards: date, relative label, duration + working-set count, exercise list;
  expand → stat chips (incl. **tonnage** "N kg lifted"), per-exercise breakdown
  (weight × reps), notes, "View full summary" (read-only WorkoutSummary).
- Actions: View Details / Repeat (as-is or via Plans) / **Delete** (new flow).
- Calendar grid: trained days highlighted, tap a day to filter, today ring.
- Loads only most-recent 50 sessions' sets (LB-7 perf, `:66–71`).

### 1.7 BodyMetricsScreen (`BodyMetrics`, **PRO-GATED — see §0**)
After the Pro guard: opt-in card (auto-on for Pro), calm-mode re-confirm gate
(`:684–712`). Logs weight (st/kg/lbs), body fat %, **9 measurements** (chest,
shoulders, arms, forearms, waist, hips, quads, hamstrings, calves). Derived:
phase badge (Gaining/Losing/Maintaining via linear regression, `:103–126`),
EWMA smoothed trend + weekly change, **adaptive TDEE** ("Estimated daily burn")
with confidence tiers (`computeAdaptiveTDEEAdjustment`), neutral `DeltaBadge`
(no good/bad colour, COMP-027). Weight trend chart is windowed (COMP-019),
ED-flag suppresses rate-of-change in the takeaway. Auto-seeds onboarding weight.

### 1.8 Recaps + Year of Lifts (`YearOfLifts` + `RecapStory`, both → `YearOfLiftsScreen`)
One renderer, **three variants** (`:349–471`): **year** (`buildCards`, 365-day
gate), **month** (`buildMonthCards`, COMP-005, rolling, neutral framing under
calm/ED), **block** (`buildBlockCards`, post-mesocycle, the unreplicable
tonnage-climb slide). Swipeable Spotify-Wrapped story deck, progress pips, share
→ ShareCard milestone. `recap_opened` telemetry for month/block only.

### 1.9 ShareCardScreen (`ShareCard`, **Free**)
Off-screen WebView canvas → 1080×1080 / 1080×1920 PNG (+ one-page PDF). Three
card types: **session** (hero = PR count or tonnage or sets, intensity badge
Epic/Tough/Solid, top-lift card, exercise chips, motivational closer),
**pr**, **milestone**. Privacy toggles (date/plan/tonnage/exercise/PR-weight/
prev-best); never PII (name/bodyweight/measurements/notes hard-excluded,
`:1106–1108`). Real wordmark embedded, vector fallback + 2s watchdog.

### 1.10 VolyumeChart (COMP-019, the single chart engine)
Hand-rolled SVG (`chartGeometry`). `interactive` adds long-press-300ms-then-drag
scrub: crosshair + tooltip, per-point selection haptic (no-ops under Reduce
Motion), a11y announce. `variant='bar'` for the 24px volume rows (dims non-active
bars, reports index via `onScrubIndex`). No pinch/pan/zoom by design. Windows
live in `chartWindows.js`: TREND 1M/3M/6M/Y, VOLUME 4W/8W/3M/6M, default 3M;
`pickInitialWindowKey` widens to the narrowest window with ≥2 points; takeaways
phrased plain ("3 months: average 82.4 kg, down 1.8 kg").

### 1.11 PRCelebration (fired from App.js queue, post-workout)
Full-screen confetti (40 particles) + gold trophy + "+X% over your previous
best", or a `subdued` toast variant. Three PR types. **One-size — no escalation
for first-ever vs big PR, and NO "Share this" CTA at the moment of joy** (F9
unbuilt; the share path is the later LiftProgress long-press).

### States summary
- **No data:** Analytics empty illustration; streak/trend/volume/PR sections all
  self-hide; nav tiles still present (Recaps/YoL locked).
- **Sparse (<3 sessions):** This-week strip + recent sessions + volume summary
  show; PR sparkline, duration trend, frequency table, calendar all withheld
  (`enoughForTrends`). Charts need ≥2 points per window or show empty hint.
- **Rich:** everything on; recaps unlock at 10, YoL at 365 days.
- **Free vs Pro:** see §2.4.

---

## 2. WHERE — linkage map, proactive vs dig, dead ends, the persona path

### 2.1 Linkage (Progress = "Progress" tab → `ProgressStack`, `RootNavigator.js:334`)
- **AnalyticsScreen is the hub.** Reachable cards/tiles fan out to: VolumeHeatmap
  (volume summary + tile), Consistency (tile), LiftProgress (tile), BodyMetrics
  (tile, **Pro wall**), Partner (tile), WorkoutHistory (tile + "All sessions"),
  RecapStory (recap nudge + Recaps tile), YearOfLifts (tile, ≥365d), LogCardio/
  CardioHistory (Pro card), ShareCard (streak milestone "Make a card").
- **LiftProgress → ExerciseDetail** (tap or long-press menu) and **→ BodyMetrics**
  (bodyweight prompt). ExerciseDetail → ExerciseDetail (similar exercises) and
  → ShareCard (no, only LiftProgress long-press shares).
- **Consistency → MesocycleBuilder / PlanLibrary** (cross-tab), → Partner.
- **WorkoutHistory → WorkoutSummary** (read-only), → ActiveWorkout (repeat).
- **YearOfLifts/Recap/streak-milestone → ShareCard.**
- **Proactive (pushed at you):** This-week strip, milestone ribbon, "For you"
  insight stack, recap nudge (first 7 days), deload banner, plateau banner.
- **Dig-only (must navigate):** every nav tile; relative-strength standing;
  ACWR; muscle readiness (Pro); adaptive TDEE; per-lift detail; calendar.

### 2.2 Dead ends / friction (confirmed in code)
1. **ExerciseDetail unreachable pre-logging** — `buildLiftProgressRows` lists
   only logged lifts; the richest progress detail (trend, PRs, goal) cannot be
   opened for a lift you haven't done (carries over from a-05).
2. **Body Metrics tile is a free→paywall trap** — the tile sits in the free
   Progress hub but routes through `withProGuard` (§0).
3. **PR celebration has no share CTA** (F9) — peak-emotion virality lost.
4. **Share card has no friend-pull** (F2) — no acquisition mechanism in the
   artefact.
5. **No CSV export** (F5) — PDF is a card, not data.

### 2.3 "Is my training working?" answer path
- **Besa (newbie, plan-less, free):** This-week strip ("3 sessions this week",
  but **no run number** until she sets a manual goal she must discover on
  Consistency). Volume summary ("5 muscles trained, 2 below target"). The "For
  you" gentle-rhythm insight ("trained 4 of last 21 days. This is what progress
  looks like."). First PR confetti *eventually*. Week 1 = thin; week 6 = recap
  unlocked + streak number if she set a goal.
- **Eddie (athlete, Pro):** relative-strength standing, per-lift e1RM trends +
  takeaways, plateau/peaked/stalled insights, ACWR, block recap, adaptive TDEE,
  9 measurements — dense and credible. His gaps: no export, no PR-moment share.

### 2.4 Free vs Pro split (verified)
- **Free:** This-week strip, streak/weeks, milestone ribbon, insight stack,
  volume summary + **VolumeHeatmap (full, incl. custom landmarks)**, LiftProgress
  + relative strength, ExerciseDetail, WorkoutHistory + delete, Consistency
  (block cards, deload, ACWR, recovery gauges, duration/frequency/calendar),
  Recaps, Year of Lifts, ShareCard, PRCelebration.
- **Pro:** weight-trend card on Analytics, Cardio card, **BodyMetrics (whole
  screen, §0)**, muscle-readiness chips + recovery-trend insight on Consistency.
- **Judged well**, except the Body-Metrics gate is **inconsistent placement** (a
  Pro feature surfaced as a free-hub tile and as a bodyweight prompt from the
  free LiftProgress screen, both leading to a wall).

---

## 3. FEEL — jargon, celebration balance, Besa@w1 vs w6, Eddie's meso review

### 3.1 Jargon density
- **Well translated:** MEV/MAV/MRV (heatmap `InfoTooltip` + plain legend
  "Below minimum/Optimal/Getting close/Too much"); relative strength (×BW
  tooltip); est. max, SFR, fatigue (ExerciseDetail tooltips); deload reframed
  as "lighter week"; the streak deliberately never says "streak" (says "weeks
  running"). Insight copy is jargon-free by an explicit lint-style rule
  (`insightsEngine.js:8`).
- **Leaks (per code):** **"tonnage"/"kg lifted"** appears raw on WorkoutHistory
  stat chips, the share card, recaps, and the meso sparkline with **no in-app
  definition** anywhere. **"e1RM"/"est. max"** is everywhere on LiftProgress with
  the explainer only one level down on ExerciseDetail. **"ACWR"** WorkloadCard
  and **block/mesocycle** assume knowledge (block card softens it, but the word
  "mesocycle" still surfaces). A newbie reading "12,400 kg" + a sparkline cannot
  tell if it is good — the chart takeaways (COMP-019) are the cure but only run
  on weight/e1RM/volume trend charts, not on the tonnage/PR figures.

### 3.2 Celebration vs data-dump
- Celebration is **back-loaded and sparse for beginners**: confetti only on a
  real PR (may be weeks away); the only guaranteed early reward is the streak
  ribbon at week 4 (and only if a goal/plan exists) and the session-milestone
  bar. The strongest delight (recap, YoL) is gated 10 sessions / 365 days.
- Analytics itself is a **dense hub** (11 sections) — strong for Eddie, a wall
  for Besa. The neutral framing on recaps/body metrics is principled (ED-safe)
  but means body-composition progress has **no win moment at all** (F10).

### 3.3 Besa week 1 vs week 6
- **Week 1:** empty illustration → after session 1, This-week strip ("1 session
  this week"), recent-session card, maybe the first-session line from
  WorkoutSummary. No run number, no recap, no YoL. Celebration desert (F1).
- **Week 6 (~12 sessions, 2×/wk):** recap unlocked + nudge card; "For you"
  gentle-rhythm; streak run number **if** she found the manual-goal editor; PR
  sparkline live; volume summary meaningful. Materially richer — the gap is the
  first fortnight.

### 3.4 Eddie's meso review
Genuinely strong: block recap deck (tonnage-climb slide no competitor can do),
BlockProgressCard planned-vs-actual, deload insight, ACWR, per-lift e1RM
takeaways, relative-strength standing, adaptive TDEE. Missing for him: data
export, and a PR-moment share.

---

## 4. GAPS / FRICTION (per code, no competitor speculation)

1. **Body Metrics is Pro-gated but placed as a free feature** — free Progress
   hub tile + free LiftProgress bodyweight prompt both route into `withProGuard`.
   Either the placement or the gate is wrong; the prior audit recorded it as free
   (this audit corrects that).
2. **No early-win ladder (F1 unbuilt)** — the milestone *progress bar* exists, but
   no celebratory moment fires for first workout / first week / back-after-gap.
3. **Share card has zero acquisition loop (F2)** and **PRCelebration has no share
   CTA / no escalation (F9)** — the two hottest virality moments are passive.
4. **No CSV/data export (F5)** — only a one-page PDF card.
5. **"Tonnage" and "e1RM" leak unexplained** to beginners across History, share,
   recaps, meso sparkline; takeaways cover only the three trend charts.
6. **Streak run number is off by default for plan-less users** — needs the buried
   manual-goal editor on Consistency to switch on (F6).
7. **History filters are crude substring matches** (`upper/lower/full` on name) —
   a session named "Push A" never matches "Upper".
8. **PRs are recomputed live, never persisted** (`ExerciseDetailScreen.js:134–153`)
   — fine for display, but there is no PR table to drive cross-screen
   celebration, notifications, or a "PRs this year" count without re-deriving.
9. **Telemetry is thin** — only `chart_window_changed`, `streak_milestone_reached`,
   `streak_paused`, `recap_opened`. No `progress_tab_viewed`, no tile-tap events,
   no `share_card_generated`, no `pr_celebrated`, no insight impression/dismiss —
   so there is no read on what users actually open or which insights land.

---

## 5. Surface inventory (screens, components, lib, telemetry)

**Screens (9):** `AnalyticsScreen`, `VolumeHeatmapScreen`, `LiftProgressScreen`,
`ExerciseDetailScreen`, `ConsistencyScreen`, `WorkoutHistoryScreen`,
`BodyMetricsScreen` (Pro-gated), `YearOfLiftsScreen` (serves YearOfLifts +
RecapStory routes), `ShareCardScreen`. (WorkoutSummaryScreen is shared with
Area 04, hosted in this stack read-only.)

**Components (~14):** `VolyumeChart`, `WeeklyStreakStrip`, `StreakWeeksSection`,
`ReadinessCards`, `PRCelebration`, `WeightTrendCard`, `BodyDiagramHeatmap`,
`WindowChips`, `Sparkline`, `FatigueTrendCard`, `BlockProgressCard`,
`BlockShapeCard`, `MesocyclePulseCard`/`WorkloadCard`/`SessionDurationChart`/
`MuscleFrequencyTable`/`TrainingCalendar` (in `ProgressSections`), `PartnerRow`,
`InfoTooltip`, `PeekMenu`, `CardioPlanCard`.

**Hooks (3):** `useProgressData` (the shared data layer for Analytics +
Consistency), `useWeightTrend`, `useWeeklyStreak`.

**Lib modules (~8):** `chartWindows.js` (windows + takeaways), `liftProgress.js`,
`insightsEngine.js`, `algorithms.js` (`calculateWeeklyVolume`, `calculate1RM`,
`calculateTonnage`, `shouldDeload`, `VOLUME_LANDMARKS`, `detectPlateau`),
`strengthStandards.js`, `streakState.js` + `streak.js` (AsyncStorage-only,
unsynced), `chartGeometry.js`, `robustTrend.js`/`nutritionEngine.js` (EWMA/TDEE
for body metrics).

**Charts (4 distinct):** weight trend (line, scrub, windowed), e1RM/max-weight
(line, scrub, windowed, toggle), weekly-volume per-muscle (bar-variant scrub,
windowed), PR-rate sparkline (static bars, 30/90d). Plus body-fat + 9 measurement
trend charts on BodyMetrics.

**Telemetry events (4):** `chart_window_changed` (volume/e1rm/weight),
`streak_milestone_reached`, `streak_paused`, `recap_opened` (month/block only).
**No** tile-tap, view, share-generated, or PR-celebrated events.

**Surface count: 9 screens + ~14 components + 3 hooks + ~8 lib modules = ~34
code surfaces; 4 distinct chart types; 4 telemetry events.**
