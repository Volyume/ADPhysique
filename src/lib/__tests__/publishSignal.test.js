/**
 * publishSignal.test.js
 *
 * The thin orchestrator that gathers read-only context (planned sessions +
 * goal phase) and hands it to partnerService.publishWeeklySignal. Verifies it
 * maps the right fields and never throws, even when the gatherers reject.
 */

jest.mock('../database', () => ({
  getWeeklySessionStats: jest.fn(),
  getLatestCoachOutput: jest.fn(),
}));
jest.mock('../dayKey', () => ({ localWeekStartMs: () => 1700000000000 }));
jest.mock('../partners/partnerService', () => ({ publishWeeklySignal: jest.fn(() => Promise.resolve({ ok: true })) }));

const { getWeeklySessionStats, getLatestCoachOutput } = require('../database');
const { publishWeeklySignal } = require('../partners/partnerService');
const { publishMyWeeklySignal } = require('../partners/publishSignal');

beforeEach(() => jest.clearAllMocks());

test('no userId → no publish', async () => {
  await publishMyWeeklySignal(null);
  expect(publishWeeklySignal).not.toHaveBeenCalled();
});

test('maps planned sessions + goalPhase into the publish call', async () => {
  getWeeklySessionStats.mockResolvedValue({ completed: 2, planned: 4 });
  getLatestCoachOutput.mockResolvedValue({ goalPhase: 'build' });
  await publishMyWeeklySignal('u1');
  expect(publishWeeklySignal).toHaveBeenCalledWith({ sessionsPlanned: 4, goalPhase: 'build' });
});

test('tolerates rejecting gatherers (fire-and-forget, never throws)', async () => {
  getWeeklySessionStats.mockRejectedValue(new Error('db down'));
  getLatestCoachOutput.mockRejectedValue(new Error('db down'));
  await expect(publishMyWeeklySignal('u1')).resolves.toBeUndefined();
  // planned falls back to 0, goalPhase to null
  expect(publishWeeklySignal).toHaveBeenCalledWith({ sessionsPlanned: 0, goalPhase: null });
});
