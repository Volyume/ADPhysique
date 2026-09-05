# 04 — Training styles: kettlebell, circuit, dumbbell, bodyweight, bands, conventional

Read-only adversarial trace. Authority: founder brief 2026-09-05 "final whole-product
adversarial certification", Parts 6-9 and 29. Context read first (as context, not proof):
`CLAUDE.md` §1-3, `docs/exercise-library-expansion-2026-09-05/05-DECISIONS.md` (EL-1..EL-25),
`09-STYLE-PLANS.md`, `11-CLOSURE.md`. Every claim below is verified against the CURRENT
code on the working tree at `518a7d3`; where a campaign doc and the code disagree, the code
is what is reported.

---

## 1. Per-style matrix

| | CHOOSES (surface + label) | LIVES (data) | DESCRIBED | GENERATION | LOGGING | PROGRESSION | COACH / EVIDENCE |
|---|---|---|---|---|---|---|---|
| **Kettlebell** | Library chip "Kettlebell" `PlanLibraryScreen.js:52`, matched on `equipment:kettlebell` `:194`. Library quiz answer "Kettlebells" `:137` → `planEquipmentAllows` `freeStarter.js:91`. NOT offered in onboarding (`ProOnboardingScreen.js:206-213`) nor in the free-starter wizard (`freeStarter.js:34-42`). | 5 curated library plans, `seedRoutines.js:2076,2108,2151,2191,2241`; pools `stylePools.js:54-113` | Plan card style badge "Kettlebell" `PlanLibraryScreen.js:819`; descriptions state "move up to the next kettlebell size" `seedRoutines.js:2075` | `filterPool` restricts to the pool `planEngine.js:1350-1352`; NEVER_AUTO re-admitted only for pool members `:1460` | Grind rows log as ordinary sets (`evidenceClass` null); ballistic rows stamp `'ballistic'` `ActiveWorkoutScreen.js:744-751` | Grind: ordinary double progression, increment **2.5 kg** `exerciseCorpus/index.js:154-158` — **A1**. Ballistic: history only `livePrescription.js:927-933` | Ballistic sets excluded from volume `algorithms.js:274-278`, from e1RM `:388-399`, from achieved peak `blockLedgerGather.js:396`. Grind sets fully comparable |
| **Circuit** | Library chip "Circuits" `PlanLibraryScreen.js:53`, matched on the bare `circuit` tag `:195`. Also buildable by hand: "Make circuit" `ManualBuilderScreen.js:695` | 3 templates `seedRoutines.js:2275,2318,2361`; `routine_exercises.group_kind` + `round_rest_seconds` `database.js:2794` | Builder header "Circuit A · 3 rounds · 90s between rounds" `ManualBuilderScreen.js:1297`; routine row "3 rounds · 8-12 reps · 90s between rounds" `RoutineDetailScreen.js:1128-1133`; glossary `coachGlossary.js:84` | **No generator ever emits a circuit** — no `groupKind` write in `planEngine.js`/`planAutoGen.js`/`poolGenerator.js` (grep, zero hits) — **A3** | Group cycle A→B→C→A `ActiveWorkoutScreen.js:2975-2989` + round-return `:3053-3060`; round rest only after the last station `:3007-3009`; sets stamped `'circuit'`/`'circuit_ballistic'` `:748-751` | Rounds/reps/load, entirely manual: the template description states the rule (`seedRoutines.js:2274`); no code advances rounds. Load suggestion suppressed `livePrescription.js:927-933` | Counts as volume (`algorithms.js:274-278` skips ballistic only); PR-eligible `:388-399`; excluded from trend `:410-414`, adapted landmarks `database.js:7714-7718`, block ledger `blockLedgerRunner.js:429`, learned range `learnedRange.js:157`, structure memory `programmeStructureMemory.js:131`, swap preference `exercise/intent.js:445,479` |
| **Dumbbell-only** | Library chip "Dumbbells only" `:55`; quiz "Dumbbells only" `:133`; onboarding "Dumbbells Only" `ProOnboardingScreen.js:209`; free-starter "Dumbbells at home" `freeStarter.js:39` | 2 plans tagged `equipment:dumbbell`; pool `circuit_dumbbell` derived `stylePools.js:139` | Equipment badge from tags `PlanLibraryScreen.js:773` | Ordinary generation, `dumbbells_only` profile `exerciseMetadata.js:82` | Ordinary | Ordinary | Ordinary |
| **Bodyweight / home** | Chip "Bodyweight" `:56`; quiz "Home / no equipment" `:139`; onboarding "Bodyweight" `:212`; starter "At home, no equipment" `freeStarter.js:40` | 2 plans tagged `equipment:bodyweight`; pools `bodyweight`, `circuit_bodyweight` `stylePools.js:140-141` | As above | Ordinary generation, `bodyweight` profile | Ordinary | Ordinary | Ordinary |
| **Bands** | Chip "Bands" `:57` matched on `equipment:band` `:196`; quiz answer "Bands" `:138` → `planEquipmentAllows` `freeStarter.js:92` | **Zero plans carry `equipment:band`** (`grep -o "equipment:[a-z_]*" seedRoutines.js`: bodyweight 2, dumbbell 2, kettlebell 6) — **A2**. Pool `band` exists `stylePools.js:142` but no plan tags `style:band` | n/a | Band rows reachable through the ordinary generator by profile only | n/a | n/a | n/a |
| **Suspension / minimal** | Chip "Minimal equipment" `:54` (union of home/dumbbell/band/suspension/kettlebell/bodyweight tags `:200-207`) | Pools `suspension`, `minimal_home` `stylePools.js:143-144` — **no plan tags either**; both are dead code | n/a | n/a | n/a | n/a | n/a |
| **Conventional** | Everything untagged; onboarding equipment profile is the only lever | `programmes.tags` with no `style:` token → `styleKeyFromTags` null `stylePools.js:178-181` | Ordinary | `_styleAllowedNames` null → unchanged `planEngine.js:3164-3165` | `evidenceClass` null | Full double progression | Full learning |

