/**
 * COMP-019 Stage 2 — widget snapshot builder.
 */
import { buildWidgetSnapshot, emptyWidgetSnapshot, WIDGET_SNAPSHOT_VERSION } from '../snapshot';

const NOW = 1_700_000_000_000;

describe('buildWidgetSnapshot', () => {
  test('shapes a full next-session block with the week-in-block chip', () => {
    const snap = buildWidgetSnapshot({
      nextSession: { name: 'Push A', dayLabel: 'Today', weekInBlock: { week: 3, total: 5 } },
      now: NOW,
    });
    expect(snap.v).toBe(WIDGET_SNAPSHOT_VERSION);
    expect(snap.computedAt).toBe(NOW);
    expect(snap.nextSession).toEqual({ name: 'Push A', dayLabel: 'Today', weekLabel: 'Week 3 of 5' });
  });

  test('null next session => empty state (widget shows the "build a plan" copy)', () => {
    expect(buildWidgetSnapshot({ nextSession: null }).nextSession).toBeNull();
    expect(emptyWidgetSnapshot(NOW)).toEqual({ v: 1, nextSession: null, consistency: null, friends: null, computedAt: NOW });
  });

  test('a session with no week-in-block omits the chip (not a bogus "Week 0 of 0")', () => {
    const snap = buildWidgetSnapshot({ nextSession: { name: 'Full body' } });
    expect(snap.nextSession.weekLabel).toBeNull();
    expect(snap.nextSession.dayLabel).toBeNull();
  });

  // RE-PINNED (Today truth repair, founder Ruling 1): the published snapshot
  // no longer carries a run/streak figure. The factual "N of M sessions this
  // week" label is the whole contract now, and a stray streakWeeks on the
  // INPUT must not leak back into the payload.
  test('consistency block renders the "N of M" label and no streak figure', () => {
    const snap = buildWidgetSnapshot({ consistency: { completed: 2, planned: 3, streakWeeks: 7 } });
    expect(snap.consistency).toEqual({ completed: 2, planned: 3, label: '2 of 3 sessions this week' });
    expect(snap.consistency).not.toHaveProperty('streakWeeks');
  });

  test('an open ED/wellbeing flag suppresses the consistency block entirely', () => {
    const snap = buildWidgetSnapshot({
      nextSession: { name: 'Pull A' },
      consistency: { completed: 2, planned: 3, streakWeeks: 7 },
      edFlagOpen: true,
    });
    expect(snap.consistency).toBeNull();   // suppressed
    expect(snap.nextSession).not.toBeNull(); // neutral next-session content stays
  });

  test('never leaks body data and clamps/trims hostile input without throwing', () => {
    const snap = buildWidgetSnapshot({
      nextSession: { name: 'x'.repeat(200), dayLabel: 'y'.repeat(200), weekInBlock: { week: -5, total: 9e9 } },
      consistency: { completed: -3, planned: 1e9, streakWeeks: NaN },
      now: NaN,
    });
    expect(snap.nextSession.name.length).toBeLessThanOrEqual(40);
    expect(snap.nextSession.dayLabel.length).toBeLessThanOrEqual(24);
    expect(snap.consistency.completed).toBe(0);
    expect(snap.consistency.planned).toBeLessThanOrEqual(9999);
    expect(snap.consistency).not.toHaveProperty('streakWeeks');
    expect(Number.isFinite(snap.computedAt)).toBe(true);
    // No weight/calorie/macro keys anywhere in the payload.
    const json = JSON.stringify(snap);
    expect(json).not.toMatch(/weight|kcal|calorie|macro|bodyfat/i);
  });

  test('malformed input never throws', () => {
    expect(() => buildWidgetSnapshot()).not.toThrow();
    expect(() => buildWidgetSnapshot({ nextSession: {}, consistency: {} })).not.toThrow();
    expect(buildWidgetSnapshot({}).nextSession).toBeNull();
    expect(buildWidgetSnapshot({}).consistency).toBeNull();
  });

  test('deterministic for identical inputs', () => {
    const args = { nextSession: { name: 'Legs', weekInBlock: { week: 1, total: 4 } }, consistency: { completed: 1, planned: 4, streakWeeks: 2 }, now: NOW };
    expect(buildWidgetSnapshot(args)).toEqual(buildWidgetSnapshot(args));
  });
});

