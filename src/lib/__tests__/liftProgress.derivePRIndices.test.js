/**
 * Item 10 (campaign 2026-07-10, CP-5 residue): derivePRIndices names which
 * points in a session series earned a personal best, feeding
 * LiftProgressScreen's row sparkline marker (Sparkline's new
 * highlightIndices). Pure, metric-agnostic (works on e1rm/heaviest/reps/
 * volume series alike): a point is a PR when it strictly beats the running
 * max of every point before it. Mirrors ExerciseDetailScreen's
 * derivePRSessionDates rule that the very first point never counts as a PR
 * (it "beats" an empty history, which is a first-lift acknowledgement, not
 * a record).
 */
import { derivePRIndices } from '../liftProgress';

describe('derivePRIndices', () => {
  test('the first point is never a PR, even though it beats an empty history', () => {
    expect(derivePRIndices([50])).toEqual([]);
  });

  test('marks each strictly-increasing new best, skipping ties and dips', () => {
    // 50 (first, not PR) -> 55 (PR) -> 52 (dip, not PR) -> 55 (tie, not PR) -> 60 (PR)
    expect(derivePRIndices([50, 55, 52, 55, 60])).toEqual([1, 4]);
  });

  test('a flat series has no PRs after the first point', () => {
    expect(derivePRIndices([40, 40, 40])).toEqual([]);
  });

  test('a strictly-declining series has no PRs after the first point', () => {
    expect(derivePRIndices([100, 90, 80, 70])).toEqual([]);
  });

  test('every point after the first is a PR on a strictly-increasing series', () => {
    expect(derivePRIndices([10, 20, 30, 40])).toEqual([1, 2, 3]);
  });

  test('non-finite entries are skipped, not treated as a reset', () => {
    expect(derivePRIndices([50, NaN, 60, undefined, 55])).toEqual([2]);
  });

  test('empty/null input returns no indices', () => {
    expect(derivePRIndices([])).toEqual([]);
    expect(derivePRIndices(null)).toEqual([]);
    expect(derivePRIndices(undefined)).toEqual([]);
  });
});
