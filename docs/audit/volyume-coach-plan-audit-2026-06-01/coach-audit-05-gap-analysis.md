Status: COMPLETE | Timestamp: 2026-06-01 | Phase 5: Gap analysis

# Gap analysis: current Volyume plan generation vs elite standards

Compares the live engine (Phase 1) and its simulated output (Phase 6) against
the division research (Phase 2), exercise science (Phase 3) and weak-point
research (Phase 4). Severity: Critical / High / Medium / Low.

Numbers labelled "delivered" are the engine's week-1 placed sets from the
Phase 6 simulation (intermediate, 5 days, full gym). Elite ranges are from the
division docs (documented figures cited there; several tagged [synthesis]).

## A. Cross-cutting architecture gaps (affect every division)

| # | Finding | Current | Elite/science standard | Severity |
|---|---|---|---|---|
| X1 | Division emphasis applied to MEV (the floor), then eroded by split + time-trim | Overlay multiplies each muscle's MEV; delivery capped by structure | Emphasis must reach the plate at the division's working volume | Critical |
| X2 | Lower-body emphasis not delivered | Glutes never exceed 4 wk-1 / 5 peak in any primary plan | Bikini/Wellness glutes 16-30+; quads 10-16; hams 12-20 | Critical |
| X3 | Bikini and Wellness generate an identical plan | Same delivered volume despite different overlays | Two distinct divisions, distinct lower-body distribution | Critical |
| X4 | Weak-point specialisation replaces the division emphasis | `phase==='weak_point'` ignores `GOAL_OVERLAYS`; non-WP muscles -> MV | Additive overlay on top of division priorities with offsets | High |
| X5 | Split is division-blind | `selectSplit` keys off days+experience only | Lower-body divisions need lower-body-weighted weekly structure | High |
| X6 | Exercise selection is division-blind | Keyed off equipment/subregion/SFR, not division | Division-specific movement priorities (lateral raises, hip thrust, lengthened hams) | High |
| X7 | Glute landmark too low for physique use | `glutes` MEV 4 / MAV 10 / MRV 16 | Physique-division glutes work at 16-30 sets | High |
| X8 | `adductors` biased by no division | Absent from all overlays | Wellness/Figure/Bikini value the inner-thigh/sweep line | Medium |
| X9 | Whole-region dropout at low frequency | Beginner Bikini delivers 0 chest/arms; beginner MP 0 legs | Every region trained at least at MV | Medium |
| X10 | Rep/load not division-specific | Rep ranges by movement type only | Acceptable: science (Schoenfeld 2017) supports 5-30 reps near failure across divisions; minor division nuance only | Low |

Root cause for X1/X2/X3: `applyGoalOverlay` multiplies MEV, MEV for glutes/
hams/calves is low, and a 5-day PPL gives lower-body muscles too few sessions
and too little session time after the trim. The multiplier is real but the
anchor and the structure defeat it.

## B. Per-division gaps

### Men's Physique
Delivered: chest 8 / back 14 / shoulders 18 / quads 6 / glutes 3 / abs 2.
- Strong: upper-body bias reaches the plate (shoulders 18, back 14); legs and
  waist correctly de-emphasised. This division is the closest to correct.
- Gap: "shoulders" is a merged category, so the x1.40 SIDE-delt priority is not
  guaranteed within the shoulder allocation (exercise selection is division-
  blind). Elite MP is specifically lateral-delt and upper-lat width led
  (Rambod/FST-7, Jansen). Severity: Medium.
- Gap: no explicit upper-chest (incline) bias beyond the generic chest
  subregion rule. Medium.

### Classic Physique
Delivered: back 12 / shoulders 12 / quads 7 / calves 4 / abs 2.
- Gap: calf bias (x1.30) delivers 4 sets, identical to general; Classic calves
  are specifically judged (research: Aceto/Rambod). High.
- Gap: shoulders (12) not elevated vs general despite x1.25; overall Classic
  reads almost like general except chest/triceps. The division character is
  weak at the plate. High.
- Gap: no recognition of the height/weight-cap optimisation that defines
  Classic programming (research). The engine has no bodyweight-cap concept.
  Medium (out of pure volume scope, note for proposals).

