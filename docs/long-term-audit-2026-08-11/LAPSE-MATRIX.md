# Campaign 6 — lapse, layoff and stale-history evidence (Phases 6, 7; grows with 26-27)

## Phase 6 — D91-25 long-layoff characterisation (AUDIT ONLY, nothing implemented)

Mechanics traced and pinned (`campaign6.longitudinal.test.js`, PHASE 6
blocks):

1. **The compute-time protection.** classifyMuscleBlock holds every
   upward carry once `weeksSinceBlockEnd >= 4` (STALE_EVIDENCE_WEEKS,
   `interBlock.js`): at 4/8/13/26/52 weeks the earned +1 is withheld,
   the hold is recorded (`evidence_weeks_old` + `upwardCarryPrevented`),
   and reductions pass through untouched at any age. The runner passes
   the REAL age (`weeksSinceBlockEnd: status.weeksOverdue`,
   `blockLedgerRunner.js:259`).

2. **The stored-ledger asymmetry (the D91-25 surface).** The runner is
   idempotent by version: a ledger computed AT decision time (0 weeks
   overdue, carrying its earned climb and rampTop peak) is served AS-IS
   months later, and `resolveSeedRange` takes NO time input. So:
   - user leaves BEFORE ever seeing the decision screen → ledger
     computes on return with the real gap → the >= 4-week hold
     protects them;
   - user SAW the decision screen, then left for six months → the
     fresh-time proposals apply verbatim on return.
   Same layoff, different outcome, decided by whether the user opened
   one screen before leaving. Documented, NOT fixed (an age input or
   recompute-on-stale rule would be exactly the freshness semantics
   D91-25 defers to the founder).

3. **What bounds the aggressive-return risk today.**
   - The start climb is at most +1 set; the exposure is the PEAK (the
     ramp reaches the old learned ceiling by week 5), never instant.
   - Loads are separately protected: a > 7-day per-exercise gap applies
     the one-time 10% layoff reduction in the live session path
     (`ActiveWorkoutScreen.js:1342`), and FQ-3 withholds every load
     increase without fresh session-difficulty evidence.
   - Along the re-ramp: weekly check-ins, readiness signals, deload
     flags and safetyHold all remain live.
   Verdict: bounded, not unprotected - but the volume ramp after a very
   long layoff rests on protections that are load-shaped and
   feedback-shaped, not volume-shaped. Whether that is enough is the
   founder question carried to Phase 57 (no existing mechanism reduces
   the SEEDED VOLUME itself after absence when the ledger predates the
   layoff).

## Phase 7 — stale-history copy audit (fixes landed, calculations untouched)

Claim-by-claim verdicts:

| Claim | Surface | Evidence window | Verdict |
|---|---|---|---|
| "a bit below your recent average" | blockAdvisor readiness signal | last 8 check-in ROWS, any age | **FIXED** → "your personal baseline" |
| "Targets use your recent weight trend" | ProGoalSetupScreen | latest weigh-in, any age | **FIXED** → "your last logged weight" |
| "your usual" check-in verdicts | checkinDerive | CALENDAR prior week; lapse → refused (hasPriorWeek false) | truthful |
| "learns the days you usually train from your recent workouts" | NotificationSettings | 6-week trailing calendar window | truthful |
| "Below your recent average" (workload) | ProgressSections | 4-week ACWR; hides on null ratio | truthful |
| "Your recent training signals…" (deload) | Home/CoachReview | last 4 calendar weeks; empty after lapse → no suggestion | truthful |
| "what your recent trend suggests you are burning" | nutritionEngine adaptive TDEE | nowMs-anchored windows in the weekly coach; no recent data → no adjustment | truthful |
| "set by how your last block went" / "your last block" | blockExplain/PlansScreen | temporal identity, true at any age | truthful (and under the >= 4-week hold the held numbers still match the words) |

Pins: `campaign6.longTerm.test.js` PHASE 7 block (the two fixes, plus
the date-window pins on the surfaces that keep the word "recent").
