/**
 * authBootGate — the boot-time auth presentation decision (Campaign 24
 * Wave E, WAVE-E-FINDINGS.md item 0: the startup auth-hydration flash).
 *
 * PRODUCT LAW (founder order, Campaign 24, verbatim): "UNTIL AUTH +
 * MINIMUM ROUTING STATE ARE RESOLVED, SHOW A NEUTRAL VOLYUME
 * LOADING/SPLASH STATE. Do not speculatively render logged-out/tier UI."
 *
 * THE DEFECT THIS CLOSES: RootNavigator's 8-second auth latch failsafe
 * used to force `initialAuthResolved = true` REGARDLESS of whether
 * `getSession()` had actually answered, so on a cached-but-expired token
 * plus a slow network the splash released straight into WelcomeStack
 * while a real session was still resolving — a signed-in user flashed
 * the logged-out UI.
 *
 * THE CONTRACT. Pure function of four booleans, returns exactly one of:
 *  - 'splash'      — auth not yet resolved (genuinely or otherwise):
 *                    stay on the neutral splash.
 *  - 'auth_retry'  — auth GAVE UP (latch timed out / bootstrap failed
 *                    without an answer), no user in state, and this
 *                    device has a recorded prior sign-in
 *                    (@volyume_last_supabase_user_id): a real athlete
 *                    almost certainly owns this install, so render the
 *                    bounded retry state (dbInitFailed pattern), never
 *                    a speculative Welcome. The retry screen carries an
 *                    explicit "Go to sign in" action so a genuinely
 *                    signed-out user is never stranded — an explicit
 *                    user choice is not speculative rendering.
 *  - 'navigate'    — safe to run the normal navigator: either auth
 *                    genuinely resolved (user present or definitively
 *                    absent), or it gave up on a device with NO prior
 *                    sign-in marker (a fresh install landing on Welcome
 *                    is that device's correct, honest state).
 *
 * Consent-gate note: this decision governs only the PRE-AUTH frame.
 * The Article 9 health-consent gate runs inside the post-auth routing
 * ('navigate') and is untouched by every branch here — no output of
 * this function can skip or reorder it, and 'auth_retry'/'splash'
 * render strictly less than the navigator does.
 *
 * @param {object} args
 * @param {boolean} args.initialAuthResolved - the one-shot boot latch.
 * @param {boolean} args.authGaveUp - true only when the latch was
 *   released by the timeout/failure path, not by a genuine getSession
 *   answer.
 * @param {boolean} args.hasUser - a user object is in the store.
 * @param {boolean} args.hadPriorSession - the
 *   `@volyume_last_supabase_user_id` marker was present at boot (read
 *   fail-quiet to false: a missing/failed read renders Welcome exactly
 *   as before this fix, never a retry wall on a fresh install).
 * @returns {'splash'|'auth_retry'|'navigate'}
 */
export function classifyAuthBoot({
  initialAuthResolved = false,
  authGaveUp = false,
  hasUser = false,
  hadPriorSession = false,
} = {}) {
  if (!initialAuthResolved) return 'splash';
  if (authGaveUp && !hasUser && hadPriorSession) return 'auth_retry';
  return 'navigate';
}

/**
 * D149 (founder, 2026-09-05: "no splash screen, straight into the Welcome
 * screen"). The fresh-install decision. A device that holds NO owner
 * marker (`@volyume_last_supabase_user_id`) AND NO stored auth session
 * (the supabase-js keychain item) has no session to restore, so Welcome
 * is its honest state and RootNavigator may open on it at the first
 * frame, before the database open and first-run migrations, instead of
 * holding the launch frame for them. This refines, not contradicts, the
 * Campaign 24 law above: that law protects devices that MIGHT be signed
 * in, and this branch applies only to a device that cannot be.
 *
 * Pure function of two probe results, each 'present' | 'absent' |
 * 'unknown' (a failed or not-yet-completed read is 'unknown'):
 *  - 'not_fresh' — either probe found something. Hold the frame exactly
 *                  as before; the session restore decides.
 *  - 'fresh'     — BOTH probes answered 'absent'. Open on Welcome now.
 *  - 'unknown'   — anything else. Fail closed: hold the frame.
 *
 * @param {object} args
 * @param {'present'|'absent'|'unknown'} args.ownerMarker
 * @param {'present'|'absent'|'unknown'} args.storedSession
 * @returns {'fresh'|'not_fresh'|'unknown'}
 */
export function classifyFreshInstall({
  ownerMarker = 'unknown',
  storedSession = 'unknown',
} = {}) {
  if (ownerMarker === 'present' || storedSession === 'present') return 'not_fresh';
  if (ownerMarker === 'absent' && storedSession === 'absent') return 'fresh';
  return 'unknown';
}

export default classifyAuthBoot;
