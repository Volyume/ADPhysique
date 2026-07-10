# Core-Haptics-level control for VOLYUME — package research (D16 item 14)

Read-only research task, no code changes, no installs. Answers the question
gated by CLAUDE.md's decision list ("Core-Haptics dependency"): does anything
beyond `expo-haptics` (currently `~15.0.8`, on Expo SDK `~54.0.35`, RN
`0.81.5`, managed workflow) give worthwhile Core Haptics-level control for
VOLYUME's two named use cases — rest-timer completion and PR celebration —
and if so, is it compatible with a managed-workflow app that never ejects?

Current implementation for context: `src/lib/haptics.js` builds `restDone()`
and `prAchieved()` from three stock `expo-haptics` calls each (one
`notificationAsync(Success)` plus two delayed `impactAsync(Heavy)` beats via
`setTimeout`), gated by the app's reduce-motion preference. Both signatures
are already hand-tuned "ladders" of discrete taps — there is no continuous
curve, no ramp, no custom waveform.

## What "Core Haptics" adds that `impactAsync`/`notificationAsync` cannot

Apple's `CHHapticEngine` (iOS 13+) exposes two event primitives that
`expo-haptics` does not: **transient** events (a single discrete tap, similar
to what `impactAsync` already gives) and **continuous** events with an
attack/sustain/release envelope, plus per-event `intensity` and `sharpness`
parameters and the ability to author multi-event curves (`AHAP` files) with
precise millisecond timing and parameter ramps. That's genuinely a different
tactile vocabulary — a soft rising rumble that swells into a solid tap, for
example — versus stacking a handful of fixed on/off taps with `setTimeout`.

## Candidates checked

| Package | Core Haptics / AHAP | Android story | Licence | Last release | Weekly downloads | Managed-workflow / Expo fit | New Arch (RN 0.81) |
|---|---|---|---|---|---|---|---|
| **expo-haptics** (current dep) | No. Only `impactAsync`, `notificationAsync`, `selectionAsync`, `performAndroidHapticsAsync` (Android-only enum list). Confirmed against the current Expo docs page and the SDK 55 changelog — no Core Haptics/AHAP/curve API has been added since this app's `~15.0.8`. | N/A (native Android haptics enum) | MIT | latest npm tag `57.0.0`, 2026-06-25 | ~3.4M | Native to the project already; zero integration cost | Yes (Expo module) |
| **react-native-haptic-feedback** (`mkuczera/react-native-haptic-feedback`) | Yes — full `CHHapticEngine` rewrite in v3.0.0: `triggerPattern()` with typed transient/continuous events (`time`, `duration`, `intensity`), a compact string pattern notation, and `.ahap` file playback via `playAHAP()`. This is the most complete iOS Core Haptics surface of anything checked. | Two-tier: `performHapticFeedback` (respects system haptic settings) falling back to `VibrationEffect.Composition` primitives on API 31+, plain `VibrationEffect` below that. Real fallback, not a stub. | MIT | v3.0.0, 2026-03-29 (32 releases total, package started 2018) | **~438,000** | No Expo config plugin and no managed-workflow guidance in the README. Auto-links fine via `expo prebuild`/EAS Build for the JS/native-module wiring itself, **but** `.ahap` file bundling is documented as manual Xcode Build Phases surgery ("Add Files to target", uncheck "Copy items if needed", verify Copy Bundle Resources) — that is exactly the kind of native-project edit `expo prebuild` wipes on every regeneration, and VOLYUME's rule is config-plugin-only native changes, never hand-edited native projects. Would need a small custom Expo config plugin written in-house to copy `.ahap` files into Copy Bundle Resources on every prebuild; none exists upstream. The simpler `triggerPattern()` API (no `.ahap` files, patterns authored in JS) sidesteps this entirely and needs no native-project editing. | codegenConfig present (`RNHapticFeedbackSpec`, TurboModule spec) and the CHANGELOG for v3.0.0 explicitly fixes a `RCT_NEW_ARCH_ENABLED` selector bug — confirms New Architecture is exercised and supported. |
| **@candlefinance/haptics** | Yes on iOS — `hapticWithPattern()` string notation plus `play()` for raw `.ahap` files via `CoreHaptics`. Android has no pattern/AHAP parity at all; it just vibrates. | Plain vibrate only, no composition/amplitude control | MIT | v0.3.3, **2024-04-20** (over two years stale as of 2026-07-10) | ~506 | No Expo/managed-workflow documentation; same manual-`.ahap`-bundling shape as above for iOS. 115 GitHub stars, 1 open issue, 33 commits total — small and now dormant. | Not documented; given the release is pre-dating this app's RN 0.81 window by two years, unverified. |
| **expo-better-haptics** (`carter-0/expo-better-haptics`) | Yes, and explicitly framed as an Expo-native drop-in replacement for `expo-haptics` (same call shape continues to work) plus AHAP playback with parameter curves and a tiered Android fallback (Composition API on 11+, `VibrationEffect` on 8-10, plain vibration below). On paper the best-fit shape for this app. | Tiered fallback as above | MIT | v1.0.2, 2025-06-29 (~1 year stale) | ~200 | Built as an Expo module, so in principle no config plugin or native-project surgery needed — but only 5 commits and 6 GitHub stars, no open issues because nobody is filing any, essentially unproven. Not something to put in front of paying users without vetting it first. | Not documented/verified — too little usage data to trust either way |
| **react-native-haptic-patterns** (`SimformSolutionsPvtLtd`) | Yes — Core Haptics-backed pattern recording/playback on iOS 13+, plain Vibration API fallback on Android. | Basic vibrate fallback only | MIT | v1.0.0, 2025-10-10 | ~1,251 | No Expo/managed-workflow documentation found; agency-authored reference implementation more than a battle-tested dependency (6 stars, 0 forks). | Not documented |
| react-native-custom-haptics, react-native-core-haptics-api, generic `react-native-haptics` (0.0.0) | Assorted small Core Haptics wrappers surfaced by search | — | MIT (where stated) | 2022, 2021, 2020 respectively | 210 / 97 / 19 | Effectively abandoned (3-6 years since last publish) | Ruled out on maintenance grounds alone |

