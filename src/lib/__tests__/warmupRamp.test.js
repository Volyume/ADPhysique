/**
 * warmupRamp.test.js — pins the deterministic warm-up ramp (B8).
 *
 * What this suite pins and why: the audit sanctioned the ramp as "pure
 * arithmetic, not a coaching decision", so the scheme itself is the
 * contract — bar×10 / 40%×5 / 60%×3 / 80%×2, rounded to 2.5 kg. If the
 * numbers drift the feature quietly becomes coaching, which the
 * deterministic-engine rule forbids. Also pinned: rows never reach the
 * working weight (a "warm-up" at the work weight is a working set), light
 * lifts collapse to shorter ramps instead of nonsense rows, non-barbell
 * lifts get no bar row, rubbish input returns an empty ramp rather than
 * crashing, and identical inputs always give identical ramps.
 */
import { warmupRamp, WARMUP_STEPS } from '../warmupRamp';

describe('the canonical barbell ramp', () => {
  test('100 kg: bar×10, 40×5, 60×3, 80×2', () => {
    expect(warmupRamp(100, { isBarbell: true })).toEqual([
      { weight: 20, reps: 10, isBar: true },
      { weight: 40, reps: 5, isBar: false },
      { weight: 60, reps: 3, isBar: false },
      { weight: 80, reps: 2, isBar: false },
    ]);
  });

  test('62.5 kg rounds every step to 2.5: bar, 25, 37.5, 50', () => {
    expect(warmupRamp(62.5, { isBarbell: true })).toEqual([
      { weight: 20, reps: 10, isBar: true },
      { weight: 25, reps: 5, isBar: false },
      { weight: 37.5, reps: 3, isBar: false },
      { weight: 50, reps: 2, isBar: false },
    ]);
  });

  test('light barbell lift collapses duplicate bar-level steps: 40 kg', () => {
    // 40%: 16 -> floored to bar 20 -> duplicate of the bar row, dropped.
    // 60%: 24 -> 25; 80%: 32 -> 32.5.
    expect(warmupRamp(40, { isBarbell: true })).toEqual([
      { weight: 20, reps: 10, isBar: true },
      { weight: 25, reps: 3, isBar: false },
      { weight: 32.5, reps: 2, isBar: false },
    ]);
  });

  test('working weight at or below the bar: no ramp at all', () => {
    expect(warmupRamp(20, { isBarbell: true })).toEqual([]);
    expect(warmupRamp(15, { isBarbell: true })).toEqual([]);
  });

  test('custom bar weight is respected', () => {
    const rows = warmupRamp(60, { isBarbell: true, barKg: 15 });
    expect(rows[0]).toEqual({ weight: 15, reps: 10, isBar: true });
    expect(rows.every((r) => r.weight >= 15)).toBe(true);
  });
});

describe('non-barbell lifts', () => {
  test('no bar row: 30 kg dumbbell work ramps 12.5, 17.5, 25', () => {
    expect(warmupRamp(30)).toEqual([
      { weight: 12.5, reps: 5, isBar: false },
      { weight: 17.5, reps: 3, isBar: false },
      { weight: 25, reps: 2, isBar: false },
    ]);
  });

  test('very light work collapses to fewer rows: 10 kg', () => {
    // 40%: 4 -> 5; 60%: 6 -> 5 (duplicate, dropped); 80%: 8 -> 7.5.
    expect(warmupRamp(10)).toEqual([
      { weight: 5, reps: 5, isBar: false },
      { weight: 7.5, reps: 2, isBar: false },
    ]);
  });

  test('too light for any row: 2.5 kg gives an empty ramp, not zero rows', () => {
    expect(warmupRamp(2.5)).toEqual([]);
  });
});

describe('invariants', () => {
  test('no row ever reaches the working weight, across a sweep', () => {
    for (let w = 2.5; w <= 250; w += 2.5) {
      for (const isBarbell of [true, false]) {
        const rows = warmupRamp(w, { isBarbell });
        for (const row of rows) expect(row.weight).toBeLessThan(w);
      }
    }
  });

  test('rows are strictly ascending', () => {
    for (const w of [30, 47.5, 60, 100, 142.5, 200]) {
      const rows = warmupRamp(w, { isBarbell: true });
      for (let i = 1; i < rows.length; i += 1) {
        expect(rows[i].weight).toBeGreaterThan(rows[i - 1].weight);
      }
    }
  });

  test('rubbish input returns an empty ramp', () => {
    expect(warmupRamp(NaN)).toEqual([]);
    expect(warmupRamp(-10)).toEqual([]);
    expect(warmupRamp(0)).toEqual([]);
    expect(warmupRamp('')).toEqual([]);
    expect(warmupRamp(Infinity)).toEqual([]);
  });

  test('deterministic: identical inputs, identical ramps', () => {
    expect(warmupRamp(87.5, { isBarbell: true })).toEqual(warmupRamp(87.5, { isBarbell: true }));
  });

  test('junk options fall back to defaults instead of emitting NaN rows', () => {
    // A zero rounding increment divides by zero and a NaN bar passes no
    // comparison; either would have rendered "NaN kg × 5" in the sheet.
    expect(warmupRamp(100, { isBarbell: true, barKg: NaN })).toEqual(
      warmupRamp(100, { isBarbell: true })
    );
    expect(warmupRamp(100, { roundKg: 0 })).toEqual(warmupRamp(100));
    expect(warmupRamp(100, { isBarbell: true, barKg: '20' })).toEqual(
      warmupRamp(100, { isBarbell: true, barKg: 20 })
    );
    for (const rows of [
      warmupRamp(100, { isBarbell: true, barKg: NaN, roundKg: -1 }),
    ]) {
      for (const row of rows) expect(Number.isFinite(row.weight)).toBe(true);
    }
  });

  test('the scheme constants are the sanctioned arithmetic', () => {
    expect(WARMUP_STEPS).toEqual([
      { pct: 0.4, reps: 5 },
      { pct: 0.6, reps: 3 },
      { pct: 0.8, reps: 2 },
    ]);
  });
});
