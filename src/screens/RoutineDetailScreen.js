import { useState, useEffect, useMemo } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, circle, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
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
import { swapAdjacentBlocks } from '../lib/reorder';
import DragReorderList from '../components/DragReorderList';
import { useDragAutoScrollBridge } from '../components/DragReorderList';
import { logError } from '../lib/errorLog';
import { audit } from '../lib/observability';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/Toast';
import ExercisePickerModal from '../components/ExercisePickerModal';
import BottomSheet from '../components/BottomSheet';
import * as haptics from '../lib/haptics';

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
// CP-10 batch G (2026-07-11): sibling function-component scope (not
// prop-drilled `live`/`t` from RoutineDetailScreen, matching
// NutritionTargetsScreen's MacroCard/WhySection precedent from batch E), own
// useTheme() call. Uses its own separate `tagStyles` block (not the main
// screen's `styles`), so it gets its own buildTagLiveStyles(t) below rather
// than sharing the main buildLiveStyles(t).
function MuscleTagRow({ exercises }) {
  const t = useTheme();
  const tagLive = useMemo(() => buildTagLiveStyles(t), [t]);
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
            ? [tagStyles.chipHigh, tagLive.chipHigh]
            : count === 2
            ? [tagStyles.chipMid, tagLive.chipMid]
            : [tagStyles.chipLow, tagLive.chipLow];
          const textStyle = count >= 3
            ? [tagStyles.chipTextHigh, tagLive.chipTextHigh]
            : count === 2
            ? [tagStyles.chipTextMid, tagLive.chipTextMid]
            : [tagStyles.chipTextLow, tagLive.chipTextLow];
          return (
            <View key={muscle} style={[tagStyles.chip, chipStyle]}>
              <Text maxFontSizeMultiplier={1.3} style={[tagStyles.chipText, tagLive.chipText, textStyle]}>
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
  const { user, userProfile, startWorkout, reduceMotion } = useAppStore(useShallow(s => ({
    user: s.user,
    userProfile: s.userProfile,
    startWorkout: s.startWorkout,
    reduceMotion: s.accessibility?.reduceMotion,
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
  // D35: edge auto-scroll for the reorder-mode ScrollView below.
  const { scrollRef, scrollOffset, onScroll, onContentSizeChange } = useDragAutoScrollBridge();
  // A4: division fingerprint line ("Built for Bikini: ..."), set only when
  // this routine belongs to the user's ACTIVE generated division plan.
  const [divisionLine, setDivisionLine] = useState(null);
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);

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
    haptics.commit();
    await removeExerciseFromRoutine(routineExercise.id);
    await loadRoutine();
  }

  async function addExercise(exercise) {
    haptics.selection();
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
            haptics.selection();
            await updateRoutineExerciseExercise(swapState.routineExerciseId, newExercise.id);
            setSwapState(null);
            setSwapCandidates([]);
            await loadRoutine();
          },
        },
      ],
    );
  }

  // D32 (2026-07-10, campaign item 20): made BLOCK-AWARE, closing this
  // surface's pre-existing gap -- the old plain adjacent-index swap above
  // could split a superset/giant-set pair (e.g. moving a lone exercise past
  // a paired one landed it BETWEEN the pair's members). Reuses the same
  // block-move arithmetic every other reorder surface shares
  // (src/lib/reorder.js, unit-tested there directly): a block moves and
  // lands whole. Persists every exercise whose position actually changed
  // via the SAME updateRoutineExerciseOrder call this always used --
  // byte-identical two writes for the common lone-exercise-vs-lone-exercise
  // case, generalised to more writes only when a block of 2+ actually moved.
  async function handleMoveExercise(routineExerciseId, direction) {
    const index = exercises.findIndex(e => e.routineExercise.id === routineExerciseId);
    if (index === -1) return;
    const updated = swapAdjacentBlocks(exercises, index, direction, e => e.routineExercise?.supersetGroupId ?? null);
    if (updated === exercises) return; // already at the boundary
    haptics.selection();

    const previous = exercises;
    setExercises(updated);

    try {
      for (let i = 0; i < updated.length; i++) {
        if (previous[i]?.routineExercise.id !== updated[i].routineExercise.id) {
          await updateRoutineExerciseOrder(updated[i].routineExercise.id, i);
        }
      }
    } catch (_err) {
      // Revert on failure
      setExercises(previous);
    }
  }

  // D32: true long-press drag, additive to the chevrons above.
  // DragReorderList already fires the pickup/drop haptics itself. Persists
  // every exercise whose position actually changed, via the SAME
  // updateRoutineExerciseOrder call handleMoveExercise uses.
  async function handleReorderExercises(nextExercises) {
    const previous = exercises;
    setExercises(nextExercises);
    try {
      for (let i = 0; i < nextExercises.length; i++) {
        if (previous[i]?.routineExercise.id !== nextExercises[i].routineExercise.id) {
          await updateRoutineExerciseOrder(nextExercises[i].routineExercise.id, i);
        }
      }
    } catch (_err) {
      setExercises(previous);
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
          { text: 'Add exercise', onPress: () => setShowAddExercise(true) },
          {
            text: 'Start blank workout',
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
      onPress={() => { haptics.selection(); setIsReordering(prev => !prev); }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={isReordering ? 'Done reordering' : 'Reorder exercises'}
    >
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: t.fontSize.md, color: isReordering ? t.colors.primary : t.colors.textSecondary, fontWeight: isReordering ? fontWeight.bold : fontWeight.regular }}>
        {isReordering ? 'Done' : 'Reorder'}
      </Text>
    </TouchableOpacity>
  );

  // D32 (2026-07-10): the header above the exercise list is identical
  // whether it renders inside FlashList's ListHeaderComponent (browsing) or
  // above the drag list (reorder mode, see below) -- one JSX value shared
  // by both so the two containers can never drift apart.
  const listHeader = (
    <>
      <Button
        title="Start this workout"
        icon="play-circle"
        size="lg"
        onPress={handleStartWorkout}
        style={styles.startBtn}
      />
      <MuscleTagRow exercises={exercises} />
      {divisionLine ? (
        <Text maxFontSizeMultiplier={1.3} style={[styles.divisionLine, live.divisionLine]}>{divisionLine}</Text>
      ) : null}
      {routine.split_type ? (
        <Text maxFontSizeMultiplier={1.3} style={[styles.splitRationale, live.splitRationale]}>{getSplitRationale(routine.split_type)}</Text>
      ) : null}
    </>
  );

  // Same function either way (FlashList's renderItem and DragReorderList's
  // renderRow share the exact `{ item, index }` call shape) -- this already
  // branches internally on `isReordering` for its trailing action column, so
  // nothing here needs to change between the two containers below.
  const renderExerciseRow = ({ item: { routineExercise, exercise }, index }) => (
          <TouchableOpacity
            style={[styles.exerciseCard, live.exerciseCard, exercise.unresolved && [styles.exerciseCardUnresolved, live.exerciseCardUnresolved]]}
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
            <View style={[styles.orderBadge, live.orderBadge, exercise.unresolved && [styles.orderBadgeUnresolved, live.orderBadgeUnresolved]]}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.orderNum, live.orderNum]}>{index + 1}</Text>
            </View>
            <View style={styles.exerciseInfo}>
              <View style={styles.exerciseTitleRow}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.exerciseName, live.exerciseName, exercise.unresolved && [styles.exerciseNameUnresolved, live.exerciseNameUnresolved]]}>
                  {exercise.name || 'Exercise (couldn’t restore)'}
                </Text>
                {exercise.unresolved && (
                  <View style={[styles.relinkChip, live.relinkChip]}>
                    <Ionicons name="link-outline" size={12} color={t.colors.warning} />
                    <Text maxFontSizeMultiplier={1.3} style={[styles.relinkChipText, live.relinkChipText]}>Tap to re-link</Text>
                  </View>
                )}
                {(() => {
                  const gid = routineExercise?.supersetGroupId;
                  const gIdx = gid ? supersetGroupOrder.indexOf(gid) : -1;
                  if (gIdx < 0) return null;
                  return (
                    <View style={[styles.supersetChip, live.supersetChip]}>
                      <Ionicons name="link" size={11} color={t.colors.primary} />
                      <Text maxFontSizeMultiplier={1.3} style={[styles.supersetChipText, live.supersetChipText]}>
                        Superset {String.fromCharCode(65 + gIdx)}
                      </Text>
                    </View>
                  );
                })()}
              </View>
              <Text maxFontSizeMultiplier={1.3} style={[styles.exerciseMeta, live.exerciseMeta]}>
                {routineExercise.recommendedSets} sets ·{' '}
                {routineExercise.recommendedRepsMin}–{routineExercise.recommendedRepsMax} reps
                {routineExercise.restSeconds ? ` · ${routineExercise.restSeconds}s rest` : ''}
              </Text>
              {routineExercise.startingWeight > 0 ? (
                <Text maxFontSizeMultiplier={1.3} style={[styles.exerciseStartWeight, live.exerciseStartWeight]}>
                  Start: {routineExercise.startingWeight} kg
                </Text>
              ) : null}
              <Text maxFontSizeMultiplier={1.3} style={[styles.exerciseMuscle, live.exerciseMuscle]}>
                {MUSCLE_DISPLAY_NAMES[exercise.primaryMuscle] ||
                  (exercise.primaryMuscle || '').charAt(0).toUpperCase() +
                  (exercise.primaryMuscle || '').slice(1).replace(/_/g, ' ')}
              </Text>
              {(() => {
                const why = getExerciseWhyThis(exercise.name, exercise.subregion);
                return why ? <Text maxFontSizeMultiplier={1.3} style={[styles.exerciseWhy, live.exerciseWhy]}>{why}</Text> : null;
              })()}
            </View>
            {isReordering ? (
              <View style={styles.reorderActions}>
                <TouchableOpacity
                  onPress={() => handleMoveExercise(routineExercise.id, 'up')}
                  style={[styles.reorderBtn, live.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
                  disabled={index === 0}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: index === 0 }}
                  accessibilityLabel={`Move ${exercise.name} up`}
                >
                  <Ionicons
                    name="chevron-up"
                    size={16}
                    color={index === 0 ? t.colors.border : t.colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleMoveExercise(routineExercise.id, 'down')}
                  style={[styles.reorderBtn, live.reorderBtn, index === exercises.length - 1 && styles.reorderBtnDisabled]}
                  disabled={index === exercises.length - 1}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: index === exercises.length - 1 }}
                  accessibilityLabel={`Move ${exercise.name} down`}
                >
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={index === exercises.length - 1 ? t.colors.border : t.colors.textMuted}
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
                  <Ionicons name="create-outline" size={20} color={t.colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleOpenSwap(routineExercise, exercise)}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Swap ${exercise.name}`}
                >
                  <Ionicons name="swap-horizontal" size={20} color={t.colors.textMuted} />
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
                  <Ionicons name="trash-outline" size={20} color={t.colors.error} />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
  );

  const addExerciseFooter = (
    <Button
      title="Add exercise"
      icon="add"
      variant="tertiary"
      onPress={() => setShowAddExercise(true)}
      style={[styles.addBtn, live.addBtn, { backgroundColor: 'transparent' }]}
      textStyle={[styles.addBtnText, live.addBtnText]}
      accessibilityLabel="Add exercise"
    />
  );

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Edit workout" right={reorderToggle} />
      {isReordering ? (
        // D32 (2026-07-10): true long-press drag, block-aware (see
        // handleMoveExercise's own comment). FlashList's virtualisation
        // doesn't suit an absolute-positioned drag overlay, so reorder mode
        // swaps to a plain ScrollView + DragReorderList -- browsing mode
        // (below) is completely untouched. The chevrons inside each row
        // stay the accessible move path; DragReorderList hides its own
        // drag handle from screen readers.
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          onContentSizeChange={onContentSizeChange}
          scrollEventThrottle={16}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        >
          {listHeader}
          {exercises.length > 0 ? (
            <DragReorderList
              items={exercises}
              keyExtractor={(item) => item.routineExercise.id}
              getGroupId={(item) => item.routineExercise?.supersetGroupId ?? null}
              onReorder={handleReorderExercises}
              handleAccessibilityLabel={(item) => `Drag to reorder ${item.exercise.name}`}
              renderRow={renderExerciseRow}
              gap={spacing.md}
              scrollRef={scrollRef}
              scrollOffset={scrollOffset}
            />
          ) : (
            <View style={styles.empty}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.emptyText, live.emptyText]}>No exercises yet. Add some below.</Text>
            </View>
          )}
          {/* Same footer FlashList renders below -- reorder mode showed it
              before this browse/reorder split, so it stays reachable here. */}
          {addExerciseFooter}
        </ScrollView>
      ) : (
        <FlashList
          data={exercises}
          keyExtractor={item => item.routineExercise.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={listHeader}
          renderItem={renderExerciseRow}
          ListFooterComponent={addExerciseFooter}
          ListEmptyComponent={
            !exercises.length ? (
              <View style={styles.empty}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.emptyText, live.emptyText]}>No exercises yet. Add some below.</Text>
              </View>
            ) : null
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        />
      )}

      {/* Edit exercise modal.
          D36a (item 17 modal tails, 2026-07-10): migrated off a hand-rolled
          Modal onto the shared BottomSheet chrome. Fixes a genuine inset bug
          (editSheet had no safe-area padding) alongside the migration.
          `keyboardAvoiding` replaces the KeyboardAvoidingView this sheet used
          to wrap itself in -- BottomSheet's own keyboardBehavior handles the
          lift, same as every other BottomSheet consumer with TextFields
          (QuickAddSheet, FoodDetailSheet); TextField itself already swaps to
          BottomSheetTextInput automatically inside a sheet (BottomSheet.js's
          InsideBottomSheetContext), so no other input change was needed. */}
      <BottomSheet
        visible={!!editingExercise}
        onClose={() => setEditingExercise(null)}
        keyboardAvoiding
        accessibilityLabel={editingExercise?.exercise?.name ? `Edit ${editingExercise.exercise.name}` : 'Edit exercise'}
      >
            <Text maxFontSizeMultiplier={1.3} style={[styles.editTitle, live.editTitle]}>{editingExercise?.exercise?.name}</Text>
            <View style={styles.editRow}>
              <TextField
                label="Sets"
                containerStyle={styles.editField}
                fieldStyle={styles.editInputField}
                inputStyle={[styles.editInput, live.editInput]}
                accessibilityLabel={`Sets for ${editingExercise?.exercise?.name || 'exercise'}`}
                value={editSets}
                onChangeText={setEditSets}
                keyboardType="number-pad"
                maxLength={2}
                placeholderTextColor={t.colors.textMuted}
              />
              <TextField
                label="Reps min"
                containerStyle={styles.editField}
                fieldStyle={styles.editInputField}
                inputStyle={[styles.editInput, live.editInput]}
                accessibilityLabel={`Minimum reps for ${editingExercise?.exercise?.name || 'exercise'}`}
                value={editRepsMin}
                onChangeText={setEditRepsMin}
                keyboardType="number-pad"
                maxLength={3}
                placeholderTextColor={t.colors.textMuted}
              />
              <TextField
                label="Reps max"
                containerStyle={styles.editField}
                fieldStyle={styles.editInputField}
                inputStyle={[styles.editInput, live.editInput]}
                accessibilityLabel={`Maximum reps for ${editingExercise?.exercise?.name || 'exercise'}`}
                value={editRepsMax}
                onChangeText={setEditRepsMax}
                keyboardType="number-pad"
                maxLength={3}
                placeholderTextColor={t.colors.textMuted}
              />
            </View>
            <View style={styles.editRow}>
              <TextField
                label="Rest (s)"
                containerStyle={styles.editField}
                fieldStyle={styles.editInputField}
                inputStyle={[styles.editInput, live.editInput]}
                accessibilityLabel={`Rest seconds for ${editingExercise?.exercise?.name || 'exercise'}`}
                value={editRest}
                onChangeText={setEditRest}
                keyboardType="number-pad"
                placeholder="90"
                maxLength={4}
                placeholderTextColor={t.colors.textMuted}
              />
              <TextField
                label="Start weight"
                containerStyle={styles.editField}
                fieldStyle={styles.editInputField}
                inputStyle={[styles.editInput, live.editInput]}
                accessibilityLabel={`Starting weight for ${editingExercise?.exercise?.name || 'exercise'}`}
                value={editStartWeight}
                onChangeText={setEditStartWeight}
                keyboardType="decimal-pad"
                placeholder="kg"
                maxLength={6}
                placeholderTextColor={t.colors.textMuted}
              />
            </View>
            <Button
              title="Save"
              style={styles.editSaveBtn}
              textStyle={[styles.editSaveBtnText, live.editSaveBtnText]}
              onPress={saveEdit}
              accessibilityLabel="Save exercise targets"
            />
      </BottomSheet>

      {/* Plan-level swap modal */}
      <Modal
        visible={swapState != null}
        animationType={reduceMotion ? 'none' : 'slide'}
        onRequestClose={() => { setSwapState(null); setSwapCandidates([]); }}
      >
        {/* AY-4 (2026-07-09 design audit): traps screen-reader navigation to
            this sheet while it's the modal's own content (matches
            BottomSheet.js/AppAlert.js/FeedbackSheet.js/PeekMenu.js). */}
        <SafeAreaView style={[styles.swapSafe, live.swapSafe]} edges={['top', 'bottom']} accessibilityViewIsModal>
          <View style={[styles.swapHeader, live.swapHeader]}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.swapTitle, live.swapTitle]}>Swap exercise</Text>
            <TouchableOpacity onPress={() => { setSwapState(null); setSwapCandidates([]); }} accessibilityRole="button" accessibilityLabel="Close swap">
              <Ionicons name="close" size={24} color={t.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <Text maxFontSizeMultiplier={1.3} style={[styles.swapSubtitle, live.swapSubtitle]}>
            Replacing: <Text maxFontSizeMultiplier={1.3} style={{ color: t.colors.primary }}>{swapState?.exercise?.name}</Text>
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.swapNote, live.swapNote]}>
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
                  <Text maxFontSizeMultiplier={1.3} style={[styles.swapItemName, live.swapItemName]}>{item.exercise.name}</Text>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.swapItemReason, live.swapItemReason]}>{item.reason}</Text>
                </View>
                <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
              </Card>
            )}
            ListEmptyComponent={
              <Text maxFontSizeMultiplier={1.3} style={{ color: t.colors.textMuted, textAlign: 'center', marginTop: spacing.xl }}>
                No close matches yet.
              </Text>
            }
            ListFooterComponent={
              <Button
                title="Search all exercises or create your own"
                icon="search"
                variant="tertiary"
                onPress={() => setShowSwapPicker(true)}
                style={[styles.swapSearchAll, { backgroundColor: 'transparent' }]}
                textStyle={[styles.swapSearchAllText, live.swapSearchAllText]}
                accessibilityLabel="Search all exercises or create your own"
              />
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
  // BottomSheet supplies the backdrop, panel chrome and drag handle now
  // (D36a migration) -- only the content-level styles below remain.
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

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/gap/padding/width/height/borderWidth/borderStyle/opacity, no
// token) are correctly omitted -- there is nothing to unfreeze for them.
// Same pattern as AddCustomFoodScreen.js's buildLiveStyles (batch D).
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    exerciseCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    exerciseCardUnresolved: { borderColor: t.colors.warning, backgroundColor: t.colors.warningBg },
    orderBadge: { backgroundColor: t.colors.surface2 },
    orderBadgeUnresolved: { backgroundColor: withAlpha(t.colors.warning, 0.251) },
    orderNum: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    exerciseName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    exerciseNameUnresolved: { color: t.colors.warning },
    relinkChip: { backgroundColor: t.colors.warningBg, borderColor: withAlpha(t.colors.warning, 0.376) },
    relinkChipText: { fontSize: t.fontSize.xs, color: t.colors.warning },
    supersetChip: { backgroundColor: t.colors.primaryBg },
    supersetChipText: { fontSize: t.fontSize.xs, color: t.colors.primary },
    exerciseMeta: { fontSize: t.fontSize.sm, color: t.colors.primary },
    exerciseMuscle: { ...t.type.caption, color: t.colors.textMuted },
    exerciseWhy: { ...t.type.captionTight, color: t.colors.textMuted },
    splitRationale: { ...t.type.bodySm, color: t.colors.textMuted },
    divisionLine: { ...t.type.bodySm, color: t.colors.textMuted },
    exerciseStartWeight: { ...t.type.num('caption'), color: t.colors.primary },
    reorderBtn: { backgroundColor: t.colors.surface2 },
    editTitle: { fontSize: t.fontSize.lg, color: t.colors.textPrimary },
    editInput: { fontSize: t.fontSize.md },
    editSaveBtnText: { ...t.type.bodyStrong, color: t.colors.onPrimary },
    addBtn: { borderColor: t.colors.primary },
    addBtnText: { fontSize: t.fontSize.md, color: t.colors.primary },
    emptyText: { ...t.type.body, color: t.colors.textMuted },
    swapSafe: { backgroundColor: t.colors.background },
    swapHeader: { borderBottomColor: t.colors.border },
    swapTitle: { fontSize: t.fontSize.xl, color: t.colors.textPrimary },
    swapSubtitle: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    swapNote: { ...t.type.caption, color: t.colors.textMuted },
    swapItemName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    swapItemReason: { ...t.type.captionTight, color: t.colors.textMuted },
    swapSearchAllText: { ...t.type.label, color: t.colors.primary },
  };
}

// CP-10 batch G (2026-07-11): separate live-styles builder for the `tagStyles`
// block above (MuscleTagRow's own StyleSheet, not the screen's main
// `styles`), same byte-identical-frozen-block rule.
function buildTagLiveStyles(t) {
  return {
    chipLow: { backgroundColor: t.colors.surface2 },
    chipMid: { backgroundColor: withAlpha(t.colors.success, 0.188) },
    chipHigh: { backgroundColor: withAlpha(t.colors.primary, 0.188) },
    chipText: { fontSize: t.fontSize.xs },
    chipTextLow: { color: t.colors.textMuted },
    chipTextMid: { color: t.colors.success },
    chipTextHigh: { color: t.colors.primary },
  };
}
