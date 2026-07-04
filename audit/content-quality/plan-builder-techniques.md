# Advanced Training Techniques — Content-Quality Audit

**Scope:** Volyume plan generator + in-session logging. Judges whether the app's
advanced-technique logic is *principled* (what an evidence-based strength/hypertrophy
coach would program) or effectively *random*.

**Method:** Read every technique module, then drove the real `generatePlan` engine
(unmodified) across 9 goals x 4 day-counts x 3 session lengths = 108 plans and
captured every generated superset verbatim (274 instances). Read-only on `src/`.

Probe harness: `scratchpad/gen.probe.test.js` (throwaway, run via a scratchpad jest
config against the real engine). Raw dump: `scratchpad/probe.out.txt`.

---

## 1. Technique inventory (with file:line)

| Technique | Where it lives | Auto-**prescribed** by the generator? |
|---|---|---|
| **Supersets** (paired exercises) | `src/lib/planEngine.js:1954-2061` (`assignSupersets`, `SUPERSET_COMPATIBLE`, `canSuperset`, `SUPERSET_GOAL_ALLOWLIST`); applied at `planEngine.js:2205`; persisted via `supersetGroupId` in `planAutoGen.js:179`; driven in-session at `ActiveWorkoutScreen.js:440-486, 640-652, 1232-1249, 2039-2042, 2550-2640` | **YES** — the *only* advanced technique the engine prescribes |
| **Drop sets** | Set-type option only: `ActiveWorkoutScreen.js:86` (`SET_TYPE_OPTIONS`); rest table `restSuggest.js:38` | **NO** — user-selected in-session |
| **Myo-reps** (cluster) | `src/lib/clusterSet.js` (whole module); `ActiveWorkoutScreen.js:87, 238-290, 1441-1500`; `restSuggest.js:40` | **NO** — user-selected in-session |
| **Rest-pause** (cluster) | `src/lib/clusterSet.js`; `ActiveWorkoutScreen.js:88`; `restSuggest.js:41` | **NO** — user-selected in-session |
| **AMRAP** | `restSuggest.js:37` | **NO** — user-selected |
| Giant sets / pre-exhaust / finishers | *not implemented anywhere* | n/a |

**Key structural finding:** the auto-generator prescribes **supersets and nothing
else**. Drop sets, myo-reps and rest-pause are *manual set-type choices* a user
applies to a set they are logging; the engine never places a drop set on any
exercise. This immediately eliminates the whole class of "drop set on a barbell
squat opener" placement bugs — the engine cannot produce one.

---

## 2. How the superset algorithm actually works

`assignSupersets(exercises, { goal, experience, sessionLengthMinutes })`:

1. **Gates (coach-like):**
   - Skips if `< 4` exercises (`:2006`).
   - Skips **beginners** entirely (`:2008`) — "form takes priority".
   - Skips unless goal is in `SUPERSET_GOAL_ALLOWLIST` (hypertrophy/physique family)
     **or** session `<= 50 min` (`:2012-2014`). `strength_hypertrophy` is deliberately
     excluded so compounds aren't rushed under fatigue.
2. **Protects the opener / compounds:** finds `accessoryStart` by skipping any leading
   exercise with `restSec >= 150` (heavy/mod compounds), and always leaves at least the
   first exercise unpaired (`:2018-2024`). A pair is refused if either member has
   `restSec >= 150` (`:2038-2039`). Since `REST_SEC` = heavy_compound 180 / mod_compound
   150 / machine 120 / isolation 75 (`planEngine.js:633`), **only machine + isolation
   accessories can ever be paired**. No barbell/heavy-compound is ever supersetted.
3. **Compatibility filter:** walks *adjacent* accessory pairs and pairs them only if
   `canSuperset(a._muscle, b._muscle)` is true. `SUPERSET_COMPATIBLE` (`:1970-1988`)
   is a hand-authored map that excludes same-muscle and *competing* pairs (chest+triceps,
   back+biceps) and permits antagonist / non-competing pairs.
4. **Overuse cap:** `MAX_PAIRS_PER_WORKOUT = 2` (`:2029`); quads+hams pairing limited to
   once per workout (`:2031, 2044-2054`).

