import { useState, useEffect } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, circle } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import Card from '../components/Card';
import TextField from '../components/TextField';
import SectionLabel from '../components/SectionLabel';
import {
  getRoutineById, getRoutineExercisesWithDetails, getAllExercises,
  addExerciseToRoutine, removeExerciseFromRoutine, createWorkout, updateRoutineExercise,
  updateRoutineExerciseExercise, updateRoutineExerciseOrder, getActivePlan,
} from '../lib/database';
import { computeDivisionDiff, divisionFingerprintLine, planWearsDivision } from '../lib/divisionDiff';
import { buildPlanInputs } from '../lib/planAutoGen';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import { getExerciseWhyThis, getSplitRationale } from '../lib/whyThisTemplates';
import { rankSwaps } from '../lib/swapEngine';
import { logError } from '../lib/errorLog';
import { audit } from '../lib/observability';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/Toast';
import ExercisePickerModal from '../components/ExercisePickerModal';

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

// Factual chips only: NO balance warnings here (founder device-walk
// 2026-06-12). A split day is supposed to be "unbalanced": the old
// day-level heuristic told every generated Back + Delts day it had "no
// hamstring work" and a Chest + Arms day it had "no pulling work" -
// criticising the app's own plans with week-level logic applied to one
// day. Balance is the generator's job across the WEEK; authoring-time
// feedback lives in the manual builder.
function MuscleTagRow({ exercises }) {
  const coverage = computeMuscleCoverage(exercises);

  if (coverage.length === 0) return null;

  return (
    <Card style={tagStyles.section}>
      <SectionLabel tone="muted">Muscle coverage</SectionLabel>
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
    </Card>
  );
}

