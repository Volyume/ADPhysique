/**
 * scenarios.training.test.js — Campaign 21 Step 5, TRAINING/PROGRAMME family.
 *
 * Domains: T-WEEKLY (9), T-PROGRAMME (11, T-PROGRAMME-02 excluded per the
 * ORACLE-LOCK header), T-VOLUME (8), T-PERFORMANCE (3), T-SESSION (4),
 * T-SLOT (4). Every expected outcome is derived from a LOCKED ORACLE-LOCK.md
 * block (LEAD-REVIEW: ACCEPTED 2026-08-16) and cites it in the scenario's
 * `why`, per docs/coach-validation-campaign-21-2026-08-16/ORACLE-LOCK.md.
 *
 * Scenario definitions live in scenarios.training.data.js (see its header for
 * the full coverage list, new registry entries added, and the one
 * `expectedFail` disagreement). This file is the executable half:
 * runScenarios(SCENARIOS) plus one hand-written describe() block
 * (T-PROGRAMME-08/10, blockAdvisor.getBlockAdvice) that mocks ONLY the
 * database.getRecentCheckins IO boundary and exercises the real production
 * function -- the same IO-mocking allowance scenarios.conflict.test.js's
 * CFL-20 (X-SAFETY-06) already uses, needed here because detectSignals and
 * buildNextBlockRecommendation are module-private, reachable only through
 * getBlockAdvice.
 */
import { runScenarios, NOW, DAY } from './harness';
import { SCENARIOS } from './scenarios.training.data';

runScenarios(SCENARIOS);

// ─── T-PROGRAMME-08/10: blockAdvisor.getBlockAdvice, IO-mocked ──────────────
// detectSignals (T-PROGRAMME-08's severity thresholds) and the early_deload /
// heads_up masters-threshold gating (T-PROGRAMME-10) are module-private in
// blockAdvisor.js, reachable only through the async, DB-backed getBlockAdvice.
// Only the one true IO boundary -- database.getRecentCheckins -- is mocked;
// every branch and threshold exercised below is the REAL production function.
describe('TRN-A1..A3: T-PROGRAMME-08/10 blockAdvisor.getBlockAdvice (IO-mocked database.getRecentCheckins)', () => {
  let mockGetRecentCheckins;
  let getBlockAdvice;

  beforeAll(() => {
    jest.resetModules();
    mockGetRecentCheckins = jest.fn();
    jest.doMock('../../lib/database', () => ({
      getRecentCheckins: (...a) => mockGetRecentCheckins(...a),
    }));
    // eslint-disable-next-line global-require
    getBlockAdvice = require('../../lib/blockAdvisor').getBlockAdvice;
  });

  afterAll(() => { jest.resetModules(); jest.dontMock('../../lib/database'); });

  // An active (not recovery, not completed_awaiting_decision) block, week 3
  // of 6 -- so getBlockAdvice reaches the masters/deload/heads-up branch
  // without touching the recovery or completed-block branches (which need
  // further DB reads this describe block deliberately does not mock).
  const activeBlock = { startDate: NOW - 14 * DAY, plannedWeeks: 6, durationWeeks: 6 };

  test('TRN-A1: masters (age>=40) drop the deload trigger to 1 high signal (ORACLE T-PROGRAMME-10, "deloadHighThreshold = 1 for masters")', async () => {
    mockGetRecentCheckins.mockResolvedValue([
      { weekStart: NOW - 1 * DAY, energyScore: 1, sorenessScore: 2, sleepHours: 7 },
      { weekStart: NOW - 8 * DAY, energyScore: 3, sorenessScore: 2, sleepHours: 7 },
    ]);
    const advice = await getBlockAdvice('u1', activeBlock, { age: 45 }, { isPro: true });
    expect(advice.action).toBe('early_deload');
  });

  test('TRN-A2: the SAME single high signal does not trigger early_deload for a non-master (threshold 2), and falls through to heads_up instead (ORACLE T-PROGRAMME-10, masters threshold-halving)', async () => {
    mockGetRecentCheckins.mockResolvedValue([
      { weekStart: NOW - 1 * DAY, energyScore: 1, sorenessScore: 2, sleepHours: 7 },
      { weekStart: NOW - 8 * DAY, energyScore: 3, sorenessScore: 2, sleepHours: 7 },
    ]);
    const advice = await getBlockAdvice('u1', activeBlock, { age: 25 }, { isPro: true });
    expect(advice.action).toBe('heads_up');
    expect(advice.action).not.toBe('early_deload');
  });

  test('TRN-A3: a single check-in (hasEnoughHistory false) fires neither early_deload nor heads_up, however high the one signal reads -- a user one week into their first block is never told to drop their sets in half (ORACLE T-PROGRAMME-10 HOLD, hasEnoughHistory gate)', async () => {
    mockGetRecentCheckins.mockResolvedValue([
      { weekStart: NOW - 1 * DAY, energyScore: 1, sorenessScore: 2, sleepHours: 7 },
    ]);
    const advice = await getBlockAdvice('u1', activeBlock, { age: 45 }, { isPro: true });
    expect(advice.action).toBe('continue');
  });
});
