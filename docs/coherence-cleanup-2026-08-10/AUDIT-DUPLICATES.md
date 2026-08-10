# AUDIT-DUPLICATES — Campaign 4 Phase 14 (duplicated calculation audit)

**Scope:** Campaign 4 order, PHASE 14 — "duplicate/shadow calculations that can
cause future drift … Focus only on cases where more than one implementation
purports to calculate the SAME product truth … Do not flatten legitimate layers
… ONE PRODUCT TRUTH may have multiple presentation helpers, but should not have
multiple accidentally divergent mathematical authorities. Every consolidation
must have equivalence/regression tests."

**Baseline:** branch `claude/campaign4-coherence` (= main `92b9644e`), auditor
commit `0f4d868e`. READ-ONLY audit. Nothing executed, nothing deleted.

**Classification law:** Campaign 4 order, CORE CLEANUP LAW (A–I). Zero callers
alone never proves dead. Every verdict below carries the proof that earns it.

**Prior authority consulted (not summarised — read):**
- `docs/_FULL-APP-PRODUCT-MAP.md:13896-13985` §B.9 "Duplicated calculations and
  shadow implementations" (B.9.1 e1RM, B.9.2 week-start, B.9.3 strength
  standards, B.9.4 muscle display names, B.9.5 stale SQL). This audit re-proves
  B.9.1/B.9.2/B.9.4 against current main and extends into four families B.9
  never covered (goal/phase translators, calorie floors, notification category
  derivation, energy conversion).
- `docs/audit/cross-surface-consistency-audit-2026-07-30.md:128-132` — the X4
  e1RM ruling.