---

## 2. Anomalies

Severity key: **P0** truth/data · **P1** confusion or wrong behaviour · **P2** flow · **P3** polish.

### A0 — P0 — Adding a circuit plan silently destroys every circuit

`duplicateRoutine` (`src/lib/database.js:4917-4944`) copies each row with **ten** positional
arguments, stopping at `supersetGroupId`:

```js
await addExerciseToRoutine(
  newRoutine.id, re.exerciseId, i,
  re.recommendedRepsMin, re.recommendedRepsMax, re.notes,
  re.recommendedSets, re.startingWeight, re.restSeconds,
  re.supersetGroupId,
);
```

The signature is fourteen (`src/lib/database.js:4746`):

```js
export async function addExerciseToRoutine(routineId, exerciseId, order, repsMin = 6,
  repsMax = 12, notes = null, sets = 3, startingWeight = null, restSeconds = null,
  supersetGroupId = null, scheduleSync = true, selectionReason = null,
  groupKind = null, roundRestSeconds = null)
```

So `group_kind` and `round_rest_seconds` land as **null** on the user's own copy.
`copyPlanFromLibrary` (`:5326`) → `duplicateRoutine` (`:5347`) is the only activation path
(`PlanDetailScreen.js:183,198`; `PlanLibraryScreen.js:490,510`). The seed writes the columns
correctly (`seedRoutines.js:2495-2510` passes all fourteen), so the LIBRARY row is a circuit
and the USER's row is not. Consequences, all on live user data:

- `isCircuitGroup` is false (`ActiveWorkoutScreen.js:744`) → **`evidence_class` is never
  stamped** for any circuit set. EL-7's whole exclusion chain is inert: circuit sets feed
  e1RM trend, plateau detection, live load progression, learned ranges, block seeding,
  adapted landmarks and structure memory. This is the data-truth failure EL-7 exists to
  prevent.
- Round rest is lost. `fullRest` falls to `routineExercise?.restSeconds || defaultRestSeconds || 90`
  (`:3007-3009`); the template sets `rest: 0` on every station, which is falsy, so the user
  gets their global default rest, not the template's 90 s round rest.
- `RoutineDetailScreen.js:1109,1115,1128` renders "Superset A" and "3 sets · 8-12 reps"
  with no rest line at all (the `restSeconds ? …` guard hides a 0).
- The live chip degrades to the superset branch (`ActiveWorkoutScreen.js:4391-4404`): no
  round counter.

No test covers the copy path (`grep -rn "copyPlanFromLibrary\|duplicateRoutine" src/**/__tests__` → 0 hits).

### A0b — P0 — Activation also drops the plan's tags, so every style constraint dies

`copyPlanFromLibrary` (`src/lib/database.js:5331`):

```js
const newPlan = await createProgramme(userId, libPlan.name, libPlan.description, 0);
```

`createProgramme(userId, name, description, isLibrary, tags, splitType, difficulty, …)`
(`:4564`) — `tags`, `splitType` and `difficulty` are never passed. The copy's `tags` is
NULL, so `styleKeyFromTags(programmeRow?.tags)` returns null everywhere it is read on the
user's own plan:

