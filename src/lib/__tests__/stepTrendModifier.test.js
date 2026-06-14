/**
 * COMP-026 (B) — computeStepTrendModifier fixtures.
 *
 * The pure step-trend confidence modifier: it only raises the adaptive-TDEE
 * update gain (0.50 -> max 0.65) when a SUSTAINED step-level shift AGREES with
 * the direction the weight-trend discrepancy already points. Steps never
 * produce, size or reverse an adjustment and are never given a kcal value.
 * These fixtures mirror impl-COMP-026 section 4.3.
 */
import { computeStepTrendModifier } from '../nutritionEngine';

const TODAY = '2024-02-15';

// 'YYYY-MM-DD' for `age` days before `todayKey` (UTC day arithmetic).
function keyAgo(todayKey, age) {
  const [y, m, d] = todayKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) - age * 86400000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

// Build a full 42-day series. recentFn/baselineFn map an age -> steps (or null
// to omit that day entirely). Defaults: every day logged at the flat value.
function buildRows({ recent = 7000, baseline = 7000, today = TODAY } = {}) {
  const recentFn = typeof recent === 'function' ? recent : () => recent;
  const baselineFn = typeof baseline === 'function' ? baseline : () => baseline;
  const rows = [];
  for (let age = 0; age <= 41; age++) {
    const steps = age <= 13 ? recentFn(age) : baselineFn(age);
    if (steps == null) continue;
    rows.push({ entryDate: keyAgo(today, age), steps, source: 'health' });
  }
  return rows;
}

describe('computeStepTrendModifier — sustained shift + agreement', () => {
  test('F1 step jump up, lagging weight (positive adjustment) -> gain 0.65', () => {
    const r = computeStepTrendModifier({
      stepRows: buildRows({ recent: 12000, baseline: 7000 }),
      todayKey: TODAY,
      adjustmentSign: +1,
    });
    expect(r.active).toBe(true);
    expect(r.direction).toBe(1);
    expect(r.gain).toBe(0.65);
    expect(r.recentMedian).toBe(12000);
    expect(r.baselineMedian).toBe(7000);
    expect(r.deltaSteps).toBe(5000);
  });

  test('F6 downward shift on a cut (negative adjustment) -> gain 0.65', () => {
    const r = computeStepTrendModifier({
      stepRows: buildRows({ recent: 7000, baseline: 12000 }),
      todayKey: TODAY,
      adjustmentSign: -1,
    });
    expect(r.active).toBe(true);
    expect(r.direction).toBe(-1);
    expect(r.gain).toBe(0.65);
  });

  test('gain ramps linearly: a 2,750-step shift -> 0.575', () => {
    const r = computeStepTrendModifier({
      stepRows: buildRows({ recent: 9750, baseline: 7000 }),
      todayKey: TODAY,
      adjustmentSign: +1,
    });
    expect(r.active).toBe(true);
    expect(r.gain).toBeCloseTo(0.575, 4);
  });

  test('a shift of exactly 1,500 sits at the base gain 0.50 (ramp floor)', () => {
    const r = computeStepTrendModifier({
      stepRows: buildRows({ recent: 8500, baseline: 7000 }),
      todayKey: TODAY,
      adjustmentSign: +1,
    });
    expect(r.active).toBe(true);
    expect(r.gain).toBe(0.5);
  });
});

