# Cross-surface data consistency audit — 2026-07-30

## WHY THIS AUDIT EXISTS: the previous one missed a big trust breaker

Founder, 2026-07-30: "Make sure nothing is missed I asked for an audit before
that you apparently did for trust breakers and this is a big one."

They are right. The 2026-07-27 sweep
(`docs/audit/pre-release-sweep-2026-07-27.md`) ran four lanes — copy
consistency, layout/sizing, data entry/keyboard, runtime crash safety — and
found and fixed real defects. But EVERY lane examined surfaces IN ISOLATION.
Not one of them asked the question that matters most for trust:

> **Is the same fact computed from two different sources that can disagree?**

That question was never in scope, so no agent looked for it, so the answer went
unfound. The gap was in the SCOPING, not in the agents' work.

## What slipped through

The training-block week renders three different ways on one device, same day,
same block:

| Surface | Shows | Source |
|---|---|---|
| Today card chip | Week 1 of 5 | `readinessSummary.js:96` <- `getCurrentMesocycleWeek()` (DB row) |
| Today "Your block" sheet | Week 1 of 5 | `HomeBlockShapeSheet.js:36` -> `BlockShapeCard` <- same |
| Train tab card | Week 2 of 5 | `PlansScreen.js:833` <- `blockAdvisor.js:222` -> `getBlockStatus()` (dates) |
| Training blocks screen | Week 2 of 6 | `MesocycleBuilderScreen.js:148,190` <- local `getCurrentWeek()` (dates) |

Four surfaces, three calculations, and TWO different fields for block length
(`planned_weeks` = 5 vs `durationWeeks` = 6). Start dates disagree too: 18 Jul
vs 19 Jul 04:58.

Root causes established before this audit was commissioned:
1. `getCurrentMesocycleWeek` (`database.js:3888`) reads the week off the most
   recent workout's `mesocycle_week_id`, and `startWorkout` (`database.js:2478`)
   links EVERY workout to `ORDER BY week_index ASC LIMIT 1` — always week 1. So
   that source is pinned to week 1 permanently.
2. `getBlockStatus` (`mesocycle.js`) signature is
   `(startDateMs, plannedWeeks = 5, nowMs)` — it silently DEFAULTS to 5, so a
   6-week block reports "of 5" whenever a caller omits the argument.
3. `getCurrentMesoWeek` (`mesocycle.js:71`) is the correct DST-safe date-based
   week function and is called nowhere in the app.

This is worse than a wrong label: `rirTarget` and `isDeload` come off the same
stuck week-1 row, so the RIR ladder cannot progress and the per-week MEV->MAV
planned-volume ramp is unused past week 1.

## The lesson, recorded so the next audit inherits it

A per-surface audit cannot find a cross-surface contradiction. Any future audit
of this app MUST include a lane that takes each user-visible FACT and asks how
many independent code paths can produce it. Single-source or divergent — no
third answer.

## This audit's lanes (three agents, 2026-07-30)

1. **Block/week state** — exhaustive consumer map for week, block length, start
   date, deload, RIR, phase; every divergence proven; the schema truth about
   which field is authoritative; behavioural damage beyond the label; and a
   single-resolver fix plan.
2. **Training facts** — session counts, weeks-running, tonnage, set counts, PRs,
   notification/widget recomputation, "last session", exercise/plan counts.
3. **Nutrition, body and check-in facts** — calorie target/remaining, macros,
   kcal-vs-kJ unit awareness, body weight (raw vs trend, unit rounding),
   check-in timing, weigh-in counts, water/steps/cardio, and trial/tier state.
   Any case where an ED-safety floor or gate applies on one path but not
   another is called out as critical.

Findings and rulings are appended below as each lane reports.
