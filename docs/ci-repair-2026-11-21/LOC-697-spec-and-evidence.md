# LOC-697: Main CI has not passed since October (spec and evidence)

## Spec (verbatim from the task)

The app repository's own automatic check, the GitHub workflow Main CI (tests + lint + Expo Doctor), does not pass on `main` and has not passed since at least 23 October 2026.

Jest job never finishes on GitHub. Find why. Fix the cause in the test or the workflow, not by raising the time limit or skipping tests.

Expo Doctor. Name the packages whose versions differ from what the installed Expo SDK expects. Align them only if that needs no native rebuild decision.

Web dependency audit. Move the flagged packages to the lowest patched versions within their current major version. No new dependency.

Sweep the other workflows under `.github/workflows/` for the same three faults and list what you find.

## Cause 1: the Jest job never ended (fixed)

Evidence (GitHub job logs, read with `gh api repos/Volyume/ADPhysique/actions/jobs/<id>/logs`; the October logs have expired, GitHub returns 410):

- Run 44937355973 (diagnostic, base code plus a progress reporter): every one of the 1820 started test files printed an END line, then
  `Test Suites: 1 skipped, 1819 passed, 1819 of 1820 total`, `Time: 1382.962 s`, `Ran all test suites.`, then
  `Jest did not exit one second after the test run has completed.` The memory sampler stayed flat (used 2231 MB, one node process) for the next 26 minutes until the 50-minute limit cancelled the job. It was not memory, not a hung test and not a slow test.
- Run 44953617291 (diagnostic with a live-timer trace, 22:13 UTC): the only live timers after the last test were two `setInterval` of 20000 ms, created at `src/screens/CommunityConversationScreen.js:262` from `src/screens/__tests__/CommunityConversation.test.js:37` (its `useFocusEffect` mock runs the effect, which starts the 20 s poll), plus Jest's own reporter timers.
- Cause: the last two tests of `CommunityConversation.test.js` (the D221 lane 2B describe, added 17 to 21 October) never unmount the tree they mount, so the screen's poll interval stays alive and Node cannot exit. The workflow comment called the "Jest did not exit" line a soft advisory with exit code 0; it was never safe. The last green run was 1 October (36909032052), before those tests existed.
- Fix at the source: `CommunityConversation.test.js` now unmounts every tree `mount()` builds in `afterEach`.
- Reproduced locally on one file with the guard reporter before the fix: `PASS ... Tests: 14 passed`, then `[leak-guard] 2 timer(s) still running after the last test`, exit 1; after the fix exit 0 (`/tmp/loc697-evidence/before-full.txt`).

## Cause 1b: with the hang gone, the job still exited 1 with every test green (fixed)

- Run 44956721066 on the fixed tree: `Test Suites: 1 skipped, 1820 passed`, then `Process completed with exit code 1` with no failure in the log. Run 44959183655 (exit-code watch added) printed
  `[exit-code] src/lib/plan/__tests__/plannerFixed.test.js left process.exitCode=1`, directly before
  `ReferenceError: You are trying to import a file after the Jest environment has been torn down. From src/screens/__tests__/ExerciseDetailScreen.d218Records.test.js.`
  `node_modules/jest-runtime/build/index.js:565` sets `process.exitCode = 1` on that error. The hang had been hiding it.
