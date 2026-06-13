# Phase 5 proposals — CLUSTER C: Nutrition & food logging

Volyume Ultimate Audit, 2026-06-13. Buildable proposals for the nutrition &
food-logging cluster. Drafted READ-ONLY from already-produced, already-sourced
documents — no new web research, no code changes.

Sources read in full:
- `phase3/compare-04-nutrition.md` (Area 04 — Nutrition & macro management)
- `phase3/compare-05-food-logging.md` (Area 05 — Food logging & diary)
- `phase1/07-nutrition-targets.md` (inventory: NutritionTargets, NutritionEducation, MealPlan, FoodInsights)
- `phase1/08-food-logging.md` (inventory: Diary, FoodSearch, AddCustomFood, MyMeals, MyRecipes, RecipeBuilder, ScanBarcode, ScanLabel)

British English throughout. Newbie and athlete experiences stated separately.
SACRED constraints honoured: deterministic engine (no AI/LLM on food logging),
ED-safety system untouched, billing unchanged, free/Pro gating respected. Any
proposal touching ED-safety framing, calorie floors, or billing is flagged
**FOUNDER-GATE** and treated as input only. Proposals resting on PARTIAL/NOT-FOUND
evidence are flagged **evidence-thin**.

---

ID: U-C-1
AREA: Nutrition & macro management — onboarding / target setting
TITLE: Add a "set it for me" fast-target path that gives a usable target before the full form
SUGGESTED TIER: 2 High
IMPACT (1-10): 9 — The market's single strongest newbie pattern is "give a usable
target immediately, teach the why afterwards" (Finding 1.1, VERIFIED; Finding 2.1,
PARTIAL). The nutrition comparison's NEWBIE VERDICT is that Volyume is the opposite:
it "gates a usable target behind a long expert-framed form". This is the primary
beginner abandonment lever on the nutrition surface.
EFFORT (1-10): 5 — The calculation engine, prefill, and results rendering already
exist; this is a new lightweight entry mode, not new maths. The form already
prefills from the saved body profile (07-nutrition-targets.md:93-94, L296-340), so
a "minimal questions" path can reuse that data and the existing
`Calculate targets` flow.
CURRENT STATE: NutritionTargetsScreen.js is a single long scroll where a usable
target only appears after the full form (sex, age, height, weight, optional body
fat % + BF source, activity level, and a four-card protein approach
Standard/Optimised/Advanced/Custom) is completed and `Calculate targets` is pressed
(07-nutrition-targets.md:22-77, form fields L515-728, button L777-795). The
education card sits at the top but has "no call-to-action at the end … no 'set your
targets' button" (07-nutrition-targets.md:238-239).
THE PROBLEM:
- Newbie: faces "a long form (body fat %, BF source, activity level, four protein
  approaches with g/kg ranges) that is intimidating", and the protein-approach
  section "in particular … is expert framing" (07-nutrition-targets.md:114-119;
  compare-04 NEWBIE VERDICT :83-97). No target is visible until all of it is done.
- Athlete: less affected — they understand the inputs — but a fast path costs them
  nothing and is skippable into the full form.
THE EVIDENCE: compare-04 WHERE WE LAG "Newbie onboarding is 'understand-first,' not
'set-it-for-them'" (Finding 1.1 VERIFIED; Finding 2.1 PARTIAL). NEWBIE VERDICT
contrast with "set it for them, explain the why separately" (Finding 1.1 VERIFIED).
BEST REFERENCE IMPLEMENTATION: Yazio — quiz-set targets, then explanation
(compare-04 TOP 50 RANGE, VERIFIED); reinforced by the beginner-simplicity band
(Macro Champ / Macro Simple / Welling) that "sets targets without requiring the user
to understand them first" (compare-04 TOP 50 RANGE :79-81, PARTIAL).
PROPOSED SOLUTION: Add an opt-in "Set it for me" path at the top of
NutritionTargetsScreen (where the education card now sits, L493-508). It asks only
the minimum the engine needs that is not already on the saved body profile, defaults
the protein approach to **Optimised** (already badged "Recommended", L667-728), skips
body fat %/source, defaults activity to Moderate, and immediately runs the existing
`Calculate targets` path to render the existing results state (hero kcal + macro row,
L804-832). A persistent "Fine-tune these numbers" affordance expands the full form
(the existing `formCollapsed`/`Adjust` mechanism, L758-773). The maths, floors, and
ED-safety framing are unchanged — only the input gate is shortened.
NEWBIE EXPERIENCE: Sees a usable daily kcal + protein target within ~3 short
questions, with the "why" available but not blocking. Matches the market's proven
newbie pattern.
ATHLETE EXPERIENCE: Can ignore the fast path and go straight to the full form, or
use the fast path then "Fine-tune" into body-fat source, LBM protein basis and
custom g/kg (07-nutrition-targets.md:121-126).
IMPLEMENTATION BLUEPRINT:
- Screen: src/screens/NutritionTargetsScreen.js. Add the fast-path entry where the
  education card renders (L493-508); reuse `formCollapsed` state (L510, L758) so the
  full form is the "expanded" state behind a "Fine-tune these numbers" pill (the
  existing "Adjust" pattern, L758-773).
- Reuse existing prefill (L296-340) and the existing `Calculate targets` handler
  (button L777-795) — do NOT add a second calculation path.
- Defaults to apply in fast mode: protein approach = Optimised (the
  already-recommended card, L667-728); activity = Moderate (existing pill group
  L619-628); body fat % left blank so the bodyweight protein basis is used.
- Navigation/placement: unchanged — screen stays in ProfileStack route
  "NutritionTargets" (RootNavigator.js:384), reached from YouScreen.js:140 and
  WeeklyCheckInScreen.js:821.
