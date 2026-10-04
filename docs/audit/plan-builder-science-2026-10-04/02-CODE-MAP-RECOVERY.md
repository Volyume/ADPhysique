# D219 lane R2: the recovery model, next-session readiness and the Recovery screen

Lane R2 of programme D219 (read-only phase 1). Authority: register entry D219 (`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md:11848-11864`), read in full with its founder additions of 2026-10-04. Repo read: branch `claude/plan-builder-science`, head `8d37c576`. `git diff --stat aee1af4e..HEAD -- src` is empty, so R1's citations (head `aee1af4e`) still hold. Nothing under `src/` was changed. My scratch probes ran as temporary jest files inside the repo and were deleted; `git status --short` is empty. Probe sources and JSON outputs are outside the repo in `/tmp/claude-0/-home-user-ADPhysique/786bfebd-8f9e-5cc9-9432-3682cc10db7d/scratchpad/d219/R2/` (index in the appendix). Tests run at this head: `src/lib/recovery/__tests__` 12 suites, 276 tests, all pass; 29 suites, 625 tests across the Home, Recovery, Progress and volume files, all pass. Suggested save path: `docs/audit/plan-builder-science-2026-10-04/02-CODE-MAP-RECOVERY.md`.

## 0. Conventions and provenance

- `[OBS]` = read in the code at the `path:line` given, or produced by a probe that called the REAL functions. `[INF]` = my inference, with the reasoning. `[STOP-n]` = an ambiguity or a conflict with a pinned test or locked ruling, recorded and not interpreted (all in section 11). The numbering is this lane's own; R1's items are cited as "R1 STOP-n".
- R1 (`01-CODE-MAP-PLAN.md`) is cited, not repeated: 5.2 (sequencer facts), 5.3 (runtime authority for "next"), 5.4 (the ten sites that suggest or allow another next session), 6.4 (how an exercise reaches 6 sets), 7 (weak points), 11 (what the plan builder reads from recovery).
- Default probe profile: intermediate, 60-minute sessions, `full_gym`, goal `general`, phase `lean_gain`, average recovery, no weak points, age unknown. REAL `generatePlan` on the REAL 918-row corpus (`CORPUS.map(corpusEntryToSeedRow)` sorted `name ASC`, as R1). Served sets use the REAL `computeWeeklySessionAllocation` over a REPLICA of the block template ramp (`round(mev + (mav - mev) x i/4)` for weeks 1 to 5, week 6 = `mev`, raw `VOLUME_LANDMARKS`, as R1) and the default RIR ladder `[3,2,1,0,0,4]`. Time zone Europe/London; dates in October 2026 (BST).
- Strings the probes could not get by mounting a screen are labelled REPLICA (the Volume heatmap row line, its group header, the Coach review text: copied from the component's own template literals). Every other string was produced by the exported function that builds it. The 'adapted' landmark layer (3 or more feedback points per muscle) was not modelled; where a muscle has it, it outranks the plan layer.

## Headline findings (expanded below)

1. **The model is a per-muscle linear-decay residual-fatigue ESTIMATE of recovery of function (D201); nothing in it is measured.** `T = clamp(24, 168, base[muscle] x clamp(0.7, 1.5, sqrt(sets/6)) x speed x I(rir) x W x Fb)`. Each session contributes `F = clamp(0.25, 2, sets/6)` falling linearly to 0 at `end + T`. A muscle reads "recovered" at 90% of the fatigue from its LAST session cleared, which for one session is `end + 0.895 T` (section 1).
2. **Biceps recover faster than back by one convention, a factor of 0.80:** base 48 h against 60 h (`constants.js:77,82`) at every equal dose. The number is the Renaissance Periodization "consensus" tiering (`constants.js:50-54`), not a measurement; the one per-muscle citation (Soares 2015) gives no biceps-versus-back figure. Half-credit from rows and pulldowns pulls the two together in a real session (6 curls plus 6 rows: biceps T 58.8 h, back 60 h) (1.5).
3. **The per-muscle forecast exists and is never shown.** `projectRecovery` and `readinessAtProjected` are computed inside `recommendNextWorkout` and read ONLY by the swap rule (`nextWorkoutRecommendation.js:259,267-275,302-325`). The only reading any surface prints is readiness NOW, for the one limiting (lowest percent) muscle (2.3).
4. **No surface says "next: <session>, its muscles will be recovered by <time>".** Closest: the Recovery screen's "Upper B is next: Back is the least recovered of the muscles it trains, estimated 55% recovered, ready by tomorrow." It names one muscle, never the session's muscles; "tomorrow" there is that one muscle's ready-by day, not a statement about the session or the other muscles (2.7, 3).
5. **A session's "ready by" is its limiting muscle's time, not its last muscle's.** Probe: calves 11% recovered (ready in 28.2 h) limit a session whose quads (29%) are ready in 61.1 h; the printed words would be "Calves are estimated 11% recovered, ready by tomorrow." Pinned by `sessionReadiness.test.js:76` (2.5, [STOP-11]).
6. **"Next" is the first outstanding session by routine position, bounded by the calendar week.** Once the week's sessions are all resolved nothing is next until the 7-day step turns. Timing is the habit weekday (needs 2 full weeks) or NOW, and Home is barred from asserting scheduled days (2.1, 2.2, [STOP-4], [STOP-10]).
7. **Plan generation and the check-in do not consult the recovery model beyond the build-time sequencer** (`planEngine.js:38-39,3548-3553,3605-3606`: self-reported rating, opening dose, RIR 3, typical gap layout). The check-in side (`weeklyCoach.js`, `coachApply.js`) is pinned never to import `src/lib/recovery/` (ED-safety isolation). The learned factor has no caller in any plan-affecting module and `generatePlan` has no parameter for it (4, 8.3, [STOP-6]).
8. **The order that is optimal at the opening week stops finding recovered muscles as the block ramps.** Probe 4, typical layout, share of sessions at least 90% recovered at their own start, weeks 1 / 3 / 5: 3-day 3/3, 0/3, 0/3; 4-day 4/4, 2/4, 1/4; 5-day 4/5, 2/5, 1/5; 6-day 6/6, 4/6, 2/6. For consecutive training days no ordering of the same sessions fixes it (7.2).
9. **Personal learning (D210) is one whole-body speed factor** on a 5% grid from 0.75 to 1.40, starting at the recovery answer. It needs 8 counted comparisons (a muscle counts from 5), a spread of at least 0.10 and a clarity score of at least 10; it is stateless, recomputed daily, and shown on the Recovery card, the caption and each row's "Based on" line. In its own simulation it found nobody in either direction for any fixed schedule or any plan user (0 of 60 in 12 weeks); a varied schedule with no plan found 123 of 600 slow and 11 of 600 fast recoverers. D210 explicitly rejected personalising plan sequencing (8, [STOP-1], [STOP-2]).
10. **Beyond R1's ten sites:** Plans' "Start next workout" starts the programme-next while Home's Start starts the recovery override when one is recommended (the Plans comment says they cannot differ); the Recovery screen's "Still to do this plan week" lists every outstanding session's readiness; the swap rule fired in 0 of 14 in-order mornings of the steady-state probe and fires only after an out-of-order session (9).
11. **The weekly-set surfaces do not know focus, and the plan's own ramp reads as the limit.** No band, verdict, strip, summary, Recovery or check-in surface reads a focus muscle; only the Volume heatmap FIGURE marks division-raised muscles with a triangle, for physique-division plans. 27 credit biceps sets read "Too much" (in the error colour) on every volume surface for a biceps-focus plan and for a plan with no focus alike; 25 to 36 all read "Too much" under all three tables. Mechanism: the plan layer sets `mav` to the plan's static week-1 total, so a typical 4-day plan followed to the letter reads "Near the limit" on 12 of 13 muscles from week 2 and "Too much" on glutes and hamstrings in weeks 4 and 5 (probe 6); a biceps-focus plan serves 25, 30, 34 credit sets in weeks 3 to 5 (10).
12. **Copy law is tight and pinned:** describe-only (D204), "estimated" on every percent, no amber, warning, success or error tokens on the Recovery files, plain English (D207), no em dash, the 2026-08-03 absence guard on Home. Any new readiness line has to pass the D204 forbidden-words regex, which includes "focus on" and "deload" (5).

---

## 1. The recovery model (brief items 1 and 11)

Files: `src/lib/recovery/constants.js`, `muscleRecoveryModel.js`, `load.js`, `personalRecovery.js`, `recoveryPillar.js`, `ratingWords.js`; specs `docs/recovery-programme-2026-09-25/00-SPEC.md` and `14-PERSONAL-LEARNING-V2.md`; register D201 (`DECISIONS...:9804-10000`), D208 (`:10421`), D210 (`:10505-10594`, addenda to `:10997`).

### 1.1 Inputs

| Input | Source | Evidence | Enters as |
|---|---|---|---|
| Completed sessions | `getCompletedWorkoutsBetween(userId, now - 126 d, now + 1)`, soft-deleted dropped, oldest first | `load.js:240-290`; window `personalRecovery.js:112` (84 + 28 + 14 days) | only sessions ending within 14 days of now contribute (`muscleRecoveryModel.js:322`, `constants.js:137`) |
| Sets per muscle | the tracker's own allocator over the session's sets: primary 1.0, secondary 0.5 or the exercise's listed contribution, warm-ups and ballistic rows out | `muscleRecoveryModel.js:91-106`; R1 4.3 | credit sets `n`. Reps, load and logged effort never enter |
| Session end | `endedAt`, else `startedAt + durationMinutes`, else `+ 60 min` | `muscleRecoveryModel.js:70-77`; `constants.js:144` | the instant the decay starts |
| Recovery answer `userProfile.recoveryRating` | store, default `average` | `load.js:133-143` | speed 1.15 / 1.00 / 0.90 |
| Block week's RIR target | the workout's own `mesocycle_week_id` against its own block's week rows | `load.js:152-167,187-215` | `I`. It is the PLAN's target, not the logged effort |
| First-week flag | `week_index === 1`, or the first week after a week with `is_deload` | `load.js:152-167` | `W` |
| Ratings | the session's own `fatigue_level` (1-5) and `joint_discomfort` (0-3, or the max set value); `soreness_24h_before` (1-3) reported at the NEXT completed session when it began within 96 h (whole-body) | `load.js:187-233` | `Fb` |
| Learned speed | `personal.factor`, only when `personal.reason === 'adjusted'` | `load.js:367-376` | replaces the answer's speed factor |
| Clock | `nowMs` argument. Habit weekdays and median start minute are read only for the projection | `load.js:107-130,355-364` | |

### 1.2 Formulas [OBS]

For muscle `m` and session `s` with credit sets `n` on `m`:

```
D(n)   = clamp(0.7, 1.5, sqrt(n / 6))                                   constants.js:242-247 (saturates at n = 13.5)
speed  = learned factor clamped to 0.75..1.40 when adjusted,
         else poor 1.15 / average 1.00 / good 0.90                      constants.js:110,331-338
I      = 1.15 if rirTarget <= 1; 1.00 if 1 < rirTarget < 3;
         0.90 if rirTarget >= 3; 1.00 when absent                       constants.js:258-269
W      = 1.10 for a session in block week 1 or the first week
         after a recovery week, else 1.00                               constants.js:113
Fb     = max(1, (1.20 if sorenessNext >= 3 or fatigue >= 4 else 1.00)
         + (0.10 if joint >= 2 else 0))                                 constants.js:277-286
T(s,m) = clamp(24, 168, base[m] x D(n) x speed x I x W x Fb)  [hours]   constants.js:304-309,341-358
F(s,m) = clamp(0.25, 2.0, n / 6)                                        muscleRecoveryModel.js:109-113 (saturates at n = 12)
contribution(s,m,t) = F x min(1, 1 - (t - end_s) / T), floored at 0     muscleRecoveryModel.js:120-128
residual(m,t) = sum of contributions over sessions within 14 days       muscleRecoveryModel.js:134-140
peak(m)       = max(0.25, residual(m, end of the LAST session))         muscleRecoveryModel.js:191-194
recovered%(m,t) = clamp(0, 100, round(100 x (1 - residual(m,t) / peak(m))))   muscleRecoveryModel.js:249-258
status: >= 90 'recovered'; >= 75 'nearly'; else 'recovering';
        no session in 14 days: 'no_recent_session', reads 100          constants.js:140-141; muscleRecoveryModel.js:142-147,261-272
ready-by(m)   = first t at which residual <= 0.105 x peak               READY_FRACTION = 1 - (90 - 0.5)/100, muscleRecoveryModel.js:60,157-186
```

- For ONE session the percent is simply `100 x elapsed / T`, and ready-by is `end + 0.895 T` (pinned: `muscleRecoveryModel.test.js:109-125`).
- "Recovered" therefore means: at least 90% of the fatigue from the muscle's most recent session is estimated to have cleared, measured against that session's own peak (D201 addendum 7), where a peak includes any still-unrecovered earlier session (compounding). It is an estimate of recovery of function, never of adaptation (`constants.js:6-24`).
- The crossing is found exactly by walking the piecewise-linear breakpoints (`computeReadyAtMs`), not by search.
- `projectRecovery(map, atMs)` re-reads the SAME past sessions at a later instant (`muscleRecoveryModel.js:353-365`); it knows no future session.

Worked numbers (probes 1 and 2, real functions):

| Case | T (h) | Ready-by after end (h) | Percent at +24 h |
|---|---|---|---|
| chest, 6 sets, average, RIR absent | 60.0 | 53.7 | 40 |
| chest, 3 sets | 42.4 | 38.0 | 57 |
| chest, 12 sets | 84.9 | 75.9 | 28 |
| chest, 6 sets at RIR target 3 / 2 / 0 | 54 / 60 / 69 | | |
| chest, 6 sets, rating poor / good | 69 / 54 | | |
| chest, 6 sets, first week / soreness 3 | 66 / 72 | | |
| chest, two 6-set sessions 48 h apart | 60 and 60 | 52.4 after the second end | 50 at +24 h after the second |

`D` at 2, 3, 4, 6, 9, 12, 14+ sets = 0.700 (clamped), 0.707, 0.816, 1.000, 1.225, 1.414, 1.500.

### 1.3 Behaviours worth knowing [OBS unless marked]

1. **Percent is relative to the last peak.** At "ready" the absolute residual is 0.105 x peak: 0.63 set-equivalents after one 6-set session, 0.756 after the compounded chest pair above (0.126 F against 0.105 F), so the second session is ready only 1.3 h sooner than a single one.
2. **Two clocks.** Screens read 0.895 T (to 90%). The sequencer penalises `max(0, T - gap)^2` against the FULL T (`sequenceSessions.js:332-335`), so a gap of 0.9 T reads "recovered" on screen and carries a penalty at build.
3. **Intensity is the plan's week target, not what was done.** Per-set RIR is never captured (D210 "Rejected" list, `DECISIONS...:10563-10570`), so a session outside any plan reads I = 1.00 and a plan week at RIR 0 lengthens every muscle 15% whatever the person did.
4. **Saturation.** D saturates at 13.5 credit sets and F at 12, so a 27-set single session reads like a 13.5-set one (T = 1.5 x base, F = 2.0).
5. **Feedback is whole-body and lengthen-only.** One "sore 3/3" answer before the next session lengthens the PREVIOUS session's T for every muscle it loaded; fatigue 4 or more likewise; joint 2 or more adds 0.10. The next session must begin within 96 h (`load.js:225-233`).
6. **Day-granular words.** `readyClause` uses the civil-day difference (`nextWorkoutRecommendation.js:99-106`): "ready by tomorrow" covers 00:01 and 22:30 of the next day (probe 5); 2 to 6 days reads "ready by <weekday>"; 7 or more "ready in N days".
7. **Window.** 14 days. A muscle without a session in it is `no_recent_session`: it reads 100 for rules and is never "ready" in copy (RC-5). An unknown muscle key takes the most conservative base, 72 h (`constants.js:342`).
8. **No future.** Because the forecast reads only past sessions, "recovered by tomorrow" means "recovered by then if untrained in between" [INF].
9. **Ratings and first-week are in the screens' T but not the sequencer's.** `sequenceSessions.js:331-332` passes only dose, rating and RIR (no `firstWeek`, no ratings, no learned factor).

### 1.4 The learned speed inside the formula

Only `speed` changes: `personalFactor` replaces the answer's factor for every muscle and every session (clamped 0.75 to 1.40; `constants.js:331-338`). Probe 5, hours at factors 0.75 / 0.90 / 1.00 / 1.15 / 1.40: biceps (6 sets) 36 / 43.2 / 48 / 55.2 / 67.2; back (6 sets) 45 / 54 / 60 / 69 / 84; calves (3 sets) 24 / 24 / 25.5 / 29.3 / 35.6 (the 24 h floor binds at the two lowest). There is no per-muscle learned factor (8.1).

### 1.5 Every per-muscle difference encoded today (brief item 11)

**Recovery model:** the ONLY per-muscle recovery number is `BASE_RECOVERY_HOURS` (`constants.js:68-94`), four tiers. REFERENCE_SETS (6), the dose clamp, the intensity, first-week and feedback factors, the clamp 24-168 and the speed factor are the same for every muscle. There is no size-class field and no per-muscle learned speed. Probe 1:

| Muscle (line) | Base h | T at 3 / 6 / 12 credit sets (h) | Research landmarks MV / MEV / MAV / MRV (`algorithms.js:25-59`) |
|---|---|---|---|
| quads (70), hamstrings (71), glutes (72) | 72 | 50.9 / 72.0 / 101.8 | 6/8/14/20, 4/6/14/20, 0/4/14/22 |
| adductors (74) | 60 | 42.4 / 60.0 / 84.9 | 0/0/10/14 |
| back (77) | 60 | 42.4 / 60.0 / 84.9 | 8/10/16/25 |
| chest (78) | 60 | 42.4 / 60.0 / 84.9 | 4/6/14/22 |
| triceps (81) | 48 | 33.9 / 48.0 / 67.9 | 4/6/14/22 |
| biceps (82) | 48 | 33.9 / 48.0 / 67.9 | 5/6/14/22 |
| side (84), front (85), rear (86) delts, traps (87) | 48 | 33.9 / 48.0 / 67.9 | 0/8/16/26, 0/0/8/14, 0/6/16/24, 0/4/14/24 |
| forearms (89), calves (90), abs (91), neck (92), tibialis (93) | 36 | 25.5 / 36.0 / 50.9 | 2/4/16/22, 6/8/14/20, 0/4/16/25, 0/2/8/12, 0/2/8/12 |

**Biceps against back:** base 48 h against 60 h, ratio 0.80 at every equal dose (3 sets 33.9 / 42.4; 4 sets 39.2 / 49.0; 6 sets 48.0 / 60.0; 9 sets 58.8 / 73.5; 12 sets 67.9 / 84.9). With the speed factor both scale together (36 / 45, 43.2 / 54, 48 / 60, 55.2 / 69, 67.2 / 84 h at 0.75 to 1.40). In a real session the allocator credits biceps 0.5 per row or pulldown set (102 library exercises list biceps as a secondary, P3a), so 6 curls plus 6 rows is 9 credit sets on biceps (T 58.8 h) against 6 on back (T 60 h): ready 52.6 h and 53.7 h after the end, 41% and 40% at +24 h (probe 2D). The 0.80 shows on screen only when arm work is not supplemented by pulling.

**Where the numbers came from** [OBS, `constants.js:21-54,68-94`]: the header labels the per-muscle tiers "CONSENSUS (not measurement): Renaissance Periodization's stimulus-recovery-adaptation lengths (Israetel)": small muscles about 1.5-2.5 days, chest, back, triceps about 2-3 days, quads, hamstrings, glutes about 3-4 days. Table comments: lower body 72 h cites Goulart 2021 (back at 72 h) plus consensus; back and chest 60 h cite "24-48 h at a moderate dose (Soares 2015), 48-72 h at a high one (Ferreira 2017); consensus 2-3 days"; arms 48 h cite "single-joint work still down at 24 h (Soares 2015); consensus 1.5-2.5 days"; delts and traps "consensus"; forearms, calves, abs, neck, tibialis "consensus". [INF] 60 and 48 are the midpoints of the two consensus ranges (2-3 days, 1.5-2.5 days). As quoted in the code, Soares 2015 measured elbow-flexor torque after single-joint versus multi-joint work (8.4% down at 24 h after single-joint, baseline after multi-joint); it says "arms carry their own baseline" and supplies no number and no back comparison. So biceps 48 versus back 60 is a convention, not a cited measurement; the only base tied to a measured time course is the lower body's 72 h. Triceps sits with biceps (48) although the header groups it with chest and back; 48 h is inside both ranges. Whether the numbers are right is lane S Q5.

**Other per-muscle tables the model's neighbours carry:** research landmarks (above); `GENERATOR_LANDMARK_OVERRIDES` (`planEngine.js:302-317`: biceps MEV 8 / MRV 20, rear delts MRV 14, glutes 4/6/16, side delts MV 6 / MRV 20, traps MRV 26, abs MEV 6, forearms 0/0/16, adductors MRV 12); `WEAK_POINT_MAP` labels to keys (`planEngine.js:61-87`, private); `SINGULAR_MUSCLE_KEYS` for grammar (`nextWorkoutRecommendation.js:83`); `MUSCLE_PLAIN_WORDS` glosses (`MuscleRecoveryList.js`, e.g. biceps "front of the upper arm"). The experience, recovery, nutrition and age multipliers on MEV and MRV are the same for every muscle (`planEngine.js:98-132`).

---

## 2. Next-session logic (brief item 2)

### 2.1 Which session is next

`requiredSessions` orders the plan's routines by `position` (`blockProgression.js:194-216`); `resolveWeekSessions` marks each COMPLETED, ENDED_EARLY, skipped or OUTSTANDING by a fixed precedence (`:218-290`); `nextOutstandingSession` is the first OUTSTANDING by `order` (`:305-309`), so A then C leaves B next. `resolveProgrammePosition` walks candidate weeks `floor <= weekIndex <= calendarWeekIndex` before the recovery week and takes the first week with an unresolved session (`programmePosition.js:138-175`); the calendar week index is `floor(localDaysElapsed / 7) + 1` from the block start (`mesocycle.js:164-168`). When nothing is outstanding in a reached week the position is `all_reached_weeks_resolved` and `nextSession` is null (`programmePosition.js:158-175`). [OBS] consequences: finishing the week early leaves no next session until the 7-day step turns (Home shows the week-complete hero, `HomeScreen.js:1448-1454`); with no block or an unreadable position Home and Plans fall back to the plan's FIRST routine (`HomeScreen.js:1455-1458`, `PlansScreen.js:844-850`).

### 2.2 When it expects the next session

`nextLikelyTrainingTime` (`nextLikelyTrainingTime.js:58-88`) returns the next habitual weekday at the median start minute (default 18:00, `constants.js:147`); on a habitual day it is today at that minute if not yet passed, else NOW; with no habit it is NOW. The habit (`trainingHabitSchedule.js:51-139`): a 6-week window, current week excluded, at least 2 full weeks of history, a weekday counts when trained in at least `ceil(observed / 2)` of the observed weeks; the median minute uses the same window (`load.js:107-130`). It is "not a schedule and not an enforced rest day (D17)" (header). It is used ONLY as the projected time for the swap rule; no surface prints it.

### 2.3 Per-muscle forecast

`recommendNextWorkout` builds `projectedMap = projectRecovery(recoveryMap, projectedAtMs)` and `readinessAtProjected = sessionReadiness(planned, projectedMap)` for each outstanding session (`nextWorkoutRecommendation.js:259,267-275`). [OBS grep over `src/`, non-test] the only consumers of `readinessAtProjected` and `projectRecovery` are inside that file; `ReadinessCards.js:357,389` print `readinessNow.limitingReadyAtMs` and `minPercent` only. So each counted muscle's projected percent exists in memory and reaches no screen.

### 2.4 `sessionReadiness`

`sessionReadiness.js:39-91`: a muscle counts when the routine plans at least 2 PRIMARY sets on it; those sets come from the routine's static `recommended_sets` (`load.js:572-587`), not from the week's served sets. Verdict = the MINIMUM recovered percent over counted muscles (>= 90 ready, >= 75 nearly, else not_yet); `limitingMuscle` = the first muscle to reach that minimum; `limitingReadyAtMs` = that muscle's own `readyAtMs`; `weightedPercent` is display-only; a muscle with no entry or no recent session reads 100; `evidence` is false when none of the counted muscles has a session behind it. A routine whose planned sets cannot be read is `null` and never a candidate ("unknown is never ready", `load.js:560-587`).

### 2.5 The limiting muscle is not the last muscle [OBS, probe 2c]

Calves trained 4 h ago (6 sets) at 11%, ready in 28.2 h; quads trained 30 h ago (12 sets) at 29%, ready in 61.1 h; glutes 42% (34.4 h); adductors 50% (23.7 h). `sessionReadiness({quads: 6, calves: 4})` names calves and carries calves' `readyAtMs`: "Calves are estimated 11% recovered, ready by tomorrow.", while the session's last muscle is ready in 61.1 h. Pinned by `sessionReadiness.test.js:76` ("carries the limiting muscle's readyAtMs, not any other muscle's") [STOP-11].

### 2.6 Does anything reorder sessions for recovery?

Build time only: `sequenceSessionsForRecovery` once (R1 5.1, 5.2; `planEngine.js:3548`), persisted as routine positions. At runtime nothing renumbers or reorders the stored order: `recommended` changes only what Home displays and starts (`HomeScreen.js:1744-1746,1998-2005`), "Keep <name>" remembers per local day (`:2070-2080`, key `:191`); the person can pick another session from the sheet or reorder permanently in Plan detail (R1 5.1). The sequencer's own limits are R1 5.2 and D201 addenda 1 to 6; the only product sentence it writes is `whyThis.sequencing`, stored and never rendered (R1 11.2).

### 2.7 What the screens say, day by day [OBS, probe 2d, steady-state history, real functions]

Four-day upper/lower (Upper A, Lower A, Upper B, Lower B), habit Mon/Tue/Thu/Fri at 18:00, read at 09:00 after following the plan in order:

| Read at | Done | Programme next | Recovery screen sentence (`buildNextWorkoutSentence`) | Projected at | Forecast for that session at the projection (never shown) |
|---|---|---|---|---|---|
| Mon | none | Upper A | "Upper A is next. Every muscle it trains is estimated recovered." | Mon 18:00 | ready, every counted muscle 100% |
| Tue | UA | Lower A | "Lower A is next. Every muscle it trains is estimated recovered." | Tue 18:00 | ready, 100% |
| Wed | UA, LA | Upper B | "Upper B is next: Back is the least recovered of the muscles it trains, estimated 55% recovered, ready by tomorrow." | Thu 18:00 | ready, 100% |
| Thu | UA, LA | Upper B | "Upper B is next: Back is the least recovered of the muscles it trains, estimated 89% recovered, ready later today." | Thu 18:00 | ready, 100% |
| Fri | UA, LA, UB | Lower B | "Lower B is next: Quads are the least recovered of the muscles it trains, estimated 75% recovered, ready later today." | Fri 18:00 | nearly: quads 85%, hamstrings 99%, glutes 91% |
| Sat, Sun | all four | none | no next sentence | | |

Three-day full body (habit Mon/Wed/Fri): Mon "Full Body A is next. Every muscle it trains is estimated recovered."; Tue "Full Body B is next: Quads are the least recovered of the muscles it trains, estimated 19% recovered, ready by Thursday." (forecast at Wed 18:00: quads 65%, back 78%); Wed 53% "ready by tomorrow"; Thu 29% "ready by Saturday" (forecast Fri 18:00: quads 74%); Fri 65% "ready by tomorrow"; Sat and Sun no next sentence. [OBS] for this plan the screen says "ready by Thursday" or "by Saturday" for a session the habit puts a day earlier.

Other [OBS] forms: first week with only Upper A done, read Tuesday: "No recent session on the muscles Lower A trains." and still-to-do "Upper B · estimated ready by Thursday (Back 20% recovered)"; the Home hero line for the same fact omits the session name ("Back is estimated 89% recovered, ready later today.", `heroRecoveryLine`), the Recovery screen carries it. The swap fired in 0 of the 14 in-order mornings above; it fires after an out-of-order session (UA then LB, Thursday noon): "Lower A is next in your plan. Quads are estimated 24% recovered, ready by Saturday. Upper B is estimated ready now."

---

## 3. Every surface that shows recovery or the next session (brief item 3)

| # | Surface | Function (file:line) | What it says today |
|---|---|---|---|
| S1 | Recovery screen: answer line | `recoveryAnswerLine` (`ReadinessCards.js:303-314`, drawn `:980`) | "4 muscles still recovering, 2 nearly recovered, 8 recovered." / "All 8 muscles recovered." / "1 muscle recovered." Empty: "No session in the last 14 days, so there is no estimate to show." / "Each muscle's recovery shows here after your first session." (`:821-826`) |
| S2 | Recovery screen: next sentence | `buildNextWorkoutSentence` (`:340-366`, drawn `:982`) over `programmeNextLine` / `allClearLine` (`nextWorkoutRecommendation.js:150-185`) | the swap reason when one is recommended; "<Session> is next: <Muscle> is/are the least recovered of the muscles it trains, estimated N% recovered, <ready clause>."; "<Session> is next. Every muscle it trains is estimated recovered."; the mixed form "<Muscles> are estimated recovered; no recent session on <Muscles>."; "No recent session on the muscles <Session> trains."; nothing when planned sets are unreadable |
| S3 | Recovery screen: still to do | `buildStillToDoRows` (`:376-404`, drawn `:983-999`) | "Still to do this plan week", one row per OUTSTANDING session in programme order: "Upper B · estimated ready by tomorrow (Back 55% recovered)" / "... · no recent session on the muscles it trains" / "... · estimate not available" |
| S4 | Recovery screen: heading, figure, list, caption | `ReadinessCards.js:970-1022`; `BodyDiagramHeatmap.js:260-330`; `MuscleRecoveryList.js:85-183,337-346`; `recoveryByMuscleCaption` (`:139-144`); `RECOVERY_PERCENT_NOTE` (`:148`) | "Recovery by muscle", "Estimated from your sessions · last 14 days"; groups "Still recovering", "Nearly recovered", "Recovered"; row "Ready by Thursday · Trained 2 days ago"; detail "Thu 8 Oct: 9 sets as the main muscle worked" and "Based on: Time and sets"; caption "Estimated from how long ago each muscle was last trained and how many sets it had, adjusted for your answer to 'How's your recovery?' and your ratings. Not a measurement." |
| S5 | Recovery screen: learning card | `RecoveryLearningCard.js` | section 8.2 |
| S6 | Recovery screen: ratings | `ReadinessCards.js:880-940`; `ratingWords.js:56-64` | "Your ratings", averages of soreness, fatigue, joint; "Rate your last session"; "From your weekly check-in"; "You rated your last two sessions fresh and mild." |
| S7 | Progress root "Recovery" row | `buildRecoveryPillarCopy` (`recoveryPillar.js:23-72`; `AnalyticsScreen.js:170-186,212-243,496-499`) | "3 muscles still recovering and 2 nearly recovered" / "Quads will be the last to recover, estimated ready by tomorrow." / "All muscles recovered" / "No sessions in the last 14 days" |
| S8 | Home hero | `heroRecoveryLine` (`HomeScreen.js:2092-2100`, drawn `:2978-2988`) | the swap reason, or the programme-next line without the name ("Back is estimated 55% recovered, ready by tomorrow."), or the picked session's own line; a tap opens Recovery; "Keep <name>" (`:2989-3000`) |
| S9 | Home change-workout sheet | `recoveryLineFor` (`HomeChangeWorkoutSheet.js:101-191`; mount `HomeScreen.js:3411-3430`) | per session "Estimated ready now." or "<Muscle> is/are estimated N% recovered, <ready clause>." |
| S10 | Plan-week card | `progress/planWeek.js:187-209` | "in week 3 of your plan · Upper B is next": no recovery content |
| S11 | Workout summary, Plans hero, widget | R1 5.4 sites 7 to 9 (`src/lib/widgets/writer.js:45-50` is the widget file) | "Next up: <name>." / starts programme-next / names `routines[0]`: no recovery content |
| S12 | Plan reveal and detail | `whyThis.sequencing` (`planEngine.js:3605-3606`; `sequenceSessions.js:523-540`) | "Assuming a usual 4-day week, sessions are ordered to leave about 72 hours before the next session that trains the glutes, hamstrings and quads." Stored, not in `WHY_ORDER` (R1 11.2) |
| S13 | Consistency "Signs of building fatigue" | `ConsistencyScreen.js:298-330`; `useProgressData.js:381-396` | shown only when `shouldDeload` is true; lists its reasons; "It's a picture of how you've been recovering, not an instruction. Your plan sets your sessions." |
| S14 | What's New 2.4.0 and 2.5.0 | `WhatsNewSheet.js:73,86` | "Recovery can now learn how quickly you recover, from how your workouts go. 'Your recovery speed', under Recovery by muscle, shows how far it has got." |
| S15 | Volume surfaces | section 10 | "Too much", "Near the limit" and the rest |
| S16 | Notifications | `src/lib/notifications/*` (no recovery import, no volume or landmark reference) | nothing states recovery or a next session's readiness. Closest: winback "Whenever you are ready, your next session is waiting for you. Nothing has been lost." (`scheduler.js:1370`); activation "Your next session is ready in your plan whenever you are." (`NOTIFICATIONS_LOCKED.md:448`) |

**Does any surface already say "next: <session>, its muscles will be recovered by <time>"?** [OBS] No. S2 and S8 name the programme-next session and its LIMITING muscle with a percent and that muscle's ready-by day, computed NOW. They do not list the session's muscles, do not state the time of the session, do not forecast the other muscles, and do not use the projected reading (2.3).

---

## 4. Does plan generation or the check-in consult the recovery model? (brief item 4)

| Consumer | Reads recovery? | Evidence |
|---|---|---|
| `generatePlan` | the self-reported rating only: `computeLandmarks` multiplies MEV by 1.10 / 1.00 / 0.95 and MRV by 0.80 / 1.00 / 1.15 for poor / average / good (`REC_MULT`, `planEngine.js:106-110,133-154`); the sequencer with rating, `PLAN_OPENING_RIR = 3`, typical gap layout (`:3548-3553`); static `whyThis.recovery` (`:2850-2855`) and `whyThis.sequencing` (`:3601-3606`) | [OBS] |
| `buildPlanInputs` | passes `recoveryRating` only: no map, no learner (`planAutoGen.js:97-131`) | [OBS] |
| Weekly check-in (`weeklyCoach.js`, `coachApply.js`) | no import of `src/lib/recovery/`; pinned by `edIsolation.guard.test.js`; they clamp volume rows to their own band (`coachApply.js:260-307`) | [OBS] |
| Block ledger, `interBlock` | check-in-derived aggregates, not the map (R1 11.1) | |
| `sessionAdjustments` | per-muscle last-session feedback; spec 4.3 "a later decision may feed the estimate into it" | |
| Every `src/` non-test file that imports the recovery domain | `MuscleRecoveryList`, `RecoveryLearningCard`, `FatigueTrendCard`, `ReadinessCards`, `BodyDiagramHeatmap`, `HomeScreen`, `AnalyticsScreen` (display) and `planEngine.js:38-39` (sequencer and `PLAN_OPENING_RIR`) | [OBS grep of import and require statements] |

OBSERVED: no caller anywhere passes the recovery map, a per-muscle readiness or the learned factor to plan generation, set allocation or the check-in apply. `recoveryHours` supports a `personalFactor` option (`constants.js:304-309`) that the sequencer never passes (`sequenceSessions.js:332`).

---

## 5. Copy rules that bind any new readiness line (brief item 5)

1. **D204** (`DECISIONS...:10067-10074`): "the plan prescribes the sessions; no card, caption or tooltip tells the athlete to train easier or harder, monitor themselves, or take a lighter week. Surfaces DESCRIBE." Pinned by a forbidden-words regex over the Recovery files: `you should|should|consider|try to|make sure|take it easy|go lighter|lighter (day|week)|rest (more|up|day)|push (your|the|through)|hold your|pay attention|worth paying|needs? more attention|keep an eye|watch (your|for)|monitor|be careful|avoid|focus on|ease (in|off|back)|train (more|less|harder|lighter)|deload` (`ReadinessCards.recoveryByMuscle.test.js:787`); a second one for Consistency (`d204.consistencyDescribes.guard.test.js:32`).
2. **The "estimated" law** (D201 spec 4.2 and 6; D214 RC-5): every percent carries "estimated" (`RECOVERY_ESTIMATE_LABEL`; sub-line "Estimated from your sessions · last 14 days"; caption "Not a measurement"). Home and the sheet must never build a percent themselves (`HomeScreen.recoveryPercentGuard.test.js`: no template literal interpolates into a `%`; the only lines are the lib's strings). `nextWorkoutRecommendation.test.js:318` pins that no figure appears without the word. No evidence is never "ready" (RC-5): "No recent session on the muscles Upper A trains."
3. **D214 locked sentence shapes** on the Recovery screen: the answer line (Q7 = A), "<Session> is next: <Muscle> is the least recovered of the muscles it trains, estimated N% recovered, ready by tomorrow.", the still-to-do rows, the three group labels, the "Based on" lines, the caption and (i) (`RECOVERY_PERCENT_NOTE`: "The percent is how much of the fatigue from a muscle's last session is estimated to have cleared; 90% counts as recovered, 75% as nearly. ..."). Screen order is the founder's: by muscle, then speed, then ratings (ratings moved to the bottom 2026-09-26), pinned by `recoveryPlace.guard.test.js`.
4. **D210 card rules:** no "factor", "pairs" or "calibrat"; "Learned" only once something has been learned; every "not learning" state carries its reason; facts are ink, no amber (`RecoveryLearningCard.test.js:193-204,380-391`).
5. **Colour law** (D214 plan 7.0 rule 3): no `primary`, `warning`, `success` or `error` colour token on the Recovery files (`ReadinessCards.recoveryByMuscle.test.js:775-781`, `MuscleRecoveryList.test.js:504-505`, `RecoveryLearningCard.test.js:380-383`). The volume surfaces are a different family and do use `warning` and `error` (section 10).
6. **Voice doc** (`COACHING_VOICE_SYNTHESIS_LOCKED.md`): the honesty test ("Would this sentence still be true if the user did nothing but kept logging?"), numbers before narrative, no emotional inference, no collaborative "we" for a coaching decision, actor "your coach" or an impersonal sentence (never "the engine" or "the system"), no fake autonomy. Surface 7 "Cleared / recovery copy" is the ED-cleared flow, not muscle recovery. `docs/rules/plain-english.md` (D207): an adult who has never lifted must be able to say the sentence back; shorthand such as "limiter", "signal", "evidence", "coverage" fails; app vocabulary such as "volume" and "recovery week" is allowed with its gloss.
7. **No em dash, British English** (lint-enforced; the Recovery files are pinned `ReadinessCards.recoveryByMuscle.test.js:797-798`).
8. **No scheduled training days** (founder 2026-08-03, `DECISIONS...:7171-7173`, source `cross-surface-consistency-audit-2026-07-30.md:409-411`): "There are no scheduled training days." `HomeScreen.trainingDayBanner.guard.test.js` is an ABSENCE guard: Home must not contain "Today is a training day", "Next session: tomorrow", `@volyume_schedule_v1` or `trainedToday`. The habit schedule is "sanctioned ONLY for the soft reminder copy" (the guard's header) although D201's projection already reads the same habit.
9. **NOTIFICATIONS_LOCKED.md:** none exists for recovery today; a new one would be a new category with ED and quiet-hours suppression, a push budget and a one-per-topic rule (`categories.js`, `budget.js`, `scheduler.js`).
10. **ED and calm mode:** the recovery spec states "Calm mode on: everything above unchanged" (`00-SPEC.md:491`); nothing on these surfaces involves bodyweight or food. ED-safety modules must not import `src/lib/recovery/` (`edIsolation.guard.test.js`).

---

## 6. Tests that pin current behaviour (brief item 6)

By test names and headers (bodies read for the pins marked with a line).

| Area | Test | Pins |
|---|---|---|
| Constants | `recovery/__tests__/constants.test.js` | the exact base table (`:34-40`); label, reference dose 6, bands 90 and 75, window 14, first-week 1.10, rating and feedback factors; `doseFactor` sqrt clamp; intensity; feedback never shortens; clamp 24-168; unknown muscle 72; `recoveryHoursAcross`; `TYPICAL_WEEK_GAP_HOURS` rows sum to 168; `PLAN_OPENING_RIR` 3 |
| Model | `muscleRecoveryModel.test.js` | 0% at end, 50% at 36 h and 100% at 72 h for a 72 h muscle; ready-by = end + 0.895 x 72 h (`:125`); compounding; 14-day boundary (`:188-210`); no-session reads 100 (`:211`); ratings lengthen; `projectRecovery`; determinism; purity |
| Readiness | `sessionReadiness.test.js` | 2-planned-set threshold (`:23-47`); minimum percent names the limiting muscle (`:49`); carries the limiting muscle's own `readyAtMs` (`:76`); no-recent or absent counts 100 (`:87-104`); weighted mean is display-only (`:106`); no counted muscles reads ready with no evidence (`:121`) |
| Next workout | `nextWorkoutRecommendation.test.js` | the F1 rule and its candidate filters (`:96-131,197-260`); unknown never ready (`:150-196`); copy (`:281-330`); every figure carries "estimated" (`:318`); RC-5 forms (`:349-408`); fresh candidate (`:410-452`); determinism |
| Projection | `nextLikelyTrainingTime.test.js` | no habit collapses to now; today past its minute is now; walk to the next habitual day; no `Date.now()` |
| Sequencer | `sequenceSessions.test.js`; `planEngine.recoverySequencing.test.js` | lead fixed (`:267-316`); linear adjacency and wrap (`:318`); "reads 72 and 96" (`:122`); ties keep authored order (`:192,376`); determinism; N = 8 unchanged (`:418`); the spacing sentence (`:433-465`); generated order already at minimum penalty |
| Loader and learner | `load.test.js`; `personalRecovery.test.js`; `personalRecovery.simulation.test.js` | window, deload flag, soreness pairing, learned factor end to end, a failed injury read never degrades; pair rules and gates; calibration cases and `PERSONAL_LR_MIN` 10 (47 tests, 73 s) |
| Pillar | `recoveryPillar.test.js` | the Progress row's states and words; describes only |
| Isolation and purity | `edIsolation.guard.test.js`; `purity.guard.test.js` | `edPatternDetector`, `wellbeing`, `nutritionEngine`, `weeklyCoach`, `coachApply` import nothing under `recovery/`; four recovery modules have no I/O, clock or randomness |
| Recovery screen | `ReadinessCards.recoveryByMuscle.test.js`, `MuscleRecoveryList.test.js`, `RecoveryLearningCard.test.js`, `RecoveryScreen.rateLastSession.test.js`, `recoveryPlace.guard.test.js`, `AnalyticsScreen.d214.guard.test.js`, `BodyDiagramHeatmap.recovery.test.js` | builders and exact words; D204 regex; no amber; no em dash; order and place of the sections; the Progress row |
| Home | `HomeScreen.recoveryRecommendation.test.js`, `HomeScreen.recoveryPercentGuard.test.js`, `HomeChangeWorkoutSheet.recoveryVerdicts.test.js`, `HomeChangeWorkoutSheet.test.js`, `HomeScreen.trainingDayBanner.guard.test.js` | the override and "Keep"; no ad hoc percent; per-row verdict lines; the absence guard |
| Position | `blockProgression.test.js`, `programmePosition.weekComplete.test.js`, `planWeek.test.js`, `PlanWeekCard.test.js` | next-outstanding rule; week-complete; the plan-week subline |
| Volume words | `volumeStrip.test.js`, `volumeBandLabels.test.js`, `volumeInsightCopy.test.js`, `effectiveLandmarks.test.js`, `effectiveLandmarksPlanLayer.test.js`, `planVolumeTargets.test.js`, `VolumeHeatmapScreen.test.js`, `WorkoutSummaryScreen.volumeWords.guard.test.js`, `CoachReviewScreen.recoveryGate.test.js`, `algorithms.deloadBuckets.test.js` | the five band words (legend equals the map); the range wording; precedence and the plan layer (`mav` = planned); strip legend; summary badges; deload buckets |

No test pins a per-muscle forecast sentence, a "tomorrow" claim, or the maximum-over-muscles ready time.

---

## 7. Gaps against founder goals 1 and 5 (brief item 7)

### 7.1 Observed facts

**Goal 1 (recovery and volume balanced; the next session finds its muscles recovered; no fixed days):**
- The model reads past sessions only. The plan's future dose appears in no forecast, and the readiness check counts muscles from static `recommended_sets`, not the week's served (FQ-4 scaled) sets (`load.js:572-587`).
- The build-time spacing is judged once at the opening dose and RIR 3 against an assumed typical week (R1 5.2); 7.2 shows how the share of sessions that start recovered falls through the block.
- At runtime the only lever is the swap override (fired 0 of 14 in-order mornings, 2.7) and the person's own choice. For a person who follows the plan the runtime layer changes nothing.
- With no fixed days the projection is a habit weekday or NOW; the sequencer's layout is an assumption about the week, not about the person. The sequencer's T omits ratings, first-week and the learned speed (1.3 item 9).

**Goal 5 ("tomorrow is chest and arms, and by tomorrow they will be recovered"):**
- Exists: the next session's identity (`position.nextSession`); its muscles with at least 2 primary sets (`loadPlannedSetsByRoutine`, `load.js:551-587`); every muscle's percent and `readyAtMs`; `projectRecovery` for any instant; `nextLikelyTrainingTime`; the wording primitives `readyClause` and `muscleNameList`.
- Missing: any sentence listing the session's muscles; any statement tied to a time; the latest-ready muscle (2.5); a clock when there is no habit (projection = NOW); next week's first session when this week is complete (2.1); the week-aware served dose in the muscle list.
- The inputs to say it truthfully exist today; no function combines them [INF].

### 7.2 Readiness at the start of each session through the block [OBS, probes 4 and 4b]

Method: real `generatePlan`; served dose per session from `computeWeeklySessionAllocation` for the stated week over the ramp REPLICA; three earlier weeks of the same week-type as completed 60-minute sessions (steady state); each session of the evaluation week read with `buildMuscleRecoveryMap` and `sessionReadiness` at its own start. Layouts: typical (`TYPICAL_WEEK_GAP_HOURS`, Mon 18:00 first), even (168 / N), consecutive (back to back from Mon 18:00). Caveats: `isFirstWeek` false (week-1 T understated 10%); no ratings; steady state overstates carry-over early in a real ramp [INF]; R1's ramp-baseline artefacts inflate glutes, hamstrings and abs doses.

Sessions with verdict `ready` at their own start (week 1 RIR 3 / week 3 RIR 1 / week 5 RIR 0):

| Plan | Typical | Even | Consecutive |
|---|---|---|---|
| 3-day full body | 3/3, 0/3, 0/3 | 3/3, 0/3, 0/3 | 1/3, 1/3, 1/3 |
| 4-day upper/lower | 4/4, 2/4, 1/4 | 4/4, 2/4, 0/4 | 2/4, 2/4, 2/4 |
| 5-day | 4/5, 2/5, 1/5 | 4/5, 1/5, 0/5 | 4/5, 2/5, 1/5 |
| 6-day push/pull/legs | 6/6, 4/6, 2/6 | 6/6, 4/6, 2/6 | 6/6, 4/6, 2/6 |

Four-day typical, minimum percent and limiting muscle, weeks 1 / 3 / 5: Upper A 100 chest / 100 chest / 98 back; Lower A 100 quads / 92 quads / 82 quads; Upper B 100 chest / 80 back / 73 back; Lower B 100 quads / 59 glutes / 62 glutes. Three-day typical: Full Body A 100 / 86 quads / 79 quads; B 95 back / 63 back / 59 back; C 100 quads / 69 hamstrings / 60 hamstrings.

Dose against intensity, typical layout (week-1 dose at RIR 3 / week-1 dose at RIR 0 / week-5 dose at RIR 3 / week-5 dose at RIR 0), ready sessions: 3-day 3/3, 1/3, 1/3, 0/3; 4-day 4/4, 3/4, 3/4, 1/4; 5-day 4/5, 2/5, 2/5, 1/5; 6-day 6/6, 5/6, 5/6, 2/6. [INF] Both the ramp's dose and the RIR ladder cost readiness; the scorer judges only the first column.

---

## 8. Personal learning (brief item 8)

### 8.1 What it learns, from what, how much, bounds, revert, what it exposes

- **Learns** [OBS, `personalRecovery.js:1-111`]: how far the recovery ANSWER's factor should move, as ONE factor for the whole person, replacing the answer's factor for every muscle. Per-muscle learning was dropped: twelve simulated weeks found a slow recoverer for at most 14 of 60 athletes per muscle and a fast one almost never (header, D210 addendum 2).
- **Evidence:** a pair is a completed session B and the most recent earlier comparable session P of the SAME exercise on the SAME weekday, within 28 days, with the same effort target (both week RIR targets known and equal, or both outside any plan), neither in a recovery week, neither under an injury limit or inside its 14-day return period; load-based strength only (no assisted, timed or distance exercises); straight working sets only; B needs a session on the exercise's primary muscle in the 14 days before it; a change past 0.20 (log ratio) is dropped; a lift whose pairs repeat the same reps at least half the time is left out (`constants.js:161-232`; `personalRecovery.js:270-407`).
- **Outcome and model:** `y = ln(PI_B / PI_P)`, PI the mean estimated max of the first `k = min(3, sets in B, sets in P)` working sets; per muscle `y = a + g x days + s x x`, with `x` the difference in the model's recovered fraction at the start of B and P under a candidate factor and `s` held to 0.04-0.15 (`PERFORMANCE_SENSITIVITY_*`).
- **Decision:** the grid candidate (0.75 to 1.40, 5% steps) with least squared error is used only when counted pairs >= 8 (a muscle counts from 5), spread >= 0.10, and `workoutDays x ln(SSE_start / SSE_best) >= 10`; else the start stands with reason `too_few`, `fixed_reps`, `no_spread` or `not_clear` (`personalRecovery.js:451-570`).
- **Bounds:** factor 0.75 to 1.40; each session T stays within 24 to 168 h. **Revert:** nothing is stored. The result is recomputed from the last 84 days (126 days read) with a same-day memo keyed on everything it reads (`load.js:456-524`); if the evidence weakens, the reading returns to the answer's factor.
- **Exposes** [OBS, `load.js:378-380`; `personalRecovery.js:557-570`]: `{ factor, prior, pairs, reason, pairsByMuscle }` only. `personalRecoveryEvidence` also computes `workoutDays`, `spread`, `best`, `lr`, `fixedRepsPairs` and `fixedRepsWouldCount` (`:451-536`), which the learner drops. Empty history returns `{factor: 1, prior: 1, pairs: 0, reason: 'too_few', pairsByMuscle: {}}` (probe 5).
- **Reach** [OBS]: the calibration test (47 tests, run at this head) shows found-faster 0/60 and found-slower 0/60 for every fixed schedule (Mon/Wed/Fri, Mon/Thu, upper/lower 4-day, PPL 6-day), with and without a plan, except one cell (variable gaps, last set taken as far as it goes) with 1 of 60 found faster. D210: "On every fixed weekly schedule, and for every plan user in the simulation, it found none in either direction"; "on a varied schedule without a plan it finds 123 of 600 slow recoverers and 11 of 600 fast ones in twelve weeks" (`DECISIONS...:10921-10935`); "Lowering the gate to recover reach was refused by the session's safety check and is not pursued ... in twelve weeks it almost never moves anyone" (`:10985-10991`).

### 8.2 Every place the app shows what it has learned, and the words

- Recovery screen card `RecoveryLearningCard` (`ReadinessCards.js:1032`): title "Your recovery speed" (`RECOVERY_SPEED_TITLE`); subtitle "Learns from your workouts · estimated", or "Learned from your workouts · estimated" once learned; headlines "Faster than your first estimate", "Slower than your first estimate", "In line with the first estimate", "Not learning yet", "Still learning"; summaries such as "Your recovery is now estimated to take about 12% less time than the first estimate.", "Your workouts so far show no clear difference from the first estimate, so it stays the same.", "The rest between your workouts has not varied enough to learn from yet.", "Too few comparisons are left once exercises with the same reps every time are set aside.", "Learning starts after 8 usable comparisons."; evidence "Based on N comparisons of the same exercise on the same day in different weeks."; progress "N of 8 usable so far"; "How this is worked out" with the method, an example ("Quads after 6 sets: about 3½ days, up from 3 days.") and the footer "It starts from your answer to 'How's your recovery?' and only changes when your workouts show a clear difference. It's an estimate, not a measurement." (`RecoveryLearningCard.js:124-198,284-336`).
- Caption (`ReadinessCards.js:139-144`): when adjusted "...adjusted for your recovery speed (learned from your workouts) and your ratings. Not a measurement."
- Each row's "Based on" (`MuscleRecoveryList.js:176-183`): "Time, sets and your recovery speed" / "Time, sets, your ratings and your recovery speed".
- What's New 2.4.0 and 2.5.0 (`WhatsNewSheet.js:73,86`).
- Nowhere else: Home, the Progress root row, plan screens and notifications say nothing of learning [OBS grep]. Copy rules: section 5 items 3 to 5.

### 8.3 What is missing for the plan to use the learned speed [OBS]

1. **No caller:** only `planEngine.js:38-39` imports from the recovery domain, and it takes the sequencer and `PLAN_OPENING_RIR`; `generatePlan` has no parameter for a learned factor, `buildPlanInputs` does not read the learner, and `sequenceSessions.js:332` calls `recoveryHours` without `personalFactor` although the function supports it.
2. **Shape:** one whole-body scalar on a 5% grid; no per-muscle speed; `lr`, `spread` and `workoutDays` are dropped by `learnPersonalRecovery`, so a consumer must call `personalRecoveryEvidence` or the return shape must grow.
3. **Confidence:** `reason` and `pairs` only. `factor` equals `prior` both when there is no evidence and when the evidence says "the same"; a consumer tells them apart only by `reason`.
4. **Reach:** for plan users (the effort target changes weekly) the simulation found nobody in either direction, so a plan that read the learned speed would in practice read the answer's factor for plan users.
5. **Seam:** the learner needs 126 days of history through `load.js` (I/O); the engine stays pure only if the factor reaches `generatePlan` as an input, as `recoveryRating` does [INF].
6. **Rulings in the way:** D210 rejected "Personalising plan sequencing (`sequenceSessions.js`): a plan is built before any evidence exists; it stays on the population prior" (`DECISIONS...:10575-10576`; `14-PERSONAL-LEARNING-V2.md:269-273`; `00-SPEC.md:563-564`) [STOP-1]; the blockExplain rule that nothing is claimed as learned unless the plan contains it (`blockExplain.js:3-6`) governs any "the plan used your speed" line.

---

## 9. Every place that recommends, ranks or offers another next session (brief item 9)

R1 5.4 maps ten sites (recommendation, Home override, change-workout sheet, skip, Recovery sentence and rows, plan-week card, summary, Plans hero, widget, projection). R2 adds the code detail and the touch points.

**Additional or sharper facts [OBS]:**
- The recommendation rule is `nextWorkoutRecommendation.js:302-325`: programme-next `not_yet` at the projected time, another OUTSTANDING session `ready` there, under 2 planned sets on the limiting muscle, highest minimum readiness wins (ties programme order). Consumers: Home (`HomeScreen.js:1480-1550,1998-2005`) and the Recovery sentence (`ReadinessCards.js:342`).
- Home's Start target is `selectedWorkoutOverride || recoveryOverride || nextWorkout` (`HomeScreen.js:1744-1746`): when a swap is recommended, Start opens the recommended session. Plans' "Start next workout" opens `position.nextSession` (`PlansScreen.js:844-850`) under a comment that says it "cannot open a different workout from the one Home says is next" (`:839-841`). They differ whenever the swap fires.
- The Recovery screen's "Still to do this plan week" (S3) lists every outstanding session with its own readiness, in programme order (`perSession` sorted by `order`, `nextWorkoutRecommendation.js:...sort`); it ranks nothing but is the information a person would use to choose another session.
- Fallbacks to the FIRST routine: `HomeScreen.js:1455-1458` (no next session and week not complete), `PlansScreen.js:844-850`, the widget (R1 5.4 site 9).
- After the week's sessions are resolved nothing is next; the sheet still lets the person start any workout (`HomeScreen.js:1448-1453`).
- No notification names or recommends a session (S16).
- Observed firing: in the steady-state probe the swap fired in 0 of 14 in-order mornings; it fired only after UA then LB (2.7).

**What would have to change for the next session always to be the plan's own, with the Recovery screen describing its readiness** (facts about the touch points, not a design):
1. Remove or neutralise `recommended`: the rule `nextWorkoutRecommendation.js:302-341` and `buildReason` (`:218-230`); Home's `recoveryOverride` (`HomeScreen.js:1998-2005`), `keepProgrammeNext` (`:2070-2080`), the kept flag (`:191,1525-1537`), `heroRecoveryLine`'s swap branch (`:2090-2100`), the Keep control (`:2989-3000`), the sheet's Keep path (`:3417-3423`); `buildNextWorkoutSentence`'s first line (`ReadinessCards.js:342`).
2. Describe the plan's own next session: S2 already names it; goal 5 additionally needs the session's muscles, a forecast and the latest-ready muscle (7.1). `perSession`'s `readinessAtProjected` and `projectRecovery` already hold the forecast.
3. The same build must make the order robust to unknown spacing (the D219 clarification): 7.2 shows an order scored at the opening week and typical layout does not hold through the block or on consecutive days; ordering alone does not fix week 5 (dose and RIR move readiness as much as order).
4. Re-pin: `nextWorkoutRecommendation.test.js` (swap cases), `HomeScreen.recoveryRecommendation.test.js`, `HomeChangeWorkoutSheet.recoveryVerdicts.test.js`, `ReadinessCards.recoveryByMuscle.test.js` (swap reason), `sequenceSessions.test.js`, `planEngine.recoverySequencing.test.js` [STOP-3, STOP-12].

---

## 10. Every surface that judges a muscle's weekly sets or load (brief item 10)

### 10.1 Surfaces, tables and focus-awareness

Landmark tables in play [OBS]: **X** raw research `VOLUME_LANDMARKS` (biceps 5/6/14/22, back 8/10/16/25; `algorithms.js:25-59`); **R** the resolved table the display surfaces read, `manual > adapted > plan > profile > research` (`effectiveLandmarks.js:55-96`), where the plan layer is `mav = round(planned static weekly credit)`, `mev = min(profile mev, max(1, mav - 1))`, `mrv = max(profile mrv, mav + 1)` (`planVolumeTargets.js:88-120`) and the profile MRV for biceps ranges 12 to 32 across profiles (24 for intermediate, average recovery, lean gain); **A** adaptive landmarks, up to 4 sets either way from 3 or more feedback points (`algorithms.js:1146-1224`); **G** generator ceilings (biceps MEV 8, MRV 20 direct; `planEngine.js:302-322`); **P** the planned row's own band seeded from raw research (`database.js:5399`, R1 4.2).

| # | Surface | Function (file:line) | Table | Knows a focus muscle? | What 27 credit biceps sets read |
|---|---|---|---|---|---|
| 1 | Volume heatmap rows, group headers, figure | `VolumeHeatmapScreen.js:765-780` (`getVolumeStatus`), words `volumeBandLabels.js:17-23`, colour `theme.js:892-912` (`over_mrv` is `colors.error`), legend `BodyDiagramHeatmap.js:293-300` | R | Words and bands: no. The FIGURE marks division-raised or capped muscles with triangles, for physique-division plans only (`VolumeHeatmapScreen.js:437-496`; `BodyDiagramHeatmap.js:393-399,565-571`; `divisionDiff.js:31-55,118-129`; a general-goal weak-point plan gets no marker) | row "27 sets so far this week, range 6 to 24" (REPLICA of `:774-777`); group "Too much · 1"; "Too much" swatch in the error colour |
| 2 | Heatmap row tap | `getVolumeWhy` (`volumeInsightCopy.js:46-100`); source words "your plan" | R | no | "Past the most sets this muscle can recover from in a week: more sets now add fatigue, not growth. This target is what your plan programmes for this muscle each week." |
| 3 | Progress volume strip | `buildVolumeStrip` (`progress/volumeStrip.js:198-245`); table from `AnalyticsScreen.js:212-243` | R | no | "This week so far: 27 sets logged across 1 muscle · 12 under their range"; biceps segment tone `over`, legend "Too much" |
| 4 | Workout summary "This week's volume" | `WorkoutSummaryScreen.js:1995-2036`; tooltip `:1949-1957` | R | no | badge "Too much"; "27 sets · Too much: 6 to 24 sets a week"; the sentence in row 2; (i) "Too much: past the most sets the muscle can recover from in a week", "Near the limit: one more session and it may be too much". The line and why are withheld while the week is in progress (`weekJudgeable`, `:1995-2012`); the badge stays |
| 5 | Weekly check-in review | `CoachReviewScreen.js:112-132,296-303,493-517` | R | no | "Biceps - more sets than you can comfortably recover from" / "That is past the upper limit, the most sets a muscle can usually recover from in a week." (error colour) |
| 6 | Check-in "+N" apply | `computeVolumeApply` (`coachApply.js:260-307`) | P: biceps [6, 22] on DIRECT row targets | no (R1 7) | not a verdict; +3 in week 3 of the focus plan: row 10 to 13, served 28 direct (credit 34) |
| 7 | Deload over-MRV pass | `shouldDeload` (`algorithms.js:676-738`, over-MRV `:719-725`), `hasOverMRV` (`:930-938`) | X (mrv 22) | no | two weeks over: `{deload: false, reasons: ['More sets on a muscle than it can usually recover from, in 2 or more weeks']}` (12 of the 50 points needed); Consistency shows reasons only when `deload` is true (`useProgressData.js:391-392`); Home passes no exercise map, so over-MRV never counts there (`HomeScreen.js:1196-1206`) |
| 8 | Manual builder balance | `muscleStatus` (`ManualBuilderScreen.js:119-131`), warning `:228-236` | X, DIRECT sets only | no | "Biceps volume is very high. This may affect recovery." (error colour) above 22 planned direct sets |
| 9 | Adaptive session engine | `runAdaptiveEngine` (`algorithms.js:1111-1141`); `WorkoutSummaryScreen.js:733-748` | R | no | `nextWeekSets` clamped to the resolved mrv (24): hold at 27 with no feedback; recorded as an adaptation event (`:1070-1107`; the code comment says it surfaces in an Engine Log on the Coach tab, not verified) |
| 10 | Insights engine | `insightsEngine.js:85-86,200-225` | X | no | unreachable: `runInsightsEngine` and `getActiveInsights` have no caller outside `database.js:6929-6985` |
| 11 | Recovery screen, Progress row | `ReadinessCards.js`, `recoveryPillar.js` | none | no | no set-count verdict. For 27 sets over Mon, Wed, Thu at RIR 1, read Friday noon: "Biceps ... 31% recovered", "Ready by Sunday · Trained in the last 24 hours", detail "9 sets as the main muscle worked" three times, T 67.6 h per session; answer "1 muscle still recovering"; pillar "Biceps will be the last to recover, estimated ready by Sunday." |
| 12 | Notifications | `src/lib/notifications/*` | none | no | nothing judges sets |

[OBS grep] the word "overtrained" appears in no user-facing string. The words that read as "too much" are those in rows 1 to 5 and 8 and, as a recovery state, row 11.

### 10.2 Reproduction (probes 3a to 3e, 6)

**What counts:** the tracker judges CREDIT sets (primary 1.0, secondary 0.5; `calculateWeeklyVolume`). 47 library exercises have biceps as primary; 102 list it as a secondary at 0.5 (rows, pulldowns, pull-ups, chin-ups) (P3a). Scenario A is 27 direct biceps sets; scenario B is 18 direct plus 18 row and pulldown sets (+9 credit). Credit is 27 in both and they read the same on rows 1 to 5; only the strip's line differs ("36 sets logged across 3 muscles · 10 under their range" for B). 27 direct plus rows would read 36 or more, and 25 to 36 all read "Too much".

**Two plans** (real `generatePlan`, 4 days): without focus (goal general, phase lean gain): biceps 6 direct (Barbell Curl 3, Bayesian Curl 3) plus 5 indirect = 11 static credit, band R = 5/6/11/24 (source plan); with focus (phase `weak_point`, weak point Biceps): 12 direct (4 curls x 3) plus 4 indirect = 16 static, band R = 5/6/16/24. X is 5/6/14/22 in both.

Status of N credit sets against each table (excerpt of the 6 to 36 sweep):

| N | X research | R, plan without focus (mav 11) | R, plan with focus (mav 16) |
|---|---|---|---|
| 8 | Just enough | Just enough | Just enough |
| 9 to 11 | In range | In range | In range |
| 12 to 14 | In range | Near the limit | In range |
| 15 to 16 | Near the limit | Near the limit | In range |
| 17 to 22 | Near the limit | Near the limit | Near the limit |
| 23 to 24 | Too much | Near the limit | Near the limit |
| 25 to 36 | Too much | Too much | Too much |

**Served credit following the plan to the letter** (ramp REPLICA, weeks 1 to 5): without focus 11, 14, 17, 20, 22 (direct 6, 8, 10, 12, 14; per exercise 3 up to 7 sets); against R: In range, then Near the limit weeks 2 to 5. With focus 16, 21, 25, 30, 34 (direct 12, 16, 20, 24, 28): against R In range, Near the limit, then **Too much in weeks 3, 4 and 5**. Men's Physique division: 13.5, 17.5, 19.5, 23.5, 25.5 (Too much against X in week 4, against R in week 5).

**Every muscle, typical plans, against R** (probe 6): in a 4-day plan, 8 muscles In range and 5 Just enough in week 1; from week 2, 12 of 13 muscles read "Near the limit" (chest 12, back 17, biceps 14, glutes 15, hamstrings 16 ...); weeks 4 and 5 add "Too much" on glutes 25 and 29 and hamstrings 25 and 29. Against X: 3, 7, 8, 8 muscles Near the limit in weeks 2 to 5 and the same two over in weeks 4 and 5. A 5-day plan: week 4 "Too much" on chest 27, triceps 27, hamstrings 25, glutes 25; week 5 on chest 32, triceps 32, traps 30, hamstrings 29, glutes 29. A 3-day plan reads Near the limit on 11 to 13 muscles in weeks 2 to 5 and Too much on glutes and hamstrings in week 5. [INF] mechanism: `mav` equals the static week-1 total while the served ramp reaches about 2.3 times it by week 5 (R1 6.4), so every ramp week above week 1 sits above `mav` (measured for all trained muscles in probe 6, measured in detail for biceps).

**The exact words** a person sees that read as "too much": "Too much" (heatmap legend, rows, strip legend, summary and Coach review badges, in the error colour); "27 sets so far this week, range 6 to 24"; "27 sets · Too much: 6 to 24 sets a week"; "Past the most sets this muscle can recover from in a week: more sets now add fatigue, not growth. This target is what your plan programmes for this muscle each week."; "Biceps - more sets than you can comfortably recover from"; "That is past the upper limit, the most sets a muscle can usually recover from in a week."; "Near the limit: one more session and it may be too much"; "Biceps volume is very high. This may affect recovery." (plan editing); on Recovery, "Still recovering" at 31% with "Ready by Sunday". For a focus plan nothing says the muscle was chosen to be brought up or that the volume is within that intent. The row 2 sentence attributes the whole range to the plan though only the sweet spot (16) is the plan's total and the ceiling (24) comes from the profile [INF].

### 10.3 Where focus and priority muscles are stored, and whether surfaces can read them

- Profile: `userProfile.planWeakPoints` (up to 3 UI labels such as "Biceps"), `trainingGoal` (the division key) and `trainingPhase` (`weak_point` among them), in the store and the profile sync; edited at `ProGoalSetupScreen.js:446`, `PlanUpdateScreen.js:178`, `ProOnboardingScreen.js:1611,1836`; read into generation at `planAutoGen.js:97-131`. Labels map to keys through the private `WEAK_POINT_MAP` (`planEngine.js:61-87`). Surfaces can read the profile (the heatmap already reads `trainingGoal`, `VolumeHeatmapScreen.js:440`), but a listed weak point changes the plan only in phase `weak_point` for a general goal (R1 7, R1 STOP-6), so the profile list is not proof the plan raised the muscle.
- Plan side: `planned_muscle_volume` carries no focus column (`id, mesocycle_week_id, muscle, planned_sets, mev, mav, mrv, source, created_at, updated_at`, `database.js:557-568`; `source` marks seeding, not focus); routines and routine exercises carry none; `plan.weeklyVolumeSummary[ext].isWeakPoint` (`planEngine.js:2679-2686`) exists only on the generated plan object and is not persisted [R1 1.2 steps 6 and 8].
- Division priority: static `DIVISION_PROFILES[goal].priority` (`division/profile.js:368-370`, `divisionPriorityMuscles`) and the recompute `computeDivisionDiff` (`divisionDiff.js:86-129`, deltas of at least 2 sets) that drives the heatmap triangles and the routine-detail line "Built for Bikini: Glutes and Hamstrings elevated, Abs and Chest capped." (`divisionDiff.js:135-168`). That precedent covers physique divisions only.
- [OBS] a surface can know a muscle's intent today only for division plans (recompute) or by reading the profile plus phase; nothing records it per muscle on the plan.

---

## 11. STOP items (recorded, not interpreted)

- **[STOP-1]** D210 rejected personalising plan sequencing (`DECISIONS...:10575-10576`; `14-PERSONAL-LEARNING-V2.md:269-273`; `00-SPEC.md:563-564`) against D219's addition that the learning on recovery "can also adjust further" and that the person should see it. Which governs, and what "the plan used your speed" may claim (`blockExplain.js:3-6`).
- **[STOP-2]** Reach for plan users. D210 addenda record that the learner found none in either direction for any plan user and any fixed schedule, that lowering the gate was refused, and that "the reach for plan users is the open question this leaves ... it goes to the founder with the numbers" (`DECISIONS...:10921-10935`). I found no recorded answer. Whether to extend the learner's evidence (for example the effort actually reached) is a ruling.
- **[STOP-3]** D201 F1 and RC-20 (recommend, never silently switch; pinned by `nextWorkoutRecommendation.test.js`, `HomeScreen.recoveryRecommendation.test.js`, `HomeChangeWorkoutSheet.recoveryVerdicts.test.js`, the swap cases of `ReadinessCards.recoveryByMuscle.test.js`) against the D219 clarification (no surface recommends a different session or asks to reorder). Also open: whether the person's own freedom stays (Change workout sheet, "Blank workout", "Skip this workout", Plan detail reorder, and the Recovery screen's still-to-do rows); and that Plans and Home Start already disagree when the swap fires (9).
- **[STOP-4]** Goal 5's "tomorrow" against the 2026-08-03 ruling "There are no scheduled training days" and its absence guard (`HomeScreen.trainingDayBanner.guard.test.js`). A sentence that names a day must be a readiness forecast, not a schedule; the habit is sanctioned for reminder copy only yet D201 already projects with it. What a new user with no habit (projection = NOW) is told is open.
- **[STOP-5]** Copy clock and no evidence. The copy reports readiness NOW while the rule reads the projected time ("TWO CLOCKS, DELIBERATELY KEPT APART", `nextWorkoutRecommendation.js:43-52`); and "no evidence is never ready" (RC-5) means a first-week lower session reads "No recent session on the muscles Lower A trains." Goal 5's sentence needs a forecast clock; which clock the copy reads, and what a muscle with no session behind it may be called, is a ruling.
- **[STOP-6]** ED-safety isolation. `weeklyCoach.js` and `coachApply.js` are pinned never to import `src/lib/recovery/` (`edIsolation.guard.test.js`; CLAUDE.md Section 2). A check-in "+N" that consults recovery needs that guard lifted or another seam; ask first.
- **[STOP-7]** The per-muscle hours are a pinned table (`constants.test.js:34-40`) whose source is a consensus convention (`constants.js:50-54`); the one cited per-muscle study gives no biceps-versus-back number. Changing 48 and 60 (or adding per-muscle dose references) re-pins `constants.test.js`, `sequenceSessions.test.js` ("reads 72 and 96"), `muscleRecoveryModel.test.js` and every number here. The evidence question is lane S Q5.
- **[STOP-8]** Which landmark table is the truth for "too much", and what "focus" means. Four weekly ceilings for biceps are live: X 22 credit, R 24 credit (profile), G 20 direct, P 22 direct. Band prose differs ("the most sets a muscle can usually recover from in a week", "more than the top of the range", and the heatmap legend reading "past the point of extra benefit, not dangerous" per D214 addendum 9). The plan layer's `mav = static week-1 total` makes every plan read "Near the limit" from week 2 (probe 6). Focus could mean `planWeakPoints` plus phase, division priority, or what the generator actually raised.
- **[STOP-9]** One definition of "recovered": screens use 90% and 0.895 T (`READY_FRACTION`), the sequencer the full T (`sequenceSessions.js:332-335`), `describeSpacing` says "about N hours before the next session". A forecast sentence and the sequencer should agree (pinned: `muscleRecoveryModel.test.js:125`, the sequencer tests).
- **[STOP-10]** Week boundary: nothing is next after the week's sessions are resolved until the 7-day step turns (`programmePosition.js:138-175`; pinned by `blockProgression.test.js`, `programmePosition.weekComplete.test.js`). Goal 5 on such a day needs next week's first session, which the position authority does not define.
- **[STOP-11]** A session's ready-by is its limiting muscle's time, pinned by `sessionReadiness.test.js:76`. A truthful "all its muscles recovered by <time>" is the latest muscle's time (probe 2c: 28.2 h against 61.1 h).
- **[STOP-12]** Re-pin list for any of the above: `constants`, `muscleRecoveryModel`, `sessionReadiness`, `nextWorkoutRecommendation`, `sequenceSessions`, `personalRecovery` (and its simulation), `load`, `recoveryPillar`, `edIsolation.guard`, `purity.guard`, `ReadinessCards.recoveryByMuscle`, `MuscleRecoveryList`, `RecoveryLearningCard`, `HomeScreen.recoveryRecommendation`, `HomeScreen.recoveryPercentGuard`, `HomeScreen.trainingDayBanner.guard`, `HomeChangeWorkoutSheet.recoveryVerdicts`, `recoveryPlace.guard`, `planEngine.recoverySequencing`, `volumeStrip`, `volumeBandLabels`, `effectiveLandmarksPlanLayer`, `planVolumeTargets`, `WorkoutSummaryScreen.volumeWords.guard`.

---

## Appendix: probe index and what was not verified

Probe outputs (all in `/tmp/claude-0/-home-user-ADPhysique/786bfebd-8f9e-5cc9-9432-3682cc10db7d/scratchpad/d219/R2/`, sources kept as `zzR2Probe*.test.js.txt`): `p1-per-muscle.json` (tables, dose, biceps against back, factor hours); `p2-curve.json` (single, compounded, dose and RIR curves); `p2b-next-session.json` (real `recommendNextWorkout`, sentences, Home line, pillar); `p2c-limiting.json`; `p2d-steady-state.json` (7-day UL4 and FB3 and the swap case); `p3a-corpus-biceps.json`; `p3b-biceps-plans.json` (four plans, bands, served credit); `p3c-surfaces.json` (status, strip, insight, deload pass, adaptive, +3 check-in); `p3d-recovery-screen-biceps.json`; `p3e-biceps-status-sweep.json`; `p4-session-start-readiness.json` and `p4b-dose-vs-intensity.json`; `p5-misc.json` (`readyClause` granularity, learner empty shape, hours at factors); `p6-all-muscles-ramp-status.json` (every muscle, 3 to 6 days); jest outputs `jest-recovery-domain.txt`, `jest-surfaces.txt`, `jest-simulation-verbose.txt`, `jest-probe6.txt`.

Not verified: any device rendering (strings come from the builders or the source); the 'adapted' landmark layer in probes; whether the Coach tab still renders the adaptation "Engine Log"; the REPLICA heatmap and Coach review strings (copied from template literals); the learner on real user data (simulation only); whether any register entry after D210 answers the plan-user reach question (searched D210 and D214 by eye, not exhaustively); the founder's own week of 27 biceps sets (reproduced from the pure functions, not from their data); other layouts of the gap table for 2 and 7 sessions (not probed).

Probe evidence is copied into this folder at `probes-R2/` (the JSON outputs, the probe sources as `.test.js.txt`, and the jest run logs), so it survives the session scratchpad.
