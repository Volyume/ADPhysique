# Master Index — Design & Usability Audit, 2026-07-09

Synthesis only. No source code was read for the purpose of changing it, and
nothing in this document has been implemented. Every row below is traceable
to one of the eight lane files in this folder and a file:line citation
inside that lane.

## 1. Orientation

This audit covers **8 lanes** of VOLYUME's live production app: copy and
voice (01), visual consistency (02), layout and responsiveness (03), flow
and usability (04), the EAT/meal-builder domain (05), Partners (06), the
workout logger (07), and the conversion funnel (08). Each lane was produced
by reading the relevant screens in full against the app's own locked
standards (`COACHING_VOICE_SYNTHESIS_LOCKED.md`, `theme.js`,
`docs/rules/styling.md`, `docs/DESIGN_SYSTEM.md`, CLAUDE.md) and, where a
prior audit existed, re-verifying its claims against current code rather
than trusting it. Severity scale used throughout, consistently across all
eight lanes: **A** = broken/unusable on some devices or a clear regression
against a locked standard; **B** = awkward, cramped, inconsistent, or
below-competitor-par but not broken; **C** = polish.

**Raw finding counts, summed as each lane reports them (before
deduplication):** Severity A ≈ **37**, Severity B ≈ **112**, Severity C ≈
**56** — roughly 205 individual observations. Section 2 below consolidates
these into **137 distinct rows** (deduplicating, for example, the "Precision
Coaching vs The Coach" naming drift that recurs at ~40 individual sites in
lane 01, the repeated "Check your connection" miscopy that recurs in three
lane-05 screens, and the "Finish workout?" confirm-alert friction flagged
independently in both lane 04 and lane 07).

## 2. Consolidated findings table

Effort: **S** = one-liner/token swap. **M** = one screen/component. **L** =
multi-file or a new pattern. Classification: **SAFE** = mechanical fix
matching an existing codebase pattern. **JUDGEMENT** = a design/UX decision
where the approach needs a human call. **GATED** = touches an INVIOLABLE
CLAUDE.md §2 constraint (ED-safety copy/floors, billing/paywall/trial
screens, GDPR/consent screens, tier gating, onboarding, identity,
dependencies, migrations) — per the brief, paywall/consent/ED-safety/tier-
gate/onboarding copy is marked GATED even when the fix looks like a
one-liner.

### Lane 01 — Copy and voice

