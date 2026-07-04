# Volyume Test Coverage & QA-Readiness Audit (S5)

**Audit date:** 2026-07-04
**Scope:** Read-only. 428 suites / 5,859 tests (`npx jest --listTests` confirms 428
files enumerated). Full suite was NOT executed (task scope forbids it); all
counts and behaviour claims below are from reading test source directly.

---

## EXECUTIVE SUMMARY (10 lines)

1. Coverage is broad (428 files) and, in the safety-critical core, genuinely
   behavioural: ED calorie floors, quiet hours, photo suppression, cascade/
   restore, sync conflict resolution and the cardio-log migration-ordering
   incident all have real tests driving real modules, not just source greps.
2. The single biggest structural gap: **`RootNavigator.js` (1,554 lines) is
   not importable under Jest** (no native-module mocks) — the Article 9
   consent gate, tier routing and auth routing are pinned only by regex
   source guards across three separate files, not by rendering the gate.
3. **No test enumerates every Pro-designated screen and asserts it is
   gated** — `withProGuard` usage is checked ad hoc, not exhaustively.
4. **DB migration idempotency is spot-checked, not systemic**: one incident
   (cardio_log ordering) has a real regression test; the other ~40+ entries
   in `SCHEMA_MIGRATIONS` have no "run the full chain twice, assert
   idempotent" test.
5. Only 6 skipped tests found (not 5) — all are `test.skip` for
   `deferred: true` telemetry catalogue entries with documented reasons; no
   quietly-rotting skips.
6. E2E is exactly 2 Maestro flows (consent gate, workout backgrounding),
   manual-dispatch-only, never per-PR — deliberate and documented, but
   leaves purchase, restore, sync-conflict and food-logging journeys with
   zero device-level coverage.
7. The historical "worker force-exit" issue is already fixed and documented
   in `.github/workflows/main-ci.yml` (leaked `setTimeout`s in
   `HomeScreen`, fixed via a mount-registry + `afterEach` drain in
   `screen-mount.test.js`); a soft "did not exit" advisory remains but is
   confirmed cosmetic (Supabase realtime singleton teardown).
8. `release:check` gates: install, `tsc --noEmit --strict`, lint (errors
   only), import-check, full Jest (`--runInBand`), `npm audit`. It does
   NOT run Expo Doctor or Maestro — both are separate CI jobs/workflows.
9. Testability debt clusters in a few huge single files (`database.js`
   7,255 lines, `RootNavigator.js` 1,554, `useAppStore.js` 1,841,
   `food/db.js` 1,669) that force tests to either fake the whole SQLite
   handle or fall back to regex-on-source.
10. What's already good is unusually good for this stage of a live app:
    the ED-safety and billing domains in particular read like specs, not
    just tests — see section 6.

**Severity counts:** P0: 2 · P1: 5 · P2: 6 · P3: 3

---

## 1. COVERAGE MAP BY DOMAIN

Counts from `npx jest --listTests` grouped by `__tests__` directory
(behavioural = drives real exported functions/components; guard = regex
over `fs.readFileSync` source, pinning a fact about the code rather than
its behaviour).

