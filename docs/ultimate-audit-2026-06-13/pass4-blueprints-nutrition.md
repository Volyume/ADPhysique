# Pass-4 Implementation Blueprints — NUTRITION cluster

Scope: the five founder-APPROVED nutrition items only (decisions logged in
`docs/ultimate-audit-2026-06-13/pass3-v2-founder-decisions.md`). Provenance,
voice, and safety constraints carried from the same decisions log, the matrix
(`pass3-comparison-matrix.md`), and the locked voice doc
(`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`).

Source-tag legend (per `_AUDIT-SPEC.md:252-271`):
`[P1:file:line]` = read-verified implementation fact ·
`[P2:finding-id]` = research (provenance + sourced/simulated stated) ·
`[P3:gap]` = gap from matrix/decisions · `[INFERENCE]` = my own conclusion.

Voice note applied to ALL copy below: British English, no em/en dashes,
plain term leads, numbers-first, honesty test, no banned phrases
(`COACHING_VOICE_SYNTHESIS_LOCKED.md:557-577`). None of these items touch
`src/coaching/safety` or any calorie floor.

---

## ULTIMATE-NUT-01 — Raw / cooked weight entry toggle

**CLUSTER:** Nutrition / meal building
**PRIORITY TIER:** Tier-1 (founder ACCEPTED with refinement)
**IMPACT:** High (removes a real logging-error class: over/under-cooked yield)
**EFFORT:** Medium-High (needs a conversion-factor source; new per-entry state)
**PRIORITY SCORE:** High impact / Medium-High effort — build, but the
conversion-factor source must be resolved first (NA-nutrition-1).

### CURRENT STATE
- The data layer already classifies each curated food's weight state as
  `'dry' | 'cooked' | 'ready'` via `stateOf(foodKey)`, defaulting to `'ready'`
  for anything unlisted [P1:src/lib/food/foodRoles.js:248-250]. The map marks
  oats/pasta/whey etc. `'dry'` and rice/quinoa/potato/legumes `'cooked'`
  [P1:src/lib/food/foodRoles.js:142-149].
- The comment states the trap explicitly: "50 g dry pasta is ~115 g cooked
  with identical carbs" [P1:src/lib/food/foodRoles.js:139-141]. This is a
  LABEL of what a stored gram figure means; there is no conversion FUNCTION.
- Per-100g macros are a pure table; `resolveComponent(foodKey, grams)` multiplies
  per-100g by `grams/100` with no weight-state awareness
  [P1:src/lib/food/curatedFoods.js:114-128].
- The diary stores one number per entry, `quantity_g`, with no weight-state
  column [P1:src/lib/food/db.js:51-62]; the entry shape documents only
  `quantityG` [P1:src/lib/food/db.js:31].
- A logged plan day fans each item's `quantityG` straight into `logFoodEntry`
  [P1:src/lib/food/mealPlanService.js:281-298].

### THE GAP [P3]
Founder decision: support BOTH raw/uncooked AND cooked weight as per-item
options at log/build time; raw is how most people weigh, cooked yield handles
batch variance and leftovers [P3:pass3-v2-founder-decisions.md:50-56]. Call-3
confirms: "the gap is a user-facing choice to weigh raw OR cooked at log/build
time; engine converts via existing weight-state"
[P3:pass3-v2-founder-decisions.md:103-105]. The data layer knows dry/cooked but
nothing converts between weighed-state and the table's per-100g basis [P3].

### THE EVIDENCE [P2]
- Cooked-yield need is corroborated: MacroFactor ships a "Total Weight"
  cooked-yield, with a leftover-pain quote (Claude, live-browsed/sourced) and a
  "cooked yield problem" note (Gemini, simulated)
  [P2:RC — pass3-comparison-matrix.md:403-417]. Provenance: Claude=sourced
  (MF changelog v5.7.6), Gemini=simulated/single-source.
- The dry/cooked "trap" itself is grounded in the round-2 USDA-verified meal
  research cited in code [P2:src/lib/food/foodRoles.js:11-12, :139-141].

### NEWBIE EXPERIENCE AFTER CHANGE
A beginner weighs rice straight from the pan (cooked) or oats from the packet
(dry) and picks the matching choice; the numbers are right either way without
them learning conversion ratios. Default stays whatever the food's natural
state is, so a beginner who never touches the toggle is never wrong.

### ATHLETE EXPERIENCE AFTER CHANGE
A competitor batch-cooking rice can weigh the cooked yield of the whole batch
and log the portion in cooked grams; if they over- or under-cooked, the cooked
figure they actually put on the plate is the figure logged, not a dry weight
that no longer matches the pan.

### IMPLEMENTATION BLUEPRINT

**FILES TO CHANGE**
- `src/lib/food/foodRoles.js` — add a conversion-factor lookup keyed by food
  (NEW function, alongside `stateOf` at [P1:src/lib/food/foodRoles.js:247-250]).
- `src/lib/food/curatedFoods.js` — make portion resolution weight-state aware
  (a new `resolveComponentInState(foodKey, grams, enteredState)` next to
  `resolveComponent` at [P1:src/lib/food/curatedFoods.js:114-128]; leave the
  existing pure `resolveComponent` untouched for back-compat).
- `src/lib/food/db.js` — extend the entry to carry the entered weight state
  (logFoodEntry signature/insert at [P1:src/lib/food/db.js:39-62]).
- `src/screens/MealPlanScreen.js` — per-item weight-state choice on the
  expanded plate (item rows at [P1:src/screens/MealPlanScreen.js:419-437]).
- The food-logging portion entry surface (where a user types grams). NEEDS
  ANSWER on exact file:line — see NA-nutrition-2.

