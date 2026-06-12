# a-09 — MEAL PLANS (post-rethink "much improved — can it be better?")

Audit agent 09 of the ULTIMATE-APP MANDATE. Code-verified, file:line evidence,
no internet. Plan side + the seam to the diary (a-08 owns the diary itself).
Branch claude/admiring-bohr-2kb7pd. British English throughout.

Surface read in full: mealPlanAssembler.js, mealPlanService.js, mealSwap.js,
planEdit.js, planExplain.js, planPreferences.js, curatedMeals.js, foodRoles.js,
curatedFoods.js, MealPlanScreen.js, TodaysPlateTeaser.js, sync/tables/mealPlans.js,
migrate_086_meal_plans.sql, the coach seam in CoachOutputScreen.js, the diary
door in DiaryScreen.js.

---

## 1. WHAT — the generation pipeline, step by step

1. **Door → service.** `generateAndSaveMealPlan(userId, profile)` (mealPlanService.js:171)
   loads the committed `nutrition_targets` row + saved meals in parallel.
2. **Target mapping with floor safety.** `storedTargetToEngineTarget` (:42) maps the
   row to the engine shape, derives a ±10% band, reconstructs `floorApplied` via
   `targetWasFloored`, and — the key clamp — **raises kcalMin to the target itself when
   floored** (:62) so no downstream rescale can dip below a 1,200/1,500 floor. No
   calorie is ever computed here.
3. **Prefs from profile.** `preferencesFromProfile` (:67) pulls diet + 8 plan prefs
   off the profile through `normalisePreferences` (clamps mealsPerDay 3–6, variety
   0–1, validates diet/fatConvention enums, dedupes arrays).
4. **Schedule.** `defaultSchedule(daysPerWeek)` (:83) spreads N training days evenly
   across 7 (Number.isFinite guard preserves a valid 0).
5. **Variant targets.** `dayVariantTargets` (assembler:78) derives TD/NTD from ONE
   engine target: protein identical, carbs the lever, fat per `fatConvention`
   ('equalised' default keeps fat flat; 'higher_rest_day' gives ~25% of the rest cut
   back as fat). Reduction capped at MAX_CYCLE_DELTA_KCAL=300, clamped to band, weekly
   total preserved; cycling **self-disables** when floored or when the meaningful-cycle
   floor (50 kcal) is not cleared (:107).
6. **Slot list.** `buildSlotList` (:182): numbered meal_1..N, pre/post-workout inserted
   only on training days when enabled. Intra-workout deliberately excluded.
7. **Slot character.** `slotCharacterFor` (:215): meal_1 = breakfast; final meal =
   lunch/dinner cooked main; middle = lunch/dinner/snack. (The curry-for-breakfast fix.)
8. **Pins first.** Pinned meals claim earliest compatible slot, macros subtracted
   (:283).
9. **Greedy fill.** Each remaining slot scored by `fitScore` over the per-slot macro
   share, minus a variety penalty (meal_1 discounted to 0.25× — people repeat
   breakfast), plus 0.15× rotation-pool affinity, plus peri-workout fat/protein nudges,
   plus seeded jitter (≤0.08). Character enforced; relaxes rather than leave a hole.
10. **Tolerance close-out.** Iterative macro-preserving rescale of carb→fat→protein
    staples (protein only while under-delivered) until the day lands in band; every
    portion clamps to a sane gram range and rounds to 5 g. Saved meals are fixed blocks,
    never rescaled. `withinTolerance` = in band AND protein ≥ 85% of target.
11. **Week.** `assembleWeekPlan` (:495): per-day seeded assembly with week-wide
    anti-repetition (`recentlyUsed`); `variety:0` switches to meal-prep mode (one
    assembled day per variant, reused). Snapshot via `buildPlanSnapshot` (target band +
    prefs + days + variants), saved as the single active plan.

**Swap pools (real, by reading the data):** food swap (`swapFoodInMeal`) holds the
role macro within ROLE_TOLERANCE_G, curated coach-style switches first then macro-
closeness fallback (e.g. white_rice → pasta, potato, noodles, quinoa; chicken →
turkey, cod, tuna, prawns, beef). Meal swap (`swapMealInPlan`) ranks slot-eligible
curated meals by symmetric macro distance, returns the closest as `replacement` then
a **style-diverse pool of up to 11** chosen greedily for unique (anchor|vehicle)
signature (`mealStyleSignature`) — genuinely different plates, not macro near-clones.

**Coach → plate:** `applyCoachAdjustmentToActivePlan` (service:233) routes a weekly
calorie delta through EVERY day via `applyMacroDeltaToPlan` (planEdit.js): protein
protected, carbs first then fat at 2.25:1 trade, peri-workout carbs deprioritised, a
floor double-clamp (a cut with no positive floor is a HOLD). `planExplain` narrates it
at the gram of rice in supportive/precise register, surfaced on CoachOutputScreen with
a deep-link to MealPlan.

