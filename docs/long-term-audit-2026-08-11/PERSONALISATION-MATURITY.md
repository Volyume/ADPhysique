# Personalisation maturity model, rebuilt from code

> **CORRECTION (2026-08-11, choice-memory lane, verified by the lead).**
> This document states in several places (entry 5, the Day-180 close)
> that AsyncStorage-only values - manual landmarks, streak state,
> wellbeing mode, win-back state, the habit schedule - are lost on
> reinstall. That is WRONG: shouldSyncPref is allow-by-prefix
> (`sync.js`), every `@volyume_` key mirrors to user_prefs unless
> explicitly excluded, and manual landmarks + calm mode are additionally
> write-stamp guarded (calm has a one-way ratchet). All five cross a
> reinstall. The learning conclusions are unaffected; only the
> persistence column is corrected. See CHOICE-MEMORY.md Part 0.


Campaign 6, Phase 2 ("30 / 90 / 180 DAY PRODUCT MODEL"). Audit only. Nothing
in `src/`, no test and no other document was modified to produce this file.

**Authority.** The founder's Campaign 6 order, Phase 2, verbatim: "Rebuild the
product's actual personalisation maturity model from code. For each horizon
answer: DAY 30: What genuinely knows more about the user than Day 1? DAY 90:
What has learned across multiple blocks? DAY 180: Which values are now
substantially history-driven? ONE YEAR: What survives indefinitely? ... For
every learned/derived system record: input; minimum evidence; learning rate;
persistence; reset condition; stale condition; manual override interaction;
safety interaction; tier interaction; user-facing explanation; what happens
after absence." Binding constraints from
`docs/long-term-audit-2026-08-11/CAMPAIGN-LOG.md`.

**D91-25 posture.** This document is characterise-only. Where a value has no
stale condition, that fact is RECORDED neutrally. No freshness rule, decay
curve, training-epoch semantics or half-life is proposed anywhere in this
file, including in the "no stale condition" register at the end. The register
is a factual list, not a work list.

**Method.** Every claim below is traced from `main` (branch
`claude/campaign6-long-term`, identical to main `5764a947` plus docs) and cited
as `file:line`. Nothing is inferred from a doc, a label or a summary. Where the
code contradicts a comment or a copy string, the code is reported as the truth
and the divergence is named.

**Block cadence used throughout.** A block is six weeks: five accumulation
weeks and a recovery week (`src/lib/mesocycle.js:28-29`, written at activation
in `src/lib/database.js:3725,3753`). So the horizons land roughly at: day 30 =
mid block 1; day 90 = two blocks finished; day 180 = four blocks finished; one
year = eight or nine blocks finished. Nothing advances a block automatically
(`src/lib/mesocycle.js:479-495` returns `completed_awaiting_decision` and stays
there however long it is ignored).

---

## PART 1 - THE FOUR HORIZONS

### DAY 30: what genuinely knows more about the user than day 1

