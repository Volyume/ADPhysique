/**
 * COMP-019 widget writer — gather logic (the OTA brains' feeder). Asserts that
 * consistency is suppressed under an open ED flag and that no body data is
 * ever gathered (privacy: home screen is semi-public).
 *
 * dayLabel is pinned NULL: founder ruling 2026-08-03, the product has no
 * scheduled training days, so the widget never makes a day claim
 * (docs/audit/cross-surface-consistency-audit-2026-07-30.md, "SUPERSEDED
 * SAME DAY").
 */
jest.mock('../../database', () => ({
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  getWeeklySessionStats: jest.fn(),
  getOpenEdPatternFlag: jest.fn(),
}));
jest.mock('../storage', () => ({ persistWidgetSnapshot: jest.fn().mockResolvedValue(true) }));

const db = require('../../database');
const { persistWidgetSnapshot } = require('../storage');
const { gatherWidgetInputs, writeWidgetSnapshot } = require('../writer');

beforeEach(() => {
  jest.clearAllMocks();
  db.getActivePlan.mockResolvedValue({ id: 'plan1', name: 'Hypertrophy A' });
  db.getRoutinesForPlan.mockResolvedValue([{ name: 'Push' }, { name: 'Pull' }, { name: 'Legs' }, { name: 'Upper' }]);
  db.getCurrentMesocycleWeek.mockResolvedValue({ weekIndex: 2, plannedWeeks: 5 });
  db.getWeeklySessionStats.mockResolvedValue({ completed: 2, planned: 4 });
  db.getOpenEdPatternFlag.mockResolvedValue(null);
});

describe('gatherWidgetInputs', () => {
  test('builds next session with a routine name + week-in-block, no body data', async () => {
    const inputs = await gatherWidgetInputs('u1');
    expect(inputs.nextSession.name).toBe('Push');
    // X17 (cross-surface-consistency-audit-2026-07-30): the widget added its
    // own +1 on top of getCurrentMesocycleWeek's already 1-indexed
    // weekIndex; re-anchored to the fixed, non-off-by-one value (weekIndex
    // 2 from the mock above -> week 2, not 3).
    expect(inputs.nextSession.weekInBlock).toEqual({ week: 2, total: 5 });
    expect(inputs.consistency).toEqual({ completed: 2, planned: 4, streakWeeks: 0 });
    // Privacy: the gathered object carries nothing weight/calorie/body-shaped.
    expect(JSON.stringify(inputs)).not.toMatch(/weight|kcal|calorie|macro|bodyfat/i);
  });

  test('never claims a training day: dayLabel is null (founder 2026-08-03)', async () => {
    const inputs = await gatherWidgetInputs('u1');
    expect(inputs.nextSession.dayLabel).toBeNull();
  });

  test('an open ED flag sets edFlagOpen (snapshot then suppresses consistency)', async () => {
    db.getOpenEdPatternFlag.mockResolvedValue({ id: 'flag' });
    const inputs = await gatherWidgetInputs('u1');
    expect(inputs.edFlagOpen).toBe(true);
  });
});

describe('writeWidgetSnapshot', () => {
  test('persists a built snapshot; consistency dropped under an ED flag', async () => {
    db.getOpenEdPatternFlag.mockResolvedValue({ id: 'flag' });
    const snap = await writeWidgetSnapshot('u1');
    expect(persistWidgetSnapshot).toHaveBeenCalledWith(snap);
    expect(snap.consistency).toBeNull();       // suppressed
    expect(snap.nextSession.name).toBe('Push'); // neutral content still shows
  });

  test('never throws on a gather failure', async () => {
    db.getActivePlan.mockRejectedValue(new Error('db down'));
    const snap = await writeWidgetSnapshot('u1');
    expect(snap.v).toBe(1);
  });
});
