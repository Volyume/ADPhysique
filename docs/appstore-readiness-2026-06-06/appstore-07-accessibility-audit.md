# Phase 7: Accessibility

Status: COMPLETE (static). Date 2026-06-06. A device VoiceOver pass is still
owed (noted below); this is the code-level assessment.

## VoiceOver / labels
- `accessibilityLabel` appears in 106 files and `accessibilityRole` in 96, out
  of ~99 files using TouchableOpacity/Pressable. Coverage is broad: most
  interactive controls are labelled (buttons carry `accessibilityRole="button"`
  + a label; e.g. `LoginScreen`, `OAuthButtons`, `ShareCardScreen`,
  `SubscriptionScreen`). Good baseline, not a blocker.
- FINDING-M2 (Medium): charts and data visualisations (volume grid, PR sparkline,
  body-diagram heatmap, MacroRings) are the most likely to lack a spoken summary.
  Add an `accessibilityLabel` that states the value/trend on each chart container
  so VoiceOver users get the number, not silence.
- FINDING-L7 (Low): decorative icons next to labelled controls should be
  `accessibilityElementsHidden`/`importantForAccessibility="no"` so VoiceOver does
  not read the icon name. Spot-check list rows.

## Dynamic Type
- The app uses a fixed type scale (`styles/theme.js` `fontSize`/`type`), not
  `allowFontScaling`-driven sizing. FINDING-M3 (Medium): text does not currently
  scale with the system text-size setting. Apple does not hard-require Dynamic
  Type, but at the largest accessibility text sizes fixed type can clip. Decide:
  either allow font scaling on body text or confirm layouts tolerate the largest
  setting. Not a blocker, a quality/accessibility gap.

## Colour contrast
- Dark theme on `#0D0D0D` with amber `#F5A623` and white/grey text. Primary text
  (`#FFFFFF` on `#0D0D0D`) and amber-on-dark pass 4.5:1. The accessible
  volume-status palette was added (master audit A2-038) so colour-blind modes
  recolour the bands. FINDING-L8 (Low): muted text (`#727272` on `#0D0D0D`) is
  ~3.4:1, below 4.5:1 for small text; used for captions/footnotes. Nudge muted
  text lighter or reserve it for large text.

## Touch targets
- 50 files use `hitSlop` or explicit 44pt min heights (e.g. `LoginScreen`
  `modeSwitch` `minHeight: 44`, forgot-password `hitSlop`). Good awareness.
  FINDING-L9 (Low): audit small icon-only controls (close X, toggles, chips) for
  the 44x44 minimum on a device; some chips/icons may be below.

## Reduce motion
- Honoured: `AnimatedEntrance`, `Skeleton`, `BottomSheet`, `PeekMenu`,
  `PressableCard`, `MacroRings`, `Toast` all check reduce-motion
  (`AccessibilityInfo`). PASS.

## Severity
No accessibility blockers. M2 (chart labels) and M3 (Dynamic Type decision) are
the meaningful items; the rest are low-severity device-pass checks. None block
submission, but M2/M3 improve the review impression and real usability.
