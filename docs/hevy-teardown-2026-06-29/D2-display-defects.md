# D2 — Display & Rendering Defects (Volyume self-audit)

Static analysis only (the app was not run). Every claim is reasoned from styles,
layout and state handling. Claims that cannot be confirmed from code alone are
marked **(inferred)**. Goal: Volyume must render more correctly than Hevy.

Scope: high-traffic screens — ActiveWorkoutScreen, HomeScreen, DiaryScreen,
AnalyticsScreen, MealPlanScreen, CoachOutputScreen, ShareCardScreen — plus the
shared EmptyState/SetEntry components and the theme. Method: ActiveWorkout,
ShareCard, SetEntry, EmptyState, the cross-screen number-formatting sweep and the
`allowFontScaling`/`numberOfLines` sweeps were read/verified directly; HomeScreen,
DiaryScreen, AnalyticsScreen, MealPlanScreen and CoachOutputScreen were audited by
dedicated read-only agents and the load-bearing claims spot-verified against source.

---

## Cross-cutting findings (affect many screens)

### X1 — `allowFontScaling` is never disabled anywhere; many rows are fixed-height
**Severity: High.** A repo-wide search finds **zero** `allowFontScaling`,
`maxFontSizeMultiplier` or `adjustForFontScale` uses (only one comment in
`theme.js`). RN defaults `allowFontScaling=true`, so the **OS** Dynamic-Type /
"larger text" setting scales every label — on top of the app's own `largerText`
×1.2 toggle. Meanwhile core rows use hardcoded pixel heights: SetEntry stepper
`52×52` and `valueInput` at `fontSize.xl` (`SetEntry.js:218-239`), set-number
badges `28×28` and nav-tab badges `16×16` (`ActiveWorkoutScreen.js:2511-2512,
2616`), MealPlan `itemRow minHeight:28` (`MealPlanScreen.js`), Diary move/copy rows
`minHeight:48`. At large OS text these clip or overflow. **Fix sketch:** set a
`maxFontSizeMultiplier` on data labels in fixed-height rows, or convert fixed
heights to `minHeight` + padding so the row grows with the text.

### X2 — Number formatting is inconsistent; en-GB not enforced
**Severity: High.** Big numbers (tonnage, kcal, grams) are formatted three
different ways. `toLocaleString('en-GB')` is used in YearOfLifts, WorkoutSummary
(`:729`) and the Skia share card (`drawShareCard.js:278,298`), but **bare
`toLocaleString()`** (device-locale, not en-GB) is used in WorkoutHistory (`:356`),
NutritionTargets and GoalChangeSummary; and **no separator at all** in MealPlan
day/slot kcal + macros and the ShareCard **PDF** path (`ShareCardScreen.js:279`
`${p.tonnage}`). A UK user on a non-UK device locale sees inconsistent grouping;
4-digit kcal/gram values print as `3400` not `3,400`. **Fix sketch:** one shared
`formatNumber(n)` helper pinned to `'en-GB'`, used at every numeric display site.

### X3 — Long names rely on per-component `numberOfLines`, applied unevenly
**Severity: High.** Food rows are safe (`EntryRow.js:45-46` caps name + brand to
1 line) — but **MealPlanScreen has zero `numberOfLines`** anywhere, so meal names
(`:543`), ingredient lines (`:561`) and macro lines wrap/overflow and resize the
card. AnalyticsScreen session names cap at 1 line with no ellipsis affordance.
ActiveWorkout's `exerciseName` (`:1500/2527`) is `flex:1` with no cap, so it wraps
(acceptable) but pushes the Swap/overflow buttons. **Fix sketch:** add
`numberOfLines` + `ellipsizeMode="tail"` to every user-named string; standardise.

---

## Ranked defect table