- `ActiveWorkoutScreen.js:1567-1576` — **the in-session swap sheet has no style pool**, so a
  kettlebell or dumbbell-circuit user is offered barbell and machine movements. This is
  exactly Part 29's first named contradiction, and it is live.
- `RoutineDetailScreen.js:583-589` — same, for plan-level swaps.
- `planAutoGen.js:963-967` and `:1209-1213` — "Adjust plan" and its preview lose the style
  constraint; the regeneration widens back to the full library.
- The "Showing kettlebell exercises / Show all exercises" line (`ActiveWorkoutScreen.js:5959-5967`)
  never renders, so the user is never told a pool applied and never offered the relaxation.
- `exercise_swaps.cause = 'style'` (`:1721-1723`) is never written, so pool-constrained swaps
  are learned as durable preference (`exercise/intent.js:445,479` only excludes `'style'`).

### A1 — P1 — Kettlebell progression proposes bell weights that do not exist

`src/lib/exerciseCorpus/index.js:154-158`:

```js
function deriveIncrementKg(compound, equipmentCategory) {
  if (compound) return 2.5;
  if (equipmentCategory === 'dumbbell' || equipmentCategory === 'kettlebell') return 1.0;
  return 1.25;
}
```

Every compound kettlebell row (`Kettlebell Goblet Squat` is `compound: true`,
`exerciseCorpus/families/kettlebell.js:507-513`) gets `increment_kg = 2.5`; isolation
kettlebell rows get 1.0. `resolveLoadIncrement` (`livePrescription.js:116-122`) takes that
verbatim and `roundQuarter` (`:80`) rounds to 0.25, so topping the rep range on a 16 kg bell
prefills **18.5 kg**. There is no bell-size table anywhere
(`grep -rn "BELL_SIZES\|bell size" src/` → only plan description prose). Meanwhile the plan
description the user just read says "move up to the next kettlebell size"
(`seedRoutines.js:2075`) — a direct product contradiction (Part 29, fourth item), and
EL-10's "grind templates reuse the existing double progression unchanged" is precisely what
produces it.

### A2 — P1 — "Bands" is a dead end in two places

`planEquipmentAllows` hard-filters on `equipment:band` (`freeStarter.js:92`) and the library
collection matches on the same tag (`PlanLibraryScreen.js:196`), but no plan in
`seedRoutines.js` carries it. A user who answers "Bands" in the library quiz
(`PlanLibraryScreen.js:138`) always reaches:

> **No exact match found**
> Browse all the plans below to find one that suits you.  (`:972-973`)

and the "Bands" chip always shows "No plans found / No plans match this filter yet."
(`:750-756`). `11-CLOSURE.md` item 15 claims band plans are "reachable through the library
chips"; the chip exists, the plans do not. Same for suspension inside the "Minimal" union.

### A3 — P1 — "Adjust plan" turns a circuit plan into straight sets

Even with A0b fixed, no generation path emits `groupKind` or `roundRestSeconds`
(`grep -n "groupKind\|roundRest" src/lib/planAutoGen.js src/lib/planEngine.js src/lib/poolGenerator.js`
→ zero hits), and `assignSupersets` was deliberately deleted (`planEngine.js:3066-3068`:
"Nothing in Volyume now creates a superset the user did not ask for"). A style-tagged circuit
plan regenerated through `generateAndSavePlan` therefore comes back as ungrouped straight
sets drawn from the circuit pool. Nothing tells the user the grouping is gone.

### A4 — P1 — A circuit is announced to the user as a "Giant set", with an "Unlink" button

The pre-set heads-up modal (`ActiveWorkoutScreen.js:5017-5122`) has no circuit branch. For a
three-station circuit it renders:

> **Giant set coming up**
> 3 exercises done back-to-back with no rest between them.
> … 4. After the last one, rest the full rest period, then repeat.
> Tip: if you can't grab every station right now, unlink and do them as normal sets.

with a link icon (`:5038`) and an **Unlink** action (`:5100-5101`). The gate (`:1966-1993`)
checks only `currentSGI` and `pairedExerciseName`, never `groupKind`. Worse, `handleTogglePair`
(`:1347-1372`) clears `supersetGroupId` on every member but leaves `routineExercise.groupKind`
= `'circuit'`, so after unlinking the user is doing straight sets that are still stamped
`evidence_class = 'circuit'` and still excluded from every learning consumer.

### A5 — P1 — Straight-set language on circuit rounds

`ActiveWorkoutScreen.js:4101-4111`:

