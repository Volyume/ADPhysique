# Plan D: intelligent superset pairing

Founder report (verbatim intent): "Superset selection seems random - it gives
me machine shoulder press and dumbbell lateral raise, which are in two
different areas of the gym. Supersets might be sensible with dumbbell bicep
curl + dumbbell tricep extension. We need to be intelligent with supersets in
the plan builder."

This is a planning document only; no code changed. Another agent is
concurrently editing `src/lib/planEngine.js` for the D8 set-cap/spillover
work; this plan does not depend on that diff's specifics (noted at 4.4).

---

## 1. Where supersets are created today (verified in code)

### 1a. Auto-gen engine: a matcher for exactly this problem ALREADY SHIPPED

This is the single most important fact for this plan. A tiered "practical"
superset matcher already landed in `src/lib/planEngine.js`, commit `5eb50d9`
("Supersets: tiered practical matcher (kills illogical cross-gym pairings)"),
dated **2026-07-04 05:05:41 +0000** - five days before this founder report.
The commit message states outright: *"The machine-shoulder-press +
cable-extension class the founder saw is now structurally impossible, pinned
by supersetPractical.test.js."*

The current implementation (`src/lib/planEngine.js:2278-2389`,
`assignSupersets`) scores every candidate accessory pair, in order:

1. **Relationship tier** (`relationshipTier`, `planEngine.js:2237-2254`):
   tier 1 true antagonist (`ANTAGONIST_PAIRS`, `:2151-2156`: chest/back,
   biceps/triceps, quads/hamstrings, front_delts/rear_delts); tier 2
   deliberate machine-compound -> same-area isolation (same muscle, one side
   tagged `paramKey==='machine'`, the other `'isolation'`); tier 3
   non-competing complementary (`SUPERSET_COMPATIBLE`, `:2122-2140`, a
   symmetric table that deliberately excludes synergist crosstalk like
   chest+triceps or back+biceps). Anything else -> `null` -> rejected.
2. **Equipment/location practicality** (`supersetModality` +
   `modalityProximity`, `:2184-2229`): classifies each exercise into a gym
   zone (`machine`, `cable`, `dumbbell`, `barbell`, `bodyweight`, `other`),
   treats `machine`+`cable` as adjacent (shared pin/pulley area), and rejects
   any pair whose zones are neither identical nor adjacent ("far").
3. Existing safety gates kept: opener protected, no `restSec>=150` member,
   max 2 pairs/workout, quads+hams antagonist used once, beginners and
   non-pump goals excluded, pre-fatigue guard for a later compound of the
   same muscle.

It is **great-or-nothing**: if no candidate clears both bars, the slot gets
no superset at all (`:2380`). This is pinned by
`src/lib/__tests__/supersetPractical.test.js` (independent re-derivation of
the classification, not a re-export of the code under test) and by the
pre-existing policy suite `src/lib/__tests__/supersets.test.js` (gating: which
goals/experience/session-lengths get supersets at all, max 2/workout, opener
protection).

**Given this, the founder's literal example - a genuine "Machine Shoulder
Press" + "Dumbbell Lateral Raise" pair - should already be structurally
blocked by the equipment-zone gate** (`machine` vs `dumbbell` = "far") even
if the two exercises land in the same muscle bucket. So the auto-gen engine
is not the current gap for that specific instance; part 1b explains a data
bug that keeps the underlying risk alive, and part 1c/1d explain the two live
paths that bypass this matcher entirely.

### 1b. The real root-cause candidate: a muscle-taxonomy bug feeds bad pairs into the matcher

The matcher's tier-2 rule ("deliberate compound(machine)->isolation of the
*same muscle*") is only coach-logical if the muscle tag is correct. It is
not, for exactly the exercise pair the founder named.

`src/lib/database.js`, migration v2 (`:411-429`), remaps the generic
`primary_muscle = 'shoulders'` to a specific delt head:

```
414  UPDATE exercises SET primary_muscle = 'front_delts'
     WHERE primary_muscle = 'shoulders'
     AND (name LIKE '%Overhead Press%' OR name LIKE '%Military Press%'
       OR name LIKE '%Front Raise%' OR name LIKE '%Arnold%'
       OR name LIKE '%Seated Dumbbell Press%')
419  UPDATE exercises SET primary_muscle = 'side_delts'
     WHERE primary_muscle = 'shoulders'
     AND (name LIKE '%Lateral%' OR name LIKE '%Upright Row%'
       OR name LIKE '%Machine Shoulder Press%' OR name LIKE '%Shoulder Press%')
423  UPDATE exercises SET primary_muscle = 'rear_delts' ...
428  UPDATE exercises SET primary_muscle = 'side_delts'
     WHERE primary_muscle = 'shoulders'   -- catch-all
```

The `side_delts` clause (`:419-422`) bundles **"Lateral"** raises/**"Upright
Row"** (genuinely side-delt, correct) together with **"Machine Shoulder
Press"** and generic **"Shoulder Press"** (an overhead PUSH, front-delt
dominant - this should have gone in the `front_delts` clause at `:414-418`
alongside Overhead Press/Military Press/Arnold). This looks like a
copy/paste or pattern-ordering mistake in the WHERE-clause list, not a
deliberate call.

Consequence, traced through `src/lib/poolGenerator.js`:
- `generatePoolFromLibrary` (`:128-141`) buckets every exercise by
  `primary_muscle`, so Machine Shoulder Press and Dumbbell Lateral Raise both
  land in the `side_delts` bucket - the SAME muscle, as far as the engine is
  concerned.
- `deriveParamKey` (`:21-26`) tags Machine Shoulder Press `'machine'`
  (matches `MACHINE_CATEGORIES`) and Dumbbell Lateral Raise `'isolation'`
  (its `compoundIsolation` field). That is exactly the tier-2 shape
  `relationshipTier` looks for: `oneMachine && oneIsolation && pA !== pB` ->
  **tier 2, allowed** as a "deliberate compound->isolation of the same
  muscle" - except it is not the same muscle; a front-delt press and a
  side-delt raise were only forced together by the mistag.

The equipment-zone gate (1a, part 2) still catches *this specific* machine
vs dumbbell instance today. But the taxonomy bug is a live landmine: any
machine- or cable-based side-delt raise variant in the library (e.g. a
"Cable Lateral Raise" or "Machine Lateral Raise", both in the `machine`/
`cable` zone) could pair with Machine Shoulder Press and clear BOTH gates,
because the matcher has no way to know the press is actually front-delt.
This is the more durable fix: the pairing logic downstream is only as good
as the muscle tag feeding it.

This mistag also corrupts more than supersets: `SUBREGION_REQUIREMENTS`,
weekly volume targets, and MEV/MRV landmark tracking for `side_delts` vs
`front_delts` (`planEngine.js:1929`, `:1880`) all key off `primary_muscle`,
so front delts are currently under-credited and side delts over-credited
system-wide for any exercise named "Shoulder Press"/"Machine Shoulder
Press" - independent of supersets entirely.

**Test coverage gap:** `supersetPractical.test.js` explicitly runs only
against the hand-written internal `POOL` (`generatePlan` called with no
`exerciseLibrary`, per its own header comment: *"no equipmentCategory on the
hand-written POOL, so name-then-eq only"*), never against
`generatePoolFromLibrary`/the real exercise table. So this exact production
data bug is invisible to the suite that was written to prove the founder's
complaint fixed - the POOL's hand-written entries do not carry this mistag.

### 1c. Manual builder: zero relationship/equipment validation

`src/screens/ManualBuilderScreen.js`, `toggleSupersetSelect` (`:502-518`) and
`handleGroupSuperset` (`:524-548`). The only rule enforced is a **hard cap of
exactly 2 exercises per group** - "Supersets pair two exercises for now"
(`:508`, `:533`) - because the live session (`ActiveWorkoutScreen`) only
understands an alternating pair, not a 3+ giant set. This is the "Wave C S5"
build referenced in `docs/wave-a-build-status-2026-07-03.md:254` ("Wave C:
S3 daily brief/runway + S5 plan-authoring spine (incl. giant-set cap...")
- confirmed: it added the pair cap and nothing else. There is **no check at
all** on muscle relationship or equipment zone; a user can multi-select any
two exercises in a day, including a first-exercise heavy compound and any
accessory anywhere in the gym, and group them. This is the most likely place
a founder-authored (or founder-observed pre-existing) illogical pair like the
one reported actually lives, independent of whatever the auto-gen engine
does.

### 1d. Curated seed routines: no structural pairing risk

`src/lib/seedRoutines.js` never sets `supersetGroupId`. The one hit for
"superset" (`:400`) is a plain-text note on a row ("Primary pull: superset
with bench optional") - advisory copy, not a real pairing. Seed routines are
not a source of bad automated pairs.

---

## 2. Metadata that already exists to drive intelligent pairing

The intelligence the founder is asking for is **already built and shipped**
for the auto-gen path (section 1a); nothing needs to be invented, only (a)
fixed at the data layer (1b) and (b) reused for the builder (1c). Available
building blocks, all currently private to `planEngine.js`:

- **Equipment/location proxy** - `supersetModality`/`modalityProximity`
  (`:2184-2229`): machine/cable/dumbbell/barbell/bodyweight zones, derived
  from `equipmentCategory` first, exercise name second, equipment-profile
  list third.
- **Muscle relationship** - `SUPERSET_COMPATIBLE` + `ANTAGONIST_PAIRS`
  (`:2122-2156`): antagonist pairs ranked above non-competing "compatible"
  pairs; synergist pairs (chest+triceps, back+biceps, etc.) structurally
  excluded from the compatibility table, never just filtered post hoc.
- **Compound vs isolation** - `supersetParam`/`deriveParamKey`
  (`planEngine.js:2167-2173`, `poolGenerator.js:21-26`): distinguishes a
  genuine heavy/mod compound from a machine-tier compound from an isolation
  move, which is what lets the tier-2 rule exist at all.
- **Adjacency model** - `supersetGroupId` shared between exactly two
  adjacent workout entries; both `ActiveWorkoutScreen` and
  `ManualBuilderScreen` already assume this shape (reorder logic keeps pairs
  adjacent, `ManualBuilderScreen.js:602-610`).

None of this is exposed as a standalone, importable pure function today -
it is all module-private to `planEngine.js`'s `assignSupersets` closure.

---

## 3. Brief web check: industry convention

Search confirms the codebase's tier ranking already matches the standard
advice: antagonist pairing (biceps/triceps, quads/hamstrings, chest/back) is
the textbook "good superset," and gym-floor practicality ("only pair
exercises you can do at the same station," "don't pair exercises that
require different gym locations") is treated as a real, named constraint,
not a nice-to-have. Hevy's own superset feature is manual-only (user picks
both exercises via a picker) with no automatic pairing or validation logic
exposed publicly - it leans on the antagonist convention as user education,
not enforcement. That supports the option-B posture below (nudge, don't
block, in the builder) as consistent with what the market leader does.

Sources:
- [Supersetting Opposing Muscles: Save Time Without Sacrificing Strength](https://www.reshapeapp.ai/blog/supersetting-opposing-muscles-save-time-without-sacrificing-strength)
- [What Are Antagonist Supersets? Complete Guide](https://www.minimumviablepump.com/guides/antagonist-supersets)
- [Supersets And Smart Superset Scrolling - Hevy App](https://www.hevyapp.com/features/what-are-supersets/)

---

## 4. Implementation options

### Option A - data fix only (muscle-taxonomy correction)

Move "Machine Shoulder Press"/generic "Shoulder Press" from the `side_delts`
UPDATE clause to the `front_delts` clause in a new, additive, idempotent
migration (both `database.js` local `PRAGMA user_version` step and a new
`supabase/migrate_1NN_*.sql`, per the constitution's migration-header rule).
Re-running the v2 logic is not safe to edit in place (already applied
locally/remotely per the "additive only" rule) - this must be a NEW
migration that re-corrects rows still holding the wrong tag.

- **Blast radius:** every plan/session currently drawing on `side_delts` or
  `front_delts` volume targets, `SUBREGION_REQUIREMENTS`, weak-point
  targeting, and any already-generated plan or in-flight mesocycle that
  counted a Shoulder Press as side-delt volume. This is a real recompute
  question for active users mid-mesocycle (see Q4).
- **Tests needed:** a regression test asserting Shoulder Press variants tag
  `front_delts` (source-level guard, matching the project's existing
  fs.readFileSync + regex convention used elsewhere for founder rules); an
  update to `supersetPractical.test.js` or a new sibling suite that runs the
  matcher against `generatePoolFromLibrary`-derived pool (real taxonomy),
  not only the hand-written `POOL`, since that is the actual coverage gap
  that let this ship unnoticed.
- **Does NOT by itself stop the founder's exact reported pairing** if it
  came from the manual builder (1c) rather than auto-gen.

### Option B - builder-side validation only (calm nudge, never block)

Export the engine's relationship + equipment classification as a shared pure
helper (e.g. `classifySupersetPair(exA, exB)` in `planEngine.js` or a new
`src/lib/supersetLogic.js` module both `planEngine.js` and
`ManualBuilderScreen.js` import), and call it from `handleGroupSuperset`
(`ManualBuilderScreen.js:524`) to show a calm warning toast - "This pairs two
[X] exercises on opposite ends of the gym" or similar Voice-locked copy -
when the user groups a pair that clears neither the relationship nor the
equipment bar. **Never block**: per the constitution's coaching-voice rule
and the observed Hevy convention, the founder (or any user) stays in
control; this is advisory only, same posture as existing calm-toast patterns
elsewhere in the app (`errorLog.js` conventions).

- **Blast radius:** `ManualBuilderScreen.js` only, additive UI change, no
  schema/engine behaviour change to auto-gen. Lowest-risk option.
- **Tests needed:** `ManualBuilderScreen.supersetCap.guard.test.js` already
  exists for the pair-cap; a sibling test for the new nudge (fires on a
  known-bad pair like the founder's example, does not fire on a known-good
  pair like dumbbell curl+extension, and never blocks grouping either way).
- **Does NOT fix the auto-gen data bug (1b)** if left on its own; the
  taxonomy mistag keeps corrupting volume tracking regardless of superset UI.

### Option C - both A and B (recommended shape, decision needed on scope/timing)

Fixes the underlying data correctness issue (A) and closes the one fully
open, zero-validation surface (B) in the same wave, reusing the exact
classification logic already proven correct by the shipped engine matcher
rather than inventing new rules. Largest blast radius of the three (touches
DB migration + engine export + builder UI), but each piece is small and
independently testable per section above.

---

## 4.4 Note: interaction with in-flight D8 (set-cap/spillover)

Not a dependency, flagging for awareness only. If D8's spillover logic
produces a second, session-overflow exercise for a muscle that could not fit
in its main allocation, that spillover exercise still passes through
`assignSupersets` after trimming (`planEngine.js:2552-2558` runs supersets as
the last finalise step), so it is already gated by the same
relationship/equipment bars as any other accessory - no special-casing
needed on this plan's side. The one thing worth the other agent double
checking on their own: whether a spillover exercise carries the same
`_muscle`/`_paramKey`/`_equipmentCategory` internal tags as a normally
selected one before it reaches `assignSupersets`, since those tags are what
this plan's fixes (and the existing matcher) depend on.

---

## 5. Founder questions

**Q1.** Fix the muscle-taxonomy mistag (`Shoulder Press`/`Machine Shoulder
Press` currently tagged `side_delts`, should be `front_delts`) via a new
additive migration now? This also corrects front/side-delt volume tracking
system-wide, not just supersets.
  1. Yes, fix now as part of this work (Option A or C)
  2. Not now, log it and revisit separately from the superset work
  3. No, leave as-is

**Q2.** Add calm, non-blocking validation to the manual builder's
`handleGroupSuperset` so a user is nudged (never blocked) when grouping a
pair that fails both the relationship and equipment-zone bars (Option B or
C)?
  1. Yes, nudge only, reusing the engine's existing classification logic
  2. Yes, but stronger than a nudge (specify: confirm dialog before grouping)
  3. No, leave the manual builder fully unconstrained as today

**Q3.** Scope for this wave:
  1. Option A only (data fix, auto-gen path)
  2. Option B only (builder nudge, no data fix)
  3. Option C (both, in the same wave)

**Q4.** If Q1 is "yes" - existing already-generated plans/mesocycles that
drew on the mistagged `side_delts` bucket for Shoulder Press volume: what
should happen to them?
  1. Leave existing plans untouched; the fix only affects newly generated
     plans from this point forward
  2. Surface a one-time in-app notice inviting the user to regenerate their
     plan (no silent change to their saved data)
  3. Something else (founder to specify) - flagging that silently
     rewriting a user's existing saved plan/volume history would need its
     own explicit decision per the no-silent-corner-cutting rule