Because exercises are emitted grouped by muscle (`buildSession`, `planEngine.js:1130-1155`),
adjacent pairs only occur **at muscle boundaries** — so a pair is "last accessory of muscle
A + first accessory of muscle B". The map then vetoes any boundary that would clash.

---

## 3. Real generated examples + per-example judgement

274 superset instances were generated. Deduped by exercise pair (full list in
`scratchpad/probe.out.txt`). Representative verbatim examples:

```
general_hypertrophy d4 s60 Upper A : [Cable Lateral Raise] + [Face Pull]          (side delt + rear delt)
general_hypertrophy d4 s60 Lower A : [Standing Calf Raise (Machine)] + [Cable Crunch]  (calves + abs)
general_hypertrophy d5      Pull A : [Face Pull] + [Incline Dumbbell Curl]        (rear delt + biceps)
mens_physique       d5 s60  Delts+Arms : [Overhead Cable Tricep Extension] + [Prone Incline Curl]  (triceps + biceps — TRUE antagonist)
classic_physique    d3      Upper : [Incline Dumbbell Curl] + [Overhead Cable Tricep Extension]    (biceps + triceps — TRUE antagonist)
bodybuilding        d5      Upper C : [Prone Incline Curl] + [EZ Bar Skull Crusher]  (biceps + triceps — TRUE antagonist)
bikini              d5 s45  Lower : [Smith Machine Hip Thrust] + [Standing Calf Raise (Machine)]   (glutes + calves)
wellness            d4      Lower Full : [Smith Machine Hip Thrust] + [Dumbbell Calf Raise]        (glutes + calves)
classic_physique    d4      Back+Hams : [Seated Leg Curl] + [Cable Crunch]         (hamstrings + abs)
```

**Category tally across all 274 generated pairs:**

| Category | ~count | Coach verdict |
|---|---|---|
| True antagonist (biceps↔triceps) | ~17 | **Textbook-correct** |
| Delt-head combo (side↔rear delt) | ~47 | Reasonable combined-shoulder pairing; non-competing |
| Shoulder-isolation + arm-isolation (e.g. rear delt + biceps) | ~90 | **Sensible** non-competing time-saver |
| Small-muscle filler (calves + abs) | ~59 | **Sensible** standard filler superset |
| Machine leg (leg curl / hip thrust / abductor) + calf/abs | ~31 | Non-competing & safe; a few (loaded Smith hip thrust) are logistically clunky |
| Arm + abs filler | ~10 | Fine |
| **Competing / unsafe pairings (chest+tri, back+bi, two heavy compounds, opener paired)** | **0** | — |

**Logical vs arbitrary: 274 / 274 pass the "would a coach object?" test — 0 arbitrary,
0 unsafe.** The compatibility map + rest-gate demonstrably prevent every bad pairing:
no competing muscles, no heavy compound, no session opener, capped at 2/workout,
beginners and strength goals excluded.

**The nuance (not a bug):** the pairings are *safe but skewed to filler*. The algorithm
is a greedy "first adjacent compatible pair" walk, not a deliberate antagonist matcher.
True antagonist supersets (bi/tri, quad/ham, chest/back) are a *minority*; the bulk are
small-muscle/isolation fillers (delt+arm, calf+abs) that happen to land at a muscle
boundary. A coach would more often *intend* the antagonist pairing. See §7.

---

## 4. Timing findings (plan data + in-session rest timer)

**Plan data:** paired exercises keep their ordinary per-exercise `restSec` (isolation 75 /
machine 120). Superset membership is *not* encoded as a distinct rest value — correct, since
superset timing is a live-session behaviour, not a stored number.

**In-session (the important check):** `ActiveWorkoutScreen.js:1232-1249`.
- **Between the two paired exercises: rest is correctly suppressed.** Logging exercise A
  auto-jumps to its pair B and `return`s *before* `startRestTimer`. So A→(no rest)→B. This
  is exactly how a superset should behave and is genuinely *different* from straight-set
  rest. ✅
- **Warm-ups excluded from the jump** (`:1236`) and the UI removed auto-warmups for paired
  exercises (`:2300-2305`). ✅
