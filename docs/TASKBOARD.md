# VOLYUME TASKBOARD — the single current task source

_Created 2026-07-10 by the docs staleness sweep. This is THE list the project
works from. Update it at every landing (add, move to done, re-verify).
Landed-item detail rolls to
`docs/ux-world-class-audit-2026-07-09/_HANDOVER-ARCHIVE.md` at each landing
(D41 token hygiene): this board holds only in-flight / queued / held._

## How this board works (D37 + D38 + D47 - restated)

- **D47 (order rule, founder 2026-07-11).** The board is worked TOP TO
  BOTTOM, every item, in order - the lead never selects, defers or
  re-prioritises items by preference. Blocked items are surfaced and the
  next in order starts immediately.

## (D37 + D38 detail)

- **D37 (staleness rule).** Nothing from a pre-campaign audit is built from its
  old blueprint. Every pre-campaign item is triaged against today's tree + the
  decision register first; superseded/reverted items are closed, not
  resurrected. All dated audit folders and loose audit/status docs now carry a
  SUPERSEDED/CLOSED banner pointing here. Work flows only from
  `docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md` and this board.
- **D38 (elevation rule).** A job being on a list, in an audit, or in an old
  queue is NEVER sufficient reason to build it. Before dispatch, the brief must
  state, verified against the tree: CURRENT STATE (what the app does today on
  that surface), END STATE (what the item delivers), ELEVATES BECAUSE (why the
  delta improves the app as it now is). Any item that cannot honestly carry all
  three drops to NEEDS JUSTIFICATION at the bottom of this board, not the queue.

Authority for every line below is cited inline (decision Dnn + source doc).
The full register is `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`.

---

## COMMUNITY PROPOSALS 1 TO 11 (founder order 2026-09-22: "Do 1-11 in order. Utilise the lowest level agent suitable and you do the plan and design and thinking and orchestration") — IN PROGRESS; each item: build lane (Sonnet or Haiku), lead diff review, fresh-eyes adversarial review (Opus for server-side safety), full gate, one commit, merged to main

