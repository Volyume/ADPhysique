/**
 * NEW-002 partner beats — the pure decision + copy contract.
 * What these pushes must never do: fire twice for one cheer, fire for stale
 * history, fire for a lapsed/shrinking run, or carry shame copy.
 */
import {
  cheerPush,
  streakKeptPush,
  normaliseBeatsState,
  cheerToNotify,
  streakRunToNotify,
} from '../partnerBeats';

const HOUR = 3600000;

describe('cheerToNotify', () => {
  const state = normaliseBeatsState(null);
  const now = Date.now();

  test('a fresh unseen cheer notifies', () => {
    const cheer = { id: 'c1', createdAt: now - HOUR };
    expect(cheerToNotify(state, cheer, now)).toBe(cheer);
  });
  test('the same cheer never notifies twice', () => {
    const cheer = { id: 'c1', createdAt: now - HOUR };
    expect(cheerToNotify({ ...state, lastCheerId: 'c1' }, cheer, now)).toBeNull();
  });
  test('a stale cheer (synced days later) is history, not news', () => {
    expect(cheerToNotify(state, { id: 'c2', createdAt: now - 72 * HOUR }, now)).toBeNull();
  });
  test('missing cheer or id is a safe null', () => {
    expect(cheerToNotify(state, null, now)).toBeNull();
    expect(cheerToNotify(state, { createdAt: now }, now)).toBeNull();
  });
});

describe('streakRunToNotify', () => {
  const state = { v: 1, lastCheerId: null, lastStreakRun: 2 };

  test('a grown run notifies once at the new value', () => {
    expect(streakRunToNotify(state, { run: 3, status: 'counting' })).toBe(3);
  });
  test('the same or a smaller run never notifies (lapses are an absence)', () => {
    expect(streakRunToNotify(state, { run: 2, status: 'counting' })).toBeNull();
    expect(streakRunToNotify(state, { run: 1, status: 'counting' })).toBeNull();
  });
  test('a pair needs two real weeks together before the first push', () => {
    const fresh = normaliseBeatsState(null);
    expect(streakRunToNotify(fresh, { run: 1, status: 'counting' })).toBeNull();
    expect(streakRunToNotify(fresh, { run: 2, status: 'counting' })).toBe(2);
  });
  test('only a counting streak notifies', () => {
    expect(streakRunToNotify(state, { run: 5, status: 'archived' })).toBeNull();
    expect(streakRunToNotify(state, null)).toBeNull();
  });
});

describe('push copy', () => {
  test('cheer copy is from the partner, named, with a warm fallback', () => {
    expect(cheerPush('Sam').title).toBe('Sam cheered you on');
    expect(cheerPush('').title).toBe('Your partner cheered you on');
    expect(cheerPush(null).title).toBe('Your partner cheered you on');
  });
  test('streak copy states the shared run as a fact', () => {
    const c = streakKeptPush('Sam', 6);
    expect(c.title).toBe('6 weeks running, together');
    expect(c.body).toContain('Sam');
    const single = streakKeptPush(null, 1);
    expect(single.title).toBe('1 week running, together');
  });
  test('no shame framing anywhere in the copy', () => {
    const all = [
      cheerPush('Sam'), cheerPush(null), streakKeptPush('Sam', 4), streakKeptPush(null, 2),
    ].flatMap((c) => [c.title, c.body]).join(' ');
    expect(all).not.toMatch(/miss|broke|break|don't lose|lost|fail|streak-loss|behind/i);
    expect(/[–—]/.test(all)).toBe(false);
  });
});
