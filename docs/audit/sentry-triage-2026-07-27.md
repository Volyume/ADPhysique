# Sentry triage — 2026-07-27

Founder order: "you have access to my Sentry, please browse and fix any issues
reported in the last two weeks" and "Remember you need to properly look at
Sentry too and fix everything there not alreaady fixed".

Scope: every unresolved issue in org `volyume`, project `volyume`, last 14 days.
13 unresolved issues found. Release under observation: `app.volyume@1.2.0+45`
(TestFlight, iOS 26.5.1, iPhone18,2).

---

## 1. THE HEADLINE FINDING — nine issues, one root cause

Nine of the thirteen issues are not nine bugs. They are one failure chain,
and it is a REAL data bug, not log noise: **while the phone is locked, the
app loses its Supabase session and every cloud write is rejected by
row-level security.** User data silently fails to reach the cloud.

### The chain, verified end to end

1. `getSupabaseClient()` sets `autoRefreshToken: true` (src/lib/supabase.js:57)
   and nothing ever stops that timer. Verified: `grep -rn
   "startAutoRefresh\|stopAutoRefresh" src/ App.js` returns nothing. The
   refresh timer therefore keeps ticking after the app is backgrounded.
2. Each tick reads the session through `secureAuthStorage.getItem`
   (src/lib/supabase.js:17). On a locked device the iOS Keychain refuses the
   read and throws "User interaction is not allowed."
3. That catch returns `null` (src/lib/supabase.js:23). supabase-js cannot tell
   "keychain locked" from "no session stored", so it proceeds with **no user
   JWT**.
4. Requests now go out with the anon key only, so `auth.uid()` is NULL in
   Postgres.
5. Every policy on the affected tables is `(auth.uid() = user_id)` — confirmed
   against production for `planned_muscle_volume`, `user_prefs` and
   `adaptation_events`. A NULL uid fails the `WITH CHECK`, and Postgres
   returns **42501, "new row violates row-level security policy"**.
6. The food RPC has the same dependency and raises P0001
   `food_sync_pull: not authenticated`.
7. Every one of these logs through `logError`/`logWarn`, which forward to
   Sentry with no deduplication or rate limiting (src/lib/errorLog.js:194 and
   src/lib/errorLog.js:205). One locked phone therefore produced 1,589 events.

### The issues this chain accounts for

| Issue | Events | Surface |
|---|---|---|
| VOLYUME-2E | 1,589 | `supabase.secureStore.getItem` + `dbCrypto.getKey` keychain read refused |
| VOLYUME-2F | 153 | RLS 42501 on planned_muscle_volume, user_prefs, adaptation_events, user_body_profile, mesocycles, morning_weights, mesocycle_weeks, routine_exercises, user_insights |
| VOLYUME-2D | 187 | the same rejections seen from the transport side (`db.upsert.failed ... 42501`) |
| VOLYUME-2H | 59 | `food_sync_pull: not authenticated` (P0001) plus network failures on the same runs |
| VOLYUME-2C | 70 | `sync.push.legacy.errors` aggregate of the above |
| VOLYUME-2J | 29 | `sync.push.nutrition_targets` / `meal_plans` aggregate of the above |
| VOLYUME-28 | 11 | `sync._pushRoutines` partial push, same cause |
| VOLYUME-2G | 8 | `SQLCipher key unavailable and existing DB is not plaintext-readable` — the same locked Keychain, hit via dbCrypto rather than the session |
| VOLYUME-2P | 1 | single background-sync straggler on the same chain |

### Why the existing AFTER_FIRST_UNLOCK change did not fix it

`KEY_OPTS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }` is already
in the shipped build (src/lib/supabase.js:15), yet events continue on build 45.
Two reasons, both real:

- iOS keychain items keep the accessibility they were **written** with. An item
  first written under the old default (`WHEN_UNLOCKED`) stays `WHEN_UNLOCKED`
  until it is rewritten. Existing users were never migrated.
- Even with correct accessibility, doing session work in the background at all
  is the wrong shape. `AFTER_FIRST_UNLOCK` helps only after the first unlock
  since boot; it is not a licence to run the refresh timer while suspended.

### Fixes

- **F1 (root).** Stop the Supabase refresh timer when the app is not in the
  foreground and restart it on resume, per the documented Supabase React Native
  pattern. No background tick means no locked-Keychain read, which means no
  null session, which means no 42501.
- **F2 (data integrity).** Guard `syncAll` on a genuinely live session. If the
  access token is missing, skip the run and leave the queue intact rather than
  firing writes that RLS will reject. Work stays queued and syncs on resume
  instead of being lost.
- **F3 (migration).** On the first successful session read, rewrite the item so
  legacy `WHEN_UNLOCKED` entries are upgraded to `AFTER_FIRST_UNLOCK`.
- **F4 (signal).** Deduplicate and rate-limit what reaches Sentry, and stop
  classifying an expected locked-Keychain read as an error. Sentry must show
  real defects, not one phone's lock screen 1,589 times.

F1 and F2 are the fixes that stop user data being dropped. F3 and F4 stop the
noise that hid the problem for thirteen days.

---

## 2. VOLYUME-2B — Apple sign-in, 82 events, ZERO users affected

`LoginScreen.oauth.providerError`, "The authorization attempt failed for an
unknown reason". Already diagnosed and fixed in code: under Fabric the native
Apple button can fire `onPress` twice, so a second `ASAuthorization` request is
rejected while the first succeeds. The single-flight guard `_appleSignInInFlight`
(src/lib/supabase.js:271-291) returns `{ duplicate: true }` for the second call.

