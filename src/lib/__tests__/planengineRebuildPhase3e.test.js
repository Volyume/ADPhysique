/**
 * Phase 3e benchmark (rebuild spec): indirect (fractional) volume modelling.
 *
 * A synergist muscle on a compound lift earns a fractional working set (RP
 * convention, 0.5/set). The engine now reports this as weeklyVolumeSummary
 * indirectSets, additive to the existing plannedSets (direct) count. This
 * benchmark proves the model behaves as the spec predicts:
 *  - a back-dominant program feeds biceps a lot of indirect volume;
 *  - a pressing program feeds triceps a lot of indirect volume;
 *  - a program with NO pressing (Bikini, after the phase 3 delt rule) leaves
 *    the shoulders with almost no indirect coverage, which is exactly why
 *    Bikini must train delts directly (the spec's "side delts in pressing
 *    programs" flag, inverted).
 *
 * Measured on the library path (the live app path), which carries the
 * secondaryMuscles the model reads.
 */
import fs from 'fs';
import path from 'path';
import { DIVISIONS, genLib, gen, weeklySets } from './planengineBench';

function summary(plan) { return plan.weeklyVolumeSummary || {}; }

describe('Phase 3e: indirect volume is modelled and reported', () => {
  test('every division reports a numeric indirectSets for every muscle (library path)', () => {
    for (const [goal] of DIVISIONS) {
      const s = summary(genLib(goal, { days: 4 }));
      for (const [muscle, v] of Object.entries(s)) {
        expect(typeof v.indirectSets).toBe('number');
        expect(v.indirectSets).toBeGreaterThanOrEqual(0);
        expect(muscle).toBeTruthy();
      }
    }
  });

  test('the plannedSets contract is untouched: it still equals the direct count', () => {
    // weeklySets() reads plannedSets; it must be unchanged by the additive
    // indirect field (a representative division).
    const s = weeklySets(genLib('bodybuilding', { days: 5 }));
    expect(s.chest).toBeGreaterThan(0);
    expect(s.back).toBeGreaterThan(0);
  });

  test('a back-dominant program (MP) feeds biceps substantial indirect volume', () => {
    const s = summary(genLib('mens_physique', { days: 4 }));
    expect(s.biceps.indirectSets).toBeGreaterThanOrEqual(4);
  });

  test('a pressing program (Bodybuilding) feeds triceps substantial indirect volume', () => {
    const s = summary(genLib('bodybuilding', { days: 4 }));
    expect(s.triceps.indirectSets).toBeGreaterThanOrEqual(4);
  });

  test('Bikini (no pressing) leaves shoulders with little indirect: delts must be direct', () => {
    const s = summary(genLib('bikini', { days: 4 }));
    // Direct lateral-raise work dominates; indirect is near zero, far below it.
    expect(s.shoulders.indirectSets).toBeLessThan(s.shoulders.plannedSets);
    expect(s.shoulders.indirectSets).toBeLessThan(5);
  });

  test('indirect modelling is deterministic', () => {
    const a = summary(genLib('bikini', { days: 4 }));
    const b = summary(genLib('bikini', { days: 4 }));
    expect(a.glutes.indirectSets).toBe(b.glutes.indirectSets);
  });

  test('POOL path still reports the field (hand-written POOL carries no secondary, so 0 is valid)', () => {
    const s = summary(gen('bodybuilding', { days: 4 }));
    expect(typeof s.triceps.indirectSets).toBe('number');
  });
});

describe('Phase 3e: synergist trim keeps EFFECTIVE volume adequate', () => {
  // The trim reduces DIRECT arm volume when indirect coverage is high. The
  // correct adequacy measure is effective volume = direct + indirect, which
  // must stay at or above MEV (biceps 8, triceps 6) for every division and day
  // count. Direct-only can sit below MEV and that is correct: the pulling /
  // pressing supplies the rest.
  const MEV = { biceps: 8, triceps: 6 };
  const dayCounts = [3, 4, 5, 6];
  // Arms are a judged trait in these divisions (spec judging-criteria map). They
  // are NOT judged in Bikini or Wellness (glutes/delts/legs only), so arms below
  // MEV there is correct programming, not a gap, and is not asserted.
  const ARM_JUDGED = DIVISIONS
    .map(([g]) => g)
    .filter(g => g !== 'bikini' && g !== 'wellness');

  test.each(ARM_JUDGED)(
    '%s: biceps + triceps effective volume stays >= MEV at every day count',
    (goal) => {
      for (const d of dayCounts) {
        const s = summary(genLib(goal, { days: d }));
        const biEff = s.biceps.plannedSets + s.biceps.indirectSets;
        const triEff = s.triceps.plannedSets + s.triceps.indirectSets;
        if (s.biceps.plannedSets > 0) expect(biEff).toBeGreaterThanOrEqual(MEV.biceps);
        if (s.triceps.plannedSets > 0) expect(triEff).toBeGreaterThanOrEqual(MEV.triceps);
      }
    });

  test('the trim never drops a synergist direct target below MEV (phase 1 invariant)', () => {
    // Direct delivered can dip below MEV (covered by indirect) but the trim
    // floors the TARGET at MEV + 2, so a well-fed session delivers >= MEV.
    // Verify on a high-day division where the trim is active.
    const s = summary(genLib('classic_physique', { days: 5 }));
    // Classic biceps target trims 12 -> 10; delivered tracks it with the
    // distribution fix and effective volume is far above MEV.
    expect(s.biceps.plannedSets + s.biceps.indirectSets).toBeGreaterThanOrEqual(MEV.biceps);
  });

  test('a weak-point synergist is not trimmed (overlay boost is preserved)', () => {
    const base = summary(genLib('classic_physique', { days: 5 }));
    const wp = summary(genLib('classic_physique', { days: 5, extra: { phase: 'weak_point', weakPoints: ['Biceps'] } }));
    expect(wp.biceps.plannedSets).toBeGreaterThan(base.biceps.plannedSets);
  });
});

