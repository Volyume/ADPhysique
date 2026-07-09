# Plan B — Weak-point specialisation dumps sets on one exercise instead of adding a second angle

Status: DIAGNOSIS + OPTIONS ONLY. No engine code changed. Per CLAUDE.md §2
("the coaching engine is deterministic... if a feature seems to need
[change]: stop and ask") every fork below is a founder decision.

Founder report (verbatim intent): *"When I target a weak area, it adds more
sets to an existing exercise rather than a new exercise — I've seen 6 sets of
lat pulldown, which is illogical junk volume. Specialisation should add a
DIFFERENT exercise that hits the muscle from a different angle, not more sets
on top. I don't want more than 3-4 sets maximum per exercise."*

Coordinates with the exercise-library census being written in parallel at
`docs/exercise-planning-2026-07-09/plan-A-library-expansion.md` (not
duplicated here — this doc only asks whether the *existing* library's
angle/subregion metadata is sufficient for a complementary-exercise rule;
Plan A owns the full census of what's missing).

---

## 0. One-paragraph root cause

The engine already carries angle metadata (`sub` tags like `vertical_pull` /
`horizontal_row` for back) and already has code that *tries* to spread a
muscle's sets across two differently-angled exercises
(`selectExercisesForMuscle`, `src/lib/planEngine.js:1020`) — but two separate
caps undermine it for exactly the case the founder hit: `numExHint()`
(`src/lib/planEngine.js:1008`) only ever asks for a **second** exercise when
the session's set target is **greater than 5**, and even when a second
exercise IS chosen, `MAX_SETS_PER_ENTRY = 6` (`src/lib/planEngine.js:1168`)
lets a single entry absorb up to 6 sets on its own. For a weak-pointed "back"
(the founder's "Lats / Back Width" / "Back Thickness" options,
`WEAK_POINT_MAP`, lines 34-35) the weak-point overlay pushes the weekly
target to ~21 sets across 2 weekly sessions (worked below), which lands each
session at an 11-set target — comfortably over the `numExHint` threshold, so
the engine DOES pick two exercises (Lat Pulldown + Barbell Row), but the
even-split arithmetic still hands the first one exactly 6 sets, because 6 is
the ceiling the code allows a single entry to hold. There is currently **no**
per-exercise cap anywhere in the engine below 6, and no mechanism that adds a
**third** exercise once a muscle's boosted volume outgrows what two
6-set-capped movements can hold — it silently absorbs the excess into the
existing two rather than spilling into a new one.

---

## 1. Diagnosis

### 1.1 End-to-end trace: UI entry → engine allocation

1. **UI entry.** `src/screens/ProGoalSetupScreen.js` — a Pro user on a
   `GOALS_WITH_WEAK_POINTS`-eligible goal (line 146:
   `const weakPointsApplicable = GOALS_WITH_WEAK_POINTS.includes(selectedGoal);`)
   sees a `weakPointGrid` (line 428) and taps up to 3 muscles via
   `toggleWeakPoint` (line 161), capped at 3 with a toast (line 165:
   `'Pick up to 3 muscles. Deselect one first'`). The selection is stored as
   `planWeakPoints` on the profile.
2. **Plan build.** `src/lib/planAutoGen.js:buildPlanInputs` (line 75) reads
   `migrated.planWeakPoints ?? []` into `inputs.weakPoints` (line 97) and
   `migrated.trainingPhase` into `inputs.phase` (line 85) — `phase ===
   'weak_point'` is what switches the engine into specialisation mode.
   `generateAndSavePlan` / `generatePlanDryRun` both call
   `generatePlan({ ...inputs, exerciseLibrary })` (planAutoGen.js:139/249).
3. **Engine entry.** `src/lib/planEngine.js:_generatePlanInner` (line 2428):
   - `weakPoints.slice(0, 3)` → `resolveWeakPointKeys` (line 2445-2446) maps
     UI labels to internal muscle keys via `WEAK_POINT_MAP` (line 31). Both
     `'Lats / Back Width'` and `'Back Thickness'` map to the single key
     `'back'` (lines 34-35) — there is no separate "lats" muscle, so
     targeting either label is programmatically identical.
   - `landmarks = computeLandmarks(...)` (line 2484) computes per-muscle
     MEV/MRV for this user.
   - `weeklyTargets[m] = lm.MEV` (line 2489) seeds every muscle at its MEV.
   - `applyGoalOverlay(...)` (line 2495) — this is where the weak-point
     **additive bonus** happens (line 172-202, quoted in full below).
   - `enforceWeeklyFloorsAndCaps(...)` (line 2496) applies floors/caps but
     explicitly **exempts** weak-pointed muscles from the synergist trim
     (`weakPointKeys.includes(muscle)` guard, line 366) — it only ever
     protects/raises a weak-pointed muscle, never lowers it.
   - Split selection (`selectSplit`, line 1202, or the division matrix) picks
     the session skeleton, e.g. `buildUpperLowerWorkouts` (line 1329) for a
     4-day non-matrix goal, or `buildUpperLowerWPWorkouts` (line 1493) which
     adds a *dedicated* 3rd weekly session for the weak-pointed muscle
     (`buildWeakPointDay`, line 1463) — but only at `effectiveDays === 5` and
     only for `goal === 'weak_point_spec'` (`selectSplit`, line 1219). At
     other day-counts and for most goals, the weak-point boost shows up
     purely through the *existing* upper/lower or PPL sessions carrying a
     bigger weekly target for that muscle — no extra session, no extra
     exercise slot, just a bigger number funnelled through the same
     exercise-selection code.
   - **The actual per-exercise allocation decision** happens in
     `buildSession` (line 1251) → `selectExercisesForMuscle` (line 1020).
     This is the function that decides "how many exercises" and "how many
     sets each" — traced in full in §1.2.

The weak-point overlay itself (`applyGoalOverlay`, lines 164-202):

```js
// 3. Weak-point specialisation: ADDITIVE on top of the division targets...
if (phase === 'weak_point' && weakPointKeys.length) {
  let added = 0;
  for (const m of weakPointKeys) {
    if (t[m] == null) continue;
    const lm = landmarks[m];
    const mrvCap = divisionMRV(m, goal, lm);
    // Specialisation pushes the lagging muscle hard towards its MRV (Helms):
    // close ~70% of the gap, not a token bump.
    const bonus = Math.max(2, Math.round((mrvCap - t[m]) * 0.7));
    const next = Math.max(t[m], Math.min(mrvCap, t[m] + bonus));
    added += next - t[m];
    t[m] = next;
  }
  ...
}
```

This is deliberately aggressive by design (closes ~70% of the gap to MRV) —
that part is not the bug; the bug is entirely in how the resulting weekly
number gets turned into exercises-and-sets downstream.

### 1.2 The 6-set lat-pulldown reproduction (worked, using real constants)

Using an intermediate, average-recovery, maintenance-phase, age-30-39 user
who selects **"Lats / Back Width"** (→ muscle key `back`) with a 4-day
`upper_lower` split (goal `general`, so no division overlay multiplier
applies to back):

1. **VOLUME_LANDMARKS.back** (`src/lib/algorithms.js:22`):
   `{ mv: 8, mev: 10, mav: 16, mrv: 25 }`.
2. **computeLandmarks** (`planEngine.js:99-120`): at intermediate/average/
   maintain/age 30-39 every multiplier table (`EXP_MULT`, `REC_MULT`,
   `NUT_MULT`, `ageMultipliers`) is 1.00, so `MEVadj = 10`, `MRVadj = 25`
   unchanged.
3. **Baseline weekly target** (`_generatePlanInner`, line 2489):
   `weeklyTargets.back = 10` (MEV).
4. **applyGoalOverlay weak-point bonus** (line 184): `mrvCap =
   divisionMRV('back', 'general', lm) = 25` (line 309-312, no glute-only
   special case applies). `bonus = Math.max(2, Math.round((25 - 10) * 0.7)) =
   Math.max(2, Math.round(10.5)) = Math.max(2, 11) = 11`. `next =
   Math.max(10, Math.min(25, 10 + 11)) = 21`. → `t.back = 21`.
5. **enforceWeeklyFloorsAndCaps**: back is not a synergist-trim target
   (`trimSynergist` only runs for biceps/triceps), MRV cap
   `Math.min(21, 25) = 21` is a no-op, delt-complex cap doesn't touch back.
   → `adjustedTargets.back = 21`.
6. **buildUpperLowerWorkouts** (line 1329-1351): `sessionsPerMuscle.back = 2`
   (line 1338) — back is trained in both Upper A and Upper B.
7. **buildSession** (line 1251-1282), for the Upper A call: `wTarget = 21`,
   `sessions = 2`, `sessionCap = _weakPointKeys.includes('back') ? 12 : 8 =
   12` (line 1261). `sessionTarget = Math.min(12, Math.round(21 / 2)) =
   Math.min(12, 11) = 11`.
8. **selectExercisesForMuscle('back', 11, ...)** (line 1020):
   - `numExHint(11)` (line 1008-1009: `sessionTarget <= 5 ? 1 : 2`) → `2`.
   - `SUBREGION_REQUIREMENTS.back = { minSets: 6, required: ['vertical_pull',
     'horizontal_row'] }` (line 604); `weeklyTotalSets` passed in is the raw
     `wTarget = 21 >= 6`, so `requiredSubs = ['vertical_pull',
     'horizontal_row']` (line 1054).
   - Pass 1 (line 1104-1125): `requiredSubs.length (2) === numEx (2)`, so both
     subs are covered: highest-sorted `vertical_pull` candidate is **"Lat
     Pulldown (Wide Grip)"** (`p: 'mod_compound'`, listed first among
     vertical_pull entries, line 422) and highest-sorted `horizontal_row`
     candidate is **"Barbell Row (Bent Over)"** (`p: 'heavy_compound'`,
     ranks above the mod_compound rows via `paramOrder`, line 427). `chosen =
     [Lat Pulldown, Barbell Row]`.
   - Distribution loop (lines 1159-1193), `n = 2`, `remaining = 11`:
     - `i=0` (Lat Pulldown): `slotsLeft=2`, `reserveAfter = 1*3 = 3`,
       `maxForThis = Math.min(6, 11-3) = 6`, `s = Math.ceil(11/2) = 6`,
       clipped to `6` → **6 sets**. `remaining = 5`.
     - `i=1` (Barbell Row): `slotsLeft=1`, `reserveAfter=0`,
       `maxForThis = Math.min(6, 5) = 5`, `s = Math.ceil(5/1) = 5` →
       **5 sets**.

**Result: Upper A prescribes "Lat Pulldown (Wide Grip): 6 sets" + "Barbell
Row (Bent Over): 5 sets" for back** — an exact, deterministic reproduction of
the founder's report, driven entirely by `MAX_SETS_PER_ENTRY = 6` (line 1168)
being the only ceiling on a single entry. (Upper B independently repeats this
arithmetic against a fresh `usedNames` set that already contains Lat
Pulldown/Barbell Row, so it typically substitutes Pull-Up + T-Bar Row at the
same 6+5 split — i.e. the whole week is riddled with 6-set single entries,
not just one.)

If the user instead had a 5-day plan with `phase === 'weak_point'` routed
through `buildUpperLowerWPWorkouts` (line 1493), the dedicated weak-point day
(`buildWeakPointDay`, line 1463) runs the same `selectExercisesForMuscle`
function with `wpTargets.back = Math.max(MEV, MRV-2) = 23`, 3 weekly sessions,
`sessionTarget = Math.min(12, Math.round(23/3)) = 8`, `numExHint(8) = 2`,
giving a 4+4 split *on top of* the two base upper-day sessions already
described — i.e. specialisation via the dedicated WP day does NOT reduce the
non-WP-day 6-set problem, it just adds more of it.

### 1.3 Current caps inventory (what exists today, what doesn't)

| Layer | Cap today | Where |
|---|---|---|
| Sets per exercise (floor) | `MIN_SETS_PER_ENTRY = 3` | `planEngine.js:1167` |
| Sets per exercise (ceiling) | **`MAX_SETS_PER_ENTRY = 6`** | `planEngine.js:1168` — this is the number the founder wants lowered to 3-4 |
| Exercises per muscle per session | Always exactly 1 or 2, never more, decided purely by `sessionTarget <= 5` | `numExHint`, `planEngine.js:1008-1010` |
| Sets per muscle per session (non-weak-point) | 8 | `planEngine.js:1261` |
| Sets per muscle per session (weak-pointed) | **12** (explicitly raised for weak points) | `planEngine.js:1257-1261` |
| Weekly per-muscle MRV | Division-aware (`divisionMRV`), e.g. 25 for back, 30 for Bikini/Wellness glutes | `planEngine.js:309-312`, `enforceWeeklyFloorsAndCaps:377-381` |
| Weak-point weekly bonus | `Math.max(2, Math.round((MRV - current) * 0.7))`, i.e. closes ~70% of the gap to MRV in one pass | `applyGoalOverlay:184` |
| Weekly progression across a mesocycle | `setsMultiplier` (1.00 → 1.25 across 4-5 weeks) applied to the **muscle-level weekly target only** (`getVolumeTargetsForWeek`, `mesocycle.js:137-144`); confirmed NOT wired into `routine_exercises` — `coachApply.computeVolumeApply` (`coachApply.js:283-307`) only ever writes to the `planned_muscle_volume` tracking table via `upsertPlannedMuscleVolume` (`CoachOutputScreen.js:1098/1169`), never to an exercise's `sets` column. So the mesocycle/coach-apply progression **cannot** stack more sets onto an existing exercise row after generation; the only place per-exercise set counts are ever decided is at plan-generation time in `selectExercisesForMuscle`. | `mesocycle.js`, `coachApply.js`, `CoachOutputScreen.js` |

**Conclusion: there is no per-exercise cap below 6 anywhere, and no
mechanism — at generation time or during weekly progression — that ever
grows the *number* of exercises for a muscle beyond 2.** Once a weak-pointed
muscle's session target exceeds what two 6-set-capped exercises can hold (12
sets), the two entries simply both saturate at 6 and the muscle is capped
there (`sessionCap = 12` was presumably chosen as exactly `2 × 6`) — the
excess is not spilled into a third exercise, it's absorbed as "both existing
movements go to their ceiling."