At day 30 the user is roughly in accumulation week 4 or 5 of their FIRST block.
The single most important structural fact is that **no Block Ledger exists
yet**: `computeAndStoreBlockLedger` hard-refuses any block that is not
`awaitingDecision` (`src/lib/blockLedgerRunner.js:106-107`, "A ledger is
BLOCK-END evidence ... the finished state is a hard precondition"). Since the
first block finishes at week 6, **there is no ledger, and therefore no learned
range, at day 30**. `computeLearnedRange` returns `isLearned: false` with zero
evidence blocks whenever the replayed history is empty
(`src/lib/learnedRange.js:183`).

What genuinely does know more:

1. **Session-grain adaptive volume bands (Pro only).**
   `computeAdaptiveLandmarks` starts adapting a muscle at three data points
   (`src/lib/algorithms.js:959-963`), where a data point is one completed
   workout that trained the muscle AND carried an `overall_pump` answer
   (`src/lib/database.js:5374-5380`). A user training a muscle twice a week
   and rating pump reaches three points in about two weeks, so by day 30
   several muscles are `isAdapted: true` and their mev/mav/mrv have moved
   (`src/lib/algorithms.js:1005-1022`). This is the ONLY volume-band
   personalisation live at day 30, and only for Pro
   (`src/lib/effectiveLandmarks.js:118`, `tier !== 'pro'` returns null).

2. **Per-exercise progression memory.** `computeSetTargets` reads the previous
   session's working sets and the session before that
   (`src/lib/algorithms.js:391-406`), plus the previous session's FQ-3
   difficulty rating (`src/lib/algorithms.js:409-421`). This is live from the
   SECOND session of an exercise. It is memory of the last two sessions only,
   not an accumulating model.

3. **PR baselines, per exercise.** The first qualifying exposure to an exercise
   establishes a baseline and is deliberately NOT a record
   (`src/screens/ActiveWorkoutScreen.js:1685-1694`, FQ-7). From the second
   exposure onwards `detectPR` (`src/lib/algorithms.js:615-668`) compares
   against ALL prior working sets for that exercise. By day 30 the user has a
   real personal-best table for every exercise they have repeated.

4. **Readiness / recovery EMAs.** `computeRecoveryEMAs`
   (`src/lib/recoveryEMA.js:48-67`) fires from a single feedback point and
   weights by a seven-day half-life (`src/lib/recoveryEMA.js:11`). At day 30 it
   is fully warmed up and reflects roughly the last fortnight.

5. **Session autoregulation.** `computeSessionAdjustments`
   (`src/lib/algorithms.js:1044-1220`) is live from the first session inside a
   mesocycle week; its add-frequency cap and revert memory derive from
   `adaptation_events` written by earlier sessions
   (`src/lib/algorithms.js:1090-1101`).

6. **Habit-derived training reminders.** `deriveHabitualTrainingWeekdays`
   requires two full calendar weeks of completed-workout history before it
   writes anything (`src/lib/notifications/trainingHabitSchedule.js:53,86-87`),
   then reads a rolling six-week window
   (`src/lib/notifications/trainingHabitSchedule.js:46,89-90`). By day 30 the
   reminder schedule is genuinely the user's own weekdays.

7. **Adaptive TDEE (Pro, nutrition).** Needs 14 EWMA points minimum
   (`src/lib/nutritionEngine.js:317-320`) and reaches `'high'` confidence only
   at four distinct-day weeks (`src/lib/nutritionEngine.js:363`). A daily
   weigher hits `'high'` at about day 28. So day 30 is the EARLIEST the
   energy-balance-sized calorie change can replace the blunt fixed step
   (`src/lib/weeklyCoach.js:1043,1082-1086`).

8. **Streak / consistency.** `useWeeklyStreak` gathers twelve weeks but starts
   the strip at the user's first completed workout
   (`src/hooks/useWeeklyStreak.js:85-97`), so at day 30 there are four or five
   real marks.

What does NOT know more at day 30: the learned working range, the Block Ledger,
the block-grain performance metric (`blockMetrics` is only computed inside the
ledger runner), and the seed-source fallback chain (its ledger and learned
rungs are both empty, so a second block would seed from
`profile` or `research`, `src/lib/blockSeed.js:164-173`).

### DAY 90: what has learned across multiple blocks

At day 90 two blocks have finished, so the block-grain memory is live for the
first time.

1. **The Block Ledger chain now has two links.** Each finished block stores a
   per-muscle ledger on its mesocycle row
   (`src/lib/blockLedgerRunner.js:263-272`, `storeBlockLedger`), and
   `priorLedgerEntries` folds every prior block's entry, oldest first, into the
   replay (`src/lib/blockLedgerGather.js:357-378`).

2. **The learned working range exists.** `computeLearnedRange` marks
   `isLearned: true` once at least one entry qualifies
   (`src/lib/learnedRange.js:183`). Qualification is strict: confidence >= 0.6
   (`src/lib/learnedRange.js:50,133`), a real classification
   (`src/lib/learnedRange.js:135-142`), usable observed numbers
   (`src/lib/learnedRange.js:151-152`), and NOT a manual-override fold
   (`src/lib/learnedRange.js:138`). With a maximum ceiling step of 2 sets and a
   floor step of 1 set per block (`src/lib/learnedRange.js:51-52`), two blocks
   can have moved the ceiling by at most 4 sets and the floor by at most 2.

3. **Block classification history is chained.** `trailingStaleCount`
   (`src/lib/blockLedgerGather.js:381-388`) counts consecutive trailing STALE
   blocks, and `interBlock` uses `priorFlatBlocks >= 1` to escalate from a
   quiet hold to a proposed stimulus change (`src/lib/interBlock.js:363-364`).
   That escalation is only reachable from block 2 onwards.

4. **The seed fallback chain now has real rungs.** `resolveSeedRange`
   (`src/lib/blockSeed.js:52-173`) can now return `source: 'ledger'` (a valid
   proposal from the block just finished, `src/lib/blockSeed.js:93-148`) or
   `source: 'learned'` (the learned band, `src/lib/blockSeed.js:154-161`).
   Block 3's planned volume rows are therefore stamped `seed_ledger` or
   `seed_learned` (`src/lib/database.js:4202`), which is what unlocks the
   personalised block-start copy (`src/lib/blockExplain.js:70-74`).

5. **The strain-scaled recovery week.** Only a ledger seed carries an achieved
   peak plus a strain score, so only from block 3 does the recovery week get
   sized from what the muscle actually did rather than a flat MEV week
   (`src/lib/blockSeed.js:124-147`, `src/lib/coachApply.js:232-246`).

6. **Adaptive TDEE at high confidence, with cooldowns.** By day 90 a consistent
   weigher has had multiple applied calorie changes, each gated by the two-week
   cooldown counted in real elapsed weeks
   (`src/screens/CoachOutputScreen.js:1677-1681`).

7. **Coach output history.** `coach_outputs` holds one row per user-week
   (`src/lib/database.js:6733-6790`), so by day 90 there are up to thirteen
   weekly decisions with their applied receipts.

### DAY 180: which values are now substantially history-driven

Four blocks are behind the user. The values that are now substantially
history-driven rather than research or profile:

1. **The learned ceiling.** After four qualifying RESPONSIVE blocks the ceiling
   can have moved up to 8 sets from the profile-adjusted MAV prior, and it
   tracks the HIGHEST weekly volume any responsive block ever handled, as a
   running maximum rather than the latest block's number
   (`src/lib/learnedRange.js:118-120,156-161`). At this horizon the ceiling is
   substantially a history artefact.

2. **The learned floor.** Monotone downward only, 1 set per block
   (`src/lib/learnedRange.js:52,171-178`), anchored so it can never fall below
   the raw research MEV (`src/lib/learnedRange.js:104-108,123-125`). After four
   blocks the floor is history-driven downward but the research anchor is still
   the hard bound, so this value is history-driven WITHIN a research frame, not
   instead of one.

3. **The next block's start and peak.** Both come from `resolveSeedRange`,
   which will reach the `ledger` rung on any judgeable block and the `learned`
   rung otherwise (`src/lib/blockSeed.js:86-161`). Research is only reached
   when profile-adjusted landmarks are also unavailable
   (`src/lib/blockSeed.js:172-173`).

4. **The recovery week's per-muscle dose.** Strain-scaled from the achieved
   peak, 60% down to 40% as strain rises (`src/lib/coachApply.js:222-238`).

5. **The session's per-exercise working-set base.** From FQ-4,
   `computeWeeklySessionAllocation` scales each exercise's routine count by
   this week's planned sets over the block's week-1 planned sets
   (`src/lib/coachApply.js:389-405`), and those planned rows are themselves
   ledger-seeded. So by day 180 the number of sets a user is asked to do in a
   given session traces back through the ledger to earlier blocks.

6. **The adapted volume bands.** `computeAdaptiveLandmarks` reads up to 200
   sessions (`src/lib/database.js:5380`). At day 180 that window is almost
   certainly wider than the user's whole history, so the adapted table is
   history-driven over the entire account. Two properties of that window are
   worth recording precisely, because they are not what the code's own comment
   claims:
   - The rows arrive newest-first (`ORDER BY w.started_at DESC`,
     `src/lib/database.js:5379`) and are mapped in that order
     (`src/lib/database.js:5412`). `computeAdaptiveLandmarks` then takes
     `entries.slice(-8)` and calls it "last 8 data points"
     (`src/lib/algorithms.js:974`). `slice(-8)` on a newest-first array takes
     the OLDEST eight rows in the window. So the "recent" averages that drive
     the +/-4 set adjustment (`src/lib/algorithms.js:975-999`) are computed
     from the oldest eight sessions the 200-row window still holds, not the
     newest eight. At day 30 this is harmless because the window is short. By
     day 180 the divergence between "oldest eight of 200" and "newest eight" is
     large. Recorded as a factual finding; no fix is proposed here.
   - `bestVolume` (which becomes the adapted MAV,
     `src/lib/algorithms.js:1002-1008`) is selected from that same
     oldest-eight slice.

7. **Nutrition maintenance.** NOT persisted. `adjustedTDEE` is computed on each
   run (`src/lib/nutritionEngine.js:350,416`) and is consumed only by the
   display card (`src/lib/weightTrend.js:121,134,166`,
   `src/screens/BodyMetricsScreen.js:1184`) and by the sizing of that week's
   calorie change (`src/lib/weeklyCoach.js:1082-1086`). `computeCalorieTargets`
   spreads the existing row and moves only `targetKcal`, `fatG` and `carbsG`
   (`src/lib/coachApply.js:79-88`), so `nutrition_targets.tdee` keeps whatever
   the original Mifflin/Katch calculation wrote. What IS history-driven at day
   180 is the applied calorie TARGET, which has drifted through many small
   applied changes; the stored maintenance estimate itself has not learned at
   all.

### ONE YEAR: what survives indefinitely

Things that are unbounded, never reset, or only grow:

1. **The Block Ledger chain.** `priorLedgerEntries` filters only on
   `start < beforeStartMs` and the presence of a stored ledger
   (`src/lib/blockLedgerGather.js:364-369`). There is no age bound, no count
   bound and no pruning. At one year the replay folds eight or nine blocks; at
   five years it would fold forty.

2. **The learned working range.** `computeLearnedRange` has no clock, no
   `now`, and no age input at all (`src/lib/learnedRange.js:88-94`, the whole
   parameter object). It is a pure fold over the entire chain. A ceiling proven
   in block 2 survives indefinitely unless later qualifying blocks step it
   down.

3. **PR history.** Personal records are never stored as a derived record; they
   are recomputed from the complete `workout_sets` history on every read
   (`src/lib/algorithms.js:624-628` compares against all supplied history;
   `src/lib/database.js:6252-6265` fetches every prior working set with no
   date floor). An all-time best from year one still gates whether a lift is a
   PR in year three.

4. **Lifetime session milestones.** `src/lib/milestones.js:12-14`: 5 / 10 / 25
   / 50 / 100 lifetime sessions. Monotone, never reset.

5. **Streak high-water and longest run.** `recordHighWater` never lowers
   (`src/lib/streakState.js:80-85`) and `longestRun` takes the max over every
   recorded week (`src/lib/streakState.js:88-91`). Local-only AsyncStorage
   (`src/lib/streakState.js:26`), so it survives indefinitely on the device but
   is lost at reinstall.

6. **The win-back 180-day floor.** `LAST_FIRED_KEY` is deliberately kept when
   the episode is cleared (`src/lib/winbackState.js:155-160`), so a
   once-per-180-days ceiling on win-back notifications persists across
   episodes for the life of the install.

7. **An open ED-pattern flag.** `getOpenEdPatternFlag` selects on
   `cleared_at IS NULL` with no age condition
   (`src/lib/database.js:8444-8452`), and `hasEdPatternCleared` requires
   POSITIVE evidence over two consecutive weeks
   (`src/lib/edPatternDetector.js:83-107`, with the explicit note "a protective
   hold must NOT lift just because an at-risk user stopped logging"). An open
   flag therefore survives absence indefinitely, by design. This is safety
   behaviour and is recorded here only for completeness; no change is proposed.

8. **Calm mode.** A single AsyncStorage string with no expiry
   (`src/lib/wellbeing.js:17,22-29`).

9. **`coach_outputs` and `adaptation_events`.** Neither table has a pruning
   path in `database.js`; `adaptation_events` is only ever read through a
   time-bounded query (`src/lib/database.js:4407-4421`, `limitWeeks`), so the
   rows accumulate for ever but only a trailing window is consumed.

Things that do NOT survive: everything held only in AsyncStorage is lost on
reinstall or on a new device (manual landmarks, streak state, wellbeing mode,
win-back state, the habit schedule); adaptive TDEE state never existed to
survive; and the 200-row window in `getAdaptiveLandmarkHistory` is the one
learned system with a genuine, if large, bound.

---

## PART 2 - LEARNED AND DERIVED SYSTEMS INVENTORY

28 systems. Each entry uses the founder's eleven fields. "Stale condition"
records what, if anything, ages the value out; where nothing does, that is
stated plainly and nothing further is proposed.

---

### 1. Block Ledger, per-muscle classification and proposal

- **Files.** `src/lib/interBlock.js` (pure), `src/lib/blockLedgerGather.js`
  (pure transforms), `src/lib/blockLedgerRunner.js` (I/O),
  `src/lib/blockMetrics.js` (performance half).
- **Input.** Per muscle: effective landmarks, research MEV, learned ceiling,
  manual-override flag, week-1 planned sets, planned peak, achieved peak, prior
  flat-block count, adherence (completed/planned sets), performance
  (`e1rmSlopePct`, `prDensity`, `eligibleExposures`, `confidence`,
  `discontinuity`, `doseResponse`) and recovery (late soreness, joint,
  readiness slope, sleep-flagged weeks, deload flags, data points)
  (`src/lib/interBlock.js:113-121`, assembled at
  `src/lib/blockLedgerRunner.js:184-253`).
- **Minimum evidence.** Four hard gates, each returning INSUFFICIENT_DATA:
  adherence >= 0.6 (`src/lib/interBlock.js:81,282`), >= 4 eligible exposures
  (`:82,287`), >= 4 recovery data points (`:83,292`), composite confidence
  >= 0.6 (`:84,302`), plus a discontinuity gate for an exercise change
  (`:297`). Missing landmarks fail closed to a null proposal (`:177-189`).
- **Learning rate.** One block per ledger. RESPONSIVE grants at most +1 set to
  the start, and only on the dose-response evidence pair
  (`src/lib/interBlock.js:342-346`). STRAINED cuts 2
  (`:313-314`). OVERREACHED holds the start (or -1 if the deload flag fired
  mid-block) and pulls the peak to `min(achievedPeak, plannedPeak) - 2`
  (`:326-328`). STALE moves nothing (`:365`).
- **Persistence.** JSON on `mesocycles.block_ledger`, written by
  `storeBlockLedger` (`src/lib/blockLedgerRunner.js:271`). Synced: the
  mesocycles push carries `block_ledger` with a column-tolerant retry
  (`src/lib/sync.js:983`), and mesocycles are pulled at
  `src/lib/sync.js:2114-2137`.
- **Reset condition.** None by age. Idempotent per block: an already-stored
  ledger at the current `LEDGER_VERSION` is returned as-is unless
  `{ force: true }` (`src/lib/blockLedgerRunner.js:109-114`). A schema-version
  bump is the only automatic recompute.
- **Stale condition.** PARTIAL, and only for the CURRENT proposal, not the
  record. `weeksSinceBlockEnd >= 4` (`STALE_EVIDENCE_WEEKS`,
  `src/lib/interBlock.js:88`) blocks the dose-response +1
  (`:343-345`) and applies the no-upward-carry hold (`:240-245`), with an
  `evidence_weeks_old` marker added to the evidence trail (`:168-170`). The
  stored ledger itself never ages out and is replayed for ever.
- **Manual override interaction.** A genuine manual edit sets
  `deferredToManual`, which nulls the proposal numbers and reframes the
  rationale as a note rather than a change (`src/lib/interBlock.js:140,215-217,
  266-271`). An untouched editor default is NOT an override
  (`src/lib/effectiveLandmarks.js:85-96`, wired at
  `src/lib/blockLedgerRunner.js:227`).
- **Safety interaction.** `ctx.suppressed` is calm mode OR an open ED flag,
  ORed by the caller and read fail-closed (a failed read counts as suppressed,
  `src/lib/blockLedgerRunner.js:78-83`). Under suppression there is no upward
  carry anywhere; the hold cap is `max(previousStart, researchMev)` and
  reductions pass through (`src/lib/interBlock.js:240-245`).
  `upwardCarryPrevented` records when the hold actually bit (`:244`).
- **Tier interaction.** The adapted landmark layer threads the REAL tier and
  defaults to `'free'`, which fails closed to no adapted layer
  (`src/lib/blockLedgerRunner.js:93,174`). The classification itself never
  consults tier (`src/lib/interBlock.js:12-13`).
- **User-facing explanation.** Each entry carries a `rationale` composed from
  the FINAL clamped numbers so the copy cannot contradict the proposal
  (`src/lib/interBlock.js:206-224`), and `buildLedgerReflectionRows` reuses it
  verbatim (`src/lib/blockExplain.js:238-252`).
- **After absence.** The ledger is computed only when the block is
  `awaitingDecision` (`src/lib/blockLedgerRunner.js:106-107`), which is exactly
  the state a lapsed user returns to (`src/lib/mesocycle.js:484-486`). A user
  who walked away mid-block and returns will typically fail the adherence gate
  and receive INSUFFICIENT_DATA with the research-table seed
  (`src/lib/interBlock.js:282-286`). `weeksOverdue` grows without bound
  (`src/lib/mesocycle.js:493`) and, past four weeks, suppresses the +1 and
  applies the hold.

---

### 2. Learned working range (block-grain memory)

- **File.** `src/lib/learnedRange.js`.
- **Input.** Profile-adjusted prior (`mev`/`mav`/`mrv`), raw research MEV as
  the absolute floor anchor, the session-grain adapted MRV when one exists, and
  the muscle's ledger history oldest to newest
  (`src/lib/learnedRange.js:88-94`).
- **Minimum evidence.** Per entry: confidence >= 0.6
  (`src/lib/learnedRange.js:50,133`), a real classification (INSUFFICIENT_DATA
  is skipped, `:135`), not `deferredToManual` (`:138`), and at least one usable
  observed number (`:151-152`). `isLearned` requires one qualifying block
  (`:183`). A degenerate prior fails closed to null bounds (`:101-103`).
- **Learning rate.** Ceiling at most 2 sets per block, floor at most 1
  (`src/lib/learnedRange.js:51-52`). The ceiling targets the running maximum of
  responsive achieved peaks (`:156-161`), moves DOWN only for OVERREACHED
  (toward `achievedPeak - 2`, `:162-164`) and STRAINED (toward the block's
  start, `:165-167`), and does not move at all for STALE (`:168`). The floor is
  monotone downward toward the lowest progressing start (`:171-178`).
- **Persistence.** NONE of its own. It is a pure replay computed on read from
  the ledger chain (`src/lib/learnedRange.js:15-18`, and both call sites
  recompute: `src/lib/blockLedgerRunner.js:212-218,359-365`). The persistence
  is the ledger chain's.
- **Reset condition.** None. Only the removal of the underlying ledgers (a
  wipe or a fresh install without a cloud pull) resets it.
- **Stale condition.** NONE. There is no clock, no `now` parameter and no age
  weighting anywhere in the module. Every qualifying entry in the chain is
  folded with equal standing regardless of whether it is six weeks or six years
  old; recency enters only through fold ORDER, because later entries step the
  running value last. This is the D91-25 surface named in the campaign order,
  recorded here as fact.
- **Manual override interaction.** Manual-override blocks do not teach: their
  entries are skipped entirely (`src/lib/learnedRange.js:136-138`), so a user's
  own numbers cannot launder into "learned from your history" once the override
  is removed.
- **Safety interaction.** An entry marked `observed.suppressed` (calm mode or
  open ED flag during that block) can NEVER move the ceiling upward
  (`src/lib/learnedRange.js:154-161`); its downward evidence still counts
  (`:162-167`). The research MEV anchor out-ranks every cap
  (`:104-108,123-125`).
- **Tier interaction.** Indirect. `adaptedMrv` is only supplied when the
  adapted table exists, which is Pro-only (`src/lib/blockLedgerRunner.js:215`,
  `src/lib/effectiveLandmarks.js:118`). The fold itself is tier-blind.
- **User-facing explanation.** Reaches the user only through the seed source
  `seed_learned`, whose copy clause is "set by what past blocks have shown"
  (`src/lib/blockExplain.js:70-74`). Note for Phase 7: that clause carries no
  age qualifier, and the underlying value has no age bound.
- **After absence.** Nothing happens to it. It is unchanged by a gap of any
  length. The only re-entry protection between an old learned ceiling and a
  returning user is downstream: `resolveSeedRange` skips the learned band
  entirely under suppression (`src/lib/blockSeed.js:154`), and a valid ledger
  entry outranks it (`:93`). A returning user whose last block was
  INSUFFICIENT_DATA falls through to the learned band, whose PEAK is the
  possibly-ancient ceiling while its START is the conservative monotone floor.

---

### 3. Session-grain adaptive volume landmarks

- **Files.** `src/lib/algorithms.js:944-1025` (pure),
  `src/lib/database.js:5353-5424` (history query).
- **Input.** Per completed workout that trained a muscle and carried an
  `overall_pump` answer: pump, 24h-before soreness, joint discomfort, set
  count, average reps, average missed reps, and a per-muscle
  `performanceTrend` derived from the last three sessions versus the three
  before (`src/lib/database.js:5386-5404`).
- **Minimum evidence.** Three entries for that muscle
  (`src/lib/algorithms.js:959-963`); below that the muscle stays at research
  defaults with `isAdapted: false`.
- **Learning rate.** A net score built from six weighted signals
  (`src/lib/algorithms.js:986-993`) becomes an adjustment clamped to +/-4 sets
  (`:996`). MEV moves by the adjustment, MAV becomes `bestVolume` clamped into
  `[base.mev+1, base.mrv-1]`, MRV moves by half the adjustment
  (`:1005-1009`).
- **Persistence.** None of its own; recomputed from the query on every read
  (`src/lib/effectiveLandmarks.js:125-126`,
  `src/lib/sessionAdjustments.js:120,131`). The underlying workouts sync as
  normal.
- **Reset condition.** None. Falling below three entries for a muscle is
  impossible once reached, because the window is by row count, not by date.
- **Stale condition.** BOUNDED BUT NOT DATED. The only bound is `LIMIT 200`
  rows over the whole account (`src/lib/database.js:5380`). There is no date
  floor. Additionally, as recorded in Part 1, the "recent" slice
  (`entries.slice(-8)`, `src/lib/algorithms.js:974`) takes the OLDEST eight
  rows of a newest-first array, so the scoring window is the oldest end of the
  bound, not the newest. Recorded as fact.
- **Manual override interaction.** A manual entry beats the adapted layer
  outright in the precedence merge (`src/lib/effectiveLandmarks.js:44-56`).
- **Safety interaction.** None directly. These are training volume bands, not
  calorie surfaces; `src/lib/effectiveLandmarks.js:24-27` records that
  tier-blindness rules apply to ED guardrails only. Downstream, the adapted MRV
  clamps the learned ceiling (`src/lib/learnedRange.js:109-113`).
- **Tier interaction.** Pro-gated at the loader:
  `getAdaptedLandmarks` returns null for any non-Pro tier
  (`src/lib/effectiveLandmarks.js:118`). Free sees research plus their own
  manual edits.
- **User-facing explanation.** A per-muscle `note` string
  (`src/lib/algorithms.js:1013-1020`), plus `source: 'adapted'` from the merge
  (`src/lib/effectiveLandmarks.js:54`) which the volume surfaces read.
- **After absence.** Unchanged. The window is row-count based, so a year away
  neither shrinks the data nor changes the verdict; the same adapted table is
  presented on return.

---

### 4. Effective landmark precedence (manual > adapted > research)

- **File.** `src/lib/effectiveLandmarks.js:41-61`.
- **Input.** The manual table, the adapted table, the research table.
- **Minimum evidence.** Each layer must carry finite `mev`/`mav`/`mrv`
  (`:46,52`); the adapted layer additionally needs `isAdapted` (`:52`).
- **Learning rate.** N/A; it is a resolver, not a learner.
- **Persistence.** Stateless. Manual comes from AsyncStorage
  (`@volyume_landmarks_<userId>`, `:107`), adapted is recomputed, research is
  a constant.
- **Reset condition.** N/A.
- **Stale condition.** NONE at this layer; it inherits whatever staleness (or
  lack of it) each layer has.
- **Manual override interaction.** This IS the override rule: manual wins.
  `isManualEdit` protects the adaptive layer from being disabled by untouched
  editor defaults. CORRECTION (RA6-1, D97-25): when this document was first
  written that protection existed only in the ledger runner and the seed -
  `mergeLandmarkPrecedence` itself accepted ANY finite manual entry, so a
  legacy full-table save of untouched research defaults disabled the Pro
  adapted layer on every display surface and in the ledger's landmark frame,
  while labelling unchosen values "your own setting". Review A (probe RA6-M)
  found it; the merge now requires `isManualEdit` before accepting a manual
  entry, pinned in `effectiveLandmarks.test.js` ("only a REAL edit counts as
  manual in the merge"). This section's original claim is true as of that fix.
- **Safety interaction.** None; explicitly out of the ED-guardrail scope
  (`:24-27`).
- **Tier interaction.** Only the adapted layer is gated (`:118`).
- **User-facing explanation.** The merge returns a parallel `source` map
  (`:41-60`) so display surfaces can name the layer.
- **After absence.** Unchanged; every read is fresh.

---

### 5. Manual volume-target overrides

- **Files.** `src/lib/effectiveLandmarks.js:104-110` (read),
  `VolumeHeatmapScreen` (editor, named at `src/lib/effectiveLandmarks.js:18`).
- **Input.** The user's typed mev/mav/mrv per muscle.
- **Minimum evidence.** A single edited value that differs from the research
  default counts (`src/lib/effectiveLandmarks.js:92-95`).
- **Learning rate.** N/A; explicit user intent, applied immediately.
- **Persistence.** AsyncStorage key `@volyume_landmarks_<userId>`
  (`src/lib/effectiveLandmarks.js:107`). NOT in `SYNC_REGISTRY`
  (`src/lib/sync/registry.js:22-250`) and not in the legacy sync path, so it is
  device-local and LOST on reinstall or a new device.
- **Reset condition.** Only the user clearing it.
- **Stale condition.** NONE. A manual value set once persists until edited,
  regardless of age.
- **Manual override interaction.** It is the top of every chain: precedence
  merge (`src/lib/effectiveLandmarks.js:45-50`), seeding chain rung 1
  (`src/lib/blockSeed.js:69-79`), and it suppresses ledger teaching for that
  muscle (`src/lib/interBlock.js:140`).
- **Safety interaction.** Suppression-proof by design: "a manual override is
  the user's own explicit numbers and stands"
  (`src/lib/blockSeed.js:20-25,69-79`). The absolute weekly ceiling of 30 sets
  still clamps it (`src/lib/blockSeed.js:64-65`,
  `src/lib/coachApply.js:50`), and the research MEV floor still applies
  (`src/lib/blockSeed.js:63-64`).
- **Tier interaction.** Available on both tiers
  (`src/lib/effectiveLandmarks.js:24-25`).
- **User-facing explanation.** Seed source `seed_manual`, copy clause "your own
  setting" (`src/lib/blockExplain.js:70-74`).
- **After absence.** Unchanged on the same install. Absent entirely after a
  reinstall or on a second device, at which point the adaptive/learned layers
  silently take over for that muscle with no notice to the user.

---

### 6. Seed fallback chain (`resolveSeedRange`)

- **File.** `src/lib/blockSeed.js:52-173`.
- **Input.** Manual entry, the finished block's ledger entry, the learned
  range, the profile-adjusted prior, the research row, the suppression flag,
  and the advisor intent (`'repeat'` or `'adjust'`).
- **Minimum evidence.** Rung by rung: manual needs a real edit with positive
  numbers (`:75-79`); the ledger rung needs a proposal that is not
  `deferredToManual`, not INSUFFICIENT_DATA, and carries both numbers
  (`:88-92`); the learned rung needs `isLearned` with both bounds
  (`:154-158`); profile needs both numbers (`:166`); research is the last
  resort (`:172-173`).
- **Learning rate.** N/A; it selects, it does not learn.
- **Persistence.** The resolved range is written into
  `planned_muscle_volume` rows with `source = 'seed_' + source`
  (`src/lib/database.js:4202,4213-4218`), and the outcome is recorded back onto
  the source ledger as `seedOutcome`
  (`src/lib/blockLedgerRunner.js:391-407`).
- **Reset condition.** Re-resolved on each next-block decision.
- **Stale condition.** NONE at this layer. It inherits the ledger's four-week
  hold (through the entry's already-clamped numbers) but applies no age test of
  its own, and the learned rung it falls back to has no age bound at all.
- **Manual override interaction.** Rung 1, and suppression-proof (`:69-79`).
- **Safety interaction.** Under suppression: a climbing ledger proposal
  degrades to the repeat numbers while a reduction passes untouched
  (`:102-107`); the learned band is skipped for the conservative
  profile/research default (`:154`); the ledger-sized recovery week is
  withheld (`:126`).
- **Tier interaction.** Indirect, through the adapted layer feeding the learned
  ceiling clamp.
- **User-facing explanation.** The named `source` is what the block-start lines
  speak from, and only the three personalised sources earn a claim
  (`src/lib/blockExplain.js:70-74,178-196`); a research/profile block gets the
  explicit not-personalised-yet line (`:75-77,187-196`), and a mixed block
  names the research remainder (`:126-132,222-224`).
- **After absence.** For a long-lapsed user the ledger rung will usually be
  INSUFFICIENT_DATA (adherence gate), so the chain falls through to the learned
  band. Under calm mode or an open ED flag that band is skipped and the user
  gets the conservative profile default; otherwise the returning user is seeded
  at the learned floor with a peak at the learned ceiling.

---

### 7. `planned_muscle_volume` rows and coach Apply state

- **Files.** `src/lib/database.js:4161-4241` (seed writer),
  `src/lib/coachApply.js:267-292,302-324,340-364,389-405`.
- **Input.** The seed map, then any confirmed Apply (volume delta, deload,
  calorie) the user taps.
- **Minimum evidence.** An Apply requires a user tap; nothing auto-applies
  (`src/lib/coachApply.js:2-6`).
- **Learning rate.** Deltas clamped per muscle into `[mev, mrv]` with an
  absolute 30-set backstop (`src/lib/coachApply.js:340-364,50`); a deload only
  ever reduces a row (`:281`).
- **Persistence.** SQLite `planned_muscle_volume`, plus the applied receipt
  inside the coach output's `output_json`
  (`src/lib/coachApply.js:302-314`). Synced through the legacy path
  (`src/lib/sync.js:1240-1246` push, `:1871-1891` pull). Cloud provenance
  columns (`mev`/`mav`/`mrv`/`source`) await migration 132, which is written
  and unapplied (`supabase/migrate_132_planned_muscle_volume_provenance.sql`).
- **Reset condition.** New rows are written per block with
  `INSERT OR IGNORE` (`src/lib/database.js:4215,4231`), so an existing row for
  a week is never overwritten by the seeder.
- **Stale condition.** NONE. Rows persist for the life of the block and the
  block persists indefinitely.
- **Manual override interaction.** The row's `[mev, mrv]` band is widened to
  accommodate a seeded peak above research MRV so a later Apply cannot clamp
  the muscle back down (`src/lib/database.js:4207-4212`).
- **Safety interaction.** The deload floor is half of research MEV, at least
  one set (`src/lib/coachApply.js:244-246`), and an unreadable strain score
  fails closed to the heaviest strain, i.e. the smallest recovery dose
  (`:222-227`).
- **Tier interaction.** Coaching proposals are Pro; the rows themselves are
  written for any activated plan.
- **User-facing explanation.** `summariseSeededPlan` reads the WRITTEN rows and
  their `source`, never the seed map that was merely requested
  (`src/lib/blockExplain.js:88-124`), and only rows still carrying the week-1
  source count towards the peak (`:114`).
- **After absence.** Rows sit unchanged. A returning user's plan still holds
  the week the block reached, and `getBlockStatus` reports
  `completed_awaiting_decision` rather than wrapping the week index
  (`src/lib/mesocycle.js:479-495`).

---

### 8. Per-exercise progression memory (`computeSetTargets`) and FQ-3 session difficulty

- **Files.** `src/lib/algorithms.js:391-612`,
  `src/screens/ActiveWorkoutScreen.js:1316-1361`.
- **Input.** The previous session's working sets for this exercise, the session
  before that (for consecutive-miss detection), the rep band, the exercise
  category and increment, the layoff multiplier, and
  `prevSessionDifficulty` (1-5, null when skipped)
  (`src/lib/algorithms.js:401-421`).
- **Minimum evidence.** One previous session with at least one working set
  (`:392-399`). A load increase additionally requires reps at the top of the
  band AND a session-difficulty rating of 1-3 AND a positive load
  (`:423-435`). A load DECREASE requires two consecutive sessions missing by
  two or more reps (`:487-497`).
- **Learning rate.** One session of memory. Increase is capped at 5% of the
  load per session with a +0.25 floor (`:437-445`); decrease is one increment.
- **Persistence.** None. Recomputed from `workout_sets` on every exercise load.
- **Reset condition.** N/A.
- **Stale condition.** PARTIAL. The layoff multiplier is the only age-aware
  rule anywhere in the training-load path: if the last set for this exercise is
  more than seven days old, every target load is multiplied by 0.9
  (`src/screens/ActiveWorkoutScreen.js:1339-1342`) and the session
  high-water anchor pass is skipped so the reduction cannot be undone
  (`src/lib/algorithms.js:526-533`). The multiplier is FLAT: 0.9 whether the
  gap is eight days or five years, with the copy "Loads reduced by 10% for your
  first session back after a break. Rebuild over the next 1 to 2 weeks"
  (`:584-586`). Recorded as fact.
- **Manual override interaction.** The computed target is a suggestion chip
  only; the input row is prefilled from what was actually lifted, not from the
  target (`src/screens/ActiveWorkoutScreen.js:1364-1376`).
- **Safety interaction.** Unknown effort holds rather than adds
  (`src/lib/algorithms.js:429-435`, and the honest copy at `:578-590`); a
  bodyweight set can never receive a micro-load instruction (FR-C4-4,
  `:428-431`).
- **Tier interaction.** None; this is free-tier training logic.
- **User-facing explanation.** A single `reason` string chosen from an explicit
  ladder (`src/lib/algorithms.js:582-609`), including the layoff sentence and
  the two honest FQ-3 holds.
- **After absence.** The 0.9 layoff cut fires on the first session back for
  each exercise independently, then disappears from the second session back
  (because the last set is then recent).

---

### 9. Session autoregulation and `adaptation_events` memory

- **Files.** `src/lib/algorithms.js:1044-1220` (pure),
  `src/lib/sessionAdjustments.js:86-191` (I/O),
  `src/lib/database.js:4375-4390` (write), `:4407-4421` (read).
- **Input.** Today's exercises with their allocated planned sets; per-muscle
  signals (`lastTrainedAt`, last session's pump/joint/difficulty) from
  `getSessionAdjustmentSignals` (`src/lib/database.js:8263-8290`); the latest
  check-in; the week's done-by-muscle volume; the adapted landmarks; and this
  mesocycle's `session_*` adaptation events.
- **Minimum evidence.** An active mesocycle week is required
  (`src/lib/sessionAdjustments.js:90`); a failed coach-output or mesocycle read
  returns no adjustments rather than guessing (`:110-129`).
- **Learning rate.** At most +/-1 set per exercise, at most two ADJUSTED
  exercises per session with drops kept before adds
  (`src/lib/algorithms.js:1211-1218`).
- **Persistence.** Every decision is written to `adaptation_events`
  (`src/lib/sessionAdjustments.js:171-184`). Pushed at
  `src/lib/sync.js:1280` and pulled at `:1894-1909`, called in the pull
  sequence at `:1631`.
- **Reset condition.** None; the read window does the limiting.
- **Stale condition.** PARTIAL AND MIXED.
  - The add-frequency cap is scoped to the current week
    (`createdAt >= weekStartMs`, `src/lib/algorithms.js:1096`), and the revert
    memory is scoped to the trailing six weeks the query returns
    (`src/lib/sessionAdjustments.js:127`). Both age out.
  - `lastTrainedAt` is age-gated: `trainedWithin72h`
    (`src/lib/algorithms.js:1115`) and a four-day check-in freshness gate
    (`:1124`).
  - BUT `lastFeedback` (pump, joint, session difficulty) has NO age gate. It is
    `MAX(w.started_at)` per muscle with no date floor
    (`src/lib/database.js:8271-8283`), defaulted into the signals object at
    `src/lib/algorithms.js:1266-1271`. The `stimulusReady` branch that grants
    +1 set reads `lastPerformance <= 2 && lastPump <= 2`
    (`src/lib/algorithms.js:1155-1160`) from that undated feedback. A user
    whose last session before a long gap was easy with a mild pump satisfies
    the stimulus test on their first session back. Recorded as fact.
- **Manual override interaction.** Two logged reverts for a muscle in the
  mesocycle put it on a permanent hold for the rest of the block
  (`src/lib/algorithms.js:1136-1138`).
- **Safety interaction.** Joint discomfort >= 2 holds and suppresses any add
  (`:1139-1141`); residual soreness drops a set only when the weekly floor
  allows (`:1142-1152`); an applied safety hold from the coach output blocks
  the add (`:1163-1167`); deload weeks silence the engine entirely (`:1066`).
- **Tier interaction.** Pro-gated by the caller
  (`src/lib/sessionAdjustments.js:14-15`).
- **User-facing explanation.** A reason string per decision, with precedence
  holds shown only after a "Sharp" pre-session answer
  (`src/lib/algorithms.js:1186-1191`).
- **After absence.** See the stale condition. The three-day and four-day gates
  correctly suppress the soreness paths, so the surviving reachable branch
  after a long gap is the +1 add.

---

### 10. PR history and first-exposure baselines

- **Files.** `src/lib/algorithms.js:615-668` (`detectPR`),
  `src/screens/ActiveWorkoutScreen.js:1679-1712` (FQ-7 baseline),
  `src/lib/database.js:6226-6288` (`getWeeklyPRCount`),
  `src/lib/workoutRecordLine.js` (the shared record line).
- **Input.** The new set's weight and reps, plus all prior working sets for
  that exercise.
- **Minimum evidence.** A prior EXPOSURE, meaning completed working sets from a
  PREVIOUS session (`src/screens/ActiveWorkoutScreen.js:1689`). The first
  exposure establishes the baseline and is celebrated as a starting point, not
  a record (`:1695-1711`). Warm-ups are excluded on both sides (`:1673-1677`).
- **Learning rate.** Immediate; the running best updates set by set.
- **Persistence.** None as a derived record. PRs are recomputed from the
  complete `workout_sets` history on every read
  (`src/lib/database.js:6252-6265` has no date floor on the prior window).
- **Reset condition.** Only deletion or editing of the underlying sets; the
  edit path re-runs detection and clears a now-stale badge
  (`src/screens/ActiveWorkoutScreen.js:1965-1992`).
- **Stale condition.** NONE. An all-time best from any date remains the bar for
  ever. Deload-week and rebound noise is discounted only inside
  `blockMetrics`' PR density (entry 11), never in the user-facing PR itself.
- **Manual override interaction.** None; there is no way to set or clear a PR
  by hand.
- **Safety interaction.** None required; the inputs are load and reps only.
- **Tier interaction.** Free feature.
- **User-facing explanation.** Three explicit record types with a
  `previousValue` for "+X% vs previous" copy
  (`src/lib/algorithms.js:625-665`); the calm first-lift toast for a first
  exposure (`src/screens/ActiveWorkoutScreen.js:1700-1710`).
- **After absence.** Unchanged. The first session back is compared against a
  best that may be a year old, so PRs become rarer but nothing misfires.

---

### 11. Block performance metric: e1RM trend, PR density, dose-response

- **File.** `src/lib/blockMetrics.js`.
- **Input.** The block's completed working sets, exercises by id, prior
  completed sets from a 180-day window
  (`PRIOR_WINDOW_DAYS`, `src/lib/blockLedgerRunner.js:69,125`), workout
  feedback rows, the block frame and the rebound windows.
- **Minimum evidence.** A "stable" exercise needs >= 3 block sessions, presence
  in both accumulation halves, and >= 3 distinct block weeks
  (`src/lib/blockMetrics.js:62-63,257-258`). Newness inference needs >= 4
  usable prior rows (`:65,248`). `lateRecoveryOk` needs BOTH soreness and joint
  answers on at least half the late sessions, all calm (`:363-380`).
- **Learning rate.** Per block. The slope is a Theil-Sen fit per exercise,
  clamped to +/-25% (`:64,91-110`), combined by evidence weight (`:308-310`).
- **Persistence.** Echoed inside the stored ledger's evidence array
  (`src/lib/interBlock.js:160-166`).
- **Reset condition.** Recomputed per block; not carried.
- **Stale condition.** BOUNDED. The prior-best window is 180 days
  (`src/lib/blockLedgerRunner.js:69`), documented as "comfortably covering the
  previous two blocks". The rebound window requires the previous block to have
  ended within 14 days, "a longer gap is detraining, not rebound"
  (`src/lib/blockLedgerGather.js:37,190-192`). This is one of the few genuinely
  dated windows in the training engine.
- **Manual override interaction.** None directly.
- **Safety interaction.** Absent joint feedback never reads as recovered
  (`src/lib/blockLedgerGather.js:104-114`; `blockMetrics` requires both signals
  present, `src/lib/blockMetrics.js:370-373`).
- **Tier interaction.** Reached only through the ledger runner, whose adapted
  layer is Pro-gated.
- **User-facing explanation.** Indirect, through the ledger rationale.
- **After absence.** A long gap means the prior 180-day window is empty, so
  `historyExists` is false and no exercise is marked "new"
  (`src/lib/blockMetrics.js:248`); every lift is treated as established. The
  rebound discount does not apply.

---

### 12. Adaptive TDEE and the EWMA weight trend

- **Files.** `src/lib/nutritionEngine.js:168-424`,
  `src/lib/weeklyCoach.js:975-1046`.
- **Input.** The morning-weight series (60-day fetch,
  `src/screens/CoachOutputScreen.js:1517`), the prescribed calorie target, the
  current TDEE estimate (`nutrition_targets.tdee`,
  `src/screens/CoachOutputScreen.js:1796`), the adherence bucket or, better,
  the ACTUAL seven-day logged intake average
  (`src/lib/nutritionEngine.js:305-311`), and the FFM-floor context.
- **Minimum evidence.** 14 EWMA points (`src/lib/nutritionEngine.js:317-320`);
  a computable weekly change spanning at least six days
  (`:219-234`); >= 5 logged food days before the actual-intake path or the FFM
  floor evaluates (`:390-395`); >= 14 morning weights before the whole block
  runs at all (`src/lib/weeklyCoach.js:975`).
- **Learning rate.** The raw energy-balance signal is damped by a gain hard
  clamped to `[0.50, 0.65]` (`src/lib/nutritionEngine.js:353-354`), then the
  applied change is capped at +/-5% of the current target
  (`src/lib/weeklyCoach.js:1093-1096`), then gated by a two-week cooldown and
  an off-target-weeks requirement (`src/lib/weeklyCoach.js:951-963`).
- **Persistence.** NONE for the estimate. `adjustedTDEE` is returned and
  displayed but never written: `computeCalorieTargets` spreads the row and
  changes only `targetKcal`, `fatG` and `carbsG`
  (`src/lib/coachApply.js:79-88`). The applied calorie TARGET persists in
  `nutrition_targets` (`src/lib/database.js:4478-4520`), which syncs
  bidirectionally (`src/lib/sync/registry.js:169`).
- **Reset condition.** Every run recomputes from the weight window. Falling
  below 14 points returns `confidence: 'insufficient_data'` with a zero
  adjustment (`src/lib/nutritionEngine.js:318-320`).
- **Stale condition.** GENUINE AND DATED. The window is the trailing 60 days of
  morning weights, confidence counts DISTINCT calendar days rather than rows
  (`src/lib/nutritionEngine.js:250-262`), and the weekly rate is normalised
  from timestamps rather than assuming daily logging (`:219-234`). This is the
  best-dated learned system in the product.
- **Manual override interaction.** Nothing applies without the user tapping
  Apply (`src/lib/coachApply.js:2-6`). The user may edit targets directly.
- **Safety interaction.** Heavy. The FFM floor clamps any negative adjustment
  to zero once the seven-day intake sits at or below the RED-S floor
  (`src/lib/nutritionEngine.js:383-411`); the rapid-loss override forces
  upward-only (`:413-415`); the sex-aware calorie floor is re-enforced at the
  Apply write (`src/lib/coachApply.js:38-40,71`); a positive SCOFF or a cycle
  override blocks adjustment entirely (`src/lib/weeklyCoach.js:955-957`).
- **Tier interaction.** Pro (Precision Coaching).
- **User-facing explanation.** A plain-English insight naming the actual
  direction of the weight move rather than the sign of the adjustment
  (`src/lib/nutritionEngine.js:365-381`), a confidence label naming the number
  of weeks (`src/lib/weightTrend.js:28-33`), and an explicit floor-held
  sentence when the FFM floor bites
  (`src/lib/nutritionEngine.js:404-406`).
- **After absence.** Below 14 points in the 60-day window the whole block
  short-circuits to `insufficient_data`, so a returning user gets no calorie
  adjustment until roughly two weeks of weigh-ins accumulate. Old data cannot
  masquerade as current because the window is dated.

---

### 13. Step-trend confidence modifier

- **File.** `src/lib/nutritionEngine.js:426-560`.
- **Input.** Daily step rows over ~42 days, today's day key, and the sign of
  the raw energy-balance adjustment (`:540-560`).
- **Minimum evidence.** A sustained level shift of >= 1500 steps/day AND >= 20%
  of a floored baseline, with each recent half clearing the baseline by 1000
  (`:471-476`).
- **Learning rate.** It changes only the update GAIN, from 0.50 to at most
  0.65, ramped over a 2500-step span (`:477-480`). Steps never produce, size or
  reverse a change and are never given a kcal value (`:432-437`).
- **Persistence.** None; recomputed per run.
- **Stale condition.** GENUINE. Recent window is the last 14 days, baseline is
  the 28 days before that (`:554-556`).
- **Manual override / safety / tier.** Never runs on the rapid-loss path
  (`src/lib/weeklyCoach.js:1035`); the gain clamp is a hard invariant
  (`src/lib/nutritionEngine.js:353-354`); Pro.
- **User-facing explanation.** One appended receipt sentence
  (`src/lib/weeklyCoach.js:1101-1103`), suppressed under any open
  wellbeing/ED flag (`src/lib/weightTrend.js:59-68`).
- **After absence.** No step data means `stepModifier` stays inert
  (`src/lib/weeklyCoach.js:1032`).

---

### 14. Applied nutrition targets

- **Files.** `src/lib/coachApply.js:68-107,196-210`,
  `src/lib/database.js:4478-4520`.
- **Input.** The current targets row and the confirmed calorie change.
- **Minimum evidence.** A user tap.
- **Learning rate.** One change per eligible week, capped at 5%.
- **Persistence.** SQLite `nutrition_targets`, synced bidirectionally
  last-write-wins (`src/lib/sync/registry.js:169-175`).
- **Reset condition.** Overwritten by a new calculation or a new Apply.
- **Stale condition.** NONE. The stored target persists indefinitely and is the
  starting point for the next adjustment however long the gap.
- **Safety interaction.** The sex-aware floor clamps the write and returns null
  when the floor makes the apply a no-op (`src/lib/coachApply.js:68-89`); the
  macro-cycle path refuses to serve any sub-floor DAY
  (`:153-161`).
- **Tier / explanation / absence.** Pro; explained by the coach output's
  receipt; unchanged by absence.

---

### 15. Check-in derived verdicts

- **File.** `src/lib/checkinDerive.js`.
- **Input.** Sessions completed versus planned, PR count, week-over-week
  working-set volume change, food rollups, the target kcal
  (`:74,107`).
- **Minimum evidence.** A planned count and at least one completed session for
  the training verdict (`:75`); at least one logged day with positive kcal for
  the adherence verdict (`:111-112`). With no prior week, only the two
  NON-comparative reads are derived and everything else stays unselected
  (`:90-94`).
- **Learning rate.** N/A; a per-week pre-selection the user can always
  override (`:6-9`).
- **Persistence.** The user's confirmed answer is stored on the check-in row;
  the derivation itself is not stored.
- **Stale condition.** NONE at this layer; the inputs are the week's own data.
- **Manual override interaction.** Explicitly a pre-selection, always
  overridable.
- **Safety interaction.** Explicitly NOT the ED safety system (`:5-9`).
- **Tier / explanation / absence.** Pro; the plain-language verdict text is
  shown beside the raw counts (`:132-137`); with no session data it returns
  null rather than inventing a verdict.

---

### 16. Consecutive-week counters on the coach output

- **File.** `src/screens/CoachOutputScreen.js:1620-1682`.
- **Input.** The last stored coach output and the recent check-in rows.
- **Minimum evidence.** One prior output or one prior check-in.
- **Learning rate.** +1 per qualifying week.
- **Persistence.** `consecutiveOffTargetWeeks` is persisted onto the saved
  output and read back (`:1969`); the others are re-derived from check-ins each
  run (`:1620-1636,1655-1663`).
- **Stale condition.** MIXED, and this is the sharpest finding in this entry.
  - `lastCalAdjustmentWeeksAgo` IS dated: it counts real elapsed weeks from the
    stored `lastCalAdjustmentWeekStart`, and 99 when no change was ever made
    (`:1677-1681`). Correct across any gap.
  - `consecutiveOffTargetWeeks` is NOT dated. It is
    `lastOutput?.trend?.onTarget === false ? (lastOutput?.consecutiveOffTargetWeeks ?? 0) + 1 : 0`
    (`:1647-1650`), with no check that `lastOutput` belongs to the immediately
    preceding week. `getLatestCoachOutput` returns the newest row by
    `week_start` with no age bound (`src/lib/database.js:6791-6799`). A user
    whose last output six months ago was off-target has the counter incremented
    on the first run after return, as though the intervening months were
    consecutive off-target weeks. Recorded as fact.
  - `consecutivePoorRecoveryWeeks` and `consecutiveExceededWeeks` iterate the
    recent check-in rows and break at the first non-match
    (`:1620-1636,1655-1663`); they inherit whatever window `recentCheckins`
    supplies but likewise do not test week adjacency.
- **Safety interaction.** The counters gate calorie adjustment
  (`src/lib/weeklyCoach.js:958-962`), so an inflated counter can only make the
  gate open sooner, never bypass the FFM floor, the sex floor or the 5% cap.
- **Tier / explanation / absence.** Pro; surfaced through the "why not yet"
  copy (`src/lib/weeklyCoach.js:1459-1463`); see the stale condition for
  absence.

---

### 17. Readiness and recovery EMAs

- **File.** `src/lib/recoveryEMA.js`.
- **Input.** Completed workouts with soreness, fatigue and joint fields
  (`:48-60`).
- **Minimum evidence.** One point returns a value
  (`:34-35`); the consuming surfaces add their own gates
  (`src/components/ReadinessCards.js:153-156`).
- **Learning rate.** Continuous, weight `0.5 ^ (ageDays / 7)` (`:11,30`).
- **Persistence.** None; computed on read.
- **Stale condition.** GENUINE AND EXPLICIT. A seven-day half-life
  (`:11`), and the sparkline series drops anything older than the window
  (`:100-101`). This is the only true decay function in the product.
- **Manual override interaction.** None.
- **Safety interaction.** None directly; it is an input to display and to
  `insightsEngine` (`src/lib/insightsEngine.js:199`).
- **Tier / explanation / absence.** Shown on the Mesocycle Builder and the
  readiness cards; after a long absence every point is heavily decayed, so the
  EMA is dominated by whatever the user logs first on return.

---

### 18. Weekly consistency streak

- **Files.** `src/lib/streak.js`, `src/lib/streakState.js`,
  `src/hooks/useWeeklyStreak.js`.
- **Input.** Per week: completed sessions, the target (routine count, or the
  user's manual goal, whichever is LOWER when both exist,
  `src/hooks/useWeeklyStreak.js:112-119`), engine deload weeks, pause spans,
  and the ED/calm/SCOFF suppression flag.
- **Minimum evidence.** A real target; with none the strip stays in
  session-count mode and shows no run number
  (`src/lib/streak.js:142-144`). The strip renders only once the user has
  trained in the window (`src/hooks/useWeeklyStreak.js:184`).
- **Learning rate.** N/A; recomputed from local data on every focus
  (`src/lib/streak.js:5-8`), never an incremented counter.
- **Persistence.** Pure derivation, plus a small AsyncStorage record
  (`@volyume_streak_v1_<userId>`, `src/lib/streakState.js:26`) holding the
  manual goal, pauses, the per-week high-water map, and which milestones have
  been celebrated. NOT synced (the header itself flags this at
  `src/lib/streakState.js:5-8`), so it is lost on reinstall or a new device.
- **Reset condition.** A lapse is an absence, never a shown state: the run
  number simply stops (`src/lib/streak.js:22`).
- **Stale condition.** The window is the last 12 weeks
  (`src/hooks/useWeeklyStreak.js:28`), starting at the user's first completed
  workout (`:85-97`). BUT `highWater` never lowers
  (`src/lib/streakState.js:80-85`) and `longestRun` takes the max over every
  week ever recorded (`:88-91`), so "Longest run" has no stale condition and
  only grows.
- **Manual override interaction.** The manual goal is never auto-raised by a
  plan (`src/hooks/useWeeklyStreak.js:112-119`); pauses are renewable without
  limit (`src/lib/streakState.js:74-77`).
- **Safety interaction.** An open ED flag, a SCOFF score >= 2, calm mode, or an
  unreadable wellbeing/flag read all suppress the number entirely and freeze
  every week as 'resting' (`src/hooks/useWeeklyStreak.js:137-141`,
  `src/lib/streak.js:36-38`). Deload weeks keep the run: "recovery is
  compliance, never a miss" (`src/lib/streak.js:17`).
- **Tier interaction.** None.
- **User-facing explanation.** The state ladder itself (kept / resting /
  paused / repaired / missed / in-progress) plus a per-week tick count.
- **After absence.** The run stops silently; no shame copy exists in the
  module. On return the current week is 'in-progress' and is never judged
  (`src/lib/streak.js:36`).

---

### 19. Habit-derived training reminder schedule

- **File.** `src/lib/notifications/trainingHabitSchedule.js`.
- **Input.** Every completed-workout start timestamp
  (`:132-133`).
- **Minimum evidence.** Two FULL calendar weeks of history
  (`:53,86-87`); below that nothing is written at all, deliberately
  ("do not guess", `:50-53`).
- **Learning rate.** A weekday qualifies when it was trained in at least half
  the observed weeks, rounded up (`:105-110`).
- **Persistence.** AsyncStorage `SCHEDULE_KEY` (`@volyume_schedule_v1`,
  `:30,137`). Device-local; not synced.
- **Reset condition.** Rewritten on each refresh.
- **Stale condition.** GENUINE. A rolling six-week window excluding the
  in-progress week (`:46,89-96`), chosen explicitly so a real change in the
  user's life is picked up within about six weeks
  (`:35-45`).
- **Manual override interaction.** The reminder on/off toggle and quiet hours
  are untouched by this writer (`:21-24`).
- **Safety interaction.** Failures emit `notification_failed` telemetry rather
  than surfacing (`:139-152`); quiet hours, the push budget and foreground
  suppression are applied by the scheduler.
- **Tier interaction.** None.
- **User-facing explanation.** NotificationSettings describes the reminder;
  this module is what makes that description true (`:5-13`).
- **After absence.** An empty result array is a real "no consistent pattern"
  signal and is written as-is so the reminder falls silent honestly
  (`:63-70`). A long absence therefore silences the reminder rather than
  firing on ancient weekdays, provided a refresh runs.

---

### 20. Win-back and lapse episode state

- **Files.** `src/lib/payments/lapseDetect.js`,
  `src/lib/payments/winbackState.js`.
- **Input.** The `reconcilePaidEntitlement` result
  (`src/lib/payments/lapseDetect.js:31-41`).
- **Minimum evidence.** An authoritative lapse only: `downgraded === true`,
  `active === false`, and NO reason (stale lockdowns carry one)
  (`:31-36`). A trial auto-downgrade never reaches here (`:18-20`).
- **Learning rate.** N/A; one episode per churn.
- **Persistence.** Three AsyncStorage keys
  (`src/lib/payments/winbackState.js:33-35`). Device-local.
- **Reset condition.** A confirmed-active reconcile clears the episode and
  cancels the pending notification (`src/lib/payments/lapseDetect.js:51-62`).
- **Stale condition.** BOUNDED BY DESIGN. One win-back per episode
  (`winbackLaid`), plus an absolute floor of one per 180 days across episodes,
  which is deliberately KEPT when the episode is cleared
  (`src/lib/payments/winbackState.js:39,64-68,155-160`). The fire date is
  lapse + 30 days by default, or the user's stated return window
  (`:41-58`).
- **Manual override interaction.** The stated-return answer captured at cancel
  time shifts the single win-back (`:43-47,162-178`).
- **Safety interaction.** The scheduler self-guards under ED suppression
  (`src/lib/payments/lapseDetect.js:86-92`), and the two daily weight prompts
  are cancelled at the moment of lapse because the Pro screen that controls
  them is gone (`:70-84`).
- **Tier interaction.** It is the tier transition.
- **User-facing explanation.** The one-time post-lapse sheet
  (`src/lib/payments/winbackState.js:104-116`) and the single win-back push.
- **After absence.** The episode simply waits; nothing accumulates.

---

### 21. ED-pattern detector and `ed_pattern_flags`

**Safety system. Characterised for completeness only. No change of any kind is
proposed to this system.**

- **Files.** `src/lib/edPatternDetector.js` (pure),
  `src/lib/database.js:8444-8480`, sync at
  `src/lib/sync/registry.js:135-141` (`ed_pattern_flags`).
- **Input.** The trailing weekly weight trend as a percentage, and a
  most-recent-first weekly history of `{ energy, adherence, hasCheckin,
  hasFoodData }` (`src/lib/edPatternDetector.js:38-48`, assembled at
  `src/screens/CoachOutputScreen.js:1683-1712`).
- **Minimum evidence.** Two of four signals fire the flag, or three when
  `goal_lock_advanced` is set (`src/lib/edPatternDetector.js:64-66`). Each
  signal has its own window (`:30-36`).
- **Learning rate.** Per week.
- **Persistence.** `ed_pattern_flags` rows, synced.
- **Reset condition.** `hasEdPatternCleared` requires POSITIVE evidence over
  two consecutive weeks: recorded energy above threshold, adherence not
  'under', food data present, and a finite non-rapid trend
  (`:83-107`).
- **Stale condition.** NONE, deliberately. `getOpenEdPatternFlag` has no age
  condition (`src/lib/database.js:8446-8451`), and clearance explicitly refuses
  to lift on the mere absence of data (`src/lib/edPatternDetector.js:93-100`).
- **Manual override interaction.** None; the flag cannot be dismissed by the
  user.
- **Safety interaction.** It IS the safety interaction: an open flag suppresses
  the streak number, blocks upward carry in the ledger and the learned range,
  skips the learned band in seeding, tightens the coach response, and gates
  photo and weight surfaces.
- **Tier interaction.** Tier-blind, per the `proGate.js` mandate.
- **User-facing explanation.** Beat UK signposting
  (`src/lib/wellbeing.js:19-20`) and the calm-mode softening.
- **After absence.** The flag stays open. A returning user must log two clean
  weeks before it clears.

---

### 22. Wellbeing / calm mode

- **File.** `src/lib/wellbeing.js`.
- **Input.** The user's own choice in Settings, Coaching (both tiers,
  `:3-5`).
- **Minimum evidence.** N/A; explicit user setting.
- **Persistence.** AsyncStorage `@volyume_wellbeing_mode` (`:17`), with a local
  write stamp recorded so the prefs pull can refuse an older cloud copy
  (`:34-42`).
- **Reset condition.** Only the user changing it.
- **Stale condition.** NONE. No expiry.
- **Safety interaction.** ORed with the ED flag into `suppressed` everywhere,
  read FAIL-CLOSED: an unreadable value counts as suppressed
  (`src/lib/blockLedgerRunner.js:78-83`,
  `src/hooks/useWeeklyStreak.js:107-109`,
  `src/screens/CoachOutputScreen.js:1534-1536`).
- **Tier interaction.** Both tiers.
- **After absence.** Unchanged; a calm period that ended still leaves its
  suppressed marks on the ledger entries written during it
  (`src/lib/interBlock.js:259-264`), which is what stops a later clearing of
  calm mode from retroactively teaching the ceiling upward
  (`src/lib/learnedRange.js:154-161`).

---

### 23. Coach output history (`coach_outputs`)

- **Files.** `src/lib/database.js:6733-6799`, sync at
  `src/lib/sync.js:1059,2167-2178`.
- **Input.** The full `runWeeklyCoach` result plus the applied-adjustment
  receipts.
- **Minimum evidence.** One weekly run.
- **Learning rate.** One row per user-week.
- **Persistence.** SQLite with a deterministic id `co_<weekStart>_<userId>`
  (`src/lib/database.js:6769`) so every device mints the same identity;
  `preserveAppliedAdjustments` protects receipts across re-saves (`:6741`);
  `updated_at` is written on every save so age cannot be laundered
  (`:6753-6756`). Cloud uniqueness awaits migration 135
  (`supabase/migrate_135_coach_outputs_week_unique.sql`).
- **Reset condition.** None; rows are never pruned.
- **Stale condition.** NONE for the rows. `getLatestCoachOutput` returns the
  newest by `week_start` with no age bound
  (`src/lib/database.js:6791-6799`), which is what feeds the undated
  consecutive-week counter in entry 16 and the session engine's weekly signal
  (`src/lib/sessionAdjustments.js:118`).
- **Manual override interaction.** An ordinary proposal only influences a
  session once it is a PERSISTED APPLIED target, that is, this week's rows
  carrying `source = 'coach'` (`src/lib/sessionAdjustments.js:137-149`).
  `safetyHold` is deliberately not gated that way.
- **Safety interaction.** The safety hold rides on the output and reaches the
  session engine ungated.
- **Tier interaction.** Pro.
- **User-facing explanation.** The coach card and its receipts.
- **After absence.** The stale latest output remains authoritative for the
  volume signal and the counters until a new one is written.

---

### 24. `adaptation_events`

- **Files.** `src/lib/database.js:4375-4390` (write), `:4407-4421` (read),
  sync push `src/lib/sync.js:1280`, pull `:1894-1909` (called at `:1631`).
- **Input.** Every session-adjustment decision, including holds
  (`src/lib/sessionAdjustments.js:171-184`), plus deload triggers.
- **Minimum evidence.** A decision inside a mesocycle week; the table's
  `mesocycle_week_id` is NOT NULL, so non-mesocycle sessions are silent
  (`src/lib/sessionAdjustments.js:9-14`).
- **Learning rate.** Append-only.
- **Persistence.** SQLite, with a `_sync` mirror table
  (`src/lib/database.js:771`). Pushed and pulled, though re-logging on restore
  is deliberately avoided (`src/store/useAppStore.js:134,1491`).
- **Reset condition.** Deleted with their parent mesocycle chain on a wipe
  (`src/lib/database.js:4975-4986`).
- **Stale condition.** BOUNDED AT READ, not at write. `getRecentAdaptationEvents`
  takes a `limitWeeks` cutoff (`:4407-4412`); the session engine asks for six
  weeks (`src/lib/sessionAdjustments.js:127`) and the Engine Log for four
  (`src/components/EngineLog.js:71`). Rows themselves accumulate for ever.
- **Product consequence if lost.** The add-frequency cap and the revert memory
  both derive from these rows (`src/lib/algorithms.js:1090-1101`), so losing
  them re-opens a +1 the user had already reverted twice, and lets a second add
  land in the same week. That is behaviour, not just history.
- **Manual override / safety / tier.** The revert memory IS the user-intent
  channel; deload weeks silence the engine; Pro-gated by the caller.
- **After absence.** The six-week read window empties, so caps and revert
  memory reset to neutral on return.

---

### 25. Profile freshness

- **File.** `src/lib/profileFreshness.js`.
- **Input.** Latest body-metric timestamp, latest scan, latest workout, key
  lift count (`:24`).
- **Minimum evidence.** A timestamp; null reads as `'missing'` with its own
  copy (`:10-22`).
- **Learning rate.** N/A.
- **Persistence.** None; derived on read.
- **Stale condition.** GENUINE AND CENTRAL. Explicit due/warn day thresholds
  per surface (body metrics 14/7, progress photos 7/6, `:35,47`).
- **Everything else.** Display only; it does not feed any prescription.
- **Relevance here.** It is the one place in the product that already models
  evidence age explicitly, and it does so only for prompting, never for
  decisions.

---

### 26. Plateau detection and surfacing

- **Files.** `src/lib/algorithms.js:1303-1350` (`detectPlateau`),
  `src/lib/plateauSurfacing.js`.
- **Input.** The last four sessions of an exercise, newest first.
- **Minimum evidence.** Three sessions (`src/lib/algorithms.js:1304-1306`); two
  consecutive stalls to call a plateau (`:1340-1342`).
- **Learning rate.** Per session.
- **Persistence.** None.
- **Stale condition.** GENUINE. A lift last touched more than 14 days ago is a
  dropped lift, not a plateau, and is not surfaced
  (`src/lib/plateauSurfacing.js:18-22`).
- **Safety interaction.** Training-only inputs, so no ED suppression is
  required, with the condition recorded explicitly
  (`src/lib/plateauSurfacing.js:8-13`).
- **After absence.** The staleness rule silences it.

---

### 27. Lifetime milestones

- **File.** `src/lib/milestones.js`.
- **Input.** Local workout rows.
- **Minimum evidence.** Three sessions inside any seven-day window for
  `first_week`; then 5 / 10 / 25 / 50 / 100 lifetime sessions
  (`:12-14`).
- **Persistence.** Derived; "seen" state rides in the streak record
  (`src/lib/streakState.js:25,93-98`), local only.
- **Stale condition.** NONE. Lifetime counts are monotone and never reset.
- **Safety / tier / absence.** Suppressed under the same ED/calm/SCOFF gate as
  the streak (`src/hooks/useWeeklyStreak.js:153-165`); free; a returning user's
  next milestone is still measured against the lifetime total.

---

### 28. Profile-adjusted prior (the boundary case)

- **File.** `src/lib/blockLedgerGather.js:336-350`.
- **Input.** Experience, recovery rating, training phase mapped through
  `phaseToNutritionKey`, and age (`:339-345`).
- **Minimum evidence.** A stated `experience` value; anything missing falls
  back to the raw research row (`:339,348-349`).
- **Learning rate.** ZERO. This is not a learned system; it is the research
  table adjusted by declared profile facts. It is inventoried because it is the
  PRIOR that every learned volume value folds on top of, and because the
  distinction between "profile" and "learned" is exactly what the second
  long-term law requires the product to keep visible.
- **Persistence.** Recomputed from the profile on every read.
- **Stale condition.** NONE, and it is worth noting that a profile fact stated
  at signup (experience level, recovery rating) is still the prior a year
  later unless the user edits it.
- **Explanation.** Seed source `profile` earns no "learned" claim; only
  `seed_ledger`, `seed_learned` and `seed_manual` do
  (`src/lib/blockExplain.js:70-77`).

---

## REGISTER: values with NO stale condition

Recorded as fact, per D91-25. No remedy is proposed for any row.

| # | Value | Where | Bound, if any |
|---|---|---|---|
| 1 | Learned ceiling and floor | `src/lib/learnedRange.js` (no clock in the module) | None. Full chain replay. |
| 2 | Block Ledger chain membership | `src/lib/blockLedgerGather.js:364-369` | None. Every prior block with a stored ledger. |
| 3 | Adapted volume bands input window | `src/lib/database.js:5379-5380` | 200 rows, no date floor; scoring slice is the oldest 8 (`src/lib/algorithms.js:974`). |
| 4 | All-time PR bar | `src/lib/database.js:6252-6265`, `src/lib/algorithms.js:624-628` | None. |
| 5 | `consecutiveOffTargetWeeks` | `src/screens/CoachOutputScreen.js:1647-1650` | None; no week-adjacency test. |
| 6 | Latest coach output authority | `src/lib/database.js:6791-6799` | None. |
| 7 | Session-engine `lastFeedback` (pump / joint / difficulty) | `src/lib/database.js:8271-8283`, `src/lib/algorithms.js:1155-1160` | None; only `lastTrainedAt` is gated. |
| 8 | Manual landmark overrides | `src/lib/effectiveLandmarks.js:104-110` | None (device-local). |
| 9 | Streak `highWater` and `longestRun` | `src/lib/streakState.js:80-91` | None (device-local, monotone). |
| 10 | Lifetime session milestones | `src/lib/milestones.js:12-14` | None. |
| 11 | Applied nutrition target | `src/lib/database.js:4478-4520` | None. |
| 12 | Open ED flag (by design) | `src/lib/database.js:8446-8451`, `src/lib/edPatternDetector.js:83-107` | None. Safety. |
| 13 | Calm mode (by design) | `src/lib/wellbeing.js:17-29` | None. |
| 14 | Layoff multiplier magnitude | `src/screens/ActiveWorkoutScreen.js:1342` | Fires past 7 days, then flat 0.9 at any gap length. |
| 15 | Profile-adjusted prior facts | `src/lib/blockLedgerGather.js:336-350` | None. |
| 16 | `planned_muscle_volume` rows | `src/lib/database.js:4161-4241` | None. |
| 17 | `coach_outputs` / `adaptation_events` row retention | `src/lib/database.js:6733`, `:4375` | None at write; `adaptation_events` is bounded at read only. |

## REGISTER: values that DO age out

For contrast, and because these are the mechanisms that already exist.

| Value | Rule | Where |
|---|---|---|
| Ledger upward carry | Held once `weeksSinceBlockEnd >= 4` | `src/lib/interBlock.js:88,240-245,343-345` |
| Dose-response +1 | Same four-week gate | `src/lib/interBlock.js:343-345` |
| PR rebound discount window | Previous block must have ended within 14 days | `src/lib/blockLedgerGather.js:37,190-192` |
| Prior-best window for block metrics | 180 days | `src/lib/blockLedgerRunner.js:69,125` |
| Adaptive TDEE window | Trailing 60 days of morning weights, distinct-day confidence | `src/screens/CoachOutputScreen.js:1517`, `src/lib/nutritionEngine.js:250-262` |
| Step-trend windows | 14-day recent, 28-day baseline | `src/lib/nutritionEngine.js:554-556` |
| Recovery EMAs | 7-day half-life | `src/lib/recoveryEMA.js:11,30` |
| Habit reminder weekdays | Rolling 6 weeks, current week excluded | `src/lib/notifications/trainingHabitSchedule.js:46,89-96` |
| Plateau banner | Lift untouched for 14 days is not a plateau | `src/lib/plateauSurfacing.js:18-22` |
| Session soreness paths | 72-hour trained gate, 4-day check-in gate | `src/lib/algorithms.js:1115,1124` |
| Session add cap / revert memory | Current week / trailing 6 weeks | `src/lib/algorithms.js:1096`, `src/lib/sessionAdjustments.js:127` |
| Layoff load reduction | Triggers past 7 days | `src/screens/ActiveWorkoutScreen.js:1339-1342` |
| Win-back cadence | 30-day delay, 180-day cross-episode floor | `src/lib/payments/winbackState.js:39-58` |
| Profile freshness prompts | 14/7 and 7/6 day thresholds | `src/lib/profileFreshness.js:35,47` |
| Streak window | Last 12 weeks from first completed workout | `src/hooks/useWeeklyStreak.js:28,85-97` |

## Notes for later phases

- Phase 6 (D91-25 characterisation) should start from entries 2, 6 and 9 and
  from register rows 1, 3 and 7.
- Phase 7 (stale-history copy) should start from the seed-source clauses at
  `src/lib/blockExplain.js:70-74` and the confidence label at
  `src/lib/weightTrend.js:28-33`, checked against the register above.
- Phase 8 (D91-24) touches `accumulationWeeks`
  (`src/lib/blockLedgerGather.js:54-58`) and `deriveDeloadFlags`
  (`:147-173`), which are inside entry 1 here but were not separately audited
  for the early-deload case in this phase.
- Phase 35 (adaptation_events restore) should start from entry 24, which
  records that these rows carry BEHAVIOUR (the add cap and the revert memory),
  not only history.
