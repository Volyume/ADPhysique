// getBlockAdvice reads recent check-ins and the block status, then decides
// whether to surface a recovery-concern card. These tests pin the gate that
// stops a brand-new user (a single, possibly stray/seed, check-in) from being
// shown a "Keep an eye on recovery" card before there is any real pattern.

jest.mock('../database', () => ({ getRecentCheckins: jest.fn(), getRecentCompletedWorkouts: jest.fn() }));
jest.mock('../mesocycle', () => ({ getBlockStatus: jest.fn() }));

import { getBlockAdvice, buildNextBlockOptions, checkinReadiness } from '../blockAdvisor';
import { getRecentCheckins, getRecentCompletedWorkouts } from '../database';
import { getBlockStatus } from '../mesocycle';

const block = { startDate: Date.now(), plannedWeeks: 5 };
const activeStatus = (currentWeek) => ({
  status: 'active', currentWeek, totalWeeks: 5, recoveryWeek: 5, weeksOverdue: 0,
});

beforeEach(() => jest.clearAllMocks());

test('a STALE latest check-in produces no current signals (C6 seam 2, D97)', async () => {
  // A returning user's months-old check-in must not drive present-tense
  // recovery advice ("this week", "Your check-in shows..."). No fresh
  // check-in means no current signals - continue, no card.
  getRecentCheckins.mockResolvedValue([
    { weekStart: Date.now() - 120 * 86400000, energyScore: 1, sorenessScore: 5, sleepHours: 4 },
    { weekStart: Date.now() - 127 * 86400000, energyScore: 1, sorenessScore: 5, sleepHours: 4 },
  ]);
  getBlockStatus.mockReturnValue(activeStatus(3));
  // isPro: true (closeout P-8 re-anchor) - this pin is about RECENCY on
  // the coaching path, so it runs entitled; the tier gate has its own
  // describe below.
  const advice = await getBlockAdvice('u1', block, { experience: 'intermediate' }, { isPro: true });
  expect(advice.action).toBe('continue');
});

test('no check-ins yet stays on continue (no recovery card)', async () => {
  getRecentCheckins.mockResolvedValue([]);
  getBlockStatus.mockReturnValue(activeStatus(1));
  const advice = await getBlockAdvice('u1', block, { experience: 'intermediate' });
  expect(advice.action).toBe('continue');
});

test('a single low-energy check-in in week 1 does NOT surface a recovery card', async () => {
  // The reported bug: one stray check-in produced "Keep an eye on recovery".
  getRecentCheckins.mockResolvedValue([{ weekStart: Date.now() - 3 * 86400000, energyScore: 1, sorenessScore: 3, sleepHours: 7 }]);
  getBlockStatus.mockReturnValue(activeStatus(1));
  const advice = await getBlockAdvice('u1', block, { experience: 'intermediate' }, { isPro: true });
  expect(advice.action).toBe('continue');
});

// C6 Phase 1 seam 2 (D97) re-anchor, same meaning: signals now require a
// CURRENT latest check-in (weekStart within 14 days), so every fixture row
// below carries a fresh stamp - these tests describe live-week signals.
test('a real pattern (>=2 check-ins, week >=2) still surfaces a heads-up', async () => {
  // One genuine high-energy signal this week, prior week fine, so it is a
  // heads-up rather than an early deload.
  getRecentCheckins.mockResolvedValue([
    { weekStart: Date.now() - 3 * 86400000, energyScore: 1, sorenessScore: 3, sleepHours: 7 },
    { weekStart: Date.now() - 3 * 86400000, energyScore: 4, sorenessScore: 2, sleepHours: 8 },
  ]);
  getBlockStatus.mockReturnValue(activeStatus(2));
  // isPro: true (closeout P-8): recovery coaching is Pro; PlansScreen
  // threads the real entitlement.
  const advice = await getBlockAdvice('u1', block, { experience: 'intermediate' }, { isPro: true });
  expect(advice.action).toBe('heads_up');
});

