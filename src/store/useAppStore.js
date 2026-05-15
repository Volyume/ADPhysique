import { create } from 'zustand';
import { database } from '../lib/database';
import { supabase } from '../lib/supabase';

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

  // Active workout
  activeWorkout: null,
  workoutExercises: [],       // [{ exercise, routineExercise?, sets: [] }]
  currentExerciseIndex: 0,
  workoutStartTime: null,

  setActiveWorkout: (workout) => set({ activeWorkout: workout }),
  setWorkoutExercises: (workoutExercises) => set({ workoutExercises }),
  setCurrentExerciseIndex: (i) => set({ currentExerciseIndex: i }),

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

  startWorkout: (workout) => set({
    activeWorkout: workout,
    workoutExercises: [],
    currentExerciseIndex: 0,
    workoutStartTime: Date.now(),
  }),

  endWorkout: () => set({
    activeWorkout: null,
    workoutExercises: [],
    currentExerciseIndex: 0,
    workoutStartTime: null,
    restTimerActive: false,
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
  tickRestTimer: () => {
    const { restTimerRemaining } = get();
    if (restTimerRemaining <= 1) {
      set({ restTimerActive: false, restTimerRemaining: 0 });
    } else {
      set({ restTimerRemaining: restTimerRemaining - 1 });
    }
  },

  // PR Celebration
  prCelebration: null,
  showPRCelebration: (pr) => set({ prCelebration: pr }),
  hidePRCelebration: () => set({ prCelebration: null }),

  // Units
  units: 'kg',
  setUnits: (units) => set({ units }),

  // Plate calculator bar weight
  barWeight: 20,
  setBarWeight: (w) => set({ barWeight: w }),
}));

export default useAppStore;
