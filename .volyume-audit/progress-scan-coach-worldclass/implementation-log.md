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
- **Wave B (UI wiring, Sonnet agent)**: check-in optional scan prompt + step-1 evidence
  block + Fast Check-In row; CoachOutputScreen card assessment receipt (nowMs anchored
  to the coach output's own timestamp so receipts stay stable retroactively); Home
  check-in nudge subline; ProgressPhotos post-scan value line (Pro + unsuppressed only).
  Status: in progress.

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
| 4 | Sonnet | Wave B: UI wiring implementation | running |

## Files changed

- `src/lib/progressScanCheckInEvidence.js` (new), `src/lib/__tests__/progressScanCheckInEvidence.test.js` (new)
- `src/lib/progressScanCoachEvidence.js`, `src/lib/__tests__/progressScanCoachEvidence.test.js` (enum widening + pins)
- Wave B files: pending

## Tests run

- Wave A targeted: 4 suites, 79 tests, all passed. Progress sweep: 47 suites passed
  (1 skipped: pre-existing sandbox-only `progressScanVision`), 612 passed / 616 total.
  `npm run lint` clean. Wave B: pending.

## Hard blockers

1. Tier 2 corroboration rule (blueprint §12 item 4) — requires an external ground-truth
   validation dataset.
2. Scan-specific notification copy/category — locked founder doc requires explicit
   founder sign-off; integration is complete without it.
