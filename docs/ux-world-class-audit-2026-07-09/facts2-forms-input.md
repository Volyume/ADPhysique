# Facts (second wave): forms and input friction

Raw fact report saved verbatim from a read-only subagent run on 2026-07-09, second-wave ease-of-use hunt (founder request). Evidence for the ease-of-use strengthening pass. Facts only; judgement stays with the main session.

---

Confirmed: `PressableCard` supports `onLongPress`, but `Stepper.js` never passes it — no long-press-to-repeat is wired for +/- buttons anywhere they're used (LogCardioScreen duration stepper included).

Final facts below.

## 1. Per-primitive facts

**TextField** (`src/components/TextField.js`): no `error`/`errorMessage` prop exists at all — the component has zero built-in error-rendering path (lines 16-99, full props list). No `returnKeyType` default (whatever caller passes or RN default). Validation timing is entirely caller-driven. min heights: `md`=50, `lg`=54 (lines 12-13). No character-counter, no clear button.

**Stepper** (`src/components/Stepper.js`): +/- buttons are 44x44 (`md`, line 106-107) or 30x34 (`compact`, line 116-117) — compact size is below the 44pt/48dp touch-target guideline. No long-press repeat: `onPress` only, no `onLongPress` passed (lines 45-59, 72-86), even though `PressableCard` (line 76-77 of that file) supports it.

**Dropdown** (`src/components/Dropdown.js`): inline expand-in-place, no modal/native picker. No keyboard involvement at all.

**SegmentedControl**: pure tap, `accessibilityRole="radiogroup"`, no keyboard.

**SearchBar** (`src/components/SearchBar.js`): `keyboardType` not set (default), `returnKeyType="search"` (line 41), `autoCapitalize="none"`, `autoCorrect={false}` hardcoded. Font size forced `Math.max(16, fontSize.md)` specifically to stop iOS zoom-on-focus (comment lines 10-11, 76-77). Clear button appears only when `value` is non-empty and not loading (lines 45-56).

**Chip**: pure tap toggle, no keyboard involvement.

## 2. Cross-screen inconsistencies (same primitive)

- **keyboardType for numeric fields differs by screen for equivalent data:** BodyMetricsScreen stone-weight field uses `number-pad` (line 1008) but the paired pounds sub-field on the same row uses `decimal-pad` (line 1020); every other numeric field across all 5 screens (kcal, protein, sleep hours, servings, quantity grams, body fat %, measurements) uses `decimal-pad`.
- **returnKeyType is inconsistent and mostly unset:** WeeklyCheckInScreen sets `returnKeyType="done"` on sleep hours (line 838) and `returnKeyType="default"` on the notes field (line 1092) — the only two explicit values in any of the 5 screens. AddCustomFoodScreen, BodyMetricsScreen's numeric/date fields, and RecipeBuilderScreen never set it (falls to RN default, "done" on Android).
- **No screen among the 5 uses `onSubmitEditing`** to advance focus, even in multi-field forms (BodyMetricsScreen has up to 8 stacked TextFields per entry: date, weight, weight-lbs, body fat, 5+ measurement rows, notes). By contrast, 8 other screens in the codebase (`WorkoutSummaryScreen.js`, `DiaryScreen.js`, `PlansScreen.js`, `ActiveWorkoutScreen.js`, `ScanBarcodeScreen.js`, `MyMealsScreen.js`, `FirstRunScreen.js`, `MealNamesScreen.js`) do use `onSubmitEditing`.
- **Validation timing differs by screen:** AddCustomFoodScreen validates continuously on-type (`canSave`, lines 139-145, disables the Save button live) plus one on-submit range check with a toast (lines 182-186, quantity 1-5000g). BodyMetricsScreen validates only on-submit, via `validateBodyMetricForm` inside `saveMetrics()` (`BodyMetricsScreen.js:663-667`), surfaced as a warning toast — no live/on-blur feedback while typing. WeeklyCheckInScreen does no visible range validation on sleep hours at all beyond `maxLength={4}` and a submit-time `parseFloat` (line 688); malformed/out-of-range values aren't rejected in the reviewed step.
- **Error rendering has no shared component:** none of the 5 screens render an inline per-field error string; all surface problems via `toast.show(..., {variant:'warning'|'error'})` (`BodyMetricsScreen.js:665,707`; `AddCustomFoodScreen.js:184,295`) or a blocking `appAlert` confirm dialog (`AddCustomFoodScreen.js:190-201`, "Numbers look off" sanity check). TextField itself has no error state to style differently.
- **"Unsure" amber highlighting is unique to AddCustomFoodScreen:** OCR-low-confidence fields get `fieldStyle={unsure && styles.numWrapUnsure}` (border recolour, `AddCustomFoodScreen.js:437,469`) plus an `accessibilityHint`. No equivalent visual-flag mechanism exists on any other screen's TextField usage.

