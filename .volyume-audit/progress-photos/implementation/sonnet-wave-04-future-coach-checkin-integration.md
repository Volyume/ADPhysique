# Sonnet implementation wave: Future Coach/check-in integration (guarded groundwork)

## Source docs

Read IN FULL first:
1. `.volyume-audit/progress-photos/blueprints/future-coach-checkin-integration-blueprint.md`
   (governing; especially §1, §2, §4, §9, §11)
2. `.volyume-audit/progress-photos/evidence/scout-07-future-coach-integration-attachment-points.md`
3. `.volyume-audit/progress-photos/blueprints/safety-privacy-blueprint.md` (§5 rule 1, receipts)
4. `.volyume-audit/progress-photos/phase-1-code-audit.md` (§7)
5. `audit/progress-flagship/stage3-blueprint-approval-gate.md` (the previously approved design;
   lines ~225-415)
6. `CLAUDE.md`

## Goal

This is FUTURE integration only, and this wave builds ONLY the guarded groundwork from the
integration blueprint §11: founder-confirmed status of the existing card, suppression
unification, the universal used/not-used sentence, the nine guard tests, and the extracted
evidence interface. NO new integration surfaces. No check-in changes beyond tests.

## FOUNDER GATE (blocking)

Do not start until the founder has answered: is the existing "Progress photo context" card on
`CoachOutputScreen` confirmed as approved current state (it matches the stage3 approval-gate
blueprint), or is it to be removed/hidden? This wave assumes CONFIRMED. If the founder says
remove, this wave becomes a removal task instead; stop and get a fresh spec.

## Current evidence

- The existing (and only) link is display-only: `CoachOutputScreen.js` fetches
  `getProgressScanCoachSummary` (line ~1365; from `src/lib/progressScanStore.js:405-424`),
  resolves `resolveProgressScanCoachNote` (~1444-1449; from
  `src/lib/progressScanCoachResolver.js`), gates on `!edPatternOpen && !calmMode` (~1725), folds
  a sentence via `applyProgressScanCoachContext` (~1769), renders the card (~2042-2048).
  `AthleteProfileScreen.js:274` uses the same summary for its physique tile.
- The resolver self-labels `affectsTargets: false`, `usedFor: 'visual_trend_context_only'`;
  `decisionLine()` (~82-92) already writes non-authority into the copy when a calorie adjustment
  is present.
- Engine isolation is verified: `runWeeklyCoach` (`src/lib/weeklyCoach.js:383+`) explicit
  destructuring, no rest-spread, no scan fields at the call site (~1381-1440);
  `weekly_checkins` COLS scan-free (`src/lib/database.js:5058-5073`); `WeeklyCheckInScreen.js`
  scan-free; `src/lib/database/bodyMetrics.js` has zero `photo_scan` references;
  `nutritionEngine.js` allowlists exclude `photo_scan` (~573-582).
- Existing guards to extend, in the house style (fs.readFileSync + regex + behavioural):
  `src/screens/__tests__/progressScanCoachIsolation.guard.test.js`,
  `src/lib/__tests__/progressScanSafetyFloorIsolation.test.js`, plus `ffmFloor.test.js` and
  `nutritionEngine.test.js:684-690`.
- Known weaknesses to fix here: the card uses a locally computed suppression pair instead of the
  shared fail-closed `usePhotoSuppression()` (`src/hooks/usePhotoSuppression.js`); the regex
  guards are brittle to refactors (scout 7); `coachSummaryFromScan`
  (`progressScanStore.js:419`) was never fully reviewed — review it as part of this wave and
  report findings.

## Files/areas likely involved

- `src/screens/CoachOutputScreen.js` (suppression unification; used/not-used sentence)
- `src/screens/AthleteProfileScreen.js` (suppression unification on the tile)
- `src/lib/progressScanCoachResolver.js` (interface extraction, sentence universality)
- A new `src/lib/progressScanCoachEvidence.js` (or extend the resolver) exporting the
  `ProgressScanCoachEvidence v1` shape from the integration blueprint §8 — a pure reshaping of
  the existing resolver output, zero new consumers
- New/extended guard tests in `src/screens/__tests__/` and `src/lib/__tests__/`

## Requirements

1. **Suppression unification**: the Coach-screen card and the profile physique tile derive
   suppression from `usePhotoSuppression()` (or a documented equivalent with identical
   fail-closed semantics if the hook cannot run in that context — justify in the PR if so).
   Behaviour when unsuppressed is unchanged.