| Domain | Test files | Behavioural | Guard-only | Notes |
|---|---|---|---|---|
| `src/lib/__tests__` (engine + misc top-level) | 197 | majority | some | Largest bucket; includes coachApply, nutritionEngine, wellbeing, edPatternDetector, planEngine, migrations.cardioLog |
| `src/lib/food/__tests__` | 40 | majority | few | macros, gramSolve, mealSuggest, waterfall, diaryDates etc. |
| `src/screens/__tests__` | 29 | mixed | several `.guard.` files | Full render coverage is thin relative to 80 screen files |
| `src/components/__tests__` (+food/auth) | 34 | mixed | some | ProGate, ProgressPhotoCompare are strong behavioural examples |
| `src/lib/sync/__tests__` (+`tables/`) | 27 | majority | some | conflict, transport, runner, watermark all behavioural |
| `src/lib/notifications/__tests__` | 12 | majority | — | budget, quietHours (via `lib/__tests__`), scheduler-adjacent |
| `src/lib/partners/__tests__` | 13 | majority | — | consent, tierGate, moments |
| `src/lib/payments/__tests__` | 10 | majority | — | cascade (3 files), restore, lapseDetect, playBilling.offer |
| `src/store/__tests__` | 4 | mixed | — | Single 1,841-line store; only 4 files |
| `src/lib/cardio/__tests__` | 2 | behavioural | — | Thin relative to cardioEngine's role in weekly coaching |
| `src/lib/consent/__tests__` | 1 | behavioural | — | `pendingConsent.js` only; the RootNavigator gate itself is guard-only (see §2) |
| `src/lib/onboarding/__tests__` | 2 | behavioural | — | Sex-gate covered elsewhere (`proOnboarding.sexGate.test.js` under `lib/__tests__`) |
| `src/hooks/__tests__` | 7 | behavioural | — | includes `useWeeklyStreak.guard.test.js` |
| **Total** | **428** | | | Matches CLAUDE.md's stated 428/5,859 |

Regex/source-guard tests are common and, per CLAUDE.md's stated philosophy,
intentional (`fs.readFileSync` count: 84 of 428 files reference it — not all
84 are pure guards, some also parse the source for a data table, e.g. the
telemetry catalogue scan).

---

## 2. CRITICAL-PATH GAPS

Checked each named critical path by locating and reading its test, not
assuming presence from a file name.

| Critical path | Verdict | Evidence |
|---|---|---|
| Purchase flow | **Covered (behavioural)** | `src/lib/payments/__tests__/cascade.lifecycle.test.js`, `playBilling.offer.test.js`, `confirmPurchase.platform.test.js` drive real RPC-payload shapes and platform confirm paths |
| Restore | **Covered (behavioural)** | `src/lib/payments/__tests__/restore.test.js` — asserts `confirmPurchase` is *awaited*, not fire-and-forget, and that a failed server confirm doesn't fail the optimistic restore |
| Trial cascade/lapse | **Covered (behavioural)** | `cascade.reconcile.test.js`, `cascade.twoTierGuard.test.js`, `lapseDetect.test.js`, `winbackState.test.js` |
| Consent gate fail-closed | **Partially covered — guard only** | `src/__tests__/healthConsentRouting.guard.test.js` explicitly states "RootNavigator is not importable under this jest config (no native-module mocks)" and scopes a regex to the consent block in `RootNavigator.js`; `onboardingConsentRouting.guard.test.js` and `lapsedReadOnly.guard.test.js` are the same pattern. No test actually renders the gate and asserts a locked-out screen. E2E flow 01 (`.maestro/flows/01-article9-consent.yaml`) is the only place this is exercised end-to-end, and it's manual-dispatch-only. |
| Sync conflict resolution | **Covered (behavioural)** | `src/lib/sync/__tests__/sync.conflict.test.js` drives `resolve()` directly for `last_write_wins` and other strategies from `SYNC_ARCHITECTURE_LOCKED.md`; `sync.runner.integration.test.js` covers the runner path |
| DB migration idempotency (full chain) | **Gap — spot-checked only** | `src/lib/__tests__/migrations.cardioLog.test.js` drives the real `runMigrations` with a fake SQLite handle for exactly one incident (cardio_log ordering), for two starting versions. `SCHEMA_MIGRATIONS` (`src/lib/database.js:341-1529`) has far more entries than that; nothing runs the full array twice from version 0 and asserts every step is a no-op the second time (the stated idempotency contract in the migration header comments) |
| Notification scheduling under quiet hours | **Covered (behavioural)** | `src/lib/__tests__/notifications.quietHours.test.js` drives `isInsideQuietHours`/`shiftHourMinuteOutOfQuietHours`/`shiftDateOutOfQuietHours` directly, including wrap-window and same-day-window edge cases |
| ED floor enforcement through coachApply | **Covered (behavioural, strong)** | `src/lib/__tests__/coachApply.test.js` drives `computeCalorieTargets` against the real 1,500/1,200 floors with a documented regression note ("Previously it floored everyone at 1200, so a male cut could be written below 1500"); `coachApplyView.test.js` cross-checks the classifier never disagrees with the real policy |
| Photo suppression (calm/ED) | **Covered (behavioural)** | `src/components/__tests__/ProgressPhotoCompare.test.js` mocks `usePhotoSuppression()` and asserts a calm placeholder renders, never the comparison, when suppressed; `ProgressPhotosScreen.compare.test.js` covers the screen level |
| Tier gating on every Pro screen | **Gap** | `ProGate.readOnlyGuard.test.js` and `proGate.test.js` cover the guard function's branches well, but nothing enumerates the ~40+ Pro-designated screens/features (food diary, barcode, meal suggestions, targets, macros, cardio, check-ins, Precision Coaching, division plans, wearables per CLAUDE.md §2) and asserts each is wrapped. `withProGuard` usage sits in `RootNavigator.js` (23 call sites) rather than at each screen file, so a per-screen enumeration test is the only way to catch a newly added Pro screen shipped ungated |

