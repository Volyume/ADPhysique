Status: COMPLETE (plan) | Timestamp: 2026-06-01 | Phase 6: Build recommendations

## Implementation progress (2026-06-01)

SHIPPED to `main`, the visual-elevation tier (Diary-local, tested, needs a
device look before final sign-off):
- Stage 1a (`6efadec`): one card language for meal sections, in-card item rows,
  per-meal kcal + protein subtotal, title-case meal names. Removes the dashed
  boxes at the root.
- Stage 1b (`f567e00`): designed empty-state card (replaces six section cards +
  trailing sentence), single FAB, dead-style cleanup, locked `EMPTY_DIARY_COPY`
  superseded (doc + test updated).
- Stage 2 macro bars (`d4a66f1`): macro sub-rings become protein-first bars,
  adherence-neutral amber kept.
- Stage 2 water (`4a6cb85`): water tracker becomes a progress bar in the card
  language (default 3 L target, flagged for a per-user setting).

SHIPPED, the structural meal-model unit:
- Flexible numbered-meal model (`9247b59`): "Meal 1..N" + Pre/Post-workout as
  always-available named meals (no training-day detection), one shared
  `mealSlots.js` source of truth, follows the existing `@volyume_meals_per_day`
  preference, "Add meal" affordance, back-compat tested (legacy diaries keep
  showing), suggestion re-keying done. Ships with migration 059 (`99a5eea`,
  drafted + tracked, founder applies).

REMAINING (optional / polish, best tuned on device):
- Quick-log strip on the diary: largely covered already by the add flow, which
  surfaces Recents / Suggested / Favourites / Frequents tabs (`FoodSearchScreen`
  `SEARCH_TABS`). A diary-level strip would save one tap; optional enhancement.
- Collapsible meal sections (minor UI state).
- Stage 3 polish: count-up on the calorie number, ring sweep, entry-insert
  animation, haptics on add, swipe between days, week strip. Animation work is
  best tuned against the real layout on a device.

---


# Prioritised build recommendations

Units scored Impact (premium feel + usability) x Effort. Effort is relative
engineering size. Dependencies flagged. Confirmed scope note:
`MacroRings`, `EntryRow` and `MealSection` are imported only by
`DiaryScreen.js` (grep), so redesigning them carries no cross-tab risk. There
is no existing water target setting.

## Tier 1: visual quick wins (low effort, immediate lift)

| Unit | Impact | Effort | Notes / deps |
|---|---|---|---|
| One card language: wrap each meal in a `surface`+border+`radius.lg` card; drop the dashed "Add food" box for a quiet in-card add row | High | Low-Med | `MealSection.js` only. Single biggest "premium" lift |
| Items as in-card rows with hairline dividers, not per-item bordered cards | High | Low | `EntryRow.js` only; keep swipe/edit |
| Per-meal subtotal shows kcal AND protein ("420 kcal · 38g P") | High | Low | `MealSection.js:11`; cheap, big for a training user |
| Redesigned empty state: slim add-lines + one "Add food" CTA + Scan/Copy buttons; remove the trailing `EmptyDiary` sentence and dead `empty*` styles | High | Low-Med | `DiaryScreen.js:469-487,769-775`, `EmptyDiary.js` |
| Typography pass: semantic `type` roles everywhere, drop the shouty uppercase meal label, tabular-nums on all numbers | Med | Low | `MealSection.js`, `EntryRow.js`, `MacroRings.js` |
| Fix the stale "four meal sections" comment | Low | Low | `DiaryScreen.js:7` |

## Tier 2: structural changes (medium effort, high visibility)

| Unit | Impact | Effort | Notes / deps |
|---|---|---|---|
| Macro sub-rings -> three slim bars, protein first and primary | High | Med | `MacroRings.js` (Diary-only); update its test. Keep the calorie ring and adherence-neutral amber |
| Quick-log strip of Frequents + Saved meals on the diary (one-tap re-log) | High | Med | Reuses `lib/food/frequents.js` + saved meals. The biggest logging-speed win (retention hinge) |
| Flexible numbered-meal model ("Meal 1..N", renameable, user meal count) replacing fixed Breakfast/Lunch/Dinner/Snacks; Pre/Post-workout kept as anchors | High | High | The largest item, and the only one needing a data change. See dependencies |
| Pre/Post-workout as first-class always-available named meals in the flexible model (no training-day detection, no scheduling, no rest-day collapse) | Med | Low | Part of the meal-model item; presentation only, no workout lookup |
| Water as a progress bar with a target, in the card language | Med | Med | New `waterTarget` preference (small settings + storage add). `WaterRow` is inline in `DiaryScreen.js:629` |
| Copy-yesterday out of the empty-only FAB: into the empty state + a day-pager overflow, available any day; consolidate to one FAB cluster | Med | Low-Med | `DiaryScreen.js:511-538` |
| Collapsible meal sections that remember state | Med | Med | `MealSection.js` + a small persisted UI state |

