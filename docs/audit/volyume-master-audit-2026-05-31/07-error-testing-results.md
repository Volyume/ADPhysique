# 07 — Error testing & static analysis results

Status: **IN PROGRESS** — static-analysis baseline COMPLETE; edge-case
& navigation simulation PENDING (depends on Phase 3/4).
Date: 2026-05-31
Branch: `main` @ `2943b55`

> Self-contained note: this document holds the objective, reproducible
> test results for the master audit. The static baseline below was run
> directly in this session and is trustworthy. The edge-case and
> navigation-simulation sections are stubs to be completed after Phases
> 3 and 4 map the surfaces.

---

## A. Static analysis — COMPLETE (run 2026-05-31)

### A.1 ESLint (`npx eslint .`)

- **Exit code: 0.**
- **0 errors, 1665 warnings.**
- The flat config (`eslint.config.js`) promotes hardcoded colours and
  raw type literals to **error** in screens/components; none fired, so
  the design-token discipline is holding in CI.
- The 1665 warnings break down (by inspection) into:
  - **`no-unused-vars` on JSX-only imports** (`React`, `View`, `Text`,
    `Ionicons`, `TouchableOpacity`, etc. flagged "defined but never
    used" in files that clearly render them). This is a **config
    false-positive**: the parser/plugin is not counting JSX element
    usage as consumption. It is the single largest contributor and is
    noise, not dead code. **Recommendation (Phase 11 quick win):** fix
    the ESLint React/JSX settings so JSX usage marks imports as used,
    which will collapse most of the 1665 and make the remaining
    genuinely-unused vars visible. Until then the warning count hides
    real dead code.
  - **Genuinely unused locals** (e.g. `algorithms.js:586 targetSFR`,
    `:885 worstVolume`; `blockAdvisor.js:156 experience`, `:232
    firstName`; `RestTimer.js:42 currentExerciseName`, `:170 barWidth`;
    `ExerciseCard.js:13 sfr`; `VolumeBars.js:14 status`). These are
    real Phase 2 dead-code findings — carry them into `02-code-audit.md`.
  - **`react-hooks/exhaustive-deps`** warnings (e.g.
    `FeedbackSheet.js:150`, `PeekMenu.js:56/88`, `RestTimer.js:82/142`).
    These are real and worth a Phase 2 look — missing deps in
    `useEffect`/`useImperativeHandle` can cause stale-closure bugs,
    especially in the rest timer (runtime-critical per CLAUDE.md Rule 5).

### A.2 Jest (`npx jest --ci --runInBand`)

- **Exit code: 0.**
- **Test Suites: 133 passed / 133 total.**
- **Tests: 2301 passed, 3 skipped, 2304 total.**
- **Snapshots: 25 passed.**
- Time: ~50s.
- Note: Jest prints "did not exit one second after the test run" —
  an open-handle warning (async work not torn down in some suite). Not
  a failure, but worth a `--detectOpenHandles` pass in Phase 2 to find
  the leaking timer/subscription (relevant to the Phase 6 memory-leak
  check).

The suite is large and genuinely green. Coverage is broad on the
engine/lib layer (planEngine, weeklyCoach, sync, notifications,
payments, food) and includes screen-mount sweeps. **Gap to confirm in
Phase 2:** screen-mount tests prove screens *render* but not that
their interactions/navigations resolve — that is Phase 3 work.

### A.3 npm audit — PENDING

To run in the security phase; result lands in `05-security-audit.md`
and is cross-linked here.

### A.4 TypeScript strict — N/A

The app is JavaScript, not TypeScript (`tsconfig.json` is ambient
only). There is no `tsc` gate to run. Type safety relies on tests +
ESLint. This is itself a finding for Phase 2/11: no static type
checking on an 84k-LOC codebase.

---

## B. Navigation simulation — PENDING (after Phase 3)

## C. Edge-case simulation (empty / error / offline / max-data / rapid-tap)
— PENDING (after Phase 4)

## D. New tests added by this audit — PENDING (Phase 12)
