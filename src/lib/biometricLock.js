/**
 * biometricLock.js
 *
 * Opt-in biometric app lock (Face ID / fingerprint / device passcode).
 * CP-7, design-usability audit 2026-07-09
 * (docs/design-usability-audit-2026-07-09/coverage-06-competitive-hps.md) --
 * founder-approved (D7) WITH the new expo-local-authentication dependency
 * (Expo SDK module, MIT licence, managed-workflow compatible via its bundled
 * config plugin -- no eject).
 *
 * DEFAULT OFF, opt-in only. The pref lives in expo-secure-store (never
 * AsyncStorage -- this is a security flag, per the project's workflow rule
 * "expo-secure-store for the pref"). It is stored per DEVICE, not per
 * account: the concern this feature answers is a shared/borrowed/
 * already-unlocked PHONE, not a specific signed-in identity, and the app
 * only ever has one active session at a time.
 *
 * SAFETY INVARIANTS:
 *  - The Settings toggle (SettingsPrivacyScreen.js) may only ever flip this
 *    ON when a LIVE check confirms the device both has biometric hardware
 *    AND has at least one biometric enrolled (getBiometricAvailability(),
 *    never cached). A user must never be able to arm a lock they cannot
 *    satisfy. This module does not enforce that itself (setLockEnabled is a
 *    pure read/write seam so it stays trivially testable) -- the caller is
 *    responsible, and IS the only caller (see SettingsPrivacyScreen.js).
 *  - authenticate() always leaves the OS device-passcode/PIN/pattern
 *    fallback enabled (disableDeviceFallback: false, passed explicitly so a
 *    future edit can't silently flip it), so a failed or absent biometric
 *    read can never permanently lock a user out of their own app -- the
 *    worst case is a manual "Try again" (or the OS's own passcode prompt).
 *  - A SecureStore READ failure for the pref fails OPEN (returns false /
 *    "not locked"). This is a privacy convenience, not an ED-safety or
 *    data-integrity floor, and the inviolable rule here is "never a
 *    permanent lockout" -- treating an unreadable pref as "locked" with no
 *    way back (if SecureStore is also unwritable) would risk exactly that.
 *
 * useAppLockGate() is the seam RootNavigator.js wires in, scoped to
 * MainTabs only (see LockedMainTabs there). By construction the pref can
 * only ever be switched on from Settings, which lives inside MainTabs, so
 * this hook never runs against -- and never gates -- the Welcome, Article 9
 * consent, or onboarding stacks. Auth and consent are untouched; this is a
 * purely additive gate in front of already-signed-in, already-consented,
 * already-onboarded content.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { logError, logWarn } from './errorLog';

const PREF_KEY = 'volyume_app_lock_enabled_v1';

// Plain module-scope pub/sub so the Settings toggle can tell an already-
// mounted useAppLockGate() about a pref change without either side needing
// the global store (out of scope for this feature per the task's touch
// list) or a remount. Intentionally NOT persisted here; setLockEnabled is
// the only writer, subscribeLockEnabled the only reader-side hook.
const listeners = new Set();
function notify(enabled) {
  listeners.forEach((cb) => {
    try { cb(enabled); } catch (_) { /* one bad listener must not break the rest */ }
  });
}

/**
 * Live hardware/enrolment check -- never cached. Callers should re-run this
 * every time it matters (screen focus, and again immediately before turning
 * the pref on) so a biometric removed in OS settings after this was last
 * checked is caught.
 */
export async function getBiometricAvailability() {
  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return {
      hasHardware: !!hasHardware,
      isEnrolled: !!isEnrolled,
      available: !!hasHardware && !!isEnrolled,
    };
  } catch (e) {
    logWarn('biometricLock.availability', e?.message);
    // Fail closed for AVAILABILITY only (never present the toggle as
    // usable when we can't confirm it). This never touches the stored
    // pref, so an existing enabled lock is unaffected by a transient
    // hardware-query failure.
    return { hasHardware: false, isEnrolled: false, available: false };
  }
}

/** Reads the stored pref. See file header: a read failure fails OPEN. */
export async function getLockEnabled() {
  try {
    const v = await SecureStore.getItemAsync(PREF_KEY);
    return v === 'true';
  } catch (e) {
    logWarn('biometricLock.getPref', e?.message);
    return false;
  }
}

/**
 * Persists the pref and notifies any mounted useAppLockGate(). Returns
 * whether the write succeeded so the Settings screen can show a calm error
 * instead of a toggle that silently didn't take.
 */
