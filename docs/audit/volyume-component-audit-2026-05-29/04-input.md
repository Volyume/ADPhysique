# 04 · Input, fields, buttons, steppers, pickers, search, toggles

Phase 3 assessment of the input layer: `SetEntry` (the reference input
cluster), `PlateCalculator`, `ServingPicker`, `QuickAddSheet`,
`FoodDetailSheet`, the search bars, and, the headline findings, the
**absence of shared `Button`, `Field`, and `SearchBar` primitives**.

## Phase 2, best-in-class references

- **Field states:** best-in-class fields have distinct inactive / focused /
  filled / error / disabled states, consistent across the whole app.
- **Validation timing + focus:** validate *on blur* not on entry; on
  submit failure, move focus to the first invalid field; error text sits
  directly under the field, colour + icon (not colour alone). Volyume
  mostly validates on submit via `Alert`, which is the pattern to move
  away from.
- **A11y:** `aria-invalid` equivalent (`accessibilityState={{ invalid }}`),
  44px min touch targets, 16px min input font to stop iOS zoom, 8px min
  spacing between targets.
- **Buttons:** one button component with variants (primary/secondary/
  tertiary/destructive) + sizes + loading + disabled, used everywhere, so
  every CTA looks and behaves the same.

What separates best-in-class: inputs and buttons are *components* with a
full state matrix, validation is inline and accessible, and there is
exactly one of each.

---

## Finding I0 (systemic): no shared Button primitive

**Evidence:** No `Button`/`Btn` component in `src/components`. At least
**14 files** define their own `primaryBtn`/`button`/`btnText` style keys;
the pattern (`flexDirection row`, centre, `gap sm`, `backgroundColor
primary`, `borderRadius lg`, `paddingVertical lg`, `color background`) is
copy-pasted across PlanDetail, ProSetupComplete, Paywall, ProUpgrade, and
many more, each re-deriving size, disabled look, and loading behaviour.

**Why it matters:** Button is the most-tapped element type. Without one
component: disabled states differ (some opacity 0.5, some greyed, some
nothing), loading differs (some swap text to "Saving", some show
ActivityIndicator, some neither), press feedback differs (activeOpacity
0.7 vs 0.85 vs 0.88 vs PressableCard), and the primary CTA's height/radius
drift. This is the input-layer twin of the missing `<Card>`.

**Improvement:** Introduce `<Button variant size loading disabled icon>`
with variants primary / secondary / tertiary / destructive, built on the
PressableCard press model, with a single loading treatment (inline spinner
+ disabled) and a single disabled treatment. Migrate CTAs screen by
screen. Result: every CTA in the app behaves identically.

**Priority:** Critical.

---

## Finding I1 (systemic): no shared Field / SearchBar

**Evidence:** `TextInput` appears raw in **29 files**; **7 screens**
rebuild a search bar (icon + input + clear) by hand (FoodSearch,
ExerciseLibrary, PlanLibrary, etc.). There is no `<Field>` (label + input
+ helper/error) and no `<SearchBar>`.

**Why it matters:** No field state matrix (focus ring, error, disabled) is
shared, so focus/error styling is per-screen or absent. Search bars look
and behave slightly differently across the three browse screens. iOS-zoom
(input font < 16) and the "validate on blur, focus first error" patterns
can't be applied centrally.

**Improvement:** Add `<Field>` (label, value, onChange, helper, error,
keyboardType, suffix) and `<SearchBar>` (value, onChange, onClear,
placeholder, debounce) with one focus/error treatment, ≥16px input font,
and `accessibilityState={{ invalid }}` wiring. Migrate the 7 search bars
first (high visibility), then forms.

**Priority:** High.

---

## Component: SetEntry (reference input cluster)

**File:** `src/components/SetEntry.js`

**Current state:** Excellent, the bar the rest of the input layer should
meet. Weight/reps steppers at 52×52 (well above the 44px min), plate-calc
launcher, live e1RM readout, set-type picker, per-side (unilateral)
toggle. Full accessibilityLabel + role on every control, decimal-safe
weight entry, no hardcoded colours. (Recently corrected so unilateral is
one weight + reps-per-side, not an L/R split.)

