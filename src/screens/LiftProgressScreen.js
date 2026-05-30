import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import AnimatedEntrance from '../components/AnimatedEntrance';
import PressableCard from '../components/PressableCard';
import { getCompletedWorkoutSets, getAllExercises } from '../lib/database';
import { buildLiftProgressRows } from '../lib/liftProgress';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import Sparkline from '../components/Sparkline';
import useAppStore from '../store/useAppStore';

// Lift Progress, every lift you've actually trained, most recent first,
// with the estimated-1RM trend at a glance. Tap a lift for its full
// strength chart, PRs and goal on ExerciseDetail.
export default function LiftProgressScreen({ navigation }) {
  const { user, units } = useAppStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { if (user?.id) loadData(); }, [user?.id]));

  async function loadData() {
    if (!user?.id) { setLoading(false); return; }
    try {
      const [sets, exercises] = await Promise.all([
        getCompletedWorkoutSets(user.id),
        getAllExercises(),
      ]);
      setRows(buildLiftProgressRows(sets, exercises));
    } catch (e) {
      // Loading failure leaves the list empty; the empty state covers it.
      console.error('LiftProgressScreen loadData:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function trendColor(deltaPct) {
    if (deltaPct == null) return colors.textMuted;
    if (deltaPct > 0) return colors.success;
    if (deltaPct < 0) return colors.error;
    return colors.textMuted;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={rows}
        keyExtractor={r => String(r.exerciseId)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item, index }) => {
          const muscle = item.primaryMuscle
            ? (MUSCLE_DISPLAY_NAMES[item.primaryMuscle] || item.primaryMuscle)
            : null;
          return (
            <AnimatedEntrance index={index}>
            <PressableCard
              style={styles.card}
              onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.exerciseId })}
            >
              <View style={styles.cardMain}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.meta}>
                  {muscle ? `${muscle} · ` : ''}{item.sessions} {item.sessions === 1 ? 'session' : 'sessions'} · last {format(new Date(item.lastTrainedAt), 'MMM d')}
                </Text>
                <View style={styles.statRow}>
                  <Text style={styles.statValue}>{item.bestE1rm}{units}</Text>
                  <Text style={styles.statLabel}>est. max</Text>
                  {item.deltaPct != null && item.sessions > 1 && (
                    <Text style={[styles.delta, { color: trendColor(item.deltaPct) }]}>
                      {item.deltaPct > 0 ? '+' : ''}{item.deltaPct}%
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.cardRight}>
                <Sparkline data={item.trend} width={84} height={34} color={trendColor(item.deltaPct)} />
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </PressableCard>
            </AnimatedEntrance>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="barbell-outline" size={56} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No lifts logged yet</Text>
              <Text style={styles.emptyText}>
                Log a few sessions and each lift's trend shows up here.
              </Text>
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
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardMain: { flex: 1, gap: spacing.xxs },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textMuted },
  statRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: spacing.xxs },
  statValue: { fontSize: fontSize.lg, fontWeight: fontWeight.heavy, color: colors.textPrimary },
  statLabel: { ...type.caption, color: colors.textMuted },
  delta: { ...type.num('label'), marginLeft: spacing.xs },
  cardRight: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  empty: { alignItems: 'center', paddingHorizontal: spacing.xxl, paddingTop: spacing.xxxl, gap: spacing.md },
  emptyTitle: { ...type.title, color: colors.textPrimary, textAlign: 'center' },
  emptyText: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