describe('computeStepTrendModifier — inactive cases (gain stays 0.50)', () => {
  test('F2 noisy steps, stable median -> not_shifted', () => {
    // Alternating 4k/10k both windows: median ~7000 either side.
    const alt = (age) => (age % 2 === 0 ? 10000 : 4000);
    const r = computeStepTrendModifier({
      stepRows: buildRows({ recent: alt, baseline: alt }),
      todayKey: TODAY,
      adjustmentSign: +1,
    });
    expect(r.active).toBe(false);
    expect(r.reason).toBe('not_shifted');
    expect(r.gain).toBe(0.5);
  });

  test('F3 missing recent days (8 of 14 logged) -> insufficient_step_data', () => {
    const r = computeStepTrendModifier({
      stepRows: buildRows({ recent: (age) => (age < 8 ? 12000 : null), baseline: 7000 }),
      todayKey: TODAY,
      adjustmentSign: +1,
    });
    expect(r.active).toBe(false);
    expect(r.reason).toBe('insufficient_step_data');
    expect(r.gain).toBe(0.5);
  });

  test('F3 missing baseline days (12 of 28 logged) -> insufficient_step_data', () => {
    const r = computeStepTrendModifier({
      stepRows: buildRows({ recent: 12000, baseline: (age) => (age < 26 ? 7000 : null) }),
      todayKey: TODAY,
      adjustmentSign: +1,
    });
    expect(r.active).toBe(false);
    expect(r.reason).toBe('insufficient_step_data');
  });

  test('F4 one big weekend cannot move the median -> not_shifted', () => {
    // baseline 7000; recent mostly 7000 with two 22,000 days (one per half).
    const recentFn = (age) => (age === 2 || age === 9 ? 22000 : 7000);
    const r = computeStepTrendModifier({
      stepRows: buildRows({ recent: recentFn, baseline: 7000 }),
      todayKey: TODAY,
      adjustmentSign: +1,
    });
    expect(r.active).toBe(false);
    expect(r.reason).toBe('not_shifted');
    expect(r.recentMedian).toBe(7000);
  });

  test('a one-week jump fails persistence -> not_sustained', () => {
    // Older half (ages 7..13) at baseline, newer half (0..6) jumped: the
    // candidacy thresholds pass on the blended median but persistence fails.
    const recentFn = (age) => (age <= 6 ? 12000 : 7000);
    const r = computeStepTrendModifier({
      stepRows: buildRows({ recent: recentFn, baseline: 7000 }),
      todayKey: TODAY,
      adjustmentSign: +1,
    });
    expect(r.active).toBe(false);
    expect(r.reason).toBe('not_sustained');
  });
});

describe('computeStepTrendModifier — direction agreement is non-negotiable', () => {
  test('a real step jump up with a CUT adjustment does not accelerate it', () => {
    const r = computeStepTrendModifier({
      stepRows: buildRows({ recent: 12000, baseline: 7000 }),
      todayKey: TODAY,
      adjustmentSign: -1, // weight trend wants a cut; steps are up -> disagree
    });
    expect(r.active).toBe(false);
    expect(r.reason).toBe('direction_disagree');
    expect(r.gain).toBe(0.5);
  });

  test('a sustained shift with NO weight-trend adjustment (sign 0) stays 0.50', () => {
    const r = computeStepTrendModifier({
      stepRows: buildRows({ recent: 12000, baseline: 7000 }),
      todayKey: TODAY,
      adjustmentSign: 0,
    });
    expect(r.active).toBe(false);
    expect(r.gain).toBe(0.5);
  });
});

describe('computeStepTrendModifier — robustness', () => {
  test('F5 a single huge day is winsorised at 40k (cannot inflate the median)', () => {
    const recentFn = (age) => (age === 0 ? 200000 : 12000);
    const r = computeStepTrendModifier({
      stepRows: buildRows({ recent: recentFn, baseline: 7000 }),
      todayKey: TODAY,
      adjustmentSign: +1,
    });
    // The winsorised outlier does not push the median past 12,000.
    expect(r.recentMedian).toBe(12000);
    expect(r.gain).toBe(0.65);
  });

  test('determinism: identical inputs -> identical output', () => {
    const rows = buildRows({ recent: 11000, baseline: 7000 });
    const a = computeStepTrendModifier({ stepRows: rows, todayKey: TODAY, adjustmentSign: +1 });
    const b = computeStepTrendModifier({ stepRows: rows, todayKey: TODAY, adjustmentSign: +1 });
    expect(a).toEqual(b);
  });

  test('malformed input never throws and yields a safe inactive 0.50', () => {
    expect(() => computeStepTrendModifier({})).not.toThrow();
    expect(computeStepTrendModifier({}).gain).toBe(0.5);
    expect(computeStepTrendModifier({ stepRows: null, todayKey: TODAY }).active).toBe(false);
    expect(computeStepTrendModifier({ stepRows: [null, { steps: NaN }], todayKey: 'bad' }).gain).toBe(0.5);
    const dirty = [
      null,
      { entryDate: keyAgo(TODAY, 1), steps: 'oops' },
      { entryDate: 'NaN-NaN-NaN', steps: 12000 },
      { steps: 9000 },
    ];
    expect(() => computeStepTrendModifier({ stepRows: dirty, todayKey: TODAY, adjustmentSign: 1 })).not.toThrow();
  });
});
