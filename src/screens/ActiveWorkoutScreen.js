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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import SetEntry from '../components/SetEntry';
import RestTimer from '../components/RestTimer';
import PlateCalculator from '../components/PlateCalculator';
import useAppStore from '../store/useAppStore';
import { getPreviousWorkoutSets, createWorkoutSet, updateWorkout, getAllExercises } from '../lib/database';
import {
  detectPR,
  getProgressionSuggestion,
  calculate1RM,
  calculateTonnage,
} from '../lib/algorithms';

const DEFAULT_SET = { weight: 0, reps: 8, rir: 2, rpe: 8, setType: 'straight', notes: '' };

export default function ActiveWorkoutScreen({ navigation, route }) {
  const {
    user, units, activeWorkout, workoutExercises, currentExerciseIndex,
    setCurrentExerciseIndex, addExerciseToWorkout, addSetToCurrentExercise,
    startRestTimer, showPRCelebration, endWorkout, workoutStartTime,
  } = useAppStore();

  const [currentSet, setCurrentSet] = useState({ ...DEFAULT_SET });
  const [prevSets, setPrevSets] = useState([]);
  const [loggedSets, setLoggedSets] = useState([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progression, setProgression] = useState(null);

  const scrollRef = useRef(null);
  const timerRef = useRef(null);

  const currentEntry = workoutExercises[currentExerciseIndex];
  const exercise = currentEntry?.exercise;
  const routineExercise = currentEntry?.routineExercise;

  // Workout timer
  useEffect(() => {
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
        setCurrentSet(c => ({
          ...c,
          weight: lastSet.weight || c.weight,
          reps: lastSet.actualReps || c.reps,
          rir: lastSet.rir ?? c.rir,
          rpe: lastSet.rpe ?? c.rpe,
        }));
      } else if (routineExercise) {
        setCurrentSet(c => ({
          ...c,
          reps: routineExercise.recommendedRepsMax || c.reps,
        }));
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
        rir: currentSet.rir ?? null,
        rpe: currentSet.rpe ?? null,
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
        rir: currentSet.rir,
        rpe: currentSet.rpe,
      };

      const newLoggedSets = [...loggedSets, setData];
      setLoggedSets(newLoggedSets);
      addSetToCurrentExercise(setData);

      // PR Detection
      const prs = detectPR(setData, prevSets, exercise);
      if (prs.length > 0) {
        showPRCelebration({ ...prs[0], exerciseName: exercise.name });
      }

      // Recalculate suggestion
      const suggestion = getProgressionSuggestion(
        newLoggedSets,
        prevSets,
        routineExercise?.recommendedRepsMin,
        routineExercise?.recommendedRepsMax,
      );
      setProgression(suggestion);

      // Start rest timer
      startRestTimer(90);

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
            endWorkout();
            navigation.replace('WorkoutSummary', {
              workoutId: activeWorkout.id,
              durationMinutes: Math.round(elapsedSeconds / 60),
              exerciseCount: workoutExercises.length,
              setCount: allSets.length,
              tonnage: calculateTonnage(allSets),
              exerciseNames: workoutExercises.map(e => e.exercise?.name).filter(Boolean),
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

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyExerciseView
          onAdd={() => setShowExercisePicker(true)}
          onFinish={handleFinishWorkout}
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
          <TouchableOpacity onPress={handleFinishWorkout} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.finishBtn}>Finish</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.timerText}>{elapsedStr}</Text>
            <Text style={styles.headerMuscle}>
              {(exercise.primaryMuscle || exercise.primary_muscle || '').charAt(0).toUpperCase() +
                (exercise.primaryMuscle || exercise.primary_muscle || '').slice(1)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addExerciseBtn}
            onPress={() => setShowExercisePicker(true)}
          >
            <Ionicons name="add" size={22} color={colors.primary} />
          </TouchableOpacity>
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
        >
          {/* Exercise Title */}
          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.exerciseMuscle}>
              {(exercise.primaryMuscle || exercise.primary_muscle || '').charAt(0).toUpperCase() +
                (exercise.primaryMuscle || exercise.primary_muscle || '').slice(1)} (Primary)
            </Text>
          </View>

          {/* Previous Performance */}
          {prevSets.length > 0 && (
            <View style={styles.prevCard}>
              <Text style={styles.prevTitle}>PREVIOUS SESSION</Text>
              <View style={styles.prevSets}>
                {prevSets.map((s, i) => (
                  <Text key={i} style={styles.prevSetText}>
                    {s.weight}{units} × {s.actualReps} reps
                    {s.rir !== null && s.rir !== undefined ? ` (RIR ${s.rir})` : ''}
                  </Text>
                ))}
              </View>
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
            </View>
          )}

          {/* Target */}
          {routineExercise && (
            <View style={styles.targetRow}>
              <Ionicons name="flag-outline" size={14} color={colors.textMuted} />
              <Text style={styles.targetText}>
                Target: {routineExercise.recommendedSets || 3} sets,{' '}
                {routineExercise.recommendedRepsMin}–{routineExercise.recommendedRepsMax} reps @ RIR 2
              </Text>
            </View>
          )}

          {/* Set Entry */}
          <View style={styles.setEntryCard}>
            <Text style={styles.setEntryTitle}>
              SET {loggedSets.length + 1}
            </Text>
            <SetEntry
              value={currentSet}
              onChange={setCurrentSet}
              units={units}
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
          <TouchableOpacity
            style={[styles.completeBtn, saving && styles.btnDisabled]}
            onPress={handleCompleteSet}
            disabled={saving}
          >
            <Ionicons name="checkmark-circle" size={24} color={colors.background} />
            <Text style={styles.completeBtnText}>COMPLETE SET</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowPlateCalc(true)}
            >
              <Ionicons name="calculator-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.actionBtnText}>Plates</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowNoteInput(v => !v)}
            >
              <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.actionBtnText}>Note</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setCurrentExerciseIndex(
                (currentExerciseIndex + 1) % workoutExercises.length,
              )}
            >
              <Ionicons name="swap-horizontal-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.actionBtnText}>Switch</Text>
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
                      {s.rir !== null && s.rir !== undefined ? ` · RIR ${s.rir}` : ''}
                    </Text>
                    <Text style={styles.loggedEst1RM}>≈{est1RM.toFixed(0)}{units} 1RM</Text>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Plate Calculator Modal */}
        <Modal
          visible={showPlateCalc}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPlateCalc(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <PlateCalculator
                targetWeight={parseFloat(currentSet.weight) || 60}
                onClose={() => setShowPlateCalc(false)}
              />
            </View>
          </View>
        </Modal>

        {/* Exercise Picker Modal */}
        <ExercisePickerModal
          visible={showExercisePicker}
          onClose={() => setShowExercisePicker(false)}
          onSelect={ex => {
            addExerciseToWorkout(ex);
            setCurrentExerciseIndex(workoutExercises.length);
            setShowExercisePicker(false);
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EmptyExerciseView({ onAdd, onFinish, elapsed, workoutExercises, setCurrentExerciseIndex, currentExerciseIndex }) {
  return (
    <View style={styles.emptyView}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onFinish}>
          <Text style={styles.finishBtn}>Finish</Text>
        </TouchableOpacity>
        <Text style={styles.timerText}>{elapsed}</Text>
        <View style={{ width: 44 }} />
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
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  finishBtn: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  headerCenter: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  headerMuscle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  addExerciseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNav: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 48,
  },
  exerciseNavContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    maxWidth: 140,
  },
  navTabActive: {
    backgroundColor: colors.primaryBg,
  },
  navTabText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  navTabTextActive: {
    color: colors.primary,
  },
  navTabBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTabBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.black,
    color: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  exerciseHeader: {
    gap: spacing.xs,
  },
  exerciseName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
  },
  exerciseMuscle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  prevCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  prevTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  prevSets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  prevSetText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  progressionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  progressionText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    flexShrink: 1,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  targetText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  setEntryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  setEntryTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  noteInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 60,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg + 2,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  completeBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.background,
    letterSpacing: 1,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  loggedSection: {
    gap: spacing.sm,
  },
  loggedTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  loggedSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  loggedSetText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  loggedEst1RM: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  pickerSafe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerSearch: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  pickerItemName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  pickerItemMuscle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
  },
  addFirstBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
});
