# 09b — Final pass: kettlebell and circuit journeys (post-remediation)

Read-only journey walk of the FIXED product. Authority: founder brief 2026-09-05
Part 42 journeys C and D, Parts 6-9, Part 45 stop-ship conditions. Tree
`claude/volyume-final-certification-w2xds1` @ `865aa54`, clean; nothing under
`src/` was edited. Context read first, as context and not as proof:
`04-TRAINING-STYLES.md` (A0..A15), `08-REMEDIATION.md`, `git log --oneline -20`.
Every line below is the CURRENT code path a tap takes; where a measurement is
quoted it was produced by running the real modules through a throwaway Jest
probe (deleted; the tree is clean).

Severity: **S** stop-ship class (Part 45) · **P2** flow note.

---

## C. KETTLEBELL USER

### C(i) — via onboarding

| # | Screen | Exact copy seen | Verdict |
|---|---|---|---|
| 1 | ProOnboarding, equipment step | "Kettlebells — One or two kettlebells, no other weights" (`ProOnboardingScreen.js:228`) | OK — A12 closed |
| 2 | same, on Continue from step 7 | schedule-fit assessment SKIPPED for a kit answer (`:1447`) | OK, correct: no generated plan to describe |
| 3 | build | `installLibraryPlanForKit` → `pickLibraryPlanForKit` (`startWithPlan.js:216-254`): candidates = `equipment:kettlebell` AND NOT `circuit`; beginner ⇒ `style:kettlebell_foundations`; nearest `days:3`; tie on difficulty. **Kettlebell Foundations: 3 Days** (`seedRoutines.js:2112`, difficulty 0) beats **Kettlebell Minimal: 3 Days** (`:2246`, difficulty 1) | OK, deterministic |
| 4 | alert | **"Plan ready"** / "Volyume has kettlebell plans built for this kit. Kettlebell Foundations: 3 Days fits your week." (`startWithPlan.js:296-299`, `ProOnboardingScreen.js:1848`) | OK — never claims generation |
| 5 | on failure | "Plan setup didn't finish" / "…browse the plan library and choose a kettlebell plan." (`:1785`) | OK — retry route is the library, not the generator |
| 6 | Today | active plan + running block (`copyPlanFromLibrary` → `activatePlanWithBlock`, `startWithPlan.js:277-282`); card reads "Day A" + "6 exercises" (`HomeScreen.js:2436`) | OK |
| 7 | stored profile | `equipment: generationEquipmentFor('kettlebells')` = `home_gym` (`ProOnboardingScreen.js:1582`) | OK for engines; see C-P2-2 |

### C(ii) — library route and the block

| # | Screen | Exact copy seen | Verdict |
|---|---|---|---|
| 8 | Plan Library | chip "Kettlebell" (`PlanLibraryScreen.js:52`), matched on `equipment:kettlebell` (`:194`) | OK |
| 9 | plan card | badges "Fits your limitations" / "N to swap" (`:822,826`), style badge "Kettlebell", difficulty, days, minutes | OK |
| 10 | PlanDetail | day rows "Day A · 6 exercises"; circuit line rendered only for circuit groups (`PlanDetailScreen.js:653-658`) — none on a foundations plan | OK |
| 11 | activate | `copyPlanFromLibrary` passes `tags/splitType/difficulty` (`database.js:5331-5335`) and `duplicateRoutine` passes all fourteen args incl. `groupKind`, `roundRestSeconds` (`:4935-4949`) | OK — A0/A0b closed |
| 12 | first workout | no group on this plan ⇒ no heads-up modal | OK |
| 13 | **set entry prefill, 16 kg goblet squat topping 8-12** | **16.75 kg** | **S1 — see anomalies** |
| 14 | swap sheet | style key read from the copy's own tags (`ActiveWorkoutScreen.js:1588-1596`), pool = `kettlebell_foundations` (grinds + two-hand swing only); footer line "Showing kettlebell exercises" + "Show all exercises" (`:6091,6094`) | OK — A0b/A11 closed |
| 15 | full-library escape | "Search the full library instead" now sets `swapStyleShowAll` (`:6135`), so the swap is no longer filed `cause:'style'` | OK — A15 closed |
| 16 | Progress → Volume | "Explosive lifts like swings, cleans, snatches and jumps are not counted here. Volyume does not judge those for weekly volume." (`VolumeHeatmapScreen.js:600`) | OK |
| 17 | Insights | `under_mev_muscle` suppressed for any muscle with excluded work in the 3-week window (`insightsEngine.js:109-111`) | OK — A7 closed here |
| 18 | Post-session summary | "3 sets · below the minimum for growth (target: …)" + "add a couple of sets to an existing exercise" | **S4 — A7 survives here** |
| 19 | Adjust training | "This is a kettlebell plan from the Plan Library. Volyume builds adjusted plans from gym, dumbbell, home and bodyweight kit, so to change it choose another kettlebell plan." + **Browse kettlebell plans** (`PlanUpdateScreen.js:420-428`); no rebuild control | OK, and the button works (both routes are in PlansStack) |
| 20 | Update goal and phase | "Your kettlebell plan stays as it is. Goal and nutrition targets update; to change the plan, choose another kettlebell plan in the Plan Library." + **Browse kettlebell plans** (`ProGoalSetupScreen.js:729-737`) | **S3 — the button is a dead route** |
| 21 | Goal change summary | "Your kettlebell plan stays as it is, so your next session is unchanged. To train differently, choose another kettlebell plan in the Plan Library." (`GoalChangeSummaryScreen.js:313`) | OK — truthful, no false retry |
| 22 | next session prefill | same path as step 13 | **S1** |

