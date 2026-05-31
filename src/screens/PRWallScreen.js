import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import SvgLineChart from '../components/SvgLineChart';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import AnimatedEntrance from '../components/AnimatedEntrance';
import { getCompletedWorkoutSets, getAllExercises, getLatestBodyWeight } from '../lib/database';
import { calculate1RM } from '../lib/algorithms';
import { EmptyPRsIllustration } from '../components/Illustrations';
import PeekMenu from '../components/PeekMenu';
import { getStrengthLevel, summariseStrengthStanding } from '../lib/strengthStandards';
import useAppStore from '../store/useAppStore';
import InfoTooltip from '../components/InfoTooltip';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 80;

function getLevelColor(label) {
  const map = {
    Beginner: colors.textMuted,
    Novice: colors.textSecondary,
    Intermediate: colors.success,
    Advanced: colors.primary,
    Elite: colors.gold,
  };
  return map[label] || colors.textMuted;
}

export default function PRWallScreen({ navigation }) {
  const { user, units } = useAppStore();
  const [grouped, setGrouped] = useState({});
  const [exerciseHistory, setExerciseHistory] = useState({});
  const [bodyWeight, setBodyWeight] = useState(null);
  const [strengthLevels, setStrengthLevels] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [expandedExercise, setExpandedExercise] = useState(null);
  const [exerciseList, setExerciseList] = useState([]);
  const peekRef = useRef(null);

  function openPRMenu(exerciseName) {
    const ex = exerciseList?.find(e => e.name === exerciseName);
    if (!ex) return;
    const types = grouped[exerciseName] || {};
    const heaviest = types['heaviest_weight'];
    const best1RM = types['1rm_estimate'];
    const items = [
      {
        icon: 'analytics-outline',
        label: 'View exercise detail',
        onPress: () => navigation.navigate('ExerciseDetail', { exerciseId: ex.id }),
      },
    ];
    if (heaviest || best1RM) {
      const prData = heaviest
        ? {
            exerciseName,
            weight: String(heaviest.value),
            reps: String(heaviest.reps),
            units,
            date: heaviest.achieved_date,
          }
        : {
            exerciseName,
            weight: parseFloat(best1RM.value).toFixed(1),
            reps: String(best1RM.reps || 1),
            units,
            date: best1RM.achieved_date,
          };
      items.push({
        icon: 'share-outline',
        label: 'Share this PR',
        onPress: () => navigation.navigate('ShareCard', { prData }),
      });
    }
    peekRef.current?.open({ title: exerciseName, items });
  }

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
      setExerciseList(allExercises);

      // Build per-session 1RM history for trend charts
      const sessionHistory = {};
      for (const [name, sets] of Object.entries(byExercise)) {
        const byDay = {};
        for (const s of sets) {
          const day = new Date(s.createdAt).toISOString().slice(0, 10);
          if (!byDay[day]) byDay[day] = [];
          byDay[day].push(s);
        }
        const points = Object.entries(byDay)
          .map(([day, daySets]) => ({
            date: day,
            value: Math.round(
              daySets.reduce((best, s) => {
                const est = calculate1RM(s.weight || 0, s.actualReps || 0);
                return est > best ? est : best;
              }, 0) * 10,
            ) / 10,
          }))
          .filter(p => p.value > 0)
          .sort((a, b) => a.date.localeCompare(b.date));
        if (points.length >= 2) sessionHistory[name] = points;
      }
      setExerciseHistory(sessionHistory);

      if (bw?.weightKg) {
        const bwValue = Math.round(bw.weightKg * 10) / 10;
        setBodyWeight(bwValue);
        const levels = {};
        for (const [name, types] of Object.entries(newGrouped)) {
          const est1RM = types['1rm_estimate']?.value;
          if (est1RM) {
            const lvl = getStrengthLevel(name, est1RM, bwValue);
            if (lvl) levels[name] = lvl;
          }
        }
        setStrengthLevels(levels);
      } else {
        setBodyWeight(null);
        setStrengthLevels({});
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

  // One glanceable standing across the tracked compounds: where you stand
  // (overall tier) and where you're heading (the single nearest rank-up).
  const strengthStanding = summariseStrengthStanding(
    Object.entries(strengthLevels).map(([name, level]) => ({
      lift: name,
      oneRm: grouped[name]?.['1rm_estimate']?.value ?? null,
      level,
    })),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
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
          bodyWeight && Object.keys(strengthLevels).length > 0 ? (
            <View style={styles.relativeStrengthCard}>
              {strengthStanding ? (
                <View style={styles.standingHeadline}>
                  <Text style={styles.standingLabel}>{strengthStanding.overallLabel}</Text>
                  <Text style={styles.standingSub}>
                    overall across {strengthStanding.count} main {strengthStanding.count === 1 ? 'lift' : 'lifts'}
                  </Text>
                  {strengthStanding.nearest ? (
                    <Text style={styles.standingNext}>
                      {strengthStanding.nearest.delta} {units} from {strengthStanding.nearest.toLabel} on {strengthStanding.nearest.lift}
                    </Text>
                  ) : (
                    <Text style={styles.standingNext}>At the top of the standards on every tracked lift.</Text>
                  )}
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text style={styles.sectionLabel}>Relative strength</Text>
                <InfoTooltip
                  size={13}
                  text={`How your best estimated lifts compare to your own bodyweight.\n\n1.0× = you can lift your bodyweight\n1.5× = strong for most people\n2.0× = advanced\n\nBeginner → Novice → Intermediate → Advanced → Elite`}
                />
              </View>
              <Text style={styles.sectionSub}>Based on {bodyWeight} {units} bodyweight</Text>
              {Object.entries(strengthLevels).map(([name, lvl]) => (
                <View key={name} style={styles.strengthRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.strengthName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.strengthNarrative}>
                      {lvl.ratio >= 1
                        ? `${lvl.ratio.toFixed(2)}× your bodyweight`
                        : `${Math.round(lvl.ratio * 100)}% of your bodyweight`}
                    </Text>
                  </View>
                  <View style={[styles.levelBadge, { backgroundColor: getLevelColor(lvl.label) + '22' }]}>
                    <Text style={[styles.levelBadgeText, { color: getLevelColor(lvl.label) }]}>{lvl.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (!bodyWeight && filteredNames.length > 0) ? (
            // Only ask for body weight when there's at least one PR that
            // could be compared. Showing this prompt with zero PRs would
            // be noise, the user has nothing to relate the number to yet.
            <TouchableOpacity
              style={styles.bwPromptCard}
              onPress={() => navigation.navigate('BodyMetrics')}
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
        renderItem={({ item: name, index }) => {
          const types = grouped[name];
          const best1RM = types['1rm_estimate'];
          const heaviest = types['heaviest_weight'];
          const level = strengthLevels[name] || null;
          const history = exerciseHistory[name];
          const isExpanded = expandedExercise === name;

          return (
            <AnimatedEntrance index={index}>
            <TouchableOpacity
              style={styles.prCard}
              onPress={() => history && setExpandedExercise(isExpanded ? null : name)}
              onLongPress={() => openPRMenu(name)}
              activeOpacity={history ? 0.8 : 1}
            >
              <View style={styles.prCardHeader}>
                <Text style={styles.exerciseName}>{name}</Text>
                {history && (
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'trending-up-outline'}
                    size={18}
                    color={isExpanded ? colors.primary : colors.textMuted}
                  />
                )}
              </View>

              {best1RM && (
                <View style={styles.prRow}>
                  <Text style={styles.prIcon}>🥇</Text>
                  <Text style={styles.prType}>Estimated max</Text>
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
              {level && (
                <View style={styles.standardInCard}>
                  <Text style={styles.standardInCardText}>
                    {level.ratio >= 1
                      ? `${level.ratio.toFixed(2)}× bodyweight`
                      : `${Math.round(level.ratio * 100)}% of bodyweight`}
                    {' · '}
                    <Text style={{ color: getLevelColor(level.label), fontWeight: fontWeight.semibold }}>
                      {level.label}
                    </Text>
                  </Text>
                  {level.nextTarget && level.nextLabel && (
                    <Text style={styles.strengthLevelNext}>
                      Next: {Math.round(level.nextTarget * 10) / 10}{units} for {level.nextLabel}
                    </Text>
                  )}
                </View>
              )}
              {isExpanded && history && history.length > 0 && (
                <View style={styles.chartWrap}>
                  <View style={styles.chartHeaderRow}>
                    <Text style={styles.chartLabel}>Estimated max over time</Text>
                    <Text style={styles.chartUnit}>{units}</Text>
                  </View>
                  <SvgLineChart
                    data={history.slice(-20).map(p => ({ value: p.value }))}
                    width={CHART_W}
                    height={90}
                    color={colors.primary}
                    thickness={2}
                    curved
                    area
                    areaTopColor={`${colors.primary}2E`}
                    areaBottomColor={`${colors.primary}00`}
                    showDots={history.length <= 10}
                    dotRadius={3}
                    sections={3}
                    rulesColor={`${colors.border}80`}
                  />
                  <View style={styles.chartFooterRow}>
                    <Text style={styles.chartFooterText}>
                      {format(new Date(history[0].date), 'MMM yyyy')}
                    </Text>
                    <Text style={styles.chartFooterText}>
                      {Math.min(history.length, 20)} sessions
                    </Text>
                    <Text style={styles.chartFooterText}>
                      {format(new Date(history[history.length - 1].date), 'MMM yyyy')}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
            </AnimatedEntrance>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <EmptyPRsIllustration size={140} />
            <Text style={styles.emptyTitle}>No personal records yet</Text>
            <Text style={styles.emptyText}>
              Personal records are detected automatically as you train. Complete a few sessions and they will appear here.
            </Text>
          </View>
        }
        ListFooterComponent={
          filteredNames.length > 0 ? (
            <Text style={styles.standardsFooter}>
              Strength standards based on lifts per kilogram of bodyweight. Treat as a rough guide, not a verdict.
            </Text>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
      <PeekMenu ref={peekRef} />
    </SafeAreaView>
  );
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
  filterTabText: { ...type.label, color: colors.textSecondary },
  filterTabTextActive: { color: colors.primary },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },

  relativeStrengthCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  standingHeadline: {
    alignItems: 'flex-start',
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  standingLabel: {
    color: colors.primary,
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.heavy,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  standingSub: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  standingNext: {
    ...type.label,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  sectionLabel: {
    ...type.label,
    color: colors.textSecondary,
  },
  sectionSub: { ...type.caption, color: colors.textMuted, marginBottom: spacing.xs },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  strengthName: {
    ...type.label,
    color: colors.textPrimary,
  },
  strengthNarrative: { ...type.num('caption'), color: colors.textMuted, marginTop: spacing.xxs },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    flexShrink: 0,
  },
  levelBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },

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
  bwPromptTitle: { ...type.bodyStrong, color: colors.textPrimary },
  bwPromptText: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 17, marginTop: spacing.xxs },

  prCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  prCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  exerciseName: {
    ...type.bodyStrong,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  prRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // eslint-disable-next-line no-restricted-syntax -- PR medal emoji, intentional large size
  prIcon: { fontSize: 18 },
  prType: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },
  // The PR value and date are data: tabular figures so the column of
  // numbers down the card aligns and doesn't jitter as digit widths change.
  prValue: { ...type.num('bodyStrong'), color: colors.textPrimary },
  prDate: { ...type.num('caption'), color: colors.textMuted },

  standardInCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  standardInCardText: { ...type.num('caption'), color: colors.textSecondary },
  strengthLevelNext: {
    ...type.num('caption'),
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
  standardsFooter: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    lineHeight: 16,
  },
  chartWrap: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  chartLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
  chartUnit: { ...type.caption, color: colors.textMuted },
  chartFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  chartFooterText: { fontSize: fontSize.micro, color: colors.textMuted },

  empty: { alignItems: 'center', paddingHorizontal: spacing.xxl, paddingTop: spacing.xxxl, gap: spacing.md },
  emptyTitle: {
    ...type.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
