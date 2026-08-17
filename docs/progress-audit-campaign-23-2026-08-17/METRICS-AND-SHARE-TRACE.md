# Progress Landing Page — Metrics & Share System Deep Trace
**Campaign 23 Phase 1 (Progress audit), Steps 4-7**

Generated: 2026-08-17. Evidence-first, file:line for every claim. No recommendations.
Prior artefact: `docs/progress-audit-campaign-23-2026-08-17/ELEMENT-INVENTORY.md` (mechanical inventory, read first — this document does not repeat its element/CTA/container tables, only the derivation logic behind four surfaces it named).

---

## 1. TRAINING LOAD (Step 4)

### 1.1 The series builder

`buildWeeklyLoadSeries(sets, opts)` — `src/lib/progressSeries.js:44-58`.

```js
export function buildWeeklyLoadSeries(sets, { weeks = DEFAULT_LOAD_WEEKS, now = Date.now(), exerciseTypeById = null } = {}) {
  const n = clampInt(weeks, 1, MAX_LOAD_WEEKS, DEFAULT_LOAD_WEEKS);
  const bins = Array.from({ length: n }, () => []);
  for (const s of (sets || [])) {
    const at = setTimestamp(s);
    if (!at || at > now) continue;
    const weeksAgo = Math.floor((now - at) / WEEK_MS);
    if (weeksAgo < 0 || weeksAgo >= n) continue;
    bins[n - 1 - weeksAgo].push(s);
  }
  return bins.map((binSets, i) => ({
    value: Math.round(calculateTonnage(binSets, exerciseTypeById)),
    weeksAgo: n - 1 - i,
  }));
}
```

