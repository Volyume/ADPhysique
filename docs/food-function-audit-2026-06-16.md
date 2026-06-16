# Food Function — Full Audit & Improvement Recommendations

**Date:** 2026-06-16
**Branch:** `claude/audit-work-quality-review-benrin`
**Scope:** the entire food subsystem — plan-generation **engine** (process), food-**logging** journey (flow), and food **data/sources** (integrity) — plus competitive research into how leading apps do this.
**Method:** three parallel deep-read passes over `src/lib/food/`, `src/components/food/`, `src/screens/{Diary,FoodSearch}Screen.js`; competitive web research; then a **verification pass** where I re-read the code for every headline finding before writing it down.

> This is an audit and a recommendation backlog. **Nothing here has been built.** Build items are gated on founder go, one at a time, per CLAUDE.md.

---

## §0 — Verification corrections (findings the first pass got WRONG)

The initial deep-read flagged several things that turned out to be inaccurate. They are recorded here so they are **not** carried forward as if true (founder rule: never present a guess as fact).

1. **"Recents don't pre-fill the last portion" — FALSE. It already works.**
   `db.js:257-280` stores `last_quantity_g` per (user, meal slot, food) via `upsertSlotRecent`/`getSlotRecents`; `FoodSearchScreen.js:737` passes `initialQuantityG={picker?.food?.last_quantity_g}`; `FoodDetailSheet.js:41` uses it. The "Add again" tab already opens with the last portion filled. The remaining opportunity is *prominence/one-tap*, not building the feature.

2. **"Regenerate can return the same plan twice in a second" — OVERSTATED.**
   The seed is `Date.now() % 100000` (`mealPlanService.js:197,248,262,297`). It changes every **millisecond**, so human-paced regeneration is effectively always distinct. The real (minor) point is the seed space is only 100k and wall-clock based — fine for users, not a correctness risk. Low priority.

3. **"Vegan days can have a 20 g-protein meal" — NOT a live bug.**
   The per-meal vegan protein/leucine bar (28 g mains / 24 g breakfast / 12 g snack) is enforced as a **library invariant** in `proteinQuality.test.js`, so every vegan meal in the library already clears its bar. Any vegan day assembled from library meals inherits that. The genuine (small) gap is that gram-solve doesn't *re-verify* the bar after rescaling — robustness, not a defect.

Everything in §1–§3 below was re-read in the code and the line references are confirmed unless explicitly marked **[flagged — not re-verified]**.

---

## §1 — PROCESS: the plan-generation engine

**What's strong (verified):** safety-by-construction (calorie floors never breached; `withinTolerance=false` rather than silent under-feeding, `mealPlanAssembler.js:489`); deterministic seeded assembly; protein-quality anchoring by diet; the new fat-aware selection (C/F split); macro-preserving food/meal swaps; gram-level coach narration with protein always protected.

### Verified gaps & opportunities

| # | Finding | Evidence | Impact |
|---|---------|----------|--------|
| P-1 | **Fat is the only macro with no tolerance gate.** Day pass/fail = calories-in-band AND protein ≥ 85% of target. Fat is a soft 0.30× selection nudge only; a day can sit systematically under fat target and still report "within tolerance". | `mealPlanAssembler.js:487-489` (`kcalWithinBand`, `proteinMet`, `withinTolerance` — no fat term) | Plans can quietly miss the fat target the C/F work was meant to hit. Medium |
| P-2 | **Protein is checked downside-only (≥85%), no upper bound.** Omnivore pools anchored on high-protein meals can run well over target and still pass. | `mealPlanAssembler.js:488` | Asymmetric vs the symmetric ±10% kcal band. Low–Medium |
| P-3 | **Greedy fill never backtracks.** Early high-fat picks can leave late slots unable to hit the fat/calorie share; no second-pass local search. | `mealPlanAssembler.js:320-388` (greedy), `:394-474` (gram close-out) | "Close-miss" days under tight constraints. Medium |
| P-4 | **Pinned meals aren't validated against the budget.** A user can pin a meal larger than the day; remaining slots get squeezed and the day can fall out of band with no warning. | `mealPlanAssembler.js:296-314` | Silent poor day. Medium |
| P-5 | **Allergen/diet-restricted pools can become unfillable with no graceful degradation.** e.g. vegan + soya + gluten excluded at 4 meals/day → unfilled slots, `withinTolerance=false`, but no "try 3 meals / relax an exclusion" guidance. | pool filter `mealPlanAssembler.js:263-266`; failure surface `:489,505` | Restricted users hit a dead end. Medium–High |
| P-6 | **Residual is a single boolean, no tiers.** −30 kcal and −250 kcal both read as "couldn't build it"; no "how close" signal to drive a retry hint. | `mealPlanAssembler.js:476-481` | Misses a cheap trust/UX win. Low |
| P-7 | **No assembly telemetry.** Iteration count, per-slot attempts, and band-miss size aren't recorded, so slow/edge profiles are invisible in production. | `mealPlanAssembler.js`, `mealPlanService.js` | Can't tune what we can't see. Low |

