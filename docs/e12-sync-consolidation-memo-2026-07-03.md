# E12 — Sync consolidation decision memo (Options A/B/C)

Date: 2026-07-03. Memo only, no code. Every factual claim is grounded in
`docs/sync-architecture-evidence-2026-07-02.md` (file:line references there);
this memo adds the options analysis and a recommendation. Constraint from the
programme: whichever option is chosen executes AFTER the E1 programme
(complete) and never concurrently with other sync work.

## The truth in one paragraph

Two engines own the cloud. The registry path (21 tables, declarative
strategies, tombstones, per-call Article 9 + sign-out guards, a regression
matrix over every table) owns the food/health/coaching periphery. Legacy
`sync.js` (1,922 lines) still owns the training core: workouts, sets,
routines, programmes, mesocycles, plus ~16 more tables, with hard deletes,
partial watermarks, and 12 tables that have NO test coverage at all. Three
tables are written by BOTH engines (users_profile, weekly_checkins_v2,
body_metrics), and only the legacy path carries `sex` to users_profile. On
top sits a registry `sync_queue` that was built but never fed and never
drained: its rows can only mislead the Settings "changes waiting" count.

## What matters here (the only lens)

Risk to user data, then maintenance velocity. Nothing in this memo is
user-visible on the day it ships; all of it decides whether a two-device
user in 2027 sees resurrections, lost edits or silent drift.

---

## Option A — finish the registry migration (big bang)

Move all ~21 legacy tables onto registry handlers, wire or delete the orphan
queue, retire sync.js.

- **Data risk: HIGH during, lowest after.** The migration crosses the app's
  most valuable rows (workouts/sets). Four semantic mismatches must be
  designed, not just ported: dedupe-by-name ID rewriting on exercises, the
  user_prefs key/value namespace with regex exclusions, hard-delete →
  tombstone conversion (needs founder-run cloud migrations adding
  deleted_at to the training tables), and the double-writer retirements.
  Twelve of the tables being moved have zero tests today; porting untested
  behaviour is exactly where sync data loss is born.
- **Effort: XL.** ~15 new handlers + cloud migrations + a two-device manual
  test plan per family. Realistically several weeks of gated work.
- **Year two if chosen:** the best outcome (one engine, one queue, one
  conflict model) — IF it completes. The historical failure mode of big-bang
  migrations is abandonment at 60%, which would leave THREE conventions
  (registry, legacy, half-ported). That risk is the argument against A as a
  single push.

## Option B — freeze legacy as the permanent owner of the training core

Document the split as intended, delete the dead registry queue, stop the
rot.

- **Data risk: LOW today, compounding.** The known bleeds stay: hard-delete
  resurrection on mixed fleets (confirmed constraint C1), the three
  double-written tables drifting stamps, `sex` riding only the legacy path,
  10 legacy pulls full-pulling every cycle. Each is survivable now; every
  one scales with users and devices.
- **Effort: S.** A doc, one deletion (orphan queue), a lint-style guard that
  new tables MUST use the registry.
- **Year two if chosen:** every new feature that touches the training core
  hand-rolls another legacy push/pull; the untested-12 list grows; the
  two-engine tax is paid on every sync bug forever. B is honest but it
  freezes the debt at its current interest rate.

## Option C — staged A: one table family per release, behind the full gate

- **Data risk: LOWEST overall.** Each step is small enough to review,
  test-cover FIRST (write the missing suites before moving the table), and
  device-walk. The dangerous semantics (workouts/sets hard deletes) go
  LAST, after the machinery has proven itself on low-stakes families.
- **Effort: L spread thin.** Suggested order:
  0. Delete the orphan registry sync_queue (pure debt; its depth already
     pollutes the UI number) and correct the "16 locked tables" comment.
  1. Retire the three DOUBLE WRITERS (move `sex` into the profiles handler
     FIELD_MAP; delete legacy per-save pushes for weekly_checkins_v2 and
     body_metrics, whose registry handlers already own the tables). This is
     the active bleed and it is small.
  2. Immutable/append-ish families with watermarks: morning_weights,
     coach_outputs, user_insights, adaptation_events, notes, goals,
     peak_week_plans, planned_muscle_volume (tests first — these are in the
     untested-12).
  3. Plan-shaped families: programmes, routines/routine_exercises,
     mesocycles/mesocycle_weeks (ordering semantics exist in the registry
     as list position; the orphan filter moves into the handler).
  4. exercises + custom_exercises (the dedupe-by-name rewriting needs a
     bespoke handler; the registry model tolerates bespoke handlers —
     foodDomain.js already is one).
  5. workouts/workout_sets LAST, with the tombstone cloud migration
     (founder-run) landing first so deletes stop being resurrection-prone
     before the ownership moves.
  6. user_prefs stays legacy or becomes its own bespoke handler (SD-8);
     decide at step 5, not now.
- **Year two if chosen:** one engine for everything that matters, reached
  without ever betting the training core on a single merge. The cost is
  discipline: each step is a release-gated commitment, and the split is
  temporarily MORE complex than today while families are mid-flight.

## database.js (6,954 lines) and the store (1,780): decomposition stance

Keep them single-file, and freeze their growth instead. The colocated
guard-test culture works BECAUSE the files are greppable wholes, and the
proven pattern for new domains is already in the tree (food domain owns
`food/db.js`, its own sync coordinator, its own suites). Decomposing the
existing files is churn across every import path in the app for zero user
benefit; the flip condition is mechanical, not aesthetic — if agent/human
edit collisions or merge conflicts in these files start costing real time,
split along the domain seams the food module already demonstrates. The
store: same stance; F7 selector discipline already contained its blast
radius.

## Recommendation

**Option C**, with step 0 and step 1 scheduled first (they are small, kill
the active bleed, and are safe to do the moment this memo is approved), and
a standing rule codified now either way: **no new cloud table ever touches
sync.js**. Flip conditions, stated plainly:

- If multi-device becomes a headline product promise on a date, accelerate
  to Option A as a dedicated project — C's pace would leave the training
  core resurrection-prone while marketing sells two-device use.
- If telemetry shows essentially zero multi-device usage after E7.2
  baselines accrue, Option B stops being lazy and becomes rational; the
  double-writer retirement (step 1) is still worth doing even then.

Founder decisions requested: (1) choose A/B/C; (2) if C, approve steps 0-1
to run in the next maintenance window; (3) confirm the tombstone cloud
migration for workouts/sets can be scheduled founder-run when step 5
arrives (it is the only step needing production DDL).
