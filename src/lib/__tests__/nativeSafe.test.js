/**
 * The native-value firewall (adversarial audit 2026-08-26).
 *
 * VOLYUME-1K established the class: JavaScript accepts values that native code
 * traps on. An Invalid Date reached expo-notifications, Swift's Int(Double)
 * trapped, and the process died with EXC_BREAKPOINT on a background queue where
 * no try/catch, ErrorBoundary or ScreenBoundary could see it.
 *
 * Every fixture below is a value JavaScript is perfectly happy with. That is
 * the whole point: none of these throw on the JS side, which is why they travel
 * so far before anything notices.
 *
 * The most important case, and the one that has caught this codebase more than
 * once, is `1e300`. Number.isFinite(1e300) is TRUE. new Date(1e300) is an
 * Invalid Date. A guard that checks only isFinite lets it through.
 */

import {
  safeFiniteNumber, safeEpochMs, safeDate, safePositiveDimension,
  safeIntInRange, safeEnum, safeDurationMs, MAX_TIME_VALUE,
} from '../nativeSafe';

/** Values JS tolerates and native does not. */
const HOSTILE = [
  ['NaN', NaN],
  ['Infinity', Infinity],
  ['-Infinity', -Infinity],
  ['null', null],
  ['undefined', undefined],
  ['an object', {}],
  ['an array', []],
  ['a numeric string', '42'],
  ['a non-numeric string', 'nonsense'],
  ['a boolean', true],
];

describe('safeFiniteNumber refuses everything native cannot take', () => {
  test.each(HOSTILE)('rejects %s', (_label, v) => {
    expect(safeFiniteNumber(v)).toBeNull();
  });

  test('accepts real numbers including negatives and zero', () => {
    expect(safeFiniteNumber(0)).toBe(0);
    expect(safeFiniteNumber(-12.5)).toBe(-12.5);
    expect(safeFiniteNumber(1e300)).toBe(1e300); // finite: the DATE helpers bound it
  });

  test('returns the caller\'s fallback, so the domain decides the default', () => {
    expect(safeFiniteNumber(NaN, 7)).toBe(7);
  });
});

describe('safeEpochMs bounds the Date range, not merely finiteness', () => {
  test.each(HOSTILE)('rejects %s', (_label, v) => {
    expect(safeEpochMs(v)).toBeNull();
  });

  test('rejects a finite number outside the representable Date range', () => {
    // THE case. isFinite says yes; new Date() says Invalid.
    expect(Number.isFinite(1e300)).toBe(true);
    expect(Number.isNaN(new Date(1e300).getTime())).toBe(true);
    expect(safeEpochMs(1e300)).toBeNull();
    expect(safeEpochMs(-1e300)).toBeNull();
  });

  test('accepts the exact boundary and rejects one past it', () => {
    expect(safeEpochMs(MAX_TIME_VALUE)).toBe(MAX_TIME_VALUE);
    expect(safeEpochMs(-MAX_TIME_VALUE)).toBe(-MAX_TIME_VALUE);
    expect(safeEpochMs(MAX_TIME_VALUE + 1)).toBeNull();
  });

  test('accepts an ordinary instant unchanged', () => {
    const now = Date.UTC(2026, 7, 27, 5, 13, 20);
    expect(safeEpochMs(now)).toBe(now);
  });
});

describe('safeDate never returns an Invalid Date', () => {
  test.each([...HOSTILE, ['an Invalid Date', new Date(NaN)], ['an out-of-range Date', new Date(8.64e15 + 1)]])(
    'rejects %s', (_label, v) => {
      expect(safeDate(v)).toBeNull();
    },
  );

  test('a returned Date is always valid', () => {
    for (const input of [0, Date.now(), new Date(), '2026-08-27T05:13:20.000Z']) {
      const d = safeDate(input);
      expect(d).toBeInstanceOf(Date);
      expect(Number.isNaN(d.getTime())).toBe(false);
    }
  });
});

describe('safePositiveDimension refuses geometry native cannot allocate', () => {
  test.each([...HOSTILE, ['zero', 0], ['a negative', -1], ['absurdly large', 1e9]])(
    'rejects %s', (_label, v) => {
      expect(safePositiveDimension(v)).toBeNull();
    },
  );

  test('accepts a real dimension', () => {
    expect(safePositiveDimension(390)).toBe(390);
    expect(safePositiveDimension(0.5)).toBe(0.5);
  });
});

describe('safeIntInRange holds the Android integer boundary', () => {
  test('rejects values outside the range rather than narrowing them', () => {
    // A JS number wider than the native integer does not narrow, it throws.
    expect(safeIntInRange(2 ** 40, 0, 2 ** 31 - 1)).toBeNull();
    expect(safeIntInRange(-1, 0, 100)).toBeNull();
  });

  test('truncates rather than rounds, so a fractional value cannot creep over max', () => {
    expect(safeIntInRange(9.99, 0, 9)).toBe(9);
  });

  test.each(HOSTILE)('rejects %s', (_label, v) => {
    expect(safeIntInRange(v, 0, 10)).toBeNull();
  });
});

describe('safeEnum and safeDurationMs', () => {
  test('an unknown enum value falls back rather than reaching native', () => {
    expect(safeEnum('flex', ['flex', 'fire'])).toBe('flex');
    expect(safeEnum('rocket', ['flex', 'fire'])).toBeNull();
    expect(safeEnum(undefined, ['flex'], 'flex')).toBe('flex');
  });

  test('a timer duration must be positive and bounded', () => {
    expect(safeDurationMs(90_000)).toBe(90_000);
    expect(safeDurationMs(0)).toBeNull();
    expect(safeDurationMs(-1)).toBeNull();
    expect(safeDurationMs(NaN)).toBeNull();
    expect(safeDurationMs(Infinity)).toBeNull();
    expect(safeDurationMs(48 * 60 * 60 * 1000)).toBeNull();
  });
});

describe('PhotoDatePicker no longer hands an Invalid Date to the native picker', () => {
  const fs = require('fs');
  const path = require('path');
  const SRC = fs.readFileSync(
    path.join(__dirname, '..', '..', 'components', 'PhotoDatePicker.js'), 'utf8',
  );

  test('it bounds the epoch instead of only checking finiteness', () => {
    expect(SRC).toContain('safeEpochMs(maxMs)');
    expect(SRC).toContain('safeEpochMs(valueMs)');
    expect(SRC).not.toMatch(/Number\.isFinite\(maxMs\)/);
    expect(SRC).not.toMatch(/Number\.isFinite\(valueMs\)/);
  });

  test('a committed selection is bounded too, so NaN cannot be stored', () => {
    // The platform can return an Invalid Date from a cancelled or malformed
    // spinner; committing its NaN would poison every Date built from the
    // stored photo date afterwards.
    expect(SRC).toMatch(/const chosen = safeEpochMs\(d\.getTime\(\)\);/);
    expect(SRC).toMatch(/if \(chosen === null\) return;/);
  });

  test('the reason is recorded so the weaker check is not restored', () => {
    expect(SRC).toMatch(/Number\.isFinite\(1e300\) is true/);
  });
});
