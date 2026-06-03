/**
 * SYNC-3: sign-out wipe / sync race guard.
 *
 * Sign-out pushes local data (the push-first safety), then wipes local
 * SQLite. The four lifecycle sync triggers (foreground / background /
 * network reconnect / 15-min periodic in App.js) stay live and the Supabase
 * session is still valid throughout the wipe, so a trigger firing in that
 * window could acquire the runner lock and pull cloud rows straight back
 * into the DB being wiped, leaving zombie/partial data.
 *
 * clearAuthStateForSignOut sets this flag AFTER its own push-first syncAll
 * has completed and the guard has passed (so the safety push itself is never
 * blocked), then wipes. syncAll bails while it's set. It is cleared on the
 * next sign-in (setUser with a real user) and naturally resets on the app
 * reload that normally follows sign-out.
 */
let _wiping = false;

export function setSignOutWiping(v) {
  _wiping = !!v;
}

export function isSignOutWiping() {
  return _wiping;
}
