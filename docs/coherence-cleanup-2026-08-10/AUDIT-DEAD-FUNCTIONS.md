# AUDIT — DEAD ENGINE FUNCTIONS AND DEAD COPY GENERATORS

**Campaign 4, lane `dead-engine-copy`. Order sections: PHASE 4, PHASE 5, PHASE 17.**
**Baseline:** branch `claude/campaign4-coherence` = main `92b9644e` (+ `0f4d868e`, docs only).
**Status:** READ-ONLY AUDIT. Nothing deleted, nothing edited. Every deletion below is a
PROPOSAL with proof attached.

**Governing law (order, CORE CLEANUP LAW):** zero callers alone NEVER proves dead. Every
verdict below carries: non-test callsites, test callsites and the LAW each test protects,
dynamic/script/CI access, docs/decision authority, intentional-seam evidence, and the live
replacement named at file:line.

**Governing law (order, PHASE 4 close):** *"If a test protects historical product law that
the live replacement must still honour: move the invariant onto the LIVE implementation
before deleting the old test. This is extremely important. Do not reduce behavioural
protection merely to improve dead-code counts."* Section 6 below is the enforcement of that
sentence and is the most important part of this document.

---

## 0. VERDICT SUMMARY

| Class | Count | Symbols |
|---|---|---|
| **C** INTERNAL AND REQUIRED — KEEP | 1 | `getMesoSchedule` |
| **D** INTENTIONAL ROLLBACK/COMPATIBILITY SEAM — KEEP | 1 | `getCurrentMesoWeek` |
| **F** CONFIRMED DEAD — REMOVE | 15 | 7 engine + 6 copy + 2 transitive |
| **G** PRODUCT-BOUNDARY REMNANT — REMOVE WHERE NON-DESTRUCTIVE | 1 | `getPosingConditioningMessage` |
| **I** UNCERTAIN — DO NOT DELETE | 2 | `getProgressionSuggestion`, `checkJargonScienceOn` |
| **Total classified in lane** | **20** | |

**Two hard STOPs and one live defect are the headline of this audit:**

1. `getProgressionSuggestion` (algorithms.js:295) is dead, but the CALC-5 test pinned on it
   protects a law the LIVE replacement **provably fails**. Deleting it as "dead code" would
   silently unpin a live defect. **Class I. STOP.**
2. `getCurrentMesoWeek` (mesocycle.js:74) has zero production callers and would be deleted by
   any naive sweep — but the repo **explicitly documents it as deliberately retained**, and it
   is the DST oracle that validates the LIVE `getBlockStatus`. **Class D. KEEP.**
3. **LIVE DEFECT (new, found by this audit):** `computeSetTargets` prescribes a **0.25 kg load
   increase on a bodyweight exercise**. Evidence and reproduction in §6.1.

**Zero deletions in this lane are unconditionally safe.** All 16 F/G deletions are gated on
ONE mandatory invariant migration (§6.2) and the two engine gates in §6.1/§6.3.

---

## 1. METHOD AND ITS KNOWN LIMITS

### 1.1 Fresh sweep

Enumerated every `export function` / `export const … = (` in `src/lib/**` (excluding
`__tests__`): **1,668 exports**. For each, grepped the word across `src/`, `scripts/`,
`App.js`, `index.js`, excluding `__tests__` and excluding the definition line itself.

- Pass 1 (raw): **107** exports with zero non-test callers.
- Pass 2 (discounting lines that are pure comments): **127** exports with zero non-test callers.

The 20-export delta between passes matters: a stale comment mentioning a function name makes a
dead export look live to a naive grep. `getCurrentMesoWeek` (mesocycle.js:74) hid behind exactly
that — its only non-test "hits" were the comment at `src/lib/database.js:4023` and five comments
inside `mesocycle.js` itself. **Any sweep that does not strip comments under-reports dead code
and, worse, gives false confidence.**

### 1.2 Dynamic-access check (required by the order)

