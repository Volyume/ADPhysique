# E8 — Play vitals budgets + bundle-cuts proposal (approved 2026-07-03)

Both items founder-approved in the 2026-07-03 decision batch
(docs/decisions-2026-07-02-e15-e8-e9.md, second batch). The budgets are
doc-only; every bundle cut below is a PROPOSAL and changes nothing until
individually approved.

## 1. Play vitals budgets (doc-only, in force now)

Volyume ships straight to production on Play, so vitals come from real
users. Check per release in Play Console -> Quality -> Android vitals:

| Metric | Budget | Google's bad-behaviour threshold |
|---|---|---|
| Crash-free sessions | >= 99.5% | n/a (self-imposed) |
| ANR rate | <= 0.47% | 0.47% (visibility penalty above it) |

Rules of engagement:
- A release that pushes either metric past budget freezes further feature
  releases until the regression is found (vitals identify the offending
  version directly).
- The classic startup-ANR source the baseline flagged (eager tab mounting)
  is already resolved (tabs lazy since F6b); the remaining watchpoint is
  cold-start work on the JS thread (database migrations + seed imports).
- Optional per release (founder's choice, recorded 2026-07-03): upload the
  same AAB to a closed testing track to get Google's free ~10-device
  pre-launch robo report. Not generated for production-only uploads.

## 2. Bundle-cuts proposal (nothing applied; approve per item)

Baseline facts (audit/perf-baseline.md §3, measured): 7.67 MB Hermes
bundle; top offenders and the proposed cut for each:

### Cut 1 — Sentry browser-only modules (~260 KB JS)
`@sentry-internal/replay` (130.5 KB), `@sentry/browser` (78.4 KB) and
`@sentry-internal/feedback` (49.0 KB) are web-only surfaces bundled into a
native app. Proposal: pin `@sentry/react-native`'s tree-shaking flags in
metro config (`__SENTRY_DEBUG__: false` and the documented
`@sentry/react-native/metro` serializer options) so replay/feedback/browser
code drops out. Risk: low (documented Sentry knobs); verify with a fresh
source-map-explorer run.

### Cut 2 — vector-icon fonts (~2 MB APK, not JS)
`@expo/vector-icons` ships every vendor font; the app uses Ionicons only.
MaterialCommunityIcons.ttf alone is 1.31 MB. Proposal: exclude unused
fonts from the Android build via expo-build-properties'
`android.extraProguardRules`? No — fonts are assets, not code. The
supported route is `expo-font`'s selective loading plus an
`assetBundlePatterns`/gradle exclude for the unused ttfs. Needs a spike to
confirm the clean Expo-managed mechanism; proposal is the spike first,
cut second. Risk: medium (a missed glyph renders as tofu).

### Cut 3 — date-fns tree-shaking (~100+ KB of 170.3 KB)
170 KB suggests non-tree-shaken imports (`import { format } from
'date-fns'` is fine; `import * as dateFns` or deep chains are not).
Proposal: audit the ~30 import sites; convert any namespace imports to
named-function imports. Risk: low, mechanical.

### Cut 4 — seed data out of the JS bundle (~275 KB)
`formTips.js` (129.2 KB), `seedRoutines.js` (98.9 KB) and
`seedExercises.js` (46.6 KB) compile into the bundle and evaluate whenever
imported. The food seeds already use the .dat asset + snapshot-import
pattern (`assets/seed/*.dat`); proposal: move these three to the same
pattern. Risk: medium (touches first-run seeding; the OFF/CoFID importer
pattern is proven but this path seeds TRAINING data, so it gets the full
regression treatment and a device-walk first-install checklist).

### Explicitly NOT proposed
- Removing @shopify/react-native-skia (267 KB): it is the app's one chart
  engine and the widget/CTA work uses it. Earns its size.
- react-native-reanimated (685 KB): the motion system's engine.
- Code-splitting screens: Hermes + Metro do not support async chunks in
  a way that pays here; 82 screens at 1.19 MB is ordinary for the surface
  area.

## Recommendation

Order by value/risk: Cut 3 (mechanical) -> Cut 1 (documented knobs) ->
Cut 4 (careful, test-heavy) -> Cut 2 (spike first). Each lands as its own
commit with a fresh bundle measurement in the message; nothing starts
until the founder approves the specific cut.
