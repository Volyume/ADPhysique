/**
 * Hevy teardown 2026-06-29 (R1): global default rest timer + auto-start.
 *
 * Invariants:
 *  - defaults match the prior hardcoded behaviour (90s, auto-start ON), so an
 *    un-hydrated store behaves exactly as before this change;
 *  - setDefaultRestSeconds persists to AsyncStorage and clamps to the same
 *    30–600s band the routine builder uses;
 *  - setAutoStartRestTimer persists the boolean;
 *  - loadWorkoutPrefs hydrates a previously-saved value;
 *  - the fallback ActiveWorkoutScreen uses for a set with no per-exercise rest
 *    (`routineExercise?.restSeconds || defaultRestSeconds || 90`) resolves to
 *    the store's stored default.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../lib/database', () => ({
  wipeAllUserData: jest.fn().mockResolvedValue(undefined),
  wipeAllUserDataWithRetry: jest.fn().mockResolvedValue({ ok: true }),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');
const useAppStore = require('../useAppStore').default;

const WORKOUT_PREFS_KEY = '@volyume_workout_prefs';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useAppStore.setState({ defaultRestSeconds: 90, autoStartRestTimer: true, workoutPrefsLoaded: false });
});

describe('workout prefs: default rest + auto-start', () => {
  test('defaults preserve prior behaviour (90s, auto-start on)', () => {
    const s = useAppStore.getState();
    expect(s.defaultRestSeconds).toBe(90);
    expect(s.autoStartRestTimer).toBe(true);
  });

  test('setDefaultRestSeconds persists to AsyncStorage', async () => {
    await useAppStore.getState().setDefaultRestSeconds(120);
    expect(useAppStore.getState().defaultRestSeconds).toBe(120);
    const raw = await AsyncStorage.getItem(WORKOUT_PREFS_KEY);
    expect(JSON.parse(raw).defaultRestSeconds).toBe(120);
  });

  test('default rest is clamped to the 30-600s band', async () => {
    await useAppStore.getState().setDefaultRestSeconds(5);
    expect(useAppStore.getState().defaultRestSeconds).toBe(30);
    await useAppStore.getState().setDefaultRestSeconds(9999);
    expect(useAppStore.getState().defaultRestSeconds).toBe(600);
  });

  test('setAutoStartRestTimer persists the boolean', async () => {
    await useAppStore.getState().setAutoStartRestTimer(false);
    expect(useAppStore.getState().autoStartRestTimer).toBe(false);
    const raw = await AsyncStorage.getItem(WORKOUT_PREFS_KEY);
    expect(JSON.parse(raw).autoStartRestTimer).toBe(false);
  });

  test('loadWorkoutPrefs hydrates a previously-saved default', async () => {
    await AsyncStorage.setItem(WORKOUT_PREFS_KEY, JSON.stringify({
      defaultRestSeconds: 150, autoStartRestTimer: false,
    }));
    await useAppStore.getState().loadWorkoutPrefs();
    const s = useAppStore.getState();
    expect(s.defaultRestSeconds).toBe(150);
    expect(s.autoStartRestTimer).toBe(false);
    expect(s.workoutPrefsLoaded).toBe(true);
  });

  test('ActiveWorkout fallback uses the store default when no per-exercise rest', async () => {
    await useAppStore.getState().setDefaultRestSeconds(120);
    const { defaultRestSeconds } = useAppStore.getState();
    // Mirrors ActiveWorkoutScreen: routineExercise?.restSeconds || defaultRestSeconds || 90
    const routineExercise = { restSeconds: undefined };
    const resolved = (routineExercise?.restSeconds) || defaultRestSeconds || 90;
    expect(resolved).toBe(120);
    // A per-exercise rest still wins over the global default.
    const withPerExercise = ({ restSeconds: 75 }?.restSeconds) || defaultRestSeconds || 90;
    expect(withPerExercise).toBe(75);
  });
});
