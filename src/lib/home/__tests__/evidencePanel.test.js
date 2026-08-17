/**
 * evidencePanel.test — Campaign 26 (founder device order 2026-08-17).
 *
 * What this suite pins and why:
 *  1. ED-SAFETY (fail closed, CLAUDE.md): under the suppression chain the
 *     pane drops to the neutral variant - NO weigh-in counts, NO folded-in
 *     weight line, no weight ask; date-only countdown. This must never
 *     weaken.
 *  2. The honest-count law that reconciles the two standing rulings: the
 *     restore order (this pane exists again) and the Today truth-repair
 *     ruling (no clamped "3 of 3" for every count >= 3). Progress "N of 3"
 *     renders ONLY while short; once met, the ACTUAL count renders.
 *  3. "Since your check-in" is claimed only once a check-in has actually
 *     happened (C5-P12-04's truth rule, kept through the restore).
 *  4. The morning weight folds in as a quiet done-row only on a logged
 *     day, and never under suppression.
 *  5. Pro-only; free tier gets nothing from this resolver.
 */
import { resolveEvidencePanel } from '../evidencePanel';

const MONDAY = new Date(2026, 7, 10, 12, 0, 0).getTime(); // Mon 10 Aug 2026, local
const DAY = 86400000;

const BASE = {
  tier: 'pro',
  hasCompletedFirstReview: false,
  weighIns7d: 0,
  firstWeightAt: MONDAY - 10 * DAY,
  checkinDay: 0, // Sunday
  edFlagOpen: false,
  completedSessions: 0,
  sessionsSinceCheckin: null,
  todayWeightLabel: null,
  now: MONDAY,
};

describe('tier gate', () => {
  test('free tier resolves to null', () => {
    expect(resolveEvidencePanel({ ...BASE, tier: 'free' })).toBeNull();
  });
});

describe('ED-safety: the suppression chain fails closed to the neutral variant', () => {
  test('no counts, no weight line, no weight ask under an open flag', () => {
    const panel = resolveEvidencePanel({
      ...BASE,
      edFlagOpen: true,
      weighIns7d: 2,
      completedSessions: 4,
      todayWeightLabel: '213 lbs',
    });
    expect(panel.variant).toBe('neutral');
    expect(panel.rows).toEqual([]);
    expect(panel.title).toBe('Your coach is getting to know you');
    // Date-only disclosure survives; nothing numeric or weight-adjacent.
    expect(panel.countdown).toMatch(/check-in/i);
    expect(JSON.stringify(panel)).not.toContain('weigh-in');
    expect(JSON.stringify(panel)).not.toContain('Morning weight');
  });

  test('suppressed with no unlock date at all: the pane renders nothing', () => {
    const panel = resolveEvidencePanel({
      ...BASE,
      edFlagOpen: true,
      firstWeightAt: null,
    });
    expect(panel).toBeNull();
  });
});

describe('honest counts: progress while short, the actual count once met', () => {
  test('short of the gate: "N of 3" needed-to-do progress', () => {
    const panel = resolveEvidencePanel({ ...BASE, weighIns7d: 2 });
    const row = panel.rows.find((r) => r.key === 'weighIns');
    expect(row.done).toBe(false);
    expect(row.label).toBe('2 of 3 morning weigh-ins this week');
  });

  test('gate met with MORE than the minimum: the ACTUAL count, never a clamp', () => {
    // The exact defect the Today truth-repair ruling named: 3, 4, 5, 6 or
    // 7 qualifying mornings must not all read "3 of 3".
    const panel = resolveEvidencePanel({ ...BASE, weighIns7d: 5 });
    const row = panel.rows.find((r) => r.key === 'weighIns');
    expect(row.done).toBe(true);
    expect(row.label).toBe('5 morning weigh-ins this week');
    expect(row.label).not.toContain('of 3');
  });

  test('exactly at the minimum: still the actual count', () => {
    const panel = resolveEvidencePanel({ ...BASE, weighIns7d: 3 });
    expect(panel.rows.find((r) => r.key === 'weighIns').label)
      .toBe('3 morning weigh-ins this week');
  });
});

describe('title truth: "Since your check-in" only after a real check-in', () => {
  test('pre-first-review title never claims a past check-in', () => {
    const panel = resolveEvidencePanel(BASE);
    expect(panel.title).toBe('Your first review');
    expect(panel.title).not.toMatch(/since your check-in/i);
  });

  test('post-first-review: "Since your check-in" with sessions since the cycle started', () => {
    const panel = resolveEvidencePanel({
      ...BASE,
      hasCompletedFirstReview: true,
      weighIns7d: 3,
      sessionsSinceCheckin: 4,
    });
    expect(panel.title).toBe('Since your check-in');
    const sessions = panel.rows.find((r) => r.key === 'sessions');
    expect(sessions.done).toBe(true);
    expect(sessions.label).toBe('4 training sessions logged');
  });

  test('post-first-review with an unknown since-check-in count: the row is omitted, never guessed', () => {
    const panel = resolveEvidencePanel({
      ...BASE,
      hasCompletedFirstReview: true,
      sessionsSinceCheckin: null,
    });
    expect(panel.rows.find((r) => r.key === 'sessions')).toBeUndefined();
  });

  test('pre-first-review sessions row uses the all-time count', () => {
    const panel = resolveEvidencePanel({ ...BASE, completedSessions: 2 });
    expect(panel.rows.find((r) => r.key === 'sessions').label)
      .toBe('2 training sessions logged');
  });
});

describe('the folded-in morning weight', () => {
  test('logged day: one quiet done-row with the formatted weight', () => {
    const panel = resolveEvidencePanel({ ...BASE, todayWeightLabel: '213 lbs' });
    const row = panel.rows.find((r) => r.key === 'weight');
    expect(row.done).toBe(true);
    expect(row.label).toBe('Morning weight 213 lbs');
  });

  test('unlogged day: no weight row (logging is the strip\'s job, not evidence)', () => {
    const panel = resolveEvidencePanel(BASE);
    expect(panel.rows.find((r) => r.key === 'weight')).toBeUndefined();
  });
});

describe('countdown', () => {
  test('names the next check-in from the same gate maths the ledger uses', () => {
    const panel = resolveEvidencePanel(BASE);
    // checkinDay Sunday, now Monday: "6 days to your next check-in".
    expect(panel.countdown).toBe('6 days to your next check-in');
  });
});

describe('determinism', () => {
  test('identical inputs produce identical output', () => {
    const input = { ...BASE, weighIns7d: 2, completedSessions: 1 };
    expect(resolveEvidencePanel(input)).toEqual(resolveEvidencePanel({ ...input }));
  });
});
