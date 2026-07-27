/**
 * parseDecimalInput.test.js
 *
 * Pins finding B1 of the pre-release sweep
 * (docs/audit/pre-release-sweep-2026-07-27.md).
 *
 * THE BUG. iOS renders the decimal-pad's separator key from the device REGION,
 * not the app language, so a phone regioned to a comma-decimal country shows a
 * comma. `parseFloat('82,5')` returns 82 -- it stops at the comma and discards
 * the rest. The range validators then accepted it, because 82 is a perfectly
 * plausible body weight, so nothing ever caught the corruption.
 *
 * WHY IT MATTERS. Body weight feeds Mifflin-St Jeor / Katch-McArdle in
 * nutritionEngine.js. A silently truncated weight moves the user's BMR, TDEE,
 * calorie target and macro split. The number the engine receives must be the
 * number the user typed.
 *
 * Written to FAIL if comma tolerance is ever removed, and to FAIL if the parser
 * starts mangling ordinary UK input in the process -- the fix must not trade
 * one locale's correctness for another's.
 */

import { parseDecimalInput, parseIntegerInput } from '../parseDecimalInput';
import { parseBodyWeightToKg } from '../units';
import { isValidBodyWeightKg } from '../bodyMetricValidate';

describe('comma decimal separator (B1)', () => {
  test('the exact reported case: 82,5 is 82.5, not 82', () => {
    expect(parseDecimalInput('82,5')).toBeCloseTo(82.5, 5);
    // parseFloat's answer, pinned so the regression is unmistakable.
    expect(parseFloat('82,5')).toBe(82);
  });

  test('a comma decimal survives the body-weight parse path end to end', () => {
    expect(parseBodyWeightToKg('82,5', 'kg')).toBeCloseTo(82.5, 5);
  });

  test('single-decimal-place commas parse for body fat and measurements', () => {
    expect(parseDecimalInput('15,5')).toBeCloseTo(15.5, 5);
    expect(parseDecimalInput('0,5')).toBeCloseTo(0.5, 5);
    expect(parseDecimalInput('101,25')).toBeCloseTo(101.25, 5);
  });
});

describe('UK input is unaffected', () => {
  test('period decimals still parse exactly as before', () => {
    expect(parseDecimalInput('82.5')).toBeCloseTo(82.5, 5);
    expect(parseDecimalInput('100')).toBe(100);
    expect(parseDecimalInput('0.5')).toBeCloseTo(0.5, 5);
  });

  test('a UK thousands comma is grouping, not a decimal', () => {
    expect(parseDecimalInput('1,234')).toBe(1234);
    expect(parseDecimalInput('1,234.5')).toBeCloseTo(1234.5, 5);
  });

  test('a European grouped decimal reads correctly', () => {
    expect(parseDecimalInput('1.234,5')).toBeCloseTo(1234.5, 5);
  });
});

describe('junk in, NaN out (never a silently wrong number)', () => {
  test.each([['', NaN], [null, NaN], [undefined, NaN], ['abc', NaN]])(
    'parseDecimalInput(%p) is NaN',
    (input) => {
      expect(Number.isNaN(parseDecimalInput(input))).toBe(true);
    },
  );

  test('a number passes through untouched', () => {
    expect(parseDecimalInput(82.5)).toBe(82.5);
  });
});

describe('integer form', () => {
  test('truncates rather than rounding, and tolerates a comma', () => {
    expect(parseIntegerInput('12')).toBe(12);
    expect(parseIntegerInput('12,7')).toBe(12);
    expect(parseIntegerInput('12.9')).toBe(12);
    expect(Number.isNaN(parseIntegerInput('abc'))).toBe(true);
  });
});

describe('the truncation was invisible to validation, which is why it mattered', () => {
  test('the truncated value passes the range gate just as the real one does', () => {
    // Both are "valid" weights, so no validator could ever have caught this.
    expect(isValidBodyWeightKg(82)).toBe(true);
    expect(isValidBodyWeightKg(82.5)).toBe(true);
  });

  test('a comma weight now reaches validation as the value the user typed', () => {
    const kg = parseBodyWeightToKg('82,5', 'kg');
    expect(isValidBodyWeightKg(kg)).toBe(true);
    expect(kg).toBeCloseTo(82.5, 5);
  });
});