---

## D. CIRCUIT USER

| # | Screen | Exact copy seen | Verdict |
|---|---|---|---|
| 1 | Plan Library | chip "Circuits" (`PlanLibraryScreen.js:53`), matched on the bare `circuit` tag (`:195`) | OK |
| 2 | plan card | style badge "Circuit"; "around 26 minutes a session" computed | OK / D-P2-3 |
| 3 | PlanDetail | day row: "6 exercises" then **"Circuit · 3 stations · 3 rounds · 90s between rounds"** twice, one per group (`circuitRound.js:113-120`, rendered `PlanDetailScreen.js:653-658`) | OK — A10 closed |
| 4 | activate | `group_kind`, `round_rest_seconds`, `selection_reason` and the plan's `tags` all travel (`database.js:4935-4949`, `:5331-5335`); pinned by `copyPlanFromLibrary.structure.test.js` | OK — A0/A0b closed |
| 5 | Today | "Session A" + "6 exercises" — no circuit signal | D-P2-2 |
| 6 | heads-up | **"Circuit coming up"** / "3 stations done one after the other with no rest between them, then rest 90 seconds between rounds. 3 rounds in all." Steps 2-4 in station language; tip "…The circuit itself is changed in your plan."; **no Unlink** (`ActiveWorkoutScreen.js:5142-5216`) | OK — A4 closed; but see D-P2-1 |
| 7 | round 1, station 1 | orientation row **"Round 1 of 3 - Circuit"** (`:4183-4189`); chip **"Circuit · Round 1 of 3 · with Push-Up, Dumbbell Row"** (`:4478`) | OK — A5/A13 closed |
| 8 | next station | forward jump returns before `startRestTimer` (`:3019-3028`) — no rest between stations | OK |
| 9 | after last station | `fullRest = roundRestSeconds` = 90 s (`:3046-3048`), then round-return to station A (`:3092-3100`) | OK |
| 10 | round 2 | round derived from the whole circuit (`circuitRound.js:39-53`), so every station shows the same round | OK — A8 closed |
| 11 | skip a station for one round | walked: A(2) B(1) C(1) → at B in round 3, `own=1 < roundsStarted-1=2` ⇒ **"This station missed a round."** (`circuitRound.js:56`, rendered `:4487`). Not shown one round earlier, when a one-round lag is the ordinary mid-round state | OK, fires at the right moment |
| 12 | change load | `resolveSetPrescription` returns `weight: null, prefill: false` for any stamped evidence class (`livePrescription.js:1006-1019`), so the athlete's own number stands | OK |
| 13 | swap a station | style pool `circuit_dumbbell` + kit + adjacency exclusion of the two neighbouring stations' primary muscles, wrapping (`ActiveWorkoutScreen.js:1651-1670`); `rebuildRoutineExerciseFor` spreads the previous row so `groupKind`/`roundRestSeconds` survive | OK |
| 14 | background / resume | whole `workoutExercises` array (incl. each `routineExercise`) snapshotted on every mutation (`useAppStore.js:193-222`) | OK |
| 15 | finish → summary | "Working sets" counts circuit sets (EL-7: a circuit set IS volume) | OK |
| 16 | live logged rows | "40kg x 12 - Round 3 - Circuit"; editor title "Edit round 3" (`LoggedSetRow.js:68,80,176`) | OK |
| 17 | lock screen | "Round 2 of 3 · Dumbbell Row · 14:20" (`notifications/activeWorkout.js:110-127`, fed `circuitRoundRef`) | OK |
| 18 | Workout history list | "3 × 12kg × 12, 12, 12" — no round or circuit word | D-P2-4 |
| 19 | Exercise detail history | "12kg x 12 - Circuit" (`ExerciseDetailScreen.js:1002-1004`) | OK |
| 20 | Progress / evidence stamp | trace: `routineExercise.groupKind === 'circuit'` (`ActiveWorkoutScreen.js:750`) → `currentEvidenceClass` (`:753-756`) → set payload `evidenceClass` (`:2745`) → `addSetToWorkout` `evidence_class` column (`database.js:4286,4313`). Cloud counterpart applied (`migrate_158/159` APPLIED 2026-09-05, `CIRCUIT_SYNC_COLUMNS_ENABLED = true`) | OK end to end |
| 21 | EL-7 consumers | volume counts circuit, drops ballistic (`algorithms.js:274-278`); PR eligible (`:456`); trend excludes (`:1529,1682`); adapted landmarks `AND ws.evidence_class IS NULL` (`database.js:7734`); block ledger stamps `'circuit'` and skips (`blockLedgerRunner.js:429,124,869,967`); learned range (`learnedRange.js:154`); structure memory; swap preference | OK |
| 22 | Coach after a circuit-only week | circuit sets are counted, so nothing is advised off excluded evidence; the low-volume nudge is the ordinary one, unsuppressed, because nothing was excluded. A kettlebell circuit (circuit_ballistic on the swing/clean/snatch station) DOES trip the suppression | Correct per EL-7 |
| 23 | Adjust training | style notice with label "circuit" + **Browse circuit plans** → `PlanLibrary { initialCollection: 'circuit' }` (`PlanUpdateScreen.js:426`, read at `PlanLibraryScreen.js:383`) | OK |
| 24 | Non-library plan carrying a circuit | "Your plan has circuits" + `CIRCUIT_FLATTEN_NOTICE`, Cancel / Rebuild anyway, asked BEFORE any write (`PlanUpdateScreen.js:306-315`) | OK — A3 disclosed |
| 25 | RoutineDetail row | "3 rounds · 8-12 reps · 90s between rounds" and chip "Circuit A" with the circuit gloss (`RoutineDetailScreen.js:1174-1181,1162,1168`) | OK |
| 26 | RoutineDetail edit sheet | fields **Rounds** and **Rest between rounds (s)**; per-station Rest hidden; note "Rounds and rest between rounds apply to the whole circuit. There is no rest between stations."; rounds + round rest written to EVERY member (`:583-600`) | OK — A9 closed |
| 27 | "no overhead" on the dumbbell circuit | substitute served = **Seated Dumbbell Press** | **S2 — see anomalies** |
| 28 | overflow "…" menu on a circuit station | "Unpair superset" still offered (`ActiveWorkoutScreen.js:5765-5771`) | D-P2-1 |

