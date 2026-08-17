# Campaign 27 — codebase sizing/scaling audit (sonnet agent, 2026-08-17)

Read-only audit; lead-reviewed. Evidence for PROPOSAL.md. Every claim
carries file:line as reported by the agent; spot-checked by the lead at
the load-bearing sites (theme.js tokens, accessibilityDesign guard,
WorkoutSummaryScreen numeral cap).

## 1. Sanctioned laws today

- docs/rules/styling.md 55-67: type roles only, never hand-rolled
  size/lineHeight pairs; "All sizes scale x1.2 under the larger-text
  setting"; 11px is caption-only.
- styling.md 171: "text must survive largerText x1.2" - scoped to the
  IN-APP toggle only; the file says NOTHING about OS fontScale,
  maxFontSizeMultiplier, numberOfLines or narrow-width behaviour.
  DOCUMENTATION GAP: the sizing rulebook has no OS-scale policy.
- src/styles/layout.js: touchTarget { minimum: 44, android: 48 };
  workoutLoggerSize.setEntryLabelWidth: 96 was hand-tuned (founder
  2026-07-19) because "Weight (kg)" wrapped at 68 - tuned at 1x only,
  no accounting for OS scale re-breaking it.

## 2. Font-scale exposure map

Capped sites (everything else is uncapped RN default):

| Site | Cap | Surface |
|---|---|---|
| MacroRings.js:19 KCAL_MAX_FONT_SCALE | 1.3 | kcal ring numerals inside fixed 132dp circle |
| WorkoutSummaryScreen.js:1990 numeral(...,1.3) | 1.3 | tonnage hero numeral - INVISIBLE to the EP-14 guard (passed as argument, not JSX literal) |
| RestTimer.js:443,445 | 1.15 | countdown numerals (EP-14's named carve-out) |
| RollingNumber.js:54 / Chip.js:38 | prop, no default | pass-through; no Chip call site passes a value |

Stacking: theme.js:504-506 confirms largerText x1.2 STACKS with OS
fontScale (allowFontScaling true). largerText ON + Android fontScale
2.0 = ~38px effective body, uncapped, everywhere except the four sites
above. No ceiling exists on the combination.

Surface behaviour at fontScale 1.3/2.0:
- Home hero: heroEyebrow nOL={1}, workoutName nOL={2} @24 black -
  truncates; coachBriefLineText nOL={2} truncates two-sentence coach
  copy (same mechanism as the fixed Progress pillar bug).
- Progress Answer Block: FIXED (wraps freely) - the one deliberate
  OS-scale-safe surface (AnalyticsScreen.js:553-554).
- Logger: NowCard positionText nOL={1} truncates; SetEntry fixed
  96-100dp label column re-wraps and desynchronises row alignment (the
  exact failure the 96dp constant was tuned to avoid).
- MacroRings/Diary: capped numerals; macro rows uncapped but wrap.
- Onboarding: imperial input row flexWrap (resilient); outcome chips
  nOL={1} truncation risk on an unskippable gate.
- Settings: SettingRow flex:1 without minWidth:0 - wraps, drift from
  the safer idiom.

## 3. Width-adaptation map

- useWindowDimensions in 21 production files, all reactive; a
  consistent chart-width idiom copied from RestTimer.js by comment
  convention (BodyMetrics/FoodInsights/ExerciseDetail).
- Fixed-canvas previews correctly derive from window width, pinned by
  ShareCardScreen.previewWidth and BeforeAfterShareSheet.previewWidth
  guards (both born from a real 320dp field failure).
- numberOfLines={1}: 68 files. numberOfLines={2}: 23 files.
- adjustsFontSizeToFit: only YearOfLiftsScreen.js:486 and Button.js:191.
- Fixed widths that HARD-CLIP at 360dp: none found; the risk class is
  overwhelmingly TRUNCATION via numberOfLines, not clipping.

## 4. Text-overflow risk register (top 15)

1. HomeScreen.js:2143-2145 coachBriefLineText nOL={2} - two-sentence
   coach line on the most-viewed screen. HIGH.
2. TodayStrip.js:232-234 logWhy nOL={2} - 21-word sentence. HIGH.
3. HomeScreen.js:2086 workoutName nOL={2} @xxl black - hero. HIGH.
4. NowCard.js:111-121 positionText nOL={1} - active-set orientation
   line. HIGH.
5. SetEntry.js:522-528 fieldLabelWrap fixed 96-100dp column -
   misalignment at scale. MEDIUM.
6. MacroRings.js:329,345 kcalPlanned/plannedHint nOL={1} @xs -
   sentence-length explainer. MEDIUM-HIGH.
7. HomeScreen.js:2396-2399 activation banner nOL={1}/{2}. MEDIUM.
8. HomeScreen.js:2369 plateauBannerText nOL={2}. MEDIUM.
9. SettingsPrimitives.js:41-54 SettingRow label missing minWidth:0.
   LOW-MEDIUM.
10. ProOnboardingScreen.js:282 outcomeChipText nOL={1} - unskippable
    onboarding gate. MEDIUM.
11. LoggedSetRow.js:158,208 - SAFE counter-example (flex:1+minWidth:0,
    short numeric content). LOW.
12. Food/SavedMeal/Recipe detail sheets - long product names, daily-use
    Pro surfaces. MEDIUM (grep-matched, not line-inspected).
13. WeeklyCheckInScreen.js - sentence-length coaching copy. MEDIUM.
14. RecoveryStateCard.js / AttentionCard.js nOL={2}. MEDIUM.
15. PeekMenu.js - shared primitive, blast radius. MEDIUM.

## 5. Layout primitives inventory

Two competing row idioms: the SAFE one (text wrapper flex:1 +
minWidth:0 - pillarTextWrap, NowCard positionText/contextText,
LoggedSetRow) and the under-specified one (flex:1 alone - SettingRow).
No shared row/Text primitive exists; the same clamp bug recurs
independently in 10+ files because each screen hand-rolls the row.

## 6. What a global solution must not break

Exempt fixed-geometry surfaces: ShareCard Skia canvas + preview guards;
BeforeAfterShareSheet; src/widgets/widgets.js (RemoteViews, Android
scales itself); MacroRings kcal ring cap; RestTimer 1.15 cap;
WorkoutSummaryScreen numeral cap (must be made explicit, currently
guard-invisible).

Guard tests that fire on changes: accessibilityDesign.guard (blanket
1.3 literal + allowFontScaling=false), Chip.a11y.guard (no default cap
param), inputs.test :178-200 (labels uncapped), the two previewWidth
guards, rootNavigatorSplashWidth.guard, ScanLabelScreen.frameSize.guard,
ActiveWorkoutScreen.usability.guard (pins SetEntry/NowCard string
invariants), rollingNumber.guard.

Not audited at this effort level: ScreenHeader/BackHeader/ModalHeader
title truncation; SettingsDisplayScreen (largerText toggle home); full
line-inspection of items 12-13.
