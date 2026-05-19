import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  BackHandler,
  AppState,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import SetEntry from '../components/SetEntry';
import RestTimer from '../components/RestTimer';
import useAppStore from '../store/useAppStore';
import { getAllCompletedSetsForExercise, createWorkoutSet, updateWorkout, getAllExercises, insertExercise, getCurrentMesocycleWeek, getPlannedMuscleVolume, getWeek1SetsForExercise, getLastNWorkoutSets } from '../lib/database';
import {
  detectPR,
  getProgressionSuggestion,
  computeSetTargets,
  calculate1RM,
  calculateTonnage,
  MUSCLE_DISPLAY_NAMES,
  generateDeloadPrescription,
} from '../lib/algorithms';
import { rankSwaps } from '../lib/swapEngine';
import { FORM_TIPS } from '../lib/formTips';
import InfoTooltip from '../components/InfoTooltip';
import { applyTimeCrunch } from '../lib/mesocycle';
import { getTimeCrunchMessage } from '../lib/whyThisTemplates';
import { estimateWorkoutMinutes } from '../lib/planEngine';

const DEFAULT_SET = { weight: '', reps: 8, setType: 'straight', notes: '', rir: 2 };

const SET_TYPE_DISPLAY = {
  straight: 'Working',
  warmup: 'Warm-up',
  dropset: 'Drop Set',
  amrap: 'Working',
  myo_reps: 'Working',
  rest_pause: 'Working',
  superset: 'Working',
};

const SET_TYPE_OPTIONS = [
  { value: 'straight', label: 'Working', description: 'Counts toward your weekly volume. Use for all main sets.' },
  { value: 'warmup', label: 'Warm-up', description: 'Preparation set. Does not count toward weekly volume.' },
  { value: 'dropset', label: 'Drop Set', description: 'Reduced load after a working set. Counts toward weekly volume.' },
];

// Returns the set to use as the rep-progression anchor.
// If the same-indexed set was lighter than the session best, anchor to the best set
// so the pre-fill targets beating the overall high-water mark, not just that slot's history.
function getBestAnchorSet(sets, workingIdx) {
  if (!sets || sets.length === 0) return null;
  const working = sets.filter(s => (s.setType ?? s.set_type ?? 'straight') !== 'warmup');
  const indexed = working[workingIdx] ?? null;
  const best = working.reduce((b, s) => (!b || (s.weight || 0) > (b.weight || 0)) ? s : b, null);
  if (!indexed || !best || (indexed.weight || 0) >= (best.weight || 0)) return indexed ?? best;
  return best;
}

// Drop sets count for weekly volume but NOT toward the set-target progress.
// Only straight, amrap, myo-reps, rest-pause and superset sets tick the target counter.
function countProgressSets(sets) {
  return sets.filter(s => {
    const t = s.setType ?? s.set_type ?? 'straight';
    return t !== 'warmup' && t !== 'dropset';
  }).length;
}

