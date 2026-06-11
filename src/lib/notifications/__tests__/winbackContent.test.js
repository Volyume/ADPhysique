/**
 * winbackContent tests (COMP-025-A §4c/§4d copy).
 *
 * The numbers are the hero; never a zero, never a shame state; the stated-break
 * opener is acknowledged; copy stays under the 178-char Android cap.
 */
import { winbackPush, monthLabel } from '../winbackContent';

describe('monthLabel', () => {
  test('returns the month name for a timestamp', () => {
    // 2026-03-15 UTC noon — March regardless of a sane local offset.
    expect(monthLabel(Date.UTC(2026, 2, 15, 12))).toBe('March');
  });
  test('empty string for a bad input', () => {
    expect(monthLabel(NaN)).toBe('');
    expect(monthLabel(undefined)).toBe('');
  });
});

describe('winbackPush', () => {
  test('sessions-since headline leads with the count and lapse month', () => {
    const { title, body } = winbackPush({ sessionsSince: 14, totalSessions: 200, sinceLabel: 'March' });
    expect(title).toBe('Still lifting. 14 sessions since March.');
    expect(body).toContain('never stopped');
  });

  test('singular session reads correctly', () => {
    expect(winbackPush({ sessionsSince: 1, sinceLabel: 'May' }).title)
      .toBe('Still lifting. 1 session since May.');
  });

  test('no sessions since lapse falls back to total-saved framing (never a zero)', () => {
    const { title, body } = winbackPush({ sessionsSince: 0, totalSessions: 212 });
    expect(title).toBe('Your training is saved.');
    expect(body).toContain('212 sessions are saved');
    expect(body).not.toContain('0 ');
  });

  test('no data at all uses the held-seat line, not a zero', () => {
    const { title, body } = winbackPush({ sessionsSince: 0, totalSessions: 0 });
    expect(title).toBe('Your training is saved.');
    expect(body).toBe('Everything you logged is saved. Pro picks up where it left off.');
  });

  test('a stated break opens by acknowledging it', () => {
    const { body } = winbackPush({ sessionsSince: 3, sinceLabel: 'June', statedReturn: 'two_three_months' });
    expect(body.startsWith('You said you might be back around now.')).toBe(true);
  });

  test('copy stays under the 178-char Android cap in every branch', () => {
    const cases = [
      { sessionsSince: 999, totalSessions: 999, sinceLabel: 'September', statedReturn: 'not_sure' },
      { sessionsSince: 0, totalSessions: 9999, statedReturn: 'in_a_month' },
      { sessionsSince: 0, totalSessions: 0, statedReturn: 'not_sure' },
    ];
    for (const c of cases) {
      const { title, body } = winbackPush(c);
      expect(title.length).toBeLessThan(178);
      expect(body.length).toBeLessThan(178);
    }
  });
});
