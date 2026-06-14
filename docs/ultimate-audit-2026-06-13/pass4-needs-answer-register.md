# PASS-4 — NEEDS-ANSWER REGISTER

Per `_AUDIT-SPEC.md:241-250`: any fact a blueprint needs but Pass 1/2/3 doesn't hold is logged here as an NA-id.
The agent/author does NOT guess. A targeted codebase read answers each with a CONFIRMED file:line. NO blueprint is
final while it holds an open NA-id (`:270-271`). Status: OPEN until answered.

## SPINE ITEMS (hand-written blueprints)
### Calorie banking (`pass4-blueprint-calorie-banking.md`)
- NA-cb-1 OPEN — generalise `dayVariantTargets` vs add `bankedDayTargets`? | src/lib/food/mealPlanAssembler.js, mealPlanService.js
- NA-cb-2 OPEN — exact file:line of check-in calorie-adherence derivation reading diary-vs-target | src/lib/weeklyCoach.js, src/screens/WeeklyCheckInScreen.js
- NA-cb-3 OPEN — surface placement (Diary day view vs Nutrition Targets) | src/screens/DiaryScreen.js, NutritionTargetsScreen.js
- NA-cb-4 OPEN — exact Pro gate fn for food/nutrition surfaces | src/components/ProGate.js, src/navigation/RootNavigator.js
- NA-cb-5 OPEN — `macroCycle`/`refeed` persistence path to mirror for `calorieBank` | src/store/useAppStore.js, src/lib/database.js

### Micronutrients / NRV (`pass4-blueprints-micronutrients.md`)
- **NA-mn-1 OPEN (BLOCKING)** — Pass-1 Q1 schema authority (setup_complete.sql 252 vs schema.sql 187 vs migrations 114) | supabase/setup_complete.sql, supabase/schema.sql, supabase/migrate_*.sql
- NA-mn-2 OPEN — which micronutrient columns the CoFID import carries | src/lib/food/seed.js, assets/seed/cofid_uk.dat
- NA-mn-3 OPEN — sync registry/mapping file for new food columns | src/lib/sync.js, src/lib/food/libraryDelta.js
- NA-mn-4 OPEN — exact Pro gate fn for diary/food surfaces | src/components/ProGate.js, src/navigation/RootNavigator.js

## CLUSTER-AGENT ITEMS (appended on agent return)
- NA-nutrition-* : pending (nutrition cluster agent)
- NA-coaching-* : pending (coaching/progress cluster agent)
- NA-wr-* : pending (workout/recap cluster agent)
- NA-cux-* : pending (cardio/UX cluster agent)

## RESOLUTION
A targeted codebase read answers each open NA-id with a CONFIRMED file:line; the owning blueprint is then completed.
The Pass-4 exit gate (`pass4-final-reconciliation.md`) cannot pass while any NA-id is OPEN.
