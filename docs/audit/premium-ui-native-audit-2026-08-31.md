# Native audit — Volyume (Android primary)

Impeccable `audit` scored against `reference/android.md`. Source-level audit
of the React Native codebase. **No device or emulator was available in this
session**, so every finding below is read from source; nothing here rests on
a screenshot of the running app, and the Performance and Adaptivity scores
are correspondingly conservative. `adb`-based capture, which the Android
reference requires for visual evidence, has not been run.

## Audit health score

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3 | Touch targets sized to iOS's 44pt on an Android-first app; the 48dp token is dead |
| 2 | Performance | 3 | Source looks sound; no profiling evidence, so not scorable above 3 |
| 3 | Appearance & Theming | 4 | Token system is excellent and CI-enforced; 14 raw hex in all of `src`, each justified |
| 4 | Platform Conformance | 3 | Material-shaped navigation and feedback; no Dynamic Color; touch-target gap |
| 5 | Adaptivity | 2 | Portrait-locked, no width classes, phone bottom bar ships unchanged to tablets |
| **Total** | | **15/20** | **Good — address Adaptivity, then touch targets** |

## 1. Accessibility — 3

Strong: contrast ratios for every token at every surface-ladder step are
computed and asserted in `src/styles/__tests__/theme.test.js`, so the palette
cannot silently drift below its bar. Higher-contrast, colour-blind-safe
(Okabe-Ito) and larger-text (×1.2) modes all ship. Reduce Motion gates
animation. Shared chrome carries labels, roles and heading semantics
(`ScreenHeader` sets `accessibilityRole="header"`; `SettingRow` composes a
label from its own label and value).

Findings:

- **A1 (main).** `src/styles/layout.js` defines both `touchTarget.minimum: 44`
  (iOS) and `touchTarget.android: 48`. `touchTarget.android` has **zero
  references in app code** — only its own test asserts it. 78 further sites
  hard-code `44` rather than reading the token, so raising the app to
  Material's 48dp is a 78-site edit rather than one line.
  `docs/DESIGN_SYSTEM.md` itself mandates 48. Recorded as an open founder
  decision, not swept: consolidating onto the token is zero-visual-change,
  but 44 -> 48 changes density on every screen.
- **A2.** 64 style blocks declare a target below 44. Most are compensated by
  `hitSlop` in the same file; **11 sit in files with no `hitSlop` anywhere**
  (`TodayStrip` 30px ×2 and 40px ×2, `MealSection` 36px,
  `PlanLibraryScreen` 36-40px ×4, `CoachingRemindersScreen` 40px). Each needs
  checking individually for whether it is actually interactive —
  `ScreenHeader:90` also matched and is a non-interactive title row, so the
  raw count overstates the problem.

## 2. Performance — 3

19 files use `FlatList`/`SectionList`; 53 screens render rows with `.map(`.
Whether any of those `.map` sites back a genuinely long list needs runtime
measurement I could not take. Sentry runs at `tracesSampleRate: 0.05`.
`useShallow` selectors and `useMemo` appear consistently in the screens read.
Not scored above 3 without profiling on a mid-range Android device.

## 3. Appearance & Theming — 4

The strongest dimension. One token source (`theme.js`) with a pure
`resolveTheme()` derivation shared by both the boot-time singleton and the
live `useTheme()` hook, so the two systems cannot drift. Dark and light are
both first-class, with the elevation cue correctly differing between them
(surface ladder in dark, shadow in light). 14 raw hex values remain in all of
`src`, each a documented theme-invariant exception (Apple OAuth brand colours,
the camera viewfinder surround, celebration confetti). A CI lint rule blocks
new ones.

Fixed during this pass rather than only recorded: 347 style blocks that set
`fontWeight` without a `fontFamily`, which on a face-by-face registered
custom font does not select a heavier face; and a phantom `type.labelSm` role
that spread as `undefined`, silently dropping family, size and line height.

## 4. Platform Conformance — 3

Conformant: bottom navigation bar with 5 destinations (Material's 3-5 range);
`SafeAreaView` insets throughout; `KeyboardAvoidingView` in the shared
Settings page chrome; a bottom-anchored `Toast` with an optional action,
which is snackbar-shaped rather than an iOS-style alert; dialogs reserved for
decisions that interrupt; one press model app-wide via `PressableCard`.

Findings:

- **P1.** No Dynamic Color (Material You) support and no static-fallback
  branch for it. Defensible for a strongly branded product, but it is a
  deliberate divergence and is not recorded anywhere as one.
- **P2.** Icons are Ionicons exclusively rather than Material Symbols. This is
  *consistent*, so it is not the "mixed icon sets" failure the reference
  warns about, but it is not the platform set either.
- **P3.** Touch targets — see A1.

## 5. Adaptivity — 2

The weakest dimension.

- **D1.** `app.json` locks `orientation: portrait`. Reasonable for the use
  scene, but it means landscape is untested rather than deliberately handled.
- **D2.** No window-size-class or width branch anywhere in the navigator. The
  phone bottom navigation bar ships unchanged to a tablet, which the Android
  reference calls out explicitly ("Never ship a phone bottom-bar untouched on
  a tablet"). No navigation rail or drawer exists.
- **D3.** No foldable posture handling.
- Keyboard/IME insets ARE handled in the shared page chrome.

Whether tablets are in scope at all is a product decision, not a defect — but
it is currently unstated, so the gap is invisible rather than accepted.

## What this audit did not cover

- No emulator or device capture (`adb exec-out screencap`), so no visual
  evidence, no dark/font-scale sweep on hardware, no gesture or refresh-rate
  observation.
- No runtime profiling, so Performance is source-inferred only.
- Impeccable's own `detect-antipatterns` tool reports zero findings on `src`,
  which is a **false negative**: its rules match web CSS syntax and Tailwind
  classes, not React Native's separate style properties. An RN-shaped probe
  containing three deliberate anti-patterns scored zero. Its rules were
  therefore run against the RN idiom by hand, which is what surfaced the
  surviving coloured left-accent bars.