**Competitive note:** MacroFactor's differentiator is *adaptive* macros (weekly target changes from observed metabolism) — deliberately **out of scope** for us: Precision Coaching is deterministic by SACRED RULE. The engine items above are about *hitting the target we already set*, which is in-bounds.

---

## §2 — FLOW: the food-logging journey

**What's strong (verified):** search-first add with slot-aware "Add again" recents + last-portion prefill (§0.1); quick-add escape hatch; bulk multi-select (delete / move / copy / save-as-meal); copy-yesterday; saved meals & recipes; macro rings + per-meal breakdown sheet; provenance source chips; calm empty states.

### Verified / high-confidence gaps

| # | Finding | Evidence | Impact |
|---|---------|----------|--------|
| F-1 | **No undo after delete** (single or bulk), even though rows are **soft-deleted** (`deleted_at`) so restore is cheap to add. | delete at `DiaryScreen.js:446,476`; soft-delete pattern in `db.js` | Accidental deletes are unrecoverable; classic friction. **High value / low effort** |
| F-2 | **Recents are powerful but not the default surface.** The fastest path (last food, last portion) sits behind the "Add again" tab rather than being the first thing shown / one-tap. | `searchTabs.js`; `FoodSearchScreen.js` tab order | Industry research: *logging speed is the #1 predictor of retention*. Closing the gap to MyFitnessPal's one-tap recent is the single biggest flow win. **High** |
| F-3 | **No "copy from any date"** — only copy-yesterday. | `DiaryScreen.js` copy-yesterday only | Cronometer-style "copy from…" helps repeated meal patterns (leg-day meals etc.). Low–Medium |
| F-4 | **Recipes log immediately at 1 serving** with no servings picker. | `recipeLogging` apply path | Re-log/edit dance to get 2 servings. Medium |
| F-5 | **Meal-card header shows protein subtotal but not kcal.** Calories are the hard constraint; not glanceable per meal. | `MealSection.js` header | Minor but constant. Low |
| F-6 | **Macro breakdown sheet is read-only** — tapping a meal row doesn't jump to that meal. | `MacroBreakdownSheet.js` | Dead-end interaction. Low |
| F-7 | **a11y:** the animated kcal counter isn't re-announced to screen readers on change (no `accessibilityLiveRegion`). **[flagged — partially verified]** | `MacroRings.js` | Accessibility gap. Low–Medium |

**Competitive note (well-sourced):** the friction-reduction playbook every leading app converges on is *multi-input + smart prefill*: barcode (we have, Pro), one-tap recents/favourites (we have, can surface better), and increasingly **photo** and **voice/natural-language** capture (we have neither). See §4.

---

## §3 — DATA: sources, normalisation, integrity

**What's strong (verified):** clean per-100g model; denormalise-macros-at-log-time protects history; 5-step offline-first waterfall (local cache → bundled OFF UK → bundled CoFID → live OFF → USDA); on-device label OCR with confidence flags; CSV export with formula-injection defence; deterministic grocery list.

### Gaps

