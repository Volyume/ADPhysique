# LOAD SEMANTICS — IMPLEMENTATION SPEC (D107-2, build next week)

Authority: founder 2026-08-17 ("load semantics would be good").
Verified current state: exercise_type has exactly five values
(weight_reps default, weighted_bodyweight, reps_only, distance,
duration); calculateTonnage/calculate1RM/detectPR treat `weight` as one
raw scalar; no per-hand/assisted/stack concept anywhere; assisted
progression (LESS assistance = stronger) is invisible to PR detection;
the dumbbell per-hand-vs-total convention is undefined app-wide.

## Design

1. **Additive `load_semantics` column on exercises** (local + cloud
   additive migrations, header notes per schema law). Values:
   `total` (default; barbells, machines with total display),
   `per_hand` (dumbbells, kettlebells - entered weight is one hand),
   `assisted` (assistance machines - entered weight is the assistance),
   `added_bodyweight` (weighted pull-up/dip - entered weight is the
   external addition). Seed map (seedExercises.js) assigns built-ins by
   equipment; user-created exercises pick at creation with a smart
   default; existing custom exercises default `total` (today's de facto
   meaning - nothing silently changes).
2. **Calculation changes (pure, deterministic, engine modules only):**
   - Tonnage/volume: `per_hand` counts weight x 2 x reps. `assisted`
     is EXCLUDED from tonnage (like reps_only) - counting bodyweight
     minus assistance would pull the user's bodyweight into training
     analytics, which is ED-adjacent and out (v1 law, flag any change
     to the founder).
   - PR/1RM: `per_hand` PRs stay per-hand (comparing like with like);
     `assisted` inverts direction - a PR fires on LOWER assistance at
     >= reps (new branch in detectPR with its own pinned tests);
     `added_bodyweight` unchanged (external load only).
   - History/prefill: unchanged (same exercise id, same convention).
3. **Historical data: never rewritten.** Semantics apply from the
   exercise definition at read time; recorded numbers are untouched.
   Tonnage totals will step for per-hand exercises from the release
   forward; the Recaps/lifetime surfaces get one release-note line.
4. **UI:** the logger's weight field shows a quiet "per hand" /
   "assistance" suffix on relevant exercises (SetEntry label, chrome
   text); exercise creation/edit gains the semantics picker;
   ExerciseDetail states the convention in one sentence.
5. **ED-safety review points:** no bodyweight coupling anywhere (2's
   tonnage law); assisted copy stays neutral ("assistance 25 kg", never
   body-noise); guardrails untouched.

## Interactions noted for the build
Exercise families (TRIAGE hold) would inherit semantics per family -
design compatible, not built now. Import (Hevy/Strong CSV) maps their
dumbbell conventions at import time IF detectable; else default total
and note in the import summary.

## Tests
Pinned unit tests per semantics value for tonnage, 1RM, detectPR
(including the assisted inversion and the per-hand x2 tonnage);
migration idempotency; seed-map spot checks; source guard that no
calculation path reads bodyweight for tonnage. Device checklist:
dumbbell press logs 20 kg -> session tonnage counts 40 kg per rep;
assisted pull-up PR fires when assistance drops.
