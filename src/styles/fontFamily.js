// Brand typeface: Manrope (D50, docs/ux-world-class-audit-2026-07-09/
// DECISIONS-2026-07-09.md), adopted per the plan in
// BRAND-FONT-SHORTLIST.md. Replaces the prior Inter set (2026-07-11).
//
// Static per-weight instances, not the single variable TTF: expo-font /
// React Native (0.81.5) registers one concrete family alias per loaded font
// file and cannot resolve a fontWeight value against a single variable-axis
// file at runtime on Android (or iOS, via this API) — the same reason the
// prior Inter set was bundled as five static cuts instead of Inter's own
// variable file. Each Manrope-*.ttf below was instantiated from the
// verified official variable font (google/fonts main, OFL) at a fixed wght,
// which keeps every glyph/GSUB table (including the tnum feature
// type.num() depends on) byte-identical to the source design at that
// weight — see assets/fonts/README.md for provenance.
//
// Manrope has no separate "display" optical-size cut (unlike Inter/Inter
// Display), so displayBold/displayHeavy reuse the same weight-matched
// static files as bold/heavy rather than a distinct family.
export const fontFamily = Object.freeze({
  regular: 'Manrope-Regular',
  medium: 'Manrope-Medium',
  semibold: 'Manrope-SemiBold',
  bold: 'Manrope-Bold',
  heavy: 'Manrope-ExtraBold',
  displayBold: 'Manrope-Bold',
  displayHeavy: 'Manrope-ExtraBold',
  mono: 'monospace',
});
