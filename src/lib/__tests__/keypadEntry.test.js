/**
 * keypadEntry: the keypad can never produce a number the typed fields refused
 * (12-BUILD-SPEC section 1.5). Pins the whole-digit, decimal and ceiling
 * rules per field, backspace and the point key, and the step clamp.
 */
const {
  applyKey, stepValue, KEY_BACKSPACE, KEY_POINT, WEIGHT_RULES, DISTANCE_RULES, REPS_RULES,
} = require('../keypadEntry');

describe('applyKey: weight', () => {
  test('digits append; a leading zero is replaced by the next digit', () => {
    expect(applyKey('', '7', WEIGHT_RULES)).toBe('7');
    expect(applyKey('7', '2', WEIGHT_RULES)).toBe('72');
    expect(applyKey('0', '5', WEIGHT_RULES)).toBe('5');
  });
  test('three whole digits at most, never above 500', () => {
    expect(applyKey('123', '4', WEIGHT_RULES)).toBe('123');
    expect(applyKey('50', '1', WEIGHT_RULES)).toBe('50');
    expect(applyKey('49', '9', WEIGHT_RULES)).toBe('499');
    expect(applyKey('50', '0', WEIGHT_RULES)).toBe('500');
  });
  test('the point once, with two decimals at most; an empty field gets "0."', () => {
    expect(applyKey('', KEY_POINT, WEIGHT_RULES)).toBe('0.');
    expect(applyKey('72', KEY_POINT, WEIGHT_RULES)).toBe('72.');
    expect(applyKey('72.', KEY_POINT, WEIGHT_RULES)).toBe('72.');
    expect(applyKey('72.5', '5', WEIGHT_RULES)).toBe('72.55');
    expect(applyKey('72.55', '5', WEIGHT_RULES)).toBe('72.55');
  });
  test('backspace removes the last character and leaves empty alone', () => {
    expect(applyKey('72.5', KEY_BACKSPACE, WEIGHT_RULES)).toBe('72.');
    expect(applyKey('', KEY_BACKSPACE, WEIGHT_RULES)).toBe('');
  });
  test('an unknown key and a null text are safe', () => {
    expect(applyKey('72', 'x', WEIGHT_RULES)).toBe('72');
    expect(applyKey(null, '3', WEIGHT_RULES)).toBe('3');
  });
});

describe('applyKey: reps and distance', () => {
  test('reps take no point, three digits, never above 200', () => {
    expect(applyKey('8', KEY_POINT, REPS_RULES)).toBe('8');
    expect(applyKey('20', '1', REPS_RULES)).toBe('20');
    expect(applyKey('19', '9', REPS_RULES)).toBe('199');
    expect(applyKey('199', '9', REPS_RULES)).toBe('199');
  });
  test('distance takes five whole digits and two decimals with no ceiling', () => {
    expect(applyKey('1234', '5', DISTANCE_RULES)).toBe('12345');
    expect(applyKey('12345', '6', DISTANCE_RULES)).toBe('12345');
    expect(applyKey('400.5', '5', DISTANCE_RULES)).toBe('400.55');
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
