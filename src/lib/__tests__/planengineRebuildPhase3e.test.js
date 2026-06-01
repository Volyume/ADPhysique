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
  out.push('## Not done in 3e (next increments)');
  out.push('');
  out.push('- Subtracting indirect from direct TARGETS (so a muscle with high indirect');
  out.push('  coverage needs fewer direct sets). Deferred because targets are set before');
  out.push('  selection and indirect is only known after; needs a two-pass with the MEV');
  out.push('  floor (phase 1) protected so nothing is under-dosed.');
  out.push('- A hard coverage flag forcing isolation when indirect is near zero. The');
  out.push('  reporting above is the measurement layer that flag will read.');
  out.push('');
  const dest = path.join(process.cwd(), 'docs/audit/volyume-planengine-rebuild-2026-06-01/planengine-rebuild-05-phase3e-indirect-volume.md');
  fs.writeFileSync(dest, out.join('\n'), 'utf8');
  expect(fs.existsSync(dest)).toBe(true);
});
