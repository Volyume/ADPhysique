/**
 * keypadEntry: the step bar can never produce a number the typed fields refused
 * (12-BUILD-SPEC section 1.5; D220 addendum 18). Pins the field rules and the
 * step clamp.
 */
const { stepValue, WEIGHT_RULES, DISTANCE_RULES, REPS_RULES } = require('../keypadEntry');

describe('the field rules', () => {
  test('weight, distance and reps keep the typed fields\' limits', () => {
    expect(WEIGHT_RULES).toEqual({ maxWhole: 3, maxDecimals: 2, max: 500 });
    expect(DISTANCE_RULES).toEqual({ maxWhole: 5, maxDecimals: 2, max: null });
    expect(REPS_RULES).toEqual({ maxWhole: 3, maxDecimals: 0, max: 200 });
  });
});

describe('stepValue', () => {
  test('steps, rounds to 2 dp and clamps to the field range', () => {
    expect(stepValue('72.5', 2.5, WEIGHT_RULES)).toBe(75);
    expect(stepValue('0.1', 1.25, WEIGHT_RULES)).toBe(1.35);
    expect(stepValue('1', -2.5, WEIGHT_RULES)).toBe(0);
    expect(stepValue('499', 2.5, WEIGHT_RULES)).toBe(500);
    expect(stepValue('', 1, REPS_RULES, 1)).toBe(1);
    expect(stepValue(200, 1, REPS_RULES, 1)).toBe(200);
    expect(stepValue(0, -1, REPS_RULES, 1)).toBe(1);
    expect(stepValue('99999', 1, DISTANCE_RULES)).toBe(100000);
  });
});
