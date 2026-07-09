/**
 * CP-7 (design-usability audit 2026-07-09,
 * docs/design-usability-audit-2026-07-09/coverage-06-competitive-hps.md) --
 * opt-in biometric app lock. Pins the contract src/lib/biometricLock.js
 * depends on:
 *   - availability (getBiometricAvailability) fails CLOSED on a query error,
 *     so the Settings toggle can never present itself as usable when the
 *     hardware/enrolment state is unknown.
 *   - the stored pref (getLockEnabled) fails OPEN on a read error -- never a
 *     permanent lockout, per the task's inviolable rule.
 *   - authenticate() always passes disableDeviceFallback: false, so the OS
 *     device-passcode fallback is never silently disabled.
 *   - useAppLockGate(): locks on cold launch when the pref is already on,
 *     locks again on a genuine 'background' transition (not 'inactive'),
 *     auto-attempts authenticateAsync exactly once per lock event while in
 *     the foreground, and a failed attempt leaves it locked for a manual
 *     retry rather than looping the OS prompt.
 */
import { act, create } from 'react-test-renderer';
import { AppState } from 'react-native';

const SecureStore = require('expo-secure-store');
const LocalAuthentication = require('expo-local-authentication');

import {
  getBiometricAvailability,
  getLockEnabled,
  setLockEnabled,
  subscribeLockEnabled,
  authenticate,
  useAppLockGate,
} from '../biometricLock';

beforeEach(() => {
  jest.clearAllMocks();
  LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
  LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
  LocalAuthentication.authenticateAsync.mockResolvedValue({ success: true });
});

describe('getBiometricAvailability', () => {
  test('available when hardware present and enrolled', async () => {
    const res = await getBiometricAvailability();
    expect(res).toEqual({ hasHardware: true, isEnrolled: true, available: true });
  });

  test('unavailable when hardware present but nothing enrolled', async () => {
    LocalAuthentication.isEnrolledAsync.mockResolvedValueOnce(false);
    const res = await getBiometricAvailability();
    expect(res.available).toBe(false);
  });

  test('unavailable when there is no hardware at all', async () => {
    LocalAuthentication.hasHardwareAsync.mockResolvedValueOnce(false);
    const res = await getBiometricAvailability();
    expect(res.available).toBe(false);
  });

  test('fails CLOSED (never available) when the hardware query throws', async () => {
    LocalAuthentication.hasHardwareAsync.mockRejectedValueOnce(new Error('native error'));
    const res = await getBiometricAvailability();
    expect(res).toEqual({ hasHardware: false, isEnrolled: false, available: false });
  });
});

describe('getLockEnabled / setLockEnabled', () => {
  test('defaults to false (off) when nothing is stored', async () => {
    SecureStore.getItemAsync.mockResolvedValueOnce(null);
    expect(await getLockEnabled()).toBe(false);
  });

  test('reads back a persisted true/false value', async () => {
    await setLockEnabled(true);
    expect(await getLockEnabled()).toBe(true);
    await setLockEnabled(false);
    expect(await getLockEnabled()).toBe(false);
  });

  test('a read failure fails OPEN (false), never a permanent lockout', async () => {
    SecureStore.getItemAsync.mockRejectedValueOnce(new Error('keystore locked'));
    expect(await getLockEnabled()).toBe(false);
  });

  test('a write failure is reported (setLockEnabled returns false) and does not notify', async () => {
    SecureStore.setItemAsync.mockRejectedValueOnce(new Error('keystore full'));
    const cb = jest.fn();
    const unsub = subscribeLockEnabled(cb);
    const ok = await setLockEnabled(true);
    unsub();
    expect(ok).toBe(false);
    expect(cb).not.toHaveBeenCalled();
  });

  test('subscribeLockEnabled notifies on a successful write', async () => {
    const cb = jest.fn();
    const unsub = subscribeLockEnabled(cb);
    await setLockEnabled(true);
    unsub();
    expect(cb).toHaveBeenCalledWith(true);
  });
});