---

## ANOMALIES

### S1 — STOP-SHIP — the kettlebell bell ladder never fires in the live logger

F-11 added the ladder to `resolveLoadIncrement`, which reaches it only through
`packet.exercise.equipmentCategory`. `ActiveWorkoutScreen` builds that packet
input as an explicit five-key whitelist and does not include it:

```js
// src/screens/ActiveWorkoutScreen.js:2518-2523
const base = {
  exercise: {
    id: exercise.id,
    exerciseType: exercise?.exerciseType || 'weight_reps',
    category: exercise?.exerciseCategory || exercise?.exercise_category || 'compound',
    incrementKg: exercise?.incrementKg ?? exercise?.increment_kg ?? null,
    units,
  },
```

`assembleEvidencePacket` reads `equipmentCategory ?? equipment_category ?? equipment`
(`src/lib/livePrescription.js:129-136`) — none of the three is present, so
`isKettlebell(null)` is false and the early return at `:177-181` is never taken.
The row itself carries the value (`getRoutineExercisesWithDetails` maps
`equipmentCategory: row.equipment_category`, `database.js:4723`; the seeded
corpus row is `equipmentCategory='kettlebell'`), so nothing is missing from the
data — only from this object literal.

Measured on the REAL modules, one comparable session topping 8-12 at 16 kg on a
compound bell (`incrementKg: 2.5`, kg):

