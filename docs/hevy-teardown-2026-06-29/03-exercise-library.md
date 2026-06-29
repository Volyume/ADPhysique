# 03 — Exercise library, search, instructions/media, custom exercises, muscle mapping

Competitive teardown: Hevy (RN/Hermes, v3.1.0) vs Volyume. LEARNINGS only —
no Hevy code, copy, or assets are reproduced or copied verbatim. All evidence
is drawn from the decompiled Hermes string bundle and corroborated across
`screens_components.txt`, `events_keys.txt`, and `res_strings.xml`.

Corpus: `/tmp/.../scratchpad/corpus/` (bundle_strings.txt, screens_components.txt).

---

## Exercise library — Hevy vs Volyume

### How Hevy does it

Evidence is from the Hermes bundle; token names are Hevy's internal view-model
and screen identifiers (corroborated across the string and component dumps).

**Data model — rich, multi-axis taxonomy.**
- **Muscle groups (~30 tokens):** `muscleGroup.{chest, back, lats, upperBack,
  lowerBack, traps, shoulders, biceps, triceps, forearms, abdominals,
  obliques(waist), quadriceps, hamstrings, glutes, calves, adductors,
  abductors, neck, fullBody, cardio, other}` plus joints/regions used as
  filters (`wrists, elbows, knees, hips, ankles, groin, ribs`). Far finer than
  Volyume's 17.
- **Primary + secondary + "other" muscles:** dedicated flows
  `SelectPrimaryMuscleGroupScreen/ViewModel`, `SelectSecondaryMuscleGroupsScreen/ViewModel`,
  and an `other_muscle` token. Users pick primary AND multiple secondaries when
  creating an exercise.
- **Equipment (~30 tokens):** `Equipment.{barbell, dumbbell, ezBar, trapBar,
  kettlebell, machine (stack/plate), smithMachine, cable (single/dual),
  latPulldownCable, legPressMachine, resistanceBands, suspension, rings,
  dipBar, pullupBar, squatRack, adjustableBench/flatBench, landmine,
  medicineBall, battleRope, jumpRope, rowingMachine, treadmill, elliptical,
  stairMachine, spinning, airBike, …}`. Volyume has ~12 coarse labels.
- **Exercise *type* (the set-schema axis Volyume lacks entirely):**
  `exerciseType.{weightReps, repsOnly, bodyweight, bodyweightAssisted,
  weightedBodyweight, duration, weightDuration, distanceDuration,
  shortDistanceWeight, stepsDuration, floorsDuration}`. This drives which set
  input fields render (weight×reps vs distance×time vs reps-only etc.), so the
  same logger handles lifting, cardio, carries, planks and stretches uniformly.

**Per-exercise media.** Hevy bundles/serves **per-exercise thumbnail images**
from CloudFront, e.g.
`https://d2l9nsnmtah87f.cloudfront.net/exercise-thumbnails/<id>-<Name>-(female)_<Region>_thumbnail_@3x.jpg`
— with **gender variants (male/female), @3x density, and a muscle-region tag in
the filename**. Tokens `ExerciseImage`, `ExerciseMedia`, `exerciseThumbnailUrl`,
`isVideoThumbnail`, `moveMediaToIndex`, `CreateThumbnail`, and a
`MuscleHeatmapOverlay`/`muscleHeatmapData` confirm: animated/looping thumbnails,
a **muscle heat-map diagram** per exercise, and user-attachable media on custom
exercises (multiple media items, reorderable).

**Exercise detail = tabbed.** `ExerciseDetailTabNavigator` with tabs:
`ExerciseInstructions` / `HowToScreen` (numbered **instruction steps**),
`ExerciseHistory`, `PersonalRecords`/`PersonalRecordsCard` (`PersonalRecordType`),
`exerciseStats`, plus `MuscleHeatmap`. There is a **`StrengthLevel`** system
(`StrengthLevelFromPercentile`, `StrengthLevelScreen`, `StrengthLevelEligible`,
`StrengthLevelMissingDataCell`) — ranks a user's lift against a population
percentile (Beginner→Elite). `getBundledExerciseMetaDataTranslations` shows the
canonical library + instructions ship **localised** in the bundle.

**Search/filter.** Distinct filter pipelines:
`filterExercisesWithSearchText`, `filterExercisesForMuscleGroup`,
`filterExercisesForSecondaryMuscleGroup`, `filterExercisesWithEquipment`,
`RecentExercise`/`recentExercisesFiltered`, plus an `ExerciseFilterOverlay`.
Muscle + equipment + free-text combine; recents surface first.

