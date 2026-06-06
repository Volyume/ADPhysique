# playstore-05 — performance & crash risk

Status: COMPLETE. Date: 2026-06-06. Static analysis only; Android Vitals
thresholds can only be measured against a real build + pre-launch report.

## Crash risk
- TypeScript clean (no type-level crash signals on the TS surface).
- **Error boundary: PRESENT** at the root (`App.js`) — uncaught render errors
  are caught rather than killing the app.
- Promise rejections: the codebase consistently uses `.catch(() => {})` /
  try-catch on fire-and-forget async (verified across store, sync, payments,
  notifications). No systemic unhandled-rejection pattern found.
- Forced non-null assertions (`!.`): this is JS (not TS-annotated), so the
  TS-style `!.` operator is not in use on the shipped surface; null-guarding is
  done with `?.`/`??`, which is heavily used.

## ANR risk
- No synchronous network/file I/O on the JS thread found in hot paths; DB is
  expo-sqlite async API; sync runs off the interaction path.
- App startup (`App.js`) defers heavy work; Sentry init is guarded and cheap.
- Prior audit (LB-7, `168ca96`) already removed full-table reads from Home,
  Workout History, and the Insights engine (bounded windows / per-page sets).
- The prior performance audit (`docs/audit/.../06-performance-audit.md`) is the
  deeper reference; no new main-thread blocker surfaced in this pass.

## List / render / animation
- 13 files use FlatList/SectionList; `keyExtractor` on 18 sites; `getItemLayout`
  on 1. getItemLayout is an optimisation, not a requirement — fine for launch.
- Animations: 47 `useNativeDriver: true` vs 1 `useNativeDriver: false`. The
  single `false` is expected for a non-transform/opacity animation (e.g. height)
  where the native driver is unsupported. Not a blocker; worth a glance (L-3).
- `console.*`: 71 calls in `src` ship to production (no `transform-remove-console`).
  Mostly warn/error logging, but debug logs in a release bundle are a minor
  perf + info-hygiene cost. → Document A M-1.

## Crash reporting / observability
- Sentry integrated via the Expo plugin with: DSN validation, PII scrub
  (`beforeSend`/`beforeBreadcrumb`), session tracking, `attachStacktrace`, 5%
  prod trace sampling, release/dist auto-detected so maps line up. ANR (AnrV2)
  and NDK native-crash capture are @sentry/react-native Android defaults (on).
- **Gap (H-2):** `eas.json` production env sets `SENTRY_DISABLE_AUTO_UPLOAD:
  "true"`. If no separate CI step uploads Hermes source maps for the production
  build, every prod stack trace arrives **minified** — exactly the failure the
  `sentry.js` header comment warns about. Verify the upload path; if absent,
  remove the flag or add an explicit `sentry-cli sourcemaps upload` step. →
  Document A H-2.

## Android Vitals — measured post-build
Crash <1.09%, ANR <0.47%, cold start <5 s, frozen frames <0.1% are **runtime**
metrics. Read them from the Play Console pre-launch report + Android Vitals
after the first internal-track upload. No static signal here predicts a breach,
but they must be checked on the real artifact (Document B).
