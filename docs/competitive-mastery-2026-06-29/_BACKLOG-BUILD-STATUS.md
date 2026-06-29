# Backlog build status — safe-gap completion wave (2026-06-29)

Tracks the build-out of the SAFE gaps from `_MASTER-GAP-MAP-AND-BACKLOG.md`,
audited against the live code first (see the gap-audit findings) so nothing was
duplicated or broken.

## Built + merged this wave
| Gap | What shipped | Files |
|-----|--------------|-------|
| #2 Recents-weighted search | typed search surfaces the user's own foods first | `searchTabs.js`, `FoodSearchScreen.js` |
| #3 kcal⇄kJ toggle | opt-in display unit across the food domain | `format.js`, store, settings, ~20 display sites |
| Styling (#19 part, #21, #32) | per-macro colours, remaining-hero, tonal chips, Larger-Text scaling | `MacroRings.js`, `theme.js`, `FoodDetailSheet.js` |
| #1 Home quick-log | nutrition glance + diary entry point in the Today strip | `HomeScreen.js`, `TodayStrip.js` |
| #2 meals-per-day | selectable range lifted 3–6 → 3–8 | `NutritionTargetsScreen.js`, `FoodSearchScreen.js` |
| #3 entry timestamps | logged time shown on each diary row (data already stored) | `EntryRow.js` |
| #11 targets in Settings | Pro row Settings → Nutrition targets | `SettingsScreen.js` |
| #1 renameable meals | custom meal names via Settings → Meal names | `mealSlots.js`, `MealNamesScreen.js` |
| #6 PDF report | "share with coach/GP" diary PDF beside CSV | `csvExport.js`, `FoodInsightsScreen.js` |
| #9 progress photos | device-local private gallery from Body metrics | `progressPhotos.js`, `ProgressPhotosScreen.js`, `BodyMetricsScreen.js` |

(Plus the earlier-merged one-tap re-log + serving picker.)

## Audited as ALREADY-SATISFIED (not rebuilt — no duplication)
- **#10 SSO-first onboarding** — Google/Apple OAuth already shipped (`OAuthButtons.js`, `LoginScreen.js`).
- **#9 one-`+` add-food consolidation** — the four affordances already converge on `FoodSearchScreen`/`logFoodEntry`; multiple affordances are intentional (scan / quick-add / copy).
- **#12 height/distance units** — height units are already derived from the body-weight unit choice (`usesImperialHeight`); a standalone toggle would duplicate it. Distance has no logged fields yet.
- **#14 grocery list, #4 multi-add** — already present (`groceryList.js`, the multi-select "plate").

## FLAGGED — founder decision required (ED-safety; NOT built)
- **#4 / #7 Per-meal "log your meals" reminders.** The app *deliberately* ships
  no meal-time eating reminder today (only a planned-meal confirm nudge, framed
  "never a guilt trip"). A recurring "you haven't logged" nudge is the
  adherence-pressure pattern the no-shame/ED rules guard against, and the
  flow-audit doc tagged it GATED. **Decision needed:** do we add gentle,
  per-meal, convenience-only reminders (no streak/guilt copy, calm-mode
  suppressed), or hold the line? Not started without your go.

## SKIPPED — with reason
- **#5 Recipe URL import.** Needs a schema.org/JSON-LD parser + fuzzy food-name
  matching to OFF/USDA + macro reconciliation — a new dependency and a large
  edge-case surface. High risk for low certainty; manual recipe building covers
  the need. Flag for a future, deliberate build.
- **#8 Per-day-of-week macro/calorie targets.** Training/rest **day cycling
  already exists** (`mealPlanAssembler.dayVariantTargets`). True per-DOW targets
  would require 7 targets each re-run through `calculateNutritionTargets()` so the
  sex/FFM floors + rapid-loss gate re-apply per day — a safety-floor
  re-architecture. Not a quick add; deferred to protect the floors.

## Device-walk notes (founder)
- **Home → Today strip:** new FOOD cell shows "X left" (or "Log"); taps to the
  diary. With weight+steps+cardio+food all present it lays out as a 2×2 grid.
- **Settings → Display → Energy units:** flip kcal⇄kJ; the food diary, rings,
  targets and insights all switch; coaching text + the engine stay in kcal.
- **Settings → Meal names:** rename Meal 1.. and Pre/Post-workout; the new label
  shows on the diary on return (focus-bound).
- **Body metrics → Progress photos:** camera/library capture; photos never leave
  the device.
- **Food insights:** "Export as PDF report" beside the CSV button.