---

## 3. GUARD-TEST QUALITY

**Skipped tests: 6 found (task brief said 5 — current count as of today).**
All are in `src/lib/telemetry/__tests__/telemetry.catalogue.test.js:52`,
one `test.skip` per `deferred: true` entry in
`src/lib/telemetry/events.js`:
- `account_deleted` — superseded by `account_deletions_log`
- `held_decision_created` / `held_decision_cleared` — umbrella events judged redundant with per-type events
- `first_session_choice` — UI variant retired 2026-06-30, no emitter
- `onboarding_quiz_completed` — gated behind an unlaunched flag (`ONBOARDING_QUIZ_FIRST`)

Each carries a `deferralReason` string checked by a companion "shape" test
(`telemetry.catalogue.test.js`) — these are not silently rotting; they're a
deliberate, documented allow-list. **No stale or bypassable instance found**
in this set.

**Stale/bypassable guard search:** none of the guard tests inspected
(`healthConsentRouting.guard.test.js`, `onboardingConsentRouting.guard.test.js`,
`navigationTargets.guard.test.js`) showed evidence of pinning code that has
since changed — each anchors to a specific comment string in the source
(e.g. `"Article 9 health-data consent check"`) and would fail loudly
(`blockStart`/`blockEnd` assertions) if that anchor moved without the guard
being updated, rather than silently passing. This is a defensible pattern
given the stated constraint but is inherently fragile to comment-rewording;
flagged as P3 below (not urgent, self-detecting).