```
grep -rnE "\[(`|')get[A-Za-z]|\['\" ]*\+ *[A-Za-z]|require\([^')]*\)\[" src   → 0 hits
```

There is **no computed/bracket/string-built member access anywhere in `src/`**. Re-export
barrels were enumerated (15 total: `src/lib/sync/index.js`, `src/lib/payments/index.js`,
`src/lib/notifications/index.js`, `src/lib/telemetry/index.js`, `src/lib/engineTelemetry.js:11`,
`src/components/ProgressScanCompare.js:24`, `src/store/useAppStore.js:189`) — **none re-exports
any candidate in this lane**. `algorithms.js`, `mesocycle.js` and `whyThisTemplates.js` are all
imported by direct named import only.

Therefore, for this lane specifically, "no static caller" is not defeated by dynamic access.
It is still defeated by test oracles and documented seams — which is what §2.9 and §6 are about.

### 1.3 Scripts / CI check

```
grep -rn "<all 15 candidate names>" scripts .github   → 0 hits
```

No script, no workflow, no `package.json` entry references any candidate.

### 1.4 Limits of this audit (stated, not hidden)

- Coverage is `src/lib/**` exports. Dead *screens*, *components*, *hooks*, *routes* and
  *modules* are other lanes (`AUDIT-ROUTES.md` and the Phase 6 module lane).
- Transitive deadness is computed only within the clusters I opened by hand
  (`algorithms.js`, `mesocycle.js`, `whyThisTemplates.js`). The full 127-export list (§7) is
  handed on unclassified except where it falls in this lane.
- Module-private (non-exported) helpers are not swept; I traced them only inside the clusters
  above (`buildSubstituteReason`, `STRETCH_SCORE`, `getSetEffectivenessWeight`).

---

## 2. PHASE 4 — DEAD ENGINE FUNCTIONS

The order names 8 historical engine candidates and instructs: *"DO NOT assume that list remains
accurate. Re-run current callsite analysis."* Re-run below. All 8 are confirmed still
zero-caller on current main; the classification differs sharply between them.

### 2.1 `getProgressionSuggestion` — **CLASS I — DO NOT DELETE**

| Field | Evidence |
|---|---|
| Definition | `src/lib/algorithms.js:295-365` |
| Non-test callers | **0** (not called even inside `algorithms.js`) |
| Test callers | `algorithms.test.js:347-363`, `algorithms.test.js:554,573-579`, `fitnessLogicFixes.test.js:124-151` |
| Dynamic / script / CI | none (§1.2, §1.3) |
| Live replacement | `computeSetTargets`, `src/lib/algorithms.js:368-520`, live at `src/screens/ActiveWorkoutScreen.js:1212` |
| Intentional seam? | No seam claim. `algorithms.js:286` calls it *"The live in-set hint"* — **that comment is false**, see §5.1 |
| Docs authority | `docs/_FULL-APP-PRODUCT-MAP.md:13678` records 0 callers and names `computeSetTargets` as the live path |
| Data / sync / migration dependency | none — pure function |

**Why I, not F.** It is certainly dead. It is not certainly *removable*. Three laws are pinned
on it; one of them protects behaviour the live replacement **does not honour**. Full law-by-law
migration analysis in §6.1. Deleting this function today would delete the only test in the repo
that pins the bodyweight-progression rule, while the live engine violates it.

### 2.2 `getAutoRegSuggestion` — **CLASS F — REMOVE**

| Field | Evidence |
|---|---|
| Definition | `src/lib/algorithms.js:658-757` |
| Non-test callers | **0** |
| Test callers | **0** — no test file in the repo references it |
| Dynamic / script / CI | none |
| Live replacement | `computeAdaptiveDecision` `algorithms.js:887`, `runAdaptiveEngine` `algorithms.js:1000`, live at `src/screens/WorkoutSummaryScreen.js:527`; weekly grain handled by `weeklyCoach.runWeeklyCoach` |
| Intentional seam? | No. `docs/_FULL-APP-PRODUCT-MAP.md:4470` — *"LEGACY-UNREACHABLE — no consumer"*; `:13679` — *"Not called even inside algorithms.js. The old autoregulation path."* |
| Data / sync / migration | none — pure function |

**Deletion plan.** Delete `algorithms.js:653-757` (the `// Algorithm 6: Auto-Regulation`
comment block through the function). **No test file dies.** No snapshot dies. Nothing to move:
zero tests means zero protected law.

### 2.3 `getExerciseSubstitutes` — **CLASS F — REMOVE**

| Field | Evidence |
|---|---|
| Definition | `src/lib/algorithms.js:814-858` |
| Non-test callers | **0** |
| Test callers | **0** |
| Dynamic / script / CI | none |
| Live replacement | `swapEngine.rankSwaps` `src/lib/swapEngine.js:195`, live at `ExerciseDetailScreen.js:383`, `ActiveWorkoutScreen.js:746`, `RoutineDetailScreen.js:292` |
| Intentional seam? | No. `docs/_FULL-APP-PRODUCT-MAP.md:13680` — *"Superseded by swapEngine.rankSwaps"* |
| Data / sync / migration | none |

**Dies with it (module-private, sole caller is this function):**
- `buildSubstituteReason` — `algorithms.js:860`, sole callsite `algorithms.js:856`
- `STRETCH_SCORE` — `algorithms.js:811`, sole callsites `algorithms.js:845,846`

**Product-boundary note.** Order PHASE 23 requires pinning *"EXERCISE CHANGE — no automatic
substitution"*. This function only *ranks* candidates; it never applies one. Removing it does
not touch that boundary, and the live `rankSwaps` path remains user-initiated. No new automatic
behaviour is introduced or removed.

### 2.4 `getVolumeConfidence` — **CLASS F — REMOVE**

| Field | Evidence |
|---|---|
| Definition | `src/lib/algorithms.js:1495-1499` |
| Non-test callers | **0** |
| Test callers | **0** |
| Dynamic / script / CI | none |
| Live replacement | `src/lib/effectiveLandmarks.js` — the `isAdapted` / source resolution at `:18,:52,:126` is the live "how much do we trust this landmark" authority; `src/lib/learnedRange.js:43,133` carries the numeric confidence gate (`MIN_ENTRY_CONFIDENCE`) |
| Intentional seam? | No. `docs/_FULL-APP-PRODUCT-MAP.md:13682` — *"No internal caller either."* |
| Data / sync / migration | none |

Its three labels (`Estimated` / `Learning` / `Personalised`) have no surface. The live
equivalent concept ships through `effectiveLandmarks`, which resolves RESEARCH vs ADAPTED
rather than exposing a three-step confidence label.

### 2.5 `evaluateDeloadTriggers` — **CLASS F — REMOVE (aggregator only)**

| Field | Evidence |
|---|---|
| Definition | `src/lib/algorithms.js:1571-1592` |
| Non-test callers | **0** |
| Test callers | **0** |
| Dynamic / script / CI | none |
| Live replacement | `shouldDeload` `algorithms.js:759`, live at `HomeScreen.js:1113`, `CoachReviewScreen.js:418`, `useProgressData.js:327`; plus `weeklyCoach` |
| Intentional seam? | No. `docs/_FULL-APP-PRODUCT-MAP.md:4471,:13683` — *"LEGACY-UNREACHABLE"*, *"No internal caller either."* |
| Data dependency | **YES — READ CAREFULLY BELOW** |

**DATA CONTRACT — do not over-delete.** This function reads
`events.filter(e => e.decision === 'deload_trigger')` (`algorithms.js:1572`). The
`'deload_trigger'` decision value is **LIVE**:

- **written** by `computeAdaptiveDecision` — `src/lib/algorithms.js:923`
- **rendered** by `src/components/EngineLog.js:128,133` (icon + error colour)
- **explicitly reasoned about** by `src/lib/sessionAdjustments.js:77`

Delete the *aggregator function only*. **Never** touch the `'deload_trigger'` string, its
producer, the `adaptation_events` rows, or `EngineLog`'s rendering of them.

**Product note (disclosed, not decided):** the specific rule this function encoded — *"2+
muscles exceeded their weekly limit ⇒ recommend a deload"* — has **no live implementation**.
The live deload decision comes from `shouldDeload` (4-week trend) and `weeklyCoach`, which use
different signals. Because the rule was never wired to any surface, deleting it removes no
shipped behaviour. Flagging it so the removal is not later mistaken for a capability loss.

### 2.6 `calculateEffectiveSets` — **CLASS F — REMOVE**

| Field | Evidence |
|---|---|
| Definition | `src/lib/algorithms.js:1410-1445` |
| Non-test callers | **0** external. Only internal reference is its own use of `getSetEffectivenessWeight` at `:1429` |
| Test callers | `algorithms.test.js:185-250` (7 tests), `engine-invariants.test.js:420-432` (1 fuzz test) |
| Dynamic / script / CI | none |
| Live replacement | **none — and none is needed.** The "effective sets" concept has no surface. Live volume is `calculateWeeklyVolume` + `getVolumeStatus` (`algorithms.js:237`), which count WORKING sets, not RIR-weighted sets |
| Intentional seam? | No. `docs/_FULL-APP-PRODUCT-MAP.md:13685` — *"The whole 'effective sets' concept is computed but never displayed or consumed."*; `:14108` — *"Code only, and unreachable."* |
| Data / sync / migration | none. Verified: no `effective_sets` column, no `effectiveSets` reader anywhere in `src/` outside `algorithms.js:1409-1436` |

**Dies with it:** `getSetEffectivenessWeight` — `algorithms.js:1398-1407`. Its only non-test
callsite is `algorithms.js:1429` inside `calculateEffectiveSets`. Verified: the RIR→credit
curve is **not duplicated** in `weeklyCoach.js` or `sessionAdjustments.js`.

**Tests that die with it (law analysis — this is the Phase 17 question):**

| Test | Law it protects | Does the law survive deletion? |
|---|---|---|
| `algorithms.test.js:194-249` "RIR/RPE precedence fix" | An operator-precedence bug (`rir ?? rpe != null ? … : …`) once corrupted effective volume. The law is *"this function's RIR/RPE coalescing is correct"* | **The law is about the deleted function's own arithmetic.** No live code performs this coalescing. Law dies correctly with its subject. **B — HISTORICAL IMPLEMENTATION ONLY** (order PHASE 17 taxonomy) |
| `algorithms.test.js:250+` `getSetEffectivenessWeight` known-RIR values | The shape of the effectiveness curve | Same — sole consumer is the deleted function. **B** |
| `engine-invariants.test.js:420-432` "effectiveSets always finite" | Fuzz: no NaN/Infinity escapes | The *general* no-bad-numbers invariant survives on live siblings in the same suite: `calculateWeeklyVolume` fuzz at `engine-invariants.test.js:405-418`. **B — delete this block only** |

**No invariant needs moving for this one.** All three tests protect the dead implementation's
own maths, and the adjacent live fuzz coverage (`calculateWeeklyVolume`) is untouched.

### 2.7 `getVolumeTargetsForWeek` — **CLASS F — REMOVE**

| Field | Evidence |
|---|---|
| Definition | `src/lib/mesocycle.js:183-198` |
| Non-test callers | **0** |
| Test callers | `mesocycle.test.js:274-277` (CALC-8) |
| Dynamic / script / CI | none |
| Live replacement | none needed — the weekly set-progression it computes is **not applied anywhere**. Verified against source: `docs/exercise-planning-2026-07-09/plan-B-weak-point-sets.md:199` — *"confirmed NOT wired into `routine_exercises` … the mesocycle/coach-apply progression cannot stack more sets onto an existing exercise row after generation"* |
| Intentional seam? | No documented seam (contrast `getCurrentMesoWeek`, §2.9) |
| Data / sync / migration | none |

**Transitively dies with it:** `getWeekSetsMultiplier` — `src/lib/mesocycle.js:147-163`. Its
**only** non-test callsite in the entire repo is `mesocycle.js:184`, inside this function.
Confirmed by full grep: `getWeekSetsMultiplier` appears at `:147` (definition) and `:184` only.

**Law to move — see §6.3.** The CALC-8 block (`mesocycle.test.js:253-277`) protects a real law
(*"out-of-range / NaN week numbers must be handled, not silently swallowed"*) across four
subjects, three of which are dead.

### 2.8 `buildWeeklyProgression` — **CLASS F — REMOVE**

| Field | Evidence |
|---|---|
| Definition | `src/lib/mesocycle.js:200-233` |
| Non-test callers | **0** |
| Test callers | `mesocycle.test.js:81-100` (2 tests) |
| Dynamic / script / CI | none |
| Live replacement | none needed — same finding as §2.7 |
| Intentional seam? | No |
| Data / sync / migration | none |

**Tests that die with it:**

| Test | Law | Survives? |
|---|---|---|
| `mesocycle.test.js:82-86` "returns one entry per scheduled week" | Shape law: output length == `getMesoSchedule(experience).length` | Shape of a deleted function. **B — dies correctly** |
| `mesocycle.test.js:88-99` "every step has a non-negative sets value" | No negative set counts | The generic *"engine output is never negative/NaN"* law lives on in `engine-invariants.test.js`. This instance is subject-specific. **B — dies correctly** |

### 2.9 `getCurrentMesoWeek` — **CLASS D — INTENTIONAL SEAM — KEEP**

**This is the most important negative finding in the lane.** It appears in neither the order's
historical candidate list nor the raw sweep — it surfaced only after comment-stripping (§1.1).
A future naive dead-code pass **will** propose deleting it. It must not be deleted.

| Field | Evidence |
|---|---|
| Definition | `src/lib/mesocycle.js:74-100` |
| Non-test callers | **0 code callers.** All apparent hits are comments: `src/lib/database.js:4023`, `mesocycle.js:45,102,106,150,495` |
| Test callers | `mesocycle.test.js`, `mesocycle.f10.dst.test.js`, `blockWeekResolver.test.js`, `blockLifecycle.stage1.test.js` |
| Dynamic / script / CI | none |

**Seam evidence 1 — the repo already ruled on it, in writing.**
`src/lib/__tests__/blockLifecycle.stage1.test.js:55-63`:

> *"getCurrentMesoWeek keeps its generic wrapping contract, plus a `{ wrap: false }` clamp at
> the EXPERIENCE SCHEDULE's end (5 weeks for intermediate). This is NOT a block week:
> block-bound code resolves through getCurrentBlockWeekIndex + getBlockStatus … **never through
> this narrative layer, which has no production callers.**"*

The zero-caller state is **known, deliberate and contract-bound**, with pinned behaviour on
both the wrapping and non-wrapping paths (`:62-63`).

**Seam evidence 2 — it is a live oracle validating live code.**
`src/lib/__tests__/mesocycle.f10.dst.test.js:2-8` (F10 / EN-11):

> *"getBlockStatus and getCurrentMesoWeek must agree across DST."*

The test spawns a child process pinned to `Europe/London`, steps 6-hourly across the UK
fall-back, and asserts **zero disagreements** between the LIVE `getBlockStatus` and
`getCurrentMesoWeek` (`:42-44`). Deleting `getCurrentMesoWeek` **destroys the cross-check that
proves the live block-week maths is DST-safe**. That is a direct violation of the order's
"do not reduce behavioural protection" rule, dressed up as a dead-code win.

**Seam evidence 3 — a named permanent guard depends on the family.**
`src/lib/__tests__/blockWeekResolver.test.js:16-19` describes a source-level PERMANENT GUARD
asserting *"no other screen/hook re-implements block/week date maths independently of this
shared resolver family (getCurrentMesoWeek / getBlockStatus / getCurrentBlockWeekIndex, all in
mesocycle.js)"*, repeated at `:177`.

**Verdict: D. KEEP, and document.** Recommended action is documentation only: add a header note
on `mesocycle.js:74` recording *why* a zero-caller export is retained (DST oracle for
`getBlockStatus`; member of the single-resolver guard family), so the next audit does not have
to rediscover this. **Also:** `mesocycle.js:495` says the live `getBlockStatus` guard *"mirrors
getCurrentMesoWeek's CALC-8 guard"* — that reference stays valid precisely because we keep it.

### 2.10 `isRecoveryWeek` — **CLASS F — REMOVE** *(new sweep find)*

| Field | Evidence |
|---|---|
| Definition | `src/lib/mesocycle.js:165-181` |
| Non-test callers | **0** — full grep returns only the definition line |
| Test callers | `mesocycle.test.js:52-59` |
| Live replacement | Recovery-week identity is live via `predictDeloadWeek` `mesocycle.js:338-393` (which finds `schedule.find(s => s.phase === 'recovery')` itself at `:341`) and `getBlockStatus` `mesocycle.js:493` |
| Intentional seam? | No documented seam — contrast §2.9, where the seam IS documented |
| Data / sync / migration | none |

Test law (`mesocycle.test.js:53-59`: *"returns true for the deload week index"*) is a
tautological restatement of `getMesoSchedule`'s `phase === 'recovery'` field, which live code at
`mesocycle.js:341` reads directly. **B — dies correctly.**

### 2.11 `getMesoSchedule` — **CLASS C — INTERNAL AND REQUIRED — KEEP**

`src/lib/mesocycle.js:134-145`. Callers: `:75` (retained `getCurrentMesoWeek`), `:148`
(`getWeekSetsMultiplier`, proposed for deletion), `:166` (`isRecoveryWeek`, proposed for
deletion), `:201` (`buildWeeklyProgression`, proposed for deletion), and **`:339` inside
`predictDeloadWeek`, which is LIVE**: `src/screens/MesocycleBuilderScreen.js:27` imports it,
`:131` calls it, `:370-371` renders it, and the screen is registered at
`src/navigation/RootNavigator.js:487` (`MesocycleBuilder`).

Even after the four proposed mesocycle deletions, `getMesoSchedule` retains two callers
(`:75`, `:339`). **KEEP.**

### 2.12 Mesocycle module — before/after map

```
mesocycle.js — LIVE (keep, has real importers)
  localDaysElapsed        :56   → blockLedgerGather.js:29, blockMetrics.js:57
  getCurrentBlockWeekIndex:119  → database.js:13
  getMesoSchedule         :134  → C, internal, required by predictDeloadWeek
  evaluateAutoReg         :235  → MesocycleBuilderScreen.js:27
  predictDeloadWeek       :338  → MesocycleBuilderScreen.js:27
  applyTimeCrunch         :395  → ActiveWorkoutScreen.js:70
  getBlockStatus          :493  → blockAdvisor, blockLedgerRunner, planSwitch,
                                   database, weekSignalWriter, MesocycleBuilderScreen

mesocycle.js — RETAINED SEAM (zero callers, deliberate)
  getCurrentMesoWeek      :74   → D. DST oracle + single-resolver guard family

mesocycle.js — PROPOSED DELETE (F)
  getWeekSetsMultiplier   :147  → sole caller is :184, itself deleted
  isRecoveryWeek          :165  → zero callers
  getVolumeTargetsForWeek :183  → zero callers
  buildWeeklyProgression  :200  → zero callers
```

---

## 3. PHASE 5 — DEAD COPY GENERATORS

All seven historical candidates re-verified on current main. **All seven have zero non-test
callers.** `src/lib/whyThisTemplates.js` itself stays — it holds live exports
(`getExerciseWhyThis:148`, `getSplitRationale:264`, `getSetupReceiptLine:306`,
`getTimeCrunchMessage:356`, `getStarterSessionMessage:380`, `SESSION_REASON_CODES:444`,
`getSessionAdjustmentMessage:490`, `ED_PATTERN_LOCKOUT_COPY:536`, `checkJargon:606`, and the
ED-safety copy constants). **Only the seven functions are candidates, never the file.**

Shared evidence for all seven:
- **Dynamic access:** none anywhere in `src/` (§1.2). No help/FAQ/documentation surface builds a
  generator name at runtime.
- **Scripts / CI:** none (§1.3).
- **Importers of `whyThisTemplates`:** `algorithms.js:8` (`getSessionAdjustmentMessage` +
  codes), `coachResponse.js:30`, `coachRegister.js:40`, `progressScanCoachResolver.js:10` (all
  `checkJargon` only), `CoachOutputScreen.js:125-130` (ED copy + `getEdSupportLink` only),
  `ProSetupCompleteScreen.js:19`, `ActiveWorkoutScreen.js:71`, `RoutineDetailScreen.js:23`.
  **None imports any of the seven.**
- **Sole test file:** `src/lib/__tests__/whyThisTemplates.snapshot.test.js`.
- **Docs authority:** `docs/_FULL-APP-PRODUCT-MAP.md:8009` lists all seven as
  *"No importer. Seven authored explanation templates with no surface. **DARK.**"*

| # | Symbol | Line | Class | Live replacement / why safe |
|---|---|---|---|---|
| 1 | `getVolumeStatusMessage` | `:165-177` | **F** | `src/lib/volumeInsightCopy.js` — `getVolumeInsight:19` and `getVolumeWhy:37` are the live status→guidance layer on the Workout Summary rows, with a directional safety contract stated in its header (`volumeInsightCopy.js:8-11`) |
| 2 | `getProgressionMessage` | `:188-201` | **F** | Live progression copy is the per-set target chip built in `ActiveWorkoutScreen.js:2762-2790` from `computeSetTargets`' `reason`. `docs/comprehension-audit-2026-08-10/PHASE1-CLASSIFICATION.md:33` already records this generator as dark and rules the principle's name optional |
| 3 | `getAutoRegMessage` | `:211-224` | **F** | Live autoreg copy is `weeklyCoach`'s WHY_LIBRARY (pinned by `weeklyCoach.voice.snapshot.test.js`) and `getSessionAdjustmentMessage:490`. `DECISIONS-2026-07-09.md:23` records the deliberate re-anchor away from this generator's "half the sets" wording |
| 4 | `getWeekPhaseDescription` | `:234-248` | **F** | Live block-phase copy is `src/lib/blockExplain.js:133` (`"N sets in week 1, building to N by week N, then a recovery week"`) |
| 5 | `getDeloadPredictionMessage` | `:331-345` | **F** | **Live inline duplicate — see §5.2.** `MesocycleBuilderScreen.js:370-371` renders `predictDeloadWeek`'s output with its own inline string |
| 6 | `getTravelModeMessage` | `:397-403` | **F** | **Travel mode is LIVE — see §5.3.** `BuildWorkoutScreen.js:410` carries its own inline explanation |
| 7 | `getPosingConditioningMessage` | `:416-428` | **G** | Product-boundary remnant: contest-prep / Peak Week. No live posing surface exists (`grep -i posing src` → 0 product hits). Handed to this lane by `AUDIT-CARDIO.md:202` (E7) with the correct ruling that it is **not** cardio-logging and must not be deleted under the cardio boundary |

**Peak Week / G-class care (order PHASE 9).** `getPosingConditioningMessage` is a **pure copy
function**: no table, no column, no migration, no sync registry entry, no historical user data.
The order's Peak Week caution — *"historical schema/sync residue has explicit migration
dependencies … Do NOT casually delete it"* — is about **schema and sync**, not about an
unreferenced string builder. Removing it destroys no user data and strands no migration.
Classifying **G** (product-boundary remnant, remove where non-destructive) rather than
LEGACY-LOAD-BEARING is correct **because there is nothing load-bearing to bear**. If the Peak
Week lane disagrees, deferring costs nothing — it is 13 lines.

**Order compliance check (PHASE 5).** *"Do not leave large snapshot suites giving a false
impression that deleted user-facing copy is product-critical."* — satisfied: the snapshot suite
is trimmed to live subjects only in §6.2. *"Ensure no help/documentation calls them
dynamically."* — verified, zero dynamic access. *"Preserve any jargon/safety/voice invariant on
LIVE copy generators"* — this is §6.2, and it is **mandatory**, not optional.

---

## 4. PHASE 17 — TEST-SUITE TRUTHFULNESS

Applying the order's own taxonomy to every test block that dies with a proposed deletion.

| Test block | Subject | PHASE 17 class | Disposition |
|---|---|---|---|
| `algorithms.test.js:347-363` (A2-043 increments) | `getProgressionSuggestion` | **A — LAW STILL MATTERS** | Law already held on the shared authority `defaultIncrement` (`algorithms.test.js:325-345`) **and** on live `computeSetTargets` (`:365-382`). See §6.1 L1/L2 |
| `algorithms.test.js:573-579` (CALC-5 bodyweight) | `getProgressionSuggestion` | **A — LAW STILL MATTERS, AND IS CURRENTLY VIOLATED** | **BLOCKER.** §6.1 L5 |
| `fitnessLogicFixes.test.js:125-151` (P1 RIR contract) | both | **A (partly already moved)** | §6.1 L3/L4/L6 |
| `algorithms.test.js:194-249` + `:250+` | `calculateEffectiveSets`, `getSetEffectivenessWeight` | **B — HISTORICAL IMPLEMENTATION ONLY** | Delete with implementation (§2.6) |
| `engine-invariants.test.js:420-432` | `calculateEffectiveSets` | **B** | Delete block; sibling live fuzz at `:405-418` unaffected |
| `mesocycle.test.js:52-59` | `isRecoveryWeek` | **B** | Delete |
| `mesocycle.test.js:81-100` | `buildWeeklyProgression` | **B** | Delete |
| `mesocycle.test.js:253-277` (CALC-8) | 3 dead + 1 retained | **A — LAW STILL MATTERS** | §6.3 — re-anchor, do not simply delete |
| `whyThisTemplates.snapshot.test.js:26-56, 64-69, 116-128` | 7 dead generators | **B** | Delete those inline snapshots |
| `whyThisTemplates.snapshot.test.js:150-172` (no product-naming) | 9 dead + 1 live | **A** | §6.2 Law A — shrinks to 1 live subject, survives |
| `whyThisTemplates.snapshot.test.js:190-232` (no jargon) | 26 dead + 7 live | **A** | §6.2 Law B — well covered on live, survives |
| `whyThisTemplates.snapshot.test.js:234-254` (no fake autonomy) | **7 dead, 0 live** | **A — VANISHES ENTIRELY** | **§6.2 Law C — MANDATORY MOVE BEFORE ANY COPY DELETION** |

The order also asks for **C — NEVER-REINTRODUCE PRODUCT BOUNDARY** guards. Only
`getPosingConditioningMessage` (G) qualifies, and PHASE 23's Peak Week boundary pin
(*"no user-facing feature"*) already covers it. **No new tombstone is warranted for the other
15** — order PHASE 24: *"Do not create tests for trivial deleted helpers."*

---

## 5. TRUTH DEFECTS FOUND WHILE AUDITING (PHASE 15 / PHASE 22 hand-offs)

### 5.1 LYING COMMENT — `src/lib/algorithms.js:284-294`

The header on `getProgressionSuggestion` claims:

> *"The live in-set hint. It shares the same progression CONTRACT as computeSetTargets … **so
> the two never give opposite advice on the same data**"*

Two falsehoods:
1. **"The live in-set hint"** — it has zero callers. The live in-set hint is `computeSetTargets`.
2. **"never give opposite advice"** — disproved by execution (§6.1, L6). On a single session
   below the rep minimum with RIR 0, `getProgressionSuggestion` returns `decrease_weight` while
   `computeSetTargets` returns `maintain` (it requires a *consecutive* miss,
   `algorithms.js:436-442`). That is precisely opposite advice on identical data.

This comment is exactly the class of stale text the order says *"caus[es] false audits"*. If the
function is retained under class I, the comment must be corrected regardless.

### 5.2 DUPLICATE COPY, UNGUARDED — deload prediction

`predictDeloadWeek` (`mesocycle.js:338`) returns `{ weeksUntilDeload, reason }` — the **exact
signature** `getDeloadPredictionMessage(weeksUntilDeload, reason)` (`whyThisTemplates.js:331`)
consumes. The authored, jargon-guarded, snapshot-locked generator is dark, while the live screen
re-implements the copy inline at `MesocycleBuilderScreen.js:370-371`:

```js
deloadCopy = { text: `A lighter week is likely in about ${…} week${…}.`, urgent: false };
```

That inline string does **not** pass through `whyThisTemplates.clean()`
(`whyThisTemplates.js:238-244`), so it is outside the jargon and em-dash guards. Deleting the
generator is safe for product promise (the live copy already ships), but the *guard coverage* is
the thing worth preserving. Hand-off to PHASE 14 / PHASE 22.

### 5.3 DUPLICATE COPY, UNGUARDED — travel mode (PHASE 8 input)

Order PHASE 8 asks whether the travel-mode generator/copy is LIVE, internal, rollback, dead
residue or future-held. **Answer: the FEATURE is fully live and user-reachable; only the COPY
generator is dark.**

- `src/lib/travelMode.js:175` `generateTravelPlan` → imported `BuildWorkoutScreen.js:22`, called `:200`
- User entry: the "Travel / hotel gym" chip, `BuildWorkoutScreen.js:246`, with
  `accessibilityLabel="Travel or hotel gym mode"`; modal at `:409-438`
- Route registered `RootNavigator.js:451`, deep link `workout/start` at `:769`
- Live inline explanation `BuildWorkoutScreen.js:410`: *"Choose what equipment you've got today.
  Volyume will build a full-body workout that keeps you moving without changing your plan."*

So `getTravelModeMessage` is **F — dead residue**, not a held or rollback seam, and deleting it
leaves no product promise behind (PHASE 3 satisfied: the live surface explains itself). Noted
for PHASE 22: the dark generator explains the *mechanism* (*"Higher reps and shorter rest
periods maintain your muscle"*) which the live copy does not — a coherence opportunity, not a
blocker, and **not** a licence to add new travel-mode UI (PHASE 8: *"No new travel-mode UI"*).

### 5.4 Stale doc to re-header (PHASE 15)

`docs/MOVE_0_5_VOICE_RETROFIT.md:38-46` lists all seven copy generators as retrofitted voice
surfaces. After deletion it will describe functions that do not exist. Per PHASE 15 — *"Do NOT
rewrite historical documents to pretend history did not happen"* — add a **SUPERSEDED** header
pointing at this audit; do not edit the body.

Also `docs/CODE_TRUTH_SURVEY.md:165` claims a screen imports `getProgressionSuggestion` among
seven `algorithms` functions. **That claim is false on current main** (zero callers). Flagging as
a stale-doc finding, not fixing it in this lane.

---

## 6. INVARIANTS THAT MUST MOVE BEFORE ANY DELETION

This section is the order's *"extremely important"* clause. **No F/G deletion in this lane may
land until its row here is discharged.**

### 6.1 `getProgressionSuggestion` — law-by-law migration analysis

Method: I did not reason from source alone. I extracted the pure functions and **executed both
implementations on identical inputs**.

| Law | Pinned at | Holds on live `computeSetTargets`? | Action |
|---|---|---|---|
| **L1** kg compound: +2.5 above 60 kg, +1.25 below | `algorithms.test.js:350-353` | **YES.** The shared authority is `defaultIncrement` (`algorithms.js:273-282`), directly pinned at `algorithms.test.js:326-329` (both bands), and integration-pinned on live at `:373-376` (80 → 82.5). Executed: `computeSetTargets` gives 82.5 and 41.25 | **Delete test. Law already live.** |
| **L2** lbs compound: +5 above 135 lb, +2.5 below | `algorithms.test.js:355-358` | **YES.** `defaultIncrement` pinned at `:331-334`; live integration at `:368-371` (185 → 190). Executed: live gives 190 and 97.5 | **Delete test. Law already live.** |
| **L3** message carries the display-unit label | `algorithms.test.js:360-362` | **N/A.** `computeSetTargets` returns structured `{weight, repsMin, repsMax, action}` + a `reason`; the unit label is applied at render (`ActiveWorkoutScreen.js:2781` `${target.weight}${units}`). No string-level law to move | **Delete test.** |
| **L4** missing RIR ⇒ hold, never optimistically add load | `fitnessLogicFixes.test.js:127-135` | **YES — already asserted on live in the same test.** Lines `:132-134` call `computeSetTargets(prev, 8, 12, 'kg')` and assert `targets[0].action === 'maintain'`. Rationale documented on live at `algorithms.js:410-413` | **Keep the live half; delete only the dead half of this test.** |
| **L5** bodyweight (all-zero) history never suggests a weight increase | `algorithms.test.js:573-579` | **NO — LIVE VIOLATES IT.** See below | **BLOCKER. Do not delete.** |
| **L6** grinding below rep minimum with low RIR ⇒ decrease | `fitnessLogicFixes.test.js:147-150` | **NO — deliberately superseded.** Live requires a *consecutive* miss (`algorithms.js:436-442`, with rationale). Executed: dead → `decrease_weight`, live → `maintain` | Superseded product rule, **not** a law to move. Delete test. **But correct the false comment at `algorithms.js:286-288` (§5.1).** |
| **L7** no configured rep band ⇒ default 6-12, still progresses | `fitnessLogicFixes.test.js:141-145` | **YES behaviourally, NOT pinned on live.** Executed: `computeSetTargets(prev, null, null, 'kg')` → `{weight: 82.5, action: 'increase'}`. Defaults at `algorithms.js:376-377` | **Move:** add the `repMin=null, repMax=null` case to the live `computeSetTargets` describe block before deleting |

#### L5 — the blocker, with reproduction

Input: two logged sets, `weight: 0` (a bodyweight exercise), 15 reps, RIR 3 — i.e. top of the
8–12 band with headroom.

```
DEAD getProgressionSuggestion → { action: 'increase_reps',
                                  message: 'Strong sets. Add a rep or two next session.',
                                  suggestedWeight: 0 }
LIVE computeSetTargets        → [ { weight: 0.25, action: 'increase', prevWeight: 0, … },
                                  { weight: 0.25, action: 'increase', prevWeight: 0, … } ]
```

Mechanism on the live path (`algorithms.js:415-427`): `increment = defaultIncrement(0) = 1.25`;
`maxJump = 0 * 0.05 = 0`; `capped = min(1.25, 0) = 0`; `rounded = 0`; then the progress floor
`targetWeight = 0 + Math.max(0.25, 0)` = **0.25**.

The dead function has an explicit guard for this at `algorithms.js:327-335`
(*"CALC-5: a bodyweight / unloaded exercise (prevAvgWeight <= 0) has no load to add"*).
**`computeSetTargets` has no such guard**, and the live call site passes previous sets straight
through with no bodyweight filter (`ActiveWorkoutScreen.js:1212-1223`). The result is
user-reachable: `displaySetTargets[0].weight` is written into the logger input after a warm-up
set (`ActiveWorkoutScreen.js:1647-1657`) and drives the per-set target chip (`:2762`).

**Consequence for this audit:** `algorithms.test.js:573-579` is the **only** test in the repo
pinning the bodyweight-progression rule. Deleting `getProgressionSuggestion` deletes it, and the
live engine's defect becomes unpinned and invisible. That is textbook *"reducing behavioural
protection to improve dead-code counts"*.

**Required before `getProgressionSuggestion` can be deleted (in order):**
1. Add the CALC-5 guard to `computeSetTargets` — a `prevWeight <= 0` branch that yields a
   rep-progression action, not a `0.25` load. **This changes live engine output and is a
   lead/founder call, not a cleanup edit.**
2. Re-anchor `algorithms.test.js:573-579` onto `computeSetTargets`.
3. Move L7 onto the live describe block.
4. Then delete `algorithms.js:284-365` and the three dead test blocks.

Until step 1 is ruled on, **class I. STOP.**

### 6.2 Copy generators — the one mandatory move (gates ALL SEVEN)

`whyThisTemplates.snapshot.test.js` carries three voice laws. Deleting the seven generators
changes their coverage as follows.

**Law A — "decision-outputs state the call plainly, without naming the product"**
(`:150-172`; founder decision 2026-06-03, quoted at `whyThisTemplates.js:6-9`).
Subjects: 9 dead + `getTimeCrunchMessage` (LIVE, `:166`).
→ **Survives with one live subject.** Trim the array to the live entry; the law keeps an anchor.
**Do NOT blanket-ban `Precision Coaching` across live coach strings** — it legitimately appears
in live copy at `nutritionEngine.js:402`, `differentialPaywall.js:51,53,64,66`,
`whyThisTemplates.js:553`, and 4 times in `weeklyCoach.js` (deliberately locked by
`weeklyCoach.voice.snapshot.test.js:2-3`). The founder rule is scoped to *engine-action message
bodies*, not to all copy. Broadening it would break live suites and misstate the decision.

**Law B — "no jargon in any output across the full library"** (`:190-232`).
Subjects: 26 dead + 7 live.
→ **Survives comfortably.** The jargon law is independently enforced on live code four ways:
runtime guards `coachResponse.js:43`, `coachRegister.js:49`, `progressScanCoachResolver.js:14`;
the `clean()` dev guard `whyThisTemplates.js:232-244`; unit coverage of the blocklist itself
`jargonBlocklist.test.js`; and live-string coverage over 30+ real `buildCoachResponse` outputs
at `coachResponse.test.js:640-645` plus `coachRegister.test.js:276-281`. Trim to live subjects.

**Law C — "no fake-autonomy framing on locked decisions"** (`:234-254`; Pattern 15 of the voice
synthesis).
Subjects: `getProgressionMessage` ×3, `getAutoRegMessage` ×3, `getVolumeStatusMessage` ×1 —
**7 dead, 0 live.**
→ **THE LAW VANISHES ENTIRELY IF THE GENERATORS ARE DELETED.** This is the mandatory move.

Nearest live holder: `coachResponse.test.js:659-663`, over the live `allStrings` set:

```js
expect(s).not.toMatch(/we('|')ll work|let('|')s decide|your call|it('|')s up to you|you could consider/i);
```

**Coverage delta that must be closed before deletion.** The dead test bans three patterns the
live test does not:

| Pattern | `whyThisTemplates.snapshot.test.js:250-252` | `coachResponse.test.js:661` |
|---|---|---|
| `you could consider` | banned | banned |
| `you might consider` | **banned** | **not banned** |
| `you may consider` | **banned** | **not banned** |
| `it's up to you` | banned | banned |
| `you decide` | **banned** | **not banned** |

**Required move:** extend `coachResponse.test.js:661` to
`/you (could|might|may) consider/i` and add `/you decide/i`, so the full Pattern-15 law lands on
live coach output. Only then delete the seven generators and `whyThisTemplates.snapshot.test.js`
lines `26-56`, `64-69`, `116-128`, and trim the arrays at `:156-167`, `:176-182`, `:191-225`,
`:237-245`.

### 6.3 CALC-8 — re-anchor before deleting the mesocycle volume arm

`mesocycle.test.js:253-277` protects: *"out-of-range / NaN week numbers must be handled, not
silently swallowed."* Four subjects:

| Subject | Test | Fate |
|---|---|---|
| `getCurrentMesoWeek(NaN) → 1` | `:257-260` | **KEEP** — subject is retained (§2.9) |
| `getWeekSetsMultiplier` wraps out-of-range | `:262-269` | Dies with §2.7 |
| `getWeekSetsMultiplier(NaN)` finite | `:270-272` | Dies with §2.7 |
| `getVolumeTargetsForWeek` finite for bad week | `:274-277` | Dies with §2.7 |

Live subjects that must carry the law forward:
- `getBlockStatus` — already pinned: `mesocycle.test.js:240` *"unparseable string start date
  never yields Week NaN (Wave-3 review)"*, with the guard implemented at `mesocycle.js:495-500`.
- `getCurrentBlockWeekIndex` (`mesocycle.js:119`, live via `database.js:13`) — tested at
  `blockWeekResolver.test.js:46-56` for **normal** ranges only. **No NaN / out-of-range pin.**

**Required move:** add a `getCurrentBlockWeekIndex(NaN, …)` / out-of-range assertion to
`blockWeekResolver.test.js` (or the CALC-8 block) **before** deleting the three dead CALC-8
tests. Retaining `getCurrentMesoWeek` means the CALC-8 block keeps a valid subject either way,
so this is a strengthening step, not a rescue.

---

## 7. FULL FRESH-SWEEP RESULT (127 zero-caller exports)

The 20 in-lane symbols are classified above. The remainder are **handed on unclassified** —
they belong to other lanes and the order forbids classifying without doing the work.

**In-lane (classified above):** `algorithms.js` ×6 (+2 module-private), `mesocycle.js` ×5,
`whyThisTemplates.js` ×7.

**Explicitly flagged, adjacent to this lane, NOT classified — CLASS I:**
- `checkJargonScienceOn` — `src/lib/coachRegister.js:351`. Zero non-test callers, but it is the
  documented *"parallel allowance path"* for science-on copy (`coachRegister.js:33-35`) and sits
  directly on the jargon-guard architecture this lane depends on. **Do not delete without a
  ruling.** It may be an intentional seam of the same kind as §2.9.

**Handed to other lanes (not classified here):**
`activation.js:32`; `activitySteps.js:39,76,93,193`; `bodyMetricsHistoryMerge.js:73`;
`cardio/*` ×3 → **cardio lane, see `AUDIT-CARDIO.md`**; `coachingGoals.js:183`;
`checkinDerive.js:16`; `database.js` ×15; `deletionRetry.js:64`; `errorLog.js:214`;
`food/*` ×14 (incl. `diaryTimeline.js:90`, `diaryDaySummary.js:50` → **Phase 6 module lane**);
`format.js:36`; `haptics.js:145`; `health.js:339,377`; `insightsEngine.js:235`;
`milestones.js:148,158`; `notifications/preferences.js:188,265`; `nutritionEngine.js:1086`;
`observability.js:187,199`; `onboarding/quizFlow.js:51` → **Phase 7 dark-flag lane**;
`partners/*` ×6; `payments/*` ×7 → **billing, founder-gated, do not touch**;
`planEngine.js:775`; `plateMath.js:42` → **PHASE 23 pins plate calculator as never-reappearing**;
`poolGenerator.js:158`; `progressCaptureGuide.js:107,229`; `progressPhoto*` ×5;
`progressScan*` ×6 (incl. `progressScanCopy.js:16,38` → **Phase 6**);
`recoveryEMA.js:97`; `reorder.js:82`; `restSound.js:181`; `robustTrend.js:124,135`;
`sentry.js:30`; `sheetA11yIsolation.js:112`; `stepsSummary.js:18` → **Phase 6**;
`supabase.js` ×7; `sync/runner.js:412`; `syncQueue.js:283`; `telemetry/transport.js:42`;
`unilateral.js:53`; `units.js:100,124`.

**Note on `_reset*ForTests` / `_setClientForTests` exports** (`deletionRetry.js:64`,
`errorLog.js:214`, `supabase.js:153,217`, `sync/runner.js:412`, `sheetA11yIsolation.js:112`,
`progressScanVision.js:393`, `playBilling.js:805`): these are **ACTIVE TEST SEAMS** (order
PHASE 7 taxonomy) and are correctly zero-caller in production by design. **Class C. Never
delete.** Any future sweep must exclude this pattern by name.

---

## 8. PROPOSED DELETION PLAN (execute nothing — proposal only)

Ordered so that every invariant lands before its subject dies. Each step ends green
(`npm run lint && npm test`) and is a separate commit.

| Step | Action | Gate discharged |
|---|---|---|
| **0** | **FOUNDER/LEAD RULING** on the CALC-5 live defect (§6.1 L5). Until ruled, `getProgressionSuggestion` stays | — |
| **1** | Extend `coachResponse.test.js:661` to `/you (could\|might\|may) consider/i` + `/you decide/i` | §6.2 Law C |
| **2** | Add `getCurrentBlockWeekIndex` NaN/out-of-range pin | §6.3 |
| **3** | Add the `repMin/repMax = null` case to the live `computeSetTargets` describe block | §6.1 L7 |
| **4** | Delete 7 copy generators (`whyThisTemplates.js:165-177, 188-201, 211-224, 234-248, 331-345, 397-403, 416-428`) + trim `whyThisTemplates.snapshot.test.js` (`:26-56, 64-69, 116-128`; arrays at `:156-167, 176-182, 191-225, 237-245`) + remove now-unused imports `:11-14, 18, 20-21` | 1 |
| **5** | Delete `getAutoRegSuggestion` (`algorithms.js:653-757`) — no tests | — |
| **6** | Delete `getExerciseSubstitutes` + `buildSubstituteReason` + `STRETCH_SCORE` (`algorithms.js:808-878`) — no tests | — |
| **7** | Delete `getVolumeConfidence` (`algorithms.js:1493-1499`) — no tests | — |
| **8** | Delete `evaluateDeloadTriggers` (`algorithms.js:1568-1592`) — no tests. **Leave `'deload_trigger'` at `algorithms.js:923` and `EngineLog.js:128,133` untouched** | — |
| **9** | Delete `calculateEffectiveSets` + `getSetEffectivenessWeight` (`algorithms.js:1394-1445`) + `algorithms.test.js:185-252` + `engine-invariants.test.js:420-432` | §2.6 |
| **10** | Delete `getWeekSetsMultiplier`, `isRecoveryWeek`, `getVolumeTargetsForWeek`, `buildWeeklyProgression` (`mesocycle.js:147-233`) + `mesocycle.test.js:52-59, 81-100, 262-277` | 2 |
| **11** | Add the retention note on `mesocycle.js:74` (§2.9); correct the false comment at `algorithms.js:284-294` (§5.1); SUPERSEDED header on `docs/MOVE_0_5_VOICE_RETROFIT.md` (§5.4) | — |
| **12** | *(gated on step 0)* CALC-5 guard on `computeSetTargets`; re-anchor `algorithms.test.js:573-579`; then delete `getProgressionSuggestion` + `algorithms.test.js:347-363` + `fitnessLogicFixes.test.js:125-151` | 0, 3 |

**Estimated removal if steps 4-10 land:** 15 exported functions + 3 module-private symbols;
~330 source lines; ~18 test blocks. **Step 12 adds 1 more function — only after a ruling.**

---

## 9. BOUNDS OBSERVED

- Nothing committed, pushed or stashed. No `git stash`, no branch or main mutation.
- Exactly one file written: this one.
- No production migration referenced or run; 132–135 untouched; 049 untouched.
- No ED-safety code inspected for modification; no calorie floor, FFM floor, rapid-loss gate,
  Beat UK signposting or calm-mode path is touched by any proposal here. The ED copy constants
  in `whyThisTemplates.js:536-604` are **LIVE** (`CoachOutputScreen.js:125-130`) and are
  explicitly **excluded** from every deletion above.
- No billing symbol proposed for deletion; `payments/*` sweep hits handed on untouched.
- Deterministic engine preserved: every proposal removes unreachable code or adds a test.
  No proposal introduces randomness, I/O or an LLM call.
- D92-11 not touched.