## Engineering read

The honest gap analysis: for VOLYUME's two named moments, the win from true
Core Haptics is real but narrow. `restDone()` and `prAchieved()` are already
tuned three-beat ladders that read clearly as "done" and "celebrate" through
`expo-haptics` alone; nothing about them is currently broken or flagged in
user feedback. What Core Haptics would add is texture — a continuous
rising-intensity swell under the final tap on a PR, or a softer rumble that
telegraphs "rest is ending" before the discrete beats — which is a genuine
craft upgrade for these two specific, high-emotion moments, but it is a
polish delta, not a functional one, and it is iOS-only: whatever is built,
Android keeps its existing discrete-vibration feel regardless of which
package is chosen, because none of the Android fallbacks reach true
amplitude/sharpness composition parity with iOS Core Haptics.

Of the packages that actually offer Core Haptics, only
**react-native-haptic-feedback** clears every non-negotiable bar at once:
permissive licence, genuinely active maintenance (a full rewrite four months
ago, zero-week-old activity, 32 releases since 2018), and real production
adoption (438k weekly downloads — three orders of magnitude above the next
best-maintained alternative). Its one real friction point for this app is
that its richest feature (`.ahap` file playback) wants manual Xcode Build
Phase edits, which conflicts with "config-plugin-only, never hand-edit the
native project" — but its `triggerPattern()` API (custom transient/continuous
curves authored directly in JS, no `.ahap` files, no native-project editing)
delivers the same intensity/sharpness/timing control this app would actually
use for two haptic events, without ever touching Xcode. Everything else
checked is either stale (`@candlefinance/haptics`, over two years since
release), unproven (`expo-better-haptics`, `react-native-haptic-patterns`,
single-digit GitHub stars, near-zero downloads), or abandoned outright. And
Expo has not added any Core Haptics/AHAP surface to `expo-haptics` itself in
any release checked up to the current npm `latest` (`57.0.0`, 2026-06-25) —
so "wait for Expo to add it" is not currently an available path, only a
hope.

## Founder decision

**Option A — adopt `react-native-haptic-feedback` (mkuczera), used via its
`triggerPattern()` JS-authored curve API only (no `.ahap` files, no Xcode
edits).** MIT licence. Health: actively maintained (v3.0.0 four months ago,
codegen/TurboModule spec present, New Architecture bug fixes already
shipped), by far the most widely used option (438k weekly downloads). Adds
one new dependency; scope would be limited to `restDone()` and `prAchieved()`
in `src/lib/haptics.js`, with the existing reduce-motion gate preserved
unchanged.

**Option B — use `expo-haptics`'s newer APIs.** Checked and does not exist:
current `expo-haptics` (latest npm tag `57.0.0`) still exposes only
`impactAsync`/`notificationAsync`/`selectionAsync`/`performAndroidHapticsAsync`
— no Core Haptics, AHAP, or custom-curve surface has been added in any
release checked. This option is not actually available today.

**Option C — keep the current `expo-haptics` ladders and close item 14 as
"marginal gain, not worth a new dependency."** Zero new dependency, zero
native-project risk, keeps the existing hand-tuned signatures exactly as
shipped.

No option is recommended above the others here — this is the founder's call
per CLAUDE.md Section 4 (dependency additions, and any item-11-16 decision,
require explicit founder sign-off before work starts).
