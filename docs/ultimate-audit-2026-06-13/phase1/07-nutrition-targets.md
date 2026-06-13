# Phase 1 — 07 Nutrition Targets cluster

Audited READ-ONLY 2026-06-13. Token values resolved against `src/styles/theme.js`.
Key tokens used below (theme.js): `fontSize.micro` 10 (L257), `fontSize.xs` 11 (L258),
`fontSize.sm` 13 (L259), `fontSize.md` 16 (L260), `fontSize.lg` 17 (L261),
`fontSize.xl` 20 (L262), `fontSize.xxl` 24 (L263), `fontSize.xxxl` 32 (L264),
`fontSize.display` 40 (L265). Type roles (theme.js):
`type.label` = sm 13 / medium (L402-405), `type.caption` = xs 11 / regular (L406-409),
`type.body` = md 16 / regular (L394-397), `type.bodyStrong` = md 16 / semibold (L398-401),
`type.title` = lg 17 / semibold (L390-393), `type.num('display')` = display 40 (L417-420).
Spacing: `spacing.lg` 16 (L235), `spacing.md` 12 (L234), `spacing.sm` 8 (L233).

---

SCREEN: Nutrition Targets (src/screens/NutritionTargetsScreen.js)

WHAT IT IS: A long single-scroll Pro screen that takes the user's body stats,
activity, goal/phase and protein approach, then computes and displays daily
calorie + macro targets with a detailed "why" breakdown and per-meal protein
distribution guidance. It is the entry point to the nutrition layer.

WHAT IS ON IT:
- Page title "Nutrition Targets" + inline InfoTooltip (size 14) explaining how
  calories/macros are calculated (NutritionTargetsScreen.js:471-485).
- Page subtitle "Calculate your personalised daily calorie and protein targets."
  (L487-489).
- Education card: book icon, "New to calories and macros?" title, "5-minute guide…"
  body, chevron-forward; taps to NutritionEducation (L493-508).
- When form is OPEN (`!formCollapsed`, L510):
  - Section "About you" (L515).
  - Biological sex pill group Male/Female (L518-525).
  - Age numeric input, placeholder "e.g. 28", maxLength 3 (L528-540).
  - Height: feet input (placeholder "5") + "ft" label, inches input (placeholder
    "10") + "in" label (L543-573).
  - Current weight (kg) input, placeholder "e.g. 82" (L576-588).
  - Body fat % input (optional), placeholder "e.g. 15" (L591-603).
  - Body fat source pill group Visual/BIA/Caliper/DEXA, only shown when BF entered
    (L606-615).
  - Section "Activity & training" → Activity level pill group Sedentary/Light/
    Moderate/Active/Very Active (L619-628).
  - Section "Goal & phase" → 2-column goal grid: Build muscle (slow) +10% surplus,
    Build muscle (fast) +17% surplus, Maintain weight 0%, Hold muscle lose fat −5%,
    Lose weight (steady) −13%, Lose weight (fast) −22%; the fast cut is hidden when
    calm/wellbeing mode is on (L634-663, GOALS L80-87).
  - Section "Protein target" → InfoTooltip (size 12) + note text; four approach
    cards Standard/Optimised(Recommended badge)/Advanced/Custom each with label,
    range, description; Custom reveals a g/kg numeric input when active
    (L667-728).
  - GDPR consent card: lock icon, "Your body data is stored only on this device…"
    text, and a checkbox row "I consent to storing this data on my device"
    (L732-754).
  - "Calculate targets" button (calculator icon, disabled until form complete)
    (L777-795).
- When form is COLLAPSED (`formCollapsed`, L758): a one-line summary row
  (nutrition icon + "Male · 28yrs · 5ft 10in · 82kg · <phase>") and an "Adjust"
  pill button (settings icon) that reopens the form (L758-773).
