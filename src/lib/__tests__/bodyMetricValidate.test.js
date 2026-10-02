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
  FUTURE_DATE_MESSAGE,
  BODY_WEIGHT_MIN_KG,
  BODY_FAT_METHODS,
  BODY_FAT_METHOD_CHOICE,
  DEFAULT_BODY_FAT_METHOD,
  weighInPlausibility,
  plausibilityMessage,
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

  // A7 (pre-release sweep 2026-07-27): an impossible-but-syntactically-shaped
  // date used to silently coerce via `new Date()` (either rolling forward to
  // a different real date, or -- for a genuinely malformed string -- falling
  // back to today with no warning). Both are now rejected with a calm
  // message instead of guessing at what the user meant.
  test('rejects an impossible calendar date (day out of range for its month)', () => {
    const r = validateBodyMetricForm({ metric_date: '2026-02-30', waist: '80' }, { bwu: 'kg' });
    expect(r.ok).toBe(false);
    expect(r.data).toBeUndefined();
    expect(r.message).toMatch(/date/i);
  });

  test('rejects an out-of-range month', () => {
    const r = validateBodyMetricForm({ metric_date: '2026-13-45', waist: '80' }, { bwu: 'kg' });
    expect(r.ok).toBe(false);
  });

  test('29 Feb is rejected outside a leap year, accepted inside one', () => {
    expect(validateBodyMetricForm({ metric_date: '2026-02-29', waist: '80' }, { bwu: 'kg' }).ok).toBe(false);
    const r = validateBodyMetricForm({ metric_date: '2024-02-29', waist: '80' }, { bwu: 'kg' });
    expect(r.ok).toBe(true);
    expect(new Date(r.data.loggedAt).getDate()).toBe(29);
    expect(new Date(r.data.loggedAt).getMonth()).toBe(1);
  });

  test('an empty date still defaults to now, unchanged from before', () => {
    const r = validateBodyMetricForm({ metric_date: '', waist: '80' }, { bwu: 'kg' });
    expect(r.ok).toBe(true);
    expect(r.data.loggedAt).toBeGreaterThan(Date.now() - 5000);
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

// ─── D214 addendum 4 (Body metrics, lane 7): no future dates, the plausibility rule, the body-fat method ─────
// Spec docs/audit/progress-recovery-consistency-audit-2026-10-01/
// 04-BODY-METRICS-AUDIT-AND-SPEC.md section 3 item 3 and section 6 table
// (`bodyMetricValidate`: plausibility, no future dates). These ADD to the
// DATA-001 gate above; nothing above was altered.
describe('validateBodyMetricForm: no future dates (BM-40)', () => {
  const NOW = new Date(2026, 8, 17, 9, 30).getTime(); // 17 Sep 2026, 09:30 local
  const form = (date) => ({ metric_date: date, body_weight: '82.5', notes: '' });

  test('a date after today is refused with a calm message, and nothing is stored', () => {
    const r = validateBodyMetricForm(form('2026-09-18'), { bwu: 'kg', nowMs: NOW });
    expect(r.ok).toBe(false);
    expect(r.data).toBeUndefined();
    expect(r.message).toBe(FUTURE_DATE_MESSAGE);
    expect(validateBodyMetricForm(form('2027-03-01'), { bwu: 'kg', nowMs: NOW }).ok).toBe(false);
  });

  test('today and earlier days are accepted', () => {
    expect(validateBodyMetricForm(form('2026-09-17'), { bwu: 'kg', nowMs: NOW }).ok).toBe(true);
    expect(validateBodyMetricForm(form('2026-09-16'), { bwu: 'kg', nowMs: NOW }).ok).toBe(true);
    expect(validateBodyMetricForm(form('2025-01-01'), { bwu: 'kg', nowMs: NOW }).ok).toBe(true);
  });

  test('an entry for today carries the time it was made; an earlier day keeps its local midnight', () => {
    expect(validateBodyMetricForm(form('2026-09-17'), { bwu: 'kg', nowMs: NOW }).data.loggedAt).toBe(NOW);
    expect(validateBodyMetricForm(form('2026-09-16'), { bwu: 'kg', nowMs: NOW }).data.loggedAt)
      .toBe(new Date(2026, 8, 16).getTime());
  });

  test('an impossible calendar date is still refused first, with its own message', () => {
    const r = validateBodyMetricForm(form('2026-02-30'), { bwu: 'kg', nowMs: NOW });
    expect(r.ok).toBe(false);
    expect(r.message).not.toBe(FUTURE_DATE_MESSAGE);
  });
});

describe('weighInPlausibility and plausibilityMessage (BM-40; the same rule on Home\'s quick entry)', () => {
  test('more than 5% or 5 kg from the last weigh-in is implausible (whichever bound is smaller)', () => {
    // 82.4 kg: 5% is 4.12 kg, the smaller bound
    expect(weighInPlausibility(78.2, 82.4).implausible).toBe(true);   // 4.2 kg below
    expect(weighInPlausibility(78.4, 82.4).implausible).toBe(false);  // 4.0 kg below
    expect(weighInPlausibility(86.6, 82.4).implausible).toBe(true);   // 4.2 kg above
    // 120 kg: 5 kg is the smaller bound (5% would be 6)
    expect(weighInPlausibility(114.9, 120).implausible).toBe(true);
    expect(weighInPlausibility(115.1, 120).implausible).toBe(false);
  });

  test('the typo the old gates accepted is asked about', () => {
    const r = weighInPlausibility(28.4, 82.4);
    expect(r.implausible).toBe(true);
    expect(r.diffKg).toBeCloseTo(-54, 5);
  });

  test('no last weigh-in, or a bad one, never asks', () => {
    expect(weighInPlausibility(82, null).implausible).toBe(false);
    expect(weighInPlausibility(82, 0).implausible).toBe(false);
    expect(weighInPlausibility(NaN, 82).implausible).toBe(false);
  });

  test('the sentence, in the person\'s units', () => {
    expect(plausibilityMessage({ kg: 28.4, lastKg: 82.4, bwu: 'kg' }))
      .toBe('That is 54 kg below your last weigh-in of 82.4 kg. Save it anyway?');
    expect(plausibilityMessage({ kg: 86.9, lastKg: 82.4, bwu: 'kg' }))
      .toBe('That is 4.5 kg above your last weigh-in of 82.4 kg. Save it anyway?');
    // a stone reader reads stones and pounds on both numbers
    expect(plausibilityMessage({ kg: 28.4, lastKg: 82.4, bwu: 'st' }))
      .toBe('That is 8 st 7 lbs below your last weigh-in of 12 st 13.5 lbs. Save it anyway?');
    expect(plausibilityMessage({ kg: 72.4, lastKg: 82.4, bwu: 'lbs' }))
      .toBe('That is 22 lbs below your last weigh-in of 182 lbs. Save it anyway?');
  });

  test('the floor Home\'s quick entry now shares with the form is 20 kg', () => {
    expect(BODY_WEIGHT_MIN_KG).toBe(20);
    expect(isValidBodyWeightKg(19.9)).toBe(false);
  });
});

describe('validateBodyMetricForm: the body-fat method (BM-33)', () => {
  const base = { metric_date: '2024-01-01', notes: '' };

  test('the four methods the setup wizard offers, with the glossed labels', () => {
    expect(BODY_FAT_METHODS.map((m) => m.value)).toEqual(['visual', 'bia', 'caliper', 'dexa']);
    expect(BODY_FAT_METHODS.map((m) => m.label)).toEqual(['Best estimate', 'BIA', 'Caliper', 'DEXA']);
    expect(DEFAULT_BODY_FAT_METHOD).toBe('visual');
  });

  // RE-ANCHORED D214 addendum 7 (lead; founder-gated, lane 7 open question 1):
  // while BODY_FAT_METHOD_CHOICE is off the form stores 'manual' whatever method
  // is named, so the FFM floor keeps today's behaviour until the founder rules.
  test.each(['visual', 'bia', 'caliper', 'dexa'])('a typed body fat with method %s stores the method only once the founder has opened the choice', (method) => {
    const r = validateBodyMetricForm({ ...base, body_fat: '18', body_fat_source: method }, { bwu: 'kg' });
    expect(r.ok).toBe(true);
    expect(r.data.bodyFatSource).toBe(BODY_FAT_METHOD_CHOICE ? method : 'manual');
  });
  test('the method choice is founder-gated and off', () => {
    expect(BODY_FAT_METHOD_CHOICE).toBe(true); // founder, 2026-10-02 (D214 addendum 11): the form asks the method as the wizard does
  });

  test('a caller that names no method (or an unknown one) keeps the old "manual", as before', () => {
    expect(validateBodyMetricForm({ ...base, body_fat: '18' }, { bwu: 'kg' }).data.bodyFatSource).toBe('manual');
    expect(validateBodyMetricForm({ ...base, body_fat: '18', body_fat_source: 'tape' }, { bwu: 'kg' }).data.bodyFatSource).toBe('manual');
  });
});

// D214 addendum 7 (lane 7 open question 14): under a withhold the plausibility
// prompt still guards the series but names no figure and no direction.
describe('plausibilityMessage under a withhold', () => {
  const { plausibilityMessage: msg } = require('../bodyMetricValidate');
  test('no digits, no above or below', () => {
    const m = msg({ kg: 28.4, lastKg: 82.4, bwu: 'kg', withholdFigures: true });
    expect(m).toBe('That is a long way from your last weigh-in. Save it anyway?');
    expect(m).not.toMatch(/\d|below|above/);
  });
  test('the ordinary prompt names the difference and the last weigh-in', () => {
    expect(msg({ kg: 28.4, lastKg: 82.4, bwu: 'kg' })).toBe('That is 54 kg below your last weigh-in of 82.4 kg. Save it anyway?');
  });
});
