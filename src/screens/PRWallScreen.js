import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { supabase } from '../lib/supabase';
import { database } from '../lib/database';
import { getStrengthStandard, STRENGTH_STANDARDS } from '../lib/algorithms';
import useAppStore from '../store/useAppStore';

const STRENGTH_EXERCISES = ['Barbell Bench Press', 'Barbell Squat', 'Deadlift'];

export default function PRWallScreen({ navigation }) {
  const { user, units } = useAppStore();
  const [prs, setPRs] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [bodyWeight, setBodyWeight] = useState(null);
  const [strengthStandards, setStrengthStandards] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadData(); }, [user?.id]);

  async function loadData() {
    if (!user?.id) return;
    const { data: prData } = await supabase
      .from('personal_records')
      .select('*, exercises(name, primary_muscle)')
      .eq('user_id', user.id)
      .order('achieved_date', { ascending: false });

    setPRs(prData || []);

    const byExercise = {};
    for (const pr of (prData || [])) {
      const name = pr.exercises?.name;
      if (!byExercise[name]) byExercise[name] = {};
      if (!byExercise[name][pr.record_type] || pr.value > byExercise[name][pr.record_type].value) {
        byExercise[name][pr.record_type] = pr;
      }
    }
    setGrouped(byExercise);

    const { data: bwData } = await supabase
      .from('body_metrics')
      .select('body_weight')
      .eq('user_id', user.id)
      .order('metric_date', { ascending: false })
      .limit(1);
    const bw = bwData?.[0]?.body_weight;
    setBodyWeight(bw);

    if (bw) {
      const standards = {};
      for (const [exerciseName, types] of Object.entries(byExercise)) {
        const liftKey = exerciseName.toLowerCase().includes('bench') ? 'bench' :
          exerciseName.toLowerCase().includes('squat') ? 'squat' :
          exerciseName.toLowerCase().includes('deadlift') ? 'deadlift' : null;
        if (liftKey && types['1rm_estimate']) {
          standards[exerciseName] = getStrengthStandard(liftKey, types['1rm_estimate'].value, bw);
        }
      }
      setStrengthStandards(standards);
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
          bodyWeight ? (
            <View style={styles.standardsCard}>
              <Text style={styles.standardsTitle}>STRENGTH STANDARDS</Text>
              <Text style={styles.standardsSubtitle}>vs {bodyWeight} {units} bodyweight</Text>
              {Object.entries(strengthStandards).map(([name, std]) => std ? (
                <View key={name} style={styles.standardRow}>
                  <Text style={styles.standardExercise} numberOfLines={1}>{name}</Text>
                  <Text style={styles.standardRatio}>{std.ratio}×</Text>
                  <View style={[styles.standardBadge, { backgroundColor: getLevelColor(std.label) + '25' }]}>
                    <Text style={[styles.standardLabel, { color: getLevelColor(std.label) }]}>{std.label}</Text>
                  </View>
                </View>
              ) : null)}
            </View>
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
                  <Text style={styles.prType}>Est. 1RM</Text>
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
                    {standard.ratio}× bodyweight · <Text style={{ color: getLevelColor(standard.label) }}>{standard.label}</Text>
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
  standardsTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: 1.5,
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
