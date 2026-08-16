/**
 * Campaign 21 Step 7 — restraint validation suite.
 *
 * Volyume's coaching engine evolves continually: the weekly coach observes,
 * learns, and adapts. But RESTRAINT is the law. Where evidence is immature,
 * where data is absent, where the threshold is unmet, where prior choices hold
 * weight — the engine MUST hold its ground and not change. This suite pins the
 * restraint law (ORACLE-LOCK.md: "VOLYUME CONTINUALLY EVALUATES, IT DOES NOT
 * CONTINUALLY CHANGE") with a named home: 34 scenarios tagged `restraint: true`
 * across conflict/training/liveSet/recovery/nutrition families, each proving one
 * mechanism by which the coach preserves athlete autonomy and evidence maturity
 * over reactive adjustment. A failure here names the restraint id and signals
 * the boundary where change was wrongly offered.
 *
 * ── Restraint scenario ledger (scenario id: what it holds) ──────────────────
 *
 * LSO-03    | FIRST_TIME_BAND with no startingWeight yields null weight
 * LSO-05    | Ordinary carry-forward in-band log holds load (no false progression)
 * LSO-06    | Rep progression beat rule applies only once per rise (no stacking)
 * LSO-14    | Overshoot add fires once only per rise, second +2 held
 * LSO-18    | Insufficient back-off evidence (single session) is held
 * LSO-22    | Outlier shown in reference but never learnt from
 * LSO-25    | Layoff <=7d does not apply the 0.9 cap multiplier
 * LSO-26    | Block-finished caps load without the 0.9 multiplier
 * LSO-29    | Noise floor (±2 reps) held at same load/reps
 * NUT-06    | Missing bodyweight forces phaseAdj=0 on a deficit cut
 * NUT-14    | Target already at/above maintenance is held (no raise)
 * NUT-17    | Below MIN_POINTS=14 weight data refused for adaptive sizing
 * NUT-24    | One week short of 8-week threshold, diet break not suggested
 * NUT-25    | No stored memo resolves to formula prior (base case hold)
 * NUT-29    | Memo failing ANY validity check (foodDaysLogged<5) rejected
 * NUT-30    | Invalid memo forces fallback to formula branch
 * NUT-31    | foodDaysLogged<5 holds derivation, no adoption
 * NUT-32    | adaptiveObservation.confidence!='high' holds learning
 * NUT-34    | confounded=true holds memo derivation entirely
 * NUT-35    | ONE DAILY TRUTH: unbanked targets held unchanged
 * NUT-37    | Banking refused when ANY day below floorKcal
 * NUT-38    | Requested bump <50kcal treated as presentation noise, refused
 * NUT-46    | Below weigh-in evidence bar (4+ days), early-return hold
 * NUT-47    | Session adherence <50% holds calorie/volume changes
 * NUT-48    | Unknown session denominator (<=0) routes to 0 (stabilise/hold)
 * NUT-54    | Bulker eating under target with no gain is undisproved (held)
 * NUT-55    | Failed intake read holds proposed cut (no floor-blind proceed)
 * NUT-56    | Stable-on-stable holds the generic on-target branch
 * NUT-58    | Recent unjudged calorie change blocks reversal (same-day hold)
 * REC-02    | Average readiness (intent='average') held at 0 change
 * REC-03    | Sharp readiness held at 0 change plus explicit acknowledgement
 * REC-04    | Null intent (no answer given) held to null (no fabrication)
 * REC-13    | Default accumulation: neither recovery-week nor adaptive-deload fires
 * REC-14    | awaitingDecision=true held to null (no lighter-training claim)
 * TRN-06    | performance===3 collapses to hold regardless of recovery grade
 * TRN-25    | Still-progressing exercise held against novelty rotation
 * TRN-51    | Missing REQUIRED signal (soreness/performance null) held
 * TRN-59    | Stale feedback (>14d) certifies nothing, held
 * TRN-73    | Below REPEATED_SWAP_MIN=3 swaps, no offer is made
 *
 * ───────────────────────────────────────────────────────────────────────────
 */

import { SCENARIOS as CONFLICT_SCENARIOS } from './scenarios.conflict.data';
import { SCENARIOS as TRAINING_SCENARIOS } from './scenarios.training.data';
import { SCENARIOS as LIVESET_SCENARIOS } from './scenarios.liveset.data';
import { SCENARIOS as RECOVERY_SCENARIOS } from './scenarios.recovery.data';
import { SCENARIOS as NUTRITION_SCENARIOS } from './scenarios.nutrition.data';
import { runScenarios } from './harness';

describe('Step 7: Volyume continually evaluates, it does not continually change', () => {
  // Aggregate all restraint scenarios across families
  const allScenarios = [
    ...CONFLICT_SCENARIOS,
    ...TRAINING_SCENARIOS,
    ...LIVESET_SCENARIOS,
    ...RECOVERY_SCENARIOS,
    ...NUTRITION_SCENARIOS,
  ];

  const restraintScenarios = allScenarios.filter((s) => s.restraint === true);

  // Run all restraint scenarios through the harness
  runScenarios(restraintScenarios);

  // Verify restraint-law coverage: minimum 25 scenarios required
  test('restraint suite contains at least 25 scenarios (law preservation bar)', () => {
    expect(restraintScenarios.length).toBeGreaterThanOrEqual(25);
  });

  // Verify each restraint scenario has either a negation (mustNot) or explicit assertions
  test('every restraint scenario has assertions (guardpost or hold value)', () => {
    const violations = restraintScenarios
      .filter((scenario) => {
        // A valid restraint scenario must have at least one of:
        // 1. mustNot list (forbids certain outcomes), OR
        // 2. must list (pins specific expected outcomes, which by restraint definition should be holds)
        const hasMustNot = scenario.mustNot && scenario.mustNot.length > 0;
        const hasMust = scenario.must && scenario.must.length > 0;
        return !hasMustNot && !hasMust;
      })
      .map((s) => s.id);

    expect(violations).toEqual(
      [],
      `The following restraint scenarios lack assertions entirely (both mustNot and must are empty/absent). ` +
        `Each restraint scenario must pin the held outcome through either must (explicit hold value) or mustNot (forbid change). ` +
        `Violations: ${violations.join(', ')}`
    );
  });

  // Audit: report restraint count by family
  test('restraint scenarios by family', () => {
    const byFamily = {
      conflict: CONFLICT_SCENARIOS.filter((s) => s.restraint === true).length,
      training: TRAINING_SCENARIOS.filter((s) => s.restraint === true).length,
      liveset: LIVESET_SCENARIOS.filter((s) => s.restraint === true).length,
      recovery: RECOVERY_SCENARIOS.filter((s) => s.restraint === true).length,
      nutrition: NUTRITION_SCENARIOS.filter((s) => s.restraint === true).length,
    };
    const total = Object.values(byFamily).reduce((a, b) => a + b, 0);

    console.log(`\n━━ Restraint coverage audit ━━`);
    console.log(`Conflict:  ${byFamily.conflict} scenarios`);
    console.log(`Training:  ${byFamily.training} scenarios`);
    console.log(`LiveSet:   ${byFamily.liveset} scenarios`);
    console.log(`Recovery:  ${byFamily.recovery} scenarios`);
    console.log(`Nutrition: ${byFamily.nutrition} scenarios`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Total:     ${total} scenarios (minimum required: 25)`);

    expect(total).toBeGreaterThanOrEqual(25);
  });
});