- Gating: unchanged — Pro via `withProGuard(NutritionTargetsScreen, 'Nutrition
  targets')` (RootNavigator.js:150). Do NOT expose to free users.
- Empty/loaded/error states: empty = fast-path prompt visible, full form collapsed;
  loaded = existing results state; error = existing form-incomplete disabled button
  behaviour (L777-795) reused.
- Edge cases: if the saved body profile already has all stats, the fast path may
  need zero new questions — go straight to results; the "calm/wellbeing mode hides
  the fast cut" rule (L634-663) must still apply to any goal shown in fast mode.
VERIFICATION: Evidence VERIFIED (Finding 1.1) with a PARTIAL corroborator (Finding
2.1, beginner-simplicity band). Implementation facts (form fields, prefill, collapse
mechanism, button, gating) all VERIFIED against 07-nutrition-targets.md file:line.
The exact list of "minimum questions the engine needs" is NOT DETERMINED IN CODE —
confirm against the calculator's required inputs before building.

---

ID: U-C-2
AREA: Nutrition & macro management — target results
TITLE: Default the "Why these numbers" card to collapsed for returning users
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 4 — Low-risk, low-effort newbie/returning-user polish; reduces the
"lands on four long paragraphs" cognitive-load complaint without removing any
content.
EFFORT (1-10): 1 — A single initial-state change.
CURRENT STATE: The "Why these numbers for you?" collapsible card defaults to
EXPANDED (`whyExpanded` initial true, 07-nutrition-targets.md:201), "so a returning
user lands on four long paragraphs before the controls" (07-nutrition-targets.md:106,
:104-106; card L930-1043).
THE PROBLEM:
- Newbie: on first view the expanded "why" is valuable; on every subsequent view it
  is repetitive density they must scroll past to reach the recalculate/per-meal
  controls.
- Athlete: same — they have read it once and want the numbers, not the prose.
THE EVIDENCE: 07-nutrition-targets.md CURRENT WEAKNESSES :104-106 (Phase-1, VERIFIED
in-code). compare-04 NEWBIE VERDICT: "The 'Why these numbers' card defaults to
expanded, so a returning user lands on four long paragraphs" (:92-93).
BEST REFERENCE IMPLEMENTATION: Volyume's own MealPlan progressive-disclosure pattern
(calm first, detail a tap deeper, 07-nutrition-targets.md:339) — apply the same
intent here.
PROPOSED SOLUTION: Change the initial `whyExpanded` state so the card is collapsed
by default once `results` exist, with the header tappable to expand. Keep it
expanded on the very first calculation (before targets are saved) so a first-timer
still sees the education inline; collapse on subsequent loads of saved targets.
NEWBIE EXPERIENCE: First calculation still shows the full "why"; on return the card
is a tidy header they can tap to re-read.
ATHLETE EXPERIENCE: Lands on the numbers immediately; the "why" is one tap away.
IMPLEMENTATION BLUEPRINT:
- Screen: src/screens/NutritionTargetsScreen.js. Change `whyExpanded` initial value
  (currently `true`, L201). Gate the default on whether targets were freshly
  calculated this session vs hydrated from a saved record (hydration via
  `hydrateLoadedTargets`, L34-62) — collapsed when hydrated, expanded on fresh calc.
- The card itself (L930-1043) and its four WhySections are unchanged.
- Gating, navigation: unchanged.
- Empty/error states: unaffected (the card only renders when `results`, L799).
VERIFICATION: All-VERIFIED (Phase-1 in-code weakness + corroborating compare-04
line). No new evidence dependency.

---

ID: U-C-3
AREA: Nutrition & macro management — phase/goal selection
TITLE: Make contest-prep a selectable goal in the targets grid
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — Volyume already has contest-prep phase copy but athletes "can't
choose the periodised phase Carbon/RP make central"; the comparison names this an
athlete-facing gap (compare-04 ATHLETE VERDICT, MISSING ENTIRELY).
EFFORT (1-10): 3 — Phase description already exists (PHASE_DESCRIPTIONS, contest_prep
copy at 07-nutrition-targets.md:96, :124-126); the work is adding a selectable entry
to the GOALS grid and confirming the engine accepts it as a goal.
CURRENT STATE: "contest-prep phase copy exists (PHASE_DESCRIPTIONS L96) though
contest_prep is NOT a selectable goal in the GOALS grid (L80-87) — it can only
arrive from a loaded target" (07-nutrition-targets.md:124-126). The GOALS grid offers
six goals: Build muscle slow/fast, Maintain, Hold muscle lose fat, Lose weight
steady/fast (07-nutrition-targets.md:42-44, GOALS L80-87).
THE PROBLEM:
- Newbie: not relevant — a beginner would not select contest prep; it should not be
  prominent for them.
- Athlete: a competitor cannot choose the periodised contest-prep phase the engine
  already understands; they must arrive at it via a loaded target, which is opaque
  (compare-04 ATHLETE VERDICT :106-108).