### 1.4 Metadata sufficiency for a "different angle" rule

The pool (hand-written `POOL` in `planEngine.js` and the equivalent generated
pool in `src/lib/poolGenerator.js`) already carries `sub` (subregion/angle),
`p` (paramKey: heavy_compound / mod_compound / machine / isolation) and `eq`
(equipment profiles) on every entry — this is exactly the shape a
complementary-angle rule needs. Coverage today, by weak-pointable muscle:

- **Good coverage** (multiple genuinely distinct angles/patterns, already
  used by `SUBREGION_REQUIREMENTS` for at least a weekly, if not per-session,
  diversity check): `back` (`vertical_pull` vs `horizontal_row` vs
  `lower_lat`, line 604), `chest` (`flat`/`incline`, line 622), `hamstrings`
  (`hip_extension`/`knee_flexion`, line 605), `quads` (`sweep`/`vasti`, line
  621), `glutes` (`activator`/`pumper`/`stretcher`, line 611), `rear_delts`
  (`face_pull`/`horiz_abduction`, line 623), `triceps` (`overhead`/`lateral`,
  line 624), `calves` (`gastro`/`soleus`, line 625), `abs`
  (`flexion`/`anti_extension`, line 626). `biceps` has three real angle tags
  in the pool (`long_head`/`short_head`/`brachialis`, lines 465-478) but is
  **not** in `SUBREGION_REQUIREMENTS` — the data exists, nothing currently
  requires the engine to use it.
