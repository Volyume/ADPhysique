# Move #1: Food foundation + FFM floor (locked)

The bundled move. Ships food schema, manual food entry UI, and the
30 kcal/kg FFM/day safety floor as one unit. Locked 2026-05-23.

## Why this is one move not two

The FFM floor guardrail needs food intake data to fire. The food
data is a liability without the guardrail to enforce safety. They
unlock each other; shipping separately doubles the risk of an
intermediate state where one ships without the other.

## Scope

### Database (migration 005)

All schema in `DATABASE_SCHEMA_LOCKED.md` Section "Food domain":

- `foods` table (canonical food records, RLS read for authenticated)
- `custom_foods` table (user-created)
- `food_entries` table (the diary)
- `daily_intake_rollups` (derived totals, trigger-maintained)
- `saved_meals` table (groundwork; full UX in move #1.5+)
- `recipes` + `recipe_ingredients` (groundwork)
- `food_favourites` table
- `daily_water` table

Plus the two food sync RPCs (`food_sync_pull`, `food_sync_push`).

### Engine code

```
src/lib/nutritionEngine.js
  + computeFFMFloor(weight_kg, bf_pct?) -> kcal/day
  + extends computeAdaptiveTDEEAdjustment to consult FFM floor on
    deficit suggestions
  + new return field: floor_held: boolean

src/lib/weeklyCoach.js
  + new held-decision type: 'ffm_floor_hold'
  + new WHY_LIBRARY key 'ffm_floor_hold' with locked copy
  + new WHY_LIBRARY key 'food_data_insufficient' for when food
    history is too sparse for the floor check
```

### UI

```
src/screens/DiaryScreen.js                NEW
src/screens/SearchScreen.js               NEW
src/screens/FoodDetailSheet.js            NEW
src/screens/AddCustomFoodScreen.js        NEW
src/screens/HomeScreen.js                 EXTENDED (today's intake card)
src/screens/BodyMetricsScreen.js          EXTENDED (7-day intake line)
src/screens/InsightsScreen.js             EXTENDED (today + 7-day panel)
src/navigation/RootNavigator.js           EXTENDED (Diary tab)

src/components/food/
  MacroRings.js                           NEW
  MealSection.js                          NEW
  FoodRow.js                              NEW
  ServingPicker.js                        NEW
  EntryRow.js                             NEW
  SourceChip.js                           NEW
  EmptyDiary.js                           NEW
  HeldDecisionCard.js                     NEW (variant of card primitive)
```

### Food data layer

```
src/lib/food/
  waterfall.js                            NEW (orchestrator, steps 1-3 only at this move)
  sources/
    localCache.js                         NEW
    bundledOff.js                         NEW
    cofid.js                              NEW
  normalisers/
    offToFood.js                          NEW
    cofidToFood.js                        NEW
  sanityChecks.js                         NEW
```

Note: live OFF and USDA APIs (steps 4 and 5 of the waterfall) ship
in move #1.5 alongside the barcode scan. Move #1 covers manual
entry + local cache + bundled snapshots.

### Sync

```
src/lib/sync/registry.js                  EXTENDED with food tables
```

The hand-rolled sync engine itself is already locked in
`SYNC_ARCHITECTURE_LOCKED.md`. Move #1 wires up the food tables.

### Seed scripts (CI / one-time)

```
scripts/seed/
  buildOffSnapshot.js                     NEW
  buildCofidSnapshot.js                   NEW
```

Snapshot bundles ship in the app binary at first move #1 build.

### Onboarding extension

```
src/screens/onboarding/FoodLayerIntroScreen.js   NEW
```

Inserted between Equipment+Frequency and Notifications Permission.

### Telemetry

```
src/lib/telemetry/events.js               EXTENDED with food events
  food_search_attempt
  food_logged
  custom_food_created
  ffm_floor_hold_fired
  held_decision_created (already exists)
```

## Tests required

From `TESTING_STRATEGY_LOCKED.md`:

### Engine

- `tests/engine/ffmFloor.property.test.js`: property tests for the
  floor calculation.
- `tests/engine/ffmFloor.scenarios.test.js`: simulator scenarios
  `red_s_trajectory`, `straight_cut`, `aggressive_cut_supervised`.

### Sync

- `tests/sync/food_entries.test.js`
- `tests/sync/custom_foods.test.js`
- `tests/sync/daily_intake_rollups.test.js`
- `tests/sync/food_favourites.test.js`
- `tests/sync/daily_water.test.js`

### UI

- `tests/screens/DiaryScreen.test.js` (snapshot + interaction)
- `tests/components/food/MacroRings.test.js`
- `tests/components/food/FoodRow.test.js`

### E2E (Maestro)

- `e2e/diary_log_first_meal.yaml`
- `e2e/diary_swipe_delete.yaml`

## Acceptance check

- Migration 005 runs clean on a fresh Supabase project.
- Bundled OFF snapshot loads into `foods` on first run; SQLite
  reports ~185k rows.
- Bundled CoFID loads into `foods` with source = 'cofid'.
- Manual food entry flow: type a name, set serving, add to diary,
  see it in today's diary with correct macros.
- Edit a logged entry: change serving size, macros and totals
  update.
- Delete a logged entry via swipe.
- Synthetic `red_s_trajectory` scenario fires `ffm_floor_hold`
  within the first 2 simulated weeks.
- Synthetic `straight_cut` scenario never fires `ffm_floor_hold`.
- `aggressive_cut_supervised` (goal-lock true) does not fire it
  until below 30 kcal/kg FFM/day.
- Today's Intake card on Train tab shows correct totals for a day
  with logged entries.
- Cold open of Diary tab under 1.0s on mid-range Android.
- All food-related events surface in the telemetry table.
- 903+ existing tests still pass.

## Effort estimate

2-3 weeks of focused implementation. The schema and snapshot work
are straightforward; the UI surfaces (Diary, Search, food detail
sheet) need careful work to feel native to the existing app.

## Out of scope at this move

- Barcode scanning (move #1.5)
- OCR fallback (move #1.5)
- Live OFF / USDA APIs (move #1.5)
- Saved meals / recipes full UX (move #1.5 or v1.1)
- ED-pattern detection (move #2)
- Differential paywall output (move #4)
- Three-tier infrastructure (move #5)

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Bundled OFF snapshot is too large (binary size) | Compressed; only UK products; OTA delta refresh path planned |
| FFM floor threshold miscalibrated | Conservative at launch (30 kcal/kg FFM/day per Mountjoy); tightened on telemetry |
| Manual food entry is too slow for users used to MFP | This move is foundation; barcode + frequents land in move #1.5 |
| Schema change to existing tables | None; all new tables; existing tables untouched |
| Test suite slows down with new tests | Acceptable; sync tests are most of the new volume |
