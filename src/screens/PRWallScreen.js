import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { getCompletedWorkoutSets, getAllExercises, getLatestBodyWeight } from '../lib/database';
import { calculate1RM, getStrengthStandard } from '../lib/algorithms';
import useAppStore from '../store/useAppStore';
import InfoTooltip from '../components/InfoTooltip';

// Maps a logged exercise name to a strength-standard lift key.
const STRENGTH_LIFT_MAP = [
  { match: /bench press/i,  lift: 'bench' },
  { match: /squat/i,        lift: 'squat' },
  { match: /deadlift/i,     lift: 'deadlift' },
];

function liftKeyFor(name) {
  for (const { match, lift } of STRENGTH_LIFT_MAP) {
    if (match.test(name)) return lift;
  }
  return null;
}

export default function PRWallScreen({ navigation }) {
  const { user, units } = useAppStore();
  const [prs, setPRs] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [bodyWeight, setBodyWeight] = useState(null);
  const [strengthStandards, setStrengthStandards] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useFocusEffect(useCallback(() => { if (user?.id) loadData(); }, [user?.id]));

  async function loadData() {
    if (!user?.id) return;
    try {
      const [allSets, allExercises, bw] = await Promise.all([
        getCompletedWorkoutSets(user.id),
        getAllExercises(),
        getLatestBodyWeight(user.id),
      ]);
      const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));
      const byExercise = {};
      for (const s of allSets) {
        const ex = exerciseMap[s.exerciseId];
        if (!ex) continue;
        const name = ex.name;
        if (!byExercise[name]) byExercise[name] = [];
        byExercise[name].push(s);
      }
      const newGrouped = {};
      for (const [name, sets] of Object.entries(byExercise)) {
        const best1RM = sets.reduce((best, s) => {
          const est = calculate1RM(s.weight || 0, s.actualReps || 0);
          return est > (best?.value || 0)
            ? { value: est, reps: s.actualReps, weight: s.weight, achieved_date: new Date(s.createdAt).toISOString() }
            : best;
        }, null);
        const heaviest = sets.reduce((best, s) => {
          return (s.weight || 0) > (best?.value || 0)
            ? { value: s.weight, reps: s.actualReps, achieved_date: new Date(s.createdAt).toISOString() }
            : best;
        }, null);
        if (best1RM || heaviest) {
          newGrouped[name] = {};
          if (best1RM) newGrouped[name]['1rm_estimate'] = best1RM;
          if (heaviest) newGrouped[name]['heaviest_weight'] = heaviest;
        }
      }
      setGrouped(newGrouped);

      // Body weight is stored raw in the user's chosen unit (unit-agnostic,
      // matching how workout set weights are stored), so use it directly.
      if (bw?.weightKg) {
        const bwValue = Math.round(bw.weightKg * 10) / 10;
        setBodyWeight(bwValue);

        const standards = {};
        for (const [name, types] of Object.entries(newGrouped)) {
          const lift = liftKeyFor(name);
          const est1RM = types['1rm_estimate']?.value;
          if (lift && est1RM) {
            standards[name] = getStrengthStandard(lift, est1RM, bwValue);
          }
        }
        setStrengthStandards(standards);
      } else {
        setBodyWeight(null);
        setStrengthStandards({});
      }
    } catch (e) {
      console.error('PRWallScreen loadData:', e);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const exerciseNames = Object.keys(grouped);
  const filterWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const filterMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const filteredNames = exerciseNames.filter(name => {
    if (filter === 'all') return true;
    const types = grouped[name];
    return Object.values(types).some(pr => {
      const d = new Date(pr.achieved_date).getTime();
      if (filter === 'week') return d >= filterWeekAgo;
      if (filter === 'month') return d >= filterMonthAgo;
      return true;
    });
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['all', 'month', 'week'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f === 'all' ? 'All Time' : f === 'month' ? 'This Month' : 'This Week'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredNames}
        keyExtractor={name => name}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          bodyWeight && Object.keys(strengthStandards).length > 0 ? (
            <View style={styles.standardsCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text style={styles.standardsTitle}>Strength standards</Text>
                <InfoTooltip text={`Your estimated max single lift, shown as a multiple of your bodyweight.\n\n1.0× = you can lift your own bodyweight\n1.5× = strong for most people\n2.0× = advanced\n\nBeginner → Novice → Intermediate → Advanced → Elite`} size={13} />
              </View>
              <Text style={styles.standardsSubtitle}>vs {bodyWeight} {units} bodyweight</Text>
              {Object.entries(strengthStandards).map(([name, std]) => std ? (
                <View key={name} style={styles.standardRow}>
                  <Text style={styles.standardExercise} numberOfLines={1}>{name}</Text>
                  <Text style={styles.standardRatio}>
                    {parseFloat(std.ratio) >= 1 ? `${std.ratio}×` : `${Math.round(parseFloat(std.ratio) * 100)}%`}
                  </Text>
                  <View style={[styles.standardBadge, { backgroundColor: getLevelColor(std.label) + '25' }]}>
                    <Text style={[styles.standardLabel, { color: getLevelColor(std.label) }]}>{std.label}</Text>
                  </View>
                </View>
              ) : null)}
            </View>
          ) : !bodyWeight ? (
            <TouchableOpacity
              style={styles.bwPromptCard}
              onPress={() => navigation.navigate('ProfileTab', { screen: 'BodyMetrics', initial: false })}
              activeOpacity={0.8}
            >
              <Ionicons name="body-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bwPromptTitle}>Add your body weight</Text>
                <Text style={styles.bwPromptText}>
                  Add your body weight once and we'll show you how your lifts compare to your bodyweight.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item: name }) => {
          const types = grouped[name];
          const best1RM = types['1rm_estimate'];
          const heaviest = types['heaviest_weight'];
          const standard = strengthStandards[name];
          return (
            <View style={styles.prCard}>
              <Text style={styles.exerciseName}>{name}</Text>
              {best1RM && (
                <View style={styles.prRow}>
                  <Text style={styles.prIcon}>🥇</Text>
                  <Text style={styles.prType}>Est. max lift</Text>
                  <Text style={styles.prValue}>{parseFloat(best1RM.value).toFixed(1)}{units}</Text>
                  <Text style={styles.prDate}>{format(new Date(best1RM.achieved_date), 'MMM d yyyy')}</Text>
                </View>
              )}
              {heaviest && (
                <View style={styles.prRow}>
                  <Text style={styles.prIcon}>🏋️</Text>
                  <Text style={styles.prType}>Heaviest</Text>
                  <Text style={styles.prValue}>{heaviest.value}{units} × {heaviest.reps}</Text>
                  <Text style={styles.prDate}>{format(new Date(heaviest.achieved_date), 'MMM d')}</Text>
                </View>
              )}
              {standard && (
                <View style={styles.standardInCard}>
                  <Text style={styles.standardInCardText}>
                    {standard.ratio >= 1
                      ? `${standard.ratio}× bodyweight · `
                      : `${Math.round(standard.ratio * 100)}% of bodyweight · `
                    }
                    <Text style={{ color: getLevelColor(standard.label) }}>{standard.label}</Text>
                  </Text>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={48} color={colors.surface3} />
            <Text style={styles.emptyTitle}>No PRs yet</Text>
            <Text style={styles.emptyText}>Log workouts and PRs will be detected automatically</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
    </SafeAreaView>
  );
}

function getLevelColor(label) {
  const map = { Beginner: colors.textMuted, Novice: colors.textSecondary, Intermediate: colors.success, Advanced: colors.primary, Elite: colors.gold };
  return map[label] || colors.textMuted;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  filterRow: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  filterTabText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  filterTabTextActive: { color: colors.primary },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  standardsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  bwPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '44',
    marginBottom: spacing.md,
  },
  bwPromptTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  bwPromptText: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 17, marginTop: 2 },
  standardsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  standardsSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: -spacing.xs },
  standardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  standardExercise: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },
  standardRatio: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  standardBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  standardLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  prCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.xs },
  prRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  prIcon: { fontSize: 18 },
  prType: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },
  prValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  prDate: { fontSize: fontSize.xs, color: colors.textMuted },
  standardInCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  standardInCardText: { fontSize: fontSize.xs, color: colors.textSecondary },
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textSecondary },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xxl },
});
