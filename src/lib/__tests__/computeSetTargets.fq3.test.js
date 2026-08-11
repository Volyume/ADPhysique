/**
 * computeSetTargets.fq3.test.js — the FQ-3 dedicated test plan (D96,
 * founder ruling 2026-08-10).
 *
 * Effort truth in progression: per-set effort is unknown unless genuinely
 * known (the RIR picker is permanently removed, so it never is); the
 * previous session's post-workout difficulty rating is a SEPARATE,
 * session-level coarse evidence signal the engine consumes conservatively.
 * These tests run the REAL computeSetTargets and pin every behaviour the
 * ruling names, including the FR-C4-4 resolution (no micro-load
 * instructions on bodyweight sets).
 */
import fs from 'fs';
import path from 'path';
import { computeSetTargets } from '../algorithms';

const set = (weight, actualReps, over = {}) => ({ weight, actualReps, setType: 'straight', ...over });
const run = (sets, opts = {}) => computeSetTargets(sets, 8, 12, 'kg', opts);

describe('FQ-3: no fabricated per-set effort evidence', () => {
  test('the logger default is null effort, and no surface converts session difficulty into per-set RIR', () => {
    const stripComments = (src) => src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const screen = stripComments(fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'ActiveWorkoutScreen.js'), 'utf8'));
    expect(screen).toMatch(/rir: null \}/);
    expect(screen).not.toMatch(/rir: 2/);
    // The engine reads the rating as a session-level option, never writes it
    // onto sets.
    const engine = fs.readFileSync(path.join(__dirname, '..', 'algorithms.js'), 'utf8');
    expect(engine).toMatch(/prevSessionDifficulty/);
    expect(engine).not.toMatch(/rir\s*=\s*prevSessionDifficulty|rir:\s*prevSessionDifficulty/);
  });

  test('the per-set RIR picker stays removed (D14/D19)', () => {
    const entry = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'SetEntry.js'), 'utf8');
    expect(entry).not.toMatch(/rirPicker|RIR picker|setRir\(/);
  });
});

describe('FQ-3: rep progression continues from performance evidence alone', () => {
  test('an in-range set adds a rep with no effort evidence at all', () => {
    const { targets } = run([set(60, 10)]);
    expect(targets[0].action).toBe('add_rep');
    expect(targets[0].weight).toBe(60);
  });
});

describe('FQ-3: top-of-band load progression needs session-level corroboration', () => {
  test('supported (difficulty 2, easy): load increases, capped as before', () => {
    const { targets } = run([set(60, 12)], { prevSessionDifficulty: 2 });
    expect(targets[0].action).toBe('increase');
    expect(targets[0].weight).toBeGreaterThan(60);
  });

  test('moderate (difficulty 3) also corroborates', () => {
    const { targets } = run([set(60, 12)], { prevSessionDifficulty: 3 });
    expect(targets[0].action).toBe('increase');
  });

  test('very hard (difficulty 4 and 5): the load holds', () => {
    for (const sd of [4, 5]) {
      const { targets, reason } = run([set(60, 12)], { prevSessionDifficulty: sd });
      expect(targets[0].action).toBe('maintain');
      expect(targets[0].weight).toBe(60);
      expect(reason).toMatch(/hard one/);
    }
  });

  test('skipped rating (null): conservative hold with the founder-approved copy, never a log-RIR instruction', () => {
    const { targets, reason } = run([set(60, 12)], { prevSessionDifficulty: null });
    expect(targets[0].action).toBe('maintain');
    expect(targets[0].weight).toBe(60);
    expect(reason).toBe("You've topped the range. Add weight when you're ready.");
    expect(reason).not.toMatch(/RIR|left in the tank|note how many/i);
  });
});

describe('FQ-3 resolves FR-C4-4: bodyweight sets never receive micro-load instructions', () => {
  test('a topped bodyweight set with supporting effort holds at zero load, with honest copy', () => {
    const { targets, reason } = run([set(0, 12)], { prevSessionDifficulty: 2 });
    expect(targets[0].action).toBe('maintain');
    expect(targets[0].weight).toBe(0);
    expect(reason).toMatch(/harder variation|Add reps/);
    expect(reason).not.toMatch(/0\.25|kg next/);
  });

  test('a topped bodyweight set with unknown effort also holds at zero load', () => {
    const { targets } = run([set(0, 12)]);
    expect(targets[0].action).toBe('maintain');
    expect(targets[0].weight).toBe(0);
  });
});

describe('FQ-3: determinism', () => {
  test('identical inputs produce identical outputs', () => {
    const sets = [set(60, 12), set(60, 11), set(0, 12)];
    const a = run(sets, { prevSessionDifficulty: 3, prevPrevSets: [set(60, 12)] });
    const b = run(sets, { prevSessionDifficulty: 3, prevPrevSets: [set(60, 12)] });
    expect(a).toEqual(b);
  });
});

describe('FQ-3: legacy per-set rir values no longer drive the overload decision', () => {
  test('a stored rir of 2 (the old fabricated stamp) grants no headroom on its own', () => {
    const { targets } = run([set(60, 12, { rir: 2 })], { prevSessionDifficulty: null });
    expect(targets[0].action).toBe('maintain');
  });

  test('and a stored rir of 0 cannot veto a session that genuinely supported progression', () => {
    const { targets } = run([set(60, 12, { rir: 0 })], { prevSessionDifficulty: 2 });
    expect(targets[0].action).toBe('increase');
  });
});