THE EVIDENCE: compare-04 MISSING ENTIRELY "A selectable contest-prep goal in the
targets grid — copy exists but the goal is not user-selectable
(07-nutrition-targets.md:124-126); athletes can't choose the periodised phase
Carbon/RP make central (Finding 3.2, PARTIAL/VERIFIED)". Phase-1 ATHLETE QUESTION
:124-126 confirms in-code.
BEST REFERENCE IMPLEMENTATION: Carbon Diet Coach + RP Diet — phased coaching mapping
to 16–20 week contest-prep periodisation (compare-04 BEST IN CLASS :47-51,
PARTIAL/VERIFIED).
PROPOSED SOLUTION: Add a `contest_prep` entry to the GOALS grid (L80-87 /
L634-663), reusing the existing PHASE_DESCRIPTIONS contest-prep copy (L96) for the
results phase card (L1046-1055). Surface it for athletes only — e.g. behind the same
visibility convention that hides the fast cut in calm/wellbeing mode (L634-663) —
so it does not push contest framing at beginners.
NEWBIE EXPERIENCE: Unchanged — contest prep is de-emphasised / not surfaced
prominently for a first-timer.
ATHLETE EXPERIENCE: Can select contest prep directly from the goal grid; the
existing phase description and "How was this calculated?" breakdown (L1080-1141)
explain the periodised numbers.
IMPLEMENTATION BLUEPRINT:
- Screen: src/screens/NutritionTargetsScreen.js, GOALS constant (L80-87) and the
  goal grid render (L634-663). Add `contest_prep` with its surplus/deficit and
  label; reuse PHASE_DESCRIPTIONS contest_prep copy (L96).
- ED-SAFETY CHECK: a contest-prep deficit MUST still respect the calorie floors
  (1,200 kcal women / 1,500 kcal men) and the rapid-loss threshold (1.5%/wk) owned
  by src/coaching/safety/. **FOUNDER-GATE** — do not let a new aggressive goal route
  bypass the safety system; confirm the engine clamps contest-prep targets to the
  floors before this goal is exposed.
- The deficit percentage attached to contest_prep is **NOT DETERMINED IN CODE** —
  the GOALS grid lists +17%…−22% for existing goals (07-nutrition-targets.md:42-44)
  but the contest-prep figure is not captured in the inventory; confirm against the
  engine before building.
- Gating: Pro, unchanged.
- Edge cases: if the engine does not currently accept `contest_prep` as an *input*
  goal (only as a loaded phase), that wiring is NOT DETERMINED IN CODE — confirm.
VERIFICATION: Evidence is PARTIAL/VERIFIED (Finding 3.2) — mark **evidence-thin** on
the market-demand side (Carbon/RP via vendor+store). Phase-1 facts VERIFIED. The
contest-prep deficit value and engine-input acceptance are NOT DETERMINED IN CODE.
The safety-floor interaction is **FOUNDER-GATE**.

---

ID: U-C-4
AREA: Nutrition & macro management — insights
TITLE: Extend Food Insights with a selectable longer date range and CSV beyond 7 days
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — Athletes find Insights "shallow … only 7 days, no longer trend"
and "would likely export CSV and analyse elsewhere" (compare-04 ATHLETE VERDICT).
The expenditure/adherence trend loop is what athletes expect (Finding 5.1, VERIFIED).
EFFORT (1-10): 4 — The bar chart, adherence rows, tolerance helper, and CSV export
already exist (07-nutrition-targets.md:433-452, :471); the work is a date-range
control and parameterising the fixed 7-day window.
CURRENT STATE: FoodInsightsScreen shows a fixed last-7-days kcal bar chart vs target,
a four-row macro hit-rate summary, and an "Export 7 days as CSV" action
(07-nutrition-targets.md:433-452). "No date range control — fixed to last 7 days
(L42-47); no way to view a longer trend" and "Only kcal bars are charted; the macro
block is just hit-counts, no per-day macro visualisation"
(07-nutrition-targets.md:480-483).
THE PROBLEM:
- Newbie: 7 days is fine; longer ranges are not their need.
- Athlete: cannot see a longer trend or export more than 7 days, so they leave the
  app to analyse (compare-04 ATHLETE VERDICT :108-110; WHERE WE LAG :151-154).
THE EVIDENCE: compare-04 WHERE WE LAG "Shallow insights for athletes. Fixed 7-day
window, kcal-only chart, no longer trend … below the weekly expenditure-trend loop
athletes expect (Finding 5.1, VERIFIED)". MISSING ENTIRELY "Longer-range /
date-selectable insights and CSV-beyond-7-days (07-nutrition-targets.md:481-482)".
BEST REFERENCE IMPLEMENTATION: MacroFactor's weekly expenditure-trend loop
(compare-04 BEST IN CLASS :39-46, VERIFIED help-docs) — the trend-over-time read
athletes expect.
PROPOSED SOLUTION: Add a range selector (e.g. 7 / 14 / 30 days) to FoodInsights,
parameterising the fixed window (07-nutrition-targets.md:42-47) and the CSV export
(:471) to honour the selected range. Keep the default at 7 days so the newbie view
is unchanged. Do NOT add weight-correlation or per-day macro charts in this proposal
(separate, larger work); scope is range + matching CSV.
NEWBIE EXPERIENCE: Default 7-day view is unchanged.
ATHLETE EXPERIENCE: Can switch to 14/30 days and export the matching CSV without
leaving the app.
IMPLEMENTATION BLUEPRINT:
- Screen: src/screens/FoodInsightsScreen.js. Add a range control near the
  "LAST 7 DAYS · CALORIES" section label (L137); parameterise the 7-day window
  (L42-47) and the CSV export (L100-118, button L195-211).
- Reuse the existing `within()` tolerance helper (kcal/protein 10%, carbs/fat 15%,
  L92-95, L217-220) and bar/adherence rendering (L138-193) for the longer window.
- Navigation/placement: unchanged — route "FoodInsights" in DiaryStack
  (RootNavigator.js:262), reached from DiaryScreen.js:530. NOTE: Phase-1 flags this
  screen's location as "admitted-temporary … should eventually be its own Insights
  tab" (07-nutrition-targets.md:476-477, :498-501) — out of scope here; do not move
  the screen.
- Gating: Pro by-stack (inside gated DiaryStack), unchanged.
- Empty/loaded/error states: reuse existing no-target fallback (L169-173) and
  no-logged-days empty state (L189-191) for the selected range.
