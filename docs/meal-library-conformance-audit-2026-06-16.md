> ⚠ STATUS (2026-07-10): SUPERSEDED/CLOSED - do not build from this document. June 2026 meal-library conformance check; the library has been expanded since (dietary Phase B curated meals). Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md. Pre-campaign items require the D37 triage rule before any consideration.

# Meal Library Conformance Audit — 2026-06-16

**Goal:** check the built library (`src/lib/food/curatedMeals.js`, `curatedFoods.js`)
against the source spec (`docs/uk-bodybuilder-research-report-2026-06-15.md`) to the
letter. Findings only — no fixes applied. Every claim cites code line / report line.

**Method:** extracted all 58 food keys used across the 61 meals and all 79 foods
defined, then cross-checked against the report's Section A staple list and Section B
meal list. Purely factual; no external sources.

---

## Finding 1 — Non-report INGREDIENTS used in meals (the real fabrication)

The report's only sanctioned vegan protein staple is **"Vegan protein powder
(pea/soy *blend*)"** (report §A line 69), and line 153 states: *"single-source
pea-only or soy-only powders are nutritionally incomplete and should be flagged."*

The library instead defines **two single-source powders** and **no blend**:
- `curatedFoods.js:104  soy_protein: F('Soya protein', 360, 80, 5, 3)`
- `curatedFoods.js:105  pea_protein: F('Pea protein', 375, 80, 5, 7)`

And one ingredient **not in the report at all**:
- `tvp_dry` (TVP / soya mince) — absent from the report's entire staple list (§A
  plant proteins are: tofu, Quorn mince, Quorn pieces, tempeh, blend powder,
  lentils/beans; seitan appears in §B).

**Omnivore and vegetarian meals are clean** — every food they use traces to a
report §A staple. The ingredient drift is entirely in the vegan set.

## Finding 2 — Fabricated whole meals to REMOVE (built on non-report ingredients, not in the report)

- `curated_vg_pea_porridge` "Pea protein porridge" (line 103) — not a report meal;
  single-source pea protein.
- `curated_vg_tvp_bolognese` "Soya mince bolognese" — TVP; the report lists no
  vegan bolognese (§ vegan L/D = tofu stir-fry, tempeh & sweet potato, lentil/bean
  chilli, Quorn Vegan curry, seitan & noodles).

## Finding 3 — Report meals that just need an INGREDIENT swap (single pea/soy → the report's blend)

These ARE report meals (or report-sanctioned pre/post variants); only the powder is wrong:
- `curated_vg_overnight_oats` (report: "vegan protein overnight oats")
- `curated_vg_protein_pancakes` (report: "vegan protein pancakes")
- `curated_vg_sn_pea_shake_berries` (report snack: "vegan protein shake")
- `curated_vg_pre_soy_oats_banana`, `curated_vg_post_pea_oats_berries`,
  `curated_vg_post_soy_banana_shake` (pre/post variants)

## Finding 4 — Meals that ADD a powder the report's version doesn't have

The report's versions carry no protein powder; the build added one:
- `curated_vg_soy_yogurt_granola` — report: "soy yogurt + granola + berries" (no powder)
- `curated_vg_sn_soy_yogurt_pb` — report snack: "soy yogurt" (no powder)

## Finding 5 — Missing report meal

- The report's vegan L/D **"Quorn Vegan pieces curry"** is absent. The library has
  `curated_vg_chickpea_lentil_curry` "Chickpea & lentil curry" in its place (built
  from staples — chickpeas/lentils — but not the report's specified curry).

## Finding 6 — Founder ruling needed: variants beyond the report's explicit meals

The report's §B lists ~ specific meals, but Phase 2 (line 193) explicitly sanctions
*"build ~60–80 meals across all slots and the three diets using only staples."* The
library has 61 meals — i.e. it took up that expansion. Omnivore/veg expansion meals
(e.g. "Chicken & pasta", "Beef, rice & greens") are built only from report staples,
so they are report-SANCTIONED, not fabrication. **Ruling needed:** keep the
staple-built expansion, or restrict to the report's explicit meal list only?

---

## Recommended fixes (to the letter), pending approval

1. Add the report's staple **vegan protein powder (pea/soy blend)** food
   (§A line 69 macros: ~360 kcal, ~77.5 P, 5 C, 6 F); point the Finding-3 meals at it.
2. Remove the two fabricated meals (Finding 2).
3. Drop the added powder from the two Finding-4 meals to match the report.
4. Replace `chickpea_lentil_curry` with the report's **Quorn Vegan pieces curry**
   (Finding 5) — or keep it pending the Finding-6 ruling.
5. Retire the single-source `pea_protein`/`soy_protein` foods once no meal uses them
   (or keep `soy_protein` only if you want, noting soy is independently complete —
   but the report says blend).

No code changed by this audit.
