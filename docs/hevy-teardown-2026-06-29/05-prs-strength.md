# Hevy teardown — PRs & strength standards/stats

Competitive teardown of Hevy (RN/Hermes v3.1.0) vs Volyume. **Learnings only — never copy
Hevy code, copy, or assets verbatim.** Corpus evidence is from the packed Hermes bundle
(`bundle_strings.txt`, `screens_components.txt`); Hermes concatenates strings, so symbol
names below are corroborated by function names + UI copy, not guessed.

## PRs & strength — Hevy vs Volyume

### How Hevy does it

**A broad, per-modality PR taxonomy.** Hevy computes a record for every exercise *type*,
not just barbell weight×reps. Corroborated record-finder symbols in the bundle:
- `findWeightRepsOneRepMaxRecord` — "This is the highest 1RM you've ever achieved" (`Best 1RM` / `Meilleur 1RM` / `Migliore 1RM`).
- `findWeightRepsHeaviestSetRecord` — "The heaviest weight you've ever lifted."
- `findWeightRepsBestSetRecord` / `findWeightRepsMaxVolumeRecord` — `Best Set (Volume)`, `Best Set (Reps)`, `bestSetVolume` ("aggregate of all the weight lifted").
- `findRepsOnlyBestSetRecord`, `findRepsOnlyTotalRepsRecord` — bodyweight/reps-only lifts.
- `findWeightRepsAssistedBestSetRecord` (+ `...AssistedBestSetRepsRecord`) — assisted (e.g. assisted dip/pull-up).
- `findDistanceDurationLongestDistanceRecord`, `findDurationLongestTimeRecord`,
  `findShortDistanceWeightHeaviestSetRecord` — cardio/carry/duration lifts.
- `findStepsDurationMostStepsRecord`, `findFloorsDurationMostFloorsRecord` — "Most Steps", "Most Floors".
- Session-level: "Most reps completed in a single workout", `Best Session Volume Lifted`, `Most Session Reps`.

