# Secondary-muscle model — build spec (BUILT 2026-07-11, commit 19907a2, D46)

**Status: BUILT AND LANDED (2026-07-11, commit `19907a2`; implementation
rulings in the DECISIONS D46 LANDED block). This document is now the
as-built record; the build followed it in full, with four lead rulings
where the spec left forks open (seed-mirrored tags, no upper-body
double-count transfers, effective-maintenance floor with one honest
entry, overlay >= 1.2 glute exemption).**

Founder ruling (2026-07-11): after being shown the leg-day over-stuffing
diagnosis, the founder ruled **"Do it all fully, we do not put off jobs."**
That means the FULL per-exercise secondary-muscle model (not the surgical
lower-body-only trim, not sequencing it behind an interim). Recorded as
**D46** in `DECISIONS-2026-07-09.md`.

The acute symptom is already contained: **D45 (`da59274`) shipped the
per-session hard caps** (max 8 exercises / 25 working sets), so no session
can be a marathon while this larger fix is built. D46 fixes the ROOT cause —
the redundant volume that the cap currently just trims to fit.

---

## 1. THE PROBLEM (verified against code, 2026-07-11)

The deterministic engine (`src/lib/planEngine.js`) has **no working
secondary-muscle model.** Every exercise belongs to exactly ONE muscle's
pool and credits only that muscle. A Barbell Back Squat lives in `quads`
(`sub: vasti`); its heavy glute + adductor + hamstring involvement is
uncredited. An RDL lives in `hamstrings` (`sub: hip_extension`); its major
glute work is uncredited.

Consequence on a consolidated leg day: squats and RDLs already hammer
glutes, but the engine can't SEE that, so it assigns glutes their full
direct volume ON TOP — a hip thrust AND a step-up piled onto the squat +
RDL that already trained them hard. Same for adductors. The required-
subregion machinery then forces >=2 exercises for each of quads / hams /
glutes / calves, so a lower day stacks to 8-10 exercises.

### Reproduction (exact)
Config: `{experience:'advanced', daysPerWeek:6, sessionLengthMinutes:75,
equipment:'full_gym', goal:'classic_physique', phase:'lean_gain',
weakPoints:[], recoveryRating:'average', nutritionPhase:'maintain'}`.
Post-D45 output:
- **Day 3 "Legs" — 8 exercises / 25 sets**: Barbell Front Squat 4, Barbell
  Back Squat 3, Romanian Deadlift 3, Lying Leg Curl 3, Standing Calf Raise
  3, Barbell Hip Thrust 3, Step-Up 3, Seated Calf Raise 3.
- **Day 6 "Legs + Abs" — 7 exercises / 23 sets**: Leg Extension 3,
  Bulgarian Split Squat 4, Stiff-Leg Deadlift 3, Seated Leg Curl 3, Leg
  Press Calf Raise 4, Dumbbell Calf Raise 3, Cable Crunch 3.

The redundancy: Hip Thrust + Step-Up (2 dedicated glute exercises) on top of
Back Squat + Front Squat + RDL, all of which already deliver large glute
volume. A real athlete's leg day is compound-led: squat, RDL, leg press/hack,
leg curl, calf — ~5-6 exercises. The engine can't get there because it double-
counts.

### The dead machinery (proof the model is unwired)
- `INDIRECT_SET_FRACTION = 0.5` at **planEngine.js:303** (RP convention:
  0.5 set per secondary muscle per working set).
- `buildFromMatrix` indirect calc at **planEngine.js:2081-2096**: reads
  `entry.secondary ?? []` for each programmed exercise and accrues
  `indirect[sec] += ex.sets * INDIRECT_SET_FRACTION`.
- **BUT no POOL entry has a `secondary` field** (POOL is planEngine.js:405-
  554; every entry is only `{n, sub, p, eq}`). So `entry.secondary` is
  always `undefined -> []`, indirect volume is always ~0, and the coach
  summary's `indirectSets` is dead.
- The ONLY functioning synergist credit is two hardcoded weekly trims at
  **planEngine.js:371-372**: `trimSynergist('biceps','back',0.4)` and
  `trimSynergist('triceps','chest',0.5)`. Nothing on the lower body.

---

## 2. THE DESIGN (full model — build ALL of it)

Two halves, one biomechanical source of truth. Both driven by the same
secondary-muscle relationships, authored consistently with the hypertrophy
science (RP/Israetel indirect-volume convention; Schoenfeld synergist data).

