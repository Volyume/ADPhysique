import { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns/format';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';
import AnimatedEntrance from '../components/AnimatedEntrance';
import PressableCard from '../components/PressableCard';
import PeekMenu from '../components/PeekMenu';
import InfoTooltip from '../components/InfoTooltip';
import SectionLabel from '../components/SectionLabel';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import { GLOSSARY } from '../lib/coachGlossary';
import { getCompletedWorkoutSets, getAllExercises, getLatestBodyWeight } from '../lib/database';
import { buildLiftProgressRows, buildExerciseMetricSeries, derivePRIndices } from '../lib/liftProgress';
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
// CP-10 batch G (2026-07-11): converted to accept the live colour table `c`
// on the buildMarkStyle(c) precedent (CardioHistoryScreen, batch cardio
// theme migration) -- the label -> colour mapping is byte-identical in
// meaning, only the token SOURCE moved from the frozen import to the live
// theme. Returns a resolver function, same call shape as before.
function buildLevelColor(c) {
  return function getLevelColor(label) {
    const map = {
      Beginner: c.textMuted,
      Novice: c.textSecondary,
      Intermediate: c.success,
      Advanced: c.primary,
      Elite: c.gold,
    };
    return map[label] || c.textMuted;
  };
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
// progress (no comparison, no rank). Reuses already-loaded sets, no new query.
const METRICS = [
  { key: 'e1rm', label: 'Best set' },
  { key: 'heaviest', label: 'Heaviest' },
  { key: 'reps', label: 'Total reps' },
  { key: 'volume', label: 'Volume' },
];

// Item 7 (campaign 2026-07-10): the row's headline numeral used to stay
// e1RM-based even when a non-default metric lens was selected, so a
// volume-shaped sparkline sat under an "est. max" label. Each entry names
// the headline label for its lens and whether the value is a weight in the
// display unit (kg/lbs suffix) or a bare count, mirroring ExerciseDetail's
// WEIGHT_METRICS split.
const METRIC_HEADLINE = {
  e1rm: { label: 'est. max', isWeight: true },
  heaviest: { label: 'heaviest', isWeight: true },
  reps: { label: 'most reps', isWeight: false },
  volume: { label: 'best volume', isWeight: false },
};

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
  // C1: free-text filter on exercise name, same case-insensitive substring
  // match as ExercisePickerModal's search box. Purely client-side over the
  // already-loaded rows; keeps the existing most-recent-first sort.
  const [query, setQuery] = useState('');
  // R1 per-exercise metric switcher: which lens the row sparklines draw.
  // 'e1rm' is the default (matches the est-max headline). The other lenses
  // recompute from the same loaded sets, no new data source.
  const [metric, setMetric] = useState('e1rm');
  const [metricSeries, setMetricSeries] = useState(() => new Map());
  const [loadError, setLoadError] = useState(false);
  const peekRef = useRef(null);
  const loadRequestRef = useRef(0);
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js). Memoised
  // because this is a list-heavy screen (renderItem runs once per row).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const resolveLevelColor = useMemo(() => buildLevelColor(t.colors), [t]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { loadData(); }, [user?.id]));

  async function loadData() {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrentRequest = () => loadRequestRef.current === requestId;

    setLoading(true);
    setLoadError(false);

    if (!user?.id) {
      setRows([]);
      setMetricSeries(new Map());
      setBodyWeight(null);
      setStrengthLevels({});
      setLoading(false);
      return true;
    }

    try {
      const [sets, exercises, bw] = await Promise.all([
        getCompletedWorkoutSets(user.id),
        getAllExercises(),
        getLatestBodyWeight(user.id),
      ]);
      if (!isCurrentRequest()) return false;
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
      setLoadError(false);
      return true;
    } catch (e) {
      if (!isCurrentRequest()) return false;
      logError('LiftProgressScreen.loadData', e);
      setRows([]);
      setMetricSeries(new Map());
      setBodyWeight(null);
      setStrengthLevels({});
      setLoadError(true);
      return true;
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    const completedCurrent = await loadData();
    if (completedCurrent) setRefreshing(false);
  }

  function trendColor(deltaPct) {
    if (deltaPct == null) return t.colors.textMuted;
    if (deltaPct > 0) return t.colors.success;
    if (deltaPct < 0) return t.colors.error;
    return t.colors.textMuted;
  }

  function openLiftMenu(row, originRect) {
    const items = [
      {
        icon: 'analytics-outline',
        label: 'View exercise detail',
        // Origin-aware hero zoom (D31): grow ExerciseDetail from the tapped
        // row even via the peek menu; the card sits behind the menu, so the
        // growth still reads from its real position. Falls back to centre
        // zoom when the rect couldn't be measured.
        onPress: () => navigation.navigate('ExerciseDetail', { exerciseId: row.exerciseId, __heroOrigin: originRect || undefined }),
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
  const tabRows = filter === 'best' ? rows.filter(isRecentBest) : rows;
  // C1: substring match on name, case-insensitive; an empty query is a no-op
  // so clearing the box restores the tab's full, already-sorted list.
  const q = query.trim().toLowerCase();
  const data = q ? tabRows.filter(r => r.name.toLowerCase().includes(q)) : tabRows;

  const header = (
    <View>
      {rows.length > 0 && (
        <SearchBar
          style={styles.searchBar}
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises..."
          accessibilityLabel="Search lifts"
        />
      )}
      {hasStanding ? (
        <View style={[styles.standingCard, live.standingCard]}>
          {standing ? (
            <View style={[styles.standingHeadline, live.standingHeadline]}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.standingLabel, live.standingLabel]}>{standing.overallLabel}</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.standingSub, live.standingSub]}>
                overall across {standing.count} main {standing.count === 1 ? 'lift' : 'lifts'}
              </Text>
              {standing.nearest ? (
                <Text maxFontSizeMultiplier={1.3} style={[styles.standingNext, live.standingNext]}>
                  {standing.nearest.delta} {units} from {standing.nearest.toLabel} on {standing.nearest.lift}
                </Text>
              ) : (
                <Text maxFontSizeMultiplier={1.3} style={[styles.standingNext, live.standingNext]}>At the top of the standards on every tracked lift.</Text>
              )}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <SectionLabel>Relative strength</SectionLabel>
            <InfoTooltip
              size={13}
              text={'How your best estimated lifts compare to your own body weight.\n\n1.0x = you can lift your body weight\n1.5x = strong for most people\n2.0x = advanced\n\nBeginner > Novice > Intermediate > Advanced > Elite'}
            />
          </View>
          <Text maxFontSizeMultiplier={1.3} style={[styles.sectionSub, live.sectionSub]}>Based on {bodyWeight} {units} body weight</Text>
          {Object.entries(strengthLevels).map(([name, lvl]) => (
            <View key={name} style={[styles.strengthRow, live.strengthRow]}>
              <View style={{ flex: 1 }}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.strengthName, live.strengthName]} numberOfLines={1}>{name}</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.strengthNarrative, live.strengthNarrative]}>
                  {lvl.ratio >= 1
                    ? `${lvl.ratio.toFixed(2)}x your body weight`
                    : `${Math.round(lvl.ratio * 100)}% of your body weight`}
                </Text>
              </View>
              <View style={[styles.levelBadge, { backgroundColor: withAlpha(resolveLevelColor(lvl.label), 0.133) }]}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.levelBadgeText, live.levelBadgeText, { color: resolveLevelColor(lvl.label) }]}>{lvl.label}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (!bodyWeight && rows.length > 0) ? (
        <TouchableOpacity
          style={[styles.bwPromptCard, live.bwPromptCard]}
          onPress={() => navigation.navigate('BodyMetrics')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Add your body weight"
        >
          <Ionicons name="body-outline" size={20} color={t.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.bwPromptTitle, live.bwPromptTitle]}>Add your body weight</Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.bwPromptText, live.bwPromptText]}>
              Add your body weight once and we'll show you how your lifts compare to your body weight.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
        </TouchableOpacity>
      ) : null}

      {rows.length > 0 && (
        <View style={styles.filterRow}>
          {['all', 'best'].map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, live.filterTab, filter === f && [styles.filterTabActive, live.filterTabActive]]}
              onPress={() => setFilter(f)}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === f }}
              accessibilityLabel={f === 'all' ? 'All lifts' : 'Recent bests'}
            >
              <Text maxFontSizeMultiplier={1.3} style={[styles.filterTabText, live.filterTabText, filter === f && [styles.filterTabTextActive, live.filterTabTextActive]]}>
                {f === 'all' ? 'All lifts' : 'Recent bests'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* R1 per-exercise metric switcher: changes the lens every row's
          sparkline draws (best set / heaviest / total reps / volume),
          recomputed from the loaded sets. Your own trend only, no rank. */}
      {rows.length > 0 && (
        <View style={styles.metricRow}>
          {METRICS.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.metricChip, live.metricChip, metric === m.key && [styles.metricChipActive, live.metricChipActive]]}
              onPress={() => setMetric(m.key)}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityState={{ selected: metric === m.key }}
              accessibilityLabel={`Show ${m.label} trend`}
            >
              <Text maxFontSizeMultiplier={1.3} style={[styles.metricChipText, live.metricChipText, metric === m.key && [styles.metricChipTextActive, live.metricChipTextActive]]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Lifts" />
      <FlashList
        data={data}
        keyExtractor={r => String(r.exerciseId)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.colors.primary} />
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
          const nonE1rmSeries = metric === 'e1rm' ? null : metricSeries.get(item.exerciseId)?.[metric];
          const hasNonE1rmSeries = Array.isArray(nonE1rmSeries) && nonE1rmSeries.length > 0;
          const series = metric === 'e1rm'
            ? item.trend
            : (nonE1rmSeries ?? item.trend);
          // Item 7 (campaign 2026-07-10): the headline numeral + label now
          // track the selected metric lens, same fallback as the sparkline
          // above -- an exercise with no computed series for this lens (e.g.
          // distance/duration types skipped by buildExerciseMetricSeries)
          // falls back to the e1RM headline rather than showing nothing.
          const headlineMetric = (metric === 'e1rm' || !hasNonE1rmSeries) ? 'e1rm' : metric;
          const headlineMeta = METRIC_HEADLINE[headlineMetric];
          const headlineValue = headlineMetric === 'e1rm' ? item.bestE1rm : Math.max(...nonE1rmSeries);
          // Item 10: PR markers on whichever lens the row is currently
          // showing, same series the sparkline itself draws.
          const prIndices = derivePRIndices(series);
          return (
            <AnimatedEntrance index={index}>
            <PressableCard
              style={[styles.card, live.card]}
              // Origin-aware hero zoom (D31): the pushed ExerciseDetail grows
              // from this row's measured rect; a null rect (unmeasurable
              // handle) falls back to the app's centre zoom.
              onPressWithLayout={(rect) => navigation.navigate('ExerciseDetail', { exerciseId: item.exerciseId, __heroOrigin: rect || undefined })}
              onLongPressWithLayout={(rect) => openLiftMenu(item, rect)}
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
                  <Text maxFontSizeMultiplier={1.3} style={[styles.name, live.name]} numberOfLines={1}>{item.name}</Text>
                  {best && (
                    <View style={[styles.prTag, live.prTag]}>
                      <Text maxFontSizeMultiplier={1.3} style={[styles.prTagText, live.prTagText]}>PR</Text>
                    </View>
                  )}
                </View>
                <Text maxFontSizeMultiplier={1.3} style={[styles.meta, live.meta]}>
                  {muscle ? `${muscle} - ` : ''}{item.sessions} {item.sessions === 1 ? 'session' : 'sessions'} - last {format(new Date(item.lastTrainedAt), 'd MMM')}
                </Text>
                {/* C1: the last logged session's own numbers, distinct from the
                    all-time best headline below. liftProgress.js tracks the
                    session's top weight and its e1RM only (no rep count is
                    computed per session), so the line reports those two. */}
                <Text maxFontSizeMultiplier={1.3} style={[styles.lastTime, live.lastTime]}>
                  Last time: {item.latestWeight}{units} - est. max {item.latestE1rm}{units}
                </Text>
                <View style={styles.statRow}>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.statValue, live.statValue]}>{headlineValue}{headlineMeta.isWeight ? units : ''}</Text>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.statLabel, live.statLabel]}>{headlineMeta.label}</Text>
                  {/* U-D-3: plain-English gloss for estimated 1RM on the row.
                      Only meaningful for the e1RM lens itself. */}
                  {headlineMetric === 'e1rm' && <InfoTooltip text={GLOSSARY.estMax} size={11} />}
                  {item.deltaPct != null && item.sessions > 1 && (
                    <Text maxFontSizeMultiplier={1.3} style={[styles.delta, live.delta, { color: trendColor(item.deltaPct) }]}>
                      {item.deltaPct > 0 ? '+' : ''}{item.deltaPct}%
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.cardRight}>
                {/* U-D-4: with only 1 to 2 points a sparkline reads as a near-flat
                    line; show an encouragement "building" hint instead until a
                    real trend exists (3+ points). */}
                {(series?.length ?? 0) > 2 ? (
                  <Sparkline data={series} width={84} height={34} color={trendColor(item.deltaPct)} highlightIndices={prIndices} />
                ) : (
                  <Text maxFontSizeMultiplier={1.3} style={[styles.trendBuilding, live.trendBuilding]}>Building</Text>
                )}
                <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
              </View>
            </PressableCard>
            </AnimatedEntrance>
          );
        }}
        ListEmptyComponent={
          loading ? null : loadError ? (
            <View style={styles.emptyStateWrap}>
              <EmptyState
                icon="cloud-offline-outline"
                title="Couldn't load lifts"
                text="Your workout history is safe. This is a loading problem, not lost data."
                actionLabel="Try again"
                onAction={loadData}
                compact
              />
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name={q ? 'search-outline' : 'barbell-outline'} size={56} color={t.colors.textMuted} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.emptyTitle, live.emptyTitle]}>
                {q ? 'No matching lifts' : filter === 'best' ? 'Your bests will show here' : 'Your lifts start here'}
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.emptyText, live.emptyText]}>
                {q
                  ? "No lift name matches your search. Try a different search."
                  : filter === 'best'
                    ? "When a session beats your best estimated max, that lift appears here. Keep training and they'll come."
                    : "Log a few sessions and each lift's trend builds up here."}
              </Text>
            </View>
          )
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

  searchBar: { marginBottom: spacing.md },

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
  // R2 (2026-07-11): badge class -> radius.full; label text -> captionStrong
  // (exact xs+semibold role, FOOD-DESIGN-STANDARD.md sections 3-4). Was
  // radius.sm and a raw fontSize.xs + fontWeight.semibold pair.
  levelBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.full, flexShrink: 0 },
  levelBadgeText: { ...type.captionStrong },

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
  // R2 (2026-07-11): raw xs+semibold pair -> captionStrong (exact role match).
  metricChipText: { ...type.captionStrong, color: colors.textSecondary },
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
    // R2 (2026-07-11): badge class -> radius.full (FOOD-DESIGN-STANDARD.md
    // section 4). Was radius.sm.
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  prTagText: { fontSize: fontSize.micro, fontWeight: fontWeight.bold, color: colors.primary },
  meta: { ...type.caption, color: colors.textMuted },
  lastTime: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  statRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: spacing.xxs },
  // Theme gap: no lg+heavy type role exists; the raw pair stays (weight
  // preserved). R2 (2026-07-11): headline is a weight/e1RM readout, so it
  // gains tabular figures like the delta beside it.
  statValue: { fontSize: fontSize.lg, fontWeight: fontWeight.heavy, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  statLabel: { ...type.caption, color: colors.textMuted },
  delta: { ...type.num('label'), marginLeft: spacing.xs },
  cardRight: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  trendBuilding: { width: 84, textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted },
  emptyStateWrap: { paddingTop: spacing.xxl },
  empty: { alignItems: 'center', paddingHorizontal: spacing.xxl, paddingTop: spacing.xxxl, gap: spacing.md },
  emptyTitle: { ...type.title, color: colors.textPrimary, textAlign: 'center' },
  emptyText: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/gap/padding/borderWidth/borderRadius, no token) and fontWeight/