So the PR engine is **dispatched by the exercise's logging type** (weight+reps, reps-only,
weight+distance, distance+duration, duration, steps, floors, assisted) and each type has its
own set of record kinds. Records are a **persisted/cached** concept (`CalculatedPRCache`,
`PersonalRecordsCard`, `findWeightRepsHeaviestSetRecord` reads a record store; "We will
recalculate your previous workouts including their total sets, volume, and **personal records**").

**Live PR during the workout.** `isLivePRNotificationEnabled`, `LivePRPopup`,
`LivePRPopupManager`, `hasLivePRDetailsOverlay`, `calculateSetLivePRBadge`, and a configurable
**PR sound** (`setLivePRSoundFileName`, `checkSetLivePRSoundVolume`). Copy: *"When enabled, it'll
notify you when you achieve a Personal Record upon checking the set."* PRs fire the instant a set
is ticked, with a badge on the set row and a popup — not only at session end.

**Strength Level = sex + age + bodyweight percentile vs the user base.** Distinct from "relative
strength". Symbols: `StrengthLevelViewModel`, `calculateStrengthLevel`,
`getStrengthLevelFromPercentile`, `StrengthLevelMissingDataViewModel`, `Test Strength Level
Algorithm`. Copy (load-bearing):
- *"You are stronger than %{percent}% of %{sex} lifters your age and bodyweight"*
- *"Strength Level measures your strength in this exercise compared to Hevy users…"*
- Missing-data flow collects sex / birthday / bodyweight specifically to unlock it
  (`strengthLevelMissingData_sex_save_complete`, `_bodyweight_…`, `_birthday_…`):
  *"…weight so that we can show you your strength levels"*. Labels: Beginner→…→Elite ("Livello di forza", "Niveau de force"). Error states: *"Error loading strength level"*.

**Social comparison / leaderboards.** `CompareUserExerciseScreen` / `CompareUserExerciseViewModel`,
and *"This is a list of the heaviest weights lifted by the people you follow for %{exerciseTitle}"* —
records are explicitly ranked against people you follow.

**Year-in-review / dopamine.** "That's like lifting a T-rex / a bus / an elephant…" tonnage
metaphors, monthly report, and `findHardestWeightKgForExerciseOverviewModal`.

### How Volyume does it today (file:line)

- **3 PR types only, weight×reps only.** `detectPR()` returns `1rm_estimate`,
  `heaviest_weight`, `most_reps_at_weight` — `src/lib/algorithms.js:516-571`. Reps-only /
  duration / distance / steps lifts produce no PR (guarded out: `if (!weight || !reps) return prs`, line 521).
- **1RM ensemble** (Epley+Brzycki blend, rep-clamped at 20): `calculate1RM()` `src/lib/algorithms.js:77-101`. A second, *plain Epley* e1RM exists in `src/lib/bestLift.js:23` (`epleyE1rm`) and `getWeeklyPRCount` (`src/lib/database.js:4684`) — two estimators in the codebase, deliberately kept consistent only between bestLift/weeklyPRCount.
- **Collapse to one PR/exercise/session:** `bestPRPerExercise()` `src/lib/algorithms.js:598-619`, ranked `1rm_estimate > heaviest_weight > most_reps_at_weight`.
- **PRs are recomputed from logged sets, never stored** — there is no `personal_records`
  table on device (`src/lib/database.js:4844`, `:4942`, `:5041` all note "the personal_records
  table was never [kept]"). Recompute is O(all sets) each load.
- **Celebration:** `src/components/PRCelebration.js` — confetti + haptics + "+X% over your
  previous best", icon per type, plus a `subdued` toast variant. Fired at **session end** via
  `ActiveWorkoutScreen.js:898-904` (`detectPR` → `bestPRPerExercise` → `setDetectedPRs`), shown
  by App.js queue — there is **no live in-set PR**.
- **Strength standards:** `src/lib/strengthStandards.js` — **gender-neutral, bodyweight-ratio**
  only, **5 barbell compounds** (bench/squat/deadlift/OHP/row), buckets Untrained→Elite
  (`getStrengthLevel:56`, `summariseStrengthStanding:108`). Surfaced on
  `src/screens/LiftProgressScreen.js:138-194` (overall standing + per-lift "× bodyweight" + nearest rank-up).
- **Lift progress list:** `LiftProgressScreen.js` — per-lift e1RM trend, sparkline, "PR" tag on
  recent bests (`isRecentBest:42`), "Share this PR" → `ShareCardScreen.js`.
- **ED-safety posture (a deliberate divergence, not a gap to close):** strength is framed as the
  user's *own* competence/progress, **never ranked against other users** (`src/lib/bestLift.js`
  header; gain-ranked not heaviness-ranked, founder decision 2026-06-22).

### Gaps

1. **PR taxonomy is narrow.** Only weight×reps lifts ever earn a PR. Bodyweight/reps-only,
   assisted, duration (planks, carries), distance and step/floor exercises — all loggable —
   silently produce **zero** records and never celebrate. Hevy covers all of them.
2. **No live in-set PR.** Volyume detects PRs only at session finish; Hevy badges + pops + (optional)
   sounds the moment the set is ticked. The dopamine hit lands far from the effort.
3. **Strength standard is coarse vs Hevy's percentile model.** Volyume is gender-neutral,
   bodyweight-ratio, 5 lifts, static thresholds. Hevy is sex/age/bodyweight **percentile** across
   the user base and covers every exercise. Volyume users see "Elite/Untrained" with no sex/age
   context — less accurate, and only for 5 lifts. (Note: Hevy's *social ranking* is **out of
   bounds for us** by the ED-safety mandate — adopt the *accuracy*, not the leaderboard.)
4. **No "Best Set (Volume)" / session-level records.** No single-set max-volume PR, no
   "most reps / most volume in one workout" record — both cheap given data already logged.
5. **PRs recomputed from full set history every load** — no record cache. Fine now, but O(all sets)
   grows with tenure; Hevy keeps a `CalculatedPRCache`.

### Recommendations (adopt / adapt, size, priority, why)

| # | Recommendation | Adopt/Adapt | Size | Pri | Why |
|---|---|---|---|---|
| R1 | **Live in-set PR** — when a working set is ticked in `ActiveWorkoutScreen`, run `detectPR` against that exercise's prior history and show an inline badge on the set row + brief toast (reuse `PRCelebration subdued`). Keep the full confetti for session end. | Adapt | M | **P1** | Biggest felt-experience gap; effort→reward immediacy. Detection logic already exists (`detectPR`), only wiring + a set-row badge are new. |
| R2 | **Extend PR taxonomy to all logging types** — dispatch `detectPR` by exercise logging type: reps-only (best-set reps, total reps), duration (longest time), distance (longest distance), assisted (best assisted set), steps/floors. Add record kinds accordingly. | Adapt | L | **P2** | Closes the silent-no-PR gap for non-barbell work; matches Hevy's coverage; large surface (set-type model, new record types, copy). |
| R3 | **Sex-aware strength standards** — branch `STRENGTH_STANDARDS` on the biological sex already recorded at onboarding (kept gender-neutral today by explicit choice, `strengthStandards.js:5-8`). **Do NOT** add Hevy's percentile-vs-other-users or social leaderboard — ED-safety mandate forbids ranking against other people. | Adapt (accuracy only) | M | **P2** | Improves accuracy materially; the app already has sex. Stay framed as the user's own standing vs population reference tables, never vs other Volyume users. Needs founder sign-off (touches ED-adjacent framing). |
| R4 | **Session + best-set-volume records** — add "best single-set volume", "most reps in a workout", "most volume in a workout". | Adopt | S | **P3** | Cheap wins from already-logged data; more celebration moments without new input. |
| R5 | **Persisted PR/record cache** — a local `personal_records`-style table updated on finish, so PR reads aren't O(all sets). | Adapt | M | **P3** | Performance/scale; not user-visible now. Defer until R1/R2 land (they change what's cached). |

### Quick wins

- **Live in-set PR badge (R1)** — `detectPR` already exists; wire it on set-tick in
  `ActiveWorkoutScreen.js` (~line 898 logic) and render a small badge on the set row + reuse the
  `subdued` toast in `PRCelebration.js`. Highest ratio of impact to effort.
- **Best-set-volume PR (part of R4)** — one extra branch in `detectPR` (`value = weight*reps`,
  compare to historical max); flows through `bestPRPerExercise`, `PRCelebration`, share card for free.
- **"Most reps in a workout" session record** — derive from `summariseWorkoutSets`
  (`algorithms.js:124`) at finish; surface on `WorkoutSummaryScreen`.
- **Reps-only / duration PRs** — first slice of R2: just lift the `if (!weight || !reps) return`
  guard for the reps-only case so bodyweight lifts (pull-ups, dips) earn a "most reps" PR.
