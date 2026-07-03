# Guidance & Page-Structure Consistency Audit

**Date:** 2026-07-03
**Scope:** Every significant user-facing screen in `src/screens/` plus the shared header/empty-state components.
**Read-only audit.** No code was changed.

## What "the standard" is (already shipped in the app)

Two reference implementations set the bar:

1. **Screen-level "How it works" affordance** — a calm row using the
   `information-circle-outline` Ionicon plus a "How it works" label that opens a
   short, plain-English explanation. Reference: `src/screens/ProgressPhotosScreen.js:231-243`
   (`onHowItWorks`) and its trigger row `:332-341`. A lighter sibling exists as
   `src/components/InfoTooltip.js` (per-term glossary glyph), used well in
   `NutritionTargetsScreen`, `VolumeHeatmapScreen`, `LiftProgressScreen`,
   `ConsistencyScreen`, `MesocycleBuilderScreen`.
2. **Teaching empty state** — icon + a title that says what the feature is + a
   line on how to use it + a clear primary action button. References:
   `ProgressPhotosScreen.js:398-413`, `AnalyticsScreen.js:545-565`,
   `MesocycleBuilderScreen.js:296-306`, `MyRecipesScreen.js:190-199`.
   The anti-pattern is a bare "tap +" / one-line caption / section that silently
   vanishes when empty.

Voice constraints throughout: British English, no em dash, no cadence/streak
pressure, calm register (COACHING_VOICE_SYNTHESIS_LOCKED).

---

## PART 1 — GUIDANCE CONSISTENCY (prioritised, most-confusing first)