```js
const pos = targetSets ? `Set ${workingLogged + 1} of ${targetSets}` : `Set ${workingLogged + 1}`;
const mode = (currentSGI != null && pairedExerciseName) ? 'Superset' : …;
return `${pos} - ${mode}`;
```

The orientation row above the entry boxes reads **"Set 3 of 3 - Superset"** on the third
round of a circuit — the exact nonsense named in the brief, and it contradicts the chip
directly above it, which reads "Circuit · Round 3 of 3" (`:4386`). Same family:

- Exercise outline navigator: `groupLabel: gid != null ? (groupSize > 2 ? 'Giant set' : 'Superset') : null` (`:4173`).
- Reorder sheet chip: same expression (`:5759`).
- Lock-screen / persistent notification: `Set ${currentSetIndex} of ${totalSetsForExercise}`
  (`src/lib/notifications/activeWorkout.js:117`), fed `countProgressSets(loggedSets) + 1`
  (`ActiveWorkoutScreen.js:2210,2235`).
- Logged-set rows: badge is the set number and the a11y label is `Edit set 3`
  (`src/components/workout/LoggedSetRow.js:77,134`) where the user means round 3. The one
  circuit-correct element here is the truthful suffix `" - Circuit"` (`:60-63`, rendered `:170`).
- Builder row a11y label: `${ex.name}, ${ex.sets} sets` and hint "Tap to select for a
  superset" on circuit rows (`ManualBuilderScreen.js:1272-1274`).

### A6 — P1 — Serve-time capability substitution is style-blind and equipment-blind

`bestEligibleSubstitute` (`src/lib/capability/effective.js:92-102`) filters candidates on
primary muscle, not-taken and capability eligibility only, then ranks by canonicality tier.
Its `library` is the whole catalogue (`sessionEffective.js:157-165`, `getAllExercises()`),
and `substituteSeniorQuestion` (`:44-46`) asks only about intent and capability conflicts.
No style pool and no equipment profile is consulted. So a "no overhead" rule applied to
`Dumbbell Shoulder Press` in **Full-Body Circuit: Dumbbells** (`seedRoutines.js:2285`) can
serve a barbell or machine press to a user training at home with dumbbells. Part 29's second
named contradiction, in the serve path rather than the library path (the library CARD is
honest: `planCompat` drives an "N to swap" badge, `PlanLibraryScreen.js:812-815`, pinned by
`src/lib/__tests__/stylePlans.capability.test.js`).

### A7 — P1 — Ballistic-heavy kettlebell weeks can be told to "add a set or two"

`insightsEngine.js:82-108` computes three rolling weeks from `calculateWeeklyVolume`, which
excludes every ballistic set (`algorithms.js:274-278`), then emits:

> Your {muscle} hasn't had much work in 3 weeks. Adding a set or two this week will get it
> growing again.  (`insightsEngine.js:104`)

**Kettlebell Minimal: 3 Days** (`seedRoutines.js:2236-2266`) is 30 swing sets, 15 half
get-ups and 9 goblet squats a week. The swings vanish from the volume read; the goblet squats
keep the muscle's count above zero (so the `trainedAtAll` guard at `:96` passes) and below
MEV. The user is then advised to add volume for work they already did. There is no
ballistic-aware or style-aware suppression anywhere in `insightsEngine.js`, and none in
`weeklyCoach.js` either (`grep -n -i "circuit\|evidence_class" src/lib/weeklyCoach.js` → 0 hits).
`VolumeHeatmapScreen.js` has the same blind spot (0 hits) — a kettlebell user's heatmap reads
near-empty with no explanation.

The correct half of this: the BLOCK-level learning lane does handle it. `blockLedgerRunner.js:429`
stamps `eligibility: 'circuit'` for a muscle trained through a circuit and
`isNonLearningEligibility` (`blockLedgerGather.js:299`) makes it skip exactly like
`'constrained'` (`blockLedgerRunner.js:126,872,970`).

### A8 — P1 — "Round n of m" desynchronises silently across stations

`ActiveWorkoutScreen.js:4376`: `const roundNum = Math.min(workingLogged + 1, targetSets || 1);`
The round number is each station's **own** logged-set count. Nothing keeps the stations in
step: `handleNextExercise` (`:1330+`) is a plain forward move, and `handleJumpToExercise`
(`:1298-1303`) is documented as "JUMP ONLY … nothing is marked skipped". So skipping station B
for one round leaves A showing "Round 3 of 3" while B shows "Round 2 of 3" inside the same
circuit at the same moment. No warning, no reconciliation, and the auto-advance at
`:3027-3033` fires per station on that station's own target.

### A9 — P2 — A circuit station cannot be edited as a circuit