**Library:** 159 curated meals (65 omnivore / 52 vegetarian / 45 vegan; 35 breakfast,
52 lunch, 24 dinner, 27 snack, 10 pre / 11 post). Protein-anchor quality classes
(high / moderate / carb_protein) gate per diet: omnivore meals must anchor 'high';
vegetarian may not anchor on a bare legume; vegan uses its uplifted plant library.

---

## 2. WHERE — entry points, placement, dead ends

- **RootNavigator.js:227** registers `MealPlan` inside the **gated Diary stack** — Pro
  only, correct gating.
- **Door 1 (primary):** DiaryScreen.js:582 `onPlanDay` on the **EmptyDiary** component.
  **FINDING (confirms a-08): this door only exists when the diary is empty.** Once a
  user logs anything, the meal-plan entry vanishes from the diary. There is **no
  persistent button** to reach an existing plan from a populated diary.
- **Door 2:** CoachOutputScreen.js:1675 deep-link — only appears **after** a coach
  calorie change is applied while already on a plan. Cannot discover the plan; only
  returns to it.
- **Door 3:** planExplain deepLink target 'MealPlan' (same path as door 2).
- **No Home entry, no You-tab entry, no Diary-tab persistent entry.** HomeScreen has no
  MealPlan navigation at all (grep clean). The free teaser (TodaysPlateTeaser) is shown
  on the Pro-locked diary but is **non-interactive by design** (no door for free users).
- **Dead end (a-08 finding verified):** `applyPlanDayToDiary` (service:278) hard-codes
  `entryDate: todayLocalKey()` at the call site (MealPlanScreen.js:160). **"Log this
  day" only ever logs to TODAY** — a prep user planning Day 3 cannot log it to a future
  date. The function itself accepts `entryDate`, so this is a UI limitation, not engine.
- **Day pager is abstract Day 1..7, not calendar-anchored** (screen:42-44), so there is
  no mapping from "today" to a plan day; the user must self-navigate.

---

## 3. FEEL — Besa vs Eddie

