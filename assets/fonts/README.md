Manrope is bundled for Volyume's app UI (brand typeface, D50, 2026-07-11 —
replaces the prior Inter set; docs/ux-world-class-audit-2026-07-09/
DECISIONS-2026-07-09.md and BRAND-FONT-SHORTLIST.md).

Source: the official variable font, google/fonts main branch
(ofl/manrope/Manrope[wght].ttf), itself sourced from
https://github.com/sharanda/manrope. Verified with fontTools before use:
GSUB carries the `tnum` (tabular figures) feature, the `wght` axis spans
200-800 (covers the app's 400-800 usage), and the licence (name table +
accompanying OFL.txt) is SIL Open Font License 1.1.
License: SIL Open Font License 1.1, included in OFL-Manrope.txt.

Bundled weights are STATIC per-weight instances, not the single variable
file: expo-font / React Native register one concrete family alias per
loaded font and cannot resolve a fontWeight value against one variable-axis
file at runtime (the same reason the prior Inter set used five static cuts
rather than Inter's own variable file). Each Manrope-*.ttf here was
produced with `fontTools.varLib.instancer` pinning the verified official
variable font to a fixed `wght`, which keeps every glyph and GSUB feature
(including `tnum`) byte-identical to the source design at that weight —
verified again per-file after instancing.

Bundled weights:
- Manrope Regular  (wght 400)
- Manrope Medium   (wght 500)
- Manrope SemiBold (wght 600)
- Manrope Bold     (wght 700)
- Manrope ExtraBold (wght 800)

Manrope has no separate "display" optical cut (unlike Inter/Inter Display),
so the type roles that used InterDisplay-Bold/ExtraBold now reuse
Manrope-Bold/Manrope-ExtraBold (see src/styles/fontFamily.js).

The prior Inter-*.ttf / InterDisplay-*.ttf files and INTER_LICENSE.txt are
left in place pending a founder call on whether to remove them (they are
no longer referenced by src/styles/fonts.js).
