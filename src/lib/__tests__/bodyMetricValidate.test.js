/**
 * bodyMetricValidate — pins the DATA-001 fix (adversarial audit).
 *
 * Two bugs are guarded here against the REAL validator/gate:
 *  1. The BodyMetrics save gate used to count only body weight, body fat or
 *     CHEST as "a measurement", so a waist-only / arm-only / thigh-only /
 *     hip-only / calf-only entry was rejected despite the copy promising "at
 *     least ... one measurement". Every circumference field must now satisfy
 *     the gate on its own.
 *  2. The save loop stored any finite parsed value with no sign/range check, so
 *     a negative, zero or physically impossible value could reach SQLite (and
 *     then poison the trend charts + nutrition EWMA). Impossible values are now
 *     rejected and nothing is stored.
 */
import {
  isValidBodyWeightKg,
  isValidBodyFatPercent,
  isValidCircumferenceCm,
  validateBodyMetricForm,
  CIRCUMFERENCE_FIELDS,
} from '../bodyMetricValidate';

describe('isValidBodyWeightKg', () => {
  test('accepts realistic weights (kg)', () => {
    [20, 55, 82.5, 150, 500].forEach((kg) => expect(isValidBodyWeightKg(kg)).toBe(true));
  });
  test('rejects non-positive and out-of-range weights', () => {
    [0, -5, -0.1, 19.9, 501, 5000].forEach((kg) => expect(isValidBodyWeightKg(kg)).toBe(false));
  });
  test('rejects non-finite input', () => {
    [NaN, Infinity, -Infinity, 'abc', null, undefined].forEach((kg) =>
      expect(isValidBodyWeightKg(kg)).toBe(false));
  });
  test('coerces a numeric string', () => {
    expect(isValidBodyWeightKg('82')).toBe(true);
  });
});

describe('isValidBodyFatPercent', () => {
  test('accepts a realistic percentage', () => {
    [1, 8, 18.5, 45, 80].forEach((p) => expect(isValidBodyFatPercent(p)).toBe(true));
  });
  test('rejects non-positive, sub-1 and impossible percentages', () => {
    [0, 0.5, -3, 81, 250, 1000].forEach((p) => expect(isValidBodyFatPercent(p)).toBe(false));
  });
  test('rejects non-finite input', () => {
    [NaN, Infinity, null, undefined].forEach((p) => expect(isValidBodyFatPercent(p)).toBe(false));
  });
});

describe('isValidCircumferenceCm', () => {
  test('accepts a realistic measurement', () => {
    [1, 18, 42, 95, 300].forEach((c) => expect(isValidCircumferenceCm(c)).toBe(true));
  });
  test('rejects non-positive and out-of-range measurements', () => {
    [0, -10, 0.5, 301, 5000].forEach((c) => expect(isValidCircumferenceCm(c)).toBe(false));
  });
  test('rejects non-finite input', () => {
    [NaN, Infinity, null, undefined].forEach((c) => expect(isValidCircumferenceCm(c)).toBe(false));
  });
});

describe('validateBodyMetricForm — DATA-001 gate', () => {
  const base = { metric_date: '2024-01-01', notes: '' };

  test('waist-only entry succeeds (the headline bug: not just chest)', () => {
    const r = validateBodyMetricForm({ ...base, waist: '80' }, { bwu: 'kg' });
    expect(r.ok).toBe(true);
    expect(r.data.waistCm).toBe(80);
    expect(r.data.weightKg).toBeUndefined();
  });

  test.each(CIRCUMFERENCE_FIELDS)(
    'a single %s measurement satisfies the gate on its own',
    ({ key, dbField }) => {
      const r = validateBodyMetricForm({ ...base, [key]: '40' }, { bwu: 'kg' });
      expect(r.ok).toBe(true);
      expect(r.data[dbField]).toBe(40);
    },
  );

  test('valid body fat-only entry succeeds', () => {
    const r = validateBodyMetricForm({ ...base, body_fat: '18' }, { bwu: 'kg' });
    expect(r.ok).toBe(true);
    expect(r.data.bodyFatPercent).toBe(18);
    expect(r.data.bodyFatSource).toBe('manual');
  });

  test('body-weight-only (kg) entry succeeds', () => {
    const r = validateBodyMetricForm({ ...base, body_weight: '82.5' }, { bwu: 'kg' });
    expect(r.ok).toBe(true);
    expect(r.data.weightKg).toBe(82.5);
  });

  test('body-weight-only (stone) entry succeeds and converts to a realistic kg', () => {
    const r = validateBodyMetricForm(
      { ...base, body_weight_st: '12', body_weight_st_lbs: '0' },
      { bwu: 'st' },
    );
    expect(r.ok).toBe(true);
    expect(r.data.weightKg).toBeGreaterThan(70);
    expect(r.data.weightKg).toBeLessThan(80);
  });

  test('negative body weight is rejected and nothing is stored', () => {
    const r = validateBodyMetricForm({ ...base, body_weight: '-5' }, { bwu: 'kg' });
    expect(r.ok).toBe(false);
    expect(r.data).toBeUndefined();
    expect(r.message).toMatch(/body weight/i);
  });

  test('zero body weight is rejected', () => {
    const r = validateBodyMetricForm({ ...base, body_weight: '0' }, { bwu: 'kg' });
    expect(r.ok).toBe(false);
  });

  test('impossible body fat (250) is rejected', () => {
    const r = validateBodyMetricForm({ ...base, body_fat: '250' }, { bwu: 'kg' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/body fat/i);
  });

  test('impossible / negative circumference is rejected', () => {
    expect(validateBodyMetricForm({ ...base, waist: '5000' }, { bwu: 'kg' }).ok).toBe(false);
    expect(validateBodyMetricForm({ ...base, waist: '-10' }, { bwu: 'kg' }).ok).toBe(false);
    expect(validateBodyMetricForm({ ...base, waist: '0' }, { bwu: 'kg' }).ok).toBe(false);
  });

  test('one invalid field fails the whole save, even beside a valid one', () => {
    const r = validateBodyMetricForm(
      { ...base, body_weight: '-5', waist: '80' },
      { bwu: 'kg' },
    );
    expect(r.ok).toBe(false);
    expect(r.data).toBeUndefined();
  });

  test('an entirely empty form asks for at least one field', () => {
    const r = validateBodyMetricForm({ ...base }, { bwu: 'kg' });
    expect(r.ok).toBe(false);
    expect(r.message).toBe('Enter at least body weight, body fat, or one measurement.');
  });

  test('a valid combined entry stores every field', () => {
    const r = validateBodyMetricForm(
      { ...base, body_weight: '82.5', body_fat: '18', waist: '80', chest: '104' },
      { bwu: 'kg' },
    );
    expect(r.ok).toBe(true);
    expect(r.data.weightKg).toBe(82.5);
    expect(r.data.bodyFatPercent).toBe(18);
    expect(r.data.waistCm).toBe(80);
    expect(r.data.chestCm).toBe(104);
  });

  test('rejection copy carries no em dash (lint rule + calm-voice guard)', () => {
    const messages = [
      validateBodyMetricForm({ ...base, body_weight: '-5' }, { bwu: 'kg' }).message,
      validateBodyMetricForm({ ...base, body_fat: '250' }, { bwu: 'kg' }).message,
      validateBodyMetricForm({ ...base, waist: '5000' }, { bwu: 'kg' }).message,
      validateBodyMetricForm({ ...base }, { bwu: 'kg' }).message,
    ];
    messages.forEach((m) => expect(m).not.toMatch(/—/));
  });
});
