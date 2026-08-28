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
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn() }));

const AsyncStorage = require('@react-native-async-storage/async-storage');
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
  AsyncStorage.getItem.mockResolvedValue(null); // wellbeing unspecified
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
    expect(inputs.consistency).toEqual({ completed: 2, planned: 4 });
    // Privacy: the gathered object carries nothing weight/calorie/body-shaped.
    expect(JSON.stringify(inputs)).not.toMatch(/weight|kcal|calorie|macro|bodyfat/i);
  });

  test('never claims a training day: dayLabel is null (founder 2026-08-03)', async () => {
    const inputs = await gatherWidgetInputs('u1');
    expect(inputs.nextSession.dayLabel).toBeNull();
  });

  test('a finished block (awaitingDecision) never claims a live week-in-block (Stage 1, 2026-08-09)', async () => {
    db.getCurrentMesocycleWeek.mockResolvedValue({ weekIndex: 5, plannedWeeks: 5, awaitingDecision: true });
    const inputs = await gatherWidgetInputs('u1');
    expect(inputs.nextSession.weekInBlock).toBeNull();
    // The rest of the session card is unaffected: name still renders.
    expect(inputs.nextSession.name).toBe('Push');
  });

  test('an open ED flag sets edFlagOpen (snapshot then suppresses consistency)', async () => {
    db.getOpenEdPatternFlag.mockResolvedValue({ id: 'flag' });
    const inputs = await gatherWidgetInputs('u1');
    expect(inputs.edFlagOpen).toBe(true);
  });

  // RE-PINNED (Today truth repair, founder Ruling 1): the widget carried a
  // "N weeks running" line mirroring the solo run's persisted high-water.
  // The weekly run/streak construct is rejected product-wide, so the widget
  // no longer reads streak state at all - it publishes the factual session
  // count only. T1's cross-surface concern is moot: there is no second
  // surface left to disagree with.
  test('the widget publishes no streak figure and never reads streak state', async () => {
    const inputs = await gatherWidgetInputs('u1');
    expect(inputs.consistency).not.toHaveProperty('streakWeeks');
    expect(JSON.stringify(inputs)).not.toMatch(/streak/i);
    // The factual half is untouched.
    expect(inputs.consistency.completed).toBe(2);
    expect(inputs.consistency.planned).toBe(4);
  });

  test('calm mode suppresses like an open flag; a failed wellbeing read fails closed', async () => {
    AsyncStorage.getItem.mockResolvedValue('calm');
    expect((await gatherWidgetInputs('u1')).edFlagOpen).toBe(true);
    AsyncStorage.getItem.mockRejectedValue(new Error('fs down'));
    expect((await gatherWidgetInputs('u1')).edFlagOpen).toBe(true);
  });

  // D112 R2 (closes audit T2-16): consistency.planned now reads the
  // EFFECTIVE planned figure (CC29, getWeeklySessionStats' own planned),
  // not a raw routine count - §18 claimed this already, it did not.
  describe('T2-16: the effective planned figure flows through, not a raw routine count', () => {
    test('a constrained week: 4 routines exist, but the effective planned figure is 3 (one session fully blocked) - the widget shows 3, not 4', async () => {
      db.getWeeklySessionStats.mockResolvedValue({ completed: 3, planned: 3, plannedIsEstimate: false });
      const inputs = await gatherWidgetInputs('u1');
      // db.getRoutinesForPlan's mock (beforeEach) still returns 4 routines -
      // the widget's own routines read is no longer what planned derives
      // from; it defers entirely to the stats function's own figure.
      expect(inputs.consistency).toEqual({ completed: 3, planned: 3 });
    });

    test('plannedIsEstimate true (no active plan, trailing-average fallback): the honest null denominator stands (RD6-9)', async () => {
      db.getWeeklySessionStats.mockResolvedValue({ completed: 2, planned: 3, plannedIsEstimate: true });
      const inputs = await gatherWidgetInputs('u1');
      expect(inputs.consistency).toEqual({ completed: 2, planned: null });
    });

    test('a getWeeklySessionStats read failure never smuggles a raw routine count in as the denominator', async () => {
      db.getWeeklySessionStats.mockRejectedValue(new Error('db down'));
      const inputs = await gatherWidgetInputs('u1');
      // The catch fallback marks itself an estimate too, so a read failure
      // reads the same honest "cannot say" as the no-plan case, never a
      // bare zero presented as a real prescribed count.
      expect(inputs.consistency).toEqual({ completed: 0, planned: null });
    });
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
