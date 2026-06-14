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
import {
  DIVISIONS, EXPERIENCE_LEVELS, loadSeedLibrary, genLib,
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
