/**
 * freeConversion.test.js — the one-shot migration onto the fully-free product
 * (founder decision 2026-09-03).
 *
 * What this pins:
 *   - it runs ONCE per signed-in user, and never again on that device;
 *   - it cancels the three billing-lifecycle push families;
 *   - it clears the win-back episode and the queued start_cascade retry;
 *   - it removes the cached trial keys and the Home trial-end gate flag, and
 *     brings the cached tier up to full access;
 *   - it is BEST EFFORT: any single step failing costs only that step;
 *   - it NEVER throws, because it runs on the launch path;
 *   - it touches nothing safety-adjacent (no ED flag, no wellbeing state, no
 *     consent record, no weight/food data, and none of the coaching, weigh-in
 *     or check-in notification families).
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const mockCancelCascadeGate = jest.fn(() => Promise.resolve());
const mockCancelTrialDay3 = jest.fn(() => Promise.resolve());
const mockCancelWinback = jest.fn(() => Promise.resolve());
// Deliberately present so the test can prove they are NOT called.
const mockCancelMorning = jest.fn(() => Promise.resolve());
const mockCancelAll = jest.fn(() => Promise.resolve());
jest.mock('../../notifications/scheduler', () => ({
  cancelCascadeGateNotifications: (...a) => mockCancelCascadeGate(...a),
  cancelTrialDay3Notification: (...a) => mockCancelTrialDay3(...a),
  cancelWinbackNotification: (...a) => mockCancelWinback(...a),
  cancelMorningNotification: (...a) => mockCancelMorning(...a),
  cancelAllNotifications: (...a) => mockCancelAll(...a),
}));

const mockClearEpisode = jest.fn(() => Promise.resolve());
jest.mock('../winbackState', () => ({
  clearEpisode: (...a) => mockClearEpisode(...a),
}));

const mockClearPendingCascade = jest.fn(() => Promise.resolve());
jest.mock('../pendingCascade', () => ({
  clearPendingCascade: (...a) => mockClearPendingCascade(...a),
}));

const mockLogError = jest.fn();
jest.mock('../../errorLog', () => ({
  logError: (...a) => mockLogError(...a),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');
const { runFreeConversionOnce, hasRunFreeConversion } = require('../freeConversion');

const UID = 'user-1';
const MARKER = `@volyume_free_conversion_v1_${UID}`;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

async function seedTrialResidue() {
  await AsyncStorage.multiSet([
    ['@volyume_tier', 'free'],
    ['@volyume_trial_state', 'cascade_expired'],
    ['@volyume_pro_trial_ends_at', new Date(Date.now() - 86400000).toISOString()],
    ['@volyume_paid_verified_at', String(Date.now() - 86400000)],
    [`@volyume_trial_end_gate_shown_${UID}`, 'true'],
    // Untouched neighbours, to prove the blast radius.
    ['@volyume_notification_prefs', '{"morningEnabled":true}'],
    ['@volyume_first_run_complete', 'true'],
  ]);
}

describe('runFreeConversionOnce', () => {
  test('cancels the three billing-lifecycle push families, and nothing else', async () => {
    await seedTrialResidue();
    await runFreeConversionOnce(UID);
    expect(mockCancelCascadeGate).toHaveBeenCalledTimes(1);
    expect(mockCancelTrialDay3).toHaveBeenCalledTimes(1);
    expect(mockCancelWinback).toHaveBeenCalledTimes(1);
    // The weigh-in family and the blanket cancel are NOT this module's job.
    expect(mockCancelMorning).not.toHaveBeenCalled();
    expect(mockCancelAll).not.toHaveBeenCalled();
  });

  test('clears the win-back episode and the queued start_cascade retry', async () => {
    await runFreeConversionOnce(UID);
    expect(mockClearEpisode).toHaveBeenCalledTimes(1);
    expect(mockClearPendingCascade).toHaveBeenCalledWith(UID);
  });

  test('removes the cached trial keys and the Home trial-end gate flag', async () => {
    await seedTrialResidue();
    await runFreeConversionOnce(UID);
    expect(await AsyncStorage.getItem('@volyume_trial_state')).toBeNull();
    expect(await AsyncStorage.getItem('@volyume_pro_trial_ends_at')).toBeNull();
    expect(await AsyncStorage.getItem('@volyume_paid_verified_at')).toBeNull();
    expect(await AsyncStorage.getItem(`@volyume_trial_end_gate_shown_${UID}`)).toBeNull();
  });

  test('brings the cached tier up to full access', async () => {
    await seedTrialResidue();
    await runFreeConversionOnce(UID);
    expect(await AsyncStorage.getItem('@volyume_tier')).toBe('pro');
  });

  test('leaves unrelated storage alone', async () => {
    await seedTrialResidue();
    await runFreeConversionOnce(UID);
    expect(await AsyncStorage.getItem('@volyume_notification_prefs'))
      .toBe('{"morningEnabled":true}');
    expect(await AsyncStorage.getItem('@volyume_first_run_complete')).toBe('true');
  });

  test('marks itself done and never runs a second time for the same user', async () => {
    const first = await runFreeConversionOnce(UID);
    expect(first).toEqual({ ran: true });
    expect(await hasRunFreeConversion(UID)).toBe(true);
    expect(await AsyncStorage.getItem(MARKER)).not.toBeNull();

    jest.clearAllMocks();
    const second = await runFreeConversionOnce(UID);
    expect(second).toEqual({ ran: false });
    expect(mockCancelCascadeGate).not.toHaveBeenCalled();
    expect(mockClearEpisode).not.toHaveBeenCalled();
  });

  test('the marker is per-user: a second account on the same device still converts', async () => {
    await runFreeConversionOnce(UID);
    jest.clearAllMocks();
    const other = await runFreeConversionOnce('user-2');
    expect(other).toEqual({ ran: true });
    expect(mockCancelWinback).toHaveBeenCalledTimes(1);
  });

  test('no user id: does nothing at all (never writes a device-global marker)', async () => {
    expect(await runFreeConversionOnce(null)).toEqual({ ran: false });
    expect(await runFreeConversionOnce(undefined)).toEqual({ ran: false });
    expect(mockCancelCascadeGate).not.toHaveBeenCalled();
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });
});

describe('best effort: one failing step never costs the others', () => {
  test('a failing cancel is logged, and every later step still runs', async () => {
    await seedTrialResidue();
    mockCancelCascadeGate.mockRejectedValueOnce(new Error('OS queue unavailable'));
    await expect(runFreeConversionOnce(UID)).resolves.toEqual({ ran: true });
    expect(mockLogError).toHaveBeenCalledWith(
      'freeConversion.cancelCascadeGate', expect.any(Error), { uid: UID },
    );
    expect(mockCancelTrialDay3).toHaveBeenCalled();
    expect(mockCancelWinback).toHaveBeenCalled();
    expect(mockClearEpisode).toHaveBeenCalled();
    expect(await AsyncStorage.getItem('@volyume_tier')).toBe('pro');
  });

  test('a failing episode clear is logged, and the storage clean-up still runs', async () => {
    await seedTrialResidue();
    mockClearEpisode.mockRejectedValueOnce(new Error('storage'));
    await runFreeConversionOnce(UID);
    expect(mockLogError).toHaveBeenCalledWith(
      'freeConversion.clearWinbackEpisode', expect.any(Error), { uid: UID },
    );
    expect(await AsyncStorage.getItem('@volyume_trial_state')).toBeNull();
  });

  test('NEVER THROWS, even when every dependency fails (it runs on the launch path)', async () => {
    mockCancelCascadeGate.mockRejectedValue(new Error('x'));
    mockCancelTrialDay3.mockRejectedValue(new Error('x'));
    mockCancelWinback.mockRejectedValue(new Error('x'));
    mockClearEpisode.mockRejectedValue(new Error('x'));
    mockClearPendingCascade.mockRejectedValue(new Error('x'));
    const spy = jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValue(new Error('x'));
    const setSpy = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('x'));
    await expect(runFreeConversionOnce(UID)).resolves.toEqual({ ran: true });
    spy.mockRestore();
    setSpy.mockRestore();
  });

  test('a failed marker write simply repeats the (idempotent) conversion next launch', async () => {
    const setSpy = jest.spyOn(AsyncStorage, 'setItem')
      .mockImplementation(async (k) => {
        if (k === MARKER) throw new Error('disk full');
      });
    await runFreeConversionOnce(UID);
    setSpy.mockRestore();
    expect(await hasRunFreeConversion(UID)).toBe(false);
    jest.clearAllMocks();
    expect(await runFreeConversionOnce(UID)).toEqual({ ran: true });
    expect(mockCancelWinback).toHaveBeenCalledTimes(1);
  });
});