- Edge cases: a 30-day chart with the current "seven bar rows" layout (L138-174)
  needs a scroll/condense decision — the current chart is built for exactly 7 bars;
  rendering 30 is NOT DETERMINED IN CODE and must be designed before building.
VERIFICATION: Evidence VERIFIED (Finding 5.1) + Phase-1 in-code weakness. The 30-day
chart rendering approach is NOT DETERMINED IN CODE — confirm the chart layout before
building.

---

ID: U-C-5
AREA: Food logging & diary — logging speed
TITLE: Keep the logger open across a meal (persistent plate / timeline)
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — "MacroFactor's open plate/timeline is the single biggest
deterministic friction reducer and underpins its 50%-fewer-actions lead"
(compare-05 WHERE WE LAG, VERIFIED). Low-friction logging is the main adherence
lever; ~80% quit food logging, ~97% within a week (compare-05 NEWBIE VERDICT,
VERIFIED).
EFFORT (1-10): 6 — Volyume already has a multi-add "plate" (FoodSearchScreen.js:234-306),
so the building block exists; the work is changing each per-meal log path to NOT
`goBack()` to the diary so the logger stays open across the meal.
CURRENT STATE: "Volyume's plate exists (FoodSearchScreen.js:234-306) but each
per-meal log path returns to the diary (goBack, FoodSearchScreen.js:289, 374)"
(compare-05 WHERE WE LAG :111-118). Logging one already-visible food is a minimum 3
taps and the search log returns to the diary (08-food-logging.md:82-92, :107). The
plate is "a sub-flow that closes back to the diary, not a persistent timeline"
(compare-05 MISSING ENTIRELY :136-138).
THE PROBLEM:
- Newbie: each food relaunches the picker; re-entry friction is exactly where
  week-one abandonment happens (compare-05 NEWBIE VERDICT, VERIFIED).
- Athlete: logging a multi-item meal means repeated round-trips instead of one
  staying-open session (compare-05 ATHLETE VERDICT; WHERE WE LAG).
THE EVIDENCE: compare-05 WHERE WE LAG "Logger does not stay open across a meal …
goBack, FoodSearchScreen.js:289, 374 … VERIFIED (macrofactor.com/new-food-logger;
nutriscan FLSI)". compare-05 MISSING ENTIRELY :136-138. NOTE the benchmark caveat in
compare-05 VERIFICATION STATUS :165-170: the 24-vs-36 / 3- / 5-action figures all
trace to MacroFactor's own FLSI cross-cited by nutriscan — VERIFIED but
single-sourced.
BEST REFERENCE IMPLEMENTATION: MacroFactor — plate/timeline workflow that "keeps the
logger open between items so you do not re-launch per food; 24 total actions across
four workflows vs MyFitnessPal's 36 (50% fewer) … deterministic adaptive expenditure
(no LLM)" (compare-05 BEST IN CLASS :38-44, VERIFIED). NOTE: MacroFactor's "Describe"
feature IS LLM-based and is explicitly OUT of scope (compare-05 :42-43, MISSING
ENTIRELY :147-150).
PROPOSED SOLUTION: Make the plate the default logging session: when the user adds
items via FoodSearch, the logger stays open (does not `goBack()`) until the user
explicitly taps "Log {n}" / "Done", at which point all items write and the diary
refreshes. The plate bar and review modal already exist
(FoodSearchScreen.js:667-731); the change is the post-add navigation, not new UI.
Keep a single-item fast path for users who want it. Strictly deterministic — no
natural-language "Describe", no AI photo (boundary held).
NEWBIE EXPERIENCE: Adds several foods to one meal in a single open session, then logs
them together; far fewer relaunches.
ATHLETE EXPERIENCE: Logs a full prepped meal in one staying-open pass using
recents/favourites/frequents (FoodSearchScreen.js:104-114).
IMPLEMENTATION BLUEPRINT:
- Screen: src/screens/FoodSearchScreen.js. The per-food log paths currently call
  `navigation.goBack()` after a single log (FoodSearchScreen.js:289, 374, confirmed
  08-food-logging.md:107); change so single-add into a meal does not auto-close —
  keep the picker open and route the user through the existing plate bar (L667-687)
  and plate review modal (L689-731) / `logPlate` (L257-306).
- Reuse the existing double-log guard `loggingPlateRef` (FoodSearchScreen.js:259-305)
  and slot-aware recents that pre-fill last portion (L104-114).
- Navigation/placement: route "FoodSearch" in DiaryStack, presentation 'modal'
  (RootNavigator.js:231-235); it must still close back to the diary on explicit
  "Done"/"Log {n}". Recipe pick mode (`pickMode 'recipe'`, RecipeBuilderScreen.js:118-124)
  MUST keep its existing return-to-returnTo behaviour (FoodSearchScreen.js:341-350) —
  do not change the recipe-ingredient flow.
- Gating: Pro by-stack, unchanged. NO LLM, NO AI photo — boundary held.
- Empty/loaded/error states: empty plate = existing browse/search; partial-failure
  on multi-log already has honest messaging (FoodSearchScreen.js:259-305) — reuse.
- Edge cases: quick-add (no food, 2 taps, DiaryScreen.js:592, 631-636) and the
  barcode-scan-into-search path (ScanBarcode replace → FoodSearch, ScanBarcodeScreen.js:117-119)
  must both still resolve correctly into the staying-open session — the exact merge
  behaviour is NOT DETERMINED IN CODE; confirm before building.
