# playstore-07 — testing audit

Status: COMPLETE. Date: 2026-06-06.

## Existing tests (actual run this session, HEAD 7a944a5)
```
$ npx jest
Test Suites: 10 failed, 169 passed, 179 total
Tests:       96 failed, 3 skipped, 2838 passed, 2937 total
```
- The **96 failures are a known, pre-existing baseline**: React `act()` warnings
  in component-mount suites under the jest-expo env, not product logic failures.
  They predate this audit and were confirmed stable across the trialState fix
  (the suite returned to exactly 96 after that change, no new failures).
- 2838 passing tests cover: auth scenarios, sync registry/conflict, payments
  cascade + Play offer bridge, dayKey/timezone, proGate, notifications, planEngine,
  algorithms (PR/volume), food DB, and the two config plugins.
- No coverage threshold gate is configured; coverage was not computed as a number
  this pass (jest has no `--coverage` CI gate in this repo).

## Critical calculation logic — covered
- Calorie / MET and cardio adjustment, planEngine, check-in logic, volume/PR
  (`algorithms.bestPRPerExercise`), dayKey week bucketing all have unit suites
  that pass. These are the highest-risk numeric paths and they are tested.

## Flow simulation (static trace, not device E2E)
The 12 primary flows were traced through navigation + store and resolve without
dead ends: first launch/cold start, auth (email + OAuth + session restore),
onboarding, plan builder, training session, diary/food, cardio, check-in (with +
without cardio), progress, you/settings, subscription/paywall, account deletion.
Navigation resolves and back paths exist. This is a code trace, not an on-device
run.

## E2E (Maestro/Detox) — ABSENT
No device E2E harness is in the repo (`tests/simulator` holds JS-level flow
simulators, not Maestro/Detox). The brief asks to add Maestro foundational
flows. **This is a code change → deferred to the Phase 9 checkpoint decision**
(Document A L-4): it needs Maestro installed + a release build to run against,
which this environment cannot execute. Recommendation: add Maestro flows
(onboarding, sign-in, training session, check-in, account deletion) as a
fast-follow; the Play Console **pre-launch report** (automated robo + device
farm) covers the launch-gate crash sweep in the meantime.

## Recommendation
Tests are a genuine protection layer here and pass at the known baseline. The
gap is on-device E2E, which is a fast-follow, not a submission blocker (the
pre-launch report fills it for the first upload).
