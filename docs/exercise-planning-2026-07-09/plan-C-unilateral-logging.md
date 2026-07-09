# Plan C: elegant unilateral (per-side) logging in the workout logger

Founder question: do we have an elegant way to do unilateral work in the
logger (e.g. a dumbbell bicep curl - one arm, rest, then the other), and does
it belong in the builder too. This is a planning document only; no code
changed.

---

## 1. Current-state summary (verified in code)

VOLYUME already has two disconnected, unfinished attempts at this, plus a
data field that is computed but never read.

**`laterality` is derived but dead.** `deriveLaterality()` in
`src/lib/exerciseMetadata.js:130-135` regex-matches exercise names
(`single-arm|single-leg|one-arm|bulgarian|split squat|lunge|pistol|b-stance|
concentration|kickback|step-up|curtsy|cossack|skater|shrimp`) and writes
`bilateral`/`unilateral` onto the `exercises` row at insert/update time
(`src/lib/database.js:2032-2097`, `:1265`, `:1338`). It is not sample data in
`seedExercises.js` itself - it is computed, not seeded. Nothing in
`ActiveWorkoutScreen.js` or `ManualBuilderScreen.js` reads `exercise.laterality`
- confirmed by grep, zero hits outside `database.js`/`exerciseMetadata.js`/tests.
So the app already "knows" an exercise is unilateral and throws that
knowledge away at logging time.

**A second, orphaned mechanism exists: `src/lib/unilateral.js`.** This is a
per-exercise, device-local (AsyncStorage) on/off flag, independent of
`laterality`, with `loadUnilateralExercises()` / `setUnilateralExercise()` and
full unit tests (`src/lib/__tests__/unilateral.test.js`). But
**`setUnilateralExercise` (the setter) is never called from any screen** -
grepped across `src/`, the only caller is the test file. `ActiveWorkoutScreen.js`
only ever calls the loader (`:702`). There is currently no UI path for a user
to turn this on. It is dead plumbing, wired at one end only.

**Even switched on, today's design is intentionally minimal, not a real
per-side flow.** The header comment in `unilateral.js:4-10` states the
decision already made in code: log ONE weight + ONE reps value, understood
as "per side, done on both sides at that weight" - explicitly *not* separate
L/R entry. In `ActiveWorkoutScreen.js` the flag's only live effect is line
`1598`: it suppresses the cluster-set auto-start behaviour for a marked
exercise, so pressing "Log set" doesn't get misrouted into the rest-pause
flow. There is no second tap, no "now do the other side" prompt, no
side-specific rest cue. Nothing in the UI tells the user this toggle exists,
what it does, or how to reach it.

**`left_reps` / `right_reps` columns exist but are legacy.** An earlier,
superseded design (`supabase/migrate_054_workout_sets_unilateral.sql`, local
schema `database.js:1195-1196`) added nullable `left_reps`/`right_reps` to
`workout_sets`, with `actual_reps` set to the *lower* side so volume/PR stayed
conservative. `unilateral.js:16-18` calls this "legacy": kept only so old sets
display correctly (`formatPerSide`, read in `LoggedSetRow` at
`ActiveWorkoutScreen.js:133`); new sets do not write these columns. So there
are effectively three generations of unfinished thinking in the codebase at
once.

**Volume/PR maths already does the right thing and must keep doing it.**
Every tonnage/PR/e1RM query in `database.js` (e.g. `:2538`, `:5519`, `:5563`,
`:5672`, `:5705`, `:5720`) multiplies `weight * actual_reps` only - never
`left_reps`/`right_reps`. One logged set, whatever its laterality, already
counts as exactly one working set. This invariant must not change: a
per-side set is still one set for a muscle, not two.

**Builder has nothing.** Grepped `ManualBuilderScreen.js` for
`laterality|unilateral|per-side`: zero matches. The builder currently makes
no distinction at all.