`RoutineDetailScreen.js:546-568` (`saveEdit`) writes `recommendedSets` and `restSeconds` from
a generic sheet labelled **"Sets"** (`:1362`). On a circuit station this (a) lets one station's
rounds diverge from its siblings', breaking EL-9's "rounds are kept equal within a circuit by
the builder" with nothing to enforce it, and (b) shows and accepts a per-station rest value
that is inert — `fullRest` reads `roundRestSeconds` when `isCircuitGroup` (`ActiveWorkoutScreen.js:3007-3009`).
Round rest itself cannot be edited here at all; the only rounds/round-rest steppers live in
`ManualBuilderScreen.js:1300-1325`.

### A10 — P2 — The plan preview never mentions circuits or rounds

`PlanDetailScreen.js:567-580` renders each day as name + "{n} exercises". There is no circuit
chip, no round count, no round rest, and no station list — the only signal before the user
commits is the free-text description. `RoutineDetailScreen.js:1128-1133` has the correct
"3 rounds · 8-12 reps · 90s between rounds" line, but that screen is only reachable *after*
the plan has been copied, by which point A0 has already erased `group_kind`.

### A11 — P2 — A beginner-tagged plan reaches the experienced ballistic pool

`Kettlebell Minimal: 3 Days` carries `style:kettlebell_experienced … beginner intermediate advanced`
(`seedRoutines.js:2241`). Its own exercises are safe (two-hand swing, half get-up, goblet
squat), but the style tag is what constrains swaps and regeneration, so a self-declared
beginner on this plan is offered Snatch, Jerk, Clean and Double Swing in the swap sheet the
moment A0b is fixed. EL-8's rule is "beginner kettlebell templates are grind-only plus
two-hand swings … ballistics only at the experienced level"; the template obeys it, the tag
does not.

### A12 — P2 — Kettlebell is invisible where most users first answer the equipment question

`ProOnboardingScreen.js:206-213` offers full_gym / machines_cables / dumbbells_only /
barbell_plates / home_gym / bodyweight. `freeStarter.js:34-42` offers full_gym / dumbbell /
home. Neither offers kettlebells or bands, although `planEquipmentAllows` handles both
(`freeStarter.js:91-93`) and `11-CLOSURE.md` item 13 claims "the wizard and quiz learn
kettlebells" — only the *library* quiz did. A kettlebell-only owner must answer "Dumbbells
Only" or "Home Gym" (`exerciseMetadata.js:87` maps kettlebell into both), and the generated
plan is then full of dumbbell movements they do not own.

### A13 — P3 — "alternates with" is wrong for a three-station circuit

`ActiveWorkoutScreen.js:4386`: `Circuit · Round {n} of {m} · alternates with {partnerNamesText}`.
"Alternates" describes a two-member pairing; a circuit rotates. The superset branch below
(`:4401`) uses the same verb, which is where it came from.

### A14 — P3 — Four style pools are dead code; the picker never reads any pool

`stylePools.js:140-144` derives `bodyweight`, `band`, `suspension` and `minimal_home`, but no
plan tags `style:bodyweight|band|suspension|minimal_home`
(`grep -o "style:[a-z_]*" seedRoutines.js` → only the kettlebell and circuit keys), so
`stylePoolFor` can never return them. Separately, `09-STYLE-PLANS.md` §1 states "the picker's
'current plan' filter reads the pool as the candidate set when a style tag is present";
`src/lib/exercisePickerSections.js` and `src/components/ExercisePickerModal.js` contain no
reference to style pools at all — the picker only *orders* by "In your plan".

### A15 — P3 — A full-library-search swap inside a style plan is still recorded `cause: 'style'`

`ActiveWorkoutScreen.js:1721-1723` sets `causeOverride: 'style'` whenever
`swapStylePoolKey && !swapStyleShowAll`. The swap sheet's footer escape hatch ("Search the
full library instead", `:5999+`) does not set `swapStyleShowAll`, so a deliberate
outside-the-pool choice is filed as "staying inside the pool is not preference" and excluded
from preference learning (`exercise/intent.js:445,479`).

---

## 3. What behaves correctly (verified, so it is not re-litigated)

- Live circuit mechanics, when `group_kind` survives: no rest between stations (the forward
  jump returns before `startRestTimer`, `ActiveWorkoutScreen.js:2981-2989`), round rest only
  after the last station (`:3007-3009`), round-return to station A (`:3053-3060`).
- `evidence_class` is stamped from structure and metadata, never chosen by the user
  (`:744-751`), and pinned by `src/screens/__tests__/ActiveWorkoutScreen.circuit.guard.test.js`.
