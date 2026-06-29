# Hevy teardown — 04 · Progress & analytics

> Competitive teardown, area: **Progress, charts, analytics, volume, measurements,
> dashboards/widgets.** Source: Hevy RN/Hermes v3.1.0 bundle (strings corroborated
> across `bundle_strings.txt`, `screens_components.txt`, `events_keys.txt`).
> LEARNINGS ONLY — no Hevy code/assets copied. Volyume references are `file:line`
> against `/home/user/ADPhysique/src`. Hermes packs identifiers, so Hevy claims are
> "evidence the feature exists in the binary", not a UX spec; treated as direction,
> not gospel.

## Progress & analytics — Hevy vs Volyume

### How Hevy does it

Identifiers recovered from the bundle. Confidence noted per item.

**Per-exercise charts (high confidence).** A rich exercise-history surface:
`ExerciseHistoryScreen`, `ExerciseHistoryTabBar`, `ShareExerciseChartCell`,
`isChartWidgetConfigScreen`. Selectable stat metric per exercise — the enum is
explicit: `bestSet`, `oneRepMax`, `heaviestWeight`, `totalReps`, `bestSetVolume`
(+ `SetCustomMetric`). Chart types compiled in: `RNLineChart`, `RNBarChart`,
`RNHorizontalBarChart`, `RNPieChart`, `RNRadarChart`, `PolarChart`,
`RNScatterChart`, `RNCandleStickChart`, `RNCombinedChart`, `RNBubbleChart` — a
full charting toolkit, not hand-rolled SVG bars.

**Muscle distribution & recovery (high confidence).** `MuscleHeatmap`,
`muscleDistributionModal`, `muscleDistributionBody`, `muscleBreakdown`,
`muscleGroupUsageBar`, `MuscleSplit`, `ShareMuscleDistributionAsset`, plus a
`PolarChartWidget`/`QuadrantStats` muscle radar. A distinct `recovery` /
`fatigue` / `recoveryThreshold` concept and `muscleHeatmapData` exist — a
recovery-state heatmap (which muscles are "fresh" vs recently trained), separate
from weekly-volume targets.

**Bodyweight & 9-point measurements (high confidence).** `LogMeasurementsScreen`,
`CurrentUserMeasurementsStore`, `MeasurementGraphTimeFrame`,
`bodyweightMeasurementsByWeek`. Measurement set: chest, thigh, hips, waist,
shoulders, bicep, forearm, neck, calf, abdomen, bodyFat, plus left/right arm
(per-side). `BodyweightExerciseTimelineGraph` charts bodyweight-exercise reps
over time.

**Progress photos (high confidence).** A whole flow Volyume lacks:
`ProgressPictureCameraScreen`, `ProgressPictureCameraViewModel`,
`InProgressPicturesPreviewScreen`, `ProgressPicturesListScreen`,
`ReceiveDataProgressPicturesList`. Capture → preview → gallery.

**Home-screen widgets (high confidence).** Android (Glance) + Apple widgets:
`WeeklyStatsWidget`, `StatsWidget`, `ChartWidgetConfigScreen`,
`RoutinesWidget`/`LastRoutinesWidget`, `DayRoutineWidget`, `QuickAccessWidget`,
`PolarChartWidget` (muscle radar on the home screen), `averageWeightThisWeek` on
a stats widget. Volyume's widget is a single next-session/consistency tile.

**Reports / recaps (high confidence).** `monthlyReport` (×47 — the heaviest of
this cluster), `yearInReview`/`wrapped` (Spotify-Wrapped style),
`ProgressReportScreen`, `WeeklyCongratsModal`/`shouldShowWeeklyCongrats`.

**Calendar, streak, frequency (high confidence).** `CalendarScreen` +
`CalendarViewSelectorModal` (multiple calendar views), `StreakPageContent`,
`current streak`/`longest streak`, `ModifyFrequencyQuestion`, "workouts per
week" / "days per week".

**Period filters (high confidence).** A generic `timeFrame`/`TimeFrame` selector
spanning months→years (`1M…12M`, `1Y…9Y`) reused across exercise, measurement
and bodyweight charts.

**Social comparison (medium; likely out of scope for us).** `leaderboard`,
`compare`, `community`, `percentile`, `rank`. Volyume is deliberately
comparison-free (AnalyticsScreen.js:28 "no comparison, no rank") — note but do
not adopt.

### How Volyume does it today (file:line)

- **Progress hub** — `AnalyticsScreen.js:241-518`: this-week streak strip
  (`useWeeklyStreak`), insight stack, weight-trend card (Pro), recent sessions,
  weekly-volume summary→heatmap, PR sparkline, nav tiles, lifetime-tonnage +
  perfect-month + streak milestone share cards (`:121-173`).
- **Volume by muscle** — `VolumeHeatmapScreen.js`: anatomical heatmap (`:231`),
  per-muscle working-sets vs MEV/MAV/MRV bars (`:299-351`), editable targets
  (`:373-417`), per-muscle trend sparklines (`:437-489`); windows 1/2/4W +
  4/8W/3M/6M (`:24-28`, `:358`).
- **Consistency** — `ConsistencyScreen.js`: 12-week calendar (`:141`), streak
  glyph strip (`:45`), mesocycle pulse + tonnage sparkline (`:91`), fatigue/RPE
  trend (`:99`), ACWR load (`:108`), session-duration trend (`:115`), muscle
  frequency this-vs-last week (`:129`), deload alert (`:52`).
- **Lifts** — `LiftProgressScreen.js`: strength standing (Beginner→Elite,
  `:138-193`), per-lift e1RM cards with delta% + sparkline + PR badge
  (`:245-303`); detail in `ExerciseDetailScreen.js` — weight|e1rm chart toggle
  (`:79`), windowed (`:75`,`:104`), PRs = 1RM-est/heaviest/most-reps
  (`:149-152`), plateau detection (`:25`).
