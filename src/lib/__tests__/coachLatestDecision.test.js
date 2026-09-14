/**
 * coachDecision — the week's decision, read once for every surface.
 *
 * What this suite pins, and why each case is written to FAIL:
 *
 * The ED-pattern lockout is `buildDecision`'s FIRST branch. D166 makes it
 * binding that no consumer reassembles the decision from `output.whyThisWeek`,
 * because doing so skips that branch and shows a cheerful calorie instruction
 * to someone the app has flagged. Case 1 is that exact scenario: an output
 * carrying BOTH a lockout and a happy `whyThisWeek`, where returning the happy
 * one is the bug.
 *
 * The rest pin that the module invents nothing. No check-in ever run answers
 * empty rather than reassuring; an unreadable database answers empty rather
 * than throwing into a render path; and a decision from three weeks ago is
 * reported as three weeks old rather than presented as current, because
 * silently ageing a sentence into the present is the app asserting something
 * it does not know.
 */
jest.mock('../database', () => ({
  getLatestCoachOutputMeta: jest.fn(),
  getLatestCheckin: jest.fn(),
}));

import { getLatestCoachOutputMeta, getLatestCheckin } from '../database';
import { readLatestDecision, decisionAgeCaption } from '../coachLatestDecision';
import { localWeekStartMs } from '../dayKey';

const NOW = new Date('2026-09-16T10:00:00Z').getTime(); // a Wednesday
const THIS_WEEK = localWeekStartMs(NOW);
const WEEK = 7 * 24 * 60 * 60 * 1000;

beforeEach(() => {
  jest.clearAllMocks();
  // A checked-in week by default; the cases below that care override it.
  getLatestCheckin.mockResolvedValue({ weekStart: THIS_WEEK, energyScore: 4 });
});

describe('the safety branch is never skipped', () => {
  test('an open ED lockout wins over a happy whyThisWeek', async () => {
    getLatestCoachOutputMeta.mockResolvedValue({
      weekStart: THIS_WEEK,
      updatedAt: NOW,
      output: {
        whyThisWeek: 'Weight is tracking the target rate. No change needed this week.',
        heldDecisions: [{
          type: 'ed_pattern_lockout',
          reason: 'Calories are held while we check in on how things are going.',
        }],
        adjustments: { calories: { change: -150, note: 'Trend is above target.' } },
      },
    });
    const d = await readLatestDecision('u1', { nowMs: NOW });
    expect(d.sentence).toBe('Calories are held while we check in on how things are going.');
    expect(d.sentence).not.toContain('No change needed');
    expect(d.sentence).not.toContain('150');
  });

  test('an applied calorie change outranks whyThisWeek when no lockout is open', async () => {
    getLatestCoachOutputMeta.mockResolvedValue({
      weekStart: THIS_WEEK,
      output: {
        whyThisWeek: 'Weight is tracking the target rate. No change needed this week.',
        heldDecisions: [],
        adjustments: { calories: { change: -150, note: 'Trend is above target.' } },
      },
    });
    const d = await readLatestDecision('u1', { nowMs: NOW });
    expect(d.sentence).toContain('150');
    expect(d.sentence).toContain('down');
  });

  test('a held-calorie reason is used before falling back to whyThisWeek', async () => {
    getLatestCoachOutputMeta.mockResolvedValue({
      weekStart: THIS_WEEK,
      output: {
        whyThisWeek: 'Weight is tracking the target rate.',
        heldDecisions: [{ type: 'ffm_floor', reason: 'Calories held at the floor for your lean mass.' }],
        adjustments: { calories: null },
      },
    });
    const d = await readLatestDecision('u1', { nowMs: NOW });
    expect(d.sentence).toBe('Calories held at the floor for your lean mass.');
  });

  test('the plain case falls through to whyThisWeek', async () => {
    getLatestCoachOutputMeta.mockResolvedValue({
      weekStart: THIS_WEEK,
      output: {
        whyThisWeek: 'Weight is tracking the target rate. No change needed this week.',
        heldDecisions: [],
        adjustments: { calories: null },
      },
    });
    const d = await readLatestDecision('u1', { nowMs: NOW });
    expect(d.sentence).toBe('Weight is tracking the target rate. No change needed this week.');
    expect(d.isCurrent).toBe(true);
    expect(d.weeksAgo).toBe(0);
  });
});

describe('it invents nothing', () => {
  test('no check-in ever run answers empty, not reassuring', async () => {
    getLatestCoachOutputMeta.mockResolvedValue(null);
    const d = await readLatestDecision('u1', { nowMs: NOW });
    expect(d).toEqual({
      sentence: null, weekStart: null, weeksAgo: 0,
      isCurrent: false, hasOutput: false, isCompleted: false,
    });
  });

  test('an unreadable database answers empty rather than throwing into a render', async () => {
    getLatestCoachOutputMeta.mockRejectedValue(new Error('database is locked'));
    await expect(readLatestDecision('u1', { nowMs: NOW })).resolves.toMatchObject({ sentence: null, hasOutput: false });
  });

  test('an output that yields no sentence still reports that a week was run', async () => {
    getLatestCoachOutputMeta.mockResolvedValue({
      weekStart: THIS_WEEK,
      output: { whyThisWeek: null, heldDecisions: [], adjustments: { calories: null } },
    });
    const d = await readLatestDecision('u1', { nowMs: NOW });
    expect(d.sentence).toBeNull();
    expect(d.hasOutput).toBe(true);
  });

  test('no user id answers empty without touching the database', async () => {
    const d = await readLatestDecision(null, { nowMs: NOW });
    expect(d.hasOutput).toBe(false);
    expect(getLatestCoachOutputMeta).not.toHaveBeenCalled();
  });
});

