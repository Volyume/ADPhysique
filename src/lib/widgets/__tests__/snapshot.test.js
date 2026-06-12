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
    expect(emptyWidgetSnapshot(NOW)).toEqual({ v: 1, nextSession: null, consistency: null, computedAt: NOW });
  });

  test('a session with no week-in-block omits the chip (not a bogus "Week 0 of 0")', () => {
    const snap = buildWidgetSnapshot({ nextSession: { name: 'Full body' } });
    expect(snap.nextSession.weekLabel).toBeNull();
    expect(snap.nextSession.dayLabel).toBeNull();
  });

  test('consistency block renders the "N of M" label + streak', () => {
    const snap = buildWidgetSnapshot({ consistency: { completed: 2, planned: 3, streakWeeks: 7 } });
    expect(snap.consistency).toEqual({ completed: 2, planned: 3, streakWeeks: 7, label: '2 of 3 sessions this week' });
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
    expect(snap.consistency.streakWeeks).toBe(0);
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
