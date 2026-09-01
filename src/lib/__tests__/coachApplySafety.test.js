import { loadVolumeIncreaseHolds } from '../coachApplySafety';

const knownState = { known: true, restrictions: [] };
const capability = (override = {}) => ({
  loadCapabilityResolveState: jest.fn(async () => knownState),
  capabilityKnown: jest.fn(() => true),
  blockingConflicts: jest.fn(() => []),
  ...override,
});
const database = (override = {}) => ({
  getAllExercises: jest.fn(async () => []),
  getLatestCheckin: jest.fn(async () => null),
  ...override,
});

describe('positive coach volume apply safety reads fail closed', () => {
  test('check-in read rejection returns unknown, never an empty hold set', async () => {
    const result = await loadVolumeIncreaseHolds('u1', {
      capability: capability(),
      database: database({ getLatestCheckin: jest.fn(async () => { throw new Error('sqlite busy'); }) }),
    });
    expect(result).toBeNull();
  });

  test('capability unknown returns unknown without claiming no restrictions', async () => {
    const result = await loadVolumeIncreaseHolds('u1', {
      capability: capability({ capabilityKnown: jest.fn(() => false) }),
      database: database(),
    });
    expect(result).toBeNull();
  });

  test('known capability plus readable check-in returns exact held muscles', async () => {
    const cap = capability({
      loadCapabilityResolveState: jest.fn(async () => ({
        known: true,
        restrictions: [{ id: 'episode-1', role: 'episode', adaptationMode: 'propose' }],
      })),
      blockingConflicts: jest.fn((_state, exercise) => (
        exercise.id === 'bench' ? [{ unknown: false, constraintId: 'episode-1' }] : []
      )),
    });
    const result = await loadVolumeIncreaseHolds('u1', {
      capability: cap,
      database: database({
        getAllExercises: jest.fn(async () => [
          { id: 'bench', primaryMuscle: 'chest' },
          { id: 'curl', primaryMuscle: 'biceps' },
        ]),
        getLatestCheckin: jest.fn(async () => ({ soreMuscles: 'quads, calves' })),
      }),
    });
    expect([...result].sort()).toEqual(['calves', 'chest', 'quads']);
  });

  test('a long-term disability baseline holds affected muscle increases too', async () => {
    const cap = capability({
      loadCapabilityResolveState: jest.fn(async () => ({
        known: true, restrictions: [{ id: 'baseline-1', role: 'baseline' }],
      })),
      blockingConflicts: jest.fn(() => [{ unknown: false, constraintId: 'baseline-1' }]),
    });
    const result = await loadVolumeIncreaseHolds('u1', {
      capability: cap,
      database: database({
        getAllExercises: jest.fn(async () => [{ id: 'press', primaryMuscle: 'shoulders' }]),
      }),
    });
    expect([...result]).toEqual(['shoulders']);
  });
});
