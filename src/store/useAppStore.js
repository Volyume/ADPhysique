import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { A11Y_PREFS_KEY, loadA11yPrefs } from '../lib/accessibilityPrefs';
import { PRIVACY_PREFS_KEY, loadPrivacyPrefs } from '../lib/privacyPrefs';

// Auto-instrumentation lives in observability.js. Wrapping the store
// once at module evaluation means every action call gets a
// breadcrumb + duration without any per-action change at the call
// sites. See src/lib/observability.js for the wrapping logic.
// eslint-disable-next-line global-require
const _observability = (() => { try { return require('../lib/observability'); } catch (_) { return null; } })();

const FIRST_RUN_KEY    = '@volyume_first_run_complete';
const FIRST_RUN_KEY_PFX = '@volyume_first_run_complete_'; // per-uid: + supabase user.id
const PROFILE_KEY_PFX  = '@volyume_user_profile_';
const PROFILE_TIMESTAMPS_KEY_PFX = '@volyume_user_profile_ts_';
const TIER_KEY         = '@volyume_tier';
// Cached trial state + end so checkTier can enforce trial expiry locally at
// launch (trial-subscription audit C-3/H1). Without this the cached tier='pro'
// was trusted offline / before the cloud read with no comparison to the trial
// end, so a just-expired trial user kept Pro until the next successful cloud
// read. Only the trial path is enforced locally; paid_pro lapses are
// server/RTDN-driven.
const TRIAL_STATE_KEY   = '@volyume_trial_state';
const PRO_TRIAL_ENDS_KEY = '@volyume_pro_trial_ends_at';
// SUB-002: when the paid 'pro' entitlement was last confirmed against an
// authoritative source (a Play entitlement read, the purchase itself, or a
// server tier refresh). cascade.reconcilePaidEntitlement reads this to enforce
// an offline grace window: a paid_pro device that cannot reconfirm its
// entitlement for longer than the grace period locks itself down locally until
// it can verify again online. Defence in depth alongside the Play RTDN.
const PAID_VERIFIED_AT_KEY = '@volyume_paid_verified_at';
// Crash/kill recovery for an in-progress workout. The store holds the
// session (activeWorkout + workoutExercises, which carries the logged sets)
// in memory only; on app kill it was lost and the workouts row stayed
// is_completed=0 forever, invisible to every history query. We snapshot the
// slice here on each mutation and rehydrate it on launch (WK-1).
const ACTIVE_WORKOUT_KEY = '@volyume_active_workout';

// Workout preferences (Hevy teardown 2026-06-29, R1): the global default rest
// timer and whether the rest timer auto-starts when a set is logged. Both are
// device-local prefs (like accessibility), persisted to AsyncStorage and
// hydrated via loadWorkoutPrefs on first mount of the screens that read them
// (BuildWorkout, ActiveWorkout, Settings). They replace the hardcoded 90s
// default and the unconditional auto-start. Defaults preserve prior behaviour:
// 90s, auto-start on.
const WORKOUT_PREFS_KEY = '@volyume_workout_prefs';

// users_profile columns that are user-editable + tracked for the
// per-column merge conflict strategy (migration 045 +
// src/lib/sync/tables/profiles.js). camelCase here to match the
// store; the transport handler maps to snake_case on push.
const PROFILE_FIELDS_TRACKED = [
  'firstName',
  'units',
  'trainingFocus',
  'trainingAgeYears',
  'primaryEquipment',
  'barWeight',
  'bodyWeightUnits',
  'dietPreference',
  // U2/E12 step 1: sex syncs via the registry profiles handler now that the
  // legacy syncProfile (its old carrier) is retired.
  'sex',
];

// Persist the per-field profile write timestamps to AsyncStorage.
// Survives app restarts so a user that edits a field and
// kills the app before the next sync still ships the per-field
// timestamp on the next push. Used by setUserProfile + the per-
// field setters above.
async function _persistProfileTimestamps(userId, map) {
  if (!userId || !map) return;
  try {
    await AsyncStorage.setItem(
      PROFILE_TIMESTAMPS_KEY_PFX + userId,
      JSON.stringify(map),
    );
  } catch (_) {
    /* offline-friendly: tolerate */
  }
}

// Snapshot (or clear) the in-progress workout for crash/kill recovery (WK-1).
// Fire-and-forget: called synchronously after each workout mutation. When
// there's no active workout it clears the key so a finished/cancelled session
// can't be resurrected. Tagged with the user id so restore only rehydrates
// for the same account.
function _persistActiveWorkout(state) {
  try {
    if (!state?.activeWorkout) {
      AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY).catch(() => {});
      return;
    }
    const snapshot = {
      userId: state.user?.id ?? null,
      workout: state.activeWorkout,
      workoutExercises: state.workoutExercises,
      currentExerciseIndex: state.currentExerciseIndex,
      workoutStartTime: state.workoutStartTime,
      // COMP-015: persist the computed session adjustments so a crash-recovery
      // restore rehydrates them WITHOUT recomputing — which would otherwise
      // re-log duplicate adaptation_events.
      sessionAdjustments: state.sessionAdjustments,
      // COMP-020: persist the applied watch event ids so replay after a crash /
      // background-relaunch stays idempotent (never double-logs a set).
      appliedRemoteEventIds: Array.isArray(state.appliedRemoteEventIds)
        ? state.appliedRemoteEventIds.slice(-500) : [],
      // A2: persist the rest anchor so a process kill mid-rest restores a
      // truthful countdown (or a clean expired state) instead of no timer.
      restTimerEndsAt: state.restTimerActive ? state.restTimerEndsAt : null,
      restTimerDuration: state.restTimerDuration ?? null,
      savedAt: Date.now(),
    };
    AsyncStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(snapshot)).catch(() => {});
  } catch (_) {
    /* offline-friendly: tolerate */
  }
}