// lineHeight/fontVariant (not part of the live theme table) are correctly
// omitted -- there is nothing to unfreeze for them. Same pattern as
// CardioHistoryScreen.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    standingCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    standingHeadline: { borderBottomColor: t.colors.border },
    standingLabel: { color: t.colors.primary, fontSize: t.fontSize.xxxl },
    standingSub: { ...t.type.caption, color: t.colors.textMuted },
    standingNext: { ...t.type.label, color: t.colors.textSecondary },
    sectionSub: { ...t.type.caption, color: t.colors.textMuted },
    strengthRow: { borderTopColor: t.colors.border },
    strengthName: { ...t.type.label, color: t.colors.textPrimary },
    strengthNarrative: { ...t.type.num('caption'), color: t.colors.textMuted },
    levelBadgeText: { ...t.type.captionStrong },
    bwPromptCard: { backgroundColor: t.colors.surface, borderColor: withAlpha(t.colors.primary, 0.267) },
    bwPromptTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    bwPromptText: { ...t.type.captionTight, color: t.colors.textSecondary },
    filterTab: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    filterTabActive: { backgroundColor: t.colors.primaryBg, borderColor: t.colors.primary },
    filterTabText: { ...t.type.label, color: t.colors.textSecondary },
    filterTabTextActive: { color: t.colors.primary },
    metricChip: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    metricChipActive: { backgroundColor: t.colors.primaryBg, borderColor: t.colors.primary },
    metricChipText: { ...t.type.captionStrong, color: t.colors.textSecondary },
    metricChipTextActive: { color: t.colors.primary },
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    name: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    prTag: { backgroundColor: withAlpha(t.colors.primary, 0.16) },
    prTagText: { fontSize: t.fontSize.micro, color: t.colors.primary },
    meta: { ...t.type.caption, color: t.colors.textMuted },
    lastTime: { ...t.type.caption, color: t.colors.textSecondary },
    statValue: { fontSize: t.fontSize.lg, color: t.colors.textPrimary, fontVariant: ['tabular-nums'] },
    statLabel: { ...t.type.caption, color: t.colors.textMuted },
    delta: { ...t.type.num('label') },
    trendBuilding: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    emptyTitle: { ...t.type.title, color: t.colors.textPrimary },
    emptyText: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
  };
}
