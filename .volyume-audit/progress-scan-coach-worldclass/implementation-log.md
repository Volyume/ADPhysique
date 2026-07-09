# Progress Scan Accuracy + Coach Evidence Integration — Implementation Log

Lead: Fable (main loop). Run date: 2026-07-09. Fresh session; sources are the saved docs under
`.volyume-audit/progress-photos/` and the current tree, not conversation memory.

## Starting state

- Branch: `claude/codebase-audit-docs-pv6mjd`
- Starting commit: `44272de` (Record waves 4 and 5 completion in execution log)
- Working tree: clean
- All five progress-photos implementation waves complete (order 1 → 2 → 3 → 5 → 4; commits
  `2badeea`, `465a573`, `bb98f58`, `181e835`, `559627f`, `65b115a`); see
  `.volyume-audit/progress-photos/implementation/execution-log.md`.

## Founder instruction governing this run (2026-07-09)

Final completion pass. No "premium later" bucket: everything that can be done safely now must be
done now; only genuine hard blockers remain. Scan evidence becomes optional weekly check-in
evidence that informs the Coach's PROGRESS ASSESSMENT; the Coach decides through deterministic
rules; no scan path may mutate calories, macros, refeeds, diet breaks, or training; low-confidence
/ withheld / non-comparable scans are recorded but never used as positive or negative progress
evidence; every interpretation is receipted; skipped scans are never framed as failure.