- Cause: `ExerciseDetailScreen.d218Records.test.js` never unmounts its trees; one rendered after teardown. Fixed the same way.
- Run 44961651126 (fixed tree, 23:24 UTC) then printed `[exit-code] src/screens/__tests__/WorkoutHistoryScreen.progressAudit20260924.test.js left process.exitCode=1`, with 96 `Cannot log after tests are done` entries from `ShareCardScreen.js:682` (`setTimeout(() => setVideoSlotSettled(true), 900)`), a timer of a screen tree some ShareCardScreen test left mounted. `node_modules/jest-runner/build/runTest.js:149` sets `process.exitCode = 1` for that. Whether it fires inside the same file or a later one depends on machine speed, which is why runs differed.
- Third leaking test file found, so the class is wider than any one file. Fix at the source of the class: `__mocks__/react-test-renderer.js` (the one place every tree is created) remembers each tree, and the new `jest.afterEnv.js` (`setupFilesAfterEnv`) unmounts every tree still mounted when a test file ends. It waits for the end of the file, not each test, so a suite that shares a tree made in `beforeAll` keeps working. The two screen tests above also unmount their own trees.
- Verified locally: 137 suites (all ShareCardScreen, WorkoutHistoryScreen and `src/components/__tests__`) 1482 tests pass under the reporter, exit 0, no `[exit-code]`, no `Cannot log after tests are done`. `scripts/ci/__tests__/jestCiReporter.test.js` runs one fixture (a polling screen, never unmounted) under the repository's Jest config twice: without `jest.afterEnv.js` the leak guard fails it (exit 1, names the timer); with it the file exits 0.

## Cause 1c: two tests fail between 23:00 and midnight UK time (fixed)

- Run 44959183655 at 23:02 and 23:18 UTC: `planSwitch.test.js` ("a switch in the recovery week asks": Expected "Switch during your recovery week?", Received "Restart your training block?") and `offseasonAllan.simulation.test.js` (G1: raises `d3.straight_arm_pulldown` 1, expected 2). They passed in runs at 19:10, 21:26 and 22:47 UTC. Reproduced on this server at 23:21 UTC.
- Cause: the tests build "five weeks ago" as `Date.now() - 35 * 24 h`. Blocks count LOCAL calendar days (`getBlockStatus`, `localDaysElapsed`). After the clocks went back on 25 October, 35 x 24 h before 23:30 GMT is 00:30 BST on the previous calendar day, so the block reads one day short and week 6 reads as week 5. The product is right; the tests were wrong.
- Fix: both tests count calendar days back (`setDate`). `planSwitch.test.js` also pins the clock at 2026-11-21 23:30 UTC in a new test, so the fault shows at any real time: before the fix it fails with `Expected: 6 Received: 5`, after it passes (`/tmp/loc697-evidence/clock-before.txt`, `clock-after.txt`).
- Review (reviewer-opus-1) found a third test of the same kind that a pinned clock fails: `startWithPlan.test.js:79` (`Date.now() - 14 * 86400000`, expects week 3). Pinned at 2026-10-30 23:30 UTC, before: `Expected: 3 Received: 2` (`/tmp/loc697-evidence/startWithPlan-before.txt`); after the same calendar-day change: `Tests: 10 passed` (`startWithPlan-after.txt`).

### Clock sweep across the whole suite (review round 1)

The fix was widened from two files to the class:

- A pinned-clock run of the WHOLE suite (1820 files) found a fourth and a fifth. The fifth is `src/lib/__tests__/progressScanSafetyFloorIsolation.test.js` (`risingWeights` logged 28 weights as `Date.now() - n * 24 h`; at 2026-10-30 23:30 UTC the coach saw `medium` where the test expects `high`); it now builds one weight per local calendar day, and passes locally. The fourth is `src/screens/__tests__/CoachProgress.stateMatrix.test.js` (`daysAgo(n)` was `NOW - n * 24 h`, the screen counts calendar days: `Last session 60 days ago` read `59` at 2026-11-21 23:30 UTC and `61` at the spring instant). It now counts calendar days; both instants pass locally and in CI.
- Other failures seen while pinning were pin artefacts, not clock bugs, and each was traced: a pin done inside the test harness (a ticking fake Date) made `preferences.test.js` and `swapScope.plan.test.js` write two rows with one timestamp, and made two files that install their own fake clock fail; `PhotoDateRangeSheet.test.js` and `ProgressPhotoViewer.test.js` failed when the clock was pinned BEFORE their hard-coded July 2026 dates. The harness pin was removed. The sweep and the guard now use libfaketime (process clock, keeps running), which showed none of these (trial run 44973553087: 7 of 7 suites, 193 tests pass at 2026-10-30 23:30 UTC).
- Files checked by hand, with verdict:
  - `planSwitch.test.js`, `offseasonAllan.simulation.test.js`, `startWithPlan.test.js`, `CoachProgress.stateMatrix.test.js`, `progressScanSafetyFloorIsolation.test.js`: wrong, fixed.
  - `fitnessLogicFixes.test.js:176` (10 weeks ago against an 8-week diet-break threshold, so a day either way changes nothing): safe. `weeklyCoach.evidencedClaims.test.js:77` (34 weeks, asserted with `\d+ weeks`): safe. `coachValidation/harness.js:101` and `residueClosure.test.js:36`: fixed constant `Date.UTC(2026, 7, 16, 12)`, safe. `coachValidation/persistence.test.js:237`, `scenarios.training.test.js:61`: `Date.now()` anchors, but the whole suite passes at both instants (below).
  - The other `Date.now() - n * DAY` hits (63 files by grep, mostly `weekStart: Date.now() - 7 * DAY` check-in fixtures and 12:00-anchored offsets) pass at both instants; they are covered by the run, not by reading each one. A file that does not fail at the two instants can still be wrong at another one, which is why the guard below is a standing job.