VERIFICATION: Evidence VERIFIED but the action-count benchmark is single-sourced
(MacroFactor FLSI cross-cited by nutriscan; macrofactor.com/fastest-food-logger-2025
was bot-gated) — compare-05 VERIFICATION STATUS :165-170. The quick-add / scanned-food
merge into a staying-open session is NOT DETERMINED IN CODE.

---

ID: U-C-6
AREA: Food logging & diary — primary action prominence
TITLE: Give the diary a single prominent primary "log food" action over the barcode FAB
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 6 — The most prominent diary control is the amber 56px barcode FAB,
"not search-add, which can mislead a newbie into thinking scanning is the main path"
(compare-05 NEWBIE VERDICT; WHERE WE LAG; Phase-1 :48, :79). Beginners abandon
when the primary path is unclear.
EFFORT (1-10): 4 — Re-prioritising / adding a primary log affordance; the search-add
flow already exists (addFood, DiaryScreen.js:229, 591).
CURRENT STATE: "Two different 'add food' entry points with different reach: the
per-meal add inside MealSection vs the barcode FAB. There is no single prominent
primary 'log food' action at the diary level — the most prominent floating control
is Scan barcode (DiaryScreen.js:647-657), not search-add" (08-food-logging.md:48,
:79; compare-05 WHERE WE LAG :129-130). The FAB is amber 56px with shadow.lg
(DiaryScreen.js:781-787).
THE PROBLEM:
- Newbie: the visually dominant control is scanning, implying that is the main way
  to log, when search-add is the more common path (compare-05 NEWBIE VERDICT :67-78).
- Athlete: less affected — they know both paths — but a clearer primary does no harm.
THE EVIDENCE: compare-05 WHERE WE LAG "No prominent single primary 'log food' action
at diary level; prominence sits on the barcode FAB rather than search-add
(DiaryScreen.js:647-657, 79)". Phase-1 CURRENT WEAKNESSES :48 and
"Most important action prominence … Arguably the prominence is on the wrong action"
(:79).
BEST REFERENCE IMPLEMENTATION: MacroFactor's clear primary logger entry (compare-05
BEST IN CLASS :38-44, VERIFIED). NOTE: also heed compare-05's caution that MFP's 2026
redesign added "space-consuming cards" that drove users away (WHERE WE LAG :131-134,
VERIFIED) — the fix must not add density.
PROPOSED SOLUTION: Demote the barcode FAB to a secondary affordance and give the
diary one obvious primary "Log food" action (opening FoodSearch via the existing
`addFood`). Two viable forms — present both to the founder rather than picking
silently: (a) replace the barcode-only FAB with a primary "Log food" FAB that opens
search, with scan as a secondary icon inside the picker (scan already lives in the
FoodSearch header, FoodSearchScreen.js:595); or (b) keep the FAB but make its primary
tap = search-add and move scan to a smaller secondary control. No new cards on the
diary (respect the density caution).
NEWBIE EXPERIENCE: One obvious "Log food" button that opens search; scanning is still
available but no longer reads as the main path.
ATHLETE EXPERIENCE: Both paths remain one tap apart; scan stays reachable from the
diary and the picker.
IMPLEMENTATION BLUEPRINT:
- Screen: src/screens/DiaryScreen.js. The FAB is at L647-657 (style L781-787) and
  navigates to ScanBarcode (L650). The search-add path is `addFood` →
  navigate('FoodSearch') (DiaryScreen.js:226-230, per-meal Add at L591). Scan is also
  reachable from the FoodSearch header (FoodSearchScreen.js:595), so demoting the
  diary FAB does not orphan scanning.
- Navigation/placement: keep the FAB position scheme (spacing-based, scales,
  DiaryScreen.js:782); change which action is primary.
- Gating: Pro, unchanged. Do NOT add information-dense cards (compare-05 caution).
- Empty/loaded/error states: the empty state already offers onAdd/onCopyYesterday/
  onPlanDay (DiaryScreen.js:578-583) — keep its primary as "add/search". FAB is
  hidden during multi-select (L647-657) — preserve.
- Edge cases: the FAB is "hidden during selection" (DiaryScreen.js:647-657) — any new
  primary action must preserve that selection-mode hiding.
VERIFICATION: All-VERIFIED (compare-05 WHERE WE LAG + Phase-1 in-code). The two
solution forms are presented as founder choices, not a silent pick. No
NOT-DETERMINED implementation facts.

---

ID: U-C-7
AREA: Food logging & diary — food database quality
TITLE: Surface a curated, verified UK best-match (one correct result) with a meaningful verified marker
SUGGESTED TIER: 1 Critical
IMPACT (1-10): 9 — "The market's make-or-break is ONE correct UK top result, not
crowdsourced duplicates; UK users hit a day-one wall on Tesco meal deals, Greggs,
Costa, Nando's, and own-brand ranges" (compare-05 WHERE WE LAG, VERIFIED). DB
accuracy/coverage is "the dimension athletes abandon over" (compare-05 ATHLETE
VERDICT, VERIFIED) and the #1 cited frustration (compare-04 USER SENTIMENT, VERIFIED).
EFFORT (1-10): 8 — Touches the search/data layer and likely a data-sourcing decision;
the inventory shows search plumbing but "no evidence of a curated, verified UK
best-match or a meaningful verified marker" (compare-05 WHERE WE LAG), so the actual
DB internals are not established in the audited screens.
CURRENT STATE: FoodSearch has a debounced 250ms local-first waterfall search with a
2-char gate (08-food-logging.md:100, :111; FoodSearchScreen.js:206-226) and an Open
Food Facts barcode backbone (DiaryScreen.js:557-576, OFF consent card). But "UK
best-match / DB-accuracy unproven. The inventory shows search plumbing
(FoodSearchScreen.js:206-226) but no evidence of a curated, verified UK best-match or
a meaningful verified marker" (compare-05 WHERE WE LAG :123-128).
THE PROBLEM:
- Newbie: the decisive week-one wall is "20 wrong results" and not finding their
  actual supermarket item (compare-05 NEWBIE VERDICT, VERIFIED).