**DATA**
- `food_entries.weight_state` TEXT — NEW column, values `'as_weighed'` (default,
  = today's behaviour: the number is the eaten/labelled basis) | `'raw'` |
  `'cooked'`. Added to the insert at [P1:src/lib/food/db.js:51-62]. Must be a
  Supabase migration per the architecture rules; default preserves every
  existing row's meaning (NA-nutrition-3 on the exact migration mechanics).
- A NEW conversion-factor constant in `foodRoles.js`. Per-food
  raw<->cooked gram ratios. CANNOT be invented — see NA-nutrition-1.
- No new tables.

**COMPONENT STRUCTURE**
Parent: `MealPlanScreen` (imports its food/service helpers at
[P1:src/screens/MealPlanScreen.js:31-40]). A small inline segmented control
re-using the existing `PrefRow` radio pattern
[P1:src/screens/MealPlanScreen.js:63-88] for the per-item raw/cooked choice
on the expanded plate. No new screen.

**USER FLOW**
1. User expands a plate; item rows render (today: tap-to-swap)
   [P1:src/screens/MealPlanScreen.js:417-437].
2. For an item whose food has a non-`'ready'` state
   [P1:src/lib/food/foodRoles.js:248-250], a raw/cooked choice shows beside the
   grams. State change writes the chosen weight state into local plan state.
3. Choosing a state recomputes that item's displayed grams via the NEW
   `resolveComponentInState` (macros are unchanged; only the gram figure the
   user is told to weigh is converted), persisting through the existing
   `updateMealPlan` path [P1:src/screens/MealPlanScreen.js:215, :247].
4. On manual food logging, the portion-entry surface offers the same choice;
   `logFoodEntry` stores `weight_state` plus the grams as entered
   [P1:src/lib/food/db.js:39-62]. (Surface file: NA-nutrition-2.)
5. "Log this day" continues to fan items through `logFoodEntry`
   [P1:src/lib/food/mealPlanService.js:281-298], now carrying the per-item
   weight state.

**ENTITLEMENT GATING**
PRO. The whole meal-plan + diary branch sits in the Diary stack whose entry is
`GatedDiary = withProGuard(DiaryScreen, 'Food diary')`
[P1:src/navigation/RootNavigator.js:160, :217-265]; `MealPlanScreen` is a child
of that gated stack [P1:src/navigation/RootNavigator.js:226-230]. No separate
gate needed; free users never reach the food diary
(CLAUDE.md FREE vs PRO: food diary is Pro).

**EMPTY STATE**
No standalone empty state (the toggle is an attribute of existing item rows).
When a food has no raw/cooked distinction (`stateOf === 'ready'`
[P1:src/lib/food/foodRoles.js:248-250]) no choice is shown.

**LOADED STATE**
Item row shows the grams in the chosen state with a quiet label, e.g.
`"180 g rice, cooked"` / `"60 g oats, dry"`. The choice control reads as
`Weigh: [ Raw ] [ Cooked ]`. Numbers lead the label.

**ERROR STATE**
If a conversion factor is missing for a food, fall back to `'as_weighed'` and
show the grams with no state label (never guess a ratio). British copy if a
write fails, matching the existing pattern: `"Couldn't update the day. Try
again."` [P1:src/screens/MealPlanScreen.js:182].

**EDGE CASES**
- Food with `stateOf === 'ready'` (cooked meat, fruit, dairy): no toggle, eaten
  as weighed [P1:src/lib/food/foodRoles.js:141, :248-250].
- A `'dry'` food (oats, whey, pasta) defaults to dry; a `'cooked'` food (rice,
  potato) defaults to cooked [P1:src/lib/food/foodRoles.js:142-149]. The
  default IS the table's basis so untouched items are unchanged.
- Saved meals are fixed blocks with no rescalable components
  [P1:src/lib/food/mealPlanAssembler.js:141-156] — they carry no per-item state
  choice (consistent with their existing no-part-swap behaviour
  [P1:src/screens/MealPlanScreen.js:231-234]).
- Rounding: grams round to whole numbers on display, matching the existing
  `quantityG` rendering [P1:src/screens/MealPlanScreen.js:433].

**DUAL-AUDIENCE DESIGN**
Default-correct for beginners (never forced to choose); the toggle is a
progressive-disclosure detail inside the expanded plate, the same place Eddie
already gets grams + macros [P1:src/screens/MealPlanScreen.js:417-441]. No
jargon: "Raw" / "Cooked", not "yield" or "conversion factor".

### VERIFICATION
- All P1 claims confirmed against the cited lines (foodRoles weight-state,
  curatedFoods resolveComponent, db.logFoodEntry, MealPlanScreen item rows,
  RootNavigator gating).
- OPEN NA-ids (blueprint NOT final until resolved):
  - **NA-nutrition-1**
  - **NA-nutrition-2**
  - **NA-nutrition-3**

---

## ULTIMATE-NUT-02 — Auto grocery list

**CLUSTER:** Nutrition / meal planning
**PRIORITY TIER:** Tier-1 (founder ACCEPTED)
**IMPACT:** High (turns a generated plan into something you can actually shop)
**EFFORT:** Medium (deterministic aggregation over an existing plan object)
**PRIORITY SCORE:** High impact / Medium effort — strong build.

### CURRENT STATE
- No grocery aggregation exists today; Call-3 records grep = 0
  [P3:pass3-v2-founder-decisions.md:106-108].
- A stored plan is a week of days, each day a list of slots, each slot an
  array of `items` with `foodRef` + `quantityG`
  [P1:src/lib/food/mealPlanAssembler.js:468-481] and `components` of
  `{ food, g }` [P1:src/lib/food/mealPlanAssembler.js:360, :436].
- Plan items carry `foodRef = 'curated:<key>'`
  [P1:src/lib/food/curatedFoods.js:120] and curated food display names live in
  `CURATED_FOODS[key].name` [P1:src/lib/food/curatedFoods.js:100-106,
  resolveComponent name at :122].
- The plan object is loaded on `MealPlanScreen` via `loadActiveMealPlan`
  [P1:src/screens/MealPlanScreen.js:32, :113] and the actions row already hosts
  "Log this day" / "New meals" [P1:src/screens/MealPlanScreen.js:523-524].

### THE GAP [P3]
Founder ACCEPTED: "Auto grocery list (aggregated, aisle-grouped shopping list)"
[P3:pass3-v2-founder-decisions.md:41] and "Auto grocery list — BUILD. Not
present today. Aggregated UK shopping list from a plan"
[P3:pass3-v2-founder-decisions.md:106-108].

### THE EVIDENCE [P2]
- Best-in-class bar is Eat This Much: deterministic plans to exact targets plus
  grocery lists and leftover logic (Claude, live-browsed/sourced — 4.7-star,
  CNN 2025) [P2:MP — pass3-comparison-matrix.md:382-384]. Grocery aggregation
  is the named ETM bar [P2:MP — pass3-comparison-matrix.md:388-390].
- Corroboration: grocery/batch is corroborated Claude+Gemini
  [P2:MP — pass3-comparison-matrix.md:396-400]; Claude=sourced, Gemini=simulated.

### NEWBIE EXPERIENCE AFTER CHANGE
A beginner taps one button and gets a plain shopping list for the week, grouped
so they can walk a UK supermarket and tick items off, instead of reading seven
days of plates and adding grams in their head.

### ATHLETE EXPERIENCE AFTER CHANGE
A competitor on meal-prep variety sees the full week's totals per ingredient
(e.g. total chicken grams across the week) so they buy once for the block.

### IMPLEMENTATION BLUEPRINT

**FILES TO CHANGE**
- `src/lib/food/groceryList.js` — NEW pure module: aggregate a stored plan into
  a grouped list. Consumes the plan day/slot/item shape
  [P1:src/lib/food/mealPlanAssembler.js:468-481] and food roles/names.
- `src/screens/MealPlanScreen.js` — add a "Shopping list" action near the
  existing actions [P1:src/screens/MealPlanScreen.js:523-524], opening a sheet
  (re-use `BottomSheet`, already imported [P1:src/screens/MealPlanScreen.js:23]).
- (Aisle grouping) `src/lib/food/foodRoles.js` — roles already classify foods
  (`roleOf` [P1:src/lib/food/foodRoles.js:243-245]); group ordering can key off
  role. A finer UK-aisle grouping needs a source — see NA-nutrition-4.

**DATA**
- No new tables/columns. Pure derivation from the already-stored active plan
  (`loadActiveMealPlan` [P1:src/screens/MealPlanScreen.js:113]).
- Aggregation key: the curated food key (from `foodRef` slice
  [P1:src/screens/MealPlanScreen.js:420] / `components[].food`
  [P1:src/lib/food/mealPlanAssembler.js:436]); sum `quantityG` across all
  days+slots; display name from `CURATED_FOODS[key].name`
  [P1:src/lib/food/curatedFoods.js:122].

**COMPONENT STRUCTURE**
Parent: `MealPlanScreen`. A `BottomSheet` (existing import
[P1:src/screens/MealPlanScreen.js:23]) listing grouped ingredient rows. The
aggregation is computed by the NEW pure `groceryList.js` and rendered read-only
(plus, optionally, a Share/export through the existing app sharing — out of
scope here; aggregation + display is the build).

**USER FLOW**
1. User has an active plan loaded [P1:src/screens/MealPlanScreen.js:121-122].
2. User taps "Shopping list" (NEW action).
3. `groceryList.js` walks `plan.days[].slots[].items[]`
   [P1:src/lib/food/mealPlanAssembler.js:471], summing grams per food key
   across the whole week, mapping key -> display name + role.
4. Items group by role-derived sections, sorted deterministically; the sheet
   opens (state change `setGrocerySheet`).
5. Read-only list renders. No write to the diary or plan.

**ENTITLEMENT GATING**
PRO, inherited from the Diary stack's `withProGuard`
[P1:src/navigation/RootNavigator.js:160, :217-230]. No new gate.

**EMPTY STATE**
When no plan exists, the existing empty plan state already covers the screen
[P1:src/screens/MealPlanScreen.js:335-344]; the action is hidden until a plan
loads. If a plan somehow has zero loggable items: `"Nothing to shop for yet.
Build a plan and your list fills in."`

**LOADED STATE**
Grouped rows, numbers-first: `"600 g chicken breast"`, grouped under quiet
section labels (e.g. "Proteins", "Carbs", "Veg", "Fats", "Other"), each section
ordered by total grams descending then food key for determinism. A footer line:
`"Totals for the whole week across N days."`

**ERROR STATE**
Aggregation is pure and offline; no network. If a food key is unknown (custom/
saved-meal block with no curated components
[P1:src/lib/food/mealPlanAssembler.js:148]), list it once by its stored name
under "Other" rather than dropping it.

**EDGE CASES**
- Saved-meal slots have `components: null`
  [P1:src/lib/food/mealPlanAssembler.js:148] — aggregate by the meal name into
  "Other", do not attempt per-food grams.
- Same food across multiple meals/days sums into one row (the whole point).
- `variety: 0` "repeat" weeks reuse two assembled days
  [P1:src/lib/food/mealPlanAssembler.js:511-519]; aggregation still walks the
  realised 7-day `days` array, so a repeated day counts each occurrence.
- Per-item weight state from NUT-01: the list should state the weight the user
  buys in (raw/uncooked for most shopping). Interaction with NUT-01 flagged —
  see NA-nutrition-5.

**DUAL-AUDIENCE DESIGN**
Besa gets a flat tickable list; Eddie gets weekly totals per ingredient. No
jargon. One screen, read-only, glanceable.

### VERIFICATION
- All P1 claims confirmed (plan shape, foodRef/components, CURATED_FOODS name,
  MealPlanScreen load + actions, gating).
- OPEN NA-ids: **NA-nutrition-4**, **NA-nutrition-5**.

---

## ULTIMATE-NUT-03 — Gate training/rest calorie cycling to advanced cutters/competitors

**CLUSTER:** Nutrition / meal planning (engine boundary)
**PRIORITY TIER:** Tier-1 (founder DECIDED: gate to match the coach)
**IMPACT:** High (removes a silent, unrequested behaviour for most Pro users)
**EFFORT:** Medium (move one gate; preserve floor/trivial guards; update tests)
**PRIORITY SCORE:** High impact / Medium effort — build.

### CURRENT STATE
- The meal planner splits one daily number across the week for EVERYONE:
  `generateAndSaveMealPlan` derives a schedule from days/week
  [P1:src/lib/food/mealPlanService.js:180-181] via `defaultSchedule`
  [P1:src/lib/food/mealPlanService.js:83-95], then `assembleWeekPlan`
  [P1:src/lib/food/mealPlanService.js:183-189].
- `assembleWeekPlan` ALWAYS calls `dayVariantTargets`
  [P1:src/lib/food/mealPlanAssembler.js:503-507]; that function carb-cycles
  (training +carbs, rest -carbs, weekly total preserved, capped at
  `MAX_CYCLE_DELTA_KCAL = 300`) [P1:src/lib/food/mealPlanAssembler.js:36,
  :78-124]. Protein is held; carbs are the lever
  [P1:src/lib/food/mealPlanAssembler.js:110-121].
- It already auto-flattens when the target was floored
  [P1:src/lib/food/mealPlanAssembler.js:88, :59-64] or when the cycle would be
  trivial (< 50 kcal) [P1:src/lib/food/mealPlanAssembler.js:106-108] or when
  there is no mix of day types [P1:src/lib/food/mealPlanAssembler.js:87].
- The COACH, by contrast, reserves carb-cycling for advanced cutters and
  competitors only: `if (phase.isCut && (goalLockAdvanced ||
  isCompetitionGoal(trainingGoal)))` [P1:src/lib/weeklyCoach.js:1020]. Comment:
  "Beginner / intermediate cuts stay flat (founder decision 2026-05-27)"
  [P1:src/lib/weeklyCoach.js:1013-1018].
- Gate inputs exist: `isCompetitionGoal(trainingGoal)` is a pure predicate
  [P1:src/lib/coachingGoals.js:193-195]; `phase.isCut` is a phase-config flag
  [P1:src/lib/weeklyCoach.js:197-203]; `goalLockAdvanced` is persisted on
  `user_body_profile` and read via `getGoalLockAdvanced`
  [P1:src/lib/database.js:6347-6353].
- The meal-plan service today does NOT read trainingPhase/trainingGoal/
  goalLock; `generateAndSaveMealPlan` reads only the target row + profile prefs
  [P1:src/lib/food/mealPlanService.js:171-189], and `preferencesFromProfile`
  pulls only diet + plan prefs [P1:src/lib/food/mealPlanService.js:67-80].
- The day-type chip + cycle note render whenever `cycleDeltaKcal > 0`
  [P1:src/screens/MealPlanScreen.js:323, :369-397].

### THE GAP [P3]
Founder DECISION: "GATE TO MATCH THE COACH. Only advanced cutters + physique
competitors (`phase.isCut && (goalLockAdvanced || isCompetitionGoal)`) get
train/rest cycling in the meal plan. Everyone else: flat daily target = the
whole number, the same every day ... drops the day-type chip for non-advanced
users ... gate the `dayVariantTargets` call on the same predicate the coach
uses; keep the floored/trivial auto-flat guards. Update tests"
[P3:pass3-v2-founder-decisions.md:147-161].

### THE EVIDENCE [P2]
- This is an internal consistency fix, not a competitor-bar item. The
  inconsistency itself is read-traced in the decisions log
  [P3:pass3-v2-founder-decisions.md:147-156]. No external research claim is
  load-bearing. [INFERENCE] the strongest support is the coach's own existing
  gate [P1:src/lib/weeklyCoach.js:1020], which this must mirror exactly.

### NEWBIE EXPERIENCE AFTER CHANGE
A beginner on a bulk (or any non-advanced user) sees the same whole calorie
number every day, with no "Training day / Rest day" chip and no carb-cycle
note. Calories behave "as a whole", matching expectation. No feature is
removed; the day they did not ask for is simply gone.

### ATHLETE EXPERIENCE AFTER CHANGE
An advanced cutter or a physique competitor still gets training/rest cycling in
the plan, exactly matching what the coach already does for them, so the two
surfaces agree.

### IMPLEMENTATION BLUEPRINT

**FILES TO CHANGE**
- `src/lib/food/mealPlanAssembler.js` — gate the `dayVariantTargets` call (or
  pass a flag into it) at [P1:src/lib/food/mealPlanAssembler.js:503-507]; when
  not advanced, return the flat variants (the function already has a `flat`
  shape it returns in its guard cases
  [P1:src/lib/food/mealPlanAssembler.js:86-88]). Keep the floored/trivial
  guards intact [P1:src/lib/food/mealPlanAssembler.js:87-88, :106-108].
- `src/lib/food/mealPlanService.js` — derive the gate predicate from the
  profile + goal-lock and pass it into `assembleWeekPlan`; `generateAndSaveMealPlan`
  is the read site [P1:src/lib/food/mealPlanService.js:171-189]. It must read
  `goalLockAdvanced` (via `getGoalLockAdvanced`
  [P1:src/lib/database.js:6347-6353]) and `trainingPhase`/`trainingGoal` from
  the profile, deriving `phase.isCut` the same way the coach does. Exact
  profile field names + isCut derivation: see NA-nutrition-6.
- `src/screens/MealPlanScreen.js` — when cycling is gated off the day-type chip
  + cycle note must not show. Today they key off `cycleDeltaKcal > 0`
  [P1:src/screens/MealPlanScreen.js:323, :393]; with cycling gated off,
  `cycleDeltaKcal` is 0 (flat variants set `cycleDeltaKcal: 0`
  [P1:src/lib/food/mealPlanAssembler.js:86]), so the cycle note auto-hides.
  The "Training day / Rest day" chip + "Training today?" row are driven by
  `day.variant` [P1:src/screens/MealPlanScreen.js:321, :369-392] and need to be
  suppressed for non-advanced users — confirm chip-suppression behaviour in
  NA-nutrition-7.
- Tests: `src/lib/food/__tests__/mealPlanAssembler.test.js` and
  `.../mealPlanService.test.js` (existing test files
  [P1 — confirmed present via repo listing]) updated so non-advanced =
  flat-every-day, advanced cutter/competitor = cycled.

**DATA**
- No new tables/columns. Reads existing `goal_lock_advanced`
  [P1:src/lib/database.js:6347-6353] and existing profile phase/goal fields.

**COMPONENT STRUCTURE**
Engine-only change plus the chip suppression. Predicate MUST be the SAME shape
as `phase.isCut && (goalLockAdvanced || isCompetitionGoal(trainingGoal))`
[P1:src/lib/weeklyCoach.js:1020], reusing `isCompetitionGoal`
[P1:src/lib/coachingGoals.js:193-195] (no parallel predicate).

**USER FLOW**
1. User generates/regenerates a plan
   [P1:src/screens/MealPlanScreen.js:124-154].
2. Service computes `advancedCycling = phase.isCut && (goalLockAdvanced ||
   isCompetitionGoal(trainingGoal))` and passes it to `assembleWeekPlan`
   [P1:src/lib/food/mealPlanService.js:183-189].
3. `assembleWeekPlan` calls `dayVariantTargets` only when `advancedCycling`;
   otherwise it uses flat variants (training === rest === base,
   `cycleDeltaKcal: 0`) [P1:src/lib/food/mealPlanAssembler.js:86-88, :503-507].
4. Plan persists [P1:src/lib/food/mealPlanService.js:190-192].
5. Screen renders flat days, no chip/note for non-advanced users.

**ENTITLEMENT GATING**
PRO (meal plan is in the gated Diary stack
[P1:src/navigation/RootNavigator.js:160, :226-230]). This item is NOT a
free/pro change; it is a SUB-segmentation within Pro by training profile,
mirroring the coach gate [P1:src/lib/weeklyCoach.js:1020].

**EMPTY STATE**
Unchanged (existing empty plan state
[P1:src/screens/MealPlanScreen.js:335-344]).

**LOADED STATE**
Non-advanced: every day shows the same kcal; no day-type chip, no cycle note.
Advanced cutter/competitor: unchanged from today (chip + note + per-day
"Training today?").

**ERROR STATE**
Unchanged generate/regenerate error toasts
[P1:src/screens/MealPlanScreen.js:135-137, :149-151].

**EDGE CASES**
- Floored target: cycling already stays flat regardless of the gate
  [P1:src/lib/food/mealPlanAssembler.js:88]; the new gate must NOT bypass that.
- Advanced user NOT cutting (e.g. competitor on a bulk): `phase.isCut` is false,
  so the gate is off and the plan is flat — exactly matching the coach
  [P1:src/lib/weeklyCoach.js:1020].
- The per-day "Training today?" answer path (`answerDayTraining`
  [P1:src/lib/food/mealPlanService.js:130-162]) re-variants a day from the
  plan's STORED variant targets. For non-advanced users the stored variants are
  flat (training === rest), so answering "Training/Rest" produces an identical
  day — behaviour to confirm/decide in NA-nutrition-7 (hide the control vs let
  it be a no-op).
- `defaultSchedule(0)` (rest week) already yields all-rest -> no day mix -> flat
  [P1:src/lib/food/mealPlanService.js:90, :87 + assembler :87].

**DUAL-AUDIENCE DESIGN**
This IS the dual-audience fix: beginners get "calories as a whole"; advanced
cutters/competitors keep the cycle. No new copy for the non-advanced path
(absence of the chip). Advanced copy unchanged.

### VERIFICATION
- All P1 claims confirmed (assembler gate site + flat shape + guards, service
  read site, coach predicate, isCompetitionGoal, goalLockAdvanced read, chip
  render conditions).
- OPEN NA-ids: **NA-nutrition-6**, **NA-nutrition-7**.

---

## ULTIMATE-NUT-04 — Protein-consistency metric in Food Insights

**CLUSTER:** Nutrition / food insights
**PRIORITY TIER:** Tier-1 (founder ACCEPTED)
**IMPACT:** High (research-named most behaviour-relevant metric)
**EFFORT:** Low-Medium (derives from data already loaded on the screen)
**PRIORITY SCORE:** High impact / Low-Medium effort — strong build.

### CURRENT STATE
- Food Insights computes a per-macro hit-rate over the window: for each logged
  day it counts protein within 10% of target (`pDays`)
  [P1:src/screens/FoodInsightsScreen.js:85-98], rendered as an `AdherenceRow`
  "Protein hit X/Y days" [P1:src/screens/FoodInsightsScreen.js:181, :222-232].
- It pulls rollups + targets for the window
  [P1:src/screens/FoodInsightsScreen.js:67-75] and has `targets.proteinG`
  available [P1:src/screens/FoodInsightsScreen.js:93].
- There is no metric specifically framed as "how often you hit your protein"
  beyond the macro-hit row, and no consistency framing (it is one of four
  equal rows) [P1:src/screens/FoodInsightsScreen.js:177-193].

### THE GAP [P3]
Founder ACCEPTED: "FI — Protein-consistency metric"
[P3:pass3-v2-founder-decisions.md:43]. Voice guard names the exact surface
phrasing: protein-consistency -> "how often you hit your protein"
[P3:pass3-v2-founder-decisions.md:93].

### THE EVIDENCE [P2]
- Claimed by Claude as "most behaviour-relevant" of the FI gaps
  [P2:FI — pass3-comparison-matrix.md:419-428]; Claude=sourced (live-browsed
  MacroFactor analytics bar). The FI lag list names "no protein-consistency
  metric (Claude — most behaviour-relevant)"
  [P2:FI — pass3-comparison-matrix.md:425-428].

### NEWBIE EXPERIENCE AFTER CHANGE
A beginner sees one clear line, "You hit your protein on 5 of 7 days you
logged", which tells them the single most useful thing about their eating
without learning what a macro is.

### ATHLETE EXPERIENCE AFTER CHANGE
A competitor reads protein consistency across a longer window (with NUT-05) as
the number that actually predicts whether muscle is protected on a cut.

### IMPLEMENTATION BLUEPRINT

**FILES TO CHANGE**
- `src/screens/FoodInsightsScreen.js` — promote/derive a protein-consistency
  figure from the already-computed `adherence.pDays` / `adherence.logged`
  [P1:src/screens/FoodInsightsScreen.js:97, :85-98] and render it as a
  highlighted line above the four-row macro block
  [P1:src/screens/FoodInsightsScreen.js:176-193].

**DATA**
- No new tables/columns. Pure derivation from window rollups already loaded
  [P1:src/screens/FoodInsightsScreen.js:67-75]; protein-hit logic exists at
  [P1:src/screens/FoodInsightsScreen.js:93].
- [INFERENCE] "consistency" = days protein within target band / days logged,
  i.e. exactly today's `pDays / logged`. Whether founder wants a stricter band
  than the existing 10% [P1:src/screens/FoodInsightsScreen.js:93] is open —
  NA-nutrition-8.

**COMPONENT STRUCTURE**
Parent: `FoodInsightsScreen`. A NEW small headline component (or a styled line)
above the MACRO ADHERENCE card [P1:src/screens/FoodInsightsScreen.js:176-177],
re-using existing styles (`sectionLabel`, `card`, `cardFootnote`
[P1:src/screens/FoodInsightsScreen.js:245-252]).

**USER FLOW**
1. Screen focuses; `load()` fetches rollups + targets
   [P1:src/screens/FoodInsightsScreen.js:67-77].
2. `adherence` memo computes `pDays` + `logged`
   [P1:src/screens/FoodInsightsScreen.js:85-98].
3. NEW line renders the protein-consistency figure. Read-only, no write.

**ENTITLEMENT GATING**
PRO. Food Insights is reached only via the gated Diary stack
[P1:src/navigation/RootNavigator.js:160, :261-265]. No new gate.

**EMPTY STATE**
Re-use the existing empty copy when no days logged:
`"Log a few days to see your macro adherence."`
[P1:src/screens/FoodInsightsScreen.js:188-191]. Protein-consistency line hidden
until `adherence.logged > 0` (same guard as the macro block
[P1:src/screens/FoodInsightsScreen.js:178]).

**LOADED STATE**
Exact British copy, numbers-first, honesty-test-passing (true if the user did
nothing but kept logging):
`"You hit your protein on {pDays} of {logged} days you logged."`
Footnote re-uses the existing pattern: `"Hit = within target range."`
[P1:src/screens/FoodInsightsScreen.js:184-186]. No praise, no "great",
no streak language [P1:COACHING_VOICE_SYNTHESIS_LOCKED.md:564, :569].

**ERROR STATE**
No network; derived locally. If `targets` is null, `adherence` is null
[P1:src/screens/FoodInsightsScreen.js:86] and the line hides (same as the macro
block). No error toast needed beyond the existing export error path
[P1:src/screens/FoodInsightsScreen.js:113-114].

**EDGE CASES**
- `logged === 0`: hide the line (guard above).
- `logged === 1`: copy reads "1 of 1 day" — re-use the singular/plural pattern
  already in the screen [P1:src/screens/FoodInsightsScreen.js:185].
- No protein target set: `within()` returns false when target is 0/null
  [P1:src/screens/FoodInsightsScreen.js:217-219], so `pDays` is 0 honestly.

**DUAL-AUDIENCE DESIGN**
One plain headline for Besa; the four-row macro breakdown stays for Eddie
[P1:src/screens/FoodInsightsScreen.js:179-186]. "Protein" is a plain food word,
allowed bare (it is not in the jargon blocklist
[P1:COACHING_VOICE_SYNTHESIS_LOCKED.md:174-178, :86-87]).

### VERIFICATION
- All P1 claims confirmed (adherence memo, AdherenceRow, within(), styles,
  empty copy, gating).
- OPEN NA-ids: **NA-nutrition-8**.

---

## ULTIMATE-NUT-05 — Food-insights analytics windows 14 / 30 / 90-day

**CLUSTER:** Nutrition / food insights
**PRIORITY TIER:** Tier-1 (founder ACCEPTED)
**IMPACT:** Medium-High (longer windows make consistency + adherence meaningful)
**EFFORT:** Low-Medium (window selector over an already range-based loader)
**PRIORITY SCORE:** Medium-High impact / Low-Medium effort — build.

### CURRENT STATE
- The screen is hard-wired to 7 days: `last7DayIsoList()` builds a fixed 7-entry
  list [P1:src/screens/FoodInsightsScreen.js:42-47], `days` memoises it with no
  deps [P1:src/screens/FoodInsightsScreen.js:63], and `startDate`/`endDate`
  derive from it [P1:src/screens/FoodInsightsScreen.js:64-65].
- The data loader is ALREADY range-based: `getRollupsForRange(userId,
  startDate, endDate)` and `getFoodEntriesForRange(...)`
  [P1:src/screens/FoodInsightsScreen.js:69-72, :104]. So the window is the only
  thing fixed; the queries take any range.
- Section labels and the export are hard-coded to "7 DAYS" / "7 days"
  [P1:src/screens/FoodInsightsScreen.js:137, :184-185, :207-208] and the export
  empty toast says "last seven days"
  [P1:src/screens/FoodInsightsScreen.js:106].
- The header is a single "Insights" title with no window control
  [P1:src/screens/FoodInsightsScreen.js:128-134].

### THE GAP [P3]
Founder ACCEPTED: "FI — Longer analytics windows (14/30/90-day)"
[P3:pass3-v2-founder-decisions.md:44]. Matrix: "7-day window only - need
14/30/90d" [P3:FI — pass3-comparison-matrix.md:425].

### THE EVIDENCE [P2]
- "7-day-only LAG = VERIFIED (Claude+Gemini)"
  [P2:FI — pass3-comparison-matrix.md:433]; Claude=sourced, Gemini=simulated.
  MacroFactor/Cronometer custom date ranges are the bar (Claude, sourced)
  [P2:FI — pass3-comparison-matrix.md:421-422].

### NEWBIE EXPERIENCE AFTER CHANGE
A beginner can switch to a 30-day view to see whether their eating holds up
over a month, not just a possibly-unrepresentative week.

### ATHLETE EXPERIENCE AFTER CHANGE
A competitor reviews 90 days of calorie + protein consistency to judge a block,
matching the longer-range analytics they expect from MacroFactor/Cronometer
[P2:FI — pass3-comparison-matrix.md:421-422].

### IMPLEMENTATION BLUEPRINT

**FILES TO CHANGE**
- `src/screens/FoodInsightsScreen.js` only.
  - Replace the fixed `last7DayIsoList()` [P1:.../FoodInsightsScreen.js:42-47]
    with a window-parameterised list builder `lastNDayIsoList(n)`.
  - Add a window state (`windowDays`, default 7) and a segmented selector in the
    header [P1:.../FoodInsightsScreen.js:128-134], re-using a radio/segmented
    pattern (the app's segmented control convention exists, e.g. `PrefRow`
    [P1:src/screens/MealPlanScreen.js:63-88]).
  - Re-key the `days` memo on `windowDays`
    [P1:.../FoodInsightsScreen.js:63] so `startDate`/`endDate`
    [P1:.../FoodInsightsScreen.js:64-65] and the existing range queries
    [P1:.../FoodInsightsScreen.js:69-72] recompute.
  - Make the bar chart legible at long windows: 90 daily bars
    [P1:.../FoodInsightsScreen.js:139-164] do not fit. The 7/14-day views can
    stay per-day bars; 30/90 need aggregation (weekly bars or summary only).
    Exact rendering choice for long windows: NA-nutrition-9.
  - De-hard-code the "7" copy [P1:.../FoodInsightsScreen.js:137, :167, :184-185,
    :207-208, :106] to read the selected window.

**DATA**
- No new tables/columns. `getRollupsForRange` / `getFoodEntriesForRange` already
  accept any range [P1:.../FoodInsightsScreen.js:69-72, :104]. Confirm rollup
  query has no implicit row cap that would truncate a 90-day range —
  NA-nutrition-10.

**COMPONENT STRUCTURE**
Parent: `FoodInsightsScreen`. NEW header window selector (segmented), existing
cards below. No new screen.

**USER FLOW**
1. Screen loads at the default 7-day window (unchanged default).
2. User taps a window chip (7 / 14 / 30 / 90); `windowDays` state updates.
3. `days` memo rebuilds; `useFocusEffect`/`load` re-runs over the new range
   [P1:.../FoodInsightsScreen.js:67-77]; rollups + targets refetch.
4. Calories block, macro adherence, and protein-consistency (NUT-04) recompute
   over the window; export uses the same range
   [P1:.../FoodInsightsScreen.js:100-118].

**ENTITLEMENT GATING**
PRO (gated Diary stack [P1:src/navigation/RootNavigator.js:160, :261-265]).
No new gate.

**EMPTY STATE**
Per-window empty copy, generalised from the existing fixed string
[P1:.../FoodInsightsScreen.js:188-191, :106]:
`"Log a few days to see your last {windowDays} days."` Export empty toast:
`"No entries in the last {windowDays} days."` (generalising
[P1:.../FoodInsightsScreen.js:106]).

**LOADED STATE**
Section label reads the window: `"LAST {N} DAYS · CALORIES"` (generalising
[P1:.../FoodInsightsScreen.js:137]). Macro footnote and protein-consistency
copy reference the selected window. Export button label generalises from
`"Export 7 days as CSV"` [P1:.../FoodInsightsScreen.js:208].

**ERROR STATE**
Existing export error path reused [P1:.../FoodInsightsScreen.js:113-114]. No new
network surface.

**EDGE CASES**
- 90-day chart density (see FILES TO CHANGE / NA-nutrition-9).
- Performance: 90 days x rollups is small, but confirm no query cap
  (NA-nutrition-10).
- A window longer than the user's logging history just shows fewer logged days;
  `adherence.logged` already counts only days with entries
  [P1:.../FoodInsightsScreen.js:89-90], so percentages stay honest.
- `maxKcal` scaling already adapts to the data
  [P1:.../FoodInsightsScreen.js:120-124], so longer windows scale correctly.

**DUAL-AUDIENCE DESIGN**
Default 7-day keeps the screen simple for Besa; the longer windows are an opt-in
chip for Eddie. No jargon ("Last 30 days", not "trailing window").

### VERIFICATION
- All P1 claims confirmed (fixed 7-day list, range-based loaders, hard-coded
  "7" copy sites, header, chart render, maxKcal, gating).
- OPEN NA-ids: **NA-nutrition-9**, **NA-nutrition-10**.

---

## VERIFICATION — open NEEDS-ANSWER register (cluster: nutrition)

This blueprint set is NOT final: the items below carry open NA-ids per the
hard rule (cite only what is read; never guess a number/source).

- **NA-nutrition-1** (NUT-01): What is the authoritative per-food raw<->cooked
  gram-conversion source the engine should use? The codebase LABELS weight
  states (`stateOf` [P1:src/lib/food/foodRoles.js:142-149]) and states one
  example ("50 g dry pasta ~115 g cooked" [P1:.../foodRoles.js:139-141]) but
  ships NO conversion factor table or function (grep for factors = 0). Do not
  invent ratios. files-to-check: the round-2 meal research cited at
  `src/lib/food/foodRoles.js:11-12`
  (`docs/deep-audit-2026-06-12/blueprints/bp-meal-plan-research-round2.md §3`);
  `docs/deep-audit-2026-06-12/meal-research/`.

- **NA-nutrition-2** (NUT-01): Which exact file:line is the manual food-logging
  portion-entry surface (where a user types grams when logging a single food),
  so the raw/cooked choice can be added there? files-to-check:
  `src/screens/FoodSearchScreen.js`, `src/screens/DiaryScreen.js`
  (`saveEditSheet` at DiaryScreen.js:396), `src/screens/AddCustomFoodScreen.js`.

- **NA-nutrition-3** (NUT-01): Exact migration mechanism + default for the NEW
  `food_entries.weight_state` column so every existing row keeps its current
  meaning, per the offline-first + Supabase rules. files-to-check:
  `docs/rules/supabase.md`, `src/lib/database.js` (migration/ALTER pattern,
  e.g. around the goal_lock ALTER at database.js:959), `src/lib/food/db.js`
  schema.

- **NA-nutrition-4** (NUT-02): Is there an approved UK supermarket-aisle
  taxonomy to group the grocery list by, or should grouping key off the
  existing macro roles (`roleOf` [P1:src/lib/food/foodRoles.js:243-245])? Do
  not invent an aisle map. files-to-check: `docs/ultimate-audit-2026-06-13/`
  proposal blueprints for MP, the decisions log line
  "aisle-grouped shopping list" [pass3-v2-founder-decisions.md:41].

- **NA-nutrition-5** (NUT-02 x NUT-01): Which weight state should the grocery
  list display per ingredient (the bought/raw weight vs the plan's stored
  state)? Depends on NUT-01's resolution. files-to-check: same as
  NA-nutrition-1; the MP proposal blueprint.

- **NA-nutrition-6** (NUT-03): Exact profile field names for trainingPhase /
  trainingGoal as stored, and the exact `phase.isCut` derivation the service
  must replicate from the coach, so the meal-plan gate is byte-for-byte the
  coach's predicate. files-to-check: `src/lib/weeklyCoach.js` around the phase
  config [weeklyCoach.js:197-203] and where it derives `phase`/`goalPhase`/
  `goalLockAdvanced` for the run; `src/lib/coachingGoals.js`
  (`phaseToCoachingKey` :283-297); `src/screens/MealPlanScreen.js` userProfile
  shape [MealPlanScreen.js:92, :128].

- **NA-nutrition-7** (NUT-03): For non-advanced users (flat variants), should
  the "Training day / Rest day" chip and the "Training today?" control
  [P1:src/screens/MealPlanScreen.js:321, :369-392] be HIDDEN, or shown as a
  harmless no-op? The decision says "drops the day-type chip for non-advanced
  users" [pass3-v2-founder-decisions.md:159] (implies hide the chip) but does
  not state the "Training today?" control's fate. files-to-check: the MP
  proposal blueprint; the decisions log lines 157-161.

- **NA-nutrition-8** (NUT-04): Which tolerance band defines a protein "hit" for
  the consistency metric: the existing 10% used for protein
  [P1:src/screens/FoodInsightsScreen.js:93], or a different band the founder
  wants? Do not assume. files-to-check: the FI proposal blueprint; the
  decisions/voice line for protein-consistency
  [pass3-v2-founder-decisions.md:93].

- **NA-nutrition-9** (NUT-05): How should the calories view render at 30/90-day
  windows where 90 daily bars do not fit [P1:.../FoodInsightsScreen.js:139-164]
  (weekly-aggregated bars, summary-only, or scroll)? Do not guess the UX.
  files-to-check: the FI proposal blueprint; `DESIGN_SYSTEM.md` chart guidance.

- **NA-nutrition-10** (NUT-05): Does `getRollupsForRange` (and the rollup query
  path) return uncapped rows for a 90-day range, or is there an implicit
  LIMIT that would truncate? files-to-check: `src/lib/food/db.js`
  (`getRollupsForRange`, `getFoodEntriesForRange` definitions).

---

## SUMMARY

Items blueprinted (5, exactly the founder-approved set):
1. ULTIMATE-NUT-01 — Raw/cooked weight entry toggle
2. ULTIMATE-NUT-02 — Auto grocery list
3. ULTIMATE-NUT-03 — Gate training/rest calorie cycling to advanced
   cutters/competitors (predicate matches the coach exactly)
4. ULTIMATE-NUT-04 — Protein-consistency metric in Food Insights
5. ULTIMATE-NUT-05 — Food-insights analytics windows 14/30/90-day

Open NA-ids: NA-nutrition-1 .. NA-nutrition-10 (ten). These MUST be resolved
(per `_AUDIT-SPEC.md:248-271`) before any of NUT-01/02/03/04/05 is treated as a
final, build-ready blueprint.