## Tier 3: enhanced interactions (polish, once structure is right)

| Unit | Impact | Effort | Notes / deps |
|---|---|---|---|
| Calorie count-up + ring sweep animation on change/entry | Med | Low-Med | `MacroRings.js`; Skia already in place |
| Entry insert: scale-and-settle when a logged item lands | Med | Med | `MealSection.js` / `EntryRow.js` |
| Light haptic on add and on hitting a macro target (haptic only, no colour/copy) | Low-Med | Low | `expo-haptics` already a dep |
| Swipe between days over the body | Med | Med | Gesture handler already in use (Swipeable) |
| Seven-day strip above the summary (logged/partial/empty by fill) | Med | Med | New small component; lower priority |

## Dependencies and shared-model notes

- No cross-tab component risk: `MacroRings`, `EntryRow`, `MealSection` are
  Diary-only. Tests for `MacroRings` and the food components will need updating
  alongside.
- New data/settings, small: a `waterTarget` preference (none exists today). No
  workout lookup is needed: Pre/Post-workout are just named meals, not tied to
  a detected session (corrected 2026-06-01).
- Reused, no new model: Frequents (`lib/food/frequents.js`), Saved meals
  (`createSavedMeal`), `isTrainingDay`, rollup, water storage all already
  exist. The quick-log strip and the training link are presentation over data
  that is already there.
- Data change, flagged (the one exception): the flexible numbered-meal model
  needs `food_entries.meal_slot` to become a flexible key. The cloud CHECK is
  locked to six values (`migrate_057...`), so it needs widening or dropping (a
  migration), and `meal_slot` is read across ~18 files (search, scan, recipes,
  saved meals, breakdown, CSV export, curated meals, sync). Widening the CHECK
  is additive and frozen-build-safe (the old build keeps writing its six valid
  values; an unknown new key synced down falls outside its fixed buckets rather
  than crashing). This is a food-domain change, not Diary-only, and is the
  largest piece of work in the redesign. Everything else is Diary-local.
- Suggested-meal re-keying (part of the meal-model item): the "+" picker is
  fed by curated meals/foods tagged to the fixed slot names (`curatedMeals.js`
  `slots`, `mealSuggest.js:slotMatches`). Numbered meals break that name-based
  filter. Recommended: keep the tags, infer a suggestion context (early / main
  / small / peri-workout) from the meal's time/size/position and map it to the
  existing tags, falling back to the macro-driven ranking that already exists.
  Add peri-workout curated meals at the same time (none exist today,
  `curatedMeals.js:15`). This avoids a hand re-tagging pass but must ship with
  the meal-model change, not after it.
- Locked constraints unchanged: adherence-neutral colour, `#0D0D0D` background,
  no gradients, amber-only accent, plain no-cheerleading copy. None of the
  above touches those.

## Suggested sequence

1. Tier 1 in one pass: it removes the "unfinished" read (cards, no dashed boxes,
   designed empty state, per-meal protein) at low cost and is independently
   shippable.
2. Tier 2 next: macro bars, the quick-log strip, water with a target, and the
   flexible numbered-meal model (with Pre/Post-workout as always-available named
   meals). This is where the tab becomes genuinely best-in-class for a training
   user.
3. Tier 3 last: the motion and gesture polish, once the structure is settled,
   so animations are tuned against the final layout.

Every unit except the flexible numbered-meal model is Diary-local and needs no
data change; the meal model is the one item that needs a `meal_slot` migration
and food-domain-wide touches, so it should be planned as its own piece rather
than folded into the visual passes. Recommend a re-screenshot of the empty,
partial and fully-logged states after Tier 1 and again after Tier 2 to confirm
the premium bar is met.