```
SCREEN SHAPE   eqCat=null        weight=16.75  LOAD_ADVANCE_RANGE_TOPPED  prefill=true
WITH EQUIPMENT eqCat=kettlebell  weight=18     LOAD_ADVANCE_RANGE_TOPPED  prefill=true
```

So the athlete on *Kettlebell Foundations: 3 Days*, whose plan description they
have just read says "move up to the next kettlebell size"
(`seedRoutines.js:2111`), is prefilled **16.75 kg**. `livePrescription.kettlebell.test.js`
passes because it builds its packet WITH `equipmentCategory` (`:166`); no test
covers the screen's packet shape.

### S2 — STOP-SHIP class — a "no overhead" rule serves another overhead press

F-14's scope filter works: candidates are narrowed to the plan's style pool and
the athlete's kit (`candidateScope.js:67-77`, wired at `sessionEffective.js:104-124`).
The failure is one rung down. For `Dumbbell Shoulder Press` (primary
`front_delts`) the scoped, same-muscle candidates in `circuit_dumbbell` are, with
their derived overhead demand and tier rank (measured through
`corpusEntryToSeedRow`):

```
Dumbbell Shoulder Press   overheadPosition=true   tierRank=0   (the blocked row)
Seated Dumbbell Press     overheadPosition=false  tierRank=0
Arnold Press              overheadPosition=true   tierRank=1
Single-Arm Dumbbell Press overheadPosition=false  tierRank=1
Dumbbell Front Raise      overheadPosition=false  tierRank=1
Pike Push-Up              overheadPosition=false  tierRank=1  (bodyweight)
```

`bestEligibleSubstitute` sorts by tier then name (`capability/effective.js:105-107`),
so the first eligible candidate is **Seated Dumbbell Press** — an overhead press
served to someone who told the app they cannot go overhead. Root cause:
`NAME_OVERHEAD` (`src/lib/capability/demands.js:88`) matches `\boverhead\b|\bshoulder press\b|…`
and neither "Seated Dumbbell Press" nor "Single-Arm Dumbbell Press" contains
either token; the `ROW_OVERRIDES` entries for both (`:267,321`) set other axes and
leave `overheadPosition` derived. Consumed by `demandAxisConflict`'s
`case 'overhead_position': return tri(ex.overheadPosition)` (`capability/resolve.js:189`),
which therefore reads "compatible". Pre-existing metadata gap, not introduced by
today's remediation — but it is what journey D's last question actually returns,
and it defeats a capability rule the athlete set.

### S3 — "Browse kettlebell plans" on Update goal and phase goes nowhere

```js
// src/screens/ProGoalSetupScreen.js:735
onPress={() => navigation.navigate('PlanLibrary', { initialCollection: styleLock.collection })}
```

`ProGoalSetup` is registered ONLY in `ProfileStack` (the Coach tab,
`RootNavigator.js:610`); `PlanLibrary` is registered ONLY in `PlansStack`
(`:485`), and no parent navigator carries that route name. Every other cross-tab
caller uses the helper — `navigateCrossTab(navigation, 'PlansTab', 'PlanLibrary')`
(`HomeScreen.js:2542,2571`, `ConsistencyScreen.js:146`). The sibling screen's
identical call is fine because `PlanUpdate` and `PlanLibrary` share PlansStack.
So the style lock's only offered remedy is inert on the Coach tab, and the notice
above it says "choose another kettlebell plan in the Plan Library". The guard
test pins the broken call by source regex
(`ProGoalSetupScreen.styleLock.guard.test.js:103`), so it passes.

### S4 — the A7 "add a set" contradiction survives in the post-session summary

F-12 suppressed the nudge in `insightsEngine.js` and added the note to
`VolumeHeatmapScreen.js`. `WorkoutSummaryScreen` renders its own per-muscle
verdicts from the same ballistic-dropping read (`calculateWeeklyVolume`,
`WorkoutSummaryScreen.js:725`) with no excluded-work check and no note:

> "3 sets · below the minimum for growth (target: 10–20 sets/week)"
> "Below the 10-set floor where reliable growth signals start to appear in
> research. Two routes next week: add a couple of sets to an existing exercise,
> or sneak in one extra movement that hits Hamstrings."
> (`volumeInsightCopy.js:36,76-78`, rendered `WorkoutSummaryScreen.js:1737-1738`)

Reachable on *Kettlebell Foundations: 3 Days*: Day B is 3 RDL sets (counted) plus
5 swing sets (dropped, `loadCharacter='ballistic'` measured). The week-in-progress
guard (`:1732`) withholds it until the week's last session, then shows it. A
muscle trained ONLY ballistically is absent from `musclesWorked` (`:1196-1197`)
and so is never falsely judged — the failure is confined to mixed muscles.

---

## P2 notes

**Journey C**
1. The ladder rules 18 kg as the next bell above 16 (`livePrescription.js:99-101`,
   pinned `livePrescription.kettlebell.test.js:48`); the founder brief's
   acceptance criterion for this step is 20. 18 and 22 are competition-steel
   sizes, not cast-iron home sizes — a founder call on which ladder a
   single-bell home plan should climb.
2. The kit answer is not remembered: `equipment` stores `home_gym` for
   "Kettlebells" (`ProOnboardingScreen.js:1582`), so a later equipment selector
   shows "Home Gym" and the athlete's own answer is gone.
3. The install line names the plan but not why it fits ("fits your week"), while
   the pick actually turned on a difficulty tiebreak between two 3-day
   foundations plans.

**Journey D**
1. The overflow menu still offers "Unpair superset" on a circuit station
   (`ActiveWorkoutScreen.js:5765-5771`), contradicting the heads-up's "The
   circuit itself is changed in your plan" and naming a circuit a superset.
   (Data stays coherent: `handleTogglePair` now clears `groupKind`.)
2. Today's card says "6 exercises" for a circuit day — the one surface in the
   chain that names neither circuit nor rounds (`HomeScreen.js:2436`).
3. The library card's session estimate ignores round rest: stations carry
   `rest: 0`, so `estimateWorkoutMinutes` (`planEngine.js:910-922`) returns
   ~26 min against the plan description's "around 35 minutes".
4. `WorkoutHistoryScreen`'s summary line ("3 × 12kg × 12, 12, 12",
   `:74-96`) carries no circuit label, unlike the live logger and exercise
   detail.
5. The "Circuit coming up" heads-up is gated by the account-wide
   `SUPERSET_WALKTHROUGH_SEEN_KEY` (`ActiveWorkoutScreen.js:1988,1999`), so an
   athlete who once saw a superset walkthrough never sees the circuit one.

---

## Walked clean (verified this pass, not to be re-litigated)

- Library activation carries structure and tags (A0, A0b) — `database.js:4935-4949`,
  `:5331-5335`.
- Circuit round arithmetic is the circuit's, shared by chip, orientation row,
  logged rows and lock screen (A5, A8, A13) — `circuitRound.js`, consumed at
  `ActiveWorkoutScreen.js:4102-4119,4183-4189,4478`.
- Circuit heads-up forked on stored kind, no Unlink (A4).
- Missed-round line fires only when a station is genuinely more than one round
  behind.
- Live circuit mechanics: no rest between stations, round rest after the last,
  round-return to station A.
- `evidence_class` stamped from structure + metadata only, never user-chosen,
  and now syncing (158/159 applied, flag on).
- The EL-7 consumer split, checked consumer by consumer.
- Style pool constrains the in-session swap sheet, with the relaxation offered
  and the full-library escape no longer filed as a style cause (A15).
- Style lock withholds the rebuild on both rebuild screens; the circuit-flatten
  disclosure is asked before any write (A3); the goal summary tells the truth.
- Kettlebell Minimal retagged onto `kettlebell_foundations` (A11); two band
  plans now exist with `style:band` (A2).
- RoutineDetail circuit edit sheet: rounds and round rest for the whole group,
  per-station rest hidden (A9).
- Insight suppression + heatmap note for excluded ballistic work (A7, in those
  two surfaces).
