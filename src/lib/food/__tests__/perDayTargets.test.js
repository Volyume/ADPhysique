/**
 * perDayTargets — per-day-of-week planning offsets (gap #13). Pure weekday maths
 * and offset sanitisation; the floor clamp itself is tested in effectiveTargets.
 *
 * The sync round-trip tests below (design-usability audit 2026-07-09,
 * L05-PDT1) pin loadPerDayOffsetsForSync + applyPerDayOffsetsFromCloud, the
 * two functions the new perday_target_offsets sync handler
 * (src/lib/sync/tables/perDayTargetOffsets.js) depends on.
 */
const mockStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k) => Promise.resolve(k in mockStore ? mockStore[k] : null)),
  setItem: jest.fn((k, v) => { mockStore[k] = v; return Promise.resolve(); }),
}));

const mockScheduleSync = jest.fn();
jest.mock('../../sync', () => ({ scheduleSync: (...a) => mockScheduleSync(...a) }));

import {
  weekdayKeyFromIso, sanitiseOffset, normaliseOffsets, offsetForDate, hasAnyOffset,
  WEEKDAY_KEYS, DEFAULT_PERDAY_OFFSETS, MAX_PERDAY_OFFSET_KCAL,
  loadPerDayOffsets, savePerDayOffsets, loadPerDayOffsetsUpdatedAtMs,
  loadPerDayOffsetsForSync, applyPerDayOffsetsFromCloud,
} from '../perDayTargets';

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  mockScheduleSync.mockClear();
});

describe('weekdayKeyFromIso', () => {
  test('maps known dates to the Monday-first weekday key', () => {
    // 2026-06-29 is a Monday; 2026-06-28 a Sunday; 2026-07-04 a Saturday.
    expect(weekdayKeyFromIso('2026-06-29')).toBe('mon');
    expect(weekdayKeyFromIso('2026-06-28')).toBe('sun');
    expect(weekdayKeyFromIso('2026-07-04')).toBe('sat');
    expect(weekdayKeyFromIso('2026-07-01')).toBe('wed');
  });

  test('returns null on a malformed input', () => {
    expect(weekdayKeyFromIso('')).toBeNull();
    expect(weekdayKeyFromIso('2026-6-1')).toBeNull();
    expect(weekdayKeyFromIso('not-a-date')).toBeNull();
    expect(weekdayKeyFromIso(null)).toBeNull();
    expect(weekdayKeyFromIso(20260629)).toBeNull();
  });
});

describe('sanitiseOffset', () => {
  test('rounds and bounds to the max offset', () => {
    expect(sanitiseOffset(123.4)).toBe(123);
    expect(sanitiseOffset(MAX_PERDAY_OFFSET_KCAL + 500)).toBe(MAX_PERDAY_OFFSET_KCAL);
    expect(sanitiseOffset(-MAX_PERDAY_OFFSET_KCAL - 500)).toBe(-MAX_PERDAY_OFFSET_KCAL);
  });

  test('non-finite or junk reads as 0', () => {
    expect(sanitiseOffset(NaN)).toBe(0);
    expect(sanitiseOffset('x')).toBe(0);
    expect(sanitiseOffset(undefined)).toBe(0);
    expect(sanitiseOffset(Infinity)).toBe(0); // non-finite reads as 0 before the bound
  });
});

describe('normaliseOffsets', () => {
  test('fills every weekday and bounds each value', () => {
    const out = normaliseOffsets({ mon: 200, sat: 99999, junk: 5 });
    expect(Object.keys(out).sort()).toEqual([...WEEKDAY_KEYS].sort());
    expect(out.mon).toBe(200);
    expect(out.sat).toBe(MAX_PERDAY_OFFSET_KCAL);
    expect(out.tue).toBe(0);
    expect(out).not.toHaveProperty('junk');
  });

  test('a missing / non-object input yields all-zero', () => {
    expect(normaliseOffsets(null)).toEqual(DEFAULT_PERDAY_OFFSETS);
    expect(normaliseOffsets(undefined)).toEqual(DEFAULT_PERDAY_OFFSETS);
  });
});

