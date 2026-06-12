# a-05 — Exercise Library & Demos (code-verified internal audit)

> ULTIMATE-APP MANDATE, Phase 1, Area 05. Branch `claude/admiring-bohr-2kb7pd`.
> Method: read the live code — `src/lib/seedExercises.js` (1,044 ln),
> `src/lib/formTips.js`, `src/lib/exerciseMetadata.js`, `src/lib/swapEngine.js`,
> `src/components/ExercisePickerModal.js`, `src/screens/ExerciseDetailScreen.js`,
> `src/screens/LiftProgressScreen.js`, `src/lib/liftProgress.js`,
> `src/screens/ActiveWorkoutScreen.js`, `src/navigation/RootNavigator.js`,
> `src/components/PlateCalculator.js` — and recounted every number with a
> script over the source. Prior art re-verified: `int-03 §1.4` and F1–F6.
> Verdict up front: **every prior finding still holds on this branch.** The
> counts are recomputed below; the ~38% form-tip figure is now exactly 37.4%.

---

## 0. Headline re-verification of int-03 §1.4 / F1–F6

| Prior claim | Status on this branch | Evidence |
|---|---|---|
| 449 seeded exercises | **CONFIRMED — exactly 449** | `RAW` array, 449 rows; `seedExercises.js:376–906`; scripted row count = 449, all names unique, zero duplicates |
| No standalone Exercise Library browse screen | **CONFIRMED** | No `ExerciseLibrary` route; tabs are Train/Plans/Diary/Progress/You (`RootNavigator.js:445–449`) |
| Picker is search-only, name + primary muscle per row | **CONFIRMED** | `ExercisePickerModal.js:48–55, 188–201` |
| Zero visual demos (no video/GIF/image/animation) | **CONFIRMED** | No demo media anywhere; only asset images are the Welcome logo (`WelcomeScreen.js:70`); no `assets/demos/` dir on this branch; `expo-av` is rest-timer audio only |
| Form tips ~38% coverage, rest get generic fallback | **CONFIRMED — 37.4% (168/449)** | `formTips.js`: 170 keys, 168 match seed names; fallback at `ActiveWorkoutScreen.js:2252–2254` and `ExerciseDetailScreen.js:246,672–679` |
| PlateCalculator built but wired to nothing | **CONFIRMED — still dead code** | `PlateCalculator` appears only in its own file; zero importers |
| `isBeginner` only filters assisted-machine swaps, does not gate set types | **CONFIRMED** | `ActiveWorkoutScreen.js:135,320` — read once, used solely as `excludeAssisted: !isBeginner` |
| NEW-001 media sourcing paused | **CONFIRMED** | `new-001-phase0-demo-sourcing.md` status line: "PAUSED, low priority (founder)"; no purchase, no `assets/demos/` on this branch |

---

## 1. WHAT — the data model, the counts, search, info surfaces, custom flow

### 1.1 The data model, field by field
Each seed row is a positional tuple
`[name, primaryMuscle, secondaryMuscles[], equipment, movementPattern, isCompound, minReps, maxReps, fatigueCost, sfr]`
(`seedExercises.js:373`). `rowToExercise` (`:911–928`) expands it to the stored
record and merges **derived** metadata from `deriveExerciseMetadata`:

Stored / authored fields:
- `name` (string, also the deterministic ID source — `canonicalExerciseId`, a
  MurmurHash-style name hash, `:42–77`, so the same name yields the same UUID on
  every device for cross-device sync).
- `primaryMuscle` (one of 17 muscle keys, see §1.2).
- `secondaryMuscles` (array of muscle keys; often empty for isolation lifts).
- `equipment` (8 coarse classes — see §1.2).
- `movementPattern` (push / pull / hinge / squat / isolation, plus a few
  carry / plyometric / power / core / lunge — see §1.2).
