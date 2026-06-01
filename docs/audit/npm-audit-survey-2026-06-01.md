# npm audit survey, 2026-06-01

Tier 5 #5 from the master audit: run `npm audit`, classify the advisories by
reachability so the founder can decide what to bump. Survey only, no dependency
changes were made.

## Headline

`npm audit` reports **32 advisories: 0 critical, 18 high, 13 moderate, 1 low**.
With one exception they all sit in Expo / React Native **build and CLI
tooling** that ships in `node_modules` for local builds and EAS, not in the app
bundle that runs on a phone. The clean way to clear them is the next Expo SDK
bump, which is already the plan. Nothing here is a reason to bump a dependency
out of cycle.

## By reachability

### Build / CLI tooling only (not in the app bundle)

These reach the project transitively through `@expo/cli`,
`@expo/prebuild-config`, `@expo/config-plugins`, `jest-expo`, and
`@react-native-community/cli`. They run on a developer machine or the EAS
builder, never on a user's device.

- **@xmldom/xmldom** (high): XML injection via CDATA. Path: `@expo/plist` ->
  prebuild/config-plugins. Build-time plist generation.
- **tar / node-tar** (high): arbitrary file write via hardlink path traversal.
  Path: `cacache`. Package install / cache.
- **fast-xml-parser** (moderate): comment/CDATA injection. Path:
  `@react-native-community/cli-platform-android|apple`. Native build tooling.
- **postcss** (moderate): XSS via unescaped `</style>` in stringify. Build
  tooling.
- **uuid** (moderate): missing buffer bounds check in v3/v5/v6 when `buf` is
  passed. Path: `@expo/bunyan`, `xcode`. Build tooling. (This is the npm
  `uuid` package, not our row-id generator in `src/lib/uuid.js`, which is
  hand-rolled and unaffected.)
- **send** (low): template-injection XSS in a dev static server. Dev only.
- The rest (`@expo/*`, `expo`, `expo-constants`, `expo-updates`,
  `expo-notifications`, `react-native`, `@react-native-community/*`,
  `react-native-health`) are wrapper advisories that resolve to one of the
  roots above. `react-native-health` is a runtime dependency, but its advisory
  is in its **config plugin** (`@expo/config-plugins` -> `@expo/plist` ->
  xmldom), which is build-time, not the runtime HealthKit bridge.

### Worth a tidy-up, but not runtime-reachable

- **xlsx / SheetJS** (high, prototype pollution): listed under
  `dependencies`, but the only use in the repo is
  `scripts/seed/buildCofidSnapshot.js`, an offline seed script that parses the
  McCance & Widdowson gov.uk food dataset to build the food snapshot. It is
  never imported by `src/`, never bundled, and parses a trusted source, not
  user input. The script's own error message even says
  `npm install --save-dev xlsx`. So it belongs in `devDependencies`. Moving it
  there is a one-line change that takes the only high-severity advisory with
  any plausible data path out of the production tree. Left for the founder to
  approve since this pass was scoped survey-only.

## Recommendation

1. Fold the tooling advisories into the next Expo SDK bump (Tier 5 #5 as
   planned). They clear as the Expo/RN dependency tree moves forward.
2. Optionally move `xlsx` from `dependencies` to `devDependencies` now. Zero
   runtime risk, and it removes the high-severity SheetJS advisory from
   `npm audit --omit=dev`.

No `npm audit fix` was run: `--force` would pull breaking major bumps across
the Expo tree, which is exactly what the SDK bump is for.
