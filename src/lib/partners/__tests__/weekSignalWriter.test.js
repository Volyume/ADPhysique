/**
 * NEW-002 week-signal writer — computes the user's current-week state via the
 * shared seam and pushes it to active pairs only. Locks the ED freeze (§5).
 */
jest.mock('../../database', () => ({
  getPartnershipsLocal: jest.fn(),
  getWeeklySessionStats: jest.fn(),
  getDeloadWeeksInRange: jest.fn().mockResolvedValue([]),
  getOpenEdPatternFlag: jest.fn().mockResolvedValue(null),
  getActivePlan: jest.fn().mockResolvedValue({ id: 'plan1' }),
  getRoutinesForPlan: jest.fn().mockResolvedValue([{}, {}, {}, {}]), // target 4
}));
jest.mock('../../streakState', () => ({
  loadStreakState: jest.fn().mockResolvedValue({ manualGoal: null, pauses: [] }),
  pausedWeekKeys: jest.fn(() => new Set()),
}));
jest.mock('../service', () => ({ pushWeekSignal: jest.fn().mockResolvedValue({ ok: true }) }));

const db = require('../../database');
const { pushWeekSignal } = require('../service');
const { computeCurrentWeekState, writeOwnWeekSignals } = require('../weekSignalWriter');

beforeEach(() => {
  jest.clearAllMocks();
  db.getActivePlan.mockResolvedValue({ id: 'plan1' });
  db.getRoutinesForPlan.mockResolvedValue([{}, {}, {}, {}]);
  db.getDeloadWeeksInRange.mockResolvedValue([]);
  db.getOpenEdPatternFlag.mockResolvedValue(null);
});

describe('computeCurrentWeekState', () => {
  test('met training week from plan target', async () => {
    db.getWeeklySessionStats.mockResolvedValue({ completed: 4, planned: 4 });
    const ws = await computeCurrentWeekState('u1');
    expect(ws).toMatchObject({ planned: 4, done: 4, weekMet: true, state: 'training' });
  });

  test('an open ED flag freezes the outbound signal to resting', async () => {
    db.getWeeklySessionStats.mockResolvedValue({ completed: 1, planned: 4 });
    db.getOpenEdPatternFlag.mockResolvedValue({ id: 'flag' });
    const ws = await computeCurrentWeekState('u1');
    expect(ws.state).toBe('resting');
    expect(ws.weekMet).toBe(true); // resting counts as met (never a fail)
  });
});

describe('writeOwnWeekSignals', () => {
  test('pushes only to active pairs', async () => {
    db.getPartnershipsLocal.mockResolvedValue([
      { id: 'p1', status: 'active' }, { id: 'p2', status: 'invited' }, { id: 'p3', status: 'ended' },
    ]);
    db.getWeeklySessionStats.mockResolvedValue({ completed: 3, planned: 4 });
    const n = await writeOwnWeekSignals('u1');
    expect(n).toBe(1);
    expect(pushWeekSignal).toHaveBeenCalledTimes(1);
    expect(pushWeekSignal).toHaveBeenCalledWith('u1', expect.objectContaining({ pairId: 'p1', done: 3, planned: 4 }));
  });

  test('no active pairs -> nothing pushed', async () => {
    db.getPartnershipsLocal.mockResolvedValue([{ id: 'p', status: 'invited' }]);
    expect(await writeOwnWeekSignals('u1')).toBe(0);
    expect(pushWeekSignal).not.toHaveBeenCalled();
  });
});