| # | Finding | Evidence | Status | Impact |
|---|---------|----------|--------|--------|
| D-1 | **Sanity checks are thin.** Only 3: kcal 0–900, P+C+F ≤ 110 g, kcal-vs-macro drift ≤ 20%. No `fibre ≤ carbs`, no implausible-ratio check, no sodium/sugar bounds. A 20% drift tolerance lets real label typos through. | `sanityChecks.js:18-92` (read in full) | **Verified** | Medium / **low effort** |
| D-2 | **Barcode hits aren't disambiguated by variant/quality.** First match wins; multi-size or reused codes can log the wrong product. | `waterfall.js`, `usda.js` | [flagged] | Medium–High |
| D-3 | **No cross-source dedupe.** Same food from OFF + USDA + cache are separate rows; user can log near-duplicates. | `waterfall.js`, `localCache.js` | [flagged] | Medium |
| D-4 | **Bundled snapshot goes stale and there's no "refresh library now".** Delta pull is throttled; seed-import failures are near-silent. | `seed.js`, `libraryDelta.js` | [flagged] | Medium |
| D-5 | **Beverage ml vs g** handled as per-100g solid; serving semantics can mislead. | `liveOff.js`, `usdaToFood.js` | [flagged] | Low–Medium |
| D-6 | **UK hit-rate (75–85%) is aspirational, not measured** — no production telemetry on barcode/search hit, OCR low-confidence saves, or sanity near-misses. | `FOOD_DATA_STRATEGY_LOCKED.md` | [flagged] | **Strategic** |

**Competitive note (well-sourced):** the database-quality axis is a real differentiator. Cronometer hit **30/30 within 5%** of USDA vs MyFitnessPal **11/30**, by *curating* (no open user submissions). Open Food Facts is volunteer-populated with explicit "no accuracy guarantee" and incomplete fields. Our waterfall leans on OFF — so **D-1 (sanity) + D-6 (telemetry)** are how we protect the quality floor without buying a paid DB.

---

## §4 — STRATEGIC LEVERS (need a founder boundary decision, not a silent build)

These are the biggest "elevate it further" moves competitors use. Each collides with a SACRED RULE, so they are **decisions, not tasks**:

- **AI photo / plate-recognition logging.** The industry's biggest friction reducer (SnapCalorie ≈ 15% mean calorie error, peer-reviewed; MacroFactor ships photo logging that *avoids* pure-LLM macros). **Conflict:** sending meal photos to any external vision service breaches *"No PII to any external service"* + EU residency + offline-first. An on-device model is possible but heavy. **→ founder call.**
- **Voice / natural-language logging** ("two eggs and toast"). Lower-risk than photo if parsed on-device, but a cloud NLP would hit the same PII rule. **→ founder call.**
- **Adaptive macros.** MacroFactor's core. **Explicitly excluded** by the deterministic-coaching SACRED RULE. Not recommended.
- **Grocery delivery / batch-cook export.** Eat This Much-style plan→shopping-list→batch sizes. We already have a deterministic grocery list; batch-size hints + share are a safe, on-brand extension.

---

## §5 — Prioritised build backlog

Ranked by value ÷ effort, with rule-flags. **None started.**

**Tier A — high value, low effort, no rule conflict**
- **F-1 Undo for delete/bulk** (soft-delete already exists → restore toast). 
- **D-1 Strengthen sanity checks** (`fibre ≤ carbs`, ratio plausibility, optional sodium/sugar bounds; consider tightening drift band).
- **P-1 Add a fat-tolerance signal** to day validation (`fatWithinTolerance`) so the C/F work is actually measured, surfaced to swaps/regenerate.
- **F-2 Surface recents as the default/one-tap** add path (the feature exists; this is presentation).

**Tier B — high value, medium effort**
- **P-3/P-4/P-5 Engine robustness:** pin-vs-budget validation; min-meals backoff + actionable residual reason on restricted pools; optional second-pass local search for close-miss days.
- **P-6 Residual tiers + retry hint.**
- **F-3 Copy-from-any-date; F-4 recipe servings picker.**

**Tier C — strategic / needs telemetry or a boundary call**
- **D-6 Ship food telemetry** (hit-rate, OCR confidence, sanity near-miss) — prerequisite for D-2/D-3/D-4 decisions.
- **D-2 barcode disambiguation; D-3 dedupe; D-4 refresh-library.**
- **§4 photo / voice logging** — founder boundary decision first.

---

## §6 — Recommended first move

Build **Tier A** as a small, self-contained batch (one item at a time, lint + full test, commit each), because every item is verified, low-risk, rule-clean, and each is a real user win:
1. **F-1 Undo** (biggest day-to-day friction killer, cheap via existing soft-delete).
2. **D-1 sanity checks** (protects the coaching intake average — the thing the floors depend on).
3. **P-1 fat-tolerance signal** (closes the loop on the C/F split just shipped).

Tier B/C and the §4 strategic levers should be separate, explicitly-scoped decisions.