export default function RoutineDetailScreen({ navigation, route }) {
  const toast = useToast();
  const { routineId } = route.params || {};
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, userProfile, startWorkout } = useAppStore(useShallow(s => ({
    user: s.user,
    userProfile: s.userProfile,
    startWorkout: s.startWorkout,
  })));
  const [routine, setRoutine] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [allExercises, setAllExercises] = useState([]);
  const [editingExercise, setEditingExercise] = useState(null);
  const [editSets, setEditSets] = useState('');
  const [editRepsMin, setEditRepsMin] = useState('');
  const [editRepsMax, setEditRepsMax] = useState('');
  const [editRest, setEditRest] = useState('');
  const [editStartWeight, setEditStartWeight] = useState('');
  const [swapState, setSwapState] = useState(null);
  const [swapCandidates, setSwapCandidates] = useState([]);
  const [showSwapPicker, setShowSwapPicker] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  // A4: division fingerprint line ("Built for Bikini: ..."), set only when
  // this routine belongs to the user's ACTIVE generated division plan.
  const [divisionLine, setDivisionLine] = useState(null);

  useEffect(() => {
    if (routineId) loadRoutine();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routineId]);

  async function loadRoutine() {
    const r = await getRoutineById(routineId);
    if (!r) return;
    setRoutine(r);

    const withExercises = await getRoutineExercisesWithDetails(routineId);
    setExercises(withExercises);

    const all = await getAllExercises();
    setAllExercises(all);

    // A4: division fingerprint. Pure re-presentation of the volume overlay
    // the generator already applied to this plan: diff the division plan's
    // weekly set counts against the general plan for the SAME profile inputs
    // (the engine is deterministic, so this recomputes exactly what was
    // applied). Only shown when this routine is part of the ACTIVE generated
    // division plan; best-effort, the line simply stays absent on failure.
    try {
      const goal = userProfile?.trainingGoal;
      const active = r.programmeId && user?.id
        ? await getActivePlan(user.id).catch(() => null)
        : null;
      if (active && r.programmeId === active.id && planWearsDivision(active.name, goal)) {
        const inputs = buildPlanInputs(userProfile);
        const diff = inputs ? computeDivisionDiff({ ...inputs, exerciseLibrary: all }) : null;
        setDivisionLine(diff ? divisionFingerprintLine(goal, diff) : null);
      } else {
        setDivisionLine(null);
      }
    } catch (_) {
      setDivisionLine(null);
    }
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
    appAlert(
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
    audit('workout.start.tap', {
      routineId,
      exerciseCount: exercises.length,
    });
    if (exercises.length === 0) {
      appAlert(
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
      toast.show("Couldn't start workout, try again", { variant: 'error' });
    }
  }

  if (!routine) return null;

  // Stable A/B/C labels for superset groups, in first-appearance order.
  // Read-only here: supersets are created/edited in the plan builder
  // (which owns the write path); this surface only displays them.
  const supersetGroupOrder = [];
  for (const { routineExercise } of exercises) {
    const gid = routineExercise?.supersetGroupId;
    if (gid && !supersetGroupOrder.includes(gid)) supersetGroupOrder.push(gid);
  }

  const reorderToggle = (
    <TouchableOpacity
      onPress={() => setIsReordering(prev => !prev)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={isReordering ? 'Done reordering' : 'Reorder exercises'}
    >
      <Text style={{ fontSize: fontSize.md, color: isReordering ? colors.primary : colors.textSecondary, fontWeight: isReordering ? fontWeight.bold : fontWeight.regular }}>
        {isReordering ? 'Done' : 'Reorder'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader title="Edit workout" right={reorderToggle} />
      <FlashList
        data={exercises}
        keyExtractor={item => item.routineExercise.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Button
              title="Start This Workout"
              icon="play-circle"
              size="lg"
              onPress={handleStartWorkout}
              style={styles.startBtn}
            />
            <MuscleTagRow exercises={exercises} />
            {divisionLine ? (
              <Text style={styles.divisionLine}>{divisionLine}</Text>
            ) : null}
            {routine.split_type ? (
              <Text style={styles.splitRationale}>{getSplitRationale(routine.split_type)}</Text>
            ) : null}
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
                // recovery-narrow list, we don't know what muscle the
                // original was so we can't filter intelligently.
                setSwapCandidates(allExercises.map(e => ({ exercise: e })));
                return;
              }
              openEdit(routineExercise, exercise);
            }}
            activeOpacity={isReordering ? 1 : 0.8}
            accessibilityRole={isReordering ? undefined : 'button'}
            accessibilityLabel={isReordering ? undefined : (exercise.unresolved ? `Re-link ${exercise.name}` : `Edit ${exercise.name}`)}
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
                {(() => {
                  const gid = routineExercise?.supersetGroupId;
                  const gIdx = gid ? supersetGroupOrder.indexOf(gid) : -1;
                  if (gIdx < 0) return null;
                  return (
                    <View style={styles.supersetChip}>
                      <Ionicons name="link" size={11} color={colors.primary} />
                      <Text style={styles.supersetChipText}>
                        Superset {String.fromCharCode(65 + gIdx)}
                      </Text>
                    </View>
                  );
                })()}
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
                  accessibilityRole="button"
                  accessibilityState={{ disabled: index === 0 }}
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
                  accessibilityRole="button"
                  accessibilityState={{ disabled: index === exercises.length - 1 }}
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
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${exercise.name}`}
                >
                  <Ionicons name="create-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleOpenSwap(routineExercise, exercise)}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Swap ${exercise.name}`}
                >
                  <Ionicons name="swap-horizontal" size={20} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => appAlert(
                    'Remove exercise?',
                    `Remove ${exercise.name} from this routine?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeExercise(routineExercise) },
                    ],
                  )}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${exercise.name}`}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddExercise(true)} accessibilityRole="button" accessibilityLabel="Add exercise">
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
        <TouchableOpacity accessibilityRole="button" style={styles.editOverlay} activeOpacity={1} onPress={() => setEditingExercise(null)}>
          <TouchableOpacity accessibilityRole="button" style={styles.editSheet} activeOpacity={1}>
            <Text style={styles.editTitle}>{editingExercise?.exercise?.name}</Text>
            <View style={styles.editRow}>
              <TextField
                label="Sets"
                containerStyle={styles.editField}
                fieldStyle={styles.editInputField}
                inputStyle={styles.editInput}
                accessibilityLabel={`Sets for ${editingExercise?.exercise?.name || 'exercise'}`}
                value={editSets}
                onChangeText={setEditSets}
                keyboardType="number-pad"
                maxLength={2}
                placeholderTextColor={colors.textMuted}
              />
              <TextField
                label="Reps min"
                containerStyle={styles.editField}
                fieldStyle={styles.editInputField}
                inputStyle={styles.editInput}
                accessibilityLabel={`Minimum reps for ${editingExercise?.exercise?.name || 'exercise'}`}
                value={editRepsMin}
                onChangeText={setEditRepsMin}
                keyboardType="number-pad"
                maxLength={3}
                placeholderTextColor={colors.textMuted}
              />
              <TextField
                label="Reps max"
                containerStyle={styles.editField}
                fieldStyle={styles.editInputField}
                inputStyle={styles.editInput}
                accessibilityLabel={`Maximum reps for ${editingExercise?.exercise?.name || 'exercise'}`}
                value={editRepsMax}
                onChangeText={setEditRepsMax}
                keyboardType="number-pad"
                maxLength={3}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.editRow}>
              <TextField
                label="Rest (s)"
                containerStyle={styles.editField}
                fieldStyle={styles.editInputField}
                inputStyle={styles.editInput}
                accessibilityLabel={`Rest seconds for ${editingExercise?.exercise?.name || 'exercise'}`}
                value={editRest}
                onChangeText={setEditRest}
                keyboardType="number-pad"
                placeholder="90"
                maxLength={4}
                placeholderTextColor={colors.textMuted}
              />
              <TextField
                label="Start weight"
                containerStyle={styles.editField}
                fieldStyle={styles.editInputField}
                inputStyle={styles.editInput}
                accessibilityLabel={`Starting weight for ${editingExercise?.exercise?.name || 'exercise'}`}
                value={editStartWeight}
                onChangeText={setEditStartWeight}
                keyboardType="decimal-pad"
                placeholder="kg"
                maxLength={6}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <Button
              title="Save"
              style={styles.editSaveBtn}
              textStyle={styles.editSaveBtnText}
              onPress={saveEdit}
              accessibilityLabel="Save exercise targets"
            />
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
            <TouchableOpacity onPress={() => { setSwapState(null); setSwapCandidates([]); }} accessibilityRole="button" accessibilityLabel="Close swap">
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.swapSubtitle}>
            Replacing: <Text style={{ color: colors.primary }}>{swapState?.exercise?.name}</Text>
          </Text>
          <Text style={styles.swapNote}>
            Choose a substitute. Your routine will be updated. Your set, rep and rest targets stay the same.
          </Text>
          <FlashList
            data={swapCandidates}
            keyExtractor={item => item.exercise.id}
            contentContainerStyle={{ padding: spacing.lg }}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            renderItem={({ item }) => (
              <Card
                radius="md"
                style={styles.swapItem}
                onPress={() => handleConfirmSwap(item.exercise)}
                accessibilityLabel={`Swap in ${item.exercise.name}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.swapItemName}>{item.exercise.name}</Text>
                  <Text style={styles.swapItemReason}>{item.reason}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Card>
            )}
            ListEmptyComponent={
              <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl }}>
                No similar exercises found.
              </Text>
            }
            ListFooterComponent={
              <TouchableOpacity
                style={styles.swapSearchAll}
                onPress={() => setShowSwapPicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Search all exercises or create your own"
              >
                <Ionicons name="search" size={18} color={colors.primary} />
                <Text style={styles.swapSearchAllText}>Search all exercises or create your own</Text>
              </TouchableOpacity>
            }
          />
        </SafeAreaView>
      </Modal>

      <ExercisePickerModal
        visible={showAddExercise}
        onClose={() => setShowAddExercise(false)}
        onSelect={addExercise}
        saveLabel="Add to plan"
      />

      {/* Swap via the full library / a custom exercise, when none of the
          ranked substitutes fit. Routes the choice through handleConfirmSwap
          so it confirms + applies the same way as a ranked pick. */}
      <ExercisePickerModal
        visible={showSwapPicker}
        onClose={() => setShowSwapPicker(false)}
        onSelect={(ex) => { setShowSwapPicker(false); handleConfirmSwap(ex); }}
        saveLabel="Swap in"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  startBtn: { marginBottom: spacing.xl },
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
    borderRadius: circle(32),
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeUnresolved: { backgroundColor: withAlpha(colors.warning, 0.251) },
  orderNum: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textSecondary },
  exerciseInfo: { flex: 1, gap: spacing.xxs },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  exerciseName: { ...type.bodyStrong, color: colors.textPrimary },
  exerciseNameUnresolved: { color: colors.warning },
  relinkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: withAlpha(colors.warning, 0.376),
  },
  relinkChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  supersetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryBg,
  },
  supersetChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  exerciseMeta: { fontSize: fontSize.sm, color: colors.primary },
  exerciseMuscle: { ...type.caption, color: colors.textMuted },
  exerciseWhy: { ...type.captionTight, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.xxs },
  splitRationale: { ...type.bodySm, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.sm },
  divisionLine: { ...type.bodySm, color: colors.textMuted, marginTop: spacing.xs },
  exerciseStartWeight: { ...type.num('caption'), color: colors.primary },
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
  editOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
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
  editField: { flex: 1 },
  editInputField: { borderRadius: radius.md },
  editInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  editSaveBtn: {
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.xs,
  },
  editSaveBtnText: { ...type.bodyStrong, color: colors.onPrimary },
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
  emptyText: { ...type.body, color: colors.textMuted },
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
    ...type.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  // Card owns background/radius/padding/border here.
  swapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  swapItemName: {
    ...type.bodyStrong,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  swapItemReason: { ...type.captionTight, color: colors.textMuted },
  swapSearchAll: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.lg, marginTop: spacing.sm,
  },
  swapSearchAllText: { ...type.label, color: colors.primary },
});

const tagStyles = StyleSheet.create({
  // Card owns background/radius/padding/border here.
  section: {
    marginBottom: spacing.md,
    gap: spacing.sm,
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
    backgroundColor: withAlpha(colors.success, 0.188),
  },
  chipHigh: {
    backgroundColor: withAlpha(colors.primary, 0.188),
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
});
