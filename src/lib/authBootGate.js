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

export default classifyAuthBoot;
