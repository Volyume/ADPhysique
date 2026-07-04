# Volyume app-consistency spec — header and scaffold enforcement

Date: 2026-07-04
Status: canonical spec for the header/scaffold consistency pass. Synthesis of a six-group, screen-by-screen read-only audit of all 78 unique screens in `src/screens/`.
Scope: this is **enforcement of an already-documented system, not a redesign**. The canonical components exist and are correct; most of the work is bringing outlier screens onto them.

British English throughout. No em dash used anywhere in this document.

---

## 0. The problem, stated plainly

The founder's complaint is that the app does not read as "one app": navigate into one screen and you get a chevron-back with a centred title; navigate into another and you get a native Android back-arrow with a left-aligned title; open a tab and you get a title plus the Volyume wordmark. The audit confirms the cause is **not** per-screen cosmetics. It is that the app is currently running **four different header regimes side by side**:

1. `ScreenHeader` (title + Volyume wordmark) — the five tab roots. Correct and consistent.
2. `BackHeader` (chevron-back + centred title + optional right action) — the documented canonical for pushed screens. 16 pushed screens already use it correctly.
3. The **React Navigation native stack header** — inherited by every screen that is registered with only `options={{ title }}` and never sets `headerShown:false`. The shared `stackOptions` (RootNavigator.js:219-229) sets `headerStyle` background `colors.surface`, `headerTintColor`, `headerTitleStyle` `fontWeight '700'` and, critically, **no `headerTitleAlign`** — so on the founder's Android device this renders a platform arrow-back with a **left-aligned** 700-weight title on a `colors.surface` bar. This is the regime that reads as "a different app". ~24 pushed screens sit here.
4. **Hand-rolled header rows** — bespoke `View`s that re-implement a header, split into two sub-families: a "close-X + left-aligned title" cluster (the food/nutrition modals) and one-off clones (BuildWorkout, CardioHistory, LogCardio, CoachReview, GoalChangeSummary).

Two structural facts make this fixable as pure enforcement, not redesign:

- `BackHeader`'s title is `fontSize.lg` / `fontWeight.semibold`, and the hand-rolled headers that use `type.title` are **already** `fontSize.lg` / `fontWeight.semibold`. So the size and weight already agree app-wide; the only real divergences are (a) native-arrow vs chevron, (b) close-X vs chevron, and (c) left-aligned vs centred title.
- The native-header screens are the single largest lever: flipping their registrations to `headerShown:false` and rendering `BackHeader` fixes the great majority of the "not one app" feeling in one mechanical pass.

---

## 1. The canonical header system

### 1.1 Tab roots use `ScreenHeader`

`src/components/ScreenHeader.js`. Title left, full Volyume wordmark right (`VolyumeMark`), optional `subtitle` and optional `right` override. The five tabs already use it and are consistent:

- HomeScreen (`ScreenHeader title="Train"` + greeting `subtitle`, HomeScreen.js:1306)
- PlansScreen (`ScreenHeader title="Plans"`, PlansScreen.js:576)
- DiaryScreen (`ScreenHeader title="Diary"`, DiaryScreen.js:965)
- AnalyticsScreen (`ScreenHeader title="Progress"`, AnalyticsScreen.js:393)
- YouScreen (`ScreenHeader title="You"`, YouScreen.js:123)

No tab needs a header change.

### 1.2 Every pushed screen uses `BackHeader`

`src/components/BackHeader.js`. Verified implementation:

- Left: `Ionicons "chevron-back"` size **24**, colour `colors.textPrimary`, `accessibilityLabel="Go back"`, `onBack` defaults to `navigation.goBack()`.
- Centre: title `flex:1`, `textAlign:'center'`, `fontSize.lg`, `fontWeight.semibold`, `numberOfLines={1}`.
- Right: optional single node; a fixed `minWidth:24` spacer renders when absent so the title stays optically centred.
- Container: `paddingHorizontal spacing.lg`, `paddingVertical spacing.md`, `borderBottomWidth 1`, `borderBottomColor colors.border`.

