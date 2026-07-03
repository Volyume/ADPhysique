/**
 * NEW-002 week-signal writer — computes the user's current-week state via the
 * shared seam and pushes it to active pairs only. Locks the ED freeze (§5),
 * the STEP A milestone booleans (completed_block / hit_pb) and their ED freeze,
 * and the lapsed-partner data-layer gate (A1 §9.4).
 */
jest.mock('../../database', () => ({
  getPartnershipsLocal: jest.fn(),
  getWeeklySessionStats: jest.fn(),
  getDeloadWeeksInRange: jest.fn().mockResolvedValue([]),
  getOpenEdPatternFlag: jest.fn().mockResolvedValue(null),
  getActivePlan: jest.fn().mockResolvedValue({ id: 'plan1' }),
  getRoutinesForPlan: jest.fn().mockResolvedValue([{}, {}, {}, {}]), // target 4
  getActiveBlock: jest.fn().mockResolvedValue(null),
  getWeeklyPRCount: jest.fn().mockResolvedValue(0),
}));
jest.mock('../../streakState', () => ({
  loadStreakState: jest.fn().mockResolvedValue({ manualGoal: null, pauses: [] }),
  pausedWeekKeys: jest.fn(() => new Set()),
}));
jest.mock('../../mesocycle', () => ({ getBlockStatus: jest.fn(() => ({ status: 'active' })) }));
jest.mock('../service', () => ({ pushWeekSignal: jest.fn().mockResolvedValue({ ok: true }) }));
jest.mock('../tierGate', () => ({ isLapsedPartner: jest.fn(() => false) }));
jest.mock('../telemetry', () => ({ trackPairWeekActive: jest.fn() }));

const db = require('../../database');
const meso = require('../../mesocycle');
const { pushWeekSignal } = require('../service');
const { isLapsedPartner } = require('../tierGate');
const { computeCurrentWeekState, writeOwnWeekSignals } = require('../weekSignalWriter');

beforeEach(() => {
  jest.clearAllMocks();
  db.getActivePlan.mockResolvedValue({ id: 'plan1' });
  db.getRoutinesForPlan.mockResolvedValue([{}, {}, {}, {}]);
  db.getDeloadWeeksInRange.mockResolvedValue([]);
  db.getOpenEdPatternFlag.mockResolvedValue(null);
  db.getActiveBlock.mockResolvedValue(null);
  db.getWeeklyPRCount.mockResolvedValue(0);
  meso.getBlockStatus.mockReturnValue({ status: 'active' });
  isLapsedPartner.mockReturnValue(false);
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

  test('derives milestone booleans from local data in a training week', async () => {
    db.getWeeklySessionStats.mockResolvedValue({ completed: 4, planned: 4 });
    db.getActiveBlock.mockResolvedValue({ startDate: '2026-05-01', plannedWeeks: 5 });
    meso.getBlockStatus.mockReturnValue({ status: 'complete' });
    db.getWeeklyPRCount.mockResolvedValue(2);
    const ws = await computeCurrentWeekState('u1');
    expect(ws.completedBlock).toBe(true);
    expect(ws.hitPb).toBe(true);
  });

  test('SCOFF >= 2 with NO open flag freezes outbound to resting, both booleans false', async () => {
    db.getWeeklySessionStats.mockResolvedValue({ completed: 4, planned: 4 }); // live training
    db.getActiveBlock.mockResolvedValue({ startDate: '2026-05-01', plannedWeeks: 5 });
    meso.getBlockStatus.mockReturnValue({ status: 'complete' }); // would be true
    db.getWeeklyPRCount.mockResolvedValue(3); // would be true
    db.getOpenEdPatternFlag.mockResolvedValue(null); // NO open flag
    const ws = await computeCurrentWeekState('u1', 2); // SCOFF >= 2 is the only lever
    expect(ws.state).toBe('resting');
    expect(ws.weekMet).toBe(true); // resting counts as met (never a fail)
    expect(ws.completedBlock).toBe(false);
    expect(ws.hitPb).toBe(false);
  });

  test('SCOFF below 2 with no flag does NOT freeze', async () => {
    db.getWeeklySessionStats.mockResolvedValue({ completed: 4, planned: 4 });
    const ws = await computeCurrentWeekState('u1', 1);
    expect(ws.state).toBe('training');
  });

  test('ED FREEZE forces BOTH milestone booleans false, even with a block + PB', async () => {
    db.getWeeklySessionStats.mockResolvedValue({ completed: 4, planned: 4 });
    db.getActiveBlock.mockResolvedValue({ startDate: '2026-05-01', plannedWeeks: 5 });
    meso.getBlockStatus.mockReturnValue({ status: 'complete' }); // would be true
    db.getWeeklyPRCount.mockResolvedValue(3); // would be true
    db.getOpenEdPatternFlag.mockResolvedValue({ id: 'flag' }); // freeze -> resting
    const ws = await computeCurrentWeekState('u1');
    expect(ws.state).toBe('resting');
    expect(ws.completedBlock).toBe(false);
    expect(ws.hitPb).toBe(false);
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

  test('carries the milestone booleans into the push', async () => {
    db.getPartnershipsLocal.mockResolvedValue([{ id: 'p1', status: 'active' }]);
    db.getWeeklySessionStats.mockResolvedValue({ completed: 4, planned: 4 });
    db.getActiveBlock.mockResolvedValue({ startDate: '2026-05-01', plannedWeeks: 5 });
    meso.getBlockStatus.mockReturnValue({ status: 'complete' });
    db.getWeeklyPRCount.mockResolvedValue(1);
    await writeOwnWeekSignals('u1');
    expect(pushWeekSignal).toHaveBeenCalledWith('u1', expect.objectContaining({
      completedBlock: true, hitPb: true, state: 'training',
    }));
  });

  test('LAPSED gate: a Free-resolved user pushes a calm resting signal, never live ticks', async () => {
    isLapsedPartner.mockReturnValue(true);
    db.getPartnershipsLocal.mockResolvedValue([{ id: 'p1', status: 'active' }]);
    db.getWeeklySessionStats.mockResolvedValue({ completed: 4, planned: 4 }); // live training
    db.getActiveBlock.mockResolvedValue({ startDate: '2026-05-01', plannedWeeks: 5 });
    meso.getBlockStatus.mockReturnValue({ status: 'complete' });
    db.getWeeklyPRCount.mockResolvedValue(2);
    await writeOwnWeekSignals('u1');
    expect(pushWeekSignal).toHaveBeenCalledWith('u1', expect.objectContaining({
      state: 'resting', weekMet: true, completedBlock: false, hitPb: false,
    }));
  });

  test('no active pairs -> nothing pushed', async () => {
    db.getPartnershipsLocal.mockResolvedValue([{ id: 'p', status: 'invited' }]);
    expect(await writeOwnWeekSignals('u1')).toBe(0);
    expect(pushWeekSignal).not.toHaveBeenCalled();
  });
});
