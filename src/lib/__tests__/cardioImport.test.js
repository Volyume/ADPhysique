/**
 * ULTIMATE-CUX-PCI — passive cardio import, pure decision + mapping helpers.
 * Pins the cursor filter, ext_id de-dup (NA-cux-4), keep-both for manual
 * sessions (NA-cux-7), and the session→cardio_log payload mapping (feedback-only
 * kcal, platform source tag, ext_id carried for de-dup).
 *
 * The native readers (readCardioSessionsSince) and the importNewCardio
 * orchestration are device-verified (Apple Health / Health Connect can't run in
 * CI); these tests lock the logic that decides what gets written.
 */
import { planCardioImport, cardioSessionToLog, importNewCardio } from '../health';

const session = (over = {}) => ({
  extId: 'HK-1', startMs: 2000, durationMin: 30, distance: 5000,
  avgHr: 150, estKcal: 320, activityName: 'Outdoor Run', source: 'Apple Health', ...over,
});

describe('planCardioImport', () => {
  test('imports only sessions after the cursor and advances it to the newest', () => {
    const sessions = [
      session({ extId: 'a', startMs: 3000 }),
      session({ extId: 'b', startMs: 1500 }), // before cursor 2000 → skipped
      session({ extId: 'c', startMs: 2500 }),
    ];
    const { toInsert, latestMs } = planCardioImport(sessions, 2000, new Set());
    expect(toInsert.map(s => s.extId)).toEqual(['a', 'c']);
    expect(latestMs).toBe(3000);
  });

  test('de-dups sessions already imported by ext_id (NA-cux-4) but still advances the cursor', () => {
    const sessions = [
      session({ extId: 'a', startMs: 3000 }),
      session({ extId: 'b', startMs: 2500 }),
    ];
    const { toInsert, latestMs } = planCardioImport(sessions, 0, new Set(['a']));
    expect(toInsert.map(s => s.extId)).toEqual(['b']);
    expect(latestMs).toBe(3000); // 'a' was seen, so the cursor still moves past it
  });

  test('a session with no ext_id is always imported (cannot be de-duped)', () => {
    const { toInsert } = planCardioImport([session({ extId: null, startMs: 5 })], 0, new Set(['a']));
    expect(toInsert).toHaveLength(1);
  });

  test('null / empty / pre-cursor input → nothing to insert, cursor unchanged', () => {
    expect(planCardioImport(null, 100)).toEqual({ toInsert: [], latestMs: 100 });
    expect(planCardioImport([], 100)).toEqual({ toInsert: [], latestMs: 100 });
    expect(planCardioImport([session({ startMs: 50 })], 100).toInsert).toEqual([]);
  });
});

describe('importNewCardio entitlement guard', () => {
  test('a non-paid tier no-ops even when the OS cardio permission is granted', async () => {
    // isPaid:false short-circuits before any permission/cursor/DB work, so a
    // downgraded ex-Pro user with the OS permission still granted imports nothing.
    expect(await importNewCardio('u1', { isPaid: false })).toEqual({ imported: 0, latestMs: 0 });
  });

  test('no user id → no-op regardless of tier', async () => {
    expect(await importNewCardio(null, { isPaid: true })).toEqual({ imported: 0, latestMs: 0 });
  });
});

describe('cardioSessionToLog', () => {
  test('maps a session to the cardio_log payload with the platform source + ext_id', () => {
    const payload = cardioSessionToLog(session(), { sourceTag: 'apple_health', dayKeyFn: () => '2026-06-14' });
    expect(payload).toEqual({
      entryDate: '2026-06-14',
      activityName: 'Outdoor Run',
      durationMin: 30,
      intensity: 'moderate',
      distance: 5000,
      avgHr: 150,
      estKcal: 320,
      source: 'apple_health',
      extId: 'HK-1',
    });
  });

  test('rounds avg HR + kcal, clamps negative kcal, tolerates missing fields', () => {
    const payload = cardioSessionToLog(
      { startMs: 1, durationMin: 22.6, avgHr: 142.7, estKcal: -5 },
      { sourceTag: 'health_connect' },
    );
    expect(payload.durationMin).toBe(23);
    expect(payload.avgHr).toBe(143);
    expect(payload.estKcal).toBe(0);
    expect(payload.distance).toBeNull();
    expect(payload.extId).toBeNull();
    expect(payload.entryDate).toBeUndefined(); // no dayKeyFn → let insert default to today
    expect(payload.source).toBe('health_connect');
  });
});
