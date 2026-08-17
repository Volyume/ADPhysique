# CAMPAIGN 22 PHASE 2 — IMPLEMENTATION LANDING (2026-08-17)

Home/Today redesign implemented in full against the Phase 1 spec
(`HOME-TODAY-UX-SPEC.md`, all 25 sections binding) and the three locked
founder rulings (`FOUNDER-RULINGS-PHASE2.md`, R1/R2/R3 all YES).

## What landed (branch `claude/campaign22-home-impl`, merged to main)

- **Stage 1** (`0deb5ff4`): the single arbitrated Today line (P1).
  Pure 9-entry rank resolver `src/lib/home/todayLineArbiter.js` +
  `src/components/home/TodayLine.js`. Five banner idioms, the bottom
  check-in nudge and the always-on RecoveryStateCard row replaced by
  one quiet row with exactly one occupant. RecoveryStateCard re-slotted
  to a tap-through detail sheet. Re-entry became detect-then-tap with
  identical bind/persist semantics. readinessSummary Priority 1 now
  reads the resolved `gatedRecoveryState` (the measured copy
  contradiction closed, guarded by `recoveryWordingSource.test.js`).
- **Stage 2** (`56782be2`): R1 morning-weight strip below the hero with
  permanent tutorial retirement and quiet logged collapse; R2 the
  self-retiring first-review readiness line
  (`src/lib/home/firstReviewLine.js`, reusing `buildCoachLedger` + the
  unclamped `weighInsNeeded`); R3 the everyday trial card rehomed to
  the You screen (same variant/copy builders, dismissal key and day-3
  notification side effect); CoachBriefCard merged to one hero line;
  single hero counter; footer discipline (last-session absorbs the
  glance card; plateau/activation/attention re-sited below).
- **Stage 2 lead rulings** (`f66131e8`, D98 in the decisions register):
  D98-1 the spec's rank-4.5 conflict-day fallback built in full;
  D98-2 the first-review line suppresses on the You tab's FULL
  formula (ED flag, SCOFF >= 2, calm mode, failed wellbeing read, all
  failing closed), source-pinned; D98-3 the rehomed S3 trial variant
  taps to the Today Start hero, not the check-in hold receipt.
- **Stage 3** (`b23bd9d6`): the 18-state mounted matrix suite +
  presentation guards per spec section 23. No production defects found.

Gates at every landing: `npm run lint` 0 warnings; full Jest suite
green (final: 973 suites passed / 13,268 tests passed, 1 suite +
13 tests skipped, 17 snapshots, exit 0).

## Founder device checklist (Android, EAS build from main)

Walk these on a physical device. Steps 12-14 are the ED-safety cases.

1. Open Today (Pro, mid-trial, plan active). Expected order: header,
   Today line (only if something genuinely needs you), hero with ONE
   "Day N of M" counter and at most one quiet coaching line inside it
   (no nested card), morning-weight row BELOW the hero, last session,
   then any footer notices. Nothing commercial at the top.
2. Tap Log on the morning-weight row, enter a weight, submit.
   Expected: the row collapses to a quiet logged state with a trend
   tap. No explanatory sentence underneath.
3. Force-quit and relaunch on a later day. Expected: the "Before food,
   after the bathroom..." sentence never reappears once you have ever
   logged a real weigh-in.
4. Brand-new Pro account, before any weigh-in. Expected: the weight
   row shows the explanatory sentence once; after the first real log
   it is gone for good (the enrolment-seeded value does not count as
   a log).
5. Pre-first-review Pro account, today's weigh-in NOT yet logged.
   Expected: the Today line at the top reads "First review: N more
   morning weigh-ins." with the REAL remaining count (never "3 of 3");
   the weight row below the hero still shows its one-tap log.
6. Log today's weigh-in. Expected: the first-review line moves from
   the Today line to directly under the weight row; the count drops
   by one if this was a new morning.
7. Meet the weigh-in gate before the day gate. Expected: the line
   switches to "First review ready [day]." and disappears entirely
   once the first review completes. Tapping it opens the Coach tab.
8. Open the Coach tab during a live trial (day 0-13, no completed
   review). Expected: the trial value card renders there between the
   profile card and the status card, same wording as before; the
   close button dismisses it permanently; "How Precision Coaching
   works" opens Methodology.
9. On that rehomed trial card with ZERO completed sessions (the "One
   session starts your first coaching review" wording): tap it.
   Expected: it lands on the Today tab's Start hero, not the check-in.
   With one or more sessions completed, tapping opens the weekly
   check-in.
10. Confirm no trial content of any kind on Today until the final 48
    hours; inside 48 hours the Today line reads "Your trial ends
    today/tomorrow. Keep your coaching." and taps to the upgrade
    screen.
11. Start a workout, return Home. Expected: the continue card renders
    and the Today line is empty regardless of what else is eligible.
12. ED-safety: with an open ED flag, confirm the first-review line
    never renders (no weigh-in counting anywhere on Home) even when
    weigh-ins are genuinely missing.
13. ED-safety: with calm mode on (and no ED flag), confirm the same
    silence - the first-review line and the free weekly line stay
    hidden; training content is unaffected.
14. ED-safety: during a recovery week the Today line carries ONE
    recovery voice ("Recovery week. Training is deliberately
    lighter...") and the readiness chip inside the hero agrees with
    it word-for-word in tone; tapping the line opens the recovery
    detail sheet.
15. On check-in day with the data gate met: the Today line reads
    "Your weekly check-in is ready." and outranks everything except a
    finished block; the old bottom-of-screen nudge card never renders.
