import { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { safeDate, safeFormatDate, safeNumber, safeToFixed } from '../lib/safeFormat';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, alpha, iconSize, fontFamily } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';
import AnimatedEntrance from '../components/AnimatedEntrance';
import PressableCard from '../components/PressableCard';
import Card from '../components/Card';
import Button from '../components/Button';
import PeekMenu from '../components/PeekMenu';
import InfoTooltip from '../components/InfoTooltip';
import SectionLabel from '../components/SectionLabel';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import { SkeletonRow } from '../components/Skeleton';
import VolyumeChart from '../components/VolyumeChart';
import { GLOSSARY } from '../lib/coachGlossary';
import { getCompletedWorkoutSets, getAllExercises, getLatestBodyWeight } from '../lib/database';
import { buildLiftProgressRows, buildExerciseMetricSeries, derivePRIndices, seriesDeltaPct } from '../lib/liftProgress';
import { MUSCLE_DISPLAY_NAMES, buildLoadSemanticsById } from '../lib/algorithms';
import { getStrengthLevel, summariseStrengthStanding, matchStandardKey } from '../lib/strengthStandards';
import { kgToLbs } from '../lib/units';
import { buildWeeklyLoadSeries, getWeeklyLoadWindow, DEFAULT_LOAD_WEEKS } from '../lib/progressSeries';
import { formatNumber } from '../lib/format';
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
// -- the label -> colour mapping is byte-identical in meaning, only the
// token SOURCE moved from the frozen import to the live theme. Returns a
// resolver function, same call shape as before.
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
// T24/O20 (comprehension-trust-audit-2026-08-06): this lens used to be
// labelled "Volume", but the app already defines "Volume" app-wide as
// weekly hard sets for a muscle (GLOSSARY.volume) -- a session's
// weight-times-reps total is a different thing and colliding the two names
// misled users. Renamed to plain "Total lifted" language; same underlying
// series (see buildExerciseMetricSeries's 'volume' key), only the copy
// changed.
const METRICS = [
  { key: 'e1rm', label: 'Est. max' },
  { key: 'heaviest', label: 'Heaviest weight' },
  { key: 'reps', label: 'Total reps' },
  { key: 'volume', label: 'Total lifted' },
];

