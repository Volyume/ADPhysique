import {
  STRENGTH_STANDARDS,
  LEVEL_LABELS,
  getStrengthLevel,
  summariseStrengthStanding,
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

describe('getStrengthLevel, input guards', () => {
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

describe('getStrengthLevel, lift name matching', () => {
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

describe('getStrengthLevel, banding', () => {
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

describe('summariseStrengthStanding', () => {
  test('returns null with no usable entries', () => {
    expect(summariseStrengthStanding(null)).toBeNull();
    expect(summariseStrengthStanding([])).toBeNull();
    expect(
      summariseStrengthStanding([{ lift: 'X', oneRm: 100, level: { label: 'Mystery' } }]),
    ).toBeNull();
  });

  test('overall tier is the rounded-down average across lifts', () => {
    const out = summariseStrengthStanding([
      { lift: 'Bench Press', oneRm: 100, level: { label: 'Intermediate', nextTarget: 125, nextLabel: 'Advanced' } },
      { lift: 'Squat', oneRm: 160, level: { label: 'Advanced', nextTarget: 200, nextLabel: 'Elite' } },
    ]);
    // tiers Intermediate (3) and Advanced (4) → mean 3.5 → floor 3 → Intermediate
    expect(out.overallLabel).toBe('Intermediate');
    expect(out.count).toBe(2);
  });

  test('nearest is the smallest positive gap to the next tier', () => {
    const out = summariseStrengthStanding([
      { lift: 'Bench Press', oneRm: 118, level: { label: 'Intermediate', nextTarget: 125, nextLabel: 'Advanced' } },
      { lift: 'Squat', oneRm: 160, level: { label: 'Advanced', nextTarget: 200, nextLabel: 'Elite' } },
    ]);
    expect(out.nearest).toEqual({ lift: 'Bench Press', toLabel: 'Advanced', delta: 7 });
  });

  test('rounds the gap to one decimal', () => {
    const out = summariseStrengthStanding([
      { lift: 'OHP', oneRm: 58.33, level: { label: 'Novice', nextTarget: 60, nextLabel: 'Intermediate' } },
    ]);
    expect(out.nearest.delta).toBe(1.7);
  });

  test('nearest is null when every tracked lift is at Elite', () => {
    const out = summariseStrengthStanding([
      { lift: 'Bench Press', oneRm: 200, level: { label: 'Elite', nextTarget: null, nextLabel: null } },
      { lift: 'Deadlift', oneRm: 300, level: { label: 'Elite', nextTarget: null, nextLabel: null } },
    ]);
    expect(out.overallLabel).toBe('Elite');
    expect(out.nearest).toBeNull();
  });

  test('skips unknown-label entries when averaging', () => {
    const out = summariseStrengthStanding([
      { lift: 'Bench Press', oneRm: 100, level: { label: 'Intermediate', nextTarget: 125, nextLabel: 'Advanced' } },
      { lift: 'Junk', oneRm: 50, level: { label: 'Nope' } },
    ]);
    expect(out.count).toBe(1);
    expect(out.overallLabel).toBe('Intermediate');
  });
});

// getStrengthLevel is a pure ratio, so 1RM and bodyweight must be in the SAME
// unit. PRWallScreen used to pass an lbs-derived 1RM against a kg bodyweight,
// inflating the ratio ~2.2x so every lbs user read as Elite. These guard the
// contract the screen fix now honours. (A2-043.)
describe('getStrengthLevel, unit consistency (A2-043 regression)', () => {
  const LB_PER_KG = 1 / 0.453592;

  test('same physical lift gives the same level in kg or lbs', () => {
    const kg  = getStrengthLevel('Barbell Bench Press', 100, 80);            // ratio 1.25
    const lbs = getStrengthLevel('Barbell Bench Press', 100 * LB_PER_KG, 80 * LB_PER_KG);
    expect(kg.label).toBe('Advanced');
    expect(lbs.label).toBe(kg.label);
    expect(lbs.ratio).toBeCloseTo(kg.ratio, 5);
  });

  test('mismatched units (lbs 1RM vs kg bodyweight) inflate the ratio ~2.2x', () => {
    const correct    = getStrengthLevel('Barbell Bench Press', 100 * LB_PER_KG, 80 * LB_PER_KG).ratio;
    const mismatched = getStrengthLevel('Barbell Bench Press', 100 * LB_PER_KG, 80).ratio;
    expect(mismatched / correct).toBeCloseTo(LB_PER_KG, 2);
  });
});