**Closest existing "one movement, two phases" pattern: the superset
heads-up.** `ActiveWorkoutScreen.js:2682-2751` is a once-per-pairing modal:
icon + title ("Superset coming up"), one-line subtitle, a numbered 4-step
walkthrough, a tip line, primary CTA ("Got it, start"), and an "Unlink"
escape hatch. This is exactly the shape a first-timer unilateral walkthrough
should copy. The overflow sheet's per-exercise option rows (icon + label +
description, e.g. "Warm-up sets" / "Pair as superset",
`ActiveWorkoutScreen.js:3049-3084`) are the natural, already-idiomatic home
for a "Log per side" toggle.

**The rest timer already has a precedent for a short, non-standard rest.**
The cluster/rest-pause mini-set flow calls `startRestTimer(20)` (`:1587`,
`:1616`) for the 10-20s gap between rest-pause efforts, distinct from the
exercise's normal full rest. The same mechanism is the natural driver for a
short "rest, then do your other side" nudge.

**`clusterSet.js` is the right architectural template to copy, not
`unilateral.js`.** It is a pure module: "one working set = an activation
effort plus a run of mini-efforts, summed into ONE `workout_sets` row,
`actual_reps` holds the combined value, the per-effort breakdown rides in
`notes`" (`clusterSet.js:1-16`). A per-side set is structurally the same
shape (two efforts, one row) and should reuse this pattern rather than
reviving the old `left_reps`/`right_reps` columns.

---

## 2. Competitor pattern table

