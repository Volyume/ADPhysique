/**
 * In-memory "a recovery link just signed this person in" marker.
 *
 * authDeepLink sets it after a verified recovery link installs a session.
 * RootNavigator takes it once the person is through the Article 9 gate and
 * onboarding (it never routes around them) and opens the set-new-password
 * screen. Memory only: it does not outlive the app process, which is right,
 * since a recovery link is a same-sitting action.
 */
let pending = false;
const listeners = new Set();

export function markPasswordRecoveryPending() {
  pending = true;
  listeners.forEach((fn) => { try { fn(); } catch (_) { /* listener failure is not ours */ } });
}

export function isPasswordRecoveryPending() {
  return pending;
}

export function takePasswordRecoveryPending() {
  const was = pending;
  pending = false;
  return was;
}

export function subscribePasswordRecovery(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function _resetPasswordRecoveryForTests() {
  pending = false;
  listeners.clear();
}
