Status: COMPLETE | Timestamp: 2026-06-01 | Phase 6: Build recommendations

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
| Pre/Post-workout tied to the session: show the day's workout in the header on training days, collapse to one muted line on rest days | High | Med | Needs the workout name + route; `hasWorkoutOnDate` exists (`DiaryScreen.js:87`), extend to return the session |
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
- New data/settings, small: a `waterTarget` preference (none exists today); the
  workout lookup needs to return the session name/route for the peri-workout
  link (the date check already exists).
- Reused, no new model: Frequents (`lib/food/frequents.js`), Saved meals
  (`createSavedMeal`), `isTrainingDay`, rollup, water storage all already
  exist. The quick-log strip and the training link are presentation over data
  that is already there.
- Locked constraints unchanged: adherence-neutral colour, `#0D0D0D` background,
  no gradients, amber-only accent, plain no-cheerleading copy. None of the
  above touches those.

## Suggested sequence

1. Tier 1 in one pass: it removes the "unfinished" read (cards, no dashed boxes,
   designed empty state, per-meal protein) at low cost and is independently
   shippable.
2. Tier 2 next: macro bars, the quick-log strip, the peri-workout link, water
   with a target. This is where the tab becomes genuinely best-in-class for a
   training user.
3. Tier 3 last: the motion and gesture polish, once the structure is settled,
   so animations are tuned against the final layout.

Each unit is independently shippable and testable; none requires a data-model
migration. Recommend a re-screenshot of the empty, partial and fully-logged
states after Tier 1 and again after Tier 2 to confirm the premium bar is met.