export async function setLockEnabled(enabled) {
  try {
    await SecureStore.setItemAsync(PREF_KEY, enabled ? 'true' : 'false');
    notify(!!enabled);
    return true;
  } catch (e) {
    logError('biometricLock.setPref', e, { enabled: !!enabled });
    return false;
  }
}

/** Subscribes to pref changes fired by setLockEnabled. Returns an unsubscribe fn. */
export function subscribeLockEnabled(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Runs the OS biometric prompt with the device passcode/PIN/pattern
 * fallback always available (disableDeviceFallback: false), so a missing or
 * repeatedly-failed biometric read is never a dead end. Returns
 * { success, error }.
 */
export async function authenticate() {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Volyume',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return { success: !!result?.success, error: result?.success ? null : (result?.error ?? 'unknown') };
  } catch (e) {
    logWarn('biometricLock.authenticate', e?.message);
    return { success: false, error: e?.message || 'unknown' };
  }
}

/**
 * App-entry lock gate hook. See file header + RootNavigator.js's
 * LockedMainTabs for where this is wired.
 *
 * Behaviour:
 *  - `checked` flips true once the pref has been read (RootNavigator holds
 *    a brief resolver, exactly like its existing firstRunChecked/
 *    tierChecked gates, so MainTabs never flashes unlocked content before
 *    a lock pref of true is known).
 *  - Locks on cold launch when the pref is on (locked starts true).
 *  - Locks again every time the app transitions TO 'background'. Checking
 *    only 'background' (not 'inactive') matters: iOS reports 'inactive' for
 *    transient system UI -- including the biometric prompt's OWN system
 *    sheet -- and only 'background' for a genuine backgrounding; Android has
 *    no 'inactive' state at all. So a brief permission dialog or the auth
 *    prompt itself can never re-trigger the lock, only a real backgrounding
 *    does.
 *  - Auto-attempts authenticate() once, exactly when the app is in the
 *    foreground AND locked (covers both cold launch and a genuine
 *    foreground return). A failed attempt leaves the screen locked with
 *    retryAuth exposed for a manual "Try again" -- it deliberately does not
 *    auto-loop the OS prompt (repeated automatic biometric prompts can trip
 *    a platform lockout, and a calm retry button is the safer, calmer UX).
 */
export function useAppLockGate() {
  const [checked, setChecked] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [lastFailed, setLastFailed] = useState(false);
  const [inBackground, setInBackground] = useState(AppState.currentState === 'background');
  const authenticatingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    getLockEnabled().then((v) => {
      if (!mounted) return;
      setEnabled(v);
      setLocked(v);
      setChecked(true);
    });
    const unsub = subscribeLockEnabled((v) => {
      setEnabled(v);
      // Turning the pref off (from Settings, while already inside MainTabs)
      // clears any pending lock immediately -- there is nothing left to
      // protect once the user has explicitly switched it off. Turning it on
      // does NOT retroactively lock the CURRENT foreground session (the
      // user is already present and just proved it by using Settings); it
      // takes effect from the next background/foreground cycle or launch,
      // same as the calm, no-surprise behaviour a toggle should have.
      if (!v) setLocked(false);
    });
    return () => { mounted = false; unsub(); };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        setInBackground(true);
        setLocked((wasLocked) => wasLocked || enabled);
        setLastFailed(false);
      } else if (next === 'active') {
        setInBackground(false);
      }
      // 'inactive' (iOS-only, transient -- incl. the auth prompt's own
      // system sheet): deliberately ignored.
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const retryAuth = useCallback(async () => {
    if (authenticatingRef.current) return;
    authenticatingRef.current = true;
    setAuthenticating(true);
    setLastFailed(false);
    const result = await authenticate();
    authenticatingRef.current = false;
    setAuthenticating(false);
    if (result.success) {
      setLocked(false);
      setLastFailed(false);
    } else {
      setLastFailed(true);
    }
  }, []);

  // Auto-attempt exactly once per lock event, and only while the app is
  // genuinely in the foreground (never while backgrounded -- the OS prompt
  // cannot show, and attempting it there is a wasted/erroring call).
  useEffect(() => {
    if (checked && enabled && locked && !inBackground && !authenticating && !authenticatingRef.current) {
      retryAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, enabled, locked, inBackground]);

  return { checked, enabled, locked, authenticating, lastFailed, retryAuth };
}