### Half A — Populate `secondary` tags on POOL (data; wires reporting)
Add a `secondary: [<internal muscle keys>]` array to POOL entries (at least
every compound; isolations usually have none). This makes the indirect-
volume REPORTING at planEngine.js:2081-2096 live (glutes finally show
indirect credit from a squat/RDL week).

**Internal muscle keys** (POOL keys / valid `secondary` values):
`chest, back, side_delts, rear_delts, front_delts, biceps, triceps, quads,
hamstrings, glutes, calves, abs, traps`. Also `adductors` and `forearms`
exist as landmark/tracker keys (adductors: SPEC_LANDMARKS has `adductors
{MRV:12}`; forearms maps to `null` external). `internalToExternal` is at
planEngine.js:2072-2079. NOTE adductors/forearms are not POOL keys (no pool),
so they can be secondary targets but are not primary-programmed — confirm the
indirect loop tolerates a `sec` with no `internalToExternal` entry (adductors
is NOT in internalToExternal — line 2072-2079 lists forearms:null but not
adductors; the loop at 2102 iterates internalToExternal, so an adductors
indirect credit would be DROPPED from the summary. Decide: add `adductors`
to internalToExternal (external 'adductors' or fold into quads) OR accept
adductors indirect isn't reported. Adductors has no external UI bucket today
— check `externalKeys` line 2098: no adductors. Lead ruling needed: either
add an adductors external bucket or keep adductors credit internal-only for
the trim half. RECOMMEND: keep adductors as a trim-only synergist target
(Half B) and do not add a UI bucket — the summary UI has no adductors row.)

**Authoring guide (science; author hands-on, this is judgement):**
Tag the muscles that receive genuine, meaningful stimulus — not every trivial
stabiliser. Canonical set (calibrate against Schoenfeld/RP synergist tables):
- Squat patterns (Back/Front Squat, Leg Press, Hack Squat, Pendulum, Smith
  Squat, Bulgarian, lunges, Goblet): `secondary: ['glutes','adductors']`
  (glutes strongly, adductors moderately). Front Squat also slight hams.
- Hip-hinge (RDL variants, Stiff-Leg DL, Good Morning): `['glutes']`
  strongly (some erector/back — usually not modelled as a primary key here).
- Hip thrust / glute bridge / pull-through: `['hamstrings']` moderate.
- Step-up / lunge (glute-primary entries): `['quads']`.
- Horizontal + vertical pulls (rows, pulldowns, pull-ups): `['biceps']`
  (already credited via the back->biceps trim; tagging makes it explicit +
  fixes reporting) and rows also `['rear_delts']`.
- Deadlift-family in back/traps if present: `['traps','glutes','hamstrings']`.
- Bench / incline / dips / push-ups (chest): `['triceps','front_delts']`.
- Overhead press (front_delts): `['triceps']` (and slight side_delts).
- Close-grip bench / JM press / dips (triceps mod_compound): `['chest',
  'front_delts']`.
- Isolations (curls, extensions, raises, flyes, leg curls, calf raises,
  crunches): usually `secondary: []` or omit the field.

Keep it evidence-based and conservative — over-tagging inflates indirect
credit and could push a muscle's DIRECT target too low. When unsure, omit.

