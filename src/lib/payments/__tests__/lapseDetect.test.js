/**
 * lapseDetect tests (COMP-025-A Moment-2 trigger).
 *
 * The safety-critical part: a stale-entitlement lockdown and a transient
 * non-result must NOT open an episode or lay a win-back; only a real
 * client-confirmed lapse does. A confirmed-active result clears the episode.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockSchedule = jest.fn(() => Promise.resolve());
const mockCancel = jest.fn(() => Promise.resolve());
jest.mock('../../notifications/scheduler', () => ({
  scheduleWinbackNotification: (...a) => mockSchedule(...a),
  cancelWinbackNotification: (...a) => mockCancel(...a),
}));

const {
  isAuthoritativeLapse, isConfirmedActive, handlePotentialLapse,
} = require('../lapseDetect');
const winbackState = require('../winbackState');

beforeEach(async () => {
  await AsyncStorage.clear();
  mockSchedule.mockClear();
  mockCancel.mockClear();
});

describe('isAuthoritativeLapse (pure)', () => {
  test('true for a real client-reconciled lapse (no reason)', () => {
    expect(isAuthoritativeLapse({ ok: true, checked: true, active: false, downgraded: true })).toBe(true);
  });
  test('false for the stale-no-provider lockdown', () => {
    expect(isAuthoritativeLapse({ ok: true, checked: true, active: false, downgraded: true, reason: 'stale_no_provider' })).toBe(false);
  });
  test('false for the stale-read-failed lockdown', () => {
    expect(isAuthoritativeLapse({ ok: true, checked: true, active: false, downgraded: true, reason: 'stale_read_failed' })).toBe(false);
  });
  test('false for a no-op / transient result', () => {
    expect(isAuthoritativeLapse({ ok: true, checked: false })).toBe(false);
    expect(isAuthoritativeLapse(null)).toBe(false);
    expect(isAuthoritativeLapse(undefined)).toBe(false);
  });
});

describe('isConfirmedActive (pure)', () => {
  test('true only when checked + active', () => {
    expect(isConfirmedActive({ checked: true, active: true })).toBe(true);
    expect(isConfirmedActive({ checked: false, active: true })).toBe(false);
    expect(isConfirmedActive({ checked: true, active: false })).toBe(false);
  });
});

describe('handlePotentialLapse', () => {
  test('a real lapse opens an episode and schedules the win-back', async () => {
    const r = await handlePotentialLapse({ checked: true, active: false, downgraded: true }, 'u1');
    expect(r).toEqual({ lapsed: true, opened: true });
    expect(await winbackState.getEpisode()).not.toBeNull();
    expect(mockSchedule).toHaveBeenCalledWith('u1');
  });

  test('a stale lockdown opens nothing and schedules nothing', async () => {
    const r = await handlePotentialLapse({ checked: true, active: false, downgraded: true, reason: 'stale_read_failed' }, 'u1');
    expect(r).toEqual({ lapsed: false, opened: false });
    expect(await winbackState.getEpisode()).toBeNull();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('re-detecting the same lapse keeps the original episode (opened:false)', async () => {
    await handlePotentialLapse({ checked: true, active: false, downgraded: true }, 'u1');
    const ep1 = await winbackState.getEpisode();
    const r2 = await handlePotentialLapse({ checked: true, active: false, downgraded: true }, 'u1');
    expect(r2.opened).toBe(false);
    expect((await winbackState.getEpisode()).lapseAt).toBe(ep1.lapseAt);
  });

  test('a confirmed-active result clears the episode and cancels the win-back (fresh slate)', async () => {
    await winbackState.openEpisode(123);
    const r = await handlePotentialLapse({ checked: true, active: true }, 'u1');
    expect(r).toEqual({ lapsed: false, opened: false });
    expect(await winbackState.getEpisode()).toBeNull();
    expect(mockCancel).toHaveBeenCalled();
  });

  test('a transient no-op leaves an existing episode untouched', async () => {
    await winbackState.openEpisode(123);
    await handlePotentialLapse({ checked: false }, 'u1');
    expect((await winbackState.getEpisode()).lapseAt).toBe(123);
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
  });
});