- **BUG — no rest ever fires between superset *rounds*.** The auto-jump is order-agnostic:
  `findIndex` returns *the other* member regardless of which half you just did (`:1238-1240`).
  So logging **B also jumps straight back to A**, again skipping `startRestTimer`. The result
  is a continuous A→B→A→B ping-pong with the rest timer **never** auto-starting for the whole
  superset. The code comment on `:1233` ("The rest happens after BOTH halves of the pair are
  logged") is **not implemented** — there is no round tracking, so no rest is inserted after B
  either. Evidence-based guidance (§5) is minimal rest *within* the pair but a normal ~60–120 s
  rest *after* the pair before repeating. This is a timing bug, see §6.

**Drop sets / clusters timing:** `restSuggest.js:35-42` — dropset rests *after* the full drop
(compound 180 / isolation 90); myo-reps & rest-pause use 20 s between mini-efforts (matches the
10–20 s convention and the live cluster mini-rest). Sound.

---

## 5. Web benchmark (evidence-based practice, cited)

- **Antagonist / agonist-antagonist supersets are legitimate and time-efficient** — equal
  hypertrophy/strength to straight sets in ~half the session time. Agonist-antagonist pairing
  is the canonical structure. (PubMed review 20733520; Built With Science; Mountain Tactical.)
  - https://pubmed.ncbi.nlm.nih.gov/20733520/
  - https://builtwithscience.com/workouts/supersets/
  - https://mtntactical.com/research/research-review-supersets-vs-traditional-lifting-same-gains-less-time/
- **Rest for supersets:** minimal/short rest *between* the two paired exercises (immediate to
  ~30 s is fine and can preserve performance), then a normal rest *after* the pair before the
  next round (heavier work 60–90 s). The app nails the within-pair part and misses the
  after-pair part (§4 bug).
  - https://fitnessrec.com/articles/antagonist-supersets-for-athletes-save-time-and-build-balanced-strength
  - House of Hypertrophy: https://houseofhypertrophy.com/antagonist-supersets/
- **Drop-set placement:** put drops on **isolation / machine** moves (leg extension, lateral
  raise, pushdown), **not free-weight compounds**, and near the **end** of a session; 1–2 per
  workout max, sparingly. Volyume never auto-prescribes drops (user-applied), and the copy
  steers correctly, so it is compliant by construction.
  - https://www.muscleandstrength.com/articles/science-behind-drop-sets-and-muscle-growth
  - https://wellness.alibaba.com/fitlife/drop-sets-for-hypertrophy-pros-cons
  - Leg-extension drop-set hypertrophy study: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8473065/

**Benchmark verdict:** the app's *guardrails* (who gets supersets, on which exercises, capped
volume, correct within-pair rest, drop sets only on user-chosen isolation) match evidence-based
practice well. The *pairing intent* (skew to filler rather than deliberate antagonist) and the
*between-round rest* are where it lags.

---

## 6. SAFE FIXES (clear bugs / timing errors)

### SF-1 — Superset rest timer never fires between rounds *(timing bug)*
`src/screens/ActiveWorkoutScreen.js:1232-1249`. The auto-jump fires on **every** logged set of a
paired exercise (from A→B *and* B→A) and `return`s before `startRestTimer`, so the countdown never
starts during a superset — contradicting the comment on line 1233 and the after-pair rest norm.

*Intended behaviour:* jump A→B with no rest; after the **second** half (B) is logged, start the
normal rest timer, then the next round begins on A. Requires distinguishing "first half" from
"second half" of the round (e.g. only auto-jump when moving to the *later* index / a
just-jumped-here flag), instead of the order-agnostic `findIndex`.