- Athlete: abandons over DB accuracy/coverage when own-brand/UK items are missing or
  US-portion-contaminated (compare-05 ATHLETE VERDICT; USER SENTIMENT :152-160).
THE EVIDENCE: compare-05 WHERE WE LAG :123-128 (VERIFIED — Nutracheck, mynetdiary
DB-accuracy, cronometer UK thread, OFF brands); USER SENTIMENT :152-160 (VERIFIED);
compare-04 USER SENTIMENT :178-179 (MFP under-estimates protein ~7.8% / carbs ~6.4%,
PARTIAL on the figures). MISSING ENTIRELY "Curated nutritionist-verified UK item set
with food images (Nutracheck, VERIFIED) — not evidenced in the inventory".
BEST REFERENCE IMPLEMENTATION: Nutracheck — "curated not crowdsourced, 500K+ UK
items, nutritionist-verified, food images, Tesco/Greggs/Costa/Nando's coverage"
(compare-05 BEST IN CLASS :46-47, VERIFIED). Open Food Facts as the boundary-safe
barcode backbone (already wired, compare-05 BEST IN CLASS :50-52, VERIFIED).
PROPOSED SOLUTION: Establish a curated/verified UK best-match in food search — return
ONE correct top result for common UK supermarket/takeaway items rather than a list of
crowdsourced duplicates, and show a verified marker that genuinely means verified (not
MFP's "enough people upvoted it", compare-05 USER SENTIMENT :156-158). This is a
data-sourcing and ranking decision, not a UI tweak; it likely depends on the backing
food database, which is NOT established in the audited screens.
NEWBIE EXPERIENCE: Searches "Tesco …" / "Greggs …" and the correct UK item is the top
result with a trustworthy verified badge.
ATHLETE EXPERIENCE: Trusts the data enough to log in-app instead of building everything
as custom foods.
IMPLEMENTATION BLUEPRINT:
- The backing food database, its provenance, and whether a curated UK source or a
  verified-marker field exists are **NOT DETERMINED IN CODE** — the audited screens
  show only the search waterfall (FoodSearchScreen.js:206-226) and OFF as a barcode
  source (DiaryScreen.js:557-576). Confirm the data layer (search service, DB
  schema, any verified flag) before designing the solution.
- Constraints from CLAUDE.md/architecture: offline-first (local DB is source of
  truth on device; FoodSearch is already "local-first", FoodSearchScreen.js:206-226);
  EU data residency; NO PII to external services; deterministic, NO LLM/AI ranking.
- A dependency decision (new/curated UK data source) would need founder sign-off per
  the "never add dependencies without asking" rule — present the candidate source(s)
  (Nutracheck-style curation vs expanded OFF UK coverage), purpose, and licence.
- Gating: Pro by-stack, unchanged.
- This is a spine/data-layer change — per the build operating model it is hands-on
  Claude work, not an agent surface.
VERIFICATION: Market evidence VERIFIED (Nutracheck, OFF, mynetdiary). The entire
implementation side is NOT DETERMINED IN CODE — the backing DB, provenance, verified
marker, and ranking are not established in the audited screens; this proposal is
**evidence-thin on the Volyume side** and must start with a data-layer investigation
before any build. Dependency/data-source choice requires founder sign-off.

---

ID: U-C-8
AREA: Food logging & diary — barcode scanning
TITLE: Add a manual "type a barcode" escape to the live scanner
SUGGESTED TIER: 3 Medium
IMPACT (1-10): 5 — The scanner has "no manual 'type a barcode' or 'type it in'
escape on this screen itself … the only non-scan exit is Close" (compare-05 ATHLETE
VERDICT; 08-food-logging.md:348-349, ScanBarcodeScreen.js:200-203). Frustrating
"when a code won't read" (Phase-1 ATHLETE QUESTION :353).
EFFORT (1-10): 3 — A small affordance on the scanner that routes into the existing
heal chain (ScanLabel keeps the barcode, or AddCustomFood with prefillBarcode).
CURRENT STATE: ScanBarcodeScreen has a live camera, torch, and permission handling
but "No manual 'type a barcode' or 'type it in' escape on this screen itself (unlike
ScanLabel which offers Type it in) — the only non-scan exit is Close"
(08-food-logging.md:348-349; ScanBarcodeScreen.js:200-203). The heal chain
(ScanLabel) does offer "Type it in" downstream (08-food-logging.md:385,
ScanLabelScreen.js:310-316).
THE PROBLEM:
- Newbie: less likely to hit this (they will retry the scan), but a damaged/unreadable
  code with no manual option is a dead-feeling moment.
- Athlete: "the lack of a manual-barcode entry path may frustrate when a code won't
  read" (08-food-logging.md:353).