**Best-in-class reference:** Hevy / Strong set rows, fast numeric entry,
big tap targets, inline plate math. SetEntry matches or beats these.

**Gap:** Minor. It's a bespoke component (correctly, set entry is
domain-specific), but its excellent stepper could itself be extracted as a
shared `<Stepper>` for the other numeric inputs in the app (BuildWorkout
set counts, NotificationSettings hours, RecipeBuilder servings) which
currently each build their own ± controls.

**Improvement:** Extract the stepper as `<Stepper value min max step
onChange>` and adopt it in BuildWorkout / NotificationSettings /
RecipeBuilder so numeric entry feels identical everywhere. Leave SetEntry's
domain logic intact.

**Coherence impact:** High positive, propagates the best input pattern.

**Priority:** High (extract stepper); the component itself is Low (already
strong).

---

## Component: PlateCalculator

**File:** `src/components/PlateCalculator.js`

**Current state:** Useful and clear, target/bar weight, plate breakdown,
visual bar. Plate colours are hardcoded to IEC competition standard
(l.24-32), defensible (real plates *are* those colours), but off-token.

**Best-in-class reference:** Hevy/Strong plate calculators, the visual bar
mirrors a real loaded barbell; colours match IEC so the mental mapping is
instant.

**Gap:** The `TextInput` (target weight override) and the 22px close
button have **no accessibilityLabel** (l.38), the only real a11y gap in
an otherwise good component. Close button at 22px is under the 44px target
min. IEC colours, while intentional, aren't documented as a deliberate
off-token exception.

**Improvement:** Add a11y labels to the TextInput and close button; bump
the close hitSlop/target to 44px. Add a one-line comment marking the IEC
plate colours as a deliberate domain exception to the token rule.

**Coherence impact:** Medium positive (a11y).

**Priority:** Medium.

---

## Component: ServingPicker

**File:** `src/components/food/ServingPicker.js`

**Current state:** Good reusable quantity-input + unit-toggle, tabular-nums
for alignment, a11y label + state on units, hitSlop 6. No validation UI
(parent validates).

**Best-in-class reference:** MacroFactor serving editor, quantity + unit
with sensible unit lists per food, instant macro recompute.

**Gap:** hitSlop 6 is below the 8px-spacing / 44px-target guidance for the
unit chips. No inline validation affordance (empty/invalid quantity shows
nothing until the parent's Alert). It's one of the few genuinely shared
input molecules, good, but it predates and doesn't compose with the
proposed `<Field>`.

**Improvement:** Raise unit-chip targets; once `<Field>` exists, let
ServingPicker render inside it so error/helper text is consistent. Add an
inline invalid hint instead of relying on parent Alert.

**Coherence impact:** Medium positive.

**Priority:** Medium.

---

## Component: QuickAddSheet

**File:** `src/components/food/QuickAddSheet.js`

**Current state:** Good. Bare calories + optional P/C/F + meal slot,
KeyboardAvoiding, validation (kcal 1–5000), submitting state (text →
"Saving", opacity 0.5). Backdrop hardcoded `#000` (l.166).

**Best-in-class reference:** MyFitnessPal quick-add, log calories in
seconds without a food lookup.

**Gap:** Backdrop off-token (scrim). Validation is range-checked but
failure routes to `Alert` rather than inline-under-field. The "Saving"
text-swap loading is a third distinct loading treatment (vs spinner vs
nothing elsewhere), underlines the need for the shared Button.

**Improvement:** Scrim token; inline validation messages; adopt the shared
Button's loading treatment once it exists.

**Coherence impact:** Medium positive.

**Priority:** Medium.

---

## Component: FoodDetailSheet

**File:** `src/components/food/FoodDetailSheet.js`

**Current state:** Core add/edit-entry sheet: quantity, meal slot, live
macro preview, delete-confirm. accessibilityViewIsModal set. Backdrop
`#000` (l.234).

**Best-in-class reference:** MacroFactor / Cronometer food detail, live
macro recompute as you change quantity, with the recompute announced to
assistive tech.

**Gap:** No live region on the macro preview, so VoiceOver users changing
quantity don't hear the macros update (the numbers change silently). No
save-failure recovery UI (relies on the catch). Backdrop off-token.

**Improvement:** Wrap the macro preview in `accessibilityLiveRegion=
"polite"` so updates are announced; add an inline "Couldn't save, retry"
state instead of a silent catch; scrim token.

**Coherence impact:** Medium positive.

**Priority:** Medium (a11y live region is the notable one).

---

## Component: search bars (FoodSearch / ExerciseLibrary / PlanLibrary)

**Files:** `FoodSearchScreen.js`, `ExerciseLibraryScreen.js`,
`PlanLibraryScreen.js` (+ 4 more)

**Current state:** Each builds its own search input + (sometimes) clear
button + debounce (250ms in FoodSearch, separate debounce in
ExerciseLibrary). FoodSearch's is the most advanced (global waterfall
search, tab-aware). Functionally good individually.