- RESULTS (when `results`, L799):
  - Hero card: "Daily Energy Target", big kcal value, "Estimated range: X – Y kcal"
    (L804-819).
  - Macro row: three cards Protein/Carbs/Fat showing grams; protein also shows
    g/kg or g/kg lean (L822-832, MacroCard L138-154).
  - Per-meal protein card (only when proteinG>0): "PER MEAL" heading + InfoTooltip,
    big "Ng" per-meal value, "protein per meal", a row of dots (one per meal),
    a 3/4/5/6 chip selector with a recommended dot, caption "Recommended for your
    protein target", and an optional warning hint when a sub-optimal count is
    chosen (L839-927).
  - "Why these numbers for you?" collapsible card (default expanded): four
    WhySections — Calories, Protein, Fat, Carbs — each with icon + title + long
    goal-aware body paragraph (L930-1043).
  - Phase card: phase title + phase description (L1046-1055).
  - Confidence card: icon + "High/Medium/Low confidence…" text, when available
    (L1058-1069).
  - Warning banners array, when present (L1072-1077).
  - "How was this calculated?" collapsible: rows for Formula, Resting calorie burn,
    Maintenance calories, Phase adjustment, Projected weekly change, Macro method
    (Protein basis, Fat, Carbs) and an italic medical disclaimer (L1080-1141).
  - "Recalculate" button (L1144-1151).

NAVIGATION: Registered as route name "NutritionTargets" in the ProfileStack
(RootNavigator.js:384, inside the ProfileStack defined L364), wrapped as
`GatedNutritionTargets` with header title "Nutrition Targets". Reached from
YouScreen.js:140 and WeeklyCheckInScreen.js:821 via
`navigation.navigate('NutritionTargets')`. It pushes onward to NutritionEducation
(L495 `navigation.navigate('NutritionEducation')`).

GATING: Pro. Guarded by `withProGuard(NutritionTargetsScreen, 'Nutrition targets')`
(RootNavigator.js:150), registered as the gated component at RootNavigator.js:384.
The screen itself has no in-component tier check.

CURRENT STRENGTHS:
- Comprehensive: the "Why these numbers" section is genuinely educational and
  goal-aware (separate copy for gain/cut/recomp/maintain, L958-1018).
- Form prefills from saved body profile, weight, body composition and training
  days so users rarely re-enter stats (L296-340).
- Progressive disclosure: form collapses to a summary once targets exist
  (L758-773), keeping the results prominent on return.
- Per-meal protein distribution adds real coaching value with the 0.4–0.55 g/kg
  MPS window logic (L221-228, L839-927).
- Robust against partial DB records via `hydrateLoadedTargets` (L34-62) and
  defensive derivation of kcal range (L804-807).

CURRENT WEAKNESSES:
- Very long and dense for one scroll: form + results + two collapsibles + per-meal
  card + phase/confidence/warnings all stack vertically. High cognitive load.
- "Why these numbers" defaults to EXPANDED (`whyExpanded` initial true, L201),
  so a returning user lands on four long paragraphs before the controls.
- Two separate InfoTooltips plus an approach note plus per-meal tooltip is a lot
  of explanatory text competing with the inputs.
- Goal labels and detail percentages (e.g. "+17% surplus") are jargon-adjacent
  with no inline plain explanation until results render (L80-87).
- The collapsed summary line can be truncated to one line on small phones
  (`numberOfLines={1}`, L762).

NEWBIE QUESTION: Partially. The education card (L493-508) and the goal labels
("Build muscle (slow)", "Lose weight (steady)") are friendly, and the calorie
InfoTooltip is plain-English. But a first-timer faces a long form (body fat %,
BF source, activity level, four protein approaches with g/kg ranges) that is
intimidating; the protein-approach section in particular (Standard/Optimised/
Advanced/Custom, g/kg) is expert framing (L667-728).

ATHLETE QUESTION: Largely yes. Body-fat source selection feeding a lean-mass
formula, protein on bodyweight vs LBM basis, per-meal MPS-window splitting, custom
g/kg protein, and the detailed "How was this calculated?" breakdown
(L1093-1141) all serve an experienced competitor. Contest-prep phase copy exists
(PHASE_DESCRIPTIONS L96) though contest_prep is not a selectable goal in the GOALS
grid (L80-87) — it can only arrive from a loaded target.

