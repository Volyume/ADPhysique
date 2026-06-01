# Onboarding Audit 03 — Design and Layout Consistency

Status: COMPLETE (Phase 3 of 7), rewritten 2026-06-01 after founder feedback
that the first pass assessed the design *document* rather than the actual
pages. This version compares every onboarding/flow page against the real,
shipped layout of the rest of the app, page by page.

Method: read the shared chrome primitives (`ScreenHeader`, `Card`,
`PressableCard`, `Button`), confirmed how the five main tabs use them, then
checked each flow screen against that standard. Caveat: composition and
primitive usage read from source, not a running build.

---

## 1. The app's standard page chrome (what "the rest of the site" does)

The five main tabs all share one top-of-screen pattern, the `ScreenHeader`
primitive: page title on the left, the Volyume wordmark on the right
(`ScreenHeader.js`, header comment "Unified top-of-screen header used by Train,
Plans, Progress and Athlete Hub"). Confirmed in use by:
- Train / Home: `ScreenHeader title="Train" subtitle={greeting}` (HomeScreen:699)
- Plans: `ScreenHeader title="Plans"` (PlansScreen:376)
- Diary: `ScreenHeader title="Diary"` (DiaryScreen:450)
- Progress: `ScreenHeader` (AnalyticsScreen)
- You: `ScreenHeader` (YouScreen)

So the standard a user internalises in the app is: every screen has the title +
wordmark header, then content cards below.

The Train tab specifically (the screen the flow ends on) is: `ScreenHeader` +
greeting subtitle, a `GradientCard` daily-narrative hero (HomeScreen:720), then
`PressableCard` continue/next-session cards and data cards (:1004-1021).

## 2. Onboarding does not use the app's chrome, anywhere

**Not one onboarding or flow screen uses `ScreenHeader`.** Every one hand-rolls
its own header:

| Screen | Header it uses instead | Uses ScreenHeader? |
|---|---|---|
| WelcomeScreen | centred wordmark image + tagline (:55-58) | No |
| LoginScreen | centred `VolyumeMark` + tagline (:254-257) | No |
| Article9ConsentScreen | bare `<Text>` title (:114) | No |
| ProOnboardingScreen | custom `Header`: brand row + PRO badge + progress bar + step title (:583-598) | No |
| ProSetupCompleteScreen | centred check circle + brand row + PRO badge (:97-112) | No |
| FirstRunScreen | bare `<Text>` title "Almost there." (:45) | No |
| ProGoalSetupScreen | custom back-arrow + centred title "Update your plan" (:281-290) | No |
| NutritionEducationScreen | `BackHeader` (a different shared header) (:21) | No |
| ManualBuilderScreen | bare `<Text>` "Build a Plan" (:549) | No |
| PlanLibraryScreen | `SearchBar` only, no title header (:376) | No |

This is the core consistency failure: onboarding is a self-contained visual
world that looks nothing like the app it leads into. Five different header
treatments across the flow, none of them the app standard.

## 3. The last page before Train, the sharpest discontinuity

`ProSetupCompleteScreen` (the screen the user taps "Start training" from) and
`HomeScreen` (where they land) are adjacent in time and opposite in design:

| | ProSetupComplete (reveal) | Home / Train (destination) |
|---|---|---|
| Header | Centred check circle, brand row, PRO badge, "You're all set, {name}" (:97-112) | `ScreenHeader` title "Train" + wordmark + greeting (:699) |
| Layout | Centred celebration, vertical routine-card stack (:115-267) | Left-aligned data feed, gradient hero + pressable cards (:715-1021) |
| Card style | Hand-rolled `routineCard` (radius.xl, :335) | `GradientCard`, `PressableCard`, hand-rolled data cards |
| Primary button | `Button` primitive "Start training" (:291) | n/a (cards are the actions) |
| Greeting | "You're all set, {name}" | "Good morning, {name}" |

The tap from reveal to Train is a hard cut from a bespoke, centred,
celebration layout to the standard left-aligned `ScreenHeader` app feed. There
is no shared frame carrying the user across the boundary. A first-time user's
first impression of the actual app is a screen that looks unrelated to the four
minutes of onboarding they just finished. This is exactly the
"not standard against the rest of the site" problem.

## 4. Primary buttons are inconsistent within the flow itself

The design system mandates the `Button` primitive (one press model, one
disabled/loading treatment). The flow is split:

| Screen | Primary button |
|---|---|
| ProSetupComplete | `Button` primitive (:291) |
| FirstRun | `Button` primitive (:78) |
| ProOnboarding | hand-rolled `TouchableOpacity` + `primaryBtn` style (11 hits) |
| ProGoalSetup | hand-rolled `saveBtn` (6 hits) |
| ManualBuilder | hand-rolled `activateBtn` / `primaryBtn` (8 hits) |
| WelcomeScreen | hand-rolled `proCtaRow` |

So two consecutive screens in the same Pro flow (ProOnboarding then
ProSetupComplete) use two different primary-button implementations. The press
feel, disabled state and loading spinner are reimplemented per screen rather
than inherited, which is both a consistency risk and a drift risk.

## 5. Cards: hand-rolled across the board

The design system says "Use the `Card` primitive, don't hand-roll
`backgroundColor: colors.surface` blocks." In practice the `Card` primitive is
imported by only a handful of screens (Credits, FoodInsights, GoalChangeSummary,
Subscription, WorkoutHistory). Both the onboarding flow and the main tabs
hand-roll their surface cards (PlansScreen, HomeScreen and ProOnboarding all do).
So card hand-rolling is an app-wide gap, not unique to onboarding, but it means
there is no single card look binding onboarding to the app either.

## 6. Cross-flow inconsistency between the three plan-creation surfaces

(Carried from the first pass, still valid.) The same task, choose goal /
equipment / experience, looks different in each surface:
- Wizard step 3: inline dropdowns + segmented rows (ProOnboarding:949-1007).
- ProGoalSetup: full-width icon cards + a 2-up goal grid (:323-560).
- ManualBuilder: pill rows + a modal exercise picker (:569-598).
A returning user who built their first plan in the wizard meets an unfamiliar
layout in the builder. Shared selection types are not visually identical across
the flows, which the brief explicitly requires.

## 7. Decoration and residue against the "precision instrument" rules

- ProGoalSetup puts an icon on every option card (:333, :392, :420, :484, :510),
  against the accent-discipline rule "nothing decorative that doesn't earn its
  place".
- ManualBuilder goal pills look like a selector but change nothing (:20-26).
- MesocycleBuilder carries an unused create-block modal style set (:495-529).
- HomeScreen uses a `GradientCard` for its narrative hero (:720). The design
  system bans decorative gradients except as functional data encoding, this is a
  borderline case worth confirming, and it is another way the Train tab differs
  from the flat onboarding surfaces.

---

## Design verdict

The onboarding is individually well made (good spacing, real motion taste, a
premium reveal) but it is a **separate visual system from the app it leads
into**. The single highest-value design change is to put the app's standard
`ScreenHeader` frame on the flow screens (or a deliberate, shared onboarding
frame that visibly belongs to the same product), and to route every primary
button and card through the shared primitives, so the jump from the last
onboarding page to the Train tab feels like one product rather than two. See
doc 06 for the proposed unified treatment and doc 07 for the build items
(H4/H5, plus a new item to adopt `ScreenHeader` across the flow).
