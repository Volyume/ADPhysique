// getBlockAdvice reads recent check-ins and the block status, then decides
// whether to surface a recovery-concern card. These tests pin the gate that
// stops a brand-new user (a single, possibly stray/seed, check-in) from being
// shown a "Keep an eye on recovery" card before there is any real pattern.

jest.mock('../database', () => ({ getRecentCheckins: jest.fn() }));
jest.mock('../mesocycle', () => ({ getBlockStatus: jest.fn() }));

import { getBlockAdvice } from '../blockAdvisor';
import { getRecentCheckins } from '../database';
import { getBlockStatus } from '../mesocycle';

const block = { startDate: Date.now(), plannedWeeks: 5 };
const activeStatus = (currentWeek) => ({
  status: 'active', currentWeek, totalWeeks: 5, recoveryWeek: 5, weeksOverdue: 0,
});

beforeEach(() => jest.clearAllMocks());

test('no check-ins yet stays on continue (no recovery card)', async () => {
  getRecentCheckins.mockResolvedValue([]);
  getBlockStatus.mockReturnValue(activeStatus(1));
  const advice = await getBlockAdvice('u1', block, { experience: 'intermediate' });
  expect(advice.action).toBe('continue');
});

test('a single low-energy check-in in week 1 does NOT surface a recovery card', async () => {
  // The reported bug: one stray check-in produced "Keep an eye on recovery".
  getRecentCheckins.mockResolvedValue([{ energyScore: 1, sorenessScore: 3, sleepHours: 7 }]);
  getBlockStatus.mockReturnValue(activeStatus(1));
  const advice = await getBlockAdvice('u1', block, { experience: 'intermediate' });
  expect(advice.action).toBe('continue');
});

test('a real pattern (>=2 check-ins, week >=2) still surfaces a heads-up', async () => {
  // One genuine high-energy signal this week, prior week fine, so it is a
  // heads-up rather than an early deload.
  getRecentCheckins.mockResolvedValue([
    { energyScore: 1, sorenessScore: 3, sleepHours: 7 },
    { energyScore: 4, sorenessScore: 2, sleepHours: 8 },
  ]);
  getBlockStatus.mockReturnValue(activeStatus(2));
  const advice = await getBlockAdvice('u1', block, { experience: 'intermediate' });
  expect(advice.action).toBe('heads_up');
});