| ID | Sev | Title | File:line | Fix | Effort | Class |
|---|---|---|---|---|---|---|
| L01-A1 | A | Exclamation mark survives a banned pattern | ExerciseDetailScreen.js:590 | Drop the "!" | S | SAFE |
| L01-A2 | A | Decorative PB emoji in UI copy | ExerciseDetailScreen.js:768-771 | Swap to Ionicons (trophy/barbell/repeat) | S | JUDGEMENT |
| L01-NAME | A | Headline: "Precision Coaching" mass-renamed to "The Coach" with no founder decision, 6 variants coexist across ~40 sites | GoalLockConsentScreen.js:87-93 (ED-safety-adjacent instances separately GATED, see L01-A4), MethodologyScreen.js:1-136, WeeklyCheckInScreen.js:911-1421, CoachOutputScreen.js, ~29 more files (lane01 B1-B29, C6, C16, C18) | Founder picks (a) restore "Precision Coaching", (b) adopt "The Coach" + amend locked doc, or (c) hybrid per-surface | L | JUDGEMENT |
| L01-A4 | A | GoalLockConsentScreen regression of locked, ED-safety-adjacent Surface 4 copy | GoalLockConsentScreen.js:90,93 | Restore exact Surface 4 text pending naming decision | S | GATED |
| L01-A7 | A | Inferred-state personification ("your body is signalling") at 3 sites | HomeScreen.js:2232, MesocycleBuilderScreen.js:331, ConsistencyScreen.js:61 | Replace with data-referent phrasing | S | JUDGEMENT |
| L01-A8 | A | Title Case card title, session/workout mixed | HomeScreen.js:1639-1640 | "Workout in progress" | S | SAFE |
| L01-A9 | A | PaywallScreen never renders trigger-specific Surface 2 copy | PaywallScreen.js:202-205 | Build the differential template into the screen | M | GATED |
| L01-A10 | A | Hard-typed ALL CAPS section header, breaks shared component | SettingsScreen.js:194 | Route through shared SectionHeader, sentence case | S | SAFE |
| L01-A11 | A | Share-card fallback regressed to "Session Complete" | ShareCardScreen.js:194 | "Workout complete" | S | SAFE |
| L01-A13 | A | "Engine Log" visibly names the banned "Engine" term | components/EngineLog.js:92 | Rename to "Coaching log" (feature-title call) | S | JUDGEMENT |
| L01-A14 | A | ED-safety lockout tooltip says "the engine" | whyThisTemplates.js:547 | Name the actor per Surface 1 reconciliation | S | GATED |
| L01-A15 | A | ED-safety floor copy spells out banned jargon "fat-free mass" | weeklyCoach.js:306 | "lean mass" (matches weeklyCoach.js:1243 sibling) | S | GATED |
| L01-A16 | A | Inferred-state personification, "asking for a breather" | weeklyCoach.js:1087 | Data-referent phrasing | S | JUDGEMENT |
| L01-A17 | A | Motivational filler with no data referent | weeklyCoach.js:1513 | Let session count carry it | S | JUDGEMENT |
| L01-A18 | A | Em dash in lib copy (lint gate missed it) | milestones.js:54 | Replace with comma | S | SAFE |
| L01-A19 | A | Em dash x2 in onboarding plan-preview copy | onboarding/planPreview.js:79,90 | Replace with colon/full stop | S | GATED |
| L01-A21 | A | Locked Surface 2 differential-paywall copy never rewritten (8 lines) | differentialPaywall.js:49-65 | Apply the locked template + update snapshot test | M | GATED |
| L01-A22 | A | Systemic first-person "I" chatbot voice, 6 sites | progressScanAnalysis.js:874,1121,1123,1207,1209,1252 | Replace "I" with "Volyume" (file already does this elsewhere) | S | SAFE |
| L01-A23 | A | Notification drift from locked Surface 6 (weekly coach ready) | notifications/scheduler.js:1054-1057 | Reconcile to locked title/body | S | JUDGEMENT |
| L01-B30 | B | Raw "deload" where app's own plain term is "recovery week" | BlockReflectionScreen.js:58 | Swap term | S | SAFE |
| L01-B31 | B | Bare "e1RM" acronym, no gloss on this line | LiftProgressScreen.js:393 | "est. max" (established elsewhere) | S | SAFE |
| L01-B32 | B | Raw "NRV" acronym, no tooltip | food/MicronutrientPanel.js:50,55 | Add InfoTooltip matching SourceChip pattern | S | SAFE |
| L01-B33 | B | Raw "hypertrophy" not behind a tooltip | volumeInsightCopy.js:25 | "muscle growth" (sibling string already uses this) | S | SAFE |
| L01-B34 | B | Internal engineering jargon surfaced as a user reason | progressScanAnalysis.js:~1035 | "didn't pass the quality check" | S | SAFE |
| L01-B35 | B | Raw error slugs interpolated into user toasts, 3 files | PlanUpdateScreen.js:148,156,182; ProGoalSetupScreen.js:359; ProOnboardingScreen.js:946 | Drop the parenthetical raw error, keep plain sentence (already logError'd) | S | SAFE |
| L01-B36 | B | "Blank session" vs "Blank workout" for the same action | HomeScreen.js:2066 vs 1830 | Standardise on "Blank workout" | S | SAFE |
| L01-B37 | B | "Repeat session" vs "Delete workout" on the same card | WorkoutHistoryScreen.js:180,203,223,501,510 | Standardise term | S | SAFE |
| L01-B38 | B | Empty-state wording says "sessions" twice awkwardly | WorkoutHistoryScreen.js:777-780 | Reword per suggested copy | S | SAFE |
| L01-B39 | B | Header says "Workout complete" but body reverts to "session" throughout | WorkoutSummaryScreen.js:483,919,1252,1262,1313 | "Workout" under the "Workout complete" header | S | SAFE |
| L01-B40 | B | CascadeGateScreen drift from locked Surface 5 (trial-winding-down + payment-failure copy) | CascadeGateScreen.js:69-94 | Reconcile to Surface 5 blocks | M | GATED |
| L01-B41 | B | Weekly check-in reminder notification drift from locked Surface 6 | notifications/scheduler.js:318-323 | Reconcile title/body | S | JUDGEMENT |
| L01-B42 | B | Cascade-gate notification drift from locked Surface 6, chirpy filler | notifications/scheduler.js:452-455 | Reconcile to locked body | S | GATED |
| L01-B43 | B | Two different wordings for the same hold-lifted event | weeklyCoach.js:1232 vs whyThisTemplates.js:553 | Pick one canonical sentence | S | JUDGEMENT |
| L01-B44 | B | En dash numeric-range carve-out contradicts the "banned everywhere" addendum | volumeInsightCopy.js:24 | Founder: keep carve-out (record it) or convert to "to" + extend lint | S | JUDGEMENT |
| L01-B45 | B | Progress Scan attaches valence to body-composition direction, contra recomp's no-valence rule | progressScanCopy.js:10-11; progressScanAnalysis.js:1231,1233 | Founder: adopt no-valence rule for scan copy, or record why not | S | GATED |
| L01-B46 | B | Title Case visible labels mismatch sentence-case accessibilityLabels | PlanDetailScreen.js:368-381 | Sentence-case both | S | SAFE |
| L01-C-title | C | Assorted Title-Case screen/alert titles that should be sentence case | PrivacyPolicyScreen.js:11; ProgressPhotosScreen.js:1634; PlanDetailScreen.js:97,163; NutritionTargetsScreen.js:35-40; ManualBuilderScreen.js:126,1133-1147; PlanUpdateScreen.js:226 etc. | Sentence-case, matching every sibling screen | S | SAFE |
| L01-C-filler | C | Assorted personification/motivational-filler closing lines | CoachReviewScreen.js:161,588; ConsistencyEcho.js:66; ReadinessCards.js:182; whyThisTemplates.js:414; weeklyCoach.js:1289,1291; milestones.js:84; volumeInsightCopy.js:56 | Drop or replace with data referent | S | JUDGEMENT |
| L01-C-misc | C | Misc polish: neutral headline wording, register mixing, collapsible sections, badge label | HomeScreen.js:2128,2287-2289; NutritionEducationScreen.js:122-123; NutritionTargetsScreen.js:1367; SubscriptionPolicyScreen.js:32-118; WeeklyCheckInScreen.js:850; YouScreen.js:337; drawShareCard.js:192; notifications/scheduler.js:86 | Case-by-case per lane suggestions | S | JUDGEMENT |

### Lane 02 — Visual consistency

| ID | Sev | Title | File:line | Fix | Effort | Class |
|---|---|---|---|---|---|---|
| L02-A1 | A | Card primitive defaults to 10px radius; hand-rolled cards use 16px, both on the same screens | Card.js:47; PlansScreen.js:518-1107; HomeScreen.js:2583-2962 | Founder: change Card default to 'lg', or re-decide the token and fix 155 hand-rolled sites | L | JUDGEMENT |
| L02-A2 | A | Coloured "glow" shadows on 3 screens outside the one sanctioned glow surface, each with different values | WelcomeScreen.js:214-218; ProOnboardingScreen.js:2120-2121; ProUpgradeScreen.js:581-582 | Founder: sanction as a second glow family, or collapse to shadow.* tokens | M | JUDGEMENT |
| L02-A3 | A | Two first-content-load screens still use a bare spinner, not Skeleton, against a rule set the day before this audit | PartnerScreen.js:971-979; MealPlanScreen.js:618-620 | Swap to SkeletonCard/SkeletonRow | S | SAFE |
| L02-A4 | A | Two food modals still hand-roll their own close-X header instead of the new ModalHeader (RecipeBuilder's title isn't reliably centred) | FoodSearchScreen.js:932-948; RecipeBuilderScreen.js:291-306 | Convert both to ModalHeader | M | SAFE |
| L02-A5 | A | 87 raw letterSpacing literals (40 non-zero) contradict the documented "tracking stays neutral" token table | theme.js:425-433; WeeklyCheckInScreen.js:1910; CoachOutputScreen.js:2889 etc. (49 files) | Founder: delete all non-zero literals, or add a named overline token and route every site through it | L | JUDGEMENT |
| L02-B1 | B | 155 hand-rolled colors.surface card blocks remain across 43 screens | NutritionTargetsScreen.js (12), ActiveWorkoutScreen.js (12), WorkoutSummaryScreen.js (10) | Migrate to Card primitive | L | SAFE |
| L02-B2 | B | ~840 raw touchables still bypass the Button primitive | ActiveWorkoutScreen.js (52), HomeScreen.js (32), DiaryScreen.js (31) | Migrate CTA/destructive touchables to Button | L | SAFE |
| L02-B3 | B | Off-scale borderRadius literals, 27 sites across 18 files | MyRecipesScreen.js:291 ("999"→radius.full); food/FoodRow.js:122; HomeScreen.js:2993 | Swap literals for radius.* tokens | S | SAFE |
| L02-B4 | B | Off-scale padding/margin literals, 10 sites | LiftProgressScreen.js:500; ProOnboardingScreen.js:1841; HomeScreen.js:2542 | Round to nearest spacing.* step | S | SAFE |
| L02-B5 | B | 25 independently-styled uppercase section labels across 17 screens, each a bespoke font/weight/tracking combo | CardioHistoryScreen.js:233; RecipeBuilderScreen.js:529; WeightTrendCard.js:133 | Collapse to one type.label/SectionHeader role | M | JUDGEMENT |
| L02-B6 | B | 6 screens still hand-roll their own empty state instead of EmptyState | WorkoutHistoryScreen.js; MesocycleBuilderScreen.js; FoodSearchScreen.js; YearOfLiftsScreen.js; ProgressPhotosScreen.js; ActiveWorkoutScreen.js | Adopt EmptyState | M | SAFE |
| L02-B9 | B | ScanBarcodeScreen title string wording not re-verified for convergence between camera and fallback states | ScanBarcodeScreen.js | Text-only follow-up check | S | SAFE |
| L02-B12 | B | ModalHeader is a real shared component but undocumented in styling.md/DESIGN_SYSTEM.md | docs/rules/styling.md:124-129 | Add BackHeader/ScreenHeader/ModalHeader to both docs | S | SAFE |
| L02-C1 | C | WeeklyCheckInScreen renders its own chevron-back 5 separate times instead of one shared header | WeeklyCheckInScreen.js:1298-1501 | Factor into one wizard-shell header component | M | SAFE |
| L02-C2 | C | Two "wide tracking" (letterSpacing:2) hero literals with no shared token between them | SettingsAboutScreen.js:103; PRCelebration.js:331 | Name a letterSpacing.wordmark token if intentional | S | SAFE |

### Lane 03 — Layout and responsiveness

| ID | Sev | Title | File:line | Fix | Effort | Class |
|---|---|---|---|---|---|---|
| L03-A1 | A | FoodSearchScreen's sticky plateBar has zero safe-area inset handling; button sits under the gesture bar/home indicator | FoodSearchScreen.js:932,1028,1283-1288 | `Math.max(spacing.md, insets.bottom + spacing.sm)` — same pattern as ActiveWorkoutScreen.js:2503 | S | SAFE |
| L03-B1 | B | Stale module-scope Dimensions.get frozen at import time, 6 files; functional paging bug on YearOfLiftsScreen under multi-window | BodyMetricsScreen.js:110; YearOfLiftsScreen.js:40,682,686,762; FoodInsightsScreen.js:76; ExerciseDetailScreen.js:71; ProgressSections.js:14; PRCelebration.js:16 | Migrate to useWindowDimensions(), following RestTimer.js:351's proven pattern | M | SAFE |
| L03-B2 | B | ActiveWorkoutScreen exercise-nav chips are 36dp with no hitSlop, unlike every other control in the file | ActiveWorkoutScreen.js:3333 (call sites 1976, 3265) | Add hitSlop matching the file's own pattern | S | SAFE |
| L03-B3 | B | WorkoutHistoryScreen's fixed 30dp day-circle has no maxFontSizeMultiplier cap, unlike every sibling numeral badge | WorkoutHistoryScreen.js:862-883 | Cap at 1.3x, matching ActiveWorkoutScreen.js:1993 | S | SAFE |
| L03-B4 | B | Estimated short-screen scroll case: multi-exercise + active rest timer + one cue banner likely needs a scroll on a 640dp/320-360dp device | ActiveWorkoutScreen.js:1921-2331; RestTimer.js:46 (COMPACT_HEIGHT) | Device-walk first; if confirmed, extend RestTimer's existing compact-mode logic to the set-entry card | M | JUDGEMENT |
| L03-C1 | C | ProGate's ProLocked screen has no bottom inset handling (low real-world frequency) | ProGate.js:193,377-380 | Add inset padding to the centred scroll | S | SAFE |
| L03-C2 | C | ScanLabelScreen's fixed 280×360 scan-guide box leaves only 20dp margin on a 320dp device | ScanLabelScreen.js:411 | Size as a proportion of frame width | S | JUDGEMENT |
| L03-C3 | C | ManualBuilderScreen's one reorderBtn is 42dp effective, 2dp under the 44dp bar | ManualBuilderScreen.js:1324 | Match RoutineDetailScreen.js:744's 32dp button | S | SAFE |
| L03-C4 | C | Two component-body Dimensions.get() calls don't subscribe to resize | ProgressPhotoCompare.js:449; ProgressPhotoViewer.js:156 | Migrate to useWindowDimensions() for consistency | S | SAFE |
| L03-C5 | C | 13 form screens have TextInput but no KeyboardAvoidingView (no actual break found, ScrollView already handles it) | AddCustomFoodScreen.js; BodyMetricsScreen.js; DiaryScreen.js; 10 more | Standardise for consistency, not urgency | M | SAFE |

### Lane 04 — Flow and usability

| ID | Sev | Title | File:line | Fix | Effort | Class |
|---|---|---|---|---|---|---|
| L04-1 | B | "Recent sessions" cards on the Progress hub look tappable (same Card styling as cards that do navigate) but have no onPress | AnalyticsScreen.js:965-987,603-621 | Add navigation or drop the card styling | S | SAFE |
| L04-2 | B | Swap exercise / Add exercise (the two most-used mid-session actions) are hidden behind an unlabelled header ellipsis with 6 other actions | ActiveWorkoutScreen.js:2012-2031,2838-2974 | Surface as their own visible buttons | S | JUDGEMENT |
| L04-3 | B | Blank/quick-start session hardcodes intent:null, silently skipping readiness-informed coaching with no disclosure | HomeScreen.js:1155-1165; ActiveWorkoutScreen.js:387-397 | Route through the same readiness capture (with Skip), or disclose the trade-off in-flow | S | JUDGEMENT |
| L04-4 | B | CoachOutputScreen never states outright that nothing applies until Apply is tapped, and there is no undo after Apply | CoachOutputScreen.js (AdjustmentRow :175-221) | State the rule in copy; add an undo-last-apply affordance | S–M | JUDGEMENT |
| L04-5 | B | Food-search "+" (multi-add to plate) is a small secondary glyph with no onboarding hint, unlike the long-press hint | FoodSearchScreen.js:783,1003-1008,786 | Promote to the visually primary row affordance | S | JUDGEMENT |
| L04-6 | B | ProOnboardingScreen Step 2 bundles up to 7 fields on one scroll, breaking the wizard's own "few fields per step" rule at the highest-abandon-risk moment | ProOnboardingScreen.js:632-635,1063-1289 | Split into the same per-question pattern Steps 3-4 already use | M | GATED |
| L04-7 | B | PhysiqueOptIn teaching card is dead code — unreachable under any tier combination | BodyMetricsScreen.js:498-507,744 | Fix the gating condition or remove | S | SAFE |
| L04-8 | B | Nothing on ActiveWorkoutScreen tells the user a live session can be minimised via tab-switch + mini-bar | ActiveWorkoutScreen.js; ActiveSessionMiniBar.js | Add a visible one-time hint | S | JUDGEMENT |
| L04-9 | B | SettingsData/SettingsPrivacy mix destructive rows inline instead of an isolated section, unlike SettingsAccount | SettingsDataScreen.js:219-284; SettingsPrivacyScreen.js | Match SettingsAccountScreen.js's isolated pattern | S | SAFE |
| L04-10 | C | What's New content map has one populated version (1.2.0) despite many shipped features since | components/WhatsNewSheet.js | Refresh content map; add to release checklist | S | SAFE |
| L04-11 | B | CoachOutputScreen uses zero InfoTooltips/coachGlossary despite carrying the most jargon in the app | CoachOutputScreen.js | Add InfoTooltips matching the pattern used in 26 other files | S | SAFE |
| L04-12 | B | Unconditional "Finish workout?" confirm alert on every finish (duplicate of L07-F10) | ActiveWorkoutScreen.js:1656-1668 | See L07-F10 | S | JUDGEMENT |
| L04-13 | — | SettingsPrivacy's default label is a permanently destructive-red "Delete account and withdraw consent" for the common case (near-universal consent) | SettingsPrivacyScreen.js:43-54 | Founder-awareness only; likely a deliberate Article 7(3) choice — not proposed as a bug | — | GATED |
| L04-14 | B | "Explore" grid label unchanged despite a prior audit's rename recommendation | AnalyticsScreen.js:693 | Rename per prior R6 recommendation | S | JUDGEMENT |

### Lane 05 — EAT / meal builder

| ID | Sev | Title | File:line | Fix | Effort | Class |
|---|---|---|---|---|---|---|
| L05-A1 | A | Engine-computed per-day diagnosis (unfilled slots, oversized pins, calorie/protein miss + severity) is fully built but never reaches MealPlanScreen | mealPlanAssembler.js:255-301,914,934; MealPlanScreen.js:611-614 | Read day.diagnosis.hint, fall back to the generic line only when absent | S | SAFE |
| L05-A2 | A | A genuinely unfilled meal slot renders identically to a 3%-off near-miss | mealPlanAssembler.js:910,940; MealPlanScreen.js:611-614 | Companion fix to L05-A1 | S | SAFE |
| L05-D1 | B | MealSection is wired 3 write-affordance callbacks it never uses; per-meal action hub renders only "Add food" | DiaryScreen.js:1358-1360; components/food/MealSection.js:16-28,127-139 | Founder: restore the 4-button hub, or delete the dead props/comment | S | JUDGEMENT |
| L05-D2 | C | MacroRings is information-dense for a first-time user (day-type chip, kcal ring, 4 macro bars, split footer) | DiaryScreen.js top-of-day render | Progressive disclosure for new accounts | M | JUDGEMENT |
| L05-FS1 | B | Barcode scan/quick-add/saved meals/recipes are all reachable only via a tab literally labelled "Custom" | FoodSearchScreen.js:713-723; searchTabs.js:13-18 | Relabel or restructure so actions read as their own, not sub-items of "custom food" | S–M | JUDGEMENT |
| L05-MP1 | B | Food-level swap silently substitutes the single best match; meal-level swap gets a full chooser sheet | MealPlanScreen.js:477-511; mealSwap.js:118-187 | Give food-level swap the same chooser-sheet pattern | S–M | SAFE |
| L05-SB1 | B | ScanBarcodeScreen traps a user who declines camera permission; ScanLabel offers "Type it in instead" in the same state | ScanBarcodeScreen.js:186-210; ScanLabelScreen.js:255,268 | Add the same escape hatch | S | SAFE |
| L05-SB2 | C | No manual barcode-number entry anywhere in the app | — | Add typed-EAN entry path | M | JUDGEMENT |
| L05-SL1 | C | "Skip name" on OCR label flow is effectively permanent, no global way to clear it | ScanLabelScreen.js:46-51,210-215 | Add a settings toggle to reset | S | JUDGEMENT |
| L05-ACF1 | B | Custom food serving is grams-only; schema already has an unused serving_label column | AddCustomFoodScreen.js:307-311; db.js:389,396 | Expose named/household serving units | M | JUDGEMENT |
| L05-ACF2 | B | No computed calorie/macro preview for the actual portion before saving | AddCustomFoodScreen.js:228-234 | Add a live portion-calorie preview | M | JUDGEMENT |
| L05-ACF3 | B | "Serving (g)" and "Eaten (g)" sit side by side with no explanatory text | AddCustomFoodScreen.js:307-311 | Add explanatory copy | S | SAFE |
| L05-MM1 | B | A saved meal cannot be inspected or edited, only renamed/deleted; recipes are fully editable | MyMealsScreen.js:168-197 | Let a saved meal be inspected, ideally edited, before logging | M | JUDGEMENT |
| L05-MM2 | B | "Check your connection" shown for local-SQLite read failures on 3 separate screens (same wrong copy) | MyMealsScreen.js:211-217; MyRecipesScreen.js:213-219; FoodInsightsScreen.js:347 | Fix copy once, apply to all three | S | SAFE |
| L05-MR1 | B | Recipe rows show no calories/macros, unlike MyMeals rows (listRecipes doesn't even select the columns) | MyRecipesScreen.js:154-159; db.js:826-835 | Select and render macro columns, matching MyMeals | S | SAFE |
| L05-X1 | B | "Meal" is overloaded across 3 surfaces (saved bundle / diary slot / custom food) with no disambiguation | MyMealsScreen.js; MealNamesScreen.js; AddCustomFoodScreen.js | Terminology/IA decision | M | JUDGEMENT |
| L05-NT1 | B | goal/proteinApproach aren't cloud-schema columns; "Why these targets" silently degrades on a new device | NutritionTargetsScreen.js:276-293 | Additive, idempotent migration to persist both fields | M | GATED |
| L05-NT2 | C | Results view stacks ~11 blocks in one scroll for a screen whose job is "tell me one number" | NutritionTargetsScreen.js | Progressive disclosure restructure | M | JUDGEMENT |
| L05-PDT1 | B | Per-day offsets and meals-per-day preference are device-local only, never synced; lost on reinstall | perDayTargets.js; NutritionTargetsScreen.js:231,237 | New sync-registry table entry | M | GATED |
| L05-PDT2 | C | Stepper shows no numeric value between +/- buttons | PerDayTargetsScreen.js:145 | Render the running value in the control | S | SAFE |
| L05-FI1 | B | FoodInsightsScreen (a genuinely strong screen) is 2 taps behind an unlabelled icon with no persistent tab; its own comment calls this a stopgap | FoodInsightsScreen.js:13-15; DiaryScreen.js:1070-1073,1659-1673 | Founder: add a persistent entry point (nav-architecture decision) | M | JUDGEMENT |
| L05-FI3 | C | Two cards plot the same calorie-trend series with no second insight | FoodInsightsScreen.js:381-459 | Consolidate to one chart | S | JUDGEMENT |
| L05-FI4 | C | "THIS WEEK" headline stays fixed at a 7-day comparison regardless of the selected window | FoodInsightsScreen.js:256-273 | Re-scope to selected window | S | SAFE |
| L05-FI5 | C | Fibre adherence aim is a flat 30g for every user regardless of body size/calories | FoodInsightsScreen.js:72 | Low-priority; per-user target would need engine work | M | JUDGEMENT |
| L05-cross | B | Target-setting is named differently on 3 screens; FoodInsights' "Set your calorie target in Coach" hint has no matching destination | FoodInsightsScreen.js:414,456; PerDayTargetsScreen.js:110 | Fix the dead-end deep link/label | S | SAFE |
| L05-MN1 | — | MicronutrientPanel (MN-1) is fully shipped and Pro-gated despite CLAUDE.md's STATUS line still listing it as decision-gated | MicronutrientPanel.js:1-18; DiaryScreen.js:1237-1245 | Founder: confirm MN-1 was in fact decided and update the STATUS line | — | GATED |

### Lane 06 — Partners

| ID | Sev | Title | File:line | Fix | Effort | Class |
|---|---|---|---|---|---|---|
| L06-F1 | — | ST-1 (load-failure-as-empty-pitch) is fixed in code, but two prior-audit docs still list it as open/deferred | usePartners.js:39-459; PartnerScreen.js:983-998 | Update the stale docs so it isn't re-diagnosed | S | SAFE |
| L06-F2 | B | Empty state shows an abbreviated privacy summary, not the full PartnerPrivacyReceipt the spec calls the pre-pairing "hero moment" | PartnerScreen.js:1141-1157 | Render the full receipt pre-pairing (consent-notice surface — version bump needed) | M | GATED |
| L06-F3 | B | v2 receipt copy quietly dropped the explicit "everything shared is deleted" footer line | PartnerPrivacyReceipt.js:80-82; consent.js:29-31 | Founder: confirm intentional; restoring needs a notice-version bump | S | GATED |
| L06-F4 | B | Post-workout beat/cheer/moment only ever addresses the single "primary" pair; Pro users with 2-3 partners can't act on others there | WorkoutSummaryScreen.js:247-264 | Surface whichever pair has an available moment, or add a pair-picker | M | SAFE |
| L06-F5 | A (hygiene) | PartnerRow.js is dead code with a stale "this is live on ConsistencyScreen" docstring; founder decision open since 2026-07-04 | components/PartnerRow.js | Founder: delete / re-home / keep as documented latent asset | S | JUDGEMENT |
| L06-F6 | C | Partners loading state still a bare ActivityIndicator, not Skeleton | PartnerScreen.js:972-981 | Skeleton-ify per the already-planned ST-7 sweep | S | SAFE |
| L06-F7 | C | "Invite another partner" renders as a bordered Button; spec calls for a quiet text-row, not a filled button | PartnerScreen.js:1042-1052 | Match spec's low-emphasis treatment | S | SAFE |
| L06-F8 | C | Paywall-preserved-invite auto-redeem fails silently, no toast either way | usePartners.js:364-399 | Add a visible outcome toast | S | SAFE |

### Lane 07 — Workout logger

| ID | Sev | Title | File:line | Fix | Effort | Class |
|---|---|---|---|---|---|---|
| L07-F1 | B | RIR/RPE per-set entry is hidden from the user | SetEntry.js:381-384; ActiveWorkoutScreen.js:53,1135,1152 | Founder decision required — touches the deterministic-coaching boundary | M | GATED |
| L07-F2 | B | PR detection/celebration doesn't re-run after an in-session set edit/delete | ActiveWorkoutScreen.js:1346-1347,1362-1455 | Re-run existing PR-detection logic on edit/delete | M | SAFE |
| L07-F3 | C | No per-exercise persistent note across sessions, only a session-scoped "next time" note | WorkoutSummaryScreen.js:644-650; ActiveWorkoutScreen.js:21 | New durable per-exercise notebook (additive migration) | M | JUDGEMENT |
| L07-F4 | C | No "Add exercise" action on the rest-timer lock-screen notification (Hevy has one) | categories.js:61-80; listeners.js | Add a fifth action, mirroring existing wiring | S | SAFE |
| L07-F5 | C | iOS rest timer has no live chronometer/Live Activity while backgrounded (Android-only native module) | modules/rest-timer-live/index.ts:47-49 | Already CLAUDE.md-gated item 14; do not start without a founder decision | L | GATED |
| L07-F6 | C | No fuzzy/typo-tolerant search in the exercise picker | ExercisePickerModal.js:61-68 | Add fuzzy matching | S–M | JUDGEMENT |
| L07-F7 | B | No "recents" row in the exercise picker | ExercisePickerModal.js | Add most-recently-used row above filter chips | S | SAFE |
| L07-F8 | B | Custom-exercise creation has no secondary-muscle multi-select or exercise-type axis; always defaults to weight_reps | ExercisePickerModal.js:70-176; database.js:2018 | Extend the create form to match the schema seeded exercises already use | M | JUDGEMENT |
| L07-F9 | B | No in-session drag-reorder of exercises | ActiveWorkoutScreen.js (nav-strip jump only) | Founder sign-off needed on a new dependency (react-native-draggable-flatlist or hand-rolled reanimated) | M–L | GATED |
| L07-F10 | B | Unconditional "Finish workout?" confirm alert on every finish, unchanged since the prior audit (duplicate of L04-12) | ActiveWorkoutScreen.js:1656-1671 | Condition on set count, or downgrade to long-press | S | JUDGEMENT |
| L07-F11 | B | No text search across workout history, only date filter/calendar | WorkoutHistoryScreen.js | Add exercise/workout-name search | M | JUDGEMENT |

### Lane 08 — Conversion funnel

| ID | Sev | Title | File:line | Fix | Effort | Class |
|---|---|---|---|---|---|---|
| L08-A1 | A | Differential badge body says "7 days," CTA button says "14 days," on the same card | differentialPaywall.js:48-53; components/DifferentialBadge.js:57-59 | Make body copy match whatever paywall_cta actually resolves to | S | GATED |
| L08-A2 | A | PaywallScreen (the richest-built paywall) is unreachable from any live flow; every purchase instead goes through the less complete ProUpgradeScreen | PaywallScreen.js; RootNavigator.js:104,498; differentialPaywall.js:43 | Founder: re-wire an entry point, or formally retire and fold its proof card into ProUpgradeScreen | M | GATED |
| L08-A3 | A | Proof-before-price review block ships empty (0 curated reviews) | paywallExcerpts.js:37-41 | Founder sources ≥3 real Play reviews | S | GATED |
| L08-A4 | A | Day-14 trial-end gate uses fully generic copy identical to the never-trialled variant, despite the exact recap data already existing elsewhere in the app | CascadeGateScreen.js:72-82; coachLedger.js | Pass existing ledger recap data into the gate | M | GATED |
| L08-A5 | A | The 14-day trial starts in complete silence — no toast/banner at the consent moment that starts the clock | Article9ConsentScreen.js:122-139 | Add one honest additive toast/banner line | S | GATED |
| L08-B1 | B | PaywallScreen defaults to annual; the two live purchase surfaces default to monthly per a later founder decision that supersedes it | PaywallScreen.js:52; CascadeGateScreen.js:105; ProUpgradeScreen.js:88-92 | Fix PaywallScreen's stale default (do alongside L08-A2) | S | GATED |
| L08-B2 | B | ProUpgradeScreen (carries nearly all purchase traffic) has zero telemetry | ProUpgradeScreen.js | Add paywall_shown/paywall_tapped_cta, mirroring sibling screens | S | SAFE |
| L08-B3 | B | PostLapseSheet (peak post-cancellation attention) makes no forward pitch at all | components/PostLapseSheet.js | Add one calm, optional forward link to Subscription | S | GATED |
| L08-B4 | B | Win-back push copy never signals the win-back offer it may actually be carrying | winbackContent.js:42-71 | State the offer in the push body when one is configured | S | GATED |
| L08-B5 | B | The 14+7 day trial is worded inconsistently (never stated as "21 days total") across 4 surfaces | ProUpgradeScreen.js:404-406,48-50; SubscriptionPolicyScreen.js:99-100; PaywallScreen.js:189-192 | Align to one consistent framing | S | GATED |
| L08-B6 | B | Store review prompt never fires from a Pro coaching moment, only free-tier workout completion | storeReview.js; WorkoutSummaryScreen.js:678 | Add a Pro-moment trigger, same dedupe key | S | SAFE |
| L08-C1 | C | TierComparisonStrip's 3 rows never vary by context, even directly beneath trigger-specific copy | TierComparisonStrip.js:24-28 | Contextualise per trigger | M | GATED |
| L08-C2 | C | "Show-then-sell" live preview exists for exactly one Pro-gated feature (food diary) out of ~20 | ProGate.js:167 | Extend to 2-3 more high-traffic locks | M | JUDGEMENT |
| L08-C4 | C | No persistent trial-countdown indicator once the dismissible Home banner is dismissed | AttentionCard.js ('trial' variant) | Add passive trial-state chrome | M | JUDGEMENT |

## 3. Safe quick wins (implementable now, no founder decision)

Ordered severity desc, then effort asc. These are SAFE + severity A or B.

**Severity A, size S:** L01-A1 (exclamation mark), L01-A8 (Session in Progress
title case), L01-A10 (ALL CAPS header), L01-A11 (Session Complete
regression), L01-A18 (em dash milestones.js), L01-A22 (first-person "I"
voice), L02-A3 (bare spinner → Skeleton, 2 screens), L03-A1 (FoodSearchScreen
plateBar inset).

**Severity A, size M:** L02-A4 (FoodSearchScreen/RecipeBuilder → ModalHeader).

**Severity B, size S:** L01-B30 through B39 and B46 (jargon/terminology
sweep, 11 items), L02-B3, L02-B4, L02-B9, L02-B12, L03-B2, L03-B3, L04-1,
L04-7, L04-9, L05-A1, L05-A2, L05-ACF3, L05-MM2, L05-MR1, L05-cross,
L06-F4, L07-F2 (M), L07-F4, L07-F7, L08-B2, L08-B6.

**Severity B, size M–L (still SAFE, larger lift):** L02-B1 (155 hand-rolled
Card blocks, L), L02-B2 (~840 raw touchables, L), L02-B6 (6 screens onto
EmptyState, M), L03-B1 (6 files onto useWindowDimensions, M), L05-MP1
(food-level swap chooser, S–M).

**Severity C, size S (housekeeping, do anytime):** L01-C-title bundle,
L02-C1, L02-C2, L03-C1, L03-C3, L03-C4, L04-10, L05-FI4, L05-PDT2, L06-F1,
L06-F6, L06-F7, L06-F8, L08-B1 is GATED not SAFE — excluded.

## 4. Needs founder decision

### GATED (touches an inviolable CLAUDE.md §2 constraint)

1. **L01-A4 / A9 / A14 / A15 / A19 / A21 / B40 / B42 / B45** — ED-safety,
   consent, paywall and onboarding copy regressions/drift from locked voice
   surfaces. Decision: approve a supervised rewrite back to the exact locked
   templates (Surfaces 1, 2, 4, 5, 6, 7) or amend the locked doc. No silent
   edit either way.
2. **L01-NAME** — the "Precision Coaching" vs "The Coach" actor-naming
   regression, live in ~40 places. Decision: (a) restore "Precision
   Coaching" everywhere, (b) adopt "The Coach" and amend the locked
   `COACHING_VOICE_SYNTHESIS_LOCKED.md`, or (c) a documented per-surface
   hybrid.
3. **L01-B44** — en-dash numeric-range carve-out vs the "banned everywhere"
   addendum. Decision: keep the carve-out and record it, or convert ranges
   to "to" and extend the lint gate.
4. **L04-6** — ProOnboardingScreen Step 2 bundles 7 fields, breaking the
   wizard's own per-step rule at the highest-abandon-risk moment. Decision:
   approve splitting it into the same per-question pattern Steps 3-4 use
   (touches onboarding, gated per house rule even though no field
   enforcement changes).
5. **L04-13** — SettingsPrivacy's default label is a permanent
   destructive-red "Delete account and withdraw consent." Decision: confirm
   this is the intended Article 7(3) reading (very likely yes) — founder
   awareness only, no change proposed.
6. **L05-NT1 / PDT1** — nutrition-targets explanation fields and per-day
   offsets aren't in the cloud schema / sync registry, so they don't survive
   a device change. Decision: approve an additive migration (NT1) and a new
   sync-registry table entry (PDT1); both require the founder's manual
   EU-Dublin migration step.
7. **L05-MN1** — MicronutrientPanel (MN-1) is fully shipped despite
   CLAUDE.md's STATUS line still listing it as decision-gated. Decision:
   confirm MN-1 was in fact decided, and update the STATUS line so a future
   session doesn't treat it as un-started.
8. **L06-F2 / F3** — Partners empty state shows an abbreviated privacy
   summary, not the full consent-notice receipt, and the v2 receipt dropped
   the "everything shared is deleted" line. Decision (three options given
   in the lane): (a) full receipt pre-pairing, current v2 copy verbatim,
   (b) full receipt + restore the v1 deletion-promise line (needs a
   notice-version bump), (c) leave as is.
9. **L07-F1** — RIR/RPE per-set entry is hidden; building it touches the
   deterministic-coaching boundary. Decision: approve building an optional,
   explained per-set control, or confirm it stays hidden.
10. **L07-F5** — iOS Live Activity for the rest timer is already
    CLAUDE.md's gated item 14; do not start without the structured founder
    decision that item requires.
11. **L07-F9** — in-session drag-reorder needs a new dependency
    (`react-native-draggable-flatlist` or hand-rolled reanimated). Decision:
    approve the dependency (name/purpose/licence) or decline.
12. **L08-A1 through C1** (the full conversion-funnel GATED set: trial-length
    contradiction, PaywallScreen's unreachability, empty proof block, day-14
    gate's generic copy, silent trial start, billing-period default
    mismatch, PostLapseSheet's silent lapse moment, win-back push's
    unstated offer, inconsistent trial-length wording, static
    TierComparisonStrip) — every one of these sits on a paywall, trial-gate,
    or consent screen. Decision, presented as one connected set since
    several share a root cause (PaywallScreen being dead code): (a) revive
    PaywallScreen as the funnel's front door and fix its drift in the same
    pass, (b) retire it and apply the individual copy/telemetry fixes to
    ProUpgradeScreen/CascadeGateScreen instead, (c) something narrower —
    founder to specify.

### JUDGEMENT items where the lane itself flagged more than one option

1. **L02-A1** — Card radius: 10px (primitive default) vs 16px (hand-rolled
   convention), both live on the same screens. Options: change Card's
   default to 'lg', or re-decide the token and fix the 155 hand-rolled sites
   instead.
2. **L02-A2** — Amber glow shadows on 3 screens. Options: sanction as a
   second "Pro moment" glow family (and add it to the Materials Policy), or
   collapse all three to the flat shadow.* tokens.
3. **L02-A5** — 87 raw letterSpacing literals against an all-zero token
   table. Options: delete every non-zero literal, or add a real
   `letterSpacing.overline` token and route every uppercase-label site
   through it.
4. **L01-A13** — "Engine Log" feature title. Options: rename to "Coaching
   log," or keep and record it as a deliberate exception.
5. **L01-A2** — PB row decorative emoji. Options: replace with Ionicons
   glyphs, or record the existing eslint-disable as a deliberate exception.
6. **L05-D1** — MealSection's three dead write-affordance props. Options:
   restore the 4-button per-meal action hub the component's own comment
   describes, or delete the dead props and the comment.
7. **L06-F5** — PartnerRow.js dead code. Options given in the lane: delete,
   re-home, or keep as a documented latent asset — open since 2026-07-04
   with no decision yet.
8. **L05-FI1** — FoodInsightsScreen is a strong screen buried behind an
   unlabelled icon. Options: add a persistent Insights tab, a different
   entry point, or leave the interim stopgap in place — a
   navigation-architecture decision the lane explicitly declines to
   pre-decide.
9. **L03-B4** — the estimated short-screen scroll case in the workout
   logger. Options: device-walk first to confirm/deny, then either extend
   RestTimer's compact-mode threshold to the set-entry card, or leave as is
   if the estimate doesn't hold up on a real device.

## 5. Coverage gaps

Assessed against the founder's brief: world-class design/interface/
usability/flow/ease-of-use, self-explanatory, consistent across all mobile
phones, no AI tells even in design, best-in-class-Silicon-Valley look, and
per-component competitive parity.

| Area | Status | Note |
|---|---|---|
| Copy/voice AI-tells and consistency | **Covered** | Lane 01 is a full dedicated sweep against a locked voice doc, including AI-tell vocabulary, banned actors, and jargon. |
| Token/style consistency (colour, spacing, radius, type) | **Covered** | Lane 02 is a full dedicated sweep with before/after metrics vs two prior audits. |
| Layout/responsiveness across phone sizes, touch targets, safe areas | **Covered** | Lane 03 explicitly targets the founder's 320-360dp-to-large-phone bar. |
| Navigation flow, tap counts, information density, self-explanatory design | **Covered** | Lane 04 walks 6 full user journeys against this exact brief. |
| Empty states | **Covered, unevenly applied** | Lane 04 confirms the shared EmptyState primitive is well-designed and used in 25/82 screens; lane 02's B6 lists 6 screens still not on it. Not a gap, a known partial-adoption item already tracked. |
| Error/loading states | **Covered** | Lane 02 (Skeleton rule + 2 violations), lane 04 (loading feedback broadly present), lane 05/06 ("check your connection" miscopy, ST-1 load-failure fix) all address this directly. |
| Onboarding functional flow (tap count, field density, gating) | **Covered** | Lane 04 Journey 1 covers tap counts and Step 2 density in detail; lane 01 covers onboarding copy. |
| Onboarding first-impression / emotional "wow," brand feel | **Real gap** | No lane assesses the emotional/aesthetic quality of the first-run experience beyond functional flow and copy correctness — nobody asked "does this feel like a premium product in the first 60 seconds." |
| Per-component competitive benchmarking (Hevy/MacroFactor/MFP/Strong) | **Partially covered** | Lane 07 (workout logger vs Hevy/Strong) and lane 05 (food entry vs MFP/MacroFactor/Lose It) and lane 08 (paywall vs Whoop/MacroFactor/Gentler Streak) are genuinely thorough head-to-head comparisons. Progress/Analytics, Home, and Settings surfaces have no equivalent named-competitor comparison anywhere in the 8 lanes. |
| Visual/aesthetic design-language quality (does it look designed vs merely consistent) | **Real gap** | Lane 02 rigorously checks internal consistency (tokens, one radius, one shadow policy) but nowhere assesses whether the resulting look reads as "best-in-class Silicon Valley," which is a taste/craft judgement distinct from consistency. |
| Motion/animation quality | **Real gap** | Reduce Motion support is confirmed honoured in a few places (lane 06's Partners section, PRCelebration in lane 07), but no lane audits transition quality, easing curves, or whether motion reads as premium/deliberate versus default/absent. |
| Icon/illustration quality and distinctiveness | **Partially covered** | Lane 02 confirms icon-family consistency (Ionicons only, no mixed families, no emoji) but does not assess icon/illustration quality, custom iconography, or visual distinctiveness versus competitors — consistency was checked, craft/taste was not. |
| Theme parity (light theme) | **Real gap, not mentioned in any lane** | None of the 8 lanes reference theme-switching or colour-token behaviour under the alternate scheme. Verified hands-on 2026-07-09: the app is dark-FIRST (`theme.js` dark palette is the base; a light palette overrides it, `Appearance`-driven, `userInterfaceStyle: "automatic"` in app.json, Settings > Appearance toggle with restart). So the missing pass is LIGHT-theme parity: whether every screen, shadow/elevation cue, chart, share card and celebration surface reads correctly under the light palette. A genuine blind spot worth a dedicated pass. |
| Accessibility beyond font scaling | **Partially covered** | Lane 03 thoroughly covers touch targets, font scaling/maxFontSizeMultiplier, and safe areas. Screen-reader flow (VoiceOver/TalkBack ordering), colour contrast ratios, and reduced-transparency/switch-control support are not audited in any lane beyond spot-checks of accessibilityLabel presence in lanes 04 and 06. A dedicated accessibility pass (contrast, screen-reader traversal order, focus management) is missing. |
