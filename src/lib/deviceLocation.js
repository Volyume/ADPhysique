/**
 * deviceLocation.js (community product audit 2026-09-07,
 * `docs/community-product-audit-2026-09-07/30-IMPLEMENTATION.md` section
 * 1.2; `20-JUDGEMENT.md` section 7, LJ-01: "Current or live location:
 * Never stored... discarded").
 *
 * ARMED (founder decision 2026-09-07, "yes to both", relayed in chat).
 * `expo-location` is added for exactly one use: "Use my location" in the
 * gym finder, an explicit tap, foreground-only, approximate accuracy, the
 * coordinate handed to a single gym search and then discarded. This is
 * the ONLY file under `src/` allowed to name the dependency or a
 * position API (`src/__tests__/community.privacy.guard.test.js`,
 * "the device location adapter is the only door" section, enforces
 * this); every caller (`GymPicker`) only ever calls the two functions
 * below and branches on their result or `.code`. This file may request a
 * foreground permission and read ONE current position; it may never
 * watch, subscribe, background, read a cached last-known position, or
 * write anything to any local storage - the same guard's
 * `LOCATION_ADAPTER_FORBIDDEN` list pins that half.
 *
 * `require('expo-location')` is lazy and wrapped in try/catch rather
 * than a static import, so a build where the native module failed to
 * link (rather than one where the founder has simply not approved it -
 * that stub state is `git`-history now) degrades to `isAvailable()`
 * false instead of crashing the whole picker.
 */

const TIMEOUT_MS = 15000;

/** Lazy, defensive load of the dependency - see the header. */
function loadLocation() {
  try {
    // eslint-disable-next-line global-require
    return require('expo-location');
  } catch (_e) {
    return null;
  }
}

/**
 * True once the location dependency is actually present. Checked live
 * (never cached) so a caller always reflects the real module state.
 *
 * @returns {boolean}
 */
export function isAvailable() {
  return !!loadLocation();
}

/**
 * A one-off, approximate device position for a single "Use my location"
 * tap: requests the FOREGROUND permission only, then one low-accuracy
 * fix. The coordinate this resolves is never persisted anywhere (LJ-01,
 * GD-13): the caller holds it in component state for that session only,
 * and it is never written to storage, the profile, or the server as
 * anything other than a momentary search argument.
 *
 * @returns {Promise<{lat: number, lng: number}>}
 * @rejects {Error & {code: ('denied'|'unavailable'|'timeout')}}
 */
export async function getApproximatePosition() {
  const Location = loadLocation();
  if (!Location) {
    throw Object.assign(new Error('unavailable'), { code: 'unavailable' });
  }
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission?.status !== 'granted') {
      throw Object.assign(new Error('denied'), { code: 'denied' });
    }
    // The timer is cleared whichever side settles first: an uncleared
    // timeout would reject a promise nobody is listening to fifteen
    // seconds after every successful read.
    let timer = null;
    const timeout = new Promise((_resolve, reject) => {
      timer = setTimeout(
        () => reject(Object.assign(new Error('timeout'), { code: 'timeout' })),
        TIMEOUT_MS,
      );
    });
    const read = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
      .then((pos) => ({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
    try {
      return await Promise.race([read, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch (e) {
    if (e?.code === 'denied' || e?.code === 'timeout') throw e;
    throw Object.assign(new Error('unavailable'), { code: 'unavailable' });
  }
}
