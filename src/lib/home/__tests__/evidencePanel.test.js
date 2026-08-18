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
  hasCheckedInEver: false,
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
    // Founder order 2026-08-17 (second correction): the coach is not a
    // person, so no state carries a coach-voiced title - null here.
    expect(panel.title).toBeNull();
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

describe('title truth: "Since your check-in" only after a real check-in, and NEVER first-review framing', () => {
  test('before any check-in: NO title (countdown leads), no past-check-in claim, no "first review", no coach voice', () => {
    // FRAMING LAWS (founder corrections 2026-08-17): the pane is the
    // recurring weekly evidence read - never framed as a first review -
    // and the coach is not a person, so no coach-voiced title exists in
    // any state. Pre-check-in the countdown is the header line.
    const panel = resolveEvidencePanel(BASE);
    expect(panel.title).toBeNull();
    expect(JSON.stringify(panel)).not.toMatch(/first review/i);
    expect(JSON.stringify(panel)).not.toMatch(/your coach/i);
  });

  test('no state of the pane ever says "first review" (framing law, every branch)', () => {
    const variants = [
      resolveEvidencePanel(BASE),
      resolveEvidencePanel({ ...BASE, hasCheckedInEver: true, sessionsSinceCheckin: 4, weighIns7d: 3 }),
      resolveEvidencePanel({ ...BASE, edFlagOpen: true }),
      resolveEvidencePanel({ ...BASE, weighIns7d: 5, todayWeightLabel: '213 lbs' }),
    ];
    for (const v of variants) {
      expect(JSON.stringify(v) || '').not.toMatch(/first review/i);
    }
  });

  test('after a check-in: "Since your check-in" with sessions since the cycle started', () => {
    const panel = resolveEvidencePanel({
      ...BASE,
      hasCheckedInEver: true,
      weighIns7d: 3,
      sessionsSinceCheckin: 4,
    });
    expect(panel.title).toBe('Since your check-in');
    const sessions = panel.rows.find((r) => r.key === 'sessions');
    expect(sessions.done).toBe(true);
    expect(sessions.label).toBe('4 training sessions logged');
  });

  test('checked-in with an unknown since-check-in count: the row is omitted, never guessed', () => {
    const panel = resolveEvidencePanel({
      ...BASE,
      hasCheckedInEver: true,
      sessionsSinceCheckin: null,
    });
    expect(panel.rows.find((r) => r.key === 'sessions')).toBeUndefined();
  });

  test('before any check-in the sessions row uses the all-time count', () => {
    const panel = resolveEvidencePanel({ ...BASE, completedSessions: 2 });
    expect(panel.rows.find((r) => r.key === 'sessions').label)
      .toBe('2 training sessions logged');
  });
});

describe('the food-adherence row (founder order 2026-08-17)', () => {
  test('food logged on N of the last 7 days renders as a quiet done-row', () => {
    const panel = resolveEvidencePanel({ ...BASE, foodDays7: 4 });
    const row = panel.rows.find((r) => r.key === 'food');
    expect(row.done).toBe(true);
    expect(row.label).toBe('Food logged on 4 of the last 7 days');
  });

  test('no food logged: the row is omitted entirely (IF logged, per the order)', () => {
    expect(resolveEvidencePanel({ ...BASE, foodDays7: 0 }).rows.find((r) => r.key === 'food')).toBeUndefined();
    expect(resolveEvidencePanel({ ...BASE, foodDays7: null }).rows.find((r) => r.key === 'food')).toBeUndefined();
  });

  test('ED-safety: the neutral variant drops the food row with every other count', () => {
    const panel = resolveEvidencePanel({ ...BASE, edFlagOpen: true, foodDays7: 5 });
    expect(panel.rows).toEqual([]);
  });
});

describe('the folded-in morning weight (founder device order 2026-08-18)', () => {
  // Re-pinned twice on the same device walk: the weight is NOT merged onto
  // the weigh-in count line ("have it in the next row") - it keeps its own
  // quiet done-row DIRECTLY behind the weigh-ins row, and the row order is
  // sessions first, weigh-ins second, weight behind it, food last.
  test('logged day: one quiet done-row with the formatted weight, right after weigh-ins', () => {
    const panel = resolveEvidencePanel({ ...BASE, todayWeightLabel: '213 lbs' });
    const row = panel.rows.find((r) => r.key === 'weight');
    expect(row.done).toBe(true);
    expect(row.label).toBe('Morning weight 213 lbs');
    expect(panel.rows.find((r) => r.key === 'weighIns').label).not.toContain('213');
  });

  test('unlogged day: no weight row (logging is the strip\'s job, not evidence)', () => {
    const panel = resolveEvidencePanel(BASE);
    expect(panel.rows.find((r) => r.key === 'weight')).toBeUndefined();
  });

  test('row order: sessions, weigh-ins, weight, food', () => {
    const panel = resolveEvidencePanel({ ...BASE, foodDays7: 4, todayWeightLabel: '213 lbs' });
    expect(panel.rows.map((r) => r.key)).toEqual(['sessions', 'weighIns', 'weight', 'food']);
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
