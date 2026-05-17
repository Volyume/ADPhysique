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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import SetEntry from '../components/SetEntry';
import RestTimer from '../components/RestTimer';
import useAppStore from '../store/useAppStore';
import { getPreviousWorkoutSets, createWorkoutSet, updateWorkout, getAllExercises } from '../lib/database';
import {
  detectPR,
  getProgressionSuggestion,
  calculate1RM,
  calculateTonnage,
} from '../lib/algorithms';
import { rankSwaps } from '../lib/swapEngine';

const DEFAULT_SET = { weight: '', reps: 8, setType: 'straight', notes: '' };

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

export default function ActiveWorkoutScreen({ navigation, route }) {
  const {
    user, units, activeWorkout, workoutExercises, currentExerciseIndex,
    setCurrentExerciseIndex, addExerciseToWorkout, addSetToCurrentExercise,
    startRestTimer, showPRCelebration, endWorkout, workoutStartTime,
    lastActivityAt, updateLastActivity,
  } = useAppStore();

  const [currentSet, setCurrentSet] = useState({ ...DEFAULT_SET });
  const [prevSets, setPrevSets] = useState([]);
  const [loggedSets, setLoggedSets] = useState([]);
  const [detectedPRs, setDetectedPRs] = useState([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progression, setProgression] = useState(null);
  const [showSetTypePicker, setShowSetTypePicker] = useState(false);
  const [showExecution, setShowExecution] = useState(false);
  const [showStaleModal, setShowStaleModal] = useState(false);
  const [addedMsg, setAddedMsg] = useState('');
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapCandidates, setSwapCandidates] = useState([]);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const autoAdvanceRef = useRef(null);

  const scrollRef = useRef(null);
  const insets = useSafeAreaInsets();
  const timerRef = useRef(null);

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
    setLoggedSets([]);
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

  // Workout timer — initialize from workoutStartTime so it survives tab switches
  useEffect(() => {
    if (workoutStartTime) {
      setElapsedSeconds(Math.floor((Date.now() - workoutStartTime) / 1000));
    }
    timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Load previous performance and set defaults when exercise changes
  useEffect(() => {
    if (!exercise || !activeWorkout) return;

    async function loadHistory() {
      const prev = await getPreviousWorkoutSets(exercise.id, activeWorkout.id);
      setPrevSets(prev);

      if (prev.length > 0) {
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

      const allLoggedForExercise = workoutExercises[currentExerciseIndex]?.sets || [];
      setLoggedSets(allLoggedForExercise);
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
        rir: null,
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
        rir: null,
        rpe: null,
      };

      const newLoggedSets = [...loggedSets, setData];
      setLoggedSets(newLoggedSets);
      addSetToCurrentExercise(setData);

      // PR Detection
      const prs = detectPR(setData, prevSets, exercise, units);
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

      // Update last activity timestamp
      updateLastActivity();

      // Start rest timer with per-exercise duration
      startRestTimer(routineExercise?.restSeconds || 90);

      // Auto-advance to next exercise when target sets just completed
      const newWorkingCount = newLoggedSets.filter(s => s.setType !== 'warmup').length;
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

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } finally {
      setSaving(false);
    }
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
            await updateWorkout(activeWorkout.id, {
              endedAt: Date.now(),
              durationMinutes: Math.round(elapsedSeconds / 60),
              isCompleted: true,
            });
            const allSets = workoutExercises.flatMap(e => e.sets);
            const workingSetCount = allSets.filter(s => s.setType !== 'warmup').length;
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
  const workingLogged = loggedSets.filter(s => s.setType !== 'warmup').length;
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
            <TouchableOpacity onPress={handleCancelWorkout} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
            <TouchableOpacity onPress={handleFinishWorkout} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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

          {/* Previous Performance */}
          <View style={styles.prevCard}>
            <Text style={styles.prevTitle}>PREVIOUS SESSION</Text>
            {prevSets.length > 0 ? (
              <>
                <Text style={styles.prevSetsSummary}>
                  {prevSets.map(s => `${s.weight}${units} × ${s.actualReps}`).join('   ')}
                </Text>
                {progression && progression.action !== 'baseline' && (
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

          {/* Target complete banner */}
          {targetComplete && (
            <View style={styles.targetBanner}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.targetBannerText}>
                Target reached — {targetSets} working set{targetSets !== 1 ? 's' : ''} done
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
          <View style={styles.setEntryCard}>
            <Text style={styles.setEntryTitle}>
              {routineExercise?.recommendedSets
                ? `SET ${loggedSets.length + 1} / ${routineExercise.recommendedSets} · ${SET_TYPE_DISPLAY[currentSet.setType] || 'Working'}`
                : `SET ${loggedSets.length + 1} · ${SET_TYPE_DISPLAY[currentSet.setType] || 'Working'}`}
            </Text>
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
                <TouchableOpacity testID="volyume-btn-finish-primary" style={styles.completeBtn} onPress={handleFinishWorkout}>
                  <Ionicons name="checkmark-done" size={24} color={colors.background} />
                  <Text style={styles.completeBtnText}>FINISH WORKOUT</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity testID="volyume-btn-next-exercise" style={styles.completeBtn} onPress={handleNextExercise}>
                  <Ionicons name="arrow-forward-circle" size={24} color={colors.background} />
                  <Text style={styles.completeBtnText}>NEXT EXERCISE</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                testID="volyume-btn-extra-set"
                style={[styles.extraSetBtn, saving && styles.btnDisabled]}
                onPress={handleCompleteSet}
                disabled={saving}
              >
                <Text style={styles.extraSetBtnText}>+ Complete Extra Set</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              testID="volyume-btn-complete-set"
              style={[styles.completeBtn, saving && styles.btnDisabled]}
              onPress={handleCompleteSet}
              disabled={saving}
            >
              <Ionicons name="checkmark-circle" size={24} color={colors.background} />
              <Text style={styles.completeBtnText}>COMPLETE SET</Text>
            </TouchableOpacity>
          )}

          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowNoteInput(v => !v)}>
              <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.actionBtnText}>Note</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowExecution(true)}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.actionBtnText}>Info</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="volyume-btn-add-mid-workout"
              style={styles.actionBtn}
              onPress={() => setShowExercisePicker(true)}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.actionBtnText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleRemoveExercise}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={[styles.actionBtnText, { color: colors.error }]}>Remove</Text>
            </TouchableOpacity>
          </View>

          {/* Rest Timer */}
          <RestTimer />

          {/* Logged Sets */}
          {loggedSets.length > 0 && (
            <View style={styles.loggedSection}>
              <Text style={styles.loggedTitle}>THIS WORKOUT</Text>
              {loggedSets.map((s, i) => {
                const est1RM = calculate1RM(s.weight, s.actualReps);
                return (
                  <View key={i} style={styles.loggedSetRow}>
                    <View style={styles.setNumBadge}>
                      <Text style={styles.setNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.loggedSetText}>
                      {s.weight}{units} × {s.actualReps}
                      {s.setType === 'warmup' ? ' · Warm-up' : ''}
                    </Text>
                    <Text style={styles.loggedEst1RM}>≈{est1RM.toFixed(0)}{units} 1RM</Text>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
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
            {routineExercise?.recommendedSets ? (
              <Text style={styles.infoTarget}>
                Target: {routineExercise.recommendedSets} sets · {routineExercise.recommendedRepsMin}–{routineExercise.recommendedRepsMax} reps
              </Text>
            ) : null}
            {exercise?.primaryMuscle ? (
              <Text style={styles.infoMuscle}>
                {(exercise.primaryMuscle || '').charAt(0).toUpperCase() + (exercise.primaryMuscle || '').slice(1)}{exercise.equipment ? ` · ${exercise.equipment}` : ''}
              </Text>
            ) : null}
            <Text style={styles.infoNotes}>
              {routineExercise?.notes || 'No execution notes for this exercise.'}
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
            <Text style={styles.swapNote}>Session-only — your plan is not changed.</Text>
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

function ExercisePickerModal({ visible, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [exercises, setExercises] = useState([]);

  useEffect(() => {
    if (visible) loadExercises();
  }, [visible]);

  async function loadExercises() {
    const all = await getAllExercises();
    setExercises(all);
  }

  const filtered = query.trim()
    ? exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
    : exercises.slice(0, 50);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.pickerSafe}>
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
        />
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
  finishBtn: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.error, paddingVertical: spacing.xs },
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
  prevTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1 },
  prevSetsSummary: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, lineHeight: 22 },
  prevEmpty: { fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic' },
  progressionBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primaryBg, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, alignSelf: 'flex-start' },
  progressionText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium, flexShrink: 1 },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  targetText: { fontSize: fontSize.sm, color: colors.textMuted },
  setEntryCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  setEntryTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.black, color: colors.textMuted, letterSpacing: 1.5 },
  noteInput: { backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.sm, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, minHeight: 60 },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg + 2 },
  btnDisabled: { opacity: 0.5 },
  completeBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background, letterSpacing: 0.8 },
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
  loggedSection: { gap: spacing.sm },
  loggedTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1 },
  loggedSetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
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
  emptyView: { flex: 1, backgroundColor: colors.background },
  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' },
  addFirstBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg, marginTop: spacing.lg },
  addFirstBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.background },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.sm },
  sheetExplainer: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.lg },
  sheetSection: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1.2, marginBottom: spacing.sm, marginTop: spacing.md },
  sheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetOptionActive: { backgroundColor: 'transparent' },
  sheetOptionText: { flex: 1, gap: 2 },
  sheetOptionLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  sheetOptionLabelActive: { color: colors.primary },
  sheetOptionDesc: { fontSize: fontSize.xs, color: colors.textMuted },
  infoTarget: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium, marginBottom: spacing.xs },
  infoMuscle: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.lg },
  infoNotes: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22, paddingVertical: spacing.sm },
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
});