THE EVIDENCE: 08-food-logging.md CURRENT WEAKNESSES :348-349 and ATHLETE QUESTION
:353 (Phase-1, VERIFIED in-code). compare-05 ATHLETE VERDICT "no
manual-barcode-entry escape on the scanner (ScanBarcodeScreen.js:200-203)".
BEST REFERENCE IMPLEMENTATION: Volyume's own ScanLabel "never dead-ends" heal pattern
("Type it in" that keeps the barcode, ScanLabelScreen.js:310-316) — extend the same
philosophy to the scanner entry (this heal chain is a Volyume-current strength per
compare-05 WHERE WE LEAD :100-103).
PROPOSED SOLUTION: Add a "Type it in" / "Enter barcode" affordance to ScanBarcodeScreen
alongside Close (header region, ScanBarcodeScreen.js:200-218), routing into the
existing miss/heal path so a hand-typed code either resolves via the same waterfall or
hands off to ScanLabel/AddCustomFood with the barcode preserved.
NEWBIE EXPERIENCE: If the scan won't read, an obvious "Enter it manually" option keeps
them moving instead of forcing a Close.
ATHLETE EXPERIENCE: Types a known/damaged barcode and proceeds without leaving the
scan flow.
IMPLEMENTATION BLUEPRINT:
- Screen: src/screens/ScanBarcodeScreen.js. Add the affordance near the header
  controls (Close/torch at L200-218). On submit, route through the existing scan
  resolution — a hit does `navigation.replace('FoodSearch', { scannedFood })`
  (ScanBarcodeScreen.js:117-119), a miss does `navigation.replace('ScanLabel',
  { prefillBarcode })` (ScanBarcodeScreen.js:122-124). Reuse, do not duplicate.
- Navigation/placement: route "ScanBarcode" in DiaryStack, presentation 'modal'
  (RootNavigator.js:241-245); reached from the diary FAB (DiaryScreen.js:650) and the
  FoodSearch header scan icon (FoodSearchScreen.js:595).
- Gating: Pro (barcode scanning is a Pro feature per CLAUDE.md), unchanged.
- Empty/loaded/error states: while resolving a typed code, reuse the existing
  resolving spinner badge (ScanBarcodeScreen.js:235-239) and scan-lock
  (ScanBarcodeScreen.js:64, 104-107) so a typed lookup can't race a camera detect.
- Edge cases: validate the typed input is a plausible barcode before lookup; the exact
  validation rule is NOT DETERMINED IN CODE — confirm acceptable formats (EAN-8/13 etc.)
  before building.
VERIFICATION: All-VERIFIED on the gap (Phase-1 in-code + compare-05). The barcode
input-validation rule is NOT DETERMINED IN CODE.

---

ID: U-C-9
AREA: Food logging & diary — hydration target
TITLE: Make the daily water target user-configurable instead of hardcoded 3 L
SUGGESTED TIER: 4 Enhancement
IMPACT (1-10): 4 — Named in both the athlete verdict and Phase-1 weaknesses; a small
but repeatedly-flagged gap. "The hardcoded 3 L water target" is a listed athlete gap
(compare-05 ATHLETE VERDICT :87-88) and Phase-1 notes it is "acknowledged as a
follow-up" (08-food-logging.md:49).
EFFORT (1-10): 3 — Replace one hardcoded constant with a per-user setting and a
small editor; the WaterRow UI already exists.
CURRENT STATE: "WaterRow at the bottom … '{litres} / 3.0 L' value, minus and plus
250 ml buttons … Daily target hardcoded at 3000 ml (DiaryScreen.js:750)"
(08-food-logging.md:33, :49; WaterRow DiaryScreen.js:616, 752-777).
THE PROBLEM:
- Newbie: 3 L is a reasonable default; low impact.
- Athlete: a competitor with a specific hydration target cannot set it
  (compare-05 ATHLETE VERDICT :87-88).
THE EVIDENCE: compare-05 ATHLETE VERDICT :87-88 and 08-food-logging.md CURRENT
WEAKNESSES :49 ("acknowledged as a follow-up") — Phase-1 VERIFIED in-code. This is a
Volyume-current follow-up, not a sourced market comparison.
BEST REFERENCE IMPLEMENTATION: None cited specifically — this is a self-identified
follow-up rather than a market-driven feature.
PROPOSED SOLUTION: Add a per-user daily water target (default 3000 ml to preserve
current behaviour) editable from the diary water row or settings, replacing the
hardcoded 3000 ml. The +/- 250 ml increment UI (DiaryScreen.js:752-777) is unchanged.
NEWBIE EXPERIENCE: Unchanged default (3 L); editing is optional and out of the way.
ATHLETE EXPERIENCE: Sets their own hydration target.
IMPLEMENTATION BLUEPRINT:
- Screen: src/screens/DiaryScreen.js. Replace the hardcoded 3000 ml (DiaryScreen.js:750)
  with a stored per-user value; the WaterRow value string "{litres} / 3.0 L"
  (DiaryScreen.js:616, 752-777, label L892-893) reads from that value.
- Storage: must follow offline-first (local DB is source of truth on device; sync via
  the sync layer only — never query Supabase directly from the component). The exact
  local-storage/profile field for a water target is NOT DETERMINED IN CODE — confirm
  where per-user diary settings live before building.
- Gating: Pro by-stack (diary is Pro), unchanged.
- Empty/error states: missing/unset value falls back to 3000 ml default.
- Edge cases: enforce a sane minimum/maximum on the editable target; exact bounds NOT
  DETERMINED IN CODE.
VERIFICATION: Gap VERIFIED in-code (Phase-1 :49, :33). The per-user settings storage
location is NOT DETERMINED IN CODE — confirm before building.

---