// ───────────────────────────────────────────────────────────────────────
// FQ-2 (D96, founder ruling 2026-08-10): the next-block decision.
//
// The advisor's recommendation is ADVICE. It may mark one of the two
// options and explain why; it can no longer decide which options exist,
// and it never decides tier reachability - that comes from the real
// entitlement, threaded in as isPro. Free receives no adaptive next-block
// coaching at all ("FREE DOES NOT HAVE COACHING").
// ───────────────────────────────────────────────────────────────────────

const finishedStatus = {
  status: 'completed_awaiting_decision', currentWeek: 6, totalWeeks: 6,
  recoveryWeek: 6, weeksOverdue: 0, awaitingDecision: true,
};
const goodWeek = { weekStart: Date.now() - 3 * 86400000, energyScore: 4, sorenessScore: 2, sleepHours: 8 };
// FB-36's placeholder: WorkoutSummaryScreen writes a weekly_checkins row
// carrying only sleepQuality (a column the readiness formula never reads)
// on any session where the pre-workout sleep question was answered,
// tier-blind. It used to score exactly 50 and flip the branch.
const placeholderRow = { sleepQuality: 3 };

test('PRO: a finished block that went well still reaches BOTH options', async () => {
  getRecentCheckins.mockResolvedValue([goodWeek, goodWeek]);
  getBlockStatus.mockReturnValue(finishedStatus);
  const advice = await getBlockAdvice('u1', block, {}, { isPro: true });
  expect(advice.action).toBe('post_recovery');
  // The advisor still says what it thinks (FB-19's case: good readiness).
  expect(advice.nextBlock.recommendation).toBe('repeat');
  expect(advice.nextBlock.coached).toBe(true);
  // But it cannot gate: the adjusted option is there, unlocked.
  const options = buildNextBlockOptions({
    recommendation: advice.nextBlock.recommendation, isPro: true,
  });
  expect(options.map((o) => o.intent)).toEqual(['repeat', 'adjust']);
  expect(options.every((o) => !o.locked)).toBe(true);
  expect(options.find((o) => o.intent === 'adjust').recommended).toBe(false);
});

test('FREE: a finished block gets no adaptive coaching, whatever the check-ins say', async () => {
  // Real check-in rows from a lapsed Pro user would previously produce the
  // 'adjust' narrative ("your next block starts from what this block
  // showed") on a free phone, for a path free cannot take.
  getRecentCheckins.mockResolvedValue([
    { weekStart: Date.now() - 3 * 86400000, energyScore: 2, sorenessScore: 4, sleepHours: 6 },
    { weekStart: Date.now() - 3 * 86400000, energyScore: 2, sorenessScore: 4, sleepHours: 6 },
  ]);
  getBlockStatus.mockReturnValue(finishedStatus);
  const advice = await getBlockAdvice('u1', block, {}, { isPro: false });
  expect(advice.nextBlock.recommendation).toBeNull();
  expect(advice.nextBlock.coached).toBe(false);
  expect(advice.nextBlock.body).not.toMatch(/muscle by muscle|slightly adjusted/);
  const options = buildNextBlockOptions({
    recommendation: advice.nextBlock.recommendation, isPro: false,
  });
  // D139: the product is fully free (D137) -- buildNextBlockOptions no
  // longer locks the adjust option for a Free caller (the dead "Part of
  // Pro" gating is retired). Free still gets no COACHED recommendation
  // (asserted above via advice.nextBlock.recommendation/coached), which is
  // the real tier-blind fact this test protects.
  expect(options.find((o) => o.intent === 'repeat').locked).toBe(false);
  expect(options.find((o) => o.intent === 'adjust').locked).toBe(false);
});

test('a caller that forgets the entitlement fails closed to no coaching', async () => {
  getRecentCheckins.mockResolvedValue([goodWeek]);
  getBlockStatus.mockReturnValue(finishedStatus);
  const advice = await getBlockAdvice('u1', block, {});
  expect(advice.nextBlock.coached).toBe(false);
});

