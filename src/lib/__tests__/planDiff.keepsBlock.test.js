/**
 * D140 (founder decision 2026-09-03, answering the D139 question): a rebuild
 * that keeps every exercise keeps the running training block.
 *
 * What this pins, against the real pure rule:
 *   - days-only (and any structure-only) change with the exercise list
 *     intact keeps the block while it is genuinely running (active or in
 *     its recovery week);
 *   - any exercise added, dropped or replaced restarts the block, exactly
 *     as before the decision;
 *   - a finished block waiting on its decision is never kept: a rebuild
 *     from "Change my training setup" IS that decision;
 *   - no block, no diff, or a malformed status never keeps anything;
 *   - determinism: identical inputs give identical answers.
 */
import { keepsBlockOnRebuild, diffPlans } from '../planDiff';

const running = { status: 'active', currentWeek: 3, totalWeeks: 6 };
const recovery = { status: 'recovery', currentWeek: 6, totalWeeks: 6 };
const finished = { status: 'completed_awaiting_decision', currentWeek: 7, totalWeeks: 6 };

const sameMoves = ['Squat', 'Bench Press', 'Row'];
const daysOnly = diffPlans(
  { days: 4, split: 'upper_lower', sessionLengthMinutes: 60, moves: sameMoves },
  { days: 3, split: 'full_body', sessionLengthMinutes: 60, moves: sameMoves },
);
const withDrop = diffPlans(
  { days: 4, split: 'upper_lower', sessionLengthMinutes: 60, moves: sameMoves },
  { days: 3, split: 'full_body', sessionLengthMinutes: 60, moves: ['Squat', 'Bench Press'] },
);
const withAdd = diffPlans(
  { days: 4, split: 'upper_lower', sessionLengthMinutes: 60, moves: sameMoves },
  { days: 3, split: 'full_body', sessionLengthMinutes: 60, moves: [...sameMoves, 'Curl'] },
);
const emptyReceipt = { stays: [{ exerciseName: 'Squat' }], changes: [], added: [], noLongerIn: [] };

describe('keepsBlockOnRebuild: days-only keeps the running block', () => {
  test('days change, every exercise stays, block active: kept', () => {
    expect(daysOnly.days.changed).toBe(true);
    expect(daysOnly.movesAdded).toEqual([]);
    expect(daysOnly.movesDropped).toEqual([]);
    expect(keepsBlockOnRebuild({ diff: daysOnly, receipt: emptyReceipt, blockStatus: running })).toBe(true);
  });

  test('the recovery week is still a running block: kept', () => {
    expect(keepsBlockOnRebuild({ diff: daysOnly, receipt: emptyReceipt, blockStatus: recovery })).toBe(true);
  });

  test('a null receipt (no continuity decisions) defers to the diff alone', () => {
    expect(keepsBlockOnRebuild({ diff: daysOnly, receipt: null, blockStatus: running })).toBe(true);
  });

  test('a split change with the same exercises is still structure-only: kept', () => {
    expect(daysOnly.split.changed).toBe(true);
    expect(keepsBlockOnRebuild({ diff: daysOnly, blockStatus: running })).toBe(true);
  });
});

describe('keepsBlockOnRebuild: any exercise change restarts, as before', () => {
  test('an exercise dropped: not kept', () => {
    expect(keepsBlockOnRebuild({ diff: withDrop, receipt: emptyReceipt, blockStatus: running })).toBe(false);
  });

  test('an exercise added: not kept', () => {
    expect(keepsBlockOnRebuild({ diff: withAdd, receipt: emptyReceipt, blockStatus: running })).toBe(false);
  });

  test('the receipt has the final say: a replacement the name diff cannot see restarts', () => {
    const replaced = { ...emptyReceipt, changes: [{ exerciseName: 'Hack Squat', previousExerciseName: 'Squat' }] };
    expect(keepsBlockOnRebuild({ diff: daysOnly, receipt: replaced, blockStatus: running })).toBe(false);
    const gone = { ...emptyReceipt, noLongerIn: [{ exerciseName: 'Row' }] };
    expect(keepsBlockOnRebuild({ diff: daysOnly, receipt: gone, blockStatus: running })).toBe(false);
    const added = { ...emptyReceipt, added: [{ exerciseName: 'Curl' }] };
    expect(keepsBlockOnRebuild({ diff: daysOnly, receipt: added, blockStatus: running })).toBe(false);
  });
});

describe('keepsBlockOnRebuild: nothing to keep', () => {
  test('a finished block awaiting its decision is never kept', () => {
    expect(keepsBlockOnRebuild({ diff: daysOnly, receipt: emptyReceipt, blockStatus: finished })).toBe(false);
  });

  test('no block, no diff, or a status with no weeks: not kept', () => {
    expect(keepsBlockOnRebuild({ diff: daysOnly, blockStatus: null })).toBe(false);
    expect(keepsBlockOnRebuild({ diff: null, blockStatus: running })).toBe(false);
    expect(keepsBlockOnRebuild({ diff: daysOnly, blockStatus: { status: 'active' } })).toBe(false);
    expect(keepsBlockOnRebuild()).toBe(false);
  });

  test('deterministic: the same inputs always give the same answer', () => {
    const a = keepsBlockOnRebuild({ diff: daysOnly, receipt: emptyReceipt, blockStatus: running });
    const b = keepsBlockOnRebuild({ diff: daysOnly, receipt: emptyReceipt, blockStatus: running });
    expect(a).toBe(b);
  });
});