**Custom exercises.** Full `CreateExerciseScreen/ViewModel/Header`,
`isCustomExerciseTypeSelectionScreen`, `CreateThumbnail` — name, type, primary +
secondary muscles, equipment, **own photo/media**. Editable
(`createExerciseDetailViewModel`).

**Substitutions.** `ReplaceExercise`/`replaceExercise`, `Substitutions` — an
in-workout swap surface (manual list, not an auto-scorer that we can see).

### How Volyume does it today (file:line)

- **Seed model — tuple, 448 rows.** `src/lib/seedExercises.js:373` —
  `[name, primaryMuscle, secondaryMuscles[], equipment, movementPattern,
  isCompound, minReps, maxReps, fatigueCost, sfr]`. **448** canonical rows
  (RAW), 17 primary muscles (`back`,`abs`,`quads`,`chest`,`triceps`,`glutes`,
  `biceps`,`hamstrings`,`rear_delts`,`forearms`,`calves`,`traps`,`side_delts`,
  `front_delts`,`neck`,`adductors`,`tibialis`). Note Volyume already splits
  delts into front/side/rear and adds neck/tibialis — finer than Hevy on delts,
  coarser elsewhere (no lats/upper-back/oblique split).
- **Deterministic canonical IDs** by name-hash — `seedExercises.js:42`
  (`canonicalExerciseId`), a genuine cross-device-sync strength Hevy doesn't need
  (server-authoritative).
- **Derived rich metadata** (no per-row hand-editing): `src/lib/exerciseMetadata.js`
  derives `equipmentCategory`, `equipmentProfiles`, `force`, `laterality`,
  `machineType`, `machineOk`, `homeOk`, `difficulty` from the tuple
  (`deriveExerciseMetadata` :243). This is a real edge — selection/swap reason
  over equipment context (`full_gym`/`home_gym`/`bodyweight`/`machines_cables`).
- **Instructions = text only.** `src/lib/formTips.js` — `FORM_TIPS` map, **451
  prose form cues**, one paragraph per exercise. British English, high quality.
  No steps, no images, no video, no diagram.
- **Detail screen** `src/screens/ExerciseDetailScreen.js` — strength trend chart
  (weight / e1RM, windowed), plateau detect, history, per-exercise goal,
  muscle chips, swap suggestions (`rankSwaps`), form tip via `InfoTooltip`.
  Single scroll, no tabs, **no media, no muscle diagram, no strength-level/percentile.**
- **Swap engine** `src/lib/swapEngine.js` — Volyume's standout: a pure-function
  **auto-scorer** (`scoreCandidate`/`rankSwaps`) weighting same primary muscle
  (40), same subregion (25), movement pattern (20), equipment (15),
  compound/isolation (10), fatigue/SFR proximity, with joint-discomfort
  auto-swap. **More sophisticated than Hevy's manual replace list.**
- **Subregion map** `seedExercises.js:81` (`SUBREGION_MAP`) — vertical/horizontal
  pull etc., used by planEngine for balanced coverage. Hevy has no equivalent.
- **Search/filter** — `src/screens/BuildWorkoutScreen.js:148` free-text
  `name.includes(query)` only; `src/lib/exerciseDisplay.js:42`
  `matchesEquipmentFilter` (Library equipment chips). **No muscle-group filter,
  no secondary-muscle filter, no recents, no combined filter overlay.**
- **Custom exercises** — table `custom_exercises` (`database.js:1011`),
  `is_custom` flag (`database.js:99`), `insertExerciseWithId` (:1514), synced via
  `syncCustomExercises`. Created from picker modals
  (`ManualBuilderScreen`/`ActiveWorkoutScreen`): name + optional primaryMuscle +
  equipment, SFR/fatigue default to 3. **No type axis, no media, no secondary muscles.**
- **Note:** `ARCHITECTURE.md §10` describes an `ExerciseLibraryScreen.js` and
  "200+ exercises / v3 key" — **stale**: no such file exists, library/picker is
  embedded in build flows, count is 448, keys are v7. Worth a docs fix.

### Gaps

1. **No per-exercise media or muscle diagram.** Hevy ships gendered animated
   thumbnails + a muscle heat-map per exercise; Volyume has a text cue only. This
   is the single most visible product gap — users expect to *see* the movement.
2. **Search is name-substring only; no muscle/equipment-combined filter or
   recents.** Hevy filters by muscle + secondary muscle + equipment + text and
   surfaces recents. Volyume's 448-row library is hard to navigate without it.
