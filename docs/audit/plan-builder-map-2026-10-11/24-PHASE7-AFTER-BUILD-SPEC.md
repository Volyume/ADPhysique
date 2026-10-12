# 24 Phase 7: after the build (lead rulings, 2026-10-12)

Authority: `11-BUILD-PLAN.md` phase 7 ("Every path re-runs C1 to C19 over the rest of the block; a failure blocks the change"; typed sets and manual edits "confirm on a hard fail"); 09 sections 8 and 11; phase 6 spec `23-PHASE6-INTEGRATION-SPEC.md` (R60 to R68). Everything here applies only to plans whose facts carry `structure.version === 3` (an engine plan). Every other plan behaves exactly as today. The switch `STRUCTURE_ENGINE` stays off on main.

## Lead rulings (D33)

**R70 A stored plan can be checked again.** The `structure` block stores everything `checkPlan` and `senseCheck` read, so the plan rebuilt from facts checks exactly as the plan the engine returned: each exercise keeps `extraJoints`, `solePattern`, `nextDayException`, `restSec`, `repRange`, `kind`, `pattern`, `peak`, `weeks`; the plan keeps `untrainable`, `overflow`, `focusTargets`, `focusUnmet` and `kitOffer` (as data). New pure functions in `src/lib/structure/stored.js`: `planFromFacts(facts)` (the checker's plan) and `recheck(plan)` -> `{ hard: [...checkPlan failures], sense: [...senseCheck codes] }`. Pinned by a test: for every plan in a sample sweep, `recheck(planFromFacts(structureFacts(...)))` equals the checks of the built plan.

**R71 One gate for every change.** Pure `applyChange(plan, change)` in `stored.js` returns `{ plan, verdict: 'ok' | 'confirm' | 'blocked', faults }`. Kinds: `setSets` (one exercise, from a week on, a fixed count or a ladder), `addExercise`, `removeExercise`, `replaceExercise`. The verdict compares the faults after the change with the faults before it (only NEW faults count, so an already-imperfect plan can still be edited where the edit adds no fault). Automatic paths (session plus one, check-ins, the injury ramp, rebuilds) treat any new hard fault as `blocked`. Changes the person makes by hand (typed sets, adding or removing an exercise, a permanent swap) get `confirm`: the person sees the plain reason from `messages.js` and may keep their change. It is their plan.

**R72 Compat fields follow the structure.** After any change saved to a structure plan, the version 2 fields are rebuilt from the structure block by the same function phase 6 uses (one source of truth), so every older reader stays consistent with what is served.

**R73 Session plus one and minus one.** Minus one is always allowed (less work). Plus one on a structure plan is allowed only if `applyChange(setSets, this week only)` adds no hard fault; otherwise the plus one is not offered (the safe direction, as today).

**R74 Readiness ease, early deload, injury ramp.** These only lower today's or this week's work and never touch the stored plan, so they need no check and work as today. The injury ramp, when it raises an exercise back towards the plan, never exceeds the plan's own ladder.

**R75 Swaps.** A one-off swap and a permanent swap offer only exercises for which `applyChange(replaceExercise)` adds no hard fault (the picker list is filtered; a blocked option is not shown). A permanent swap writes the new exercise into the structure block (same ladder, the new exercise's pattern, joints and rest) and refreshes the compat fields.

**R76 Typed sets.** `recordTypedSetCount` on a structure plan runs `applyChange(setSets, fixed count)`. `ok` saves. `confirm` shows the plain reason and saves only if the person confirms. The served count is the typed count, as today; the recovery week still halves it.

**R77 Manual add and remove.** Adding an exercise gives it the ladder `weeksFor(sets)` and runs `applyChange(addExercise)`; removing runs `applyChange(removeExercise)` (a muscle falling below its minimum is a new fault). Both use the confirm flow of R71.

**R78 Check-ins.** On a structure plan a check-in's raise, hold or reduce (09 section 8) is applied to the structure ladder from the next week on: a raise adds a set to an existing exercise of the muscle, smallest first, and opens a new exercise only if `applyChange(addExercise)` passes; a reduce takes a set from the largest. A check-in never opens or raises what the checks reject; a raise that cannot be placed is reported in the check-in's own words ("no room for more X this block"), never forced.

**R78a Check-ins reach the ladder (phase 6 review, BLOCKER before switch-on).** Both check-in writers (checkinPlan.js later-week rows, source 'coach', and the coach's apply in coachApply.js) change the structure ladder of the affected exercises on a structure plan, through R78, and refresh the compat fields (R72). Until this lands, the switch must not be turned on: phase 6 serves the stored ladder and would ignore a confirmed check-in change.

**R82 The effort a structure plan serves (phase 6 review).** `getSessionWeeklyAllocation`'s `rir` (the next-day exception) is read by every consumer that shows or seeds a set's target effort: the logger (ActiveWorkoutScreen), the week's plan sets (getCurrentWeekPlanSets) and the session adjustments. An exercise without an override keeps the block week's effort.

**R83 Answerable choices (phase 6 follow-up, BLOCKER before switch-on).** The preview offers the engine's options (more days, a longer session, without a focus pick, stay as it is) as controls the person can choose: machine-readable options on the dry-run result, an option control in PlanPreviewSheet built from its existing components and styles, and the four callers (Home, Plans, goal setup, Update your plan) re-preparing with the changed days, length or focus and committing that profile; onboarding's fit review gets the same for focus questions. Until then no engine sentence ends in "Choose ..." without a control beside it. The spacing line of the plan explanation makes no recovery claim for a structure plan.

**R79 Rebuild, update, next block, library, kit and manual plans.** Rebuild and "update your plan" already route through the engine (phase 6). Next block: "refine" builds through the engine; "repeat" and "continue" copy the structure block forward with a fresh ladder. Library and kit plans and hand-built plans are fixed programmes: they are never rebuilt; they are checked with the checks that apply to any plan (neighbouring sessions, per-session and per-exercise limits, joints; not the category template or the category minimums), and a hard failure shows one calm note on the plan, never a silent change. Phase 8 covers people already on plans.

**R80 Words.** Every new line a person sees comes from `messages.js` or is added there: British English, plain, calm, no em dash, describes rather than instructs (D204), the app's existing components and styles only.

**R81 Tests.** For each path: the change that passes, the change that adds a hard fault (blocked or confirm, as ruled), and the non-structure plan unchanged. The recheck round trip of R70.
