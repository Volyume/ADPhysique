# 07 — Error Testing & Static Analysis Results

Status: **COMPLETE** (static + existing-suite + navigation + edge-case tracing).
Date: 2026-05-31
Every number below was produced by a command run in THIS session and is
reproducible.

---

## A. Static analysis

### A.1 ESLint (`npx eslint . -f json`) — re-run 2026-05-31
- **Exit 0. 0 errors, 1665 warnings** across 373 files (reproduced exactly).
- Breakdown: **1613 `no-unused-vars`** + **52 `react-hooks/exhaustive-deps`**.
- The 1613 unused-vars are dominated by a **config false-positive**: the
  flat config registers `react-hooks` + `import` plugins but **no
  `eslint-plugin-react`**, so JSX-referenced identifiers (`View`, `Text`,
  `Ionicons`) aren't counted as used. This **hides genuine dead code**.
  → **Phase 11 quick win:** add `eslint-plugin-react` (jsx-uses-vars) so the
  count collapses to the real unused vars (the ones confirmed in Phase 2:
  `algorithms targetSFR/worstVolume`, `ExerciseCard sfr`, `RestTimer
  currentExerciseName/barWidth`).
- The 52 exhaustive-deps are real but mostly design-compensated; none
  observed to cause a stale-closure bug. Worth deliberate disables-with-reason.
- **Design-token guards held**: 0 hardcoded-hex / raw-fontSize errors in
  screens/components (ShareCard exempt). CI gate working.

### A.2 Jest (`npx jest --ci --runInBand`) — re-run 2026-05-31
- **Exit 0. Test Suites: 133 passed / 133. Tests: 2301 passed, 3 skipped,
  2304 total. Snapshots: 25 passed. Time: ~48s.**
- Broad engine/lib coverage: algorithms (31), weeklyCoach (51), planEngine
  (70), sync regression matrix, notifications, payments, food, sentryScrub,
  chartGeometry, screen-mount sweeps. **Genuinely green.**
- Jest prints "did not exit one second after the test run" — an open-handle
  warning (a timer/sub not torn down in some suite). Not a failure; a
  `--detectOpenHandles` pass would localise it. Low.

### A.3 npm audit — run 2026-05-31
- **32 vulns: 18 high, 13 moderate, 1 low, 0 critical.** Full analysis in
  `05-security-audit.md §8`: the 18 high are the Expo build toolchain +
  `xlsx` (devDependency) — **build-time, not shipped runtime**. Resolve on
  the next Expo SDK bump.

### A.4 TypeScript — N/A
JavaScript app (`tsconfig.json` ambient only). **No `tsc` gate** on ~84k
LOC; type safety rests on tests + ESLint. A finding for Phase 11 (no static
type checking), not a short-term fix.

---

## B. Navigation simulation (traced, Phase 3)
Every `navigation.navigate/replace/push` target cross-referenced to a
registered `<Stack.Screen name>` — **all resolve; no runtime "screen not
found" reachable from in-app call sites.** `heroZoomTransition` guards
`current.progress` undefined (documented crash fix); tab-icon lookup has an
`'ellipse'` fallback. No nav path traced to a throw. (Detail: `03-…md`.)

---

## C. Edge-case simulation (traced through the actual code)

**Empty state:** Home renders skeletons → empty-state cards (cloud-sync bump
re-runs loadData so empty swaps for data); Diary `EmptyDiary` verbatim copy;
Plans/PRWall/Analytics empty illustrations; thin-data coach returns a
`data_hold` card rather than acting on noise. ✔

**API / network failure:** food waterfall has per-source AbortController
timeouts → falls through to next source → clean empty + manual entry; sync
is fire-and-forget + retry queue (backoff) + watermark-not-advanced-on-fail;
cloud-read 10s timeout → optimistic local decision; Article-9 network
failure → local consent, user not stranded. ✔ Downsides: invisible sync
failures (A2-006) and silently-swallowed auth-deeplink failure (A2-004).

**Offline:** offline-first (SQLite source of truth) — logging/plans/history
work offline, sync drains on reconnect. Sign-out **blocked offline** by
design (push-first safety, A2-023) — deliberate, with a UX cost.

**Rapid repeated taps:** functional `set()` for add-set/add-exercise
(documented double-tap fix); `finishingRef` gates finish; onboarding
`handleNext` re-checks step in the setter (documented crash fix); set-save
`saving` flag. **Protections present at the hot paths.** ✔

**Max data:** history/library virtualised (FlatList); watermark delta-pull
caps re-download; CSV import capped 100k rows; uploads batched with yields.
No unbounded in-memory list render found.

---

## D. New tests added by this audit
**None added.** The existing suite is large and green; Rule 5 forbids code
changes until findings are approved. Test additions belong in **Phase 12**,
alongside the fixes they protect — specifically recommended for: the units
conversion layer (A2-043), the sync-dedup refactor (A2-001), and
`scheduleSync` debounce/cancel (A2-030, currently no-op'd under Jest).

---

## Testing verdict
Static gates **green and reproducible** (0 lint errors, 133/133 suites,
2301 tests). No runtime "screen not found" reachable from in-app nav. Edge
cases handled in code at the points that matter, with two real UX gaps
(silent auth-deeplink failure A2-004, invisible sync failures A2-006).
Genuine infra gaps: no TypeScript on 84k LOC, the JSX unused-vars
false-positive hiding dead code, a Jest open-handle warning — carried to
Phase 11.