- The EL-7 consumer split is implemented as ruled: volume counts circuit and excludes
  ballistic (`algorithms.js:274-278`); PR detection counts circuit (`:388-399`); trend excludes
  circuit (`:410-414`, consumed `:1430,1490,1641`, `ExerciseDetailScreen.js:135,190`); adapted
  landmarks exclude both (`database.js:7714-7718`); block ledger, learned range and structure
  memory skip a circuit muscle (`blockLedgerRunner.js:126,429,872,970`, `learnedRange.js:157`,
  `programmeStructureMemory.js:131`); share cards and record lines exclude ballistic
  (`sessionShareData.js:28-29`, `workoutRecordLine.js:93-94`, `bestLift.js:58-59`).
- History and exercise detail label the class truthfully rather than hiding it
  (`LoggedSetRow.js:60-63,170`; `ExerciseDetailScreen.js:1002-1004`).
- Style-pool generation gating is real and hard: `filterPool` narrows to the pool with no
  never-starve fallback (`planEngine.js:1345-1352`) and NEVER_AUTO is re-admitted only for
  vetted pool members (`:1450-1460`). Beginner kettlebell templates contain no single-arm or
  overhead ballistics (`seedRoutines.js:2076-2149`), pinned by `stylePlans.pools.test.js:35-51`.
- Circuit swaps keep the pairing rule: adjacent stations' primary muscles are filtered out,
  wrapping the cyclic rotation (`ActiveWorkoutScreen.js:1630-1650`).
- `rebuildRoutineExerciseFor` spreads `...prevRoutineEx` (`:293-307`), so swapping a station
  keeps `groupKind` and `roundRestSeconds`.
- Backgrounding and resume are safe: the whole `workoutExercises` array (including each
  `routineExercise`) is snapshotted to AsyncStorage on every mutation
  (`useAppStore.js:193-222`).
- "Repeat as is" from history preserves circuits when the session was routine-linked
  (`WorkoutHistoryScreen.js:203-212`).
- Mid-block style switching goes through the ordinary honest dialogue: "You're in week N of M
  of your current block. Activating "X" starts a fresh block from week 1. Your workout history
  and PRs are kept." (`planSwitch.js:110-116`), plus recovery-week and open-decision variants
  (`:92-107`). It says nothing style-specific, which is a gap in kind but not a falsehood.
- Today card copy is style-neutral, not wrong: "{n} exercises" (`HomeScreen.js:2296-2299`).

---

## 4. Not verifiable statically

- Whether an existing install that already added a circuit plan before this audit shows the
  degraded copy — A0 is a write-time defect, so devices differ by when they activated.
- The actual rendered `estimateWorkoutMinutes` figure on the plan card for circuit templates
  (`PlanLibraryScreen.js:162-183` uses `restSeconds`, which is 0 on every circuit station, so
  the estimate is likely far too low — arithmetic not run).
