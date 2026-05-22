import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { A11Y_PREFS_KEY, loadA11yPrefs } from '../lib/accessibilityPrefs';

// Auto-instrumentation lives in observability.js. Wrapping the store
// once at module evaluation means every action call gets a
// breadcrumb + duration without any per-action change at the call
// sites. See src/lib/observability.js for the wrapping logic.
// eslint-disable-next-line global-require
const _observability = (() => { try { return require('../lib/observability'); } catch (_) { return null; } })();

const LOCAL_USER_KEY   = '@volyume_local_user_id';
const FIRST_RUN_KEY    = '@volyume_first_run_complete';
const FIRST_RUN_KEY_PFX = '@volyume_first_run_complete_'; // per-uid: + supabase user.id
const PROFILE_KEY_PFX  = '@volyume_user_profile_';
const TIER_KEY         = '@volyume_tier';

// Fire-and-forget push of a single AsyncStorage pref to the cloud.
// Called from store setters whenever a synced preference changes so
// the cloud copy stays current without waiting for the next sign-in
// catch-up. Lazy-requires sync to avoid the circular import — sync.js
// imports from this file. No-op when there's no cloud session, when
// the pref's key is on the device-only exclude list, or when the
// sync module errors out (offline, transient network failure — the
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

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const useAppStore = create((set, get) => ({
  // Auth
  user: null,
  session: null,
  userProfile: null,
  // Kept for backwards compat with crash-recovery code paths that still
  // null-guard on it. Splash gate no longer reads this — splash only fires
  // during initial bootstrap (splashReady / firstRunChecked / tierChecked).
  isAuthLoading: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),

  // Creates or restores a local (offline) user from AsyncStorage, then loads
  // their saved profile. CRITICAL: must always release isAuthLoading even on
  // failure — otherwise the splash screen hangs forever for any user whose
  // stored profile JSON is corrupt.
  initLocalUser: async () => {
    let userId = null;
    let profile = null;
    try {
      userId = await AsyncStorage.getItem(LOCAL_USER_KEY);
      if (!userId) {
        userId = generateUUID();
        await AsyncStorage.setItem(LOCAL_USER_KEY, userId);
      }
      const raw = await AsyncStorage.getItem(PROFILE_KEY_PFX + userId).catch(() => null);
      if (raw) {
        try {
          profile = JSON.parse(raw);
          // Migrate legacy trainingGoal values (general_hypertrophy /
          // strength_hypertrophy / weak_point_spec) to the post-merge
          // split (general + phase). No-op for clean profiles.
          // eslint-disable-next-line global-require
          const { migrateProfileGoals } = require('../lib/coachingGoals');
          profile = migrateProfileGoals(profile);
        }
        catch (e) {
          // Corrupt profile — keep going with null profile; the user can
          // re-onboard. Don't swallow this entirely — surface to debug log.
          // eslint-disable-next-line global-require
          try { require('../lib/errorLog').logWarn('useAppStore.initLocalUser', 'corrupt profile JSON', { userId, raw: raw.slice(0, 200) }); } catch (_) {}
          profile = null;
        }
      }
    } catch (e) {
      // eslint-disable-next-line global-require
      try { require('../lib/errorLog').logError('useAppStore.initLocalUser', e); } catch (_) {}
      // userId may have been resolved partially. Fall through to set
      // isAuthLoading=false so the app doesn't hang on the splash.
    }
    const localUser = userId ? { id: userId, email: 'local@device', isLocal: true } : null;
    set({
      user: localUser,
      userProfile: profile,
      units: profile?.units || 'kg',
      bodyWeightUnits: profile?.bodyWeightUnits || 'st',
      barWeight: profile?.barWeight || 20,
      isAuthLoading: false,
    });
    return localUser;
  },

  // Persists userProfile to AsyncStorage so it survives app restarts for local
  // users AND pushes the change to Supabase if there's an authenticated
  // session, so profile edits (name, units, training fields) survive a
  // device swap.
  saveLocalProfile: async (userId, profile) => {
    try {
      await AsyncStorage.setItem(PROFILE_KEY_PFX + userId, JSON.stringify(profile));
    } catch (_) {}
    set({ userProfile: profile });
    // Mirror to cloud if signed in. Fire-and-forget; failures land in the
    // Debug logs via syncProfile's own logError. We deliberately import
    // lazily to avoid a circular dep (sync.js → database.js → … → store).
    try {
      const sess = get().session;
      if (sess?.user?.id) {
        // eslint-disable-next-line global-require
        const { syncProfile } = require('../lib/sync');
        syncProfile(sess.user.id, profile, get().tier).catch(() => {});
      }
    } catch (_) {}
  },

  // Clears local user from AsyncStorage and store
  clearLocalUser: async () => {
    await AsyncStorage.removeItem(LOCAL_USER_KEY);
    set({ user: null, session: null });
  },

  // Sign-out cleanup. Removes the AsyncStorage state tied to a session so
  // the next sign-in starts from a clean slate, but DOES NOT touch SQLite
  // (the user's training history stays local — if they sign back in to
  // the same account on this device, it's instantly available without
  // waiting for pullFromCloud). The actual SQLite wipe happens only on
  // Sign-out is a SESSION-LEVEL operation. It does NOT touch AsyncStorage
  // or local data. All per-user content (profile, completed-onboarding
  // flag, body metrics migration flags, nutrition targets, etc.) stays
  // exactly where it is. When the same user signs back in, everything
  // is intact — no cloud roundtrip needed for routing.
  //
  // Per-user safety on a shared device: keys that are user-specific use
  // a uid prefix (FIRST_RUN_KEY_PFX, PROFILE_KEY_PFX, etc.) so a
  // different user signing in on the same device reads THEIR own keys,
  // not the previous user's. The few legacy global keys
  // (FIRST_RUN_KEY, TIER_KEY) are kept in sync per-user via the
  // restoreSessionFromCloud path.
  //
  // The only path that wipes data is the explicit Settings →
  // Delete account flow (wipeAllUserData + delete-account Edge
  // Function). Sign-out is not that.
  clearAuthStateForSignOut: async () => {
    // eslint-disable-next-line global-require
    try { require('../lib/errorLog').logInfo('clearAuthStateForSignOut', 'start', { prevTier: get().tier, prevUid: get().user?.id ?? null }); } catch (_) {}
    set({
      // Session-level fields only. These are in-memory state, not
      // AsyncStorage. AsyncStorage data persists untouched.
      user: null,
      session: null,
      userProfile: null,
      tier: null,
      tierChecked: true,
      firstRunComplete: false,
      firstRunChecked: true,
      // Workout in-memory state is per-session and shouldn't survive
      // sign-out into a future session (could be a different user).
      // The completed workout rows in SQLite are user-keyed and stay.
      activeWorkout: null,
      workoutExercises: [],
      currentExerciseIndex: 0,
      restTimerActive: false,
      prCelebration: null,
      prCelebrationQueue: [],
    });
  },

  // Tier — 'free' | 'pro' | null (null = not yet chosen → show WelcomeScreen)
  tier: null,
  tierChecked: false,

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

  // True while restoreSessionFromCloud is in flight. The navigator
  // gates routing decisions on this so the wizard doesn't briefly
  // mount during the ~8s cloud read for returning users (the
  // wizard-flash bug). Defaults to false so cold-launch isn't gated
  // on it — the gate only matters during an active auth transition.
  // restoringSession + restoreSplashStage removed — the new
  // restoreSessionFromCloud uses optimistic routing and a background
  // cloud sync, so no UI gate is needed. Existing screens with empty
  // states (HomeScreen "no active plan", Plans tab) fill in as
  // pullFromCloud writes to local SQLite. Same pattern as Linear /
  // Notion / Slack.

  checkTier: async () => {
    try {
      const saved = await AsyncStorage.getItem(TIER_KEY);
      // Existing users who completed first-run before tiers existed → grant pro
      if (!saved) {
        const firstRunDone = await AsyncStorage.getItem(FIRST_RUN_KEY);
        if (firstRunDone === 'true') {
          await AsyncStorage.setItem(TIER_KEY, 'pro');
          set({ tier: 'pro', tierChecked: true });
          return;
        }
      }
      set({ tier: saved || null, tierChecked: true });
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
        // eslint-disable-next-line global-require
        require('../lib/errorLog').logWarn('useAppStore.setTier', `tier ${prev} → ${tier}`, { prev, next: tier, caller: trace });
      } catch (_) {}
    }
    // Persist BEFORE setting in-memory state so a crash between the two
    // doesn't leave AsyncStorage out of sync with the store. If the
    // AsyncStorage write fails, log it but still update the store —
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
  // Slack — the app shell appears immediately, data streams in to fill
  // empty states as it arrives.
  //
  // Three cues, in priority order:
  //   1. Per-uid local cache (FIRST_RUN_KEY_PFX + uid). If set, use it —
  //      this device has seen this user before.
  //   2. session.user.created_at age. If > 60s, this auth.users row is
  //      old enough that the user definitely isn't brand new in this
  //      session — assume returning, route to MainTabs.
  //   3. Default: < 60s old, must be a fresh signup — route to wizard.
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

    // Beta tier policy — every cloud-authenticated user is Pro during beta.
    // eslint-disable-next-line global-require
    const { PRO_BETA_ACTIVE } = require('../lib/proGate');
    if (PRO_BETA_ACTIVE) {
      try { await AsyncStorage.setItem(TIER_KEY, 'pro'); } catch (_) {}
      set({ tier: 'pro', tierChecked: true });
    }

    // ── Step 1: instant routing decision based on local cues ─────────
    // Cue A: per-uid cache (best, exact answer from prior session)
    // Cue B: created_at age heuristic (good, used when cache is missing)
    let routedOptimistically = false;
    let cachedComplete = null;
    try {
      cachedComplete = await AsyncStorage.getItem(FIRST_RUN_KEY_PFX + supabaseUserId);
    } catch (_) {}

    if (cachedComplete === 'true' || cachedComplete === 'false') {
      const isComplete = cachedComplete === 'true';
      set({ firstRunComplete: isComplete, firstRunChecked: true });
      try { await AsyncStorage.setItem(FIRST_RUN_KEY, cachedComplete); } catch (_) {}
      log.logInfo('restoreSessionFromCloud.cacheHit', `firstRunComplete=${cachedComplete}`);
      routedOptimistically = true;
    } else if (sessionUser?.created_at) {
      const ageMs = Date.now() - new Date(sessionUser.created_at).getTime();
      if (Number.isFinite(ageMs) && ageMs >= 60_000) {
        // Old auth row — returning user. Optimistically route to MainTabs.
        set({ firstRunComplete: true, firstRunChecked: true });
        try { await AsyncStorage.setItem(FIRST_RUN_KEY, 'true'); } catch (_) {}
        log.logInfo('restoreSessionFromCloud.optimisticReturning', `ageMs=${ageMs}`);
        routedOptimistically = true;
      } else {
        // Fresh auth row — new signup. Route to wizard.
        set({ firstRunComplete: false, firstRunChecked: true });
        try { await AsyncStorage.setItem(FIRST_RUN_KEY, 'false'); } catch (_) {}
        log.logInfo('restoreSessionFromCloud.freshSignup', `ageMs=${ageMs}`);
        routedOptimistically = true;
      }
    }

    // ── Step 2: cloud read (background from the UI's perspective) ───
    // The routing decision was made synchronously above, so any state
    // mutation in this step is purely background hydration — populates
    // the per-uid cache for next time, fills userProfile if empty, and
    // (rarely) corrects the optimistic firstRunComplete if cloud
    // disagrees with it. UI is already responsive; this awaits but
    // doesn't gate routing.
    //
    // The function's returned promise resolves when ALL of this is
    // done (useful for tests + cold-launch bootstrap which want
    // assured cloud sync). Callers in the sign-in path (RootNavigator
    // onAuthStateChange) intentionally don't await — they kicked off
    // the function and let it finish on its own.
    let cloudData = null;
    try {
      // eslint-disable-next-line global-require
      const { getSupabaseClient } = require('../lib/supabase');
      const sb = getSupabaseClient();
      if (!sb) return;
      const READ_TIMEOUT_MS = 10_000;
      const readPromise = sb
        .from('users_profile')
        .select('first_name, training_focus, training_age, primary_equipment, units, bar_weight, tier, first_run_complete')
        .eq('id', supabaseUserId)
        .maybeSingle();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('cloud-read-timeout')), READ_TIMEOUT_MS)
      );
      const { data } = await Promise.race([readPromise, timeoutPromise]);
      cloudData = data;
    } catch (e) {
      if (e?.message === 'cloud-read-timeout') {
        log.logWarn('restoreSessionFromCloud.timeout', 'cloud read exceeded 10s', { uid: supabaseUserId });
      }
      return; // optimistic decision sticks
    }

    if (!cloudData) {
      log.logInfo('restoreSessionFromCloud.noProfile', 'cloud profile missing — optimistic decision stands');
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
        units: cloudData.units ?? 'kg',
        barWeight: cloudData.bar_weight ?? 20,
      };
      try { await AsyncStorage.setItem(PROFILE_KEY_PFX + supabaseUserId, JSON.stringify(profile)); } catch (_) {}
      set({
        userProfile: profile,
        units: profile.units,
        barWeight: profile.barWeight,
      });
    }

    // Reconcile optimistic decision with cloud truth. Only correct if
    // cloud explicitly says first_run_complete=true and we hadn't
    // already set it (e.g. no sessionUser was passed in step 1 so
    // the optimistic path didn't fire). We do NOT flip back to false
    // if cloud disagrees with an optimistic true — that would be the
    // wizard-flash bug. An old account that was never finished is an
    // edge case; they can complete from Settings → Update your plan.
    if (cloudData.first_run_complete && !get().firstRunComplete) {
      try { await AsyncStorage.setItem(FIRST_RUN_KEY, 'true'); } catch (_) {}
      set({ firstRunComplete: true, firstRunChecked: true });
      log.logInfo('restoreSessionFromCloud.firstRunRestored', 'true (from cloud)');
    }
  },

  // Called after cloud sign-in: reads tier from Supabase and uses it as the
  // authoritative value. During beta this is a no-op (Supabase tier = 'pro').
  // After beta, this becomes the enforcement point — server wins.
  //
  // Wrapped in a 5s timeout so a stalled Supabase doesn't leave the
  // navigator splash gate spinning forever — the bootstrap path reads
  // tierChecked / firstRunChecked and only proceeds once both are set.
  refreshTierFromCloud: async (supabaseClient, supabaseUserId) => {
    if (!supabaseClient || !supabaseUserId) return;
    try {
      const queryPromise = supabaseClient
        .from('users_profile')
        .select('tier')
        .eq('id', supabaseUserId)
        .maybeSingle();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('refreshTierFromCloud timeout')), 5000)
      );
      const { data } = await Promise.race([queryPromise, timeoutPromise]);
      if (data?.tier) {
        // Same beta tier policy as restoreSessionFromCloud — see comment
        // there. Any cloud-signed-in user is Pro during beta because the
        // cloud column is unusable as truth (DB default 'free', trigger
        // blocks writes, no webhook yet).
        // eslint-disable-next-line global-require
        const { PRO_BETA_ACTIVE } = require('../lib/proGate');
        const effectiveTier = PRO_BETA_ACTIVE ? 'pro' : data.tier;
        // Persist BEFORE setting in-memory state so a crash between the
        // two doesn't leave AsyncStorage out of sync with the store.
        await AsyncStorage.setItem(TIER_KEY, effectiveTier);
        set({ tier: effectiveTier });
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
  // mid-workout — flipping firstRunComplete=false would unmount MainTabs
  // and lose the live set log. Caller surfaces this to the UI.
  resetFirstRun: async () => {
    if (get().activeWorkout) {
      require('../lib/errorLog').logWarn(
        'useAppStore.resetFirstRun',
        'refused — workout in progress',
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

  completeFirstRun: async () => {
    const uid = get().session?.user?.id;
    try {
      await AsyncStorage.setItem(FIRST_RUN_KEY, 'true');
      // Per-uid cache lets sign-out → sign-back-in on the same device
      // skip the cloud read entirely. Only this user's key, not global.
      if (uid) await AsyncStorage.setItem(FIRST_RUN_KEY_PFX + uid, 'true');
    } catch (_e) {}
    set({ firstRunComplete: true });
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

  // Active workout
  activeWorkout: null,
  workoutExercises: [],
  currentExerciseIndex: 0,
  workoutStartTime: null,
  lastActivityAt: null,

  setActiveWorkout: (workout) => set({ activeWorkout: workout }),
  setWorkoutExercises: (next) => set((state) => ({
    workoutExercises:
      typeof next === 'function' ? next(state.workoutExercises) : next,
  })),
  setCurrentExerciseIndex: (i) => set({ currentExerciseIndex: i }),
  updateLastActivity: () => set({ lastActivityAt: Date.now() }),

  // Use the functional set() form so two near-simultaneous calls (rapid
  // double-tap on Add set / Add exercise) both land — the previous
  // get()+set() pair could read the same snapshot twice and drop one update.
  addExerciseToWorkout: (exercise, routineExercise = null) => {
    set((state) => ({
      workoutExercises: [
        ...state.workoutExercises,
        { exercise, routineExercise, sets: [] },
      ],
    }));
  },

  // Subscribers (Athlete Hub volume chart, etc.) read this to know
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
    });
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
      lastActivityAt: null,
    });
  },

  // Rest timer
  restTimerActive: false,
  restTimerDuration: 90,
  restTimerRemaining: 90,

  startRestTimer: (duration = 90) => set({
    restTimerActive: true,
    restTimerDuration: duration,
    restTimerRemaining: duration,
  }),
  stopRestTimer: () => set({ restTimerActive: false, restTimerRemaining: 0 }),
  addRestTime: (seconds = 30) => {
    set((state) => state.restTimerActive
      ? { restTimerRemaining: Math.max(0, state.restTimerRemaining + seconds) }
      : {});
  },
  tickRestTimer: () => {
    set((state) => state.restTimerRemaining <= 1
      ? { restTimerActive: false, restTimerRemaining: 0 }
      : { restTimerRemaining: state.restTimerRemaining - 1 });
  },

  // PR celebration queue. The user might hit two PRs on the same set
  // (heaviest weight + new 1RM) — the previous single-slot field lost the
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

  // Gym weight units (barbells, dumbbells) — 'kg' | 'lbs'
  units: 'kg',
  setUnits: async (units) => {
    set({ units });
    const { user, userProfile } = get();
    if (user?.id) {
      const updated = { ...(userProfile || {}), units };
      const key = PROFILE_KEY_PFX + user.id;
      const value = JSON.stringify(updated);
      try { await AsyncStorage.setItem(key, value); } catch (_) {}
      set({ userProfile: updated });
      pushPrefSoon(user.id, key, value);
    }
  },

  // Body weight units — 'st' | 'kg' | 'lbs'. Default 'st' (UK convention).
  bodyWeightUnits: 'st',
  setBodyWeightUnits: async (bwu) => {
    set({ bodyWeightUnits: bwu });
    const { user, userProfile } = get();
    if (user?.id) {
      const updated = { ...(userProfile || {}), bodyWeightUnits: bwu };
      const key = PROFILE_KEY_PFX + user.id;
      const value = JSON.stringify(updated);
      try { await AsyncStorage.setItem(key, value); } catch (_) {}
      set({ userProfile: updated });
      pushPrefSoon(user.id, key, value);
    }
  },

  // Bar weight for plate calculator — persisted alongside units
  barWeight: 20,
  setBarWeight: async (w) => {
    set({ barWeight: w });
    const { user, userProfile } = get();
    if (user?.id) {
      const updated = { ...(userProfile || {}), barWeight: w };
      const key = PROFILE_KEY_PFX + user.id;
      const value = JSON.stringify(updated);
      try { await AsyncStorage.setItem(key, value); } catch (_) {}
      set({ userProfile: updated });
      pushPrefSoon(user.id, key, value);
    }
  },

  // ── Accessibility preferences ─────────────────────────────────────────
  // Loaded from AsyncStorage on first read via initAccessibility(). Each
  // field is OS-style: changes take effect immediately for components that
  // subscribe via useAppStore selectors. Components that import theme
  // tokens statically (most existing screens today) will reflect the
  // changes after the app is restarted — that's noted in the Settings UI.
  accessibility: {
    largerText: false,    // applies a 1.2× multiplier via the useAccessibleFontSize hook
    higherContrast: false, // brightens muted text + thickens borders via theme tokens
    colorBlindSafe: false, // swaps red/green success/error to blue/orange
    reduceMotion: false,   // skips PRCelebration particles, RestTimer pulse, big spring anims
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
}));

// Wrap every action with auto-breadcrumb + duration tracking. The
// instrumented actions still work exactly like the originals — the
// wrapper only adds observability side effects. Calling this once at
// module load means every existing useAppStore(s => s.someAction)
// selector benefits without changing a single call site.
if (_observability?.instrumentStore) {
  try { _observability.instrumentStore(useAppStore); } catch (_) {}
}

export default useAppStore;