- **Body metrics** — `BodyMetricsScreen.js`: weight trend (robust-EWMA +raw,
  `:137-238`), body-fat % trend (`:243-303`), **9** circumference trend charts
  (`:308-358`), snapshot grid w/ neutral deltas (`:1051`), phase detect (`:106`),
  adaptive-TDEE (`:840`), recomp reframe (`:872`); windows 1W–6M (`:148-159`).
- **Food** — `FoodInsightsScreen.js`: daily/weekly kcal bars + macro adherence
  table, 7/14/30/90d (`:57`,`:206-275`), CSV export (`:278`).
- **History** — `WorkoutHistoryScreen.js`: session list w/ tonnage chips +
  exercise breakdown, month calendar (`:497-556`), split filters (`:246`).
- **Cardio** — `CardioHistoryScreen.js`: session list + 8-week done-vs-planned
  trend (`:77-103`).
- **Windows/widget infra** — `chartWindows.js` (TREND_WINDOWS 1W–Y,
  VOLUME_WINDOWS 4W–6M), `WindowChips.js`; widget pipeline `lib/widgets/`
  (single next-session/consistency tile, PII-free by design).

### Gaps

1. **No per-exercise metric switcher.** Volyume's ExerciseDetail charts only
   weight or e1RM (`ExerciseDetailScreen.js:79`). Hevy offers best-set,
   heaviest, total-reps, session-volume, custom — five+ lenses on one lift.
2. **No progress photos.** Entirely absent in Volyume (BodyMetrics has zero photo
   code). Hevy has a full capture→gallery flow. (Caveat: PII/EU-residency +
   ED-safety review required before building — see Recommendations.)
3. **No recovery/freshness heatmap.** Volyume's heatmap is volume-vs-target only;
   Hevy also models per-muscle recovery state ("trained 2 days ago / fresh").
4. **Thin home-screen widget.** One tile vs Hevy's stats/chart/routine/muscle-
   radar widget family.
5. **No "lifetime stats" dashboard.** Volyume surfaces lifetime tonnage only as a
   one-off milestone card; no standing totals view (workouts, hours, weight
   lifted, longest streak) that Hevy exposes via profile + StatsWidget.
6. **Coarser measurements.** Hevy tracks abdomen, neck and per-side L/R arms;
   Volyume has 9 single-value sites (no per-side).
7. **Single recap cadence.** Volyume has monthly Recaps + Year-of-Lifts; Hevy
   adds a weekly-congrats moment and a heavier monthly report.

### Recommendations (adopt / adapt, size, priority, why)

| # | Recommendation | A/A | Size | Pri | Why |
|---|---|---|---|---|---|
| R1 | **Per-exercise metric switcher** on ExerciseDetail: add best-set, heaviest-weight, total-reps, session-volume alongside weight/e1RM. Data already lives in sets; reuse `VolyumeChart`+`WindowChips`. | Adapt | M | **P1** | Highest-leverage, lowest-risk: pure training data, no safety surface, large perceived-depth jump for serious lifters. |
| R2 | **Recovery/freshness heatmap** layer on VolumeHeatmap: per-muscle "last trained / recovered" view toggled against the existing volume view. Deterministic (days-since × landmark), no AI. | Adapt | M | **P1** | Differentiates from a plain volume chart; fits the coaching engine's deterministic mandate; "last trained" recency already computed (`VolumeHeatmapScreen.js:346`). |
| R3 | **Lifetime stats panel** on Progress: standing totals (sessions, hours, total weight, longest streak, muscles trained). Promote existing `getLifetimeTonnage`. | Adopt | S | **P2** | Cheap; satisfies the "show me my numbers" pull Hevy's StatsWidget serves, without comparison/leaderboards. |
| R4 | **Expand the home widget** to a stats/streak variant (sessions-this-week + lifetime tonnage), staying strictly PII-free per `lib/widgets/snapshot.js:16`. | Adapt | M | **P2** | Retention surface on the home screen; infra exists; must honour the no-body-data widget rule. |
| R5 | **Progress photos** — capture→private gallery→compare. **Decision-gated, not build-yet.** Needs founder sign-off on EU residency, local-only storage, and ED-safety (BodyMetrics already calm/ED-gates physique tracking, `:371-385`,`:720-749`). | Adopt-w/gate | L | **P3** | Big requested feature but collides with PII/offline-first/ED rules; route as a structured founder decision before any code. |
| R6 | **Per-side + abdomen/neck measurements.** Add L/R arm, abdomen, neck to the 9 sites. | Adapt | S | **P3** | Completeness for advanced users; schema/UI extension only. |
| R7 | **Weekly recap moment** between monthly recaps (reuse Recap pipeline). | Adapt | S | **P3** | Lighter cadence Hevy uses for habit reinforcement; keep founder copy-review (no comparison framing). |

Explicitly **do not adopt**: leaderboards / percentile / social compare — they
contradict the deliberate no-rank stance (`AnalyticsScreen.js:28`).

### Quick wins

- **R3 lifetime-stats panel** — small; `getLifetimeTonnage` + streak data already
  on the screen; mostly layout.
- **R6 extra measurement sites** — additive schema + grid rows; no new charts.
- **Per-exercise metric switcher (R1) phase-1**: ship `total-reps` and
  `heaviest-weight` first (trivially derivable from the set list already loaded
  in `ExerciseDetailScreen.js:141-151`) before the full five-metric set.
- **Reuse `WindowChips` on FoodInsights** for visual consistency with the lift /
  body / volume charts (it currently uses a bespoke selector).