LOCATION QUESTION: Plausible but slightly buried. It lives in the ProfileStack
(RootNavigator.js:384) and is reached from the You tab and the weekly check-in,
not from the Diary/nutrition surface where meal plans and insights live (those are
in DiaryStack). A user thinking about food would not obviously find targets under
"You".

VISUAL + USABILITY:
- Font sizes (resolved):
  - pageTitle: `fontSize.xxxl` (32) / black (L1174-1179).
  - pageSubtitle: `fontSize.sm` (13) (L1184-1189).
  - eduTitle: `type.label` (13) (L1182); eduBody: `fontSize.xs` (11) (L1183).
  - sectionHeading: `type.label` (13) (L1193-1197).
  - fieldLabel: `type.label` (13) (L1204-1207).
  - numInput: `type.body` (16) (L1212-1223).
  - pillText: `type.label` (13) (L1257-1260).
  - goalLabel: `type.label` (13); goalDetail: `type.caption` (11) (L1289-1299).
  - heroLabel: `type.label` (13); heroKcal: `type.num('display')` (40);
    heroRange: `fontSize.sm` (13) (L1390-1401).
  - macroGrams: `fontSize.xl` (20) / black; macroLabel: `fontSize.xs` (11);
    macroPerKg: `type.caption` (11) (L1417-1432).
  - perMealHeading: `fontSize.xs` (11) / black; perMealValue: `fontSize.xxxl` (32)
    / black; perMealUnit: `fontSize.xs` (11) (L1449-1470).
  - mealCountRecCaptionDot: `fontSize.micro` (10) (L1535-1538).
  - whyHeaderLabel: `type.bodyStrong` (16); whySectionTitle: `fontSize.sm` (13);
    whySectionBody: `fontSize.sm` (13) (L1813-1848).
  - calcKey: `fontSize.sm` (13); calcValue: `type.label` (13) (L1634-1641).
  - disclaimer: `fontSize.xs` (11) italic (L1642-1651).
  - recommendedBadgeText: `fontSize.micro` (10) (L1760-1764).
  - calcBtnText: `type.title` (17) (L1366-1369).
- Touch targets:
  - Pills: paddingVertical `spacing.sm` 8 + label line — height ≈ 8+8+~16 ≈ 32px
    vertical; **below 44px** (pill style L1245-1252). No hitSlop.
  - Goal cards: width 47%, padding `spacing.md` 12, multi-line content — adequate
    height (L1273-1281).
  - Approach cards: padding `spacing.md` 12, multi-line — adequate (L1718-1724).
  - Consent checkbox: 22×22 box but inside a `consentRow` TouchableOpacity that
    includes the label (L738-752, checkbox L1330-1339) — full row is tappable, OK.
  - meal-count chips: explicit **44×44** (L1499-1509) — meets 44px.
  - "Adjust" reconfigure button: paddingVertical `spacing.xs` 4 + xs text — **well
    below 44px** (L1688-1698).
  - Calculate button: paddingVertical `spacing.lg` 16 + 17px text — comfortably
    ≥44px (L1352-1360).
  - InfoTooltip touch target: **NOT DETERMINED IN CODE** (component not read;
    only `size` prop passed).
- Information density: High. A complete results state renders hero + 3 macro cards
  + per-meal card + 4-section why card + phase + confidence + warnings + an
  expandable calc table + recalculate, all in one ScrollView.
- Clean or cluttered: Leans cluttered in the results state due to the volume of
  explanatory prose; the form state is reasonably clean and well-sectioned.
- Most important action prominence: In the form state the amber "Calculate targets"
  full-width button is the clear primary (L777-795). In results, the hero kcal at
  display 40 / amber is correctly the most prominent element (L1394-1397).
- Small/standard/large behaviour: Whole screen is a ScrollView with
  KeyboardAvoidingView (L461-469), so it scrolls on all sizes. Goal grid uses
  width '47%' so it reflows by percentage. The collapsed summary uses
  `numberOfLines={1}` (L762) and will truncate sooner on a 5.4". Fixed lineHeights
  in `type.*` roles scale with the larger-text fontSize swap (theme.js L373-410).
  No fixed pixel heights that would clip content.

---