- **Thin coverage** (pool entries mostly share one `sub` tag, so a
  complementary-angle rule would have little or nothing to select from):
  `front_delts` (`DEFAULT_SUBREGION.front_delts = 'press'` only, one angle),
  `traps` (`'upper'` only), `adductors` (`'adductor'` only), `side_delts`
  (mostly `'side'`, with `'press'` only from Arnold/OHP entries that are
  really front-delt-dominant, so a genuine second lateral-raise angle is
  thin).
- These three-to-four thin muscles are exactly where a deterministic
  second-exercise rule would most need the library expansion tracked in
  Plan A (`docs/exercise-planning-2026-07-09/plan-A-library-expansion.md`);
  for the remaining muscles (including `back`, the founder's actual example)
  the metadata to pick a complementary angle **already exists** — the
  problem is entirely that today's code doesn't use it to cap per-exercise
  sets or force a third exercise, only to choose which 1-2 exercises appear
  when `numExHint` already decided the exercise count.

### 1.5 Replay/fixture test infrastructure for the engine

There is **no golden-snapshot/replay corpus for `planEngine.js` itself.**
`grep`-ing the test suite for `toMatchSnapshot` and `__snapshots__` against
every plan-engine test file returns nothing; the only replay-style pinned
corpora in `src/lib/__tests__/` are `adaptiveTdee.b1.replay.test.js` (with a
`.snap` file) and `phaseVocab.en4.replay.test.js` — both about
`nutritionEngine`/`weeklyCoach` phase vocabulary, not exercise selection.

Plan-engine determinism is instead guarded by **explicit assertion-based
regression tests**, which is what a per-exercise-cap change would need to
update/extend rather than "regenerate a baseline":

- `src/lib/__tests__/planExercisePlacement.audit.test.js` — stress-tests
  `generatePlan` across every division × days × experience × equipment ×
  phase × weak-point combination and asserts every exercise lands on a day
  that trains its movement pattern (the "Pull day full of bench press" guard
  quoted at the top of that file). A cap/spill change must not break this —
  a spilled second/third exercise must still land on a pattern-correct day.
- `src/lib/__tests__/planEngineLibraryPool.test.js`, `planEngineGoalBias.test.js`,
  `planengineFullVerification.test.js`, `planengineRebuildPhase2/3e/4.test.js`,
  `engine-invariants.test.js` (has direct `sets` assertions, e.g. line 553:
  `expect(ex.sets).toBeGreaterThan(0)`), `supersets.test.js` /
  `supersetPractical.test.js` (exercise-count and pairing assumptions that a
  3rd exercise per muscle could affect), `planEngine.test.js`,
  `planengineStructuralVolume.test.js`, `coachDivisions.test.js`.
- None of these currently assert `sets <= 6` or `numEx <= 2` by name (a
  targeted grep for `MAX_SETS_PER_ENTRY`, `numExHint`, or a "sets .toBe(6)"
  style assertion in the test directory returns nothing), so lowering the cap
  will not fail an existing hard-coded expectation — but it also means there
  is **no existing regression guard preventing exactly the founder's
  complaint**, which should itself be added as a new invariant test
  regardless of which option is chosen (e.g. "no single exercise in any
  generated plan, at any weak-point/goal/day combination, carries more than N
  sets").

---

## 2. Target behaviour as a deterministic rule set (founder's spec taken as given)

Treating "hard cap 3-4 sets per exercise; overflow spills into a second,
differently-angled exercise" as the specified target (final number of 3 vs 4
is a founder decision, §5 Q1):

1. **R1 — Per-exercise set ceiling.** Replace `MAX_SETS_PER_ENTRY = 6` with a
   lower constant, `MAX_SETS_PER_ENTRY = N` (N ∈ {3, 4} per founder choice).
   `MIN_SETS_PER_ENTRY` stays at 3 unless N is set to 3, in which case
   min=max=3 for any exercise (no range to split within one entry).
2. **R2 — Exercise count follows the ceiling, not a fixed 1-or-2.**
   `numExHint(sessionTarget)` currently hard-codes "1 exercise if ≤5, else
   2, never 3+". Replace with a ceiling-driven count:
   `numEx = Math.max(1, Math.ceil(sessionTarget / MAX_SETS_PER_ENTRY))`,
   still bounded by how many genuinely distinct angles the pool has for that
   muscle (§2, R3) and by a hard outer bound (e.g. 3 exercises/muscle/session
   — a 4th would fragment a single session too much; founder decision, §5
   Q3).
3. **R3 — Angle-diversity selection rule for the 2nd/3rd exercise (the
   founder's actual ask).** When a muscle needs more than one exercise in a
   session, exercise 2 (and 3, if R2's ceiling forces it) must be chosen by:
   a. **Required subregions first** (existing `SUBREGION_REQUIREMENTS`
      mechanism, `planEngine.js:604-627`) — already covers back, chest,
      hamstrings, quads, glutes, rear_delts, triceps, calves, abs. Extend the
      table to biceps (`long_head`/`short_head`/`brachialis` — data already
      in the pool, just not required yet) as part of this work, since it
      costs nothing (metadata exists).
   b. **Movement-pattern/equipment-category diversity** as the tie-break for
      muscles without a subregion requirement (front_delts, traps, adductors,
      side_delts) — prefer a different `equipmentCategory` or `p` (paramKey)
      from an exercise already chosen this session, before falling back to
      "any unused exercise in the pool," so a thin library still degrades
      gracefully to "different equipment" rather than "same angle, twice."
   c. **Deterministic, seeded tie-break.** Existing `sortScore` (line 1068)
      is already index/idx-stable and carries no randomness — keep the same
      shape: reqBonus → paramBonus (compound-before-isolation) →
      divisionBonus → goalBonus → pool-index, so two runs with identical
      inputs always produce identical output (CLAUDE.md's "no randomness,
      same inputs → same output" engine mandate).
   d. **Respect equipment filtering** — `filterPool(muscle, equipment, goal)`
      (line 970) already runs before this; the spill-to-2nd-exercise
      selection must draw only from that same filtered/gated set, never
      reach outside the user's declared equipment.
4. **R4 — Weekly MRV totals unchanged.** This is a redistribution-only
   change: the weekly per-muscle target computed by `applyGoalOverlay` /
   `enforceWeeklyFloorsAndCaps` is untouched. Only how that number is sliced
   into exercises-and-sets-per-exercise changes. (Founder could instead
   choose to trim total volume rather than preserve it — §5 Q2 — but the
   founder's own wording ("adds more sets... rather than a new exercise")
   reads as a redistribution complaint, not a total-volume complaint.)
5. **R5 — sessionCap of 12 for weak-pointed muscles should be revisited
   alongside this.** It exists today specifically so a weak-pointed muscle's
   boosted target isn't clipped at 8 (comment, line 1257-1261) — that
   reasoning assumed 2 exercises × 6 sets = 12 was the ceiling. If N drops to
   4, either sessionCap should rise in step with `numEx × N` (e.g. 3
   exercises × 4 = 12, unchanged) or R2's outer exercise-count bound needs to
   be picked so the two numbers stay coherent. This is arithmetic, not a new
   founder call, but the exact combination (N, max exercises/session,
   sessionCap) needs to be chosen as one coherent set (§5 Q3).

---

## 3. Edge cases

- **Thin equipment context (not enough angles for a spill).** A
  bodyweight-only or single-machine user may have only 1 exercise available
  for a muscle in `filterPool`. Today, `selectExercisesForMuscle`'s fallback
  (line 1154-1157: `if (chosen.length === 0 ...) chosen.push(sorted[slot %
  sorted.length])`) already handles zero-candidates; the new rule must
  explicitly define what happens when a spill is *needed* (session target >
  N) but no 2nd distinct-angle exercise exists in the filtered pool: options
  are (a) fall back to today's behaviour and let the single exercise exceed
  N sets (defeats the founder's ask, but avoids returning less volume than
  promised), or (b) hold the muscle to `1 × N` sets that session and let the
  weekly MRV shortfall show up as a `planShortfallNote`-style warning (loses
  some of the promised weekly volume, but never breaks the 3-4 cap). This is
  a genuine fork — not a matter of "the code will figure it out" — because
  it trades the "never exceed N sets" promise against the "deliver the
  weekly target" promise. **Founder decision, §5 Q4.**
- **Supersets.** `assignSupersets` (`planEngine.js:2278`) runs after exercise
  selection and pairs/pre-fatigues entries within a session. A 3rd exercise
  for one muscle changes the pairing search space (more candidates,
  potentially two same-muscle entries eligible to superset with each other,
  which `canSuperset`/`isAntagonistPair` — lines 2142, 2158 — may not
  currently guard against for same-muscle pairs). Needs a check that the
  spill exercise doesn't get superset with its own sibling exercise for the
  same muscle (likely undesirable — two lat pulldown variants back-to-back
  isn't the "different angle, spread through the session" the founder wants
  either).
- **User-built plans vs auto-generated plans.** This entire mechanism lives
  in `planEngine.generatePlan`, which only runs for Pro auto-generated plans
  (`planAutoGen.js`). A user who manually builds/edits a routine via
  `ManualBuilderScreen.js` is completely unaffected — they can already put 6+
  sets on one exercise today and will continue to be able to after this
  change, because the builder doesn't route through `selectExercisesForMuscle`.
  This is worth confirming explicitly with the founder as in-scope-or-not
  (the founder's report describes the auto-gen weak-point flow specifically,
  but "I don't want more than 3-4 sets maximum per exercise" reads as a
  general principle) — **§5 Q5**.
- **Existing plans already carrying 5-6 sets on one exercise.** A cap change
  only affects future `generatePlan` calls (new plan generation / goal
  change / rebuild). Users with an already-generated, already-saved plan
  keep their existing routine rows untouched (there is no "re-validate
  existing plans against a new cap" pass anywhere in the codebase; this
  would be new work if wanted). Whether to (a) leave existing plans alone
  (grandfather), (b) offer/force a regeneration, or (c) silently trim
  existing routine rows to the new cap on next load is a distinct decision
  with its own blast radius (a silent trim would be an unannounced workout
  change for someone mid-mesocycle) — **§5 Q6**.
- **MRV totals unchanged vs redistributed.** Covered in R4 above — flagged
  again here because it's the fork most likely to be silently "decided" by
  whichever implementation option is picked if not asked explicitly.

---

## 4. Implementation options

### Option 1 — Cap + hard block, no spill (S)
Lower `MAX_SETS_PER_ENTRY` to 3 or 4; leave `numExHint` alone (still only
ever 1 or 2 exercises). Any weak-point session target beyond `numEx × N`
sets is silently clipped (extra volume is lost, not redistributed) —
**this does not satisfy the founder's actual ask** ("a new exercise", not
"less volume") and is listed only as the cheapest possible baseline / a
strawman to reject explicitly, not a recommendation.
- Files touched: `planEngine.js` (1 constant).
- Tests: existing suite likely still passes (no assertions pin 6); should add
  a new invariant test for the cap itself.
- Blast radius: tiny, but ships behaviour the founder explicitly said is not
  what they want (a coach that silently under-delivers weekly volume when
  the plan is already thin on angle variety). **Not recommended.**

### Option 2 — Cap + deterministic spill to a 2nd/3rd exercise, existing metadata only (M)
Implement R1-R5 as specified in §2, using only the subregion/pattern metadata
that already exists in the pool today (§1.4's "good coverage" list). Extend
`SUBREGION_REQUIREMENTS` to `biceps` (data already present). For the "thin
coverage" muscles (front_delts, traps, adductors, side_delts), fall back to
equipment-category diversity (R3b) rather than blocking on Plan A's library
work — accept that these four muscles get a weaker "different angle" and a
stronger "at least different equipment" until Plan A lands.
- Files touched: `planEngine.js` (`numExHint`, `selectExercisesForMuscle`
  distribution loop, `SUBREGION_REQUIREMENTS`, `buildSession`'s
  `sessionCap`), possibly `assignSupersets` (same-muscle-sibling guard).
- Tests: extend `planExercisePlacement.audit.test.js` (assert every session
  still lands on a pattern-correct day with the new exercise counts), add a
  new invariant test file (e.g. `weakPointSetCap.test.js`) asserting no
  exercise anywhere exceeds N sets across the full division × day × weak-
  point matrix already stress-tested by the audit test; update
  `planEngineLibraryPool.test.js` / `engine-invariants.test.js` if they
  assert specific exercise counts anywhere (needs a check pass during
  implementation, not found in this diagnosis).
- Blast radius: moderate — touches the core selection function used by every
  generated plan (not just weak-point ones, since `numExHint` is shared), so
  regression risk extends beyond weak-point specialisation to ordinary
  2-exercise-per-muscle sessions at high volume (e.g. a Bikini glute day
  already targeting MRV 30). Needs the full stress-test suite re-run, not
  just weak-point cases.
- **This is the option that actually matches the founder's stated spec** and
  is recommended, subject to the founder's answers in §5.

### Option 3 — Cap + spill + library-metadata-aware fallback chain (L)
Everything in Option 2, plus: for the "thin coverage" muscles, block on (or
sequence tightly with) Plan A's library expansion so front_delts / traps /
adductors / side_delts get genuine second angles too, rather than settling
for "different equipment, same angle." Also adds a machine-readable
"movement_pattern" or "plane" field to the pool entry shape (currently
inferred loosely from `sub` + name) so the complementary-angle rule is
explicit metadata rather than a per-muscle hand-maintained table, and extends
`SUBREGION_REQUIREMENTS`-style diversity requirements to every programmable
muscle uniformly.
- Files touched: everything in Option 2, plus `poolGenerator.js`
  (`toPoolEntry`, `SUBREGION_TRANSLATION`, `DEFAULT_SUBREGION`), the exercise
  library schema/migration if a new `movementPlane` column is added
  (`database.js` local migration + a `supabase/migrate_NNN_*.sql`, per
  CLAUDE.md's additive/idempotent migration rule), and coordination with
  whatever Plan A recommends for the library census.
- Tests: everything in Option 2, plus new pool-generation tests
  (`poolGenerator` already has none visible in this search — would need a
  fresh test file) and a schema-migration test/checklist per
  `docs/rules/supabase.md`.
- Blast radius: large — a schema change plus a library data project plus the
  engine change, sequenced across two parallel workstreams (this doc + Plan
  A). Correct long-term shape, wrong size if the founder wants the founder's
  literal complaint (lat pulldown → row) fixed now.

---

## 5. Founder decision questions

**Q1. Per-exercise set cap: 3 or 4?**
A) Hard cap at 3 sets per exercise (matches the low end of the founder's
   "3-4 sets maximum" wording; forces more spillage into 2nd/3rd exercises,
   more angle variety per session).
B) Hard cap at 4 sets per exercise (matches the high end; fewer spills,
   closer to today's exercise counts, still well under the current 6).

**Q2. Preserve weekly MRV totals, or trim them?**
A) Preserve — the weekly per-muscle target is unchanged; the cap only
   changes how it's sliced across exercises (more exercises, same total
   sets). This is what the founder's wording implies ("add a different
   exercise", not "do less").
B) Trim — deliberately reduce the weak-point weekly bonus (`applyGoalOverlay`
   line 184's ~70%-of-gap formula) so a smaller total volume fits inside
   fewer, more focused exercises, on the view that a lower absolute weekly
   number with better angle variety beats a higher number spread thin.

**Q3. Maximum exercises per muscle per session?**
A) 2 (today's ceiling) — the cap lowers to 3-4 sets/exercise but a muscle's
   session volume is still capped at `2 × N` (i.e. `sessionCap` also drops,
   e.g. to 8 if N=4), meaning weak-pointed muscles get a materially smaller
   per-session dose than today's 12.
B) 3 — allows a muscle to keep close to today's 12-set weak-point session
   cap (3 × 4 = 12) while still enforcing the 3-4/exercise rule, at the cost
   of a 3-exercise single-muscle block in one session (more time, more
   session-length pressure — interacts with `estimateSessionMinutes` /
   `trimToTimeBudget`).

**Q4. Thin-equipment fallback when no 2nd/3rd angle exists?**
A) Exceed the cap on the single available exercise rather than under-deliver
   the weekly target (keeps today's "always hit the promised weekly volume"
   behaviour for edge-case equipment, but re-opens the exact complaint for
   that narrow case).
