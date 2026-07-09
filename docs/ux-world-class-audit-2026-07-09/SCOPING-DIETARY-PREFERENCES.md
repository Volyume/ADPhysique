# Scoping: dietary preferences and allergen exclusions in meals

**Date:** 2026-07-09. **Status: SCOPING ONLY, nothing built.**
**Founder request (verbatim):** "ensure the meal builder and planner builds
the capability for the user to select dietary preferences vegan vegi and so
on and exclude allergies perhaps. Research might be needed and maybe
additions to meals and so on. Please scope this out as well."
**Evidence:** `facts-meals-dietary.md` (verified against source by a
read-only extraction pass); judgement and phrasing here are hands-on.

---

## 1. The headline finding: the engine half already exists

The request is further along than expected. Already shipped, tested and
deterministic:

| Capability | State today |
|---|---|
| Diet axis (omnivore / vegetarian / vegan) | LIVE: `dietPreference` on the profile, Settings chips, synced to cloud (`migrate_055`), cascade logic `vegan ⊂ vegetarian ⊂ omnivore` (`dietAllows()`) |
| Allergen vocabulary | PARTIAL: `foodRoles.js` carries the FSA 14-allergen tag map; 9 of 14 tags in active use on curated foods |
| Exclusion mechanism | LIVE for meal plans: `planPreferences.js` `foodAllowed()` checks `excludeTags` (allergens) and `excludeFoodKeys` (specific foods); enforced in the plan assembler and meal swap, with tests |
| Preference UI | PARTIAL: "Meal preferences" card in MealPlanScreen; diet chips in SettingsProfile |
| ED-safety interaction | SOLVED at engine level: exclusions can never push a day below the calorie/FFM floors; the assembler reports `withinTolerance: false` rather than under-feeding |

So the work is not "build dietary preferences". It is: close five specific
gaps, decide three data questions, and put one honest safety boundary in
copy. That reframing keeps the build small and the risk low.

## 2. The five real gaps

1. **The diary suggestion path is not wired to preferences.**
   `mealSuggest.js` (`rankSuggestions`) ranks candidates but does not
   filter them; the plan layer filters, the diary "what should I eat"
   layer relies on callers pre-filtering, and the call sites need
   verifying. A vegan user can plausibly be suggested a non-vegan food in
   the diary today. This is the highest-priority gap: it is a trust break
   on the exact surface the founder named.
2. **External foods carry no allergen or diet data.** The OpenFoodFacts
   client never requests `allergens_tags`, `traces_tags` or
   `ingredients_analysis_tags` (which carry en:vegan / en:vegetarian
   status); USDA data likewise; the local `foods` and `custom_foods`
   tables have no allergen column. Exclusions therefore only work for the
   ~90 curated foods, not scanned/searched products.
3. **The curated meal library is thin for restricted diets.** 40 meals
   total across all diets and slots. A vegan user on a 4-meal plan will
   see heavy repetition. "Additions to meals", as the founder put it, is
   real work: authoring more curated meals with diet and allergen tags.
4. **Allergen vocabulary is incomplete and the UX is buried.** 5 of the
   FSA 14 (celery, lupin, molluscs, mustard, sulphites) are defined but
   unused; the exclusion UI lives inside MealPlanScreen preferences
   rather than a first-class "Dietary needs" surface, and onboarding
   never asks.
5. **Exclusion preferences are device-local.** `mealPlanExcludeTags` /
   `mealPlanExcludeFoods` deliberately do not sync. A user who sets a nut
   allergy on their phone and later signs in on a new device silently
   loses it. For taste preferences that is tolerable; for allergies it is
   not.

## 3. The safety boundary that must be written before any build

**Allergen filtering in Volyume can only ever be best-effort convenience,
and the copy must say so.** OpenFoodFacts allergen data is crowd-sourced
and incomplete; USDA branded data is patchy; web-imported recipe
ingredients are free text. A fitness app must never imply a meal is "safe"
for an allergy. The honest frame, consistent with the locked voice:

- Curated meals: "excludes foods containing X" is defensible because we
  author the tags.
- External/scanned foods: exclusions apply "where we have the data", and
  anything unverified is labelled so. A line in the spirit of "Always
  check the label. Volyume filters what it knows about, and packaged food
  data can be incomplete." belongs on the exclusion settings surface.
- The word "allergy" can appear in the setting name; the word "safe" must
  not appear anywhere near it.

This also settles the liability posture: filter, disclose the limits,
never guarantee.

## 4. ED-safety considerations (assessed against the locked systems)

- The floor interaction is already correct and must be kept: exclusions
  reduce the candidate pool but the assembler refuses to under-feed and
  flags instead. No change proposed.
- Diet and allergen exclusions are legitimate, identity-level preferences;
  they are not ED signals in themselves. But an unbounded per-food
  exclusion list can be used as a restriction tool. Today
  `excludeFoodKeys` exists with no ceiling. Options for the founder in
  section 7 (hard cap, soft nudge past a threshold, or leave unbounded);
  whatever is chosen must stay tier-blind and must not weaken any
  existing guardrail.
