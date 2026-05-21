import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  isAuthLoading: true,

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
        try { profile = JSON.parse(raw); }
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
      tierChecked: false,
      firstRunComplete: false,
      firstRunChecked: false,
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

  setTier: async (tier) => {
    try { await AsyncStorage.setItem(TIER_KEY, tier); } catch (_) {}
    set({ tier });
  },

  // Called after cloud sign-in: reads tier from Supabase and uses it as the
  // authoritative value. During beta this is a no-op (Supabase tier = 'pro').
  // After beta, this becomes the enforcement point — server wins.
  refreshTierFromCloud: async (supabaseClient, supabaseUserId) => {
    if (!supabaseClient || !supabaseUserId) return;
    try {
      const { data } = await supabaseClient
        .from('users_profile')
        .select('tier')
        .eq('id', supabaseUserId)
        .maybeSingle();
      if (data?.tier) {
        await AsyncStorage.setItem(TIER_KEY, data.tier);
        set({ tier: data.tier });
      }
    } catch (_) {}
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

  completeFirstRun: async () => {
    try {
      await AsyncStorage.setItem(FIRST_RUN_KEY, 'true');
    } catch (_e) {}
    set({ firstRunComplete: true });
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

  startWorkout: (workout, initialExercises = []) => set({
    activeWorkout: workout,
    workoutExercises: initialExercises,
    currentExerciseIndex: 0,
    workoutStartTime: Date.now(),
    lastActivityAt: Date.now(),
  }),

  endWorkout: () => set({
    activeWorkout: null,
    workoutExercises: [],
    currentExerciseIndex: 0,
    workoutStartTime: null,
    restTimerActive: false,
    lastActivityAt: null,
  }),

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
}));

export default useAppStore;
