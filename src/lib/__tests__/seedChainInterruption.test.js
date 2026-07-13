/**
 * VOLYUME-27 (founder clean-slate walk, 2026-07-13): a concurrent database
 * lifecycle event (sign-in account switch / sign-out wipe) released the
 * SQLite connection while the boot seed/derive chain was mid-loop, and the
 * benign, self-healing interruption reported as a Sentry ERROR. Pins the
 * classifier: lifecycle interruptions (top-level or nested in the cause
 * chain, as expo's CodedError nests them) classify true; real SQL failures
 * stay errors.
 */
import { isDbLifecycleInterruption } from '../seedExercises';

function chained(messages) {
  let err = null;
  for (const m of messages.reverse()) {
    const e = new Error(m);
    if (err) e.cause = err;
    err = e;
  }
  return err;
}

describe('isDbLifecycleInterruption', () => {
  test('classifies the released-statement chain from VOLYUME-27', () => {
    expect(isDbLifecycleInterruption(chained([
      "Call to function 'NativeStatement.runAsync' has been rejected.",
      'The 1st argument cannot be cast to type expo.modules.sqlite.NativeStatement (received class java.lang.Integer)',
      'Cannot use shared object that was already released',
    ]))).toBe(true);
  });

  test('classifies a top-level released message', () => {
    expect(isDbLifecycleInterruption(new Error('Cannot use shared object that was already released'))).toBe(true);
  });

  test('keeps real SQL failures as errors', () => {
    expect(isDbLifecycleInterruption(new Error('UNIQUE constraint failed: exercises.id'))).toBe(false);
    expect(isDbLifecycleInterruption(new Error('database or disk is full'))).toBe(false);
    expect(isDbLifecycleInterruption(null)).toBe(false);
  });
});