**Landed on main, in order:** item 1 client half, every provable action sends its push (`5441df58`); item 2 with 4a, Community's visible home on Today (`92580e80`); item 3, the profile is created at onboarding step 5 (`20d229c7`); item 4b, link previews on the public pages (`3f1249ef`); item 1 server half, migration 177 returns the recipients for Respect-all and join requests (`518f1ce6`); item 5, the free-text note post with migration 178 (`55937478`); the founder's Nutrition order of 2026-09-22/23, the pill row replaced by a Higher-calorie day feature row and a Trends header action (`26cf33cc`); migration 179, RLS on the two tooling tables the Supabase advisor flagged (`2e567408`); item 6, migration 180, the server-side ED backstop on consistency sharing, Opus-reviewed, DORMANT until D92-11 (`590b03fd`, which also adds 176's Part 0 order guard); item 7, migration 181 and the Gyms segment of the moderation screen (`b4a24e65`); item 8, look and copy (`cbdbf8be`: the quiet group empty line, Username and Age group everywhere, the group-create purpose line, the You-row and profile-strip figures at the title role, the copy census; review SHIP); founder decision B on D92-11 (register D196; `49dfc0f3`, 2026-09-24): migration 182 `ed_flag_push` (raises and clears, forward-only, scoped to the caller's own row, clocks clamped, no signals, the owner write policies dropped; proved on a PostgreSQL 16 harness T1-T12), the migration 180 calm arm (every consistency reader withholds on open ED flag OR calm mode, read-side only; L8 acceptance hardening), 176's Part 0 needle, the client push (first in every sync cycle's push phase, counted; immediate and guarded after a raise or a clear; quiet PGRST202 skip while 182 is unapplied; neutral telemetry), the pull ratchet (a pulled clear never closes a local open flag), the Sentry scrub of the table and RPC names, three guards, the push and pull-ratchet suites; Opus review SHIP WITH FIXES, every fix taken); item 9 hygiene (register D197; `c10b85f0`, 2026-09-24): migration 183 revokes EXECUTE on the three RPCs with no caller left (`gyms_near` proved live and untouched), their wrappers deleted and the security-matrix inventory re-anchored (a revoked RPC is pinned absent, the 164 precedent), the community-notify `group_accepted` proof bounded by `joined_at`, `public/p` a static retired page, the gyms wrapper and group-members screen tests, the copy census extended (lib scope, nested template literals, the "age band" phrase); two Sonnet lanes, lead-reviewed; D198 (2026-09-24, lead hands-on, two commits): every training-profile sender composes one gated payload (`composeTrainingProfilePayload`; the 180 review's L4), and `saveUserBodyProfile` keeps any field a caller leaves undefined, so a wizard re-run no longer nulls the SCOFF score, experience, training age or consent flag. Gate at the last landing (2026-09-24, over the D198 tree): lint 0, tsc 0, imports OK, 1333 suites passed (1 pre-existing skip) / 21,017 tests passed (16 pre-existing skips), 0 failures.

**Migrations 176 to 183 APPLIED 2026-09-24, 14:04 to 15:33 UTC** (founder phrase "run against production: 176, 177, 178, 179, 180, 181, 182, 183" given 2026-09-24; Claude-run under the checksum protocol; order 179, 176, 177, 178, 180, 181, 182, 183, so 176 before 180 as the code required; every acceptance block passed and every apply verified read-only; the record with timestamps, checksums and what was verified is the `supabase/README.md` status block, and the eight guard tests now pin APPLIED). `community-notify` redeployed as version 4 at 15:38 UTC (the note push copy from item 5 and the group_accepted recency bound from item 9), the live source fetched back and compared to the repo. 182 is live: the ED arm of 180 and both edge-function ED gates arm on the first device push, which needs a build carrying the push (none shipped yet; a build needs the founder's explicit go). 155 still waits for the no-Partners build (item 10).

**In flight:** nothing (D198's two fixes landed 2026-09-24: `9a0f175f` every training-profile send composed through one gated payload, `16fd6c49` the body-profile save keeps the fields a caller does not name). **Queued, in order:** THE PROGRESS-TAB AUDIT (founder order 2026-09-24, verbatim in the next paragraph); then item 10 Partners migration 155 (founder confirmation and phrase: it waits for the store apps to move to a build without Partners); item 11 remainder (leaked-password setting in the Supabase dashboard, a founder-side switch; the two dashboard-only edge functions "tips" and "bright-handler", a founder decision to delete or keep). Both are founder-side questions, put in chat 2026-09-24 as structured choices.

**NEXT: THE PROGRESS-TAB AUDIT (founder order 2026-09-24, verbatim):** "For next audit once community is done. I need you to do an extensive audit on these areas of the app next. It does not represent directly or report correctly and change per selection. I need you to audit every area and come back with improvement suggestions for the consistency this weeks plan, recovery and so on. Make sure everything. I'm here works 100% is accurate and usable and offer suggestions of improvements. Use lowest level agent for each relevant task with you doing these brain work. Work out why recovery doesn't show nor does this weeks plan," with five screenshots of the Progress tab: the Volume heatmap list at 1, 2 and 4 weeks (the per-muscle target stays the weekly figure at every window, e.g. Chest 12/32 green at 1 week, 19/32 at 2 weeks, 39/32 red at 4 weeks, so the colour and verdict change only because sets accumulate; "Trained within 24h" / "Trained 1 day ago" labels), the body heatmap (front and back, legend "Elevated for Men's Physique · Capped"), and the Consistency screen (Training block "Week 3 of 6 · Build. Recovery week in 3 weeks.", plan card "Men's Physique · Bulk · V-Taper 4x/week", Weekly load 52,138 kg bars, and "This week's plan" (Effort 4/5) rendering only empty grey bars with "/" values; "Recovery" not rendering at all). Lanes per D185: the lowest-tier read agents map the data paths (screen, selector, computation, source tables) for each area; the lead does the root cause of the two missing surfaces and the per-window target defect, then delivers the findings and the improvement proposals to the founder in chat as multi-choice questions. **FIRST PASS DONE 2026-09-24:** report `docs/audit/progress-tab-audit-2026-09-24/00-FINDINGS-AND-PROPOSALS.md` (F1 to F7 with file:line evidence, P1 to P7, Q1 to Q4), register D199 (the block-week ruling for plan-versus-actual). Root causes: This week's plan fed raw `planned_muscle_volume` rows to a card expecting `{planned, actual, label}` (never worked on Consistency); the heatmap's 1/2/4-week selector scales the sets but never the weekly targets or bands; Recovery has no hide path once mounted and no Sentry error, so it is either an empty block (gauges need two rated sessions in 14 days) or below the screenshot (Q2 to the founder). **F2 FIX LANDED 2026-09-24 `1ae313f5`** (Sonnet lane, lead-reviewed line by line, gate 1,335 suites / 21,040 tests): `src/lib/blockWeekProgress.js` (`blockWeekSpan`, `buildBlockProgressRows`), `useProgressData.loadBlockState` and `HomeScreen.loadBlockProgress` both count the block's own week through the one mapper, `getCurrentMesocycleWeek` gains the additive `blockStartMs`, `parseBlockStartMs` exported; tests `src/lib/__tests__/blockWeekProgress.test.js` (span across the 2026-10-25 clock change, mapper contract) and `src/screens/__tests__/ConsistencyScreen.blockProgress.test.js` (raw rows through the real hook into the real card render "1/12", a set before the block week is not counted). Client-only, no schema change; the next build carries it. R5 (Haiku) returned a summary of the report instead of the check and was discarded; R5b (Sonnet) did it and the lead verified all ten findings in the code (report F8 to F17). **TWO BUILD LANES IN FLIGHT 2026-09-24:** lane A (Sonnet) F8, F9, F15, F16, F17 on `BodyMetricsScreen.js`, `WorkoutHistoryScreen.js` and additive reads in `database.js`; lane B (Sonnet) F10 to F14 on `LiftProgressScreen.js`, `ExerciseDetailScreen.js`, `liftProgress.js`, `strengthStandards.js`. Recovery path: if a lane dies, relaunch it from the report's finding text and rulings; nothing is committed until the lead reviews each diff; the two lanes' file sets are disjoint. Founder questions Q1 to Q4 delivered in chat 2026-09-24; **founder answer 2026-09-24: "you make the call based on what brings the best product. Ok fix it all"**, so the four are lead-ruled (register D200: heatmap option A with the partial-history divisor; Recovery per P3 without the duplicate block line; one definition of week per meaning; everything fixed, by user impact) and every finding builds. Lane order after A and B: C (F1, F6), D (F3), E (F4, F5), then a read lane over the section-6 screens and a fix lane for what it finds. Recovery path: if the F2 lane dies, relaunch from D199 ruling 1 and the report's F2; nothing is committed until the lead reviews the diff. **LANE B LANDED 2026-09-24 `d2b92e4e`** (Sonnet, lead-reviewed line by line, gate over the tree 1,339 suites / 21,096 tests, lint, tsc and check:imports clean, fast-forwarded to main): F10 the change badge follows the lens on screen (`seriesDeltaPct`), F11 the hero gate counts sessions inside the plotted window (`getWeeklyLoadWindow`), F12 the standing card's third state, F13 standards keyed by category (`matchStandardKey`), F14 Estimated max over every loaded session; the pinned `buildWeeklyLoadSeries` call site untouched. Lane note `src/lib/athleteProfileSummary.js` keys standards by name the same way (the F13 pattern): **FIXED 2026-09-25 `f5c52b4e`** (fix lane AP, Sonnet, lead-reviewed, gated alone in a clean worktree, 1,345 suites / 21,178 tests, fast-forwarded to main; one entry per standard, the higher-ratio variant kept; tests in `athleteProfileSummary.test.js` +4). Read lane S7 (Sonnet) over the four surfaces read lane S6 left unverified: **DONE 2026-09-25**, nine findings, report section 8; the two safety-adjacent ones **LANDED BY THE LEAD'S HAND 2026-09-25 `99619aa4`** (S7-1 the photos timeline card's leanness band and weight caption withheld under calm/ED, one recorded pin re-anchored with the rationale, register D200 item 7; S7-5 `usePhotoSuppression` re-reads on focus; gated alone in a clean worktree, 1,347 suites / 21,186 tests, fast-forwarded to main); the other seven (S7-2 the landing's scan evidence count can never reach its gate and the two comparison policies disagree, S7-3 Compare shows a Low-confidence score, S7-4 Compare prints kg for lbs/st users, S7-6 pose-blind default share pair, S7-7 sheets span the library (ruled deliberate, documented), S7-8 the weight backfill that never fills, S7-9 the Trend detail's unused signal) **LANDED 2026-09-25 `0fdec1c9` through FIX LANE S7** (Sonnet, lead-reviewed line by line, sent back once for two follow-ups: the photo viewer's identical backfill and a seven-day bound on the photo's nearest weigh-in, which the lead then refined so an out-of-bound past reading cannot block a nearer later one; gate over the settled tree 1,355 suites / 21,289 tests, lint, tsc and check:imports clean, fast-forwarded to main; new `src/lib/progressScanChain.js`, `getProgressScanCoachSummary` recomputes the comparable count at read time, `getBodyWeightNearestTo` gains `maxDistanceMs` and a deterministic tie-break). **THE PROGRESS-TAB AUDIT IS COMPLETE 2026-09-25:** every finding in report sections 1 to 8 is fixed on main (F1 to F17, S6-1 to S6-7, S7-1 to S7-9, the athlete-profile keying); `getAcuteChronicWorkload` in `database.js` has no caller left (retirement is a separate, small cleanup); the founder-side item is a build: nothing has been dispatched, every landed change reaches the store only on the founder's go for a build (rule 2026-09-04). Device checklists for every lane were delivered in chat as each landed; **NEXT PROGRAMME, FOUNDER DECISION 2026-09-25 (register D201): per-muscle recovery estimate, next-workout aware, with plan building and session sequencing recovery-aware.** Stage 1 DONE (read lanes PR1 and PR2, 2026-09-25); stage 2 DONE: **SPEC WRITTEN `docs/recovery-programme-2026-09-25/00-SPEC.md`** (evidence base, the model and its constants, the next-workout rule, the plan sequencing scorer, surfaces, tests, lanes R-A to R-D plus an Opus review, founder forks F1 to F3); stage 3: **GO GIVEN 2026-09-25** (founder: "Make a choice which gives the end user the best results and minimizes injury and also the best and easiest to use product. Go"); F1 to F3 lead-ruled (register D201 addendum). **BUILD IN FLIGHT:** step 0 **LANDED `647788e9`** by the lead's hand (`src/lib/recovery/constants.js` + test, 16 tests; gate 1,356 suites / 21,306 tests); **R-A LANDED `99ee7354`** (Sonnet, lead-reviewed with two corrections pinned: contribution capped at F before a session's end, session ends as breakpoints; gated alone, 1,358 suites / 21,350 tests); **R-B LANDED 2026-09-25 `ed17119c`** (Sonnet: `sequenceSessions.js`, the planEngine hook, whyThis, the division-matrix rule; lead-reviewed line by line, three pin conflicts ruled in D201 addenda 2 and 3; its first full gate found two failures the lead fixed by hand: session letters now follow the final position after sequencing (`reletterByPosition`, D201 addendum 4 ruling 4, so a 4-day upper/lower reads A, A, B, B and `programmeStructureMemory` CASE G passes unchanged) and `describeSpacing`'s local renamed because the theme-token guard reads any `spacing.<word>` in src/; gated alone in a clean worktree, 1,360 suites / 21,374 tests, lint, tsc and check:imports clean, fast-forwarded to main); **R-C LANDED 2026-09-25 `0ffd7269`** (Sonnet: `load.js`, `nextWorkoutRecommendation.js`, `nextLikelyTrainingTime.js`, Home's card per F1 with a persisted per-day "Keep", the change-workout sheet's verdicts, 11 files; sent back once for three changes (Keep persisted, a failed planned-sets read excluded rather than read as ready, the hero guard regex), then the lead re-wrote the copy to the spec's own words and nulled the line for an unknown session (D201 addendum 4 rulings 5 to 7); gated alone in a clean worktree on top of R-B, 1,365 suites / 21,451 tests, lint, tsc and check:imports clean, fast-forwarded to main); **R-D LANDED 2026-09-25 `00e78164`** (Sonnet: the Recovery block surface on Consistency, `ReadinessCards.js`, `BodyDiagramHeatmap.js` + tests `BodyDiagramHeatmap.recovery.test.js` (9) and `ReadinessCards.recoveryByMuscle.test.js` (19); `readyByLabel.js` not built, R-C's `readyByPhrase` reused; lead corrections: solid recovery bands and the legend label, the duplicate no-recent-session line dropped, the next-workout row names the session (D201 addendum 5 rulings 8 to 10); gated alone in a clean worktree on top of R-C, 1,367 suites / 21,479 tests, lint, tsc and check:imports clean, fast-forwarded to main). **OPUS REVIEW DONE 2026-09-25, 25 FINDINGS (3 blockers, 14 should-fix, 8 nits), ALL FIXED BY THE LEAD'S HAND IN ONE ROUND** (register D201 addendum 6, rulings 11 to 16): primary-loaded means primary sets (readiness, candidate filter, sequencer), law 5 dominant in the scorer with a tie tolerance (real-library sweep 336 configurations, 0 clashes; the 6-day plan reads Push A, Pull A, Legs A, Push B, Pull B, Legs B, pinned on the engine), no evidence is never "ready" in copy and the last sentence tells the truth at the moment of reading, unknown routines are null and a degraded loader renders nothing, the Home recommendation is derived at render (never hides the finished-block hero, no flicker on focus, the line follows the displayed session, the sheet's programme-next tap is Keep), the rest of a training day projects to now, an honest spacing sentence, the chip's own recency source in the rows, a bounded workouts query, soft-deleted exercises keep credit, ready-by aligned to the rounded percent, the sheet's badge and spoken rows. Files: `src/lib/recovery/{constants,sequenceSessions,sessionReadiness,muscleRecoveryModel,nextLikelyTrainingTime,nextWorkoutRecommendation,load}.js`, `src/lib/planEngine.js`, `src/lib/database.js` (additive `getAllExercisesIncludingDeleted`), `src/screens/HomeScreen.js`, `src/components/{HomeChangeWorkoutSheet,ReadinessCards,BodyDiagramHeatmap}.js` and their tests, plus `campaign16.qualityLaws.test.js` (four more real-library configurations). **REVIEW FIXES LANDED `6cc3e88c` (sequencer), `55aadab7` (rule, loader, model), `e6d8401b` (Home, sheet, Consistency)`** (gate over the settled tree: `1,367 suites / 21,490 tests, lint, tsc and check:imports clean, fast-forwarded to main`). Finding 25 (test guards only, no behaviour) **LANDED `77a8c28d`** through lane R-G (Sonnet, lead-reviewed line by line; one stop item ruled: the purity guard checks code with comments stripped, so a header that disclaims `Date.now()` never trips it): `HomeScreen.recoveryPercentGuard.test.js` (8), `src/lib/recovery/__tests__/purity.guard.test.js` (6), `edIsolation.guard.test.js` (5), plus pins in `HomeChangeWorkoutSheet.recoveryVerdicts.test.js` (+3: two-line wrap, spoken label, the badge on programme order), `constants.test.js` (+3: the typical-week table, rows sum to 168, the opening RIR) and `nextWorkoutRecommendation.test.js` (+1: the other session exists but is not ready); gate over the settled tree `1,370 suites / 21,516 tests, lint, tsc and check:imports clean`, fast-forwarded to main. **THE RECOVERY PROGRAMME (D201) IS COMPLETE ON MAIN**; the founder-side item is a build from main on the founder's go (rule 2026-09-04), then the device walk of the 19-step checklist delivered in chat 2026-09-25. **THE THREE NOTED CLEANUPS LANDED 2026-09-25 `3aac04ad` (the retired read and the map) and `0b189eb3` (the age input)`** (founder: "Do the items on the board"; lead, hands-on, full gate `1,371 suites / 21,524 tests, lint, tsc and check:imports clean`, fast-forwarded to main): (1) the unused `getAcuteChronicWorkload` retired from `database.js` with its mocks and every comment that named it as live (`trainingLoad.js`, `chartWindows.js`, `useProgressData.js` and their tests now name `acuteChronicFromSeries`); (2) `docs/_FULL-APP-PRODUCT-MAP.md` entries 22 to 24 and the weight-window row re-cited against the live code (entry 24 now names `trainingLoad.js`; entry 22 the Lift progress share card; entry 23 marked DORMANT because `buildWeeklySessionCounts` has had no caller since Campaign 23 removed the landing hero, retirement a separate call); (3) `buildPlanInputs` now carries the athlete's `age` from the profile's date of birth through the new shared `src/lib/ageFromDateOfBirth.js` (the effective-maintenance service, the block seed's `profileAdjustedPrior` via the ledger runner, and `buildPlanLandmarks` via `getPlanLandmarks` use the same helper, each from a caller-supplied instant so the pure modules stay clock-free), so `computeLandmarks`' age table finally applies everywhere at once (register D202; end-to-end pin in `planAutoGen.test.js`). Noted from this pass, not started: `buildWeeklySessionCounts` is dead code. Recovery path: relaunch a dead lane from the spec's sections 3, 4, 5 or 6 as named; `tsconfig` has `checkJs: false`, so a tsc pass is not evidence of JS type-checking. **LANE A LANDED 2026-09-24 `04e82961`** (Sonnet; reported once, sent back by the lead because its calendar dots came from a ranged read over all history while the month list still came from the loaded 50-row page, reworked, re-reviewed line by line; gate over the tree 1,340 suites / 21,131 tests, lint, tsc and check:imports clean, fast-forwarded to main): F8 the weight chart's values, axis, tooltip AND the takeaway line convert through `src/lib/bodyMetricsDisplay.js` (`weightTakeaway` gains `toDisplay`, level band still judged in kg); F9 "Today" only when it is today, else "Date unknown" or the real date; F15 the true completed count, "Show more" on a keyset cursor (attributed instant plus id, `getRecentCompletedWorkouts(userId, limit, before)`), calendar view on one per-month read (`getCompletedWorkoutsBetween`) feeding both dots and list, refetched after a delete; F16 the history tonnage passes the exercise-type map; F17 the row's accessibility label carries duration and set count. Tests: `bodyMetricsDisplay.test.js`, `database.workoutHistoryReads20260924.test.js`, `chartWindows.test.js` (toDisplay block), `BodyMetricsScreen.weightUnitsAndDate.guard.test.js`, `WorkoutHistoryScreen.progressAudit20260924.test.js` (8 cases incl. delete-while-month-open). **LANE D LANDED 2026-09-25 `b117bb06`** (Sonnet, lead-reviewed line by line, sent back once: pin ruling on `campaign5.firstUse.test.js`'s one-sample caption literal, register D200 item 6, and the latest-session read moved to `getRecentCompletedWorkouts(userId, 1)` so `routineName` comes through; gate over the tree 1,345 suites / 21,174 tests, lint, tsc and check:imports clean, fast-forwarded to main; tests `ReadinessCards.rateLastSession.test.js` (10), `ConsistencyScreen.rateLastSession.test.js` (2), `WorkoutSummaryScreen.allowRating.test.js` (3)) (Recovery per D200-2: waiting caption naming the inputs, one-tap "Rate your last session" via a readOnly+allowRating mode on `WorkoutSummaryScreen` that saves only touched rating keys and re-enables no live side effect, the "From your weekly check-in" row; files `ReadinessCards.js`, `ConsistencyScreen.js`, `WorkoutSummaryScreen.js` + tests; recovery path: relaunch from D200-2, P3(a)(b)(d) and F3). **LANE C LANDED 2026-09-25 `830b73de`** (Sonnet, lead-reviewed line by line, one write-only state removed by the lead; gate over the tree 1,340 suites / 21,131 tests, lint, tsc and check:imports clean, fast-forwarded to main): F1 the 2/4-week windows read the average working sets per week against the unchanged weekly bands (`src/lib/volumeWindow.js` `weeksCounted` and `perWeekVolume`; row, bar, colour, status, body figure, accessibility label; window total captioned; the divisor counts the weeks the account has data for, the note discloses it; ghost bar hidden when the previous window pre-dates the account; 1-week view unchanged; `algorithms.js` untouched); F6 the division legend names the weekly target. Tests: `volumeWindow.test.js` (21), `VolumeHeatmapScreen.test.js` (+6). **RATE-LIMIT STOP 2026-09-24 evening:** lane D and the section-6 read lane both died on the account's session limit (reset 19:10 UTC) before writing anything; both relaunched 2026-09-25 02:30 UTC from the same briefs. **READ LANE S6 DONE 2026-09-25** (Sonnet, code-only, seven findings, each lead-verified; report section 7): S6-1 the landing's Body pillar shows bodyweight and rate under calm mode (LEAD, HANDS-ON, **LANDED 2026-09-25 `19e39260`**, gated alone in a clean worktree at HEAD, 1,341 suites / 21,143 tests, lint, tsc and check:imports clean, fast-forwarded to main: `deriveWeightTrend` gains `calm`, `useWeightTrend` reads the raw wellbeing key fail-closed; tests `weightTrend.test.js` S6-1 block and `src/hooks/__tests__/useWeightTrend.calm.test.js`; register D200 item 5); S6-2 landing recent-sessions tonnage with no type map, S6-3 recap PRs without `isE1rmEligibleRow`, S6-4 "this month" on a rolling window, S6-6 "the last 0 days", S6-7 the banner's stripped "so far" (**FIX LANE S6 LANDED 2026-09-25 `51849a74`**, Sonnet, lead-reviewed line by line, sent back once to bring `getYearOfLiftsData` in: its eligibility gate was a no-op because its query never selected `set_type`/`evidence_class`; one existing source guard (`campaign10m.estMaxRecordConsistency`) reads 600 characters after the block loop, so the lead shortened the lane's comment there; gated alone in a clean worktree at HEAD, 1,342 suites / 21,159 tests, lint, tsc and check:imports clean, fast-forwarded to main; tests `database.recapPrGate20260924.test.js` (9) and `AnalyticsScreen.stateMatrix.test.js` (+7, nine copy pins re-anchored to the D200-3 wording)); S6-5 the Consistency load sparkline's missing type map goes to lane E with `useProgressData.js`. **LANE E LANDED 2026-09-25 `cd9269af`** (Sonnet, lead-reviewed line by line, sent back once for four changes: a zero-load week reads 0.00 instead of hiding the card, the trend caption capitalised, `weekWindowsEndingAt` stepping by calendar weeks with the trend read's lower bound from the oldest window, and in-process clock-change tests; gated alone in a clean worktree, 1,352 suites / 21,244 tests, lint, tsc and check:imports clean, fast-forwarded to main; `getAcuteChronicWorkload` now has no caller and stays in place, its retirement a separate call) (D200-3 one definition of week per meaning and P5 one load surface, plus S6-5: new `src/lib/trainingLoad.js` Monday-anchored load series feeding both the plan-card sparkline and the load card from one computation, the session-length trend and the heatmap's volume trend on Monday-anchored weeks with the current week labelled so far; files `useProgressData.js`, `ProgressSections.js`, `ConsistencyScreen.js`, `VolumeHeatmapScreen.js`, `database.js` (the heatmap's trend anchor only), `chartWindows.js` copy + tests; recovery path: relaunch from F4/F5/P4/P5 and D200-3).

**Side findings for the founder (not fixed, surfaced in chat):** the wizard's completion-time body-profile save replaces every column on a re-run (wellbeing score and consent flag); payload string values were unfiltered for blocked terms until 178 (closed there); a rate limit cut two lanes off on 2026-09-22 evening, both relaunched and completed on 2026-09-23. **From the Opus review of migration 180 (2026-09-23), lead-verified:** nothing writes the cloud `ed_pattern_flags` table (engine flags live in device SQLite only; registry pull-only; no migration or edge function inserts it), so migration 180's gate AND the two edge functions' existing ED gates (partner-cheer, community-notify push suppression) are dormant for engine-raised flags until D92-11 (the raise-only push, open since 2026-08-10) is decided; the fork is in chat. Also L4: `syncTrainingProfile` skips `consistencyGateState` (sends `share_consistency: true` for a calm or flagged user; counters null, nothing leaks, but it wipes what `publishConsistency` published), not fixed.

---

## 1. IN FLIGHT

_Nothing beyond the live line in the section above. The August
campaign entries this section carried were retired to the archive
2026-09-25 (founder order); their status words are as of their own dates._

**PLAIN-ENGLISH SWEEP, founder order 2026-09-26 ("We need a sweep and a correction on any language like this. It needs to be understanding") — IN FLIGHT** (register D207; the rule is `docs/rules/plain-english.md`, which defers to the locked voice doc's actor rule: "your coach" or impersonal, never a collaborative "we" for a coaching decision). Lane A (Opus): the coaching copy, `coachStory.js`, `coachRegister.js`, `coachResponse.js`, `coachOutput/viewCopy.js`, `weeklyCoach.js` (string literals only), `whyThisTemplates.js` (non-ED), `coachLedger.js`, `homeCoachBrief.js`, `coachDecline.js`, `coachPrecedence.js`, `capability/reintroduction.js`, `capability/weekNote.js`, `blockExplain.js`, the Coaching decision, Coaching history, Weekly check-in, You and Methodology screens, `components/coachOutput/`. Lane B (Sonnet): Today, the workout and summary screens, Plan detail, Consistency, Analytics, Body metrics, Lift progress, Exercise detail, `src/components/` outside the coach output, community and food folders, `lib/recovery/`, `chartWindows.js`, `trainingRecency.js`, `progressSeries.js`, `trainingLoad.js`. Queued, two at a time after A and B: Lane C nutrition, Lane D plan and programme copy, Lane E settings, onboarding, notifications and community. Recovery path for every lane: agents never commit; if a lane dies, its uncommitted diff is lead-reviewed string by string against the rule and its brief, the sound strings land, and the lane is relaunched on its remaining files with the same brief. ED-safety, legal, consent and locked-surface strings are listed for the founder, never edited.

---

**COACHING DECISION SCREEN, founder order 2026-09-26 ("a mismatch of texts styles and formats. Sort it") — LANDED ON MAIN `16fd55a9`** (Sonnet build lane against the lead's design, lead-reviewed with two corrections, fresh-eyes review; register D206; gate over the settled tree `lint clean, tsc clean, check:imports OK over 2086 files, jest 1372 suites passed and 1 skipped, 21548 tests passed and 16 skipped, none failed`): one heading treatment (SectionLabel, default tone), one card (the Card primitive, the hold hero elevated, the focus card plain, the hero verdict keeping its accent border), one amber (the committing action is emphatic; every quiet action secondary; a two-button footer with air between), type from roles (the week title h2 in the text colour), identical stat chips, the story card on body and bodySm, blocks on one section gap; engine copy and the ED-safety blocks untouched. Files: `src/screens/CoachOutputScreen.js`, `src/components/coachOutput/CoachOutputCards.js`, four re-anchored guards. Review fixes landed `182e976e` (the next-check-in card in the radius census; the adjustment rows' icon backing neutral). Founder's second and third corrections the same day ("It's the worst screen in the entire app by miles! Look at what is in use elsewhere ... Redesign it in line with the rest of the app"; answers: bump to 2.3.0, cut the duplicate, fix the other ghost buttons): REDESIGNED by the lead's hand and landed `f16da7c4` (register D206, the redesign addendum): one source per fact, Today's hero shape for the decision, the Coach tab's sections, the check-in's data rows, SettingRows for places to go, the retired narrators gone, the ghost buttons fixed app-wide with a guard; version 2.3.0 `28158f75`; gate `lint clean, tsc clean, check:imports OK over 2090 files, jest 1376 suites passed and 1 skipped, 21581 tests passed and 16 skipped, none failed`. Preview https://claude.ai/artifact/Sjq98WMVwpBirMkNYYaqgp. Noted: `buildOffItems` and `buildFocus` have no screen caller now.

**WEEKLY CHECK-IN BUTTONS TOUCHING, founder defect 2026-09-26 — FIXED ON MAIN `8794489b`** (lead, hands-on; gate `lint clean, tsc clean, check:imports OK over 2086 files, jest 1372 suites passed and 1 skipped, 21548 tests passed and 16 skipped, none failed`): the fast card's "Add more detail" button sat flush against the submit button; one spacing step between the two. File: `src/screens/WeeklyCheckInScreen.js`.

**RECOVERY BY MUSCLE LIST, founder order 2026-09-26 ("this wall of text looks horrible ... Investigate how JeFit does this and so on") — LANDED ON MAIN `7bbdb9d4`** (lead design, hands-on, from a Sonnet research lane over JeFit, Fitbod, Hevy and Whoop; gate over the settled tree `lint clean, tsc clean, check:imports OK over 2086 files, jest 1372 suites passed and 1 skipped, 21544 tests passed and 16 skipped, none failed`): the rows are `src/components/MuscleRecoveryList.js`, grouped under the legend's three words with counts; one row is the band dot, name, estimated percent, chevron, a full-width band-coloured bar and the ready-by plus trained-ago line; a tap on the row or on the muscle in the body figure opens the breakdown (last session's counted sets and date, the 14-day window, the basis). Register D201 addendum 9. Files: `MuscleRecoveryList.js` and its suite, `ReadinessCards.js` and its recovery-by-muscle suite, the spec. Review fixes landed `8de18983` (the breakdown reachable to assistive tech, the accessible group header, the NaN-safe percent, the stale selection).

**COMMUNITY HUB RESPECT COUNT, founder defect 2026-09-26 ("When I click the heart to like it doesn't add a number also") — FIXED ON MAIN `4e9ad7e3`** (lead, hands-on; gate over the settled tree `lint clean, tsc clean, check:imports OK over 2084 files, jest 1371 suites passed and 1 skipped, 21529 tests passed and 16 skipped, none failed`): `ActivityItemRow` printed the comment count under the heart, so a respect the server had taken (live reaction_count 1 on the one production post) never moved the number. The number under the heart is now `reaction_count`; comments get their own glyph and count, only when there are any; the spoken label carries both. Register D205. Files: `src/components/community/ActivityItemRow.js` and its test.

**TESTFLIGHT WALK OF CONSISTENCY, 2026-09-26 (founder, three screenshots) — FIXED ON MAIN `19e3ae75`** (lead, hands-on; gate over the settled tree `lint clean, tsc clean, check:imports OK over 2084 files, jest 1371 suites passed and 1 skipped, 21525 tests passed and 16 skipped, none failed; the first full run failed one docs guard, campaign17c WORK 8, left red on main by the 2026-09-25 board retirement and re-anchored to the README ledger in `faaa1397``): (1) the Weekly load card told a user in a building week to "consider an easier session"; founder rule D204: the plan sets the sessions, surfaces describe and never instruct, so the status line reads "Well above / In line with / Below your recent average so far" in the app's own colours, the tooltip says it is a picture not an instruction, and the Recovery tooltip's "consider a lighter week" is gone; (2) "the data doesn't fit boxes": the generated block name was cut to "6..." on one line and now wraps to two (the only overflow visible in the screenshots; the week-plan bars were already clamped); (3) "not seeing anything for recovery": the lead moved the per-muscle estimate to the top of the Recovery section and hid the dials until two rated sessions, which the founder had NOT ordered ("The order wasn't to change the order or lead with anything"), so the section order and the dials are restored in `61885daa` (D200-2 addendum withdrawn); the recovery percent is relative to the session's own peak so a 26-set back day no longer sits at "0% recovered" for half its recovery (D201 addendum 7); (4) "This wall of text for muscle looks shit ... Look how JeFit does this": each per-muscle row is now compact, the name, a bar in the band colour, the percent, and one muted "Ready by Thursday · Trained 2 days ago" line under a "Muscle / Estimated recovery" header, the spoken label keeping the full sentence (D201 addendum 8). Files: `src/components/ProgressSections.js`, `src/components/ReadinessCards.js`, `src/lib/recovery/muscleRecoveryModel.js`, their tests, the spec, the register.

**VERSION 2.3.0 (2026-09-26)** — set on the founder's instruction ("Just bump to 2.3.0"): `app.json`, `package.json`, `package-lock.json`; buildNumber and versionCode untouched. Founder-side: create 2.3.0 in App Store Connect before the next iOS upload.

**VERSION 2.2.0 (2026-09-25)** — set on the founder's instruction ("You need to bump to 2.2.0"; 2.1.0 is closed in App Store Connect): `app.json`, `package.json`, `package-lock.json`; buildNumber and versionCode untouched, as in every previous bump. Founder-side: create 2.2.0 in App Store Connect before the next iOS upload.

## 2. QUEUED

_Nothing is queued. Founder order 2026-09-25: old items are never brought
back up from this board; work starts only from an explicit founder order
in the session, and the two old queued programmes (the Progress Scan
accuracy round of 2026-07-13 and the remaining CP-10 theming batches),
the decision rounds and every landed section were retired to
`docs/ux-world-class-audit-2026-07-09/_HANDOVER-ARCHIVE.md` that day._

---

## 3. FOUNDER-SIDE OPS (not agent work - only the founder can do these)

- **SESSION SHARING DEFAULT, founder reminder 2026-09-26 ("Remember the
  default for workouts and so on is to post the session. Users can change
  settings to set it otherwise though.") - RULE CONFIRMED IN CODE (D194
  ruling 2), ONE GAP FOUND, QUESTIONS OPEN.** Observed: the client default
  is on, to everyone (`TP_DEFAULT_SHARE.share_sessions`,
  `DEFAULT_SESSIONS_AUDIENCE`); the Join screen and the onboarding wizard
  create the profile with it on and publish it; the summary screen
  auto-posts the session and up to three PRs when the profile row has it
  on and the ED/calm gate allows; the Training profile screen turns it
  off (Remove/Keep) and back on. Gap: `community_create_post` enforces
  the SERVER row for auto items, the live `community_get_me` returns
  neither `share_sessions` nor `sessions_audience` (definition read from
  production 2026-09-26), and the device never reads the row back, so a
  device can show the switch on while the row says off; every auto item
  is then refused `not_allowed` and dropped with no message, and the
  summary strip's "Share every session" link opens a screen whose switch
  already reads on. A manual "Post this session" is not gated and still
  works. Production, read-only 2026-09-26: two profiles, both the
  founder's; `alland` share_sessions false, audience followers (the
  pre-22-September defaults, row created 2026-09-08); `allan` true,
  audience followers. Proposed, awaiting the founder's answers (delivered
  in chat 2026-09-26): (1) migration 184, additive: `community_get_me`
  returns the two fields; (2) the client adopts the row's pair into the
  device store on every `refreshMe` unless a sharing publish is pending,
  so the switch always shows what the server enforces, and the summary
  strip says so when an auto item is refused; (3) the two pre-flip rows:
  flip to the default by migration under the phrase, or set in-app.

- **ED FLAG CLOUD WRITE, D92-11 - DECIDED 2026-09-23: founder chose B
  (register D196).** Built the same day by the lead and landed on main
  2026-09-24 as `49dfc0f3` after the Opus review (SHIP WITH FIXES, every fix taken; D196
  items 8 and 9): migration 182 (`ed_flag_push`: raises and clears,
  forward-only, scoped to the caller's own row, clocks clamped, no
  signals; the owner write policies dropped; proved on a PostgreSQL 16
  harness), migration 180 amended (calm arm read from the guarded synced
  pref; every consistency reader withholds on open ED flag OR calm mode,
  read-side only), the client push on raise, clear and every sync cycle
  (a pulled clear never closes a local open flag). While 182 is NOT
  applied the client skips quietly (PostgREST PGRST202), so the next build
  is safe against the live server; nothing reaches the cloud until the
  phrase. Once 182 is applied and a device on that build raises a flag,
  180's gate and both edge-function ED gates are live. Founder-side: the
  phrase (below) and, after the build ships, a device walk of the ED-flag
  flow on two devices (checklist in chat).
- **MIGRATIONS 176 TO 183 - DONE 2026-09-24.** The founder gave "run against
  production: 176, 177, 178, 179, 180, 181, 182, 183" on 2026-09-24; all
  eight applied 14:04 to 15:33 UTC (179 first, 176 before 180), each chunk
  and whole file checksum-verified, each acceptance block passed, each
  verified read-only after; `community-notify` redeployed as version 4 at
  15:38 UTC. Record: `supabase/README.md` status block. Nothing founder-side
  remains for these; the next build (founder's explicit go) puts the client
  half in users' hands.
- **GYM DIRECTORY (2026-09-07) - founder items after the build.** (a)
  When 162 passes re-review: say "run against production" for the batch
  160 + 161 + 162 and the generated seed chunks (`node
  scripts/gyms/seed-sql.mjs` writes `supabase/seed_gyms_v1/`, sectors
  before venues); Claude runs and re-verifies read-only. (b) DECISION:
  add `expo-location` (MIT, Expo SDK module) so "gyms near me" can use
  the device position on an explicit tap only, never stored (GD-13)?
  Without it near-me runs from a typed postcode, which is what ships now.
  (c) sportscotland: DELIVERED 2026-09-07 (WFS access key given in
  chat; held outside the repo, used pipeline-only via env var, never
  committed). All eleven layers pulled to scratch: fitness suites 629,
  sports halls 3,129, pools 562. Gap analysis in
  `docs/community-product-audit-2026-09-07/11-sportscotland-register.md`;
  adapter + re-run follow after the P0 build lanes land. Earlier unlocks, kept for the record:
  three unlocks, none blocking the free stack.** Founder 2026-09-07: (1) registering the sportscotland account now
  (instructions delivered in chat; send the Fitness Suites download or the
  WFS link and token); (2) DuckDB APPROVED as a pipeline-only binary in the
  scratch space (never the app or package.json); (3) not raised. (1) Register a free sportscotland Spatial Hub account
  (data.spatialhub.scot) so Scotland's Sports Facilities register can be
  pulled. (2) Say yes to a pipeline-only DuckDB command-line binary (never
  in the app) so Foursquare Open Source Places and Overture Places, both
  permissively licensed Parquet datasets, become cross-checks and
  gap-fillers. (3) Optional: price an OS Points of Interest licence. Standard
  recorded as GD-15 in `docs/gym-database-2026-09-06/20-BLUEPRINT.md`.
- **COMMUNITY (2026-09-06) - four actions, in order.** (1) Say "run
  against production" for migration 160 (`supabase/migrate_160_community.sql`)
  and the deploy of `community-notify` and `community-public`; Claude
  runs them and re-verifies read-only. Until then every Community read
  fails as "unavailable" and the screens show their calm error state with
  Try again (the Volyume library tiles still render). (2) Give the go for
  an Android build from main, then walk the sixteen-step device checklist
  in `30-BLUEPRINT.md` section 12 with two test accounts. (3) Image
  upload (posts and photo avatars): RULED NOT BUILT under D160
  (2026-09-12): it needs an image-moderation processor with an EU
  residency check and a data-processing agreement, a new dependency and
  a new data category, both Section 2 inviolables the delegation does not
  transfer; closed as ruled, reopenable only by a founder decision that
  names the dependency (SD-12).
  (4) Migration 155 becomes applicable once a build WITHOUT Partners is
  in users' hands (README note). Also: the three link pages carry the App
  Store id placeholder until the iOS app is on the store.
- **NOTE, NOT A DEFECT (2026-08-18) - Android App Links are not verified,
  and that is fine.** Recorded so nobody "fixes" it again. The served
  assetlinks.json carries one fingerprint (the upload key) where the
  template has two slots, so Android does not auto-open
  https://volyume.app/partner/<CODE> in the app. That is NOT a broken
  feature: per src/lib/partners/link.js, the web link is DESIGNED to land
  on the web/ page that states the derived-signals-only promise and links
  to the store, for a partner who does not have the app yet, and
  parseInviteCode accepts the volyume:// scheme link, the web link, or a
  bare code typed or pasted. Partner invites work today and always have.
  Adding the Play app signing SHA-256 (Play Console -> Test and release ->
  Setup -> App signing) would only add the convenience of an already
  installed user's https link opening the app directly. Worth doing
  eventually, worth nobody's time now. Raised on 2026-08-18 as a "live
  defect" purely from the fingerprint count, before reading how invites
  actually work; that framing was wrong.

- **OPEN (2026-08-18) - DELETE THE iOS PROVISIONING PROFILE. One click,
  blocks every iOS build.** Build iOS (EAS) #146 failed at signing:
  `Provisioning profile "*[expo] app.volyume AppStore
  2026-06-10T11:35:55.490Z" doesn't support the Associated Domains
  capability`. `ios.associatedDomains` was added on 2026-08-11 (fc08bd1e)
  and EAS enabled the capability on the App ID, but it REUSES the stored
  profile, which predates the capability. This is the same GOTCHA already
  recorded in build-ios.yml's header from 2026-06-10. No code change fixes
  it and there is no non-interactive EAS flag (D111-3).
  FIX: expo.dev -> Account `volyume` -> Project `volyume` -> Credentials
  -> iOS -> `app.volyume` -> App Store -> **delete the Provisioning
  Profile**. KEEP the Distribution Certificate (serial
  4C11E6AEB51102841B0A3D62B64FDA85) - deleting that one is the damaging
  mistake. Then re-run Build iOS (EAS); it mints a fresh profile carrying
  Associated Domains and Push Notifications.
  Repeat this whenever a future app.json change adds an iOS capability.

- **CLOSED (2026-08-18) - the API-36 release is LIVE on Play** (founder
  confirmed). Detail kept for the record. Was:** Build Android run **3359** on main (354bc2cb) went
  green end to end at targetSdk 36, including the release-signing check
  and the 16 KB native-library page-size gate. Download
  **`volyume-release-aab-3359`** from
  https://github.com/allansdouglas1983-cmyk/ADPhysique/actions/runs/32128221878
  and upload it to Play. It carries versionCode **3359** (the workflow run
  number, set by the Set Android versionCode step), not 31 - that jump is
  expected and permanent; Play only requires the number to increase. Hard
  deadline: updates submitted on or after **2026-08-31** are rejected
  below API 36, so this upload cannot slip past that date. NOTE: this AAB
  predates any founder device walk of today's landings, so walk it from
  the matching APK (`volyume-release-apk-3359`) before promoting it
  beyond internal testing.

- **NEW PRODUCT WORK (2026-08-18, from D111-1) - Android large-screen
  layout.** The founder ruled to ship API 36 with NO resizability
  opt-out, so from the next release Android 16 ignores the portrait lock
  on displays >= 600dp: tablets and unfolded foldables render all 82
  screens in landscape at tablet width, which the app has never been laid
  out for. Phones are unaffected. This is accepted, known breakage, not a
  defect report - but it is now real outstanding work and should be
  scheduled as its own campaign.


- **STILL BLOCKED after Campaign 15: deploy the `partner-cheer` Edge
  Function.** Retried at the start of C15 and the reason is now precise:
  the Supabase connector is authorised at ORG level but is toggled OFF for
  this chat (`enabledInChat: false`), so no Supabase tool loads and there
  is no deploy path at all. There is also no Supabase CLI in the
  environment. FIX: enable the Supabase connector for the session in
  claude.ai connector settings, or deploy it yourself with the command
  below. Details unchanged:

- **C14-J4 BLOCKED: deploy the `partner-cheer` Edge Function.** Campaign 14
  made the recipient's partner-cheer opt-out real by enforcing it
  SERVER-side: the function now reads the recipient's own
  `notification_preferences` row and downgrades to in-app only when it
  says `enabled = false`. The code is on main
  (`supabase/functions/partner-cheer/index.ts`), pinned by
  `src/lib/notifications/__tests__/campaign14.categoryOwnership.test.js`.
  NO MIGRATION IS OUTSTANDING - the table (044) and the `partner_cheer`
  category (125) have been in production since 2026-07-27, and the client
  already pushes the row. Until the function is redeployed, the toggle
  silences the local path only and a partner's cheer still pushes.
  EXACT ACTION: `supabase functions deploy partner-cheer` (needs the
  auto-populated SUPABASE_URL + SERVICE_ROLE_KEY + ANON_KEY).
  Why Claude did not do it: the Supabase connector is not authorised in
  this session, so there was no deploy path and no way to verify against
  production. Verification once deployed: with two paired test accounts,
  switch partner cheers OFF on the recipient, send a cheer from the
  other device, and confirm the response is `{ ok: true, delivered:
  'in_app' }` with no push on the recipient's phone; switch it back ON
  and confirm the push arrives.

- **H4 IS NOW A PRODUCT-TRUTH RELEASE BLOCKER (elevated by the
  Campaign 5 order, 2026-08-10).** The published Play/App Store
  listings still promise cardio logging, which no longer exists. The
  repo does not own the authoritative listing source; only the founder
  can clear this. EXACT ACTION BEFORE ANY RELEASE: in Play Console
  (Store presence → Main store listing) and App Store Connect (App
  Information / version metadata), remove every cardio-logging claim -
  the stale lines are enumerated in docs/PLAY_STORE_LISTING.md
  (:41,:44,:56,:149,:202-203 area) and
  docs/APP_STORE_CONNECT_LISTING.md (:326 area) - and BOTH Data
  Safety / privacy declarations must drop cardio as a collected data
  type. The in-repo source docs carry STALE-ON-CARDIO banners and must
  be refreshed before pasting.
- **CAMPAIGN 4 (2026-08-10) — update the published listings and rule on
  the FR-C4 items.** Full detail per item:
  `docs/coherence-cleanup-2026-08-10/D95-RULINGS.md` (founder-items
  section).
  - **H4 — published listings still promise cardio.** Cardio logging is
    removed from the app; the Play Store / App Store Connect listings
    (and any live marketing copy sourced from them) need the cardio
    lines removed. The repo source docs now carry STALE-ON-CARDIO
    banners; only the founder can edit the consoles.
  - ~~FQ-6.3 console check~~ CLOSED 2026-08-10: the founder confirmed
    (repeated confirmation) that the 7-day introductory offer exists
    in BOTH consoles - 14 days free in-app, then the first 7 days of
    a store subscription free through Apple and Google. The in-app
    copy stands. Recorded permanently in docs/rules/billing.md so it
    is never re-asked. (H4's cardio listing edits remain open.)
  - FR-C4-1 cardio export coverage · FR-C4-2 notification-pref
    dual-family drift · FR-C4-3 adaptation_events restore path ·
    FR-C4-4 CALC-5 law vs live computeSetTargets · FR-C4-5 partner
    telemetry catalogue · FR-C4-6 notification category derivation
    gaps · FR-C4-7 progress-photo capture-weight gating
    (ED/privacy-adjacent) · FR-C4-8 check-in reminders have no off
    switch despite the locked unsubscribe ledger · FR-C4-9 root
    billing.md/styling.md/watermelon.md and settings.json misnamed
    rules files presenting stale law under config names (rename
    needs founder knowledge of local hook wiring) · FR-C4-10 the
    public/app-map pages are a stale June audit report still published
    (refresh or unpublish) · FR-C4-11 activitySteps.js and the engine's
    steps lever are retained-dormant (zero production callers /
    stepsEnabled:false at the only call site) - revive or retire is a
    product call · FR-PW-1 peak-week retirement design.
  - Data note for FR-C4-1's cluster (Review A): with cardio push
    removed, a cardio row logged offline and never synced before the
    app update cannot reach the cloud and is lost at sign-out (rare;
    recorded on H1). A one-shot drain is a small follow-up if wanted.
  - FR-1..FR-5 (Campaign 3) remain open and unchanged.

- ~~RUN MIGRATIONS 129 + 130~~ DONE 2026-08-06: both applied to
  EU-Dublin by Claude on founder GO and verified (deload_week column +
  comment present -- pre-flight showed the column already existed, the
  Wave-2 "no cloud column" note was stale, so no build-ordering risk ever
  existed; anon-executable SECURITY DEFINER functions 34 -> 0 with
  authenticated access preserved). Nothing blocks the next build.

### CLOSED (2026-07-27) - FULL migration sweep: production is COMPLETE

Founder: "Run all non applied against production there might be more." Swept
every one of the 125 repo migrations against the ACTUAL production schema, not
against the migration history (the history only starts at 101 - everything
before that was applied outside the runner, so it can never answer this).

Method: extracted every object the migrations create - 55 tables, 121 columns,
46 functions - and checked each one for existence in production.

**Result: ZERO missing. Zero tables, zero columns, zero functions.** Every repo
migration is applied. Constraint-only changes were checked separately, since an
object sweep cannot see them: migration 059's numbered meal-slot CHECK is live
(`meal_[0-9]+` present in the pattern), so it is applied despite the CLAUDE.md
header still listing it as HELD - another stale note, like the "116 with
117-128 pending" one.

**Migration 049 is correctly NOT applied and must stay that way.** It drops
`peak_week_plans`, and its own header says "This is a DRAFT. Do not apply yet.
Client-side cleanup required first", listing five client changes that must land
first (sync.js `_pushPeakWeekPlans`, database.js CREATE TABLE and the
deleted_at step, the drift-audit expected set, migration 025's DELETE branch).
Verified: the table still exists. Applying it now would break sync. NOT applied.

### OPEN (2026-07-27) - hardening, NOT a live hole, needs founder sign-off
Ran Supabase's own security advisors while connected. **No ERROR-level findings.**
97 WARN/INFO, of which one class is worth a decision:

**34 SECURITY DEFINER functions are executable by the `anon` role.** I checked
the two that carry no `auth.uid()` guard, because those are the ones that could
matter, and BOTH are safe in effect:
- `apply_founder_pro_entitlement(_user_id, ...)` - gated on the allow-list
  `private.is_founder_pro_user(_user_id)`. An anon caller passing an arbitrary
  UUID gets `founder_pro: false`. It cannot grant Pro to anyone not already
  entitled, so there is no free-Pro path.
- `cascade_advance_due_users()` - takes no parameters and only DOWNGRADES users
  whose trial has already expired. An anon caller can only do what the
  scheduled worker already does. It cannot upgrade anyone.

So: no privilege escalation and no data exposure. It is still poor posture that
`anon` can reach them at all. Revoking `EXECUTE FROM anon` is the fix, but these
are TIER/BILLING functions and CLAUDE.md Section 2 requires explicit founder
permission before any billing change - so I have not touched them.
**Founder: say the word and I will revoke anon EXECUTE on the tier/billing RPCs.**

Also WARN, judged intentional, no action taken: three always-true INSERT
policies (`marketing_waitlist`, `marketing_survey_responses`,
`scan_calibration_events`) - all deliberately anonymous-insert surfaces; 15
functions with a mutable `search_path`; one public storage bucket allowing
listing; and Supabase's leaked-password protection being off.

### CLOSED (2026-07-27) - migrations 119 and 125 APPLIED
Founder authorised: "Yes run 119 and 125 against production". Both applied
through the Supabase connector and verified against production afterwards.

- **119 (lock direct client writes)** was ALREADY applied on 2026-07-12, but
  outside the migration runner, so it never showed in the cloud history and the
  file read as pending for two weeks. Re-running it was a no-op; it is now
  recorded in the history so this cannot mislead again. Verified: all four
  write policies absent, no INSERT/UPDATE/DELETE for `authenticated` on
  partnerships, no INSERT on engine_telemetry or consent_log, and the
  partner_weekly_intentions UPDATE policy carries the hardened
  active-pair-membership qual. Checked and NOT a hole: `authenticated` still
  holds UPDATE/DELETE grants on engine_telemetry and consent_log, but RLS is on
  and neither table has an UPDATE or DELETE policy, so RLS denies both.
- **125 (notification category CHECK)** genuinely was pending. Applied.
  Verified the CHECK now admits 'planned_meal_confirm' - the category whose
  23514 rejection failed the entire preference push every sync and blocked
  sign-out behind "Sync incomplete" - and carries all 23 categories. The list
  was diffed against CATEGORY in src/lib/notifications/categories.js before
  applying: 23 for 23, no drift in either direction.

**Every repo migration is now applied to production.** No pending schema work.

### (superseded) OPEN (2026-07-27) - DECISION NEEDED: apply migrations 119 and 125?
Production migration history was checked directly this session. The old
"production is at 116, 117-128 pending" note was WRONG: 117, 118, 120-124,
126 and 127 are all applied (under drifted names). Migration 128 was applied
this session on your "run against production".

Two repo migrations are genuinely NOT applied and NOT authorised:
- `migrate_119_lock_direct_client_writes.sql`
- `migrate_125_notification_preferences_category_full_enum.sql`
Your authorisation was given in the context of the App Review accounts, so I
have not touched these. Say "run against production" again naming 119 and 125
if you want them applied.

### OPEN (2026-07-27) - Apple App Review accounts: DELETE AFTER REVIEW
Both accounts are live in production now. Rollback SQL is in the header of
`supabase/migrate_128_apple_review_accounts.sql`. Run it once review completes;
they are not meant to live indefinitely.

### OPEN (2026-07-27) - CLAUDE.md wording lags a founder decision
Section 2 says share cards never include bodyweight, with ONE approved
exception (the Pro before/after card). The weekly recap card is a SECOND
approved exception - you ruled it on 2026-06-22, recorded verbatim at
`src/lib/shareCard/greatWeek.js:13-19`. The code is correct and stays as is;
the constitution's sentence needs a one-line correction to match. Flagged
rather than edited, because Section 2 is yours.

### OPEN (2026-07-27) - share-card canvas format question
The share-card audit recommends retiring the 1:1 square canvas for 4:5, which
is the largest ratio Instagram renders without cropping and would remove the
dead space on story cards. I have NOT changed it: it is a product decision
about what users are already sharing, not a defect. Want it changed?

### OPEN (2026-07-27) - SUPABASE_DB_URL secret still empty
`deploy-migrations.yml` still cannot run (five consecutive failures at step 1).
Not blocking any more - cloud work now goes through the Supabase connector -
but worth adding in repo Settings -> Secrets and variables -> Actions so the
workflow survives as a fallback.


- **App Store Connect IAP check (VOLYUME-17, founder said "tomorrow" on
  2026-07-12).** Two things: (1) Business/Agreements shows the Paid
  Applications agreement ACTIVE with banking + tax complete; (2) the app's
  Subscriptions show `pro_monthly` + `pro_annual` in "Ready to Submit"
  with prices set. IAP works in TestFlight sandbox once these are green -
  "only TestFlight" is not the cause, and it will not self-fix at release.
  If both are already green, report the subscription states back and the
  lead digs into the code path (billing gate applies). Source: D77.6.
- **Fresh EAS iOS build + crash-fix device walk (2026-07-12 session).**
  Bump the build number; nothing from the session is OTA-carryable. Walk:
  cold-launch x4 (no crash-loop), tab bar flush on BOTH devices, progress
  scan (Sentry diagnostic should read engine: fast_tflite, no new
  VOLYUME-1F), tap a logged set -> edit sheet with delete on iOS
  (long-press menu is now Android-only - amend walk item 14 accordingly),
  fresh-profile check-in nudge stays quiet inside the 5-day baseline,
  Apple sign-in on the founder device. Source: D77.
- **iOS Live Activity provisioning.** App Groups provisioning on BOTH App IDs (`app.volyume` + `app.volyume.widget`, then EAS credentials re-sync) + fresh EAS build. The Live Activity is ALREADY fully wired in code (item 19, `60190a7` docs-only fix). Source: D27; handover item 19.
- **Fresh EAS build (device-walk gate).** Required before device-walking this branch: native modules/code landed this campaign (keyboard-controller + zeego + peers, expo-splash-screen, themed monochrome icon, D34 Kotlin rest-timer bridge, react-native-haptic-feedback). CI Android build is GREEN (run 2611, `3daa3ae`) but a signed EAS build must still be produced. Source: handover FOUNDER-SIDE ACTIONS.
- **Play OAuth SHA-1 confirm.** Source: CLAUDE.md status banner; handover.
- **Run `refresh-off-snapshot.yml`.** Lands OFF branded micronutrient data into the bundled snapshot (the operational remainder of item 16). Source: D26/D37; handover.
- **migrate_117 apply.** Telemetry-view REVOKE (drafted + committed `653fe32`); needs the exact phrase "run against production", then re-verify grants and update the file header + `supabase/README`. Source: handover AWAITING FOUNDER; CLAUDE.md supabase rules.
- **Device-walk backlog.** The fresh EAS build carries a large walk backlog: item 6 (max system font), item 13 (photo gallery), item 14 (keyboard/zeego + set-row menu), item 20 (drag reorder), weigh-in edit/delete, dietary needs, vitamins/micros, haptics, next-exercise reorder, bottom sheets, Help/FAQ, live theming, and VERIFY the timeline diary reverted to meal cards. Full step-by-step checklists are in the handover (and its archive) per item. Source: handover FOUNDER-SIDE ACTIONS + per-item checklists.

---

## 4. HELD / NEVER RE-PROPOSE (visible in one place - do NOT build or re-surface)

- **Exercise media programme (#18)** - HELD, founder not funding it now (D14 assessment; D29 STILL HELD). Do not re-propose.
- **Rest-day notification (#22)** - HELD (D17 FQ-1 option 3; D29 STILL HELD). Recorded gated copy/trigger for if it ever unblocks; do not build.
- **Plate calculator** - REJECTED, moot for UK users (D14 assessment). Do not re-propose.
- **Paywall social proof (review excerpts)** - NO, stays dark (D14 assessment). Do not re-propose.
- **RPE/RIR reinstatement** - settled-removed; the effort picker stays out (D14; D19 addendum re-affirmed). Do not re-surface.
- **Flat timeline food diary** - built and REVERTED on the founder's device verdict; meal cards are canonical. NEVER re-propose (D37 item 15).
- **Supabase migrations 049 / 059** - HELD (CLAUDE.md status; `supabase/README`). Do not apply.
- **AI-assisted food input (photo meal-scan / voice)** - HELD by founder order, not rejected and not approved; do not build or re-propose unprompted (D27 addendum). (The coaching engine's no-AI rule is separate and absolute.)

---
