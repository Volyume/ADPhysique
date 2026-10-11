# 11 Structure engine: build plan

Status: 2026-10-11, PLAN ONLY. Authority: `09-RESEARCH-FINDINGS.md` (the founder's research) as corrected in `10-RESEARCH-VERIFICATION.md`, inside the FIXED rules of `08-RULEBOOK-FRAMEWORK.md` Part 2. No code is written before the founder approves the rulebook values (08 Part 1, point 1) and answers Q1. No EAS build until the founder signs off the rendered plans (08 Part 1, point 3); the founder runs every build.

## Shape

- A new pure module, `src/lib/structure/` (no I/O, deterministic, JSDoc-typed like the rest of `src/lib`): `rulebook.js` (data), `checker.js` (09 B10), `engine.js` (09 section 10, stages S0 to S10), `patterns.js` (catalogue families to 09 B2 pattern keys).
- Behind a release switch `STRUCTURE_ENGINE`, off on main until the founder's sign-off, so main stays shippable at every merge.
- Kept from today's code (09 section 10): the exercise catalogue and its families, the time model and rest ladder, the block and RIR ladder, the credit table. Replaced: floors outranking limits, the permutation search and clash term, readiness that never blocks, the thin bonus, focus-first ordering, uncapped credits, silent exercise dropping.

## Phases (each lands with `npm run lint && npm test` green, a fresh-eyes Opus review against 09 and 10, then merges to main with the switch off)

1. **Rulebook data.** 09 B1 to B9 and section 5 as data; every value carries its grade and source. Corrections R1 to R5 from 10 applied.
2. **Checker.** 09 B10 C1 to C20 as pure functions returning coded failures, each with a unit test written to fail on the violation. First use: run today's planner through it and publish the baseline (the before picture for the sign-off page).
3. **Patterns and kits.** Every catalogue family mapped to a B2 pattern key with its credits and joint tags; each equipment kit's available patterns; the barbell_plates side-delt gap closed with the existing Plate Lateral Raise; untrainable muscles reported per 09 section 7.
4. **Engine.** S0 normalise (focus de-duplicated then capped at 3; no silent clamp), S1 template (09 B7, cyclic shift only), S2 targets (B3, B4), S3 capacity (time model), S4 patterns (visit rotation, catalogue order then id), S5 sets (minimums first; caps; credits never push a muscle past its maximum), S6 credits, S7 order (compound tiers, then P before S before M), S8 weeks (B9), S9 validate (a failing build is never returned as a plan: the result is an honest refusal naming the minimum days or minutes), S10 report (real minutes, shortfalls).
5. **The gate.** Every category x 2 to 6 days x 30, 45, 60, 75, 90 minutes x 6 kits x focus picks (none, one, three, duplicates) x 3 experience levels, with the real library: every plan passes C1 to C19 or is an honest refusal; 09 B12's edge cases as tests.
6. **Integration.** Plan creation (the new-planner path and the style-pool path) routes to the engine; plan_facts version 3 carries the sessions, slots, week ladder and check results; weekly serving reads the ladder within the caps; the preview shows the real length and any refusal in plain copy (British English, calm voice, no em dash).
7. **After the build (09 section 11).** Weekly serving, session plus or minus one, readiness ease, one-off and permanent swaps, typed sets and manual edits (confirm on a hard fail), check-ins (raise, hold, reduce per 09 section 8; a check-in never opens an exercise the checks reject), early deload and injury ramp, rebuild, "update your plan", next block, library, kit and manual plans. Every path re-runs C1 to C19 over the rest of the block; a failure blocks the change.
8. **People already on plans.** Active plans built by the old planners are rebuilt through the engine at the next session (the existing rebuild mechanism, facts version 2 to 3), keeping their exercises wherever the checks allow. Hand-built plans are left as built and checked; a hard-check failure shows a calm note, never a silent change. The founder's own hand-built plan is untouched.
9. **Sign-off page.** A rendered page of every category at every day count (60 minutes, full gym, intermediate) and the variants, each with its check results, beside the before figures from map 04 and 05. The founder approves it, then runs the build.

## Recovery path if a session dies

Branch `planner/structure-engine-rulebook`. Each phase is committed on it before review; the handover names the last landed phase. Re-run `npm run lint && npm test`, then resume at the next phase.
