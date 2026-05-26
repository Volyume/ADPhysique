# Dependency audit triage (2026-05-26)

Per the external audit recommendation #10 ("Triage dependency
audit findings before production release") and the audit's own
note that "some fixes require Expo/Sentry upgrades and may be
build-time".

`npm audit --omit=dev` total: **33 advisories** (1 low, 17 moderate,
15 high). No `npm audit fix` actions taken in this session: the
single resolution path npm offers (`npm audit fix --force`)
downgrades Expo SDK to 56.x, which is a breaking change against
the closed-test build that the 2026-05-24 release policy says
must remain functional. Triaged for action during Phase A exit
prep instead.

## Risk groupings

### Group A: transitive via Expo CLI build chain (defer to Phase A exit)

These ride in via `@react-native-community/cli`, `expo-cli`, and
the various build/doctor toolchains. They run at **build time**,
not on user devices. End-user APK + AAB does not contain `tar`,
`postcss`, `send`, `node-tar`, or `@xmldom/xmldom`. Severity in a
runtime sense is low; severity in a developer-environment sense is
moderate.

| Package | Severity | Path | Runtime impact |
|---|---|---|---|
| `tar` <=7.5.10 | high | `expo` → `tar` | none (build only) |
| `cacache` 14.0.0-18.0.4 | high (via tar) | `expo` → `cacache` → `tar` | none (build only) |
| `postcss` <8.5.10 | moderate | `expo` → `postcss` | none (build only) |
| `send` <0.19.0 | moderate | `expo` → `send` | none (build only) |
| `uuid` <11.1.1 | moderate | `@expo/bunyan`, `xcode` → `uuid` | none (build only) |
| `@expo/bunyan` | (via uuid) | telemetry SDK in CLI | none (build only) |
| `@expo/rudder-sdk-node` | (via uuid) | telemetry SDK in CLI | none (build only) |
| `xcode` | (via uuid) | iOS-only build helper | none (iOS deferred) |
| `fast-xml-parser` | high (Prototype Pollution) | `@react-native-community/cli-*` → `fast-xml-parser` | none (build only) |
| `@react-native-community/cli*` | (via fast-xml-parser) | RN CLI used by Metro/build | none (build only) |
| `@xmldom/xmldom` | moderate | `expo-updates` → `@xmldom/xmldom` | runtime: parses update manifests |

**Disposition:** Action during Phase A exit prep when the Expo SDK
upgrade is scheduled. `expo-updates → @xmldom/xmldom` is the one
that actually ships in the bundle and warrants priority within
the Expo upgrade window.

### Group B: Sentry browser advisory (track for Sentry upgrade)

| Package | Severity | Path | Runtime impact |
|---|---|---|---|
| `@sentry/browser` Prototype Pollution | moderate-high (advisory dependent) | `@sentry/react-native` → `@sentry/browser` | runtime: Sentry crash reporter in the app |

**Disposition:** Track for the Sentry RN SDK bump. Current usage
is server-error reporting + PII-scrubbed breadcrumbs; the
prototype pollution path requires attacker-controlled input
flowing into a specific Sentry browser util that the RN bundle
does not exercise in normal operation. Acceptable to defer to
the Phase A exit Sentry upgrade window.

### Group C: misc / one-offs

Anything outside Groups A and B will be re-triaged at upgrade
time. The 33 advisories collapse mostly to one root cause per
group (Expo CLI version pin, Sentry browser pin); a single
coordinated upgrade per group clears the majority of the count.

## What NOT to do

- **Do not run `npm audit fix --force`.** It pins `expo@56.0.4`,
  which is a SDK 56 upgrade against the SDK 51 codebase. Breaks
  the closed-test build (release policy 2026-05-24) and likely
  breaks runtime against half the `expo-*` packages we use.
- **Do not bump `expo-updates` in isolation.** It's pinned to the
  Expo SDK version; mismatched runtime errors silently break OTA.
- **Do not bump `@sentry/react-native` in isolation** without
  re-testing the source-map upload flow in `build-android.yml`;
  the Sentry RN SDK version drives `sentryProperties` shape.

## When to action

Per CLAUDE.md release policy (2026-05-24) the closed-test AAB
stays in place until the whole project is built out. The next
opportunity for the Expo SDK upgrade is Phase A exit prep
(§ 8 "LATER" in CURRENT_STATUS.md), at which point:

1. Bump Expo SDK to the latest stable in a single commit.
2. Re-run `npm audit`; expect Group A counts to collapse.
3. Bump `@sentry/react-native` separately, verify source-map
   upload still works in `build-android.yml`.
4. Full Jest run + Maestro smoke + manual sandbox-purchase test
   before promoting any AAB.

No action this session beyond producing this triage. Document
checked into `docs/` so the decision trail is preserved.
