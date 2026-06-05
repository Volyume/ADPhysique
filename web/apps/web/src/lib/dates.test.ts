import { describe, it, expect } from 'vitest';
import { ukDayKey, ukWeekStartKey, ukWeekStartISO, londonMidnightUTC } from './dates';

// These guard the locked UK timezone rule: a date must bucket by the user's
// local London calendar day, never the server's UTC clock. The BST evening case
// is the exact bug class the rule was written for.
describe('ukDayKey', () => {
  it('keeps a daytime BST instant on the same calendar day', () => {
    expect(ukDayKey(new Date('2026-06-05T10:00:00Z'))).toBe('2026-06-05');
  });

  it('rolls a late-evening BST instant into the next London day', () => {
    // 23:30 UTC in BST is 00:30 the next day in London.
    expect(ukDayKey(new Date('2026-06-05T23:30:00Z'))).toBe('2026-06-06');
  });

  it('does not roll a late-evening winter (GMT) instant', () => {
    expect(ukDayKey(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-15');
  });
});

describe('ukWeekStartKey', () => {
  it('returns Monday for a Friday', () => {
    expect(ukWeekStartKey(new Date('2026-06-05T10:00:00Z'))).toBe('2026-06-01');
  });

  it('returns the same day for a Monday', () => {
    expect(ukWeekStartKey(new Date('2026-06-01T10:00:00Z'))).toBe('2026-06-01');
  });
});

describe('londonMidnightUTC / ukWeekStartISO', () => {
  it('maps a BST midnight back to 23:00 UTC the previous day', () => {
    expect(londonMidnightUTC('2026-06-01').toISOString()).toBe('2026-05-31T23:00:00.000Z');
  });

  it('maps a GMT midnight to 00:00 UTC the same day', () => {
    expect(londonMidnightUTC('2026-01-05').toISOString()).toBe('2026-01-05T00:00:00.000Z');
  });

  it('week start ISO for a BST week is the Monday at 23:00 UTC Sunday', () => {
    expect(ukWeekStartISO(new Date('2026-06-05T10:00:00Z'))).toBe('2026-05-31T23:00:00.000Z');
  });
});