export default function ActiveWorkoutScreen({ navigation, route }) {
  const store = useAppStore();
  const {
    user, units, activeWorkout, workoutExercises, currentExerciseIndex,
    setCurrentExerciseIndex, addExerciseToWorkout, addSetToCurrentExercise,
    startRestTimer, showPRCelebration, endWorkout, workoutStartTime,
    lastActivityAt, updateLastActivity,
  } = store;

  const [currentSet, setCurrentSet] = useState({ ...DEFAULT_SET });
  const [prevSets, setPrevSets] = useState([]);
  const [allTimeSets, setAllTimeSets] = useState([]);
  const [loggedSets, setLoggedSets] = useState([]);
  const [detectedPRs, setDetectedPRs] = useState([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progression, setProgression] = useState(null);
  const [setTargets, setSetTargets] = useState([]);
  const [targetReason, setTargetReason] = useState(null);
  const [showSetTypePicker, setShowSetTypePicker] = useState(false);
  const [showExecution, setShowExecution] = useState(false);
  const [showStaleModal, setShowStaleModal] = useState(false);
  const [addedMsg, setAddedMsg] = useState('');
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapCandidates, setSwapCandidates] = useState([]);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [timeCrunchActive, setTimeCrunchActive] = useState(false);
  const [timeCrunchMsg, setTimeCrunchMsg] = useState('');
  const [preCrunchSnapshot, setPreCrunchSnapshot] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState(null);  // { plannedSets, muscle } for this exercise
  const [weeklyActual, setWeeklyActual] = useState(0); // sets this week for this muscle
  const [isDeloadWeek, setIsDeloadWeek] = useState(false);
  const [deloadDismissed, setDeloadDismissed] = useState(false);
  const autoAdvanceRef = useRef(null);
  const sessionSetsRef = useRef([]);   // tracks sets in this session — used for PR detection

  const scrollRef = useRef(null);
  const insets = useSafeAreaInsets();
  const timerRef = useRef(null);

  // First-use info tip highlight
  const [showInfoTipPulse, setShowInfoTipPulse] = useState(false);
  const infoPulseAnim = useRef(new Animated.Value(1)).current;
  const infoPulseLoop = useRef(null);

  const currentEntry = workoutExercises[currentExerciseIndex];
  const exercise = currentEntry?.exercise;
  const routineExercise = currentEntry?.routineExercise;
  const isLastExercise = currentExerciseIndex === workoutExercises.length - 1;

  function handleNextExercise() {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    setCurrentExerciseIndex(currentExerciseIndex + 1);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
  }

  function handleRemoveExercise() {
    if (workoutExercises.length <= 1) {
      Alert.alert('Cannot remove', 'This is the only exercise in your session.');
      return;
    }
    Alert.alert(
      'Remove exercise?',
      `Remove ${exercise.name} from this session. Your plan is not changed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
            const store = useAppStore.getState();
            const updated = workoutExercises.filter((_, i) => i !== currentExerciseIndex);
            store.setWorkoutExercises(updated);
            setCurrentExerciseIndex(Math.min(currentExerciseIndex, updated.length - 1));
            setLoggedSets([]);
            setPrevSets([]);
            setAllTimeSets([]);
            sessionSetsRef.current = [];
          },
        },
      ],
    );
  }

  async function handleOpenSwap() {
    const allExercises = await getAllExercises();
    const alreadyInWorkout = workoutExercises.map(e => e.exercise?.id).filter(Boolean);
    const ranked = rankSwaps(exercise, allExercises, { excludeIds: alreadyInWorkout, numResults: 8 });
    setSwapCandidates(ranked);
    setShowSwapModal(true);
  }

  function handleConfirmSwap(newExercise) {
    const store = useAppStore.getState();
    const updatedExercises = [...workoutExercises];
    updatedExercises[currentExerciseIndex] = {
      ...updatedExercises[currentExerciseIndex],
      exercise: newExercise,
      sets: [],
    };
    store.setWorkoutExercises(updatedExercises);
    setSwapCandidates([]);
    setShowSwapModal(false);
    setPrevSets([]);
    setAllTimeSets([]);
    setLoggedSets([]);
    sessionSetsRef.current = [];
    setProgression(null);
  }

  function handleCancelWorkout() {
    const store = useAppStore.getState();
    const totalSets = store.workoutExercises.reduce((sum, e) => sum + e.sets.length, 0);
    if (totalSets === 0) {
      store.endWorkout();
      navigation.goBack();
    } else {
      setShowDiscardModal(true);
    }
  }

  // Hardware back → cancel flow
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCancelWorkout();
      return true;
    });
    return () => sub.remove();
  }, []);

  // Stale workout check (>4h since last activity)
  useEffect(() => {
    if (lastActivityAt && Date.now() - lastActivityAt > 4 * 60 * 60 * 1000) {
      setShowStaleModal(true);
    }
  }, []);

  // First-use info tip: pulse the Info button until tapped
  useEffect(() => {
    AsyncStorage.getItem('@volyume_seen_workout_info').then(val => {
      if (val === 'true') return;
      setShowInfoTipPulse(true);
      infoPulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(infoPulseAnim, { toValue: 1.35, duration: 700, useNativeDriver: true }),
          Animated.timing(infoPulseAnim, { toValue: 1.0,  duration: 700, useNativeDriver: true }),
        ])
      );
      infoPulseLoop.current.start();
    });
    return () => { infoPulseLoop.current?.stop(); };
  }, []);

  // Workout timer — always derived from workoutStartTime so backgrounding never
  // causes drift. Re-syncs on every tick and on app-foreground events.
  useEffect(() => {
    if (!workoutStartTime) return;

    function syncElapsed() {
      setElapsedSeconds(Math.floor((Date.now() - workoutStartTime) / 1000));
    }

    syncElapsed();
    timerRef.current = setInterval(syncElapsed, 1000);

    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') syncElapsed();
    });

    return () => {
      clearInterval(timerRef.current);
      appStateSub.remove();
    };
  }, [workoutStartTime]);

  // Load previous performance and set defaults when exercise changes
  useEffect(() => {
    if (!exercise || !activeWorkout) return;
    sessionSetsRef.current = [];

    async function loadHistory() {
      const [lastN, allTime] = await Promise.all([
        getLastNWorkoutSets(exercise.id, activeWorkout.id, 2),
        getAllCompletedSetsForExercise(exercise.id, activeWorkout.id),
      ]);
      const prev = lastN[0] || [];
      const prevPrev = lastN[1] || [];
      setPrevSets(prev);
      setAllTimeSets(allTime);

      // Layoff detection: last session was more than 7 days ago
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      const lastTs = prev.reduce((m, s) => Math.max(m, s.createdAt ?? s.created_at ?? 0), 0);
      const layoffMultiplier = lastTs > 0 && (Date.now() - lastTs) > SEVEN_DAYS ? 0.9 : 1.0;

      const allLoggedForExercise = workoutExercises[currentExerciseIndex]?.sets || [];
      setLoggedSets(allLoggedForExercise);

      // Compute per-set targets for next session
      const { targets: computed, reason: computedReason } = computeSetTargets(
        prev,
        routineExercise?.recommendedRepsMin,
        routineExercise?.recommendedRepsMax,
        units,
        {
          exerciseCategory: exercise?.exerciseCategory || exercise?.exercise_category || 'compound',
          incrementKg: exercise?.incrementKg || exercise?.increment_kg || null,
          prevPrevSets: prevPrev,
          layoffMultiplier,
        },
      );
      setSetTargets(computed);
      setTargetReason(computedReason);

      // Pre-fill: use target for the current working set position.
      // Reps: prefer (prev session reps + 1) when it sits inside the target range
      // so the input starts at the beat-chip suggestion, not the range floor.
      const currentWorkingCount = allLoggedForExercise.filter(s => s.setType !== 'warmup').length;
      const currentTarget = computed[currentWorkingCount];
      if (currentTarget) {
        const prevSet = getBestAnchorSet(prev, currentWorkingCount);
        const beatRep = prevSet ? prevSet.actualReps + 1 : null;
        const prefillReps = (beatRep && beatRep >= currentTarget.repsMin && beatRep <= currentTarget.repsMax)
          ? beatRep
          : currentTarget.repsMin;
        setCurrentSet({
          ...DEFAULT_SET,
          weight: currentTarget.weight,
          reps: prefillReps,
        });
      } else if (prev.length > 0) {
        const lastSet = prev[prev.length - 1];
        setCurrentSet({
          ...DEFAULT_SET,
          weight: lastSet.weight != null ? lastSet.weight : '',
          reps: lastSet.actualReps || DEFAULT_SET.reps,
        });
      } else {
        setCurrentSet({
          ...DEFAULT_SET,
          weight: routineExercise?.startingWeight ?? '',
          reps: routineExercise?.recommendedRepsMax || DEFAULT_SET.reps,
        });
      }

      // Auto-select warmup type if no sets logged yet for this exercise
      if (allLoggedForExercise.length === 0) {
        const prevWorking = prev.filter(s => s.setType !== 'warmup');
        const baseWeight = prevWorking.length > 0
          ? prevWorking[prevWorking.length - 1].weight
          : (routineExercise?.startingWeight ?? 0);
        const warmupWeight = baseWeight ? Math.round(baseWeight * 0.5 * 2) / 2 : '';
        setCurrentSet(cs => ({
          ...cs,
          setType: 'warmup',
          weight: warmupWeight || cs.weight,
          // A general warmup is light weight for ~10 reps regardless of the
          // working rep target — high-rep warmups before low-rep work are
          // illogical, so keep this a clean fixed default.
          reps: 10,
        }));
      }

      // Load planned volume for this exercise's muscle this week
      try {
        const currentWeek = await getCurrentMesocycleWeek(user?.id);
        if (currentWeek) {
          const plannedVols = await getPlannedMuscleVolume(currentWeek.id);
          const primaryMuscle = (exercise.primaryMuscle || exercise.primary_muscle || '').toLowerCase();
          const plan = plannedVols.find(p => p.muscle === primaryMuscle);
          setWeeklyPlan(plan ? { plannedSets: plan.planned_sets, muscle: plan.muscle } : null);

          // Count actual working sets logged this week for this muscle
          const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const weekSets = allTime.filter(s =>
            s.setType !== 'warmup' && s.createdAt >= weekAgo
          );
          setWeeklyActual(weekSets.length);

          setIsDeloadWeek(!!currentWeek.isDeload);

          // If this is a deload week, generate deload prescription from week-1 sets
          if (currentWeek.isDeload && currentWeek.mesocycleId && exercise?.id) {
            const week1Sets = await getWeek1SetsForExercise(currentWeek.mesocycleId, exercise.id);
            if (week1Sets.length > 0) {
              // Use first-half prescription (week-1 weight, 50% reps) as default
              const deloadTargets = generateDeloadPrescription(week1Sets, true);
              if (deloadTargets.length > 0) {
                const firstDeload = deloadTargets[0];
                setCurrentSet(cs => ({
                  ...cs,
                  weight: firstDeload.weight,
                  reps: firstDeload.reps,
                  rir: firstDeload.rir,
                }));
                // Store deload targets in setTargets shape so the inline chip renders them
                setSetTargets(deloadTargets.map(t => ({
                  weight: t.weight,
                  repsMin: t.reps,
                  repsMax: t.reps,
                  action: 'deload',
                  isDeload: true,
                })));
                setTargetReason('Recovery week: very easy effort, full recovery focus.');
              }
            }
          }
        }
      } catch (_e) {}
    }

    loadHistory();
  }, [exercise?.id, currentExerciseIndex]);

  useEffect(() => {
    if (prevSets.length > 0 && currentSet.weight && currentSet.reps) {
      const suggestion = getProgressionSuggestion(
        [currentSet],
        prevSets,
        routineExercise?.recommendedRepsMin,
        routineExercise?.recommendedRepsMax,
        units,
      );
      setProgression(suggestion);
    }
  }, [currentSet.weight, currentSet.reps, prevSets]);

  async function handleCompleteSet() {
    if (!exercise || !activeWorkout) return;
    if (!currentSet.reps || currentSet.reps < 1) {
      Alert.alert('Enter reps', 'Please enter the number of reps completed.');
      return;
    }
    // Weight is required unless this is a bodyweight movement. A blank or
    // non-numeric field means the user hasn't entered a load yet — block
    // rather than silently saving a 0 kg set.
    const isBodyweight = /body\s*weight/i.test(exercise.equipment || '');
    const weightNum = parseFloat(currentSet.weight);
    if (!isBodyweight && (currentSet.weight === '' || currentSet.weight == null || isNaN(weightNum))) {
      Alert.alert('Enter weight', `Enter the weight used (in ${units}) before completing this set.`);
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const setNumber = loggedSets.length + 1;

      const savedSet = await createWorkoutSet({
        userId: user.id,
        workoutId: activeWorkout.id,
        exerciseId: exercise.id,
        setNumber,
        setType: currentSet.setType || 'straight',
        targetRepsMin: routineExercise?.recommendedRepsMin ?? null,
        targetRepsMax: routineExercise?.recommendedRepsMax ?? null,
        actualReps: parseInt(currentSet.reps, 10),
        weight: parseFloat(currentSet.weight) || 0,
        rir: currentSet.rir != null ? parseInt(currentSet.rir, 10) : null,
        rpe: null,
        failed: false,
        notes: noteText || null,
        isAmrap: currentSet.setType === 'amrap',
      });

      const setData = {
        id: savedSet.id,
        exerciseId: exercise.id,
        workoutId: activeWorkout.id,
        setNumber,
        setType: currentSet.setType,
        actualReps: parseInt(currentSet.reps, 10),
        weight: parseFloat(currentSet.weight) || 0,
        rir: currentSet.rir ?? null,
        rpe: null,
      };

      const newLoggedSets = [...loggedSets, setData];
      setLoggedSets(newLoggedSets);
      addSetToCurrentExercise(setData);

      // PR Detection — check BEFORE adding current set to the session ref so it
      // can never match itself.  sessionSetsRef is a plain ref so it's never stale
      // the way React state can be between renders.
      const prHistory = [
        ...allTimeSets,
        ...sessionSetsRef.current.filter(s => s.exerciseId === exercise.id),
      ];
      sessionSetsRef.current = [...sessionSetsRef.current, setData];
      const prs = detectPR(setData, prHistory, exercise, units);
      if (prs.length > 0) {
        showPRCelebration({ ...prs[0], exerciseName: exercise.name });
        setDetectedPRs(prev => [...prev, ...prs.map(p => ({ ...p, exerciseName: exercise.name, units }))]);
      }

      // Recalculate suggestion
      const suggestion = getProgressionSuggestion(
        newLoggedSets,
        prevSets,
        routineExercise?.recommendedRepsMin,
        routineExercise?.recommendedRepsMax,
        units,
      );
      setProgression(suggestion);

      // Pre-fill next set from per-set targets (same beat-rep logic as initial load)
      if (currentSet.setType !== 'warmup') {
        const nextWorkingCount = countProgressSets(newLoggedSets);
        const nextTarget = setTargets[nextWorkingCount];
        if (nextTarget) {
          const prevSetForNext = getBestAnchorSet(prevSets, nextWorkingCount);
          const beatRep = prevSetForNext ? prevSetForNext.actualReps + 1 : null;
          const prefillReps = (beatRep && beatRep >= nextTarget.repsMin && beatRep <= nextTarget.repsMax)
            ? beatRep
            : nextTarget.repsMin;
          setCurrentSet(cs => ({ ...cs, weight: nextTarget.weight, reps: prefillReps }));
        }
      }

      // Update last activity timestamp
      updateLastActivity();

      // Start rest timer with per-exercise duration
      startRestTimer(routineExercise?.restSeconds || 90);

      // Auto-advance to next exercise when target sets just completed
      const newWorkingCount = countProgressSets(newLoggedSets);
      const justHitTarget = targetSets && newWorkingCount >= targetSets && workingLogged < targetSets;
      if (justHitTarget && !isLastExercise) {
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = setTimeout(() => {
          handleNextExercise();
        }, 1800);
      }

      // Prepare next set
      setNoteText('');
      setShowNoteInput(false);
      // After a drop set, revert to straight so the count stays clean
      if (currentSet.setType === 'dropset') {
        setCurrentSet(cs => ({ ...cs, setType: 'straight' }));
      }
      // If warmup was just completed, auto-switch to straight (working) and pre-fill from first target
      if (currentSet.setType === 'warmup') {
        const firstTarget = setTargets[0];
        if (firstTarget) {
          const anchorSet0 = getBestAnchorSet(prevSets, 0);
          const beatRep = anchorSet0 ? anchorSet0.actualReps + 1 : null;
          const prefillReps = (beatRep && beatRep >= firstTarget.repsMin && beatRep <= firstTarget.repsMax)
            ? beatRep
            : firstTarget.repsMin;
          setCurrentSet(cs => ({
            ...cs,
            setType: 'straight',
            weight: firstTarget.weight,
            reps: prefillReps,
          }));
        } else {
          setCurrentSet(cs => ({
            ...cs,
            setType: 'straight',
            reps: routineExercise?.recommendedRepsMin || 8,
          }));
        }
      }
    } finally {
      setSaving(false);
    }
  }

  function handleRevertTimeCrunch() {
    if (!preCrunchSnapshot) return;
    store.setWorkoutExercises(preCrunchSnapshot);
    setTimeCrunchActive(false);
    setTimeCrunchMsg('');
    setPreCrunchSnapshot(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleTimeCrunch() {
    if (timeCrunchActive) return;
    setPreCrunchSnapshot([...workoutExercises]);
    const remainingExercises = workoutExercises.slice(currentExerciseIndex);
    if (!remainingExercises.length) return;

    // Build exercise list in planEngine format for estimator
    const asExercises = remainingExercises.map(e => ({
      exerciseName:       e.exercise?.name ?? '',
      sets:               Math.max(1, (e.exercise?.recommendedSets ?? 3) - e.sets.length),
      restSec:            e.exercise?.restSec ?? 90,
      compoundIsolation:  e.exercise?.compoundIsolation ?? 'isolation',
    }));

    // Target: fit remaining in half of a standard session (≈ 25 min max)
    const targetMins = 25;
    const { exercises: trimmed, restReduction, dropped } = applyTimeCrunch(
      asExercises,
      targetMins,
      (exs) => exs.reduce((t, ex) => t + (ex.sets * (ex.restSec / 60 + 0.75)), 0)
    );

    const newEstimate = Math.round(trimmed.reduce((t, ex) => t + (ex.sets * ((ex.restSec ?? 60) / 60 + 0.75)), 0));
    const msg = getTimeCrunchMessage(dropped, restReduction, newEstimate);

    // Apply reduced rest to current session's pending exercises
    const trimmedNames = new Set(trimmed.map(e => e.exerciseName));
    const droppedNames = new Set(dropped);

    if (store.setWorkoutExercises) {
      store.setWorkoutExercises(prev => {
        const updated = [...prev];
        for (let i = currentExerciseIndex; i < updated.length; i++) {
          const name = updated[i].exercise?.name ?? '';
          if (droppedNames.has(name) && updated[i].sets.length === 0) {
            updated[i] = { ...updated[i], _timeCrunchSkipped: true };
          } else if (updated[i].exercise) {
            updated[i] = {
              ...updated[i],
              exercise: {
                ...updated[i].exercise,
                restSec: Math.round((updated[i].exercise.restSec ?? 90) * 0.70),
              },
            };
          }
        }
        return updated;
      });
    }

    setTimeCrunchActive(true);
    setTimeCrunchMsg(msg);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  async function handleFinishWorkout() {
    Alert.alert(
      'Finish Workout?',
      `You've logged ${workoutExercises.reduce((sum, e) => sum + e.sets.length, 0)} sets across ${workoutExercises.length} exercises.`,
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            const allSets = workoutExercises.flatMap(e => e.sets);
            const workingSetCount = allSets.filter(s => s.setType !== 'warmup').length;
            const sessionName = workoutExercises.length > 0
              ? workoutExercises.slice(0, 2).map(e => e.exercise?.name?.split(' ')[0]).filter(Boolean).join(' & ')
              : null;
            await updateWorkout(activeWorkout.id, {
              endedAt: Date.now(),
              durationMinutes: Math.round(elapsedSeconds / 60),
              isCompleted: true,
              name: sessionName,
              setCount: workingSetCount,
              totalVolume: calculateTonnage(allSets),
            });
            endWorkout();
            navigation.replace('WorkoutSummary', {
              workoutId: activeWorkout.id,
              routineId: activeWorkout.routineId || null,
              durationMinutes: Math.round(elapsedSeconds / 60),
              exerciseCount: workoutExercises.length,
              setCount: allSets.length,
              workingSetCount,
              tonnage: calculateTonnage(allSets),
              exerciseNames: workoutExercises.map(e => e.exercise?.name).filter(Boolean),
              detectedPRs,
              exerciseData: workoutExercises.map(e => ({
                exerciseId: e.exercise?.id,
                name: e.exercise?.name,
                recommendedSets: e.sets.filter(s => s.setType !== 'warmup').length || 3,
                repsMin: e.routineExercise?.recommendedRepsMin || 8,
                repsMax: e.routineExercise?.recommendedRepsMax || 12,
                loggedSets: e.sets.map(s => ({
                  weight: s.weight,
                  reps: s.actualReps ?? s.reps,
                  setType: s.setType,
                })),
              })).filter(e => e.exerciseId),
            });
          },
        },
      ],
    );
  }

  const elapsed = {
    mins: Math.floor(elapsedSeconds / 60),
    secs: elapsedSeconds % 60,
  };
  const elapsedStr = `${elapsed.mins}:${elapsed.secs.toString().padStart(2, '0')}`;

  const targetSets = routineExercise?.recommendedSets;
  const workingLogged = countProgressSets(loggedSets);
  const targetComplete = targetSets && workingLogged >= targetSets;

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyExerciseView
          onAdd={() => setShowExercisePicker(true)}
          onFinish={handleFinishWorkout}
          onCancel={handleCancelWorkout}
          elapsed={elapsedStr}
          workoutExercises={workoutExercises}
          setCurrentExerciseIndex={setCurrentExerciseIndex}
          currentExerciseIndex={currentExerciseIndex}
        />
        <ExercisePickerModal
          visible={showExercisePicker}
          onClose={() => setShowExercisePicker(false)}
          onSelect={ex => {
            addExerciseToWorkout(ex);
            setCurrentExerciseIndex(workoutExercises.length);
            setShowExercisePicker(false);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <TouchableOpacity
              onPress={handleCancelWorkout}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Cancel workout"
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.timerText}>{elapsedStr}</Text>
            <Text style={styles.headerMuscle}>
              {(exercise.primaryMuscle || exercise.primary_muscle || '').charAt(0).toUpperCase() +
                (exercise.primaryMuscle || exercise.primary_muscle || '').slice(1)}
            </Text>
          </View>
          <View style={styles.headerSideRight}>
            <TouchableOpacity
              onPress={handleFinishWorkout}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Finish workout"
            >
              <Text style={styles.finishBtn}>Finish</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Exercise Navigator */}
        {workoutExercises.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.exerciseNav}
            contentContainerStyle={styles.exerciseNavContent}
          >
            {workoutExercises.map((entry, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.navTab, i === currentExerciseIndex && styles.navTabActive]}
                onPress={() => setCurrentExerciseIndex(i)}
                accessibilityRole="button"
                accessibilityLabel={entry.exercise?.name || `Exercise ${i + 1}`}
                accessibilityState={{ selected: i === currentExerciseIndex }}
              >
                <Text
                  style={[styles.navTabText, i === currentExerciseIndex && styles.navTabTextActive]}
                  numberOfLines={1}
                >
                  {entry.exercise?.name?.split(' ').slice(0, 2).join(' ')}
                </Text>
                {entry.sets.length > 0 && (
                  <View style={styles.navTabBadge}>
                    <Text style={styles.navTabBadgeText}>{entry.sets.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Exercise Title */}
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseNameRow}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <TouchableOpacity
                style={styles.swapBtn}
                onPress={handleOpenSwap}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Swap exercise"
              >
                <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                <Text style={styles.swapBtnText}>Swap</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.exerciseMuscle}>
              {(exercise.primaryMuscle || exercise.primary_muscle || '').charAt(0).toUpperCase() +
                (exercise.primaryMuscle || exercise.primary_muscle || '').slice(1)} (Primary)
            </Text>
          </View>

          {/* Deload Week Banner */}
          {isDeloadWeek && !deloadDismissed && (
            <View style={styles.deloadBanner}>
              <View style={styles.deloadBannerLeft}>
                <Ionicons name="battery-charging-outline" size={18} color={colors.warning} />
                <View>
                  <Text style={styles.deloadBannerTitle}>Recovery week</Text>
                  <Text style={styles.deloadBannerSub}>Light loads · full recovery · no PRs</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setDeloadDismissed(true)}
                accessibilityRole="button"
                accessibilityLabel="Dismiss deload banner"
              >
                <Text style={styles.deloadSkip}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Previous Performance */}
          <View style={styles.prevCard}>
            <Text style={styles.prevTitle}>Previous session</Text>
            {prevSets.length > 0 ? (
              <>
                <Text style={styles.prevSetsSummary}>
                  {prevSets.map(s => `${s.weight}${units} × ${s.actualReps}`).join('   ')}
                </Text>
                {setTargets.length > 0 && (
                  <View style={styles.setTargetsBlock}>
                    <Text style={styles.setTargetsLabel}>Next session</Text>
                    {setTargets.map((t, i) => (
                      <View key={i} style={styles.setTargetRow}>
                        <Text style={styles.setTargetNum}>Set {i + 1}</Text>
                        <Text style={styles.setTargetVal}>
                          {t.weight}{units} × {t.repsMin === t.repsMax ? t.repsMin : `${t.repsMin}–${t.repsMax}`}
                        </Text>
                        {t.action === 'increase' && (
                          <Ionicons name="trending-up" size={12} color={colors.primary} />
                        )}
                        {t.action === 'decrease' && (
                          <Ionicons name="trending-down" size={12} color={colors.error} />
                        )}
                      </View>
                    ))}
                    {targetReason && (
                      <Text style={styles.setTargetReason}>{targetReason}</Text>
                    )}
                  </View>
                )}
                {!setTargets.length && progression && progression.action !== 'baseline' && (
                  <View style={styles.progressionBadge}>
                    <Ionicons
                      name={progression.action === 'increase_weight' ? 'trending-up' : 'arrow-forward'}
                      size={13}
                      color={colors.primary}
                    />
                    <Text style={styles.progressionText}>{progression.message}</Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.prevEmpty}>No previous logs.</Text>
            )}
          </View>

          {/* Target */}
          {routineExercise && (
            <View style={styles.targetRow}>
              <Ionicons name="flag-outline" size={14} color={colors.textMuted} />
              <Text style={styles.targetText}>
                Target: {routineExercise.recommendedSets || 3} sets · {routineExercise.recommendedRepsMin}–{routineExercise.recommendedRepsMax} reps
              </Text>
            </View>
          )}

          {/* Weekly plan progress */}
          {weeklyPlan && (
            <View style={styles.weeklyPlanRow}>
              <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
              <Text style={styles.weeklyPlanText}>
                {weeklyActual}/{weeklyPlan.plannedSets} sets this week
              </Text>
              <View style={[
                styles.weeklyPlanDot,
                weeklyActual >= weeklyPlan.plannedSets ? styles.dotGreen :
                weeklyActual >= weeklyPlan.plannedSets - 2 ? styles.dotAmber :
                styles.dotMuted,
              ]} />
            </View>
          )}

          {/* Target complete banner */}
          {targetComplete && (
            <View style={styles.targetBanner}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.targetBannerText}>
                Target reached: {targetSets} working set{targetSets !== 1 ? 's' : ''} done
              </Text>
            </View>
          )}

          {/* Exercise added confirmation */}
          {addedMsg ? (
            <View style={styles.addedBanner}>
              <Ionicons name="add-circle" size={14} color={colors.primary} />
              <Text style={styles.addedBannerText}>{addedMsg} added</Text>
            </View>
          ) : null}

          {/* Set Entry */}
          <View style={[
            styles.setEntryCard,
            currentSet.setType === 'warmup' && styles.setEntryCardWarmup,
            currentSet.setType === 'dropset' && styles.setEntryCardDrop,
          ]}>
            {currentSet.setType === 'warmup' && (
              <View style={styles.warmupBanner}>
                <Ionicons name="flame-outline" size={14} color={colors.warning} />
                <Text style={styles.warmupBannerText}>WARM UP · not counted in volume</Text>
              </View>
            )}
            {currentSet.setType === 'warmup' && (() => {
              const targetW = setTargets[0]?.weight || prevSets[0]?.weight || null;
              const kg = targetW ? (Math.round(targetW * 0.50 * 2) / 2) : null;
              return (
                <View style={styles.warmupGuide}>
                  <View style={styles.warmupGuideHeader}>
                    <Text style={styles.warmupGuideTitle}>Feeler set</Text>
                    <InfoTooltip
                      size={13}
                      text="One light set to warm up the movement. Use around 50% of your planned weight for 10–12 easy reps. Focus on feeling the right muscles fire, not tiring them."
                    />
                  </View>
                  <View style={styles.warmupProtocolRow}>
                    <View style={[styles.warmupStep, styles.warmupStepActive]}>
                      <Text style={[styles.warmupStepPct, styles.warmupStepPctActive]}>50%</Text>
                      {kg !== null && (
                        <Text style={styles.warmupStepKg}>{kg}{units}</Text>
                      )}
                      <Text style={styles.warmupStepReps}>× 10–12</Text>
                    </View>
                    {targetW ? (
                      <View style={[styles.warmupStep, styles.warmupStepWorking]}>
                        <Text style={styles.warmupStepPct}>100%</Text>
                        <Text style={styles.warmupStepKg}>{targetW}{units}</Text>
                        <Text style={styles.warmupStepReps}>working</Text>
                      </View>
                    ) : null}
                  </View>
                  {!targetW && (
                    <Text style={styles.warmupNoDataHint}>Weights shown after your first session on this lift.</Text>
                  )}
                </View>
              );
            })()}
            {currentSet.setType === 'dropset' && (
              <View style={styles.dropBanner}>
                <Ionicons name="arrow-down-circle-outline" size={14} color={colors.gold} />
                <Text style={styles.dropBannerText}>Drop set ↓ · lower the weight, keep going</Text>
              </View>
            )}
            <Text style={styles.setEntryTitle}>
              {currentSet.setType === 'warmup'
                ? 'Warm-up set'
                : currentSet.setType === 'dropset'
                  ? `Drop set · after Set ${workingLogged}`
                  : isDeloadWeek
                    ? `Light set ${workingLogged + 1} · Easy`
                    : routineExercise?.recommendedSets
                      ? `Set ${workingLogged + 1} / ${routineExercise.recommendedSets} · ${SET_TYPE_DISPLAY[currentSet.setType] || 'Working'}`
                      : `Set ${workingLogged + 1} · ${SET_TYPE_DISPLAY[currentSet.setType] || 'Working'}`}
            </Text>
            {currentSet.setType !== 'warmup' && setTargets[workingLogged] && (
              <View style={styles.inlineTargetChip}>
                <Ionicons name="flag-outline" size={11} color={colors.primary} />
                <Text style={styles.inlineTargetText}>
                  Target: {setTargets[workingLogged].weight}{units} × {setTargets[workingLogged].repsMin === setTargets[workingLogged].repsMax ? setTargets[workingLogged].repsMin : `${setTargets[workingLogged].repsMin}–${setTargets[workingLogged].repsMax}`}
                  {setTargets[workingLogged].action === 'increase' ? ' ↑' : setTargets[workingLogged].action === 'decrease' ? ' ↓' : ''}
                </Text>
              </View>
            )}
            {currentSet.setType !== 'warmup' && prevSets[workingLogged] && (() => {
              const prev = prevSets[workingLogged];
              const cw = parseFloat(currentSet.weight) || 0;
              const sameWeight = Math.abs(cw - prev.weight) < 0.1;
              return (
                <View style={styles.beatChip}>
                  <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                  <Text style={styles.beatChipText}>
                    {sameWeight
                      ? `Last time: ${prev.weight}${units} × ${prev.actualReps} reps. Can you hit ${prev.actualReps + 1}?`
                      : `Last time: ${prev.weight}${units} × ${prev.actualReps} reps`}
                  </Text>
                </View>
              );
            })()}
            <SetEntry
              value={currentSet}
              onChange={setCurrentSet}
              units={units}
              onOpenSetTypePicker={() => setShowSetTypePicker(true)}
            />

            {showNoteInput ? (
              <TextInput
                style={styles.noteInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Add a note..."
                placeholderTextColor={colors.textMuted}
                multiline
                autoFocus
              />
            ) : null}
          </View>

          {/* Action Buttons */}
          {targetComplete ? (
            <>
              {isLastExercise ? (
                <TouchableOpacity
                  testID="volyume-btn-finish-primary"
                  style={styles.completeBtn}
                  onPress={handleFinishWorkout}
                  accessibilityRole="button"
                  accessibilityLabel="Finish workout"
                >
                  <Ionicons name="checkmark-done" size={20} color={colors.success} />
                  <Text style={styles.completeBtnText}>Finish workout</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  testID="volyume-btn-next-exercise"
                  style={styles.completeBtn}
                  onPress={handleNextExercise}
                  accessibilityRole="button"
                  accessibilityLabel="Move to next exercise"
                >
                  <Ionicons name="arrow-forward-circle" size={20} color={colors.primary} />
                  <Text style={styles.completeBtnText}>Next exercise</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                testID="volyume-btn-extra-set"
                style={[styles.extraSetBtn, saving && styles.btnDisabled]}
                onPress={handleCompleteSet}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Complete extra set"
              >
                <Text style={styles.extraSetBtnText}>+ Complete Extra Set</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              testID="volyume-btn-complete-set"
              style={[styles.completeBtn, saving && styles.btnDisabled, currentSet.setType === 'warmup' && styles.completeBtnWarmup]}
              onPress={handleCompleteSet}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={currentSet.setType === 'warmup' ? 'Log warm-up set' : 'Complete set'}
            >
              <Ionicons name="checkmark-circle" size={20} color={currentSet.setType === 'warmup' ? colors.warning : colors.primary} />
              <Text style={[styles.completeBtnText, currentSet.setType === 'warmup' && styles.completeBtnTextWarmup]}>
                {currentSet.setType === 'warmup' ? 'Log warm-up' : 'Log set'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowNoteInput(v => !v)}
              accessibilityRole="button"
              accessibilityLabel="Add note to set"
            >
              <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.actionBtnText}>Note</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                if (showInfoTipPulse) {
                  infoPulseLoop.current?.stop();
                  infoPulseAnim.setValue(1);
                  setShowInfoTipPulse(false);
                  AsyncStorage.setItem('@volyume_seen_workout_info', 'true').catch(() => {});
                }
                setShowExecution(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="View exercise info"
            >
              <Animated.View style={showInfoTipPulse ? { transform: [{ scale: infoPulseAnim }] } : null}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={showInfoTipPulse ? colors.primary : colors.textSecondary}
                />
              </Animated.View>
              <Text style={[styles.actionBtnText, showInfoTipPulse && { color: colors.primary }]}>Info</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="volyume-btn-add-mid-workout"
              style={styles.actionBtn}
              onPress={() => setShowExercisePicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Add exercise to workout"
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.actionBtnText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={handleRemoveExercise}
              accessibilityRole="button"
              accessibilityLabel="Remove exercise from workout"
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={[styles.actionBtnText, { color: colors.error }]}>Remove</Text>
            </TouchableOpacity>
          </View>

          {/* Rest Timer */}
          <RestTimer />

          {/* Logged Sets */}
          {loggedSets.length > 0 && (
            <View style={styles.loggedSection}>
              <Text style={styles.loggedTitle}>This workout</Text>
              {loggedSets.map((s, i) => {
                const isWarmup = s.setType === 'warmup';
                const isDrop   = s.setType === 'dropset';
                const est1RM = (isWarmup || isDrop) ? null : calculate1RM(s.weight, s.actualReps);
                const progressNum = loggedSets.slice(0, i + 1).filter(x => countProgressSets([x]) > 0).reduce((n, x) => n + 1, 0);
                return (
                  <View key={i} style={[
                    styles.loggedSetRow,
                    isWarmup && styles.loggedSetRowWarmup,
                    isDrop && styles.loggedSetRowDrop,
                  ]}>
                    {isWarmup ? (
                      <Ionicons name="flame" size={14} color={colors.warning} style={{ width: 22, textAlign: 'center' }} />
                    ) : isDrop ? (
                      <Ionicons name="arrow-down-circle" size={16} color={colors.gold} style={{ width: 22, textAlign: 'center' }} />
                    ) : (
                      <View style={styles.setNumBadge}>
                        <Text style={styles.setNumText}>{progressNum}</Text>
                      </View>
                    )}
                    <Text style={[styles.loggedSetText, isWarmup && styles.loggedSetTextWarmup, isDrop && styles.loggedSetTextDrop]}>
                      {s.weight}{units} × {s.actualReps}
                      {isWarmup ? ' · Warm-up' : isDrop ? ' · Drop' : ''}
                    </Text>
                    {!isWarmup && !isDrop && est1RM > 0 && (
                      <Text style={styles.loggedEst1RM}>Est. max ≈{est1RM.toFixed(0)}{units}</Text>
                    )}
                    <Ionicons name="checkmark-circle" size={16} color={isWarmup ? colors.warning : isDrop ? colors.gold : colors.success} />
                  </View>
                );
              })}
            </View>
          )}

          {/* Ghost navigation */}
          {!targetComplete && (
            isLastExercise ? (
              <TouchableOpacity testID="volyume-btn-finish-ghost" style={styles.finishWorkoutLargeBtn} onPress={handleFinishWorkout}>
                <Ionicons name="checkmark-done" size={18} color={colors.success} />
                <Text style={styles.finishWorkoutLargeBtnText}>Finish Workout</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity testID="volyume-btn-next-exercise-ghost" style={styles.nextExerciseBtn} onPress={handleNextExercise}>
                <Text style={styles.nextExerciseBtnText}>Next Exercise</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.primary} />
              </TouchableOpacity>
            )
          )}

          {/* Phase 6: Time Crunch button */}
          {!timeCrunchActive && workoutExercises.length > currentExerciseIndex + 1 && (
            <View style={styles.timeCrunchRow}>
              <TouchableOpacity style={styles.timeCrunchBtn} onPress={handleTimeCrunch} activeOpacity={0.75}>
                <Ionicons name="timer-outline" size={15} color={colors.warning} />
                <Text style={styles.timeCrunchBtnText}>Time crunch today</Text>
              </TouchableOpacity>
              <InfoTooltip
                size={15}
                text={
                  'Shortens your remaining session to fit the time you have left.\n\n' +
                  'Cuts rest times by around 30%, drops any isolation exercises you haven\'t started yet, and keeps everything you\'ve already begun. Your main lifts stay in.\n\n' +
                  'You can undo it straight away if you change your mind.'
                }
              />
            </View>
          )}
          {timeCrunchActive && !!timeCrunchMsg && (
            <View style={styles.timeCrunchActiveBar}>
              <Ionicons name="timer" size={14} color={colors.warning} style={{ marginTop: 2 }} />
              <View style={styles.timeCrunchActiveContent}>
                <Text style={styles.timeCrunchActiveText}>{timeCrunchMsg}</Text>
                <TouchableOpacity style={styles.timeCrunchRevertBtn} onPress={handleRevertTimeCrunch} activeOpacity={0.75}>
                  <Ionicons name="refresh-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.timeCrunchRevertText}>Revert</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: Math.max(spacing.xxl, insets.bottom + spacing.lg) }} />
        </ScrollView>

        {/* Exercise Picker Modal */}
        <ExercisePickerModal
          visible={showExercisePicker}
          onClose={() => setShowExercisePicker(false)}
          onSelect={ex => {
            addExerciseToWorkout(ex);
            setShowExercisePicker(false);
            setAddedMsg(ex.name);
            setTimeout(() => setAddedMsg(''), 2500);
          }}
        />

        {/* Stale workout recovery modal */}
        <Modal visible={showStaleModal} transparent animationType="fade" onRequestClose={() => setShowStaleModal(false)}>
          <View style={styles.staleOverlay}>
            <View style={styles.staleSheet}>
              <Ionicons name="time-outline" size={32} color={colors.warning} style={{ marginBottom: spacing.md }} />
              <Text style={styles.staleTitle}>Resume workout?</Text>
              <Text style={styles.staleBody}>
                This workout has been inactive for a while. What would you like to do?
              </Text>
              <TouchableOpacity style={styles.staleResume} onPress={() => { updateLastActivity(); setShowStaleModal(false); }}>
                <Text style={styles.staleResumeText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.staleFinish} onPress={() => { setShowStaleModal(false); handleFinishWorkout(); }}>
                <Text style={styles.staleFinishText}>Finish Workout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.staleDiscard} onPress={() => {
                Alert.alert('Discard workout?', 'All logged sets will be lost.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: () => {
                      endWorkout();
                      navigation.goBack();
                    },
                  },
                ]);
              }}>
                <Text style={styles.staleDiscardText}>Discard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Set Type Picker Bottom Sheet */}
        <Modal
          visible={showSetTypePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSetTypePicker(false)}
        >
          <TouchableOpacity
            style={styles.sheetOverlay}
            activeOpacity={1}
            onPress={() => setShowSetTypePicker(false)}
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Set type</Text>
            <Text style={styles.sheetExplainer}>
              Working sets count toward your weekly volume. Warm-up sets do not.{'\n'}Use Working for the sets you want to track for progression. Use Warm-up for preparation sets before your main work.
            </Text>
            {SET_TYPE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={styles.sheetOption}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCurrentSet(s => ({ ...s, setType: opt.value }));
                  setShowSetTypePicker(false);
                }}
              >
                <View style={styles.sheetOptionText}>
                  <Text style={[styles.sheetOptionLabel, currentSet.setType === opt.value && styles.sheetOptionLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.sheetOptionDesc}>{opt.description}</Text>
                </View>
                {currentSet.setType === opt.value && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Modal>

        {/* Info / Form Bottom Sheet */}
        <Modal
          visible={showExecution}
          transparent
          animationType="slide"
          onRequestClose={() => setShowExecution(false)}
        >
          <TouchableOpacity
            style={styles.sheetOverlay}
            activeOpacity={1}
            onPress={() => setShowExecution(false)}
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{exercise?.name}</Text>
            {exercise?.primaryMuscle ? (
              <Text style={styles.infoMuscle}>
                {MUSCLE_DISPLAY_NAMES[exercise.primaryMuscle] ?? ((exercise.primaryMuscle || '').charAt(0).toUpperCase() + (exercise.primaryMuscle || '').slice(1).replace('_', ' '))}
                {exercise.equipment ? ` · ${exercise.equipment}` : ''}
              </Text>
            ) : null}
            {routineExercise?.recommendedSets ? (
              <View style={styles.infoTargetRow}>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
                <Text style={styles.infoTarget}>
                  {routineExercise.recommendedSets} sets of {routineExercise.recommendedRepsMin}–{routineExercise.recommendedRepsMax} reps
                </Text>
              </View>
            ) : null}
            <Text style={styles.infoNotesLabel}>How to do it</Text>
            <Text style={styles.infoNotes}>
              {routineExercise?.notes || FORM_TIPS[exercise?.name] || exercise?.notes || 'No specific coaching notes yet. Focus on controlled movement, feel the target muscle working, and stop a couple of reps before you truly can\'t do any more.'}
            </Text>
          </View>
        </Modal>

        {/* Exercise Swap Modal */}
        <Modal visible={showSwapModal} animationType="slide" onRequestClose={() => setShowSwapModal(false)}>
          <SafeAreaView style={styles.swapSafe} edges={['top', 'bottom']}>
            <View style={styles.swapHeader}>
              <Text style={styles.swapTitle}>Swap Exercise</Text>
              <TouchableOpacity onPress={() => setShowSwapModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.swapSubtitle}>
              Replacing: <Text style={{ color: colors.primary }}>{exercise?.name}</Text>
            </Text>
            <Text style={styles.swapNote}>Session-only. Your plan is not changed.</Text>
            <FlatList
              data={swapCandidates}
              keyExtractor={item => item.exercise.id}
              contentContainerStyle={{ padding: spacing.lg }}
              ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.swapItem} onPress={() => handleConfirmSwap(item.exercise)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.swapItemName}>{item.exercise.name}</Text>
                    <Text style={styles.swapItemReason}>{item.reason}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl }}>
                  No similar exercises found.
                </Text>
              }
            />
          </SafeAreaView>
        </Modal>
        {/* Discard Workout Modal */}
        <Modal visible={showDiscardModal} transparent animationType="fade" onRequestClose={() => setShowDiscardModal(false)}>
          <View style={styles.discardOverlay}>
            <View style={styles.discardSheet}>
              <Text style={styles.discardTitle}>Discard workout?</Text>
              <Text style={styles.discardBody}>
                This will delete the current workout session. Your plan will not advance.
              </Text>
              <TouchableOpacity style={styles.keepTrainingBtn} onPress={() => setShowDiscardModal(false)}>
                <Text style={styles.keepTrainingBtnText}>Keep Training</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.discardConfirmBtn}
                onPress={() => { endWorkout(); navigation.goBack(); }}
              >
                <Text style={styles.discardConfirmBtnText}>Discard Workout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EmptyExerciseView({ onAdd, onFinish, onCancel, elapsed, workoutExercises, setCurrentExerciseIndex, currentExerciseIndex }) {
  return (
    <View style={styles.emptyView}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.timerText}>{elapsed}</Text>
        <TouchableOpacity onPress={onFinish} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.finishBtn}>Finish</Text>
        </TouchableOpacity>
      </View>

      {workoutExercises.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exerciseNav} contentContainerStyle={styles.exerciseNavContent}>
          {workoutExercises.map((entry, i) => (
            <TouchableOpacity key={i} style={[styles.navTab, i === currentExerciseIndex && styles.navTabActive]} onPress={() => setCurrentExerciseIndex(i)}>
              <Text style={[styles.navTabText, i === currentExerciseIndex && styles.navTabTextActive]} numberOfLines={1}>
                {entry.exercise?.name?.split(' ').slice(0, 2).join(' ')}
              </Text>
              {entry.sets.length > 0 && <View style={styles.navTabBadge}><Text style={styles.navTabBadgeText}>{entry.sets.length}</Text></View>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.emptyContent}>
        <Ionicons name="barbell-outline" size={64} color={colors.surface3} />
        <Text style={styles.emptyTitle}>Add your first exercise</Text>
        <Text style={styles.emptySubtitle}>Search the exercise library to get started</Text>
        <TouchableOpacity style={styles.addFirstBtn} onPress={onAdd}>
          <Ionicons name="add" size={22} color={colors.background} />
          <Text style={styles.addFirstBtnText}>Add Exercise</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const PICKER_MUSCLES = Object.keys(MUSCLE_DISPLAY_NAMES);
const PICKER_EQUIPMENT = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Smith Machine', 'Bands'];

function ExercisePickerModal({ visible, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [exercises, setExercises] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createMuscle, setCreateMuscle] = useState('');
  const [createEquipment, setCreateEquipment] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (visible) { loadExercises(); setShowCreate(false); setQuery(''); }
  }, [visible]);

  async function loadExercises() {
    const all = await getAllExercises();
    setExercises(all);
  }

  async function handleCreate() {
    if (!createName.trim()) {
      Alert.alert('Name required', 'Please enter a name for the exercise.');
      return;
    }
    setCreating(true);
    try {
      const created = await insertExercise({
        name: createName.trim(),
        primaryMuscle: createMuscle || null,
        equipment: createEquipment || null,
        isCustom: 1,
      });
      await loadExercises();
      const all = await getAllExercises();
      const newEx = all.find(e => e.name === createName.trim()) || { id: created.id, name: createName.trim(), primaryMuscle: createMuscle, equipment: createEquipment };
      onSelect(newEx);
      onClose();
    } catch (_e) {
      Alert.alert('Error', 'Could not save exercise. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  function openCreate() {
    setCreateName(query.trim());
    setCreateMuscle('');
    setCreateEquipment('');
    setShowCreate(true);
  }

  const filtered = query.trim()
    ? exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
    : exercises.slice(0, 50);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={showCreate ? () => setShowCreate(false) : onClose}>
      <SafeAreaView style={styles.pickerSafe}>
        {showCreate ? (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.pickerClose}>
                <Ionicons name="arrow-back" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.createTitle}>New Exercise</Text>
              <TouchableOpacity onPress={onClose} style={styles.pickerClose}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.createContent} keyboardShouldPersistTaps="handled">
              <TextInput
                style={styles.createNameInput}
                value={createName}
                onChangeText={setCreateName}
                placeholder="Exercise name"
                placeholderTextColor={colors.textMuted}
                autoFocus
                autoCapitalize="words"
              />
              <Text style={styles.createLabel}>Muscle Group</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  {PICKER_MUSCLES.map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.chip, createMuscle === m && styles.chipActive]}
                      onPress={() => setCreateMuscle(prev => prev === m ? '' : m)}
                    >
                      <Text style={[styles.chipText, createMuscle === m && styles.chipTextActive]}>
                        {MUSCLE_DISPLAY_NAMES[m]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={styles.createLabel}>Equipment</Text>
              <View style={styles.chipRow}>
                {PICKER_EQUIPMENT.map(eq => (
                  <TouchableOpacity
                    key={eq}
                    style={[styles.chip, createEquipment === eq && styles.chipActive]}
                    onPress={() => setCreateEquipment(prev => prev === eq ? '' : eq)}
                  >
                    <Text style={[styles.chipText, createEquipment === eq && styles.chipTextActive]}>{eq}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.createSaveBtn, creating && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={creating}
              >
                <Ionicons name="add-circle" size={20} color={colors.background} />
                <Text style={styles.createSaveBtnText}>Add to Workout</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          <>
            <View style={styles.pickerHeader}>
              <TextInput
                style={styles.pickerSearch}
                value={query}
                onChangeText={setQuery}
                placeholder="Search exercises..."
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
              <TouchableOpacity onPress={onClose} style={styles.pickerClose}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => onSelect(item)}
                >
                  <View>
                    <Text style={styles.pickerItemName}>{item.name}</Text>
                    <Text style={styles.pickerItemMuscle}>
                      {(item.primaryMuscle || '').charAt(0).toUpperCase() + (item.primaryMuscle || '').slice(1)}
                      {item.equipment ? ` · ${item.equipment}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
              ListEmptyComponent={
                <View style={styles.pickerEmptyWrap}>
                  <Text style={styles.pickerEmptyText}>No exercises found</Text>
                  {query.trim().length > 0 && (
                    <TouchableOpacity style={styles.createNewBtn} onPress={openCreate}>
                      <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                      <Text style={styles.createNewBtnText}>
                        Create "{query.trim()}" as custom exercise
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerSide: { width: 64, alignItems: 'flex-start', justifyContent: 'center' },
  headerSideRight: { width: 64, alignItems: 'flex-end', justifyContent: 'center' },
  finishBtn: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.primary, paddingVertical: spacing.xs },
  headerCenter: { flex: 1, alignItems: 'center' },
  timerText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary, fontVariant: ['tabular-nums'] },
  headerMuscle: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  addExerciseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  exerciseNav: { borderBottomWidth: 1, borderBottomColor: colors.border, maxHeight: 48 },
  exerciseNavContent: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  navTab: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.surface2, maxWidth: 140 },
  navTabActive: { backgroundColor: colors.primaryBg },
  navTabText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  navTabTextActive: { color: colors.primary },
  navTabBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  navTabBadgeText: { fontSize: 9, fontWeight: fontWeight.black, color: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.md },
  exerciseHeader: { gap: spacing.xs },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  exerciseName: { flex: 1, fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  swapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface2, borderRadius: radius.sm, paddingVertical: 4, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.border },
  swapBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },
  swapSafe: { flex: 1, backgroundColor: colors.background },
  swapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  swapTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  swapSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  swapNote: { fontSize: fontSize.xs, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  swapItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  swapItemName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: 2 },
  swapItemReason: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
  exerciseMuscle: { fontSize: fontSize.sm, color: colors.textSecondary },
  prevCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  prevTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.2 },
  prevSetsSummary: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, lineHeight: 22 },
  prevEmpty: { fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic' },
  progressionBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primaryBg, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, alignSelf: 'flex-start' },
  progressionText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium, flexShrink: 1 },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  targetText: { fontSize: fontSize.sm, color: colors.textMuted },
  setEntryCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  setEntryCardWarmup: { borderColor: colors.warning, backgroundColor: colors.warningBg || colors.surface },
  setEntryCardDrop: { borderColor: colors.gold, backgroundColor: 'rgba(255,215,0,0.06)' },
  warmupBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  warmupBannerText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.warning, letterSpacing: 0.8 },
  warmupGuide: { borderTopWidth: 1, borderTopColor: colors.warning + '28', paddingTop: spacing.sm, gap: spacing.sm },
  warmupGuideHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  warmupGuideTitle: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.semibold, letterSpacing: 0.3 },
  warmupProtocolRow: { flexDirection: 'row', gap: spacing.xs },
  warmupStep: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, gap: 2 },
  warmupStepActive: { borderColor: colors.warning + '99', backgroundColor: colors.warning + '12' },
  warmupStepFaded: { opacity: 0.35 },
  warmupStepPct: { fontSize: 10, color: colors.textMuted, fontWeight: fontWeight.bold },
  warmupStepPctActive: { color: colors.warning },
  warmupStepKg: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: fontWeight.bold },
  warmupStepReps: { fontSize: 10, color: colors.textSecondary },
  warmupStepWorking: { borderColor: colors.primary + '55', backgroundColor: colors.primary + '0a' },
  warmupStepFadedText: { color: colors.textMuted },
  warmupNoDataHint: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },
  dropBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dropBannerText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gold, letterSpacing: 0.8 },
  setEntryTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.2 },
  noteInput: { backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.sm, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, minHeight: 60 },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.primary + '80', borderRadius: radius.lg, paddingVertical: spacing.lg, backgroundColor: colors.primaryBg },
  btnDisabled: { opacity: 0.5 },
  completeBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary, letterSpacing: 0.6 },
  completeBtnWarmup: { borderColor: colors.warning, borderWidth: 1, backgroundColor: colors.warningBg || colors.surface },
  completeBtnTextWarmup: { color: colors.warning },
  extraSetBtn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingVertical: spacing.md },
  extraSetBtnText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: fontWeight.medium },
  secondaryActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border },
  actionBtnDanger: { borderColor: colors.error + '40' },
  actionBtnText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  nextExerciseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg },
  nextExerciseBtnText: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.bold },
  finishWorkoutLargeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.success, borderRadius: radius.lg, paddingVertical: spacing.lg },
  finishWorkoutLargeBtnText: { fontSize: fontSize.md, color: colors.success, fontWeight: fontWeight.bold },
  timeCrunchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeCrunchBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.warning + '55', backgroundColor: colors.warningBg ?? colors.surface },
  timeCrunchBtnText: { fontSize: fontSize.xs, color: colors.warning, fontWeight: fontWeight.medium },
  timeCrunchActiveBar: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, padding: spacing.sm, backgroundColor: colors.warningBg ?? colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.warning + '44' },
  timeCrunchActiveContent: { flex: 1, gap: spacing.sm },
  timeCrunchActiveText: { fontSize: fontSize.xs, color: colors.warning, lineHeight: 18 },
  timeCrunchRevertBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  timeCrunchRevertText: { fontSize: fontSize.xs, color: colors.textSecondary },
  loggedSection: { gap: spacing.sm },
  loggedTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.2 },
  loggedSetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  loggedSetRowWarmup: { borderColor: colors.warning + '60', backgroundColor: colors.warningBg || colors.surface },
  loggedSetTextWarmup: { color: colors.warning },
  loggedSetRowDrop: { borderColor: colors.gold + '50', backgroundColor: 'rgba(255,215,0,0.05)' },
  loggedSetTextDrop: { color: colors.gold },
  setNumBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  setNumText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textSecondary },
  loggedSetText: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  loggedEst1RM: { fontSize: fontSize.xs, color: colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  pickerSafe: { flex: 1, backgroundColor: colors.background },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerSearch: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: fontSize.md, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
  pickerClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  pickerItemName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: 2 },
  pickerItemMuscle: { fontSize: fontSize.sm, color: colors.textSecondary },
  pickerEmptyWrap: { alignItems: 'center', paddingTop: spacing.xxxl, gap: spacing.lg, paddingHorizontal: spacing.xl },
  pickerEmptyText: { fontSize: fontSize.md, color: colors.textMuted },
  createNewBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryBg, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.primary },
  createNewBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary, flex: 1 },
  createTitle: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center' },
  createContent: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  createNameInput: { backgroundColor: colors.inputBg || colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
  createLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.2 },
  chipScroll: { marginHorizontal: -spacing.lg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  chipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  createSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg, marginTop: spacing.sm },
  createSaveBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.background },
  emptyView: { flex: 1, backgroundColor: colors.background },
  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: spacing.xxxl * 2, gap: spacing.lg, paddingHorizontal: spacing.xxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' },
  addFirstBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg, marginTop: spacing.lg },
  addFirstBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.background },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.sm },
  sheetExplainer: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.lg },
  sheetSection: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.2, marginBottom: spacing.sm, marginTop: spacing.md },
  sheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetOptionActive: { backgroundColor: 'transparent' },
  sheetOptionText: { flex: 1, gap: 2 },
  sheetOptionLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  sheetOptionLabelActive: { color: colors.primary },
  sheetOptionDesc: { fontSize: fontSize.xs, color: colors.textMuted },
  infoTargetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  infoTarget: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  infoMuscle: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm },
  infoNotesLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.xs, marginTop: spacing.sm },
  infoNotes: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 },
  targetBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.successBg, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.success },
  targetBannerText: { fontSize: fontSize.sm, color: colors.success, fontWeight: fontWeight.semibold, flex: 1 },
  addedBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryBg, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  addedBannerText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  staleOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  staleSheet: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, width: '100%', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  staleTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center' },
  staleBody: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.md },
  staleResume: { width: '100%', backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  staleResumeText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  staleFinish: { width: '100%', backgroundColor: colors.surface2, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  staleFinishText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },
  staleDiscard: { width: '100%', paddingVertical: spacing.md, alignItems: 'center' },
  staleDiscardText: { fontSize: fontSize.sm, color: colors.error, fontWeight: fontWeight.medium },
  discardOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  discardSheet: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, width: '100%', gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  discardTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center' },
  discardBody: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xs },
  keepTrainingBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md + 2, alignItems: 'center' },
  keepTrainingBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  discardConfirmBtn: { alignItems: 'center', paddingVertical: spacing.md },
  discardConfirmBtnText: { fontSize: fontSize.sm, color: colors.error, fontWeight: fontWeight.medium },
  setTargetsBlock: { marginTop: spacing.sm, gap: 4 },
  setTargetsLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.semibold, marginBottom: 2 },
  setTargetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  setTargetNum: { fontSize: fontSize.xs, color: colors.textMuted, width: 36 },
  setTargetVal: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: fontWeight.semibold },
  setTargetReason: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs, fontStyle: 'italic' },
  inlineTargetChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryBg, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: spacing.xs,
  },
  inlineTargetText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  beatChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
  },
  beatChipText: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },
  deloadBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.warningBg || '#2A2000',
    borderRadius: radius.md, marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    padding: spacing.md, borderWidth: 1, borderColor: colors.warning,
  },
  deloadBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  deloadBannerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.warning },
  deloadBannerSub: { fontSize: fontSize.xs, color: colors.textMuted },
  deloadSkip: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
});
