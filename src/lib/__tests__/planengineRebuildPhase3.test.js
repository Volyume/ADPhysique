/**
 * Phase 3 benchmark, increment 0: the LIBRARY-PATH harness.
 *
 * Phases 1 and 2 were measured on the deterministic internal POOL. The live
 * app does NOT use POOL: it feeds the DB exercise library through
 * getAllExercises -> generatePoolFromLibrary -> _effectivePool. So the Phase 3
 * library work (3a corrected tagging, 3b sub-region tags, 3c division pools)
 * is only verifiable on the library path.
 *
 * This file builds that harness FIRST, per the handoff, so the re-tag work has
 * a measured before/after instead of being done blind against 87KB of seed
 * data. It asserts the structural invariants already won in Phases 1-2 STILL
 * hold on the library path (no drift, no zeros, no over-MRV, no fragments), and
 * it RECORDS the Bikini-vs-MP exercise overlap that 3c must drive under 30%.
 *
 * The < 30% overlap gate itself is NOT asserted here yet: it is the 3c
 * deliverable (division-specific pools). It lives as test.skip in the Phase 2
 * benchmark and gets un-skipped when 3c lands. This file measures the starting
 * overlap so the gap to close is on the record.
 */
import fs from 'fs';
import path from 'path';
import {
  DIVISIONS, EXPERIENCE_LEVELS, loadSeedLibrary, genLib, gen,
  measure, weeklySets, exerciseSet, overlapPct,
} from './planengineBench';

const LIBRARY = loadSeedLibrary();
const LIBRARY_NAMES = new Set(LIBRARY.map(e => e.name));

describe('Phase 3 increment 0: library-path harness is sound', () => {
  test('the seed library parsed into a usable set of exercises', () => {
    expect(LIBRARY.length).toBeGreaterThan(300);
    // Every row has the fields the engine and the pool generator read.
    for (const e of LIBRARY.slice(0, 5)) {
      expect(typeof e.name).toBe('string');
      expect(typeof e.primaryMuscle).toBe('string');
    }
  });

  test('library-path plans select only real library exercises (no drift)', () => {
    for (const [goal] of DIVISIONS) {
      const plan = genLib(goal, { days: 4 });
      const names = [...exerciseSet(plan)];
      expect(names.length).toBeGreaterThan(0);
      // POOL-fallback names are also real library names, so an unresolved name
      // means genuine drift, the bug this path guards against.
      const unresolved = names.filter(n => !LIBRARY_NAMES.has(n));
      expect(unresolved).toEqual([]);
    }
  });

  test('library path is deterministic for the same inputs', () => {
    const a = genLib('bikini', { days: 4 });
    const b = genLib('bikini', { days: 4 });
    expect([...exerciseSet(a)]).toEqual([...exerciseSet(b)]);
  });
});

describe('Phase 3 increment 0: Phase 1-2 invariants hold on the library path', () => {
  // The same no-zero / no-over-MRV / no-fragment guarantees that pass on POOL
  // must also pass on the library path, or the re-tag work would be building on
  // a path that is already broken.
  test.each(DIVISIONS.map(([g, label]) => [label, g]))(
    '%s 4-day (library path): no structural zeros, no over-MRV, no fragments',
    (_label, goal) => {
      const m = measure(genLib(goal, { days: 4 }));
      expect(m.zeros).toEqual([]);
      expect(m.overMRV).toEqual([]);
      expect(m.fragments).toEqual([]);
    });

  test('library path holds across experience levels (intermediate vs advanced)', () => {
    for (const exp of EXPERIENCE_LEVELS) {
      const m = measure(genLib('bodybuilding', { days: 5, experience: exp }));
      expect(m.zeros).toEqual([]);
      expect(m.fragments).toEqual([]);
    }
  });
});

describe('Phase 3 increment 0: division character survives the library path', () => {
  // The Phase 2 structural wins are split/lead/emphasis, which are driven by
  // the matrix and the overlay, not by which pool is in use. They must survive.
  test('Bikini and MP still have different lead lifts on the library path', () => {
    const bik = measure(genLib('bikini', { days: 4 }));
    const mp = measure(genLib('mens_physique', { days: 4 }));
    expect(bik.lead).not.toBe(mp.lead);
  });

  test('Bikini glutes are still the highest-volume muscle on the library path', () => {
    const s = weeklySets(genLib('bikini', { days: 4 }));
    const maxMuscle = Object.entries(s).sort((a, b) => b[1] - a[1])[0][0];
    expect(maxMuscle).toBe('glutes');
  });

  test('MP back >= chest on the library path', () => {
    const s = weeklySets(genLib('mens_physique', { days: 4 }));
    expect(s.back).toBeGreaterThanOrEqual(s.chest);
  });
});