3. **No `exerciseType` axis.** Hevy's set-schema enum (reps-only, duration,
   distance-duration, weighted-bodyweight…) lets one logger handle planks,
   carries, stretches and cardio cleanly. Volyume assumes weight×reps, limiting
   the library's breadth and custom-exercise expressiveness.
4. **Custom exercises are thin** — no secondary muscles, no type, no media,
   defaulted SFR/fatigue (which then mis-feed the swap/plan engines).
5. **Detail screen has no instruction *steps* and no strength-level/percentile**
   ("am I strong for my bodyweight?") — a strong engagement hook Hevy has.
6. **Muscle taxonomy is coarser on back/abs** (no lats vs upper-back vs lower-back,
   no obliques) — limits heat-map fidelity and per-region volume reporting.

### Recommendations (adopt / adapt, size, priority, why)

| # | Recommendation | A/A | Size | Pri | Why |
|---|---|---|---|---|---|
| R1 | **Add per-exercise media: looping thumbnail/animation + static muscle diagram.** Build/commission our own assets (never reuse Hevy's). Store on our EU CDN with the same `id→media` mapping pattern; bundle a low-res fallback so offline-first holds. | Adapt | L | **P1** | Biggest perceived-quality gap; directly affects retention and "real app" feel. Must respect offline-first + EU residency, so design the cache layer deliberately. |
| R2 | **Multi-axis exercise search/filter:** muscle-group chips + equipment chips + free text, combinable, with a "recently used" row. Reuse existing `matchesEquipmentFilter`; add a `matchesMuscleFilter` and a recents query. | Adopt | M | **P1** | We already have 448 rows and the metadata; the *only* thing missing is the UI. High value, contained scope, no engine risk. |
| R3 | **Introduce an `exerciseType` / set-schema field** on exercises (default `weight_reps` for all existing rows) driving which set inputs render. | Adapt | L | **P2** | Unlocks duration/distance/reps-only/weighted-bodyweight exercises and richer custom exercises. Touches the set logger — sequence carefully, write invariant tests, keep weight×reps as the safe default. |
| R4 | **Enrich custom-exercise creation:** secondary muscles + (optional) type + user photo; stop silently defaulting SFR/fatigue to 3 — derive sensible values or mark "unknown" so swap/plan engines don't trust a fake 3. | Adapt | M | **P2** | Custom exercises currently pollute the swap/plan inputs. Fixing the defaults is a correctness win independent of the UI work. |
| R5 | **Tabbed exercise detail + numbered instruction steps + "Strength level" percentile.** Split current scroll into About / How-to / History / Records tabs; render `FORM_TIPS` as steps. Strength-level must use our **own** deterministic percentile curves — **no LLM, engine stays deterministic** (CLAUDE.md). | Adapt | M/L | **P2/P3** | Steps + tabs are cheap polish (P2). Percentile is a real engagement hook but needs a vetted data source/curve, hence P3. |
| R6 | **Finer back/abs muscle split** (lats, upper-back, lower-back, obliques) to match heat-map fidelity. | Adapt | L | **P3** | Improves diagrams + per-region volume, but re-tagging 448 rows + migrating user data + planEngine landmarks is heavy; do it only alongside R1's diagram work. |

### Quick wins

- **QW1 (S):** Add a **muscle-group filter** to the existing library/picker —
  the metadata is already present (`primaryMuscle`); only a `matchesMuscleFilter`
  + chip row is needed. Slice of R2, ships in hours.
- **QW2 (S):** Add a **"recently used" exercises** row to the picker — query
  recent `workout_sets` exercise_ids. Big navigation win, no new data.
- **QW3 (S):** Render `FORM_TIPS` as **numbered steps** by splitting on sentence
  boundaries — instant "instruction step" feel with zero new content.
- **QW4 (S):** **Fix `ARCHITECTURE.md §10`** — stale file name
  (`ExerciseLibraryScreen.js` doesn't exist), count (448 not 200+), key (v7 not
  v3). Per CLAUDE.md "mention, don't fix" for unrelated bugs — flagging here.
- **QW5 (S):** Stop defaulting custom-exercise **SFR/fatigue to a fake 3**; store
  `null` and have swap/plan treat unknown explicitly — correctness, no UI.

> Sourcing note: Hevy token names above are internal identifiers recovered from
> the Hermes bundle, used as *evidence of behaviour* only. No Hevy strings,
> images, instruction text, or code are copied into Volyume. All adopted ideas
> must be re-implemented with original assets and our own data.
