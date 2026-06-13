# PASS 2 — RESEARCH: DESIGN (area code DE)

Method: direct, no agents, provenance-labelled. Accessibility findings rest on published STANDARDS
(WCAG/Apple/Android) → factual, near-VERIFIED even via aggregators.

## FINDINGS
- **DE-F1** | Dark-mode-first is now the default for fitness apps ("no longer an option"); best dark
  designs use off-white text (not pure white, which glares) and tweak hues for contrast. | CONFIDENCE
  PARTIAL | PROVENANCE AGGREGATOR (UX-trend blogs) | geo-neutral. → Volyume is dark-default (Pass-1
  Section 8 theme.js) with off-white text (U-F-1 fix) — at parity/compliant.
- **DE-F2** | Bold/large typography + dynamic font scaling for accessibility is best practice. |
  CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR | geo-neutral. → Volyume has fontSize tokens + larger-text
  1.2× (applyAccessibility, Pass-1 Section 8) — at parity.
- **DE-F3** | Accessibility must be baked in from the start (not an afterthought): adjustable fonts,
  high-contrast options, colour not the sole information carrier. | CONFIDENCE PARTIAL | PROVENANCE
  AGGREGATOR | geo-neutral. → Volyume EXCEEDS typical: high-contrast (lightHC/darkHC) AND colour-blind
  (lightCVD/darkCVD) palettes + larger-text (Pass-1 Section 8). CVD palettes are uncommon — a relative
  strength.
- **DE-F4** | Touch-target & contrast STANDARDS (authoritative): WCAG 2.5.5 AAA = 44×44px; WCAG 2.5.8
  AA = 24×24 min with spacing; Apple iOS = 44×44pt; Android = 48×48dp with 8dp spacing; contrast 4.5:1
  normal / 3:1 large text; information conveyed by colour must also be available by other means. |
  CONFIDENCE VERIFIED (published standards) | PROVENANCE AGGREGATOR citing official WCAG/Apple/Android
  docs | geo-neutral/factual. → Directly validates Volyume M2/U-A-3 (44px effective-target pass) +
  U-F-1 (contrast) + the CVD palette (colour-not-sole-carrier). Volyume's design system targets exactly
  these standards.

## APPS RESEARCHED (named): Calm, Fitbod, Headspace (dark-mode exemplars) + UX/standards sources.
- App count low → THIN on apps (this is a standards/best-practice area, not app-enumeration).

## PER-AREA PROVENANCE SUMMARY
- By provenance: VERIFIED 1 (DE-F4, published standards), AGGREGATOR 3 (DE-F1/2/3 trend blogs),
  PRIMARY 0 fetched, QUANT 0, UNREACHABLE (n/a).
- Representativeness: geo-neutral (design standards + trends); no UK-specific angle needed.
- Plain statement: strongest-evidenced area by nature — accessibility is governed by published WCAG/
  platform standards (DE-F4 VERIFIED). Volyume's design system MEETS or EXCEEDS them (dark-first,
  off-white text, high-contrast + colour-blind palettes, larger-text, M2 44px work) per Pass-1 Section 8
  — design/accessibility is a Volyume relative STRENGTH, not a gap.

Sources: [Smashing — accessible tap target sizes](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/) ·
[TestParty — WCAG 2.5.8 target size](https://testparty.ai/blog/wcag-target-size-guide) ·
[Android — touch target size](https://support.google.com/accessibility/android/answer/7101858) ·
[altersquare — dark vs light UX 2025](https://altersquare.io/dark-mode-vs-light-mode-the-complete-ux-guide-for-2025/)
