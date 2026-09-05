/**
 * seedRoutines.bandPlans.test.js - certification 2026-09-05, ruling F-16
 * (revised), evidence A2 / A14 in 04-TRAINING-STYLES.md.
 *
 * What this pins and why: "Bands" was a dead end. The library quiz and the
 * Bands chip both filtered on `equipment:band` and no plan carried it, and
 * the band style pool was dead code because nothing was tagged `style:band`.
 * Two band-only library plans now exist. This suite pins that they are
 * real, complete plans built from the live corpus: every exercise resolves
 * to a canonical band row, every exercise sits inside the band style pool
 * (so swaps can reach it again), every major muscle group is trained across
 * the week, the day count matches the tag, the copy is British and calm,
 * and both plans are actually reachable through LIBRARY_PLANS.
 */
const { BAND_LIBRARY_PLANS } = require('../seedRoutines.bandPlans');
const { LIBRARY_PLANS } = require('../seedRoutines');
const { CORPUS_BY_NAME } = require('../exerciseCorpus/index');
const { STYLE_POOLS, STYLE_POOL_KEYS, styleKeyFromTags } = require('../exercise/stylePools');

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() }));

const BAND_KEY = STYLE_POOL_KEYS.BAND ?? 'band';
const bandPool = STYLE_POOLS[BAND_KEY];
const allExercises = (plan) => plan.workouts.flatMap((w) => w.exercises);

describe('band library plans (F-16)', () => {
  test('two plans exist and are appended to LIBRARY_PLANS', () => {
    expect(BAND_LIBRARY_PLANS.map((p) => p.name)).toEqual(['Full Body: Bands', 'Upper/Lower: Bands']);
    for (const p of BAND_LIBRARY_PLANS) expect(LIBRARY_PLANS.some((lp) => lp.name === p.name)).toBe(true);
  });

  test('each plan has the LIBRARY_PLANS entry shape and its tags match a sibling style plan', () => {
    const sibling = LIBRARY_PLANS.find((p) => /style:kettlebell/.test(p.tags));
    expect(sibling).toBeTruthy();
    for (const p of BAND_LIBRARY_PLANS) {
      expect(Object.keys(p).sort()).toEqual(Object.keys(sibling).sort());
      expect(p.tags).toMatch(/\bequipment:band\b/);
      expect(p.tags).toMatch(/\bstyle:band\b/);
      expect(p.tags).toMatch(/\bgender:all\b/);
      expect(p.tags).toMatch(/\bgoal:build_muscle\b/);
      expect(styleKeyFromTags(p.tags)).toBe(BAND_KEY);
    }
  });

  test('the day count matches the days: tag', () => {
    for (const p of BAND_LIBRARY_PLANS) {
      const days = Number(/days:(\d+)/.exec(p.tags)[1]);
      expect(p.workouts).toHaveLength(days);
      for (const w of p.workouts) expect(w.exercises.length).toBeGreaterThanOrEqual(5);
    }
  });

  test('every exercise resolves to a live band row in the corpus', () => {
    for (const p of BAND_LIBRARY_PLANS) {
      const missing = [];
      const notBand = [];
      for (const ex of allExercises(p)) {
        const entry = CORPUS_BY_NAME.get(ex.name);
        if (!entry || entry.retiredInto) { missing.push(ex.name); continue; }
        const eq = String(entry.equipment ?? entry.equipmentCategory ?? '').toLowerCase();
        if (!eq.includes('band')) notBand.push(`${ex.name} (${eq})`);
        expect(ex.sets).toBeGreaterThan(0);
        expect(ex.repsMin).toBeLessThanOrEqual(ex.repsMax);
      }
      expect(missing).toEqual([]);
      expect(notBand).toEqual([]);
    }
  });

  test('every exercise sits inside the band style pool, so swaps can reach it again', () => {
    expect(bandPool).toBeTruthy();
    expect(bandPool.length).toBeGreaterThan(0);
    for (const p of BAND_LIBRARY_PLANS) {
      const outside = allExercises(p).map((ex) => ex.name).filter((n) => !bandPool.includes(n));
      expect(outside).toEqual([]);
    }
  });

  test('the week trains every major muscle group', () => {
    // Corpus muscle keys: chest, back, front_delts, side_delts, rear_delts,
    // quads, hamstrings, glutes, biceps, triceps, abs, ...
    const required = ['chest', 'back', 'quads', 'biceps', 'triceps'];
    const shoulders = ['front_delts', 'side_delts', 'rear_delts'];
    const lowerPosterior = ['hamstrings', 'glutes'];
    const core = ['abs'];
    for (const p of BAND_LIBRARY_PLANS) {
      const muscles = new Set();
      for (const ex of allExercises(p)) {
        const entry = CORPUS_BY_NAME.get(ex.name);
        muscles.add(String(entry.primaryMuscle).toLowerCase());
        for (const m of entry.secondaryMuscles ?? []) muscles.add(String(typeof m === 'string' ? m : m?.muscle).toLowerCase());
      }
      const uncovered = required.filter((m) => !muscles.has(m));
      if (!shoulders.some((m) => muscles.has(m))) uncovered.push('shoulders');
      if (!lowerPosterior.some((m) => muscles.has(m))) uncovered.push('hamstrings/glutes');
      if (!core.some((m) => muscles.has(m))) uncovered.push('core');
      expect({ plan: p.name, uncovered }).toEqual({ plan: p.name, uncovered: [] });
    }
  });

  test('copy is British and calm: no em dash, no kilogram increments promised', () => {
    for (const p of BAND_LIBRARY_PLANS) {
      expect(p.description).not.toMatch(/—/);
      expect(p.description).not.toMatch(/2\.5 ?kg|heavier load is suggested/i);
      for (const ex of allExercises(p)) expect(ex.notes ?? '').not.toMatch(/—/);
    }
  });
});