**Trivially bypassable:** the `navigationTargets.guard.test.js` "bare
navigate()" regex checks (`navigation\.navigate\(\s*['"]${route}['"]`)
would not catch a dynamically constructed route string
(`navigation.navigate(someVar)`) — a deliberate, narrow scope (documented
as pinning "the three audited dead ends" plus a canary list), not a defect,
but worth knowing the regex's blind spot.

---

## 4. E2E / QA

**Current state:** `.maestro/flows/01-article9-consent.yaml` (consent gate:
blocks-while-unticked, grants, withdrawal-surface-reachable-and-cancels) and
`02-workout-backgrounding.yaml` (blank session → add exercise → log set →
process death → restore via mini-bar → second set → finish). Both are
well-commented, self-sufficient, and explicitly guardrailed (no bypass of
consent/billing, real EU-Dublin Supabase against one dedicated throwaway
test user). Manual-dispatch-only, never per-PR (documented rationale:
~10-15 min emulator cost).

**Riskiest journeys with zero device coverage today:**
- A real purchase (Play Billing sandbox flow) end-to-end
- Restore-purchases on a fresh install
- Trial → downgrade cascade crossing a day boundary
- Food diary logging + sync (the largest domain by module count: 40 test
  files, but all unit-level)
- A genuine two-device sync conflict (edit offline on device A and B, then
  reconnect both)
- Notification delivery actually suppressed during quiet hours / under an
  open ED flag (unit-tested, never device-observed)

**Options for a minimal elite-grade device matrix (not a decision — founder
choice):**
- **Option A (narrowest addition):** one more flow — "trial start → Pro
  screen unlock → downgrade at trial end" — using the existing E2E test
  user and a fast-forwarded/mocked trial clock server-side, reusing the
  existing secrets and cadence (manual, pre-release).
- **Option B (moderate):** add 2 flows (purchase-sandbox + food-diary
  round-trip-through-sync) plus keep cadence manual; requires wiring Play
  Billing sandbox test-track credentials into CI secrets, which is new
  infrastructure.
- **Option C (broadest):** stand up a small device-lab matrix (3-4 flows
  covering purchase, restore, sync-conflict, ED-flag notification
  suppression) run on every release-candidate tag rather than fully manual;
  highest cost (secrets, runner time, maintenance), highest confidence.

---

## 5. CI

**What `release:check` gates** (from `package.json`):
`npm ci --legacy-peer-deps --ignore-scripts && npx tsc --noEmit --strict &&
npm run lint && npm run check:imports && npm test -- --runInBand && npm run
release:audit` (`npm audit --omit=dev --audit-level=high`). It does **not**
run Expo Doctor or Maestro — those live in separate CI surfaces
(`main-ci.yml`'s `expo-doctor` job; `maestro-e2e.yml`, manual-dispatch).

**`main-ci.yml`** runs three parallel jobs on push/PR: Jest (`--runInBand
--ci`, tee'd to `jest.log` with rich failure surfacing to step summary + PR
comment), ESLint (errors-only: `no-undef`, `react-hooks/rules-of-hooks`),
Expo Doctor.

**Flake risk / the worker force-exit warning:** already root-caused and
fixed per the workflow's own inline comment
(`.github/workflows/main-ci.yml`, the block above the `npx jest` step):
two leaked `setTimeout()`s in `HomeScreen`'s `useEffect` (lines 162-163)
were never cleaned up because the screen-mount test harness never unmounted
its trees. Fix: `src/__tests__/screen-mount.test.js` now registers every
`mountScreen`-created tree in a module-level array and drains/unmounts it in
a top-level `afterEach` (confirmed present, `trees` array + `mountScreen`
helper, `src/__tests__/screen-mount.test.js:377-386`). A soft "Jest did not
exit one second after the test run" advisory remains and is attributed
in-comment to Supabase realtime client + singleton teardown timing under
`--runInBand`; exit code stays 0, so this is informational, not a real leak,
per the same comment block. Nothing to fix here — flagging only because
the task brief asked to locate it.

**Not run in CI that arguably should be:** `expo-doctor` and Maestro both
exist but on different cadences (per-PR vs manual-dispatch) — this is a
documented, deliberate split, not an omission. One real gap: `tsc --noEmit
--strict` (part of `release:check`) does **not** appear to run in
`main-ci.yml`'s per-PR jobs — only ESLint and Jest do. A JSDoc-type
regression could land on `main` without being caught until someone runs
`release:check` by hand before a release.

---

## 6. TESTABILITY DEBT (top 5)

1. **`src/navigation/RootNavigator.js` (1,554 lines).** Not importable
   under the current Jest config (no native-module mocks) — three separate
   guard-test files say so explicitly (`authDeepLink.guard.test.js`,
   `healthConsentRouting.guard.test.js`, `onboardingConsentRouting.guard.test.js`).
   Every routing/consent/tier decision in the single navigator that gates
   the whole app is tested by regex-on-source, never by rendering.
2. **`src/lib/database.js` (7,255 lines).** Owns schema, all migrations, and
   all local reads/writes for every non-food domain. Migration tests
   (`migrations.cardioLog.test.js`) have to hand-roll a fake SQLite handle
   (`getFirstAsync`/`execAsync`/`withTransactionAsync` stubs) to drive real
   code — there's no injected DB seam, so every migration test pays this
   fixed cost and only one incident is covered end-to-end.
3. **`src/store/useAppStore.js` (1,841 lines, single Zustand store).** Only
   4 test files directly exercise it; most coverage of store-dependent
   behaviour comes indirectly through mocking
   `jest.mock('../../store/useAppStore')` in consumer tests rather than
   testing store logic itself (session/tier/consent transitions living in
   one 1,841-line file with no decomposition).
4. **`src/lib/food/db.js` (1,669 lines).** Mirrors `database.js`'s
   monolith pattern for the food domain; 40 test files under
   `src/lib/food/__tests__` cover surrounding logic (macros, gramSolve,
   waterfall) but the DB layer itself is tested the same fake-handle way.
5. **`src/lib/weeklyCoach.js` (1,537 lines).** The single weekly-coaching
   entry point (`runWeeklyCoach`) composing planEngine, nutritionEngine,
   edPatternDetector, wellbeing and coachApply; its size makes it hard to
   unit-test in isolation from its dependents, so coverage tends to land on
   the smaller modules it calls rather than the composition itself. (Given
   CLAUDE.md's "no I/O in engine modules" rule, correctness risk here is
   lower than the LOC alone implies — flagged for size/maintainability, not
   suspected bugs.)

---

## 7. WHAT IS ALREADY GOOD

- **ED-safety domain** (`coachApply.test.js`, `coachApplyView.test.js`,
  `edPatternDetector.test.js`, `wellbeing.test.js`,
  `wellbeingFailClosed.guard.test.js`) reads like an executable spec:
  tests carry regression comments naming the exact past bug ("Previously it
  floored everyone at 1200, so a male cut could be written below 1500"),
  cross-check two independent code paths (classifier vs real policy) for
  disagreement, and cover fail-closed behaviour explicitly.
- **Billing/cascade** tests are unusually rigorous for a "mocked RPC"
  domain: `cascade.lifecycle.test.js` asserts the *exact* server-contract
  payload shape sent to `upgrade_tier`/`start_cascade`, not just that a
  function resolves; `restore.test.js` specifically pins the
  awaited-vs-fire-and-forget distinction that a prior audit flagged.
- **Migration-ordering regression test** (`migrations.cardioLog.test.js`)
  is a genuinely well-built harness: it drives the real `runMigrations`
  export (not a copy) against a fake SQLite implementing just enough of the
  `expo-sqlite` async API surface to be faithful, for both a fresh install
  and the exact "one step behind top version" case that caused the real
  incident.
- **`screen-mount.test.js`** (2,410 lines) is a serious piece of test
  infrastructure: a shared `mountScreen` harness with per-tree error
  capture and a batch-unmount `afterEach`, applied across many of the 80
  screens — this is what closed the CI force-exit issue at its root cause
  rather than papering over it with `--forceExit`.
- **Telemetry catalogue test** (`telemetry.catalogue.test.js`) is a neat
  self-maintaining guard: it walks the whole `src/` tree plus `App.js`/
  `index.js` and asserts every non-deferred event name has a real emitter
  call site, with a documented, reasoned allow-list for the deferred ones.
- **Maestro flows** are unusually careful for a 2-flow E2E suite: explicit
  guardrails against bypassing consent/billing, real production-region
  Supabase with one disposable test user, and an in-file explanation of
  why the withdrawal flow cancels rather than completes (would delete the
  test account otherwise).

---

## SCOPE CUTS (stated per task brief)

- Full Jest run was not executed (read-only instruction); all "covered"
  claims are from reading test source, not from a live pass/fail run.
- Did not open all 428 test files; sampled representatively per domain and
  verified every explicitly-named critical path in §2 by reading its actual
  test body, not just its filename.
- Did not attempt to enumerate all ~40+ `SCHEMA_MIGRATIONS` entries
  individually; counted structurally (`user_version` regex hits, migration
  array bounds) rather than reading each block.
- Did not run `npx expo-doctor` or attempt to execute Maestro locally (no
  emulator in this environment).