### Open Bodybuilding (`bodybuilding`)
Delivered: chest 8 / back 12 / shoulders 12 / quads 7 / hams 4 / calves 4.
- Gap: legs under-delivered (quads 7, hams 4, calves 4) for a division judged
  on complete development; common Open weak points are rear delts, hams,
  calves (research). High.
- Note: research flags published Open volume assumes enhanced athletes; the
  app's `competitive` multiplier (x1.25) plus mesocycle peak could over-reach
  for naturals, but the 130-set cap and RIR autoregulation mitigate. Keep the
  cap. Low-Medium.

### Women's Bikini
Delivered: glutes 4 / hams 4 / quads 6 / shoulders 12 / chest 6.
- Gap: glutes 4 (peak 5) vs elite 16-30+ off-season, ~15 prep (de Silveira
  2025; Contreras glute frequency 3-6x). The single most important muscle is
  delivered at roughly a quarter of the floor of the elite range. Critical.
- Gap: indistinguishable from Wellness. Critical.
- Gap: shoulder cap (round delt, not wide) and waist/oblique restraint are not
  modelled in exercise selection. Medium.

### Women's Wellness
Delivered: glutes 4 / quads 6 / hams 4 (identical to Bikini).
- Gap: the most lower-body-dominant division delivers the same low leg volume
  as everything else. Elite: glutes 16-22 across 3-5 sessions, hams 12-18,
  quads 10-16 (research; Pannain/Mattos train legs+glutes 5x/week). Critical.
- Gap: adductors (a judged Wellness driver) biased nowhere. Medium.
- Gap: quads must clearly exceed Bikini (x1.35 vs x0.90 in the overlay) but
  delivery is identical. Critical.

### Women's Figure
Delivered: back 14 / shoulders 12 / quads 7 / glutes 2 / calves 4.
- Strong: upper-body/back bias reaches the plate (back 14), fitting the
  V-taper. Good.
- Gap: glutes 2 (lower than Bikini's 4) despite Figure's x1.25 glute bias and
  the division's developed-glute requirement. High.
- Gap: capped-delt (width) priority not expressed in exercise selection.
  Medium.

### Women's Physique
Delivered: back 14 / shoulders 12 / quads 7 / glutes 2.
- Gap: as Figure, legs/glutes under-delivered for a full-development division.
  Back bias is fine. High.

### Women's Bodybuilding (library only)
- Gap: no Coach goal exists; a woman wanting maximum development must pick the
  gender-neutral `bodybuilding` or copy the library plan. The generative Coach
  cannot produce it. Medium.

## C. Plan library gaps

The library's 8 division plans are hand-written and can encode division
character that the generator cannot (specific exercises, ordering, notes). They
are therefore likely CLOSER to elite than the generator for the lower-body
divisions, but they were not volume-audited set-by-set in this pass.

- Action for Phase 6 (proposed-plan simulation): tabulate each division library
  plan's weekly set distribution and check it against the same elite ranges.
- Known structural point: the library has Men's Bodybuilding and Women's
  Bodybuilding as separate plans, which the Coach taxonomy does not mirror.
- The library is the safer near-term route to elite division plans while the
  generator's lower-body delivery is fixed.

## D. Critical and High gaps (the list for sign-off)

Critical:
- X1 emphasis applied to the floor and eroded by structure.
- X2 lower-body volume not delivered (glutes <= 4-5).
- X3 Bikini and Wellness identical.
- Bikini glutes 4 vs 16-30+.
- Wellness leg/glute volume not delivered and not distinct from Bikini.

High:
- X4 weak-point specialisation is destructive, not additive.
- X5 split is division-blind (hurts lower-body divisions most).
- X6 exercise selection is division-blind.
- X7 glute landmark too low for physique use.
- Classic calf/leg/shoulder emphasis not delivered.
- Open legs under-delivered.
- Figure / Women's Physique glutes under-delivered.

Medium/Low: X8 adductors, X9 low-frequency dropouts, X10 rep-range nuance,
Women's Bodybuilding missing from the Coach, Classic weight-cap concept,
exercise-level division priorities (lateral raise, hip thrust, lengthened hams,
upper-chest incline).
