/**
 * accountEpoch.js
 *
 * A monotonically increasing counter identifying "which signed-in account this
 * device is currently serving". Sign-out and account switch bump it.
 *
 * WHY THIS EXISTS (P1 cross-account isolation, adversarial audit 2026-08-26).
 *
 * Wiping storage on sign-out is necessary but not sufficient. Account A's
 * asynchronous work does not stop when A signs out: a cloud read dispatched
 * while A was signed in resolves some hundreds of milliseconds later, and the
 * code that awaited it then writes the result into the store and into
 * AsyncStorage. If account B has signed in during that window, A's tier, trial
 * state or profile lands under B's session. The audit's named cases are
 * exactly this shape:
 *
 *     A -> delayed tier response after B login
 *     A -> delayed profile response
 *
 * It also defeats verification. Sign-out clears AsyncStorage and then checks it
 * is empty; a late write from A between the clear and the check makes a clean
 * device look dirty, or worse, re-seeds a key after the check passed.
 *
 * THE RULE. Any code that awaits, and then writes user-scoped state, must
 * capture the epoch BEFORE the await and drop its result if the epoch has moved:
 *
 *     const epoch = currentEpoch();
 *     const row = await readSomethingFromCloud();
 *     if (!isEpochCurrent(epoch)) return;   // A's answer, B's device
 *     set({ ... });
 *
 * This is deliberately a plain module-level counter and not store state. It has
 * to survive the store being reset, it must be readable from lib modules that
 * must not import the store eagerly, and it must never itself be persisted:
 * a fresh process is a fresh epoch, and nothing from a previous process is
 * allowed to look current.
 */

let epoch = 0;

/** The epoch to capture before an await. */
export function currentEpoch() {
  return epoch;
}

/**
 * Bump the epoch. Called at the START of sign-out / account switch, before any
 * wiping, so in-flight work is invalidated while the wipe runs rather than
 * after it.
 *
 * @returns {number} the new epoch.
 */
export function beginNewAccountEpoch() {
  epoch += 1;
  return epoch;
}

/**
 * True when `captured` is still the live epoch, i.e. the account that started
 * this work is still the account the device is serving.
 *
 * A non-numeric argument returns false: an un-captured epoch is treated as
 * stale rather than current, so a caller that forgets to capture fails closed.
 */
export function isEpochCurrent(captured) {
  return typeof captured === 'number' && captured === epoch;
}

/** Test-only reset so suites do not leak epochs into one another. */
export function __resetAccountEpochForTests() {
  epoch = 0;
}
