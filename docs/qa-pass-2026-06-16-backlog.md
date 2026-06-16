# Founder QA pass — backlog (2026-06-16)

Live QA sweep of the food / meal-plan / progress / partner / recap surfaces.
Branch: `claude/audit-work-quality-review-benrin`. One item at a time, lint +
full test + (for features) fresh-eyes review, per CLAUDE.md.

## SHIPPED (pushed)
1. PROG-1 — progression null-mrv cap (no +Infinity). `e6519c6`
2. Remove weight-trend card from the food Diary. `9e61d79`
3. Meal-plan copy: drop "plate" for food (UK English). `86df8cb`
4. Diary planned banner counts MEALS not food items ("5", not "20"). `2b5ce43`
5. Remove duplicate Training-partner card from Consistency. `4225eb8`
6. Toast: guarantee a dismissed toast leaves the screen (delete-undo bug). `c086008`

## DECIDED — queued (smaller)
- D1 Meal variety default → **Repeat**; "Mixed/variety" opt-in in Preferences.
  Engine already supports it: `src/lib/food/mealPlanAssembler.js:674` (`variety===0`
  = repeat). Flip default in `src/lib/food/planPreferences.js:31` + the prefs control.
- D2 Remove **rest-day fat** (fatConvention) control from Preferences UI
  (`src/screens/MealPlanScreen.js:573`). Keep engine default `equalised` internally.
- D3 Make the **Preferences** entry prominent on the meal-plan screen (too hidden).
- D4 Week picker → **real next-7-days** (Mon/Tue/… or dates), not "1–7"
  (`src/screens/MealPlanScreen.js:47` `DAY_LABELS`; dates exist — day i = today+i).
- D5 Rename Diary **"Plan my day"** button → **"Build a meal plan"**
  (`src/components/food/EmptyDiary.js:30`, `src/screens/DiaryScreen.js:815`).

## HELD — needs founder OK
- H1 Rename **"Plan a bigger day"**. Founder suggested "Calorie Banking", but that
  reintroduces the 'save up' framing banned for ED-safety
  (`docs/ultimate-audit-2026-06-13/pass3-v2-founder-decisions.md:123`). Need an
  explicit override or a safe alternative before renaming.

## FEATURES — substantial, hands-on (after bugs)
- F1 **Calorie banking moves planned food.** Founder decision 2026-06-16: on a
  reduced day, trim planned food to the new target; on the bigger day, add; notify
  coach-style ("we've removed some rice from Meal 1 and Meal 3 to keep your macros")
  and tell the user they can adjust. Safety-sensitive (floors) → extend the CB-1
  blueprint, invariant tests, founder sign-off before touching the maths.
  Source: `docs/ultimate-audit-2026-06-13/pass4-blueprint-calorie-banking.md`,
  engine `src/lib/food/calorieBank.js`, surface `src/screens/DiaryScreen.js:243-258`.
- F2 **Recaps as Instagram-style stories.** Volyume logo, more stylish, timed
  auto-advance to the next slide (not manual swipe).
  `src/screens/YearOfLiftsScreen.js` + the recap card viewer.
- F3 **Planned-meal reminder + confirm prompt** ("ate as planned"). Coach nudges
  users to confirm logged-but-unconfirmed planned meals.
  `src/lib/food/db.js:191 confirmPlannedDay`, `src/screens/DiaryScreen.js:750`.

## COPY / VOICE — app-wide
- C1 Rewrite the clipped, fragment "AI slop" microcopy in **human British English**
  across (at least): recaps (`YearOfLiftsScreen.js` buildMonth/Year/Block cards —
  "Same bar, new numbers to chase.", "That's consistency.", "Every set, stacked end
  to end.", "They count.", "{label}, lifted."), Training partner
  (`src/screens/PartnerScreen.js`), and a sweep for the same cadence elsewhere.
  Update `src/screens/__tests__/recapCards.test.js` assertions.
  NEEDS: agree a short voice direction + before/after examples with founder first
  (3 rejections so far), then apply in one pass.

## BUGS — remaining
- B1 Confirm calorie-banking target actually shifts on device + add a regression
  test (the shift is small with default +150 so easy to miss; path reads correct).
  Largely superseded by F1.
- B2 Regression test locking the week-schedule writing all 7 future days
  (`applyPlanWeekToDiary`); the original "rest of the week lost" report now appears
  to have been the meal-count mislabel (#4), but lock it with a test.

## OTHER UX
- U1 Train/Home weight·steps·cardio card: remove the sparkline "squiggle" that
  bleeds from weight into steps; move the card **above** the workout card, not below.
