import { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import AnimatedEntrance from '../components/AnimatedEntrance';
import PressableCard from '../components/PressableCard';
import PeekMenu from '../components/PeekMenu';
import InfoTooltip from '../components/InfoTooltip';
import { GLOSSARY } from '../lib/coachGlossary';
import { getCompletedWorkoutSets, getAllExercises, getLatestBodyWeight } from '../lib/database';
import { buildLiftProgressRows, buildExerciseMetricSeries } from '../lib/liftProgress';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import { getStrengthLevel, summariseStrengthStanding } from '../lib/strengthStandards';
import { kgToLbs } from '../lib/units';
import Sparkline from '../components/Sparkline';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { logError } from '../lib/errorLog';

// Lifts, the single home for "am I getting stronger". It leads with where you
// stand (overall strength standing + relative strength per lift), then lists
// every lift you've trained by its estimated-1RM trajectory, most recent first,
// with a marker on lifts whose latest session set an all-time best. Tap a lift
// for its full chart, PRs and goal on ExerciseDetail.
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

// A lift is at a recent best when its latest session is its best estimated max
// to date (and it has been trained more than once, so "best" means something).
function isRecentBest(row) {
  return row.sessions > 1 && row.latestE1rm != null && row.bestE1rm != null
    && row.latestE1rm >= row.bestE1rm - 0.05;
}

// R1 (per-exercise metric switcher): the lenses the sparkline can draw, beyond
// the default best-set estimated-1RM trend. Each maps one logged set to a
// number; the session value is the max of its sets (best effort that session),
// except totalReps/volume which sum the session. Mirrors Hevy's bestSet /
// heaviestWeight / totalReps / bestSetVolume enum, framed as the user's own
// progress (no comparison, no rank). Reuses already-loaded sets — no new query.
const METRICS = [
  { key: 'e1rm', label: 'Best set' },
  { key: 'heaviest', label: 'Heaviest' },
  { key: 'reps', label: 'Total reps' },
  { key: 'volume', label: 'Volume' },
];

export default function LiftProgressScreen({ navigation }) {
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, units } = useAppStore(useShallow(s => ({
    user: s.user,
    units: s.units,
  })));
  const [rows, setRows] = useState([]);
  const [bodyWeight, setBodyWeight] = useState(null);
  const [strengthLevels, setStrengthLevels] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'best'
  // R1 per-exercise metric switcher: which lens the row sparklines draw.
  // 'e1rm' is the default (matches the est-max headline). The other lenses
  // recompute from the same loaded sets, no new data source.
  const [metric, setMetric] = useState('e1rm');
  const [metricSeries, setMetricSeries] = useState(() => new Map());
  const peekRef = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { if (user?.id) loadData(); }, [user?.id]));

  async function loadData() {
    if (!user?.id) { setLoading(false); return; }
    try {
      const [sets, exercises, bw] = await Promise.all([
        getCompletedWorkoutSets(user.id),
        getAllExercises(),
        getLatestBodyWeight(user.id),
      ]);
      const builtRows = buildLiftProgressRows(sets, exercises);
      setRows(builtRows);
      // Recompute the alternate metric series from the same sets, so the
      // metric switcher has every lens ready without a reload. Pass an
      // exercise-type map so distance/duration exercises (which reuse the
      // weight column) don't plot nonsense volume/heaviest series.
      const typeById = new Map(
        (exercises || []).map(e => [e.id, e.exercise_type ?? e.exerciseType ?? 'weight_reps']),
      );
      setMetricSeries(buildExerciseMetricSeries(sets, typeById));

      if (bw?.weightKg) {
        // Bodyweight is canonical kg; estimated maxes come from logged gym
        // weight in the display unit. Compare like with like by converting
        // bodyweight into the display unit (A2-043: a lbs user's ratio was
        // once lbs/kg, inflated ~2.2x, so everyone read as Elite).
        const bwValue = units === 'lbs'
          ? Math.round(kgToLbs(bw.weightKg) * 10) / 10
          : Math.round(bw.weightKg * 10) / 10;
        setBodyWeight(bwValue);
        const levels = {};
        for (const r of builtRows) {
          if (!r.bestE1rm) continue;
          const lvl = getStrengthLevel(r.name, r.bestE1rm, bwValue);
          if (lvl) levels[r.name] = lvl;
        }
        setStrengthLevels(levels);
      } else {
        setBodyWeight(null);
        setStrengthLevels({});
      }
    } catch (e) {
      // Loading failure leaves the list empty; the empty state covers it.
      logError('LiftProgressScreen.loadData', e);
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

  function openLiftMenu(row) {
    const items = [
      {
        icon: 'analytics-outline',
        label: 'View exercise detail',
        onPress: () => navigation.navigate('ExerciseDetail', { exerciseId: row.exerciseId }),
      },
    ];
    if (row.bestE1rm) {
      items.push({
        icon: 'share-outline',
        label: 'Share this PR',
        onPress: () => navigation.navigate('ShareCard', {
          prData: {
            exerciseName: row.name,
            weight: parseFloat(row.bestE1rm).toFixed(1),
            reps: '1',
            units,
            date: new Date(row.lastTrainedAt).toISOString(),
          },
        }),
      });
    }
    peekRef.current?.open({ title: row.name, items });
  }

  const standing = useMemo(() => {
    const rowByName = Object.fromEntries(rows.map(r => [r.name, r]));
    return summariseStrengthStanding(
      Object.entries(strengthLevels).map(([name, level]) => ({
        lift: name,
        oneRm: rowByName[name]?.bestE1rm ?? null,
        level,
      })),
    );
  }, [rows, strengthLevels]);

  const hasStanding = bodyWeight && Object.keys(strengthLevels).length > 0;
  const data = filter === 'best' ? rows.filter(isRecentBest) : rows;

  const header = (
    <View>
      {hasStanding ? (
        <View style={styles.standingCard}>
          {standing ? (
            <View style={styles.standingHeadline}>
              <Text style={styles.standingLabel}>{standing.overallLabel}</Text>
              <Text style={styles.standingSub}>
                overall across {standing.count} main {standing.count === 1 ? 'lift' : 'lifts'}
              </Text>
              {standing.nearest ? (
                <Text style={styles.standingNext}>
                  {standing.nearest.delta} {units} from {standing.nearest.toLabel} on {standing.nearest.lift}
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
              text={'How your best estimated lifts compare to your own bodyweight.\n\n1.0× = you can lift your bodyweight\n1.5× = strong for most people\n2.0× = advanced\n\nBeginner → Novice → Intermediate → Advanced → Elite'}
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
              <View style={[styles.levelBadge, { backgroundColor: withAlpha(getLevelColor(lvl.label), 0.133) }]}>
                <Text style={[styles.levelBadgeText, { color: getLevelColor(lvl.label) }]}>{lvl.label}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (!bodyWeight && rows.length > 0) ? (
        <TouchableOpacity
          style={styles.bwPromptCard}
          onPress={() => navigation.navigate('BodyMetrics')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Add your body weight"
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
      ) : null}

      {rows.length > 0 && (
        <View style={styles.filterRow}>
          {['all', 'best'].map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === f }}
              accessibilityLabel={f === 'all' ? 'All lifts' : 'Recent bests'}
            >
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                {f === 'all' ? 'All lifts' : 'Recent bests'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* R1 per-exercise metric switcher: changes the lens every row's
          sparkline draws (best set / heaviest / total reps / volume),
          recomputed from the loaded sets. Your own trend only — no rank. */}
      {rows.length > 0 && (
        <View style={styles.metricRow}>
          {METRICS.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.metricChip, metric === m.key && styles.metricChipActive]}
              onPress={() => setMetric(m.key)}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityState={{ selected: metric === m.key }}
              accessibilityLabel={`Show ${m.label} trend`}
            >
              <Text style={[styles.metricChipText, metric === m.key && styles.metricChipTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlashList
        data={data}
        keyExtractor={r => String(r.exerciseId)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={header}
        renderItem={({ item, index }) => {
          const muscle = item.primaryMuscle
            ? (MUSCLE_DISPLAY_NAMES[item.primaryMuscle] || item.primaryMuscle)
            : null;
          const best = isRecentBest(item);
          // The sparkline series for the selected metric. 'e1rm' is the
          // default best-set trend already on the row; the other lenses come
          // from the recomputed per-exercise series. Falls back to the row's
          // own trend so a row never renders blank.
          const series = metric === 'e1rm'
            ? item.trend
            : (metricSeries.get(item.exerciseId)?.[metric] ?? item.trend);
          return (
            <AnimatedEntrance index={index}>
            <PressableCard
              style={styles.card}
              onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.exerciseId })}
              onLongPress={() => openLiftMenu(item)}
              accessibilityLabel={[
                item.name,
                `${item.bestE1rm}${units} estimated max`,
                (item.deltaPct != null && item.sessions > 1)
                  ? `${item.deltaPct > 0 ? 'up' : item.deltaPct < 0 ? 'down' : 'no change'} ${Math.abs(item.deltaPct)} percent`
                  : null,
                best ? 'recent best' : null,
              ].filter(Boolean).join(', ')}
              accessibilityHint="Long press for options"
            >
              <View style={styles.cardMain}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  {best && (
                    <View style={styles.prTag}>
                      <Text style={styles.prTagText}>PR</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.meta}>
                  {muscle ? `${muscle} · ` : ''}{item.sessions} {item.sessions === 1 ? 'session' : 'sessions'} · last {format(new Date(item.lastTrainedAt), 'd MMM')}
                </Text>
                <View style={styles.statRow}>
                  <Text style={styles.statValue}>{item.bestE1rm}{units}</Text>
                  <Text style={styles.statLabel}>est. max</Text>
                  {/* U-D-3: plain-English gloss for estimated 1RM on the row. */}
                  <InfoTooltip text={GLOSSARY.estMax} size={11} />
                  {item.deltaPct != null && item.sessions > 1 && (
                    <Text style={[styles.delta, { color: trendColor(item.deltaPct) }]}>
                      {item.deltaPct > 0 ? '+' : ''}{item.deltaPct}%
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.cardRight}>
                {/* U-D-4: with only 1–2 points a sparkline reads as a near-flat
                    line; show an encouragement "building" hint instead until a
                    real trend exists (3+ points). */}
                {(series?.length ?? 0) > 2 ? (
                  <Sparkline data={series} width={84} height={34} color={trendColor(item.deltaPct)} />
                ) : (
                  <Text style={styles.trendBuilding}>Building</Text>
                )}
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
              <Text style={styles.emptyTitle}>
                {filter === 'best' ? 'Your bests will show here' : 'Your lifts start here'}
              </Text>
              <Text style={styles.emptyText}>
                {filter === 'best'
                  ? "When a session beats your best estimated max, that lift appears here. Keep training and they'll come."
                  : "Log a few sessions and each lift's trend builds up here."}
              </Text>
            </View>
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
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },

  // ── Strength standing header ──
  standingCard: {
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
  standingSub: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  standingNext: { ...type.label, color: colors.textSecondary, marginTop: spacing.sm },
  sectionLabel: { ...type.label, color: colors.textSecondary },
  sectionSub: { ...type.caption, color: colors.textMuted, marginBottom: spacing.xs },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  strengthName: { ...type.label, color: colors.textPrimary },
  strengthNarrative: { ...type.num('caption'), color: colors.textMuted, marginTop: spacing.xxs },
  levelBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm, flexShrink: 0 },
  levelBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },

  bwPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.267),
    marginBottom: spacing.md,
  },
  bwPromptTitle: { ...type.bodyStrong, color: colors.textPrimary },
  bwPromptText: { ...type.captionTight, color: colors.textSecondary, marginTop: spacing.xxs },

  // ── Filter ──
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
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

  // ── Metric switcher (R1) ──
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  metricChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricChipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  metricChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  metricChipTextActive: { color: colors.primary },

  // ── Lift row ──
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { ...type.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  prTag: {
    backgroundColor: withAlpha(colors.primary, 0.16),
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  prTagText: { fontSize: fontSize.micro, fontWeight: fontWeight.bold, color: colors.primary },
  meta: { ...type.caption, color: colors.textMuted },
  statRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: spacing.xxs },
  statValue: { fontSize: fontSize.lg, fontWeight: fontWeight.heavy, color: colors.textPrimary },
  statLabel: { ...type.caption, color: colors.textMuted },
  delta: { ...type.num('label'), marginLeft: spacing.xs },
  cardRight: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  trendBuilding: { width: 84, textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted },
  empty: { alignItems: 'center', paddingHorizontal: spacing.xxl, paddingTop: spacing.xxxl, gap: spacing.md },
  emptyTitle: { ...type.title, color: colors.textPrimary, textAlign: 'center' },
  emptyText: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
