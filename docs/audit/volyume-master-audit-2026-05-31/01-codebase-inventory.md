# 01 — Codebase inventory

Status: **COMPLETE** (Phase 1)
Date: 2026-05-31
Branch audited: `main` @ `2943b55` (verified 0 ahead / 0 behind `origin/main`, clean tree)
Author: audit session (Claude)

> Self-contained handoff note. This is the first document of the
> 2026-05-31 master audit. Every claim here was checked against real
> files via `git ls-files`, `wc -l`, and direct reads. An earlier draft
> of this audit (same session) fabricated a TypeScript codebase that
> does not exist; that draft is discarded. The repo is a **JavaScript
> Expo / React Native app**, not TypeScript. If a later document
> contradicts this one, re-verify against the working tree before
> trusting either.

---

## 1. What Volyume is

A single-codebase Expo (SDK 51) React Native app — a hypertrophy /
physique training app with an integrated food-logging layer, a
"Precision Coaching" weekly-adjustment engine, offline-first SQLite
storage, and Supabase cloud sync. Dark-only UI, amber accent
(`#F5A623`), brand background `#0D0D0D`. Currently in Play Console
closed testing (versionCode 5, v1.1.0); release frozen by founder
direction until the whole product is built out.

Package name / bundle id: `app.volyume`. Deep-link scheme `volyume://`
+ universal links on `volyume.app`.

## 2. Counts (verified)

| Metric | Count |
|---|---|
| Tracked files (git) | 598 |
| `.js` files | 379 |
| `.md` docs | 108 |
| `.sql` files | 60 (56 `migrate_*` + schema/setup/audit/nuke) |
| `.ts` files | 5 (3 Supabase edge functions + 2 native module index.ts) |
| Screens (`src/screens/*.js`) | 60 |
| Components (`src/components/**/*.js`, excl tests) | 49 |
| Lib modules (`src/lib/**/*.js`, excl tests) | 114 |
| Test files (`*.test.js`) | 133 |
| Cloud migrations (`supabase/migrate_*.sql`) | 56 |
| Edge functions | 3 (delete-account, play-billing-rtdn, send-push) |
| App source LOC (src + App.js, excl tests/mocks) | ~83,854 |

## 3. Tech stack (from package.json, verified)

Runtime: `expo ~51.0.0`, `react 18.2.0`, `react-native 0.74.5`.

Navigation: `@react-navigation/native` 6, `bottom-tabs` 6, `stack` 6.
State: `zustand ^4.5.2` (single store `src/store/useAppStore.js`).
Backend: `@supabase/supabase-js ^2.43.4`.
Local DB: `expo-sqlite ~14.0.4`.
Charts/graphics: `@shopify/react-native-skia`, `react-native-svg`.
Animation: `react-native-reanimated ~3.10.1` + RN `Animated`.
Payments: `react-native-iap ^12.16.1` (Google Play Billing).
Health: `react-native-health` (Apple), `react-native-health-connect`
(Android), `expo-sensors`.
Camera/scan: `react-native-vision-camera`, `@react-native-ml-kit/text-recognition`.
Notifications: `expo-notifications`, `expo-task-manager`,
`expo-background-fetch`.
Errors: `@sentry/react-native ^6.22.0`.
Native modules (local, `file:` deps): `live-activity` (iOS Live
Activity rest timer), `rest-timer-live` (Android foreground-service
rest timer).

Dev: `eslint ^9.39.4` (flat config `eslint.config.js`), `jest ^29.7.0`
+ `jest-expo`, `babel-jest`, `xlsx` (import/export).

> **Dependency-usage note (to verify in Phase 2):** package.json lists
> `tsconfig.json` exists but the app is JS; TypeScript is not a build
> dependency, only ambient. Confirm whether `expo-print`, `expo-av`,
> `xlsx` etc. are all actively imported during the per-file audit. Not
> yet confirmed unused — flagged for Phase 2 dead-code sweep.

## 4. Top-level layout (verified `ls` + `git ls-files`)