describe('authenticate', () => {
  test('always leaves the OS device-passcode fallback enabled', async () => {
    await authenticate();
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ disableDeviceFallback: false }),
    );
  });

  test('returns { success: true, error: null } on success', async () => {
    LocalAuthentication.authenticateAsync.mockResolvedValueOnce({ success: true });
    expect(await authenticate()).toEqual({ success: true, error: null });
  });

  test('returns { success: false, error } on a failed attempt, never throws', async () => {
    LocalAuthentication.authenticateAsync.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
    expect(await authenticate()).toEqual({ success: false, error: 'user_cancel' });
  });

  test('a thrown native error resolves to a failed result, never propagates', async () => {
    LocalAuthentication.authenticateAsync.mockRejectedValueOnce(new Error('native crash'));
    const res = await authenticate();
    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
  });
});

// --- useAppLockGate --------------------------------------------------------

function Harness({ onState }) {
  const state = useAppLockGate();
  onState(state);
  return null;
}

// A single macrotask boundary lets every pending microtask in a promise
// chain (however many .then()/await steps) drain first, so wrapping it in
// act() flushes any state updates that chain produced -- needed here
// because the gate's auto-retry effect kicks off authenticate() without the
// harness itself awaiting it.
async function flush() {
  await act(async () => { await new Promise((r) => { setTimeout(r, 0); }); });
}

async function mountGate(onState) {
  let tree;
  await act(async () => {
    tree = create(<Harness onState={onState} />);
  });
  await flush();
  return tree;
}

function captureAppStateListener() {
  let captured = null;
  AppState.addEventListener.mockImplementation((event, cb) => {
    if (event === 'change') captured = cb;
    return { remove: jest.fn() };
  });
  return {
    fire: async (next) => {
      await act(async () => { captured?.(next); });
      await flush();
    },
  };
}

describe('useAppLockGate', () => {
  test('pref off: never locks, checked flips true once the pref read resolves', async () => {
    SecureStore.getItemAsync.mockResolvedValueOnce('false');
    const states = [];
    await mountGate((s) => states.push(s));
    const last = states[states.length - 1];
    expect(last.checked).toBe(true);
    expect(last.enabled).toBe(false);
    expect(last.locked).toBe(false);
    expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
  });

  test('pref on: locks on cold launch and auto-attempts authenticateAsync', async () => {
    SecureStore.getItemAsync.mockResolvedValueOnce('true');
    const states = [];
    await mountGate((s) => states.push(s));
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledTimes(1);
    const last = states[states.length - 1];
    // The mocked authenticateAsync resolves { success: true }, so the
    // auto-attempt should have already unlocked it.
    expect(last.locked).toBe(false);
  });

  test('a failed auto-attempt leaves the screen locked for a manual retry, without looping', async () => {
    SecureStore.getItemAsync.mockResolvedValueOnce('true');
    LocalAuthentication.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });
    const states = [];
    await mountGate((s) => states.push(s));
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledTimes(1);
    const last = states[states.length - 1];
    expect(last.locked).toBe(true);
    expect(last.lastFailed).toBe(true);

    // Manual retry now succeeds.
    LocalAuthentication.authenticateAsync.mockResolvedValueOnce({ success: true });
    await act(async () => { await last.retryAuth(); });
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledTimes(2);
  });

  test('locks again on a genuine background transition, not on the transient iOS "inactive" state', async () => {
    SecureStore.getItemAsync.mockResolvedValueOnce('true');
    const listener = captureAppStateListener();
    const states = [];
    await mountGate((s) => states.push(s));
    // Cold-launch auto-attempt already unlocked it (mock resolves success).
    expect(states[states.length - 1].locked).toBe(false);
    LocalAuthentication.authenticateAsync.mockClear();

    await listener.fire('inactive');
    expect(states[states.length - 1].locked).toBe(false);
    expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();

    await listener.fire('background');
    expect(states[states.length - 1].locked).toBe(true);
    // Still backgrounded: must not attempt the OS prompt while unable to show it.
    expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();

    await listener.fire('active');
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledTimes(1);
    expect(states[states.length - 1].locked).toBe(false);
  });

  test('turning the pref off while locked clears the lock immediately', async () => {
    SecureStore.getItemAsync.mockResolvedValueOnce('true');
    LocalAuthentication.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });
    const states = [];
    await mountGate((s) => states.push(s));
    expect(states[states.length - 1].locked).toBe(true);

    await act(async () => { await setLockEnabled(false); });
    const last = states[states.length - 1];
    expect(last.enabled).toBe(false);
    expect(last.locked).toBe(false);
  });
});
