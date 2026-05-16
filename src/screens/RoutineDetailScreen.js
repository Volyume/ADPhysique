import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  getRoutineById, getRoutineExercisesWithDetails, getAllExercises,
  addExerciseToRoutine, removeExerciseFromRoutine, createWorkout,
} from '../lib/database';
import useAppStore from '../store/useAppStore';

export default function RoutineDetailScreen({ navigation, route }) {
  const { routineId } = route.params || {};
  const { user, startWorkout } = useAppStore();
  const [routine, setRoutine] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [allExercises, setAllExercises] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (routineId) loadRoutine();
  }, [routineId]);

  async function loadRoutine() {
    const r = await getRoutineById(routineId);
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

  async function handleStartWorkout() {
    const workout = await createWorkout(user.id, routineId);
    startWorkout(workout);
    navigation.navigate('WorkoutTab', { screen: 'ActiveWorkout' });
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
          <View style={styles.exerciseCard}>
            <View style={styles.orderBadge}>
              <Text style={styles.orderNum}>{index + 1}</Text>
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseMeta}>
                {routineExercise.recommendedSets} sets ·{' '}
                {routineExercise.recommendedRepsMin}–{routineExercise.recommendedRepsMax} reps
              </Text>
              <Text style={styles.exerciseMuscle}>
                {(exercise.primaryMuscle || '').charAt(0).toUpperCase() +
                  (exercise.primaryMuscle || '').slice(1)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => Alert.alert(
                'Remove exercise?',
                `Remove ${exercise.name} from this routine?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => removeExercise(routineExercise) },
                ],
              )}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
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