Before (`:1236-1249`, simplified):
```js
if (currentSet.setType !== 'warmup') {
  const sgi = workoutExercises[currentExerciseIndex]?.supersetGroupId;
  const pairIdx = sgi != null
    ? workoutExercises.findIndex((e, i) => i !== currentExerciseIndex && e.supersetGroupId === sgi)
    : -1;
  if (pairIdx >= 0) {            // fires for BOTH halves -> no rest ever
    setCurrentExerciseIndex(pairIdx); ...; return;
  }
}
```
After (intent — only jump *forward* to an as-yet-undone partner; otherwise fall through to rest):
```js
if (currentSet.setType !== 'warmup') {
  const sgi = workoutExercises[currentExerciseIndex]?.supersetGroupId;
  // Jump only to a LATER partner (first half of the round). When we are the
  // later half, fall through so the rest timer runs before the next round.
  const pairIdx = sgi != null
    ? workoutExercises.findIndex((e, i) => i > currentExerciseIndex && e.supersetGroupId === sgi)
    : -1;
  if (pairIdx >= 0) {
    setCurrentExerciseIndex(pairIdx); ...; return;
  }
  // else: we just logged the second half -> continue to startRestTimer below,
  // then the user navigates back to the first exercise for the next round.
}
```
**Caveat / not applied:** this changes a live in-session flow and needs a device walk-through
(log both halves; confirm no rest A→B, rest fires after B, round 2 resumes on A). Because it is a
behaviour change in the workout logger, it is written up here for a founder go rather than applied.
Flagged as a bug, exact location + fix given.

### SF-2 — (observation, not applied) loaded Smith-machine hip thrust supersetted with calf raise
`assignSupersets` classifies Smith Machine Hip Thrust as `machine` (restSec 120), so it can be
paired (e.g. `bikini d5`, `wellness d4`). Muscle pairing is safe (glutes+calves, non-competing)
but a loaded hip-thrust superset is logistically awkward (unrack to do calves). Minor; borderline
between "placement polish" and taste. Not a safety bug — noted for the founder, not fixed.

**Safe-fix count: 1 concrete timing bug (SF-1) + 1 minor observation (SF-2).**

---

## 7. ENGINE DECISIONS (HOLD for founder)

### ED-1 — The pairing algorithm is a "first adjacent compatible pair" filter, not an antagonist matcher
`assignSupersets` (`planEngine.js:2005-2061`) never *searches* for the best antagonist pairing; it
pairs whatever two compatible accessories happen to sit at a muscle boundary and passes them through
the veto map. Evidence (274 generated pairs, §3): every pair is safe, but the *majority* are
small-muscle/isolation fillers (delt+arm ~90, calf+abs ~59) rather than the textbook
agonist-antagonist superset. A coach programming supersets usually *intends* chest↔back, quad↔ham,
biceps↔triceps for balanced antagonist work; the current engine produces those only when they
coincidentally land adjacent.

**This is unprincipled *intent*, not unsafe output** — hence a founder engine decision, not a bug.

**Proposed principled approach (for a decision, NOT applied):** replace the greedy adjacency walk
with a *preference-ranked* matcher over the accessory pool:
1. Rank candidate pairs: (tier 1) true antagonist across a joint (chest/back, quad/ham,
   biceps/triceps, front/rear delt); (tier 2) non-competing upper+lower or big+small; (tier 3)
   current filler (calf/abs, delt/arm).
2. Pick the highest-tier available pair first, reorder those two entries to be adjacent, keep the
   existing `restSec < 150`, opener-protection, `MAX_PAIRS_PER_WORKOUT = 2` and beginner/strength
   gates unchanged.
3. Keep determinism (no `Math.random`) — rank by a fixed tier + stable index order.

This would raise the share of true antagonist supersets without touching any safety gate. Present as
a founder choice: **(A)** keep the current safe-but-filler filter, **(B)** adopt the tier-ranked
antagonist matcher above, or **(C)** something between (e.g. only upgrade the veto map to *prefer*
antagonists at existing boundaries). Do **not** apply silently.

---

## Verdict summary

- **Supersets — PRINCIPLED (safe), tally 274/274 non-arbitrary, 0 unsafe.** Guardrails are
  genuinely coach-like. The pairing *intent* skews to filler over antagonist — that is an engine
  decision (ED-1), not a bug.
- **Drop sets / myo-reps / rest-pause — never auto-prescribed;** user-applied with correct
  isolation/machine steering and rest handling. No placement bug is possible from the engine.
- **Rest timing:** within-pair rest correctly suppressed (✅); **between-round rest never fires
  (SF-1 bug).**
- **Safe fixes: 1 timing bug (SF-1) + 1 minor observation (SF-2). Engine decisions on hold: 1 (ED-1).**