- Both directions are covered: 23:00 to 24:00 UK time five days after the clocks went back in October 2026 (a 25-hour day, the failing case), and 00:00 to 01:00 UK summer time six days after they went forward in March 2027 (a 23-hour day). The sweep itself ran at 23:30 UTC in both; the standing jobs start at 23:00:05 (see below).

## Guard for the clock class: the `test-clock` jobs in `.github/workflows/main-ci.yml`

Two extra jobs run the whole Jest suite under libfaketime on every push and pull request, starting at 2026-10-30 23:00:05 UTC and 2027-04-02 23:00:05 UTC (`FAKETIME_DONT_FAKE_MONOTONIC=1`, `faketime -f "@<time>"`, the clock keeps running). A test that counts days as 24 hours now fails there with its name, in the same run as everything else. The clock keeps running, and the fault shows only inside a 60-minute window (23:00 to 24:00 UK in autumn, 00:00 to 01:00 UK in spring), so starting at the opening of the window keeps the 21 to 39 minute suite inside it. A start at 23:30 left only the first 30 minutes inside: in run 44974228831, 450 of 1821 files started after +1800 s (review round 2). `scripts/ci/jestCiReporter.js` now reads `CLOCK_WINDOW_END`, prints `[clock-window] last test file started at ... N of M files started after it`, and fails the job when N is not 0, so a slow runner turns it red instead of silently shrinking it. `jestCiReporter.test.js` pins both outcomes. They run in parallel with the real-clock job, so the check takes no longer; public-repository runners cost nothing. Fails before / passes after: see the run ids in the hand-off comment (the four original test files against the new jobs, then the fixed branch).

## Guard (scripts/ci/jestCiReporter.js, scripts/ci/__tests__/jestCiReporter.test.js)

The Jest step now runs `--reporters=default --reporters=./scripts/ci/jestCiReporter.js`. It prints a START and END line per test file (a stall names its file), fails the run and ends the process within 2 s when a repeating timer is still alive after the last test, and names the first test file after which `process.exitCode` changed. The job has `timeout-minutes: 60` (default is 360). Observed Jest job durations on GitHub: 21.3, 21.9, 23.1, 25.8, 30.4, 30.6, 35.2, 38.4, 38.8 and 38.9 minutes (30.6, 38.8 and 38.9 are the three Jest jobs of run 44977585863; the worst, 38.9, is its real-clock job); a leak is now reported within seconds, so the limit only backs that up. `--forceExit` is not used.
`scripts/ci/__tests__/jestCiReporter.test.js` runs a nested Jest on a leaking fixture (expects exit 1, naming the file) and on a clean fixture (expects exit 0), pins the detector, and pins that both screen tests unmount what they mount. Before the test fixes, its unmount pin failed (`/tmp/loc697-evidence/unit-before.txt`); after, it passes.

## Cause 2: Expo Doctor (needs the lead's ruling, not changed)

