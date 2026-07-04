/**
 * A tiny reusable in-flight/race guard for an async load keyed to state that
 * can change while the load is still awaiting (BUG-1, elite audit
 * 2026-07-04): DiaryScreen's day-load had no such guard, so rapid date
 * navigation could put two loads for different days in flight at once, and
 * whichever resolved LAST won regardless of which day it was for, briefly
 * painting a stale day's calories/entries under the newer, currently-selected
 * date.
 *
 * Usage: call `next()` at the very START of every load to get a token for
 * that call. After every `await`, and again immediately before committing any
 * state from the load, call `isCurrent(token)`; if it returns false a newer
 * load has started since and this one's result must be dropped rather than
 * applied.
 */
export function createRaceGuard() {
  let current = 0;
  return {
    /** Start a new load; returns the token identifying this call. */
    next() {
      current += 1;
      return current;
    },
    /** Whether `token` still belongs to the most recently started load. */
    isCurrent(token) {
      return token === current;
    },
  };
}