- Copy stays preference-framed ("Eating vegan", "Foods you avoid"), never
  virtue- or restriction-framed, per COACHING_VOICE_SYNTHESIS_LOCKED.

## 5. Diet axes: what to offer

- **Vegetarian and vegan:** already live. No decision needed.
- **Pescatarian:** cheap and coherent: fits the existing cascade
  (vegetarian + fish), curated foods already tag fish. Small enum + tag
  work.
- **Halal and kosher:** different in kind. These are certification
  regimes, not ingredient categories; no data source we use carries
  certification. An honest approximation (exclude pork and alcohol as
  ingredients; kosher additionally excludes shellfish and meat+dairy
  combinations) is possible on curated meals only, and must be labelled
  as ingredient-based, not certified. Recommend treating as a separate
  later decision rather than blocking the core work.
- **"Dairy-free / gluten-free" style needs** are already covered by the
  allergen-exclusion axis (milk, cereals_gluten); they need no diet enum.

## 6. Proposed shape of the work (phases are founder options, not a plan)

**Phase A: close the trust gaps on what exists (small).**
Wire `foodAllowed()`/`dietAllows()` into every suggestion call site
(diary suggestions, "usuals" chips, quick-relog is exempt: user's own
history); complete the FSA 14 vocabulary on curated foods; add
pescatarian; promote a first-class "Dietary needs" settings surface
(diet + allergen exclusions + the honesty disclaimer) and link it from
MealPlanScreen and Pro onboarding (one optional step, no new hard gate);
sync the exclusion fields (additive `users_profile` columns + `FIELD_MAP`
entries, new migrate, founder-applied per supabase rules). Engine work is
wiring, not new logic; the biggest single line item is the settings
surface.

**Phase B: make restricted diets feel first-class (medium).**
Author and tag additional curated meals with per-diet coverage targets
(suggested bar: every diet × every slot has enough meals that a 7-day
plan repeats no meal more than twice; implies roughly 25 to 40 new meals,
mostly vegan/vegetarian). Pure content work plus review; no schema
change. This is the founder's "maybe additions to meals" and it is what
makes the feature feel real rather than technically present.

**Phase C: extend exclusions to the open food world (larger).**
Ingest OFF `allergens_tags`, `traces_tags` and `ingredients_analysis_tags`
into an additive `foods` column (and expose "unverified" states); apply
exclusion filtering with per-food confidence labelling in search, scan
results and recipe import; derive recipe-level allergen summaries for
curated-key ingredients. Touches the source clients, local schema
(additive migration), and search/scan UI. Highest effort, and its value
depends on Phase A/B landing first.

Halal/kosher (ingredient-approximation on curated meals only) would slot
after A as its own decision.

## 7. Founder decisions required (no-parking rule)

1. **Scope to commit:** (a) Phase A only, (b) A + B, (c) A + B + C,
   (d) different composition (state it).
2. **Diet axes:** (a) add pescatarian only, (b) add pescatarian now and
   take halal/kosher as a separate follow-up decision, (c) add
   ingredient-approximated halal/kosher now with explicit "not certified"
   labelling, (d) leave axes as they are.
3. **Allergen sync:** (a) sync diet + allergen exclusions to
   `users_profile` (recommended for allergies by the analysis above, but
   the call is yours), (b) keep device-local and accept the new-device
   loss, (c) sync allergens only, keep taste exclusions local.
4. **Exclusion ceiling (ED-adjacent):** (a) no ceiling, (b) soft
   plain-voice nudge past a threshold (e.g. 15 excluded foods), (c) hard
   cap. Guardrails stay tier-blind in all cases.
5. **Onboarding capture:** (a) add one optional "Dietary needs" step to
   Pro onboarding, (b) settings-only, surfaced contextually the first
   time meals are suggested, (c) both.
6. **Disclaimer copy:** approve the safety boundary stance in section 3
   (filter, disclose limits, never say "safe") so exact strings can be
   drafted against the voice doc.

## 8. Verification notes for whoever builds this

- Confirm the diary-suggestion call sites' current filtering behaviour
  first (facts file flags it as unverified); if they already pre-filter,
  Phase A shrinks further.
- OFF field names (`allergens_tags`, `traces_tags`,
  `ingredients_analysis_tags`) and their coverage quality should be
  spot-checked against the live API for a sample of UK products before
  Phase C is priced.
- Every migration additive and idempotent, header-noted, founder-applied;
  `mealSuggest`/`planPreferences` changes need invariant tests in the
  existing style (e.g. "a vegan profile is never suggested a food tagged
  non-vegan, across the whole curated set").
- Manual device checklist required at ship time (physical Android, EAS
  build) including the ED cases: exclusions + floor interaction, and the
  suppression states.
