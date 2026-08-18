/**
 * loadSemantics.test.js — D107-2 load semantics (LOAD-SEMANTICS-SPEC).
 *
 * What these pin, against the REAL engine:
 *   - tonnage: per_hand counts weight x 2 x reps; assisted contributes
 *     NOTHING (counting bodyweight minus assistance would pull the user's
 *     bodyweight into training analytics - ED-adjacent, spec v1 law);
 *     total / added_bodyweight / unmapped are byte-identical to before.
 *   - detectPR: the assisted branch INVERTS - a PR fires on LOWER
 *     assistance at no fewer reps, never on heavier assistance, and no 1RM
 *     estimate is fabricated from an assistance number. per_hand compares
 *     like with like on the entered number, unchanged.
 *   - buildRecordLine agrees with detectPR on the assisted branch (the D87
 *     contract: the line must never promise a record the log withholds).
 *   - the seed derivation classifies the canonical spot-check rows the
 *     spec names, and existing/unknown rows default 'total'.
 *   - source guard: no tonnage path reads bodyweight, ever.
 */
import {
  calculateTonnage, summariseWorkoutSets, detectPR, buildLoadSemanticsById,
  loadMultiplierFor,
} from '../algorithms';
import { buildRecordLine } from '../workoutRecordLine';
import { deriveLoadSemantics } from '../seedExercises';

const fs = require('fs');
const path = require('path');

const set = (weight, reps, exerciseId = 'ex') => ({ weight, actualReps: reps, exerciseId, setType: 'straight' });

describe('tonnage per load semantics', () => {
  test('per_hand counts weight x 2 x reps (the dumbbell device-checklist case: 20 kg -> 40 kg per rep)', () => {
    const sets = [set(20, 10, 'db-press')];
    expect(calculateTonnage(sets, null, { 'db-press': 'per_hand' })).toBe(400);
    // Unmapped, the same set counts single - the pre-semantics behaviour.
    expect(calculateTonnage(sets)).toBe(200);
  });

  test('assisted contributes NOTHING to tonnage (no bodyweight coupling, ED law)', () => {
    const sets = [set(25, 8, 'assisted-pullup'), set(100, 5, 'bench')];
    const map = { 'assisted-pullup': 'assisted', bench: 'total' };
    expect(calculateTonnage(sets, null, map)).toBe(500);
  });

  test('total and added_bodyweight count exactly as entered', () => {
    const sets = [set(100, 5, 'bench'), set(20, 6, 'weighted-dip')];
    const map = { bench: 'total', 'weighted-dip': 'added_bodyweight' };
    expect(calculateTonnage(sets, null, map)).toBe(500 + 120);
  });

  test('summariseWorkoutSets threads the semantics map through to tonnage', () => {
    const sets = [set(20, 10, 'db-press')];
    expect(summariseWorkoutSets(sets, { loadSemanticsById: { 'db-press': 'per_hand' } }).tonnage).toBe(400);
    expect(summariseWorkoutSets(sets).tonnage).toBe(200);
  });

  test('loadMultiplierFor is the single mapping: per_hand 2, assisted 0, everything else 1', () => {
    expect(loadMultiplierFor('per_hand')).toBe(2);
    expect(loadMultiplierFor('assisted')).toBe(0);
    expect(loadMultiplierFor('total')).toBe(1);
    expect(loadMultiplierFor('added_bodyweight')).toBe(1);
    expect(loadMultiplierFor(undefined)).toBe(1);
  });

  test('buildLoadSemanticsById reads camel and snake rows, defaulting total', () => {
    const map = buildLoadSemanticsById([
      { id: 'a', loadSemantics: 'per_hand' },
      { id: 'b', load_semantics: 'assisted' },
      { id: 'c' },
    ]);
    expect(map).toEqual({ a: 'per_hand', b: 'assisted', c: 'total' });
  });
});

