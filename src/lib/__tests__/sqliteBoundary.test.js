import { assertSafeSqliteBindings, guardSqliteConnection } from '../sqliteBoundary';

describe('central JS to native SQLite numeric boundary', () => {
  test.each([NaN, Infinity, -Infinity, Number.MAX_VALUE, 1e20])(
    'rejects %p before invoking native code',
    async (unsafe) => {
      const native = { runAsync: jest.fn(async () => true) };
      const guarded = guardSqliteConnection(native);
      expect(() => guarded.runAsync('INSERT INTO t VALUES (?)', [unsafe])).toThrow(/Unsafe SQLite/);
      expect(native.runAsync).not.toHaveBeenCalled();
    },
  );

  test('checks named, array and variadic binding shapes recursively', () => {
    expect(() => assertSafeSqliteBindings(['sql', { $value: Infinity }])).toThrow(/Unsafe SQLite/);
    expect(() => assertSafeSqliteBindings(['sql', [1, { nested: NaN }]])).toThrow(/Unsafe SQLite/);
    expect(() => assertSafeSqliteBindings(['sql', 'id', -Infinity])).toThrow(/Unsafe SQLite/);
  });

  test('rejects Date objects, including Invalid Date, as non-bind primitives', () => {
    expect(() => assertSafeSqliteBindings(['sql', [new Date()]])).toThrow(/Unsupported SQLite/);
    expect(() => assertSafeSqliteBindings(['sql', [new Date('bad')]])).toThrow(/Unsupported SQLite/);
  });

  test('allows bounded numbers and supported SQLite primitives', async () => {
    const native = { runAsync: jest.fn(async () => 'ok') };
    const guarded = guardSqliteConnection(native);
    await expect(guarded.runAsync('sql', [0, -1.5, Number.MAX_SAFE_INTEGER, null, true, '3']))
      .resolves.toBe('ok');
    expect(native.runAsync).toHaveBeenCalledTimes(1);
  });
});

