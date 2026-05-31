# 01 — Codebase inventory

Status: **COMPLETE** (Phase 1)
Date: 2026-05-31
Branch audited: `main` @ `a4bf964` (code baseline identical to `2943b55`;
the 3 commits since are audit-docs-only, verified via
`git diff --name-status 2943b55 HEAD` → 0 deletions, 3 additions).
Author: master audit session (Claude), rebuilt from direct verification.

> **Handoff note.** Every count in this document was produced this
> session by `git ls-files`, `git ls-tree`, `wc -l`, and direct reads,
> and is reproducible. A **prior version of this same file overstated
> the counts** (claimed 598 tracked files / 108 `.md`); the real numbers
> at that same baseline are 565 / 75 (now 568 / 78 with the audit docs).
> That prior overstatement is corrected here. The repo is a **JavaScript
> Expo / React Native app — not TypeScript** (an even earlier draft this
> session fabricated a TS codebase; discarded). If any later document
> contradicts this one, re-verify against the working tree.

---

## 1. What Volyume is (from code + root docs, structurally verified)

A single-codebase **Expo SDK 51 React Native** app: a hypertrophy /
physique training app with an integrated food-logging layer, a weekly
"coaching" adjustment engine, offline-first **SQLite** storage, and
**Supabase** cloud sync. App name `volyume`, version `1.1.0`
(`package.json:2-3`). Bundle/package id and deep-link scheme to be
confirmed against `app.json` in Phase 3 (not yet personally read).

## 2. Counts (directly verified this session)

| Metric | Count | How verified |
|---|---|---|
| Tracked files (git) | **568** | `git ls-files \| wc -l` |
| `.js` files | **379** | `git ls-files '*.js'` |
| `.md` docs | **78** | `git ls-files '*.md'` |
| `.sql` files | **60** | `git ls-files '*.sql'` |
| `.ts` files | **5** | `git ls-files '*.ts'` |
| `.swift` files | **4** | `git ls-files '*.swift'` |
| `.kt` files | **2** | `git ls-files '*.kt'` |
| Screens (`src/screens/*.js`) | **60** | `git ls-files 'src/screens/*.js'` |
| Components (`src/components/**`, excl `.test.`) | **49** | glob, grep -v `.test.` |
| Lib modules (`src/lib/**`, excl `.test.`) | **114** | glob, grep -v `.test.` |
| Test files (`*.test.js`) | **133** | `git ls-files '*.test.js'` |
| App source LOC (`src/**` non-test + `App.js`) | **83,854** | `wc -l` total |

> Note: there is **no `android/` native folder** in the tracked tree
> (the prior inventory listed one; `git ls-files | grep '^android/'`
> returns nothing). Native iOS/Android customisation lives in `modules/`
> (`.swift`/`.kt`) and `plugins/` (Expo config plugin) only.

## 3. `src/` subdirectory breakdown (verified)

| Dir | Non-test `.js` files |
|---|---|
| `src/lib` | 114 |
| `src/screens` | 60 |
| `src/components` | 49 |
| `src/styles` | 1 (`theme.js`) |
| `src/store` | 1 (`useAppStore.js`) |
| `src/navigation` | 1 (`RootNavigator.js`) |

## 4. Largest source files by LOC (verified `wc -l`, top 15)

| LOC | File |
|---|---|
| 5,574 | `src/lib/database.js` |
| 2,560 | `src/screens/ActiveWorkoutScreen.js` |
| 2,344 | `src/screens/HomeScreen.js` |
| 2,110 | `src/screens/CoachOutputScreen.js` |
| 1,732 | `src/lib/sync.js` |
| 1,716 | `src/screens/NutritionTargetsScreen.js` |
| 1,568 | `src/lib/seedRoutines.js` |
| 1,549 | `src/lib/planEngine.js` |
| 1,494 | `src/screens/ShareCardScreen.js` |
| 1,436 | `src/screens/AnalyticsScreen.js` |
| 1,435 | `src/screens/SettingsScreen.js` |
| 1,378 | `src/screens/ProOnboardingScreen.js` |
| 1,305 | `src/screens/WorkoutSummaryScreen.js` |
| 1,300 | `src/screens/WeeklyCheckInScreen.js` |
| 1,250 | `src/screens/ManualBuilderScreen.js` |

These very large single files are the highest-value targets for the
Phase 2 (code), Phase 6 (performance) and maintainability assessment.

## 5. Tech stack (from `package.json`, verified lines)

Runtime: `expo ~51.0.0`, `react 18.2.0`, `react-native 0.74.5`
(`package.json:39,62-63`).

- **Navigation:** `@react-navigation/native ^6.1.18`, `bottom-tabs
  ^6.6.1`, `stack ^6.4.1` (`:32-34`).
- **State:** `zustand ^4.5.2` (`:76`) — single store
  `src/store/useAppStore.js` (count confirmed: 1 store file).
- **Backend:** `@supabase/supabase-js ^2.43.4` (`:37`).
- **Local DB:** `expo-sqlite ~14.0.4` (`:55`).
- **Graphics/charts:** `@shopify/react-native-skia ^1.2.3` (`:36`),
  `react-native-svg 15.2.0` (`:71`).
