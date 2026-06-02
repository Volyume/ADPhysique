Status: COMPLETE | Timestamp: 2026-06-02 | Phase 1: Internal audit

# Progress tab internal audit

A read-only inventory of every surface in the Progress stack, what it measures,
where the data comes from, and where it overlaps. The stack is rooted at
`AnalyticsScreen` (`RootNavigator.js:261`) and holds twelve screens. This doc
covers the eight that carry progress meaning. Exercise Library, Exercise Detail,
Workout Summary and Share Card are supporting screens, not progress surfaces.

## 1. Analytics (landing) `src/screens/AnalyticsScreen.js`

The landing is a vertical stack of roughly fourteen cards, gated so a fresh
account with under three sessions sees only the basics (`enoughForTrends`,
`AnalyticsScreen.js:481`).

| Card | What it shows | Source |
| --- | --- | --- |
| Mesocycle pulse | Active meso name, week, % complete, last-4-weeks tonnage sparkline | `getActivePlan`, `getCurrentMesocycleWeek` (`database.js:2468`) |
| Fatigue trend | Last 6 sessions' soreness / joint / difficulty | `getRecentWorkoutFeedback` (`database.js:5088`) |
| Block progress | Planned vs actual weekly volume per muscle | `getPlannedMuscleVolume` (`database.js:2633`) |
| Readiness cards | Milestones, recovery signals, muscle readiness, recovery trend (inlined from the retired Athlete Hub) | `ReadinessCards` component |
| Lighter-week banner | Deload recommendation + one reason | `shouldDeload` (`algorithms.js:562`) |
| Insight stack | 0..N dismissible insights | `runInsightsEngine` (`database.js:3054`) |
| Recent sessions | Last 3 workouts: name, date, duration, difficulty | `getAllWorkouts` |
| Volume snapshot grid | Working sets per muscle, this week, trained muscles only | `calculateWeeklyVolume` (`algorithms.js:95`) |
| Training load (ACWR) | Acute/chronic ratio, week tonnage, 4-week avg | `getAcuteChronicWorkload` (`database.js:1554`) |
| Session-length trend | Avg session minutes over 6 weeks + a coaching line | `loadSessionDurationTrend` (local) |
| Frequency table | Sessions per muscle, this week vs last | `loadMuscleFrequency` (local) |
| New personal bests | PR count per week, 30d or 90d toggle | `computePRsPerWeek` (`AnalyticsScreen.js:47`) |
| Training calendar | 12-week grid, trained vs rest | `loadCalendar` (local) |
| Quick-nav tiles | PR Wall, Lift Progress, History, Year of Lifts | navigation |

