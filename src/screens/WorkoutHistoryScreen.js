import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { getAllWorkouts, getAllWorkoutSets, getAllExercises, createWorkout } from '../lib/database';
import { calculateTonnage } from '../lib/algorithms';
import useAppStore from '../store/useAppStore';

export default function WorkoutHistoryScreen({ navigation }) {
  const { user, startWorkout } = useAppStore();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkouts();
  }, [user?.id]);

  async function loadWorkouts() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const allWorkouts = await getAllWorkouts(user.id);
      const mine = allWorkouts
        .filter(w => w.isCompleted)
        .sort((a, b) => b.startedAt - a.startedAt);

      const allSets = await getAllWorkoutSets(user.id);
      const allExercises = await getAllExercises();
      const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));

      const withSets = mine.slice(0, 50).map(w => {
        const mySets = allSets.filter(s => s.workoutId === w.id);
        const exerciseIds = [...new Set(mySets.map(s => s.exerciseId))];
        const exerciseNames = exerciseIds.slice(0, 4)
          .map(id => exerciseMap[id]?.name)
          .filter(Boolean);
        return {
          workout: w,
          setCount: mySets.length,
          exerciseCount: exerciseIds.length,
          tonnage: calculateTonnage(mySets),
          exerciseNames,
        };
      });
      setWorkouts(withSets);
    } finally {
      setLoading(false);
    }
  }

  async function handleRepeatWorkout(workout) {
    const newWorkout = await createWorkout(user.id, workout.routineId || null);
    startWorkout(newWorkout);
    navigation.navigate('ActiveWorkout');
  }

  function renderItem({ item }) {
    const { workout, setCount, exerciseCount, tonnage, exerciseNames } = item;
    const date = new Date(workout.startedAt);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardDate}>{format(date, 'EEEE, MMM d')}</Text>
            <Text style={styles.cardTime}>{formatDistanceToNow(date, { addSuffix: true })}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.cardMetaText}>{workout.durationMinutes || 0}m</Text>
            <Text style={styles.cardMetaDivider}>·</Text>
            <Ionicons name="layers-outline" size={14} color={colors.textMuted} />
            <Text style={styles.cardMetaText}>{setCount} sets</Text>
          </View>
        </View>
        <Text style={styles.exerciseList} numberOfLines={2}>
          {exerciseNames.join(', ') || 'No exercises logged'}
        </Text>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() =>
              navigation.navigate('WorkoutSummary', {
                workoutId: workout.id,
                durationMinutes: workout.durationMinutes,
                exerciseCount,
                setCount,
                tonnage,
                exerciseNames,
              })
            }
          >
            <Text style={styles.viewBtnText}>View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.repeatBtn}
            onPress={() => handleRepeatWorkout(workout)}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.primary} />
            <Text style={styles.repeatBtnText}>Repeat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={workouts}
        keyExtractor={item => item.workout.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="barbell-outline" size={48} color={colors.surface3} />
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptyText}>Completed workouts will appear here.{' '}Start a session from the Train tab.</Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardDate: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  cardTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardMetaText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  cardMetaDivider: {
    color: colors.border,
  },
  exerciseList: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center',
  },
  viewBtnText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  repeatBtnText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.xl,
  },
});