This instruction supersedes the "premium later" gating of integration blueprint §12 items 1–3
(check-in context block, consistency/conflict line, recomposition-adjacent context) — those are now
IN scope. It does NOT unlock blueprint §12 item 4 (the Tier 2 corroboration rule that lets a scan
trend touch the Coach's decision-confidence caption): that remains hard-blocked on Tier 2
ground-truth validation, which requires an external validation dataset (a listed hard-blocker
category).

## Phase 1 — accuracy gate

- Dispatched 2 audit agents (Opus, per CLAUDE.md agent-tier rules), read-only, in parallel:
  1. scoring accuracy gate re-audit against the seven gate criteria + targeted test run;
  2. current-state map of check-in / Coach / Today / notification attachment points.
- **Verdict: PASS** (all seven criteria; 554 targeted tests green; lint clean; see
  `accuracy-gate.md`, commit `5518a36`). No scoring fixes required, so no separate
  scoring-fix commit exists and Phase 2 began immediately.

## Phase 2 — integration

- Integration plan written and committed (`7ba1019`); architecture: deterministic
  evidence/receipt layer composed AROUND the engine (engine, `weekly_checkins` and
  `coach_outputs` stay scan-free; the byte-identical engine guard remains untouched).
- **Wave A (evidence layer, Sonnet agent, commit `7fc4ba0`)**: new
  `src/lib/progressScanCheckInEvidence.js` (pure v2 packet builder + deterministic
  classifier + verbatim receipt set) + full test suite; v1 `usedFor` enum widened by the
  founder-authorised `progress_assessment_context` value, pins updated loudly. Fable
  hands-on review found one design gap and fixed it in the main loop before commit:
  the targets-changed / targets-held receipt wording (plan §7 patterns 7 and 8) fired
  only in the valid+inconclusive case; it now also covers `supports` and
  `visual_change_weight_stable` (a user who sees targets change right after a
  supportive scan must never infer the scan drove it), while `conflicts` keeps its
  mandated hierarchy sentence. 79 targeted tests green, 612 progress-sweep tests green,
  lint clean.
- **Wave B (UI wiring, Sonnet agent, commit `84cab3b`)**: check-in optional scan prompt +
  step-1 evidence block + Fast Check-In row; CoachOutputScreen card assessment receipt;
  Home check-in nudge subline; ProgressPhotos post-scan value line (Pro + unsuppressed
  only, reusing `buildScanReceipt`'s existing 'scored' outcome as the eligibility test);
  `composeScanEvidencePacket` composition helper added to the evidence layer; six new
  test suites including a tone guard pinning every new string verbatim. Fable hands-on
  review found and fixed THREE defects before commit:
  1. **Anchor bug**: the coach card anchored the evidence window to `weekStart` (Monday),
     but the evidence layer accepted negative scan age, so a scan captured AFTER the
     anchor passed the window check — the exact opposite of the stated intent — and a
     strict fix would instead have excluded the primary flow (a scan just before a
     mid-week check-in). Resolution: the screen re-runs `runWeeklyCoach` fresh on every
     load, so nothing is frozen; anchor at the run's own moment (`Date.now()`), and
     harden the evidence layer to reject any `capturedAt` after `nowMs` (negative-age
     fail-closed, new test). The agent's source-guard test that pinned the old anchor was
     re-pinned to the corrected semantics.
  2. **Suppression leak**: under calm/ED suppression the check-in packet resolved to a
     `no_scan_ever` packet rather than null, so a suppressed user would still have seen a
     "Progress scan" section with the neutral line. Fixed: suppression now nulls the
     packet, making every scan surface on the screen entirely absent (single mechanism,
     fail closed).
  3. **Prompt nag**: the prompt showed for any non-valid status, so a user whose scan two
     days ago landed baseline/low-confidence/non-comparable would be asked to scan again
     at check-in. Fixed: prompt only for `no_scan_ever` / `no_recent_scan`; retake
     guidance stays on the scan surfaces where it already exists.
  Also upgraded in review: the check-in weight delta was a within-week first-to-last EWMA
  move (reads 'flat' most weeks, biasing the classification toward the recomposition
  message for someone genuinely losing on target); now computed with the engine's own
  exported helpers (`getLatestEwma` / `getEwmaSevenDaysAgo`) over 14 days of morning
  weights — the exact formula `runWeeklyCoach` uses for `trend.delta`. Test fixture
  corrected to 14 flat readings (the old 7-row fixture actually sloped UPWARD and could
  not produce a 7-day-old EWMA reading under the engine formula).

## Fable decisions

1. Engine boundary: "Coach includes scan evidence in its progress assessment" is met at
   the Coach OUTPUT layer via a pure classifier over the engine's own outputs; targets
   remain scan-free by construction, not convention.
2. Receipt patterns 7/8 extended to supports/visual-change states (see Wave A above).
3. Agent A judgement calls accepted on review: withheld branch kept as documented
   defensive code (unreachable via today's producer chain); recomp mapping
   (weight-losing → supports, weight-flat → visual_change_weight_stable);
   `eligibleForAssessment` = data-quality gates only; performance conflictSource
   omitted rather than inventing a loadSignal→body-composition mapping (loadSignal is
   'reduce'|'hold'|'progress', a training-load signal — no non-invented mapping exists).
4. Check-in evidence block passes no targetsChanged/heldDecisions (the decision has not
   been made at check-in time); the coach card passes both from the engine output.
5. Notifications: NO changes. The locked check-in reminder + existing `volyume://checkin`
   deep link already deliver the user into the flow containing the optional scan prompt.
   Changing locked reminder copy or adding a category needs founder sign-off
   (`docs/NOTIFICATIONS_LOCKED.md`) — recorded as a founder decision item.

## Agents used

| # | Model | Role | Status |
|---|-------|------|--------|
| 1 | Opus | Accuracy gate re-audit (read-only) | complete |
| 2 | Opus | Integration attachment-point verification (read-only) | complete |
| 3 | Sonnet | Wave A: evidence layer implementation | complete (reviewed, amended, committed `7fc4ba0`) |
| 4 | Sonnet | Wave B: UI wiring implementation | complete (reviewed, amended, committed `84cab3b`) |

Total: 4 agents (2 Opus audit, 2 Sonnet implementation), within every cap in the founder
instruction (accuracy re-audit max 3; scoring fixes max 2 — none needed; integration max 2).

## Files changed

- Wave A (commit `7fc4ba0`): `src/lib/progressScanCheckInEvidence.js` (new),
  `src/lib/__tests__/progressScanCheckInEvidence.test.js` (new),
  `src/lib/progressScanCoachEvidence.js` + its test (enum widening + pins).
- Wave B (commit `84cab3b`): `src/lib/progressScanCheckInEvidence.js` (+compose helper,
  negative-age hardening), its test (+wave-B cases), `src/screens/WeeklyCheckInScreen.js`,
  `src/screens/CoachOutputScreen.js`, `src/screens/HomeScreen.js`,
  `src/screens/ProgressPhotosScreen.js`, and new tests
  `CoachOutputScreen.progressScanAssessment.test.js`, `HomeScreen.progressScanNudge.test.js`,
  `ProgressPhotosScreen.checkInValueLine.test.js`, `WeeklyCheckInScreen.scanEvidence.test.js`,
  `progressScanIntegrationTone.guard.test.js`.
- Docs: `accuracy-gate.md`, `integration-plan.md`, this log, `final-completion-report.md`.

## Tests run

- Wave A targeted: 4 suites, 79 tests, all passed. Progress sweep: 47 suites passed
  (1 skipped: pre-existing sandbox-only `progressScanVision`), 612 passed / 616 total.
- Wave B affected suites: 41 passed (1 skipped, same vision suite), 560 passed / 564.
- Full `npm test`: `Test Suites: 3 failed, 1 skipped, 572 passed, 575 of 576 total;
  Tests: 2 failed, 9 skipped, 7327 passed, 7338 total`. The three failing suites
  (`progressScanVision` sandbox-only native artifact; `ProGate.featureCopy.guard`
  "'Your week'" label in RootNavigator; `screen-mount` ActiveWorkoutScreen note-chip)
  were re-verified by Fable via `git stash` to fail IDENTICALLY on the unmodified tree —
  all pre-existing and unrelated to this pass.
- `npm run lint` (`eslint . --max-warnings 0`): clean after every wave.

## Skipped tests and why

- `progressScanVision.test.js`: pre-existing sandbox-only skip (missing
  `react-native-fast-tflite` native build artifact); present on the base branch.
- iOS backup-exclusion attribute: not Jest-testable (wave 5 decision); remains on the
  manual device checklist.

## Hard blockers

1. Tier 2 corroboration rule (blueprint §12 item 4) — requires an external ground-truth
   validation dataset.
2. Scan-specific notification copy/category — locked founder doc requires explicit
   founder sign-off; integration is complete without it.

## Final commit

`84cab3b` (code) plus the docs commit recorded in `final-completion-report.md`. Branch
`claude/codebase-audit-docs-pv6mjd`, pushed to origin.