2. **Used/not-used sentence**: every render of scan-derived content on the coach screen includes
   a deterministic sentence stating the scan did not change targets (reuse/extend
   `decisionLine()`; make it unconditional, not only when a calorie adjustment exists). Copy from
   the integration blueprint §7 set.
3. **Evidence interface**: extract `ProgressScanCoachEvidence v1` exactly per blueprint §8:
   `affectsTargets: false` hard-coded, `usedFor` enum, no body-fat fields (ranges stay nulled).
   The resolver consumes/produces it; no other consumer added.
4. **The nine guard tests** (blueprint §9), written and green:
   (1) engine output identical with/without scan evidence (behavioural, real engine);
   (2) low-confidence scan renders identically to no-scan except its own receipt;
   (3) withheld scan identical to absent;
   (4) conflict state cannot change targets or decision caption;
   (5) source guard: scan-content render paths must contain the used/not-used sentence;
   (6) floors re-enforced regardless of scan state; `photo_scan` still excluded from body-fat
   authority allowlists (extend existing five tests, do not weaken);
   (7) `saveWeeklyCheckin`/`weekly_checkins` COLS scan-free (source guard);
   (8) suppression parity on both surfaces (fail-closed assertions);
   (9) `affectsTargets === false` and the `usedFor` enum pinned.
5. **Robustness note**: where a regex guard depends on a fragile delimiter (scout 7 flagged the
   `callBody()` extraction), strengthen the extraction or add a companion behavioural test so a
   refactor fails loudly.
6. **Review `coachSummaryFromScan`** and report: does it leak anything beyond the bounded
   summary (body-fat values, internal flags)? Fix only if it leaks; otherwise document.

## Acceptance criteria

- [ ] Founder confirmation of the card recorded in the PR description.
- [ ] Both surfaces suppressed via the shared mechanism; fail-closed verified by test.
- [ ] Used/not-used sentence present on every scan render path (source guard passing).
- [ ] `ProgressScanCoachEvidence v1` exported, shape-pinned by test, no new consumers.
- [ ] All nine guard tests green; existing isolation/floor tests untouched and green.
- [ ] `coachSummaryFromScan` review findings reported.
- [ ] Zero change to engine outputs, targets, check-in persistence (proven by test 1 and 7).
- [ ] `npm run lint && npm test` output reported verbatim.
- [ ] Manual device checklist (Android EAS build): view coach output with a recent valid scan →
      card shows context + the not-used sentence; enable calm mode → card absent; profile tile
      absent under suppression.

## Tests required

Exactly the nine above, plus shape-pin for the evidence interface, in the existing house styles.

## Safety rules

No shame, no score chasing, no body panic, no false certainty. Suppression is fail-closed.
Copy only from the approved receipt set. No em dash.

## Coach rules (this wave's core law)

This is future integration groundwork only and must obey:
- no direct or indirect target changes from scan/photo data (prove with tests, not comments)
- no hidden coach driver: any scan-derived content states its non-influence in the copy itself
- no low-confidence influence: low tier renders as context only, excluded from all logic
- no withheld-scan influence: withheld behaves identically to absent
- deterministic receipts only: no generated language, no variation between identical states
- `runWeeklyCoach` inputs, `nutritionEngine` allowlists, `coachApply`, `planEngine`,
  `blockAdvisor`, `weekly_checkins` remain scan-free; nothing new is persisted to
  `coach_outputs`

## Do-not-overbuild warnings

- Do NOT build the check-in context block, consistency-check line, recomposition context, or any
  Tier 2 corroboration rule — those are premium-later items behind their own founder gates
  (integration blueprint §12).
- Do not add scan fields to any engine input "for later".
- Do not generalise the evidence interface beyond v1's exact fields.

## Forbidden changes

- The deterministic engines' logic and signatures; ED-safety system internals; wellbeing;
  `SYNC_REGISTRY`; billing/tier/identity/notifications; `ProgressPhotoCompare`; `main` branch.
  No attribution in commits.

## Final response format for Sonnet

1. Files changed (paths + one line each).
2. Tests run (exact commands + verbatim result lines).
3. Acceptance checklist with pass/fail.
4. Remaining risks (bullets, honest) including the `coachSummaryFromScan` review conclusion.
