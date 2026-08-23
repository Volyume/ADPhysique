/**
 * The plan layer inside the ONE landmark precedence.
 *
 * Founder ruling 2026-08-23. The precedence is now
 * manual > adapted(Pro) > plan > profile > research, and every display
 * surface reads it through getEffectiveLandmarks, so the workout
 * summary, the volume screen, analytics and the coach review can never
 * show different bands for the same muscle.
 *
 * This suite drives the real loader with a mocked database, so it pins
 * that the plan is actually read and turned into a band, not just that
 * the pure merge would accept one.
 */
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn() }));
jest.mock('../database', () => ({
  getAdaptiveLandmarkHistory: jest.fn(),
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const db = require('../database');
const { mergeLandmarkPrecedence, getEffectiveLandmarks } = require('../effectiveLandmarks');
const { VOLUME_LANDMARKS } = require('../algorithms');

const PROFILE = { experience: 'advanced', recoveryRating: 'good', trainingPhase: 'build', age: 28 };

const givePlan = (chestSetsPerDay = [4, 4]) => {
  db.getActivePlan.mockResolvedValue({ id: 'plan1' });
  db.getRoutinesForPlan.mockResolvedValue(chestSetsPerDay.map((_, i) => ({ id: `r${i}` })));
  db.getRoutineExercisesWithDetails.mockImplementation((routineId) => {
    const idx = Number(String(routineId).replace('r', ''));
    return Promise.resolve([{
      recommendedSets: chestSetsPerDay[idx],
      exercise: { primaryMuscle: 'chest', secondaryMuscles: [] },
    }]);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  AsyncStorage.getItem.mockResolvedValue(null);
  db.getAdaptiveLandmarkHistory.mockResolvedValue([]);
  db.getActivePlan.mockResolvedValue(null);
  db.getRoutinesForPlan.mockResolvedValue([]);
  db.getRoutineExercisesWithDetails.mockResolvedValue([]);
});

describe('the merge places the plan below adapted and above research', () => {
  const research = { chest: { mv: 4, mev: 6, mav: 14, mrv: 22 }, quads: { mv: 6, mev: 8, mav: 14, mrv: 20 } };
  const plan = {
    table: { chest: { mev: 6, mav: 16, mrv: 22 }, quads: { mev: 8, mav: 12, mrv: 20 } },
    source: { chest: 'plan', quads: 'plan' },
  };

  test('a hand-set target still wins', () => {
    const { table, source } = mergeLandmarkPrecedence({
      manual: { chest: { mev: 9, mav: 18, mrv: 26 } }, plan, research,
    });
    expect(source.chest).toBe('manual');
    expect(table.chest).toMatchObject({ mav: 18 });
  });

  test('an adapted muscle still wins', () => {
    const { table, source } = mergeLandmarkPrecedence({
      adapted: { chest: { mev: 7, mav: 15, mrv: 23, isAdapted: true } }, plan, research,
    });
    expect(source.chest).toBe('adapted');
    expect(table.chest).toMatchObject({ mav: 15 });
  });

  test('otherwise the plan band is what shows, with its own provenance', () => {
    const { table, source } = mergeLandmarkPrecedence({ plan, research });
    expect(source.chest).toBe('plan');
    expect(table.chest).toMatchObject({ mev: 6, mav: 16, mrv: 22 });
  });

  test('a caller with no plan layer is unchanged, which is what the ledger lane wants', () => {
    const { table, source } = mergeLandmarkPrecedence({ research });
    expect(source.chest).toBe('research');
    expect(table.chest).toMatchObject(research.chest);
  });
});

describe('the loader actually reads the plan', () => {
  test("a plan that programs eight chest sets a week puts the sweet spot at eight", async () => {
    givePlan([4, 4]);
    const { table, source } = await getEffectiveLandmarks('u1', { tier: 'free', userProfile: PROFILE });
    expect(source.chest).toBe('plan');
    expect(table.chest.mav).toBe(8);
  });

  test('a Free athlete gets the plan band too: reading their own plan is not coaching output', async () => {
    givePlan([5, 5, 5]);
    const { source, table } = await getEffectiveLandmarks('u1', { tier: 'free', userProfile: PROFILE });
    expect(source.chest).toBe('plan');
    expect(table.chest.mav).toBe(15);
  });

  test('a muscle the plan never trains falls to the profile band, not the research table', async () => {
    givePlan([4, 4]);
    const { table, source } = await getEffectiveLandmarks('u1', { tier: 'free', userProfile: PROFILE });
    expect(source.quads).toBe('profile');
    expect(table.quads.mrv).not.toBe(VOLUME_LANDMARKS.quads.mrv);
  });

  test('no active plan leaves the profile band standing', async () => {
    const { source } = await getEffectiveLandmarks('u1', { tier: 'free', userProfile: PROFILE });
    expect(source.chest).toBe('profile');
  });

  test('a plan that cannot be read degrades quietly rather than throwing', async () => {
    db.getActivePlan.mockRejectedValue(new Error('db gone'));
    await expect(getEffectiveLandmarks('u1', { tier: 'free', userProfile: PROFILE }))
      .resolves.toBeTruthy();
    const { source } = await getEffectiveLandmarks('u1', { tier: 'free', userProfile: PROFILE });
    expect(source.chest).toBe('profile');
  });

  test('one unreadable training day does not lose the rest of the week', async () => {
    givePlan([4, 4]);
    db.getRoutineExercisesWithDetails.mockImplementation((routineId) => (
      routineId === 'r0'
        ? Promise.reject(new Error('row gone'))
        : Promise.resolve([{ recommendedSets: 4, exercise: { primaryMuscle: 'chest', secondaryMuscles: [] } }])
    ));
    const { table, source } = await getEffectiveLandmarks('u1', { tier: 'free', userProfile: PROFILE });
    expect(source.chest).toBe('plan');
    expect(table.chest.mav).toBe(4);
  });
});