B) Hold to the cap and accept a weekly-volume shortfall for that muscle,
   surfaced via the existing `planShortfallNote`-style warning mechanism
   (never breaks the 3-4 rule, but a bodyweight-only user targeting biceps as
   a weak point may get visibly less volume than the plan intends).

**Q5. Scope: auto-generated plans only, or also flag the manual builder?**
A) Auto-generated plans only (`planEngine.generatePlan` / `planAutoGen.js`) —
   matches the founder's literal report, which describes the weak-point
   auto-gen flow.
B) Also add a soft warning (not a hard block — CLAUDE.md's "never gate a
   free feature" and manual-builder-freedom conventions would need checking)
   in `ManualBuilderScreen.js` when a user manually sets an exercise above
   the same N-set threshold, for consistency of coaching voice.

**Q6. Existing plans already carrying 5-6 sets on one exercise — grandfather
or migrate?**
A) Grandfather — the new cap applies only to plans generated after the
   change ships; existing users' current routines are untouched until they
   next regenerate (goal change, rebuild, or manual edit).
B) Prompt — surface a one-time, dismissible coach note to affected users
   ("your plan has some heavy single-exercise sets; want us to rebalance?")
   that offers, but never forces, a regeneration.
C) Force — silently rewrite existing routine rows to match the new cap on
   next app load. **Flagged as very likely undesirable** (an unannounced
   change to someone's in-progress mesocycle, and a case where "silent"
   conflicts with the workflow rule against unannounced changes to what a
   user is currently training) — included only so the founder can explicitly
   rule it out rather than have it happen by omission.

---

## 6. Recommended option (subject to founder answers above)

**Option 2** (M): implement the cap-plus-deterministic-spill rule using the
angle/subregion metadata that already exists for back, chest, hamstrings,
quads, glutes, rear_delts, triceps, calves and abs (extending
`SUBREGION_REQUIREMENTS` to biceps, which costs nothing since the pool
already tags `long_head`/`short_head`/`brachialis`), with equipment-category
diversity as the fallback for the four thinly-tagged muscles
(front_delts/traps/adductors/side_delts) rather than blocking on Plan A's
library expansion. This directly fixes the founder's reported case (back /
lat pulldown has excellent existing metadata) without waiting on a
library-data project, while leaving the door open for Option 3's richer
metadata layer once Plan A's census is in.