| # | Feature / Screen | Discoverability (entry file:line) | Help affordance? | Empty-state quality | Confusion risk | Recommendation (effort) |
|---|---|---|---|---|---|---|
| 1 | **Weekly review (free)** `CoachReviewScreen.js` | Progress tab → weekly review card; `RootNavigator` ProgressStack `:425` | **No** (no info-circle, no Methodology link anywhere in file) | **Bare** — `:470-476` "No sessions logged this week yet. Start one from the home screen…" no CTA button, no explanation of what volume-status / deload logic means | **High** — free user's first coaching surface is one prose line with zero context for the colour-coded volume system | Add teaching copy + real "Start a workout" CTA + a "How your weekly review works" info row (mirror Methodology's training section). **M** |
| 2 | **Volume heatmap** `VolumeHeatmapScreen.js` | Progress tab tile; ProgressStack `:424` / HomeStack `:369` | Partial — `InfoTooltip` in legend `:350-357`, `:367-373` (good per-band help) | **Absent** — no zero-state; a day-0 user sees an all-grey grid, trend section just omitted at `:458` with no message | **Med-high** — technical bars-and-ticks screen with no orientation for an empty account | Add a first-run teaching banner when all muscles are at 0 sets ("this fills in once you log a workout") + CTA. **M** |
| 3 | **Consistency** `ConsistencyScreen.js` | Progress tab; ProgressStack `:429` | Yes — three `InfoTooltip`s (`:72`, `:86`, `:138`) | **Absent at screen level** — sections silently hidden via `enoughForTrends` etc. (`:119-154`); new user sees only a streak strip, reads as broken | **Med-high** — most of the page vanishes with no "this appears after a few weeks" messaging | Add one teaching block (or per-section captions) shown when `enoughForTrends` is false. **M** |
| 4 | **Saved meals** `MyMealsScreen.js` | Diary → Food search modal → "My meals"; DiaryStack `:335` | **No** | **Bare** — `:191-197` "Save your go-to meals / Select foods in your diary and tap Save as meal." No action on this screen; the create gesture lives elsewhere and is undiscoverable | **Med-high** — a user who lands here first has nothing to tap and no way to learn the multi-select "Save as meal" gesture | Add a primary action (deep-link to diary with guidance) + info row on how saved meals fan-out log. **M** |
| 5 | **Body metrics** `BodyMetricsScreen.js` | Progress tab tile; ProgressStack `:426`, ProfileStack `:471` | **No** screen-level (only deep glossary tooltips `:879`, `:915`, `:938`) | Mixed — opt-in gate is teaching (`:373-388`); no-history block `:972-988` has no button inside the card (Log Weight is separate `:992-1003`) | **Med** — Progress Photos still sits here as an unexplained nav row `:822-832`; the whole physique/EWMA/recomp model has no unifying explainer | Add a "How physique tracking works" info row; fold Log Weight into the empty card; caption the Progress Photos row. **M** |
| 6 | **Block reflection** `BlockReflectionScreen.js` | Reached after finishing a mesocycle; ProfileStack `:478` | **No** | **Bare/dead-end** — `:124-129` "No data found / This block doesn't have any logged sessions yet." The "Start a new block" CTA only exists in the populated branch `:200-219` | **Med** — a block with no logged sessions dead-ends with no forward action | Duplicate the "Start a new block" CTA into the empty branch + one explanatory line. **S** |
| 7 | **Manual plan builder** `ManualBuilderScreen.js` | Plans → Build a plan; PlansStack `:399` | **No** ( `PlanBalanceCard` info-circle at `:143` is a volume-warning glyph, not help ) | N/A list-empty; page 1 is self-labelled but no overview | **Med** — supersets (select then "Group"), reorder chevrons, target steppers, and the 2-exercise superset cap are discoverable only by trial + after-the-fact toast (`:487`, `:511`) | Add a one-time inline hint / info row "tap to select, then Group for a superset". **M** |
| 8 | **Build workout** `BuildWorkoutScreen.js` | Home "Start / Build" ; HomeStack `:365` | **No** | Bare add — dashed "Add Exercise" `:336-339` with one-line subtitle `:207` | **Med** — Travel Mode (`:210-214`, `:356-392`) and rest-suggestion auto-fill are never explained | Info row on "Rest (suggested)" logic + one-liner under Travel Mode chip. **S** |
| 9 | **Cardio history** `CardioHistoryScreen.js` | Home CardioCard / Analytics CardioPlanCard; DiaryStack `:320`, ProgressStack `:438` | **No** | **Bare** — `:172-178` uses shared `EmptyState` but passes no `actionLabel`/`onAction` though the component supports it | **Med** — text but no button to start logging; user must find "Log cardio" elsewhere | Pass `actionLabel="Log cardio" onAction={navigate('LogCardio')}` to the existing EmptyState. **S** |
| 10 | **Food search** `FoodSearchScreen.js` | Diary → Add food (modal); DiaryStack `:293` | **No** | Bare per-tab — `EMPTY_COPY` `:59-63` one-liners on Recents/Favourites/Frequents, no action button (the "No matches" search state does have a CTA) | **Med** — first-timer on Recents/Frequents sees a line but no button | Add a primary action to each tab's empty copy (e.g. "Search foods"). **S** |
| 11 | **Food insights** `FoodInsightsScreen.js` | Diary → Insights; DiaryStack `:326` | **No** | Bare — `:378`, `:488`, `:518` "Log a few days to see…" no CTA; jargon ("adherence", hit-rate) unexplained | **Med** — no path to act, and Pro terms unexplained for a first-time user | Add "How insights work" info row (explain adherence/window selector) + link empty cards to the diary. **S** |
| 12 | **Coaching history** `CoachHeldHistoryScreen.js` | You tab row (free, conditional) ; ProfileStack `:477` | **No** — missing the Methodology link its sibling `CoachOutputScreen` already has for the same content | Teaching-ish `:180-187` "After your first weekly check-in, decisions and holds appear here" but no CTA | **Low-med** | Reuse CoachOutput's "See how Precision Coaching decides" → Methodology link; add a check-in CTA. **S** |
| 13 | **Per-day targets** `PerDayTargetsScreen.js` | You → Nutrition targets → per-day; ProfileStack `:469` | **No** | N/A (always-populated 7 rows); dense always-visible intro `:95-107` mentions "safety floor"/"weekly average" | **Low-med** — wall-of-text intro reads technical | Compress intro to one line + info-circle "How it works" for the fuller detail. **S** |
| 14 | **Workout history** `WorkoutHistoryScreen.js` | Home/Progress "Full history"; multiple stacks `:368`,`:422` | **No** | Teaching-but-no-CTA — `:672-678` "Your sessions will appear here / saved automatically when you finish." | **Low-med** — no path forward from empty | Add "Start a workout" CTA (match Analytics' empty state). **S** |
| 15 | **Lift progress** `LiftProgressScreen.js` | Progress tab; ProgressStack `:428` | Yes — `InfoTooltip` `:225`, `:371` | Teaching-but-no-CTA — `:394-409` "Your lifts start here…" no button | **Low-med** | Add a primary CTA to the empty state. **S** |
| 16 | **Diary** `DiaryScreen.js` | Diary tab root; DiaryStack `:287` | **No** (most-visited food surface, zero explainer) | Teaching — `EmptyDiary` component with multiple CTAs (build plan / add food / copy yesterday) | **Low** | Add a quiet "How it works" info row near the header (meal slots, rollover, day-type chip). **S** |
| 17 | **Plans (secondary states)** `PlansScreen.js` | Plans tab root | **No** | Main no-plan state teaching `:748-776`; but Pro-no-plan row `:778-783` and folder-empty `:845` are near-bare; "Training blocks" `:970-983` unexplained before tap | **Low-med** | Info-circle beside "Training blocks" (reuse MesocycleBuilder's copy); give secondary states the icon-title-body-CTA shape. **S** |
| 18 | **Weekly check-in** `WeeklyCheckInScreen.js` | You tab row / Home card; ProfileStack `:473` | **No** explicit "how it works" (main coaching data-entry surface) | **Exemplary gates** — `wrong_day` `:1235`, `too_soon` `:1304`, `need_weights` `:1331` (with CTA), `load_error` `:1375` all teach + act | **Low** | Add a small "How check-ins work" link → Methodology cooldown/holds sections. **S** |
| 19 | **Precision Coaching** `CoachOutputScreen.js` | You tab row (Pro); ProfileStack `:474` | Yes (conditional) — "Understand how this decision was made" → Methodology `:2372`, `:2413`; static info notes `:486`,`:508` | Teaching — `InsufficientDataView` `:895-935` (baseline receipt + unlock date), `LoadErrorView` `:940-961` | **Low** | Optional: make the Methodology link unconditional (header icon) rather than content-gated. **S** |
| 20 | **Partner / training partner** `PartnerScreen.js` | You tab row `:230-236` (cross-tab to Progress/Partner); Consistency partner row | Yes — "HOW IT WORKS" block `:585-594` + 3-beat `InviteJourney` explainer `:718-801` + `PartnerPrivacyReceipt` | Teaching — "Train with a partner" `:579`, pitch, how-it-works, primary "Invite someone" `:598` + "I have a code" `:607` | **Low** — most-explained feature in the app | Not an offender. Optional: persistent info-circle in the active `PairCard` header for re-reading once paired. **S** |
| 21 | Nutrition targets `NutritionTargetsScreen.js` | You tab row; ProfileStack `:467` | **Yes** — `InfoTooltip` `:464-477`, `:824-831` + "New to calories and macros?" → NutritionEducation `:485-500` | N/A (form) with "Set it for me" fast-path | **Low** — reference quality | None. |
| 22 | Meal plan `MealPlanScreen.js` | Diary → plan my week/day; DiaryStack `:289` | **No** | Teaching — no-plan state `:458-485` (two option cards each with description + button) | **Low** | Optional small info row on swap/regenerate. **S** |
| 23 | My recipes `MyRecipesScreen.js` | Diary (modal); DiaryStack `:329` | **No** | Teaching — `:190-199` "Build your first recipe" + primary CTA | **Low** | Optional info row (servings, import-from-web). **S** |
| 24 | Mesocycle / training blocks `MesocycleBuilderScreen.js` | Plans → Training blocks; PlansStack `:401` | **Yes** — `InfoTooltip` `:154-166`, `:258-267` | Teaching — `:296-306` | **Low** — model screen | None. |
| 25 | Analytics (Progress root) `AnalyticsScreen.js` | Progress tab root | Partial — volume `InfoTooltip` `:679`; the `:49` info-circle is a severity glyph, not help | Teaching — `:545-565` "Your progress starts here" + "Start a workout" CTA | **Low** | Optional tooltips on training-load hero / lifetime totals. **S** |
| 26 | Nutrition education `NutritionEducationScreen.js` | Linked from Nutrition targets `:485-500` | N/A — this **is** the explainer content | N/A | **Low** | None. |
| 27 | Methodology `MethodologyScreen.js` | You tab row / CoachOutput links; ProfileStack `:475` | N/A — this **is** the "how it works" surface | N/A | **Low** | Wire more screens to link here (CoachReview, CoachHeldHistory). |
| 28 | Cardio logging `LogCardioScreen.js` | Home/Analytics CardioCard | **No** | N/A (picker form); footnote `:225-227` on calorie accounting | **Low** | Optional info tap on why cardio isn't added to targets. **S** |
| 29 | Barcode / label scan `ScanBarcodeScreen.js`, `ScanLabelScreen.js` | Diary add-food modals | **No** | N/A camera flow; strong in-context hints (`ScanBarcode:234-236`, `ScanLabel:289`,`:385-401`) | **Low** | None. |
| 30 | Add custom food `AddCustomFoodScreen.js` | Diary add-food modal | **No** | N/A (form); contextual hints `:235-260` | **Low** | None. |
| 31 | Recipe builder `RecipeBuilderScreen.js` | Diary → recipes (modal) | **No** | Borderline — ingredients-empty `:343` text only, add link adjacent `:337-339` | **Low** | Fold "+ Add ingredient" into the empty block. **S** |
| 32 | Meal names `MealNamesScreen.js` | You → nutrition; ProfileStack `:468` | **No** | N/A (fixed rows), one-line intro `:52-55` | **Low** | None. |
| 33 | Plan detail `PlanDetailScreen.js` | Plans/Library card | **No** | Bare — `:294-296` "No workouts yet. Edit the plan to add workouts." | **Low** | Optional teaching card + "Add workouts" button. **S** |
| 34 | Plan library `PlanLibraryScreen.js` | Plans → Browse; PlansStack `:400` | **No** (help-circle quiz banner `:500` is a recommender) | Mixed — loadError good `:511`; no-results bare `:526-537` no CTA | **Low** | "Clear filters" action on no-results. **S** |
| 35 | Year of lifts / recap `YearOfLiftsScreen.js` | Analytics recaps gate | **No** (self-narrating story deck by design) | Teaching, dismiss-only — `:708-724` "Done" button, not a forward CTA | **Low** | Optional "Start a workout" CTA on the no-sessions variant. **S** |
| 36 | Snapshots `SnapshotsScreen.js` | You → Your data → Restore; ProfileStack `:464` | **No** | Teaching (no CTA needed) — `:69-73` explains the automatic-backup mechanism; footer `:87-90` | **Low** | None. |
| 37 | Home (Train root) `HomeScreen.js` | Train tab root | **No** info-circle (decorative one at `:1336`) | Teaching — first-launch card `:1597-1625` (2-step guide) + no-plan states `:1752-1812` with CTAs | **Low** | None for empty states. See Discoverability note below. |
| 38 | You (hub) `YouScreen.js` | You tab root | **No** (per-row `sub` descriptions instead) | N/A (nav hub) | **Low** | None; subtitle-per-row is adequate. |
| 39 | Pro onboarding `ProOnboardingScreen.js` | First-run Pro path | Partial — `InfoTooltip` `:1130`, `:1181` + per-field hints | N/A (wizard); required-field gates | **Low** | None. |
| 40 | Free starter `FreeStarterScreen.js` | First-run free path / no-plan card | **No** (per-step sub-copy) | N/A (quiz); fallback has CTA `:221-235` | **Low** | None. |
| 41 | Goal setup / change / lock `ProGoalSetupScreen.js`, `GoalChangeSummaryScreen.js`, `GoalLockConsentScreen.js` | You tab rows | Partial — info-circle note `ProGoalSetup:584`, `GoalLockConsent:131`; per-item reasons in GoalChangeSummary | N/A (forms/receipts) | **Low** | Optional Methodology links. **S** |
| 42 | Plan update `PlanUpdateScreen.js`, Coaching reminders `CoachingRemindersScreen.js`, Wellbeing check `WellbeingCheckScreen.js`, Share card `ShareCardScreen.js` | You / coach flows | No discrete info-circle, but strong inline rationale (`PlanUpdate` diff preview `:330-369`; per-field helper blocks; Share `privacyNote` `:476-480`) | N/A | **Low** | None required. |

### Discoverability note
- **Progress Photos** is now a top-level Progress tile (`AnalyticsScreen.js:627-631`,
  whose own comment records it was previously "buried in Body Metrics and
  effectively undiscoverable"). The old buried entry in `BodyMetricsScreen.js:822-832`
  still exists with no explanation — leave the tile, caption the buried row.
- **Partner** lives under the **Progress** tab but is entered from the **You** tab
  row (`YouScreen.js:230-236`) via a cross-tab jump. Functional, but the tab it
  belongs to is not obvious.
- The **Train (Home)** tab exposes no entry points to Partner / Progress Photos /
  Body Metrics (those live on Progress/You) — consistent with a training-focused
  home, flagged for judgement, not a defect.

---

## PART 2 — PAGE-STRUCTURE CONSISTENCY

The founder flagged that Partners and Progress Photos look different from each
other and from the rest of the app. The root cause is that pushed screens do not
share one scaffold.

### The canonical scaffolds (what a screen SHOULD use)

There are three legitimate scaffolds; every screen should match the one for its
role:

1. **Tab root** — `SafeAreaView edges={['top']}` + `ScreenHeader`
   (`src/components/ScreenHeader.js`, title + wordmark). Consistent across Home,
   Plans, Diary, Progress (Analytics), You. No action needed.
2. **Pushed screen (canonical)** — `SafeAreaView edges={['top','bottom']}` +
   `BackHeader` (`src/components/BackHeader.js`: chevron + centred title +
   hairline, with an optional `right` slot) + a content container padded to
   `spacing.lg`. **Partners already matches this** (`PartnerScreen.js:539-540`,
   `edges top+bottom` + `BackHeader`). This is the target.
3. **Modal-presented screen** — currently every food/logging modal hand-rolls a
   `close`-icon header (`View style={styles.header}` + `Ionicons name="close"`).
   These are internally consistent with each other but use no shared component.
   Recommend extracting a `ModalHeader` (close + title + optional right action)
   so the pattern is one definition, exactly as `BackHeader` did for pushed
   screens (its own doc-comment: "Extracted to kill ~16 hand-rolled copies").

A screen presented with `headerShown: false` MUST supply its own header
(BackHeader or ModalHeader). Screens presented with a native React Navigation
header (`options: { title }`) should use `edges={['bottom']}` only (the native
header owns the top inset) and must NOT also render an in-screen title/back.

### Deviations table

| Screen | Present header | Safe-area edges | Deviation | Fix |
|---|---|---|---|---|
| **`ProgressPhotosScreen.js`** | **Bespoke inline** header + add button `:309-323` | `['top']` `:308` (missing bottom) | Founder-flagged. Hand-rolled header instead of BackHeader; content can collide with the home indicator | Replace with `BackHeader title="Progress photos" right={<add button>}`; set `edges={['top','bottom']}`. BackHeader's `right` prop is built for exactly this. Matches Partners. **S** |
| `WeeklyCheckInScreen.js` | Bespoke chevron-back per gate (`:1243`, `:1276`, `:1411`) | `['top','bottom']` (ok) | Hand-rolled header duplicated across gate states instead of BackHeader | Swap each gate's hand-rolled header for `BackHeader title="Weekly check-in"`. **S** |
| `CardioHistoryScreen.js` | Bespoke chevron-back `:163-167` | `['top']` (missing bottom) | Hand-rolled header + missing bottom edge | BackHeader + `edges top+bottom`. **S** |
| `GoalChangeSummaryScreen.js` | Bespoke header `:193-195` | `['top','bottom']` (ok) | Hand-rolled header (receipt style) | Consider BackHeader for title consistency; low priority. **S** |
| `CoachHeldHistoryScreen.js` | BackHeader `:153` (ok) | `['top','left','right']` (missing bottom) | Correct header, wrong edge set | Add `'bottom'` to edges. **S** |
| `BlockReflectionScreen.js` | BackHeader `:100` (ok) | `['top','left','right']` (missing bottom) | Correct header, wrong edge set | Add `'bottom'`. **S** |
| `CoachReviewScreen.js` | **Native header** (title 'Weekly Review', RootNav `:425`) **and** in-screen title block `:437-466` | `['top','left','right']` | Double header risk + top double-inset under the native header; missing bottom | Pick one: set `headerShown:false` + BackHeader, or drop the in-screen title and use `edges bottom`. Verify on device. **M** |
| `CoachOutputScreen.js` | **Native header** (title 'Precision Coaching™', RootNav `:474`) **and** in-screen chevron-back in loading/error states `:1873` | `['top','left','right']` (`:1883`,`:2143`) | Same double-header + top double-inset risk; missing bottom | Reconcile with the native header; add bottom edge. Verify on device. **M** |
| `MealPlanScreen.js` | BackHeader `:455` (ok) | `['top']` (missing bottom) | Missing bottom edge | Add `'bottom'`. **S** |
| `MyMealsScreen.js` | BackHeader `:183` (ok) | `['top']` (missing bottom) | Missing bottom edge (modal) | Add `'bottom'`. **S** |
| `MyRecipesScreen.js` | BackHeader `:175` (ok) | `['top']` (missing bottom) | Missing bottom edge (modal) | Add `'bottom'`. **S** |
| `CreditsScreen.js` | BackHeader `:33` (ok) | `['top']` (missing bottom) | Missing bottom edge | Add `'bottom'`. **S** |
| `PrivacyPolicyScreen.js` | BackHeader `:11` (ok) | none (defaults to all) | Uses default all-edges instead of explicit set | Set explicit `edges={['top','bottom']}`. **S** |
| `FoodInsightsScreen.js` | Bespoke `close` header `:281-285` | `['top']` | Modal-style close header, no shared component; bottom | Adopt shared `ModalHeader`; confirm bottom inset. **S** (after ModalHeader) |
| `LogCardioScreen.js` | Bespoke `close` header `:153-157` | `['top']` | Same modal pattern, no shared component | `ModalHeader`. **S** |
| `AddCustomFoodScreen.js` | Bespoke `close` header `:221-230` | `['top']` | Same | `ModalHeader`. **S** |
| `RecipeBuilderScreen.js` | Bespoke `close` header `:236-240` | `['top']` | Same | `ModalHeader`. **S** |
| `FoodSearchScreen.js` | Bespoke search header | `['top']` | Same modal family | `ModalHeader` (with search slot). **S** |
| `ScanBarcodeScreen.js` / `ScanLabelScreen.js` | Bespoke (camera) | mixed `['top']` / none | Camera screens, intentionally full-bleed; loading states use default all-edges | Acceptable exception; make edges explicit for consistency. **S** |
| `YearOfLiftsScreen.js` / `WorkoutSummaryScreen.js` | Bespoke (immersive story) | `['top','left','right','bottom']` / `['top','left','right']` | Intentionally immersive full-bleed | Acceptable exception; document as immersive. — |
| Onboarding: `WelcomeScreen.js`, `FirstRunScreen.js`, `FreeStarterScreen.js`, `ProOnboardingScreen.js`, `ProSetupCompleteScreen.js`, `CascadeGateScreen.js`, `ProUpgradeScreen.js` | Bespoke / none | mostly default all-edges | Full-screen flows; default-all is tolerable but inconsistent with the explicit-edges convention | Make edges explicit (`['top','bottom']`) for consistency. **S each** |

**Conforming pushed screens** (native header + `edges bottom` only, no change
needed): `NutritionTargetsScreen`, `BodyMetricsScreen`, `WorkoutHistoryScreen`,
`VolumeHeatmapScreen`, `LiftProgressScreen`, `ConsistencyScreen`,
`MethodologyScreen`, `CoachingRemindersScreen`, `NotificationSettingsScreen`,
`PlanLibraryScreen`, `PlanDetailScreen`, `ShareCardScreen`, `MesocycleBuilderScreen`,
`ImportScreen`. **Conforming BackHeader + `top+bottom`:** `PartnerScreen`,
`ProGoalSetupScreen`, `PlanUpdateScreen`, `ManualBuilderScreen`,
`NutritionEducationScreen`, `SubscriptionScreen`, `SubscriptionPolicyScreen`,
`DebugLogScreen`.

### Normalisation backlog (page structure)

1. **Progress Photos → BackHeader + `edges top+bottom`** (founder-flagged; makes
   it match Partners). **S**
2. **Add missing `'bottom'` edge** to `CoachHeldHistory`, `BlockReflection`,
   `MealPlan`, `MyMeals`, `MyRecipes`, `Credits` (content can currently run under
   the home indicator). **S batch**
3. **Reconcile `CoachReview` and `CoachOutput`** native-header-plus-in-screen-header
   double structure (device-verify for double title / double top inset). **M**
4. **Migrate `WeeklyCheckIn` and `CardioHistory`** hand-rolled chevron headers to
   `BackHeader`. **S**
5. **Extract a shared `ModalHeader`** (close + title + right action) and adopt it
   across `FoodSearch`, `AddCustomFood`, `LogCardio`, `RecipeBuilder`,
   `FoodInsights` (kills 5 more hand-rolled headers). **M**
6. **Make edges explicit** on the onboarding / camera / policy screens using the
   default all-edges set. **S batch**

---

## PART 3 — Recommended consistent guidance pattern

The goal is one recognisable pattern, not a wall of tooltips. Two calibrated
affordances, used for different jobs:

**A. The screen-level "How it works" row** (the `ProgressPhotos.onHowItWorks`
pattern) — for a whole feature a new user might not understand.
- A single row directly under the header/intro: `information-circle-outline` (16px,
  `colors.primary`) + the text "How it works" (`type.bodySm`, primary,
  semibold), `hitSlop` 8, `accessibilityRole="button"`.
- Opens an `appAlert` (or a small sheet) with 3-6 short plain-English lines: what
  it is, how to use it, what stays private, and — critically — no schedule / no
  streak / "at your own pace" where relevant.
- One per screen, always visible (not gated on data existing).
- Extract this into a shared `HowItWorks` component (props: `title`, `body`, or
  an `onPress`) so every screen renders the identical row — the same move
  `BackHeader` made for headers. Today only ProgressPhotos hand-rolls it.

**B. The `InfoTooltip` glyph** (already shipped) — for a single unfamiliar term
inside an otherwise-clear screen (e.g. "EWMA", "adherence", "training block").
Muted glyph next to the term, opens a one-paragraph modal. Keep using it as-is;
do not replace per-term tooltips with full "How it works" rows.

**C. The teaching empty state** — icon + title (says what the feature is) + one
line (how to use it) + a primary action button. When the correct action lives on
another screen (saved meals, cardio history), the button should deep-link there
rather than describe a gesture. Never let a section silently vanish when empty —
show the teaching state instead (this is the Consistency / VolumeHeatmap gap).

**Voice:** British English, no em dash, calm, no shame, no cadence pressure —
reuse the register already written in `ProgressPhotosScreen.onHowItWorks:231-243`
and `MethodologyScreen`.

Result: a user meets the same "How it works" row in the same place on every
feature, the same tooltip glyph for jargon, and the same teaching empty state —
so the app reads as one system, not a templated shell.

---

## PART 4 — Ranked build backlog (fix first → later)

**Tier 1 — new users actively get stranded (do first)**
1. `CoachReviewScreen` — teaching copy + "Start a workout" CTA + how-it-works row. **M**
2. `VolumeHeatmapScreen` — first-run teaching banner for the empty grid. **M**
3. `ConsistencyScreen` — teaching block when trends data is insufficient. **M**
4. `MyMealsScreen` — primary action + explain how saved meals are created/used. **M**
5. **Progress Photos → BackHeader + `edges top+bottom`** (page-structure, founder-flagged). **S**

**Tier 2 — dead-ends and bare empties (quick wins)**
6. `CardioHistoryScreen` empty-state CTA (one-prop change). **S**
7. `BlockReflectionScreen` empty-state CTA. **S**
8. `FoodSearchScreen` per-tab empty actions. **S**
9. `FoodInsightsScreen` empty CTAs + how-it-works row. **S**
10. `CoachHeldHistoryScreen` Methodology link + check-in CTA. **S**
11. `WorkoutHistoryScreen` / `LiftProgressScreen` empty-state CTAs. **S**
12. Bottom-edge fix batch (`CoachHeldHistory`, `BlockReflection`, `MealPlan`, `MyMeals`, `MyRecipes`, `Credits`). **S**

**Tier 3 — structural consistency + polish**
13. Extract shared `HowItWorks` component; roll onto Diary, PerDayTargets,
    BuildWorkout, ManualBuilder, BodyMetrics, Plans (training blocks). **M**
14. Extract shared `ModalHeader`; adopt across the 5 food/logging modals. **M**
15. Reconcile `CoachReview` / `CoachOutput` native-vs-in-screen header. **M** (device-verify)
16. Migrate `WeeklyCheckIn` / `CardioHistory` to `BackHeader`. **S**
17. Make edges explicit on onboarding / camera / policy screens. **S batch**

**Do not touch without change:** `NutritionTargets`, `NutritionEducation`,
`Methodology`, `PartnerScreen`, `MesocycleBuilder`, `MyRecipes` empty state,
`MealPlan` empty state, `Analytics` empty state, `Snapshots`, `HomeScreen` empty
states, `ScanBarcode`/`ScanLabel`/`AddCustomFood` (already self-explanatory).

> Per CLAUDE.md workflow rule (no silent corner-cutting): every "S/M/L" here is
> an estimate only. Which items ship, and whether any are deferred, is a founder
> decision to be surfaced as a structured question before build — this audit
> does not pre-decide scope.
