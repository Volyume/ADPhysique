/**
 * timeEntry (12-BUILD-SPEC sections 1.5 and 2, register D220). Pins the
 * microwave-style time buffer behind the keypad's time mode: digits enter from
 * the right, the well reads m:ss, seconds over 59 roll into minutes, the value
 * is clamped to the app's 99:59 ceiling, the buffer holds 4 digits and keeps no
 * leading zero, and seconds to buffer is the inverse for seeding an edit.
 */
import fs from 'fs';
import path from 'path';
import {
  MAX_SECONDS, pushDigit, popDigit, bufferToSeconds, secondsToBuffer, bufferToDisplay,
} from '../timeEntry';

const keyIn = (digits) => digits.split('').reduce((buf, d) => pushDigit(buf, d), '');

describe('pushDigit', () => {
  test('appends a digit', () => {
    expect(pushDigit('', '5')).toBe('5');
    expect(pushDigit('1', '3')).toBe('13');
    expect(pushDigit('13', '0')).toBe('130');
  });

  test('a 0 on an empty buffer is ignored, so 0 then 5 leaves 5 (reads 0:05)', () => {
    expect(pushDigit('', '0')).toBe('');
    expect(keyIn('05')).toBe('5');
    expect(bufferToDisplay(keyIn('05'))).toBe('0:05');
  });

  test('a 0 after other digits is kept', () => {
    expect(keyIn('100')).toBe('100');
  });

  test('a fifth digit is ignored', () => {
    expect(pushDigit('1234', '5')).toBe('1234');
    expect(keyIn('123456')).toBe('1234');
  });

  test('anything but a single digit is ignored', () => {
    expect(pushDigit('12', '.')).toBe('12');
    expect(pushDigit('12', 'a')).toBe('12');
    expect(pushDigit('12', '')).toBe('12');
    expect(pushDigit('12', '34')).toBe('12');
    expect(pushDigit(undefined, '7')).toBe('7');
  });

  test('accepts a numeric digit', () => {
    expect(pushDigit('1', 2)).toBe('12');
  });
});

describe('popDigit', () => {
  test('drops the last digit', () => {
    expect(popDigit('130')).toBe('13');
    expect(popDigit('5')).toBe('');
  });
  test('an empty buffer stays empty', () => {
    expect(popDigit('')).toBe('');
    expect(popDigit(undefined)).toBe('');
  });
});

describe('bufferToSeconds', () => {
  test('blank is blank, the cleared state', () => {
    expect(bufferToSeconds('')).toBe('');
    expect(bufferToSeconds(undefined)).toBe('');
  });
  test.each([
    ['5', 5],
    ['90', 90],
    ['130', 90],
    ['9959', 5999],
    ['100', 60],
    ['1000', 600],
  ])('%s is %i seconds', (buffer, seconds) => {
    expect(bufferToSeconds(buffer)).toBe(seconds);
  });
  test('seconds over 59 roll into minutes, as a microwave does', () => {
    expect(bufferToSeconds('1075')).toBe(10 * 60 + 75);
    expect(bufferToSeconds('175')).toBe(135);
    expect(bufferToSeconds('99')).toBe(99);
  });
  test('is clamped to the app maximum of 99:59', () => {
    expect(MAX_SECONDS).toBe(5999);
    expect(bufferToSeconds('9999')).toBe(5999);
    expect(bufferToSeconds('9960')).toBe(5999);
  });
});

describe('secondsToBuffer', () => {
  test.each([[90, '130'], [5, '5'], [60, '100'], [600, '1000'], [5999, '9959'], [59, '59']])(
    '%i seconds seeds %s', (seconds, buffer) => {
      expect(secondsToBuffer(seconds)).toBe(buffer);
    },
  );
  test('zero, blank and non-finite seed an empty buffer', () => {
    [0, '', null, undefined, NaN, Infinity, -Infinity, 'abc', -5].forEach((v) => {
      expect(secondsToBuffer(v)).toBe('');
    });
  });
  test('a value over the ceiling is clamped and a fraction is rounded', () => {
    expect(secondsToBuffer(7000)).toBe('9959');
    expect(secondsToBuffer(30.4)).toBe('30');
  });
  test('a numeric string is read as a number', () => {
    expect(secondsToBuffer('90')).toBe('130');
  });
  test('round trip for 0 to 5999', () => {
    expect(bufferToSeconds(secondsToBuffer(0))).toBe('');
    for (let s = 1; s <= MAX_SECONDS; s += 1) {
      const buffer = secondsToBuffer(s);
      expect(buffer.length).toBeLessThanOrEqual(4);
      expect(bufferToSeconds(buffer)).toBe(s);
    }
  });
});

describe('bufferToDisplay', () => {
  test.each([
    ['', ''],
    ['5', '0:05'],
    ['45', '0:45'],
    ['90', '0:90'],
    ['130', '1:30'],
    ['1075', '10:75'],
    ['9959', '99:59'],
  ])('%s reads %s', (buffer, text) => {
    expect(bufferToDisplay(buffer)).toBe(text);
  });
});

describe('timeEntry source guard', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'timeEntry.js'), 'utf8');
  test('pure: no import, no I/O', () => {
    expect(SRC).not.toMatch(/^import\s/m);
    expect(SRC).not.toMatch(/require\(|AsyncStorage|fetch\(|Date\.now|Math\.random/);
  });
  test('no em dash', () => {
    expect(SRC).not.toContain(String.fromCharCode(0x2014));
  });
});
