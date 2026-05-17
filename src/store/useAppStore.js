import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_USER_KEY = '@volyume_local_user_id';

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

  // Creates or restores a local (offline) user from AsyncStorage
  initLocalUser: async () => {
    try {
      let userId = await AsyncStorage.getItem(LOCAL_USER_KEY);
      if (!userId) {
        userId = generateUUID();
        await AsyncStorage.setItem(LOCAL_USER_KEY, userId);
      }
      const localUser = { id: userId, email: 'local@device', isLocal: true };
      set({ user: localUser, isAuthLoading: false });
      return localUser;
    } catch (e) {
      console.error('initLocalUser failed:', e);
    }
  },

  // Clears local user from AsyncStorage and store
  clearLocalUser: async () => {
    await AsyncStorage.removeItem(LOCAL_USER_KEY);
    set({ user: null, session: null });
  },

  // Active workout
  activeWorkout: null,
  workoutExercises: [],
  currentExerciseIndex: 0,
  workoutStartTime: null,
  lastActivityAt: null,

  setActiveWorkout: (workout) => set({ activeWorkout: workout }),
  setWorkoutExercises: (workoutExercises) => set({ workoutExercises }),
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
    const updated = [...workoutExercises];
    updated[currentExerciseIndex] = {
      ...updated[currentExerciseIndex],
      sets: [...(updated[currentExerciseIndex].sets || []), setData],
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

  // Units
  units: 'kg',
  setUnits: (units) => set({ units }),

  // Bar weight for plate calculator
  barWeight: 20,
  setBarWeight: (w) => set({ barWeight: w }),
}));

export default useAppStore;
