/**
 * campaign10h.choiceWriters.test.js — Campaign 10H, the store-side half
 * of "the user made a choice, so Volyume must respect it".
 *
 * Two writers, pinned behaviourally rather than by source guard:
 *
 * F-4. setAllergenExcludes must actually PRODUCE the authoritative
 *      per-field timestamp. It always asked for one, but
 *      _stampProfileFields only records fields listed in
 *      PROFILE_FIELDS_TRACKED and mealPlanExcludeTags was missing from
 *      that list, so the stamp was silently dropped and the profile push
 *      carried no column_updates_at entry for allergen_excludes. What the
 *      missing stamp then costs is pinned in
 *      src/lib/__tests__/campaign10h.userChoice.test.js.
 *
 * F-3. The Share usage data toggle must still drive telemetry on THIS
 *      device immediately. Excluding the pref from sync must not have
 *      touched what the setting does locally.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../lib/database', () => ({
  wipeAllUserData: jest.fn().mockResolvedValue(undefined),
  wipeAllUserDataWithRetry: jest.fn().mockResolvedValue({ ok: true }),
}));

// pushPrefSoon defers a syncUserPref call onto a 0ms timer; without this
// the real (heavy) sync module loads after the test environment is torn
// down. The push itself is not what this suite pins.
jest.mock('../../lib/sync', () => ({ syncUserPref: jest.fn(() => Promise.resolve()) }));

const mockSetTelemetryEnabled = jest.fn();
jest.mock('../../lib/telemetry/transport', () => ({
  setTelemetryEnabled: (...a) => mockSetTelemetryEnabled(...a),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');
const useAppStore = require('../useAppStore').default;
const { PRIVACY_PREFS_KEY } = require('../../lib/privacyPrefs');

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useAppStore.setState({
    user: { id: 'user-1' },
    userProfile: { firstName: 'Sam', mealPlanExcludeTags: [], mealPlanExcludeFoods: [] },
    userProfileFieldUpdatedAt: {},
    privacy: { analyticsOptOut: false },
  });
});

// Let pushPrefSoon's 0ms timer fire inside the test environment; firing it
// after teardown logs a spurious module-load error.
afterEach(async () => { await new Promise((r) => setTimeout(r, 5)); });

describe('F-4: setAllergenExcludes stamps the field it claims to stamp', () => {
  test('a new exclusion writes the value AND a per-field timestamp', async () => {
    const before = Date.now();
    await useAppStore.getState().setAllergenExcludes(['peanuts']);
    const s = useAppStore.getState();
    expect(s.userProfile.mealPlanExcludeTags).toEqual(['peanuts']);
    const stamp = s.userProfileFieldUpdatedAt.mealPlanExcludeTags;
    expect(typeof stamp).toBe('number');
    expect(stamp).toBeGreaterThanOrEqual(before);
  });

  test('the stamp advances on a later edit, so newer-wins can tell them apart', async () => {
    await useAppStore.getState().setAllergenExcludes(['peanuts']);
    const first = useAppStore.getState().userProfileFieldUpdatedAt.mealPlanExcludeTags;
    // Date.now() has millisecond resolution; force a distinguishable gap
    // rather than sleeping.
    const spy = jest.spyOn(Date, 'now').mockReturnValue(first + 5000);
    await useAppStore.getState().setAllergenExcludes(['peanuts', 'milk']);
    spy.mockRestore();
    const second = useAppStore.getState().userProfileFieldUpdatedAt.mealPlanExcludeTags;
    expect(second).toBeGreaterThan(first);
  });

  test('stamping allergens does not stamp every other profile field', async () => {
    await useAppStore.getState().setAllergenExcludes(['peanuts']);
    expect(Object.keys(useAppStore.getState().userProfileFieldUpdatedAt))
      .toEqual(['mealPlanExcludeTags']);
  });

  test('the timestamp survives a restart (persisted, not in-memory only)', async () => {
    await useAppStore.getState().setAllergenExcludes(['peanuts']);
    const raw = await AsyncStorage.getItem('@volyume_user_profile_ts_user-1');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw).mealPlanExcludeTags).toBeGreaterThan(0);
  });

  test('the list is de-duplicated and junk-filtered, and replacement is total', async () => {
    await useAppStore.getState().setAllergenExcludes(['peanuts', 'peanuts', '', null, 'milk']);
    expect(useAppStore.getState().userProfile.mealPlanExcludeTags).toEqual(['peanuts', 'milk']);
    // The Dietary needs screen owns the whole selection: removing an
    // exclusion is a shorter list, not a merge.
    await useAppStore.getState().setAllergenExcludes(['milk']);
    expect(useAppStore.getState().userProfile.mealPlanExcludeTags).toEqual(['milk']);
  });

  test('the generic unstamped meal-plan writer still refuses allergen tags', async () => {
    // Routing allergens through setMealPlanPrefs would write the value with
    // NO stamp — exactly the pre-fix failure, reintroduced by the back door.
    await useAppStore.getState().setAllergenExcludes(['peanuts']);
    await useAppStore.getState().setMealPlanPrefs({
      mealPlanExcludeTags: [], mealPlanMealsPerDay: 5,
    });
    const s = useAppStore.getState();
    expect(s.userProfile.mealPlanExcludeTags).toEqual(['peanuts']);
    expect(s.userProfile.mealPlanMealsPerDay).toBe(5);
  });

  test('an unauthenticated store writes nothing (no orphan stamp)', async () => {
    useAppStore.setState({ user: null });
    await useAppStore.getState().setAllergenExcludes(['peanuts']);
    expect(useAppStore.getState().userProfileFieldUpdatedAt).toEqual({});
  });
});

describe('F-3: the Share usage data toggle still controls telemetry on this device', () => {
  test('opting out disables telemetry immediately and persists locally', async () => {
    await useAppStore.getState().setAnalyticsOptOut(true);
    expect(useAppStore.getState().privacy.analyticsOptOut).toBe(true);
    expect(mockSetTelemetryEnabled).toHaveBeenLastCalledWith(false);
    const raw = await AsyncStorage.getItem(PRIVACY_PREFS_KEY);
    expect(JSON.parse(raw).analyticsOptOut).toBe(true);
  });

  test('opting back in re-enables it', async () => {
    await useAppStore.getState().setAnalyticsOptOut(true);
    await useAppStore.getState().setAnalyticsOptOut(false);
    expect(mockSetTelemetryEnabled).toHaveBeenLastCalledWith(true);
  });

  test('a stored opt-out is honoured on load', async () => {
    await AsyncStorage.setItem(PRIVACY_PREFS_KEY, JSON.stringify({ analyticsOptOut: true }));
    await useAppStore.getState().loadPrivacyPrefs();
    expect(useAppStore.getState().privacy.analyticsOptOut).toBe(true);
    expect(mockSetTelemetryEnabled).toHaveBeenLastCalledWith(false);
  });

  test('the default is opted IN, unchanged by this campaign', async () => {
    await useAppStore.getState().loadPrivacyPrefs();
    expect(useAppStore.getState().privacy.analyticsOptOut).toBe(false);
    expect(mockSetTelemetryEnabled).toHaveBeenLastCalledWith(true);
  });
});