SCREEN: Nutrition Education / "Nutrition basics" (src/screens/NutritionEducationScreen.js)

WHAT IT IS: A static, read-only 5-minute explainer for someone who has never
tracked calories or macros — what calories and the three macros are, how phases
work, how to track, adherence over perfection, and that the coach does the
adjustments.

WHAT IS ON IT:
- BackHeader titled "Nutrition basics" (L20).
- Intro paragraph (L23-27).
- Section 1 "Calories. Your energy budget" (flame icon): two body paragraphs,
  a KeyPoint "Trend over weeks > perfection on any day", another body, a KeyPoint
  about Volyume never adding exercise calories back (L29-53).
- Section 2 "The three macros" (restaurant icon): intro body + three MacroLines —
  Protein 4 kcal/g, Fat 9 kcal/g, Carbs 4 kcal/g — each with role text (L55-81).
- Section 3 "How to set your numbers" (podium icon): body + four PhaseLines (Cut,
  Maintain, Lean gain, Bulk) with rate + gist, then a KeyPoint about logging
  weight + check-in (L83-101).
- Section 4 "How to actually track" (scale icon): body + three lettered BulletRows
  A/B/C (log in app, weigh protein eyeball rest, repeat meals) (L103-132).
- Section 5 "Adherence beats perfection" (check-circle icon): body + KeyPoint
  about not doubling up after a missed day (L134-148).
- Section 6 "The coach does the adjustments" (trending-up icon): two bodies (5%
  cap, 2-week cooldown) + a KeyPoint (L150-173).
- Footer italic line about estimates and the 2–4 week trend (L180-183).

NAVIGATION: Route name "NutritionEducation". Registered TWICE: in ProfileStack
(RootNavigator.js:385, `headerShown: false`) and in ProOnboardingStack
(RootNavigator.js:509). Reached from NutritionTargetsScreen.js:495 and
ProSetupCompleteScreen.js:217 via `navigation.navigate('NutritionEducation')`.
It is a leaf screen — the only navigation out is BackHeader's back action
(L20; BackHeader.js:37).

GATING: Effectively free at the component level — there is NO `withProGuard`,
`ProGate`, or tier check on this screen (registered un-gated at RootNavigator.js:385
and :509). Its primary entry point (NutritionTargets) is Pro-gated, but the
ProOnboardingStack registration (L509) is not, so it can be reached during
onboarding without a Pro check in this file.

CURRENT STRENGTHS:
- Clear, friendly, plain-English; British spelling throughout.
- Well-structured with consistent Section/Body/KeyPoint/MacroLine/PhaseLine
  building blocks (L191-256), giving uniform rhythm.
- Honest framing (adherence over perfection; never adds exercise calories back,
  L48-52) aligns with the app's coaching philosophy.
- `accessibilityRole="header"` on section titles (L198) aids screen readers.
- Self-contained read-only content — no data dependencies, cannot error.

CURRENT WEAKNESSES:
- No call-to-action at the end; the footer is a dead end (L180-183) — no "set your
  targets" button to convert the lesson into action.
- Six sections of prose is long for a "5-minute" promise; all expanded at once,
  no collapsing.
- The two duplicate route registrations (L385, L509) are easy to let drift.

NEWBIE QUESTION: Yes — this is explicitly written for the first-time gym-goer and
succeeds. Energy budget, the three macros with kcal/g, hand-portion estimates
(palm of chicken, cupped hand of rice) and the "trend over weeks" message are all
beginner-friendly (L34-148).

ATHLETE QUESTION: Mostly not aimed at them, and that is fine — it is intentionally
the beginner primer. An experienced competitor would find it too basic, but it is
not where they would be sent. The phase rates (Cut 0.5–1%/wk, Lean gain
0.25–0.5%/wk, L92-95) are accurate enough to not mislead an athlete who reads it.

LOCATION QUESTION: Right place as a child of NutritionTargets and of the Pro
onboarding hand-off (ProSetupCompleteScreen.js:217). Reachable exactly when a new
user is about to face the numbers. Reasonable.