// The overlap number 3c must reduce. Recorded, not gated, here.
test('record the starting Bikini-vs-MP exercise overlap (3c gate target < 30%)', () => {
  const bikLib = genLib('bikini', { days: 4 });
  const mpLib = genLib('mens_physique', { days: 4 });
  const libOverlap = overlapPct(bikLib, mpLib);
  // Sanity only: it is some fraction in [0, 1]. The < 30% target is asserted in
  // the Phase 2 benchmark (un-skipped) once 3c division pools land.
  expect(libOverlap).toBeGreaterThanOrEqual(0);
  expect(libOverlap).toBeLessThanOrEqual(1);
});

test('write phase 3 library-benchmark doc', () => {
  const out = [];
  out.push('Status: COMPLETE | Timestamp: 2026-06-01 | Phase 3 increment 0: library-path benchmark');
  out.push('');
  out.push('# planEngine rebuild, phase 3 increment 0: the library-path benchmark');
  out.push('');
  out.push('## Why this exists');
  out.push('');
  out.push('Phases 1 and 2 were measured on the deterministic internal POOL. The live');
  out.push('app does not use POOL: it feeds the DB exercise library through');
  out.push('getAllExercises, generatePoolFromLibrary and _effectivePool. The Phase 3');
  out.push('library work (3a corrected tagging, 3b sub-region tags, 3c division pools) is');
  out.push('only verifiable on the library path, so this benchmark is built first. It');
  out.push('records the starting numbers so the re-tag work has a before and after, not a');
  out.push('blind edit of 87KB of seed data.');
  out.push('');
  out.push(`Seed library parsed: ${LIBRARY.length} exercises.`);
  out.push('');
  out.push('## Library-path structural check (4-day, intermediate), all divisions');
  out.push('');
  out.push('| Division | split | lead lift | total sets | zeros | over-MRV | fragments |');
  out.push('|---|---|---|---|---|---|---|');
  for (const [goal, label] of DIVISIONS) {
    const m = measure(genLib(goal, { days: 4 }));
    out.push(`| ${label} | ${m.split} | ${m.lead} | ${m.total} | ${m.zeros.length ? m.zeros.join(',') : 'none'} | ${m.overMRV.length ? m.overMRV.join('; ') : 'none'} | ${m.fragments.length ? m.fragments.length : 'none'} |`);
  }
  out.push('');
  out.push('## POOL vs library path: same structural guarantees?');
  out.push('');
  out.push('| Division | POOL total | library total | POOL lead | library lead |');
  out.push('|---|---|---|---|---|');
  for (const [goal, label] of DIVISIONS) {
    const mp = measure(gen(goal, { days: 4 }));
    const ml = measure(genLib(goal, { days: 4 }));
    out.push(`| ${label} | ${mp.total} | ${ml.total} | ${mp.lead} | ${ml.lead} |`);
  }
  out.push('');
  out.push('## Bikini-vs-MP exercise overlap (the 3c gate target is < 30%)');
  out.push('');
  const bikLib = genLib('bikini', { days: 4 });
  const mpLib = genLib('mens_physique', { days: 4 });
  const bikPool = gen('bikini', { days: 4 });
  const mpPool = gen('mens_physique', { days: 4 });
  out.push(`- library path: ${(overlapPct(bikLib, mpLib) * 100).toFixed(0)}%`);
  out.push(`- POOL path: ${(overlapPct(bikPool, mpPool) * 100).toFixed(0)}%`);
  out.push('');
  out.push('This is the gap 3c (division-specific pools + mandated lead category +');
  out.push('restrictions) must close. The assertion lives, skipped, in the phase 2');
  out.push('benchmark and is un-skipped when 3c lands. Not relaxed, just not yet due.');
  out.push('');
  out.push('## What this increment does NOT do');
  out.push('');
  out.push('- 3a corrected muscle tagging in seedExercises.js (hip-extension primary =');
  out.push('  glutes, etc.): NOT done. This benchmark makes it measurable.');
  out.push('- 3b sub-region tags on every exercise: NOT done.');
  out.push('- 3c division-specific pools: NOT done. This is what drives the overlap down.');
  out.push('- 3e indirect volume, 3f coverage warnings, Phase 4: NOT done.');
  out.push('');
  const dest = path.join(process.cwd(), 'docs/audit/volyume-planengine-rebuild-2026-06-01/planengine-rebuild-03-library-benchmark.md');
  fs.writeFileSync(dest, out.join('\n'), 'utf8');
  expect(fs.existsSync(dest)).toBe(true);
});
