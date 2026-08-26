/**
 * Source-level regression guard for Sentry VOLYUME-1K.
 *
 * The crash was a NATIVE trap (EXC_BREAKPOINT) inside expo-notifications when
 * an Invalid Date reached a DATE trigger, so no runtime test can observe it
 * and no try/catch can contain it: the process is killed. The only durable
 * defence is that nothing schedules a notification directly any more.
 *
 * This suite therefore pins the shape of the code, not its behaviour:
 *   1. Nothing outside triggerDate.js calls scheduleNotificationAsync directly.
 *   2. No DATE trigger is built from a bare, unvalidated value.
 *   3. The guard rejects by proving validity, never by comparing to now,
 *      because NaN <= now is false and every such comparison fails open.
 */

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..');
const CHOKE_POINT = 'triggerDate.js';

const sourceFiles = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.js'))
  .filter((f) => f !== CHOKE_POINT);

describe('every notification is scheduled through the checked wrapper', () => {
  test.each(sourceFiles)('%s does not call scheduleNotificationAsync directly', (file) => {
    const src = fs.readFileSync(path.join(DIR, file), 'utf8');
    // Comments may still describe the underlying API; only real calls matter.
    const calls = src
      .split('\n')
      .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'))
      .filter((l) => /Notifications\s*\.\s*scheduleNotificationAsync\s*\(/.test(l));
    expect(calls).toEqual([]);
  });

  test('the choke point is the only place expo-notifications is scheduled', () => {
    const src = fs.readFileSync(path.join(DIR, CHOKE_POINT), 'utf8');
    expect(src).toMatch(/Notifications\.scheduleNotificationAsync\(/);
    expect(src).toMatch(/export async function scheduleCheckedNotification/);
  });

  test('every file that schedules imports the wrapper', () => {
    for (const file of sourceFiles) {
      const src = fs.readFileSync(path.join(DIR, file), 'utf8');
      if (!/scheduleCheckedNotification\s*\(/.test(src)) continue;
      expect(src).toMatch(/import\s*\{[^}]*scheduleCheckedNotification[^}]*\}\s*from\s*'\.\/triggerDate'/);
    }
  });
});

describe('the guard proves validity rather than comparing', () => {
  const src = fs.readFileSync(path.join(DIR, CHOKE_POINT), 'utf8');

  test('checks Number.isFinite, which is the only check NaN cannot pass', () => {
    expect(src).toMatch(/Number\.isFinite\(ms\)/);
  });

  test('also bounds the Date range, since a finite number can still be out of range', () => {
    // Number.isFinite(1e300) is true but new Date(1e300) is an Invalid Date,
    // so a finite-check on its own would have left the crash reachable.
    expect(src).toMatch(/8\.64e15/);
    expect(src).toMatch(/Math\.abs\(ms\)\s*<=\s*MAX_TIME_VALUE/);
  });

  test('records why this file exists so it is never "simplified" away', () => {
    expect(src).toMatch(/EXC_BREAKPOINT/);
    expect(src).toMatch(/Int\(self\.timestamp \/ 1000\)/);
  });
});