VISUAL + USABILITY:
- Font sizes (resolved):
  - BackHeader title: `fontSize.lg` (17) / semibold (BackHeader.js:59-66).
  - intro: `fontSize.md` (16) (L265).
  - sectionTitle: `type.title` (17) (L270).
  - body: `fontSize.sm` (13) (L273).
  - strong: inherits sm 13 / bold (L274).
  - keypointText: `fontSize.sm` (13) / medium (L277).
  - macroName: `type.bodyStrong` (16); macroKcal: `fontSize.xs` (11);
    macroRole: `fontSize.sm` (13) (L282-284).
  - phaseName: `type.bodyStrong` (16); phaseRate: `fontSize.xs` (11);
    phaseGist: `fontSize.sm` (13) (L288-290).
  - bulletChipText: `fontSize.xs` (11) (L294).
  - footer: `fontSize.xs` (11) italic (L296).
- Touch targets: Only one interactive element — the BackHeader back chevron, with
  `hitSlop` {12,12,12,12} on a 24px icon → effective ~48px (BackHeader.js:25,40-42).
  Meets 44px. No other tappable elements on this screen.
- Information density: Moderate-to-high (six cards of prose), but spaced with
  `spacing.lg` 16 gaps (L263) and card padding, so it reads as airy rather than
  cramped.
- Clean or cluttered: Clean. Consistent card system, generous spacing.
- Most important action prominence: There is no action — it is a reading screen.
  This is itself a weakness (no CTA to proceed).
- Small/standard/large behaviour: Single ScrollView (L22) with
  `showsVerticalScrollIndicator={false}`. All text uses theme tokens with
  hardcoded `lineHeight` values (e.g. body lineHeight 21 at L273) that do NOT scale
  with the larger-text fontSize swap, so at the in-app Larger Text setting the
  font grows but line height stays fixed — risk of crowding on the body/role text.
  No fixed heights that clip.

---

SCREEN: Meal plan (src/screens/MealPlanScreen.js)

WHAT IT IS: A Pro screen that renders an engine-generated 7-day meal plan (abstract
Day 1..7, not calendar-anchored) with progressive disclosure: calm per-meal view
first, with deeper grams/macros and day totals on tap. The screen never computes
nutrition — it renders what the engine assembled and persists edits through the
service (file header L1-15).

WHAT IS ON IT:
- BackHeader "Meal plan" (L332).
- Loading state: centred ActivityIndicator (L333-334).
- Empty state (no plan): restaurant icon, "Your plate, sorted." title, body copy,
  "Plan my week" button (L335-344).
