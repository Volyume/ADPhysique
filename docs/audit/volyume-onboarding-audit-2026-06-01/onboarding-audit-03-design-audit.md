# Onboarding Audit 03 — Design and Presentation

Status: COMPLETE (Phase 3 of 7). Fresh audit from the live code. Date: 2026-06-01.

Assesses each flow screen for design-language consistency with the rest of the
app, visual hierarchy, selection components, progress, transitions, empty/loading
states, touch targets, and visual residue, then cross-flow consistency. Look,
feel and the competitive read are folded in here and in doc 05, per the prompt.

---

## 1. The app's standard, and the journey does not follow it

All five main tabs use the shared `ScreenHeader` primitive (title left, wordmark
right): Train (HomeScreen:699), Plans (:376), Diary (:450), Progress, You. That
is the chrome a user internalises.

Not one onboarding/flow screen uses it. Every one hand-rolls its own header:
Welcome (centred wordmark), Login (centred mark), ProOnboarding (custom brand row
+ progress, :583-598), ProSetupComplete (centred check + PRO badge, :97-112),
FirstRun (bare title), ProGoalSetup (back-arrow + centred title, :281-290),
ManualBuilder (bare title), PlanLibrary (search only). The flow is a separate
visual world from the app it leads into.

## 2. The page before Home (the reveal) does not match the rest of the app

`ProSetupCompleteScreen` lists the plan, calories and macros, the user's first
sight of those numbers. It presents them in a bespoke layout: a hand-rolled kcal
hero + a three-column protein/carbs/fat row + goal/phase chips + a hand-rolled
split list (:140-238). The rest of the app shows the same data through the shared
`MacroRings` component (used on the Diary tab, DiaryScreen:485) and the plan card
on Plans. The reveal imports `MacroRings` zero times. So the first presentation of
calories, macros and plan does not match how the user will see them seconds later
on the Diary and Plans tabs. This is the sharpest in-journey inconsistency.

By contrast the returning-user reveal `GoalChangeSummaryScreen` does use the
shared `Card` primitive (:77), so the two reveals are themselves inconsistent.

## 3. Primary buttons and cards: mixed primitives

- Buttons: `ProSetupComplete` and `FirstRun` use the `Button` primitive;
  `ProOnboarding`, `ProGoalSetup`, `ManualBuilder` and `Welcome` hand-roll their
  primaries. Two consecutive Pro-flow screens (ProOnboarding then
  ProSetupComplete) use two different button implementations.
- Cards: hand-rolled across both the flow and the main tabs; the `Card` primitive
  is used by only a handful of screens (including `GoalChangeSummary`). No single
  card look binds the flow to the app.

## 4. Cross-flow consistency (the three plan-creation surfaces)
Same task, three selection metaphors: wizard dropdowns + segments
(ProOnboarding:949-1007), ProGoalSetup icon cards + goal grid (:323-560),
ManualBuilder pills + modal picker (:569-598). A returning user who built their
first plan in the wizard meets an unfamiliar layout in the builder. Shared
selection types are not visually identical across the flows, which the brief
requires.

## 5. Hierarchy, progress, transitions, states, targets
- Hierarchy: generally good; the reveal's "hit your targets" card is dense
  (kcal hero + macros + two chips + a link) but readable.
- Progress: wizard has a clear 4-segment bar; the builder has none (acceptable,
  it is single-screen).
- Transitions: tasteful (splash sequence, reveal check spring, hero-zoom into
  ActiveWorkout), all reduce-motion gated.
- Loading/empty: skeletons on Plans and Library, plain on-brand empties; no
  "coming soon" placeholders in the flow.
- Touch targets: meet size; icon taps use hitSlop.

## 6. Visual residue
- ManualBuilder cosmetic goal pills (drive nothing, :20-26).
- MesocycleBuilder unused create-block modal styles (:495-529).
- `PaywallScreen` renders `TierComparisonStrip`, a 3-tier "Pro vs Complete"
  comparison in a 2-tier app (see doc 04).

## 7. Look and feel vs the field
`docs/DESIGN_SYSTEM.md` targets a "Whoop / Linear / Stripe" precision-instrument
feel: amber on near-black, one accent, depth by tonal elevation, numbers-as-hero,
no gamification, dark-only. That is a credible, ownable position, level with the
serious end of the market (MacroFactor's non-gamified data look, Whoop's metric
authority, Oura's minimalism, per doc 05). The flow honours it at the core
(numbers-as-hero on the reveal, no gamification) but undercuts it at the edges:
the bespoke chrome, the non-standard reveal, and the off-brand "use MyFitnessPal"
line read as less premium than the design system intends.

## Design verdict
The flow is individually well made but is a separate visual system from the app.
The highest-value design change is to put the app's `ScreenHeader` frame on the
flow, route primary buttons and the reveal's calorie/macro/plan presentation
through the shared `Button` / `MacroRings` / plan-card components, and unify the
three plan-creation surfaces to one selection language, so the journey and the
reveal feel like the same product as the Train tab they lead into.