"Users: 0" alongside 82 events is the signature of a logged non-event: nobody
failed to sign in. No further code change. Resolve in Sentry.

## 3. VOLYUME-2M / VOLYUME-2K — store billing probes, 4 and 2 events

`payments.appStore.fetchProducts` "Unknown St13runtime_error error." and
`payments.playBilling.fetchProducts` "Failed to initialize connection". Both are
catalogue probes failing when the store connection is not ready — an offline
launch, a sandbox account, or a cold Play Services start. Both already run
inside a catch and degrade to the cached catalogue; entitlement is unaffected.

Billing is founder-gated (CLAUDE.md Section 2), so **no billing code is touched
here**. These are logged at the correct level and simply do not warrant an
error-grade Sentry issue at this volume. Covered by the F4 rate limiter.

## 4. VOLYUME-2N — already fixed

`TypeError: Cannot read property 'filter' of undefined`, 1 event. This is the
Finish-workout crash traced earlier this campaign and fixed by the
`withSetsArrays` data-boundary invariant in src/store/useAppStore.js. Verify the
fix is in the next build, then resolve.

---

## 5. What is NOT being changed

- The coaching engine: untouched. Nothing here is engine-adjacent.
- ED-safety: untouched. No floor, gate, threshold or suppression is involved.
- Billing: untouched, per the founder gate.
- RLS policies: **not** loosened. The policies are correct; the session was
  missing. Weakening `(auth.uid() = user_id)` to work around a client bug would
  be a security regression and is explicitly rejected.

---

# RE-TRIAGE 2026-08-01 — build 48 still failing; complete path enumeration

Founder: "be extremely thorough and make sure all sentry issues are 100% fixed
I don't want guesses and having to build as they cost me money every time."

The first fix failed in the field (presence-vs-validity + a bypassable guard,
corrected in 6840c654). This section is the exhaustive enumeration that should
have been done first: EVERY code path that can produce an authenticated cloud
call, verified by reading each, with its guard state.

## Complete entry-point inventory (verified by grep + reading each site)

GUARDED after 6840c654:
- syncAll (runner.js) - all lifecycle/write/sign-in triggers route here;
  RootNavigator, useAppStore, database._scheduleSync, BodyMetricsScreen,
  Article9ConsentScreen, SettingsDataScreen all call syncAll.
- syncTable (runner.js:383) - delegates to syncAll, so inherits its guard.
- bulkUploadLocalData / pullFromCloud (sync.js) - self-guarded at the top;
  covers the direct callers ImportScreen, HomeScreen restore, ProUpgradeScreen.
- sync.push.legacy.errors (runner.js:239) is emitted INSIDE syncAll - it fired
  on build 48 because the expired-token-passes-presence-check bug let the run
  proceed, not because the path was unguarded. Closed by the validity fix.

STILL UNGUARDED (the gap this re-triage closes):
- syncWorkout (sync.js:278) - push-on-save after every workout save; can fire
  from a background notification action with an expired token.
- syncMorningWeight (sync.js:542) - push-on-save after every weigh-in.
- syncUserPref (sync.js:1263), syncExercises (sync.js:220),
  syncNutritionTargets (sync.js:1903) - push-on-save; all three are ALSO
  covered wholesale by the next good syncAll, so on a dead session they can
  simply defer with no queue entry and no data loss.
- deleteWorkoutFromCloud (sync.js) - returns false on failure and the caller
  enqueues 'workout_delete'; on a dead session it should return false without
  firing the doomed request.
- drainSyncQueue (syncQueue.js:72) - the retry driver itself; draining with a
  dead session burns every op's retry budget against guaranteed 42501s.

Guard semantics for the pushers: preserve the existing contract exactly.
Direct-call mode defers to the queue (workout, morning weight) or defers to the
next syncAll (prefs, exercises, targets) at logInfo. rethrow/queue-drain mode
throws so the queue owns retry accounting (F-003) - belt-and-braces, since the
guarded drain never runs the op on a dead session.

## Residual noise paths (same three-day window, smaller counts)

- VOLYUME-2E residue on build 48: supabase.js only classified GETITEM
  keychain-locked reads as expected; setItem/removeItem still logError on a
  locked device. Classify all three.
- VOLYUME-2G (SQLCipher key unavailable): dbCrypto.readStoredKey logs every
  locked-device read failure as an error, and openEncryptedDb logs
  dbCrypto.keyUnavailable as an error even when the cause is a device that has
  not been unlocked since boot (AFTER_FIRST_UNLOCK is unreadable before first
  unlock; a background wake in that state is expected). Classify locked as
  logInfo and KEEP the throw and the F-001 behaviour byte-identical: the
  locked/lost distinction changes LOGGING ONLY, never whether a key is minted
  or a DB opened.
- VOLYUME-2B (Apple sign-in "unknown reason"): LoginScreen.js:68 logs every
  provider error as logError BEFORE branching on apple_device_state at :77.
  ERR_REQUEST_UNKNOWN is a known device state (iCloud not signed in) with its
  own remedy UI; log that branch as info, keep real failures as errors.

## What CANNOT be fixed from here (stated so it is not mistaken for a guess)

- Events tagged dist 30 and dist 45 (VOLYUME-2K's 4 events, VOLYUME-2E's 6)
  come from OLD BINARIES still installed on devices. No code change in this
  repo reaches them until those devices update. They will trail off.
- Sentry statuses cannot be updated this session (connector disconnected);
  status housekeeping is cosmetic and waits for reconnection.