| # | Sev | Defect | file:line | When it shows | Fix sketch |
|---|-----|--------|-----------|---------------|------------|
| 1 | High | `allowFontScaling` never disabled + fixed-height rows clip at large OS text (see X1) | SetEntry.js:218-239; ActiveWorkoutScreen.js:2511-2512,2616; MealPlanScreen.js (itemRow) | User raises OS font size / Dynamic Type | `maxFontSizeMultiplier` on data labels or fixed `height`→`minHeight` |
| 2 | High | MealPlan has **no** `numberOfLines`: meal name, ingredient line, macros all overflow/wrap | MealPlanScreen.js:543,561,566-568 | Any long meal/food name (e.g. "Grilled salmon with roasted veg & rice") | Add `numberOfLines={1-2}` + `ellipsizeMode="tail"` |
| 3 | High | MealPlan kcal/grams unformatted (no thousands separator, no en-GB) | MealPlanScreen.js:541,567 + day totals ~:500,590 | Daily kcal or bulk grams > 999 | Route through shared `formatNumber('en-GB')` |
| 4 | High | ShareCard **PDF** prints tonnage/weights with no separator (Skia card is correct) | ShareCardScreen.js:279,309,311 | User taps "Save as PDF" with a 4-digit tonnage | `Math.round(p.tonnage).toLocaleString('en-GB')` in `buildPdfHtml` |
| 5 | High | WorkoutHistory / NutritionTargets / GoalChangeSummary use bare `toLocaleString()` (device locale, not en-GB) | WorkoutHistoryScreen.js:356; NutritionTargetsScreen.js:933-936,1092-1095; GoalChangeSummaryScreen.js:219-220 | UK user on a non-UK device locale | Pass `'en-GB'` explicitly / shared helper |
| 6 | High | CoachOutput applied-calorie & macro/refeed kcal labels not en-GB formatted (steps target is) | CoachOutputScreen.js:247,450,455,495 | After applying a calorie/macro/refeed adjustment, ≥4-digit kcal | `toLocaleString('en-GB')` on those label templates |
| 7 | High | AnalyticsScreen chart bar row fixed `height:60`; clips bars/labels under larger text **(inferred)** | AnalyticsScreen.js:760 | PR sparkline with larger-text accessibility on | `minHeight:60` / compute from font size |
| 8 | High | Analytics insight copy capped at 3 lines, no "more"/ellipsis affordance — truncates coaching | AnalyticsScreen.js:530,734 | Multi-sentence insight | Expandable "Read more" or raise cap |
| 9 | Med | DiaryScreen: no error fallback — skeleton lingers forever if `load()` fails leaving `loaded=false` **(inferred)** | DiaryScreen.js:719-731 | DB/sync read fails silently | Add `loadError` state + retry/error card or skeleton timeout |
| 10 | Med | CoachOutput `SafeAreaView edges={['left','right']}` omits top/bottom; relies on a nav header for top inset **(inferred)** | CoachOutputScreen.js:1434,1443,1452,1638 | Notch/Dynamic-Island device if rendered without a header | Add `'top'`; keep bottom if ScrollView has bottom padding |
| 11 | Med | CoachOutput `AdjustmentRow` label + "Applied" chip can overflow (no `flex/flexShrink` on label) **(inferred)** | CoachOutputScreen.js:200-207,2149-2151 | Long adjustment label in applied state | `flexShrink:1`/`flex:1` on `adjustmentLabel` |
| 12 | Med | CoachOutput held-decision history text lacks `flex:1`, horizontal truncation on small screens **(inferred)** | CoachOutputScreen.js:573-575,2474 | Held-decisions history populated | Add `flex:1` to `heldHistoryText` |
| 13 | Med | HomeScreen bottom sheets use raw `View` (no SafeAreaView / bottom inset) — handle/content can sit under notch/gesture bar **(inferred)** | HomeScreen.js (sheet styles ~:1595-1751,2172) | Notched / gesture-nav device opens a sheet | Wrap sheet body in SafeAreaView or add `insets.bottom` padding |
| 14 | Med | Analytics `VolumeSummaryStrip` assumes `volume` populated; no loading guard, shows "Nothing logged" mid-load **(inferred)** | AnalyticsScreen.js:549-600 | Initial load / stall before volume resolves | Parent `hasData &&` guard or in-strip skeleton |
| 15 | Med | MealPlan swap sheet `maxHeight:360` can clip many alternatives with no scroll cue **(inferred)** | MealPlanScreen.js:826 | Small screen / many swap options | `Math.min(360, height*0.6)` or let sheet size |
| 16 | Low | EmptyState button has no `accessibilityRole="button"`/label (only `onPress`) | EmptyState.js:66-74 | Screen-reader user on any empty screen | Add `accessibilityRole`/`accessibilityLabel` |
| 17 | Low | ActiveWorkout nav-tab name truncated to first 2 words + `numberOfLines={1}` inside `maxWidth:140` — can hide distinguishing words | ActiveWorkoutScreen.js:2463-2465,2507 | Many exercises with similar leading words | Show full name 1 line ellipsised, or widen |
| 18 | Low | MealPlan/grocery quantities (`item.grams`) unformatted | MealPlanScreen.js:742-744 | Bulk ingredient > 999 g | en-GB format |
| 19 | Low | MealPlan disabled item/pref rows have no disabled visual (opacity/colour) | MealPlanScreen.js:554,87 | Non-swappable food or busy regen | `opacity:0.6` when disabled |
| 20 | Low | MealPlan loading `ActivityIndicator` has no a11y label | MealPlanScreen.js:433 | Plan fetching | `accessibilityLabel="Loading meal plan"` |
| 21 | Low | CoachOutput `weekRangeLabel` renders "Invalid Date" if `weekStart` malformed (no guard) **(inferred)** | CoachOutputScreen.js:84-90,1646 | Corrupt/absent `weekStart` param | `Number.isFinite` guard + fallback string |
| 22 | Low | HomeScreen phase-banner chevron `TouchableOpacity` missing its own a11y label (inconsistent with sibling) **(inferred)** | HomeScreen.js:993 | Screen-reader on phase banner | Add `accessibilityLabel` |

---

## Corrected agent claims (verified false / overstated)
- **Diary food-name overflow** — NOT a defect: `EntryRow.js:45-46` already caps name
  and brand to 1 line.
- **Diary `mealSlots.map` crash guard** — low risk: `mealSlots` comes from the pure
  `buildMealSlots(...)` (`DiaryScreen.js:332`), which returns an array; downgraded.
- **WorkoutSummary tonnage formatting** — already correct (`:729` uses `'en-GB'`);
  the formatting problem is in WorkoutHistory/MealPlan/PDF, not here (item 4/5).

## Things that are already good (so we beat Hevy here)
- Shared `EmptyState` component with no-shame directional copy, used widely.
- ActiveWorkout has rich empty/stale/discard states and tabular-figure numerals.
- Skia share card and PDF both force `'en-GB'` on the **card** (only the PDF body lags).
- Dense interactive elements carry `accessibilityLabel`/`accessibilityRole` and 44-52dp targets.
