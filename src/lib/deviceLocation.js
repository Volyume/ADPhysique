/**
 * deviceLocation.js (community product audit 2026-09-07,
 * `docs/community-product-audit-2026-09-07/30-IMPLEMENTATION.md` section
 * 1.2; `20-JUDGEMENT.md` section 7, LJ-01: "Current or live location:
 * Never stored... discarded").
 *
 * STUB. No location API of any kind is wired in yet, and `expo-location`
 * is NOT in package.json (CLAUDE.md: never add a dependency without
 * asking). Nothing else in the client may reference a location API
 * directly: `GymPicker` only ever calls the two functions this module
 * exports, and reacts to `isAvailable()` to decide whether to offer
 * "Use my location" at all. The gym directory guard
 * (`src/__tests__/community.privacy.guard.test.js`, GD-13 section) walks
 * `src/lib/gyms` for exactly the API names this stub would introduce once
 * armed, so this file is the ONE place that boundary can ever move.
 *
 * TO ARM (once the founder approves the location-permission dependency):
 * change exactly these two things, nothing else.
 *   1. `isAvailable()` returns `true` instead of `false` (guarded on the
 *      approved API actually being present, e.g. a module existence
 *      check), once the dependency is added.
 *   2. `getApproximatePosition()` resolves `{ lat, lng }` from that API's
 *      one-shot, approximate-accuracy read, instead of rejecting.
 * `GymPicker` already calls both functions and only branches on their
 * result, so no caller needs to change.
 */

/**
 * True once a location API is wired and the app is allowed to offer
 * "Use my location". Always false in this build.
 *
 * @returns {boolean}
 */
export function isAvailable() {
  return false;
}

/**
 * A one-off, approximate device position for a single "Use my location"
 * tap. The coordinate this would resolve is never persisted anywhere
 * (LJ-01, GD-13): the caller holds it in component state for that
 * session only, and it is never written to storage, the profile, or the
 * server as anything other than a momentary search argument.
 *
 * @returns {Promise<{lat: number, lng: number}>}
 * @rejects {Error & {code: 'unavailable'}} always, until armed.
 */
export function getApproximatePosition() {
  return Promise.reject(Object.assign(new Error('unavailable'), { code: 'unavailable' }));
}