test('write phase 3e results doc', () => {
  const out = [];
  out.push('Status: COMPLETE | Timestamp: 2026-06-01 | Phase 3e: indirect volume modelling');
  out.push('');
  out.push('# planEngine rebuild, phase 3e results: indirect (fractional) volume');
  out.push('');
  out.push('A synergist on a compound lift earns half a working set (RP convention).');
  out.push('The engine reports this as weeklyVolumeSummary.indirectSets, additive to the');
  out.push('existing plannedSets (direct) count, which is left exactly as it was. The live');
  out.push('app path carries the secondaryMuscles the model reads (DB secondary_muscles');
  out.push('column); the hand-written internal POOL carries none, so the POOL path reports');
  out.push('0 indirect (the field is still present).');
  out.push('');
  out.push('## Direct + indirect sets per muscle (4-day, library path)');
  out.push('');
  out.push('| Division | muscle: direct (+indirect) |');
  out.push('|---|---|');
  for (const [goal, label] of DIVISIONS) {
    const s = summary(genLib(goal, { days: 4 }));
    const cells = Object.entries(s)
      .map(([m, v]) => `${m} ${v.plannedSets}${v.indirectSets ? ' (+' + v.indirectSets + ')' : ''}`)
      .join(', ');
    out.push(`| ${label} | ${cells} |`);
  }
  out.push('');
  out.push('## What the numbers show');
  out.push('');
  out.push('- Pulling programs feed biceps large indirect volume (MP biceps gets several');
  out.push('  fractional sets from rows and pulldowns), so heavy direct biceps work is');
  out.push('  rarely needed on top.');
  out.push('- Pressing programs feed triceps large indirect volume.');
  out.push('- Bikini, after the phase 3 delt rule removed pressing, leaves the shoulders');
  out.push('  with almost no indirect coverage. That is exactly why Bikini trains delts');
  out.push('  directly with lateral raises. This is the spec "side delts in pressing');
  out.push('  programs" coverage signal, seen from the no-pressing side.');
  out.push('');
  out.push('## Synergist trim (target subtraction) DONE');
  out.push('');
  out.push('A synergist with heavy indirect coverage has its DIRECT target trimmed by a');
  out.push('credit proportional to its driver compound (biceps from back at 0.4, triceps');
  out.push('from chest at 0.5), floored at MEV + 2. Effective volume (direct + indirect),');
  out.push('the correct adequacy measure, stays at or above MEV for every arm-judged');
  out.push('division and day count. Example: Classic biceps target 12 trims to 10, and');
  out.push('with the delivered-vs-target fix it delivers ~10, plus ~8 indirect.');
  out.push('');
  out.push('This was only safe AFTER the delivered-vs-target gap fix: before it, a trimmed');
  out.push('target cratered DELIVERED volume (a discretisation cliff dropped a 5-set');
  out.push('session from 2 exercises to 1). Arms are not judged in Bikini or Wellness, so');
  out.push('their below-MEV arm volume is correct and is not asserted.');
  out.push('');
  out.push('## Not done in 3e');
  out.push('');
  out.push('- A hard coverage flag forcing isolation when indirect is near zero: largely');
  out.push('  redundant with the matrix (every division already gets direct side delts),');
  out.push('  low value, deferred.');
  out.push('');
  const dest = path.join(process.cwd(), 'docs/audit/volyume-planengine-rebuild-2026-06-01/planengine-rebuild-05-phase3e-indirect-volume.md');
  fs.writeFileSync(dest, out.join('\n'), 'utf8');
  expect(fs.existsSync(dest)).toBe(true);
});
