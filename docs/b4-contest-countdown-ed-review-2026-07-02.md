# B4 contest-prep countdown — ED-safety design review (pre-implementation)

Per audit 05 §B4's mandatory gate. Prep is aggressive-cutting territory;
this review sets the hard lines BEFORE design. Founder sign-off on this
document is B4's greenlight.

## Threat model
A weeks-out countdown creates urgency pressure on exactly the cohort most
at risk: deep-deficit division athletes. Risks: (1) countdown framing turns
floors into "obstacles"; (2) checkpoints read as body-verdicts; (3) urgency
copy escalates restriction; (4) push notifications weaponise the date;
(5) peak-week protocols normalise extreme manipulation.

## Hard rules (each test-guarded in implementation)
1. Floors, rapid-loss gates, FFM floor, holds and the ED-pattern detector
   remain SENIOR to the countdown in every code path: a countdown can never
   relax, defer or re-frame a safety intervention. If a hold fires during
   prep, the hold renders ABOVE countdown surfaces, unchanged.
2. An open ED flag or calm mode HIDES the countdown entirely (all surfaces)
   and suppresses every checkpoint. Wellbeing, not weeks-out, wins.
3. No daily countdown pushes. The countdown is a pull surface only; the
   sole permitted notification is the existing weekly coach-ready one,
   whose copy may name weeks-out only when no flag is open.
4. Checkpoints are process checkpoints (posing practice, peak-week
   logistics, tan/kit admin), never body checkpoints ("you should weigh X
   by week Y" is banned — no target-weight-by-date anywhere).
5. Copy: no urgency vocabulary (deadline/panic/last chance/behind), no
   shame; SCOFF-positive users keep the existing deficit blocks — a contest
   date never overrides scoffPositive.
6. Peak-week integration presents the existing peak_week_plans content
   only; no new depletion/water-manipulation maths, and the peak-week view
   carries the existing medical-adjacent disclaimer.
7. Scope cut accepted in advance: if any checkpoint cannot be phrased as
   process-only, it is dropped, not softened.

## Implementation shape (post-sign-off)
Pure `src/lib/contestCountdown.js` (date-injected, no clock reads),
surfaces on CoachOutput/ProGoalSetup, guards mirroring the trial banner's
ED-neutral pattern, plus a copy-lint test banning the urgency vocabulary.