**Best-in-class reference:** Linear/Robinhood search, one search field,
instant results, consistent clear/cancel affordance and empty/zero-result
state across the app.

**Gap:** Three+ slightly different search bars: different debounce values,
different clear affordances, different zero-result handling (FoodSearch has
rich tabs; others have a plain "no results"). The most-used input pattern
in the app is the least consistent.

**Improvement:** Extract `<SearchBar>` (value/onChange/onClear/placeholder/
debounce, one clear affordance, one focus ring) and a shared zero-result
empty state; adopt across all browse screens. Keep FoodSearch's tab logic
on top of the shared bar.

**Coherence impact:** High positive, unifies the most-used input.

**Priority:** High.

---

## Toggles, pickers, chips

**Files:** RN `Switch` in Settings/Notifications; chip selectors in
ProGoalSetup, ProOnboarding, NutritionTargets, NotificationSettings (day/
hour chips); set-type picker in SetEntry.

**Current state:** Switches use the RN default (acceptable). Chips are
hand-built per screen with selected/unselected states; generally have a11y
state, but the chip styling (radius, padding, selected fill) varies
between ProGoalSetup goal cards, NutritionTargets pills, and Notification
day/hour chips.

**Best-in-class reference:** One chip/segmented-control component with a
single selected treatment (Duolingo/Material chips).

**Gap:** No shared `<Chip>` / `<SegmentedControl>`, so the selected-state
look (amber fill vs amber border vs checkmark) differs across the goal,
phase, protein, meal-count, and day/hour selectors, all of which are
conceptually the same "pick one/some" control.

**Improvement:** Add `<Chip selected>` and `<SegmentedControl>` with one
selected treatment; migrate the setup/notification selectors. Confirm RN
`Switch` track colour uses `colors.primary` everywhere.

**Coherence impact:** High positive, selection feels uniform across all
setup flows.

**Priority:** High.

---

## Input summary

| Item | Gap | Priority |
| --- | --- | --- |
| No shared `<Button>` (14+ inline, 3 loading treatments) | CTA look/behaviour drift | Critical |
| No `<Field>` / `<SearchBar>` (29 raw TextInputs, 7 search bars) | no shared focus/error; iOS-zoom risk | High |
| No `<Chip>` / `<SegmentedControl>` | selected-state drift across setup flows | High |
| Validation via Alert, not inline-on-blur | not best-practice; not accessible | High |
| SetEntry stepper not extracted | numeric ± reinvented in 3+ screens | High |
| PlateCalculator TextInput/close no a11y + small target | a11y + 44px | Medium |
| FoodDetailSheet macro preview no live region | a11y | Medium |
| Backdrops off-token (QuickAdd/FoodDetail) | scrim token | Medium |

Top input move: **ship `<Button>` + `<Field>`/`<SearchBar>` + `<Chip>`**,
built on the PressableCard press model, and move validation inline-on-blur.
SetEntry already proves the team can build best-in-class inputs; the gap is
that excellence isn't generalised.

Sources:
- [Text fields & forms design (UX Collective)](https://uxdesign.cc/text-fields-forms-design-ui-components-series-2b32b2beebd0)
- [Error feedback best practices on mobile forms (UXPin)](https://www.uxpin.com/studio/blog/error-feedback-best-practices-mobile-forms/)
- [Accessible form validation best practices (Reform)](https://www.reform.app/blog/accessible-form-validation-best-practices)
- [Mobile form best practices (Ivy Forms)](https://ivyforms.com/blog/mobile-form-best-practices/)
