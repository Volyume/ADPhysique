# Campaign 21 — expected-outcome oracle (Step 3)

Binding contract for scenario generation. One block per ledger rule. Locked
rows are the ONLY authority haiku scenario expansion may build from; a row
below LOCKED returns to the lead.

Authority hierarchy (highest first — every lock cites its source):
1. FOUNDER — explicit founder rulings (FOUNDER-RULINGS docs, D-register,
   CLAUDE.md Section 2 inviolables, campaign orders).
2. LAW — accepted product laws / campaign contracts (locked docs, design
   docs marked binding, the Campaign 21 brief's permanent-law list).
3. ARCH — current authoritative production architecture (the traced graph,
   where no higher authority speaks).
4. TEST — accepted existing tests (pins that survived founder review).
5. SCI — scientifically constrained implementation rules already adopted.

Rules: production behaviour that contradicts a HIGHER authority is locked to
the higher authority and marked SUSPECTED-DEFECT (expected outcome = the
higher authority's; the test is EXPECTED to fail against production until
Step 11 triage). Ambiguity with no higher authority locks to conservative
non-change/HOLD. Nothing here invents new coaching philosophy.

## Block format

```
RULE: <rule_id>
LOCK: <MUST behaviour, stated as testable outcomes; include HOLD/no-change
      behaviour explicitly; name senior gates that suppress it>
MUST_NOT: <forbidden actions, incl. what junior evidence must not do>
BOUNDARIES: <the exact threshold edges to test (below / at / above), from
      the graph's production values — never guessed>
SOURCE: <FOUNDER|LAW|ARCH|TEST|SCI> — <the specific document/ruling/pin>
DEFECT: <none | SUSPECTED: what production does vs what the lock requires>
```

<!-- LEAD-REVIEW: ACCEPTED 2026-08-16 (Fable). Hands-on review of the
     X-SAFETY domain (all 9), T-LIVESET domain (all 9, checked against
     Campaign 20 ground truth) and the cross-domain precedence pairs
     (T-WEEKLY-05, N-COACH-08, U-AUTH-02) — all faithful to their cited
     authorities. Scenario expansion may build from any block below.
     Carried constraints for Step 4: X-SAFETY-07 requires a full read of
     notifications/categories.js before any scenario asserts its exact
     behaviour; T-PROGRAMME-05 and N-ADAPTIVE-06 are historical-fix
     coverage notes, not live defects; T-PROGRAMME-02, T-RECOVERY-05 and
     U-AUTH-05 are excluded from coverage with ledger N/A reasons. -->

## TRAINING DOMAIN — weekly (T-WEEKLY-01..09)

```
RULE: T-WEEKLY-01
LOCK: MUST return confidence.level='data_hold' when distinct clock-anchored
      weigh-in days (7-day window, anchored to nowMs not to the newest row)
      < 3; MUST also return data_hold when hasUnusualEvent (non-empty
      check-in notes) AND weigh-in days < 5; MUST return 'medium' when
      weigh-in days < 5 (and not already data_hold); MUST return 'low' when
      weeksInPhase < 2. HOLD: on data_hold, runWeeklyCoach MUST hard-early-
      return, suppressing every calorie/training/deload/diet-break decision
      this run, forcing training.signal='hold' unconditionally regardless
      of any other evidence in the run (overrides T-WEEKLY-03's matrix,
      N-COACH-03..EXCEEDED, N-ADAPTIVE-07). With >=3 weigh-in days and no
      unusual event, the gate does nothing and downstream rules proceed.
MUST_NOT: no downstream rule may compute or apply a decision while
      confidence.level==='data_hold'; weigh-in day counting must never be
      data-anchored (newest-row) instead of clock-anchored — a lapsed
      returning user must score FEWER days, never be rewarded with more.
BOUNDARIES: weigh_ins < 3 -> data_hold; hasUnusualEvent && weigh_ins < 5 ->
      data_hold; weigh_ins < 5 -> medium; weeksInPhase < 2 -> low.
SOURCE: FOUNDER — docs/long-term-audit-2026-08-11/D97-RULINGS.md D97-22
      (C6 R-1, clock-anchored weigh-in count) for the anchoring behaviour;
      ARCH — src/lib/weeklyCoach.js:186 assessDataConfidence for the exact
      3/5/2 band numbers (no higher authority states them).
DEFECT: none.
```

```
RULE: T-WEEKLY-02
LOCK: MUST move confidence.level exactly one step on ['low','medium','high']
      when photoCorroboration.eligible && direction==='supports', ceiling
      'high'. MUST NOT move 'data_hold' under any circumstance. HOLD: when
      suppressed=true (calm mode / open-or-just-fired ED flag / any safety
      hold) MUST return baseLevel unchanged — T-WEEKLY-01's data_hold and
      X-SAFETY-04/X-SAFETY-05 are senior and override this rule outright.
      Display-only: the corroborated level MUST NOT reach any calorie/
      macro/training/floor decision — every consumer of confidence for a
      decision (T-WEEKLY-01, N-COACH-01/03/11) reads the RAW baseLevel.
MUST_NOT: must not move data_hold; must not move more than one step even
      with strong corroboration; must not let a photo signal reach a
      floor/calorie/training decision.
BOUNDARIES: exactly one step, never two; ceiling at 'high'; never touches
      'data_hold'; suppressed=true forces baseLevel verbatim.
SOURCE: FOUNDER — docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md
      D18 ("photo signal may move confidence.level by exactly one bounded
      step... suppressed under ED flag/calm mode"); ARCH —
      src/lib/weeklyCoach.js:261 corroborateConfidenceLevel; TEST —
      progressScanSafetyFloorIsolation.test.js pins the isolation guard.
DEFECT: none.
```

```
RULE: T-WEEKLY-03
LOCK: MUST classify recovery grade 1-4: soreness>=4 -> 4; energy<=2 OR
      soreness>=3 -> 3; energy>=4 AND soreness<=1 -> 1; else 2;
      stress>=4 AND score<3 forces score=3 (never improves the read).
      MUST classify performance 1-4: (prsThisWeek/sessionsCompleted>=0.3
      OR blockE1rmSlopePct>=1.5) with adherence>=0.9 -> 1;
      trainingPerformance==='dropped' OR adherence<0.5 -> 4; 'struggled'
      OR adherence<0.75 -> 3; 'hit' OR adherence>=0.75 -> 2. MUST apply the
      matrix: recovery==4 OR (recovery>=3 AND performance>=4) -> deload
      (volumeDelta -2); recoveryForPush==3 OR performance==3 -> hold(0);
      recoveryForPush==1 AND performance==1 -> push +3; either==1 -> push
      +2; both==2 -> push +1. Peak-week softening MAY soften a grade-3
      soreness-driven read to 2, ONLY in the block's final accumulation
      week (blockAccumWeeks>=3, blockWeekIndex===blockAccumWeeks), ONLY
      for push/hold branches, and ONLY when soreness>=3 AND (energy null
      or >=3) AND (stress null or <4) AND consecutivePoorRecoveryWeeks<1
      AND consecutiveGrade3RecoveryWeeks<1. HOLD: recoveryForPush==3 OR
      performance==3 collapses straight to hold regardless of the other
      axis.
MUST_NOT: the deload branch MUST NEVER read the softened grade under any
      condition ("the founder red line: deload thresholds unchanged") —
      softening applies to push/hold only; this matrix's own +3 ceiling
      must not be exceeded except by the single named exception
      T-WEEKLY-05 (sustained over-performance escalation), which is
      itself gated by every senior safety flag T-WEEKLY-05 names.
BOUNDARIES: soreness>=4/>=3/<=1 grade edges as above; PR_DENSITY_STRONG=0.3,
      BLOCK_SLOPE_STRONG_PCT=1.5, adherence>=0.9/<0.5/<0.75/>=0.75; matrix
      cells -2/0/+1/+2/+3 as above; softening requires all five named
      conditions simultaneously.
SOURCE: ARCH — src/lib/weeklyCoach.js:279/344/371 (RP-style autoregulation
      matrix, Stage-4 2026-08-09 constants); the deload-reads-raw-grade
      rule is characterised in-code as "the founder red line", treated
      FOUNDER for that specific sub-rule.
DEFECT: none.
```

```
RULE: T-WEEKLY-04
LOCK: MUST OR nine booleans (deloadSuggested, matrixDeload, poorRecovery,
      safetyHold, ffmFloorHeld, edPatternHeld, rapidWeightLossFlag,
      scoffPositive, calmMode) into a single autoApplyHoldActive flag; MUST
      force confirm-first behaviour whenever any is true, in EVERY
      coachAutonomy mode ("a more autonomous mode changes WHO confirms,
      never whether this hold applies"). HOLD/no-change: with all nine
      false, autoApplyHoldActive=false and the caller's autonomy mode
      governs confirmation normally.
MUST_NOT: no coachAutonomy setting may bypass this composite; no downstream
      consumer may re-derive the hold list from raw signals it cannot see
      — it must read this single emitted flag.
BOUNDARIES: OR of exactly the nine named booleans; no numeric threshold of
      its own.
SOURCE: FOUNDER — CLAUDE.md Section 2 (ED-safety composite: FFM floor, ED
      lockout, calm mode, safety hold are each individually INVIOLABLE);
      ARCH — src/lib/weeklyCoach.js:2085 autoApplyHoldActive (D16 label in
      graph).
DEFECT: none.
```

```
RULE: T-WEEKLY-05
LOCK: MUST allow a bounded +1 step to volumeSignal ONLY when
      trainingSignal==='push' AND consecutiveExceededWeeks>=3
      (EXCEEDED_ESCALATION_WEEKS), MUST NEVER exceed the matrix's own +3
      ceiling (MATRIX_PUSH_CEILING). HOLD/no-change: below 3 consecutive
      exceeded weeks, or when trainingSignal is not 'push', this rule does
      nothing and T-WEEKLY-03's matrix output stands unmodified.
MUST_NOT: gated OFF ENTIRELY (not merely reduced) by ANY of: peak-week-
      softened push (T-WEEKLY-03), deloadSuggested, matrixDeload (both
      T-WEEKLY-03), poorRecovery, safetyHold, ffmFloorHeld (N-COACH-11),
      edPatternHeld (X-SAFETY-04), rapidWeightLossFlag (X-SAFETY-01),
      scoffPositive, calmMode (X-SAFETY-05 — the ONE training signal in
      the file that is calm-mode-gated), volumeDecisionMemory.
      blockEscalation (N-VOL-02 — "no escalation on top of a dose that
      already did nothing or cost the athlete"), or coordinationVolumeHeld
      (T-WEEKLY-08 — "the coordination gate withheld the change, escalation
      must not resurrect it"). Downstream, T-VOLUME-06's [mev,mrv] clamp
      still applies — this rule cannot itself exceed recoverable volume.
BOUNDARIES: EXCEEDED_ESCALATION_WEEKS=3 (>=3 consecutive prior 'exceeded'
      weeks); MATRIX_PUSH_CEILING=3; bounded to exactly +1 step, never more.
SOURCE: FOUNDER — docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md
      D15 ("Plan-G over-performance... bounded one-step escalation... still
      MRV-clamped, confirm-before-apply, floors/gates untouched"; N=3
      delegated to lead per D15); ARCH —
      src/lib/weeklyCoach.js:2115-2145.
DEFECT: none.
```

```
RULE: T-WEEKLY-06
LOCK: MUST select copy in precedence order matrixDeload > reduce > hold >
      push-high(volumeSignal>=2) > push-light(volumeSignal===1), one of 9
      physique-goal variants plus a general fallback. HOLD/no-change: this
      rule never itself decides a number — it renders whatever upstream
      signal state (T-WEEKLY-03/T-WEEKLY-05) already computed.
MUST_NOT: must not invent a numeric decision independent of the upstream
      signal; must not contradict the signal it is asked to describe.
BOUNDARIES: matrixDeload > trainingSignal==='reduce' > ==='hold' >
      volumeSignal>=2 > volumeSignal===1, in that exact order.
SOURCE: ARCH — src/lib/weeklyCoach.js:29-30 PHASE_CONFIG,
      coachingGoals.js:620 getTrainingNote.
DEFECT: none.
```

```
RULE: T-WEEKLY-07
LOCK: MUST classify a prior intervention's outcome only after its own
      OBSERVE window closes (CALORIE_TARGET/VOLUME_START min 2 weeks —
      VOLUME_START additionally requires BOTH training.progress AND
      recovery.systemic GOOD for IMPROVED; PRESCRIPTION/EXERCISE_
      REPLACEMENT min 3 exposures; STRUCTURE min 4 weeks). MUST check
      CONFOUNDED before any outcome classification (user_changed_it_
      themselves, goal_phase_changed_or_unknown, training_stopped,
      manualVolumeMuscles confound for VOLUME_START, diary_coverage_lost
      for CALORIE_TARGET) — "CONFOUNDED NEVER TEACHES", so only UNCHANGED
      and WORSENED may ever resize a future change; CONFOUNDED and
      IMPROVED never do. doseEscalation applies DOSE_ESCALATION_
      MULTIPLIER=1.5 only under the full eligibility set (see N-COACH-06
      for the calorie-domain instance of the same primitive).
      volumeDecisionMemory (N-VOL-02) only ever WITHHOLDS a push, never
      creates or reverses; a volume REDUCTION is untouched by this memory.
      HOLD/no-change: an intervention still inside its own OBSERVE window
      contributes nothing to memory yet — treated as pending, not scored.
MUST_NOT: a declined suggestion is never scored (only markApplied records
      feed this memory); CONFOUNDED/IMPROVED outcomes must never resize a
      future change.
BOUNDARIES: DOSE_ESCALATION_MULTIPLIER=1.5; OBSERVE windows: calorie 2wk,
      volume_start 2wk, prescription 3 exposures, exercise_replacement 3
      exposures, structure 4wk.
SOURCE: ARCH — src/lib/coachIntervention.js (whole file, Campaign 18);
      FOUNDER-adjacent per graph's "founder rule F" citation for the
      anti-oscillation half (see N-COACH-15).
DEFECT: none.
```

```
RULE: T-WEEKLY-08
LOCK: MUST hold a non-safety calorie change when nutrition.limiter===
      EXECUTION (R1); MUST hold a volume ADD (never a reduction) when
      training.limiter===EXECUTION or ===RECOVERY (R2); when BOTH a
      calorie change and a volume ADD survive R1/R2, MUST withhold
      whichever domain's limiter===INSUFFICIENT_EVIDENCE (training checked
      first, then nutrition) under R3 ("do not change both merely because
      both engines found weak evidence") — two domains that both reached
      PLAN may both change. HOLD/no-change: when neither R1 nor R2 nor R3
      fires, both proposed changes pass through untouched.
MUST_NOT: safety-marked calorie changes (rapidLossOverride, N-COACH-08) and
      ANY volume reduction are NEVER withheld by this gate — explicitly
      senior to coordination. This gate sits BELOW every domain engine's
      own safety clamp (calorie floors N-TARGETS-05/06, FFM floor
      N-COACH-11, ED lockouts X-SAFETY-04, autoregulation matrix
      T-WEEKLY-03) — it can only WITHHOLD, never create, enlarge, reverse
      a change, or relax a clamp.
BOUNDARIES: no new numeric threshold — reuses GOOD/POOR/UNKNOWN/
      INSUFFICIENT_EVIDENCE/PLAN states from classifyTrainingLimiter/
      classifyNutritionLimiter (N-COACH-18).
SOURCE: ARCH — src/lib/coachPrecedence.js:264/380 (C18 job C, "Option 2
      architecture... domain engines stay authoritative; this only
      withholds from what already survived them").
DEFECT: none.
```

```
RULE: T-WEEKLY-09
LOCK: MUST anchor the weekly comparator at <= nowMs-7d; MUST treat a
      comparator as fresh only within a 14-day freshness boundary
      (weeklyComparatorFresh); MUST floor elapsedWeeksSinceComparator at 1
      week. Feeds T-WEEKLY-03's on-target/off-target read and the rapid-
      loss/ED detector (X-SAFETY-01, X-SAFETY-02). HOLD/no-change: n/a —
      this is a pure normalisation function with no gate of its own.
MUST_NOT: a stale comparator must never be silently read as "this week's"
      rate (documented historical bug, now fixed per C10A/C6 RB6-2 /
      D97-25).
BOUNDARIES: comparator <= nowMs-7d; freshness boundary = 14 days;
      elapsedWeeksSinceComparator floor = 1 week.
SOURCE: ARCH — src/lib/weeklyCoach.js:107-174; FOUNDER — docs/long-term-
      audit-2026-08-11/D97-RULINGS.md D97-25 for the fixed historical
      staleness bug this rule now prevents.
DEFECT: none (historical bug confirmed fixed by graph's own trace; no live
      defect).
```

---

## TRAINING DOMAIN — programme (T-PROGRAMME-01..11)

```
RULE: T-PROGRAMME-01
LOCK: MUST create every block as BLOCK_PLANNED_WEEKS=6 total, with week 6
      always the recovery week (BLOCK_DELOAD_WEEK=BLOCK_PLANNED_WEEKS),
      written into mesocycles.planned_weeks / .deload_week at creation, for
      EVERY block, every tier, unconditionally.
MUST_NOT: no code path may create a block with a different plannedWeeks
      default; supersedes the generic MESO_SCHEDULE tables (T-PROGRAMME-02)
      which have zero production callers and must not be treated as live.
BOUNDARIES: BLOCK_PLANNED_WEEKS = 6 (constant, no threshold band).
SOURCE: FOUNDER — CLAUDE.md STATUS block ("5 accumulation weeks + week 6
      recovery" law) confirmed live by src/lib/mesocycle.js:28-29 and
      database.js:4312 activatePlanWithBlock; LAW — Campaign 21 brief
      permanent-law list ("5 accumulation + week 6 recovery").
DEFECT: none.
```

```
RULE: T-PROGRAMME-02
LOCK: NOT A PRODUCTION RULE — excluded from scenario coverage, ledger gets
      safety_na_reason. getCurrentMesoWeek/MESO_SCHEDULE have zero
      production callers (grep-confirmed); the module's own header comment
      (mesocycle.js:85-98) explicitly documents "RETAINED DESPITE ZERO
      PRODUCTION CALLERS" as a deliberate DST cross-check oracle used only
      by mesocycle.f10.dst.test.js and blockWeekResolver.test.js.
MUST_NOT: scenario generation must not treat this as a live week-position
      authority; T-PROGRAMME-01/03 (getCurrentBlockWeekIndex, getBlockStatus)
      are the live authority and must be used instead.
BOUNDARIES: n/a — dead code, thresholds not production-reachable.
SOURCE: ARCH — src/lib/mesocycle.js:31-49/106, self-documented DEAD/
      TEST-ONLY by its own header comment.
DEFECT: none — deliberately retained, not a defect.
```

```
RULE: T-PROGRAMME-03
LOCK: MUST classify status as active when currentWeek < recoveryWeek;
      'recovery' when currentWeek===recoveryWeek; 'completed_awaiting_
      decision' as a SINGLE state once currentWeek > recoveryWeek,
      REGARDLESS of how many weeks overdue ("a finished block is ONE
      explicit state, however long it is ignored"). HOLD/no-change: this
      is the CALENDAR authority; T-PROGRAMME-09's activeWeekIndex is the
      PROGRAMME authority and is senior for "which week is really active"
      — position beats calendar.
MUST_NOT: must not report a distinct state per number of overdue weeks;
      must not let the calendar's 'recovery' status stand once
      T-PROGRAMME-09's recoveryPhaseAllowed holds it back to 'active'
      narrative (a block with outstanding accumulation work must not enter
      recovery early).
BOUNDARIES: currentWeek < recoveryWeek -> active; === -> recovery;
      > -> completed_awaiting_decision (single state).
SOURCE: FOUNDER — Stage 1 (2026-08-09) ruling "a finished block is ONE
      explicit state, however long it is ignored" (per graph citation);
      ARCH — src/lib/mesocycle.js:533/513/164.
DEFECT: none.
```

```
RULE: T-PROGRAMME-04
LOCK: MUST evaluate slot verdict in this exact order: (1) evidence.excluded
      -> REPLACE; (2) swappedAwayCount>=2 -> REPLACE (T-SLOT-02); (3)
      jointDiscomfort -> REPLACE; (4) equipmentLost -> REPLACE; (5)
      autoEligible===false -> REPLACE; (6) redundant ->
      REMOVE_OR_REDISTRIBUTE; (7) goalChanged && conflictsWithGoal ->
      REPLACE; (8) sessionLengthChanged && doesNotFitSession ->
      REMOVE_OR_REDISTRIBUTE; (9) plateau && executionJudgeable ->
      KEEP_WITH_PRESCRIPTION_CHANGE (if prescriptionFix) else REPLACE; (10)
      epochReviewDue && systematicCandidate && !progressing &&
      executionJudgeable -> REPLACE (SYSTEMATIC_VARIATION, the ONLY reason
      gated on EPOCH_REVIEW_BLOCKS=3); (11) progressing -> KEEP; (12)
      !executionJudgeable -> KEEP (INSUFFICIENT_EXECUTION); (13)
      establishedPersonalFit -> KEEP (T-SLOT-04); (14) !epochReviewDue ->
      KEEP; (15) else KEEP. Rules 1-8 (SAFETY_FIT + explicit user intent)
      fire in ANY block including the first — never gated on epoch age;
      only rule 10 waits for EPOCH_REVIEW_BLOCKS.
MUST_NOT: rule (9)'s executionJudgeable gate is JUNIOR-facing: a plateau on
      an unrun/poorly-executed block must NOT immediately fire REPLACE —
      "poor gym performance + poor adherence must NOT immediately mean
      replace exercises" (T-PROGRAMME-08's hasEnoughHistory gate is a
      relevant precedent for this restraint). Never auto-executed: every
      verdict here is proposed to the user, never auto-applied
      (T-PROGRAMME-07's FQ-2 both-options law is the enforcement point).
BOUNDARIES: swappedAwayCount>=2 -> REPLACE; EPOCH_REVIEW_BLOCKS=3.
SOURCE: ARCH — src/lib/programmeEpoch.js:265 slotVerdict (C18 job 5);
      Free-tier exclusion is FOUNDER — CLAUDE.md Section 2 free/pro gating.
DEFECT: none.
```

```
RULE: T-PROGRAMME-05
LOCK: MUST rule REBUILD_PROGRAMME whenever ANY material structural change
      fires (daysChanged OR equipmentChanged OR sessionLengthChanged OR
      goalChanged) REGARDLESS of slot count; else CONTINUE_STRUCTURE when
      changed.length===0; else REBUILD when changed.length>=3 AND
      churn>0.4 (REBUILD_CHURN_RATIO, checked ONLY once the 3-slot floor is
      met); else REFINE_PROGRAMME. REBUILD_MIN_CHANGED_SLOTS=3 is an
      ABSOLUTE FLOOR — fewer than 3 changed slots can NEVER be called a
      rebuild, however high the % churn.
MUST_NOT: must not call REBUILD_PROGRAMME off churn ratio alone below the
      3-slot floor — the founder's explicit rule is "do not call something
      REBUILD_PROGRAMME if only one/two slots changed"; a 2-of-4-slot
      (50%) change on a small programme MUST read REFINE, not REBUILD.
BOUNDARIES: REBUILD_MIN_CHANGED_SLOTS=3 (absolute floor, checked first);
      REBUILD_CHURN_RATIO=0.4 (checked only after the floor is met).
SOURCE: FOUNDER — founder's explicit "do not call something
      REBUILD_PROGRAMME if only one/two slots changed" rule (quoted
      verbatim in code comment, programmeEpoch.js:416-432); ARCH —
      src/lib/programmeEpoch.js:382 programmeVerdict.
DEFECT: SUSPECTED (historical, now FIXED per graph trace — not live). The
      old code reused EPOCH_CONTINUITY_SIMILARITY=0.6 for churn and let a
      2-of-4-slot (50%) change read REBUILD, contradicting the founder
      rule above. Current code enforces the 3-slot floor correctly.
      Flagged so Step 9 tests a 2-of-4-slot case and confirms REFINE.
```

```
RULE: T-PROGRAMME-06
LOCK: MUST count epochBlocks as consecutive same-structure COMPLETED
      blocks walking newest-to-oldest, stopping at the first non-completed
      or structurally-different block; MUST use EPOCH_REVIEW_BLOCKS=3 as
      the structural-review eligibility floor and EPOCH_CONTINUITY_
      SIMILARITY=0.6 (Jaccard on exercise sets) OR a different splitType/
      dayCount to end the epoch. HOLD/no-change: below 3 consecutive
      same-structure completed blocks, reviewDue=false and T-PROGRAMME-04
      rule (10) cannot fire.
MUST_NOT: an ABANDONED historical block (walked away from,
      blockCompletionState per T-PROGRAMME-03) must NEVER count toward the
      epoch — "an abandoned block is not evidence"; EPOCH_CONTINUITY_
      SIMILARITY (0.6) must never be conflated with REBUILD_CHURN_RATIO
      (0.4, T-PROGRAMME-05) — two distinct constants, a historical
      near-miss now fixed.
BOUNDARIES: EPOCH_REVIEW_BLOCKS=3; EPOCH_CONTINUITY_SIMILARITY=0.6.
SOURCE: ARCH — src/lib/programmeEpoch.js:226/211/202/137; Pro-only per
      FOUNDER — CLAUDE.md Section 2 free/pro gating.
DEFECT: none (the constant-reuse near-miss is documented FIXED, not live).
```

```
RULE: T-PROGRAMME-07
LOCK: MUST compute avgReadiness only over check-ins inside the 14-day
      detraining window (fallback 70 when no data -> repeat branch); MUST
      recommend 'repeat' when highSignals.length===0 && avgReadiness>=60;
      'adjust' when highSignals.length<=1 || avgReadiness>=50; else
      'consider_rebuild'. applyAdjustEvidence re-decides Repeat vs Adjust
      from the ACTUAL ledger-derived seed preview AFTER the base
      recommendation, but NEVER overrides consider_rebuild ("persistent
      fatigue keeps its own advice"). HOLD/no-change: Free tier ALWAYS
      gets recommendation:null, coached:false — no adaptive coaching
      computed at all.
MUST_NOT: buildNextBlockOptions must ALWAYS render BOTH Repeat and Adjust
      options regardless of recommendation, gated only by requiresPro/
      locked flags — "never hides, gates or forces" either option
      (FQ-2/D96). The engine may only recommend, never gate.
BOUNDARIES: highSignals===0 && avgReadiness>=60 -> repeat;
      highSignals<=1 || avgReadiness>=50 -> adjust; else consider_rebuild.
SOURCE: FOUNDER — docs/first-use-audit-2026-08-10/D96-RULINGS.md FQ-2
      ("FREE DOES NOT HAVE COACHING"; both options always rendered); ARCH
      — src/lib/blockAdvisor.js:254/380.
DEFECT: none.
```

```
RULE: T-PROGRAMME-08
LOCK: MUST classify signal severity: energy<=1 high/<=2 medium;
      soreness>=4 two consecutive -> high, alone -> medium; sleep<5.5h
      high/<6.5h medium; readiness z-score vs 8-week baseline (weeks 2-8,
      needs>=2 baseline points) z<=-1.5 high/<=-1.0 medium;
      recentPoorCount (last 2 check-ins readiness<45) >=2 ->
      sustained_fatigue (high). checkinReadiness = energy_term*0.4 +
      soreness_term*0.4 + sleep_term*0.2 (sleep_term dropped, weights
      re-split 0.5/0.5, when sleepHours null); a row answering NONE of
      energy/soreness/sleep -> readiness null (not 50). HOLD/no-change:
      signals=[] when the gate below is not met.
MUST_NOT: signals are computed ONLY when isPro && latestIsCurrent (latest
      check-in inside 14-day window) — "Free has no coaching" tier gate;
      Free tier must always get signals:[].
BOUNDARIES: energy<=1/<=2; soreness>=4 (x2 consecutive=high, x1=medium);
      sleep<5.5h/<6.5h; z<=-1.5/<=-1.0; recentPoorCount(readiness<45)>=2.
SOURCE: FOUNDER — CLAUDE.md Section 2 (free/pro gating, "Free... progress
      stats" only); ARCH — src/lib/blockAdvisor.js:104/49 (C6 closeout
      P-8 tier gate, FB-36/D96 null-vs-50 fix).
DEFECT: none.
```

```
RULE: T-PROGRAMME-09
LOCK: MUST select the FIRST candidate accumulation week (within [floor,
      calendarWeekIndex], strictly before recoveryWeek) with an
      unresolved session as activeWeekIndex, OVERRIDING the calendar week
      — "VOLYUME TRAINING IS SESSION-SEQUENCED, NOT CALENDAR-SEQUENCED".
      Only once every reached week is progression-resolved does
      activeWeekIndex fall back to the calendar position (capped at
      recoveryWeek). For a legacy block, candidateFloor = max(week index
      of any week with a logged workout, 1) — never resurrects ambiguity
      below that floor. HOLD/no-change: returns null (no live position
      question) for no active block, an unreadable block, or a read
      failure — callers keep PRIOR state rather than guessing.
MUST_NOT: preRecoveryOutstanding must gate recoveryState (T-RECOVERY-03)
      away from PLANNED_BLOCK_RECOVERY even once the calendar reaches the
      recovery week — "Position beats calendar" (the founder-reported
      failure this closed: entering recovery with the final hard session
      unfinished).
BOUNDARIES: candidateFloor = max(logged-workout week index, 1); candidate
      window = [floor, calendarWeekIndex], strictly < recoveryWeek.
SOURCE: FOUNDER — "the founder-reported failure this closed" (module
      comment, per graph); LAW — Campaign 21 brief permanent-law list
      ("session-sequenced not calendar-scheduled"); ARCH —
      src/lib/programmePosition.js:97, blockProgression.js.
DEFECT: none (replaces a documented FIXED historical defect —
      `programmes.next_workout_index` single-integer pointer).
```

```
RULE: T-PROGRAMME-10
LOCK: MUST require hasEnoughHistory (checkins.length>=2 AND
      blockStatus.currentWeek>=2) before EITHER early_deload or heads_up
      may fire — "A user one week into their first block... shouldn't be
      told to drop their sets in half". MUST fire early_deload when
      hasEnoughHistory && (highSignals.length>=deloadHighThreshold OR
      hasSustainedFatigue), where deloadHighThreshold = 1 for masters
      (age>=40) else 2. MUST fire heads_up when hasEnoughHistory &&
      (highSignals.length>=1 || mediumSignals.length>=headsUpMedium
      Threshold), headsUpMediumThreshold = 1 for masters else 2.
      early_deload outranks heads_up (checked first). HOLD/no-change:
      below either threshold, or without hasEnoughHistory -> 'continue'.
MUST_NOT: never mutates the plan — advisory only ("All decisions are
      proposed to the user, never auto-executed").
BOUNDARIES: deloadHighThreshold: masters=1, else=2; headsUpMedium
      Threshold: masters=1, else=2; hasEnoughHistory: checkins>=2 AND
      currentWeek>=2.
SOURCE: ARCH — src/lib/blockAdvisor.js:826-872 (masters threshold-halving
      research-cited: Sullivan & Baker; Rippetoe; Hayes et al. 2023).
DEFECT: none.
```

```
RULE: T-PROGRAMME-11
LOCK: MUST classify BLOCK_CLASS per muscle: perfUp (slope>=1.5%),
      perfDown (slope<=-1.5%), recoveryPoor (recoveryCostWeight>=
      RECOVERY_EXCESSIVE_WEIGHT=2, cost weight = +1 sorenessLateAvg>=4,
      +1 jointDiscomfortAvg>=3, +1 sleepFlaggedWeeks>=2, +1 (not +2) for a
      block-level deload flag alone). MUST classify INSUFFICIENT_DATA when
      dataPoints<4 OR exposures<4 OR adherence<0.6 OR
      weeksSinceBlockEnd>=4 (STALE_EVIDENCE_WEEKS) — stale evidence
      suppresses a fresh classification even if raw numbers would
      otherwise classify. proposedRecoveryDays = 10 when anyStrained &&
      persistent>=2, else 7. HOLD/no-change: STALE evidence (>=4 weeks
      old) always suppresses to INSUFFICIENT_DATA regardless of the raw
      numbers.
MUST_NOT: the advisor's early-deload flag alone can NO LONGER make
      recoveryPoor true for every muscle (RA6-2 fix) — it must be
      corroborated by at least one OTHER signal; an algorithm-version bump
      (LEDGER_ALGORITHM_VERSION=2) must never force a stored historical
      ledger to recompute — "that would rewrite a historical decision the
      user already acted on". Manual landmark edits (T-VOLUME-08) win the
      seeding fallback chain over any ledger-derived value.
BOUNDARIES: PERF_UP_PCT=1.5, PERF_DOWN_PCT=-1.5, SORENESS_HIGH=4,
      JOINT_HIGH=3, RECOVERY_EXCESSIVE_WEIGHT=2, ADHERENCE_FLOOR=0.6,
      MIN_EXPOSURES=4, MIN_RECOVERY_POINTS=4, STALE_EVIDENCE_WEEKS=4.
SOURCE: FOUNDER — RA6-2 fix cited as "Campaign 10I" correction (single-
      flag corroboration requirement, per graph); ARCH —
      src/lib/interBlock.js:67/162/450.
DEFECT: none (RA6-2 is a documented FIXED historical defect).
```

---

## TRAINING DOMAIN — volume (T-VOLUME-01..08)

```
RULE: T-VOLUME-01
LOCK: MUST classify status: workingSets<=0 or non-finite -> below;
      <mev -> below; <=mev+2 -> minimum; <=mav -> optimal; <=mrv ->
      near_mrv; else over_mrv, using the per-muscle mev/mav/mrv table
      (16 muscles, e.g. chest 6/14/22, back 10/16/25, quads 8/14/20).
      HOLD/no-change: the zero-work short-circuit fires even for mev=0
      muscles (front_delts) so the heatmap never shows "optimal" before
      any set is logged.
MUST_NOT: n/a — this is a pure display classifier with no senior gate to
      violate.
BOUNDARIES: <mev below; <=mev+2 minimum; <=mav optimal; <=mrv near_mrv;
      else over_mrv (all inclusive <= at the upper edge of each band).
SOURCE: ARCH — src/lib/algorithms.js:25/277 ("population starting points,
      not precise prescriptions" per file header).
DEFECT: none.
```

```
RULE: T-VOLUME-02
LOCK: MUST compute a weighted score (0-100) across 4 independent signal
      groups and trigger deload:true at score>=50: Performance (50pts,
      recentReps<earlierReps-2); Wellness (30pts split: avgJointDiscomfort
      >=1.5 AND weeksSinceLastDeload>=3 -> +18; overMRVWeeks>=2 -> +12);
      Soreness (20pts, down-weighted: highSorenessWeeks(avgSoreness>=2.5)
      >=3 AND weeksSinceLastDeload>=4 -> +20). Requires
      last4WeeksData.length>=2 to run at all. HOLD/no-change: below
      score 50, or with <2 weeks of data, deload:false.
MUST_NOT: this is a SEPARATE deload signal from T-WEEKLY-03's weekly
      check-in matrix — reads raw 1-3 per-session slider scale, NOT the
      1-5 weekly check-in scale; must not be normalised together with it.
BOUNDARIES: deload trigger score>=50/100; performance drop alone reaches
      exactly 50 (the only single-signal path to 50).
SOURCE: ARCH — src/lib/algorithms.js:484 shouldDeload (soreness
      down-weighting cites Coleman 2024).
DEFECT: none.
```

```
RULE: T-VOLUME-03
LOCK: MUST override to rotate_exercise when joint>=3 (checked twice in
      source, same effect — absolute override). MUST hold
      (insufficient_feedback) when soreness==null || performance==null —
      "a missing REQUIRED signal holds", never defaults to add_set. MUST
      fire deload_trigger when performance===4 && soreness>=3. MUST fire
      drop_set(-1) at soreness===4. MUST hold at joint>=2 (joint_moderate).
      When soreness<=2 && performance<=2: pump===1 -> add_set+2
      (under_stimulus); pump===4 && soreness===2 -> hold
      (optimal_response); else add_set+1. performance>=3 && soreness<=3
      -> hold (performance_struggle). Default -> hold.
MUST_NOT: this is a DIFFERENT matrix from T-WEEKLY-03 (per-session RP-
      style vs weekly recovery x performance) — the two can legitimately
      disagree about the same week's data since they read different input
      scales and different evidence; neither overrides the other.
      nextWeekSets is unconditionally clamped to [mev,mrv] downstream.
BOUNDARIES: joint>=3 override; missing soreness/performance -> hold;
      performance===4 && soreness>=3 -> deload_trigger; soreness===4 ->
      drop_set; joint>=2 -> hold; pump===1 -> +2; pump===4 &&
      soreness===2 -> hold; else -> +1; performance>=3 && soreness<=3 ->
      hold.
SOURCE: FOUNDER — the missing-signal-holds rule is Campaign 1 P0-7 D7
      ("the OLD default silently allowed add_set on absent data" — now
      fixed); ARCH — src/lib/algorithms.js:545/658.
DEFECT: none (D7 is a documented FIXED historical defect).
```

```
RULE: T-VOLUME-04
LOCK: MUST require entries.length>=3 to adapt at all (else isAdapted:false,
      raw defaults returned); uses last 8 data points. netScore =
      (avgPump-3)*0.3 + -(avgSoreness-2)*0.4 + -(avgJoint)*0.8 +
      avgPerf*0.8 + min(avgPRFreq*0.3,0.6) + -(avgMissed*0.6). adjustment =
      round(clamp(netScore*2,-4,4)) sets — ±4 is the hard adjustment
      ceiling per muscle per adaptation cycle. mev=max(0,base.mev+
      adjustment); mav=clamp(round(bestVolume), base.mev+1, base.mrv-1);
      mrv=max(base.mav+1, base.mrv+floor(adjustment/2)). Weighting order:
      performance trend > missed reps > joint > soreness > pump
      ("pump is over-weighted in naive models"). HOLD/no-change: below 3
      data points, isAdapted:false and raw research defaults apply.
MUST_NOT: gated to Pro tier at the effectiveLandmarks precedence layer
      (T-VOLUME-08) — `tier !== 'pro' -> null`; Free tier never reaches
      this adapted layer.
BOUNDARIES: entries.length>=3 required; last 8 points used; adjustment
      clamped [-4,4] sets.
SOURCE: FOUNDER — CLAUDE.md Section 2 free/pro gating; ARCH —
      src/lib/algorithms.js:693 computeAdaptiveLandmarks.
DEFECT: none.
```

```
RULE: T-VOLUME-05
LOCK: MUST evaluate per muscle, first match wins in this order: revert
      memory (revertCounts[muscle]>=2 -> hold, "user won the argument
      twice this meso"); joint (lastJoint>=2 -> hold, suppress any add);
      residual soreness (soreForM && trainedWithin72h -> -1 set IF
      projected-1>=mev AND plannedSets-1>=1); stale soreness (soreForM but
      >72h since trained -> hold, "weekly's territory"); under-stimulus
      add (feedbackRecent<=14d, lastPerformance<=2, lastPump<=2,
      projectedPlanned<mav, !addedThisWeek -> +1 candidate IF
      projected+1<=mrv AND projected+1<=mav). Per-session cap: max 2
      nonzero-delta exercises, drops kept before adds when trimming
      (recovery has right of way). R0: isDeload -> engine fully silent
      ([]). HOLD/no-change: R0 makes this rule inert during any deload
      week; every silent hold is still logged as an adaptation_event.
MUST_NOT: safetyHold and weeklySignal==='reduce' outrank the add branch
      specifically (R5), and an UNAPPLIED coach proposal cannot suppress a
      session +1 (FQ-4 appliedGovernsWeek) — "The weekly coach remains the
      sole owner of next-week volume direction... only one of the two ever
      writes"; non-meso/ad-hoc sessions are silently skipped entirely.
      Only decisions with `show=true` surface in UI (precedence-holds
      surface only after a Sharp pre-session answer).
BOUNDARIES: HOURS_72=259200000ms; DAYS_14=1209600000ms; DAYS_4=345600000ms
      (checkinFresh); revert threshold=2; per-session cap=2 nonzero-delta
      exercises.
SOURCE: FOUNDER — docs/first-use-audit-2026-08-10/D96-RULINGS.md FQ-4
      ("Confirm-then-apply becomes true... WIRE IT"); ARCH —
      src/lib/algorithms.js:810/1012, sessionAdjustments.js:146.
DEFECT: none.
```

```
RULE: T-VOLUME-06
LOCK: computeVolumeApply MUST clamp next = clamp(current+volumeDelta, mev,
      mrv||mav||ABSOLUTE_WEEKLY_SET_CEILING(30)) — the 30-set backstop
      fires only when a row has BOTH mrv and mav missing (degenerate/
      partial sync data). computeWeeklySessionAllocation MUST compute
      factor=week/baseline (both finite & positive) else factor=1
      (identity); allocated=max(1, round(recommendedSets*factor)).
      Together these are the enforcement points translating a weekly
      coach volumeDelta into persisted planned_muscle_volume rows and then
      into actual per-exercise session set counts. HOLD/no-change:
      returns identity (factor=1) for any muscle with no row in either
      week or a zero/missing baseline.
MUST_NOT: computeVolumeApply's [mev,mrv] clamp is the FINAL backstop under
      which EVERY weekly volumeDelta (including T-WEEKLY-05's D15
      escalation step) must land — no upstream proposal may bypass it.
BOUNDARIES: ABSOLUTE_WEEKLY_SET_CEILING=30 (last-resort, missing mrv AND
      mav only).
SOURCE: FOUNDER — docs/first-use-audit-2026-08-10/D96-RULINGS.md FQ-4
      ("Closing the Apply loop"); ARCH — src/lib/coachApply.js:269/318
      (before FQ-4, planned_muscle_volume was DISPLAY-ONLY — documented
      fixed defect).
DEFECT: none (pre-FQ-4 display-only gap is a documented FIXED historical
      defect).
```

```
RULE: T-VOLUME-07
LOCK: MUST require weeklyVolumeHistory.length>=minWeeks(default 3, called
      with explicit 3 in production) to run; MUST flag a muscle when
      weeksBelow (weeks with sets<mev) >= minWeeks over the trailing
      minWeeks window; MUST skip muscles with mev<=0 (e.g. front_delts —
      "no effective minimum"). HOLD/no-change: below the minWeeks history
      requirement, no flag is raised for any muscle.
MUST_NOT: n/a — independent per-muscle display check with no senior gate.
BOUNDARIES: minWeeks=3 (production call site); weeksBelow>=minWeeks to
      flag; mev<=0 muscles excluded entirely.
SOURCE: ARCH — src/lib/algorithms.js:1364 detectLaggingMuscles.
DEFECT: none.
```

```
RULE: T-VOLUME-08
LOCK: MUST resolve precedence strictly manual > adapted (Pro only) >
      research, PER MUSCLE (mixed sources across muscles are legitimate).
      Manual wins only if isManualEdit is true (entry.explicit===true OR
      at least one of mev/mav/mrv differs numerically from the research
      default). Adapted wins only if a.isAdapted && all three values
      finite. HOLD/no-change: with no manual edit and no adapted data (or
      non-Pro tier), research defaults stand.
MUST_NOT: the adapted layer is skipped entirely for tier!=='pro' — never
      surfaced to Free regardless of any adaptive history that might exist.
BOUNDARIES: manual > adapted(Pro only) > research, strict per-muscle order.
SOURCE: FOUNDER — CLAUDE.md Section 2 free/pro gating; ARCH —
      src/lib/effectiveLandmarks.js:41/94 (Stage 6 review blocker #1 fix:
      isManualEdit's value-comparison fallback, now fixed, was a
      documented historical defect where saving the whole table silently
      disabled adaptation for every muscle).
DEFECT: none (Stage 6 blocker #1 is documented FIXED, not live).
```

---

## TRAINING DOMAIN — recovery (T-RECOVERY-01..05)

```
RULE: T-RECOVERY-01
LOCK: MUST apply below_par -> setDelta=-1 (floored at 1 working set),
      loadFactor=0.95 (rounded DOWN to the 0.25 grid); average -> {0,1} (no
      change); sharp -> {0,1} + acknowledgement only — "good readiness
      NEVER pushes beyond the plan". HARD INVARIANT (fuzz-enforced):
      adjusted sets <= planned sets and adjusted load <= planned load for
      EVERY input, strictly downward-only. HOLD/no-change: average/sharp
      intent leaves plan untouched.
MUST_NOT: must never produce an adjustment that exceeds the planned
      sets/load in either direction — the invariant is unconditional, not
      merely typical; dismissible via "Use planned targets instead" is the
      user's own override, not this rule relaxing itself. This rule is
      itself downstream of livePrescription's senior trim
      (T-LIVESET-01 rule 7), which applies the SAME 0.95 factor.
BOUNDARIES: below_par: setDelta=-1, loadFactor=0.95 (round down to 0.25);
      average/sharp: setDelta=0, loadFactor=1.
SOURCE: ARCH — src/lib/sessionAdjustments.js:211-286 READINESS_RULES;
      available at every tier (not Pro-gated).
DEFECT: none.
```

```
RULE: T-RECOVERY-02
LOCK: MUST apply the IDENTICAL magnitude as T-RECOVERY-01's below_par
      (setDelta=-1, loadFactor=0.95) when reEntryEaseActive is true and
      matched to the current session, tagged because:
      'athlete_reentry_choice' (never 'below_par'). resolveSessionEasingTweak
      MUST choose ONE tweak object, NEVER sum: if the intent-sheet answer
      already reduces for a same-day reason (poor sleep/low energy), THAT
      reason leads; re-entry easing only fills in when the intent sheet
      itself did not call for a reduction. HOLD/no-change: no active
      pending re-entry state for this (mesocycleWeekId, routineId) ->
      no tweak from this rule.
MUST_NOT: "stacking two downward steps... is forbidden by the re-entry
      amendment" — T-RECOVERY-01 and T-RECOVERY-02 must never compound in
      the same session; must not be gated to Pro tier — "re-entry easing
      is the athlete's own explicit answer to a question every tier is
      asked".
BOUNDARIES: identical magnitude to T-RECOVERY-01 (setDelta=-1,
      loadFactor=0.95) by deliberate constant reuse.
SOURCE: FOUNDER — LAW — Campaign 21 brief permanent-law list ("planned vs
      adaptive recovery distinct" / "long absence = uncertainty/re-entry,
      never fabricated detraining" is the adjacent law this provenance
      distinction protects); ARCH — src/lib/sessionAdjustments.js:317/351,
      reEntryEaseState.js.
DEFECT: none.
```

```
RULE: T-RECOVERY-03
LOCK: MUST resolve state as PLANNED_BLOCK_RECOVERY when
      week>=recoveryWeek AND recoveryPhaseAllowed; MUST resolve
      NORMAL_ACCUMULATION when week>=recoveryWeek AND
      !recoveryPhaseAllowed (because:'accumulation_work_outstanding' —
      position beats calendar); MUST resolve ADAPTIVE_RECOVERY_ADJUSTMENT
      when week<recoveryWeek AND isDeload===true; else
      NORMAL_ACCUMULATION. MUST show DIFFERENT copy for PLANNED vs
      ADAPTIVE causes, never conflated ("NO FALSE CAUSE"). HOLD/no-change:
      awaitingDecision short-circuits to null outright — no lighter-
      training claim on a finished, undecided block.
MUST_NOT: recoveryPhaseAllowed (a PROGRAMME fact, T-PROGRAMME-09) outranks
      the calendar reaching the recovery week; must never explain a
      planned recovery week with recovery-evidence copy or vice versa.
BOUNDARIES: week>=recoveryWeek && allowed -> PLANNED; week>=recoveryWeek
      && !allowed -> NORMAL_ACCUMULATION; week<recoveryWeek &&
      isDeload -> ADAPTIVE; else NORMAL_ACCUMULATION.
SOURCE: FOUNDER — Campaign 21 brief permanent-law list ("planned vs
      adaptive recovery distinct"); ARCH — src/lib/recoveryState.js:90
      (replaces a documented fixed defect: a single is_deload boolean that
      conflated the two causes, risking telling a well-recovered athlete
      in their normal recovery week that their recovery had been poor).
DEFECT: none (the single-boolean conflation is a documented FIXED
      historical defect).
```

```
RULE: T-RECOVERY-04
LOCK: MUST prescribe isFirstHalf -> same weight as prevSets, 50% of reps
      (round(baseReps*0.5), floor 1); !isFirstHalf -> 50% of weight
      (rounded to 0.25 grid) AND 50% of reps; RIR fixed at 4 for both
      halves. This IS the senior prescription for a recovery-week session
      — T-LIVESET-01's resolveSetPrescription defers entirely to
      senior.deloadTargets when senior.isDeload is set.
MUST_NOT: describePrescriptionDifferences must not claim "reduced loading"
      on the first half — the load is KEPT and only reps are halved on
      that half; a documented anti-pattern the copy layer explicitly
      guards against ("plausible-sounding copy nobody checked").
BOUNDARIES: first half: 100% weight, 50% reps; second half: 50% weight,
      50% reps; RIR=4 fixed both halves.
SOURCE: ARCH — src/lib/algorithms.js:1334 generateDeloadPrescription; this
      IS the authority T-LIVESET-01 rule 1 (SENIOR_RECOVERY_HOLD) reads
      verbatim.
DEFECT: none.
```

```
RULE: T-RECOVERY-05
LOCK: NOT A PRODUCTION RULE — excluded from scenario coverage, ledger gets
      safety_na_reason. evaluateAutoReg/predictDeloadWeek have NO
      production screen caller (grep-confirmed against src/screens and
      blockAdvisor.js); only test files import them. If a scenario writer
      is tempted to test this file's thresholds (jointDiscomfort>=3 ->
      deload_now -50%; jointAlerts>=2 -> reduce_volume -20%; various
      weighted-average branches), those thresholds are NOT reachable from
      any user action.
MUST_NOT: must not be conflated with T-VOLUME-03 (computeAdaptiveDecision,
      production-live via WorkoutSummaryScreen) or T-PROGRAMME-08/10
      (blockAdvisor's own signal detection, production-live via
      PlansScreen) — those are the LIVE joint/fatigue/soreness
      autoregulation authorities.
BOUNDARIES: n/a — not production-reachable.
SOURCE: ARCH — src/lib/mesocycle.js:212/315 (no code comment claims
      deliberate-retention status the way T-PROGRAMME-02's does).
DEFECT: SUSPECTED-DEFECT (carried from graph, dead-code candidate, NOT
      fixed): "two DIFFERENT joint/fatigue/soreness autoregulation
      formulas exist in the codebase (this one and T-VOLUME-03), and only
      T-VOLUME-03 is wired to a screen... worth a scenario-writer question
      to the founder rather than an assumption either way" — carried
      verbatim per instructions, flagged for D37 triage, mention-don't-fix.
```

---

## TRAINING DOMAIN — performance (T-PERFORMANCE-01..03)

```
RULE: T-PERFORMANCE-01
LOCK: MUST return weight verbatim when reps===1. MUST clamp reps at 20 for
      the formula (r=min(reps,20)). MUST blend epley*0.6+brzycki*0.4 for
      r<=10; MUST use Epley ALONE for r>10 (11-20) — Brzycki over-inflates
      in that range. HOLD/no-change: w<=0 or reps<1 returns w if finite &&
      >0, else 0 (guard).
MUST_NOT: must not use an uncapped rep count in the formula — reps past 20
      would return a wildly inflated (~5x) estimate; must not use Brzycki
      above 10 reps (C10L fix — "a lighter high-rep set could manufacture
      an Est. max PR").
BOUNDARIES: reps clamped at 20; r<=10 blend 0.6/0.4; r>10 pure Epley.
SOURCE: FOUNDER — C10L ruling (documented fixed historical defect, per
      graph citation); ARCH — src/lib/algorithms.js:101 calculate1RM.
DEFECT: none (C10L is documented FIXED, not live).
```

```
RULE: T-PERFORMANCE-02
LOCK: MUST exclude setType in {warmup, myo_reps, rest_pause} from
      1rm_estimate eligibility (both the new set AND every historical
      comparator) — cluster-commit rows store SUMMED reps and would
      fabricate a huge estimate. MUST require new1RM > best1RM*1.001
      (0.1% margin) for a 1rm_estimate PR; weight>heaviestEver (any
      margin) for heaviest_weight; reps>maxRepsAtWeight (0.1kg tolerance,
      maxRepsAtWeight>0 required) for most_reps_at_weight. MUST collapse
      multiple PRs per exercise per session to ONE, ranked
      1rm_estimate(3)>heaviest_weight(2)>most_reps_at_weight(1), tie-broken
      by larger value.
MUST_NOT: warm-up/myo-rep/rest-pause rows can never set OR seed a
      1rm_estimate PR under any circumstance; must not award
      most_reps_at_weight on a genuinely first-ever weight for the
      exercise (maxRepsAtWeight>0 required).
BOUNDARIES: 1rm_estimate margin = 1.001 (0.1%); most_reps_at_weight weight
      tolerance = 0.1kg.
SOURCE: ARCH — src/lib/algorithms.js:355/360/446.
DEFECT: none.
```

```
RULE: T-PERFORMANCE-03
LOCK: MUST require >=3 eligible sessions (isE1rmEligibleRow filter) before
      either function runs. Comparison window = 4 most recent sessions (3
      adjacent comparisons); "progressed" = curr>prev*1.001
      (E1RM_PROGRESS_MARGIN, shared with T-PERFORMANCE-02). Plateau
      qualifies at consecutiveStalls>=2, but the qualifying PLATEAU
      additionally requires distinctWeeks>=3 (PLATEAU_MIN_WEEKS) AND
      spanDays>=14 (PLATEAU_MIN_SPAN_DAYS) AND biggestGap<=14
      (PLATEAU_MAX_GAP_DAYS), else returned as {plateau:false,
      consecutiveStalls}. resolution: consecutiveStalls>=3 ->
      swap_exercise; ===2 -> change_rep_range. detectProgressionConsistency
      requires comparisons>=2; 'progressing' if gains>=ceil(comparisons/2)
      (a MAJORITY), else 'holding' (never a negative claim). HOLD/
      no-change: below the 3-eligible-session floor, neither function
      produces a verdict.
MUST_NOT: detectPlateau and detectProgressionConsistency share
      sessionBestE1rm and the 1.001 margin BY DESIGN "so the app can never
      say a muscle is both progressing and plateaued from the same data"
      (C13 job 1 fix — previously they used different session-summary
      bases and could disagree); cluster-set rows (myo_reps, rest_pause)
      and warm-ups never count as evidence for either function.
BOUNDARIES: >=3 eligible sessions to run; 4-session comparison window;
      consecutiveStalls>=2 to qualify; PLATEAU_MIN_WEEKS=3;
      PLATEAU_MIN_SPAN_DAYS=14; PLATEAU_MAX_GAP_DAYS=14;
      consecutiveStalls>=3 -> swap_exercise, ===2 -> change_rep_range;
      gains>=ceil(comparisons/2) -> progressing.
SOURCE: FOUNDER — C13 job 1 fix (documented, per graph); ARCH —
      src/lib/algorithms.js:1096/1136/1304.
DEFECT: none (C13 job 1 divergence is documented FIXED, not live).
```

---

## TRAINING DOMAIN — liveset (T-LIVESET-01..09) — Campaign 20, FOUNDER-level per brief

```
RULE: T-LIVESET-01
LOCK: MUST execute the pipeline in this exact order, never reordered: (1)
      SENIOR — isDeload && deloadTargets.length -> return deloadTargets[idx]
      verbatim, provenance SENIOR_RECOVERY_HOLD, confidence 'high', ALWAYS
      wins (Law F); (2) TYPE GATE — exerciseType in {duration,distance} OR
      setType in {dropset,myo_reps,rest_pause,warmup} ->
      INSUFFICIENT_EVIDENCE, confidence 'low', prefill false; (3) FIRST-TIME
      — no history AND no today evidence -> FIRST_TIME_BAND, confidence
      'low'; (4) WORKING LOAD (T-LIVESET-02/03/04); (5) STRUCTURE
      (T-LIVESET-05, skipped if overrideLoad set OR sessionDriven true);
      (6) REP TARGET (T-LIVESET-06); (7) SENIOR TRIM (readiness/re-entry
      load factor + layoff 0.9 multiplier), applied LAST, downward-only.
      BODYWEIGHT LAW: exerciseType==='reps_only' -> weight forced null
      unconditionally, AFTER every other computation. HOLD/no-change: rule
      2's type gate returns INSUFFICIENT_EVIDENCE with no intelligence
      applied — pure hold state.
MUST_NOT: the pipeline order is FIXED by design and must never be
      reordered; deload (rule 1) and the type gate (rule 2) are senior to
      everything, including user override (Law G) and structure (Law E);
      the readiness/re-entry/layoff trim (rule 7) may only ever REDUCE the
      resulting number, never raise it; AMRAP positions never receive a
      numeric repsTarget.
BOUNDARIES: pipeline is 7 ordered steps as listed; exactly 13 provenance
      codes; PURE and deterministic — same packet+position in, same
      Prescription out, always.
SOURCE: FOUNDER — docs/live-prescription-campaign-20-2026-08-16/
      CAMPAIGN-20-PHASE-1-DESIGN.md §9.3 (precedence pipeline, Laws A-H
      confirmed §6) + §14 (recovery precedence, Law F) + §15 (type gate)
      + §7 (evidence hierarchy); ARCH — src/lib/livePrescription.js:867.
DEFECT: none.
```

```
RULE: T-LIVESET-02
LOCK: MUST discount outliers first (T-LIVESET-07). DROP
      (LOAD_DROP_CONSECUTIVE_MISS): the BEST set at top load W missed
      repsMin in TWO CONSECUTIVE comparable (non-discounted) sessions ->
      weight = W - resolveLoadIncrement(W). A SINGLE miss MUST hold and
      rebuild (HOLD_BUILDING_RANGE), never drop on one miss. ADVANCE
      (LOAD_ADVANCE_RANGE_TOPPED): range topped at W (best reps>=band.max),
      NOTHING at W missed, AND effort corroborates (sessionDifficulty 1-3
      of 1-5) AND W>0 -> weight = W + increment. Effort 4-5 ("very hard")
      -> HOLD_EFFORT_VERY_HARD. No difficulty rating -> HOLD_EFFORT_UNKNOWN.
      Otherwise -> MATCH_LOAD_ADD_REP. DROP is checked BEFORE ADVANCE — a
      genuine regression is never masked by a "topped" read from a
      different, more recent comparable session.
MUST_NOT: never advances a zero/unloaded (W<=0) top set regardless of
      reps (CALC-5, bodyweight-never-loads); never fires when senior
      deload/type-gate/first-time already short-circuited T-LIVESET-01
      rules 1-3.
BOUNDARIES: consecutive-miss DROP = exactly 2 consecutive comparable
      sessions; ADVANCE requires best reps>=band.max AND
      sessionDifficulty in [1,3]; effort 4-5 holds regardless of range-top.
SOURCE: FOUNDER — CAMPAIGN-20-PHASE-1-DESIGN.md §10 (LOAD-PROGRESSION
      RULE) + FOUNDER-RULINGS-2026-08-16 Ruling 3 (one-session load-advance
      confirmation window, consecutive-miss remains the backstop); ARCH —
      src/lib/livePrescription.js:195.
DEFECT: none.
```

```
RULE: T-LIVESET-03
LOCK: adjustWeaker MUST fire when last logged set reps<band.min -> drop
      one increment, honest target=band.min; OR when in-band but >=3
      below the HISTORY-based expected-curve value -> hold the load,
      target drops to the honest expected value. adjustStronger MUST fire
      ONLY when last set reps>=band.max+2 (explicit "+2 overshoot"), bounded
      to ONE step per session, REQUIRES no sub-band set logged today
      (anySubBand check), and is DISABLED OUTRIGHT (hard changed:false,
      never merely trimmed) under senior.isDeload, senior.blockFinished,
      senior.reEntryEaseActive, or senior.readinessReductionActive
      (Founder Ruling 2, ABSOLUTE). adjustWeaker is checked BEFORE
      adjustStronger. HOLD/no-change: inside band and not >=3 below
      expected, and not >=band.max+2 overshoot -> neither fires
      ("anything inside that leaves both changed:false" — the ±2-rep
      noise floor).
MUST_NOT: adjustStronger must never fire with any sub-band set already
      logged today, and must never compound twice in one session; must
      never be "merely trimmed" under the four named senior states — it
      is hard-disabled.
BOUNDARIES: adjustWeaker: <band.min (any drop) OR >=3-below-expected;
      adjustStronger: >=band.max+2, one step per session only.
SOURCE: FOUNDER — FOUNDER-RULINGS-2026-08-16 Ruling 2 verbatim: "Overshoot
      only. No mid-session load ADD during deload/recovery, re-entry
      easing or an active readiness reduction. Those are senior."; ARCH —
      src/lib/livePrescription.js:337/372.
DEFECT: none.
```

```
RULE: T-LIVESET-04
LOCK: MUST detect a load override when |loggedWeight-prescribedWeight| >
      half an increment; a reps override when |loggedReps-prescribedReps|
      > 2. An active override (today.overrideLoad != null) MUST be checked
      FIRST in determineWorkingLoad, before any today-evidence adjustment
      — Law G outranks Law B (current-session evidence) and Law E
      (structure). HOLD/no-change: a logged value within the tolerance
      band is not an override — ordinary evidence rules apply instead.
MUST_NOT: user override does NOT outrank the senior deload gate (rule 1 of
      T-LIVESET-01), which owns the session outright before override
      state is even consulted.
BOUNDARIES: load override threshold = half of resolveLoadIncrement (>
      not >=); reps override threshold = |delta| > 2.
SOURCE: FOUNDER — CAMPAIGN-20-PHASE-1-DESIGN.md §9.4/§7 (Law G, user
      choice senior); ARCH — src/lib/livePrescription.js:401/408, called
      at ActiveWorkoutScreen.js:2015-2016 per the LEAD VERIFICATION
      ADDENDUM (flag closed, production caller confirmed).
DEFECT: none (the graph's own caller-gap flag was closed by lead
      verification: confirmed live at ActiveWorkoutScreen.js:2015-2016).
```

```
RULE: T-LIVESET-05
LOCK: A stable back-off MUST exist at position `pos` only when >=2 of the
      last 3 outlier-discounted comparable sessions show ratio_p=
      weight_p/topWeight<=0.95 AND those low ratios agree within 0.05 of
      each other. ratio returned = median of the agreeing subset. MUST be
      applied AFTER working-load determination but BEFORE rep-target
      computation. HOLD/no-change: skipped entirely when
      today.overrideLoad!=null OR working.sessionDriven===true — current-
      session evidence outranks stable structure (§7 tier 3 > tier 4).
MUST_NOT: one session can NEVER create a back-off pattern — the >=2-of-3
      requirement is the enforcement of this adversarial property; AMRAP
      rows are excluded from structure learning entirely.
BOUNDARIES: >=2 of last 3 sessions at ratio<=0.95, agreeing within 0.05.
SOURCE: FOUNDER — CAMPAIGN-20-PHASE-1-DESIGN.md §13.1 (Law E, CONFIRMED
      and AMENDED: structural anchor pass amended to preserve detected
      back-offs); ARCH — src/lib/livePrescription.js:263.
DEFECT: none.
```

```
RULE: T-LIVESET-06
LOCK: declinePerPosition MUST be 0 reps/position for isolation/accessory,
      1 rep/position for compound (default). Mid-session (a prior position
      already logged today) MUST re-base off TODAY's most recent logged
      position, declined by the gap. Otherwise MUST use the median of
      history's observations at that exact position (falling back to the
      nearest LOWER position with data, decline-adjusted, when unobserved).
      Final rep target ("the beat rule") =
      clamp(min(E+1, band.max), band.min, band.max) — always ask for one
      more than the expected curve, capped at band.max. HOLD/no-change:
      LOAD_ADVANCE_RANGE_TOPPED / LOAD_DROP_CONSECUTIVE_MISS /
      INSUFFICIENT_EVIDENCE provenances bypass this and use band.min
      directly ("fresh range at the new load").
MUST_NOT: today's own logged positions must always outrank history when
      present (avoids self-reference); must be entirely overridden when
      working.repsOverride is already set by a drop/add/deload/user-
      override branch.
BOUNDARIES: decline: 0/position isolation, 1/position compound; final rep
      target = clamp(min(E+1,band.max), band.min, band.max).
SOURCE: FOUNDER — CAMPAIGN-20-PHASE-1-DESIGN.md §11 (beat rule) + §13.2
      (expected-curve prior); ARCH — src/lib/livePrescription.js:298/314/106.
DEFECT: none.
```

```
RULE: T-LIVESET-07
LOCK: MUST discount a session from LEARNING when its top e1RM sits >10%
      below the window median (sessionTopE1rm(session) < median*0.9). MUST
      apply before every learning computation (opening load, back-off
      ratio, expected curve, confidence). MUST NEVER remove a session from
      the `history` shown as reference (Law A: never fabricate, never
      hide — the reference row still shows real history). HOLD/no-change:
      list.length<=1 returns unchanged — a single session can never be
      its own outlier.
MUST_NOT: outlier discounting affects LEARNING only, never the displayed
      reference history — Law A forbids hiding real history from the
      athlete even when the engine discounts it for its own maths.
BOUNDARIES: outlier threshold = top e1RM < window median * 0.9 (10%
      discount); list.length<=1 -> no discount applied.
SOURCE: FOUNDER — CAMPAIGN-20-PHASE-1-DESIGN.md §13.3 + §6 Law A
      ("previous performance is evidence, not the prescription... no
      surface may present a historical ordinal value as the target"); ARCH
      — src/lib/livePrescription.js:178.
DEFECT: none.
```

```
RULE: T-LIVESET-08
LOCK: raw increment = incrementKg (custom) ?? defaultIncrement(w, units,
      category); MUST cap at 5% of the base load (cappedByPercent =
      min(raw, w*0.05)); MUST round to nearest 0.25; MUST floor at 0.25
      (never zero). defaultIncrement table: kg compound >=60kg->2.5 else
      1.25; kg isolation >=20kg->1 else 0.5; kg accessory >=40kg->1.25 else
      0.75; lbs compound >=135lb->5 else 2.5; lbs isolation >=45lb->2.5
      else 1.25; lbs accessory >=90lb->2.5 else 1.25. HOLD/no-change: n/a
      — pure function, always returns a positive increment.
MUST_NOT: this is the ONE increment source of truth for every load-
      changing branch in livePrescription.js — no competing formula may
      be introduced elsewhere in the module.
BOUNDARIES: cap = 5% of base load; rounding grid = 0.25; floor = 0.25
      (never 0); weight-band edges as listed in the defaultIncrement table.
SOURCE: FOUNDER — CAMPAIGN-20-PHASE-1-DESIGN.md §10.2/§10.4 ("the 5%
      cap" named explicitly); ARCH — src/lib/livePrescription.js:116,
      algorithms.js:313.
DEFECT: none.
```

```
RULE: T-LIVESET-09
LOCK: MUST cap the opening load at the most recent comparable session's
      top load (never let the ADVANCE gate fire) when senior.layoffDays>7
      OR senior.blockFinished, while STILL respecting a genuine
      consecutive-miss DROP and still allowing back-off structure to
      compose. Layoff specifically applies seniorMultiplier=0.9 on top of
      the capped load ("the ×0.9 named in the mission"); block-finished
      applies NO multiplier (cap only). Fires only when
      today.working.length===0 (no today evidence yet). HOLD/no-change:
      once a set is logged today, ordinary Law B (today-evidence) rules
      take over and this rule no longer applies for the rest of the
      session.
MUST_NOT: "a senior flag never makes the prescription MORE aggressive
      against every history shape" (Stage 14 invariant) — this rule may
      only hold or reduce, never raise beyond the cap.
BOUNDARIES: layoffDays>7 (strict >); seniorMultiplier=0.9 for layoff only;
      block-finished = cap only, no multiplier.
SOURCE: FOUNDER — CAMPAIGN-20-PHASE-1-DESIGN.md §10.5/§14 ("layoff >7d",
      "×0.9" both named explicitly); ARCH —
      src/lib/livePrescription.js:829-844.
DEFECT: none.
```

---

## TRAINING DOMAIN — session (T-SESSION-01..04) — Campaign 20 adjacent, FOUNDER per brief where cited

```
RULE: T-SESSION-01
LOCK: MUST resolve session state by exact table lookup (no branch-order
      dependency): (1) no explicit, no completion -> OUTSTANDING; (2) no
      explicit, completion exists -> COMPLETED; (3) SKIPPED explicit, no
      completion -> SKIPPED_BY_USER; (4) SKIPPED explicit, completion
      exists -> COMPLETED ("real performed work is stronger truth than an
      earlier intention to skip"); (5) ENDED_EARLY explicit, no OTHER
      completion -> ENDED_EARLY; (6) ENDED_EARLY explicit, OTHER completion
      exists -> ENDED_EARLY flagged conflict (diagnostically invalid,
      never silently upgraded). Identity is (mesocycleWeekId, routineId),
      proven sufficient even when a routine name repeats within a week.
MUST_NOT: rule 6's conflict state must NEVER be silently resolved to a
      clean state — it is recorded as a diagnostic conflict, "not
      reachable by any authorised path"; COMPLETED is always DERIVED,
      never itself an explicit resolution type.
BOUNDARIES: the 6-row table exactly as listed; EXPLICIT_RESOLUTIONS =
      [SKIPPED_BY_USER, ENDED_EARLY] only.
SOURCE: FOUNDER — LAW — Campaign 21 brief permanent-law list
      ("explicit skip neutral/instance-scoped"; "ended-early preserves
      actual work, untouched work unknown"); ARCH —
      src/lib/blockProgression.js:171/242 (the founder-pinned table,
      replacing the documented FIXED defect of the old single-integer
      `programmes.next_workout_index` pointer).
DEFECT: none (the pointer defect is documented FIXED, not live).
```

```
RULE: T-SESSION-02
LOCK: MUST resolve the ONE current resolution by total order: newest
      updatedAt, then newest resolvedAt, then explicit-state rank
      (ENDED_EARLY=2 > SKIPPED_BY_USER=1), then workoutId text, then id
      text (ASCII code-unit compare, matching the server-side C-collation
      trigger). MUST be deterministic regardless of arrival order —
      "shuffling the input cannot change the result". HOLD/no-change: a
      single resolution row needs no tie-break.
MUST_NOT: soft-deleted rows (deletedAt != null) must never be counted in
      the resolution total order.
BOUNDARIES: tie-break order: updatedAt > resolvedAt > state-rank
      (ENDED_EARLY=2, SKIPPED_BY_USER=1) > workoutId > id.
SOURCE: ARCH — src/lib/blockProgression.js:132/107; mirrored server-side
      by a founder-gated cloud migration's BEFORE UPDATE trigger (schema-
      level enforcement of the same ordering).
DEFECT: none.
```

```
RULE: T-SESSION-03
LOCK: MUST always confirm when totalLoggedSets===0. Else: planned =
      exercises where !_timeCrunchSkipped; confirm required UNLESS every
      planned exercise has >=1 logged set. An exercise deliberately
      dropped via Time Crunch is EXCLUDED from the "would this be silently
      abandoned" check — "that's a deliberate choice, not an abandonment".
MUST_NOT: must not treat a Time-Crunch-dropped exercise as abandoned work
      requiring confirmation.
BOUNDARIES: totalLoggedSets===0 -> always confirm; else confirm unless
      planned.length>0 && planned.every(sets.length>0).
SOURCE: ARCH — src/lib/workoutHelpers.js:64 shouldConfirmBeforeFinish.
DEFECT: none.
```

```
RULE: T-SESSION-04
LOCK: MUST reduce rest 30% first (restSec*0.70). If a starter-session trim
      is configured (maxSetsPerExercise or maxExercises set): MUST keep
      first N exercises in plan order, cap sets per exercise —
      deterministic, no minutes-budget dependency. Otherwise MUST drop
      lowest-priority ISOLATION exercises (compounds always protected),
      sorted fewest-sets-first, removed highest-sets-first, until
      estimateFn(result)<=targetMinutes. Starter-trim mode runs INSTEAD OF
      the budget-fit isolation drop, never both.
MUST_NOT: compounds are NEVER dropped by the budget-fit path under any
      time pressure.
BOUNDARIES: rest reduction = 30% (restSec*0.70); starter-trim XOR
      budget-fit isolation drop (never both).
SOURCE: ARCH — src/lib/mesocycle.js:372 applyTimeCrunch, confirmed
      production-live by the LEAD VERIFICATION ADDENDUM (imported
      ActiveWorkoutScreen.js:91, called :2632; caller-gap flag closed).
DEFECT: none (the graph's own caller-gap flag was closed by lead
      verification).
```

---

## TRAINING DOMAIN — slot (T-SLOT-01..04)

```
RULE: T-SLOT-01
LOCK: MUST treat EXCLUDED ("Don't suggest") as INDEFINITE until explicitly
      restored. MUST treat AVOIDED_BLOCK ("Avoid for this block") as live
      ONLY while row.scopeMesocycleId === the CURRENT active mesocycle id
      — expires automatically when the block ends, no invented duration.
      Exclusion/avoidance affects SUGGESTION/auto-selection paths ONLY —
      "an excluded exercise stays reachable through 'show excluded'".
MUST_NOT: explicit user intent outranks everything else in this module —
      "An exclusion beats swap history; an approved default beats a
      counted preference" (T-SLOT-03 is junior to this).
BOUNDARIES: EXCLUDED = indefinite; AVOIDED_BLOCK = live only while
      scopeMesocycleId matches the current active mesocycle.
SOURCE: ARCH — src/lib/exercise/intent.js:160/169/184.
DEFECT: none.
```

```
RULE: T-SLOT-02
LOCK: MUST count only rows with scope===SWAP_SCOPE.PROGRAMME toward
      swappedAwayCount (feeds T-PROGRAMME-04 rule 2, >=2 -> REPLACE). MUST
      NOT count rows recorded before scope existed (scope===null) — "that
      asymmetry is deliberate and it favours the user". SESSION-scoped
      substitutions are counted SEPARATELY (sessionSubstitutionCount) and
      must NEVER reach a replace decision.
MUST_NOT: a one-off swap because a machine was busy (SESSION scope) must
      never be used as negative preference feeding T-PROGRAMME-04's
      REPLACE verdict — this is the C16 quality-law-1 fix for a documented
      historical defect where two busy-machine days reached the threshold
      and the exercise was proposed for removal.
BOUNDARIES: only SWAP_SCOPE.PROGRAMME rows count; pre-scope legacy rows
      (scope===null) excluded; SESSION-scoped rows excluded entirely.
SOURCE: FOUNDER — C16 quality-law-1 fix (documented, per graph citation);
      ARCH — src/lib/exercise/intent.js:252, database.js:9684.
DEFECT: none (C16 quality-law-1 is documented FIXED, not live).
```

```
RULE: T-SLOT-03
LOCK: A routine-specific default MUST win over a plan-wide default ("the
      more specific context is the better answer"). repeatedDefaultCandidate
      MUST require top.count>=REPEATED_SWAP_MIN(3) AND top.explicit===true
      AND the candidate still eligible (not since excluded) AND no default
      already approved — and MUST be an OFFER only, never automatic ("the
      caller must ask the user"). HOLD/no-change: below 3 repeated
      explicit swaps, or if the candidate has since been excluded, no
      offer is made.
MUST_NOT: an approved default that the user has SINCE excluded (T-SLOT-01)
      must not be offered — exclusion (T-SLOT-01) outranks an approved
      default; repeatedDefaultCandidate NEVER writes automatically.
BOUNDARIES: REPEATED_SWAP_MIN=3 explicit repeated swaps required.
SOURCE: ARCH — src/lib/exercise/intent.js:200/412.
DEFECT: none.
```

```
RULE: T-SLOT-04
LOCK: trainedRecently MUST use a 45-day recency window (matches
      T-LIVESET's 45-day comparability window). sufficient = sessions>=2
      OR chosen>=REPEATED_SWAP_MIN(3) — "a brand-new exercise must be
      allowed to say so. One session is a try, not a preference". maturity
      MUST be ESTABLISHED at sessions>=4 (ESTABLISHED_SESSIONS) OR
      repeatedChoice>=3; EMERGING at sessions>=1 OR repeatedChoice>=1;
      else NONE. MATURITY_WEIGHT: NONE=0, EMERGING=0.5, ESTABLISHED=1 —
      "Zero at NONE is the whole point... a NEW/replacement exercise must
      not inherit confidence or working load from the exercise it
      replaced". HOLD/no-change: a never-performed exercise ALWAYS starts
      at maturity NONE regardless of what it replaced.
MUST_NOT: Founder Law 2 — new/replacement exercises begin with
      insufficient personal evidence and must never transfer confidence or
      working load from the exercise they replaced; tolerance is
      explicitly NOT tracked per exercise — "the app's recovery feedback
      is whole-body and per-session; attributing it to one exercise would
      be manufacturing evidence"; this module explicitly disclaims any
      "score" or hypertrophy-effectiveness claim.
BOUNDARIES: trainedRecently window=45 days; sufficient: sessions>=2 OR
      chosen>=3; ESTABLISHED: sessions>=4 OR repeatedChoice>=3; EMERGING:
      sessions>=1 OR repeatedChoice>=1; MATURITY_WEIGHT 0/0.5/1.
SOURCE: FOUNDER — "Founder Law 2" and "Founder Law 3" cited verbatim in
      code comment (per graph); ARCH — src/lib/exercise/intent.js:312/382/397.
DEFECT: none.
```

## NUTRITION DOMAIN — N-TARGETS (target calculation & persistence)

```
RULE: N-TARGETS-01
LOCK: MUST use Katch-McArdle ONLY when bodyFatPercent is finite, >0, <60,
      AND bodyFatSource is a baseline source (dexa/caliper/bia/visual/
      manual/self_reported); otherwise MUST use Mifflin-St Jeor. MUST
      clamp age [13,100], height [100,250]cm, weight [30,350]kg before
      calculation. HOLD/no-change: n/a — foundational calc, always
      produces a value.
MUST_NOT: must not select Katch-McArdle on a non-baseline BF% source or an
      out-of-range BF% value.
BOUNDARIES: BF% valid range (0,60) exclusive at 0, exclusive at 60; age
      clamp [13,100]; height clamp [100,250]cm; weight clamp [30,350]kg.
SOURCE: ARCH — src/lib/nutritionEngine.js calcBMR()/calculateNutritionTargets()
      :586-608,897-1105.
DEFECT: none.
```

```
RULE: N-TARGETS-02
LOCK: MUST compute maintenanceKcal = max(1, round(bmr*multiplier) +
      effectiveMaintenanceResidualKcal), multiplier by activityLevel:
      sedentary 1.2, light 1.375, moderate 1.55, active 1.65, very_active
      1.725 (tuned down from generic 1.725/1.9 for a gym-only population).
      N-MAINT-05's residual is applied additively, exactly once per call.
MUST_NOT: must not apply the effective-maintenance residual more than once
      per call (N-MAINT-05's single-application law is senior here); must
      not let the result fall to or below 0.
BOUNDARIES: multipliers as listed; floor = max(1, ...).
SOURCE: ARCH — src/lib/nutritionEngine.js:946-951; residual supplied only
      by N-MAINT-01's canonical resolver (LAW — CAMPAIGN-19-EFFECTIVE-
      MAINTENANCE-DESIGN.md).
DEFECT: none.
```

```
RULE: N-TARGETS-03
LOCK: MUST apply phase adjustments: lean_gain +10%, build +17%, maintain
      0%, recomp -5%, mild_cut -13%, aggressive_cut -22%; surplus phases
      further scaled by experience: beginner x1.30(lean_gain)/x1.25(build),
      intermediate x1.00/1.00, advanced x0.65/0.80, competitive x0.50/0.65.
MUST_NOT: this is senior to nothing below it — N-TARGETS-04/05/06 (safety
      floors) are senior and clamp the result of this rule AFTER it runs;
      this rule must never be treated as the final targetKcal.
BOUNDARIES: phase % adjustments and experience multipliers exactly as
      listed.
SOURCE: ARCH — src/lib/nutritionEngine.js PHASE_ADJUSTMENTS/SURPLUS_EXP_MULT
      :27-34,881-886,954-974.
DEFECT: none.
```

```
RULE: N-TARGETS-04
LOCK: MUST force phaseAdj to 0 when weightKg is not finite (missing) AND
      phaseAdj<0, pushing a warning — a deficit MUST NEVER be sized off
      the invented 75kg display-fallback weight. Applies to deficits only;
      surplus/maintain unaffected.
MUST_NOT: no deficit calculation may proceed with an invented fallback
      bodyweight — this rule IS the safety rule for missing weight, senior
      to N-TARGETS-03's deficit sizing, with nothing above it.
BOUNDARIES: fires when Number.isFinite(weightKg)===false AND the intended
      phaseAdj sign is negative.
SOURCE: FOUNDER — Campaign 1 P0-7 D4 (per graph citation, missing-weight
      deficit invention guard); ARCH — src/lib/nutritionEngine.js
      calculateNutritionTargets():962-973.
DEFECT: none.
```

```
RULE: N-TARGETS-05
LOCK: MUST clamp targetKcal up to floor: male 1500 kcal, female 1200 kcal,
      unknown sex -> 1500 (the HIGHER, never the lower, floor). MUST set
      floorApplied=true and a warning when clamped. Senior to the phase
      adjustment (N-TARGETS-03); junior to nothing — a hard founder floor,
      never lower.
MUST_NOT: this floor must NEVER be lowered, raised as a threshold, or made
      conditional under any circumstance, tier, or engine state
      (tier-blind per X-SAFETY-09); unknown sex must never default to the
      lower 1200 floor.
BOUNDARIES: male=1500, female=1200, unknown=1500 (higher of the two).
SOURCE: FOUNDER — CLAUDE.md Section 2 ("Calorie floors: 1,500 kcal men /
      1,200 kcal women. Never lower."); Campaign 1 P0-7 D4 (unknown-sex
      defaults to the higher floor); ARCH — src/lib/nutritionEngine.js
      kcalFloorForSex():695-697, the single canonical statement (Campaign 1
      review finding 14 consolidated three prior restatements onto this
      one function).
DEFECT: none.
```

```
RULE: N-TARGETS-06
LOCK: MUST raise targetKcal so weekly deficit caps at HARD_GATE_LOSS_RATE=
      0.015 (1.5% BW/week); maxWeeklyDeficit = 0.015*BW*7700kcal/kg;
      maxDailyDeficit = maxWeeklyDeficit/7. Senior to the phase adjustment;
      runs AFTER the sex floor — the higher of the two constraints wins
      since both clamp targetKcal upward. Deficit phases only.
MUST_NOT: this hard gate must NEVER be raised (loosened) under any
      circumstance — Section 2 INVIOLABLE, tier-blind.
BOUNDARIES: 1.5% BW/week hard cap on weekly deficit.
SOURCE: FOUNDER — CLAUDE.md Section 2 ("rapid-loss gate (1.5% BW/week)...
      Never remove, raise thresholds, or make conditional"); ARCH —
      src/lib/nutritionEngine.js HARD_GATE_LOSS_RATE :993-1016.
DEFECT: none.
```

```
RULE: N-TARGETS-07
LOCK: MUST fire a warning (no target change) when 0.8% < lossFraction <=
      1.5% (below the hard gate). Advisory only, junior to N-TARGETS-06.
MUST_NOT: must not clamp targetKcal — this is display-only guidance, never
      an enforcement action.
BOUNDARIES: MAX_SAFE_LOSS_RATE=0.008 (0.8% BW/week); fires strictly
      between 0.8% (exclusive) and 1.5% (inclusive).
SOURCE: FOUNDER — CLAUDE.md Section 2 ("max-safe-loss (0.8%). Never
      remove..."); ARCH — src/lib/nutritionEngine.js MAX_SAFE_LOSS_RATE
      :1010-1015.
DEFECT: none.
```

```
RULE: N-TARGETS-08
LOCK: MUST fire only when targetKcal<maintenanceKcal AND proxyEA
      (targetKcal/ffmKg) < the caution line (male 35, female 40 kcal/kg
      FFM; unknown sex takes the FEMALE, more cautious, 40 line).
      suggestedKcal = clamp(line*ffmKg, [sexFloor, maintenanceKcal]) — can
      ONLY raise, never push below sexFloor or above maintenance. Set
      ABOVE (fires earlier/softer than) the FFM hard floor (N-COACH-11);
      never lowers a target itself, advisory + optional one-tap ease.
      Relevant only when a cut is being prescribed.
MUST_NOT: must never itself lower a target — advisory/one-tap-ease only;
      must never suggest a value below sexFloor or above maintenance.
BOUNDARIES: EA_CAUTION_KCAL_PER_KG male=35, female/unknown=40; fires when
      targetKcal<maintenance AND proxyEA<line.
SOURCE: FOUNDER — U3 (energy-availability caution, per graph citation) +
      CLAUDE.md Section 2 (adjacent to the FFM/energy-availability caution
      family); ARCH — src/lib/nutritionEngine.js energyAvailabilityCaution()
      :748-796,1018-1033 (unknown-sex-takes-female-line fix = audit EN-7/F3).
DEFECT: none.
```

```
RULE: N-TARGETS-09
LOCK: MUST cap protein at PROTEIN_MAX_GKGBW=2.2 g/kg BW when BF% is
      unknown (Morton 2018 CI); PROTEIN_CUSTOM_MAX_GKGBW=3.5 for a custom
      entry (sanity ceiling). Per-approach floors: standard 2.0, optimised
      2.2, advanced 2.5, custom 1.2 g/kg. Physique/strength goals
      auto-select 'advanced' unless caller overrides.
MUST_NOT: must not exceed the 2.2 g/kg cap absent a credible LBM basis, or
      3.5 g/kg for a custom entry under any circumstance.
BOUNDARIES: 2.2 g/kg cap (BF% unknown); 3.5 g/kg custom ceiling; approach
      floors 2.0/2.2/2.5/1.2.
SOURCE: ARCH — src/lib/nutritionEngine.js calcProtein():811-853,
      PROTEIN_APPROACHES:63-96, planEngine getPlanNutritionContext()
      :1148-1165.
DEFECT: none.
```

```
RULE: N-TARGETS-10
LOCK: MUST fire only when maintenance > current target (else null, a
      no-op — already at/above maintenance). MUST delegate to
      computeCalorieTargets so N-TARGETS-05's sex floor is still enforced
      on the raised target.
MUST_NOT: must never raise a target that is already at or above
      maintenance (a no-op, not a re-raise); must not bypass the sex
      floor even though this is a protective UPWARD move.
BOUNDARIES: fires strictly when maintenance > current target.
SOURCE: FOUNDER — N-ADAPTIVE-07's DIET_BREAK_THRESHOLD_WEEKS=8 (MATADOR
      trial 2017) is the trigger this apply function serves; N-TARGETS-05
      (sex floor) senior; ARCH — src/lib/coachApply.js
      computeDietBreakTargets():91-109.
DEFECT: none.
```

---

## NUTRITION DOMAIN — N-ADAPTIVE (weight-trend interpretation & adaptive sizing)

```
RULE: N-ADAPTIVE-01
LOCK: MUST smooth with EWMA_ALPHA=0.28 (~3.5-day memory); MUST drop rows
      with weightKg<=0 or non-finite. Deliberately DISTINCT from
      weeklyCoach's own computeEWMA (alpha 0.1, ~10-day memory, N-ADAPTIVE-08
      analogue inside weeklyCoach) so the two output shapes cannot be
      cross-wired.
MUST_NOT: must never be substituted for weeklyCoach's own EWMA (different
      alpha, different callers) — the two are deliberately separate
      functions.
BOUNDARIES: EWMA_ALPHA=0.28; drops weightKg<=0 or non-finite rows.
SOURCE: ARCH — src/lib/nutritionEngine.js computeEWMA():168-185.
DEFECT: none.
```

```
RULE: N-ADAPTIVE-02
LOCK: MUST prefer the date-aware path (MIN_SPAN_DAYS=6, needs >=6 days
      span between newest and comparator); MUST fall back to an
      index-based comparison (needs >=8 points, assumes daily logging)
      only when no usable date exists on the rows.
MUST_NOT: must not use the index-based fallback when dated rows are
      available.
BOUNDARIES: MIN_SPAN_DAYS=6 (date-aware); index-fallback requires >=8
      points.
SOURCE: ARCH — src/lib/nutritionEngine.js computeWeeklyWeightChange()
      :211-245.
DEFECT: none.
```

```
RULE: N-ADAPTIVE-03
LOCK: MUST require MIN_POINTS=14 (>=2 weeks) to run at all, else
      confidence='insufficient_data'. confidence bands: 'high' at
      weeks>=4, 'medium' weeks>=3, else 'low'. updateGain MUST be clamped
      to [0.5,0.65] regardless of caller input. B1: actualIntakeKcal
      (when foodDaysLogged>=5 & avg>0) replaces the prescribedKcal*
      adherenceFactor guess. ffmFloorContext MUST clamp negative
      adjustments to 0 when recentIntakeAvgKcal<=floorKcal (senior to the
      raw computation). rapidLossOverride MUST clamp ANY negative
      adjustment to 0, applied LAST so it composes without double-counting.
MUST_NOT: FFM floor (N-COACH-11) and rapid-loss override (N-COACH-08) are
      both senior to this rule's raw output and must be applied in the
      stated order (ffmFloorContext, then rapidLossOverride last).
BOUNDARIES: MIN_POINTS=14; confidence: high>=4wk, medium>=3wk, else low;
      updateGain clamp [0.50,0.65].
SOURCE: FOUNDER — CLAUDE.md Section 2 (FFM floor, rapid-loss gate both
      Section 2 inviolable); ARCH — src/lib/nutritionEngine.js
      computeAdaptiveTDEEAdjustment():277-424.
DEFECT: none.
```

```
RULE: N-ADAPTIVE-04
LOCK: MUST require STEP_DELTA_MIN=1500 steps/day AND
      STEP_DELTA_RATIO_MIN=0.20 of baseline (floored at
      STEP_BASELINE_FLOOR=4000) BOTH, plus STEP_PERSIST_MIN=1000 (each
      recent half must clear baseline by this), plus data sufficiency
      (>=10/14 recent days AND >=14/28 baseline days). Gain ramps linearly
      STEP_GAIN_BASE=0.50 at delta=1500 to STEP_GAIN_MAX=0.65 at
      delta>=4000. Only alters HOW FAST the adaptive resize updates, and
      only when direction AGREES with the weight-trend-derived adjustment
      sign.
MUST_NOT: NEVER produces, sizes, or reverses a calorie change on its own
      (explicit anti-eat-back design) — it may only accelerate an already-
      agreeing adjustment; never runs on the rapidLossOverride path
      (N-COACH-08 senior, disables this entirely).
BOUNDARIES: STEP_WINSOR_CAP=40000/day; delta>=1500 AND ratio>=0.20
      (floor 4000); persistence>=1000/half; sufficiency>=10/14 recent,
      >=14/28 baseline; gain ramp 0.50->0.65 over delta 1500-4000.
SOURCE: FOUNDER — N-COACH-08 (rapid-loss override, Section 2 inviolable)
      disables this outright; ARCH — src/lib/nutritionEngine.js
      computeStepTrendModifier() :427-569 (COMP-026 B).
DEFECT: none.
```

```
RULE: N-ADAPTIVE-05
LOCK: MUST use FFM_FLOOR_KCAL_PER_KG=30 (Mountjoy 2014/2023 IOC RED-S
      consensus). MUST require isAuthoritativeBodyFatSource (dexa/caliper/
      bia ONLY, NOT visual) for the credible-BF% path; MUST fall back to
      FFM_FALLBACK_FRACTION male=0.78, female=0.72 (conservative
      population estimate, errs toward a HIGHER, more protective floor)
      otherwise. Foundational — every FFM-gated consumer (N-ADAPTIVE-03,
      N-COACH-11, N-TARGETS-08) reads this.
MUST_NOT: this floor and its constants must NEVER be removed, raised as a
      threshold, or made conditional — Section 2 INVIOLABLE.
BOUNDARIES: FFM_FLOOR_KCAL_PER_KG=30; fallback fraction male=0.78,
      female=0.72; visual BF% source excluded from the credible path.
SOURCE: FOUNDER — CLAUDE.md Section 2 ("FFM energy floor (30 kcal/kg)...
      Never remove, raise thresholds, or make conditional"); ARCH —
      src/lib/nutritionEngine.js computeFFMFloor() :117,655-684.
DEFECT: none.
```

```
RULE: N-ADAPTIVE-06
LOCK: MUST resolve the single FFM safety weight by precedence: (1)
      today's 7-day EWMA (needs >=3 points), (2) most recent valid
      weigh-in, (3) profile bodyweight. MUST return null ONLY when no
      positive weight exists anywhere (callers hold status quo). This is
      the ONE resolved value reused by BOTH the adaptive-TDEE FFM context
      and the enforcing gate (N-COACH-11) — C10I removed the prior
      two-resolution disagreement risk.
MUST_NOT: no caller may compute a SEPARATE FFM safety weight via a
      different precedence order — this resolver is the sole authority.
BOUNDARIES: precedence: EWMA(>=3pts) > last weigh-in > profile weight;
      null only if no positive weight exists at all.
SOURCE: FOUNDER — C10I fix (per graph citation, resolving a documented
      disagreement risk); ARCH — src/lib/nutritionEngine.js
      resolveFfmFloorWeightKg():739-746.
DEFECT: SUSPECTED (historical, now FIXED per graph trace — not live):
      prior to C10A/C10I, users_profile.weightKg set at onboarding and
      never refreshed by weigh-ins meant a user who had lost weight since
      enrolment kept the FFM floor computed off their enrolment weight
      indefinitely. Confirmed fixed by this resolver; recorded as
      provenance only.
```

```
RULE: N-ADAPTIVE-07
LOCK: MUST suggest a diet break at DIET_BREAK_THRESHOLD_WEEKS=8 weeks in
      deficit (MATADOR trial 2017 Int J Obesity), using goalStartDate or a
      weeksInPhase>=8 fallback when no goalStartDate exists. Cut phases
      only (phase.isCut). This is a SUGGESTION card, not an auto-applied
      change — applying it goes through N-TARGETS-10's confirm-then-apply.
MUST_NOT: must never auto-apply the diet break itself — confirm-then-apply
      (U-AUTH-01) governs the actual target change.
BOUNDARIES: DIET_BREAK_THRESHOLD_WEEKS=8 weeks in deficit.
SOURCE: ARCH — src/lib/nutritionEngine.js shouldSuggestDietBreak()
      :105-107,1119-1142 (MATADOR trial, SCI-level citation).
DEFECT: none.
```

---

## NUTRITION DOMAIN — N-MAINT (effective-maintenance authority, Campaign 19 = LAW)

```
RULE: N-MAINT-01
LOCK: MUST resolve status: no/invalid memo -> FORMULA (formula prior
      only); valid memo with algorithmVersion mismatch OR
      formulaContextSignature changed -> REVALIDATING; materialWeightChange
      (>=5% BW, MATERIAL_BODYWEIGHT_CHANGE_FRACTION=0.05) -> REVALIDATING;
      goalPhase changed -> REVALIDATING; evidenceSignature changed ->
      REVALIDATING; stale (asOf older than
      EFFECTIVE_MAINTENANCE_STALE_DAYS=14 days) -> HELD; else -> CURRENT
      (source=athlete_history). History (validated learned residual) is
      senior to raw formula ONLY while CURRENT; any REVALIDATING/HELD/
      INVALID state falls back toward the formula prior + last-known
      residual rather than trusting stale learning.
MUST_NOT: a REVALIDATING/HELD/INVALID memo must never be trusted as
      CURRENT authority — this is the fail-closed contract N-MAINT-02
      enforces underneath.
BOUNDARIES: material weight change threshold=5% BW; staleness=14 days.
SOURCE: LAW — docs/CAMPAIGN-19-EFFECTIVE-MAINTENANCE-DESIGN.md (resolution
      precedence, founder-approved: "No open founder decision remains" per
      the design doc's closing section); ARCH —
      src/lib/effectiveMaintenance.js resolveEffectiveMaintenance()
      :219-319.
DEFECT: none (this design doc itself documents and fixes a prior defect:
      the formula-anchored loop that never updated — see doc §1 CURRENT
      DEFECT — confirmed resolved by the resolver implementing this rule).
```

```
RULE: N-MAINT-02
LOCK: MUST hard-require foodDaysLogged>=5, weightPoints>=14, all numeric
      fields integer & finite, prior+residual===effective exactly, AND
      versionKey matches a fresh recompute before a stored memo is
      considered valid. An invalid memo can NEVER become authority — falls
      to formula-only base (N-MAINT-01's FORMULA branch). Senior gate: n/a
      above it.
MUST_NOT: no stored memo may be trusted without passing every one of these
      checks — "Fail closed before any stored residual is allowed to
      become authority" (module comment, fail-closed by construction).
BOUNDARIES: foodDaysLogged>=5; weightPoints>=14; prior+residual===effective
      (exact); versionKey must match a fresh recompute.
SOURCE: LAW — CAMPAIGN-19-EFFECTIVE-MAINTENANCE-DESIGN.md; ARCH —
      src/lib/effectiveMaintenance.js isValidEffectiveMaintenanceMemo()
      :171-201.
DEFECT: none.
```

```
RULE: N-MAINT-03
LOCK: MUST require foodDaysLogged>=5; canonicalWeightEvidence(weights)
      length>=14 AND weightEvidenceFresh===true; evidence signature not
      already consumed; confounded=false; adaptiveObservation.confidence
      ==='high' (N-ADAPTIVE-03's weeks>=4 bar). During REVALIDATING with a
      context/algorithm-version marker, MUST additionally require >=14
      distinct fresh-weight-days AFTER the marker timestamp. MUST use
      adjustedTDEE (the OBSERVATIONAL value), NEVER the safety-clamped
      adjustmentKcal — "Safety can still veto a target change elsewhere;
      it must not rewrite this observational result".
MUST_NOT: must never derive a new residual from the safety-clamped value —
      only the raw observational adjustedTDEE feeds learning, keeping
      safety vetoes (N-COACH-08/11) and observational truth structurally
      separate.
BOUNDARIES: foodDaysLogged>=5; weight evidence>=14 distinct fresh days;
      confidence must be exactly 'high'; RESIDUAL_REVALIDATION_FRACTION=
      0.20 (flags, does not block).
SOURCE: LAW — CAMPAIGN-19-EFFECTIVE-MAINTENANCE-DESIGN.md; ARCH —
      src/lib/effectiveMaintenance.js deriveEffectiveMaintenanceMemo()
      :327-406.
DEFECT: none.
```

```
RULE: N-MAINT-04
LOCK: MUST force outcome=CONFOUNDED, because:'user_changed_it_themselves'
      whenever record.appliedValue (the coach's last-applied kcal)
      mismatches after.nutrition.targetKcal (the current stored target) —
      the mismatch IS the detection mechanism (no dedicated flag exists).
      Senior: the user's manual edit outranks doseEscalation (N-COACH-06),
      which explicitly will not fire off a CONFOUNDED outcome.
MUST_NOT: the app must never claim credit or blame for a week the user
      overrode themselves; doseEscalation must not treat a CONFOUNDED week
      as evidence.
BOUNDARIES: any numeric mismatch between last-applied and current stored
      target counts as an override (no tolerance band specified in the
      graph).
SOURCE: ARCH — src/lib/coachIntervention.js classifyOutcome():261-267;
      LAW — mirrors N-VOL-01's structurally-identical calorie-domain check.
DEFECT: none.
```

```
RULE: N-MAINT-05
LOCK: MUST apply the effective-maintenance residual EXACTLY ONCE per call,
      supplied ONLY by the Campaign 19 canonical resolver (N-MAINT-01) —
      "cumulative history, not the latest weekly adjustment". maintenanceKcal
      = max(1, formulaMaintenanceKcal + effectiveResidual).
MUST_NOT: must never double-apply the same learned residual across
      repeated calls; legacy callers that omit _effectiveResidual must not
      silently substitute a different value.
BOUNDARIES: floor = max(1, ...) against non-positive results; residual
      applied exactly once.
SOURCE: LAW — CAMPAIGN-19-EFFECTIVE-MAINTENANCE-DESIGN.md (single-
      application law, Campaign 19 comment :912-914); ARCH —
      src/lib/nutritionEngine.js calculateNutritionTargets():949-951.
DEFECT: none.
```

---

## NUTRITION DOMAIN — N-COACH (weekly coach, runWeeklyCoach)

```
RULE: N-COACH-01
LOCK: (see T-WEEKLY-01 for the identical mechanism traced from the
      training side.) MUST return confidence.level='data_hold' below the
      minimum weigh-in count, early-returning with hasEnoughData:false and
      NO adjustments computed. Senior to every calorie/volume decision
      below — nothing computes without this gate passing.
MUST_NOT: no calorie decision (N-COACH-02 through N-COACH-EXCEEDED) may
      compute while this gate is unresolved to a non-hold state.
BOUNDARIES: see T-WEEKLY-01 (identical function, weekly coach's own gate).
SOURCE: FOUNDER — D97-22 (clock-anchoring, per T-WEEKLY-01); ARCH —
      src/lib/weeklyCoach.js assessDataConfidence():186-227,788-888.
DEFECT: none.
```

```
RULE: N-COACH-02
LOCK: MUST early-return via _buildAdherenceOutput (no calorie/volume
      adjustment this week) when sessionAdherence=completed/planned < 0.5
      (50%). Unknown denominator (sessionsPlanned<=0) MUST route to 0
      (stabilise), NEVER to 1 (perfect) — "the Andy Morgan rule".
MUST_NOT: an unknown/zero planned-session count must never be read as
      perfect adherence — it must route to the MORE conservative
      (stabilise) branch.
BOUNDARIES: sessionAdherence < 0.5 fires the hold; sessionsPlanned<=0
      routes to 0, not 1.
SOURCE: FOUNDER — Campaign 1 P0-7 D5 (per graph citation); ARCH —
      src/lib/weeklyCoach.js runWeeklyCoach():1142-1149. Senior:
      N-COACH-01.
DEFECT: none.
```

```
RULE: N-COACH-03
LOCK: MUST gate ANY calorie change on: !cycleOverride AND !scoffPositive
      AND currentCalTarget set AND (calsAdherence!=='untracked' OR
      foodDiaryStandsIn) AND (rapidLossOverride OR
      (consecutiveOffTargetWeeks>=offTargetWeeksRequired AND
      lastCalAdjustmentWeeksAgo>=2)). offTargetWeeksRequired=2 at
      confidence 'high' (N-COACH-01), else 3. The 2-week cooldown applies
      to non-rapid-loss changes only. foodDiaryStandsIn requires
      recentIntakeDaysLogged>=5 AND recentIntakeAvgKcal>0 AND
      checkinRecentEnough (completed check-in within 14 days) — a real
      food diary unfreezes recalibration even on a skipped check-in, but
      only while wellbeing capture has not gone dark >=14 days.
MUST_NOT: rapidLossOverride (N-COACH-08) bypasses ONLY the off-target-
      weeks and cooldown legs — it does NOT bypass the cycleOverride/
      scoffPositive/currentCalTarget/adherence legs, which remain
      mandatory even on a protective correction.
BOUNDARIES: offTargetWeeksRequired=2(high)/3(else); cooldown=2 weeks
      (non-rapid-loss only); foodDiaryStandsIn: >=5 days logged, avg>0,
      check-in within 14 days.
SOURCE: FOUNDER — B1 (founder 2026-07-02, foodDiaryStandsIn, per graph
      citation); ARCH — src/lib/weeklyCoach.js canAdjustCals:1377-1389.
DEFECT: none.
```

```
RULE: N-COACH-04
LOCK: MUST size fixed steps: cut+losing-too-slowly -150 (calsAdherence
      'hit') else -100; cut+losing-too-fast +125; bulk+gaining-too-slowly
      +150; bulk+gaining-too-fast -125. Superseded by adaptive resize
      (N-COACH-05) when confident AND same-direction; superseded entirely
      by rapid-loss sizing (N-COACH-08) when active.
MUST_NOT: n/a for this branch alone (a peer, not a suppressor, of
      N-COACH-05); must never apply when N-COACH-03's eligibility gate is
      unmet.
BOUNDARIES: -150/-100/+125/+150/-125 kcal exactly as listed by
      direction/adherence.
SOURCE: ARCH — src/lib/weeklyCoach.js runWeeklyCoach():1472-1502. Senior:
      N-COACH-03 (gate), N-COACH-08 (rapid loss overrides sizing
      entirely).
DEFECT: none.
```

```
RULE: N-COACH-05
LOCK: MUST overwrite `change` to adaptiveCal.adjustmentKcal ONLY when
      useAdaptiveCal (confidence==='high') AND !rapidLossOverride AND
      change!==0 AND adaptiveCal.adjustmentKcal!==0 AND
      sign(adaptiveCal.adjustmentKcal)===sign(change) — NEVER reverses
      direction, only resizes.
MUST_NOT: must never flip the sign of the fixed-step change; must never
      apply on the rapidLossOverride path (N-COACH-08 exempt outright).
BOUNDARIES: same-sign requirement is absolute; N-COACH-08 (rapid loss)
      exempt.
SOURCE: ARCH — src/lib/weeklyCoach.js runWeeklyCoach():1510-1519. Senior:
      N-COACH-08.
DEFECT: none.
```

```
RULE: N-COACH-06
LOCK: MUST multiply change by DOSE_ESCALATION_MULTIPLIER=1.5 only when
      ALL hold: a prior same-domain CALORIE_TARGET intervention exists,
      same goalPhase, same direction, its observation window COMPLETED
      (>=2 weeks, OBSERVE.calorie_target.min=2), classified outcome
      EXACTLY UNCHANGED (never CONFOUNDED, never IMPROVED), AND current
      evidence itself reliable (weight.trend and nutrition.coverage both
      known/GOOD). Applied AFTER fixed-step/adaptive sizing
      (N-COACH-04/05), BEFORE the ±5% cap (N-COACH-07) — so the learned
      step is still bounded by the same ceiling as an unlearned one.
MUST_NOT: never applied on the rapidLossOverride path; the ±5% cap
      (N-COACH-07) remains senior/downstream and still applies to the
      escalated value.
BOUNDARIES: DOSE_ESCALATION_MULTIPLIER=1.5; observation window=2 weeks.
SOURCE: FOUNDER — Campaign 18 job A2 (per graph citation); ARCH —
      src/lib/coachIntervention.js doseEscalation():439-472. Senior:
      N-COACH-07, N-COACH-08.
DEFECT: none.
```

```
RULE: N-COACH-07
LOCK: MUST clamp any calorie change to
      sign(change)*min(abs(change), round(currentCalTarget*0.05)) — 5% of
      the current target. Senior to fixed-step, adaptive resize AND dose
      escalation; the rapid-loss compression's own +300 absolute cap
      (N-COACH-08) can ONLY be tightened further by this rule, never
      relaxed.
MUST_NOT: no upstream sizing rule (N-COACH-04/05/06/08) may produce a
      final change exceeding 5% of the current target — this is the final
      clamp before calorieAdjustment is built.
BOUNDARIES: 5% of currentCalTarget, rounded.
SOURCE: ARCH — src/lib/weeklyCoach.js runWeeklyCoach():1546-1552.
DEFECT: none.
```

```
RULE: N-COACH-08
LOCK: MUST force calorieAdjustment upward (never negative) when
      phase.isCut AND !cycleOverride AND actualRatePct<=-1.5 (%BW/week)
      AND energyScore<=2. Magnitude: base 125 + 150 per additional 1.0% of
      weekly loss past -1.5%, capped at 300. MUST bypass the 2-week
      cooldown AND consecutiveOffTargetWeeks gate. SENIOR to: 2-week
      cooldown, consecutiveOffTargetWeeks gate, anti-oscillation
      (N-COACH-15), dose escalation (exempt outright), decline memory
      (U-AUTH-02, exempt outright), coordination gate's safety carve-out
      (N-COACH-17).
MUST_NOT: JUNIOR to: FFM floor is structurally moot here (override is
      upward-only, floor only blocks negative changes); ED-pattern lockout
      (X-SAFETY-04) still nulls a change only if calorieAdjustment.change<0
      — structurally impossible on this path, so in practice the ED
      lockout cannot undo this override. Never fires for bulk/maintain
      phases or cycle-flagged weeks.
BOUNDARIES: actualRatePct<=-1.5 (%BW/week, `<=` exactly, matching
      X-SAFETY-01/X-SAFETY-02(s1) at the identical boundary); energyScore<=2;
      magnitude 125 base + 150/1% past -1.5%, capped at 300.
SOURCE: FOUNDER — CLAUDE.md Section 2 (rapid-loss gate, ED-safety
      escalation territory); F3/EN-9 alignment (per graph citation, all
      three rapid-loss checks aligned to the identical `<=` boundary);
      ARCH — src/lib/weeklyCoach.js runWeeklyCoach() :1275-1280,1476-1485.
DEFECT: none.
```

```
RULE: N-COACH-09
LOCK: MUST null calorieAdjustment and set targetNotTestedHeld=true when
      the weight-trend miss direction matches the intake shortfall
      direction (missExplains) — a bulker eating UNDER target who is not
      gaining has not disproved the target. A bulker eating AT/OVER target
      who is not gaining is NOT held — that IS a real PLAN finding.
MUST_NOT: exempt for rapidLossOverride (protective increases never wait
      for good-adherence evidence, N-COACH-08 senior); the FFM floor,
      calorie floors and ED lockout still apply below/after this and
      remain senior.
BOUNDARIES: missExplains = weight-trend-miss direction matches intake-
      shortfall direction (no numeric threshold beyond that logical match).
SOURCE: FOUNDER — Campaign 18 job 4B (per graph citation); ARCH —
      src/lib/coachPrecedence.js classifyNutritionLimiter():117-159,
      applied weeklyCoach.js:1607-1615.
DEFECT: none.
```

```
RULE: N-COACH-10
LOCK: MUST null a proposed calorieAdjustment when the same recommendation
      (direction matches a prior decline) is offered again on materially
      UNCHANGED evidence. MATERIAL_RATE_SHIFT_PCT=0.15 (rate must move
      >=0.15%/week to count as changed evidence); ANY GOOD->POOR signal
      deterioration, any UNKNOWN->known transition, or a goalPhase change
      is automatically material (re-offers the recommendation).
MUST_NOT: exempt for rapidLossOverride — "SAFETY IS NOT A RECOMMENDATION";
      sits ABOVE the FFM floor/ED lockout gates positionally but does not
      affect them either way (this only ever nulls what was already
      proposed, never overrides a safety hold).
BOUNDARIES: MATERIAL_RATE_SHIFT_PCT=0.15%/week; direction must match the
      prior decline exactly.
SOURCE: FOUNDER — "SAFETY IS NOT A RECOMMENDATION" (module header, per
      graph citation) — treated FOUNDER given the phrase's Section-2-
      adjacent framing; ARCH — src/lib/coachDecline.js
      suppressedByDecline()/materialEvidenceChange():113-164.
DEFECT: none. (This IS the U-AUTH "explicit rejection of suggestions"
      mechanism, cross-referenced as U-AUTH-02.)
```

```
RULE: N-COACH-11
LOCK: MUST null calorieAdjustment, set ffmFloorHeld=true, when
      recentIntakeDaysLogged>=5 AND finite recentIntakeAvgKcal AND
      recentIntakeAvgKcal<=computeFFMFloor's floorKcal (N-ADAPTIVE-05, 30
      kcal/kg FFM) AND calorieAdjustment.change<0 (increases never
      blocked). Senior to decline memory (N-COACH-10), oscillation hold
      (N-COACH-15), dose escalation (N-COACH-06) — runs AFTER them in the
      pipeline and can still null what survived. Ranked SECOND among held
      decisions, below ED-pattern lockout (X-SAFETY-04), above generic
      holds (N-COACH-13) — "supersedes the other calorie-hold reasons".
MUST_NOT: this floor must NEVER be removed, raised as a threshold, or made
      conditional — Section 2 INVIOLABLE; applies AFTER rapidLossOverride
      sizing, but is structurally moot there since rapidLossOverride only
      produces upward changes.
BOUNDARIES: recentIntakeDaysLogged>=5; threshold=floorKcal (30 kcal/kg
      FFM); fires only on calorieAdjustment.change<0.
SOURCE: FOUNDER — CLAUDE.md Section 2 (FFM energy floor, INVIOLABLE); ARCH
      — src/lib/weeklyCoach.js runWeeklyCoach():1667-1717.
DEFECT: none.
```

```
RULE: N-COACH-12
LOCK: MUST null calorieAdjustment (only if change<0) and set
      intakeReadHeld=true whenever intakeReadFailed===true AND a cut was
      about to be proposed. Upward/neutral changes pass unaffected — same
      "most-protective" shape as the FFM floor: a failed read cannot let a
      cut proceed floor-blind.
MUST_NOT: a failed intake read must never be treated as "no evidence, so
      proceed" for a downward change — fail-closed for cuts specifically.
BOUNDARIES: fires only on intakeReadFailed===true AND a proposed cut
      (change<0).
SOURCE: FOUNDER — Campaign 1 P0-7 D1 (per graph citation, fail-closed on
      read failure); ARCH — src/lib/weeklyCoach.js
      runWeeklyCoach():1719-1726.
DEFECT: none.
```

```
RULE: N-COACH-13
LOCK: MUST push a generic {type:'calories'} held-decision reason in
      precedence order: wellbeing-screen restriction > cycle flag >
      on-target > <2-week cooldown remaining > off-target-weeks not yet
      met > untracked food (five string reasons, precedence-ordered
      if/else).
MUST_NOT: explicitly gated OFF (F3/EN-10) when ffmFloorHeld
      (N-COACH-11) or edPatternHeld (X-SAFETY-04) are true — "never stack
      a generic reason under the ED lockout" so the safety message is
      never diluted by a lesser reason appearing alongside it.
BOUNDARIES: five-reason precedence chain as listed; suppressed entirely
      under N-COACH-11 or X-SAFETY-04.
SOURCE: FOUNDER — F3/EN-10 (per graph citation, "never stack a generic
      reason under the ED lockout"); ARCH — src/lib/weeklyCoach.js
      runWeeklyCoach():2051-2066.
DEFECT: none.
```

```
RULE: N-COACH-14
LOCK: MUST OR the nine booleans (deloadSuggested, matrixDeload,
      poorRecovery, safetyHold, ffmFloorHeld, edPatternHeld,
      rapidWeightLossFlag, scoffPositive, calmMode) into autoApplyHoldActive;
      MUST force confirm-first regardless of coachAutonomy mode — "a more
      autonomous mode changes WHO confirms, never whether the apply path's
      clamps run".
MUST_NOT: no autonomy setting may bypass this composite; this composes
      the senior safety flags, it does not add a new one of its own.
BOUNDARIES: OR of exactly the nine named booleans.
SOURCE: FOUNDER — pass3-v2-founder-decisions.md:166, NA-coaching-10:186-187,
      founder ruling 2026-07-10 ("Coached never auto-applies while a
      safety hold / ED-flag / suppression is active"); ARCH —
      src/lib/weeklyCoach.js runWeeklyCoach() autoApplyHoldActive
      :2068-2095.
DEFECT: none. (Same mechanism as T-WEEKLY-04 — the training and nutrition
      sides share this composite.)
```

```
RULE: N-COACH-15
LOCK: MUST null calorieAdjustment when it would REVERSE a same-domain,
      same-goalPhase intervention still inside its own observation window
      (OBSERVE.calorie_target.min=2 weeks, the same constant N-COACH-06
      uses). Only a direction REVERSAL is blocked — continuing the same
      direction is governed by the ordinary cooldown/gate (N-COACH-03)
      instead.
MUST_NOT: exempt for rapidLossOverride — "protecting an athlete losing
      weight too fast must never wait for a previous decision to finish
      being judged" (N-COACH-08 senior).
BOUNDARIES: observation window=2 weeks; only a sign-reversal triggers this
      rule, a same-direction continuation does not.
SOURCE: FOUNDER — "founder rule F" (per graph citation, shared primitive
      with N-VOL-02's training-side mirror); ARCH —
      src/lib/coachIntervention.js wouldReverseRecent()/
      recentUnjudgedIntervention():381-406, applied weeklyCoach.js
      :1659-1665.
DEFECT: none.
```

```
RULE: N-COACH-16
LOCK: Cross-reference stub — merged into N-COACH-06 (same DOSE_ESCALATION_
      MULTIPLIER=1.5 mechanism) to avoid a duplicate record. Kept as a
      named entry because the mission brief distinguishes dose escalation
      (Founder rule A2) from anti-oscillation (Founder rule F, N-COACH-15)
      as two separate founder rules even though they share code.
MUST_NOT: n/a — see N-COACH-06 for the enforceable contract.
BOUNDARIES: see N-COACH-06.
SOURCE: (see N-COACH-06).
DEFECT: none.
```

```
RULE: N-COACH-17
LOCK: MUST hold a non-safety calorie change when nutrition
      limiter===EXECUTION (R1, target not eaten). MUST hold a volume
      INCREASE (not a reduction) when training limiter===EXECUTION
      (sessions missed) or ===RECOVERY (R2). When BOTH survive R1/R2 and
      are non-restraint, MUST withhold whichever domain's
      limiter===INSUFFICIENT_EVIDENCE (R3, never both withheld, never the
      PLAN-classified one withheld). "Option 2 architecture": domain
      engines (nutritionEngine floors, weeklyCoach autoregulation) stay
      authoritative; this only withholds from what already survived them.
MUST_NOT: "SAFETY IS SENIOR TO PRECEDENCE" — rapidLossOverride-marked
      calorie changes (N-COACH-08) and ANY volume reduction are NEVER
      withheld by this gate.
BOUNDARIES: no new numeric threshold; reuses N-COACH-18's limiter states.
SOURCE: ARCH — src/lib/coachPrecedence.js coordinateChanges():380-427,
      applied weeklyCoach.js:1742-1765. (Identical mechanism to
      T-WEEKLY-08, cross-domain instance — X-SAFETY-04 cross-reference.)
DEFECT: none.
```

```
RULE: N-COACH-18
LOCK: MUST classify nutrition limiter: unknown trend -> INSUFFICIENT_
      EVIDENCE; on-target -> PLAN(fine); off-target+unknown intake ->
      INSUFFICIENT_EVIDENCE; off-target+poor intake in the direction that
      explains the miss -> EXECUTION; off-target+eaten-at/over-target ->
      PLAN (real finding). MUST classify training limiter: unknown/poor
      execution -> EXECUTION; poor recovery -> RECOVERY; unknown progress
      -> INSUFFICIENT_EVIDENCE; poor progress on a run+recovered
      programme -> PLAN. This is the shared vocabulary every downstream
      gate (N-COACH-09, N-COACH-17, T-WEEKLY-08) reads.
MUST_NOT: "Nutrition appears NOWHERE in classifyTrainingLimiter,
      deliberately" — training must be judged independent of food logging
      (job 14 founder law: never punish for not using the diary).
BOUNDARIES: four-state taxonomy (PLAN/EXECUTION/RECOVERY/
      INSUFFICIENT_EVIDENCE) per the exact branch conditions listed.
SOURCE: FOUNDER — job 14 founder law ("never punish for not using the
      diary", per graph citation); ARCH —
      src/lib/coachPrecedence.js classifyNutritionLimiter()/
      classifyTrainingLimiter():117-210.
DEFECT: none.
```

---

## NUTRITION DOMAIN — N-VOL (training-volume outcome memory, nutrition-adjacent)

```
RULE: N-VOL-01
LOCK: MUST force outcome=CONFOUNDED, because:'user_changed_it_themselves'
      whenever after.intent.manualVolumeMuscles is non-empty on a
      VOLUME_START record's judgement. Unlike calories (N-MAINT-04), this
      IS a stored, dedicated flag (effectiveLandmarks.getManualLandmarks).
MUST_NOT: manualVolumeMuscles must never be ignored when present — a
      user-set manual muscle volume must always confound the outcome
      judgement for that muscle.
BOUNDARIES: any non-empty manualVolumeMuscles list triggers CONFOUNDED.
SOURCE: ARCH — src/lib/coachIntervention.js classifyOutcome():278-281;
      mirrors N-MAINT-04 exactly.
DEFECT: none.
```

```
RULE: N-VOL-02
LOCK: MUST set holdIncrease=true, blockEscalation=true when the last
      VOLUME_START record is still inside its OBSERVE window (>=2 weeks)
      AND pointed DOWN (oscillation); MUST set both true when the window
      is met AND classified WORSENED with last.direction>0 (harm). MUST
      set holdIncrease=false, blockEscalation=true when the window is met
      AND classified UNCHANGED with last.direction>0 (no-response: the
      discretionary step is refused but an evidence-backed increase is
      still allowed).
MUST_NOT: can only WITHHOLD, never create/enlarge/reverse; a volume
      REDUCTION is NEVER touched by this at all — "easing an athlete who
      is not recovering must never wait".
BOUNDARIES: OBSERVE.volume_start.min=2 weeks; three named
      outcome->holdIncrease/blockEscalation mappings as listed.
SOURCE: FOUNDER — founder rule F (anti-oscillation, per graph citation,
      shared primitive with N-COACH-15); ARCH —
      src/lib/coachIntervention.js volumeDecisionMemory():515-556, applied
      weeklyCoach.js:1365-1374,2135-2145.
DEFECT: none.
```

```
RULE: N-COACH-EXCEEDED
LOCK: (see T-WEEKLY-05 for the training-side identical mechanism.) MUST
      allow volumeSignal+=1 (capped at MATRIX_PUSH_CEILING=3) only when
      consecutiveExceededWeeks>=3 (EXCEEDED_ESCALATION_WEEKS) AND this
      week's autoregulation already reads 'push'.
MUST_NOT: gated OFF ENTIRELY by ANY of: deloadSuggested, matrixDeload,
      poorRecovery, safetyHold, ffmFloorHeld (N-COACH-11), edPatternHeld
      (X-SAFETY-04), rapidWeightLossFlag (X-SAFETY-01), scoffPositive,
      calmMode (X-SAFETY-05), volumeMemory.blockEscalation (N-VOL-02),
      coordinationVolumeHeld (N-COACH-17) — "weaker signal always wins
      while ANY safety hold is open"; never bypasses N-VOL-03's [mev,mrv]
      downstream clamp.
BOUNDARIES: EXCEEDED_ESCALATION_WEEKS=3; MATRIX_PUSH_CEILING=3.
SOURCE: FOUNDER — DECISIONS-2026-07-09.md D15; ARCH —
      src/lib/weeklyCoach.js runWeeklyCoach():2097-2145.
DEFECT: none.
```

```
RULE: N-VOL-03
LOCK: MUST clamp per-muscle plannedSets to [mev,
      mrv-or-mav-or-ABSOLUTE_WEEKLY_SET_CEILING(30)] at Apply time. The
      30-set backstop fires only when a row has neither mrv nor mav
      (prevents +Infinity uncapped progression). Senior to every volume
      proposal above — the final write-time clamp, independent of how the
      delta was decided.
MUST_NOT: no volume proposal (T-WEEKLY-03, T-WEEKLY-05, N-COACH-EXCEEDED)
      may bypass this clamp at Apply time under any circumstance.
BOUNDARIES: ABSOLUTE_WEEKLY_SET_CEILING=30 (last-resort, missing mrv AND
      mav only).
SOURCE: ARCH — src/lib/coachApply.js computeVolumeApply():269-293,
      ABSOLUTE_WEEKLY_SET_CEILING:50. (Identical mechanism to T-VOLUME-06.)
DEFECT: none.
```

---

## NUTRITION DOMAIN — N-BANK (calorie bank, sole per-day exception)

```
RULE: N-BANK-01
LOCK: MUST leave the stored target UNCHANGED unless bankedDelta!=0 — this
      IS the null-hypothesis rule: no training-day/rest-day cycling, no
      scheduled refeed, no weekday-specific targets exist in production.
      Display-only: "The engine's stored target is untouched either way,
      so the coach, the rapid-loss gate and the ED-pattern detector always
      see the real target."
MUST_NOT: no per-day cycling mechanism may exist outside the calorie bank
      — carb-cycle and refeed carve-outs were REMOVED (coachApply.js
      :111-118), confirmed dead-by-design, and must never be reintroduced
      silently; ordinary days MUST show identical targets.
BOUNDARIES: no threshold — the null rule itself; calorie bank is the ONLY
      exception.
SOURCE: FOUNDER — LAW — Campaign 21 brief permanent-law list ("ordinary
      calories identical every ordinary day, Calorie Bank sole exception");
      Campaign 17A structural law (per graph citation); ARCH —
      src/lib/food/effectiveTargets.js resolveEffectiveTargets():36-40.
DEFECT: none. HARD LAW confirmed live in code exactly as specified.
```

```
RULE: N-BANK-02
LOCK: MUST refuse outright if ANY day (including the big day) is already
      <floorKcal — "Banking may never legitimise an already-unsafe week".
      bump = floor(min(requested, maxBankDelta, roomUp, maxSpread)) where
      roomUp=bandMax-bigDayBase and maxSpread=min(otherDay-floor)*n. Below
      MIN_BANK_DELTA_KCAL=50, refuse as "presentation noise". deltaSum
      always 0 on success (pure redistribution, weekly total invariant).
MUST_NOT: must never produce a plan where any day (including the boosted
      day) sits below floorKcal; must never exceed MAX_BANK_DELTA_KCAL=500
      per day.
BOUNDARIES: MIN_BANK_DELTA_KCAL=50; MAX_BANK_DELTA_KCAL=500 (founder-
      confirmed 2026-06-16 hard ceiling); floor refusal is absolute.
SOURCE: FOUNDER — founder-confirmed 2026-06-16 hard ceiling (per graph
      citation); N-BANK-05/N-TARGETS-05 (floor) senior; ARCH —
      src/lib/food/calorieBank.js planCalorieBank():53-100.
DEFECT: none.
```

```
RULE: N-BANK-03
LOCK: MUST route the delta through applyMacroDeltaToPlan — carbs-first
      lever, protein/fat held, double floor-clamp. MUST only edit days
      that already have a non-zero banked delta from N-BANK-02. The
      engine's stored target row is untouched — only plan-day rows and the
      display target are edited.
MUST_NOT: days with zero banked delta must be left untouched; must never
      touch protein or fat to redistribute banked kcal — carbs is the sole
      lever.
BOUNDARIES: carbs-first, protein/fat protected, double floor-clamp per
      module comment.
SOURCE: ARCH — src/lib/food/calorieBank.js bankedPlanDayEdits():207-221,
      applyBankToTarget():228-240. Junior to N-BANK-02's maths.
DEFECT: none.
```

```
RULE: N-BANK-04
LOCK: MUST disable the "Plan a bigger day" control AND zero the displayed
      delta (even if a bank row is still persisted) when the target was
      floored/compressed (any of N-TARGETS-05/06 fired) OR an ED-pattern
      flag is currently open. Senior to N-BANK-02/03 — "stops a stale bank
      from applying after... the target gets floored, or an ED-pattern
      flag opens".
MUST_NOT: a stale persisted bank row must never be displayed or applied
      once ineligibility fires — carb-cycle/refeed carve-outs were removed
      under the one-daily-truth law (N-BANK-01), leaving this as the
      ONLY carve-out gate in the module.
BOUNDARIES: disabled when targetWasFloored(targets) OR edFlagOpen (binary
      gate, no numeric threshold of its own).
SOURCE: FOUNDER — CLAUDE.md Section 2 (calorie floors, ED-pattern
      lockout, both INVIOLABLE); ARCH —
      src/screens/DiaryScreen.js bankingAvailable:364, food/calorieBank.js
      displayBankedDelta():183-185, food/mealPlanAssembler.js
      targetWasFloored():54.
DEFECT: none.
```

```
RULE: N-BANK-05
LOCK: MUST compute floorKcal = max(sexFloor, ffmFloorKcal-if-higher) by
      delegating to nutritionEngine.kcalFloorForSex (N-TARGETS-05) — no
      independent restatement.
MUST_NOT: must never fall back to a lower floor for unknown sex (the
      pre-Campaign-1 drift this closed: this module used to fall back to
      1200 for unknown sex instead of 1500).
BOUNDARIES: floorKcal = max(sexFloor(N-TARGETS-05), ffmFloorKcal).
SOURCE: FOUNDER — CLAUDE.md Section 2 (calorie floors, INVIOLABLE); ARCH —
      src/lib/food/calorieBank.js safeDayFloorKcal()/sexFloorKcal()
      :161-175.
DEFECT: none (pre-Campaign-1 1200-fallback drift is documented FIXED, not
      live).
```

---

## NUTRITION DOMAIN — N-ADHERENCE (logging-quality evidence gates)

```
RULE: N-ADHERENCE-01
LOCK: MUST classify a per-macro "hit" boolean using tolerance bands: kcal
      10%, protein 10%, carbs 15%, fat 15%. Display/insights ONLY — NOT
      the signal weeklyCoach's calorie-decision gating uses.
MUST_NOT: this classifier must never be treated as a calorie-decision
      input — the actual coach-facing adherence gate is the binary "≥5
      logged days" bar (N-COACH-03/N-COACH-11/N-MAINT-03) plus the
      check-in-derived calsAdherence under/hit/over/untracked chip. No
      "complete/partial/poor day" three-tier gate exists as a production
      calorie-decision input despite the mission brief's naming.
BOUNDARIES: kcal 10%, protein 10%, carbs 15%, fat 15% tolerance bands.
SOURCE: ARCH — src/lib/food/adherence.js ADHERENCE_TOLERANCE:12-16.
DEFECT: SUSPECTED-CONTRADICTION (naming, not behaviour — carried per
      instructions): the mission brief's "complete/partial/poor days"
      three-tier logging-quality gate does not exist as a named production
      concept feeding calorie decisions; the nearest thing
      (ADHERENCE_TOLERANCE) is Food-Insights display-only. Flagged for
      Step 9 in case a downstream campaign document assumed the
      three-tier gate exists in code — no code change implied.
```

---

## SAFETY DOMAIN — X-SAFETY (ED-pattern, wellbeing, consent, notification suppression — all FOUNDER, Section 2 INVIOLABLE unless noted)

```
RULE: X-SAFETY-01
LOCK: MUST set rapidWeightLossFlag=true when actualRatePct<=-1.5 (%BW/week,
      `<=` not `<`) AND energyScore<=2 AND !cycleOverride. Feeds
      N-COACH-14/T-WEEKLY-04's autoApplyHoldActive composite; deliberately
      aligned (F3/EN-9) with N-COACH-08's rapidLossOverride and
      X-SAFETY-02's isRapidLoss(s1) to fire at the IDENTICAL boundary.
MUST_NOT: must never disagree with N-COACH-08/X-SAFETY-02's rapid-loss
      boundary — the `<=` alignment across all three is deliberate and
      must never drift.
BOUNDARIES: actualRatePct<=-1.5 (inclusive); energyScore<=2 (inclusive);
      exempt for cycle-flagged weeks.
SOURCE: FOUNDER — CLAUDE.md Section 2 (rapid-loss gate, INVIOLABLE); F3/
      EN-9 (per graph citation, cross-rule boundary alignment); ARCH —
      src/lib/weeklyCoach.js runWeeklyCoach() rapidWeightLossFlag
      :1818-1828.
DEFECT: none.
```

```
RULE: X-SAFETY-02
LOCK: MUST fire (fired=true) at signalsFired>=2 normally, >=3 when
      goalLockAdvanced===true. Signal s1 rapid_loss: weightTrendPctPerWeek
      <=-1.5%. s2 low_energy: energy<=2 for >=2 (LOW_ENERGY_MIN_WEEKS) of
      the last 2 weeks. s3 sustained_under_adherence: adherence==='under'
      for >=2 (UNDER_ADHERENCE_MIN_WEEKS) of the last 3 weeks
      (UNDER_ADHERENCE_WINDOW=3). s4 weight_only_checkins: hasCheckin AND
      !hasFoodData for >=2 (WEIGHT_ONLY_MIN_WEEKS) of the last 3 weeks
      (WEIGHT_ONLY_WINDOW=3). Raises edPatternHeld (X-SAFETY-04), ranked
      FIRST among held decisions — "the strongest hold".
MUST_NOT: this is Section 2 INVIOLABLE — never touch. "The FFM energy
      floor is a separate guardrail... and is never affected by
      goal_lock_advanced" — the two safety systems are independent, not
      layered, and must never be merged or made conditional on each other.
BOUNDARIES: signalsFired>=2 (>=3 if goalLockAdvanced); s1<=-1.5%; s2
      energy<=2 for >=2/2 weeks; s3 'under' for >=2/3 weeks; s4 >=2/3
      weeks.
SOURCE: FOUNDER — CLAUDE.md Section 2 ("ED-safety system — do not
      touch"); ARCH — src/lib/edPatternDetector.js
      detectEdPatternFlag():56-74,111-137.
DEFECT: none.
```

```
RULE: X-SAFETY-03
LOCK: MUST require ALL of: 2 most-recent weeks with energy RECORDED
      (non-null) AND >2 (LOW_ENERGY_THRESHOLD); adherence !=='under' both
      weeks; hasFoodData===true both weeks; current weightTrendPctPerWeek
      non-null finite AND !isRapidLoss (>-1.5%) — before hasEdPatternCleared
      may return true. Clearance requires POSITIVE evidence, NEVER the
      mere ABSENCE of data.
MUST_NOT: "a protective hold must NOT lift just because an at-risk user
      stopped logging" — a null energy or null trend counts as NOT
      cleared, never as "presumably fine".
BOUNDARIES: 2 consecutive weeks, all five conditions simultaneously true;
      energy>2 threshold; trend>-1.5%.
SOURCE: FOUNDER — CLAUDE.md Section 2 (ED-safety, INVIOLABLE); audit
      2026-07-01 HIGH finding (per graph citation, fail-closed-to-absence
      fix); ARCH — src/lib/edPatternDetector.js
      hasEdPatternCleared():83-107.
DEFECT: none.
```

```
RULE: X-SAFETY-04
LOCK: MUST null any negative calorieAdjustment; MUST rank
      {type:'ed_pattern_lockout'} FIRST in heldDecisions; MUST feed
      autoApplyHoldActive (N-COACH-14/T-WEEKLY-04), N-COACH-EXCEEDED's
      gate, N-COACH-13's suppression, N-BANK-04's banking disable, and (via
      isPhotoSuppressed) the progress-photo comparison card. TOP of the
      held-decision stack; senior to FFM floor's display ranking — though
      the FFM floor gate itself (N-COACH-11) is an independent, equally
      INVIOLABLE gate that runs regardless (the ranking is a COPY
      decision, not a logic bypass — both gates fire on their own merits).
MUST_NOT: only downward calorie changes are nulled; upward changes pass
      unaffected — must never be weakened to also suppress protective
      upward corrections.
BOUNDARIES: same trigger as X-SAFETY-02.
SOURCE: FOUNDER — CLAUDE.md Section 2 (ED-safety, INVIOLABLE); ARCH —
      src/lib/weeklyCoach.js runWeeklyCoach() edPatternHeld:1931-1947.
DEFECT: none.
```

```
RULE: X-SAFETY-05
LOCK: MUST source calm mode from a single canonical store
      ('@volyume_wellbeing_mode' AsyncStorage key); isCalm()===
      (mode==='calm'). MUST be user-controlled with NO mandatory prompt
      (FQ-1(c) — corrected from a prior header claim that it did prompt).
      Calm mode gates ONLY training-side D15 escalation (T-WEEKLY-05,
      per weeklyCoach's own code comment: "Gates ONLY") plus the
      notification/photo-card suppressions (X-SAFETY-06/07/08 family) —
      it is NOT a general override of every coaching computation.
MUST_NOT: must never be weakened to a mandatory question; must never be
      silently expanded to gate a surface beyond the specifically
      enumerated ones (T-WEEKLY-05/N-COACH-EXCEEDED escalation,
      X-SAFETY-06/07/08 suppression); a cloud pull must never silently
      downgrade a local calm setting with a stale cloud copy (the calm
      ratchet).
BOUNDARIES: binary calm/normal/unspecified state; no numeric threshold.
SOURCE: FOUNDER — docs/first-use-audit-2026-08-10/D96-RULINGS.md FQ-1(c)
      ("no new first-run wellbeing screen; calm stays edited"); CLAUDE.md
      Section 2 ("Beat UK signposting and calm mode: never remove or
      gate"); ARCH — src/lib/wellbeing.js getWellbeingMode()/isCalm()
      :22-47.
DEFECT: none.
```

```
RULE: X-SAFETY-06
LOCK: MUST NEVER lay (or MUST cancel any already-laid) a weight/food-
      adjacent notification while an ED-pattern flag is open OR calm mode
      is active. MUST fail CLOSED: a transient DB read error on
      getOpenEdPatternFlag maps to the truthy 'read_failed' sentinel so
      the gate suppresses — a read error is treated as an OPEN flag, never
      as "no flag". A getWellbeingMode() throw also cancels (fail-closed
      on the calm read too). Repeated identically at 5 scheduler sites
      (win-back :893-933, :1031, :1151, food-push :1245, partner surface
      :1813).
MUST_NOT: this suppression must NEVER be weakened at any of the 5 sites;
      a read failure of EITHER the ED-flag check or the calm-mode check
      must never be treated as "assume no suppression needed".
BOUNDARIES: binary suppression, no numeric threshold; fail-closed on
      error for BOTH the ED-flag read and the wellbeing-mode read.
SOURCE: FOUNDER — CLAUDE.md Section 2 ("Weight/food-adjacent
      notifications suppress under an open ED flag; never weaken that
      suppression"); ARCH — src/lib/notifications/scheduler.js
      scheduleWinbackNotification():893-933 (representative of the 5-site
      pattern).
DEFECT: none.
```

```
RULE: X-SAFETY-07
LOCK: MUST downgrade (soften) the FOREGROUND presentation of a
      notification that DOES fire under an open ED/wellbeing flag, rather
      than a full alert. This is a JUNIOR variant of X-SAFETY-06 —
      softening PRESENTATION for categories that fire, distinct from
      categories suppressed outright.
MUST_NOT: X-SAFETY-06's outright suppression takes precedence for the
      categories it covers — this rule must never apply to a category
      X-SAFETY-06 already suppresses entirely.
BOUNDARIES: n/a — presentation-level rule, no numeric threshold found in
      this pass (single-line comment context, not a full function read).
SOURCE: FOUNDER — CLAUDE.md Section 2 (ED-safety notification
      suppression family); ARCH — src/lib/notifications/categories.js:127
      (comment-level trace only, per graph — Step 9 should re-verify with
      a full read before writing a scenario against exact thresholds).
DEFECT: none, but EVIDENCE GAP carried from the graph: full function body
      not read in Step 1's trace. Not a defect — a scope note for the
      scenario writer.
```

```
RULE: X-SAFETY-08
LOCK: MUST route to Article9ConsentStack and block the rest of the app
      whenever consentUnresolvedForNewUser (healthConsent==null &&
      !firstRunComplete) OR healthConsent===false, checked whenever
      healthConsentChecked is true. MUST fire a failsafe timer
      (healthConsentLatch) if the consent check "never resolved",
      routing to the gate treating it as consent NOT granted. MUST also
      gate cloud restore/pull — "consent NOT yet affirmative" blocks
      push/pull until resolved, re-enforced at the sync runner layer.
MUST_NOT: un-skippable, cannot be reordered; a transient consent-read
      failure must NEVER bypass the gate — fails CLOSED unconditionally;
      no path may reach authenticated app state with healthConsent!==true
      for a non-local, non-first-run-complete user.
BOUNDARIES: binary gate condition as stated; no numeric threshold other
      than the failsafe timer's own duration (not quoted in the graph).
SOURCE: FOUNDER — CLAUDE.md Section 2 ("GDPR / Article 9... un-skippable
      consent gate... must not be weakened, reordered, or made skippable...
      Consent flows fail CLOSED for new users"); ARCH —
      src/navigation/RootNavigator.js consent-gate block:1594-1757.
DEFECT: none.
```

```
RULE: X-SAFETY-09
LOCK: MUST keep every floor/gate/detector computation (nutritionEngine.js,
      weeklyCoach.js, edPatternDetector.js, coachApply.js) blind to tier —
      confirmed by ABSENCE: no tier/proGate reference found in any of
      these files' floor/gate/detector computation paths.
MUST_NOT: no guardrail (calorie floors, FFM floor, rapid-loss gate,
      ED-pattern detector, autoApplyHoldActive composite) may ever consult
      tier — a Pro-only surface may WRAP a guardrailed feature, but the
      guardrail computation itself must never branch on tier.
BOUNDARIES: n/a — structural absence-verified invariant, not a numeric
      rule.
SOURCE: FOUNDER — CLAUDE.md Section 2 / proGate.js mandate ("Guardrails
      are tier-blind... they never consult tier"); ARCH — grep-verified
      absence across the four named engine files (not exhaustively
      re-verified across every screen wrapper — recorded as a structural
      finding from this trace's file set, per the graph's own caveat).
DEFECT: none.
```

---

## USER-AUTHORITY DOMAIN — U-AUTH (declines, manual overrides, dismissals)

```
RULE: U-AUTH-01
LOCK: MUST record an appliedAdjustments entry ONLY on a deliberate Apply
      tap — "Volyume never scores a change it proposed and the user
      declined". RECORD_VERSION=1 gates malformed/legacy-shape entries out
      of scoring. This IS the confirm-then-apply law's data trail —
      "nothing changes until the user taps".
MUST_NOT: a proposed-but-not-tapped change must NEVER be scored as applied;
      declined suggestions (U-AUTH-02) must never leak into this map.
BOUNDARIES: RECORD_VERSION=1 (malformed entries skipped); write trigger =
      deliberate Apply tap only.
SOURCE: FOUNDER — LAW — Campaign 21 brief permanent-law list ("user
      control senior"; "no silent consequential programme changes");
      coachApply.js header ("nothing changes until the user taps"); ARCH —
      src/lib/coachIntervention.js interventionsFromHistory():201-221,
      coachApply.js markApplied():210-222.
DEFECT: none.
```

```
RULE: U-AUTH-02
LOCK: MUST keep declinedAdjustments in ITS OWN map, deliberately separate
      from appliedAdjustments so isApplied's meaning never blurs. "A
      DECLINE IS NOT AN EXCLUSION... NOT NOW, not NEVER" — expires the
      moment materialEvidenceChange (N-COACH-10's MATERIAL_RATE_SHIFT_PCT
      =0.15 rule) finds the situation has genuinely moved; NO fixed TTL
      otherwise.
MUST_NOT: "A decline can never suppress a calorie floor, rapid-loss
      protection, an ED hold or a joint-safety hold... the engines that
      own them never consult this module" — U-AUTH-02 is JUNIOR to every
      Section 2 safety rule (N-TARGETS-05/06, N-COACH-08/11,
      X-SAFETY-02/03/04) and must never be read by any of them.
BOUNDARIES: see N-COACH-10 for the material-change threshold; no fixed
      TTL.
SOURCE: FOUNDER — coachDecline.js header ("A decline can never suppress a
      calorie floor..."); LAW — Campaign 21 brief ("user control senior")
      bounded by every Section 2 inviolable; ARCH — src/lib/coachApply.js
      markDeclined()/isDeclined():232-243, coachDecline.js (full file).
DEFECT: none.
```

```
RULE: U-AUTH-03
LOCK: Cross-reference stub — see N-MAINT-04 for the full record. No
      separate `manual_override` column exists in nutrition_targets; user
      authority over calories is inferred structurally by comparing the
      coach's last-applied kcal value to the currently-stored target at
      outcome-classification time.
MUST_NOT: see N-MAINT-04.
BOUNDARIES: see N-MAINT-04.
SOURCE: (see N-MAINT-04).
DEFECT: none.
```

```
RULE: U-AUTH-04
LOCK: Cross-reference stub — see N-VOL-01. Unlike calories, this IS a
      dedicated stored list (effectiveLandmarks.getManualLandmarks), read
      into weeklyCoach as manualVolumeMuscles and consulted at both
      context-build time and outcome-classification time.
MUST_NOT: see N-VOL-01.
BOUNDARIES: see N-VOL-01.
SOURCE: (see N-VOL-01).
DEFECT: none.
```

```
RULE: U-AUTH-05
LOCK: NOT A PRODUCTION RULE (for this nutrition/safety domain) — excluded
      from scenario coverage, ledger gets safety_na_reason.
      readinessSummary.js (buildReadinessSummary) is a pure display-
      priority function with no dismiss/suppression state of its own and
      no nutrition/safety consequence; a separate dismissible "Recovery
      week suggested" banner exists in HomeScreen but was out of Step 1's
      nutrition/safety-scoped trace.
MUST_NOT: must not be treated as a nutrition/safety-consequential rule for
      Campaign 21 scenario purposes; the underlying HomeScreen dismiss
      banner belongs to the training/exercise validation lane and would
      need a separate trace before locking.
BOUNDARIES: n/a — scope-boundary negative finding, not a rule.
SOURCE: ARCH — src/lib/readinessSummary.js (module header, per graph
      trace).
DEFECT: none — explicit scope boundary, not a defect.
```
