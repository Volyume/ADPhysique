/**
 * loadRaceGuard (BUG-1, elite audit 2026-07-04): the tiny token guard
 * DiaryScreen's day-load now uses so a slower, stale-date load can never
 * overwrite a newer one. This pins the guard's own promise directly, out of
 * band from DiaryScreen's much heavier dependency graph (see
 * DiaryScreen.raceGuard.guard.test.js for the source-level wiring pin).
 */
import { createRaceGuard } from '../loadRaceGuard';

describe('createRaceGuard', () => {
  test('a single load is current from start to finish', () => {
    const guard = createRaceGuard();
    const token = guard.next();
    expect(guard.isCurrent(token)).toBe(true);
  });

  test('starting a newer load supersedes the previous token', () => {
    const guard = createRaceGuard();
    const first = guard.next();
    const second = guard.next();
    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });

  test('a stale load resolving AFTER a newer one is correctly identified as stale (the DiaryScreen race)', async () => {
    const guard = createRaceGuard();

    // Simulate DiaryScreen.load(): tapping "previous day" fires a load for
    // day A, then tapping "next day" fires a second load for day B before
    // A's reads have resolved. A's underlying DB reads are slower (e.g. a
    // colder cache) so A's promise settles AFTER B's.
    async function loadDay(delayMs, guardToken) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return { applied: guard.isCurrent(guardToken) };
    }

    const tokenA = guard.next();
    const loadA = loadDay(20, tokenA); // slower stale load (day A)
    const tokenB = guard.next();
    const loadB = loadDay(5, tokenB); // faster newer load (day B)

    const [resultB, resultA] = await Promise.all([loadB, loadA]);

    // The newer load (B, the currently-selected day) commits its result...
    expect(resultB.applied).toBe(true);
    // ...but the stale load (A) must NOT overwrite it, even though it
    // resolved later in wall-clock time.
    expect(resultA.applied).toBe(false);
  });
});