- Log: `Check that packages match versions required by installed Expo SDK` / `Patch version mismatches` / `expo-asset  ~12.0.14  12.0.13`. One package.
- `expo-asset` ships native code (`android/`, `ios/AssetModule.swift`). The expected version comes from Expo's live SDK 54 table, so a new Expo patch (expo-asset 12.0.14, published 2026-10-21) turns the check red with no change in this repository. That is why it went red in the week of 21 October.
- Diff between 12.0.13 and 12.0.14 (`npm pack` of both): only the version strings in `package.json`, `android/build.gradle`, `expo-module.config.json`, the local Maven folder, and the `expo-constants` range `~18.0.13` to `~18.0.14` (the lockfile already has expo-constants 18.0.14). No source file differs. CHANGELOG: "This version does not introduce any user-facing changes."
- The change would be: `package.json` `"expo-asset": "~12.0.14"` and the matching lock entry (version, resolved, integrity, constants range). It changes a native module's version, so the founder's next build changes (the Gradle module version). Not applied.
- Proof it clears the check: scratch branch `LOC-697-scratch-expo-asset` (commit d1ef9ead, not a candidate), run 44956789024: Expo Doctor job `success`.

## Cause 3: web production audit (fixed)

- `web/` is the Next.js app (apps/web, packages/ui, packages/supabase) with a `vercel.json`. volyume.app is served from `public/` by GitHub Pages (`curl -I https://volyume.app` returns `server: GitHub.com`). The repository's GitHub deployments show a Vercel project (`volyume-marketing-hq`): last Production deployment 2026-08-24 for commit bf96025a; its URL redirects to Vercel sign-in, so it is not public. `docs/CURRENT_STATUS.md:338` records the web app as "not deployed". Which folder that Vercel project builds is not visible from here.
- The audit failed on: next 15.5.24 (critical RCE in image optimisation, high DoS, 5 moderate; patched at 15.5.27, 15.5.28 and 15.5.29), sharp 0.35.4 (patched 0.35.5), source-map-js 1.2.1 (patched 1.2.2).
- Fix: next and eslint-config-next 15.5.24 to 15.5.29 (the lowest release that patches all of them; same major and minor line; its optional `sharp` range is `^0.34.3 || ^0.35.5`); the sharp override in `web/pnpm-workspace.yaml` `^0.35.4` to `^0.35.5`; source-map-js resolved to 1.2.4 with `pnpm update -r source-map-js --lockfile-only`. No new dependency. Local `pnpm audit --prod`: `No known vulnerabilities found`.

## Sweep of the other workflows (listed, not changed)

| Workflow | Triggers | Hang bound | Fault 1 (Jest never ends) | Fault 2 (Expo Doctor) | Fault 3 (audit) |
|---|---|---|---|---|---|
| apply-named-sql, deploy-functions, deploy-migrations, deploy-pages, print-signing-sha | manual | none (6 h default) | no Jest | none | none |
| build-android | manual | 45 min | no Jest | none; its comment says Main CI owns Jest, Doctor and audit | none |
| build-ios | manual | 120 min | no Jest | none | none |
| export-upload-certificate | manual | 10 min | none | none | none |
| growth-weekly-totals | schedule, manual | 15 min | none | none | none |
| identity-invariant | push, pull request | none | no Jest | none | none (green on 21 November) |
| maestro-e2e | manual | 60 min | none | none | none; last runs 27 May all failed |
| refresh-off-snapshot | weekly schedule, manual | 60 min | none | none | none; **every scheduled run since 6 September ended `cancelled` after about 60 minutes** (runs 33503330861 to 40175679588, last 25 October): the job reaches its 60-minute limit each week. Same symptom class, different cause, not investigated. |
| screenshot-net | manual | 60 min | none | none | none |

The two workflows that run Jest, Doctor and `pnpm audit` are both in `main-ci.yml`; no other workflow has the same three faults. Workflows with no `timeout-minutes` can hang up to 6 hours: apply-named-sql, deploy-functions, deploy-migrations, deploy-pages, identity-invariant, print-signing-sha.