**Besa's first plan.** Defaults are gentle: 4 meals, variety 'Mixed', equalised fat,
peri-workout off. Empty state copy is warm and jargon-free ("Your plate, sorted… Your
targets stay the coach's job"). Calories lead; macros sit one tap behind; swap on every
plate; one-tap "Log this day". This is genuinely low-burden — BUT three frictions:
(a) she must **already have a committed nutrition target** or generation no-ops to a
toast (screen:129) — a cold-start cliff; (b) the **only way she finds the screen is an
empty diary**; (c) "Training today?", the day-type chip and the TD/NTD cycle note are
all visible by default — concepts a true beginner has not asked for.

**Eddie's prep usage.** Strong: per-meal grams+kcal on tap, day totals vs target,
day-type chip, honest residual line when constrained, explicit Training/Rest control
per day, `variety:0` "Repeat" meal-prep mode, 'higher_rest_day' fat convention, dry/
cooked state tracked in the food table. The precision is real. Gaps for him below.

**Copy tone** is consistently calm, factual, adherence-neutral, British English, no em
dashes, no motivational filler — matches the locked coaching voice. Swap toasts state
the held macro ("Macros held"), reinforcing trust.

---

## 4. GAPS / FRICTION vs the elite bar (variability, customisation, elite)

**Five biggest gaps**

1. **Discoverability is broken.** The plan is one of the app's richest Pro surfaces yet
   reachable only from an empty diary or a post-hoc coach deep-link. No persistent door
   anywhere. A paying user who logs food once may never find their plan again. This is
   the single highest-impact fix.
2. **"Log this day" is today-only.** A prep/athlete planning ahead cannot log a plan day
   to its real date; no date picker, no "apply this week to my diary". The engine
   already supports `entryDate` — only the UI hard-codes today (screen:160).
3. **Rotation-pool (3-3-3) has engine support but NO UI.** `poolAffinity` /
   `rotationPool` are wired through prefs and scored (assembler:160, :336) but there is
   **no screen control to choose staples** — a speccable, high-value customisation lever
   the founder's "3-3-3 pool" directive intended, left half-built.
4. **Preference surface is thin vs the bar.** The screen exposes only meals/day,
   variety, rest-day fat, workout meals. **Diet, exclusions and the allow/never-show
   list are not editable on this screen** — exclusions only happen reactively via a
   plate long-press ("never show me this"). No proactive "set my dislikes/allergens"
   panel, no cuisine preference, no per-meal pin UI (pins exist in the engine,
   pinnedMealIds, but there is no tap to set one).
5. **No sweet/savoury breakfast, no IF/skip-breakfast, no training-time carb nudge.**
   These RETHINK-class levers are absent. meal_1 is always breakfast-character with no
   way to say "I skip breakfast" (would need a meals-per-day-of-2 or a fasting toggle)
   or "I want savoury, not oats". Peri-workout placement is binary on/off, not
   time-aware.

**Engine limits observed**
- mealsPerDay clamped **3–6** (planPreferences:59); no 1–2 (IF / OMAD) and no 7+.
- No cuisine preference axis; no batch-cook / explicit prep-mode beyond variety:0.
- No household / two-person scaling, no budget axis, no shopping-list output.
- Week schedule is a fixed 7-day abstract spread; no calendar anchoring to real days,
  so the daily loop and the plan never line up automatically.
- Saved meals join the pool but as **fixed blocks** (savedCandidate, assembler:141):
  never rescaled, never food-swappable, can't be part-edited by the coach — a user's
  own meals get second-class treatment in the plan.

**Safety-envelope soft spots — clamps verified, they HOLD:**
- Floored target → kcalMin raised to target (service:62); cycling self-disables when
  floored (assembler:88).
- Close-out rescale clamps every portion to a sane gram range, rounds to 5 g
  (assembler:415); protein staples grow only while protein is short (:452).
- Swap solver clamps grams and only returns within ROLE_TOLERANCE_G (mealSwap:124-140);
  exclusions honoured everywhere (`foodAllowed`/`mealAllowed`).
- Coach edit: floor double-clamp, a cut with no positive floor becomes a HOLD, an
  already-below-floor plan refuses the cut and narrates "eat more" (planEdit:107-123,
  planExplain:53). belt-and-braces floor reconstruction for old snapshots
  (service:242). **No path found where a swap/edit/close-out can take a day below the
  floored target.** This is the strongest part of the area.
- One latent risk: the **meal-swap screen path** (`applyMealChoice`, screen:205)
  re-totals the day but performs **no band re-check or withinTolerance recompute** — a
  user swapping to a much lighter/heavier plate can silently drift the day off target
  with no honesty line, because `withinTolerance` is only set at assembly. (Not a
  safety-floor breach — the swap pool is macro-ranked — but a precision/honesty gap.)

---

## Unbuilt-RETHINK list (specced or directionally implied, still missing)

- Rotation-pool (3-3-3) **UI** — engine done, no controls.
- Sweet vs savoury breakfast preference — not modelled.
- IF / skip-breakfast / meals-per-day below 3 — clamped out.
- Training-time-aware carb nudge — only binary peri-workout on/off.
- Proactive exclusions / allergen / diet panel on the plan screen — reactive only.
- Pin-a-meal UI ("always keep my oats") — engine supports pinnedMealIds, no tap to set.
- Future-date / whole-week "log to diary" — today-only.
- Calendar-anchored schedule (plan days ↔ real days).
- Shopping list / batch-cook / budget / household scaling — none present.
- Verdict labels: **searched, none found** — the curated library carries protein-anchor
  *quality classes* (high/moderate/carb_protein) but **no user-facing "verdict" label**;
  the prompt's "verdict labels" appear to be unbuilt or were dropped.

---

## 5. Surface inventory (counts)

- **Screens: 1** — MealPlanScreen.js (day pager, day-type chip, Training-today control,
  plate cards, food-swap on tap, never-show on long-press, meal-swap sheet, preferences
  panel, Log this day, New meals).
- **Components: 1** — TodaysPlateTeaser.js (free read-only teaser). (Coach receipt card
  + deep-link live inside CoachOutputScreen, not a standalone component.)
- **Engine modules: 6** — mealPlanAssembler, mealPlanService, mealSwap, planEdit,
  planExplain, planPreferences (+ shared deps curatedMeals, curatedFoods, foodRoles,
  mealSuggest).
- **Sync: 1 table serialiser** — sync/tables/mealPlans.js (LWW on epoch-ms updated_at,
  tombstones, one-active-plan invariant) + migrate_086_meal_plans.sql (additive, RLS on,
  soft-delete only, no DELETE policy).
- **Prefs: 9** — diet, excludeFoodKeys, excludeTags, mealsPerDay, periWorkoutSlots,
  variety, rotationPool, fatConvention, pinnedMealIds. **UI-editable: 4** (meals/day,
  variety, rest-day fat, workout meals) + reactive exclude via long-press.
- **Data: 159 curated meals** (65/52/45 om/veg/vg), 3 protein-quality classes, FSA
  allergen tags, dry/cooked/ready state, gram clamps, curated swap-alternative lists.
- **Telemetry: 0** — no analytics/events on plan generate, swap, log-day, or pref
  change (grep clean). Sync errors are logged; user actions are not.
- **Tests: 7** — mealPlanAssembler, mealPlanService, mealPlanPersistence, mealSwap,
  planEdit, planPreferences, curatedMeals (+ MealPlanScreen.test.js,
  sync.mealPlans.test.js).