| App | Pattern | What a novice actually sees |
|---|---|---|
| Hevy | (e) status quo. No dedicated per-side UI. Log one weight/rep number per set; user mentally does both arms per logged set, or manually adds extra rows. | Nothing different from any other exercise; no guidance, no prompt. Users self-organise (per Hevy's own glossary content and general product behaviour - no in-app per-side feature found). |
| Strong | (e) status quo, same as Hevy. Has first-class supersets/circuits ("About Supersets/Circuits", Strong Help Centre) but no unilateral-specific mode. | Same ambiguity; some users log 2 sets per exercise (one per arm), inflating the visible set count. |
| JEFIT | (e)/(a) hybrid, community-driven, not a real feature. JEFIT's own Q&A threads show users are confused and asking "does the app double the weight or must I log both sides" and "does it count it as double since it's unilateral" - i.e. this is a live, unresolved pain point on a major app. Workarounds discussed: log the exercise twice (once "Left", once "Right"), or one set with doubled weight, or double the *set count* (3 left + 3 right instead of 3). | Inconsistent by user; no house rule, so trainees invent their own bookkeeping, which is exactly the kind of ambiguity a "novice picks it up and understands what to do" bar wants to avoid. |
| MyFitCoach | (d)-ish guidance without app enforcement. Published advice: always log ONE side's weight/reps, never the total; for alternating sets, log reps per arm not the combined total. | A documented rule, but it lives in a help article, not in the logging UI itself - the app doesn't structurally prevent double-counting. |
| Boostcamp / Gravitus / Alpha Progression / KeyLifts | No documented dedicated unilateral feature found (searched product pages, feature lists, app-store copy). Standard set logger only. | Same status-quo ambiguity as Hevy/Strong. |
| StrengthLog | Has a formal "Special set > Circuit" grouping construct for supersets/circuits (comparable to VOLYUME's superset pairing), but not unilateral-specific. | Relevant precedent for "teach the pattern once, structurally group it" but not a per-side answer either. |

**Competitor consensus:** nobody in the mainstream tracker market has solved
this well. The default across Hevy, Strong, Boostcamp, Gravitus and Alpha
Progression is status-quo (e) - one set, no side notion, left entirely to
user convention - and JEFIT's own support forum shows that ambiguity
actively confuses users and causes inconsistent (sometimes double-counted)
volume. This is a real, unaddressed gap in the market, not a solved problem
VOLYUME would be copying - which raises the bar for making VOLYUME's version
actually clear rather than another silent convention.

---

## 3. Design options for VOLYUME

All three below preserve the invariant: **one logged unilateral set = one
working set for volume/PR/progression maths** (matches what the engine
already does today via `actual_reps`).

### Option 1: Status-quo-plus - finish wiring what already exists, minimal UI

**What the user sees.** A "Log per side" toggle added to the existing
per-exercise overflow sheet (next to "Warm-up sets" / "Pair as superset",
`ActiveWorkoutScreen.js:3049-3084`), auto-suggested ON the first time the
user opens an exercise where `laterality === 'unilateral'` (finally reading
that dead field). Logging itself stays exactly as it is today: one tap, one
weight, one rep count, understood as "per side, do both sides at this
weight." No second tap, no side-by-side flow. A one-line calm hint appears
under the set-entry card the first time: "Logged as one working set. Do both
sides at this weight."

**What gets stored.** Nothing new - this finally *uses* `setUnilateralExercise`
from `unilateral.js`, and wires `laterality` in to pre-tick the toggle. No
schema change at all.

**Volume/PR/history maths.** Zero risk - nothing changes here; `actual_reps`
already means "one working set" today.

**Builder implications.** None required; logger-only. Optionally the builder
could show a small "unilateral" badge next to exercises where
`laterality === 'unilateral'`, purely informational, no input change.

**Effort:** S. This is mostly turning on a switch that already exists,
finishing an incomplete wire-up, plus one new sheet row and one first-run
hint.

**Trade-off:** does not actually address the founder's stated scenario ("one
arm, rest a little, then the other") - it does not give the user any
in-app structure for the rest-between-sides part; it only stops the app
mis-routing the log-set tap into the cluster flow and clarifies the
convention. It is the cheapest fix for the *confusion* problem the
competitor research surfaces (JEFIT's "am I double counting" issue) but not
the workflow problem.

### Option 2: True two-phase per-side flow, modelled on `clusterSet.js`

**What the user sees.** Same overflow toggle as Option 1 (auto-suggested from
`laterality`, one tap to turn on for that exercise). When on, "Log set"
becomes a two-step tap, structurally identical to the existing rest-pause/
myo-rep cluster flow the user already knows: tap "Log set" -> enter reps for
side one -> app starts a short rest (reusing `startRestTimer`, e.g. 30-45s,
configurable per user later) with a plain label "Rest, then log your other
side" -> a single follow-up prompt "Log [side two]" -> enter reps for side
two -> the pair commits as ONE `workout_sets` row. First time the exercise is
marked unilateral, a first-timer walkthrough modal fires, copying the
superset heads-up's shape exactly (icon, title, numbered steps, tip, "Got
it" CTA, `ActiveWorkoutScreen.js:2682-2751`): "1. Do side one. 2. Rest a
short beat. 3. Do side two. 4. Logs as one set."

**What gets stored.** Reuses the `clusterSet.js` pattern rather than reviving
`left_reps`/`right_reps`: `actual_reps` = the LOWER of the two side rep
counts (conservative, matches the abandoned migration 054's own logic so
there's no maths regression), and the per-side breakdown rides in `notes`
("L 10 / R 9") exactly as `formatPerSide` already displays it today. **No
schema change** - this is additive-free because `notes` and `actual_reps`
already exist and already carry cluster breakdowns the same way.

**Volume/PR/history maths.** Same invariant preserved (`actual_reps` is one
set's worth); the lower-side floor is intentionally conservative so a
lopsided pair never inflates a PR or weekly volume off the stronger side.

**Builder implications.** Logger-only for the flow itself. The builder could
optionally let a user pre-mark an exercise as unilateral when building a
routine (persisted as the same device-local preference, or promoted to a
real per-exercise attribute - see founder question 2 below) so the first
workout of a new routine already has the toggle set, rather than the user
discovering it mid-set for the first time.

**Effort:** M. New two-phase state machine in `ActiveWorkoutScreen.js`
(closely mirrors the existing cluster state machine - `cluster`,
`clusterReps`, `addMiniSet`, `finishCluster` already do almost this shape),
one new first-timer modal (copy an existing modal's structure), no schema
work.

### Option 3: Promote `laterality` to a real per-exercise attribute with a
library-wide default, editable per set

**What the user sees.** Everything from Option 2, plus: unilateral is no
longer just a device-local AsyncStorage guess - it becomes part of the
exercise's own record (via the existing, already-computed `laterality`
field, promoted from "silently stored, never read" to "drives default UI
state everywhere the exercise appears": builder, exercise library, logger).
The per-exercise toggle in the overflow sheet becomes an override, not the
only source of truth - so a custom exercise the user creates in the builder
can be marked unilateral once and it is consistently treated that way in
every routine and every session, not re-guessed every time.

**What gets stored.** Still no `workout_sets` schema change (Option 2's
storage applies unchanged). The only schema question is whether
`exercises.laterality` should gain a companion `is_unilateral` boolean the
UI actually reads (since `laterality` today is a best-guess regex output,
not a confirmed user fact) - additive, nullable, non-breaking either way.

**Volume/PR/history maths.** Unchanged from Option 2.

**Builder implications.** Real ones: the builder gets a "Log per side"
switch when adding/editing an exercise (custom exercises especially, since
the name-regex in `deriveLaterality` cannot see user intent, only guess from
the name), and the exercise library detail view could show the same.

**Effort:** L. Everything in Option 2, plus builder UI, plus exercise-library
surface, plus deciding whether to trust/override the regex-derived
`laterality` guess or require explicit confirmation (a wrong guess on a
custom exercise would silently mis-route logging).

---

## 4. Recommendation

**Option 2**, novice-first. The founder's own scenario - one arm, rest a
little, then the other - is a workflow, not just a labelling convention, and
Option 1 doesn't give the user that workflow at all; it only cleans up the
confusion problem JEFIT's users complain about. Option 2 gives a first-time
user a walkthrough that looks exactly like the superset heads-up they may
already have seen (same shape, same calm numbered steps, same clear escape
hatch), so it is self-explanatory by reusing a pattern the app has already
taught, costs nothing in schema risk (no new columns, reuses `notes` +
`actual_reps` exactly as the existing cluster-set feature already does), and
directly answers the "how other apps do it" research: nobody else has
solved this, so matching the market's status quo (Option 1) leaves the
founder's own scenario unaddressed, while Option 2 is a genuine, low-risk
differentiator. Option 3 is the more complete long-term shape (especially
for custom exercises, where the name-regex can't guess) but is more machinery
than the immediate ask requires and should only be taken on with an explicit
decision, not bundled in by default.

---

## 5. Founder questions

1. **Which option to build?**
   a) Option 1 - finish the existing toggle only, no two-phase flow (S).
   b) Option 2 - two-phase per-side flow reusing the cluster-set pattern,
      logger-only (M). *(Recommended.)*
   c) Option 3 - Option 2 plus promoting `laterality` into a real,
      builder-editable attribute (L).
   d) Something narrower/different - specify.

2. **Auto-suggest source.** Should the "Log per side" toggle be auto-ticked
   from the existing regex-derived `laterality` field (fast, but it is a
   name-pattern guess, not a confirmed fact - e.g. it may mis-tag or miss a
   custom exercise), or should it always start off and require the user to
   opt in explicitly the first time (slower to discover, but never wrong)?

3. **Rest length between sides.** Reuse the existing intra-cluster rest
   timer value (20s, `ActiveWorkoutScreen.js:1587`/`:1616`) for the gap
   between side one and side two, make it a fixed different value (e.g.
   30-45s, closer to how lifters actually rest between arms), or let it
   default to a fraction of the exercise's normal configured rest time?

4. **What happens to the orphaned `left_reps`/`right_reps` columns
   (migration 054) and the old `formatPerSide`/`lowerSideReps` "legacy"
   code path** - leave them exactly as-is (display-only for historical
   sets, as they are today), or is there any appetite to also backfill/
   reconcile them once a real flow exists? (No action needed unless the
   founder wants this looked at - flagging only because Rule on parked
   items requires surfacing it, not deciding it.)
