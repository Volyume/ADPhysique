import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_USER_KEY   = '@volyume_local_user_id';
const FIRST_RUN_KEY    = '@volyume_first_run_complete';
const PROFILE_KEY_PFX  = '@volyume_user_profile_';

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

  // Creates or restores a local (offline) user from AsyncStorage, then loads their saved profile
  initLocalUser: async () => {
    try {
      let userId = await AsyncStorage.getItem(LOCAL_USER_KEY);
      if (!userId) {
        userId = generateUUID();
        await AsyncStorage.setItem(LOCAL_USER_KEY, userId);
      }
      const localUser = { id: userId, email: 'local@device', isLocal: true };
      // Restore onboarding selections (trainingFocus, trainingAgeYears, primaryEquipment, units)
      const raw = await AsyncStorage.getItem(PROFILE_KEY_PFX + userId).catch(() => null);
      const profile = raw ? JSON.parse(raw) : null;
      set({
        user: localUser,
        userProfile: profile,
        units: profile?.units || 'kg',
        barWeight: profile?.barWeight || 20,
        isAuthLoading: false,
      });
      return localUser;
    } catch (e) {
      console.error('initLocalUser failed:', e);
    }
  },

  // Persists userProfile to AsyncStorage so it survives app restarts for local users
  saveLocalProfile: async (userId, profile) => {
    try {
      await AsyncStorage.setItem(PROFILE_KEY_PFX + userId, JSON.stringify(profile));
    } catch (_) {}
    set({ userProfile: profile });
  },

  // Clears local user from AsyncStorage and store
  clearLocalUser: async () => {
    await AsyncStorage.removeItem(LOCAL_USER_KEY);
    set({ user: null, session: null });
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

  addExerciseToWorkout: (exercise, routineExercise = null) => {
    const { workoutExercises } = get();
    set({
      workoutExercises: [
        ...workoutExercises,
        { exercise, routineExercise, sets: [] },
      ],
    });
  },

  addSetToCurrentExercise: (setData) => {
    const { workoutExercises, currentExerciseIndex } = get();
    const entry = workoutExercises[currentExerciseIndex];
    if (!entry) return;
    const updated = [...workoutExercises];
    updated[currentExerciseIndex] = {
      ...entry,
      sets: [...(entry.sets || []), setData],
    };
    set({ workoutExercises: updated });
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
    const { restTimerActive, restTimerRemaining } = get();
    if (restTimerActive) set({ restTimerRemaining: restTimerRemaining + seconds });
  },
  tickRestTimer: () => {
    const { restTimerRemaining } = get();
    if (restTimerRemaining <= 1) {
      set({ restTimerActive: false, restTimerRemaining: 0 });
    } else {
      set({ restTimerRemaining: restTimerRemaining - 1 });
    }
  },

  // PR Celebration (kept for future; Stage 1 shows simple alert)
  prCelebration: null,
  showPRCelebration: (pr) => set({ prCelebration: pr }),
  hidePRCelebration: () => set({ prCelebration: null }),

  // Units — persisted to AsyncStorage so Settings changes survive restarts
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