Scaffold that a pushed screen renders `BackHeader` into: `SafeAreaView` from `react-native-safe-area-context` with `edges` including `'top'` (so the custom header sits under the status bar), background `colors.background`. Native-header screens today use `edges={['bottom']}` because the native bar owns the top inset; converting means **adding `'top'`** (usually to `['top','bottom']`).

Multi-node right actions (e.g. FoodSearch's Quick-add + Scan) wrap in a single `View` with `gap: spacing.lg`, because `BackHeader.right` is a single-node slot.

### 1.3 Justified exceptions (kept custom) — and how they must still be made internally consistent

These are legitimately not `BackHeader`/`ScreenHeader`, but they must be internally consistent as their own small families:

- **Onboarding / auth / consent / reveal (no back, or wizard-owned back).** LoginScreen, WelcomeScreen, FirstRunScreen, QuizScreen, ProOnboardingScreen, Article9ConsentScreen, FreeStarterScreen, ProSetupCompleteScreen, PlanPreviewScreen, WeeklyCheckInScreen.
  - Article9ConsentScreen and the FirstRun/Welcome/Login entry surfaces must **never** gain a back/close affordance (GDPR Article 9 gate is compliance-locked; auth entry has no anonymous mode). This overrides visual consistency.
  - The hand-rolled back chevrons in Quiz, ProOnboarding, FreeStarter and the WeeklyCheckIn wizard have drifted to `chevron-back` **size 22 / colors.textSecondary**. Canonical is **size 24 / colors.textPrimary**. These should be aligned in a single global chevron pass (they must stay hand-rolled because each hosts wizard furniture — progress dots, step bars, brand rows — that `BackHeader` does not model), and WeeklyCheckIn's `headerTitle` should move from `fontSize.md/bold` to `fontSize.lg/semibold` to match the family.
  - ProSetupCompleteScreen deliberately reuses ProOnboarding's brand-row + progress-bar furniture so the wizard reads as one flow — this is the model of intra-flow consistency, leave it.

- **Fullscreen modals with a dismiss (close-X, not back).** CascadeGateScreen and PaywallScreen are a mutually-consistent pair (bordered row, centred `type.title`, close-X size 24 / `colors.textPrimary`) and are hereby named **the canonical "modal header" pattern**. ProUpgradeScreen is a third, divergent modal treatment (no header bar, a floating top-right X at `colors.textSecondary`, a giant centred body title) and should be brought onto the CascadeGate/Paywall pattern. One token fix on the pair: their divider uses `colors.tabBarBorder`; move it to `colors.border` to unify the divider token app-wide.

- **Fullscreen camera / story surfaces (bespoke chrome over live content).** ScanBarcodeScreen, ScanLabelScreen (camera; close-X is correct over a preview — a bottom-bordered header would be wrong), YearOfLiftsScreen (full-bleed story deck), ActiveWorkoutScreen (in-session control bar: left = destructive Cancel, centre = live timer, right = Finish; a chevron would break the session semantics). These stay custom. Tidy only: ScanBarcode's fallback states title themselves "Scan" while the live header says "Scan barcode" — pick one string.

- **`LogCardioScreen`** is a fullscreen modal (keep close-X) but must adopt the standard centred title token: bring its `type.title`-in-a-space-between-row to true centring at `fontSize.lg/semibold`, ideally via a shared modal-header primitive.

---

## 2. The full conversion table

Legend for **Action**:
- **No change** — already canonical.
- **Convert** — flip the native/hand-rolled header to `BackHeader` (screen-file edit) and, where a native header is in play, set `headerShown:false` on the registration(s) (RootNavigator edit). Add `'top'` to `SafeAreaView` edges.
- **Keep custom** — justified exception; internal-consistency nits noted in Section 3.
- **DECISION** — genuine founder fork; see Section 4.

### 2.1 Already canonical (no header change) — 21 screens

| Screen | Role | Target | Note |
|---|---|---|---|
| HomeScreen | tab | ScreenHeader | title "Train" + greeting subtitle |
| PlansScreen | tab | ScreenHeader | |
| DiaryScreen | tab | ScreenHeader | ScreenHeader is inside the ScrollView (scrolls away); confirm intent, not a cross-screen issue |
| AnalyticsScreen | tab | ScreenHeader | title "Progress" |
| YouScreen | tab | ScreenHeader | |
| SubscriptionScreen | pushed | BackHeader | reference example |
| SubscriptionPolicyScreen | pushed | BackHeader | |
| PrivacyPolicyScreen | pushed | BackHeader | reached from both onboarding and You stacks |
| ProGoalSetupScreen | pushed | BackHeader | Pro-gated |
| CreditsScreen | pushed | BackHeader | |
| PlanUpdateScreen | pushed | BackHeader | good exemplar |
| ManualBuilderScreen | pushed | BackHeader | title varies Build/Edit |
| CoachHeldHistoryScreen | pushed | BackHeader | |
| BlockReflectionScreen | pushed | BackHeader | **best in-app example of `right` slot** (play-story button) — preserve exactly |
| MealPlanScreen | pushed | BackHeader | dynamic title |
| MyMealsScreen | pushed | BackHeader | a modal that correctly uses chevron |
| MyRecipesScreen | pushed | BackHeader | reference example of `right` (add button) |
| NutritionEducationScreen | pushed | BackHeader | canonical in both Profile and onboarding stacks |
| ProgressPhotosScreen | pushed | BackHeader | `right` = write-gated add; **founder-flagged persistent privacy Card**, see 3.9 |
| DebugLogScreen | pushed | BackHeader | `right` = refresh; good family reference |
| PartnerScreen | pushed | BackHeader | the named centre example |

### 2.2 Keep custom (justified) — 18 screens

| Screen | Role | Target | Internal-consistency action |
|---|---|---|---|
| LoginScreen | onboarding-auth | keep custom | no back/close ever |
| WelcomeScreen | onboarding-auth | keep custom | add explicit `edges` prop to match siblings |
| FirstRunScreen | onboarding-auth | keep custom | title correctly uses `type.h2` |
| QuizScreen | onboarding-auth | keep custom | chevron 22/secondary -> 24/primary; section headings to `type.*` |
| ProOnboardingScreen | onboarding-auth | keep custom | chevron 22/secondary -> 24/primary; preserve back-suppression on step 1 / post-account step 2 |
| Article9ConsentScreen | onboarding-auth | keep custom | **compliance-locked: no back/close, no reorder** |
| FreeStarterScreen | onboarding-auth | keep custom | dual role (onboarding + pushed from no-plan cards); chevron 22/secondary -> 24/primary; keep progress dots |
| ProSetupCompleteScreen | onboarding-auth | keep custom | intentional final beat; leave |
| PlanPreviewScreen | onboarding-auth | keep custom | deliberate no-back pre-account reveal |
| WeeklyCheckInScreen | pushed (wizard) | keep custom | back doubles as step-back; align `headerTitle` to `fontSize.lg/semibold`; gate/return states omit the header — make the screen consistent with itself |
| CascadeGateScreen | fullscreen-modal | keep custom | **canonical modal-header**; divider `colors.tabBarBorder` -> `colors.border` |
| PaywallScreen | fullscreen-modal | keep custom | **canonical modal-header**; divider -> `colors.border` |
| ProUpgradeScreen | fullscreen-modal | keep custom | **bring onto CascadeGate/Paywall pattern**; registered in 5 stacks (lands everywhere at once); leave success-state layout |
| ActiveWorkoutScreen | fullscreen-modal | keep custom | in-session control bar; two duplicated header copies could be de-duplicated (optional) |
| YearOfLiftsScreen | fullscreen-modal | keep custom | full-bleed story deck |
| ScanBarcodeScreen | fullscreen-modal | keep custom | unify title string ("Scan" vs "Scan barcode") |
| ScanLabelScreen | fullscreen-modal | keep custom | more consistent than ScanBarcode already |
| LogCardioScreen | fullscreen-modal | keep custom | keep close-X; adopt centred `fontSize.lg/semibold` title token |

### 2.3 Convert to BackHeader (enforcement) — 34 screens

Twenty are unambiguous conversions. Fourteen are the **Settings / native-header family**, whose per-screen target is unambiguous (`BackHeader` per the documented system) but which must land as **one batch behind a single founder GO** because they share the `SettingsPage` primitive and span a contiguous region of RootNavigator — see the batch note in 2.4 and the decision surfacing in 4.3.

**Unambiguous conversions (20):**

| Screen | RootNavigator registration(s) to flip | Right action to preserve | Special note |
|---|---|---|---|
| GoalLockConsentScreen | L481 (drop `title:'Goal lock'`) | none | **Highest-impact single fix**: the only You-stack screen not on `headerShown:false`, so it draws a native "Goal lock" bar **on top of** the in-body title "A note on aggressive cuts". Convert to `BackHeader title="Goal lock"` and demote the in-body title. Verify no legacy onboarding caller relies on the native back (route accepts `onContinue`). |
| LiftProgressScreen | L428 | none | **Founder's named offender.** `BackHeader title="Lifts"`; header sits above the FlashList |
| ConsistencyScreen | L429 | none | cleanest screen in its group (already `type.label` throughout) |
| VolumeHeatmapScreen | L369 **and** L424 | none | edit **both** or the header differs by entry tab; render header in both loading and main branches |
| WorkoutHistoryScreen | L368 **and** L422 | list/calendar toggle | leave the toggle in the in-body topBar (keeps the "N sessions" count beside it) |
| ExerciseDetailScreen | L398 **and** L431 | none | use `BackHeader title={exercise.name}` (fixes the generic native "Exercise"); fall back to "Exercise" in the loading branch |
| RoutineDetailScreen | L397 | none | `BackHeader title="Edit Workout"`; verify no `headerRight` is injected via `navigation.setOptions` before removing native header |
| BuildWorkoutScreen | already `headerShown:false` (L365) | **Skip Setup** (right) | replace hand-rolled header; carry `testID "volyume-btn-skip-setup"` onto the right action. **DECISION flag**: adding the chevron introduces a back-to-launcher path that does not exist today — see 4.4 |
| PlanLibraryScreen | L400 **and** L576 **and** L603 | none | three registrations; all support `goBack`, so default `onBack` is valid |
| PlanDetailScreen | L396 **and** L577 **and** L604 | none | dynamic title: `BackHeader title={plan?.name \|\| 'Plan'}` in both skeleton and loaded returns; drop the `setOptions({title})` at L79 |
| MesocycleBuilderScreen | L401 | none | `BackHeader title="Training blocks"`; keep FlashList list-header content |
| CoachOutputScreen | L474 | none (Share is a body CTA) | add header to **all four** return states (loading, load-error, insufficient-data, main). **ED-safety blocks are OUT of scope — chrome only, do not touch the lockout/cleared/rapid-loss blocks** |
| CoachReviewScreen | L371 **and** L425 | none | **double header today** (native "Weekly Review" + in-body "Weekly review"); remove the in-file header block, `BackHeader title="Weekly review"`, relocate the date subline into content; apply to loading + load-error returns; pick one casing (free-tier twin of CoachOutput) |
| CoachingRemindersScreen | L484 | none | |
| MethodologyScreen | L475 **and** L612 | none | keep both registrations in sync |
| FoodInsightsScreen | already `headerShown:false` (L324-326) | none (current right is a spacer) | **clearest wrong-one**: a pushed, non-modal screen using a modal close-X; swap the hand-rolled header for `BackHeader title="Insights"`, keep the window-selector pill row beneath |
| BodyMetricsScreen | L426 **and** L471 | none | **founder's named offender.** `BackHeader title="Body metrics"` (sentence case); add `'top'` to edges in **all four** return branches (loading, opt-in, calm, main); wrapped in `withReadOnlyProGuard` — confirm the guard injects no chrome |
| ShareCardScreen | L370 **and** L434 **and** L476 | none | **no other back control exists** — the header must be added in the same change that removes the native one or the screen becomes a dead end |
| CardioHistoryScreen | already `headerShown:false` (L318-322, L438) | none | hand-rolled `BackHeader` clone (already chevron-back 24); replace with the real component, delete dead `styles.header/headerTitle`; reconcile with LogCardio (its modal twin) |
| WellbeingCheckScreen | L485 | none | **ED-safety adjacent (SCOFF): chrome only. Do not touch questions, scoring, or the score>=2 signposting.** |

**Settings / native-header family (14), one batch behind one GO:**

SettingsScreen (L457), SettingsAccountScreen (L458), SettingsProfileScreen (L459), SettingsCoachingScreen (L460), SettingsDisplayScreen (L461), SettingsHealthScreen (L462), SettingsDataScreen (L463), SettingsPrivacyScreen (L465), NotificationSettingsScreen (L482), ImportScreen (L483), SnapshotsScreen (L464), MealNamesScreen (L468), PerDayTargetsScreen (L469), NutritionTargetsScreen (L467).

- Cleanest execution: give the shared `SettingsPage` primitive (`SettingsPrimitives.js:53-59`) an optional `title` prop that renders `BackHeader` and switches its `SafeAreaView` edges from `['bottom']` to `['top','bottom']`; then flip each registration to `headerShown:false`. One primitive edit plus one registration flip per screen covers the whole family.
- SettingsAboutScreen is named as part of this family in the Group 6 summary but was **not individually audited** in the inputs; it must be included in the batch and confirmed against the same pattern, but it is not counted in the 14 above (no per-screen evidence was returned for it).
- **Two screens carry an extra defect on top of the header swap:** ImportScreen renders a **duplicate title** (native "Import history" + body H1 "Bring your history") — keep one `BackHeader title="Import history"` and demote or drop the body H1. NutritionTargetsScreen renders "Nutrition Targets" **twice** (native header + in-content `pageTitle`) — drop one; if converting, keep the rich in-content title+subtitle+InfoTooltip and remove the native title.
- NotificationSettingsScreen also diverges in **body chrome** (Card + custom toggleRows instead of the shared `SettingRow` pattern). Migrating the rows is a larger refactor beyond the header and is surfaced separately in 3.6 — do not silently bundle it.
- MealNames/PerDayTargets/NutritionTargets/Snapshots were each marked **needs-decision** by their auditors precisely because of this family-level question; the synthesis resolves them into this single batch with a recommended `BackHeader` target. They are surfaced here rather than left as isolated forks.

### 2.4 Build batching — worktree-isolated, disjoint by domain

The one shared hot file is **RootNavigator.js**: ~20 conversions flip a registration there, and the You/Profile-stack block (roughly L456-495) is touched by many screens across different domains. To let build agents run in isolated worktrees **without merge conflicts**, sequence as follows.

**Batch 0 — Navigator header-flip (single file, run first, main loop or one Sonnet agent).**
Do **all** `headerShown:false` flips in `RootNavigator.js` in one commit on the shared base branch: every registration listed in 2.3 (both the 20 unambiguous ones and the 14 Settings-family ones), including all multi-registration screens (VolumeHeatmap ×2, WorkoutHistory ×2, ExerciseDetail ×2, PlanLibrary ×3, PlanDetail ×3, CoachReview ×2, Methodology ×2, BodyMetrics ×2, ShareCard ×3). Drop now-cosmetic native `title` strings where the screen supplies its own. This removes RootNavigator.js as a conflict surface entirely; the fan-out batches then touch **only disjoint screen files**. (BuildWorkout, FoodInsights and CardioHistory are already `headerShown:false` and need no Batch 0 edit.)

**Batches 1-5 — screen files only, disjoint, parallelisable.**

- **Batch 1 — Train & Workout (4 files):** BuildWorkoutScreen, RoutineDetailScreen, ExerciseDetailScreen, WorkoutHistoryScreen. (BuildWorkout carries the back-affordance DECISION, 4.4.)
- **Batch 2 — Progress & Charts (6 files):** LiftProgressScreen, ConsistencyScreen, VolumeHeatmapScreen, BodyMetricsScreen, CardioHistoryScreen, ShareCardScreen. (ShareCard: header must land in the same change; BodyMetrics: all four return branches.)
- **Batch 3 — Plans & Coaching (8 files):** PlanLibraryScreen, PlanDetailScreen, MesocycleBuilderScreen, CoachOutputScreen, CoachReviewScreen, CoachingRemindersScreen, MethodologyScreen, GoalLockConsentScreen. (CoachOutput ED-safety blocks out of scope; CoachReview double-header.)
- **Batch 4 — Settings family & data pages (11 files + shared `SettingsPrimitives.js`):** SettingsScreen, SettingsAccountScreen, SettingsProfileScreen, SettingsCoachingScreen, SettingsDisplayScreen, SettingsHealthScreen, SettingsDataScreen, SettingsPrivacyScreen, NotificationSettingsScreen, ImportScreen, SnapshotsScreen (+ SettingsAboutScreen to confirm). **Gated by the founder GO in 4.3.** This batch owns `SettingsPrimitives.js` exclusively, so no other batch may touch it.
- **Batch 5 — Nutrition sub-pages & Wellbeing (5 files):** FoodInsightsScreen, MealNamesScreen, PerDayTargetsScreen, NutritionTargetsScreen, WellbeingCheckScreen. (WellbeingCheck: ED-safety adjacent, chrome only; NutritionTargets: duplicate title.)

Because Batch 0 has already done every RootNavigator flip and Batch 4 alone owns `SettingsPrimitives.js`, Batches 1-5 edit strictly disjoint file sets and can run concurrently. Each converted screen needs a short physical-Android test checklist (EAS build): back chevron returns to the correct origin; right actions (where present) still fire; the ED-safety cases for CoachOutput / CoachReview / WellbeingCheck confirming only chrome moved.

---

## 3. Secondary consistency layers (ranked follow-up)

These are real, audit-confirmed inconsistencies below the header line. Ranked by how much they contribute to the "not one app" feeling versus effort.

1. **SafeAreaView `edges` normalisation (high).** Converted native-header screens must gain `'top'`; the app currently mixes `['bottom']`, `['top']`, `['top','bottom']` and `['top','left','right']`. Several native-header screens even carry `'top'` while the native bar already insets, double-padding. Normalise: pushed screens on `BackHeader` use `['top','bottom']` (or `['top']` where a footer owns the bottom); the redundant `'top'` on WorkoutSummary and the CoachOutput/CoachReview returns goes away on conversion.

2. **Section headings to shared `type.*` roles (high).** At least four competing treatments were found: uppercase `fontWeight.black` `sectionHeader` (Settings family), `type.bodyStrong` sentence-case (SettingsDisplay), `type.label` (YouScreen, NotificationSettings, Consistency, many Coaching screens), and row-label style (SettingsProfile). Plus recurring ad-hoc uppercase labels (`fontSize.xs` + `fontWeight.bold` + literal `letterSpacing`) on GoalLockConsent, GoalChangeSummary, Quiz, AddCustomFood, FoodInsights, ShareCard, LogCardio, CardioHistory. Collapse all to one role — `type.label` is the de-facto standard already used by the clean screens. Also unify the two policy screens (SubscriptionPolicy uses `type.title` + icon; PrivacyPolicy uses `type.label`).

3. **Extract one modal-header primitive (high, but gated on the modal decision in 4.2).** CascadeGate/Paywall are the reference; ProUpgrade and GoalChangeSummary must be reconciled onto it; the food-modal close-X cluster (FoodSearch, AddCustomFood, RecipeBuilder) either adopt it or move to `BackHeader`. One component pins alignment/typography/divider so the modal-vs-push affordance becomes a single deliberate rule.

4. **Title copy casing (medium, cheap, visible).** Title Case native titles ("Body Metrics", "Workout History", "Plan Library", "Weekly Review") versus sentence-case in-app titles ("Cardio history", "Progress photos"). Standardise on **sentence case** for pushed-screen titles as each is converted.

5. **Divider token unification (medium).** `colors.tabBarBorder` (CascadeGate, Paywall) versus the standard `colors.border` (BackHeader). Move all header dividers to `colors.border`.

6. **Custom-chevron token drift (medium).** Hand-rolled onboarding/wizard chevrons at `size 22 / colors.textSecondary` versus canonical `24 / colors.textPrimary` (Quiz, ProOnboarding, FreeStarter, WeeklyCheckIn). Single global chevron pass; these screens stay hand-rolled but match the token.

7. **Body-chrome / row-primitive consolidation (medium).** NotificationSettings uses Card + custom toggleRows instead of the shared `SettingRow`; YouScreen uses a bespoke `NavRow` instead of `SettingRow`; four separate local copies of the same chip/segment control live in SettingsScreen, SettingsDisplay, SettingsCoaching and SettingsProfile. Consolidate onto shared primitives. **This is a genuinely larger refactor — surface as its own founder decision, do not fold into the header pass.**

8. **Empty-state pattern (low-medium).** Mostly consistent (icon + `type.title` heading + body + primary CTA; Analytics/BodyMetrics/shared `EmptyState`). Outliers styled ad-hoc: FreeStarter `resultTitle`, MealPlan `emptyTitle`, and a mild colour drift (BodyMetrics empty heading `colors.textSecondary` vs Analytics `colors.textPrimary`). Standardise on the shared illustration + `type.title` pattern.

9. **ProgressPhotos persistent privacy Card — founder-flagged redesign (medium).** A full-width "Private to this device..." notice Card is pinned under the header on every visit. The founder dislikes the always-on box and wants a guide / "How it works" entry point instead of a permanent notice. Header itself is correct; this is a content-layout change to surface as a small design task (copy currently branches on calm / read-only, and the card is GDPR-adjacent, so treat the copy carefully).

10. **Hard-coded tokens and copy nits (low).** Raw px font sizes (BodyMetrics DeltaBadge 10/11/14; several hero titles under `eslint-disable`), `letterSpacing 1.5` literal (ShareCard), smart quotes in ShareCard's privacy note (house style is straight quotes), `stackOptions.headerTitleStyle` hard-coding `fontWeight '700'` as a raw string, and dead styles (ShareCard `shareBtn/pdfBtn`, NotificationSettings dead handlers — mention, do not fix). Low priority; sweep opportunistically as each screen is touched.

---

## 4. Founder decisions

### 4.1 THE genuine visual design decision: centre-aligned vs left-aligned titles

Everything in Sections 2 and 3 is enforcement of the already-documented system. There is exactly **one** genuine visual fork, and it applies to the whole app:

- **Option A — keep the documented canonical: chevron-back + CENTRE-aligned title** (what `BackHeader` and `ScreenHeader` already implement).
- **Option B — switch the whole app to LEFT-aligned titles** (iOS/Material large-title idiom).

**Recommendation: Option A (keep centre).** Reasoning:
1. The system already documents and implements centre. `BackHeader` (centred, `flex:1`/`textAlign:center`) and `ScreenHeader` are live, and 21 screens are already correct against it.
2. Centre is the **smaller, safer change on a live paying app**. Converting the native-header screens lands them on centre with zero extra rework; nothing already-compliant needs re-testing.
3. Option B is a genuine, legitimate modern alternative — left-aligned large titles read as contemporary and are what iOS/Material lean toward. But choosing it means re-authoring **both** `BackHeader` and `ScreenHeader`, re-aligning the wordmark logic in `ScreenHeader`, and re-testing all 21 already-compliant screens plus the ~34 conversions. That is a redesign, not enforcement, and a larger regression surface.

If the founder wants the large-title identity, Option B is defensible — but it should be taken as a deliberate redesign with its own build plan, not bundled into this consistency pass. This is the founder's call; it is **not** pre-decided here, and the lighter option is not being presented as "the" answer beyond the reasoning above.

### 4.2 Modal affordance policy (second real fork)

The app is internally contradictory about modals: some `presentation:'modal'` screens use a close-X (FoodSearch, AddCustomFood, RecipeBuilder), others use chevron-back (MyMeals, MyRecipes — also modals). Decide one rule:
- **(a)** All non-camera modals adopt one shared **modal-header primitive** (centred `type.title`, close-X 24 / `colors.textPrimary`, `colors.border` divider) — matching CascadeGate/Paywall; or
- **(b)** Non-camera modals use **`BackHeader`** (chevron-back) like MyMeals/MyRecipes already do, reserving close-X for camera/payment fullscreen surfaces only.

This decision determines the target for **FoodSearchScreen, AddCustomFoodScreen and RecipeBuilderScreen** (the three needs-decision food modals). Their title size/weight already match `BackHeader`; only the affordance and alignment change. Right actions to preserve: FoodSearch (Quick-add flash + barcode Scan, wrap in one `View` with `gap`), RecipeBuilder (Save, with its disabled/enabled colour states and `accessibilityState`). FoodInsights is **not** part of this fork — it is a pushed non-modal and converts to `BackHeader` regardless.

### 4.3 Settings / native-header family — one batch GO

The 14 Settings-family screens (2.3) have an unambiguous canonical target (`BackHeader`), but converting ~14 shared-primitive screens at once is a scope the founder should green-light before fan-out, per the no-silent-corner-cutting rule. This is **not** a design fork (the documented system already mandates BackHeader for pushed screens, and DebugLog/Partner in the same stack already comply); it is a batch-execution GO. Recommended: proceed via the `SettingsPage` `title`-prop approach (Batch 4). The alternative — consciously keeping native headers for the whole Settings family as a deliberate exception — conflicts with the documented canonical and with the founder's own complaint, so it is not recommended.

### 4.4 BuildWorkout back-affordance (behaviour change)

BuildWorkoutScreen today has **no back button** (only "Skip Setup" and "Start Training", both `navigation.replace`). Converting to `BackHeader` adds a chevron and therefore a real back-to-launcher path that does not exist now. Converting is correct for visual consistency, but the new back path is a behaviour change and must be confirmed, not silently introduced. Keep "Skip Setup" as the `right` action and carry `testID "volyume-btn-skip-setup"`.

### 4.5 The remaining needs-decision one-offs

- **GoalChangeSummaryScreen** (post-action receipt; `navigation.replace` from ProGoalSetup, dismissed via close-X or "Got it" -> `popToTop`). Uses a third centred-title+close-X variant (`type.bodyStrong` title, close-X size 22) matching neither `BackHeader` nor the modal pair. Decide: **(a)** align to the CascadeGate/Paywall modal-header spec (it behaves like a dismissible result sheet), or **(b)** convert to `BackHeader` (it is a pushed card, not `presentation:'modal'`). Either way preserve both dismiss entry points and the `popToTop` behaviour. Recommendation leans (a) given its receipt/sheet semantics, but this is the founder's call and folds naturally into the 4.2 modal decision.
- **WorkoutSummaryScreen** (dual role: live post-session celebration vs read-only history). A back-chevron is semantically wrong in live mode (the session ended; there is nothing to go back to) and wanted in read-only mode. It also renders "Workout complete" **twice** (native header + in-body celebration header) and double-pads its top. Options: **(1)** `headerShown:false` always, keep the in-body celebration header as the title, add `BackHeader` **only** when `readOnly`; **(2)** `BackHeader` always + delete the duplicate in-body title; **(3)** native header only in `readOnly`. Whichever is chosen, remove the duplicate title and fix the redundant `'top'` edge. Edit both registrations (L367, L423) together.

---

## 5. Counts

- Pushed screens to convert to BackHeader (enforcement): **34** (20 unambiguous + 14 Settings/native-header family behind one batch GO).
- Already canonical (no header change): **21** (5 tabs + 16 pushed on BackHeader).
- Keep custom (justified exceptions): **18** (10 onboarding/auth/wizard + 8 fullscreen modal/camera/story/in-session).
- Needs a genuine founder decision: **5** (GoalChangeSummary, WorkoutSummary, FoodSearch, AddCustomFood, RecipeBuilder).

Total unique screens audited: **78**. (SettingsAboutScreen is named in the Settings family but was not individually audited; it rides Batch 4 and is not counted above.)

---

## 6. Source

Synthesised from the six per-group read-only audits (Groups 1-6) delivered 2026-07-04, each classifying every assigned screen's role, current header implementation, canonical target and deviations with file:line evidence. Canonical components verified directly against `src/components/BackHeader.js` and `src/components/ScreenHeader.js`. This spec is enforcement guidance; no screen files were edited in producing it.