test('FB-36: a sleepQuality-only placeholder row changes nothing for either tier', async () => {
  getBlockStatus.mockReturnValue(finishedStatus);

  getRecentCheckins.mockResolvedValue([]);
  const proNoRows = await getBlockAdvice('u1', block, {}, { isPro: true });
  getRecentCheckins.mockResolvedValue([placeholderRow]);
  const proPlaceholder = await getBlockAdvice('u1', block, {}, { isPro: true });
  // The row carries no readiness evidence, so it is no longer a reading:
  // the advice is identical to having no rows at all (it used to flip from
  // 'repeat' to 'adjust').
  expect(proPlaceholder.nextBlock.recommendation).toBe(proNoRows.nextBlock.recommendation);
  expect(checkinReadiness(placeholderRow)).toBeNull();

  getRecentCheckins.mockResolvedValue([]);
  const freeNoRows = await getBlockAdvice('u1', block, {}, { isPro: false });
  getRecentCheckins.mockResolvedValue([placeholderRow]);
  const freePlaceholder = await getBlockAdvice('u1', block, {}, { isPro: false });
  // And for free it never decided anything in the first place any more.
  expect(freePlaceholder.nextBlock).toEqual(freeNoRows.nextBlock);
  expect(buildNextBlockOptions({ recommendation: freePlaceholder.nextBlock.recommendation, isPro: false })
    .map((o) => o.locked))
    .toEqual(buildNextBlockOptions({ recommendation: freeNoRows.nextBlock.recommendation, isPro: false })
      .map((o) => o.locked));
});

test('a row that answers even one question is scored exactly as before', () => {
  // The evidence gate must not soften any real reading.
  expect(checkinReadiness({ weekStart: Date.now() - 3 * 86400000, energyScore: 1, sorenessScore: 5, sleepHours: 4 })).toBe(0);
  expect(checkinReadiness({ weekStart: Date.now() - 3 * 86400000, energyScore: 3, sorenessScore: 3, sleepHours: 7 })).toBeCloseTo(52, 5);
  expect(checkinReadiness({ sorenessScore: 1 })).toBe(75);
  expect(checkinReadiness(null)).toBeNull();
});

