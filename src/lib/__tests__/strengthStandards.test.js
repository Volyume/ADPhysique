import {
  STRENGTH_STANDARDS,
  LEVEL_LABELS,
  getStrengthLevel,
} from '../strengthStandards';

describe('STRENGTH_STANDARDS catalogue', () => {
  test('covers the five core barbell lifts', () => {
    expect(Object.keys(STRENGTH_STANDARDS).sort()).toEqual(
      ['bench', 'deadlift', 'ohp', 'row', 'squat'],
    );
  });

  test('each lift exposes a regex matcher and five ascending thresholds', () => {
    for (const [key, std] of Object.entries(STRENGTH_STANDARDS)) {
      expect(std.match).toBeInstanceOf(RegExp);
      expect(Array.isArray(std.levels)).toBe(true);
      expect(std.levels).toHaveLength(5);
      for (let i = 1; i < std.levels.length; i++) {
        expect(std.levels[i]).toBeGreaterThan(std.levels[i - 1]);
      }
      // Catalogue keys map to the level labels at the same index.
      expect(LEVEL_LABELS).toHaveLength(5);
      expect(key).toBeTruthy();
    }
  });
});

describe('getStrengthLevel — input guards', () => {
  test('returns null when any required input is missing', () => {
    expect(getStrengthLevel('', 100, 80)).toBeNull();
    expect(getStrengthLevel('Bench Press', 0, 80)).toBeNull();
    expect(getStrengthLevel('Bench Press', 100, 0)).toBeNull();
    expect(getStrengthLevel('Bench Press', 100, -1)).toBeNull();
    expect(getStrengthLevel(null, 100, 80)).toBeNull();
    expect(getStrengthLevel('Bench Press', null, 80)).toBeNull();
    expect(getStrengthLevel('Bench Press', 100, null)).toBeNull();
  });

  test('returns null for unrecognised exercises', () => {
    expect(getStrengthLevel('Cable Pull-through', 100, 80)).toBeNull();
    expect(getStrengthLevel('Lat Pulldown', 100, 80)).toBeNull();
    expect(getStrengthLevel('Leg Press', 100, 80)).toBeNull();
    expect(getStrengthLevel('Bicep Curl', 100, 80)).toBeNull();
  });
});

describe('getStrengthLevel — lift name matching', () => {
  test('matches bench press variants', () => {
    expect(getStrengthLevel('Bench Press', 80, 80)?.label).toBe('Intermediate');
    expect(getStrengthLevel('Barbell Bench Press', 80, 80)?.label).toBe('Intermediate');
    expect(getStrengthLevel('Incline Bench Press', 80, 80)?.label).toBe('Intermediate');
  });

  test('matches squat variants including safety-bar', () => {
    expect(getStrengthLevel('Squat', 120, 80)?.label).toBe('Intermediate');
    expect(getStrengthLevel('Back Squat', 120, 80)?.label).toBe('Intermediate');
    expect(getStrengthLevel('Front Squat', 120, 80)?.label).toBe('Intermediate');
    expect(getStrengthLevel('Safety Bar Squat', 120, 80)?.label).toBe('Intermediate');
  });

  test('matches deadlift variants', () => {
    expect(getStrengthLevel('Deadlift', 140, 80)?.label).toBe('Intermediate');
    expect(getStrengthLevel('Romanian Deadlift', 140, 80)?.label).toBe('Intermediate');
    expect(getStrengthLevel('Sumo Deadlift', 140, 80)?.label).toBe('Intermediate');
  });

  test('matches overhead-press variants', () => {
    expect(getStrengthLevel('Overhead Press', 60, 80)?.label).toBe('Intermediate');
    expect(getStrengthLevel('OHP', 60, 80)?.label).toBe('Intermediate');
    expect(getStrengthLevel('Shoulder Press', 60, 80)?.label).toBe('Intermediate');
    expect(getStrengthLevel('Military Press', 60, 80)?.label).toBe('Intermediate');
  });

  test('matches row variants', () => {
    expect(getStrengthLevel('Barbell Row', 80, 80)?.label).toBe('Intermediate');
    expect(getStrengthLevel('Pendlay Row', 80, 80)?.label).toBe('Intermediate');
    expect(getStrengthLevel('Bent Over Row', 80, 80)?.label).toBe('Intermediate');
    expect(getStrengthLevel('Bent-Over Row', 80, 80)?.label).toBe('Intermediate');
    expect(getStrengthLevel('Yates Row', 80, 80)?.label).toBe('Intermediate');
  });
});

describe('getStrengthLevel — banding', () => {
  // bench thresholds: 0.50, 0.75, 1.00, 1.25, 1.50
  const BW = 100;

  test('returns Untrained band below the Beginner threshold', () => {
    const result = getStrengthLevel('Bench Press', 40, BW);
    expect(result).toEqual({
      label: 'Untrained',
      ratio: 0.4,
      nextTarget: 50, // 0.50 × 100
      nextLabel: 'Beginner',
    });
  });

  test('hits each level at its exact threshold', () => {
    expect(getStrengthLevel('Bench Press', 50, BW)?.label).toBe('Beginner');
    expect(getStrengthLevel('Bench Press', 75, BW)?.label).toBe('Novice');
    expect(getStrengthLevel('Bench Press', 100, BW)?.label).toBe('Intermediate');
    expect(getStrengthLevel('Bench Press', 125, BW)?.label).toBe('Advanced');
    expect(getStrengthLevel('Bench Press', 150, BW)?.label).toBe('Elite');
  });

  test('stays on the lower band just below the next threshold', () => {
    expect(getStrengthLevel('Bench Press', 74.9, BW)?.label).toBe('Beginner');
    expect(getStrengthLevel('Bench Press', 99.9, BW)?.label).toBe('Novice');
    expect(getStrengthLevel('Bench Press', 124.9, BW)?.label).toBe('Intermediate');
    expect(getStrengthLevel('Bench Press', 149.9, BW)?.label).toBe('Advanced');
  });

  test('Elite has no next target', () => {
    const result = getStrengthLevel('Bench Press', 200, BW);
    expect(result?.label).toBe('Elite');
    expect(result?.nextTarget).toBeNull();
    expect(result?.nextLabel).toBeNull();
  });

  test('next target is the next threshold × bodyweight', () => {
    // Novice on bench at BW=80 → next is Intermediate at 1.00 × 80 = 80
    const result = getStrengthLevel('Bench Press', 70, 80);
    expect(result?.label).toBe('Novice');
    expect(result?.nextTarget).toBe(80);
    expect(result?.nextLabel).toBe('Intermediate');
  });

  test('reports the ratio as a number', () => {
    const result = getStrengthLevel('Bench Press', 120, 80);
    expect(typeof result?.ratio).toBe('number');
    expect(result?.ratio).toBeCloseTo(1.5, 5);
  });
});