- Whether the block's `days_per_week` matches a style plan's `days:N` tag after activation
  (Part 29's third item): `activatePlanWithBlock` (`database.js:5042`) does not read the tag,
  but the block's day count is set elsewhere in the mesocycle lane, which this trace did not
  open.
- Any device-level behaviour: the round-return haptic/announcement, the Live Activity's
  rendered string, and the swap-sheet layout with the style line present.

---

## F-16 INVESTIGATION: can generation build kettlebell-only and band-only plans?

Authority: lead ruling F-16 (`07-FINDINGS.md`); evidence A2/A12 above. Read-only; no source
edited. Method: real `generatePlan()` (`planEngine.js`) against the real seed corpus
(`exerciseCorpus`), driven by a throwaway Jest script (`scratchpad/f16_investigation.test.js`,
not committed) built the same way `campaign16.helpers.js` / `planengineBench.js` build their
inputs (`corpusEntryToSeedRow`, `exerciseLibrary` passed to `generatePlan`).

### Q1 — how equipment reaches the generator

`ProOnboardingScreen.js:206-213` and `PlanUpdateScreen.js:59-66` both offer the identical
6-value set (`full_gym`/`machines_cables`/`dumbbells_only`/`barbell_plates`/`home_gym`/
`bodyweight`) as `userProfile.equipment`. `freeStarter.js:35-42`'s 3-answer starter quiz uses
its own vocab (`full_gym`/`dumbbell`/`home`), normalised in `planEquipmentAllows`
(`freeStarter.js:81-97`) — a different consumer (plan **recommendation**, not generation).
Generation's own path: `generatePlan(inputs)` → `equipment` string → `filterPool(muscle,
equipment, goal)` (`planEngine.js:1339-1341`) → `pool.filter(e => e.eq.includes(equipment))`.
`e.eq` is `equipmentProfiles`, computed once per exercise by
`deriveEquipmentProfiles(equipmentCategory, name, compoundIsolation)`
(`exerciseMetadata.js:136-146`), reading `PROFILES_BY_CATEGORY` (`:80-104`) — `kettlebell:
['full_gym','dumbbells_only','home_gym']`, no `kettlebells` value exists anywhere. A bare-string
membership test with **no override function below it** for equipment (unlike difficulty,
NEVER_AUTO and the recognisable-tier gates, which all sit below `filterPool` inside
`selectExercisesForMuscle`, `:1435-1498`). One more mechanism layer matters: `buildEffectivePool`
(`:751-789`) merges the library-derived pool with the hand-written fallback `POOL` per muscle
whenever the generated count is `< MIN_GENERATED_PER_MUSCLE` (3, `:717`) — but the fallback
`POOL`'s `eq` arrays are the same closed vocabulary, so a thin new-profile muscle degrades to an
**empty slot**, never to a wrong-equipment substitution.

### Q2 — does generation produce a complete kettlebell/band plan? (measured, not inferred)

Two variants of a hand-built `kettlebells` profile were tried, both requiring no source edit:

- **KB+bodyweight** (mirrors the existing `dumbbells_only`/`home_gym` pattern exactly: append
  `'kettlebells'` to every `kettlebell`-category row's profiles, and to every bodyweight row
  that already carries a non-empty profile list): **complete but not a kettlebell plan.** All
  12 runs (beginner/intermediate × 3d/4d, plus the `full_gym`/`bodyweight` split) hit zero
  structural-muscle zeros and zero empty workouts — but **zero "Kettlebell" exercises appear in
  any of the 12 plans.** Root cause, read to the end of the mechanism: the corpus has **0
  STAPLE-tier and only 2 COMMON-tier** kettlebell exercises total (`Kettlebell Goblet Squat`,
  `Kettlebell Row (Single-Arm)`, `canonicality.js:284-285`); everything else is NICHE,
  SPECIALIST or NEVER_AUTO. `selectExercisesForMuscle`'s recognisable-tier gate
  (`planEngine.js:1496-1498`) restricts to COMMON-or-better whenever enough such candidates
  exist — and bodyweight alone supplies far more STAPLE/COMMON options per muscle than
  `numExHint` ever needs, so the 2 COMMON kettlebell rows never reach a slot. The result is a
  plan that is byte-for-byte a bodyweight plan under a kettlebell label.
- **KB-pure** (kettlebell-category rows only, no bodyweight blended in — isolates whether
  bodyweight was simply outcompeting KB, or KB coverage is thin on its own): real kettlebell
  exercises ARE selected once bodyweight stops crowding them out (`Kettlebell Row (Single-Arm)`,
  `Gorilla Row`, `Kettlebell Floor Press`, `Kettlebell Deadlift`, `Kettlebell Front Rack Squat
  (Double)`, `Get-Up to Elbow`, `Kettlebell Windmill (Low)`, etc. — the recognisable gate falls
  back to the wider NICHE/SPECIALIST pool per `:1495-1497`'s coverage-fallback rule once too few
  COMMON survive). But **`shoulders` is at ZERO planned sets in all 6 KB-pure runs**
  (beginner/intermediate × 3d/4d/+the 3d control) — the corpus has no kettlebell (or eligible
  bodyweight, since none is blended in) shoulder-isolation row at all, and it is on the engine's
  own no-zero structural list (`planengineBench.js` `NO_ZERO`). 4-day upper sessions run as thin
  as 2 exercises (`Kettlebell Floor Press`, `Kettlebell Row (Single-Arm)` only) against 5+ for
  `full_gym`.
- **Bands**: appending `'bands'` to band-category + bodyweight rows produced plans **identical**
  to the existing `bodyweight` baseline in every one of the 6 comparisons run. Not an artefact of
  the test — `PROFILES_BY_CATEGORY.band` already reads `['bodyweight']`
  (`exerciseMetadata.js:89`), so every band exercise (`Band Lateral Raise`, `Band Face Pull`,
  `Band Hammer Curl`...) is **already selectable inside today's shipped `bodyweight` equipment
  option**, before any hypothetical `bands` profile is added. A dedicated `bands` value, built
  the same way, would not currently differentiate itself from `bodyweight` at all.
- **Bodyweight baseline**: confirmed working as shipped — complete, no zero muscles, no empty
  workouts, across all 6 runs.

### Q3 — does EL-8's beginner/experienced kettlebell rule apply inside generation?

**Only to style pools — confirmed empirically and by code.** `stylePools.js:22-30` states the
NEVER_AUTO exception is deliberate and narrow: kettlebell ballistics are NEVER_AUTO in the
general registry, re-admitted only when `_styleAllowedNames` (the active `style:<pool>` tag) is
set — which ordinary equipment-driven generation never sets. `selectExercisesForMuscle`'s gate
(`:1460`) is `isAutoEligible(e.n) || (_styleAllowedNames && _styleAllowedNames.has(e.n))`; with
no style pool active the second clause is always false. Crucially, **NEVER_AUTO is
experience-blind** — nothing in `filterPool` or `selectExercisesForMuscle` reads `experience` to
decide ballistic eligibility, so EL-8's "ballistics only for the experienced" progression is not
implemented in generation at any level; it hard-blocks ballistics for beginner AND intermediate
alike. Confirmed empirically: 0 `snatch|clean|jerk` matches across all 12 generated plans, but
also **`Kettlebell Swing` itself never appeared** — it is listed in NEVER_AUTO
(`canonicality.js:444`), so even the plain two-hand swing EL-8 names as beginner-appropriate is
unreachable from ordinary generation; it only exists via `KETTLEBELL_FOUNDATIONS_NAMES`
(`stylePools.js:73`) inside the manually-selected `kettlebell_foundations` style plan.

### Q4 — library quiz mapping and the no-match state

`PlanLibraryScreen.js:129-140`'s `QUIZ_STEPS` equipment step already offers `kettlebell` and
`band` as first-class answers (`:137-138`, EL-12), mapped through the shared
`planEquipmentAllows` (`freeStarter.js:91-92`) onto `equipment:kettlebell` / `equipment:band`
plan tags — a **library-plan lookup**, unrelated to `generatePlan`'s equipment vocabulary from
Q1/Q2. `getQuizRecommendation` (`:249-262`) returns `null` when no tagged plan survives the hard
equipment filter, rendering the no-match branch (`:969-980`): title **"No exact match found"**,
body **"Browse all the plans below to find one that suits you."**, single CTA **Button "Browse
all plans"** → `handleQuizBrowse` (dismisses the quiz sheet, shows the filterable list) — no
generation offer of any kind today. A real "build me a plan" entry point does exist:
`PlanUpdate` route → `PlanUpdateScreen.js`, which owns the identical 6-value `EQUIPMENT_OPTIONS`
(`:59-66`) and calls `generateAndSavePlan`/`generatePlanDryRun` (`:24`). But it is not currently
routable with an equipment pre-set — `PlanUpdateScreen.js` reads **no `route.params` at all**
(zero matches); its `equipment` state initialises only from `userProfile?.equipment ??
'full_gym'` (`:100`). Route name to wire, and the gap to close: `navigation.navigate('PlanUpdate',
{ initialEquipment: ... })` reaching nothing today without a source change.

### VERDICT

- **Kettlebells: NOT READY.** Blended with bodyweight (the pattern that would minimally extend
  the existing profile scheme): produces a complete plan with **zero kettlebell exercises** —
  functionally a mislabelled bodyweight plan. Kept pure: real kettlebell exercises appear, but
  **shoulders sits at zero sets** (a structural no-zero muscle) in every combination tested, and
  4-day upper sessions run as thin as 2 exercises. Root causes: (a) only 2 COMMON/0 STAPLE
  kettlebell exercises exist in the whole tier registry, so any bodyweight-blended profile lets
  bodyweight win every slot; (b) the corpus carries no kettlebell shoulder-isolation movement,
  so a pure-kettlebell profile cannot cover shoulders at all; (c) EL-8's beginner-safe swing is
  itself NEVER_AUTO and unreachable outside the manual style-plan path, so even a "foundations"
  kettlebell generation option would need new tier/registry work, not just a new profile string.
- **Bands: NOT READY, for a different reason.** Every band exercise is already selectable inside
  the shipped `bodyweight` option (`PROFILES_BY_CATEGORY.band = ['bodyweight']`). A `bands`
  equipment value built the same way as `kettlebells` produces plans identical to `bodyweight`
  today — no differentiated "bands" experience exists to ship without first deciding whether
  bands should be pulled OUT of the bare-`bodyweight` context (so a real
  band-required-vs-no-equipment distinction exists) — a product-fork decision, not an
  engineering gap.
- **Bodyweight (existing baseline): GENERATION-READY**, confirmed complete across all 6 runs —
  included only as the control, not itself in question.
