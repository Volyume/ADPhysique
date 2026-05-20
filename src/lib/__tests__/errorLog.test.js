/**
 * Verifies the verbose error-log ring buffer behaves correctly under the
 * conditions the app will throw at it:
 *  - first read with no stored buffer returns []
 *  - logError/logWarn append to the front (most-recent-first)
 *  - the buffer caps at MAX_ENTRIES (200)
 *  - messages, stacks, and contexts are clipped to safe sizes
 *  - clearErrors wipes both memory and storage
 *  - exportErrorsAsText is human-readable
 *  - log calls survive AsyncStorage rejection without throwing
 */
import { logError, logWarn, logInfo, getRecentErrors, clearErrors, exportErrorsAsText, getCrashLog, clearCrashLog } from '../errorLog';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Tests run with jest fake timers so the 200ms debounced write fires
// deterministically.
beforeEach(async () => {
  await AsyncStorage.clear();
  await clearErrors();
  await clearCrashLog();
});

// Helper to flush the debounced write inside errorLog.js.
async function flushWrites() {
  // The module uses setTimeout(.., 200) for debounced writes. We run real
  // timers + a microtask flush rather than mocking timers (which would
  // need jest.useFakeTimers configured globally).
  await new Promise(r => setTimeout(r, 250));
}

describe('errorLog ring buffer', () => {
  test('initial getRecentErrors returns empty array', async () => {
    const list = await getRecentErrors();
    expect(list).toEqual([]);
  });

  test('logError captures message, stack, scope, and context', async () => {
    const err = new Error('boom');
    logError('TestScope', err, { foo: 'bar' });
    await flushWrites();
    const list = await getRecentErrors();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      level: 'error',
      scope: 'TestScope',
      message: 'boom',
      context: expect.stringContaining('bar'),
    });
    expect(list[0].stack).toContain('Error: boom');
    expect(typeof list[0].ts).toBe('number');
  });

  test('logWarn captures messages without a stack', async () => {
    logWarn('CoachEngine', 'EWMA gap too short', { length: 7 });
    await flushWrites();
    const [entry] = await getRecentErrors();
    expect(entry.level).toBe('warn');
    expect(entry.scope).toBe('CoachEngine');
    expect(entry.message).toBe('EWMA gap too short');
    expect(entry.stack).toBe('');
  });

  test('entries arrive most-recent-first', async () => {
    logError('A', new Error('first'));
    logError('B', new Error('second'));
    logError('C', new Error('third'));
    await flushWrites();
    const list = await getRecentErrors();
    expect(list.map(e => e.message)).toEqual(['third', 'second', 'first']);
  });

  test('ring buffer caps at 200 entries', async () => {
    for (let i = 0; i < 220; i++) logError('loop', new Error(`e${i}`));
    await flushWrites();
    const list = await getRecentErrors();
    expect(list.length).toBe(200);
    // Newest first
    expect(list[0].message).toBe('e219');
    // Oldest of the kept 200 is e20
    expect(list[199].message).toBe('e20');
  });

  test('long messages and stacks are clipped', async () => {
    const longMessage = 'x'.repeat(2000);
    const longStack = 'frame at line\n'.repeat(500);
    const err = new Error(longMessage);
    err.stack = longStack;
    logError('Big', err);
    await flushWrites();
    const [entry] = await getRecentErrors();
    expect(entry.message.length).toBeLessThanOrEqual(600);
    expect(entry.stack.length).toBeLessThanOrEqual(1800);
  });

  test('scope is clipped to 80 chars to keep buffer tidy', async () => {
    const longScope = 'Screen.'.repeat(50);
    logError(longScope, new Error('e'));
    await flushWrites();
    const [entry] = await getRecentErrors();
    expect(entry.scope.length).toBeLessThanOrEqual(80);
  });

  test('falsy / non-Error inputs do not throw and produce a string message', async () => {
    logError('Edge', null);
    logError('Edge', undefined);
    logError('Edge', 'just a string');
    logError('Edge', 42);
    logError('Edge', { msg: 'plain object' });
    await flushWrites();
    const list = await getRecentErrors();
    expect(list.length).toBe(5);
    expect(list.every(e => typeof e.message === 'string')).toBe(true);
  });

  test('clearErrors wipes the buffer', async () => {
    logError('A', new Error('one'));
    await flushWrites();
    expect((await getRecentErrors()).length).toBe(1);
    await clearErrors();
    expect((await getRecentErrors()).length).toBe(0);
  });

  test('exportErrorsAsText returns plain text and "No errors" placeholder', async () => {
    expect(await exportErrorsAsText()).toBe('No errors logged.');
    logError('Test', new Error('hello'), { user: 'alice' });
    await flushWrites();
    const text = await exportErrorsAsText();
    expect(text).toContain('ERROR Test');
    expect(text).toContain('hello');
    expect(text).toContain('alice');
  });
});

describe('errorLog robustness', () => {
  test('logError still resolves when AsyncStorage.setItem rejects', async () => {
    const original = AsyncStorage.setItem;
    AsyncStorage.setItem = jest.fn().mockRejectedValue(new Error('disk full'));
    try {
      // Should not throw
      logError('Risky', new Error('payload'));
      await flushWrites();
      // Memory buffer still updated even if disk write failed
      const list = await getRecentErrors();
      expect(list.length).toBeGreaterThan(0);
    } finally {
      AsyncStorage.setItem = original;
    }
  });

  test('logInfo is a no-op when __DEV__ is false', async () => {
    const wasDev = global.__DEV__;
    global.__DEV__ = false;
    try {
      logInfo('Prod', 'should not persist');
      await flushWrites();
      const list = await getRecentErrors();
      expect(list.length).toBe(0);
    } finally {
      global.__DEV__ = wasDev;
    }
  });

  test('logInfo persists in dev', async () => {
    const wasDev = global.__DEV__;
    global.__DEV__ = true;
    try {
      logInfo('Dev', 'first launch');
      await flushWrites();
      const [entry] = await getRecentErrors();
      expect(entry?.level).toBe('info');
      expect(entry?.message).toBe('first launch');
    } finally {
      global.__DEV__ = wasDev;
    }
  });
});

describe('crash log helpers', () => {
  test('getCrashLog returns null when nothing is stored', async () => {
    expect(await getCrashLog()).toBeNull();
  });

  test('clearCrashLog removes the legacy crash entry', async () => {
    await AsyncStorage.setItem('@volyume_crash_log', JSON.stringify({ message: 'old', ts: 1 }));
    expect((await getCrashLog())?.message).toBe('old');
    await clearCrashLog();
    expect(await getCrashLog()).toBeNull();
  });
});
