/**
 * U4 cycle-phase trend annotation (founder 2026-07-01, sex-tailoring audit).
 * Invariants written to fail: the annotation is female-only, fires only on a
 * water-plausible RISE around a flagged period, never on a loss, never above the
 * upper band, and changes nothing but the returned note (it is a pure function).
 */
import {
  cycleTrendAnnotation,
  CYCLE_WATER_LOWER_PCT,
  CYCLE_WATER_UPPER_PCT,
} from '../cyclePhase';

describe('cycleTrendAnnotation', () => {
  const base = { sex: 'female', menstrual: true, trendPctPerWeek: 1.0 };

  test('fires for a female, period-flagged, water-plausible rise', () => {
    const r = cycleTrendAnnotation(base);
    expect(r).not.toBeNull();
    expect(r.likelyWater).toBe(true);
    expect(r.trendPctPerWeek).toBe(1.0);
    expect(typeof r.note).toBe('string');
    expect(r.note.length).toBeGreaterThan(0);
  });

  test('never fires for a male (even with a menstrual flag + rise)', () => {
    expect(cycleTrendAnnotation({ ...base, sex: 'male' })).toBeNull();
    expect(cycleTrendAnnotation({ ...base, sex: null })).toBeNull();
  });

  test('never fires without the menstrual flag', () => {
    expect(cycleTrendAnnotation({ ...base, menstrual: false })).toBeNull();
    expect(cycleTrendAnnotation({ ...base, menstrual: undefined })).toBeNull();
  });

  test('NEVER fires on a loss — a rapid-loss signal can never be masked', () => {
    expect(cycleTrendAnnotation({ ...base, trendPctPerWeek: -0.5 })).toBeNull();
    expect(cycleTrendAnnotation({ ...base, trendPctPerWeek: -2.0 })).toBeNull();
    expect(cycleTrendAnnotation({ ...base, trendPctPerWeek: 0 })).toBeNull();
  });

  test('does not fire for a rise below the lower band (too small to note)', () => {
    expect(cycleTrendAnnotation({ ...base, trendPctPerWeek: 0.1 })).toBeNull();
  });

  test('does NOT fire above the upper band — a big jump is never explained away as water', () => {
    expect(cycleTrendAnnotation({ ...base, trendPctPerWeek: 3.0 })).toBeNull();
    expect(cycleTrendAnnotation({ ...base, trendPctPerWeek: 2.6 })).toBeNull();
  });

  test('fires inclusively at both band boundaries', () => {
    expect(cycleTrendAnnotation({ ...base, trendPctPerWeek: CYCLE_WATER_LOWER_PCT })).not.toBeNull();
    expect(cycleTrendAnnotation({ ...base, trendPctPerWeek: CYCLE_WATER_UPPER_PCT })).not.toBeNull();
  });

  test('returns null on unusable inputs and never throws', () => {
    expect(cycleTrendAnnotation({ ...base, trendPctPerWeek: NaN })).toBeNull();
    expect(cycleTrendAnnotation({ ...base, trendPctPerWeek: undefined })).toBeNull();
    expect(cycleTrendAnnotation({ ...base, trendPctPerWeek: 'lots' })).toBeNull();
    expect(cycleTrendAnnotation({})).toBeNull();
    expect(cycleTrendAnnotation()).toBeNull();
  });

  test('the note reassures, and never mentions a calorie/target change', () => {
    const { note } = cycleTrendAnnotation(base);
    expect(note.toLowerCase()).toContain('water');
    expect(note.toLowerCase()).not.toContain('kcal');
    expect(note.toLowerCase()).not.toContain('calorie');
  });

  test('the bands are the expected sex-tailoring values', () => {
    expect(CYCLE_WATER_LOWER_PCT).toBe(0.2);
    expect(CYCLE_WATER_UPPER_PCT).toBe(2.5);
  });
});
