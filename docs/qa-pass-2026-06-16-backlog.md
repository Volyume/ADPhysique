> ⚠ STATUS (2026-07-10): SUPERSEDED/CLOSED - do not build from this document. June 2026 founder QA backlog on a squash-merged branch. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md. Pre-campaign items require the D37 triage rule before any consideration.

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
7. Meal-plan UX cluster: variety default→Repeat, remove rest-day-fat from prefs,
   prominent Preferences, real weekday picker, button→"Build a meal plan" (D1–D5). `38204ef`
8. Home strip: remove weight sparkline squiggle + move strip above the workout (U1). `270fe06`
9. Training partner: deep research (matches/beats the standard), human British copy
   rewrite, recreated the missing `bp-partner-system-rebuild.md` blueprint. `620f4df`
10. H1 — rename "Plan a bigger day" → "Plan a higher-calorie day" everywhere, plus a
    plain explanation of the feature on the sheet. `2406b5a`
11. F1 — calorie banking MOVES PLANNED FOOD (CB-1b): engine spine `1dfad1c`,
    orchestration + per-day notice + restore-on-clear `bc6746e`. Spec `df76614`.
    Under fresh-eyes safety review.
12. C1 — recap copy rewritten to human British English (month/year/block). `d66ba8f`
13. F2 — recaps as Instagram-style stories: auto-advance with animated progress
    pips + Volyume logo. `06e242b`
14. F3 — planned-meal "ate as planned" reminder push: spec `cc329cd`, registration
    + copy + route `a9f1ecb`, scheduler + Coaching-reminders toggle `914dac0`.
    Pro-only, 20:00 local, today-only, ED-suppressed, budgeted, self-suppressing.

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
- Voice agreed with founder 2026-06-16 (full human British sentences, no clipped
  fragments, no em dashes) and applied to the Training partner surfaces (shipped #9).
- C1 REMAINING: recap copy (`YearOfLiftsScreen.js` buildMonth/Year/Block cards —
  "Same bar, new numbers to chase.", "That's consistency.", "Every set, stacked end
  to end.", "They count.", "{label}, lifted.") + `recapCards.test.js`. Folded into
  the F2 recap-as-stories workstream (same surface — do copy + restyle + auto-advance
  together). Must preserve the delta-caption SAFETY rules (never negative-framed,
  neutral under calm/ED, no fabricated comparison).
- C1 SWEEP: still to audit other screens for the same cadence.

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
