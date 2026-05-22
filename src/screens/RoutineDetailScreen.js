import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  getRoutineById, getRoutineExercisesWithDetails, getAllExercises,
  addExerciseToRoutine, removeExerciseFromRoutine, createWorkout, updateRoutineExercise,
  updateRoutineExerciseExercise, updateRoutineExerciseOrder,
} from '../lib/database';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import { getExerciseWhyThis } from '../lib/whyThisTemplates';
import { rankSwaps } from '../lib/swapEngine';
import { logError } from '../lib/errorLog';
import useAppStore from '../store/useAppStore';

// Compute muscle coverage: { [muscleKey]: count } sorted by count descending
function computeMuscleCoverage(exercises) {
  const counts = {};
  for (const { exercise } of exercises) {
    const muscle = exercise?.primaryMuscle;
    if (!muscle) continue;
    counts[muscle] = (counts[muscle] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([muscle, count]) => ({ muscle, count }));
}

function MuscleTagRow({ exercises }) {
  const coverage = computeMuscleCoverage(exercises);

  // Warning logic: check whether back (pulling) and hamstrings are absent
  const muscleKeys = new Set(coverage.map(c => c.muscle));
  const noBack = !muscleKeys.has('back');
  const noHamstrings = !muscleKeys.has('hamstrings');

  let warning = null;
  if (noBack && noHamstrings) {
    warning = 'No pulling work. Consider adding a row or pull variation.';
  } else if (noHamstrings) {
    warning = 'No hamstring work. Consider adding an RDL or leg curl.';
  }

  if (coverage.length === 0) return null;

  return (
    <View style={tagStyles.section}>
      <Text style={tagStyles.sectionTitle}>Muscle coverage</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tagStyles.chipRow}
      >
        {coverage.map(({ muscle, count }) => {
          const displayName =
            MUSCLE_DISPLAY_NAMES[muscle] ||
            muscle.charAt(0).toUpperCase() + muscle.slice(1).replace(/_/g, ' ');
          const chipStyle = count >= 3
            ? tagStyles.chipHigh
            : count === 2
            ? tagStyles.chipMid
            : tagStyles.chipLow;
          const textStyle = count >= 3
            ? tagStyles.chipTextHigh
            : count === 2
            ? tagStyles.chipTextMid
            : tagStyles.chipTextLow;
          return (
            <View key={muscle} style={[tagStyles.chip, chipStyle]}>
              <Text style={[tagStyles.chipText, textStyle]}>
                {displayName} ×{count}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      {warning ? (
        <View style={tagStyles.warningRow}>
          <Ionicons name="alert-circle-outline" size={13} color={colors.warning} style={tagStyles.warningIcon} />
          <Text style={tagStyles.warningText}>{warning}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function RoutineDetailScreen({ navigation, route }) {
  const { routineId } = route.params || {};
  const { user, startWorkout } = useAppStore();
  const [routine, setRoutine] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [allExercises, setAllExercises] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingExercise, setEditingExercise] = useState(null);
  const [editSets, setEditSets] = useState('');
  const [editRepsMin, setEditRepsMin] = useState('');
  const [editRepsMax, setEditRepsMax] = useState('');
  const [editRest, setEditRest] = useState('');
  const [editStartWeight, setEditStartWeight] = useState('');
  const [swapState, setSwapState] = useState(null);
  const [swapCandidates, setSwapCandidates] = useState([]);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    if (routineId) loadRoutine();
  }, [routineId]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setIsReordering(prev => !prev)}
          style={{ marginRight: 16 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: fontSize.md, color: isReordering ? colors.primary : colors.textSecondary, fontWeight: isReordering ? fontWeight.bold : fontWeight.regular }}>
            {isReordering ? 'Done' : 'Reorder'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [isReordering]);

  async function loadRoutine() {
    const r = await getRoutineById(routineId);
    if (!r) return;
    setRoutine(r);
    navigation.setOptions({ title: r.name });

    const withExercises = await getRoutineExercisesWithDetails(routineId);
    setExercises(withExercises);

    const all = await getAllExercises();
    setAllExercises(all);
  }

  async function removeExercise(routineExercise) {
    await removeExerciseFromRoutine(routineExercise.id);
    await loadRoutine();
  }

  async function addExercise(exercise) {
    await addExerciseToRoutine(
      routineId,
      exercise.id,
      exercises.length,
      exercise.defaultRepMin || 6,
      exercise.defaultRepMax || 12,
    );
    setShowAddExercise(false);
    await loadRoutine();
  }

  function openEdit(routineExercise, exercise) {
    setEditingExercise({ routineExercise, exercise });
    setEditSets(String(routineExercise.recommendedSets ?? 3));
    setEditRepsMin(String(routineExercise.recommendedRepsMin ?? 6));
    setEditRepsMax(String(routineExercise.recommendedRepsMax ?? 12));
    setEditRest(String(routineExercise.restSeconds ?? ''));
    setEditStartWeight(String(routineExercise.startingWeight ?? ''));
  }

  async function saveEdit() {
    if (!editingExercise) return;
    const sets = parseInt(editSets, 10);
    const repsMin = parseInt(editRepsMin, 10);
    const repsMax = parseInt(editRepsMax, 10);
    if (!sets || !repsMin || !repsMax) return;
    await updateRoutineExercise(editingExercise.routineExercise.id, {
      recommendedSets: sets,
      recommendedRepsMin: repsMin,
      recommendedRepsMax: repsMax,
      restSeconds: editRest ? parseInt(editRest, 10) : null,
      startingWeight: editStartWeight ? parseFloat(editStartWeight) : null,
    });
    setEditingExercise(null);
    await loadRoutine();
  }

  async function handleOpenSwap(routineExercise, exercise) {
    const all = allExercises.length ? allExercises : await getAllExercises();
    const otherIds = exercises
      .map(({ exercise: ex }) => ex?.id)
      .filter(id => id && id !== exercise?.id);
    const ranked = rankSwaps(exercise, all, {
      excludeIds: otherIds,
      numResults: 12,
    });
    setSwapCandidates(ranked);
    setSwapState({ routineExerciseId: routineExercise.id, exercise });
  }

  function handleConfirmSwap(newExercise) {
    if (!swapState) return;
    const originalName = swapState.exercise?.name || 'this exercise';
    Alert.alert(
      'Swap this exercise in the routine?',
      `${originalName} will be replaced with ${newExercise.name}. This affects all future sessions of this routine. Your set, rep and rest targets stay the same.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Swap',
          onPress: async () => {
            await updateRoutineExerciseExercise(swapState.routineExerciseId, newExercise.id);
            setSwapState(null);
            setSwapCandidates([]);
            await loadRoutine();
          },
        },
      ],
    );
  }

  async function handleMoveExercise(routineExerciseId, direction) {
    const index = exercises.findIndex(e => e.routineExercise.id === routineExerciseId);
    if (index === -1) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= exercises.length) return;

    // Optimistic update
    const updated = [...exercises];
    const temp = updated[index];
    updated[index] = updated[swapIndex];
    updated[swapIndex] = temp;
    setExercises(updated);

    // Persist both swapped items using their new positions
    try {
      await updateRoutineExerciseOrder(updated[index].routineExercise.id, index);
      await updateRoutineExerciseOrder(updated[swapIndex].routineExercise.id, swapIndex);
    } catch (_err) {
      // Revert on failure
      setExercises(exercises);
    }
  }

  async function handleStartWorkout() {
    if (exercises.length === 0) {
      Alert.alert(
        'No exercises',
        'This routine has no exercises yet.',
        [
          { text: 'Add Exercise', onPress: () => setShowAddExercise(true) },
          {
            text: 'Start Blank Workout',
            onPress: () => navigation.navigate('HomeTab', { screen: 'BuildWorkout', initial: false }),
          },
        ],
      );
      return;
    }
    try {
      const workout = await createWorkout(user.id, routineId);
      const initialExercises = exercises.map(({ exercise, routineExercise }) => ({
        exercise,
        routineExercise,
        sets: [],
        supersetGroupId: routineExercise?.supersetGroupId ?? null,
      }));
      startWorkout(workout, initialExercises);
      navigation.navigate('HomeTab', { screen: 'ActiveWorkout', initial: false });
    } catch (e) {
      logError('RoutineDetailScreen.handleStartWorkout', e, { userId: user?.id, routineId });
      Alert.alert('Couldn\'t start workout', e?.message ?? 'Please try again.');
    }
  }

  const filtered = searchQuery.trim()
    ? allExercises.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allExercises.slice(0, 40);

  if (!routine) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={exercises}
        keyExtractor={item => item.routineExercise.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <TouchableOpacity style={styles.startBtn} onPress={handleStartWorkout}>
              <Ionicons name="play-circle" size={22} color={colors.background} />
              <Text style={styles.startBtnText}>Start This Workout</Text>
            </TouchableOpacity>
            <MuscleTagRow exercises={exercises} />
          </>
        }
        renderItem={({ item: { routineExercise, exercise }, index }) => (
          <TouchableOpacity
            style={[styles.exerciseCard, exercise.unresolved && styles.exerciseCardUnresolved]}
            onPress={() => {
              if (isReordering) return;
              if (exercise.unresolved) {
                // Broken-FK row left over from the pre-deterministic-ID
                // sync era. Open the existing swap modal so the user
                // can re-link this slot to a real exercise in one tap.
                setSwapState({
                  routineExerciseId: routineExercise.id,
                  exercise,
                });
                // Show all exercises as candidates rather than the
                // recovery-narrow list — we don't know what muscle the
                // original was so we can't filter intelligently.
                setSwapCandidates(allExercises.map(e => ({ exercise: e })));
                return;
              }
              openEdit(routineExercise, exercise);
            }}
            activeOpacity={isReordering ? 1 : 0.8}
          >
            <View style={[styles.orderBadge, exercise.unresolved && styles.orderBadgeUnresolved]}>
              <Text style={styles.orderNum}>{index + 1}</Text>
            </View>
            <View style={styles.exerciseInfo}>
              <View style={styles.exerciseTitleRow}>
                <Text style={[styles.exerciseName, exercise.unresolved && styles.exerciseNameUnresolved]}>
                  {exercise.name || 'Exercise (couldn’t restore)'}
                </Text>
                {exercise.unresolved && (
                  <View style={styles.relinkChip}>
                    <Ionicons name="link-outline" size={12} color={colors.warning} />
                    <Text style={styles.relinkChipText}>Tap to re-link</Text>
                  </View>
                )}
              </View>
              <Text style={styles.exerciseMeta}>
                {routineExercise.recommendedSets} sets ·{' '}
                {routineExercise.recommendedRepsMin}–{routineExercise.recommendedRepsMax} reps
                {routineExercise.restSeconds ? ` · ${routineExercise.restSeconds}s rest` : ''}
              </Text>
              {routineExercise.startingWeight > 0 ? (
                <Text style={styles.exerciseStartWeight}>
                  Start: {routineExercise.startingWeight} kg
                </Text>
              ) : null}
              <Text style={styles.exerciseMuscle}>
                {MUSCLE_DISPLAY_NAMES[exercise.primaryMuscle] ||
                  (exercise.primaryMuscle || '').charAt(0).toUpperCase() +
                  (exercise.primaryMuscle || '').slice(1).replace(/_/g, ' ')}
              </Text>
              {(() => {
                const why = getExerciseWhyThis(exercise.name, exercise.subregion);
                return why ? <Text style={styles.exerciseWhy}>{why}</Text> : null;
              })()}
            </View>
            {isReordering ? (
              <View style={styles.reorderActions}>
                <TouchableOpacity
                  onPress={() => handleMoveExercise(routineExercise.id, 'up')}
                  style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
                  disabled={index === 0}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={`Move ${exercise.name} up`}
                >
                  <Ionicons
                    name="chevron-up"
                    size={16}
                    color={index === 0 ? colors.border : colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleMoveExercise(routineExercise.id, 'down')}
                  style={[styles.reorderBtn, index === exercises.length - 1 && styles.reorderBtnDisabled]}
                  disabled={index === exercises.length - 1}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={`Move ${exercise.name} down`}
                >
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={index === exercises.length - 1 ? colors.border : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => openEdit(routineExercise, exercise)}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                >
                  <Ionicons name="create-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleOpenSwap(routineExercise, exercise)}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  accessibilityLabel={`Swap ${exercise.name}`}
                >
                  <Ionicons name="swap-horizontal" size={20} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Alert.alert(
                    'Remove exercise?',
                    `Remove ${exercise.name} from this routine?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeExercise(routineExercise) },
                    ],
                  )}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddExercise(true)}>
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text style={styles.addBtnText}>Add Exercise</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          !exercises.length ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No exercises yet. Add some below.</Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />

      {/* Edit exercise modal */}
      <Modal
        visible={!!editingExercise}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingExercise(null)}
      >
        <TouchableOpacity style={styles.editOverlay} activeOpacity={1} onPress={() => setEditingExercise(null)}>
          <TouchableOpacity style={styles.editSheet} activeOpacity={1}>
            <Text style={styles.editTitle}>{editingExercise?.exercise?.name}</Text>
            <View style={styles.editRow}>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Sets</Text>
                <TextInput
                  style={styles.editInput}
                  value={editSets}
                  onChangeText={setEditSets}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Reps min</Text>
                <TextInput
                  style={styles.editInput}
                  value={editRepsMin}
                  onChangeText={setEditRepsMin}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Reps max</Text>
                <TextInput
                  style={styles.editInput}
                  value={editRepsMax}
                  onChangeText={setEditRepsMax}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
            <View style={styles.editRow}>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Rest (s)</Text>
                <TextInput
                  style={styles.editInput}
                  value={editRest}
                  onChangeText={setEditRest}
                  keyboardType="number-pad"
                  placeholder="90"
                  maxLength={4}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Start weight</Text>
                <TextInput
                  style={styles.editInput}
                  value={editStartWeight}
                  onChangeText={setEditStartWeight}
                  keyboardType="decimal-pad"
                  placeholder="kg"
                  maxLength={6}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
            <TouchableOpacity style={styles.editSaveBtn} onPress={saveEdit}>
              <Text style={styles.editSaveBtnText}>Save</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Plan-level swap modal */}
      <Modal
        visible={swapState != null}
        animationType="slide"
        onRequestClose={() => { setSwapState(null); setSwapCandidates([]); }}
      >
        <SafeAreaView style={styles.swapSafe} edges={['top', 'bottom']}>
          <View style={styles.swapHeader}>
            <Text style={styles.swapTitle}>Swap Exercise</Text>
            <TouchableOpacity onPress={() => { setSwapState(null); setSwapCandidates([]); }}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.swapSubtitle}>
            Replacing: <Text style={{ color: colors.primary }}>{swapState?.exercise?.name}</Text>
          </Text>
          <Text style={styles.swapNote}>
            Choose a substitute. Your routine will be updated. Your set, rep and rest targets stay the same.
          </Text>
          <FlatList
            data={swapCandidates}
            keyExtractor={item => item.exercise.id}
            contentContainerStyle={{ padding: spacing.lg }}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.swapItem}
                onPress={() => handleConfirmSwap(item.exercise)}
              >
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

      <Modal visible={showAddExercise} animationType="slide" onRequestClose={() => setShowAddExercise(false)}>
        <SafeAreaView style={styles.pickerSafe}>
          <View style={styles.pickerHeader}>
            <TextInput
              style={styles.pickerSearch}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search exercises..."
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <TouchableOpacity onPress={() => setShowAddExercise(false)} style={styles.pickerClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={filtered}
            keyExtractor={e => e.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.pickerItem} onPress={() => addExercise(item)}>
                <View>
                  <Text style={styles.pickerItemName}>{item.name}</Text>
                  <Text style={styles.pickerItemMuscle}>
                    {(item.primaryMuscle || '').charAt(0).toUpperCase() +
                      (item.primaryMuscle || '').slice(1)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
  },
  startBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.background },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Visual variant for rows whose exercise_id couldn't be resolved
  // against the local exercises table (cloud-restored from a build
  // that pre-dates deterministic canonical IDs + denormalised
  // exercise_name). The warning border tells the user this row
  // needs their attention; tapping opens the swap modal to re-link.
  exerciseCardUnresolved: {
    borderColor: colors.warning,
    backgroundColor: colors.warningBg,
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeUnresolved: { backgroundColor: colors.warning + '40' },
  orderNum: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textSecondary },
  exerciseInfo: { flex: 1, gap: 2 },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  exerciseName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  exerciseNameUnresolved: { color: colors.warning },
  relinkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warning + '60',
  },
  relinkChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  exerciseMeta: { fontSize: fontSize.sm, color: colors.primary },
  exerciseMuscle: { fontSize: fontSize.xs, color: colors.textMuted },
  exerciseWhy: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic', marginTop: 2, lineHeight: 16 },
  exerciseStartWeight: { fontSize: fontSize.xs, color: colors.primary },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reorderActions: { flexDirection: 'column', alignItems: 'center', gap: spacing.xs },
  reorderBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  reorderBtnDisabled: { opacity: 0.3 },
  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  editSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  editTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.xs },
  editRow: { flexDirection: 'row', gap: spacing.md },
  editField: { flex: 1, gap: spacing.xs },
  editLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.5 },
  editInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
  },
  editSaveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  editSaveBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  addBtnText: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.medium },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted },
  pickerSafe: { flex: 1, backgroundColor: colors.background },
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
  pickerClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
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
  pickerItemMuscle: { fontSize: fontSize.sm, color: colors.textSecondary },
  swapSafe: { flex: 1, backgroundColor: colors.background },
  swapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  swapTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  swapSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  swapNote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  swapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  swapItemName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  swapItemReason: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
});

const tagStyles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipLow: {
    backgroundColor: colors.surface2,
  },
  chipMid: {
    backgroundColor: colors.success + '30',
  },
  chipHigh: {
    backgroundColor: colors.primary + '30',
  },
  chipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  chipTextLow: {
    color: colors.textMuted,
  },
  chipTextMid: {
    color: colors.success,
  },
  chipTextHigh: {
    color: colors.primary,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  warningIcon: {
    marginTop: 1,
  },
  warningText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    flex: 1,
    lineHeight: 16,
  },
});