- `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md:2127` (D89 item
  3, two energy totals on one card → "The second figure now converts through the
  same helper").
- `src/lib/__tests__/checkinCoachAudit.guard.test.js:71-90` — the re-anchored
  ALGO-003 guard that makes a second inline e1RM impossible in
  `getWeeklyPRCount`.

---

## SUMMARY — verdicts by class

| Class | Count | Items |
|---|---|---|
| A — LIVE, KEEP | 5 | D-1 `calculate1RM`; D-6 `kcalFloorForSex`; D-9 `toEnergy`/`fromEnergy`; D-10 `dayKey.js`; D-14 `categoryForDataType` (as the intended single authority) |
| B — LIVE-CONDITIONAL, KEEP | 0 | — |
| C — INTERNAL AND REQUIRED, KEEP | 3 | D-11 `weeklyCoach` weekSeed UTC bucket; D-12 `food/diaryDates` week helpers; D-13 `weekWindowsEndingAt` |
| D — INTENTIONAL SEAM, KEEP | 2 | D-7 `progressScanCheckInEvidence.GOAL_PHASE_ALIASES`; D-8 `coachApply.kcalFloorForSex` delegation |
| E — LEGACY BUT LOAD-BEARING, KEEP + DOCUMENT | 4 | D-3 muscle-name humanising wrappers; D-5 phase LABEL tables; D-16 `coachApply.KCAL_FLOOR`/`KCAL_FLOOR_MALE`; D-17 `planEngine.phaseShort` |
| F — CONFIRMED DEAD, REMOVE | 2 | **D-2 `bestLift.epleyE1rm` (the dangerous default)**; **D-4 duplicated `displayName` body in `interBlock.js` / `blockExplain.js`** |
| G — PRODUCT-BOUNDARY REMNANT, REMOVE WHERE NON-DESTRUCTIVE | 1 | D-18 `cardioHistoryView` UTC day-key default (defer to the cardio lane) |
| H — DEAD BUT DATA-DESTRUCTIVE, STOP | 0 | — |
| I — UNCERTAIN, DO NOT DELETE | 3 | D-15 `categoryForDataType` `meal_log_reminder` gap; D-19 `progressPhotoTimeline` private `localDayKey`; D-20 the four UTC `toISOString().slice(0,10)` persistence stragglers |

**Delete-safe (F/G): 3 items.** **Stop/uncertain (H/I): 3 items.**

---

# FAMILY 1 — e1RM

## D-1 `algorithms.calculate1RM` — CLASS A (LIVE, canonical, KEEP)

`src/lib/algorithms.js:77-101`. Blended Epley/Brzycki, rep count clamped at 20,
`reps === 1` returns the raw weight, non-numeric-safe coercion.

```
src/lib/algorithms.js:96   const epley = w * (1 + r / 30);
src/lib/algorithms.js:97   const brzycki = w / (1.0278 - 0.0278 * r);
src/lib/algorithms.js:99   if (r <= 10) return epley * 0.6 + brzycki * 0.4;
src/lib/algorithms.js:100  return (epley + brzycki) / 2;
```

**Every live e1RM consumer routes through it — verified, no exceptions:**

| Surface | file:line |
|---|---|
| in-session PR detector | `src/lib/algorithms.js:556`, `:559` (`detectPR`), margin `*1.001` at `:563` |
| live set-entry "Est. max" | `src/components/SetEntry.js:6`, `:138-139` |
| logged-set row | `src/components/workout/LoggedSetRow.js:12`, `:121` |
| progress screens | `src/hooks/useProgressData.js:13`, `:45` |
| lift-progress rows + metric series | `src/lib/liftProgress.js:10`, `:60`, `:134` |
| weekly PR count | `src/lib/database.js:6253`, `:6258` |
| best lift of the week | `src/lib/database.js:6328`, `:6334` |
| strength standards | fed `row.bestE1rm` from `liftProgress` → `src/lib/athleteProfileSummary.js:40`, `src/screens/LiftProgressScreen.js:179` |

`src/lib/strengthStandards.js` computes no e1RM of its own (`:42-45` takes
`oneRm` as a parameter). No e1RM expression survives in SQL: `grep` over
`src/lib/database.js` returns only the X4 comment block at `:6196-6210` and
`calculate1RM(` call sites.

**KEEP.** It is the ruled authority (X4,
`docs/audit/cross-surface-consistency-audit-2026-07-30.md:128-132`) and pinned by
`src/lib/__tests__/checkinCoachAudit.guard.test.js:86-90`.

---

## D-2 `bestLift.epleyE1rm` — CLASS F (CONFIRMED DEAD default — REMOVE)

**The one genuine dangerous default in this lane.**

```
src/lib/bestLift.js:26-32   export function epleyE1rm(weight, reps) { … return w * (1 + reps0 / 30); }
src/lib/bestLift.js:44      export function pickBestLift(weekSets, priorBestByExercise, e1rmFn = epleyE1rm) {
```

**Can the two implementations diverge on the same input? YES, materially.**
`epleyE1rm` is plain Epley with **no rep clamp** and **no `reps === 1` special
case**. Worked divergence, same input, two answers:

| input | `calculate1RM` | `epleyE1rm` | divergence |
|---|---|---|---|
| 60 kg × 20 | 60·(1+20/30)·0.5 + 60/(1.0278−0.556)·0.5 = **113.6 kg** | 60·(1+20/30) = **100.0 kg** | +13.6 % |
| 60 kg × 30 | clamped at r=20 → **113.6 kg** | 60·(1+30/30) = **120.0 kg** | the clamp the X4 ruling exists to enforce is absent |
| 100 kg × 1 | **100.0 kg** (special case) | 100·(1+1/30) = **103.3 kg** | +3.3 % |
| 100 kg × 5 | 100·1.1667·0.6 + 100/0.889·0.4 = **115.0 kg** | **116.7 kg** | +1.5 % |

This is the exact class of divergence the X4 ruling was written to end —
`src/lib/bestLift.js:12-18` records it in the module's own header:

> "e1RM defaults to plain Epley (weight * (1 + reps/30)), used by callers/tests
> that pass no e1rmFn. getBestLiftThisWeek (database.js) instead passes
> calculate1RM (algorithms.js) as the third argument: X4 … ruled that the weekly
> tally must conform to the SAME blended/clamped formula the live in-session PR
> detector (detectPR/calculate1RM) uses, not a separate plain-Epley formula."

**Proof it is dead in the product (all six A–I checks run, not just caller count):**

1. **Non-test callers of `pickBestLift`: exactly one** —
   `src/lib/database.js:6334` `return pickBestLift(weekSets, priorByEx, calculate1RM);`
   It **injects the canonical function**, so the default never runs in the app.
   (`src/lib/database.js:4` imports `pickBestLift`; no other import exists.)
2. **Non-test callers of `epleyE1rm`: zero.** `grep -rn "epleyE1rm" src/` returns
   `src/lib/bestLift.js:26,41,44` and `src/lib/__tests__/bestLift.test.js:1,5-14`
   only.
3. **Dynamic/lazy access:** none. `src/lib/bestLift.js` has no `require`, and no
   module string-indexes it (`grep "bestLift\[" ` → nil).
4. **Scripts / CI:** `grep -rn "epleyE1rm\|pickBestLift" scripts/ tests/` → nil.
5. **Decisions / migration contracts:** no decision preserves it; the only
   decision on this family (X4) is what demoted it.
6. **Rollback / compatibility seam:** it is not a rollback switch — it produces a
   number, not a behaviour toggle, and the ruling that displaced it is a
   correctness ruling, not an experiment.

**A caller COULD accidentally use it.** `pickBestLift(sets, prior)` is a legal
two-argument call that silently produces the superseded formula. Any future
caller (a share-card variant, a widget, a recap surface) written without reading
the 24-line header forks product truth again — and the disagreement it produces
is precisely the "PR celebrated in-session, 0 PRs in the recap" defect X4 fixed.

### Consolidation plan (D-2)

Preferred, per the order's own phrasing ("removing the dangerous default **or
making canonical behaviour unavoidable**"):

1. Delete `epleyE1rm` (`src/lib/bestLift.js:26-32`).
2. Make the canonical formula unavoidable — one of:
   - **(a) preferred:** `import { calculate1RM } from './algorithms';` and set
     `e1rmFn = calculate1RM` as the default. No import cycle exists:
     `src/lib/algorithms.js:3-8` imports only `./whyThisTemplates`, and nothing
     in `algorithms.js` references `bestLift`. `src/lib/database.js:6334` may
     then drop its third argument or keep it (identical either way).
   - **(b)** make `e1rmFn` required and return `null` when it is not a function.
     Keeps `bestLift.js` dependency-free but leaves a silent-null failure mode.
   Recommend **(a)**: it makes the correct formula the path of least resistance,
   which is the whole point of the ruling.
3. Update the header (`src/lib/bestLift.js:12-18`) to state that the default IS
   the canonical formula and that a plain-Epley default was removed under
   Campaign 4 / X4.

### Equivalence + regression tests REQUIRED before this lands (order: "Every consolidation must have equivalence/regression tests")

- **T-2.1 (equivalence, the load-bearing one).** For a fixed set of
  (weight, reps) pairs spanning the divergence cases above — including
  `(60,20)`, `(60,30)`, `(100,1)`, `(100,5)`, `(0,5)`, `(100,0)` — assert
  `pickBestLift(sets, prior)` (default) `.toEqual(` `pickBestLift(sets, prior,
  calculate1RM)` `)`. This is the test that proves the default change is a no-op
  against the only live call site.
- **T-2.2 (regression on the live path).** Assert
  `getBestLiftThisWeek`'s selection is unchanged: a fixture where the
  plain-Epley and blended formulas pick **different** hero lifts (e.g. one
  exercise at 60×20 vs another at 105×3) must still pick the blended winner.
- **T-2.3 (tombstone, Phase 24-style).** Source guard on
  `src/lib/bestLift.js`: `expect(SOURCE).not.toMatch(/1 \+ reps0? \/ 30/)` and
  `not.toMatch(/epleyE1rm/)` — a plain-Epley e1RM never returns to this module.
  This is a good Phase 24 candidate because reintroduction forks product truth.
- **Test law (Phase 17/4 compliance).** `src/lib/__tests__/bestLift.test.js:5-16`
  (`describe('epleyE1rm')`) protects **only the dead implementation** → class B
  under Phase 17, delete with the implementation. But
  `src/lib/__tests__/bestLift.test.js` calls `pickBestLift` **8 times and
  supplies the third argument 0 times** (`:20, :21, :31, :40, :55, :62, :74,
  :80`) — every one of those currently exercises the default. Under option (a)
  they keep passing and now exercise the canonical formula; the expected values
  at `:31, :55, :62, :74, :80` must be recomputed for the blended formula. Do not
  weaken any assertion to make them pass. The behavioural law those tests hold
  ("rank by gain, not raw heaviness"; "heaviest set when no prior best") is
  formula-independent and must survive verbatim on the live implementation.

**Device checklist impact:** the "Great Week" recap share card's hero lift can
change for a user whose top set is very high-rep. Non-safety, cosmetic, but it
belongs on the checklist: log a 60 kg × 20 set and a 105 kg × 3 set in one week,
open the weekly recap card, confirm the featured lift matches the in-session
"Est. max" ordering shown on the set rows.

---

# FAMILY 2 — muscle display names

Canonical map: `src/lib/algorithms.js:56-74` `MUSCLE_DISPLAY_NAMES` (17 keys).
Verified **key-for-key identical** to `VOLUME_LANDMARKS`
(`src/lib/algorithms.js:21-54`) — chest, back, front_delts, side_delts,
rear_delts, biceps, triceps, forearms, quads, hamstrings, glutes, adductors,
calves, abs, traps, neck, tibialis. Legacy `'shoulders'` is normalised away
inside `allocateExerciseVolume` (`src/lib/algorithms.js:173`, `:193`) before any
key reaches a name lookup, and the picker constrains user input to the canonical
set (`src/components/ExercisePickerModal.js:38`
`Object.keys(MUSCLE_DISPLAY_NAMES)`).

## D-3 Two fallback conventions for an unknown key — CLASS E (KEEP, DOCUMENT)

**Convention 1 — raw key leaks (`|| muscle` / `?? muscle`):**
`src/lib/algorithms.js:713`, `:726`, `:732`, `:1200`, `:1368`, `:1553`, `:1587`;
`src/lib/insightsEngine.js:101`; `src/lib/volumeInsightCopy.js:41`;
`src/components/ProgressSections.js:230`; `src/components/EngineLog.js:135`.
An unknown key renders as `rear_delts` — snake_case in user-facing copy.

**Convention 2 — humanise (`replace(/_/g,' ')` + capitalise):**
`src/lib/blockExplain.js:35-40`; `src/lib/interBlock.js:109-115`;
`src/lib/divisionDiff.js:138-139` (capitalise-then-replace; output-equivalent to
replace-then-capitalise for every `[a-z_]+` key, verified: `"rear_delts"` →
`"Rear delts"` both ways).

**Can they diverge on the same input?** Only on a key outside the canonical 17.
Reachability of such a key is **narrow but real**: a `custom_exercises` row
synced from an older or foreign client carries an arbitrary
`primary_muscle`/`secondary_muscles` string that is only `.toLowerCase()`-ed
(`src/lib/algorithms.js:172`, `:188`), never validated against the map. For every
canonical key the two conventions are byte-identical, so this is **not** a live
divergence.

**Verdict: E — KEEP, DOCUMENT.** These are presentation layers over ONE data
authority; the order explicitly says legitimate presentation layers are not
duplicates. `docs/_FULL-APP-PRODUCT-MAP.md:13968-13971` already reached the same
conclusion ("Same source data, local formatting. Not a divergence, but two more
places a name can be shaped"). No consolidation of the call sites is proposed —
that would be the "flatten legitimate layers" the order forbids.

## D-4 `displayName` implemented twice, byte-identically — CLASS F (REMOVE the duplicate body)

```
src/lib/interBlock.js:109-115    function displayName(muscleKey) { … }
src/lib/blockExplain.js:35-40    const displayName = (key) => { … }
```

Same logic, same output, two private copies in two adaptive-stack modules that
already both import from `algorithms` (`src/lib/interBlock.js:49`,
`src/lib/blockExplain.js:28`).

**Consolidation plan (D-4):** export one `muscleDisplayName(key)` from
`src/lib/algorithms.js` beside `MUSCLE_DISPLAY_NAMES` (`:56`), delete both
private bodies, and point `src/lib/divisionDiff.js:138-139` at it too.
Consumers: 3. Do **not** touch the `|| muscle` sites — they are a different,
deliberate presentation choice in a different module family and changing them
would alter live copy.

**Equivalence tests REQUIRED:**
- **T-4.1.** For all 17 canonical keys **plus** `'shoulders'`, `''`, `null`,
  `undefined`, `'made_up_muscle'`: the new shared helper must return exactly what
  each of the three deleted implementations returned. Capture the three current
  outputs as the fixture before deleting anything.
- **T-4.2.** `expect(Object.keys(MUSCLE_DISPLAY_NAMES)).toEqual(Object.keys(VOLUME_LANDMARKS))`
  — pins the invariant that makes the fallback unreachable in normal operation.
  (No such test exists today; `grep` over `src/lib/__tests__/` finds none.)

---

# FAMILY 3 — goal / phase translators

## D-5 Phase VALUE→KEY translation — CLASS A for the translators; CLASS E for the LABEL tables

**The translators are single-authority and clean.** `src/lib/coachingGoals.js`
holds one table, `TRAINING_PHASES` (`:222-291`), and both translators derive from
it:

```
src/lib/coachingGoals.js:300-302  phaseToNutritionKey → TRAINING_PHASES.find(...)?.nutritionKey ?? 'maintain'
src/lib/coachingGoals.js:307-321  phaseToCoachingKey  → …?.coachingPhaseKey, logWarn + 'maint' on unknown
```

Consumers, all going through the translator:
`src/lib/blockLedgerGather.js:31`, `:343`; `src/lib/planAutoGen.js:31`, `:103`;
`src/screens/ProGoalSetupScreen.js:25`, `:212`, `:264`;
`src/screens/ProOnboardingScreen.js:38-39`, `:930`, `:969`;
`src/lib/coachingGoals.js:383` (inside `buildNutritionEngineInputs`).

**One inline re-implementation found — `src/screens/HomeScreen.js:747`:**
```js
const currentNutritionKey = TRAINING_PHASES.find(p => p.value === currentPhase)?.nutritionKey ?? null;
```
This is `phaseToNutritionKey`'s body with a **different fallback** (`?? null`
instead of `?? 'maintain'`). **Can it diverge? Yes, and here the divergence is
correct:** it drives the phase-mismatch banner (`:750` requires
`currentNutritionKey &&`), and a `'maintain'` fallback would make an *unknown*
phase compare equal to a genuinely-saved `maintain` target and silently suppress
the banner. Substituting `phaseToNutritionKey` here would be a behaviour change,
not a cleanup.
**Verdict: KEEP as written (class A), but it must not stay unexplained.** Add a
one-line comment at `src/screens/HomeScreen.js:747` stating why the null
fallback is deliberate and that this is intentionally not `phaseToNutritionKey`.
That is a comment fix (Phase 15), not a consolidation.

**The LABEL tables are the real finding — five statements, three vocabularies,
divergent user-facing strings for one user:**

| # | Table | file:line | Key space | `bulk`-path user sees |
|---|---|---|---|---|
| 1 | `coachingGoals.PHASE_LABELS` | `src/lib/coachingGoals.js:295-297` (from `TRAINING_PHASES[].label`) | phase `value` | "Build muscle (bulk)" |
| 2 | `weeklyCoach.PHASE_CONFIG[].label` | `src/lib/weeklyCoach.js:325-331` | coaching key | **"Lean bulk"** (`mod_bulk:` `:330`) |
| 3 | `nutritionEngine.PHASE_LABELS` | `src/lib/nutritionEngine.js:36-43` | nutrition key | "Build muscle (fast)" (`build:` `:38`) |
| 4 | `planEngine.NUTRITION_PHASE_LABELS` | `src/lib/planEngine.js:2216-2223` | nutrition key | "Build muscle quickly" (`build:` `:2218`) |
| 5 | `NutritionTargetsScreen.GOALS` | `src/screens/NutritionTargetsScreen.js:68-75` | nutrition key | "Build muscle (fast)" (`:69`) |

Two hard facts:

- **#2 is user-facing and disagrees with #1 for the same user.**
  `src/lib/weeklyCoach.js:717` renders `` `Week ${…} · ${phaseConfig(goalPhase).label}` ``
  and `:848` reads `phase.label`. A user who chose "Build muscle (bulk)"
  (`src/lib/coachingGoals.js:236` `coachingPhaseKey: 'bulk'`) is aliased to
  `mod_bulk` (`src/lib/weeklyCoach.js:348` `const PHASE_ALIASES = { bulk: 'mod_bulk' };`)
  and shown **"Lean bulk"**. Worse, `mild_bulk` (`:329`) and `mod_bulk` (`:330`)
  carry the **same** label "Lean bulk", so the two distinct phases
  `lean_gain`/`bulk` are indistinguishable in the weekly-coach header.
- **#3, #4 and #5 label the SAME key space with three different strings.**
  #5 is a verbatim duplicate of #3 and can drift silently — nothing pins them
  equal (`grep "PHASE_LABELS" src/` shows `nutritionEngine`'s is module-private,
  `src/lib/nutritionEngine.js:36`, used only at `:1035`).

**Verdict: E — KEEP, DOCUMENT, and route the wording decision.** These are
presentation, not mathematics — nothing computes differently. But they are the
same product truth spoken five ways, and #2 is an outright contradiction. **Do
not autonomously rewrite user-facing phase wording:** Campaign 2 terminology
decisions are binding (Campaign 4 order, CURRENT BASELINE) and the coaching-voice
contract is locked (`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`).

Recommended (needs a ruling before any string moves):
- **Minimum, decision-free:** an equivalence guard test asserting
  `NutritionTargetsScreen.GOALS[].label` matches `nutritionEngine.PHASE_LABELS`
  key-for-key (stops #5 drifting from #3). This is a pure regression guard, no
  copy change.
- **The contradiction (#2 "Lean bulk" for a bulk user, and the duplicated
  `mild_bulk`/`mod_bulk` label):** a genuine coherence defect. Fix is a
  user-facing copy change in the coaching voice → **surface as a founder /
  lead-ruled decision**, not an auditor's edit. Cross-reference to Phase 22
  (cross-feature coherence).

## D-6 `PHASE_ALIASES` mirrored in two modules — see D-7 (CLASS D)

## D-7 `progressScanCheckInEvidence.GOAL_PHASE_ALIASES` — CLASS D (INTENTIONAL SEAM, KEEP)

```
src/lib/weeklyCoach.js:348                    const PHASE_ALIASES = { bulk: 'mod_bulk' };
src/lib/progressScanCheckInEvidence.js:120    const GOAL_PHASE_ALIASES = { bulk: 'mod_bulk' };
```

Looks like a textbook duplicate. **It is not — a pinned source guard forbids the
import:**

```
src/lib/__tests__/progressScanCheckInEvidence.test.js:683-693
  test('imports nothing from the mutable engine/store/database layer (pure layer)', …
    const forbidden = ['database.js', 'progressScanStore', 'weeklyCoach', 'coachApply',
                       'nutritionEngine', 'planEngine'];
```

and `:706-713` pins the reverse direction (the engine must never reference this
module back). The module's own header (`src/lib/progressScanCheckInEvidence.js:5-8`)
records why: the deterministic engine must stay scan-free and byte-identical with
or without scan evidence. `:118-119` documents the mirror explicitly: *"Mirrors
weeklyCoach.js PHASE_ALIASES (source inspected, not re-imported — this module
stays engine-import-free by source guard)."*

**Verdict: D — KEEP. Consolidating it would break a pinned architectural
invariant.** The residual risk is silent drift, and the correct fix is a test,
not a merge.

**Regression test REQUIRED (this is the gap):** no test today pins the two
tables equal — `grep -rn "PHASE_ALIASES" src/` returns only the two definitions
and their uses. Add a source-level equivalence guard (import-free, matching the
module's own convention): read `src/lib/weeklyCoach.js`, extract the
`PHASE_ALIASES` literal, and assert it equals
`progressScanCheckInEvidence`'s `GOAL_PHASE_ALIASES` literal. Extend it to the
sign-of-`goalRatePct` mirror at
`src/lib/progressScanCheckInEvidence.js:127-135` vs
`src/lib/weeklyCoach.js:325-331` — that mirror is documented at `:122-126` and is
equally unpinned, and it is the one that decides whether a week reads as
losing/flat/gaining.

---

# FAMILY 4 — date / week helpers

## D-10 `src/lib/dayKey.js` — CLASS A (canonical, KEEP)

`localDayKey` (`:17-25`), `todayLocalKey` (`:27-29`), `parseLocalDay` (`:37-41`),
`localWeekStartMs` (`:53-59`, Monday-anchored, LOCAL), `localWeekEndMs`
(`:73-77`, DST-correct next-Monday, LS-06).

Live consumers verified on current main: `src/hooks/useProgressData.js:16,258,421`;
`src/hooks/useWeeklyStreak.js:18,59`; `src/hooks/usePartners.js:23,197-198,277,651`;
`src/lib/blockLedgerRunner.js:61,121-122`; `src/lib/checkinDerive.js:11,17,33`;
`src/lib/database.js:6,5952,6109,6117,6216,6285`;
`src/lib/notifications/scheduler.js:36,439`;
`src/lib/notifications/trainingHabitSchedule.js:29,78-79`;
`src/lib/partners/moments.js:38,123`; `src/lib/partners/weekSignalWriter.js:21,61`;
`src/lib/widgets/writer.js:24,58`; `src/lib/food/db.js:17,561,623-627,1661`;
`src/lib/food/diaryDates.js:10`; `src/lib/workoutDate.js:16,26,37-38`;
`src/lib/bodyMetricsHistoryMerge.js:17,25`; `src/lib/database/bodyMetrics.js:1`;
`src/lib/database/activity.js:6`; `src/lib/health.js:504,521,539,969`.
Pinned by `src/screens/__tests__/HomeScreen.weekBoundaryConsistency.guard.test.js`
(X5/X11 — "every 'this week' count goes through the shared Monday-anchored
dayKey.js helpers … no surface computes its own boundary").

## D-11 `weeklyCoach` weekSeed UTC bucket — CLASS C (INTERNAL AND REQUIRED, KEEP)

```
src/lib/weeklyCoach.js:768-775
  const day = (d.getUTCDay() + 6) % 7; d.setUTCHours(0,0,0,0); d.setUTCDate(...); …/(7*86400000)
```
Documented carve-out at `:763-767`: *"the UTC arithmetic here is deliberate and
is NOT a user-facing date. It is only a deterministic bucket for choosing a copy
variant, so it must be stable across timezones, not local. Do not 'fix' it to
local … The user-facing week boundary lives in dayKey.localWeekStartMs."*
Different product truth (copy-variant seed, not a week boundary). **KEEP as-is.**

## D-12 `food/diaryDates` week + weekday helpers — CLASS C (KEEP)

`src/lib/food/diaryDates.js:26-29` `weekDatesMon` and
`src/lib/food/perDayTargets.js:66-75` `weekdayKeyFromIso` both compute
`(dow + 6) % 7`. **Not a second authority:** both are built on the canonical
primitives (`src/lib/food/diaryDates.js:10` imports `localDayKey`,
`parseLocalDay`) and operate in the ISO-string domain, not epoch-ms. Monday-first
and local in both, so they agree with `localWeekStartMs` by construction.
`docs/_FULL-APP-PRODUCT-MAP.md:13941-13944` already classifies these as
"legitimately separate". **KEEP.**

Optional hardening (cheap, no behaviour change): an equivalence test asserting
`parseLocalDay(weekDatesMon(iso)[0]).getTime() === localWeekStartMs(parseLocalDay(iso).getTime())`
across a year of dates including both UK DST transitions. `weekDatesMon` drives
calorie banking (`src/lib/food/diaryDates.js:6-8`), so its boundary is
safety-adjacent and worth pinning.

## D-13 `weekWindowsEndingAt` — CLASS C (KEEP)

`src/lib/weekWindows.js:3-11`, re-exported through `src/lib/database.js:15-17`
(thin passthrough, dependency-cycle avoidance, `:1-2` explains). Consumed at
`src/lib/database.js:2770`. Computes **rolling trailing 7-day windows from an
anchor**, not calendar weeks — a different product truth. Pinned by
`src/lib/__tests__/checkinCoachAudit.guard.test.js:35-55`. **KEEP.**

## D-19 `progressPhotoTimeline` private `localDayKey` — CLASS I (UNCERTAIN, DO NOT DELETE)

```
src/lib/progressPhotoTimeline.js:32-35
  function localDayKey(ms) { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
```
Consumed at `:110`, compared at `:117`, and **persisted into the returned view
model** at `:93-94` (`key: \`checkin-${curDayKey}\``, `dayKey: curDayKey`).

- It **shadows the canonical name** `localDayKey` while producing a **different
  format**: 0-indexed month, unpadded — `2026-7-9`, not `2026-08-09`.
- Same-day *semantics* are equivalent (local calendar day, same `getFullYear/
  getMonth/getDate` basis), so grouping is correct today.
- **Why I, not F:** the value escapes the module as `dayKey` on a `checkin` node.
  I could not prove no consumer compares that field against a canonical
  `YYYY-MM-DD` key, and consumers of this view model are outside this lane's
  read. **Do not delete or "fix the format" without tracing every reader of the
  `dayKey`/`key` fields on the timeline nodes** — silently changing the string
  would change React keys and any persisted selection.
- **Recommended action: rename only** (e.g. `photoDayGroupKey`) so it stops
  shadowing the canonical helper, plus a comment stating it is a private grouping
  token and **not** a `dayKey.js` key. That is safe and decision-free. Anything
  more needs the reader trace.

## D-20 Four UTC `toISOString().slice(0,10)` day computations that persist — CLASS I (UNCERTAIN)

| file:line | what it writes | note |
|---|---|---|
| `src/lib/database.js:835-836` | `mesocycles.end_date` backfill (local migration v21) | historical migration — must stay byte-stable; changing it rewrites history |
| `src/lib/database.js:3711`, `:3715-3716` | `mesocycles.start_date` / `end_date` on `activatePlanWithBlock` | cloud schema requires `end_date NOT NULL` (`:3712-3714`) |
| `src/lib/database.js:6184`, `:6192` | `getFirstWorkoutDateOnOrAfter` — deliberately snapped to **UTC midnight** (`:6179-6181` comment) | documented intent |
| `src/lib/blockLedgerRunner.js:268` | `blockEndDate` provenance on the stored ledger record | provenance string |

These compute a calendar day **independently of `dayKey.js`** and land on the UTC
day, so for a user west of UTC after ~00:00 local they can be one day off the
local-day buckets everything else uses.

**Why I, not F/E:** each writes a **persisted** value (SQLite column or a stored
JSON ledger). Changing them changes stored data semantics and can cross a sync
boundary — squarely the Second Cleanup Law's territory. `src/lib/database.js:836`
is inside a `PRAGMA user_version` migration that has already run on every live
device; it must never change. **DO NOT TOUCH in Campaign 4.** Record as known
debt with the exact consequence stated above; a fix belongs to a dedicated
date-semantics project with a migration story, not a cleanup campaign.

Excluded as legitimately-not-a-day-key (filename/label stamps, no product truth):
`src/lib/dataBackup.js:67`, `src/screens/SettingsDataScreen.js:139`,
`src/lib/progressScanCalibrationExport.js:161`.
Excluded as internal distinct-day counting on a UTC basis that never leaves the
function: `src/lib/nutritionEngine.js:257-263` `ewmaCoverageWeeks` — the set is
used only for `days.size`, and its own header (`:249-256`) explains the intent.
Recommend a one-line comment there noting the UTC basis is deliberate and
irrelevant to the count, so the next auditor does not re-flag it.

---

# FAMILY 5 — calorie floor calculations

## D-6 `nutritionEngine.kcalFloorForSex` — CLASS A (canonical, KEEP — DO NOT TOUCH)

```
src/lib/nutritionEngine.js:660-670
 * THE single statement of the sex-aware calorie floor (Campaign 1 review
 * findings 6/14): 1,500 kcal for men, 1,200 for women (founder floors, never
 * lower), and the HIGHER floor for unknown sex …
export function kcalFloorForSex(sex) { return sex === 'female' ? 1200 : 1500; }
```

**Campaign 1 already consolidated this family. Re-verified on current main —
every floor statement now delegates:**

| site | file:line | form |
|---|---|---|
| engine enforcement | `src/lib/nutritionEngine.js:733`, `:926-928` | direct call |
| coach Apply path | `src/lib/coachApply.js:29`, `:38-40` | `return engineKcalFloorForSex(sex);` |
| coach Apply view copy | `src/lib/coachApplyView.js:26`, `:38`, `:69` | via `coachApply` |
| calorie banking | `src/lib/food/calorieBank.js:29`, `:157` | `return kcalFloorForSex(sex);` |
| banking safe day floor | `src/lib/food/calorieBank.js:166-170` | `max(sexFloor, ffmFloor)` |

**No independent floor statement survives.** FFM floor is likewise single-source:
`FFM_FLOOR_KCAL_PER_KG = 30` (`src/lib/nutritionEngine.js:117`) with one computor
`computeFFMFloor` (`:628-655`), consumed by `src/lib/weeklyCoach.js:15,1165`,
`src/lib/nutritionEngine.js:393,723`, `src/screens/PerDayTargetsScreen.js:11,56`,
`src/screens/DiaryScreen.js:37,251`. Weight resolution for the floor was itself
unified in Campaign 1 (`resolveFfmFloorWeightKg`,
`src/lib/nutritionEngine.js:672-690`, header records the two-site divergence it
fixed).

Pinned by `src/lib/__tests__/campaign1.integrity.test.js:394-398` and `:572-581`
(cross-module equality across `nutritionEngine`, `coachApply`, `calorieBank`).

**Verdict: A — KEEP, DO NOT TOUCH.** ED-safety, CLAUDE.md Section 2.

## D-16 `coachApply.KCAL_FLOOR` / `KCAL_FLOOR_MALE` — CLASS E (KEEP, DOCUMENT — do not remove in Campaign 4)

```
src/lib/coachApply.js:31   export const KCAL_FLOOR = 1200;
src/lib/coachApply.js:32   export const KCAL_FLOOR_MALE = 1500;
```
The only remaining **literal** restatements of the founder floors. Non-test
consumers: **zero** (`grep -rn "KCAL_FLOOR" src/` → `src/lib/coachApply.js:27,31,32`
and `src/lib/__tests__/coachApply.test.js:2,54,62`). `KCAL_FLOOR_MALE` has no
consumer at all, not even a test.

**Verdict: E, not F.** Zero callers alone never proves dead (CORE CLEANUP LAW),
and here three things argue against removing them in this campaign:
1. They are ED-safety-adjacent constants. CLAUDE.md Section 2: *"If a task
   touches any of this: STOP and ask first."*
2. `src/lib/__tests__/coachApply.test.js:54,62` uses `KCAL_FLOOR` as the
   assertion anchor; deleting it forces a test edit inside the ED floor suite,
   which is exactly the kind of change that must not be made incidentally.
3. Their header (`src/lib/coachApply.js:23-28`) documents the audit finding they
   commemorate ("the Apply path floored everyone at 1200, so a male cut
   suggestion could be written below the 1500 male floor").

**Recommended: leave the constants, tighten the comment.** If the founder later
wants them gone, the safe form is: replace the test anchor with
`kcalFloorForSex('female')`, then delete — but that is an ED-safety edit and
needs an explicit go. Cheap guard available today, no behaviour change:
`expect(KCAL_FLOOR).toBe(kcalFloorForSex('female'))` and
`expect(KCAL_FLOOR_MALE).toBe(kcalFloorForSex('male'))`, so the literals can
never drift from the canonical function while they exist.

---

# FAMILY 6 — notification category derivation

## D-14 `categories.categoryForDataType` — CLASS A as the intended single authority

`src/lib/notifications/categories.js:192-217`. One switch, `data.type` →
`CATEGORY`. Consumers: `src/lib/notifications/budget.js:33,129`;
`src/lib/notifications/telemetry.js:21,54`; re-exported
`src/lib/notifications/index.js:74`. No competing switch exists — the delivery
handler (`src/lib/notifications/handler.js:20-68`) branches on raw `data.type`
for **suppression**, which is a different truth (per-type stand-down rules), not
a category derivation. `src/lib/notifications/quietHours.js` and
`notificationRoute.js` derive neither. **The design is single-authority.**

## D-15 …but the enum and the derivation disagree on real emitted types — CLASS I (UNCERTAIN — investigate, do not delete)

Cross-checking every `data.type` actually emitted against
`categoryForDataType`'s switch:

| emitted `data.type` | file:line | in `CATEGORY`? | `categoryForDataType` case? |
|---|---|---|---|
| `meal_log_reminder` | `src/lib/notifications/scheduler.js:325` | **yes** (`categories.js:42`, channels `:121`) | **NO** → returns `null` |
| `active_workout` | `src/lib/notifications/activeWorkout.js:164` | no | no |
| `partner_streak` | `src/lib/notifications/scheduler.js:1507` | no | no |
| `partner_joined` | `src/lib/notifications/scheduler.js:1537` | no | no |

**`meal_log_reminder` is the sharp one.** Two authorities give two answers for
one input: `CATEGORY_CHANNELS` says it is a push category
(`src/lib/notifications/categories.js:121`), `categoryForDataType('meal_log_reminder')`
says it has no category. Consequence, traced:
`src/lib/notifications/telemetry.js:51-55` → `resolveCategory` returns `null` →
`trackNotificationSent` (`:62`) and `trackNotificationTapped` (`:78`) both
`return` early. **Meal-log-reminder sends and taps emit no telemetry at all,**
while the schedule-failure path *does* report (it passes an explicit category,
`src/lib/notifications/scheduler.js:338`). The telemetry catalogue therefore
over-states what is measured for this category — directly relevant to Phase 18.
Budget impact is nil: `MEAL_LOG_REMINDER` is absent from `EVENT_PRIORITY`
(`src/lib/notifications/budget.js:43-57`), so `isEventCategory` is false and it
is exempt either way (`budget.js:130`).

**Why I, not F:** the fix is an **addition** (a missing `case`), and this is a
cleanup campaign that must not build. It is also ED-adjacent — the meal reminder
is food-adjacent and ED-suppressed at both schedule
(`src/lib/notifications/scheduler.js`, `scheduleMealReminders`) and delivery
(`src/lib/notifications/handler.js:56`, pinned by
`src/lib/__tests__/campaign1.integrity.test.js:510`) — so emitting new telemetry
for it touches a privacy/ED surface and needs Campaign 1's privacy decisions
re-checked before anything changes. **Do not add the case autonomously; surface
it.** The three unmapped partner/active-workout types are the same shape and
should be ruled on together: either they are deliberately category-less
(document that in `categories.js`) or the enum is incomplete.

---

# FAMILY 7 — energy conversion

## D-9 `format.toEnergy` / `fromEnergy` — CLASS A (canonical, KEEP)

```
src/lib/format.js:51-52  // 1 kcal = 4.184 kJ (the thermochemical factor EU labelling uses).
                         export const KJ_PER_KCAL = 4.184;
src/lib/format.js:57-61  toEnergy(kcal, unit)
src/lib/format.js:83-91  fromEnergy(value, unit)      // the INVERSE
src/lib/format.js:97-99  formatEnergy(kcal, unit, opts)
```

**No second mathematical authority exists.** `grep -rn "4\.184" src/` returns
`src/lib/format.js:51-52` only — every kcal↔kJ conversion in the app goes through
these helpers. `fromEnergy`'s header (`:68-82`) records the defect that produced
the rule and states it plainly: *"Every input that accepts an energy figure MUST
come through here. Do not hand-roll the division at a call site: one place to be
right, one place to audit."* D89 item 3
(`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md:2127-2129`)
already closed the one surface that had two energy figures in two units.

Verified consumers include `src/components/food/MacroRings.js:8`,
`EntryRow.js:7`, `FoodRow.js:5`, `FoodDetailSheet.js:7`, `MealSection.js:5`,
`CuratedMealSheet.js:7`, `QuickAddSheet.js:15` (input path, uses `fromEnergy` at
`:84`), `SavedMealDetailSheet.js:7`, `CalorieBankSheet.js:21`;
`src/lib/coachApplyView.js:27,90,95,105,114,121`.

**KEEP. No consolidation needed — this family is already correct.**

## D-9b Inline accessibility WORD derivation — minor, CLASS E (KEEP, one-line helper optional)

Six independent restatements of the spoken unit word, and they **do diverge**:

```
src/components/food/MacroRings.js:244        energyUnit === 'kj' ? 'kilojoules' : 'calories'
src/components/food/FoodRow.js:55            … : 'calories'
src/components/food/FoodDetailSheet.js:95    … : 'calories'
src/screens/FoodInsightsScreen.js:95         … : 'calories'
src/screens/MealPlanScreen.js:776            … : 'calories'
src/screens/NutritionTargetsScreen.js:1398   … : 'kilocalories'     ← divergent
```

Screen-reader users hear "calories" on five surfaces and "kilocalories" on one,
for the same unit. Not a mathematical authority — the number is already correct
everywhere — so it is **not** a Phase 14 duplicate in the strict sense, and the
order says presentation helpers are allowed. Recorded here because it is one
input with two outputs and the fix is trivial: export
`energyUnitWord(unit)` from `src/lib/format.js` beside `energyUnitLabel`
(`:64-66`) and point all six at it. **Copy change to a11y strings → agree the
single word with the lead before landing** (British-English + voice rules apply).

---

# FAMILY 8 — cross-lane

## D-17 `planEngine.phaseShort` — CLASS E (KEEP, DOCUMENT; contains a live defect, flagged not fixed)

`src/lib/planEngine.js:2952-2964`. A plan-name label map that accepts **two
vocabularies at once** (`:2957` comment: *"coachingPhaseKey variants, planEngine
receives either form"*).

Its only real input is `nutritionPhase = phaseToNutritionKey(phase)`
(`src/lib/planAutoGen.js:103`), whose full range is
`{lean_gain, build, mild_cut, recomp, maintain}`
(`src/lib/coachingGoals.js:224,235,246,257,266,275,286`). Against that range:

- **`build` is MISSING from `phaseShort`.** `:2953-2963` has `cut, bulk,
  lean_gain, recomp, maintain, mild_cut, mild_bulk, mod_bulk, maint` — no
  `build`. So `phaseShort` is `null` (`:2964` `?? null`) and the plan name drops
  its phase segment entirely (`:2965-2967`) for every `bulk` and `strength_size`
  user — the exact "three rows all called the same thing" problem the block
  comment at `:2949-2951` says the map exists to prevent.
- The `cut` / `bulk` rows are keyed on the **user-facing phase `value`**
  vocabulary, which never reaches this function through `planAutoGen`. Dead rows
  unless another caller passes raw phase values.
- `NUT_MULT` (`src/lib/planEngine.js:82-89`) is correctly nutritionKey-keyed, so
  `src/lib/coachingGoals.js:220`'s claim — *"`coachingPhaseKey` maps to planEngine
  NUT_MULT and weeklyCoach phaseConfig"* — is **half wrong**: NUT_MULT is keyed
  on `nutritionKey`. Stale comment, Phase 15 candidate.
- `NUT_MULT.aggressive_cut` (`:88`) is unreachable from `phaseToNutritionKey`;
  it IS reachable from the direct goal picker
  (`src/screens/NutritionTargetsScreen.js:73`, `nutritionEngine.js:33`), so it is
  live for that path — **not dead**, do not remove.

**Verdict: E — KEEP, DOCUMENT.** The missing `build` row is a real product defect
but fixing it is an **addition** (a new label string appears in plan names), not
a duplicate-calculation cleanup. Out of Phase 14's remit and out of "do not build
anything new". Record as debt; recommend the lead rule on whether the one-line
`build:` addition lands in Campaign 4 or later. Fix the lying comment at
`src/lib/coachingGoals.js:220` under Phase 15 regardless — it costs nothing and
it is what would mislead the next auditor.

## D-18 `cardioHistoryView` UTC day-key default — CLASS G (defer to the cardio lane)

```
src/lib/cardio/cardioHistoryView.js:17-19
  const toDayKey = typeof dayKey === 'function' ? dayKey : (ms) => new Date(ms).toISOString().slice(0, 10);
```
A dangerous default of the same shape as D-2: a UTC day-key that disagrees with
`dayKey.localDayKey` for any user not at UTC+0. The one live caller injects the
correct function — `src/screens/CardioHistoryScreen.js:148`
`buildCardioWeekWindows(TREND_WEEKS, Date.now(), activityDayKey)` — so the
default runs only in `src/lib/cardio/__tests__/cardioHistoryView.test.js`.

**Classified G, action deferred:** cardio logging is under PHASE 2 product-boundary
closure and this module is scheduled for that lane's removal analysis. Removing
the default here in the duplicates lane would collide with the cardio agent's
files. **Recorded, not actioned. Cross-reference:
`docs/coherence-cleanup-2026-08-10/AUDIT-CARDIO.md`.** If the cardio lane retains
any part of this module as legacy-load-bearing, the UTC default must be deleted
with it (make `dayKey` required) under the same equivalence-test rule as D-2.

---

# WHAT I CHECKED AND FOUND **NOT** DUPLICATED

Recorded so the next audit does not re-open them:

- **e1RM in SQL** — fully removed. `src/lib/database.js:6196-6210` is a comment
  recording the removal; no `wk_e1rm` expression remains.
- **Strength standards** — one implementation, `strengthStandards.getStrengthLevel`
  (`src/lib/strengthStandards.js:56`). `docs/BACKLOG.md`'s recorded drift is
  STALE (already noted at `docs/_FULL-APP-PRODUCT-MAP.md:13946-13957`).
- **Tonnage** — one implementation, `src/lib/algorithms.js:114-124`.
- **kcal↔kJ** — one constant, one pair of functions (D-9).
- **FFM floor / energy availability** — one computor, one threshold constant
  (D-6).
- **`checkinDerive.getCurrentWeekStart`** (`src/lib/checkinDerive.js:17`) — a
  thin wrapper over `localWeekStartMs`, not a second implementation.
- **`database.weekWindowsEndingAt`** (`src/lib/database.js:15-17`) — a
  cycle-avoiding re-export, not a second implementation.

---

# ACTION REGISTER

| ID | Class | Action | Blocking condition |
|---|---|---|---|
| D-2 | F | Delete `epleyE1rm`; default `e1rmFn` to `calculate1RM` | T-2.1 equivalence + T-2.2 regression + T-2.3 tombstone must land in the same commit; `bestLift.test.js` expectations recomputed, never weakened |
| D-4 | F | One shared `muscleDisplayName`; delete 2 private bodies + 1 inline | T-4.1 output-equality fixture captured **before** deletion; T-4.2 key-parity |
| D-18 | G | Delete the UTC day-key default | Cardio lane owns the file — do not touch from this lane |
| D-7 | D | Add source-level equivalence guard for `PHASE_ALIASES` **and** the goalRatePct-sign mirror | Guard must stay import-free (source-read only) or it breaks `progressScanCheckInEvidence.test.js:683-693` |
| D-5 | E | Guard `NutritionTargetsScreen.GOALS` ≡ `nutritionEngine.PHASE_LABELS`; **surface** the "Lean bulk" contradiction | Copy change needs a ruling (Campaign 2 terminology + locked voice) |
| D-16 | E | Add `KCAL_FLOOR ≡ kcalFloorForSex('female')` drift guard; keep constants | ED-safety — no removal without explicit founder go |
| D-9b | E | Optional `energyUnitWord()` helper; resolve "calories" vs "kilocalories" | a11y copy change — agree the word first |
| D-12 | C | Optional `weekDatesMon` ≡ `localWeekStartMs` DST equivalence test | none (pure addition, safety-adjacent value) |
| D-17 | E | Fix the stale comment `coachingGoals.js:220` (Phase 15). Missing `build:` row = flagged debt | the `build:` fix is an addition — needs a ruling |
| D-19 | I | Rename the shadowing helper only | anything beyond a rename needs a full trace of `dayKey`/`key` readers |
| D-15 | I | Surface the `meal_log_reminder` / partner / active_workout category gap | ED + privacy adjacent; adding telemetry is a build, not a cleanup |
| D-20 | I | Record as debt. **Do not touch.** | persisted values + a shipped local migration |

**Nothing in this audit was executed.** No file outside this document was
modified, no commit, no push, no stash.