// Hydrate the per-field timestamp map at sign-in. Called by
// initLocalUser / sign-in code so the map is in memory before the
// first profiles push runs. Missing key → empty map (legacy
// install treats every field as "server wins" until next write).
async function _hydrateProfileTimestamps(userId) {
  if (!userId) return {};
  try {
    const raw = await AsyncStorage.getItem(PROFILE_TIMESTAMPS_KEY_PFX + userId);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (_) {
    return {};
  }
}

// Fire-and-forget push of a single AsyncStorage pref to the cloud.
// Called from store setters whenever a synced preference changes so
// the cloud copy stays current without waiting for the next sign-in
// catch-up. Lazy-requires sync to avoid the circular import, sync.js
// imports from this file. No-op when there's no cloud session, when
// the pref's key is on the device-only exclude list, or when the
// sync module errors out (offline, transient network failure, the
// queue will catch up on the next foreground).
function pushPrefSoon(supabaseUid, key, value) {
  if (!supabaseUid || !key) return;
  setTimeout(() => {
    try {
      // eslint-disable-next-line global-require
      const { syncUserPref } = require('../lib/sync');
      syncUserPref(supabaseUid, key, value).catch(() => {});
    } catch (_) { /* sync module not loadable yet (e.g. very early boot) */ }
  }, 0);
}

// Re-exported from lib/uuid so the store keeps its generateUUID surface
// (the identity anti-patterns test calls it via the store) while the one
// implementation lives in lib/uuid (A2-036).
export { generateUUID } from '../lib/uuid';

const useAppStore = create((set, get) => ({
  // Auth
  user: null,
  session: null,
  userProfile: null,
  // Kept for backwards compat with crash-recovery code paths that still
  // null-guard on it. Splash gate no longer reads this, splash only fires
  // during initial bootstrap (splashReady / firstRunChecked / tierChecked).
  isAuthLoading: false,

  // Article 9 health-data consent state (locked in PRIVACY_CONSENT_LOCKED.md
  // + ONBOARDING_SEQUENCE_LOCKED.md screen 3). Three states:
  //   null       not yet checked (boot in progress)
  //   true       user has granted consent; app proceeds normally
  //   false      no consent yet; RootNavigator routes to Article9ConsentScreen
  // The check fires once per sign-in; result cached in AsyncStorage under
  // `@volyume_health_consent_${userId}`. Local users (no real account)
  // skip the gate entirely.
  healthConsentChecked: false,
  healthConsentGranted: () => set({ healthConsent: true, healthConsentChecked: true }),
  healthConsent: null,
  setHealthConsent: (value, checked = true) => set({ healthConsent: value, healthConsentChecked: checked }),

  // True once the Pro onboarding wizard has created (or signed into) the
  // cloud account in this session. Lives in the store, not the screen's
  // local state, so it survives the wizard stack being unmounted by the
  // Article 9 consent gate. ProOnboarding reads it to resume past Step 1
  // (Create your account) instead of stranding the user there. Reset on
  // sign-out and once first-run completes.
  proOnboardingAccountCreated: false,
  setProOnboardingAccountCreated: (v) => set({ proOnboardingAccountCreated: !!v }),

  setUser: (user) => {
    // A real sign-in lifts the SYNC-3 sign-out wipe guard (covers the
    // dev/Expo-Go path where sign-out doesn't reload the app). Sign-out
    // clears user via set({user:null}) directly, not setUser, so the guard
    // stays up through the wipe.
    if (user) {
      try {
        // eslint-disable-next-line global-require
        require('../lib/sync/signOutGuard').setSignOutWiping(false);
      } catch (_) { /* tolerate */ }
    }
    set({ user });
  },
  setSession: (session) => set({ session }),
  setUserProfile: (userProfile) => {
    // Stamp every editable field in the incoming profile with
    // "now" so the per-field map matches the bulk write. Per-
    // field setters (setUnits, setBarWeight, etc.) stamp only
    // their own field via _stampProfileFields below.
    const now = Date.now();
    const stamped = {};
    if (userProfile && typeof userProfile === 'object') {
      for (const k of PROFILE_FIELDS_TRACKED) {
        if (k in userProfile) stamped[k] = now;
      }
    }
    set((s) => ({
      userProfile,
      userProfileFieldUpdatedAt: { ...(s.userProfileFieldUpdatedAt || {}), ...stamped },
    }));
  },

  // Per-column write timestamps used by the profiles transport
  // handler to build column_updates_at for the merge conflict
  // resolver. Keyed by users_profile snake_case column name.
  // Persisted alongside userProfile via PROFILE_TIMESTAMPS_KEY_PFX
  // so app restarts don't lose the per-field write history.
  // Migration 045 ships the corresponding cloud column.
  userProfileFieldUpdatedAt: {},
  _stampProfileFields: (touchedFields) => {
    const now = Date.now();
    const stamped = {};
    for (const f of touchedFields) {
      if (PROFILE_FIELDS_TRACKED.includes(f)) stamped[f] = now;
    }
    if (Object.keys(stamped).length === 0) return;
    set((s) => ({
      userProfileFieldUpdatedAt: { ...(s.userProfileFieldUpdatedAt || {}), ...stamped },
    }));
  },
  setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),

  // initLocalUser deleted per IDENTITY_AND_OWNERSHIP_LOCKED.md
  // rule 1 ("No anonymous mode") + anti-patterns ("Anonymous local
  // mode of any kind"). Every user must sign up to a real account
  // via WelcomeScreen → LoginScreen; the bootstrap path in
  // RootNavigator no longer auto-restores a local-only user.

  // Persists userProfile to AsyncStorage so it survives app restarts for local
  // users AND pushes the change to Supabase if there's an authenticated
  // session, so profile edits (name, units, training fields) survive a
  // device swap.
  saveLocalProfile: async (userId, profile) => {
    try {
      await AsyncStorage.setItem(PROFILE_KEY_PFX + userId, JSON.stringify(profile));
    } catch (_) {}
    set({ userProfile: profile });
    // Mirror to cloud if signed in. Fire-and-forget through the registry
    // runner (E12 step 1: the legacy per-save syncProfile dual writer is
    // retired; pushProfiles reads the store state set above). The runner's
    // Article 9 gate can skip this for a not-yet-consented user; the
    // consent grant kicks a fresh sync that carries the profile then.
    // Lazy import to avoid a circular dep (sync.js → database.js → … → store).
    try {
      const sess = get().session;
      if (sess?.user?.id) {
        // eslint-disable-next-line global-require
        const { syncAll } = require('../lib/sync');
        syncAll({ userId: sess.user.id, localUserId: userId, triggeredBy: 'write' }).catch(() => {});
      }
    } catch (_) {}
  },

  // Sign-out. Per IDENTITY_AND_OWNERSHIP_LOCKED.md the locked design is
  // "sign-out wipes local SQLite": every sign-in is a fresh cloud pull,
  // so two users on the same device can never see each other's data
  // because local SQLite is empty by the time anyone signs in.
  //
  // Push-first safety: we attempt a final cloud sync before wiping. If
  // the push fails (offline, sync errors), we abort the wipe and keep
  // the user signed in. Otherwise an offline sign-out would silently
  // destroy any unsynced local edits. The caller surfaces a Toast
  // explaining what happened.
  //
  // Returns:
  //   { ok: true }                    sign-out succeeded, local wiped
  //   { ok: false, reason: 'unsynced' }    push failed, sign-out aborted
  //   { ok: false, reason: 'wipe_failed' } local wipe failed, sign-out aborted
  clearAuthStateForSignOut: async ({ force = false } = {}) => {
    // eslint-disable-next-line global-require
    const log = require('../lib/errorLog');
    const prevUid = get().user?.id ?? null;
    try { log.logInfo('clearAuthStateForSignOut', 'start', { prevTier: get().tier, prevUid }); } catch (_) {}

    // Funnel telemetry: sign_out at the top of the flow, before the
    // wipe runs. The local row lands in engine_telemetry; the
    // flushPendingTelemetry call below (bundled with bulkUpload)
    // pushes it before wipeAllUserData clears the local copy.
    if (prevUid) {
      try {
        // eslint-disable-next-line global-require
        const { track } = require('../lib/engineTelemetry');
        await track(prevUid, 'sign_out', { prevTier: get().tier }).catch(() => {});
      } catch (_) {}
    }

    // Cancel the debounced sync timer so it doesn't fire mid-wipe.
    try {
      // eslint-disable-next-line global-require
      require('../lib/sync').cancelScheduledSync();
    } catch (_) { /* tolerate */ }

    // Push-first safety: try to push everything before wiping. If we
    // can't reach cloud (offline) or the push fails, abort the
    // sign-out so the user doesn't lose unsynced edits. Caller shows
    // a "couldn't sign out, try again on a stronger connection" toast.
    if (prevUid && !get().user?.isLocal) {
      try {
        // Push EVERYTHING before wiping, food included. The legacy
        // bulkUploadLocalData skips the food domain and the other
        // migrated tables (they ride the registry/transport path), so
        // routing the push-first safety through syncAll is what stops a
        // sign-out from wiping unsynced meals. syncAll runs the push
        // track (food_* + legacy) then a pull; the pull is redundant
        // right before a wipe but harmless.
        // eslint-disable-next-line global-require
        const { syncAll } = require('../lib/sync');
        // eslint-disable-next-line global-require
        const { flushPendingTelemetry } = require('../lib/engineTelemetry');
        // Bound the push-first sync. Without this, a stalled network request
        // makes syncAll never resolve, so clearAuthStateForSignOut never
        // returns and the UI sticks on "Signing out..." forever (observed
        // 2026-06-06). On timeout we throw; the catch below turns that into an
        // abort (normal: user gets the "Sign out anyway" prompt) or lets a
        // forced sign-out proceed to the wipe.
        const SIGN_OUT_SYNC_TIMEOUT_MS = 20_000;
        let _signOutSyncTimer;
        let res;
        try {
          res = await Promise.race([
            syncAll({ userId: prevUid, localUserId: prevUid, triggeredBy: 'sign_out' }),
            new Promise((_, reject) => {
              _signOutSyncTimer = setTimeout(
                () => reject(new Error('signout-sync-timeout')), SIGN_OUT_SYNC_TIMEOUT_MS);
            }),
          ]);
        } finally {
          clearTimeout(_signOutSyncTimer);
        }
        // Abort the wipe only when we can't prove the push reached cloud:
        //   'error'           - a migrated table push threw/failed
        //   'skipped'         - another sync held the lock, OURS didn't run
        //   errored_count > 0 - any push failure surfaced by the runner,
        //                       including the legacy bulk push (SYNC-1). This
        //                       is the real "local data didn't reach cloud"
        //                       signal: the sign-out syncAll re-pushes every
        //                       table from SQLite, so a genuine failure shows
        //                       here.
        // We deliberately do NOT block on 'pending'. Since E12 step 0 the
        // depth behind 'pending' is the live retry queue (pending_sync_ops,
        // src/lib/syncQueue.js): per-entity retries queued by earlier failed
        // saves. The data those ops carry is covered by this same cycle's
        // FULL push (bulkUploadLocalData re-pushes every table from SQLite),
        // so a leftover retry op does not mean unsynced data — a genuine
        // failure surfaces through errored_count above. Blocking on depth
        // historically locked users out of sign-out entirely (re-audit
        // finding, when the dead registry sync_queue inflated it). Caller
        // shows a "couldn't sign out, try again on a stronger connection"
        // toast.
        // AUTH-5: unless the caller forced it (the "sign out anyway" escape
        // hatch), abort when we can't prove the push reached cloud, so the user
        // doesn't silently lose unsynced edits. force=true means the user was
        // shown the risk and chose to proceed.
        if (!force && (res?.status === 'error' || res?.status === 'skipped' || (res?.errored_count ?? 0) > 0)) {
          log.logWarn('clearAuthStateForSignOut.pushFirstFailed',
            'sign-out aborted: push did not complete cleanly, keeping user signed in',
            { prevUid, status: res?.status, erroredCount: res?.errored_count ?? null });
          return { ok: false, reason: 'unsynced' };
        }
        try { await flushPendingTelemetry(); } catch (_) {}
      } catch (e) {
        if (!force) {
          log.logWarn('clearAuthStateForSignOut.pushFirstFailed',
            'sign-out aborted: cloud push failed, keeping user signed in',
            { prevUid, error: e?.message });
          return { ok: false, reason: 'unsynced' };
        }
        log.logWarn('clearAuthStateForSignOut.forcedDespitePushError',
          'forced sign-out proceeding despite push error', { prevUid, error: e?.message });
      }
    }

    // SYNC-3: we're now committed to wiping (the push-first guard passed, or the
    // user forced it). Raise the wipe guard so a lifecycle sync trigger can't
    // acquire the run-lock and pull cloud rows back into the DB we're about to
    // wipe, then drain any in-flight run so its writes land BEFORE the wipe.
    // Bounded so a stuck run can't hang sign-out. Runs for both the normal and
    // forced paths (and harmlessly for local users, who don't sync). Cleared on
    // the next sign-in (setUser) / post-sign-out reload.
    if (prevUid && !get().user?.isLocal) {
      try {
        // eslint-disable-next-line global-require
        require('../lib/sync/signOutGuard').setSignOutWiping(true);
      } catch (_) { /* tolerate */ }
      try {
        // eslint-disable-next-line global-require
        await require('../lib/sync/runner').whenSyncIdle({ timeoutMs: 5000 });
      } catch (_) { /* tolerate */ }
    }

    // Remove THIS device's push-token row so the server stops pushing
    // to it after sign-out. Runs before AsyncStorage.clear() because it
    // reads the cached token from there. Best-effort: a failure here
    // must not block sign-out (a stale row is pruned server-side when
    // Expo reports DeviceNotRegistered on the next send).
    if (prevUid) {
      try {
        // eslint-disable-next-line global-require
        const { unregisterPushToken } = require('../lib/notifications');
        await unregisterPushToken(prevUid);
      } catch (_) { /* tolerate */ }
    }

    // Wipe local SQLite rows owned by this user. Cloud copy is intact
    // (we just pushed). On next sign-in to the same account, data
    // restores via pullFromCloud. On sign-in to a different account,
    // local is already empty so nothing to leak.
    if (prevUid) {
      try {
        // eslint-disable-next-line global-require
        const { wipeAllUserData } = require('../lib/database');
        await wipeAllUserData(prevUid);
        log.logInfo('clearAuthStateForSignOut.wipe.ok', `local SQLite wiped for ${prevUid}`);
      } catch (e) {
        log.logError('clearAuthStateForSignOut.wipe.failed', e, { prevUid });
        try {
          // eslint-disable-next-line global-require
          require('../lib/sync/signOutGuard').setSignOutWiping(false);
        } catch (_) { /* tolerate */ }
        return { ok: false, reason: 'wipe_failed' };
      }
    }

    // Sign-out wipes everything from the device for this user.
    // Per founder direction: signing out should leave nothing
    // behind. Same hammer as delete-account. AsyncStorage.clear()
    // is scoped to this app only.
    try {
      await AsyncStorage.clear();
      log.logInfo('clearAuthStateForSignOut.asyncStorage.clear', 'ok');
    } catch (e) {
      log.logError('clearAuthStateForSignOut.asyncStorage.clear.failed', e, { prevUid });
    }

    // SecureStore tokens too. supabase-js signOut() should have done
    // this, but if the cloud call failed the tokens persist and a
    // restoreSession revives the session under the same uid. Same
    // best-effort pattern as delete-account.
    try {
      // eslint-disable-next-line global-require
      const SecureStore = require('expo-secure-store');
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
      const projectRef = url.replace(/^https?:\/\//, '').split('.')[0];
      if (projectRef) {
        await SecureStore.deleteItemAsync(`sb-${projectRef}-auth-token`).catch(() => {});
      }
      await SecureStore.deleteItemAsync('supabase.auth.token').catch(() => {});
    } catch (e) {
      log.logWarn('clearAuthStateForSignOut.secureStore.failed', e?.message ?? 'unknown', { prevUid });
    }

    set({
      user: null,
      session: null,
      userProfile: null,
      tier: null,
      tierChecked: true,
      firstRunComplete: false,
      firstRunChecked: true,
      // Consent state resets so the next sign-in re-checks. Cached
      // AsyncStorage value persists per-user so a same-account
      // sign-in won't trigger the gate again unnecessarily.
      healthConsent: null,
      healthConsentChecked: false,
      proOnboardingAccountCreated: false,
      activeWorkout: null,
      workoutExercises: [],
      currentExerciseIndex: 0,
      restTimerActive: false,
      prCelebration: null,
      prCelebrationQueue: [],
    });
    // A2 (hostile review): signing out mid-rest must retire the scheduled
    // end-of-rest alert too, or "Rest done" sounds on a signed-out device.
    try {
      // eslint-disable-next-line global-require
      require('../lib/notifications/restEnd').cancelRestEndNotification();
    } catch (_) {}
    return { ok: true };
  },

  // Tier, 'free' | 'pro' | null (null = not yet chosen → show WelcomeScreen)
  tier: null,
  tierChecked: false,
  // Billing period of the active paid plan, 'monthly' | 'annual' | null.
  // Display-only (Subscription screen); set by refreshTierFromCloud from
  // the Play webhook's billing_period column. Null shows the monthly price.
  billingPeriod: null,

  // C-1 (2026-06-06): a just-completed purchase unlocks Pro optimistically in
  // the app while the Google Play RTDN writes the authoritative tier
  // server-side. Until this timestamp, refreshTierFromCloud won't downgrade a
  // pro user back to free (the RTDN write can lag the on-device purchase by a
  // few seconds). After it lapses, normal server reconciliation resumes, so a
  // purchase that never reached the server (e.g. a spoofed local call) reverts
  // to free. The real grant is always the server's, never the client's.
  _optimisticPaidUntil: 0,
  setOptimisticPaid: async () => {
    const until = Date.now() + 5 * 60 * 1000; // 5 minutes
    set({ tier: 'pro', _optimisticPaidUntil: until });
    try { await AsyncStorage.setItem(TIER_KEY, 'pro'); } catch (_) { /* tolerate */ }
    // Optimistically cache paid_pro so checkTier's local trial-expiry guard
    // (C-3) does not downgrade a user who just paid right at trial end before
    // the next refreshTierFromCloud writes the authoritative trial_state. A
    // purchase that never actually granted is corrected on the next cloud read.
    try { await AsyncStorage.setItem(TRIAL_STATE_KEY, 'paid_pro'); } catch (_) { /* tolerate */ }
    // SUB-002: the purchase is a fresh entitlement confirmation, so it seeds the
    // last-verified clock. Without a seed the offline-grace window has no anchor
    // and could never trigger.
    try { await AsyncStorage.setItem(PAID_VERIFIED_AT_KEY, String(Date.now())); } catch (_) { /* tolerate */ }
  },

  // SUB-002 helpers for cascade.reconcilePaidEntitlement. The store owns the
  // entitlement cache (the AsyncStorage keys), cascade owns the policy.
  markPaidEntitlementVerified: async () => {
    try { await AsyncStorage.setItem(PAID_VERIFIED_AT_KEY, String(Date.now())); } catch (_) { /* tolerate */ }
  },
  readPaidEntitlementVerifiedAt: async () => {
    try {
      const raw = await AsyncStorage.getItem(PAID_VERIFIED_AT_KEY);
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : null;
    } catch (_) { return null; }
  },
  // Local-only lockdown: drop the device to free without a server write. We do
  // NOT call upgrade_tier here because we could not confirm the entitlement, so
  // we do not actually know it lapsed. The server (via the Play RTDN) remains
  // the source of truth: the next online launch's refreshTierFromCloud restores
  // Pro if the subscription is in fact still active, or confirms free if it
  // lapsed. This only stops a device retaining Pro indefinitely while offline /
  // unverifiable past the grace window.
  lockStalePaidEntitlement: async () => {
    set({ _optimisticPaidUntil: 0 });
    try { await AsyncStorage.setItem(TIER_KEY, 'free'); } catch (_) { /* tolerate */ }
    await get().setTier('free', 'cascade.lockStalePaidEntitlement');
  },

  // Cloud sync status surface. Set from RootNavigator when a fresh
  // SIGNED_IN triggers pullFromCloud. Screens subscribe to
  // cloudSyncVersion so they re-fetch from SQLite once data finishes
  // landing (otherwise a fresh device sees the empty state for the
  // whole sync window). cloudSyncStatus drives a "restoring" banner.
  cloudSyncStatus: 'idle',
  cloudSyncVersion: 0,
  cloudSyncError: null,
  markCloudSyncing: () => set({ cloudSyncStatus: 'syncing', cloudSyncError: null }),
  markCloudSyncComplete: () => set(s => ({
    cloudSyncStatus: 'complete',
    cloudSyncVersion: s.cloudSyncVersion + 1,
    cloudSyncError: null,
  })),
  markCloudSyncError: (msg) => set(s => ({
    cloudSyncStatus: 'error',
    cloudSyncVersion: s.cloudSyncVersion + 1,
    cloudSyncError: msg ?? 'Unknown error',
  })),
  dismissCloudSyncStatus: () => set({ cloudSyncStatus: 'idle', cloudSyncError: null }),

  // T2 (world-class-audit-2026-07-03/05-cohesion.md #4): whether there is an
  // unseen weekly coach review, for the You-tab icon badge (VolyumeTabBar).
  // Mirrors the exact condition HomeScreen already uses for its own banner
  // (tier pro, a fresh hasEnoughData output, not yet dismissed, inside its
  // 7-day window), set by HomeScreen and cleared by CoachOutputScreen once the
  // review is actually viewed. Both read/write the SAME per-week AsyncStorage
  // flag the Home banner's own dismiss control already used
  // (@volyume_coach_banner_dismissed_<weekStart>) -- no second persistence
  // scheme. Defaults false so a cold launch never flashes a badge before
  // HomeScreen's effect has run.
  hasUnseenCoachChange: false,
  setHasUnseenCoachChange: (value) => set({ hasUnseenCoachChange: !!value }),

  // True while restoreSessionFromCloud is in flight. The navigator
  // gates routing decisions on this so the wizard doesn't briefly
  // mount during the ~8s cloud read for returning users (the
  // wizard-flash bug). Defaults to false so cold-launch isn't gated
  // on it, the gate only matters during an active auth transition.
  // restoringSession + restoreSplashStage removed, the new
  // restoreSessionFromCloud uses optimistic routing and a background
  // cloud sync, so no UI gate is needed. Existing screens with empty
  // states (HomeScreen "no active plan", Plans tab) fill in as
  // pullFromCloud writes to local SQLite. Same pattern as Linear /
  // Notion / Slack.

  checkTier: async () => {
    try {
      let tier = (await AsyncStorage.getItem(TIER_KEY)) || null;
      // C-3/H1: enforce trial expiry locally so a just-expired trial user is
      // not left on a cached 'pro' offline or in the launch window before
      // refreshTierFromCloud lands. Only the in-app trial is enforced here;
      // paid_pro lapses are server/RTDN-driven (the device can't know a paid
      // sub lapsed without the server). The legacy "first-run done ⇒ pro"
      // grant was removed (audit M-3): it could grant Pro on a cleared tier
      // cache, and the cloud read is the real source of truth.
      if (tier === 'pro') {
        const ts = await AsyncStorage.getItem(TRIAL_STATE_KEY);
        const endsRaw = await AsyncStorage.getItem(PRO_TRIAL_ENDS_KEY);
        const endMs = endsRaw ? Date.parse(endsRaw) : NaN;
        if (ts === 'pro_trial_active' && Number.isFinite(endMs) && Date.now() > endMs) {
          tier = 'free';
          try { await AsyncStorage.setItem(TIER_KEY, 'free'); } catch (_) { /* tolerate */ }
        }
      }
      set({ tier, tierChecked: true });
    } catch (_e) {
      set({ tier: null, tierChecked: true });
    }
  },

  // Optional `callerScope` arg (string like 'ProUpgradeScreen.activatePro')
  // is logged with each transition. Hermes mangles async stack frames so
  // the auto-captured stack is useless in production; an explicit tag is
  // the only reliable way to know who triggered a tier change. Falls back
  // to the auto-captured stack for un-tagged callers (early returns
  // when off-thread for now).
  setTier: async (tier, callerScope) => {
    const prev = get().tier;
    if (prev !== tier) {
      try {
        let trace = callerScope;
        if (!trace) {
          trace = (new Error('setTier-trace').stack || '')
            .split('\n')
            .slice(2, 6)
            .join(' | ');
        }
        // Diagnostic trail only. Every tier transition is expected lifecycle
        // (new-account cascade grant, cascade advance, paywall downgrade) and
        // is already captured for analysis by the tier_changed engine event
        // below, so a warning-level Sentry event per transition was pure noise
        // and quota burn (audit S-010, Sentry VOLYUME-12). logInfo attaches a
        // breadcrumb — visible in the run-up to any later error, no standalone
        // event — while keeping the caller trace for "who changed the tier".
        // eslint-disable-next-line global-require
        require('../lib/errorLog').logInfo('useAppStore.setTier', `tier ${prev} → ${tier}`, { prev, next: tier, caller: trace });
        // Engine telemetry (Move #3). Tier transition is one of the
        // six events that feed the cohort dashboard. A downgrade at
        // a paywall is also tracked separately as churn_at_gate, so
        // analysis can distinguish "downgraded after trial" from
        // "free-to-pro upgrade".
        const userId = get().user?.id;
        if (userId) {
          // eslint-disable-next-line global-require
          require('../lib/engineTelemetry').track(userId, 'tier_changed', {
            prev, next: tier, caller: callerScope ?? 'untagged',
          }).catch(() => {});
        }
      } catch (_) {}
    }
    // Persist BEFORE setting in-memory state so a crash between the two
    // doesn't leave AsyncStorage out of sync with the store. If the
    // AsyncStorage write fails, log it but still update the store
    // the user-visible state matters most; next reload will reconcile.
    try {
      await AsyncStorage.setItem(TIER_KEY, tier);
    } catch (e) {
      require('../lib/errorLog').logError('useAppStore.setTier.persist', e, { tier });
    }
    set({ tier });
  },

  // Optimistic-UI sign-in: route INSTANTLY based on local cues, then
  // sync from the cloud in the background. No splash, no blocking
  // cloud reads on the routing path. Same pattern as Linear / Notion /
  // Slack, the app shell appears immediately, data streams in to fill
  // empty states as it arrives.
  //
  // Three cues, in priority order:
  //   1. Per-uid local cache (FIRST_RUN_KEY_PFX + uid). If set, use it
  //      this device has seen this user before.
  //   2. session.user.created_at age. If > 60s, this auth.users row is
  //      old enough that the user definitely isn't brand new in this
  //      session, assume returning, route to MainTabs.
  //   3. Default: < 60s old, must be a fresh signup, route to wizard.
  //
  // Cloud read fires AFTER the routing decision, asynchronously. It
  // populates the per-uid cache for future sign-ins, refreshes the
  // userProfile if it was empty, and the cross-device data sync
  // (pullFromCloud) runs alongside it from RootNavigator.
  restoreSessionFromCloud: async (supabaseUserId, sessionUser = null) => {
    if (!supabaseUserId) return;
    // eslint-disable-next-line global-require
    const log = require('../lib/errorLog');
    log.logInfo('restoreSessionFromCloud.start', `uid=${supabaseUserId}`, { uid: supabaseUserId });

    // AUTH-2 (I5): this runs async with cloud reads up to 10s. On a fast
    // sign-out -> sign-in-as-B, a late-resolving restore for user A must NOT
    // write A's firstRun/profile/tier over user B. Bail if a DIFFERENT user is
    // now signed in (a null user.id means sign-in hasn't set it yet — proceed).
    const staleUid = () => {
      const cur = get().user?.id;
      return !!cur && cur !== supabaseUserId;
    };
    if (staleUid()) return;

    // Beta tier policy, every cloud-authenticated user is Pro during beta.
    // eslint-disable-next-line global-require
    const { PRO_BETA_ACTIVE } = require('../lib/proGate');
    if (PRO_BETA_ACTIVE) {
      try { await AsyncStorage.setItem(TIER_KEY, 'pro'); } catch (_) {}
      set({ tier: 'pro', tierChecked: true });
    }

    // ── Step 1: instant routing decision based on local cues ─────────
    // Cue A: per-uid cache (best, exact answer from prior session)
    // Cue B: created_at age heuristic (good, used when cache is missing)
    // True only when the optimistic "returning, route to MainTabs" decision
    // came from the created_at heuristic (Cue B), not a per-uid cache hit
    // (Cue A). A heuristic guess is the only thing the cloud read is allowed
    // to flip back to the wizard (A2-021). A cache hit means this device has
    // genuinely seen the user finish onboarding, so flipping it would be the
    // wizard-flash bug.
    let optimisticReturningFromHeuristic = false;
    let cachedComplete = null;
    try {
      cachedComplete = await AsyncStorage.getItem(FIRST_RUN_KEY_PFX + supabaseUserId);
    } catch (_) {}
    // AUTH-2: a different user could have signed in during the read above.
    if (staleUid()) return;

    if (cachedComplete === 'true' || cachedComplete === 'false') {
      const isComplete = cachedComplete === 'true';
      set({ firstRunComplete: isComplete, firstRunChecked: true });
      try { await AsyncStorage.setItem(FIRST_RUN_KEY, cachedComplete); } catch (_) {}
      log.logInfo('restoreSessionFromCloud.cacheHit', `firstRunComplete=${cachedComplete}`);
    } else if (sessionUser?.created_at) {
      const ageMs = Date.now() - new Date(sessionUser.created_at).getTime();
      if (Number.isFinite(ageMs) && ageMs >= 60_000) {
        // Old auth row, returning user. Optimistically route to MainTabs.
        // This is a guess: a new user who confirmed their email slowly (or
        // who signs in first on a second device) also has an old auth row
        // and no per-uid cache, so the cloud read below may need to flip
        // this back to the wizard (A2-021).
        set({ firstRunComplete: true, firstRunChecked: true });
        try { await AsyncStorage.setItem(FIRST_RUN_KEY, 'true'); } catch (_) {}
        log.logInfo('restoreSessionFromCloud.optimisticReturning', `ageMs=${ageMs}`);
        optimisticReturningFromHeuristic = true;
      } else {
        // Fresh auth row, new signup. Route to wizard.
        set({ firstRunComplete: false, firstRunChecked: true });
        try { await AsyncStorage.setItem(FIRST_RUN_KEY, 'false'); } catch (_) {}
        log.logInfo('restoreSessionFromCloud.freshSignup', `ageMs=${ageMs}`);
      }
    }

    // ── Step 2: cloud read (background from the UI's perspective) ───
    // The routing decision was made synchronously above, so any state
    // mutation in this step is purely background hydration, populates
    // the per-uid cache for next time, fills userProfile if empty, and
    // (rarely) corrects the optimistic firstRunComplete if cloud
    // disagrees with it. UI is already responsive; this awaits but
    // doesn't gate routing.
    //
    // The function's returned promise resolves when ALL of this is
    // done (useful for tests + cold-launch bootstrap which want
    // assured cloud sync). Callers in the sign-in path (RootNavigator
    // onAuthStateChange) intentionally don't await, they kicked off
    // the function and let it finish on its own.
    let cloudData = null;
    try {
      // eslint-disable-next-line global-require
      const { getSupabaseClient } = require('../lib/supabase');
      const sb = getSupabaseClient();
      if (!sb) return;
      const READ_TIMEOUT_MS = 10_000;
      // U2 (migrate_094): read `sex` from the profile row too, but tolerate the
      // column being absent on a not-yet-migrated project. A missing column
      // comes back as a PostgREST { error } (not a throw), and this critical
      // path treats a null row as "no profile" → re-routes to onboarding, so a
      // naive add would strand every user until the migration lands. Try WITH
      // sex; on ANY read error fall back to the exact prior sex-less select so
      // restore/routing is never coupled to the migration.
      const BASE_COLS = 'first_name, training_focus, training_age, primary_equipment, units, bar_weight, tier, trial_state, pro_trial_ends_at, first_run_complete';
      const runRead = (cols) => sb.from('users_profile').select(cols).eq('id', supabaseUserId).maybeSingle();
      let readTimeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        readTimeoutId = setTimeout(() => reject(new Error('cloud-read-timeout')), READ_TIMEOUT_MS);
      });
      try {
        const { data, error } = await Promise.race([runRead(`${BASE_COLS}, sex`), timeoutPromise]);
        if (error) {
          // Column missing / any read error: retry the proven sex-less select.
          const retry = await runRead(BASE_COLS);
          cloudData = retry.data;
        } else {
          cloudData = data;
        }
      } finally {
        // Clear the loser timer so a fast read doesn't leave a 10s timer armed.
        clearTimeout(readTimeoutId);
      }
    } catch (e) {
      if (e?.message === 'cloud-read-timeout') {
        log.logWarn('restoreSessionFromCloud.timeout', 'cloud read exceeded 10s', { uid: supabaseUserId });
      }
      return; // optimistic decision sticks
    }

    // AUTH-2: a different user may have signed in during the cloud read above.
    if (staleUid()) return;

    if (!cloudData) {
      // Read succeeded (a throw/timeout returned at the catch above) but no
      // profile row exists, so this user has never finished onboarding. If we
      // optimistically routed them to MainTabs purely on the created_at
      // heuristic, correct that to the wizard now (A2-021 cross-device case).
      // A cache-hit decision is never touched here.
      if (optimisticReturningFromHeuristic && get().firstRunComplete) {
        set({ firstRunComplete: false, firstRunChecked: true });
        try { await AsyncStorage.setItem(FIRST_RUN_KEY, 'false'); } catch (_) {}
        try { await AsyncStorage.setItem(FIRST_RUN_KEY_PFX + supabaseUserId, 'false'); } catch (_) {}
        log.logInfo('restoreSessionFromCloud.heuristicCorrectedToWizard', 'no cloud profile');
      } else {
        log.logInfo('restoreSessionFromCloud.noProfile', 'cloud profile missing, optimistic decision stands');
      }
      return;
    }

    // Populate per-uid cache for next sign-in's fast path.
    try {
      await AsyncStorage.setItem(
        FIRST_RUN_KEY_PFX + supabaseUserId,
        cloudData.first_run_complete ? 'true' : 'false',
      );
    } catch (_) {}

    // Hydrate userProfile if we don't already have one locally.
    if (!get().userProfile) {
      const profile = {
        firstName: cloudData.first_name ?? null,
        trainingFocus: cloudData.training_focus ?? 'bodybuilding',
        trainingAgeYears: cloudData.training_age ?? null,
        primaryEquipment: cloudData.primary_equipment ?? null,
        units: 'kg', // kg-only; ignore any legacy lbs value from the cloud
        barWeight: cloudData.bar_weight ?? 20,
        // Trial cascade fields. The Subscription / ProUpgrade / CoachOutput
        // screens resolve a user's paid/trial stage off userProfile via
        // lib/payments/cascade, so these must ride along with the profile or
        // every signed-in user reads back as 'free' / unstarted.
        trialState: cloudData.trial_state ?? null,
        proTrialEndsAt: cloudData.pro_trial_ends_at ?? null,
        // U2: restore biological sex from the profile row (present only after
        // migrate_094). Redundant with the user_body_profile pull, so sex
        // survives even if that row is missing. Only accept the enforced values.
        ...(cloudData.sex === 'male' || cloudData.sex === 'female' ? { sex: cloudData.sex } : {}),
      };
      try { await AsyncStorage.setItem(PROFILE_KEY_PFX + supabaseUserId, JSON.stringify(profile)); } catch (_) {}
      const hydratedTimestamps = await _hydrateProfileTimestamps(supabaseUserId);
      // AUTH-2: don't write user A's profile if user B signed in during the
      // awaits above.
      if (staleUid()) return;
      set({
        userProfile: profile,
        units: profile.units,
        barWeight: profile.barWeight,
        userProfileFieldUpdatedAt: hydratedTimestamps,
      });
    }

    // Reconcile optimistic decision with cloud truth. Only correct if
    // cloud explicitly says first_run_complete=true and we hadn't
    // already set it (e.g. no sessionUser was passed in step 1 so
    // the optimistic path didn't fire). We do NOT flip back to false
    // if cloud disagrees with an optimistic true, that would be the
    // wizard-flash bug. An old account that was never finished is an
    // edge case; they can complete from Settings → Update your plan.
    if (cloudData.first_run_complete && !get().firstRunComplete) {
      try { await AsyncStorage.setItem(FIRST_RUN_KEY, 'true'); } catch (_) {}
      set({ firstRunComplete: true, firstRunChecked: true });
      log.logInfo('restoreSessionFromCloud.firstRunRestored', 'true (from cloud)');
    } else if (!cloudData.first_run_complete && optimisticReturningFromHeuristic && get().firstRunComplete) {
      // The cloud profile exists and explicitly says onboarding is NOT done,
      // but we optimistically routed to MainTabs on the created_at heuristic.
      // Correct to the wizard (A2-021). The per-uid cache was already written
      // 'false' above, so this only needs the in-memory + global flag. Guarded
      // on the heuristic source so a cache-hit decision is never flipped.
      try { await AsyncStorage.setItem(FIRST_RUN_KEY, 'false'); } catch (_) {}
      set({ firstRunComplete: false, firstRunChecked: true });
      log.logInfo('restoreSessionFromCloud.heuristicCorrectedToWizard', 'cloud first_run_complete=false');
    }
  },

  // Called after cloud sign-in: reads tier from Supabase and uses it as the
  // authoritative value. During beta this is a no-op (Supabase tier = 'pro').
  // After beta, this becomes the enforcement point, server wins.
  //
  // Wrapped in a 5s timeout so a stalled Supabase doesn't leave the
  // navigator splash gate spinning forever, the bootstrap path reads
  // tierChecked / firstRunChecked and only proceeds once both are set.
  refreshTierFromCloud: async (supabaseClient, supabaseUserId) => {
    if (!supabaseClient || !supabaseUserId) return;
    try {
      const queryPromise = supabaseClient
        .from('users_profile')
        .select('tier, billing_period, trial_state, pro_trial_ends_at')
        .eq('id', supabaseUserId)
        .maybeSingle();
      let tierTimeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        tierTimeoutId = setTimeout(() => reject(new Error('refreshTierFromCloud timeout')), 5000);
      });
      let data;
      try {
        ({ data } = await Promise.race([queryPromise, timeoutPromise]));
      } finally {
        // Clear the loser timer so a fast read doesn't leave a 5s timer armed.
        clearTimeout(tierTimeoutId);
      }
      if (data?.tier) {
        // Same beta tier policy as restoreSessionFromCloud, see comment
        // there. Any cloud-signed-in user is Pro during beta because the
        // cloud column is unusable as truth (DB default 'free', trigger
        // blocks writes, no webhook yet).
        // eslint-disable-next-line global-require
        const { PRO_BETA_ACTIVE } = require('../lib/proGate');
        let effectiveTier = PRO_BETA_ACTIVE ? 'pro' : data.tier;
        // C-1: don't clobber a just-purchased optimistic unlock while the Play
        // RTDN is still writing the server tier. Within the optimistic window we
        // never downgrade pro→free; once it lapses the server value governs.
        if (effectiveTier !== 'pro' && (get()._optimisticPaidUntil ?? 0) > Date.now()) {
          effectiveTier = 'pro';
        }
        // Persist BEFORE setting in-memory state so a crash between the
        // two doesn't leave AsyncStorage out of sync with the store.
        await AsyncStorage.setItem(TIER_KEY, effectiveTier);
        // Cache trial_state + end so checkTier can enforce trial expiry locally
        // at the next launch (C-3/H1). Server is the source of truth here.
        try {
          if (data.trial_state != null) await AsyncStorage.setItem(TRIAL_STATE_KEY, String(data.trial_state));
          else await AsyncStorage.removeItem(TRIAL_STATE_KEY);
          if (data.pro_trial_ends_at != null) await AsyncStorage.setItem(PRO_TRIAL_ENDS_KEY, String(data.pro_trial_ends_at));
          else await AsyncStorage.removeItem(PRO_TRIAL_ENDS_KEY);
          // SUB-002: a server read that reports paid_pro is an authoritative
          // entitlement confirmation, so it refreshes the last-verified clock.
          if (data.trial_state === 'paid_pro') {
            await AsyncStorage.setItem(PAID_VERIFIED_AT_KEY, String(Date.now()));
          }
        } catch (_) { /* tolerate */ }
        // billing_period (monthly/annual) is display-only for the
        // Subscription screen; null until the Play webhook records a
        // purchase, which the screen treats as monthly.
        //
        // trial_state / pro_trial_ends_at ride onto userProfile so the
        // Subscription / ProUpgrade / CoachOutput screens resolve the trial
        // cascade stage correctly. This is the always-runs path (it fires on
        // session-restore where the profile is already loaded from cache),
        // so it's the reliable place to keep the cascade fields fresh.
        set((s) => ({
          tier: effectiveTier,
          billingPeriod: data.billing_period ?? null,
          userProfile: s.userProfile
            ? {
                ...s.userProfile,
                trialState: data.trial_state ?? null,
                proTrialEndsAt: data.pro_trial_ends_at ?? null,
              }
            : s.userProfile,
        }));
      }
    } catch (e) {
      require('../lib/errorLog').logWarn(
        'useAppStore.refreshTierFromCloud',
        e?.message ?? 'cloud read failed',
        { uid: supabaseUserId },
      );
    }
  },

  // First-run / onboarding gate
  firstRunComplete: true,        // assume complete until checked (avoids flash)
  firstRunChecked: false,

  checkFirstRun: async () => {
    try {
      const done = await AsyncStorage.getItem(FIRST_RUN_KEY);
      set({ firstRunComplete: done === 'true', firstRunChecked: true });
    } catch (_e) {
      set({ firstRunComplete: true, firstRunChecked: true });
    }
  },

  // Force the navigator back into the first-run / onboarding stack so a
  // Free → Pro upgrade re-runs the Pro setup (profile → training → plan +
  // nutrition generation). Without this, an existing user who upgrades is
  // dumped back on the main app with no plan and no nutrition targets.
  //
  // Returns { ok: false, error: 'workout_in_progress' } if the user is
  // mid-workout, flipping firstRunComplete=false would unmount MainTabs
  // and lose the live set log. Caller surfaces this to the UI.
  resetFirstRun: async () => {
    if (get().activeWorkout) {
      require('../lib/errorLog').logWarn(
        'useAppStore.resetFirstRun',
        'refused, workout in progress',
        { workoutId: get().activeWorkout?.id }
      );
      return { ok: false, error: 'workout_in_progress' };
    }
    const uid = get().session?.user?.id;
    try {
      await AsyncStorage.setItem(FIRST_RUN_KEY, 'false');
      if (uid) await AsyncStorage.setItem(FIRST_RUN_KEY_PFX + uid, 'false');
    } catch (_e) {}
    set({ firstRunComplete: false, firstRunChecked: true });
    require('../lib/errorLog').logInfo('useAppStore.resetFirstRun', 'firstRunComplete → false');
    return { ok: true };
  },

  // A2-021: when a new account is created but the session isn't live yet
  // (email confirmation pending), seed the per-uid first-run flag to 'false'
  // now, using the uid from the signUp response. On the eventual sign-in,
  // Cue A in restoreSessionFromCloud reads this and routes straight to the
  // onboarding wizard, so a slow email confirmation can't let the created_at
  // heuristic mistake a brand-new user for a returning one (and there's no
  // MainTabs→wizard flash while the cloud read catches up).
  noteSignupPendingOnboarding: async (uid) => {
    if (!uid) return;
    try { await AsyncStorage.setItem(FIRST_RUN_KEY_PFX + uid, 'false'); } catch (_) {}
  },

  completeFirstRun: async () => {
    const uid = get().session?.user?.id;
    try {
      await AsyncStorage.setItem(FIRST_RUN_KEY, 'true');
      // Per-uid cache lets sign-out → sign-back-in on the same device
      // skip the cloud read entirely. Only this user's key, not global.
      if (uid) await AsyncStorage.setItem(FIRST_RUN_KEY_PFX + uid, 'true');
    } catch (_e) {}
    set({ firstRunComplete: true, proOnboardingAccountCreated: false });
    // Mirror to cloud so a user who signs in on a new device doesn't
    // have to redo onboarding. Fire-and-forget; if offline the next
    // bulk sync catches it.
    try {
      const sess = get().session;
      if (sess?.user?.id) {
        // eslint-disable-next-line global-require
        const { getSupabaseClient } = require('../lib/supabase');
        const sb = getSupabaseClient();
        if (sb) {
          sb.from('users_profile')
            .update({ first_run_complete: true, updated_at: new Date().toISOString() })
            .eq('id', sess.user.id)
            .then(() => {})
            .catch(() => {});
        }
      }
    } catch (_) {}
  },

  // COMP-030: the pre-account quiz answers. IN-MEMORY ONLY — never persisted to
  // AsyncStorage or SQLite, no device id, no network (the privacy property that
  // makes quiz-first defensible, §4B/§9). Survives the Article 9 consent-gate
  // remount because store memory outlives the unmounted screen; lost on a
  // process kill (accepted — re-entry restarts the short quiz). Carries per-step
  // timings so account_created can emit one consolidated onboarding_quiz_completed.
  onboardingQuiz: null,
  setQuizField: (key, value) => set((state) => ({
    onboardingQuiz: { ...(state.onboardingQuiz || {}), [key]: value },
  })),
  markQuizStep: (stepKey) => set((state) => {
    const q = state.onboardingQuiz || {};
    const timings = { ...(q._timings || {}), [stepKey]: Date.now() };
    return { onboardingQuiz: { ...q, _timings: timings } };
  }),
  resetOnboardingQuiz: () => set({ onboardingQuiz: null }),

  // Active workout
  activeWorkout: null,
  workoutExercises: [],
  currentExerciseIndex: 0,
  workoutStartTime: null,
  lastActivityAt: null,
  // COMP-020: ids of watch set-events already applied this session, so replay
  // (a reconnect, or a background-relaunch) is idempotent. Persisted on WK-1.
  appliedRemoteEventIds: [],
  // COMP-015: this session's per-exercise adjustments, computed once at session
  // start (Pro-only) and read by ActiveWorkoutScreen. Empty for free users,
  // non-meso sessions, or when nothing fired.
  sessionAdjustments: [],

  // COMP-015: set by HomeScreen after computeAndLogSessionAdjustments resolves.
  // Persisted into the active-workout snapshot so a crash restore does not
  // recompute (and re-log) the adjustments.
  setSessionAdjustments: (list) => {
    set({ sessionAdjustments: Array.isArray(list) ? list : [] });
    _persistActiveWorkout(get());
  },

  // COMP-015: the one-tap "Use planned sets instead". Marks the adjustment
  // reverted (so the set count + line fall back to the plan immediately) and
  // logs session_adjustment_reverted, which both feeds revert-memory (two
  // reverts per muscle per meso stops the engine adjusting it) and the
  // telemetry trust metric. Best-effort logging; the UI revert is instant.
  revertSessionAdjustment: (exerciseId) => {
    const list = get().sessionAdjustments || [];
    const target = list.find(a => a.exerciseId === exerciseId && !a.reverted);
    if (!target) return;
    set({ sessionAdjustments: list.map(a => (a.exerciseId === exerciseId ? { ...a, reverted: true } : a)) });
    _persistActiveWorkout(get());
    try {
      // eslint-disable-next-line global-require
      const { createAdaptationEvent } = require('../lib/database');
      createAdaptationEvent({
        mesocycleWeekId: get().activeWorkout?.mesocycleWeekId ?? null,
        muscle: target.muscle,
        exerciseId,
        decision: 'session_adjustment_reverted',
        delta: 0,
        reasonCode: 'session_adjustment_reverted',
        reasonText: 'You restored the planned sets.',
        signals: { revertedReasonCode: target.reasonCode, originalDelta: target.setDelta },
      }).catch(() => {});
    } catch (_) { /* best-effort */ }
    try {
      // eslint-disable-next-line global-require
      const { track } = require('../lib/engineTelemetry');
      track(get().user?.id, 'session_adjustment_reverted', {
        muscle: target.muscle,
        direction: target.setDelta < 0 ? 'drop' : 'add',
      })?.catch?.(() => {});
    } catch (_) {}
  },

  // B2 (Wave-3 review): "Use planned targets instead" applies to the WHOLE
  // session, so the dismissal lives on the active workout object and rides
  // the WK-1 snapshot — a screen remount or crash restore keeps it dismissed
  // instead of silently re-easing the targets mid-session.
  dismissReadinessTweak: () => {
    const w = get().activeWorkout;
    if (!w || w.readinessDismissed) return;
    set({ activeWorkout: { ...w, readinessDismissed: true } });
    _persistActiveWorkout(get());
  },

  setActiveWorkout: (workout) => set({ activeWorkout: workout }),
  setWorkoutExercises: (next) => {
    set((state) => ({
      workoutExercises:
        typeof next === 'function' ? next(state.workoutExercises) : next,
    }));
    _persistActiveWorkout(get());
  },
  setCurrentExerciseIndex: (i) => {
    set({ currentExerciseIndex: i });
    _persistActiveWorkout(get());
  },
  updateLastActivity: () => set({ lastActivityAt: Date.now() }),

  // Use the functional set() form so two near-simultaneous calls (rapid
  // double-tap on Add set / Add exercise) both land, the previous
  // get()+set() pair could read the same snapshot twice and drop one update.
  addExerciseToWorkout: (exercise, routineExercise = null) => {
    set((state) => ({
      workoutExercises: [
        ...state.workoutExercises,
        { exercise, routineExercise, sets: [] },
      ],
    }));
    _persistActiveWorkout(get());
  },

  // Subscribers (the inline volume charts, etc.) read this to know
  // when to re-fetch their aggregates. Bump it on every set logged so
  // visible charts can refresh live during a workout instead of waiting
  // for the next screen focus.
  lastSetLoggedAt: 0,

  addSetToCurrentExercise: (setData) => {
    set((state) => {
      const entry = state.workoutExercises[state.currentExerciseIndex];
      if (!entry) return { lastSetLoggedAt: Date.now() };
      const updated = state.workoutExercises.slice();
      updated[state.currentExerciseIndex] = {
        ...entry,
        sets: [...(entry.sets || []), setData],
      };
      return { workoutExercises: updated, lastSetLoggedAt: Date.now() };
    });
    _persistActiveWorkout(get());
  },

  // Edit an already-logged set in the current exercise in place (the screen
  // pairs this with database.updateWorkoutSet). Merges camelCase `fields` onto
  // the set with the matching id; bumps lastSetLoggedAt so live aggregates
  // refresh. No-op if the id isn't found.
  updateSetInCurrentExercise: (setId, fields) => {
    set((state) => {
      const entry = state.workoutExercises[state.currentExerciseIndex];
      if (!entry || !setId) return { lastSetLoggedAt: Date.now() };
      const updated = state.workoutExercises.slice();
      updated[state.currentExerciseIndex] = {
        ...entry,
        sets: (entry.sets || []).map((s) => (s.id === setId ? { ...s, ...fields } : s)),
      };
      return { workoutExercises: updated, lastSetLoggedAt: Date.now() };
    });
    _persistActiveWorkout(get());
  },

  // Remove a logged set from the current exercise (paired with
  // database.deleteWorkoutSet). Filters by id; bumps lastSetLoggedAt so the
  // session receipt + live aggregates recompute. No-op if the id isn't found.
  removeSetFromCurrentExercise: (setId) => {
    set((state) => {
      const entry = state.workoutExercises[state.currentExerciseIndex];
      if (!entry || !setId) return { lastSetLoggedAt: Date.now() };
      const updated = state.workoutExercises.slice();
      updated[state.currentExerciseIndex] = {
        ...entry,
        sets: (entry.sets || []).filter((s) => s.id !== setId),
      };
      return { workoutExercises: updated, lastSetLoggedAt: Date.now() };
    });
    _persistActiveWorkout(get());
  },

  // COMP-020: the headless, idempotent set-commit path the watch bridge calls.
  // Reuses the same primitives as the screen (createWorkoutSet +
  // addSetToCurrentExercise + startRestTimer) but does NOT run PR
  // detection/celebration (that fires only when the screen is mounted; a
  // watch-applied set queues its PR check for the summary instead — §4.3).
  // Idempotent by eventId so replay after a reconnect / background-relaunch
  // never double-logs. Returns { applied, reason? }.
  applyRemoteSetEvent: async (event) => {
    try {
      const { eventId, workoutId, type = 'logSet', payload = {} } = event || {};
      if (!eventId) return { applied: false, reason: 'no_event_id' };
      const state = get();
      if ((state.appliedRemoteEventIds || []).includes(eventId)) {
        return { applied: false, reason: 'duplicate' };
      }
      const aw = state.activeWorkout;
      if (!aw || (workoutId && aw.id !== workoutId)) {
        return { applied: false, reason: 'no_active_workout' };
      }
      if (type !== 'logSet') return { applied: false, reason: 'unsupported_type' };

      const exEntry = state.workoutExercises[state.currentExerciseIndex];
      if (!exEntry?.exercise?.id) return { applied: false, reason: 'no_exercise' };

      // eslint-disable-next-line global-require
      const { createWorkoutSet } = require('../lib/database');
      // eslint-disable-next-line global-require
      const { countProgressSets } = require('../lib/workoutHelpers');
      const re = exEntry.routineExercise;
      const setNumber = countProgressSets(exEntry.sets || []) + 1; // recomputed phone-side

      const savedSet = await createWorkoutSet({
        userId: state.user?.id,
        workoutId: aw.id,
        exerciseId: exEntry.exercise.id,
        setNumber,
        setType: payload.setType || 'straight',
        targetRepsMin: re?.recommendedRepsMin ?? null,
        targetRepsMax: re?.recommendedRepsMax ?? null,
        actualReps: Number.isFinite(payload.reps) ? payload.reps : (parseInt(payload.reps, 10) || 0),
        weight: Number.isFinite(payload.weight) ? payload.weight : (parseFloat(payload.weight) || 0),
        rir: payload.rir != null ? parseInt(payload.rir, 10) : null,
        rpe: null,
        failed: false,
        notes: null,
        isAmrap: payload.setType === 'amrap',
        leftReps: null,
        rightReps: null,
      });

      get().addSetToCurrentExercise(savedSet || {
        exerciseId: exEntry.exercise.id, setNumber,
        weight: payload.weight, actualReps: payload.reps, setType: payload.setType || 'straight',
      });

      const restSeconds = Number.isFinite(payload.restSeconds) ? payload.restSeconds
        : (re?.restSeconds ?? 90);
      get().startRestTimer(restSeconds);

      set((s) => ({ appliedRemoteEventIds: [...(s.appliedRemoteEventIds || []), eventId].slice(-500) }));
      _persistActiveWorkout(get());
      return { applied: true, setNumber };
    } catch (e) {
      // eslint-disable-next-line global-require
      try { require('../lib/errorLog').logError('store.applyRemoteSetEvent', e, {}); } catch (_) {}
      return { applied: false, reason: 'error' };
    }
  },

  startWorkout: (workout, initialExercises = []) => {
    // eslint-disable-next-line global-require
    try { require('../lib/errorLog').logInfo('workout.start', `id=${workout?.id} exercises=${initialExercises.length}`); } catch (_) {}
    set({
      activeWorkout: workout,
      workoutExercises: initialExercises,
      currentExerciseIndex: 0,
      workoutStartTime: Date.now(),
      lastActivityAt: Date.now(),
      // COMP-015: a fresh session starts with no adjustments; HomeScreen fills
      // them in once the (async, Pro-only) compute resolves.
      sessionAdjustments: [],
    });
    _persistActiveWorkout(get());
  },

  // Rehydrate an in-progress workout after an app kill/crash (WK-1). Only
  // restores when the snapshot belongs to the current user AND the workout
  // row is still incomplete in the DB (otherwise it was finished/cancelled
  // and the snapshot is stale). Never clobbers a live in-memory session.
  // Called on Home mount; surfacing the restored activeWorkout makes the
  // existing "Session in Progress" card appear.
  restoreActiveWorkout: async (userId) => {
    // E6B: clear any Live Activity a killed session left counting down.
    // pushType is nil (no server channel), so this launch sweep is the only
    // way a stale Activity ends before the system's own timeout. Runs before
    // the early returns: the stale Activity exists precisely when the
    // snapshot is missing or invalid.
    try {
      // eslint-disable-next-line global-require
      require('live-activity').endAllActivities().catch(() => {});
    } catch (_) {}
    try {
      if (!userId || get().activeWorkout) return false;
      const raw = await AsyncStorage.getItem(ACTIVE_WORKOUT_KEY);
      if (!raw) return false;
      let snap = null;
      try { snap = JSON.parse(raw); } catch (_) { snap = null; }
      if (!snap?.workout?.id || snap.userId !== userId) {
        await AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY).catch(() => {});
        return false;
      }
      // Validate against the DB: the row must still exist and be incomplete.
      let row = null;
      try {
        // eslint-disable-next-line global-require
        const { getWorkoutById } = require('../lib/database');
        row = await getWorkoutById(snap.workout.id);
      } catch (_) { row = null; }
      if (!row || row.isCompleted || row.is_completed) {
        await AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY).catch(() => {});
        return false;
      }
      // Re-check after the awaits: the user may have started a fresh workout
      // during the AsyncStorage + DB reads above. Don't clobber a live session
      // with the restored one (the top-of-function check is now stale).
      if (get().activeWorkout) return false;
      set({
        activeWorkout: snap.workout,
        workoutExercises: Array.isArray(snap.workoutExercises) ? snap.workoutExercises : [],
        currentExerciseIndex: snap.currentExerciseIndex ?? 0,
        workoutStartTime: snap.workoutStartTime ?? Date.now(),
        lastActivityAt: Date.now(),
        // COMP-015: rehydrate the already-computed adjustments; do NOT recompute
        // on restore (that would re-log duplicate adaptation_events).
        sessionAdjustments: Array.isArray(snap.sessionAdjustments) ? snap.sessionAdjustments : [],
        appliedRemoteEventIds: Array.isArray(snap.appliedRemoteEventIds) ? snap.appliedRemoteEventIds : [],
        // A2: resume a rest that is still in the future; an elapsed one stays
        // stopped (its OS alert already fired — scheduled notifications
        // survive process death, which is exactly the backstop working).
        ...(Number(snap.restTimerEndsAt) > Date.now()
          ? {
            restTimerActive: true,
            restTimerDuration: Number(snap.restTimerDuration) > 0 ? Number(snap.restTimerDuration) : 90,
            restTimerRemaining: Math.max(0, Math.round((Number(snap.restTimerEndsAt) - Date.now()) / 1000)),
            restTimerEndsAt: Number(snap.restTimerEndsAt),
          }
          : {}),
      });
      return true;
    } catch (_) {
      return false;
    }
  },

  // TZ-1 phase 2: one-shot re-key of historical food_entries to the local
  // calendar day (Phase 1 only fixed new writes). Guarded per user so it runs
  // once; if it throws the flag is not set, so it retries next launch.
  migrateFoodDayKeysOnce: async (userId) => {
    try {
      if (!userId) return;
      const key = `@volyume_tz1_food_rekey_${userId}`;
      const done = await AsyncStorage.getItem(key);
      if (done === 'true') return;
      // eslint-disable-next-line global-require
      const { rekeyFoodEntriesToLocalDay } = require('../lib/food/db');
      await rekeyFoodEntriesToLocalDay(userId);
      await AsyncStorage.setItem(key, 'true').catch(() => {});
    } catch (_) {
      /* tolerate; retried next launch since the flag stays unset */
    }
  },

  endWorkout: () => {
    // eslint-disable-next-line global-require
    try {
      const start = get().workoutStartTime;
      const mins = start ? Math.round((Date.now() - start) / 60000) : null;
      require('../lib/errorLog').logInfo('workout.end', `id=${get().activeWorkout?.id} mins=${mins}`);
    } catch (_) {}
    set({
      activeWorkout: null,
      workoutExercises: [],
      currentExerciseIndex: 0,
      workoutStartTime: null,
      restTimerActive: false,
      restTimerEndsAt: null,
      lastActivityAt: null,
      sessionAdjustments: [], // COMP-015
    });
    // A2: a session ending mid-rest must retire its end-of-rest alert.
    try {
      // eslint-disable-next-line global-require
      require('../lib/notifications/restEnd').cancelRestEndNotification();
    } catch (_) {}
    // Clear the crash-recovery snapshot so a finished/cancelled session
    // can't be resurrected on next launch (activeWorkout is now null).
    _persistActiveWorkout(get());
  },

  // Rest timer. Anchored to a wall-clock end timestamp (restTimerEndsAt) so it
  // stays correct when the app is backgrounded: JS timers are suspended in the
  // background, so a plain decrementing counter froze and resumed where it left
  // off. Every tick (and the AppState 'active' re-sync in RestTimer) recomputes
  // the remaining seconds from the clock, so on return the timer catches up to
  // real elapsed time instead of standing still.
  restTimerActive: false,
  restTimerDuration: 90,
  restTimerRemaining: 90,
  restTimerEndsAt: null,

  startRestTimer: (duration = 90) => {
    const endsAt = Date.now() + duration * 1000;
    set({
      restTimerActive: true,
      restTimerDuration: duration,
      restTimerRemaining: duration,
      restTimerEndsAt: endsAt,
    });
    // A2: OS-scheduled end-of-rest alert so a locked/pocketed phone still
    // hears rest end (foreground delivery is suppressed in handler.js).
    // Lazy-required, best-effort: the in-app timer never depends on it.
    try {
      // eslint-disable-next-line global-require
      require('../lib/notifications/restEnd').scheduleRestEndNotification(endsAt);
    } catch (_) {}
    // E6B: iOS Live Activity mirrors the same wall-clock anchor. Fire and
    // forget, best-effort; no-ops below iOS 16.1, on Android, in Expo Go and
    // wherever the user has Live Activities off. Set numbering deliberately
    // omitted (the "Set 3 of 2" class the founder retired on Android).
    try {
      // eslint-disable-next-line global-require
      const la = require('live-activity');
      const s = get();
      const ex = s.workoutExercises?.[s.currentExerciseIndex];
      la.startRestActivity({
        exerciseName: ex?.exercise?.name ?? ex?.name ?? 'Rest',
        workoutName: s.activeWorkout?.name ?? undefined,
        endTimeMs: endsAt,
      }).catch(() => {});
    } catch (_) {}
  },
  stopRestTimer: () => {
    set({ restTimerActive: false, restTimerRemaining: 0, restTimerEndsAt: null });
    try {
      // eslint-disable-next-line global-require
      require('../lib/notifications/restEnd').cancelRestEndNotification();
    } catch (_) {}
    // E6B: dismiss the Live Activity with the timer (covers skip and
    // set-complete, which stop the timer through here).
    try {
      // eslint-disable-next-line global-require
      require('live-activity').endRestActivity().catch(() => {});
    } catch (_) {}
  },
  addRestTime: (seconds = 30) => {
    let nextEndsAt = null;
    set((state) => {
      if (!state.restTimerActive) return {};
      const endsAt = (state.restTimerEndsAt ?? Date.now()) + seconds * 1000;
      nextEndsAt = endsAt;
      return {
        restTimerEndsAt: endsAt,
        restTimerRemaining: Math.max(0, Math.round((endsAt - Date.now()) / 1000)),
      };
    });
    // A2: keep the OS alert in step with the adjusted end time.
    if (nextEndsAt != null) {
      try {
        // eslint-disable-next-line global-require
        require('../lib/notifications/restEnd').scheduleRestEndNotification(nextEndsAt);
      } catch (_) {}
      // E6B: the Live Activity countdown jumps to the adjusted end time.
      try {
        // eslint-disable-next-line global-require
        require('live-activity').updateRestActivity({ endTimeMs: nextEndsAt }).catch(() => {});
      } catch (_) {}
    }
  },
  tickRestTimer: () => {
    let expired = false;
    set((state) => {
      if (!state.restTimerActive) return {};
      // Wall-clock derived: recompute from the end timestamp rather than
      // decrementing, so a backgrounded (suspended) timer catches up on resume.
      const remaining = state.restTimerEndsAt != null
        ? Math.max(0, Math.round((state.restTimerEndsAt - Date.now()) / 1000))
        : Math.max(0, state.restTimerRemaining - 1);
      if (remaining <= 0) expired = true;
      return remaining <= 0
        ? { restTimerActive: false, restTimerRemaining: 0, restTimerEndsAt: null }
        : { restTimerRemaining: remaining };
    });
    // A2: on natural expiry the scheduled alert has fired (or is due within
    // the same second); cancelling here is a harmless no-op then, and stops a
    // late duplicate if the tick caught up ahead of the OS clock.
    if (expired) {
      try {
        // eslint-disable-next-line global-require
        require('../lib/notifications/restEnd').cancelRestEndNotification();
      } catch (_) {}
      // E6B: natural expiry dismisses the Live Activity too.
      try {
        // eslint-disable-next-line global-require
        require('live-activity').endRestActivity().catch(() => {});
      } catch (_) {}
    }
  },

  // Workout prefs (Hevy teardown R1). Device-local, AsyncStorage-backed.
  // defaultRestSeconds is the global fallback rest used when a routine
  // exercise has no per-exercise rest set; autoStartRestTimer gates whether
  // logging a set kicks off the rest countdown automatically; and
  // restEndAlertEnabled gates the A2 end-of-rest lock-screen alert (founder
  // decision 2026-07-01: the alert ships with an in-app off switch). Defaults
  // match the previous hardcoded behaviour (90s, auto-start on, alert on).
  defaultRestSeconds: 90,
  autoStartRestTimer: true,
  restEndAlertEnabled: true,
  workoutPrefsLoaded: false,
  loadWorkoutPrefs: async () => {
    try {
      const raw = await AsyncStorage.getItem(WORKOUT_PREFS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') {
        const next = {};
        if (Number.isFinite(parsed.defaultRestSeconds)) next.defaultRestSeconds = parsed.defaultRestSeconds;
        if (typeof parsed.autoStartRestTimer === 'boolean') next.autoStartRestTimer = parsed.autoStartRestTimer;
        if (typeof parsed.restEndAlertEnabled === 'boolean') next.restEndAlertEnabled = parsed.restEndAlertEnabled;
        set({ ...next, workoutPrefsLoaded: true });
        if (next.restEndAlertEnabled === false) {
          // A rest started BEFORE this hydration ran scheduled its end-of-rest
          // alert off the default-on value; a pre-hydration schedule must not
          // survive a loaded OFF pref. Best-effort cancel, mirroring
          // setRestEndAlertEnabled's off path (lazy require avoids the
          // store → restEnd → store import cycle).
          try {
            // eslint-disable-next-line global-require
            require('../lib/notifications/restEnd').cancelRestEndNotification();
          } catch (_) { /* tolerate: the pref itself still gates rescheduling */ }
        }
      } else {
        set({ workoutPrefsLoaded: true });
      }
    } catch (_) {
      set({ workoutPrefsLoaded: true });
    }
  },
  _persistWorkoutPrefs: async () => {
    try {
      await AsyncStorage.setItem(WORKOUT_PREFS_KEY, JSON.stringify({
        defaultRestSeconds: get().defaultRestSeconds,
        autoStartRestTimer: get().autoStartRestTimer,
        restEndAlertEnabled: get().restEndAlertEnabled,
      }));
    } catch (_) { /* offline-friendly: tolerate */ }
  },
  setDefaultRestSeconds: async (seconds) => {
    // Clamp to the same 30–600s band the routine builder uses.
    const n = Math.max(30, Math.min(600, Math.round(Number(seconds) || 90)));
    set({ defaultRestSeconds: n });
    await get()._persistWorkoutPrefs();
  },
  setAutoStartRestTimer: async (value) => {
    set({ autoStartRestTimer: !!value });
    await get()._persistWorkoutPrefs();
  },
  setRestEndAlertEnabled: async (value) => {
    const v = !!value;
    set({ restEndAlertEnabled: v });
    // Take effect mid-rest immediately: off cancels the pending alert; on
    // (re)schedules for the remaining rest, if one is running.
    try {
      // eslint-disable-next-line global-require
      const restEnd = require('../lib/notifications/restEnd');
      if (!v) {
        restEnd.cancelRestEndNotification();
      } else {
        const { restTimerActive, restTimerEndsAt } = get();
        if (restTimerActive && Number(restTimerEndsAt) > Date.now()) {
          restEnd.scheduleRestEndNotification(restTimerEndsAt);
        }
      }
    } catch (_) {}
    await get()._persistWorkoutPrefs();
  },

  // PR celebration queue. The user might hit two PRs on the same set
  // (heaviest weight + new 1RM), the previous single-slot field lost the
  // second. Now we queue, the top of the queue renders, dismiss pops.
  prCelebration: null,
  prCelebrationQueue: [],
  showPRCelebration: (pr) => set((state) => state.prCelebration
    ? { prCelebrationQueue: [...state.prCelebrationQueue, pr] }
    : { prCelebration: pr }),
  hidePRCelebration: () => set((state) => {
    if (state.prCelebrationQueue.length === 0) {
      return { prCelebration: null };
    }
    const [next, ...rest] = state.prCelebrationQueue;
    return { prCelebration: next, prCelebrationQueue: rest };
  }),

  // Gym weight units (barbells, dumbbells). kg-only (UK): lbs was removed,
  // so this is always 'kg'. setUnits coerces anything else to 'kg' and any
  // legacy cloud/profile value is forced to 'kg' on load, so no historical
  // lbs setting survives.
  units: 'kg',
  setUnits: async (_units) => {
    const units = 'kg';
    set({ units });
    const { user, userProfile, _stampProfileFields } = get();
    if (user?.id) {
      const updated = { ...(userProfile || {}), units };
      const key = PROFILE_KEY_PFX + user.id;
      const value = JSON.stringify(updated);
      try { await AsyncStorage.setItem(key, value); } catch (_) {}
      set({ userProfile: updated });
      _stampProfileFields(['units']);
      await _persistProfileTimestamps(user.id, get().userProfileFieldUpdatedAt);
      pushPrefSoon(user.id, key, value);
    }
  },

  // Body weight units, 'st' | 'kg' | 'lbs'. Default 'st' (UK convention).
  bodyWeightUnits: 'st',
  setBodyWeightUnits: async (bwu) => {
    set({ bodyWeightUnits: bwu });
    const { user, userProfile, _stampProfileFields } = get();
    if (user?.id) {
      const updated = { ...(userProfile || {}), bodyWeightUnits: bwu };
      const key = PROFILE_KEY_PFX + user.id;
      const value = JSON.stringify(updated);
      try { await AsyncStorage.setItem(key, value); } catch (_) {}
      set({ userProfile: updated });
      _stampProfileFields(['bodyWeightUnits']);
      await _persistProfileTimestamps(user.id, get().userProfileFieldUpdatedAt);
      pushPrefSoon(user.id, key, value);
    }
  },

  // Diet preference for curated meal suggestions: 'omnivore' | 'vegetarian'
  // | 'vegan'. Set in onboarding, editable in Settings. Synced as a
  // users_profile column (migration 055) via the per-field merge, same
  // path as units. The Suggested food-search tab filters the curated
  // meal library by this.
  setDietPreference: async (diet) => {
    const { user, userProfile, _stampProfileFields } = get();
    if (user?.id) {
      const updated = { ...(userProfile || {}), dietPreference: diet };
      const key = PROFILE_KEY_PFX + user.id;
      const value = JSON.stringify(updated);
      try { await AsyncStorage.setItem(key, value); } catch (_) {}
      set({ userProfile: updated });
      _stampProfileFields(['dietPreference']);
      await _persistProfileTimestamps(user.id, get().userProfileFieldUpdatedAt);
      pushPrefSoon(user.id, key, value);
    }
  },

  // Meal-plan food exclusions ("never show me this", deep-audit Theme G
  // R1). A local profile field (the meal plan is local-only for now, so no
  // cloud column / pushPrefSoon); the generator + swaps read it via
  // preferencesFromProfile. Idempotent append.
  addMealPlanExcludedFood: async (foodKey) => {
    const { user, userProfile } = get();
    if (!user?.id || !foodKey) return;
    const current = Array.isArray(userProfile?.mealPlanExcludeFoods)
      ? userProfile.mealPlanExcludeFoods : [];
    if (current.includes(foodKey)) return;
    const updated = { ...(userProfile || {}), mealPlanExcludeFoods: [...current, foodKey] };
    const key = PROFILE_KEY_PFX + user.id;
    try { await AsyncStorage.setItem(key, JSON.stringify(updated)); } catch (_) {}
    set({ userProfile: updated });
  },

  // Meal-plan preference controls (deep-audit Theme G R4): meals/day,
  // variety dial, fat convention, peri-workout slots. Local profile
  // fields (plan is local-only); merged + persisted, read by
  // preferencesFromProfile. `partial` carries any of the mealPlan* keys.
  setMealPlanPrefs: async (partial) => {
    const { user, userProfile } = get();
    if (!user?.id || !partial || typeof partial !== 'object') return;
    const allowed = ['mealPlanMealsPerDay', 'mealPlanVariety', 'mealPlanFatConvention',
      'mealPlanPeriWorkout', 'mealPlanExcludeTags', 'mealPlanPinnedMeals'];
    const patch = {};
    for (const k of allowed) if (k in partial) patch[k] = partial[k];
    if (Object.keys(patch).length === 0) return;
    const updated = { ...(userProfile || {}), ...patch };
    const key = PROFILE_KEY_PFX + user.id;
    try { await AsyncStorage.setItem(key, JSON.stringify(updated)); } catch (_) {}
    set({ userProfile: updated });
  },

  // Calorie banking (CB-1, "Plan a bigger day"): a local profile field like the
  // meal-plan prefs (plan/banking are local-only). `bank` is the
  // { weekStartKey, bigDayKey, perDayDeltaKcal, appliedAt } record, or null to
  // clear. The diary reads it to show each day's banked target. The safe
  // redistribution + floor checks happen in food/calorieBank before this is
  // ever called; this only persists the result.
  setCalorieBank: async (bank) => {
    const { user, userProfile } = get();
    if (!user?.id) return;
    const updated = { ...(userProfile || {}), calorieBank: bank ?? null };
    const key = PROFILE_KEY_PFX + user.id;
    try { await AsyncStorage.setItem(key, JSON.stringify(updated)); } catch (_) {}
    set({ userProfile: updated });
  },

  // Bar weight for plate calculator, persisted alongside units
  barWeight: 20,
  setBarWeight: async (w) => {
    set({ barWeight: w });
    const { user, userProfile, _stampProfileFields } = get();
    if (user?.id) {
      const updated = { ...(userProfile || {}), barWeight: w };
      const key = PROFILE_KEY_PFX + user.id;
      const value = JSON.stringify(updated);
      try { await AsyncStorage.setItem(key, value); } catch (_) {}
      set({ userProfile: updated });
      _stampProfileFields(['barWeight']);
      await _persistProfileTimestamps(user.id, get().userProfileFieldUpdatedAt);
      pushPrefSoon(user.id, key, value);
    }
  },

  // ── Accessibility preferences ─────────────────────────────────────────
  // Loaded from AsyncStorage on first read via initAccessibility(). Each
  // field is OS-style: changes take effect immediately for components that
  // subscribe via useAppStore selectors. Components that import theme
  // tokens statically (most existing screens today) will reflect the
  // changes after the app is restarted, that's noted in the Settings UI.
  accessibility: {
    largerText: false,    // applies a 1.2× multiplier to the fontSize tokens in applyAccessibility (theme.js)
    higherContrast: false, // brightens muted text + thickens borders via theme tokens
    colorBlindSafe: false, // swaps red/green success/error to blue/orange
    reduceMotion: false,   // skips PRCelebration particles, RestTimer pulse, big spring anims
    theme: 'dark',         // COMP-029: 'dark' | 'light' | 'system'. Default dark, no existing user changes
    energyUnit: 'kcal',    // food-UI energy DISPLAY unit: 'kcal' | 'kj'. Display-only (read reactively,
                           // no reload); stored values, targets + the coaching engine stay in kcal.
    showHomeNutrition: true, // gap #17: show the nutrition glance + food entry on the Home strip
    // gap #16 + E4: choose-which-nutrients-shown on a food's detail. Fibre,
    // sugar and sodium are carried per-food (per-100g) when the source has
    // them; these toggles decide which appear under the kcal/P/C/F summary.
    // Per-food display only — never a daily total, never a target, never
    // scored. Sodium's unit question resolved 2026-07-02: the bundled OFF
    // snapshot stores grams per 100g at 92% coverage; display converts to mg
    // and implausible values read as no data (scaleSodiumMg).
    showFibre: true,
    showSugar: true,
    showSodium: true,
  },
  accessibilityLoaded: false,
  loadAccessibility: async () => {
    const parsed = await loadA11yPrefs();
    if (parsed) {
      set({ accessibility: { ...get().accessibility, ...parsed }, accessibilityLoaded: true });
    } else {
      set({ accessibilityLoaded: true });
    }
  },
  setAccessibilityPref: async (key, value) => {
    const next = { ...get().accessibility, [key]: value };
    set({ accessibility: next });
    const serialised = JSON.stringify(next);
    try { await AsyncStorage.setItem(A11Y_PREFS_KEY, serialised); } catch (_) {}
    const { user } = get();
    if (user?.id) pushPrefSoon(user.id, A11Y_PREFS_KEY, serialised);
  },

  // LB-9: product-analytics opt-out. Device-local (a privacy opt-out is
  // never itself synced). Drives the telemetry transport's enable flag.
  privacy: { analyticsOptOut: false },
  privacyLoaded: false,
  loadPrivacyPrefs: async () => {
    const parsed = await loadPrivacyPrefs();
    if (parsed) set({ privacy: { ...get().privacy, ...parsed } });
    set({ privacyLoaded: true });
    applyTelemetryEnabled(!get().privacy.analyticsOptOut);
  },
  setAnalyticsOptOut: async (value) => {
    const next = { ...get().privacy, analyticsOptOut: !!value };
    set({ privacy: next });
    try { await AsyncStorage.setItem(PRIVACY_PREFS_KEY, JSON.stringify(next)); } catch (_) {}
    applyTelemetryEnabled(!next.analyticsOptOut);
  },
}));

// Push the opt-out state into the telemetry transport. Lazy-required so
// the store doesn't drag the transport (and its DB + supabase imports)
// into evaluation; a missing module (test env) is a no-op.
function applyTelemetryEnabled(enabled) {
  try {
    // eslint-disable-next-line global-require
    const { setTelemetryEnabled } = require('../lib/telemetry/transport');
    setTelemetryEnabled(enabled);
  } catch (_) { /* tolerate */ }
}

// Wrap every action with auto-breadcrumb + duration tracking. The
// instrumented actions still work exactly like the originals, the
// wrapper only adds observability side effects. Calling this once at
// module load means every existing useAppStore(s => s.someAction)
// selector benefits without changing a single call site.
if (_observability?.instrumentStore) {
  try { _observability.instrumentStore(useAppStore); } catch (_) {}
}

export default useAppStore;