## 3. Multi-field forms

- None of the 5 screens wires Done-to-next-field advance (no `onSubmitEditing`/no field refs chained); each numeric keypad's Done/Return simply dismisses.
- All 3 form screens with real forms (AddCustomFoodScreen, BodyMetricsScreen, RecipeBuilderScreen) wrap content in `KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}` + `ScrollView keyboardShouldPersistTaps="handled"` — explicitly called out in code comments as a deliberately standardised pattern ("L03-C5... standardise on the app's KeyboardAvoidingView pattern", e.g. `AddCustomFoodScreen.js:305-309`, `BodyMetricsScreen.js:775-780`, `RecipeBuilderScreen.js:331-334`). Android gets no `behavior` (relies on default resize).
- WeeklyCheckInScreen and LogCardioScreen (no forms with KeyboardAvoidingView) also use plain `ScrollView` with `keyboardShouldPersistTaps="handled"` but LogCardioScreen has no text-entry field to be obscured (Stepper + SegmentedControl only), and WeeklyCheckInScreen's TextFields (sleepHours, notes) aren't wrapped in a `KeyboardAvoidingView`.
- No explicit scroll-to-field-on-focus logic found in any of the 5 screens (relies solely on RN's default `ScrollView`/`KeyboardAvoidingView` behaviour).

## 4. Number entry ergonomics

- Two distinct numeric-input UX patterns coexist: **typed TextField+decimal-pad** (all macro/weight/measurement fields in AddCustomFoodScreen, BodyMetricsScreen, WeeklyCheckInScreen, RecipeBuilderScreen) vs. **Stepper +/-** (cardio duration in LogCardioScreen, `LogCardioScreen.js:204-216`). No screen offers both for the same value.
- Unit labels are placed differently by screen: AddCustomFoodScreen puts the unit as a `trailing` element inside the field (`suffix` prop, `NumField`, lines 425-441); BodyMetricsScreen puts the unit in the external row label instead ("Body weight (kg)", "cm", line 1030/1081) with nothing inside the field; RecipeBuilderScreen puts grams as a separate `<Text>` outside the field, right of it (`qtyUnit`, line 451); Stepper renders the unit inside its centre value text (`unit` prop, `Stepper.js:39`).
- Stepper has no long-press-to-repeat (established above) — every increment of duration (5-min steps, up to 300 max) requires an individual tap.

## 5. Strongest / friction facts

**Strongest:**
1. SearchBar hardcodes a >=16pt font specifically documented to prevent iOS auto-zoom-on-focus (`SearchBar.js:10-11,77`).
2. AddCustomFoodScreen has continuous on-type Save-button gating (`canSave`) plus a dedicated finite/negative numeric hard-block with an explanatory comment referencing a specific audit finding (F-006, `AddCustomFoodScreen.js:134-145`).
3. TextField centralises a documented WCAG-contrast decision for placeholder colour with measured contrast ratios cited in-line (`TextField.js:21-26`).
4. All three heavier forms deliberately standardise the same `KeyboardAvoidingView` behavior prop, with comments cross-referencing each other's screen names.
5. AddCustomFoodScreen gives a live portion-calorie preview as the user types quantity, before saving (`portionPreview`, lines 152-172).

**Friction:**
1. TextField has no error-display capability at all; every screen invents its own out-of-band error surface (toast or alert), so error presentation is inconsistent app-wide by construction, not by screen mistake.
2. No screen among the 5 chains `onSubmitEditing` to move focus to the next field, despite BodyMetricsScreen having up to 8+ sequential text fields in one form.
3. Stepper's `compact` touch target (30x34) is below common 44pt minimum touch-size guidance, and no `Stepper` usage in the reviewed screens passes `onLongPress` for rapid increment.
4. keyboardType selection is inconsistent for equivalent numeric data (`number-pad` vs `decimal-pad` on the two halves of the same stone/lbs weight row in BodyMetricsScreen, lines 1008 vs 1020).
5. Validation timing varies by screen with no shared convention: on-type continuous (AddCustomFoodScreen), on-submit-only (BodyMetricsScreen, WeeklyCheckInScreen) — a user gets a different mental model of "when will I find out I made a mistake" depending which form they're in.
