import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { A11Y_PREFS_KEY, loadA11yPrefs } from '../lib/accessibilityPrefs';

const LOCAL_USER_KEY   = '@volyume_local_user_id';
const FIRST_RUN_KEY    = '@volyume_first_run_complete';
const PROFILE_KEY_PFX  = '@volyume_user_profile_';
const TIER_KEY         = '@volyume_tier';

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
  // delete-account or when a DIFFERENT user signs in on this device.
  clearAuthStateForSignOut: async () => {
    // eslint-disable-next-line global-require
    try { require('../lib/errorLog').logInfo('clearAuthStateForSignOut', 'start', { prevTier: get().tier, prevUid: get().user?.id ?? null }); } catch (_) {}
    const keysToRemove = [
      LOCAL_USER_KEY,
      FIRST_RUN_KEY,
      TIER_KEY,
      // Block snooze and schedule prefs — tied to the signed-out account
      '@volyume_block_snooze',
      '@volyume_schedule_v1',
      '@volyume_seen_workout_info',
      '@volyume_body_metrics_migrated_*', // pattern below
    ];
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const toRemove = allKeys.filter(k =>
        k.startsWith('@volyume_user_profile_') ||
        k.startsWith('@volyume_body_metrics_migrated_') ||
        k.startsWith('@volyume_nutrition_targets') ||
        k === '@volyume_crash_log' ||
        keysToRemove.includes(k)
      );
      if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
    } catch (_) {
      // Best-effort — fall back to removing just the most critical keys
      try { await AsyncStorage.removeItem(LOCAL_USER_KEY); } catch (__) {}
      try { await AsyncStorage.removeItem(TIER_KEY); } catch (__) {}
    }
    set({
      user: null,
      session: null,
      userProfile: null,
      tier: null,
      // KEY POINT: tierChecked / firstRunChecked stay TRUE because we just
      // checked them by clearing them. The RootNavigator splash gate is
      //   if (!tierChecked || !firstRunChecked) return <Splash />
      // — setting them to false here used to hang the splash screen forever
      // after sign-out / delete-account because nothing re-runs the checks.
      tierChecked: true,
      firstRunComplete: false,
      firstRunChecked: true,
      // Reset workout state too — a stale active workout from the prior
      // session would otherwise re-appear on next sign-in.
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

  // True while restoreSessionFromCloud is in flight. The navigator
  // gates routing decisions on this so the wizard doesn't briefly
  // mount during the ~8s cloud read for returning users (the
  // wizard-flash bug). Defaults to false so cold-launch isn't gated
  // on it — the gate only matters during an active auth transition.
  restoringSession: false,

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

  // Called once after every cloud sign-in (email OR OAuth). Reads the
  // users_profile row and restores firstRunComplete + tier + userProfile
  // to local state. Without this, a returning user whose AsyncStorage was
  // cleared by sign-out gets pushed back through onboarding even though
  // they completed it months ago — the cloud row is the source of truth.
  // Writes to AsyncStorage directly (not via completeFirstRun) so we don't
  // round-trip the just-read value back to Supabase.
  restoreSessionFromCloud: async (supabaseUserId) => {
    if (!supabaseUserId) return;
    // eslint-disable-next-line global-require
    const log = require('../lib/errorLog');
    log.logInfo('restoreSessionFromCloud.start', `uid=${supabaseUserId}`, { uid: supabaseUserId });

    // Mark the cloud restore as in-flight so the navigator doesn't route
    // on stale local state (the wizard-flash bug). Without this, the
    // ~8s cloud read window let the navigator see tier='pro' AND
    // firstRunComplete=false → mount ProOnboardingStack briefly. The
    // user starts filling the wizard, then cloud returns
    // firstRunComplete=true and the stack unmounts mid-fill. Splash
    // stays up until we know the resolved cloud state.
    set({ restoringSession: true });

    // Beta tier policy — set tier='pro' UP FRONT before any cloud reads.
    // This must happen regardless of whether the cloud profile row exists
    // (fresh signups don't have one yet; deleted-but-unpurged accounts
    // never get one back). Doing it conditionally on cloudData.tier was
    // the bug — it left tier='free' or null in the very cases where Pro
    // needed to persist most.
    // eslint-disable-next-line global-require
    const { PRO_BETA_ACTIVE } = require('../lib/proGate');
    if (PRO_BETA_ACTIVE) {
      try { await AsyncStorage.setItem(TIER_KEY, 'pro'); } catch (_) {}
      set({ tier: 'pro', tierChecked: true });
      log.logInfo('restoreSessionFromCloud.betaPro', 'forced tier=pro');
    }

    let cloudData = null;
    try {
      // eslint-disable-next-line global-require
      const { getSupabaseClient } = require('../lib/supabase');
      const sb = getSupabaseClient();
      if (!sb) { set({ restoringSession: false }); return; }
      const { data } = await sb
        .from('users_profile')
        .select('first_name, training_focus, training_age, primary_equipment, units, bar_weight, tier, first_run_complete')
        .eq('id', supabaseUserId)
        .maybeSingle();
      cloudData = data;
    } catch (_) {
      // Offline / RLS denied — fall through with cloudData=null. Tier is
      // already set above; just skip the profile restore.
    }

    // Missing cloud row entirely.
    //   (a) Fresh signup — auth.users row exists, profile row hasn't been
    //       created yet by syncProfile. firstRunComplete=false locally;
    //       leave it false so they complete onboarding.
    //   (b) Deleted account whose auth.users row wasn't purged.
    //       clearAuthStateForSignOut already cleared firstRunComplete.
    if (!cloudData) {
      log.logInfo('restoreSessionFromCloud.noProfile', 'cloud profile missing — leaving firstRun local-side');
      set({ restoringSession: false });
      return;
    }

    // We have a cloud profile. Restore firstRunComplete + userProfile
    // even if cloudData.tier is empty — previously the guard was
    //   if (!cloudData || !cloudData.tier) return
    // which silently dropped firstRunComplete for users whose tier
    // column was null (legacy rows, or rows created before tier was
    // tracked). Sign-out → sign-in then routed them through
    // ProOnboardingStack again because firstRunComplete=false.
    //
    // Tier handling below is a no-op during beta (already forced 'pro'
    // up top) — kept for post-beta correctness.
    if (cloudData.tier) {
      // eslint-disable-next-line global-require
      const { PRO_BETA_ACTIVE } = require('../lib/proGate');
      const effectiveTier = PRO_BETA_ACTIVE ? 'pro' : cloudData.tier;
      try { await AsyncStorage.setItem(TIER_KEY, effectiveTier); } catch (_) {}
      set({ tier: effectiveTier, tierChecked: true });
    }

    // Only restore userProfile if local is empty — don't overwrite a
    // richer local profile with the thinner column-flattened cloud copy.
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

    if (cloudData.first_run_complete) {
      try { await AsyncStorage.setItem(FIRST_RUN_KEY, 'true'); } catch (_) {}
      set({ firstRunComplete: true, firstRunChecked: true });
      log.logInfo('restoreSessionFromCloud.firstRunRestored', 'true (from cloud)');
    }

    // Cloud state resolved — release the routing gate. Navigator now
    // routes based on the freshly-restored firstRunComplete + tier.
    set({ restoringSession: false });
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
    try {
      await AsyncStorage.setItem(FIRST_RUN_KEY, 'false');
    } catch (_e) {}
    set({ firstRunComplete: false, firstRunChecked: true });
    require('../lib/errorLog').logInfo('useAppStore.resetFirstRun', 'firstRunComplete → false');
    return { ok: true };
  },

  completeFirstRun: async () => {
    try {
      await AsyncStorage.setItem(FIRST_RUN_KEY, 'true');
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

  addSetToCurrentExercise: (setData) => {
    set((state) => {
      const entry = state.workoutExercises[state.currentExerciseIndex];
      if (!entry) return {};
      const updated = state.workoutExercises.slice();
      updated[state.currentExerciseIndex] = {
        ...entry,
        sets: [...(entry.sets || []), setData],
      };
      return { workoutExercises: updated };
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
      try { await AsyncStorage.setItem(PROFILE_KEY_PFX + user.id, JSON.stringify(updated)); } catch (_) {}
      set({ userProfile: updated });
    }
  },

  // Body weight units — 'st' | 'kg' | 'lbs'. Default 'st' (UK convention).
  bodyWeightUnits: 'st',
  setBodyWeightUnits: async (bwu) => {
    set({ bodyWeightUnits: bwu });
    const { user, userProfile } = get();
    if (user?.id) {
      const updated = { ...(userProfile || {}), bodyWeightUnits: bwu };
      try { await AsyncStorage.setItem(PROFILE_KEY_PFX + user.id, JSON.stringify(updated)); } catch (_) {}
      set({ userProfile: updated });
    }
  },

  // Bar weight for plate calculator — persisted alongside units
  barWeight: 20,
  setBarWeight: async (w) => {
    set({ barWeight: w });
    const { user, userProfile } = get();
    if (user?.id) {
      const updated = { ...(userProfile || {}), barWeight: w };
      try { await AsyncStorage.setItem(PROFILE_KEY_PFX + user.id, JSON.stringify(updated)); } catch (_) {}
      set({ userProfile: updated });
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
    try { await AsyncStorage.setItem(A11Y_PREFS_KEY, JSON.stringify(next)); } catch (_) {}
  },
}));

export default useAppStore;