- Plan state (ScrollView, L346):
  - Day picker: a row of day buttons 1..7 each with a number and a dot (amber dot
    = training day) (L348-366).
  - Day header: a type chip ("Training day"/"Rest day") and the day's kcal vs
    target ("X kcal of Y") (L369-379).
  - "Training today?" PrefRow radio (Training/Rest), re-variants this day
    (L383-392).
  - Cycle note ("Training days carry more carbs; rest days fewer. Protein never
    moves.") when cycling is on (L393-397).
  - Honesty line (italic) when the day is outside tolerance (L398).
  - Meal cards per slot: slot label + kcal, meal name; expandable to show item
    rows ("X g <food>", tap to swap a food, long-press to leave out for good),
    a "P/C/F g" macro line, and a "Swap" button per plate (L401-456).
  - Day totals row: "Day" + "X kcal · P · C · F" (L459-466).
  - Preferences collapsible (options icon): four PrefRows — Meals a day (3/4/5/6),
    Variety (Repeat/Mixed/Varied), Rest-day fat (Even/Higher), Workout meals
    (Off/Pre·post) (L468-521).
  - "Log this day" primary button, "New meals" secondary button, and a foot note
    "Built from your targets…" (L523-527).
- Meal-swap BottomSheet: "Swap this meal" title + sub, a scrollable list with the
  closest match first (tagged "Closest match", highlighted) then alternatives, each
  row showing name + "X kcal · P g" (L534-574).

NAVIGATION: Route name "MealPlan" in DiaryStack (RootNavigator.js:227, inside
DiaryStack defined L217), `headerShown: false`. Reached from DiaryScreen.js:582
via `onPlanDay={() => navigation.navigate('MealPlan')}`. Back returns to Diary
(L332 `onBack={() => navigation.goBack()}`).

GATING: Pro. It lives inside DiaryStack, whose root `Diary` is
`withProGuard(DiaryScreen, 'Food diary')` (RootNavigator.js:160, :225). MealPlan
itself is registered WITHOUT its own guard (L226-230); the file header asserts it
"lives inside the gated Diary stack" (L13). So gating is by-stack, not by an
explicit guard on this screen — reaching it requires passing through the gated
Diary root.

CURRENT STRENGTHS:
- Genuine progressive disclosure: calm calories-first plates, macros and grams a
  tap deeper (header L4-13), matching a clear two-persona design intent.
- Strong accessibility labelling throughout (tablist/tab on day picker L348-359,
  radiogroup/radio on PrefRow L67-79, descriptive labels on plates L409 and items
  L431).
- Honest residual line when a constrained day cannot hit target exactly
  (L325-328, L398) — does not fake precision.
- Rich swap UX: whole-meal swap sheet with a generous alternatives pool plus
  per-food swap and "never show this again" exclusion (L192-301).
- Never computes nutrition itself — re-totals via `sumDayTotals` mirroring the
  assembler's rounding (L53-60), respecting the engine boundary.

CURRENT WEAKNESSES:
- Heavy interaction model: a plate supports tap-to-expand, tap-an-item-to-swap-food,
  long-press-to-exclude, and a separate Swap button — discoverability of the
  long-press exclusion is low (only surfaced in the a11y label, L431).
- The day picker shows abstract "1..7" with a small dot legend that is never
  explained on-screen (only in a11y labels, L359-362); the training/rest meaning
  of the dot colour is implicit.
- Two full-width buttons stacked ("Log this day", "New meals") plus a foot note at
  the bottom of a long scroll — primary action ("Log this day") is below the fold
  on a populated plan.
- Preferences regenerate the whole plan on every change (L305-318), which can feel
  heavy/destructive to a user who tweaked individual plates.

NEWBIE QUESTION: Mostly yes for the calm top layer — "Training day", a meal name,
its calories, and "Log this day" are understandable. But the abstract Day 1..7
picker (no weekday/today anchor, L42-44) and the unexplained training-dot legend
could confuse a first-timer expecting "today". The deeper grams/P·C·F line is
opt-in, so it does not overwhelm.

ATHLETE QUESTION: Yes. Per-day training/rest variant control, carb-cycling note,
rest-day fat convention, peri-workout (pre/post) meal slots, per-food same-role
macro-held swaps, and exact P/C/F totals vs target (L438-466, L500-519) give an
experienced competitor real control while keeping protein fixed.

LOCATION QUESTION: Right place. It is a child of the Diary (DiaryScreen.js:582)
inside the gated Diary stack, exactly where food/nutrition execution lives. Sits
correctly alongside the food diary and insights.

VISUAL + USABILITY:
- Font sizes (resolved):
  - BackHeader title: `fontSize.lg` (17) / semibold (BackHeader.js:59-66).
  - emptyTitle: `fontSize.xl` (20) / bold; emptyBody: `fontSize.md` (16)
    (L583-584).
  - dayLetter: `fontSize.sm` (13) / semibold (L589).
  - typeChipText: `fontSize.xs` (11) / semibold (L595).
  - dayKcal: `fontSize.lg` (17) / bold (tabular); dayKcalTarget: `fontSize.sm` (13)
    (L596-597).
  - cycleNote: `fontSize.sm` (13); honesty: `fontSize.sm` (13) italic (L598-599).
  - mealSlot: `fontSize.xs` (11) / semibold uppercase; mealKcal: `fontSize.sm` (13);
    mealName: `fontSize.md` (16) / semibold (L602-604).
  - itemLine: `fontSize.sm` (13); macroLine: `fontSize.sm` (13) (L607-608).
  - swapText: `fontSize.sm` (13) / semibold (L610).
  - totalsLabel / totalsText: `fontSize.sm` (13) (L612-613).
  - footNote: `fontSize.xs` (11) (L614).
  - prefsToggleText: `fontSize.sm` (13); prefLabel: `fontSize.xs` (11) uppercase;
    prefOptText: `fontSize.sm` (13) (L616-623).
  - swapSheetTitle: `fontSize.lg` (17) / bold; swapSheetSub: `fontSize.sm` (13)
    (L625-626).
  - swapOptionName: `fontSize.md` (16); swapOptionTag: `fontSize.xs` (11);
    swapOptionMacros: `fontSize.sm` (13) (L635-637).
- Touch targets (theme `hitSlop` = {12,12,12,12}, theme.js L423, applied widely):
  - Day buttons: paddingVertical `spacing.sm` 8, minWidth 36, + hitSlop (L357,
    L587). Visible height ~30px but hitSlop extends tappable area to ~54px. Visible
    box **below 44px**, mitigated by hitSlop.
  - PrefRow option chips: minHeight 40 + hitSlop (L621, L77). Visible **below 44px**
    (40) but hitSlop covers it.
  - Swap button (per plate): minHeight 44 + hitSlop (L609, L447). Meets 44px.
  - Item rows: minHeight 28 + hitSlop (L606, L429). Visible **below 44px** (28),
    hitSlop extends it.
  - Plate expand TouchableOpacity (L405): no explicit minHeight; wraps multi-line
    head + name, so effectively tall enough.
  - prefsToggle: minHeight 44 (L615). Meets.
  - swapOption rows: minHeight 56 (L631). Meets.
  - Empty-state "Plan my week", "Log this day", "New meals" use the shared Button
    component (L343, L523-524) — sizes **NOT DETERMINED IN CODE** (Button component
    not read).
- Information density: Low-to-moderate at the calm layer (a few plates, one line
  each); rises sharply when plates are expanded and preferences opened.
- Clean or cluttered: Clean by default thanks to the collapse-by-default design;
  can get busy once everything is expanded.
- Most important action prominence: The day's calories (dayKcal, lg 17 bold) lead
  visually at the top; "Log this day" is the primary Button but sits at the bottom
  of the scroll (L523). The most important action is not the most prominent element
  on a populated, scrolled plan.
- Small/standard/large behaviour: ScrollView for the plan body (L346) and for the
  swap sheet list (`swapList` maxHeight 360, L627). Day picker uses
  `justifyContent: 'space-between'` across 7 buttons (L586) — on a 5.4" the 7
  buttons with minWidth 36 may crowd. Fonts via tokens scale with larger-text;
  some inline lineHeights (e.g. 19) are fixed and won't scale.

---

SCREEN: Food Insights / "Insights" (src/screens/FoodInsightsScreen.js)

WHAT IT IS: A Pro screen showing 7-day food adherence: a horizontal bar chart of
daily calories vs target, a macro hit-rate summary over those seven days, and a
"Export 7 days as CSV" action (file header L1-15).

WHAT IS ON IT:
- Custom header row: a close (X) icon button, centred title "Insights", and a 24px
  spacer (L128-134).
- Section label "LAST 7 DAYS · CALORIES" (L137).
- Calories Card: seven bar rows (weekday short label, a track with an amber fill
  that turns green when within 10% of target, and the kcal value); a footnote
  showing the target and "Bars within 10% turn green", or a fallback "Set your
  calorie target in Precision Coaching…" when no target (L138-174).
- Section label "MACRO ADHERENCE" (L176).
- Macro adherence Card: four AdherenceRows (Calories, Protein, Carbs, Fat) each a
  label + progress track + "hit/total"; a footnote "Out of N days logged. Hit =
  within target range."; or an empty "Log a few days…" message (L177-193).
- "Export 7 days as CSV" button (download icon; shows ActivityIndicator while
  exporting) (L195-211).

NAVIGATION: Route name "FoodInsights" in DiaryStack (RootNavigator.js:262, inside
DiaryStack L217), `headerShown: false`. Reached from DiaryScreen.js:530 via
`navigation.navigate('FoodInsights')`. Exits via the in-screen close (X) button
which calls `navigation.goBack()` (L129).

GATING: Pro by-stack. Inside DiaryStack whose root is
`withProGuard(DiaryScreen, 'Food diary')` (RootNavigator.js:160). FoodInsights is
registered without its own guard (L261-265); reaching it requires passing through
the gated Diary root. No in-component tier check.

CURRENT STRENGTHS:
- Focused and small: three clear blocks, easy to read at a glance.
- Reloads on focus via `useFocusEffect` (L77) so data is fresh each visit.
- Good accessibility: bar rows and adherence rows expose summarising
  `accessibilityLabel`s (L150-151, L225); the bar colour change is backed by the
  ", on target" label, not colour alone.
- Honest empty states for both no-target (L169-173) and no-logged-days (L189-191).
- CSV export gives competitors/coaches a real data-out path (L100-118).
- Uses `within()` tolerance helper consistently (kcal/protein 10%, carbs/fat 15%,
  L92-95, L217-220).

CURRENT WEAKNESSES:
- The file header itself flags this is surfaced via a Diary header button because
  the intended "Insights" tab "doesn't exist yet" (L10-13) — a temporary location.
- The calorie bar "within 10% turns green" is only explained in the footnote
  (L166-168); the green/amber distinction is otherwise unlabelled visually.
- No date range control — fixed to last 7 days (L42-47); no way to view a longer
  trend.
- Only kcal bars are charted; the macro block is just hit-counts, no per-day macro
  visualisation.
- The custom header (L128-134) is hand-rolled rather than the shared BackHeader,
  and uses a close (X) icon rather than a back chevron — inconsistent with sibling
  pushed screens.

NEWBIE QUESTION: Mostly yes. Bars of calories per day with a target footnote and
"X/7 days hit" are intuitive. The one stumbling point is the "within 10% turns
green" rule, which a newbie must read the footnote to understand, and the term
"adherence" itself is mildly technical.

ATHLETE QUESTION: Partially. A competitor gets a quick 7-day adherence read and a
CSV export, which is useful. But it is shallow for an athlete: only 7 days, no
longer trend, no per-day macro detail, no weight/trend correlation — they would
likely export to CSV and analyse elsewhere.

LOCATION QUESTION: Acceptable but admitted-temporary. It is correctly inside the
Diary/nutrition stack (RootNavigator.js:262) and reached from the Diary header
(DiaryScreen.js:530), but the file states it should eventually be its own Insights
tab (L10-13). For now, reasonable; long-term it is a stopgap placement.

VISUAL + USABILITY:
- Font sizes (resolved):
  - headerTitle: `type.title` (17) / semibold (L242).
  - sectionLabel: `fontSize.xs` (11) / bold, letterSpacing 1 (L245-248).
  - cardFootnote: `type.caption` (11) (L252).
  - emptyText: `fontSize.sm` (13) (L253).
  - barDay: `fontSize.sm` (13); barValue: `fontSize.sm` (13) (L256, L264).
  - adherenceLabel / adherenceValue: `fontSize.sm` (13) (L267, L275).
  - exportBtnText: `type.bodyStrong` (16) (L285).
- Touch targets:
  - Header close (X): 24px icon with `hitSlop={12}` → effective ~48px (L129).
    Meets 44px.
  - Export button: minHeight 48 + paddingVertical `spacing.lg` 16 (L277-284).
    Meets 44px.
  - Bar rows and adherence rows are `accessible` views, not interactive (no
    onPress), so no touch-target requirement (L147-152, L225).
- Information density: Low. Three compact blocks; very scannable.
- Clean or cluttered: Clean. Generous card spacing (`spacing.lg` gaps, L243, L251).
- Most important action prominence: The calorie bars (the screen's main value)
  lead the scroll; the amber full-width "Export 7 days as CSV" button is the only
  filled action and stands out appropriately at the bottom (L277-285).
- Small/standard/large behaviour: ScrollView (L136). Bar track is `flex: 1` with
  fixed-width day label (36) and value (56) columns (L256, L264), so it reflows by
  width across screen sizes. Bar/track heights are fixed px (track 12, adherence 8,
  L257-274) and do not scale with larger text, but they are decorative bars not
  text. Fonts via tokens scale with larger-text.

---
