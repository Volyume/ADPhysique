# playstore-01 — automated code analysis (actual command output)

Status: COMPLETE. Date: 2026-06-06. HEAD `7a944a5`.

## 1. TypeScript

```
$ npx tsc --noEmit            → exit 0 (no errors)
$ npx tsc --noEmit --strict   → exit 0 (no errors)
```
Note: `tsconfig.json` sets `checkJs: false`; the app is 463 JS files + 72
TS/TSX files. tsc therefore checks the TS surface only and is clean. The JS
surface is covered by ESLint + Jest, not tsc.

## 2. ESLint

```
$ npx eslint src App.js index.js plugins   → exit 0 (0 errors, 0 warnings)
$ npx eslint .                              → 1293 problems (834 errors, 459 warnings)
```
Breakdown by path of the full run:
```
834e 455w  web/            ← Next.js .next/ build artifacts + marketing-site source
0e   4w    tests/simulator
0e   0w    src / App.js / index.js / plugins / modules   (the shipped app)
```
**The shipped React Native app lints completely clean.** Every error is in
`web/` (a separate Next.js marketing site, not part of the Android bundle) —
mostly minified `.next/static/chunks/*.js` that should never be linted, plus
browser-global usage in the site source. Fix is an ESLint ignore, not app code
(Document A, finding M-3).

## 3. Dependency audit

```
$ npm audit --omit=dev   → 18 vulnerabilities (4 high, 14 moderate, 0 critical)
```
Every one is a **build-time / tooling** transitive dependency. None ship in the
Android runtime bundle.

| Sev | Package | Path / why | "Fix" |
|-----|---------|------------|-------|
| high ×4 | @xmldom/xmldom ← @expo/plist ← @expo/config-plugins ← react-native-health | XML-injection in a **config plugin** run at prebuild. react-native-health is iOS HealthKit, unused on Android. | downgrade react-native-health (MAJOR/breaking) |
| moderate ×9 | @expo/cli, @expo/config, @expo/metro-config, @expo/prebuild-config, expo, expo-asset, expo-constants, expo-manifests, expo-notifications, expo-updates | Expo build tooling (`@expo/config` advisory) | `expo@56` upgrade (MAJOR/breaking) |
| moderate | postcss | web build only | expo@56 |
| moderate | uuid, xcode | iOS prebuild tooling | react-native-health downgrade |
| moderate | react-native-health-connect | config-plugin dep | downgrade (breaking) |

Conclusion: zero runtime exposure; the only remediations are breaking
upgrades. Recommendation is to hold (matches `docs/audit/npm-audit-survey-2026-06-01.md`)
and revisit at the next Expo SDK bump. Not a submission blocker.

## 4. Unused dependencies (cross-referenced against imports)

No shipped dependency is dead. `react-native-health` (HealthKit) is bundled but
only used on iOS; it stays because the same JS imports serve both platforms and
iOS is a deferred target. `xlsx` is devDependency-only (data export tooling).

## 5. Dead code

The shipped surface (`src`, `App.js`) is ESLint-clean under `no-unused-vars`,
which is the automated signal for unused imports/vars; no unused-symbol errors
were reported. A deeper semantic dead-code sweep was not run as a separate tool
(no `ts-prune`/`knip` in the toolchain); ESLint `no-unused-vars` is the
available automated check and it passes.

## 6. Secrets scan

```
$ grep -rE "(sk_live|pk_live|AIza…|eyJ…|-----BEGIN|secret_key=|password=…|api_key=…)" src App.js
  → (no matches outside process.env / EXPO_PUBLIC references)
$ git ls-files | grep -iE 'google-services|service-account|GoogleService|keystore|jks|p12|p8'
  → (no tracked secret files)
```
- No hardcoded API keys, tokens, passwords, or private keys in the app source.
- Supabase URL + anon key load from `process.env.EXPO_PUBLIC_*` (`src/lib/supabase.js:27-29`),
  null when unset. The anon key is designed to be public; that is correct.
- No `google-services.json` (Expo push, not direct FCM). No service-account
  files tracked. `.gitignore` blocks `*.jks/*.p12/*.p8/*.key` and
  `google-play-service-account.json`.

**Secrets scan is clean.**