**Library parity:** `poolGenerator.js` builds a pool from the exercise
library when `planAutoGen` passes one (buildEffectivePool, planEngine.js:584-
597). The library-generated entries must ALSO carry `secondary` (from the
library's own secondary-muscle data if present, else empty). Check
`src/lib/poolGenerator.js` for how it maps library rows -> pool entries and
add `secondary` there. If the library lacks secondary data, generated entries
get `[]` (behaviour unchanged for those) and only the hand-written POOL
fallback muscles get the new credit — acceptable, note it.

### Half B — Generalise the weekly synergist trim (behaviour; the actual fix)
Replace the two hardcoded `trimSynergist` calls (planEngine.js:371-372) with
a full relationship table + loop, in `enforceWeeklyFloorsAndCaps`
(planEngine.js:333-389, the trim block is 356-372).

Mechanism (keep the EXISTING proven shape — do not invent a new one):
`trimSynergist(muscle, driverMuscle, rate)` already trims `t[muscle]` by
`round(t[driverMuscle] * rate)`, flooring at `lm.MEV + INDIRECT_TRIM_BUFFER`
(=MEV+2), skipping weak points. Extend the RELATIONSHIP SET, not the
mechanism:
```
// existing:
trimSynergist('biceps','back',0.4)
trimSynergist('triceps','chest',0.5)
// add (lower body — the D46 fix):
trimSynergist('glutes','quads', RATE_G_Q)      // squats hit glutes
trimSynergist('glutes','hamstrings', RATE_G_H) // hip-hinges hit glutes hard
trimSynergist('adductors','quads', RATE_A_Q)   // squats/lunges hit adductors
// consider (upper body completeness, since "do it all fully"):
trimSynergist('front_delts','chest', RATE_FD_C)
trimSynergist('rear_delts','back', RATE_RD_B)
trimSynergist('triceps','front_delts', RATE_T_FD) // overhead pressing
```
**Rate calibration (derive from the 0.5 RP fraction, not guessed):** a
driver muscle trained at N weekly direct sets, where ~half those sets come
from compounds that carry the secondary, delivers roughly
`N * (fraction_compound) * 0.5` indirect sets. So a rate of ~0.25-0.4 for a
strong relationship (glutes<-hamstrings ~0.4, glutes<-quads ~0.3,
adductors<-quads ~0.25) is consistent with the 0.5 fraction once you account
for not every driver set being a carrying compound. **Author the rates from
this reasoning and document each with its number in the code comment** — do
NOT guess. Cross-check: after the trim, glutes' DIRECT target on a squat+RDL
week should fall below the `SUBREGION_REQUIREMENTS.glutes.minSets` (16) and
often to ~MEV+2, so the two-exercise glute requirement stops firing and the
leg day drops the redundant second glute exercise.

### CRITICAL INVARIANTS (Section 2 of CLAUDE.md — never break)
- **Determinism.** No randomness, pure functions, byte-identical output for
  identical inputs. (There is a determinism test in the new
  `planEngineSessionCap.test.js` and many existing ones.)
- **MEV floors hold.** direct+indirect must keep every JUDGED/structural
  muscle at or above MEV. The trim already floors DIRECT at MEV+2 (buffer),
  so effective volume stays >= MEV. Never let the trim drop a muscle below
  its floor. STRUCTURAL_MUSCLES (chest, back, side_delts, quads, hamstrings,
  glutes — planEngine.js:321) never read zero (maintenanceFloor 4/6).
- **Weak points exempt.** `trimSynergist` already skips
  `weakPointKeys.includes(muscle)` — a user-selected weak point is boosted on
  purpose and must NOT be trimmed. Keep this for every new relationship.
- **Glute-priority divisions exempt from over-trim.** Bikini/Wellness are
  glute-led (divisionMRV glutes=30, planEngine.js:310; SUBREGION_REQUIREMENTS
  glutes.minSets 16 is deliberately their territory). Do NOT trim glutes in
  bikini/wellness (or trim far more gently) — their glute volume is the point
  of the division. Gate the glute trim on `goal not in {bikini, wellness}`,
  OR rely on the overlay>=1.0 MEV floor at planEngine.js:342-344 keeping them
  high — VERIFY which, and gate explicitly to be safe.
- **ED-safety.** This is TRAINING VOLUME, not nutrition — no calorie/FFM
  floors touched. But do not weaken any guardrail. No AI, engine stays pure.
- **Tier-blind, additive, no new deps.**

---

## 3. BUILD PHASES (execute in order, hands-on for A/B, agents for tests/review)

**Phase 0 — Re-read this spec + the code anchors below. Reproduce the leg day
(the probe recipe in Section 1) and SAVE the baseline output** so you can
diff before/after and prove the fix.

**Phase 1 (hands-on, Fable) — Half A data.** Author `secondary` arrays across
POOL (planEngine.js:405-554) per the Section-2A guide. Then check/patch
`poolGenerator.js` so library entries carry `secondary`. Run the probe: the
coach summary `indirectSets` for glutes should now be non-zero on a
squat/RDL week (that alone proves the reporting half is wired).

**Phase 2 (hands-on, Fable) — Half B behaviour.** Build the SYNERGIST_TRANSFER
table + loop replacing planEngine.js:371-372, with documented rates. Handle
the adductors-in-internalToExternal question (Section 2A note). Re-run the
probe: Day 3 "Legs" should drop from 8 to ~5-6 exercises, the redundant
second glute exercise gone, glutes still >= MEV via direct+indirect.

**Phase 3 (hands-on, Fable) — verify invariants.** Broad sweep (the
`_probe.test.js` pattern used for D45: experience x days x length x goal x
equipment x weakPoints) asserting: (a) no judged muscle below MEV on
direct+indirect; (b) structural muscles never zero; (c) determinism; (d)
weak-pointed glutes NOT trimmed; (e) bikini/wellness glute volume preserved;
(f) the leg-day exercise count genuinely drops.

**Phase 4 (agent, Sonnet, against this spec) — test rework.** Many pinned
planEngine tests assert specific exercise counts / per-muscle volumes and
WILL change. Update them to the new correct behaviour (do not weaken
invariants — reassert them at the new correct values, with a header note
explaining D46). Add new invariant tests: indirect volume non-zero for
glutes on squat/RDL weeks; leg day no longer double-assigns glute isolation
atop heavy hinge+squat; direct+indirect >= MEV for every judged muscle;
determinism. `src/lib/__tests__/` colocated.

**Phase 5 (agent, Opus, adversarial) — fresh-eyes review** of the full diff
against this spec: hunt for any muscle pushed below MEV, any division whose
signature volume was gutted, any weak-point trimmed, any determinism break,
any test weakened rather than re-pinned. Then Fable triages + fixes.

**Phase 6 (Fable) — land.** `npm run lint && npm test` over the settled
tree, exact output reported. Per-feature commits (no attribution). Device
checklist (below). Update handover + TASKBOARD + this doc's status. Push.

### Device checklist (Android EAS build)
1. Generate classic_physique / 6-day / 75-min plan -> open the Legs day ->
   **expect** a compound-led ~5-6 exercise day (squat, hinge, leg press/curl,
   calf), NOT two separate glute isolations stacked on squats+RDL.
2. Generate a bikini / 5-6 day plan -> **expect** glute volume UNCHANGED
   (still the division's signature high glute work; the trim must not touch
   it).
3. Select glutes as a weak point on any division -> **expect** glute volume
   NOT reduced (weak-point exemption).
4. Regenerate identical inputs twice -> **expect** identical plans
   (determinism).
5. Spot-check a Push and a Pull day -> **expect** sane counts, biceps/triceps
   still adequately covered (the existing back->biceps / chest->triceps trims
   must still behave, now via the generalised table).

---

## 4. CODE ANCHORS (all in src/lib/planEngine.js unless noted)

| What | Location |
|---|---|
| `INDIRECT_SET_FRACTION = 0.5` | 303 |
| `divisionMRV` (glutes 30 for bikini/wellness) | 309-312 |
| `INDIRECT_TRIM_BUFFER = 2` | 316 |
| `STRUCTURAL_MUSCLES` | 321 |
| `maintenanceFloor` (4/6) | 323-325 |
| `enforceWeeklyFloorsAndCaps` (floors/caps/trim) | 333-389 |
| **`trimSynergist` + the two hardcoded calls (EXTEND HERE)** | 364-372 |
| `POOL` (add `secondary` here) | 405-554 |
| `buildEffectivePool` / library merge | 584-597 |
| `SUBREGION_REQUIREMENTS` (glutes minSets 16 etc.) | 603-635 |
| `selectExercisesForMuscle` (per-muscle exercise pick) | 1150-1388 |
| `buildSession` | 1443+ |
| `buildFromMatrix` + **indirect calc reading `entry.secondary`** | 1989 / 2081-2114 |
| `internalToExternal` (no `adductors` key — decision needed) | 2072-2079 |
| `externalKeys` (no `adductors` bucket) | 2098 |
| `trimToTimeBudget` + D45 session caps (already shipped) | 826-984 |
| `poolGenerator` (library -> pool; add `secondary`) | src/lib/poolGenerator.js |

Related engine files that may hold pinned tests to update: everything under
`src/lib/__tests__/planEngine*.test.js`, `planengineLandmarkSource.test.js`,
and any coach/summary test asserting `indirectSets`.

---

## 5. WHY FULL, NOT SURGICAL (founder rationale, D46)
The founder was offered four options (surgical-now-then-full; full-only;
surgical-only; cap-is-enough) and chose **full** with "we do not put off
jobs." Under D33 (best solution for the app and users, never effort) the full
per-exercise model is correct: it fixes legs AND generalises to every muscle,
AND wires up the indirect-volume reporting that has been dead since it was
scaffolded. The D45 cap is the safety net that makes it safe to take the time
to build this properly rather than rushing it.
