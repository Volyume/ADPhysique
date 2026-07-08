/**
 * coachOutputPersist.guard.test.js
 *
 * Pins the confirm-then-apply persistence fix (launch audit item 7,
 * 2026-07-08). CoachOutputScreen.load() re-saves a fresh runWeeklyCoach()
 * result on every mount; that result never carries appliedAdjustments (only
 * markApplied writes them, on an Apply tap). saveCoachOutput's UPDATE replaces
 * output_json wholesale, so without a merge the applied history was wiped
 * whenever the coach screen was reopened - losing the "Applied" state that
 * isApplied() and the diary coach-receipt chip both read.
 *
 * preserveAppliedAdjustments is the pure merge saveCoachOutput now runs before
 * an UPDATE. Tested here without a SQL engine (repo convention: raw CRUD is
 * exercised on device).
 *
 * Not a safety issue in itself (the two-week cooldown in weeklyCoach.js blocks
 * a same-week re-apply), but a real data-integrity fix.
 */
import { preserveAppliedAdjustments } from '../database';

const applied = { calories: { appliedAt: 1_700_000_000_000, newKcal: 2100, change: -100 } };

describe('preserveAppliedAdjustments (coach output apply-state)', () => {
  test('carries the stored appliedAdjustments forward when the re-save omits them', () => {
    const stored = JSON.stringify({ weekStart: 1, appliedAdjustments: applied });
    const freshReSave = { weekStart: 1, adjustments: { calories: { change: -100 } } };
    const out = preserveAppliedAdjustments(stored, freshReSave);
    expect(out.appliedAdjustments).toEqual(applied);
    // and it does not otherwise mutate the incoming payload
    expect(out.adjustments).toEqual(freshReSave.adjustments);
  });

  test('a genuine apply (incoming appliedAdjustments) wins over the stored map', () => {
    const stored = JSON.stringify({ weekStart: 1, appliedAdjustments: applied });
    const newApply = { calories: { appliedAt: 1_700_000_999_999, newKcal: 2000, change: -200 } };
    const incoming = { weekStart: 1, appliedAdjustments: newApply };
    const out = preserveAppliedAdjustments(stored, incoming);
    expect(out.appliedAdjustments).toBe(newApply);
  });

  test('no stored applied state: returns the incoming data unchanged', () => {
    const stored = JSON.stringify({ weekStart: 1 });
    const incoming = { weekStart: 1, adjustments: {} };
    expect(preserveAppliedAdjustments(stored, incoming)).toBe(incoming);
  });

  test('a brand new week (no existing row / null json): returns data unchanged', () => {
    const incoming = { weekStart: 2, adjustments: {} };
    expect(preserveAppliedAdjustments(null, incoming)).toBe(incoming);
  });

  test('unreadable stored JSON does not throw and keeps data as-is', () => {
    const incoming = { weekStart: 1, adjustments: {} };
    expect(preserveAppliedAdjustments('{not json', incoming)).toBe(incoming);
  });
});