- **Animation:** `react-native-reanimated ~3.10.1` (`:68`).
- **Payments:** `react-native-iap ^12.16.1` (`:67`).
- **Health:** `react-native-health 1.19.0` (`:65`),
  `react-native-health-connect 3.3.3` (`:66`), `expo-sensors` (`:53`).
- **Camera/scan:** `react-native-vision-camera ^4.7.3` (`:73`),
  `@react-native-ml-kit/text-recognition ^1.5.2` (`:31`).
- **Notifications:** `expo-notifications` (`:50`), `expo-task-manager`
  (`:58`), `expo-background-fetch` (`:42`).
- **Errors:** `@sentry/react-native ^6.22.0` (`:35`), excluded from
  `expo install` autoupgrade (`:92-98`).
- **Local native modules (`file:` deps):** `live-activity`
  (`:61`), `rest-timer-live` (`:75`) → `modules/`.
- **Dev:** `eslint ^9.39.4` flat config (`:82`), `jest ^29.7.0` +
  `jest-expo ~51.0.4` (`:85-86`), `babel-jest`, `xlsx ^0.18.5` (`:87`).
- **Jest config is inline** in `package.json:13-26` (node env, asset +
  url-polyfill mocks). No separate `jest.config.js`.

> **Dependency-usage — DEFERRED to Phase 2.** Whether every listed dep
> (e.g. `expo-print`, `expo-av`, `expo-store-review`, `xlsx`,
> `react-native-webview`) is actually imported is NOT yet verified.
> This will be a dead-dependency sweep in the per-file audit. No dep is
> asserted unused at this stage.

## 6. Top-level layout (verified `ls` + `git ls-files`)

```
App.js                root component (34 KB)
index.js              entry (registerRootComponent)
app.json              Expo config (perms, plugins, deep links) — not yet read
eas.json              EAS build profiles
eslint.config.js      flat ESLint config
babel.config.js       babel-preset-expo (+ reanimated plugin — to confirm)
metro.config.js       metro config
tsconfig.json         ambient TS settings (app is JS)
package.json          deps + inline jest config
__mocks__/            jest mocks (10 files)
assets/               icons/splash/seed (.dat) — 11 files
docs/                 65 docs (incl this audit folder)
modules/              2 local native modules (15 files; .swift/.kt/.ts)
plugins/              Expo config plugin (2 files)
public/               GitHub Pages site (9 files; privacy, app-map, CNAME)
scripts/              seed/CI scripts (5 files)
supabase/             schema + 60 .sql + edge functions (65 files)
tests/                12 files (incl simulator scenarios)
src/                  all app source (see §3)
```

Large root reference docs (sizes from `ls -la`): `ARCHITECTURE.md`
(83 KB), `VOLYUME_DEEPMAP.md` (50 KB), `APPMAP.md` (26 KB),
`INFRASTRUCTURE.md` (25 KB), `CLAUDE.md` (14 KB engineering rules),
`DOMAIN_SETUP.md` (6 KB). These are claims-about-the-app and will be
treated as **unverified secondary sources** — cross-checked against
code, never quoted as fact on their own.

## 7. Items explicitly NOT yet verified (carried into later phases)

These were asserted in the prior inventory but I have **not personally
read the implementing files yet**, so I record them as *to-verify*, not
as fact:

- **Navigation tree / tab structure / Pro-guard wrapping / deep-link
  routing** — requires reading `src/navigation/RootNavigator.js`,
  `App.js`, `app.json`. → **Phase 3.**
- **Two sync layers (legacy `sync.js` + modular `sync/`) and whether
  both are live** — requires reading both. → **Phase 2/5.**
- **Four monetisation surfaces (Paywall/ProUpgrade/Subscription/
  CascadeGate) and whether any is a dead end** — → **Phase 3/4.**
- **Migration backlog / unapplied cloud columns** — requires reading
  `supabase/` migrations + client query code. → **Phase 5.**
- **Bundle id, deep-link scheme, permissions** — from `app.json`. → **Phase 3.**

## 8. Static baseline status

Re-run independently in Phase 7 (`07-error-testing-results.md`). The
prior doc 07 reports ESLint 0 errors / 1665 warnings and Jest 133
suites / 2301 passed / 3 skipped; **these will be re-run and re-confirmed
by me before being treated as this audit's baseline**, not inherited.

## 9. Phase status tracker

- [x] **Phase 1 — codebase inventory (this doc) — COMPLETE & VERIFIED**
- [ ] Phase 2 — line-by-line code audit (`02-code-audit.md`)
- [ ] Phase 3 — navigation & flow (`03-navigation-flow-audit.md`)
- [ ] Phase 4 — feature audit (`04-feature-audit.md`)
- [ ] Phase 5 — security (`05-security-audit.md`)
- [ ] Phase 6 — performance (`06-performance-audit.md`)
- [ ] Phase 7 — error testing (`07-error-testing-results.md`)
- [ ] Phase 8 — competitor/sentiment (`08-competitor-user-sentiment.md`)
- [ ] Phase 9 — design/UX (`09-design-ux-audit.md`)
- [ ] Phase 10 — journey/psychology (`10-user-journey-psychology-audit.md`)
- [ ] Phase 11 — master recommendations (`11-master-recommendations.md`)
- [ ] Phase 0 — executive summary (`00-executive-summary.md`, last)
