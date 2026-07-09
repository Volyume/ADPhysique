# Progress Scan Accuracy + Coach Integration Final Completion Report

Run: 2026-07-09. Lead: Fable (main loop). Sources: saved docs under
`.volyume-audit/progress-photos/` + current tree. This is the completion pass the
progress-photos execution log scheduled; there is no "premium later" bucket in this report.

## 1. Final branch and commit

- Branch: `claude/codebase-audit-docs-pv6mjd`
- Final code commit: `84cab3b` (integration UI wiring); evidence layer `7fc4ba0`;
  docs committed separately after this report (hash recorded in the push output and git log).
- Starting commit for this pass: `44272de`. All commits pushed to origin.

## 2. Accuracy gate final verdict

**PASS** on all seven criteria (score meaning, input quality control, visible confidence,
withhold logic, repeatability, receipts, tests) — see `accuracy-gate.md`. 554 targeted
progress tests green and lint clean at the gate; no scoring fixes were required, so no
scoring-fix commit exists.

## 3. Scoring fixes completed

None required. The five prior implementation waves (anchor ±8 clamp with Moderate cap,
duplicate-content withhold, quick-add/guided-single scoring firewall, rendered confidence
contract, receipts with Why?, comparable-points-only trend, EXIF strip, per-user wipe,
coach-evidence isolation) had already brought scoring to gate-passing state, verified by
re-audit rather than assumed.

## 4. Fable integration recommendation

Scan evidence is integrated as a deterministic evidence/receipt layer composed AROUND the
coaching engine, never inside it. A pure classifier (`src/lib/progressScanCheckInEvidence.js`)
reads the engine's OWN outputs (weight trend, goal phase, held decisions) plus the existing
bounded scan evidence object and produces one of: supports / conflicts /
visual_change_weight_stable / inconclusive / not_used / insufficient_data, each with a calm
verbatim receipt. Check-in is the evidence-review surface; Coach output is the interpretation
surface. Targets remain scan-free by construction: `runWeeklyCoach`, `coachApply`,
`nutritionEngine`, `planEngine`, `weekly_checkins` and `coach_outputs` are untouched and the
pre-existing byte-identical engine guard still passes unmodified.

## 5. Coach/check-in integration completed

- **Check-in (`WeeklyCheckInScreen`)**: optional dismissible "Add a progress scan first?"
  prompt (only when no recent scan exists; nothing persisted; skipping changes nothing);
  a "Progress scan" evidence block beside the week's data showing the deterministic receipt,
  non-authority sentence and confidence tier for every scan state (valid / low confidence /
  withheld / non-comparable / baseline / none this period); a read-only context row on Fast
  Check-In; submit provably unaffected by any scan state.
- **Coach output (`CoachOutputScreen`)**: the existing "Progress photo context" card now
  carries the assessment receipt — how the scan sat alongside this week's decision, including
  "targets changed because of your logged trend, not the scan" / "targets were held based on
  your logged data" wording, with the non-authority sentence rendered exactly once.
- **Home**: the existing check-in-day nudge gains one optional, suppression-gated subline
  inviting (never pressuring) a scan first.
- **Progress photos**: the latest scan's card shows "If you check in this week, the coach can
  use this as context." only when scored at High/Moderate confidence, Pro, unsuppressed.
- **Evidence object**: v2 packet (status, assessment, eligibility, receipt, conflictSource,
  carried v1 fields) with `affectsTargets: false` as a source-guarded literal and the v1
  `usedFor` enum widened by exactly one founder-authorised value.
- **Guidance loop**: scan → value line → check-in prompt/evidence block → coach assessment
  receipt → targets explained from Coach rules. The user sees whether the scan was used,
  ignored, conflicted, or was too low-confidence to use, at both check-in and coach output.

## 6. World-class polish completed

Accessibility labels on every new block and action; fail-closed loading/absent states (no
placeholder under suppression — surfaces are entirely absent); coach-card receipt readability
(separated lines, deduplicated non-authority sentence); Fast Check-In context row; a wave
tone guard pinning every new string verbatim against drift; check-in classification uses the
engine's own exported EWMA helpers so check-in and coach read the same trend the same way.

## 7. Files changed

Code (commits `7fc4ba0`, `84cab3b`):
- `src/lib/progressScanCheckInEvidence.js` (new) + test (new)
- `src/lib/progressScanCoachEvidence.js` + test (enum widening, pins updated loudly)
- `src/screens/WeeklyCheckInScreen.js`, `src/screens/CoachOutputScreen.js`,
  `src/screens/HomeScreen.js`, `src/screens/ProgressPhotosScreen.js`
- New tests: `CoachOutputScreen.progressScanAssessment.test.js`,
  `HomeScreen.progressScanNudge.test.js`, `ProgressPhotosScreen.checkInValueLine.test.js`,
  `WeeklyCheckInScreen.scanEvidence.test.js`, `progressScanIntegrationTone.guard.test.js`

