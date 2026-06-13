# PASS 2 — RESEARCH: NAVIGATION (area code NA)

Method: direct, no agents, provenance-labelled. UX-best-practice area (largely geo-neutral).

## FINDINGS
- **NA-F1** | Bottom tab bar best practice = 3-5 top-level tabs; >5 hurts usability (targets too small/
  close, higher cognitive load); use icons + text labels; top-level views only. | CONFIDENCE PARTIAL |
  PROVENANCE AGGREGATOR (UX Planet/Nitrous/shortcut guidelines) | geo-neutral best-practice (still
  AGGREGATOR). → Volyume has exactly 5 tabs (Home/Diary/Plans/Progress/Profile, Pass-1 Section 7) — at
  the limit, compliant; adding a 6th would breach the guideline.
- **NA-F2** | Feature overload overwhelms; prioritise — most-important features at the top of the
  hierarchy, non-essential lower; "when all content is presented the same way, all of it becomes
  equally important," which breaks navigation. | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR (stormotion/
  appinstitute) | geo-neutral. → Matches the Volyume coach-output overload finding (U-B-1/M5, already
  addressed via progressive disclosure) and applies to general IA.
- **NA-F3** | Cautionary real example: the 2026 Fitbit/Google Health redesign drew backlash — users
  called it "inoperable", complained of "white wasted space" and that the layout "gets in the way of
  seeing the numbers people care about." | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR (piunikaweb +
  Fitbit community) | global. → Lesson for Volyume: never bury the numbers users care about behind
  whitespace/restyle (reinforces U-A-1 fold-guarantee + the "show the data" principle).
- **NA-F4** | If >5 destinations are needed, move overflow to a drawer/menu rather than cramming the
  tab bar. | CONFIDENCE PARTIAL | PROVENANCE AGGREGATOR | geo-neutral. → Volyume routes non-tab screens
  via stack navigation off the 5 tabs (Pass-1 RootNavigator) — compliant pattern.

## APPS RESEARCHED (named): Fitbit/Google Health (cautionary), + UX-guideline sources (1 app exemplar;
UX-best-practice area).
- App count low → **THIN on apps** (navigation is a UX-principle area, evidence is guideline-led).

## PER-AREA PROVENANCE SUMMARY
- By provenance: PRIMARY 0, QUANT 0, AGGREGATOR 4 (UX guidelines + a community-backlash report),
  UNREACHABLE (subreddits).
- Representativeness: best-practice is geo-neutral; the Fitbit example is global. No UK-specific angle.
- Plain statement: AGGREGATOR/PARTIAL but the tab-count guideline is near-universal UX canon. Volyume
  is compliant (5 tabs, stack overflow). The actionable Volyume angle (prioritise/never-bury-the-numbers)
  is corroborated and aligns with already-shipped U-A-1/M5. No new gap surfaced; navigation = parity.

Sources: [shortcut — tab bar first choice](https://www.shortcut.io/news-events/app-navigation-patterns-and-why-the-tab-bar-probably-should-be-your-first-choice) ·
[UX Planet — bottom tab bar best practices](https://uxplanet.org/bottom-tab-bar-navigation-design-best-practices-48d46a3b0c36) ·
[stormotion — fitness app UX](https://stormotion.io/blog/fitness-app-ux/) ·
[piunikaweb — Fitbit redesign backlash](https://piunikaweb.com/2026/05/25/google-health-app-fitbit-backlash-missing-features-ui-changes/)
