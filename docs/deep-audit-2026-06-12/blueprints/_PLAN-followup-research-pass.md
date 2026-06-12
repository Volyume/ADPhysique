# Planned follow-up research pass — meal-plan deep-dive round 2 (founder-requested)

Founder (2026-06-12): the coach spreadsheet arrived after the first research wave
and "likely gave you extra to research on" — run an extra research pass once
everything is in. Launch when `bp-meal-plan-coach-systems-research.md` lands, so
round 2 builds on round 1 + the spreadsheet extract without duplication.

## Scope — the spreadsheet-raised topics round 1 didn't explicitly cover
1. **Training-day vs non-training-day plans / macro carb-cycling** — how coaches
   and apps structure TD/NTD calorie+carb splits (and how Volyume's existing
   carb-cycle/refeed engine should drive two plan variants); evidence base.
2. **Peri-workout meal structure** — pre/intra/post-workout meal conventions in
   physique coaching (intra = EAA/creatine etc.), how apps model nutrient timing,
   and what's worth encoding vs over-engineering (evidence on timing materiality).
3. **Curated-switch calibration** — how coaches calibrate the portion on a named
   switch (Rice 125g → Pasta 50g): matched-macro maths vs convention; tolerance
   norms (how close is "holds the macros"); whether real coaches match per-macro
   or per-calorie.
4. **Per-food constraint rules** — "any cereal <4g fat/100g"-style swap rules:
   common constraint patterns coaches attach to swaps (fat ceilings on carb picks,
   sugar limits, fibre minimums) worth modelling as structured rules.
5. **Presentation conventions** — calories-per-macro day summaries (e.g. 3392 =
   1188P + 1412C + 792F), water targets on the plan, meal notes/cues; what an
   "elite-looking" plan presentation contains vs a simplified beginner view.
6. **Supplements-in-plan** — how plans embed supplement line items (creatine, EAA)
   without macro impact; whether Volyume's plan should display a supplement row
   (Volyume has a Supplements concept? verify in code) — scope carefully, no PED
   territory ever.
7. **Cross-check round-1 conclusions** against the spreadsheet realities and flag
   any divergence (e.g. greedy assembler vs how the coach actually balanced meals).

## Output
`docs/deep-audit-2026-06-12/blueprints/bp-meal-plan-research-round2.md`, and a
reconciliation edit-list for `bp-meal-plan-generator.md` (what to change/add).
</content>