ID: U-C-10
AREA: Food logging & diary — ED-safety / anti-shame framing
TITLE: Audit diary feedback to remove punitive over/under colour framing and avoid pressure streaks
SUGGESTED TIER: 2 High
IMPACT (1-10): 8 — The load-bearing ED-safety signal: a BJPsych study ties harm to
numeric "fixation … fuelled heavily by the app's quantification", red/green feedback,
and competitive streaks (compare-05 USER SENTIMENT, VERIFIED; flagged to safety owners
per Phase-2 proposal item 7). The market's #1 design risk is number-focus/red-shame
signalling fuelling disordered eating (compare-04 WHERE WE LEAD, Finding 4.5, VERIFIED).
EFFORT (1-10): 4 — Mostly an audit of existing feedback affordances (colour rules,
any streak/percentage framing) against the safety philosophy; changes are
copy/colour-rule adjustments, not new systems. But it is safety-adjacent.
CURRENT STATE: Volyume already has protective framing — Nutrition Education states a
5% adjustment cap, 2-week cooldown, "adherence beats perfection", and never adds
exercise calories back (07-nutrition-targets.md:48-52, :211-212; compare-04 WHERE WE
LEAD). FoodInsights uses an amber-fill bar that "turns green when within 10% of
target" (07-nutrition-targets.md:138-174) and four adherence "hit/total" rows
(:177-193). The diary uses MacroRings vs targets (08-food-logging.md:28, :540-547).
THE PROBLEM:
- Newbie: most vulnerable to red/shame signalling and streak pressure linked to
  disordered eating (compare-05 USER SENTIMENT, VERIFIED).
- Athlete: also at risk under restrictive phases; adherence-neutral, anti-shame
  framing is what users want (compare-04 USER SENTIMENT, Finding 5.2, VERIFIED).
THE EVIDENCE: compare-05 USER SENTIMENT :159-163 "BJPsych study ties harm to numeric
'fixation … red/green feedback, and competitive streaks — so the diary should avoid
punitive over/under colour framing and pressure streaks (VERIFIED; flag to safety
owners per Phase-2 proposal item 7)". compare-04 WHERE WE LEAD (Finding 4.5 VERIFIED)
and USER SENTIMENT (Finding 5.2 VERIFIED).
BEST REFERENCE IMPLEMENTATION: MacroFactor's adherence-neutral, explicit anti-shame
language ("Tracking isn't something that should stress you out … without shaming,
judgment, or the requirement that you adhere to your targets perfectly")
(compare-04 BEST IN CLASS :39-46, VERIFIED help-docs). Volyume's own education copy is
already the protective counter-pattern (compare-04 WHERE WE LEAD :119-124).
PROPOSED SOLUTION: Audit the diary/insights feedback surfaces for any punitive
over/under colour framing or streak/competitive pressure, and align them with the
existing adherence-neutral, anti-shame philosophy. Concretely: review the FoodInsights
green/amber bar rule (07-nutrition-targets.md:138-174) and adherence "hit/total"
framing (:177-193), and the diary MacroRings over/under colour treatment
(08-food-logging.md:540-547), to ensure none reads as red-shame for being over/under
and that no competitive streak mechanic is introduced.
NEWBIE EXPERIENCE: Feedback reads as informative, never punitive — protecting the most
vulnerable user.
ATHLETE EXPERIENCE: Same adherence-neutral framing during restrictive phases.
IMPLEMENTATION BLUEPRINT:
- This proposal touches ED-safety framing — **FOUNDER-GATE**. Per CLAUDE.md the ED
  safety system (src/coaching/safety/) must NOT be modified/disabled/worked around;
  calorie floors (1,200 women / 1,500 men), Beat UK signposting, and the 1.5%/wk
  rapid-loss threshold are untouchable. This is an audit + copy/colour-rule
  alignment, not a change to the safety engine — treat as INPUT ONLY and route to the
  safety owners (compare-05 explicitly says "flag to safety owners per Phase-2
  proposal item 7").
- Surfaces to audit (do NOT change without sign-off): FoodInsights bar colour rule
  (07-nutrition-targets.md:166-168, :138-174) and adherence rows (:177-193); diary
  MacroRings (08-food-logging.md:540-547, DiaryScreen.js:540-547). The "within 10%
  turns green" rule is currently explained only in a footnote (07-nutrition-targets.md:478-479).
- Whether any competitive streak mechanic exists in the diary is NOT DETERMINED IN
  CODE in the audited screens — confirm none exists / none is planned.
- Gating: Pro by-stack, unchanged.
VERIFICATION: Evidence VERIFIED (BJPsych via compare-05; Findings 4.5/5.2 via
compare-04). **FOUNDER-GATE** — touches ED-safety framing; INPUT ONLY, route to safety
owners. Presence/absence of any streak mechanic is NOT DETERMINED IN CODE.

---

## Cluster summary (for the dispatcher)

Ten proposals (U-C-1 … U-C-10). Cross-cutting SACRED constraints respected: no
LLM/AI on food logging or ranking (U-C-5, U-C-7 explicitly hold the boundary); ED
safety untouched (U-C-3 and U-C-10 are FOUNDER-GATE); billing unchanged; free/Pro
gating preserved (the whole diary domain stays Pro by-stack via
`withProGuard(DiaryScreen, 'Food diary')`, RootNavigator.js:160, 225; NutritionTargets
Pro via withProGuard at RootNavigator.js:150).

FOUNDER-GATE: U-C-3 (contest-prep goal must respect calorie floors / rapid-loss
threshold), U-C-10 (diary anti-shame framing — ED-safety-adjacent, route to safety
owners).

Evidence-thin: U-C-3 (Carbon/RP periodisation, Finding 3.2 PARTIAL/VERIFIED),
U-C-7 (Volyume DB side wholly NOT DETERMINED IN CODE).

NOT-DETERMINED implementation facts flagged: U-C-1 (exact minimum engine inputs),
U-C-3 (contest-prep deficit %, engine accepting contest_prep as input goal),
U-C-4 (30-day chart rendering), U-C-5 (quick-add/scanned-food merge into staying-open
session), U-C-7 (backing food DB, provenance, verified marker, ranking — entire impl
side), U-C-8 (barcode input-validation rule), U-C-9 (per-user water-target storage
location and bounds), U-C-10 (presence of any streak mechanic).