describe('staleness is reported, not hidden', () => {
  test('a decision from three weeks ago is three weeks old, not current', async () => {
    getLatestCoachOutputMeta.mockResolvedValue({
      weekStart: THIS_WEEK - 3 * WEEK,
      output: { whyThisWeek: 'Weight is tracking the target rate.', heldDecisions: [], adjustments: {} },
    });
    const d = await readLatestDecision('u1', { nowMs: NOW });
    expect(d.weeksAgo).toBe(3);
    expect(d.isCurrent).toBe(false);
  });

  test('the age caption is plain and never chases the reader', () => {
    expect(decisionAgeCaption(0)).toBeNull();
    expect(decisionAgeCaption(1)).toBe('From last week.');
    expect(decisionAgeCaption(4)).toBe('From 4 weeks ago.');
    // No urgency, no instruction to go and check in.
    expect(decisionAgeCaption(4)).not.toMatch(/check in|overdue|missed|!/i);
  });

  test('a week boundary crossing a BST change still counts whole weeks', async () => {
    // The UK clocks go back on 25 October 2026, so the week containing it is
    // 169 hours. A fixed-offset week count would read 2.0x weeks and round wrong.
    const novNow = new Date('2026-11-04T10:00:00Z').getTime();
    const novThisWeek = localWeekStartMs(novNow);
    getLatestCoachOutputMeta.mockResolvedValue({
      weekStart: localWeekStartMs(new Date('2026-10-21T10:00:00Z').getTime()),
      output: { whyThisWeek: 'Weight is tracking the target rate.', heldDecisions: [], adjustments: {} },
    });
    const d = await readLatestDecision('u1', { nowMs: novNow });
    expect(d.weeksAgo).toBe(2);
    expect(novThisWeek).toBeGreaterThan(0);
  });
});

describe('it defers to the existing test for a real decision', () => {
  test('a week that was checked in reads as completed', async () => {
    getLatestCoachOutputMeta.mockResolvedValue({
      weekStart: THIS_WEEK,
      output: { whyThisWeek: 'Weight is tracking the target rate.', heldDecisions: [], adjustments: {} },
    });
    getLatestCheckin.mockResolvedValue({ weekStart: THIS_WEEK, energyScore: 4 });
    const d = await readLatestDecision('u1', { nowMs: NOW });
    expect(d.isCompleted).toBe(true);
  });

  test('an output computed for a week with NO check-in is not a decision', async () => {
    // PM-06/D96: Home once showed a decision for a week the person never
    // checked in. The sentence still reads; the caller is told it is not real.
    getLatestCoachOutputMeta.mockResolvedValue({
      weekStart: THIS_WEEK,
      output: { whyThisWeek: 'Weight is tracking the target rate.', heldDecisions: [], adjustments: {} },
    });
    getLatestCheckin.mockResolvedValue(null);
    const d = await readLatestDecision('u1', { nowMs: NOW });
    expect(d.sentence).toBeTruthy();
    expect(d.isCompleted).toBe(false);
  });

  test('a check-in for a DIFFERENT week does not validate this one', async () => {
    getLatestCoachOutputMeta.mockResolvedValue({
      weekStart: THIS_WEEK,
      output: { whyThisWeek: 'Weight is tracking the target rate.', heldDecisions: [], adjustments: {} },
    });
    getLatestCheckin.mockResolvedValue({ weekStart: THIS_WEEK - WEEK, energyScore: 4 });
    const d = await readLatestDecision('u1', { nowMs: NOW });
    expect(d.isCompleted).toBe(false);
  });

  test('an unreadable check-in answers not-completed, the conservative direction', async () => {
    getLatestCoachOutputMeta.mockResolvedValue({
      weekStart: THIS_WEEK,
      output: { whyThisWeek: 'Weight is tracking the target rate.', heldDecisions: [], adjustments: {} },
    });
    getLatestCheckin.mockRejectedValue(new Error('database is locked'));
    const d = await readLatestDecision('u1', { nowMs: NOW });
    expect(d.isCompleted).toBe(false);
  });

  test('hasEnoughData false is not a decision even with a check-in', async () => {
    getLatestCoachOutputMeta.mockResolvedValue({
      weekStart: THIS_WEEK,
      output: {
        hasEnoughData: false,
        whyThisWeek: 'Weight is tracking the target rate.',
        heldDecisions: [], adjustments: {},
      },
    });
    const d = await readLatestDecision('u1', { nowMs: NOW });
    expect(d.isCompleted).toBe(false);
  });
});
