# Deep Feature Audit — Batch 2 (items 52–56): import + policy/subscription surfaces

**Items:** 52 `ImportScreen`, 53 `PrivacyPolicyScreen`, 54 `SubscriptionPolicyScreen`, 55 `SubscriptionScreen`, 56 `CascadeGateScreen`
**Status:** IMPLEMENTED (approved 2026-06-04, "Ok"). Attribute-only a11y (mostly heading roles on content) + one verified dead-style removal. No behaviour or copy change. Full 455-test mount sweep green.
**Timestamp:** 2026-06-04

---

## Per-screen

### #52 ImportScreen (477 lines)
- The import CTAs use `PressableCard` (already `role="button"` + composed labels).
- **Change:** `accessibilityRole="header"` on the screen title ("Bring your
  history"). No dead styles.

### #53 PrivacyPolicyScreen (138 lines)
- Pure content via a reusable `Section` (9 sections); `BackHeader` accessible.
- **Change:** `accessibilityRole="header"` on the `Section` title (one edit →
  all 9 sections; navigate the policy by heading). No dead styles.

### #54 SubscriptionPolicyScreen (192 lines)
- Same shape — reusable `Section` with `sectionTitle`.
- **Change:** `accessibilityRole="header"` on the `Section` title (one edit →
  all sections). No dead styles.

### #55 SubscriptionScreen (224 lines)
- Upgrade / Restore / Cancel use the shared accessible `Button`; `BackHeader`
  accessible; no title/heading style present.
- **No change needed.** No dead styles.

### #56 CascadeGateScreen (274 → 271 lines)
- The action `Button`s are accessible.
- **Changes:** `accessibilityRole="button"` on the close X (label already
  present); removed the dead `stripWrap` style (verified `styles.stripWrap`
  0 refs).

---

## Verification
- eslint 0 problems across all five.
- `stripWrap` confirmed gone.
- **Full screen-mount sweep green (455/455).**

## Sources
- React Native — Accessibility (header role, button role): https://reactnative.dev/docs/accessibility
- React Native AMA — Headers: https://nearform.com/open-source/react-native-ama/guidelines/headers/
