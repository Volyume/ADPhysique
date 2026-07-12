/**
 * NEW-002 partner beats — the pure decision + copy contract.
 * What these pushes must never do: fire twice for one cheer, fire for stale
 * history, fire for a lapsed/shrinking run, or carry shame copy.
 *
 * P-11 (Codex end-user-polish audit): three of these bodies read as
 * machine-generated rather than natural British English ("They can see your
 * week is being kept", "You and [name] both kept your training week",
 * "Their week shows up here from now on"). Reworded below; pinned here so
 * the stiff phrasing can't silently return.
 */
import {
  cheerPush,
  streakKeptPush,
  joinPush,
  normaliseBeatsState,
  cheerToNotify,
  streakRunToNotify,
  joinToNotify,
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

describe('joinToNotify (D5-B2, the missing accept-signal)', () => {
  const state = normaliseBeatsState(null);
  const now = Date.now();
  const me = 'u_me';
  const freshPair = { id: 'p1', status: 'active', memberA: me, acceptedAt: now - HOUR };

  test('a fresh accept notifies the inviter (member_a) once', () => {
    expect(joinToNotify(state, freshPair, me, now)).toBe('p1');
  });
  test('the same pair never notifies twice (watermarked by id)', () => {
    const seen = { ...state, joinedPairIds: ['p1'] };
    expect(joinToNotify(seen, freshPair, me, now)).toBeNull();
  });
  test('the redeemer (member_b) is never pushed — they saw the accept', () => {
    const asRedeemer = { ...freshPair, memberA: 'someone', memberB: me };
    expect(joinToNotify(state, asRedeemer, me, now)).toBeNull();
  });
  test('a stale (backlog-synced) accept is history, not news', () => {
    expect(joinToNotify(state, { ...freshPair, acceptedAt: now - 72 * HOUR }, me, now)).toBeNull();
  });
  test('a non-active pair does not notify', () => {
    expect(joinToNotify(state, { ...freshPair, status: 'invited' }, me, now)).toBeNull();
  });
});

describe('push copy', () => {
  test('join copy names the partner with a warm fallback and no shame', () => {
    expect(joinPush('Sam').title).toBe('Sam joined you');
    expect(joinPush(null).title).toBe('Your partner joined you');
    const all = [joinPush('Sam'), joinPush(null)].flatMap((c) => [c.title, c.body]).join(' ');
    expect(all).not.toMatch(/miss|behind|fail|must/i);
    expect(/[–—]/.test(all)).toBe(false);
  });
  test('cheer copy is from the partner, named, with a warm fallback', () => {
    expect(cheerPush('Sam').title).toBe('Sam cheered you on');
    expect(cheerPush('').title).toBe('Your partner cheered you on');
    expect(cheerPush(null).title).toBe('Your partner cheered you on');
  });
  // P-11: the old body ("They can see your week is being kept.") read as
  // machine-generated. Pinned to the reworded, natural version.
  test('cheer copy body reads as natural British English, not machine-generated', () => {
    expect(cheerPush('Sam').body).toBe(
      "A tap from your training partner. They can see you're keeping up your training this week.",
    );
    expect(cheerPush('Sam').body).not.toMatch(/your week is being kept/);
  });
  test('streak copy states the shared run as a fact', () => {
    const c = streakKeptPush('Sam', 6);
    expect(c.title).toBe('6 weeks running, together');
    expect(c.body).toContain('Sam');
    const single = streakKeptPush(null, 1);
    expect(single.title).toBe('1 week running, together');
  });
  // P-11: the old body ("You and Sam both kept your training week.") read as
  // machine-generated. Pinned to the reworded, natural version.
  test('streak copy body reads as natural British English, not machine-generated', () => {
    expect(streakKeptPush('Sam', 6).body).toBe("You and Sam both kept up your training this week.");
    expect(streakKeptPush('Sam', 6).body).not.toMatch(/both kept your training week/);
  });
  // P-11: the old body ("Their week shows up here from now on.") read as
  // machine-generated. Pinned to the reworded, natural version.
  test('join copy body reads as natural British English, not machine-generated', () => {
    expect(joinPush('Sam').body).toBe(
      "You are training together now. You'll see their training week here from now on.",
    );
    expect(joinPush('Sam').body).not.toMatch(/Their week shows up here/);
  });
  test('no shame framing anywhere in the copy', () => {
    const all = [
      cheerPush('Sam'), cheerPush(null), streakKeptPush('Sam', 4), streakKeptPush(null, 2),
    ].flatMap((c) => [c.title, c.body]).join(' ');
    expect(all).not.toMatch(/miss|broke|break|don't lose|lost|fail|streak-loss|behind/i);
    expect(/[–—]/.test(all)).toBe(false);
  });
});
