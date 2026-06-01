Status: COMPLETE | Timestamp: 2026-06-01 | Phase 3: division pools, glute + quad splits, overlap gate

# planEngine rebuild, phase 3 results: exercise intelligence

This is the phase the spec calls "exercise intelligence": division-specific
pools with sub-region tags, anti-redundancy and lead-lift rules. It was built
on the library-path benchmark (doc 03), so every number below is measured on
the live app path (the 475-exercise seed library), not the internal POOL.

## What landed, in commit order

1. Library-path benchmark (the harness everything else is verified on).
2. Division pool restrictions (DIVISION_POOL_RULES, the spec's HARD pool rules).
3. Glute Contreras split-by-type (activator / stretcher / pumper).
4. Quad sweep vs mass split + Classic/Wellness sweep mandate.
5. Bikini delt rule (round delts via laterals) + overhead-press tagging fix +
   the overlap gate un-skipped at the founder-set threshold.

## Division pool rules (spec-attributed, not judgement calls)

DIVISION_POOL_RULES in planEngine.js, applied in filterPool with a starve-guard
(if a rule would empty a pool it falls back; a single survivor is kept for a
de-emphasised muscle, and the no-zero / no-fragment benchmarks guard coverage):

- Bikini back drops horizontal_row : width, not heavy traps/rows (spec L152).
- Bikini quads + chest drop heavy_compound : shape-only legs, never bench.
- Bikini side + front delts drop overhead press : round delts via lateral
  raises (spec L152).
- Men's Physique quads drop heavy_compound : legs are maintenance only (L116).

## Sub-region tags added

- Glutes, Contreras split (spec L152, L156-159): activator (peak-contraction
  hip-thrust family), stretcher (loaded-lengthened hinge/lunge), pumper
  (abduction / kickback). All 36 library glute exercises tagged. SUBREGION
  requirement: glutes >= 16 weekly spread across activator + pumper, so a
  glute-led week is not three hip thrusts. MEASURED: 4-day Bikini and Wellness
  glutes span activator AND pumper on the library path.
- Quads, sweep vs mass (spec L128, L164): 11 sweep-biased library lifts tagged
  (hack, front squat, sissy, cyclist, Spanish, heel-elevated, leg extension,
  narrow leg press, pendulum, TKE); untagged squat patterns are mass (vasti).
  Classic + Wellness quads biased to sweep; SUBREGION requirement spreads
  sweep + mass once quad volume is emphasis-level (>= 14). MEASURED: Classic
  leads quads with Front Squat (sweep); Bodybuilding stays Back Squat (mass).
- Overhead-press tagging fix: several delt presses (side-delt-primary) were
  untagged and defaulted to 'side', i.e. a shoulder press read as a lateral
  raise. Tagged them overhead_press and added the side_delts translation
  (overhead_press -> press) so a press is never mistaken for a lateral.

## The overlap gate, and the founder decision

The spec's gate: a 4-day Bikini and a 4-day MP plan share < 30% of exercises.

Measured on the library path:
- before phase 3: 65%
- after the pool rules + delt fix: 48%

The gate is set at < 50%, not the literal < 30%. The floor analysis: the
residual ~48% is genuinely shared programming, lat-width pulldowns, lateral
raises, rear-delt work, RDL/Nordic hamstrings, ab work, that BOTH divisions
correctly want. Driving it under 30% would force different specific lifts for
shared goals, the "excessive, random variation" the spec's own Kassiano (2022)
citation warns against. So each division is made spec-correct (different split,
lead, emphasis, and now pool) and the gate reflects the honest measured floor.

The remaining shared lifts after phase 3 (library path, 11 of 23):
Barbell Hip Thrust, Romanian Deadlift, Nordic Curl, Cable Crunch, Dumbbell
Lateral Raise, Cable Lateral Raise, Lat Pulldown (Wide), Face Pull, Dumbbell
Rear Delt Fly, Bulgarian Split Squat, Lat Pulldown (Close). All are legitimate
for both a glute-led and a V-taper physique.

## What is NOT done in phase 3

- 3a full library muscle-tagging audit (hip-extension primary = glutes across
  the whole 87KB): the glute and quad type tags landed; a full primary-muscle
  re-audit is still open. The POOL is correct; this is library hygiene.
- 3e indirect / fractional volume modelling (secondary contributions subtracted
  from direct targets; flag near-zero indirect coverage). MP glutes still take
  a direct hip thrust at maintenance because the engine models direct sets;
  fractional accounting is the cleaner fix and is 3e.
- 3f coverage warnings scoped to split type (lives in the app's session layer,
  outside planEngine.js).
- Phase 4 autoregulation (weak-point cap-flex, double progression, mesocycle
  rotation, deload trigger).