- `DEFAULT_LOAD_WEEKS = 8`, `MAX_LOAD_WEEKS = 12` — `progressSeries.js:19-20`. Called with no `weeks` override at the call site (`AnalyticsScreen.js:185-188`), so the hero always shows **8** rolling weeks, never more (the file's own header comment, `progressSeries.js:10-12`, states the cap exists specifically so a runaway window "must be impossible from any call site").
- **Week boundary**: `weeksAgo = Math.floor((now - at) / WEEK_MS)` where `WEEK_MS = 7 * DAY_MS` (`progressSeries.js:16-17`). This is a **rolling 7-day window measured back from the exact render instant `now`**, not the Monday-anchored calendar week (`localWeekStartMs`) the rest of the screen uses for "This week's volume" (`useProgressData.js:270`, comment: *"T7 (comprehension-trust audit 2026-08-06): this used a rolling trailing-7-days window while the streak strip on the same screen used the Monday-anchored calendar week, so two 'this week' numbers on one screen could disagree... every 'this week' boundary uses localWeekStartMs"*). **The Training Load Hero was not migrated to that rule** — it still uses `now`-anchored rolling weeks. So on the same Progress landing render, "This week" in the hero (trailing 7 days ending right now) and "This week's volume" further down (Monday 00:00 to now) can describe **different date ranges** and therefore disagree on what counts as "this week."
- Because the bin is a genuine trailing 7-day span (not a Monday-to-today partial week), the *most recent* bin is **not partial** in the sense of containing fewer days than older bins — it always spans a full 7 days. There is no explicit partial-week flag or discounting anywhere in this function.

### 1.2 What counts as load: `calculateTonnage`

`src/lib/algorithms.js:156-163`, with helpers `isHardSet` (:196-199) and `isLoadBearingSet` (:165-173):

```js
export function calculateTonnage(sets, exerciseTypeById = null) {
  return sets.reduce((total, s) => {
    if (isHardSet(s) && isLoadBearingSet(s, exerciseTypeById)) {
      total += (s.weight || 0) * (s.actualReps || s.actual_reps || 0);
    }
    return total;
  }, 0);
}

function isLoadBearingSet(set, exerciseTypeById) {
  if (!exerciseTypeById) return true;
  const id = set.exerciseId ?? set.exercise_id;
  const type = exerciseTypeById[id];
  return !NON_LOAD_EXERCISE_TYPES.has(type);   // NON_LOAD_EXERCISE_TYPES = {'distance','duration'} (algorithms.js:154)
}

function isHardSet(set) {
  const setType = set.setType || set.set_type || 'straight';
  return setType !== 'warmup';
}
```

Set-type-by-set-type answer:
- **Warm-ups**: excluded (`isHardSet` returns false only for `'warmup'`).
- **Dropsets / myo-reps / rest-pause / cluster / any non-`'warmup'` set type**: `isHardSet` treats every non-warmup `setType` as hard, so **all of these count as full working sets**, tonnage included. `algorithms.js:175-185`'s comment on the sibling function `summariseWorkoutSets` states this explicitly: *"isHardSet excludes warm-ups ONLY, so a dropset counts as a full working set and its tonnage is included... this documents the current behaviour rather than the earlier comment which wrongly claimed dropsets were excluded."*
- **Reps-only bodyweight exercises**: not type-excluded (only `'distance'`/`'duration'` are, `algorithms.js:154`), but reps-only sets are logged with `weight = 0` (`algorithms.js:150` comment: *"'reps_only' carries weight 0"*), so `weight × reps = 0` — they self-exclude via the arithmetic, not via a type check, contributing **zero** to tonnage regardless of how many reps were done.
- **Weighted bodyweight** (e.g. weighted dips/pull-ups, `exercise_type: 'weighted_bodyweight'`): not excluded, and its logged `weight` value **is** counted — same as any free-weight set, weight × reps.
- **Distance/duration exercises**: excluded outright when `exerciseTypeById` is supplied, because those exercise types repurpose the weight/reps columns for metres/seconds (`algorithms.js:165-167`). `exerciseTypeById` is built in `AnalyticsScreen.js:179-184` from the loaded `exerciseMap` and threaded through to `buildWeeklyLoadSeries` at `AnalyticsScreen.js:185-188`, so this exclusion is live on the Progress landing page. Without a map (`exerciseTypeById = null`, the function's own default) every set is treated as load-bearing.
- **Machine exercises**: no special-cased exclusion or scaling — a machine-stack `weight` value is summed identically to a free-weight value; there is no equipment-type normalisation anywhere in `calculateTonnage`.

### 1.3 Units and the number the hero shows

`TrainingLoadHero` (`AnalyticsScreen.js:846-914`) reads `active = series[activeIdx]` (the scrubbed or latest week) and renders `active.value` via `RollingNumber` (:870-874) with the unit label `unit = units === 'lbs' ? 'lbs' : 'kg'` (:865). The raw number is whatever `calculateTonnage` returned for that week's bin, **already in the user's chosen gym unit** — the DB stores `weight` in the unit the user logs in, and no conversion happens in `progressSeries.js` or `algorithms.js`; the unit label is purely a display suffix.

### 1.4 Historical bars: what they plot, normalisation

The chart (`VolyumeChart` bar variant, `AnalyticsScreen.js:882-893`) plots `bars = series.map(pt => ({ value: pt.value, color: ...}))` — i.e. **raw weekly tonnage sums**, one bar per rolling week, oldest to newest, current week highlighted (`AnalyticsScreen.js:852-858`). There is **no normalisation**: no per-session average, no divide-by-days-trained, no deload discount, no volume-landmark (MEV/MRV) overlay. A week with more training days will show a taller bar purely from having more sessions, independent of any change in strength or per-session effort.

### 1.5 Factual answers

- **Can the number increase purely from added volume with no strength change?** Yes. Tonnage = Σ(weight × reps) over qualifying sets; adding more sets, more reps, or an extra session in the same week increases this sum with zero change to any 1RM/strength metric. No strength signal (e1RM, PR count) feeds into this number at all.
- **Can exercise-selection changes swing it?** Yes, in both directions. Swapping isolation work for heavier compounds inflates the figure with no change in effort quality; conversely, swapping barbell/machine work for reps-only bodyweight movements (push-ups, pull-ups without added load) can make the number **fall to near-zero for that muscle group's work** even though real training occurred, because reps-only sets carry `weight = 0` (§1.2).
- **Are bodyweight/machine schemas comparable across weeks?** Mechanically yes (same formula applied identically both weeks) but not physiologically: a machine's stack weight and a free-weight load are summed as if equivalent tension, and reps-only bodyweight work is summed as zero regardless of difficulty. The comparison is internally consistent (same rule every week) but not a true apples-to-apples measure of training stimulus across equipment types.
- **Is "Training load" semantically inaccurate for what is computed?** The eyebrow reads "Training load" (`AnalyticsScreen.js:868`) and the subtext reads "`${weekLabel} - weight lifted`" (:877) — the subtext is accurate (it *is* tonnage, weight × reps summed), but the headline label "Training load" is a broader claim than what is computed. It is specifically **tonnage** (external load only), not a load metric that accounts for intensity relative to 1RM, RPE/RIR, set count independent of load, or non-loaded (reps-only) effort. A user doing the same number of hard sets at higher RIR/lower %1RM, or doing calisthenics instead of weighted work, would read as having done markedly less "load" despite comparable or greater physiological stress.

---

## 2. SESSIONS / ADHERENCE / RUNS (Step 5)

### 2.1 Sessions spark card

`buildWeeklySessionCounts(sets, opts)` — `progressSeries.js:71-89`:

```js
export function buildWeeklySessionCounts(sets, { windowDays = DEFAULT_SPARK_DAYS, now = Date.now() } = {}) {
  const days = clampInt(windowDays, 7, MAX_SPARK_DAYS, DEFAULT_SPARK_DAYS);   // DEFAULT_SPARK_DAYS = 30 (progressSeries.js:21)
  const totalWeeks = Math.ceil(days / 7);
  const perBin = Array.from({ length: totalWeeks }, () => new Set());
  const all = new Set();
  ...
  for (const s of (sets || [])) {
    ...
    const workoutId = s.workoutId ?? s.workout_id;
    if (workoutId == null) continue;
    ...
    perBin[idx].add(workoutId);
    all.add(workoutId);
  }
  return { bins: perBin.map(ids => ids.size), total: all.size };
}
```

A "session" here is a **distinct `workoutId`** appearing among the loaded completed sets — the same window grammar as `computePRsPerWeek` (shared comment, `progressSeries.js:60-65`: *"the binning mirrors computePRsPerWeek so the two sparkline cards share one week grammar"*). `total` is a de-duplicated `Set` size across the whole 30-day window (not a naive sum of the weekly bins, which avoids double-counting a workout that straddles a bin edge). Rendered as the "Sessions" spark card, `AnalyticsScreen.js:332-339` — this is a **raw count of distinct sessions logged**, with no reference to any planned/target session count. It is pure adherence-agnostic activity count, not "did you hit your plan."

### 2.2 ConsistencyScreen.js — full trace

`src/screens/ConsistencyScreen.js` (225 lines, read in full). Reached from the Progress landing "Consistency" nav tile (`AnalyticsScreen.js:656`) or the "Sessions" spark card (`AnalyticsScreen.js:337`).

Explicit founder-ruling comment at the top of the render (`ConsistencyScreen.js:57-64`):

> *"Founder ruling (Today truth repair): the COMP-018 'Your weeks' consistency-run section is REMOVED. The weekly run/streak construct is rejected product-wide - 'N weeks running', the longest-run line, the kept/paused glyph strip and the 'pause your run' sheet all went with it. The factual training record this screen exists for (training block, recovery signals, workload, session length, frequency, the 12-week training calendar) is untouched."*

**The Consistency screen does NOT contain any "N of M sessions this week" or "N weeks running" construct.** Its actual content, top to bottom:

| Section | Component | Data source | File:Line |
|---|---|---|---|
| Lighter week banner | `Card tone="warning"` | `deloadAlert` (from `useProgressData().loadDeloadCheck`) | `ConsistencyScreen.js:66-82` |
| Training block | `BlockShapeCard`, `MesocyclePulseCard`, `FatigueTrendCard`, `BlockProgressCard` | `currentMesoWeek`, `activeMeso`, `mesoTonnage`, `fatigueSessions`, `blockProgress` | `ConsistencyScreen.js:112-152` |
| Recovery signals | `ReadinessCards` | `userId`, `tier` (own internal load) | `ConsistencyScreen.js:155` |
| Training load (ACWR) | `WorkloadCard` | `workloadData` (`getAcuteChronicWorkload`) | `ConsistencyScreen.js:158-162` |
| Session length trend | `SessionDurationChart` | `durationBars` (`loadSessionDurationTrend`, 6-week avg duration) | `ConsistencyScreen.js:164-170` |
| Training frequency | `MuscleFrequencyTable` | `muscleFreq` (this week vs last week, Monday-anchored) | `ConsistencyScreen.js:172-185` |
| Training day calendar | `TrainingCalendar` | `calValues` (84-day / 12-week completed-day squares) | `ConsistencyScreen.js:187-193` |

None of these render a weekly-completion count string ("N of M sessions this week") or a running-streak string. **This confirms the screenshot's weekly-completion / "weeks running" style copy is not present anywhere in the current Progress/Consistency surfaces.**

### 2.3 Where "N of M sessions this week" and "N weeks running" DO live now

They were relocated, not deleted outright, and only survive in **non-Progress** surfaces:

- **Home tab** — `src/screens/HomeScreen.js:2200` explicit comment: *`("N weeks running" / "Your run carries on") is REMOVED.`* and `HomeScreen.js:2257`: *"here replaces the dropped 'sessions this week' figure, which..."* — Home's own "Progress at a glance" card (`loadWeekStats`, guarded by `src/screens/__tests__/HomeScreen.weekBoundaryConsistency.guard.test.js:4,42`) still shows a "Sessions this week" figure, Monday-anchored. **This is on the Home tab, not the Progress tab — not reachable from the Progress landing page.**
- **Android home-screen widget** — `src/widgets/widgets.js:19` header comment: *`WeeklyConsistency: "N of M sessions this week"`*; rendered text at `widgets.js:110`: `` `${c.completed} of ${c.planned}` ``, sourced from `src/lib/widgets/snapshot.js:70`: `` `${clampInt(consistency.completed)} of ${clampInt(consistency.planned)} sessions this week` ``. The "N weeks running" line that used to sit under it is explicitly removed (`widgets.js:112-114`: *"Founder ruling (Today truth repair): the 'N weeks running' line is REMOVED — the weekly run/streak construct is rejected product-wide. The factual 'N of M' count and its dots stay."*). This is an OS home-screen widget, outside the in-app Progress tab entirely.
- **Coaching copy (weeklyCoach.js, weeklyStory.js, coachRegister.js)** — sentences like *"You trained all `${sessionsPlanned}` sessions this week. That is showing up."* (`src/lib/weeklyCoach.js:2178`) and *"You trained `${completed}` of `${planned}` planned session`${...}` this week."* (`src/lib/weeklyStory.js:48`) exist in the **coach output / weekly check-in** surfaces (CoachOutputScreen, WeeklyCheckInScreen), not on the Progress landing page.
- **"N weeks running" as a live, still-shipping feature** exists in exactly one place unrelated to the removed streak: `src/screens/PartnerScreen.js:495-497` — a **partner shared-streak** count (`"${run} weeks running together"`), driven by `src/lib/partners/sharedStreak.js`, counted in training weeks. This is a distinct, deliberately-kept feature (guarded by `src/__tests__/rollingNumber.guard.test.js:33`: *"the 'N weeks running, together' count on PartnerScreen is a deliberately [kept]..."*) — reachable from Progress only indirectly, via the "Partners" nav tile (`AnalyticsScreen.js:497-506`) into the Pro Partner surface, not shown on the Progress landing itself.
- Ordinary-English uses of the phrase "weeks running" also survive as coaching **prose** (not a badge/counter construct) in `src/components/ReadinessCards.js:108,122` (*"Sleep has been rated low for `${lowSleepWeeks}` weeks running..."*) and `src/lib/coachResponse.js:199` — these are sentence fragments inside dynamically generated coaching text, not a dedicated streak UI element, and the test suite explicitly distinguishes them from the removed construct (`todayTruthRepair.guard.test.js:33`: *"Ordinary English 'N weeks running' in coaching prose (ReadinessCards'...) [is allowed]"*).

### 2.4 Lifetime kg lifted / tonnage milestone system

`getLifetimeTonnage(userId)` — `src/lib/database.js:7531-7551`:

```sql
SELECT COALESCE(SUM(ws.weight * ws.actual_reps), 0) AS tonnage
FROM workout_sets ws
JOIN workouts w ON ws.workout_id = w.id
LEFT JOIN exercises e ON e.id = ws.exercise_id
LEFT JOIN custom_exercises ce ON ce.id = ws.exercise_id AND ce.user_id = ws.user_id
WHERE ws.user_id = ? AND w.is_completed = 1
  AND (ws.set_type IS NULL OR ws.set_type != 'warmup') AND ws.actual_reps > 0 AND ws.weight > 0
  AND COALESCE(ce.exercise_type, e.exercise_type, 'weight_reps') NOT IN ('distance', 'duration')
```

Same exclusion rule as `calculateTonnage` (non-warmup, non-distance/duration, positive weight and reps), computed directly in SQL over the entire lifetime history (not the in-memory 8-week window). Used two ways on the Progress landing:
1. **Lifetime totals panel** — `AnalyticsScreen.js:632-635`, `formatNumber(lifetimeTonnage)` + `"kg lifted"`/`"lbs lifted"`, a standing read-only figure.
2. **Tonnage milestone banner** — `AnalyticsScreen.js:365-383`, only rendered when `tonnageLandmark` (a pending, not-yet-seen threshold) is non-null.

`src/lib/tonnageMilestone.js`: thresholds `TONNAGE_MILESTONES = [100000, 250000, 500000, 1000000, 2000000, 5000000, 10000000]` (:15, user's gym unit — kg for a kg user, so effectively raw-unit thresholds, not unit-converted). `pendingTonnageMilestone(tonnage, seen)` (:20-24) returns the **highest** unseen crossed threshold. `markTonnageMilestoneSeen` (:42-50) persists per-user in AsyncStorage (`@volyume_tonnage_v1_${userId}`), written only when the user taps "Create share image" (`AnalyticsScreen.js:129`), so the banner **persists across app opens until the CTA is tapped**, not dismissed by simply viewing it.

Exact copy: `AnalyticsScreen.js:369-371`:
```
{formatTonnage(tonnageLandmark)} {units === 'lbs' ? 'lbs' : 'kg'} lifted all-time. That's what showing up adds up to.
```
This is the current live successor to the screenshot's "raw share-oriented copy about lifetime load / showing up." Comment context (`AnalyticsScreen.js:361-364`): *"T9 (world-class audit 2026-07-03, identity-copy sweep): matches the 'showing up' identity register the streak-milestone copy above already uses."*

The row is a Progress-landing-only surface — always visible (not dismissable) whenever a threshold is pending; disappears only once `markTonnageMilestoneSeen` is written (i.e. only via the CTA tap, not by scrolling past it or navigating away).

### 2.5 Adherence vs progress — summary

None of the constructs traced above answer "did you improve" — they are exclusively **adherence** (did a session happen / how many / how consistent) or **volume totals** (how much was lifted), never a comparison against a prior performance baseline. The one place a genuine "did you improve" signal exists on this trace is the PR system (Section 3).

---

## 3. NEW BESTS / PRs (Step 6)

### 3.1 `computePRsPerWeek` — full trace

`src/hooks/useProgressData.js:23-73`:

```js
export function computePRsPerWeek(allSets, exerciseMap, windowDays, now = Date.now()) {
  const windowStart = now - windowDays * DAY_MS;
  const byEx = {};
  for (const s of allSets) {
    const exId = s.exerciseId ?? s.exercise_id;
    if (!exId) continue;
    (byEx[exId] ??= []).push(s);
  }
  for (const id of Object.keys(byEx)) {
    byEx[id].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  }
  const prEvents = [];
  for (const [exId, sets] of Object.entries(byEx)) {
    const exType = exerciseMap?.[exId]?.type ?? 'weight_reps';
    if (exType !== 'weight_reps') continue;
    let runningMax = 0;
    for (const s of sets) {
      const st = s.setType ?? s.set_type ?? 'straight';
      if (st === 'warmup' || st === 'myo_reps' || st === 'rest_pause') continue;
      const at = s.createdAt ?? s.created_at ?? 0;
      const w = s.weight ?? 0;
      const r = s.actualReps ?? s.actual_reps ?? 0;
      if (w <= 0 || r <= 0) continue;
      const est = calculate1RM(w, r);
      if (est > runningMax) {
        const isBaseline = runningMax === 0;
        runningMax = est;
        if (!isBaseline && at >= windowStart) prEvents.push(at);
      }
    }
  }
  // bin prEvents into week slots ...
}
```

**Exact PR definition**: for each exercise, a running e1RM maximum (via `calculate1RM`, Epley/Brzycki ensemble, `algorithms.js:101-...`) is tracked across the exercise's ENTIRE history (all sets, not windowed) in chronological order. Every time a set's estimated 1RM **strictly exceeds** the running max so far, a PR event is recorded at that set's timestamp — **but only if it is counted from the CTA calling logic that filters `at >= windowStart`**, i.e. only PR events falling inside the requested day window are binned/counted, though the running-max scan itself uses full lifetime history (so a PR from month 1 correctly suppresses a lower "PR" claim inside the current window). Key gates, each with an explicit code comment tying it to a specific correction:

- **Baseline exclusion (FQ-7)**: `algorithms.js` comment / `useProgressData.js:57`: *"FQ-7: the first qualifying exposure is a BASELINE, never a record."* The very first valid set logged for an exercise sets `runningMax` but is **never counted as a PR** (`isBaseline` guard). Comment at `useProgressData.js:39-44` explicitly documents the prior bug this fixes: *"This tile now mirrors the live detector's gates. It used to count the FIRST-EVER set of every exercise as a record... included warm-ups and cluster rows, and never read its own exerciseMap - so three new exercises showed '3 new PRs' and distance exercises produced phantom records."*
- **Set-type gates**: `'warmup'`, `'myo_reps'`, `'rest_pause'` sets are skipped entirely (:50) — they neither set nor break the running max.
- **Exercise type gate**: only `exType === 'weight_reps'` exercises are scanned at all (:45-46) — bodyweight (reps-only), distance and duration exercises never generate PR events through this function.
- **Weight/reps validity gate**: `w <= 0 || r <= 0` sets are skipped (:54) — no zero-weight (reps-only-style) or zero-rep rows can register.
- **No explicit dropset exclusion**: `setType` values other than `'warmup'`, `'myo_reps'`, `'rest_pause'` (e.g. `'dropset'`, `'straight'`) are **not filtered out**, so a dropset CAN register a PR event if its estimated 1RM beats the running max.

### 3.2 Can one workout produce many PR events? Can 115/30-days arise?

Yes, mechanically, for two independent reasons visible directly in the code:

1. **Per-exercise, not per-workout**: the loop is `for (const [exId, sets] of Object.entries(byEx))` — every exercise the user has ever logged is scanned independently. A single session touching, say, 6-8 exercises can register up to one PR event per exercise **in that one session**, if every exercise's first working set in that session exceeds its prior running max.
2. **New-user baseline mechanics**: the FQ-7 baseline guard excludes only the *first-ever* set per exercise. For a brand-new user, their **second-ever exposure** to any exercise (a different weight/reps combo in the same or a later session) that estimates even fractionally higher than the first already qualifies as a PR event. A new user training several exercises across several early sessions, each producing incremental e1RM increases (which is typical/likely for a beginner adding weight or reps every session), can accumulate PR events rapidly: e.g. 8 exercises × logged 2-3× a week over 30 days, each producing a PR on most exposures (novice linear progression), plausibly yields dozens of events — a count in the 100+ range across a 30-day window is constructible from this mechanism without any data-quality bug, purely from "every exercise gets slightly better on most early sessions."

### 3.3 Deduplication

**Per set, not per exercise-per-day**: the function records one `prEvents` entry per qualifying set that beats the running max, so if a single session logs several sets of the same exercise with escalating weight (e.g. 3 progressively heavier top sets), **more than one PR event can fire for the same exercise in the same session** — there is no per-exercise-per-day cap or dedup step visible in this function.

### 3.4 Binning and the spark card total

`computePRsPerWeek` returns an array of weekly counts (:64-72); `useProgressData.js:355-363` (`loadPRBars`) wraps this into `{value, frontColor, label}` bars, called with `windowDays = 30` (`useProgressData.js:176`). `AnalyticsScreen.js:222-225` sums the bars: `prSpark.total = prBars.reduce((s, b) => s + b.value, 0)` — **the "New PRs" number shown on the spark card is a sum of set-level PR events across the 30-day window**, i.e. a **set-level event count**, not a count of distinct exercises that got a new best, and not a count of distinct days.

### 3.5 Does this match what LiftProgressScreen shows as a "PR"?

Not directly comparable. `LiftProgressScreen.js` (`openLiftMenu`, :215-247) exposes a "Share this PR" action per row keyed on `row.bestE1rm` — **the exercise's current best-ever e1RM**, a standing value, gated only on `safeNumber(row.bestE1rm) > 0` (:231). This is **not** "did this exercise just PR" — it is always offered for any exercise with a positive best e1RM on record, regardless of whether that best was set today, a month ago, or a year ago. So the PR spark card's count (recent PR **events**, time-windowed) and LiftProgressScreen's per-row PR share affordance (a standing **current-best** value, not time-gated) are two different constructs answering different questions, both under the "PR" umbrella.

### 3.6 The stale "New bests" comment

`AnalyticsScreen.js:609-612`:
```
{/* The old full-width "New personal records" sparkline section moved
    into the half-width New bests card at the top of the dashboard
    (A5); the detail per lift lives on LiftProgress, which that card
    opens. */}
```
The live card's label is **"New PRs"** (`AnalyticsScreen.js:341`), not "New bests" — the comment was not updated when the label was renamed, confirming the rename the campaign brief flags. The element inventory (`ELEMENT-INVENTORY.md` line 146) independently notes this same discrepancy.

### 3.7 Factual answer: what does "115" count?

If reproduced today, "115 in the last 30 days" would be a **sum of set-level PR events** (§3.4) — every individual working set (excluding warm-ups, myo-reps, rest-pause) whose estimated 1RM beat that exercise's prior best, across every `weight_reps`-type exercise the user has ever logged, within the 30-day window, with the FQ-7 first-exposure baseline excluded per exercise. It is **not** a count of distinct exercises, distinct sessions, or distinct days.

---

## 4. SHARE SYSTEM (Step 7)

### 4.1 Share CTAs visible on ONE Progress landing render

Exactly **two** "Create share image" CTAs render directly on `AnalyticsScreen.js` itself, both conditional:

1. **Tonnage milestone CTA** — `AnalyticsScreen.js:373-380`, visible only `if (tonnageLandmark)` (a pending lifetime-tonnage threshold crossed and not yet seen, §2.4). `onPress={makeTonnageCard}` (:127-142) navigates to `ShareCard` with `milestoneData: { eyebrow: 'Lifetime total', title: 'Total weight lifted', heroValue: formatTonnage(tonnageLandmark), heroUnit: '${u} lifted', caption: 'Every working set you have ever logged, added up.', date: Date.now(), stats: [] }`.
2. **Training load hero CTA** — `AnalyticsScreen.js:904-912` (inside `TrainingLoadHero`), visible whenever the hero itself renders (`enoughForTrends`, §ELEMENT-INVENTORY). `onPress={onMakeCard}` → `makeTrainingLoadCard` (`AnalyticsScreen.js:194-210`) navigates to `ShareCard` with `milestoneData: { eyebrow: 'Training load', title: 'Your training load', heroValue: <latest week tonnage>, heroUnit: '${u} lifted, this week', caption: 'Averaging ${avg} ${u} a week over the last ${weeklyLoad.length} weeks.', date: Date.now(), stats: [] }`.

Both are only reachable simultaneously if a tonnage milestone happens to be pending AND the user has ≥3 sessions (`enoughForTrends`); otherwise only #2, or neither, shows. **Maximum distinct share CTAs visible on one landing render: 2.**

### 4.2 Every other `ShareCard`-navigating call site (one tap away from Progress, not on the landing render itself)

| Call site | File:Line | Card type | Reached from Progress? |
|---|---|---|---|
| `WorkoutSummaryScreen.handleShareCard` | `WorkoutSummaryScreen.js:909-942` → button at :1804-1814 | `sessionData` (+`prData`/`prList` if PRs) | Yes, via "Recent sessions" cards, but **gated `!readOnly`** (:1804) — Progress landing's Recent Sessions cards navigate with `readOnly: true` (`AnalyticsScreen.js:568-579`), so **this Share button does NOT render** when reached from the Progress landing page. |
| `WorkoutSummaryScreen.handleShareMilestone` | `WorkoutSummaryScreen.js:1030-1044`, rendered at :1192-1209 | Milestone card (in-session celebration) | `milestone` state (:232) is set only via effects gated on live (non-readOnly) session context (pattern matching the other `if (readOnly ...) return;` guards at :419, :497, :581, and the explicit note at :1121-1124 that a related milestone id "is null on the read-only history view"), so this is not reachable from Progress's read-only session cards. |
| `WorkoutSummaryScreen.handleShareBlock` | `WorkoutSummaryScreen.js:1045-...`, button at :1640 | Block-finished milestone | Same read-only-session caveat as above; not a Progress-reachable path in the read-only flow. |
| `LiftProgressScreen` "Share this PR" | `LiftProgressScreen.js:231-244` | `prData` (single lift's current best e1RM, §3.5) | Yes — via "Lifts" nav tile or "New PRs" spark card → LiftProgress → long-press a row → "Share this PR". |
| `YearOfLiftsScreen.handleShareYear` | `YearOfLiftsScreen.js:644-649`, CTA at :689-694 (label "Create share image") | `buildRecapMilestoneData(data, {variant, ...})` — month/week/block/year variants | Yes — via "Recaps" nav tile (unlocked ≥10 sessions) or "Year of Lifts" tile (unlocked 365 days) or the ephemeral recap card on the landing page itself. |
| `BodyMetricsScreen` milestone card | `BodyMetricsScreen.js:1269` | `milestoneData` (body-metrics milestone) | Yes — via "Body Metrics" nav tile (Pro). |
| `CoachOutputScreen` | `CoachOutputScreen.js:2510` | weekly recap (`weeklyRecapData`) | Not from Progress; reached from the coaching flow. |
| `BeforeAfterShareSheet` (progress-photo before/after) | `src/components/BeforeAfterShareSheet.js`, triggered from `ProgressPhotosScreen.js:1985` | Two dated progress photos composited, **with bodyweight caption per photo** (the one founder-approved GDPR exception) | Yes — via "Progress photos" nav tile (promoted, Pro). |

### 4.3 `ShareCardScreen.js` — full trace of card types and fields

Read in full (`src/screens/ShareCardScreen.js`, 747 lines). One Skia renderer (`drawShareCard`) serves both the on-screen preview and the exported PNG (header comment, :1-12): *"what you see is exactly what you share."*

Four `cardType` values, selected from which route params are present (:98-100):
- **`'session'`** (`sessionData`) — fields: `planName`, `sessionName`, `workingSets`, `duration`, `tonnage`, `exerciseCount`, `exercises[]`, `prCount`, `topSet`, `intensityTier`, `units`, `date`. Toggleable via switches: Date, Plan name, Total weight lifted, Exercise names (:547-552).
- **`'pr'`** (`prData`/`prList`) — fields: `exerciseName`, `weight`, `reps`, `units`, `previousBest`, `date`. Toggleable: Date, PR weight, Previous best (:555-559).
- **`'milestone'`** (`milestoneData`) — fields: `eyebrow`, `title`, `heroValue`, `heroUnit`, `caption`, `stats[]` (max 3, :218), `date`. This generic type serves the lifetime-tonnage milestone, the training-load hero card, the YearOfLifts/Recaps card, and the BodyMetrics milestone card — **no bodyweight/measurement fields exist in this shape** at all; only whatever the caller puts into `heroValue`/`stats` from training data.
- **`'weekly'`** (`weeklyRecapData`) — the weekly coaching recap, built via `buildWeeklyRecapParams` (`src/lib/shareCard/greatWeek.js`), the only card type that can carry a real **weight-progress hero** (`showProgress` toggle, :561-568) and a "Best lift of the week" toggle. This is the one non-photo card type that can show progress/weight-adjacent content, and it is explicitly gated (§4.4).

### 4.4 GDPR guard mechanisms, quoted

Baseline rule, stated in-screen as user-facing copy (`ShareCardScreen.js:570-574`):
```
{isWeekly
  ? "Only this week's progress, lifts and sessions are shown. Your measurements and private notes are never included."
  : 'Name, bodyweight, measurements and private notes are never included.'}
```

**Weekly recap suppression** (`ShareCardScreen.js:83-92`): a route param `suppress: suppressParam = false` combined with a live hook read:
```js
const suppressedLive = usePhotoSuppression();
const suppress = suppressParam || suppressedLive;
```
Comment (:83-90): *"ED-safety gate, fail closed. A route param defaulting to false meant any caller that forgot to pass it... exported the weekly card's progress hero with no gate at all. An ED-safety gate must not depend on a caller remembering something."* When `suppress` is true, the "Weight progress" and "Best lift" toggles are hidden entirely (:561, `isWeekly && !suppress`) — progress language cannot be re-enabled via the UI once suppressed.

**Before/after progress-photo card** (`BeforeAfterShareSheet.js`, drawn by `drawShareCard.js:807-823`), the single founder-approved exception, quoted in full:
```
// WEIGHT-ON-CARD is a FOUNDER-APPROVED override of the locked "share cards never
// include name/bodyweight/measurements/private notes" rule (progress-photos
// DECISIONS #2, 2026-07-03). It is bounded, not a general loosening:
//   - the whole card is WITHHELD under calm mode OR an open ED-pattern flag —
//     BeforeAfterShareSheet gates on usePhotoSuppression, fail-closed, BEFORE
//     compose/encode/share, so a suppressed user never reaches this renderer;
//   - weight is a user toggle (default on); dropping it leaves photos+dates+
//     elapsed only;
//   - name, measurements and private notes stay banned — bodyweight only, here
//     only.
```
The gate itself, `src/hooks/usePhotoSuppression.js:52-80`:
```js
export default function usePhotoSuppression(explicitUserId) {
  ...
  const [suppressed, setSuppressed] = useState(true);   // fail CLOSED: starts suppressed
  useEffect(() => {
    ...
    const [mode, edFlag] = await Promise.all([
      AsyncStorage.getItem(WELLBEING_KEY).then(v => v || 'unspecified').catch(() => 'read_failed'),
      getOpenEdPatternFlag(userId).catch(() => 'read_failed'),
    ]);
    if (alive) setSuppressed(derivePhotoSuppression({ mode, edFlag }));
    ...
  }, [userId]);
  return suppressed;
}
export function isPhotoSuppressed(calm, edFlagOpen) { return !!calm || !!edFlagOpen; }
```
Both reads (wellbeing mode, open ED-pattern flag) map read *failures* to a suppressing sentinel (`'read_failed'`) rather than to a permissive default, and the hook's initial state is `suppressed = true` until both reads resolve — a genuinely fail-closed gate at both the "no data yet" and "read errored" cases.

**Milestone/session/PR cards** carry no bodyweight or measurement fields in their data shape at all (§4.3) — for these three card types the GDPR guard is structural (the field simply does not exist to leak) rather than a runtime suppression check.

### 4.5 Voice/copy across card types

- Session: `sessionName || 'Workout complete'` (`ShareCardScreen.js:227`).
- PR: `exerciseName || 'Exercise'`, plain weight/reps/previousBest numerals.
- Milestone (tonnage): "Total weight lifted" / caption "Every working set you have ever logged, added up." (`AnalyticsScreen.js:134-137`).
- Milestone (training load): "Your training load" / caption "Averaging `${avg}` `${u}` a week over the last `${n}` weeks." (`AnalyticsScreen.js:202-205`).
- Recap (Year/Month/Week/Block): built by `buildRecapMilestoneData` (`src/lib/shareCard/recapPayload.js:43-109`) — e.g. month variant eyebrow `'MONTHLY RECAP'`, hero = session count, stats array of `{tonnage} kg lifted`, `{totalSets} sets`, `{topPRs.length} PR(s)` (:53-61). All four variants (`month`/`week`/`block`/year-default) are strictly session-count/tonnage/set/PR figures — no bodyweight or measurement field is ever read into any of these.

---

## FACT TABLE — screenshot string → current source

| Screenshot string (transcribed) | Current source | Status |
|---|---|---|
| "Training load / 136,664 kg / This week - weight lifted" | `TrainingLoadHero`, `AnalyticsScreen.js:846-914` (eyebrow :868, subtext :877); value from `buildWeeklyLoadSeries` (`progressSeries.js:44-58`) → `calculateTonnage` (`algorithms.js:156-163`) | **FOUND**, unchanged construct |
| "Sessions" card | `SparkCard`, `AnalyticsScreen.js:332-339`; `buildWeeklySessionCounts` (`progressSeries.js:71-89`) | **FOUND**, unchanged construct |
| "New bests / 115 / Last 30 days" | Label now **"New PRs"** (`AnalyticsScreen.js:341`); value from `computePRsPerWeek` (`useProgressData.js:23-73`), summed 30-day set-level PR events (§3.4) | **FOUND, RENAMED** — comment at `AnalyticsScreen.js:609-612` still says "New bests card" (stale) |
| Weekly session completion copy ("N of M sessions this week") | **NOT on Progress landing or Consistency screen.** Nearest successor: Home tab "Sessions this week" glance card (`HomeScreen.js:2257`) and the Android `WeeklyConsistencyWidget` (`widgets.js:19,110`, `snapshot.js:70`) — both outside the Progress tab | **NOT FOUND IN PROGRESS TREE** — successor named |
| "weeks running"-style text | **REMOVED** from Progress/Consistency per founder ruling "Today truth repair" (`ConsistencyScreen.js:57-64`, `AnalyticsScreen.js:95-99, 353-359`, `streak.js` COMP-018 header). Still shipping, unrelated feature: `PartnerScreen.js:495-497` partner shared-streak; ordinary prose use in `ReadinessCards.js:108,122` | **NOT FOUND IN PROGRESS TREE** — explicitly deleted by founder ruling, successor named |
| Lifetime kg lifted | `getLifetimeTonnage` (`database.js:7531-7551`); shown in "Lifetime totals" panel (`AnalyticsScreen.js:632-635`) and the tonnage milestone banner (`AnalyticsScreen.js:365-383`) | **FOUND**, two live surfaces |
| Multiple "Create share image" CTAs | Tonnage milestone CTA (`AnalyticsScreen.js:373-380`) + Training load hero CTA (`AnalyticsScreen.js:904-912`) = 2 on one landing render (§4.1) | **FOUND** |
| Raw share-oriented copy about lifetime load / showing up | `AnalyticsScreen.js:370`: *"`${tonnage}` kg lifted all-time. That's what showing up adds up to."* | **FOUND**, unchanged construct |

---

## Untraceable / out-of-scope items

- The exact founder screenshot device/session context (date, app version) is not derivable from source alone — the trace above establishes what the CURRENT tree computes and renders, not what the screenshot's build necessarily showed.
- `weighted_bodyweight` sets: whether the DB's `weight` column for this exercise type stores the added-load only or added-load + estimated bodyweight was not resolved from `algorithms.js`/`database.js` schema comments in this pass — flagged as an open question for the lead rather than asserted either way.