// Item 7 (campaign 2026-07-10): the row's headline numeral used to stay
// e1RM-based even when a non-default metric lens was selected, so a
// volume-shaped sparkline sat under an "est. max" label. Each entry names
// the headline label for its lens and whether the value is a weight in the
// display unit (kg/lbs suffix) or a bare count, mirroring ExerciseDetail's
// WEIGHT_METRICS split.
//
// T24/O20: 'volume' is a weight (kg), not a bare count -- isWeight flips to
// true so the headline renders the unit and (session totals can run into
// five figures) an en-GB thousands separator, instead of a bare unitless
// number.
const METRIC_HEADLINE = {
  e1rm: { label: 'Est. max', isWeight: true },
  heaviest: { label: 'heaviest', isWeight: true },
  reps: { label: 'most reps', isWeight: false },
  volume: { label: 'total lifted', isWeight: true },
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
  // Campaign 23 (§20/§27): the Training Load hero + its 8-week chart demoted
  // off the Progress landing into this drilldown, Monday-anchored (§6, IA-2:
  // the landing's rolling-week hero used to disagree with the Monday-
  // anchored volume strip on the same screen about what "this week" meant).
  const [weeklyLoad, setWeeklyLoad] = useState([]);
  const [weeklyLoadSessionCount, setWeeklyLoadSessionCount] = useState(0);
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
      setWeeklyLoad([]);
      setWeeklyLoadSessionCount(0);
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
      const exerciseTypeById = Object.fromEntries(typeById);
      // D107-2: per-hand sets count x2 in weekly load, assistance excluded.
      const loadSemanticsById = buildLoadSemanticsById(exercises);
      // AnalyticsScreen.stage3Guards.test.js pins this exact call (one
      // production call site, weekBoundary: 'monday') byte-for-byte -- do
      // not add args here. The B2 gate below reads its own Date.now() a
      // statement later instead of sharing a `now` through this call.
      setWeeklyLoad(buildWeeklyLoadSeries(sets, { exerciseTypeById, loadSemanticsById, weekBoundary: 'monday' }));
      // B2 (progress-tab audit 2026-09-24): the hero gate used to count
      // distinct workouts over ALL loaded sets (all time), while the hero's
      // own chart above only ever draws the last 8 Monday-anchored weeks --
      // a returning user with old sessions and nothing recent saw the hero
      // appear with an empty "This week: 0" chart. Gate on distinct
      // workouts whose sets fall inside that SAME window instead.
      // getWeeklyLoadWindow shares the exact bounds-building code the call
      // above's monday branch uses internally, so this cannot drift from
      // what that chart actually draws (both resolve `now` a statement
      // apart, never far enough to cross a Monday boundary).
      const loadWindow = getWeeklyLoadWindow(DEFAULT_LOAD_WEEKS);
      const inWindowWorkoutIds = new Set(
        (sets || [])
          .filter(s => {
            const at = Number(s.createdAt ?? s.created_at) || 0;
            return at >= loadWindow.startMs && at < loadWindow.endMs;
          })
          .map(s => s.workoutId ?? s.workout_id),
      );
      setWeeklyLoadSessionCount(inWindowWorkoutIds.size);

      if (bw?.weightKg) {
        // Bodyweight is canonical kg; estimated maxes come from logged gym
        // weight in the display unit. Compare like with like by converting
        // bodyweight into the display unit (A2-043: a lbs user's ratio was
        // once lbs/kg, inflated ~2.2x, so everyone read as Elite).
        const bwValue = units === 'lbs'
          ? Math.round(kgToLbs(bw.weightKg) * 10) / 10
          : Math.round(bw.weightKg * 10) / 10;
        setBodyWeight(bwValue);
        // B4 (progress-tab audit 2026-09-24): the STANDARD's category
        // (bench/squat/deadlift/ohp/row) is the identity, not the exercise's
        // own name -- two variants of the same lift (e.g. "Barbell Bench
        // Press" and "Close-Grip Bench Press") are both scored against the
        // SAME standard and must collapse to one row, keyed by category,
        // keeping whichever variant currently has the best ratio and naming
        // the row after that variant.
        const levels = {};
        for (const r of builtRows) {
          if (!r.bestE1rm) continue;
          const key = matchStandardKey(r.name);
          if (!key) continue;
          const lvl = getStrengthLevel(r.name, r.bestE1rm, bwValue);
          if (!lvl) continue;
          if (!levels[key] || lvl.ratio > levels[key].level.ratio) {
            levels[key] = { name: r.name, level: lvl };
          }
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
      setWeeklyLoad([]);
      setWeeklyLoadSessionCount(0);
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

  // Campaign 23 (§9): the standing share CTA moved off the Progress landing
  // with the hero itself. Sharing weekly load is still available, one tap
  // deep, from here.
  function makeWeightLiftedCard() {
    if (!weeklyLoad || weeklyLoad.length < 2) return;
    const u = units === 'lbs' ? 'lbs' : 'kg';
    const latest = weeklyLoad[weeklyLoad.length - 1]?.value || 0;
    const avg = Math.round(weeklyLoad.reduce((sum, p) => sum + p.value, 0) / weeklyLoad.length);
    navigation.navigate('ShareCard', {
      milestoneData: {
        eyebrow: 'Weight lifted',
        title: 'Your weight lifted',
        heroValue: Math.round(latest).toLocaleString('en-GB'),
        heroUnit: `${u} lifted, this week`,
        caption: `Averaging ${avg.toLocaleString('en-GB')} ${u} a week over the last ${weeklyLoad.length} weeks.`,
        date: Date.now(),
        stats: [],
      },
    });
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
    // EP-23/UI-11: bestE1rm/lastTrainedAt can be malformed after a bad
    // restore/sync; only offer sharing when the weight is actually a finite
    // number, and never let a bad lastTrainedAt crash the long-press menu by
    // calling toISOString() on an Invalid Date.
    if (safeNumber(row.bestE1rm) > 0) {
      items.push({
        icon: 'share-outline',
        label: 'Share this PR',
        onPress: () => navigation.navigate('ShareCard', {
          prData: {
            exerciseName: row.name,
            weight: safeToFixed(row.bestE1rm, 1),
            reps: '1',
            units,
            date: (safeDate(row.lastTrainedAt) ?? new Date()).toISOString(),
          },
        }),
      });
    }
    peekRef.current?.open({ title: row.name, items });
  }

  const standing = useMemo(() => {
    const rowByName = Object.fromEntries(rows.map(r => [r.name, r]));
    // B4: strengthLevels is now keyed by standard category, one entry per
    // category (see loadData) -- Object.values's length is therefore
    // already the category count summariseStrengthStanding reports as
    // "main lifts", with no further change needed there.
    return summariseStrengthStanding(
      Object.values(strengthLevels).map(({ name, level }) => ({
        lift: name,
        oneRm: rowByName[name]?.bestE1rm ?? null,
        level,
      })),
    );
  }, [rows, strengthLevels]);

  const hasStanding = bodyWeight && Object.keys(strengthLevels).length > 0;
  // B3: bodyweight is set and lifts exist, but none of them matched any of
  // the five tracked standards (e.g. only isolation/machine work logged so
  // far) -- the prior render left this slot blank instead of saying so.
  const noMatchingStandard = bodyWeight && rows.length > 0 && Object.keys(strengthLevels).length === 0;
  const tabRows = filter === 'best' ? rows.filter(isRecentBest) : rows;
  // C1: substring match on name, case-insensitive; an empty query is a no-op
  // so clearing the box restores the tab's full, already-sorted list.
  const q = query.trim().toLowerCase();
  const data = q ? tabRows.filter(r => r.name.toLowerCase().includes(q)) : tabRows;

  const header = (
    <View>
      {/* Campaign 23 (§20/§27): the demoted Training Load hero + 8-week
          chart, relabelled "Weight lifted" (§6) and Monday-anchored. */}
      {weeklyLoadSessionCount >= 3 && (
        <View style={styles.weightLiftedSection}>
          <SectionLabel>Training</SectionLabel>
          <WeightLiftedHero series={weeklyLoad} units={units} onMakeCard={makeWeightLiftedCard} />
        </View>
      )}
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
              <Text style={[styles.standingLabel, live.standingLabel]}>{standing.overallLabel}</Text>
              <Text style={[styles.standingSub, live.standingSub]}>
                overall across {standing.count} main {standing.count === 1 ? 'lift' : 'lifts'}
              </Text>
              {standing.nearest ? (
                <Text style={[styles.standingNext, live.standingNext]}>
                  {standing.nearest.delta} {units} from {standing.nearest.toLabel} on {standing.nearest.lift}
                </Text>
              ) : (
                <Text style={[styles.standingNext, live.standingNext]}>At the top of the standards on every tracked lift.</Text>
              )}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <SectionLabel>Relative strength</SectionLabel>
            <InfoTooltip
              size={13}
              text={'How your best estimated lifts compare to your own body weight.\n\nEach lift has its own thresholds: pressing movements sit lower, squats and deadlifts higher, so the same ratio can mean different levels on different lifts.\n\nBeginner > Novice > Intermediate > Advanced > Elite'}
            />
          </View>
          <Text style={[styles.sectionSub, live.sectionSub]}>Based on {bodyWeight} {units} body weight</Text>
          {/* B4: one row per matched STANDARD CATEGORY (key), named after
              whichever exercise variant produced that category's best ratio
              -- not one row per exercise name. */}
          {Object.entries(strengthLevels).map(([key, entry]) => (
            <View key={key} style={[styles.strengthRow, live.strengthRow]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.strengthName, live.strengthName]} numberOfLines={1}>{entry.name}</Text>
                <Text style={[styles.strengthNarrative, live.strengthNarrative]}>
                  {entry.level.ratio >= 1
                    ? `${entry.level.ratio.toFixed(2)}x your body weight`
                    : `${Math.round(entry.level.ratio * 100)}% of your body weight`}
                </Text>
              </View>
              <View style={[styles.levelBadge, { backgroundColor: withAlpha(resolveLevelColor(entry.level.label), alpha.tint) }]}>
                <Text style={[styles.levelBadgeText, live.levelBadgeText, { color: resolveLevelColor(entry.level.label) }]}>{entry.level.label}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : noMatchingStandard ? (
        // B3: the third state -- bodyweight is known and lifts exist, but
        // none matched a tracked standard yet. Calm, one line, no action
        // (there is nothing to tap here, unlike the body-weight prompt
        // below): it just names what would make the card appear.
        <View style={[styles.standingEmptyCard, live.standingEmptyCard]}>
          <Ionicons name="barbell-outline" size={20} color={t.colors.textMuted} />
          <Text style={[styles.standingEmptyText, live.standingEmptyText]}>
            Your standing appears once you log a bench press, squat, deadlift, overhead press or barbell row.
          </Text>
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
            <Text style={[styles.bwPromptTitle, live.bwPromptTitle]}>Add your body weight</Text>
            <Text style={[styles.bwPromptText, live.bwPromptText]}>
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
              <Text style={[styles.filterTabText, live.filterTabText, filter === f && [styles.filterTabTextActive, live.filterTabTextActive]]}>
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
              <Text style={[styles.metricChipText, live.metricChipText, metric === m.key && [styles.metricChipTextActive, live.metricChipTextActive]]}>
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
          // B1 (progress-tab audit 2026-09-24): the "+N%" badge + "since
          // first log" caption follow whichever headline is ACTUALLY on
          // screen (headlineMetric, which itself already falls back to
          // e1rm when this exercise has no series for the selected lens --
          // see hasNonE1rmSeries above), not always the e1RM change. The
          // e1RM lens keeps its existing item.deltaPct (today's value,
          // unchanged); every other lens computes its own first-to-latest
          // change from that lens's own series, hidden when that series has
          // fewer than two points.
          const badgeDeltaPct = headlineMetric === 'e1rm' ? item.deltaPct : seriesDeltaPct(nonE1rmSeries);
          const showBadge = headlineMetric === 'e1rm'
            ? (badgeDeltaPct != null && item.sessions > 1)
            : (badgeDeltaPct != null);
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
                  ? `${item.deltaPct > 0 ? 'up' : item.deltaPct < 0 ? 'down' : 'no change'} ${Math.abs(item.deltaPct)} percent since your first logged session`
                  : null,
                best ? 'recent best' : null,
              ].filter(Boolean).join(', ')}
              accessibilityHint="Long press for options"
            >
              <View style={styles.cardMain}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, live.name]} numberOfLines={1}>{item.name}</Text>
                  {/* O37: "PR" chip renamed to "Best", matching the app's
                      own "New bests" language elsewhere. Styles unchanged. */}
                  {best && (
                    <View style={[styles.prTag, live.prTag]}>
                      <Text style={[styles.prTagText, live.prTagText]}>Best</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.meta, live.meta]}>
                  {muscle ? `${muscle} - ` : ''}{item.sessions} {item.sessions === 1 ? 'session' : 'sessions'}{safeDate(item.lastTrainedAt) ? ` - last ${safeFormatDate(item.lastTrainedAt, 'd MMM')}` : ''}
                </Text>
                {/* C1: the last logged session's own numbers, distinct from the
                    all-time best headline below. liftProgress.js tracks the
                    session's top weight and its e1RM only (no rep count is
                    computed per session), so the line reports those two. */}
                <Text style={[styles.lastTime, live.lastTime]}>
                  Last time: {item.latestWeight}{units} - Est. max {item.latestE1rm}{units}
                </Text>
                <View style={styles.statRow}>
                  <Text style={[styles.statValue, live.statValue]}>
                    {/* T24/O20: the total-lifted lens can run into five
                        figures (kg), so it gets an en-GB thousands
                        separator; the other lenses are unaffected. */}
                    {headlineMetric === 'volume' ? Math.round(headlineValue).toLocaleString('en-GB') : headlineValue}
                    {headlineMeta.isWeight ? units : ''}
                  </Text>
                  <Text style={[styles.statLabel, live.statLabel]}>{headlineMeta.label}</Text>
                  {/* U-D-3: plain-English gloss for estimated 1RM on the row.
                      Only meaningful for the e1RM lens itself. */}
                  {headlineMetric === 'e1rm' && <InfoTooltip text={GLOSSARY.estMax} size={11} />}
                  {/* T24/O20: plain-English gloss for the total-lifted lens.
                      Kept as an inline string, not GLOSSARY.volume -- that
                      entry describes the app's OTHER "Volume" (weekly hard
                      sets), a different concept from a session total. */}
                  {headlineMetric === 'volume' && (
                    <InfoTooltip text="Total weight moved: each set's weight times reps, added up." size={11} />
                  )}
                  {showBadge && (
                    <Text style={[styles.delta, live.delta, { color: trendColor(badgeDeltaPct) }]}>
                      {badgeDeltaPct > 0 ? '+' : ''}{badgeDeltaPct}%
                    </Text>
                  )}
                </View>
                {showBadge && (
                  <Text style={[styles.deltaCaption, live.deltaCaption]}>since first log</Text>
                )}
              </View>
              <View style={styles.cardRight}>
                {/* U-D-4: with only 1 to 2 points a sparkline reads as a near-flat
                    line; show an encouragement "building" hint instead until a
                    real trend exists (3+ points). */}
                {(series?.length ?? 0) > 2 ? (
                  <Sparkline data={series} width={84} height={34} color={trendColor(item.deltaPct)} highlightIndices={prIndices} />
                ) : (
                  <Text style={[styles.trendBuilding, live.trendBuilding]}>Building</Text>
                )}
                <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
              </View>
            </PressableCard>
            </AnimatedEntrance>
          );
        }}
        ListEmptyComponent={
          loading ? (
            // Campaign 24 §1.4: this used to render nothing at all during
            // first paint (a blank flash), the one Progress-detail screen
            // without a loading placeholder -- ConsistencyScreen (same tab)
            // shows SkeletonCard rows, YearOfLiftsScreen shows a "Building…"
            // caption. This list is row-shaped, so SkeletonRow is the
            // closer structural match.
            <View style={styles.loadingWrap}>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </View>
          ) : loadError ? (
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
              <Text style={[styles.emptyTitle, live.emptyTitle]}>
                {q ? 'No matching lifts' : filter === 'best' ? 'Your bests will show here' : 'Your lifts start here'}
              </Text>
              <Text style={[styles.emptyText, live.emptyText]}>
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

// Campaign 23 (§6/§20/§27): relocated from the Progress landing's A5 hero
// (AnalyticsScreen.js), unchanged except relabelled "Weight lifted" (the
// prior "Training load" headline claimed a construct this only computes as
// tonnage) and Monday-anchored (buildWeeklyLoadSeries weekBoundary:
// 'monday'). Scrub state lives here so a scrub re-renders this card only.
function WeightLiftedHero({ series, units, onMakeCard }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const [chartW, setChartW] = useState(0);
  const [scrubIdx, setScrubIdx] = useState(null);
  const lastIdx = series.length - 1;
  const bars = useMemo(
    () => series.map((pt, i) => ({
      value: pt.value,
      color: i === lastIdx ? t.colors.primary : t.colors.primaryDim,
    })),
    [series, lastIdx, t],
  );
  if (series.length < 2) return null;
  const activeIdx = scrubIdx != null && scrubIdx >= 0 && scrubIdx < series.length ? scrubIdx : lastIdx;
  const active = series[activeIdx];
  const weekLabel = active.weeksAgo === 0
    ? 'This week'
    : active.weeksAgo === 1 ? 'Last week' : `${active.weeksAgo} weeks ago`;
  const unit = units === 'lbs' ? 'lbs' : 'kg';
  return (
    <Card accessibilityLabel={`Weight lifted. ${weekLabel}: ${formatNumber(active.value)} ${unit}.`}>
      <Text style={[styles.heroEyebrow, live.heroEyebrow]}>Weight lifted</Text>
      <View style={styles.heroValueRow}>
        <Text style={[styles.heroValue, live.heroValue]}>{formatNumber(active.value)}</Text>
        <Text style={[styles.heroUnit, live.heroUnit]}>{unit}</Text>
      </View>
      <Text style={[styles.heroSub, live.heroSub]}>{weekLabel}</Text>
      <View
        style={styles.heroChartSlot}
        onLayout={e => setChartW(Math.round(e.nativeEvent.layout.width))}
      >
        {chartW > 0 && (
          <VolyumeChart
            variant="bar"
            data={bars}
            width={chartW}
            height={64}
            barGap={spacing.xs}
            interactive
            onScrubIndex={setScrubIdx}
            accessibilityLabel={`Weekly weight lifted, last ${series.length} weeks. This week highlighted.`}
          />
        )}
      </View>
      <View style={styles.heroAxisRow}>
        <Text style={[styles.heroAxisLabel, live.heroAxisLabel]}>{series.length - 1} weeks ago</Text>
        <Text style={[styles.heroAxisLabel, live.heroAxisLabel]}>this week</Text>
      </View>
      <Button
        variant="outline"
        size="sm"
        fullWidth={false}
        title="Create share image"
        onPress={onMakeCard}
        accessibilityLabel="Create share image"
        style={styles.heroCtaRow}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },

  // ── Weight lifted (Campaign 23, relocated from the Progress landing) ──
  weightLiftedSection: { gap: spacing.md, marginBottom: spacing.lg },
  heroEyebrow: { ...type.label, color: colors.textSecondary },
  heroValueRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  heroValue: { ...type.num('display'), color: colors.textPrimary },
  heroUnit: { ...type.title, color: colors.textSecondary },
  heroSub: { ...type.num('caption'), color: colors.textMuted, marginTop: spacing.xxs },
  heroChartSlot: { marginTop: spacing.md, minHeight: 64 },
  heroAxisRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroAxisLabel: { ...type.captionTight, color: colors.textMuted, marginTop: spacing.xs },
  heroCtaRow: { alignSelf: 'flex-end', marginTop: spacing.sm },

  searchBar: { marginBottom: spacing.md },

  // ── Strength standing header ──
  standingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  standingHeadline: {
    alignItems: 'flex-start',
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  standingLabel: {
    color: colors.primary,
    fontSize: fontSize.xxxl,
    fontFamily: fontFamily.heavy, fontWeight: fontWeight.heavy,
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
    borderTopColor: colors.borderSubtle,
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
    borderColor: withAlpha(colors.primary, alpha.edge),
    marginBottom: spacing.md,
  },
  bwPromptTitle: { ...type.bodyStrong, color: colors.textPrimary },
  bwPromptText: { ...type.captionTight, color: colors.textSecondary, marginTop: spacing.xxs },

  // ── Standing card, third state (B3): bodyweight known, lifts logged, none
  // matched a tracked standard yet. Same card shell as bwPromptCard but not
  // pressable (no CTA), so it drops the chevron and the primary-tinted edge.
  standingEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  standingEmptyText: { ...type.captionTight, color: colors.textSecondary, flex: 1 },

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
    borderColor: colors.borderSubtle,
    gap: spacing.md,
  },
  cardMain: { flex: 1, gap: spacing.xxs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { ...type.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  prTag: {
    backgroundColor: withAlpha(colors.primary, alpha.soft),
    // R2 (2026-07-11): badge class -> radius.full (FOOD-DESIGN-STANDARD.md
    // section 4). Was radius.sm.
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  prTagText: { fontSize: fontSize.micro, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.primary },
  meta: { ...type.caption, color: colors.textMuted },
  lastTime: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  statRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: spacing.xxs },
  // Theme gap: no lg+heavy type role exists; the raw pair stays (weight
  // preserved). R2 (2026-07-11): headline is a weight/e1RM readout, so it
  // gains tabular figures like the delta beside it.
  statValue: { fontSize: fontSize.lg, fontFamily: fontFamily.heavy, fontWeight: fontWeight.heavy, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  statLabel: { ...type.caption, color: colors.textMuted },
  delta: { ...type.num('label'), marginLeft: spacing.xs },
  // O29: the since-first-log clarifier under the +N% badge, in the same
  // quiet caption register as `meta`/`lastTime` above.
  deltaCaption: { ...type.captionTight, color: colors.textMuted },
  cardRight: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  trendBuilding: { width: 84, textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted },
  emptyStateWrap: { paddingTop: spacing.xxl },
  loadingWrap: { paddingTop: spacing.md, paddingHorizontal: spacing.sm },
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
// omitted -- there is nothing to unfreeze for them.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    heroEyebrow: { ...t.type.label, color: t.colors.textSecondary },
    heroValue: { ...t.type.num('display'), color: t.colors.textPrimary },
    heroUnit: { ...t.type.title, color: t.colors.textSecondary },
    heroSub: { ...t.type.num('caption'), color: t.colors.textMuted },
    heroAxisLabel: { ...t.type.captionTight, color: t.colors.textMuted },
    standingCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    standingHeadline: { borderBottomColor: t.colors.borderSubtle },
    standingLabel: { color: t.colors.primary, fontSize: t.fontSize.xxxl },
    standingSub: { ...t.type.caption, color: t.colors.textMuted },
    standingNext: { ...t.type.label, color: t.colors.textSecondary },
    sectionSub: { ...t.type.caption, color: t.colors.textMuted },
    strengthRow: { borderTopColor: t.colors.borderSubtle },
    strengthName: { ...t.type.label, color: t.colors.textPrimary },
    strengthNarrative: { ...t.type.num('caption'), color: t.colors.textMuted },
    levelBadgeText: { ...t.type.captionStrong },
    bwPromptCard: { backgroundColor: t.colors.surface, borderColor: withAlpha(t.colors.primary, alpha.edge) },
    bwPromptTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    bwPromptText: { ...t.type.captionTight, color: t.colors.textSecondary },
    standingEmptyCard: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    standingEmptyText: { ...t.type.captionTight, color: t.colors.textSecondary },
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
    prTag: { backgroundColor: withAlpha(t.colors.primary, alpha.soft) },
    prTagText: { fontSize: t.fontSize.micro, color: t.colors.primary },
    meta: { ...t.type.caption, color: t.colors.textMuted },
    lastTime: { ...t.type.caption, color: t.colors.textSecondary },
    statValue: { fontSize: t.fontSize.lg, color: t.colors.textPrimary, fontVariant: ['tabular-nums'] },
    statLabel: { ...t.type.caption, color: t.colors.textMuted },
    delta: { ...t.type.num('label') },
    deltaCaption: { ...t.type.captionTight, color: t.colors.textMuted },
    trendBuilding: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    emptyTitle: { ...t.type.title, color: t.colors.textPrimary },
    emptyText: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
  };
}