- `compoundIsolation` ('compound' | 'isolation', from the `isCompound` bool).
- `defaultRepMin` / `defaultRepMax` (the prescribed rep range).
- `fatigueCost` (1–10 authored; surfaced as `/5` in the UI).
- `stimulusToFatigueRatio` (SFR, 1–10 authored; surfaced as "Quality" `/5`).
- `subregion` (from a 200-plus-entry `SUBREGION_MAP`, `:81–371`; e.g.
  vertical_pull, hip_extension, lateral_raise, glute activator/stretcher/pumper,
  quad sweep/mass; `null` when untagged).
- `isCustom` (0 for seed).

Derived fields (`exerciseMetadata.js:243–258`, computed from name + the coarse
fields, no hand authoring):
- `equipmentCategory` — granular class (barbell, dumbbell, cable,
  machine_selectorised, machine_plate_loaded, smith, kettlebell, landmine, band,
  bodyweight, other). Landmine and band moves are reclassified off their coarse
  tag by regex (`:23–27`).
- `equipmentProfiles` — which contexts a lift is valid in (full_gym,
  dumbbells_only, machines_cables, barbell_plates, home_gym, bodyweight). Drives
  plan-pool filtering, not browse.
- `force` (push / pull / static), `laterality` (bilateral / unilateral by name
  regex), `machineType` (controlled vocab for ~40 machines), `machineOk`,
  `homeOk`.
