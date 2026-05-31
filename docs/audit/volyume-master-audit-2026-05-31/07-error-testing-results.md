# 07 — Error testing & static analysis results

Status: **IN PROGRESS** — static-analysis baseline COMPLETE (independently
re-run this session); navigation & edge-case simulation PENDING (depend on
Phases 3/4).
Date: 2026-05-31
Branch: `main` @ `a4bf964`

> Every number in section A was produced by me this session by running the
> command and reading its output — not inherited from the prior doc. Where
> my result matches the prior doc's, I say so explicitly.

---

## A. Static analysis — COMPLETE (re-run 2026-05-31)

### A.1 ESLint (`npx eslint . -f json`)
- **0 errors, 1665 warnings** across **373 linted files**.
- Breakdown by rule (from my JSON run):
  - `no-unused-vars` — **1613**
  - `react-hooks/exhaustive-deps` — **52**
- **This matches the prior doc 07 exactly** (0 / 1665), so the baseline is
  confirmed trustworthy.
- **Root cause of the 1613 unused-var warnings (verified, not assumed):**
  `eslint.config.js:111` registers only the `react-hooks` and `import`
  plugins — **`eslint-plugin-react` is not enabled**, so there is no
  `react/jsx-uses-vars` rule. Identifiers used *only* in JSX (`View`,
  `Text`, imported components, `Ionicons`, etc.) are therefore reported
  as unused. **Consequence:** the warning list cannot distinguish JSX
  usage from genuine dead code, so real dead code is hidden in the noise.
  → **Phase 11 quick win:** add `eslint-plugin-react` with
  `jsx-uses-vars`/`jsx-uses-react`, which will collapse most of the 1613
  and expose the genuinely-unused locals.
- Design-token discipline is enforced as **errors** (not warnings) on
  `src/screens/**` + `src/components/**`: no hardcoded hex
  (`eslint.config.js:151`), no `rgba()/rgb()` (`:155`), no raw `fontSize`
  literal (`:159`), no raw `fontWeight` literal (`:163`). **None fired**
  (0 errors), so token discipline is currently holding in CI.
  `ShareCardScreen.js` is exempted (`:146`) because it builds offline HTML.
- `scripts/**` and `*.config.js` are **ignored** by lint
  (`eslint.config.js:87-88`) — flag: those files get no static analysis.

### A.2 Jest (`npx jest --ci --runInBand`)
- **Exit code 0.**
- **Test Suites: 133 passed / 133 total.**
- **Tests: 2301 passed, 3 skipped, 2304 total.**
- **Snapshots: 25 passed.**
- **Time: 70.0 s.**
- **Matches the prior doc 07 exactly** — confirmed.
- Note carried for Phase 6: the suite is broad on the lib/engine layer and
  includes screen-mount sweeps, but screen-mount tests prove a screen
  *renders*, not that its interactions/navigations resolve (Phase 3 work).

### A.3 npm audit (`npm audit --json`) — run this session
- **32 vulnerabilities total: 18 high, 13 moderate, 1 low, 0 critical.**
- **18 high** are almost entirely **transitive through the Expo
  build/dev toolchain** — not shipped runtime code:
  - `@xmldom/xmldom` — XML injection via unsafe CDATA serialization (via
    `@expo/plist` ← `@expo/config-plugins` ← `@expo/config` ← `expo`,
    `@expo/cli`, `expo-updates`, `expo-notifications`, `expo-constants`,
    `jest-expo`, `react-native-health`).
  - `tar` / `cacache` — arbitrary file create/overwrite via hardlink path
    traversal (build-time).
  - `xlsx` (SheetJS) — **Prototype Pollution**. **This is the one
    runtime-relevant high**: `xlsx` is a direct dependency
    (`package.json:87`) and is used to parse user-supplied import files
    (to be confirmed in Phase 5 by tracing the Import screen). A malicious
    spreadsheet could exploit it. → **carry to `05-security-audit.md`.**
- Full advisory list captured; detail and remediation options
  (`npm audit fix` impact, `xlsx` upgrade/replacement) belong in Phase 5.

### A.4 TypeScript strict — N/A
The app is JavaScript (`tsconfig.json` is ambient only; `git ls-files
'*.ts'` returns 5 files — 3 Supabase edge functions + 2 native-module
indexes — none in `src/`). There is no `tsc` gate. **Finding for
Phase 2/11:** no static type checking on an ~84k-LOC codebase; type
safety rests entirely on tests + the minimal ESLint gate.

### A.5 Jest open-handle note
Prior doc noted Jest printed a "did not exit one second after the test
run" open-handle warning. My `--silent` run completed cleanly at 70s; I
did not run `--detectOpenHandles` this pass. → **Phase 6** will run
`--detectOpenHandles` to locate any leaking timer/subscription
(relevant to the memory-leak check; `App.js` registers several timers and
listeners — see `02-code-audit.md` A2-001).

---

## B. Navigation simulation — PENDING (after Phase 3)

## C. Edge-case simulation (empty / error / offline / max-data / rapid-tap)
— PENDING (after Phase 4)

## D. New tests added by this audit — PENDING (Phase 12)