Every card is reasonable on its own. The screen has no hierarchy: fourteen
cards of near-equal weight, several of which repeat data shown elsewhere (see
§9). The migration comments in the file ("moved from Train tab", "Steps moved
to the Train tab, founder 2026-05-31", "founder declutter 2026-05-31") record
that this screen has been a holding pen.

## 2. Volume Heatmap `src/screens/VolumeHeatmapScreen.js`

The strongest single surface in the tab and the clearest expression of the
product's point of view.

- Anatomical body diagram, regions coloured by `getVolumeStatus` against
  effective landmarks.
- Window selector: 1 / 2 / 4 weeks.
- Per-muscle bars from 0 to MRV, with MEV and MAV tick marks, current set count,
  a faded ghost bar for the previous window, and "last trained" recency.
- A 4-week sparkline per trained muscle.
- Editable per-user landmarks (MEV/MAV/MRV), saved to AsyncStorage only,
  `@volyume_landmarks_${user.id}`. The code marks this "Stage 1, no Supabase
  yet" (`VolumeHeatmapScreen.js:68`), so custom landmarks do not sync across
  devices.

Data: `getCompletedWorkoutSets`, `getWeeklyVolumeByMuscle` (`database.js:1459`),
`getLastTrainedByMuscle` (`database.js:1524`), defaults from `VOLUME_LANDMARKS`.

## 3. PR Wall `src/screens/PRWallScreen.js`

- Filter tabs: All time / This month / This week.
- Relative strength card: overall tier (Beginner..Elite), "X kg from Elite on
  Squat" nearest rank-up, per-lift ratios and level badges. Gated on a logged
  bodyweight plus at least one PR. Built from `getStrengthLevel` and
  `summariseStrengthStanding` (`strengthStandards.js`).
- "Add your body weight" prompt when bodyweight is missing but PRs exist.
- Per-exercise PR cards: estimated max + date, heaviest weight + reps + date,
  relative strength, and a collapsible estimated-1RM trend chart (last 20
  sessions).

Note the unit fix at `PRWallScreen.js:158`: before it, a lbs user's ratio was
lbs/kg and inflated ~2.2x, so everyone read as Elite. Worth remembering as a
class of bug the redesign must not reintroduce.

## 4. Body Metrics `src/screens/BodyMetricsScreen.js`

Behind an opt-in gate (or Pro). The body-composition deep dive.

- Weight snapshot: latest, phase chip (gaining / maintaining / losing via linear
  regression on the last 8 entries, `BodyMetricsScreen.js:95`), delta badge,
  12-entry trend chart.
- EWMA smoothed weight once there are 7+ entries, with weekly change in kg/week.
- Estimated daily burn (adaptive TDEE) once 7+ weight entries and ~2 weeks of
  food, with a confidence label. `computeAdaptiveTDEEAdjustment`
  (`nutritionEngine.js`).
- Body fat % trend, smoothed.
- Nine circumference measurements (chest, shoulders, arms, forearms, waist,
  hips, quads, hamstrings, calves) with per-measurement trends.
- History table, and a log form.

Stored in SQLite `body_metrics`, synced to Supabase on save. Delta badges are
deliberately neutral-coloured, the correct adherence-neutral choice.

There are **no progress photos**. This is the single biggest content gap in the
tab (see doc 02 and doc 03).

## 5. Lift Progress `src/screens/LiftProgressScreen.js`

A list of every trained lift, most recent first. Per row: name, muscle, session
count, last date, estimated max, delta %, and a trend sparkline of per-session
1RM. Built by `buildLiftProgressRows` (`liftProgress.js:36`), working sets only,
best estimated 1RM per session, delta from first to latest. Taps through to
Exercise Detail. No gating.

## 6. Year of Lifts `src/screens/YearOfLiftsScreen.js`

A swipeable, Wrapped-style annual story: total sessions, tonnage moved, total
sets, busiest month, top exercises, top PRs, with an intro and outro. Locked
until 365 days from the earliest completed workout; the tile shows a countdown.
Built from `getYearOfLiftsData` (`database.js:3790`). Shareable. This is a
genuine, ownable artefact and should be kept as-is.

## 7. Coach Review `src/screens/CoachReviewScreen.js`

A weekly (Mon to Sun) review: snapshot stats, this-week volume grid with status
badges, up to three progressive-overload wins (heavier or more reps than prior
weeks), and up to three plain-English recommendations (deload, over/under a
muscle, a persistently lagging muscle, low energy/sleep, joint flags). Uses the
same `calculateWeeklyVolume`, `getVolumeStatus`, `shouldDeload` and
`detectLaggingMuscles` as elsewhere. Reads well, but it is a third place that
shows this-week volume.

## 8. Workout History `src/screens/WorkoutHistoryScreen.js`

Filterable, list or calendar. Per workout: date, relative time, duration,
working-set count, first four exercises, expandable to grouped sets with tonnage
/ difficulty / set / exercise chips, and a repeat/view-in-plans menu. A solid
log. Its calendar view is a third "days trained" visualisation.

## 9. Cross-cutting issues

### 9.1 The same answer, three times

- **Per-muscle volume, this week:** Analytics snapshot grid, Volume Heatmap, and
  Coach Review all show it, with different framings (compact trained-only,
  full 17 with landmarks, status badges).
- **Lift trend (estimated 1RM over sessions):** Lift Progress sparkline, PR Wall
  collapsible chart, and Exercise Detail. Three computations of the same line.
- **Days trained / frequency:** Analytics 12-week calendar, Analytics frequency
  table, and Workout History calendar.
- **Tonnage:** Mesocycle-pulse sparkline and the ACWR card, at different
  granularities.
- **PRs:** the Analytics "new bests per week" sparkline counts running-max
  events; the PR Wall groups by exercise. Two different PR models.

### 9.2 Inconsistent windows

7 days, 2 weeks (this vs last), 4 weeks (ACWR chronic, heatmap), 6 weeks
(session length), 12 weeks (calendar, measurement trend), 20 sessions (PR Wall
chart) and 365 days (Year of Lifts). Some windows are selectable, most are
hard-coded. There is no shared rhythm, so comparing across cards is unreliable.

### 9.3 Inconsistent terms

"Volume" means working sets in most places and tonnage in others. "Workload"
(ACWR) is a third load concept. "Sets" means working sets in calculations but
includes warm-ups in some summaries. The vocabulary should be pinned down.

### 9.4 Logged but never shown

Session difficulty (0..10) is logged per session but only ever shown as a chip,
never trended. Weekly check-in sleep/energy/joint scores feed Coach Review
recommendations but have no trend of their own. Post-session pump/connection
ratings feed recommendations but are invisible. There is signal here going
unused.

### 9.5 Real gaps

- No progress photos.
- No per-muscle PR aggregation (PRs are per-exercise only).
- Consistency is implied by the calendar but never stated as a simple read.
- The high-signal strength metric (estimated 1RM trajectory) is not led with
  anywhere; it sits inside lists and collapsibles.

### 9.6 Performance

The landing reloads all workouts and all completed sets on focus, and
recomputes the PR sparkline each time, with no caching or pagination
(`getAllWorkouts`, `getCompletedWorkoutSets`). Fine at hundreds of sets, a
likely lag at thousands. Worth noting for the rebuild, not a blocker.

### 9.7 Incomplete

Custom volume landmarks are AsyncStorage-only (no Supabase sync). If the
redesign promotes the volume surface, landmark sync should be finished so the
setting survives a reinstall (the install/identity rules make a clean reinstall
a normal event).

## Verdict

The capability is there and the Volume Heatmap, PR Wall strength standing, Body
Metrics and Year of Lifts are each good. The tab fails at the level of
organisation: redundant surfaces, a leaderless landing, drifting windows, unused
signal and a couple of clear gaps. The redesign is mostly a consolidation and a
hierarchy exercise, not a rebuild of the maths.
