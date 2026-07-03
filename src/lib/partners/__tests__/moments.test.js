/**
 * Milestone MOMENTS ENGINE (spec B6, brief C3). Pins the SAFETY-CRITICAL
 * contract of src/lib/partners/moments.js:
 *   - at most one moment per pair per LOCAL day;
 *   - priority streak_week_kept > completed_block > hit_pb;
 *   - the 7-day horizon; the hit_pb 2-per-rolling-7-days cap;
 *   - seen persistence (a seen moment never returns);
 *   - EVERY fail-closed suppression lever individually returns [] (open ED flag,
 *     ED-flag read failure, SCOFF >= 2, calm mode, wellbeing read failure);
 *   - the EXACT B6 copy strings;
 *   - determinism (two calls, same result).
 *
 * The database + suppression reads are mocked; sharedStreak (pure) and the
 * dayKey/wellbeing helpers run for real, so the streak derivation and the
 * fail-closed sentinels are exercised against the REAL code.
 */
jest.mock('../../database', () => ({
  getPartnershipsLocal: jest.fn(),
  getOpenEdPatternFlag: jest.fn().mockResolvedValue(null),
  getUserBodyProfile: jest.fn().mockResolvedValue({ scoffScore: 0 }),
  getPartnerWeekSignal: jest.fn().mockResolvedValue(null),
  getPairWeekSignals: jest.fn().mockResolvedValue([]),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { WELLBEING_KEY } from '../../wellbeing';
import { localWeekStartMs } from '../../dayKey';
import { getVisibleMoments, markMomentSeen } from '../moments';

const db = require('../../database');

const WEEK_MS = 7 * 86400000;
const DAY_MS = 86400000;
const NOW = Date.now();
const CUR = localWeekStartMs(NOW);
const PREV = CUR - WEEK_MS;
const PREV2 = CUR - 2 * WEEK_MS;

const ME = 'me';
const PARTNER = 'partner';
const PAIR = 'pair1';

const SEEN_KEY = '@volyume_partner_moments_seen_v1';
const PB_LOG_KEY = '@volyume_partner_moments_pb_v1';

const STREAK_ID = `${PAIR}:streak_week_kept:${CUR}`;

function activePair(extra = {}) {
  db.getPartnershipsLocal.mockResolvedValue([
    { id: PAIR, status: 'active', memberA: ME, memberB: PARTNER, streakEnabled: 1, partnerFirstName: 'Sam', ...extra },
  ]);
}

// Two consecutive fully-met finished weeks -> shared streak run 2, counting.
function streakSignals() {
  db.getPairWeekSignals.mockResolvedValue([
    { weekStart: String(PREV2), userId: ME, weekMet: 1, state: 'training' },
    { weekStart: String(PREV2), userId: PARTNER, weekMet: 1, state: 'training' },
    { weekStart: String(PREV), userId: ME, weekMet: 1, state: 'training' },
    { weekStart: String(PREV), userId: PARTNER, weekMet: 1, state: 'training' },
  ]);
}

// Set the partner's own week signal for the current / previous week.
function partnerSignal({ current = null, prev = null } = {}) {
  db.getPartnerWeekSignal.mockImplementation((pairId, uid, ws) => {
    if (String(ws) === String(CUR)) return Promise.resolve(current);
    if (String(ws) === String(PREV)) return Promise.resolve(prev);
    return Promise.resolve(null);
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  db.getOpenEdPatternFlag.mockResolvedValue(null);
  db.getUserBodyProfile.mockResolvedValue({ scoffScore: 0 });
  db.getPartnerWeekSignal.mockResolvedValue(null);
  db.getPairWeekSignals.mockResolvedValue([]);
  activePair();
});

describe('derivation + shape', () => {
  test('streak advancing to >= 2 weeks yields a streak_week_kept moment', async () => {
    streakSignals();
    const moments = await getVisibleMoments(ME);
    expect(moments).toHaveLength(1);
    expect(moments[0]).toMatchObject({
      id: STREAK_ID, pairId: PAIR, kind: 'streak_week_kept',
    });
  });

  test('no active pair -> no moments', async () => {
    db.getPartnershipsLocal.mockResolvedValue([{ id: PAIR, status: 'invited' }]);
    streakSignals();
    expect(await getVisibleMoments(ME)).toEqual([]);
  });

  test('no userId -> []', async () => {
    expect(await getVisibleMoments(null)).toEqual([]);
  });

  test('a held (not advancing) streak yields no streak moment', async () => {
    // Latest finished week is quiet (one trained-but-unmet): streak holds, does
    // not advance, so no "another week" moment.
    db.getPairWeekSignals.mockResolvedValue([
      { weekStart: String(PREV2), userId: ME, weekMet: 1, state: 'training' },
      { weekStart: String(PREV2), userId: PARTNER, weekMet: 1, state: 'training' },
      { weekStart: String(PREV), userId: ME, weekMet: 0, state: 'training' },
      { weekStart: String(PREV), userId: PARTNER, weekMet: 1, state: 'training' },
    ]);
    expect(await getVisibleMoments(ME)).toEqual([]);
  });
});

describe('exact B6 copy', () => {
  test('streak line', async () => {
    streakSignals();
    const [m] = await getVisibleMoments(ME);
    expect(m.line).toBe('Another week you both showed up.');
  });

  test('completed_block line uses the partner first name', async () => {
    partnerSignal({ current: { weekStart: String(CUR), completedBlock: 1, hitPb: 0, updatedAt: NOW } });
    const [m] = await getVisibleMoments(ME);
    expect(m.kind).toBe('completed_block');
    expect(m.line).toBe('Sam finished their training block.');
  });

  test('hit_pb line uses the partner first name', async () => {
    partnerSignal({ current: { weekStart: String(CUR), completedBlock: 0, hitPb: 1, updatedAt: NOW } });
    const [m] = await getVisibleMoments(ME);
    expect(m.kind).toBe('hit_pb');
    expect(m.line).toBe('Sam set a new personal best.');
  });

  test('missing partner first name falls back without a raw id', async () => {
    activePair({ partnerFirstName: undefined });
    partnerSignal({ current: { weekStart: String(CUR), completedBlock: 1, hitPb: 0, updatedAt: NOW } });
    const [m] = await getVisibleMoments(ME);
    expect(m.line).toBe('Your partner finished their training block.');
  });
});

describe('priority + one-per-pair-per-day', () => {
  test('all three present -> exactly one moment, streak wins', async () => {
    streakSignals();
    partnerSignal({ current: { weekStart: String(CUR), completedBlock: 1, hitPb: 1, updatedAt: NOW } });
    const moments = await getVisibleMoments(ME);
    expect(moments).toHaveLength(1);
    expect(moments[0].kind).toBe('streak_week_kept');
  });

  test('block beats pb when there is no streak', async () => {
    db.getPairWeekSignals.mockResolvedValue([]); // no streak
    partnerSignal({ current: { weekStart: String(CUR), completedBlock: 1, hitPb: 1, updatedAt: NOW } });
    const [m] = await getVisibleMoments(ME);
    expect(m.kind).toBe('completed_block');
  });

  test('pb only when it is the sole candidate', async () => {
    partnerSignal({ current: { weekStart: String(CUR), completedBlock: 0, hitPb: 1, updatedAt: NOW } });
    const [m] = await getVisibleMoments(ME);
    expect(m.kind).toBe('hit_pb');
  });

  test('once a moment is marked seen, nothing more for that pair today', async () => {
    streakSignals();
    partnerSignal({ current: { weekStart: String(CUR), completedBlock: 1, hitPb: 1, updatedAt: NOW } });
    const [first] = await getVisibleMoments(ME);
    await markMomentSeen(first.id);
    // Same day: the pair is capped even though block + pb are still unseen.
    expect(await getVisibleMoments(ME)).toEqual([]);
  });
});

describe('7-day horizon', () => {
  test('a moment whose signal updated over 7 days ago is never surfaced', async () => {
    partnerSignal({
      current: null,
      prev: { weekStart: String(PREV), completedBlock: 1, hitPb: 0, updatedAt: NOW - 8 * DAY_MS },
    });
    expect(await getVisibleMoments(ME)).toEqual([]);
  });

  test('a fresh previous-week signal (within 7 days) still surfaces', async () => {
    partnerSignal({
      current: null,
      prev: { weekStart: String(PREV), completedBlock: 1, hitPb: 0, updatedAt: NOW - 2 * DAY_MS },
    });
    const [m] = await getVisibleMoments(ME);
    expect(m.kind).toBe('completed_block');
  });
});

describe('seen persistence', () => {
  test('a seen moment never returns (lower priority surfaces instead)', async () => {
    streakSignals();
    partnerSignal({ current: { weekStart: String(CUR), completedBlock: 1, hitPb: 0, updatedAt: NOW } });
    // Pre-seed the streak moment as already seen (without a shown-day cap).
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([STREAK_ID]));
    const [m] = await getVisibleMoments(ME);
    expect(m.kind).toBe('completed_block'); // streak filtered, block surfaces
  });

  test('markMomentSeen persists the id across calls', async () => {
    partnerSignal({ current: { weekStart: String(CUR), completedBlock: 1, hitPb: 0, updatedAt: NOW } });
    const [m] = await getVisibleMoments(ME);
    await markMomentSeen(m.id);
    const seen = JSON.parse(await AsyncStorage.getItem(SEEN_KEY));
    expect(seen).toContain(m.id);
  });
});

describe('hit_pb rolling 2-per-7-days cap', () => {
  test('a third pb in the rolling window is suppressed', async () => {
    await AsyncStorage.setItem(PB_LOG_KEY, JSON.stringify([
      { id: 'a', pairId: PAIR, ts: NOW - DAY_MS },
      { id: 'b', pairId: PAIR, ts: NOW - 2 * DAY_MS },
    ]));
    partnerSignal({ current: { weekStart: String(CUR), completedBlock: 0, hitPb: 1, updatedAt: NOW } });
    expect(await getVisibleMoments(ME)).toEqual([]);
  });

  test('one prior pb in the window still allows a pb through', async () => {
    await AsyncStorage.setItem(PB_LOG_KEY, JSON.stringify([
      { id: 'a', pairId: PAIR, ts: NOW - DAY_MS },
    ]));
    partnerSignal({ current: { weekStart: String(CUR), completedBlock: 0, hitPb: 1, updatedAt: NOW } });
    const [m] = await getVisibleMoments(ME);
    expect(m.kind).toBe('hit_pb');
  });

  test('pb entries outside the 7-day window do not count toward the cap', async () => {
    await AsyncStorage.setItem(PB_LOG_KEY, JSON.stringify([
      { id: 'a', pairId: PAIR, ts: NOW - 8 * DAY_MS },
      { id: 'b', pairId: PAIR, ts: NOW - 9 * DAY_MS },
    ]));
    partnerSignal({ current: { weekStart: String(CUR), completedBlock: 0, hitPb: 1, updatedAt: NOW } });
    const [m] = await getVisibleMoments(ME);
    expect(m.kind).toBe('hit_pb');
  });

  test('markMomentSeen bumps the pb rolling counter', async () => {
    const id = `${PAIR}:hit_pb:${CUR}`;
    await markMomentSeen(id);
    const log = JSON.parse(await AsyncStorage.getItem(PB_LOG_KEY));
    expect(log.some((e) => e.id === id && e.pairId === PAIR)).toBe(true);
  });
});

describe('fail-closed suppression — every lever individually', () => {
  beforeEach(() => { streakSignals(); }); // a scenario that WOULD produce a moment

  test('open ED flag -> []', async () => {
    db.getOpenEdPatternFlag.mockResolvedValue({ id: 'flag' });
    expect(await getVisibleMoments(ME)).toEqual([]);
  });

  test('ED-flag read FAILURE -> [] (read_failed sentinel is truthy)', async () => {
    db.getOpenEdPatternFlag.mockRejectedValue(new Error('boom'));
    expect(await getVisibleMoments(ME)).toEqual([]);
  });

  test('SCOFF >= 2 -> []', async () => {
    db.getUserBodyProfile.mockResolvedValue({ scoffScore: 2 });
    expect(await getVisibleMoments(ME)).toEqual([]);
  });

  test('calm mode -> []', async () => {
    await AsyncStorage.setItem(WELLBEING_KEY, 'calm');
    expect(await getVisibleMoments(ME)).toEqual([]);
  });

  test('wellbeing read FAILURE -> [] (read_failed sentinel)', async () => {
    // Save/restore the exact original ref (jest.spyOn + mockRestore leaks across
    // tests on the manual AsyncStorage mock) so only the wellbeing read throws.
    const orig = AsyncStorage.getItem;
    AsyncStorage.getItem = jest.fn((k) => (
      k === WELLBEING_KEY ? Promise.reject(new Error('boom')) : orig(k)
    ));
    try {
      expect(await getVisibleMoments(ME)).toEqual([]);
    } finally {
      AsyncStorage.getItem = orig;
    }
  });

  test('SCOFF below the threshold does NOT suppress', async () => {
    db.getUserBodyProfile.mockResolvedValue({ scoffScore: 1 });
    expect(await getVisibleMoments(ME)).toHaveLength(1);
  });
});

describe('determinism', () => {
  test('two consecutive calls return the same result', async () => {
    streakSignals();
    partnerSignal({ current: { weekStart: String(CUR), completedBlock: 1, hitPb: 1, updatedAt: NOW } });
    const a = await getVisibleMoments(ME);
    const b = await getVisibleMoments(ME);
    expect(a).toEqual(b);
  });
});
