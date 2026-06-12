/**
 * COMP-019 widget writer — gather logic (the OTA brains' feeder). Asserts the
 * next-training-day label, that consistency is suppressed under an open ED flag,
 * and that no body data is ever gathered (privacy: home screen is semi-public).
 */
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
}));
jest.mock('../../database', () => ({
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  getWeeklySessionStats: jest.fn(),
  getOpenEdPatternFlag: jest.fn(),
}));
jest.mock('../storage', () => ({ persistWidgetSnapshot: jest.fn().mockResolvedValue(true) }));
jest.mock('../../notifications/trainingReminders', () => ({ SCHEDULE_KEY: '@volyume_schedule_v1' }));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const db = require('../../database');
const { persistWidgetSnapshot } = require('../storage');
const { nextTrainingDayLabel, gatherWidgetInputs, writeWidgetSnapshot } = require('../writer');

beforeEach(() => {
  jest.clearAllMocks();
  AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ days: [1, 3, 5] }));
  db.getActivePlan.mockResolvedValue({ id: 'plan1', name: 'Hypertrophy A' });
  db.getRoutinesForPlan.mockResolvedValue([{ name: 'Push' }, { name: 'Pull' }, { name: 'Legs' }, { name: 'Upper' }]);
  db.getCurrentMesocycleWeek.mockResolvedValue({ weekIndex: 2, plannedWeeks: 5 });
  db.getWeeklySessionStats.mockResolvedValue({ completed: 2, planned: 4 });
  db.getOpenEdPatternFlag.mockResolvedValue(null);
});

describe('nextTrainingDayLabel', () => {
  test('today when today is a training day', () => {
    // 2026-06-15 is a Monday (getDay 1).
    expect(nextTrainingDayLabel([1, 3, 5], new Date('2026-06-15T09:00:00'))).toBe('Today');
  });
  test('tomorrow (Tuesday, next training day Wednesday)', () => {
    expect(nextTrainingDayLabel([3], new Date('2026-06-16T09:00:00'))).toBe('Tomorrow');
  });
  test('named weekday otherwise', () => {
    expect(nextTrainingDayLabel([5], new Date('2026-06-15T09:00:00'))).toBe('Friday');
  });
  test('no days -> null', () => expect(nextTrainingDayLabel([])).toBeNull());
});

describe('gatherWidgetInputs', () => {
  test('builds next session with a routine name + week-in-block, no body data', async () => {
    const inputs = await gatherWidgetInputs('u1');
    expect(inputs.nextSession.name).toBe('Push');
    expect(inputs.nextSession.weekInBlock).toEqual({ week: 3, total: 5 });
    expect(inputs.consistency).toEqual({ completed: 2, planned: 4, streakWeeks: 0 });
    // Privacy: the gathered object carries nothing weight/calorie/body-shaped.
    expect(JSON.stringify(inputs)).not.toMatch(/weight|kcal|calorie|macro|bodyfat/i);
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
