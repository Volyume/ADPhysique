import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MILESTONES,
  hasThreeInSeven,
  isEarned,
  earnedMilestones,
  selectMilestone,
  nextSessionRung,
  loadMilestoneState,
  claimMilestones,
} from '../milestones';

const DAY = 24 * 60 * 60 * 1000;
const base = Date.UTC(2026, 5, 1); // 2026-06-01
const day = (n) => base + n * DAY;

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('milestones: hasThreeInSeven', () => {
  test('three sessions inside seven days earns it', () => {
    expect(hasThreeInSeven([day(0), day(3), day(6)])).toBe(true);
  });
  test('three sessions spread over more than seven days does not', () => {
    expect(hasThreeInSeven([day(0), day(4), day(8)])).toBe(false);
  });
  test('two sessions never earns it', () => {
    expect(hasThreeInSeven([day(0), day(1)])).toBe(false);
  });
  test('two on one day plus a third within the window counts (sessions, not distinct days)', () => {
    expect(hasThreeInSeven([day(0), day(0), day(5)])).toBe(true);
  });
  test('finds a qualifying window even when earlier sessions are spread out', () => {
    expect(hasThreeInSeven([day(0), day(20), day(40), day(41), day(42)])).toBe(true);
  });
  test('order-independent and safe on empty / junk input', () => {
    expect(hasThreeInSeven([day(6), day(0), day(3)])).toBe(true);
    expect(hasThreeInSeven([])).toBe(false);
    expect(hasThreeInSeven(null)).toBe(false);
    expect(hasThreeInSeven([day(0), NaN, day(3), day(6)])).toBe(true);
  });
});

describe('milestones: isEarned / earnedMilestones', () => {
  const find = (k) => MILESTONES.find((m) => m.key === k);

  test('session-count rungs gate on lifetime count (inclusive)', () => {
    expect(isEarned(find('sessions_5'), { sessionCount: 4 })).toBe(false);
    expect(isEarned(find('sessions_5'), { sessionCount: 5 })).toBe(true);
    expect(isEarned(find('sessions_100'), { sessionCount: 99 })).toBe(false);
    expect(isEarned(find('sessions_100'), { sessionCount: 100 })).toBe(true);
  });
  test('first_pr gates on everHitPR', () => {
    expect(isEarned(find('first_pr'), { everHitPR: false })).toBe(false);
    expect(isEarned(find('first_pr'), { everHitPR: true })).toBe(true);
  });
  test('earnedMilestones returns the earned rungs in ladder order', () => {
    const facts = { sessionCount: 12, sessionDaysMs: [day(0), day(3), day(6)], everHitPR: false };
    expect(earnedMilestones(facts).map((m) => m.key)).toEqual([
      'first_week', 'sessions_5', 'sessions_10',
    ]);
  });
});

describe('milestones: selectMilestone', () => {
  test('picks the most significant (last-in-ladder) earned-and-unseen rung', () => {
    const facts = { sessionCount: 12, sessionDaysMs: [day(0), day(3), day(6)] };
    expect(selectMilestone(facts, []).key).toBe('sessions_10');
  });
  test('skips rungs already seen', () => {
    const facts = { sessionCount: 12, sessionDaysMs: [day(0), day(3), day(6)] };
    expect(selectMilestone(facts, ['sessions_10']).key).toBe('sessions_5');
    expect(selectMilestone(facts, ['sessions_10', 'sessions_5']).key).toBe('first_week');
    expect(selectMilestone(facts, ['sessions_10', 'sessions_5', 'first_week'])).toBeNull();
  });
  test('nothing earned yet → null', () => {
    expect(selectMilestone({ sessionCount: 2, sessionDaysMs: [day(0), day(1)] }, [])).toBeNull();
  });
});

describe('milestones: nextSessionRung', () => {
  test('reports the next count rung and how many remain', () => {
    expect(nextSessionRung(3)).toEqual({ threshold: 5, remaining: 2 });
    expect(nextSessionRung(5)).toEqual({ threshold: 10, remaining: 5 });
    expect(nextSessionRung(0)).toEqual({ threshold: 5, remaining: 5 });
  });
  test('null once the top rung is passed', () => {
    expect(nextSessionRung(100)).toBeNull();
    expect(nextSessionRung(250)).toBeNull();
  });
});

describe('milestones: claimMilestones (IO)', () => {
  test('claims the top rung and shows it once', async () => {
    const facts = { sessionCount: 5, sessionDaysMs: [day(0), day(3), day(6)] };
    const first = await claimMilestones('u1', facts);
    expect(first.key).toBe('sessions_5');
    // Re-running on the same facts shows nothing (already claimed).
    expect(await claimMilestones('u1', facts)).toBeNull();
  });

  test('first run on imported history marks ALL earned rungs seen, shows only the top', async () => {
    // A user lands with 30 sessions already; the ladder must not replay
    // first_week / 5 / 10 / 25 across the next four sessions.
    const facts = { sessionCount: 30, sessionDaysMs: [day(0), day(3), day(6)] };
    const shown = await claimMilestones('u2', facts);
    expect(shown.key).toBe('sessions_25');
    const state = await loadMilestoneState('u2');
    expect(state.seen.sort()).toEqual(
      ['first_week', 'sessions_10', 'sessions_25', 'sessions_5'].sort(),
    );
    // The next session crosses no new rung → nothing fires.
    expect(await claimMilestones('u2', { ...facts, sessionCount: 31 })).toBeNull();
  });

  test('one new rung per session fires exactly once, in order', async () => {
    const days = [day(0), day(3), day(6)];
    // Session 5 → sessions_5
    expect((await claimMilestones('u3', { sessionCount: 5, sessionDaysMs: days })).key).toBe('sessions_5');
    // Sessions 6-9 → nothing new
    for (const n of [6, 7, 8, 9]) {
      expect(await claimMilestones('u3', { sessionCount: n, sessionDaysMs: days })).toBeNull();
    }
    // Session 10 → sessions_10
    expect((await claimMilestones('u3', { sessionCount: 10, sessionDaysMs: days })).key).toBe('sessions_10');
  });

  test('first_week fires on its own before any count rung', async () => {
    const shown = await claimMilestones('u4', { sessionCount: 3, sessionDaysMs: [day(0), day(2), day(5)] });
    expect(shown.key).toBe('first_week');
  });

  test('a no-user id is a safe no-op', async () => {
    expect(await claimMilestones(null, { sessionCount: 10 })).toBeNull();
  });
});