describe('offsetForDate', () => {
  test('returns the weekday offset for the date', () => {
    const offsets = normaliseOffsets({ sat: 300, sun: 300 });
    expect(offsetForDate(offsets, '2026-07-04')).toBe(300); // Saturday
    expect(offsetForDate(offsets, '2026-06-29')).toBe(0);   // Monday
  });

  test('a malformed date yields 0', () => {
    expect(offsetForDate(normaliseOffsets({ mon: 300 }), 'bad')).toBe(0);
  });
});

describe('hasAnyOffset', () => {
  test('true only when some weekday is non-zero', () => {
    expect(hasAnyOffset(DEFAULT_PERDAY_OFFSETS)).toBe(false);
    expect(hasAnyOffset(normaliseOffsets({ wed: -100 }))).toBe(true);
    expect(hasAnyOffset(null)).toBe(false);
  });
});

describe('savePerDayOffsets (local persistence + sync scheduling)', () => {
  test('round-trips through loadPerDayOffsets and stamps a last-write-wins clock', async () => {
    expect(await loadPerDayOffsetsUpdatedAtMs()).toBe(0); // never saved yet

    await savePerDayOffsets({ mon: 200, sat: -100 });

    const loaded = await loadPerDayOffsets();
    expect(loaded.mon).toBe(200);
    expect(loaded.sat).toBe(-100);
    expect(loaded.tue).toBe(0);
    expect(await loadPerDayOffsetsUpdatedAtMs()).toBeGreaterThan(0);
  });

  test('queues a sync push on every save, like the food-domain writers', async () => {
    await savePerDayOffsets({ wed: 50 });
    expect(mockScheduleSync).toHaveBeenCalledTimes(1);
  });

  test('a storage failure is tolerated (best-effort save, matches the pre-existing contract)', async () => {
    // eslint-disable-next-line global-require
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.setItem.mockImplementationOnce(() => Promise.reject(new Error('disk full')));
    await expect(savePerDayOffsets({ mon: 100 })).resolves.toMatchObject({ mon: 100 });
  });
});

describe('loadPerDayOffsetsForSync (push handler read path)', () => {
  test('returns the current offsets alongside the local updated-at clock', async () => {
    await savePerDayOffsets({ fri: 300 });
    const { offsets, updatedAtMs } = await loadPerDayOffsetsForSync();
    expect(offsets.fri).toBe(300);
    expect(updatedAtMs).toBeGreaterThan(0);
  });

  test('updatedAtMs is 0 when nothing has ever been saved locally', async () => {
    const { offsets, updatedAtMs } = await loadPerDayOffsetsForSync();
    expect(offsets).toEqual(DEFAULT_PERDAY_OFFSETS);
    expect(updatedAtMs).toBe(0);
  });
});

describe('applyPerDayOffsetsFromCloud (pull handler write path, LWW gate)', () => {
  test('applies a cloud row when nothing has ever been saved locally', async () => {
    const applied = await applyPerDayOffsetsFromCloud({ mon: 400 }, 5000);
    expect(applied).toBe(true);
    expect((await loadPerDayOffsets()).mon).toBe(400);
    expect(await loadPerDayOffsetsUpdatedAtMs()).toBe(5000);
  });

  test('skips a cloud row that is older than or equal to the local clock', async () => {
    await savePerDayOffsets({ mon: 100 }); // stamps "now" (large ms)
    const applied = await applyPerDayOffsetsFromCloud({ mon: 999 }, 1); // ancient cloud row
    expect(applied).toBe(false);
    expect((await loadPerDayOffsets()).mon).toBe(100); // local value untouched
  });

  test('applies a genuinely newer cloud row over an existing local value', async () => {
    await applyPerDayOffsetsFromCloud({ mon: 100 }, 1000);
    const applied = await applyPerDayOffsetsFromCloud({ mon: 999 }, 2000);
    expect(applied).toBe(true);
    expect((await loadPerDayOffsets()).mon).toBe(999);
  });

  test('never queues a sync push (a pull cannot loop back into an immediate push)', async () => {
    await applyPerDayOffsetsFromCloud({ mon: 100 }, 1000);
    expect(mockScheduleSync).not.toHaveBeenCalled();
  });
});
