# Deep Feature Audit — Item 35: Recipe Builder screen

**Document:** deep-audit-36-recipe-builder.md
**Item:** 35 of master inventory (screen #33 — `RecipeBuilderScreen`; Diary sub-stack, build/edit a recipe modal)
**File:** `src/screens/RecipeBuilderScreen.js` (335 → 349 lines), components `SkeletonRow`, libs `food/db` (`createRecipe`, `updateRecipe`, `getRecipeWithIngredients`, `setRecipeIngredients`, `computeRecipeMacros`), `food/sources/localCache`
**Status:** IMPLEMENTED (approved 2026-06-04, "Yes fold all in also"). Added roles/labels to the header close + Save (with disabled state), the Name/Total servings/Notes inputs, the "+ Add ingredient" link, the per-ingredient quantity input, and the remove-ingredient button; and folded in both flagged extras — a digit filter on the quantity input (no more NaN preview) and a loading skeleton for edit-mode load. Attribute-only plus the two small robustness/consistency fixes; no behaviour-visible change to the happy path.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
Create or edit a recipe: name, total servings, notes, and an ordered ingredient
list (each picked by reusing `FoodSearch` in recipe-pick mode, with an editable
grams quantity and a remove). A live macro preview shows per-serving pills and a
whole-recipe total, both recomputing as servings/quantities change. Save is
atomic (create/update + `setRecipeIngredients`).

### Findings
1. **Solid builder.** Scale-by-servings with a live per-serving + whole-recipe
   macro preview is exactly the pattern the sources call for. Clean: **no dead
   styles, no em dashes, tokens throughout.**
2. **A11y gaps (form-heavy).** The header **close** was icon-only with no
   role/label; the header **Save** (a text button with a disabled state) had no
   role or `accessibilityState`; the **Name / Total servings / Notes** inputs had
   visible labels RN does not associate with the field; the **per-ingredient
   quantity input** had no label (a screen reader could not tell which ingredient
   or that it was grams); **"+ Add ingredient"** and the **remove** icon had no
   role/label.
3. **Copy clean and on-voice.** Nothing to reword.
4. **Two minor robustness/consistency items (both folded in on approval).** The
   quantity input accepted non-numeric text → a NaN preview; and edit-mode load
   rendered blank rather than a skeleton.

### Design assessment (values cited)
- On-system: `surface` inputs, `primary` add-link + Save, a macro card with
  per-serving pills (kcal/P/C/F — related figures, not forced symmetry), scale
  tokens. No fingerprints.

### Flow / integration assessment
- Edit mode loads the recipe + resolves each ingredient's food for the preview;
  newly-picked ingredients arrive via a route param that a `useEffect` appends
  then clears (so a focus event cannot re-add). Macros recompute via
  `computeRecipeMacros`. Save is atomic. Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- A recipe builder should let users **scale by servings** with real-time macro
  recompute and break macros down **per serving** (Volyume does both); and
  **screen readers must be able to interpret the ingredient and form fields**,
  the gap here. [SideChef; RecipeIQ]

---

## STEP C — COMPARISON

### Where Volyume leads
- The live per-serving + whole-recipe macro preview that scales with
  servings/quantities.

### Where Volyume lags
- Form a11y across the inputs and ingredient rows (fixed); a NaN-prone quantity
  field and a blank edit-load (both fixed).

### Critical gaps
- None functional.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **Header close.** `accessibilityRole="button"` + `accessibilityLabel="Close"`.
2. **Header Save.** `accessibilityRole="button"` + `accessibilityState={{ disabled: !canSave }}` + label.
3. **Name / Total servings / Notes inputs.** `accessibilityLabel` on each.
4. **"+ Add ingredient".** `accessibilityRole="button"` + label.
5. **Per-ingredient quantity input.** `accessibilityLabel` of `${name} quantity in grams`.
6. **Remove-ingredient.** `accessibilityRole="button"` + `accessibilityLabel` of `Remove ${name}`.
7. **Quantity digit filter (folded in).** `onChangeQty` strips non-numeric input
   so a stray character can't NaN the macro preview.
8. **Edit-load skeleton (folded in).** Blank → three `SkeletonRow`s.

### COPY CHANGES
None.

### What to keep (with evidence)
- The ingredient picker reuse, the live macro preview, atomic save, and all copy.
  [SideChef; RecipeIQ]

### IMPACT / EFFORT
- **Impact: Low–Medium.** Several form controls were unlabelled/unroled (the
  quantity field especially opaque to a screen reader); the digit filter removes a
  real NaN footgun.
- **Effort: Low.** Attribute-only plus two small fixes. eslint 0 problems; not in
  the screen-mount sweep (modal), so lint is the gate.

### SOURCES
- SideChef — UX best practices for recipe platforms:
  https://www.sidechef.com/business/recipe-platform/ux-best-practices-for-recipe-sites
- RecipeIQ — recipe analyzer / per-serving + per-ingredient nutrition:
  https://www.recipeiqapp.com/