describe('C6 RD6-9 (D97-25): no plan means no invented denominator', () => {
  const { buildWidgetSnapshot } = require('../snapshot');

  test('a plan-derived denominator renders "N of M"', () => {
    const s = buildWidgetSnapshot({ consistency: { completed: 3, planned: 4, streakWeeks: 2 } });
    expect(s.consistency.label).toBe('3 of 4 sessions this week');
  });

  test('an absent denominator renders the honest plain count, never a trailing average as a plan', () => {
    const s = buildWidgetSnapshot({ consistency: { completed: 3, planned: null, streakWeeks: 2 } });
    expect(s.consistency.label).toBe('3 sessions this week');
    expect(s.consistency.planned).toBeNull();
  });
});

// CR-14 (docs/communities-revamp-2026-09-10/24-PHASE4-SPEC.md section 2):
// pins the friends block. Written to FAIL against a wrong implementation:
// singular/plural labels, presence-never-absence (count 0 => absent),
// suppression under an open ED/wellbeing flag, a malformed dayKey never
// reaching the renderers, and the block's keys being exactly dayKey,
// count and label -- never a name, handle or avatar.
describe('CR-14: the friends block', () => {
  test('singular label at count 1', () => {
    const snap = buildWidgetSnapshot({ friends: { dayKey: '2026-09-11', count: 1 }, now: NOW });
    expect(snap.friends).toEqual({ dayKey: '2026-09-11', count: 1, label: '1 friend trained today' });
  });

  test('plural label at count > 1', () => {
    const snap = buildWidgetSnapshot({ friends: { dayKey: '2026-09-11', count: 4 }, now: NOW });
    expect(snap.friends.label).toBe('4 friends trained today');
  });

  test('absent when count is 0: presence, never absence', () => {
    const snap = buildWidgetSnapshot({ friends: { dayKey: '2026-09-11', count: 0 }, now: NOW });
    expect(snap.friends).toBeNull();
  });

  test('absent under an open ED/wellbeing flag, even with a real count', () => {
    const snap = buildWidgetSnapshot({ friends: { dayKey: '2026-09-11', count: 2 }, edFlagOpen: true, now: NOW });
    expect(snap.friends).toBeNull();
  });

  test('absent when dayKey is malformed', () => {
    expect(buildWidgetSnapshot({ friends: { dayKey: '11-09-2026', count: 2 } }).friends).toBeNull();
    expect(buildWidgetSnapshot({ friends: { dayKey: 'today', count: 2 } }).friends).toBeNull();
    expect(buildWidgetSnapshot({ friends: { dayKey: null, count: 2 } }).friends).toBeNull();
    expect(buildWidgetSnapshot({ friends: { dayKey: 20260911, count: 2 } }).friends).toBeNull();
  });

  test('absent when the friends input itself is null or omitted', () => {
    expect(buildWidgetSnapshot({}).friends).toBeNull();
    expect(buildWidgetSnapshot({ friends: null }).friends).toBeNull();
  });

  test('the block carries exactly dayKey, count and label, never a name, handle or avatar', () => {
    const snap = buildWidgetSnapshot({ friends: { dayKey: '2026-09-11', count: 3 }, now: NOW });
    expect(Object.keys(snap.friends).sort()).toEqual(['count', 'dayKey', 'label']);
  });

  test('never throws on hostile friends input', () => {
    expect(() => buildWidgetSnapshot({ friends: { dayKey: 123, count: 'x' } })).not.toThrow();
    expect(() => buildWidgetSnapshot({ friends: 'not an object' })).not.toThrow();
    expect(buildWidgetSnapshot({ friends: 'not an object' }).friends).toBeNull();
  });
});
