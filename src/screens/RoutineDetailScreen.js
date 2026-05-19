import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  getRoutineById, getRoutineExercisesWithDetails, getAllExercises,
  addExerciseToRoutine, removeExerciseFromRoutine, createWorkout, updateRoutineExercise,
} from '../lib/database';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import { getExerciseWhyThis } from '../lib/whyThisTemplates';
import useAppStore from '../store/useAppStore';

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

  useEffect(() => {
    if (routineId) loadRoutine();
  }, [routineId]);

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
    const workout = await createWorkout(user.id, routineId);
    const initialExercises = exercises.map(({ exercise, routineExercise }) => ({
      exercise,
      routineExercise,
      sets: [],
    }));
    startWorkout(workout, initialExercises);
    navigation.navigate('HomeTab', { screen: 'ActiveWorkout', initial: false });
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
          <TouchableOpacity style={styles.startBtn} onPress={handleStartWorkout}>
            <Ionicons name="play-circle" size={22} color={colors.background} />
            <Text style={styles.startBtnText}>Start This Workout</Text>
          </TouchableOpacity>
        }
        renderItem={({ item: { routineExercise, exercise }, index }) => (
          <TouchableOpacity
            style={styles.exerciseCard}
            onPress={() => openEdit(routineExercise, exercise)}
            activeOpacity={0.8}
          >
            <View style={styles.orderBadge}>
              <Text style={styles.orderNum}>{index + 1}</Text>
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
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
            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={() => openEdit(routineExercise, exercise)}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <Ionicons name="create-outline" size={20} color={colors.textMuted} />
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
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderNum: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textSecondary },
  exerciseInfo: { flex: 1, gap: 2 },
  exerciseName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  exerciseMeta: { fontSize: fontSize.sm, color: colors.primary },
  exerciseMuscle: { fontSize: fontSize.xs, color: colors.textMuted },
  exerciseWhy: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic', marginTop: 2, lineHeight: 16 },
  exerciseStartWeight: { fontSize: fontSize.xs, color: colors.primary },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
});