```
App.js                  app root: error boundary, providers, bg tasks, bootstrap
index.js                registerRootComponent(App)
app.json                Expo config (perms, plugins, deep links)
eas.json                build profiles (dev/preview/production)
eslint.config.js        flat ESLint config (CI lint guards live here)
babel.config.js         babel-preset-expo + reanimated plugin
metro.config.js         metro bundler config
tsconfig.json           ambient TS settings (app is JS)
package.json            deps + inline jest config
android/                native android project (prebuild output, partially tracked)
assets/                 icons, splash, seed data (.dat snapshots)
modules/                two local native modules (live-activity, rest-timer-live)
plugins/                expo config plugin (withHealthConnectPermissionDelegate)
public/                 GitHub Pages site (privacy policy, app-map, assetlinks)
scripts/                seed builders (CoFID, OFF snapshots), identity CI check
supabase/               schema.sql, 56 migrations, 3 edge functions, README tracker
docs/                   108 markdown docs (locked specs, audits, status)
src/                    all app source (see §5)
__mocks__/              jest mocks (expo-sqlite, async-storage, reanimated, etc.)
tests/simulator/        coaching-engine scenario simulations (12 scenarios)
```

Large root markdown docs (architecture references): `ARCHITECTURE.md`
(83 KB), `VOLYUME_DEEPMAP.md` (50 KB), `APPMAP.md` (26 KB),
`INFRASTRUCTURE.md` (25 KB), `CLAUDE.md` (engineering rules).

## 5. `src/` structure (verified)

```
src/
  navigation/RootNavigator.js   1065 LOC — the whole nav tree + bootstrap
  store/useAppStore.js          910 LOC — single zustand store
  styles/theme.js               design tokens (colors, fontSize, spacing, …)
  screens/                      60 screens (see §6)
  components/                   49 shared components
    food/                       food-domain components (rings, rows, sheets)
  lib/                          114 modules — the engine + data layer
    database.js                 5574 LOC — SQLite schema + all repositories
    sync.js                     1732 LOC — legacy sync layer
    sync/                       modular per-table sync (registry, runner, tables/)
    food/                       food engine (db, waterfall, sources, normalisers)
    notifications/              foreground handler, scheduler, channels, push
    payments/                   Play Billing, cascade, catalogue, restore
    telemetry/                  event allow-list, transport, sentry bridge
    observability/              sentry scrub
    planEngine.js / poolGenerator.js / weeklyCoach.js / algorithms.js  coaching
    seedExercises.js / seedRoutines.js  built-in library + routines
```

## 6. Navigation map (verified from RootNavigator.js)

Entry: `index.js` → `App` → `<ErrorBoundary><GestureHandlerRootView>
<SafeAreaProvider><ToastProvider><FeedbackProvider><RootNavigator/>`
+ overlays (PRCelebration, WhatsNewSheet, CrashRecoveryToast).

`RootNavigator` gates between flows by store state, in priority order:
1. no `tier` → **WelcomeStack** (Welcome, Login, Onboarding)
2. signed-in cloud user + `healthConsent === false` → **Article9ConsentStack**
3. `!firstRunComplete` → **ProOnboardingStack** (pro) or **FirstRunStack** (free)
4. else → **MainTabs**

MainTabs (5 tabs, `lazy={false}`):
- **HomeTab** "Train" → HomeStack: Home, BuildWorkout, ActiveWorkout,
  WorkoutSummary, WorkoutHistory, VolumeHeatmap, ShareCard, CoachReview,
  ProUpgrade
- **PlansTab** "Plans" → PlansStack: Plans, PlanDetail, RoutineDetail,
  ExerciseLibrary, ExerciseDetail, ManualBuilder, PlanLibrary,
  MesocycleBuilder, ProUpgrade
- **DiaryTab** "Diary" → DiaryStack: Diary, FoodSearch, AddCustomFood,
  ScanBarcode, ScanLabel, FoodInsights, MyRecipes, MyMeals, RecipeBuilder
- **ProgressTab** "Progress" → ProgressStack: Analytics, WorkoutHistory,
  WorkoutSummary, VolumeHeatmap, PRWall, CoachReview, BodyMetrics,
  LiftProgress, ExerciseLibrary, ExerciseDetail, YearOfLifts, ShareCard,
  ProUpgrade
- **ProfileTab** "You" → ProfileStack: You, Settings, NutritionTargets,
  NutritionEducation, BodyMetrics, WeeklyCheckIn, CoachOutput, ShareCard,
  CoachHeldHistory, BlockReflection, ProGoalSetup, GoalChangeSummary,
  GoalLockConsent, NotificationSettings, Import, CoachingReminders,
  WellbeingCheck, PrivacyPolicy, DebugLog, SubscriptionPolicy,
  Subscription, CascadeGate, Paywall, Credits, ProUpgrade