Docs: `accuracy-gate.md`, `integration-plan.md`, `implementation-log.md`, this report.

## 8. Tests run

- Evidence-layer targeted: 4 suites, 79 tests (Wave A) → 83 with Wave B additions, all green.
- Wave B affected suites: 41 passed / 1 skipped, 560 tests passed.
- Full `npm test`: 572 suites passed, 7327 tests passed. Three failing suites verified via
  `git stash` to fail identically on the unmodified tree (pre-existing, unrelated):
  `progressScanVision` (sandbox-only missing native artifact), `ProGate.featureCopy.guard`,
  `screen-mount` (ActiveWorkoutScreen note chip).
- `npm run lint` (`eslint . --max-warnings 0`): clean.

## 9. Guard-test checklist

- [x] Valid scan evidence appears in check-in and coach receipt (behavioural mounts).
- [x] Low-confidence scan recorded, never used as progress evidence (lib + screen tests).
- [x] Withheld scan recorded, never used (lib test; defensive branch, documented unreachable
      via today's producer chain).
- [x] Non-comparable scan explained (lib + screen tests).
- [x] Supports / conflicts / stable-weight-visual-change receipts render (lib + screen).
- [x] Scan evidence cannot mutate calories/macros/refeeds/diet breaks/training:
      `runWeeklyCoach` byte-identical guard untouched and green; engine modules verified to
      never import the evidence layer (source guard); no packet key is target-named.
- [x] Target decisions remain deterministic and safety-gated: floors re-enforced in
      `coachApply` regardless of scan state; `photo_scan` still excluded from body-fat
      authority allowlists.
- [x] Missing scan produces no negative language or penalty (only "No photo set this
      period."; tone guard bans shame vocabulary).
- [x] Skipped scan does not block check-in (submit test).
- [x] `weekly_checkins` COLS scan-free (existing source guard, green).
- [x] `coach_outputs` persistence scan-free (new source guard over saveCoachOutput calls).
- [x] Suppression fail-closed on every new surface (screen tests; single null-packet
      mechanism at check-in).
- [x] `affectsTargets === false` literal and `usedFor` enum pinned (updated loudly).
- [x] Negative scan age (capturedAt after nowMs) fails closed (new lib test).

## 10. Hard blockers only

1. **Tier 2 corroboration rule** (a strong multi-scan trend corroborating the Coach's own
   decision-confidence caption by one step): requires external ground-truth validation data
   that does not exist in or derivably from this codebase. Category: requires a new external
   dataset. Everything short of it — full evidence integration, receipts, conflict handling —
   is built.
2. **Scan-specific notification copy or category**: `docs/NOTIFICATIONS_LOCKED.md` is a
   locked founder document; changing the check-in reminder's verbatim copy or adding a
   `scan_ready` category requires explicit founder sign-off. Category: founder decision on a
   locked system. The integration is complete without it: the existing locked check-in
   reminder and `volyume://checkin` deep link already deliver the user into the flow that now
   contains the optional scan prompt.

## 11. What is now world-class

- The score is honest: visual-progress evidence with rendered, test-pinned confidence, never
  a body-fat claim; withholds refuse to guess and say why.
- Every scan outcome carries a deterministic calm receipt, at the scan, at check-in, and at
  the coach result; the user always sees whether the scan was used, set aside, or conflicted.
- The Coach's progress assessment now genuinely weighs visual evidence against weight, goal
  phase and its own decisions — with the decision hierarchy stated plainly (weight and intake
  always win) and the targets provably immune to scan influence.
- The whole loop is joined: scan value line → Today nudge → check-in prompt and evidence
  block → coach assessment receipt → plan explanation, all optional, all suppression-gated,
  all no-shame.

## Manual device checklist (Android EAS build; founder device-walk)

1. With no scans: open weekly check-in on check-in day → prompt "Add a progress scan first?"
   appears; "Not now" dismisses it; step 1 shows "No photo set this period."; submit works.
   Expected: no guilt copy anywhere.
2. Do a valid scan (good light, all poses), then check in → prompt absent; step 1 shows the
   scan receipt + confidence; Fast Check-In (if offered) shows the Progress scan row.
3. Open Coach output after the run → "Progress photo context" card shows the assessment
   receipt; the "weekly target still comes from your logs..." sentence appears exactly once;
   targets match what the logs alone would give (compare against a week without a scan if
   possible).
4. Force a low-confidence scan (dim light) → check-in shows the low-confidence receipt, no
   score-direction language; coach card says it was not used.
5. Enable calm mode (or with an open ED flag account): Home nudge subline absent; check-in
   prompt and evidence block entirely absent (no placeholder); coach card absent; Progress
   photos value line absent.
6. Home on check-in day: nudge shows the optional scan subline (calm mode off); tapping the
   nudge opens the check-in as before.
7. Latest scan card on Progress: value line present only on the newest, scored,
   High/Moderate scan; absent on older cards and on withheld/baseline results; absent for a
   free-tier account.