- `difficulty` (1 beginner / 2 intermediate / 3 advanced) — derived from an
  equipment base bumped by `ADVANCED_RE` / `SIMPLE_RE` (`:205–231`). **Note:
  this difficulty value is computed and stored but is NOT surfaced as a browse
  filter and NOT used to gate the picker or any info surface** (it is consumed
  only by the plan generator's pool, per its own comment). It is shown as a
  read-only tag on `ExerciseDetailScreen` via `difficultyDisplayLabel`.

There is **no `media`, `image`, `video`, `gif`, or `thumbnail` field** anywhere
in the model. Form guidance lives entirely outside the model in `FORM_TIPS`,
keyed by display name.

### 1.2 Seed counts (scripted over `RAW`, exact)
**Total: 449 rows, 449 unique names, 0 duplicates.**

By **primary muscle** (17 groups):
back 56 · abs 53 · quads 49 · chest 45 · triceps 34 · glutes 32 · biceps 30 ·
hamstrings 29 · rear_delts 17 · calves 17 · forearms 17 · traps 16 ·
front_delts 15 · side_delts 15 · neck 12 · adductors 7 · tibialis 5.

By **equipment** (coarse): barbell 99 · bodyweight 91 · dumbbell 86 · machine 80 ·
cable 76 · smith_machine 9 · ez_bar 4 · kettlebell 4.

By **movement pattern**: isolation 225 · pull 56 · push 55 · squat 50 · hinge 49 ·
carry 7 · plyometric 4 · core 1 · power 1 · lunge 1.

**Compound vs isolation: 208 compound, 241 isolation.**

Observations: the library is broad and bodybuilding-complete (rear/side/front
delts split out, glute sub-types, quad sweep/mass, triceps long-head fill,
plate-loaded + machine-only coverage rows). It is genuinely richer than the
category norm in *metadata*. The thinnest groups for a general user are the
niche ones (neck 12, adductors 7, tibialis 5) — fine for athletes, irrelevant
to a newbie. Smith/EZ/kettlebell are intentionally small.

### 1.3 Search behaviour
`ExercisePickerModal` is the only search surface. The filter is a single
**case-insensitive substring `includes` on `name` only** (`:52–53`). Therefore:
- **No fuzzy matching** — "benchpress" (no space) returns nothing.
- **No misspelling tolerance** — "tricep extention" returns nothing.
- **No synonyms / aliases** — "lat pulldown" works (it is a name) but "lats",
  "wings", "pulldowns", "chest day" do not map to anything.
- **No search on muscle, equipment, or pattern** — typing "chest" matches only
  names containing the literal string "chest" (e.g. "Chest-Supported Row"), NOT
  all chest exercises. A user searching "shoulders" gets zero results.
- **No category/filter chips on the browse list** — the muscle/equipment chips
  exist only inside the *create-custom* form (`:126–150`), not as browse filters.
- The full list renders with no query, but it is a flat 449-row alphabetical-ish
  scroll with no headers, no grouping, no muscle sections.

### 1.4 Info surfaces (where exercise *information* actually lives)
There are exactly **two** surfaces that show exercise information, plus a
fallback:

1. **In-workout "Exercise info" sheet** (`ActiveWorkoutScreen.js:~2252`),
   reached via the `⋯` overflow on the active-workout card. Shows a single "How
   to do it" block: `routineExercise.notes || FORM_TIPS[name] || exercise.notes
   || <generic fallback>`. **Text only.** The generic fallback (when no tip
   exists, 281 of 449 cases) is the "start light… 15 to 20 times… controlled
   movement" paragraph.

2. **`ExerciseDetailScreen`** — the rich surface: tags (muscle, subregion,
   equipment, compound/iso, difficulty), "Also works" secondary muscles,
   estimated max, SFR "Quality"/Fatigue/Rep-range tiles with `InfoTooltip`
   explanations, personal bests, goal-setting, strength-trend chart, history,
   "Similar exercises" (swap-engine top 4), optional coaching `cue`, and a "How
   to do it" `FORM_TIPS` block (`:246, 672–679`). Still **text only** for form;
   no media slot in the layout.

Crucially, `ExerciseDetailScreen` is **only reachable from**:
- `LiftProgressScreen` rows (`LiftProgressScreen.js:116,253`), and
- "Similar exercises" cards within `ExerciseDetailScreen` itself (`:642`).

`LiftProgressScreen` is itself reached only via Progress tab → Analytics →
"Lifts" tile (`AnalyticsScreen.js:333`), and `buildLiftProgressRows` builds its
list **exclusively from exercises the user has already logged working sets for**
(`liftProgress.js:34–60`). **Consequence: the only rich info screen is
unreachable for any exercise you have never performed.** A beginner cannot look
up "Romanian deadlift" before doing it — there is no path to its detail screen
until after they have already logged it.

### 1.5 Custom exercise flow
Inline in `ExercisePickerModal` (`:57–91, 203–214`). "Create a custom exercise"
is always offered in the list footer (with or without a query); if there is a
query, the button pre-fills the name. The create form is: name (text) + one
optional muscle chip (17 options) + one optional equipment chip (7 options,
including "Bands" which the seed lacks). Saved with `isCustom:1` and no derived
metadata (selection falls back to the coarse equipment string). It is returned
to the caller immediately and syncs via the existing custom-exercise path. No
rep range, no secondary muscles, no pattern, no form tip, no demo — a custom
exercise is a bare name+muscle+equipment stub.

---

## 2. WHERE — every route to exercise information; the dead ends

### 2.1 Routes that exist
- **Picker (search/create)** → reachable wherever an exercise is added:
  Manual Builder, RoutineDetail edit, in-workout "Add exercise", in-workout
  "Swap → search library" escape hatch. Gives **name + primary muscle only**.
  Tapping a row *adds* the exercise; it does **not** open any info.
- **In-workout `⋯` → Exercise info** → text "How to do it" for the *current*
  exercise only.
- **Swap sheet** (in-workout) → ranked alternatives with a plain-English "Why
  this?" reason (`swapEngine.buildSwapReason`), plus a library-search escape
  hatch. No media to compare swaps.
- **ExerciseDetailScreen** → rich, but gated behind having logged the lift
  (§1.4).

### 2.2 What a user who doesn't know movement names can do
**Almost nothing.** There is no muscle-map, no muscle-group browse, no "show me
chest exercises" path, no difficulty/equipment filter, no images to recognise a
movement by sight. Search is name-substring only, so not knowing the name is a
hard wall — you cannot search by what you want to train, only by what it is
called. The 449-row flat list can be scrolled, but it is unlabelled text with no
grouping and no pictures, so a beginner browsing it learns nothing about what any
row *is*.

### 2.3 Dead ends (confirmed in code)
1. **No browse screen** — there is no destination that lets you explore the
   library as a catalogue.
2. **Rich detail unreachable pre-logging** — `ExerciseDetailScreen` cannot be
   opened for an exercise you have not already trained (§1.4). The richest
   surface is invisible exactly when a beginner needs it.
3. **PlateCalculator orphaned** — a complete component (`PlateCalculator.js`)
   with no importer; a beginner facing a loaded barbell has no in-app help.
4. **`difficulty` computed but never surfaced as a filter** — the data to power
   beginner-friendly browsing exists on every row and is thrown away at the UI.
5. **Search-by-muscle silently fails** — typing a muscle name (the natural
   beginner instinct) returns matches only if the literal string is in an
   exercise *name*, so "shoulders"/"abs"/"legs" return nothing.

---

## 3. FEEL — Besa (newbie) and Eddie (athlete)

### 3.1 Besa picks an exercise she has never heard of
Her plan says "Romanian Deadlift". She is mid-session. To learn it she must find
`⋯` → "Exercise info" and read 40-ish words of expert prose — *if* it is one of
the 168 with a tip. For "Romanian Deadlift (Barbell)" she gets: "hinge at the
hips… feel a deep stretch in your hamstrings" — language that already assumes she
knows what a hip hinge and a neutral spine look like, with **no picture to check
herself against**. If she is on one of the 281 tipless exercises she gets the
generic "start light… 15–20 reps… controlled movement" paragraph — true, but it
tells her nothing about *this* movement. She cannot pull up the rich detail
screen (she has not logged it yet). She cannot search "back exercise" to find an
easier alternative because search is name-only. Net: she either does it wrong or
skips it — the exact churn loop, unchanged from the prior audit.

### 3.2 Eddie wants an obscure variation
The metadata depth genuinely serves him: subregion tags, SFR/fatigue numbers,
laterality, plate-loaded vs selectorised, glute activator/stretcher/pumper,
quad sweep/mass. The swap engine is explainable and ranks on
muscle→subregion→pattern→equipment→compound→fatigue→SFR (`swapEngine.js:13–25`).
His friction: (a) he must already know the exact name to search (no aliases —
"RDL", "BSS", "JM" miss); (b) no equipment filter on the in-workout swap sheet
from his side (the engine supports an `equipment` option but the in-workout call
passes `{ equipment: [] }`); (c) **no media to verify a variation he is unsure
of** — even an elite occasionally wants to see an unfamiliar machine's setup.

### 3.3 Jargon density
The detail screen translates its own jargon well via `InfoTooltip` (Est. max,
Quality/SFR, Fatigue are all explained inline, on-voice). The structural gaps are
the unexplained ones: bare `subregion` labels ("vertical_pull" → displayed via
`subregionDisplayLabel`, but still a technical concept), "compound"/"isolation"
as bare tags, and the form-tip prose itself, which is written for someone who
already speaks gym. The picker rows show a raw lowercase `primaryMuscle`
("rear_delts" capitalised via CSS only) — fine for Eddie, opaque for Besa.

---

## 4. GAPS / FRICTION (per code, no competitor speculation)

1. **No browse/discovery surface at all** — the library is reachable only as an
   add-to-plan picker or a post-hoc analytics detail. There is no catalogue,
   muscle-map, or filtered browse. (Structural.)
2. **Rich detail screen is gated behind prior logging** — the one place with
   tags, similar-exercises, and the form tip cannot be opened for an exercise
   you have not done. The information arrives only after you no longer need the
   introduction. (Structural; arguably worse than "no screen" since the screen
   exists but is hidden.)
3. **Zero visual demos** — 0/449 have any image/GIF/video; form is text-only and
   62.6% of exercises have no written tip either (generic fallback). NEW-001
   media sourcing is paused (MoveKit ~$99 lead option, validated, no spend).
4. **Search is name-substring only** — no fuzzy, no misspelling tolerance, no
   synonyms/aliases, no search by muscle/equipment/pattern, no filter chips on
   browse. Not knowing the name is a hard wall.
5. **PlateCalculator is dead code** — complete, polished, imported nowhere.
6. **`difficulty` (and `isBeginner`) never gate or filter the library** —
   per-exercise difficulty is computed for all 449 but used only by the plan
   generator; it never powers a beginner-safe browse or hides advanced moves
   from a novice in any info surface. `isBeginner` touches only assisted-swap
   exclusion.
7. **Custom exercises are bare stubs** — name + one muscle + one equipment, no
   rep range / pattern / secondary muscles / tip, so they degrade the swap and
   plan-balance logic that depends on metadata.
8. **No telemetry on the library** — no `exercise_viewed`, no
   `library_searched`, no `swap_*` events found; the only nearby `track` call is
   `chart_window_changed` on the detail screen (`ExerciseDetailScreen.js:299`).
   There is no instrumentation to see what users search for or fail to find.

---

## 5. Surface inventory (screens, components, lib modules, data, telemetry)

**Screens (3):**
- `src/screens/ExerciseDetailScreen.js` — rich info/history/goal/chart/similar
  (gated behind prior logging).
- `src/screens/LiftProgressScreen.js` — the only list that links into
  ExerciseDetail; logged-exercises only.
- `src/screens/ActiveWorkoutScreen.js` — hosts the in-workout "Exercise info"
  sheet and the swap sheet (not exclusive to this area but the primary in-flow
  info surface).

**Components (3):**
- `src/components/ExercisePickerModal.js` — search + create-custom (the only
  search surface).
- `src/components/PlateCalculator.js` — **orphaned, zero importers.**
- `src/components/InfoTooltip.js` — jargon tooltips used on the detail screen.

**Lib / logic modules (5):**
- `src/lib/seedExercises.js` — 449-row seed, canonical IDs, seed/top-up/backfill/
  re-derive passes, `SUBREGION_MAP`.
- `src/lib/exerciseMetadata.js` — derives equipment category/profiles, force,
  laterality, machine type, difficulty, machine_ok/home_ok.
- `src/lib/formTips.js` — 170 form-tip strings (168 effective).
- `src/lib/swapEngine.js` — `rankSwaps`, `buildSwapReason`,
  joint-discomfort auto-swap.
- `src/lib/liftProgress.js` — builds the LiftProgress rows (logged lifts only).
- (supporting: `src/lib/exerciseDisplay.js` for label formatting;
  `src/lib/algorithms.js` for `MUSCLE_DISPLAY_NAMES`.)

**Data files (2):** `seedExercises.js` (`RAW` + `SUBREGION_MAP`),
`formTips.js` (`FORM_TIPS`).

**Demo media:** none. No `assets/demos/` directory on this branch; no
image/GIF/video assets for exercises anywhere.

**Telemetry:** none specific to the library (no view/search/swap events);
nearest is `chart_window_changed` on ExerciseDetail.

**Surface count: 3 screens + 3 components + 5 lib modules + 2 data files = 13
code surfaces; 0 demo-media surfaces; 0 library telemetry events.**

---

## 6. Recounted numbers (single reference table)

| Metric | Recounted value | Prior claim |
|---|---|---|
| Seed exercises | **449** (unique, 0 dupes) | 449 ✓ |
| Primary muscle groups | **17** | — |
| Compound / isolation | **208 / 241** | — |
| Form-tip keys | **170** (168 match a seed name; 2 orphans: "Abductor Machine", "Sumo Deadlift (High Bar)") | — |
| Form-tip coverage | **168/449 = 37.4%** | ~38% ✓ |
| Exercises with NO tip (generic fallback) | **281/449 = 62.6%** | 62% ✓ |
| Visual demos | **0/449** | 0% ✓ |
| Standalone browse screens | **0** | 0 ✓ |
| PlateCalculator importers | **0 (dead)** | dead ✓ |
| Library search modes | **1 (name substring)** | search-only ✓ |
| Library filter chips on browse | **0** | none ✓ |
| Library telemetry events | **0** | — |
