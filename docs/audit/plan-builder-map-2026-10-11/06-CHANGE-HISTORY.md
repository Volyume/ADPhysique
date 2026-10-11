# 06 Change history of the planner, 4 to 10 October 2026

Every commit since 2026-10-04 that touched `src/lib/plan/`, `src/lib/planEngine.js`, `src/lib/planAutoGen.js`, `src/lib/exercise/continuity.js` or `src/lib/coachApply.js` (board and handover commits left out). Produced by `git log`; the subjects are the commit subjects as written at the time.

## Timeline

- **Up to 2026-10-03:** plans were built by the older generator, `src/lib/planEngine.js` `generatePlan`.
- **2026-10-04:** register D219 (founder order: rebuild the plan builder around recovery). The new planner was built behind a switch that was off.
- **2026-10-05 09:22, `4907cee`:** switch on (`src/lib/plan/release.js` `PLANNER_V2 = true`). From here every new plan, and every plan rebuilt at a person's next session, comes from the new planner. The older generator still runs when a style pool is present (see 02).
- **2026-10-05 to 2026-10-09:** D219 lanes, review fixes and founder answers.
- **2026-10-10:** the lead's changes, in reaction to the founder's report that plans dropped standard muscles (chest at one or two exercises, legs held low in men's physique). Five decisions were recorded in the register, `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`, under the D219 addenda dated 2026-10-10 (unnumbered, 2, 3 and 4). Each is summarised below with its effect as measured in 05.

## Every commit

| Commit | When | Subject |
|---|---|---|
| dafc86f | 2026-10-04 12:32 | D219 lane A1: the plan's science table, the role-aware bands and prescribe() |
| ea78ee6 | 2026-10-04 14:32 | D219 lane B2: the new plan builder, not yet wired into the app |
| 301858a | 2026-10-04 14:45 | Planner: judge structures by what their sessions hold, not the clock |
| 748f3fc | 2026-10-04 14:58 | Planner: a focus muscle's sets are never cut (founder rule 2026-10-04) |
| 6cab20d | 2026-10-04 15:02 | Planner: no session mixes the halves of the body |
| 5876a16 | 2026-10-04 15:07 | Planner: focus sets may pass the D45 session ceilings (founder 2026-10-04) |
| 00177a4 | 2026-10-04 15:09 | A focus muscle's isolation exercise may take 4 sets (founder 2026-10-04) |
| 3803513 | 2026-10-04 15:15 | D219 lane S1: the plan's facts stored, and every week served through prescribe() |
| 99e15ee | 2026-10-04 15:20 | D219 lanes B1 and B6: the standard catalogue, and new plans from the new planner (switch off) |
| 69407e0 | 2026-10-04 16:02 | D219 lane B7: curated credits, slot facts, preview, continuity, the Q5 ladder, typed counts |
| 4907cee | 2026-10-05 09:22 | D219: new plans are built by the new planner (PLANNER_V2 on) |
| d86eb5f | 2026-10-05 12:03 | D219 lane A3: check-ins placed set by set (design 4.10) |
| 9b11c87 | 2026-10-05 12:34 | D219 lane B5: every plan fact shown with its reason (design 6) |
| 8763220 | 2026-10-05 12:35 | Store a plan's session length facts, so a long session says so |
| 839eace | 2026-10-05 13:32 | D219 lane C1a: the planner's fixed-structure mode (register build ruling 5) |
| 49cc47e | 2026-10-05 13:58 | D219 lane R3: the session's +1 under the caps, the learner's reach, the learned factor, the forecast |
| cdd27e9 | 2026-10-05 14:42 | D219 review fixes: served order, exercise floors, full-body big five, recovery-safe maximum |
| 62d7d6a | 2026-10-05 14:45 | Planner: letter each kind of session in the order it is trained |
| c4aa58c | 2026-10-05 14:54 | D219: swaps keep their caps and move their sets; plans people follow are rebuilt at the next session |
| 4403e3e | 2026-10-05 15:02 | D219 review fixes: check-ins stop at the recovery-safe maximum; the +1 top; the ramp reads the person's history |
| 8ddf8ea | 2026-10-05 15:10 | D219: the recovery-safe maxima hold together; check-ins on such a plan stay in its exercises |
| 7012d17 | 2026-10-05 17:09 | Planner: big muscles first when time is short |
| d37493f | 2026-10-05 18:04 | Planner: a slower recoverer's lower session cap (design 4.4) |
| f2ba8bb | 2026-10-10 04:51 | Planner: the standard floor, every muscle's standard kept in every goal (WIP checkpoint) |
| 7f3e10e | 2026-10-10 04:52 | Planner: a session's half is the half most of its muscles are in |
| d5f8757 | 2026-10-10 05:14 | Planner: the standard floor's week server, tests and matrix fixes |
| 4a28773 | 2026-10-10 05:18 | Planner: trim rest on a graded ladder before a session is allowed to run over |
| d411df7 | 2026-10-10 05:21 | Planner: the old generator's suites pin the standard, not the cut |
| 70345ba | 2026-10-10 06:54 | Planner: the standard per category, from the cited research |
| 0dac0bb | 2026-10-10 06:58 | Planner: figure's 3-day week trains triceps twice; the old generator's pins read the category lists |
| 9398ce9 | 2026-10-10 07:20 | Legacy generator: a division's session names are identity, never relettered by position |
| 070db3f | 2026-10-10 09:01 | Men's physique: one leg day a week at every day count; a muscle's own day is its heavy session |
| 4be8f2e | 2026-10-10 09:08 | Planner: a week's muscles spread by running session load |

## What each 10 October commit changed, in the code

| Commit | Change | Files |
|---|---|---|
| `f2ba8bb` | Every growth muscle made a standard role in every goal; a division overlay below 1.0 no longer made a muscle maintenance. A direct floor per muscle (`STANDARD_DIRECT_FLOOR`) added and placed on the muscle's own exercises after the fractional floors, ignoring the session length and the D45 ceilings of 8 exercises and 25 sets (`ignoreTime: true`). Floors for big muscles placed past the clock. A division list stopped limiting where a muscle trains: a muscle named in fewer sessions than its standard needs may train in any session of its body half. The big five muscles trained twice from 3 sessions. Readiness fixes, light and heavy splits and the session-count search changed so that none may leave a muscle below its direct floor; the plan's own per-muscle fractional cap may be raised to place the floor. | roles.js, science.js, families.js, planner.js, allocate.js, planEngine.js (DIVISION_MATRIX) |
| `7f3e10e` | A session counts as one body half by the majority of its muscles. | families.js |
| `d5f8757` | Week server: a set can move off an exercise that credits a muscle already over its cap; a crediting set can move to another session. Session balancing keeps the allocator's split where refilling would break a cap. Equally spaced sessions prefer dedicated ones. Continuity applies a reviewed rep range to every slot of the exercise. Tests re-pinned. | prescribe.js, planner.js, families.js, continuity.js, tests |
| `4a28773` | Rest ladder: a session past the chosen length shortens rest step by step (small-muscle isolation to 60 s, all isolation to 60 s, machines to 90 s, moderate compounds to 120 s, heavy compounds to 150 s) and then reports what is still over. No exercise or set is removed for time. | allocate.js, explain.js |
| `d411df7` | Older generator's tests re-pinned to the new lists. | tests, planEngine.js |
| `70345ba` | Per-category standard: `src/lib/plan/divisionStandard.js` (direct floors and sessions per week per muscle per category, each with a cited source line from research files 06 to 09 in `docs/audit/plan-builder-science-2026-10-04/`). DIVISION_MATRIX rewritten for every division and day count. A division list became authoritative for where a muscle trains (it trains in every session the list names). A de-emphasised muscle held at its floor with weight 0. A muscle trained once a week opens with its compounds. Abs may fall back to any session. | divisionStandard.js, roles.js, planner.js, allocate.js, families.js, planEngine.js |
| `0dac0bb` | Figure 3-day list: triceps added to a second session. Older generator: a muscle trained in two sessions rotates its roles by its own visit count. | planEngine.js, tests |
| `9398ce9` | Older generator: a division's session names are kept as authored after recovery reordering, instead of relettered by position. | planEngine.js |
| `070db3f` | Men's physique: one lower-body session at every day count; 4-day list Upper A (Width), Legs + Abs, Upper B (Detail), Shoulders + Arms; 6-day list push, pull, legs, push, pull, shoulders and arms. In a division week, the session whose list names a muscle first becomes its heavy session for the light and heavy split. | divisionStandard.js, planEngine.js, planner.js |
| `4be8f2e` | Each muscle's sessions chosen by the running number of muscles already placed in each session (spreads 3-day full-body weeks). | planner.js |

## The 10 October rulings and their measured effect

Figures from 05-BEFORE-AND-AFTER.md, all 1,440 combinations, 9 Oct against now:

- The planner's own readiness check fails in 33% of plans on 9 Oct and 80% now.
- Back-to-back sessions 24 h apart that train the same muscle directly: 6% on 9 Oct, 37% now.
- Sessions over 8 exercises or 25 sets: 17% on 9 Oct, 79% now.
- Sessions more than 5 minutes past the chosen length: 28% on 9 Oct, 80% now.
- Average weekly direct sets: 71.9 on 9 Oct, 109.1 now. Average exercises per session: 5.9 on 9 Oct, 9.3 now.
- Plans with a growth muscle below the 10 October floors: about 100% on 9 Oct, 38% now. Raising these floors was the purpose of the changes; the cost is the rows above.

The mechanism, from the code: on 10 October the direct floors were made to outrank the session ceilings, the session length and the readiness check (`allocate.js` floor steps with `ignoreTime: true`; `planner.js` `keepsFocusFloor` rejecting light caps that leave a muscle below its direct floor; the readiness-fix acceptance test requiring every muscle to keep its direct floor; the final standard guard in `evaluateFamily` that drops light caps and raises fractional caps until the floors are placed). When the floors and recovery could not both be met, the floors won and the readiness check reported a failure.