describe('detectPR: the assisted inversion', () => {
  const assisted = { loadSemantics: 'assisted' };
  const history = [
    { weight: 30, actualReps: 8 },
    { weight: 25, actualReps: 6 },
  ];

  test('a PR fires on LOWER assistance at no fewer reps', () => {
    const prs = detectPR({ weight: 20, actualReps: 6 }, history, assisted, 'kg');
    expect(prs.map(p => p.type)).toEqual(['least_assistance']);
    expect(prs[0].previousValue).toBe(25);
    expect(prs[0].label).toContain('assistance');
  });

  test('heavier assistance is NEVER a PR, and no 1RM estimate is fabricated', () => {
    const prs = detectPR({ weight: 40, actualReps: 12 }, history, assisted, 'kg');
    expect(prs.find(p => p.type === 'heaviest_weight')).toBeUndefined();
    expect(prs.find(p => p.type === '1rm_estimate')).toBeUndefined();
    expect(prs.find(p => p.type === 'least_assistance')).toBeUndefined();
  });

  test('lower assistance with FEWER reps than the best does not fire (>= reps, per spec)', () => {
    const prs = detectPR({ weight: 20, actualReps: 4 }, history, assisted, 'kg');
    expect(prs.find(p => p.type === 'least_assistance')).toBeUndefined();
  });

  test('more reps at the SAME assistance stays a record, named against the assistance', () => {
    const prs = detectPR({ weight: 25, actualReps: 9 }, history, assisted, 'kg');
    expect(prs.map(p => p.type)).toEqual(['most_reps_at_weight']);
    expect(prs[0].label).toContain('assistance');
  });

  test('a first-ever assisted set claims nothing (no history, no record)', () => {
    expect(detectPR({ weight: 20, actualReps: 8 }, [], assisted, 'kg')).toEqual([]);
  });

  test('per_hand compares like with like on the entered number - behaviour unchanged', () => {
    const perHand = { loadSemantics: 'per_hand' };
    const prs = detectPR({ weight: 32, actualReps: 8 }, [{ weight: 30, actualReps: 8 }], perHand, 'kg');
    expect(prs.map(p => p.type)).toEqual(expect.arrayContaining(['heaviest_weight']));
  });
});

describe('buildRecordLine agrees with detectPR on the assisted branch (D87)', () => {
  const history = [{ weight: 30, actualReps: 8, setType: 'straight' }, { weight: 25, actualReps: 6, setType: 'straight' }];

  test('the bar to beat is the LOWEST assistance, labelled as assistance', () => {
    const line = buildRecordLine({
      weight: 0, reps: 0, historySets: history, units: 'kg', loadSemantics: 'assisted',
    });
    expect(line.bestLabel).toBe('Best 25kg assistance × 6');
  });

  test('the line flags exactly when detectPR would award (lower assistance, >= reps)', () => {
    const flag = buildRecordLine({
      weight: 20, reps: 6, historySets: history, units: 'kg', loadSemantics: 'assisted',
    });
    expect(flag.isRecord).toBe(true);
    expect(flag.reasons.join(' ')).toContain('Least assistance');
    const noFlag = buildRecordLine({
      weight: 40, reps: 12, historySets: history, units: 'kg', loadSemantics: 'assisted',
    });
    expect(noFlag.isRecord).toBe(false);
  });
});

describe('seed derivation spot checks (canonical classification)', () => {
  test('two-implement dumbbell work is per_hand', () => {
    expect(deriveLoadSemantics({ name: 'Dumbbell Bench Press', equipment: 'dumbbell', exerciseType: 'weight_reps' })).toBe('per_hand');
    expect(deriveLoadSemantics({ name: 'Dumbbell Lateral Raise', equipment: 'dumbbell', exerciseType: 'weight_reps' })).toBe('per_hand');
  });

  test('single-implement dumbbell/kettlebell movements stay total', () => {
    expect(deriveLoadSemantics({ name: 'Goblet Squat', equipment: 'dumbbell', exerciseType: 'weight_reps' })).toBe('total');
    expect(deriveLoadSemantics({ name: 'Kettlebell Swing', equipment: 'kettlebell', exerciseType: 'weight_reps' })).toBe('total');
    expect(deriveLoadSemantics({ name: 'Dumbbell Row', equipment: 'dumbbell', exerciseType: 'weight_reps' })).toBe('total');
  });

  test('assistance machines are assisted; loaded bodyweight is added_bodyweight', () => {
    expect(deriveLoadSemantics({ name: 'Assisted Pull-Up', equipment: 'machine', exerciseType: 'weight_reps' })).toBe('assisted');
    expect(deriveLoadSemantics({ name: 'Weighted Pull-Up', equipment: 'bodyweight', exerciseType: 'weighted_bodyweight' })).toBe('added_bodyweight');
  });

  test('everything else - barbells, machines, unknown customs - defaults total', () => {
    expect(deriveLoadSemantics({ name: 'Barbell Back Squat', equipment: 'barbell', exerciseType: 'weight_reps' })).toBe('total');
    expect(deriveLoadSemantics({})).toBe('total');
  });
});

describe('source guard: no tonnage path reads bodyweight', () => {
  test('calculateTonnage and its helpers never touch a bodyweight field', () => {
    // The spec v1 law: assisted work is EXCLUDED from tonnage rather than
    // reconstructed as bodyweight-minus-assistance, so no bodyweight-derived
    // number can ever enter training analytics through this path.
    const src = fs.readFileSync(path.join(__dirname, '..', 'algorithms.js'), 'utf8');
    const tonnageBlock = src.slice(
      src.indexOf('export function loadMultiplierFor'),
      src.indexOf('function isLoadBearingSet'),
    );
    expect(tonnageBlock).not.toMatch(/bodyWeight|body_weight|bodyweightKg|weightKg/);
  });
});