Pro gating: six screens wrapped in `withProGuard` (WeeklyCheckIn,
NutritionTargets, BodyMetrics, CoachOutput, ProGoalSetup,
CoachingReminders) — guard enforces tier regardless of entry path.

Deep-link routing (notification tap, verified): only two mappings —
`weekly_checkin` → ProfileTab/WeeklyCheckIn, `year_of_lifts_unlock` →
ProgressTab/YearOfLifts. **Flag for Phase 3:** deep-link coverage is
narrow; the `volyume://` scheme + universal links are declared in
app.json but the in-app `routeFor()` handles only 2 types.

## 7. Screens not (yet) confirmed reachable — Phase 3 follow-ups

These exist as files/imports; reachability to be traced in Phase 3:
- `WelcomeScreen` Free/Pro CTA targets (identity spec says both →
  sign-up) — verify against code.
- `AthleteHubScreen` — **does NOT appear** in RootNavigator imports or
  routes (per the 2026-05-31 status note it was removed). Confirm the
  file is gone from `git ls-files` (it is not in the screen list).
- `FoodInsightsScreen`, `MyMealsScreen`, `NutritionEducationScreen`,
  `BlockReflectionScreen`, `CoachHeldHistoryScreen`,
  `GoalChangeSummaryScreen`, `ProUpgradeScreen` vs `PaywallScreen` vs
  `SubscriptionScreen` vs `CascadeGateScreen` (four monetisation
  surfaces — confirm each has a live entry point and they don't
  overlap confusingly).

## 8. Build / CI surface (verified `git ls-files`)

GitHub workflows: `build-android.yml` (APK/AAB sideload),
`main-ci.yml` (jest + eslint + expo-doctor + identity grep),
`identity-invariant.yml`, `deploy-functions.yml`, `deploy-pages.yml`,
`refresh-off-snapshot.yml`. No Maestro/E2E (removed 2026-05-29).

Identity CI guard: `scripts/check-identity-invariant.sh` greps for
`SET user_id` and fails the build on any match
(IDENTITY_AND_OWNERSHIP_LOCKED.md rule 3).

## 9. Immediate inventory-level observations (to pursue in later phases)

1. **Very large single files.** `database.js` (5,574), `ActiveWorkoutScreen.js`
   (2,560), `HomeScreen.js` (2,344), `CoachOutputScreen.js` (2,110),
   `sync.js` (1,732). These are maintainability risks and the highest-
   value targets for the Phase 2 code audit and Phase 6 perf audit.
2. **Two sync layers coexist** — legacy `sync.js` (1,732 LOC) and the
   modular `sync/` (registry + runner + per-table). Status docs say the
   legacy→modular refactor was deliberately not finished (high
   regression risk on the most fragile subsystem). Phase 2/5 must check
   whether both are live and whether they can disagree.
3. **Four monetisation screens** (Paywall, ProUpgrade, Subscription,
   CascadeGate) — Phase 3/4/10 to confirm no dead-end or confusing
   overlap.
4. **Migration backlog.** Per CURRENT_STATUS §3 + supabase/README,
   migrations 048, 050–055, 058 are pending founder apply; 049 held.
   Phase 5 must check client code does not hard-depend on unapplied
   cloud columns in a way that breaks the frozen build contract.
5. **Test suite is large (133 files)** — running now (Phase 7). Result
   pending in `07-error-testing-results.md`.

## 10. Phase status tracker

- [x] Phase 1 — codebase inventory (this doc)
- [ ] Phase 2 — line-by-line code audit (`02-code-audit.md`)
- [ ] Phase 3 — navigation & flow (`03-navigation-flow-audit.md`)
- [ ] Phase 4 — feature audit (`04-feature-audit.md`)
- [ ] Phase 5 — security (`05-security-audit.md`)
- [ ] Phase 6 — performance (`06-performance-audit.md`)
- [ ] Phase 7 — error testing (`07-error-testing-results.md`) — lint+jest running
- [ ] Phase 8 — competitor/sentiment (`08-competitor-user-sentiment.md`)
- [ ] Phase 9 — design/UX (`09-design-ux-audit.md`)
- [ ] Phase 10 — journey/psychology (`10-user-journey-psychology-audit.md`)
- [ ] Phase 11 — master recommendations (`11-master-recommendations.md`)
- [ ] Phase 0 — executive summary (`00-executive-summary.md`, written last)