describe('C6 R-4 (D97-22): a recovery week is only claimed live when it was earned', () => {
  const recoveryStatus = { status: 'recovery', currentWeek: 5, totalWeeks: 5, recoveryWeek: 5, weeksOverdue: 0 };

  test('no recent training: the calendar fact is stated, recovery is not prescribed', async () => {
    getRecentCheckins.mockResolvedValue([]);
    getBlockStatus.mockReturnValue(recoveryStatus);
    getRecentCompletedWorkouts.mockResolvedValue([
      { endedAt: Date.now() - 21 * 86400000 },
    ]);
    const advice = await getBlockAdvice('u1', block, { experience: 'intermediate' });
    expect(advice.action).toBe('in_recovery');
    expect(advice.headline).toBe('Recovery week on the calendar');
    expect(advice.body).not.toMatch(/last few weeks of work/);
    expect(advice.body).toMatch(/haven't trained recently/);
  });

  test('trained inside 14 days: the live recovery card is unchanged', async () => {
    getRecentCheckins.mockResolvedValue([]);
    getBlockStatus.mockReturnValue(recoveryStatus);
    getRecentCompletedWorkouts.mockResolvedValue([
      { endedAt: Date.now() - 2 * 86400000 },
    ]);
    const advice = await getBlockAdvice('u1', block, { experience: 'intermediate' });
    expect(advice.headline).toBe('Recovery week is active');
    expect(advice.body).toMatch(/the last few weeks turn into progress/);
  });

  test('a failed workout read cannot invent recent training (fails to the honest card)', async () => {
    getRecentCheckins.mockResolvedValue([]);
    getBlockStatus.mockReturnValue(recoveryStatus);
    getRecentCompletedWorkouts.mockRejectedValue(new Error('read failed'));
    const advice = await getBlockAdvice('u1', block, { experience: 'intermediate' });
    expect(advice.headline).toBe('Recovery week on the calendar');
  });
});

// C6 RA6-11 (D97-25): the branch CHOICE now shares seam 2's boundary.
// D97-8 stopped stale check-ins producing present-tense signals, but
// avgReadiness still averaged the same unfiltered rows, so a returning
// user's next-block recommendation was chosen by pre-lapse readiness -
// and not always conservatively (stale sub-60 rows pushed them onto the
// "Same plan, slightly adjusted. The structure is working" path).
test('RA6-11: pre-lapse check-ins cannot choose the next-block branch', async () => {
  // Months-old rows with terrible readiness (avg well below 60): if the
  // old unfiltered average were still in play, this would recommend
  // 'adjust'. With no check-in inside 14 days, the no-data default (70)
  // applies and the conservative repeat branch wins.
  getRecentCheckins.mockResolvedValue([
    { weekStart: Date.now() - 120 * 86400000, energyScore: 1, sorenessScore: 5, sleepHours: 4 },
    { weekStart: Date.now() - 127 * 86400000, energyScore: 1, sorenessScore: 5, sleepHours: 4 },
  ]);
  getBlockStatus.mockReturnValue(finishedStatus);
  const advice = await getBlockAdvice('u1', block, {}, { isPro: true });
  expect(advice.nextBlock.recommendation).toBe('repeat');
  expect(advice.nextBlock.body).not.toMatch(/structure is working/i);
});

test('RA6-11 control: fresh sub-60 readiness still chooses adjust exactly as before', async () => {
  // Readiness 52 each (the pinned mid-scale value): below the repeat
  // bar, above the rebuild floor, no high signals.
  getRecentCheckins.mockResolvedValue([
    { weekStart: Date.now() - 3 * 86400000, energyScore: 3, sorenessScore: 3, sleepHours: 7 },
    { weekStart: Date.now() - 6 * 86400000, energyScore: 3, sorenessScore: 3, sleepHours: 7 },
  ]);
  getBlockStatus.mockReturnValue(finishedStatus);
  const advice = await getBlockAdvice('u1', block, {}, { isPro: true });
  expect(advice.nextBlock.recommendation).toBe('adjust');
});

// C6 closeout P-8 (FREE HAS NO COACHING): the recovery-coaching branches
// (early_deload, heads_up, signal chips) are entitlement-gated like the
// next-block narrative always was. For up to 14 days after tier loss a
// Free user's Pro-era check-ins still passed the recency gate and kept
// coaching cards live; now the signals require isPro too.
describe('C6 closeout P-8: recovery coaching does not survive tier loss', () => {
  const proEraCheckins = () => ([
    // Fresh, genuinely alarming check-ins (would fire early_deload on Pro).
    { weekStart: Date.now() - 2 * 86400000, energyScore: 1, sorenessScore: 5, sleepHours: 4 },
    { weekStart: Date.now() - 9 * 86400000, energyScore: 1, sorenessScore: 5, sleepHours: 4 },
  ]);

  test('Pro -> Free: a recent Pro-era check-in renders NO coaching card as current advice', async () => {
    getRecentCheckins.mockResolvedValue(proEraCheckins());
    getBlockStatus.mockReturnValue(activeStatus(3));
    const advice = await getBlockAdvice('u1', block, { experience: 'intermediate' }, { isPro: false });
    expect(advice.action).toBe('continue'); // no early_deload, no heads_up
    expect(advice.signals ?? []).toEqual([]); // no coaching chips either
  });

  test('returning to Pro restores legitimate live coaching from the SAME rows immediately', async () => {
    getRecentCheckins.mockResolvedValue(proEraCheckins());
    getBlockStatus.mockReturnValue(activeStatus(3));
    const advice = await getBlockAdvice('u1', block, { experience: 'intermediate' }, { isPro: true });
    expect(advice.action).not.toBe('continue'); // the deload/heads-up path is live again
    expect(advice.signals.length).toBeGreaterThan(0);
  });

  test('historical rows are read, never deleted: the gate is display-side only', async () => {
    const rows = proEraCheckins();
    getRecentCheckins.mockResolvedValue(rows);
    getBlockStatus.mockReturnValue(activeStatus(3));
    await getBlockAdvice('u1', block, { experience: 'intermediate' }, { isPro: false });
    // The advisor only ever reads; the mock rows are untouched.
    expect(rows).toHaveLength(2);
    expect(getRecentCheckins).toHaveBeenCalled();
  });
});
