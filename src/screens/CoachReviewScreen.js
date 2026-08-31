import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { format } from 'date-fns/format';
import { isWithinInterval } from 'date-fns/isWithinInterval';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, radius, type, withAlpha, circle, alpha, fontFamily } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { getAllWorkouts, getCompletedWorkoutSets, getAllExercises, getRecentCheckins, getCurrentMesocycleWeek } from '../lib/database';
import { calculateWeeklyVolume, getVolumeStatus, shouldDeload, MUSCLE_DISPLAY_NAMES, detectLaggingMuscles, summariseWorkoutSets, buildLast4WeekDeloadBuckets } from '../lib/algorithms';
import { SkeletonCard } from '../components/Skeleton';
import useAppStore from '../store/useAppStore';
import { getEffectiveLandmarks } from '../lib/effectiveLandmarks';
import { useShallow } from 'zustand/react/shallow';
import Card from '../components/Card';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import SectionLabel from '../components/SectionLabel';
import { navigateCrossTab } from '../navigation/navigateCrossTab';

// --- Helpers -----------------------------------------------------------------

// CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): takes the
// live colours so callers pass t.colors instead of the frozen static import.
function statusDotColor(status, c = colors) {
  switch (status) {
    case 'optimal': return c.success;
    case 'minimum': return c.warning;
    case 'near_mrv': return c.warning;
    case 'over_mrv': return c.error;
    default: return c.textMuted; // below / unknown
  }
}

function volumeStatusLabel(status) {
  switch (status) {
    case 'optimal': return 'Good range';
    case 'minimum': return 'Just enough';
    case 'near_mrv': return 'Getting close';
    case 'over_mrv': return 'Too much';
    case 'below': return 'Below target';
    default: return 'No data';
  }
}

// Build progressive overload wins by comparing this week's sets to prior sets
// for the same exercise. Returns array of { exerciseName, detail } strings.
function detectProgressionWins(thisWeekSets, allSets, exerciseMap) {
  const wins = [];
  const seenExercises = new Set();

  // Group this week's working sets by exercise
  const thisWeekByExercise = {};
  for (const s of thisWeekSets) {
    if ((s.setType || s.setType === 'warmup') && s.setType === 'warmup') continue;
    const exId = s.exerciseId || s.exercise_id;
    if (!exId) continue;
    if (!thisWeekByExercise[exId]) thisWeekByExercise[exId] = [];
    thisWeekByExercise[exId].push(s);
  }

  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();

  for (const [exId, sets] of Object.entries(thisWeekByExercise)) {
    if (seenExercises.has(exId)) continue;
    seenExercises.add(exId);

    const ex = exerciseMap[exId];
    if (!ex) continue;

    // Prior sets for this exercise (before this week, completed workouts)
    const priorSets = allSets.filter(
      s => (s.exerciseId || s.exercise_id) === exId &&
           (s.createdAt || 0) < thisWeekStart &&
           (s.setType !== 'warmup'),
    );
    if (priorSets.length === 0) continue;

    const thisMaxWeight = Math.max(...sets.map(s => s.weight || 0));
    const thisMaxReps = Math.max(...sets.map(s => s.actualReps || s.actual_reps || 0));

    const priorMaxWeight = Math.max(...priorSets.map(s => s.weight || 0));
    const priorMaxReps = Math.max(...priorSets.map(s => s.actualReps || s.actual_reps || 0));

    if (thisMaxWeight > priorMaxWeight && thisMaxWeight > 0) {
      wins.push({ exerciseName: ex.name, detail: `heavier weight this week` });
    } else if (thisMaxReps > priorMaxReps && thisMaxReps > 0) {
      wins.push({ exerciseName: ex.name, detail: `more reps this week` });
    }

    if (wins.length >= 3) break;
  }

  return wins;
}

// Build up to 3 plain-English recommendations for next week
// D90 #3 (2026-08-06): the screen-resolved landmark table (manual >
// adapted(Pro) > research, effectiveLandmarks.js). Module-scoped so the
// leaf VolumeRow and the pure recommendation builder read the same table
// the screen resolved; loadData writes it before any row renders.
let _resolvedLandmarks = null;

function buildRecommendations({ volumeByMuscle, deloadResult, checkins, laggingMuscles = [], inScheduledRecovery = false }) {
  const recs = [];

  // 1. Recovery week signal. Wave C item 1 (lead ruling, 2026-08-17) / FB-02:
  // suppressed inside a week already scheduled as recovery (or a finished
  // block awaiting its decision) so this screen cannot contradict the
  // structural block state the same day, mirroring HomeScreen.js's
  // inScheduledRecovery gate exactly (see the shared derivation above).
  if (deloadResult?.deload && deloadResult.reasons.length > 0 && !inScheduledRecovery) {
    recs.push(
      'Consider making next week a lighter recovery week. Reduce your sets by around a third and keep the weights comfortable. Your body will come back stronger afterwards.',
    );
  }

  // 2. Muscles that are over volume
  const overMuscles = Object.entries(volumeByMuscle)
    .filter(([muscle, data]) => {
      const { status } = getVolumeStatus(data.workingSets, muscle, _resolvedLandmarks);
      return status === 'over_mrv';
    })
    .map(([muscle]) => MUSCLE_DISPLAY_NAMES[muscle] || muscle);

  if (overMuscles.length > 0) {
    const list = overMuscles.slice(0, 2).join(' and ');
    recs.push(
      `${list} received more training than your body can easily recover from this week. Drop a set or two there next week to let them rebuild properly.`,
    );
  }

  // 3. Muscles that are under minimum
  const underMuscles = Object.entries(volumeByMuscle)
    .filter(([muscle, data]) => {
      const { status } = getVolumeStatus(data.workingSets, muscle, _resolvedLandmarks);
      return status === 'below';
    })
    .map(([muscle]) => MUSCLE_DISPLAY_NAMES[muscle] || muscle);

  if (underMuscles.length > 0 && recs.length < 3) {
    const list = underMuscles.slice(0, 2).join(' and ');
    recs.push(
      `${list} had fewer sets than the minimum needed to make progress. Try to fit in one more session for ${underMuscles.length === 1 ? 'it' : 'them'} next week.`,
    );
  }

  // 4. Persistently lagging muscle groups (below MEV for 3+ consecutive weeks)
  if (recs.length < 3 && laggingMuscles.length > 0) {
    const top = laggingMuscles[0];
    recs.push(
      `Your ${top.displayName} has been below effective training volume for ${top.weeksBelow} weeks. Consider adding one extra working set there each session next week to start making progress.`,
    );
  }

  // 5. Low energy or sleep from post-session check-ins
  if (recs.length < 3 && checkins.length >= 2) {
    const avgEnergy = checkins.reduce((s, c) => s + (c.energyScore || 3), 0) / checkins.length;
    const avgSleep = checkins.reduce((s, c) => s + (c.sleepQuality || 3), 0) / checkins.length;
    if (avgEnergy < 2.5 || avgSleep < 2.5) {
      recs.push(
        'Your energy and sleep scores have been low this week. Consider keeping training intensity comfortable rather than pushing for new bests. Recovery is where the adaptation happens.',
      );
    }
  }

  // 6. Joint flag from checkins (joint_pain column stored via saveWeeklyCheckin)
  if (recs.length < 3 && checkins.length > 0) {
    const recentJoint = checkins.find(c => (c.jointPain || c.jointDiscomfort || 0) >= 1);
    if (recentJoint) {
      recs.push(
        'Recent sessions flagged some joint discomfort. Next week, use weights that feel comfortable rather than pushing for new bests. Your joints will thank you.',
      );
    }
  }

  // 7. Generic positive nudge when everything looks fine
  if (recs.length === 0) {
    recs.push(
      'Your training looks balanced this week. Keep the same structure next week and look for small improvements: an extra rep or a slightly heavier weight on one exercise.',
    );
  }

  return recs.slice(0, 3);
}

// --- Sub-components -----------------------------------------------------------

function SectionHeading({ title }) {
  return <SectionLabel>{title}</SectionLabel>;
}

function VolumeRow({ muscle, data }) {
  // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): live theme.
  // See buildLiveStyles' header comment (defined below the frozen `styles`
  // block) for why.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const { status } = getVolumeStatus(data.workingSets, muscle, _resolvedLandmarks);
  const dot = statusDotColor(status, t.colors);
  const label = volumeStatusLabel(status);
  const displayName = MUSCLE_DISPLAY_NAMES[muscle] || muscle;
  const sets = Math.round(data.workingSets);

  return (
    <View style={styles.volumeRow}>
      <View style={[styles.volumeDot, { backgroundColor: dot }]} />
      <Text style={[styles.volumeMuscleName, live.volumeMuscleName]}>{displayName}</Text>
      <Text style={[styles.volumeSetCount, live.volumeSetCount]}>{sets} {sets === 1 ? 'set' : 'sets'}</Text>
      <View style={[styles.volumeBadge, { backgroundColor: withAlpha(dot, alpha.tint) }]}>
        <Text style={[styles.volumeBadgeText, { color: dot }]}>{label}</Text>
      </View>
    </View>
  );
}

function InsightRow({ icon, iconColor, text, subtext }) {
  // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={styles.insightRow}>
      <Ionicons name={icon} size={16} color={iconColor || t.colors.textSecondary} style={styles.insightIcon} />
      <View style={styles.insightTextWrap}>
        <Text style={[styles.insightText, live.insightText]}>{text}</Text>
        {subtext ? <Text style={[styles.insightSubtext, live.insightSubtext]}>{subtext}</Text> : null}
      </View>
    </View>
  );
}

function RecommendationRow({ index, text }) {
  // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={styles.recRow}>
      <View style={[styles.recIndex, live.recIndex]}>
        <Text style={[styles.recIndexText, live.recIndexText]}>{index + 1}</Text>
      </View>
      <Text style={[styles.recText, live.recText]}>{text}</Text>
    </View>
  );
}

// --- Main screen --------------------------------------------------------------

export default function CoachReviewScreen() {
  const navigation = useNavigation();
  // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): live theme.
  // See buildLiveStyles' header comment (defined below the frozen `styles`
  // block) for why.
  const t = useTheme();
  const live = buildLiveStyles(t);
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, tier } = useAppStore(useShallow(s => ({
    user: s.user,
    tier: s.tier,
  })));

  const [loading, setLoading] = useState(true);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState([]);
  const [volumeByMuscle, setVolumeByMuscle] = useState({});
  // X6 (cross-surface consistency audit 2026-07-30): a real set count, NOT
  // derived from volumeByMuscle. allocateExerciseVolume credits secondary
  // muscles at 0.5+ each, so summing workingSets across muscles double-counts
  // a set for every secondary it trains (10 bench sets read as 20 "total
  // sets"). Muscle credit is a volume metric; a set total must count sets.
  const [weeklySetCount, setWeeklySetCount] = useState(0);
  const [progressionWins, setProgressionWins] = useState([]);
  const [deloadResult, setDeloadResult] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [weekRange, setWeekRange] = useState({ start: null, end: null });
  const [laggingMuscles, setLaggingMuscles] = useState([]);
  const [loadError, setLoadError] = useState(false);
  // Wave C item 1 (lead ruling, 2026-08-17): the same block-week fact
  // HomeScreen reads to gate its recovery banner (getCurrentMesocycleWeek).
  const [currentMesoWeek, setCurrentMesoWeek] = useState(null);
  const loadRequestRef = useRef(0);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadData() {
    _resolvedLandmarks = await getEffectiveLandmarks(user?.id, { tier }).then(r => r?.table ?? null).catch(() => null);
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrentRequest = () => loadRequestRef.current === requestId;
    if (!user?.id) {
      setWeeklyWorkouts([]);
      setVolumeByMuscle({});
      setProgressionWins([]);
      setDeloadResult(null);
      setCheckins([]);
      setLaggingMuscles([]);
      setCurrentMesoWeek(null);
      setLoadError(false);
      setLoading(false);
      return;
    }

    try {
      setLoadError(false);
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      setWeekRange({ start: weekStart, end: weekEnd });

      const weekStartMs = weekStart.getTime();
      const weekEndMs = weekEnd.getTime();

      const [allWorkouts, allSets, allExercises, recentCheckins, mesoWeek] = await Promise.all([
        getAllWorkouts(user.id),
        getCompletedWorkoutSets(user.id),
        getAllExercises(),
        getRecentCheckins(user.id, 4),
        // Wave C item 1: getCurrentMesocycleWeek already fails closed (returns
        // null on any read error), so no separate try/catch is needed here.
        getCurrentMesocycleWeek(user.id),
      ]);
      if (!isCurrentRequest()) return;
      setCurrentMesoWeek(mesoWeek);

      // This week's completed workouts
      const thisWeekWorkouts = allWorkouts.filter(w =>
        w.isCompleted &&
        isWithinInterval(new Date(w.startedAt || w.createdAt || 0), { start: weekStart, end: weekEnd }),
      );
      setWeeklyWorkouts(thisWeekWorkouts);

      // This week's sets
      const thisWeekSets = allSets.filter(
        s => (s.createdAt || 0) >= weekStartMs && (s.createdAt || 0) <= weekEndMs,
      );

      // Build exercise lookup map
      const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));

      // Volume by muscle
      const volume = calculateWeeklyVolume(thisWeekSets, exerciseMap);
      setVolumeByMuscle(volume);
      // X6: the set COUNT for the week, independent of muscle-credit volume
      // (summariseWorkoutSets excludes warm-ups only, same basis every other
      // "sets" figure in the app uses).
      setWeeklySetCount(summariseWorkoutSets(thisWeekSets).workingSetCount);

      // Progressive overload wins
      const wins = detectProgressionWins(thisWeekSets, allSets, exerciseMap);
      setProgressionWins(wins);

      // Per-muscle working sets for each of the last 4 weekly (Monday-
      // anchored) buckets, for lagging-muscle detection only -- unrelated
      // to the shouldDeload signal built below.
      const weeklyVolumeHistory = [0, 1, 2, 3].map(offset => {
        const bucketStart = weekStartMs - (3 - offset) * 7 * 24 * 60 * 60 * 1000;
        const bucketEnd = bucketStart + 7 * 24 * 60 * 60 * 1000;
        const setsInWeek = allSets.filter(
          s => (s.createdAt || 0) >= bucketStart && (s.createdAt || 0) < bucketEnd,
        );
        const weekVolume = calculateWeeklyVolume(setsInWeek, exerciseMap);
        const muscleSets = {};
        for (const [muscle, data] of Object.entries(weekVolume)) {
          muscleSets[muscle] = data.workingSets || 0;
        }
        return muscleSets;
      });

      // Campaign 24 §2 (D33 ruling): bucket-building for shouldDeload moved
      // to the shared buildLast4WeekDeloadBuckets (src/lib/algorithms.js),
      // on the D6-correct answered-only path (zeroFillUnrated is never
      // passed, so it defaults to false). CORRECTION: this screen used to
      // coerce unrated soreness/joint values to 0
      // (`w.soreness24hBefore || 0`), the Campaign 1 P0-7 D6 bug already
      // fixed in useProgressData/HomeScreen; that coercion diluted genuine
      // evidence toward "no signal" and suppressed the deload triggers. This
      // is a deliberate, disclosed change to this screen's deload-signal
      // sensitivity (rated weeks now carry full weight instead of being
      // diluted by unrated ones), not a silent one -- shouldDeload itself is
      // untouched. weekAnchorMs reproduces this screen's Monday-anchored
      // bucket grammar; the weeks-since-lighter-week scan stays now-rolling
      // (parity with useProgressData), matching this screen's prior
      // behaviour exactly.
      const patchedBuckets = buildLast4WeekDeloadBuckets(allSets, allWorkouts, exerciseMap, {
        weekAnchorMs: weekStartMs,
      });

      const deload = shouldDeload(patchedBuckets);
      setDeloadResult(deload);

      // Detect persistently under-trained muscle groups (3+ weeks below MEV)
      const lagging = detectLaggingMuscles(weeklyVolumeHistory, 3);
      setLaggingMuscles(lagging);

      setCheckins(recentCheckins);
    } catch (_e) {
      // U-B-6: distinguish a genuine read failure from an empty week. Show a
      // retryable error state instead of the false "no sessions" card (parity
      // with the Pro CoachOutput screen). Data is not lost, this is a read fault.
      if (!isCurrentRequest()) return;
      setLoadError(true);
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }

  // Derived display data
  const trainedMuscles = Object.entries(volumeByMuscle)
    .filter(([, data]) => data.workingSets > 0)
    .sort(([, a], [, b]) => b.workingSets - a.workingSets);

  const optimalMuscles = trainedMuscles.filter(([muscle, data]) => {
    const { status } = getVolumeStatus(data.workingSets, muscle, _resolvedLandmarks);
    return status === 'optimal';
  });

  const watchMuscles = trainedMuscles.filter(([muscle, data]) => {
    const { status } = getVolumeStatus(data.workingSets, muscle, _resolvedLandmarks);
    return status === 'over_mrv' || status === 'near_mrv' || status === 'below' || status === 'minimum';
  });

  // X6: was trainedMuscles.reduce(...data.workingSets), which sums muscle
  // CREDIT (allocateExerciseVolume gives each secondary muscle 0.5+), not a
  // set count -- ten bench sets displayed as 20 "total sets". weeklySetCount
  // is a real count of this week's non-warm-up sets.
  const totalSets = weeklySetCount;

  const topMuscle = trainedMuscles.length > 0
    ? (MUSCLE_DISPLAY_NAMES[trainedMuscles[0][0]] || trainedMuscles[0][0])
    : null;

  // Wave C item 1 (lead ruling, 2026-08-17) / FB-02: identical predicate to
  // HomeScreen.js:1776 (`inScheduledRecovery`) so this screen's recovery-week
  // suggestion can never fire inside a week already scheduled as recovery or
  // a finished block awaiting its decision -- the missing gate that let this
  // screen contradict the structural block state on the same day. Reads the
  // same getCurrentMesocycleWeek fact Home reads, not a re-derivation.
  const inScheduledRecovery = !!currentMesoWeek?.isDeload || !!currentMesoWeek?.awaitingDecision;
  const deloadSuggestionEligible = !!deloadResult?.deload && !inScheduledRecovery;

  const recommendations = buildRecommendations({
    volumeByMuscle,
    deloadResult,
    checkins,
    laggingMuscles,
    inScheduledRecovery,
  });

  // Joint discomfort flag from recent workouts
  const jointFlag = weeklyWorkouts.some(w => (w.jointDiscomfort || 0) >= 2);

  const dateLabel =
    weekRange.start && weekRange.end
      ? `${format(weekRange.start, 'd MMM')} - ${format(weekRange.end, 'd MMM yyyy')}`
      : '';

  function retryLoad() {
    setLoadError(false);
    setLoading(true);
    loadData();
  }

  // --- Render -----------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        <BackHeader title="Training review" />
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <SkeletonCard height={96} />
          <SkeletonCard height={180} />
          <SkeletonCard height={140} />
          <SkeletonCard height={140} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // U-B-6: a real read failure is shown as a retryable error, never as "no sessions".
  if (loadError) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        <BackHeader title="Training review" />
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <EmptyState
            icon="warning-outline"
            title="Couldn't load your review"
            text="Your sessions are safe. This is a loading problem, not lost data."
            actionLabel="Try again"
            onAction={retryLoad}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const hasData = weeklyWorkouts.length > 0;

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Training review" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Date range subline, relocated here now the BackHeader carries the
            page title (previously duplicated as an in-body "Training review"
            heading, drawing a double header under the native bar). */}
        {dateLabel ? <Text style={[styles.headerDate, live.headerDate]}>{dateLabel}</Text> : null}

        {/* -- No data state -- */}
        {!hasData && (
          <EmptyState
            icon="barbell-outline"
            title="No sessions logged this week"
            text="Complete a session from Train and this review will show you the pattern."
            actionLabel="Start a workout"
            onAction={() => navigateCrossTab(navigation, 'HomeTab', 'BuildWorkout')}
            compact
          />
        )}

        {hasData && (
          <>
            {/* -- Sessions this week -- */}
            <Card>
              <Text style={[styles.cardTitle, live.cardTitle]}>Sessions this week</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, live.statValue]}>{weeklyWorkouts.length}</Text>
                  <Text style={[styles.statLabel, live.statLabel]}>{weeklyWorkouts.length === 1 ? 'session' : 'sessions'}</Text>
                </View>
                <View style={[styles.statDivider, live.statDivider]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, live.statValue]}>{Math.round(totalSets)}</Text>
                  <Text style={[styles.statLabel, live.statLabel]}>total sets</Text>
                </View>
                {topMuscle && (
                  <>
                    <View style={[styles.statDivider, live.statDivider]} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, live.statValue]} numberOfLines={1}>{topMuscle}</Text>
                      <Text style={[styles.statLabel, live.statLabel]}>most trained</Text>
                    </View>
                  </>
                )}
              </View>
            </Card>

            {/* -- Volume status -- */}
            {trainedMuscles.length > 0 && (
              <View style={styles.section}>
                <SectionHeading title="Volume this week" />
                <Text style={[styles.sectionSubtext, live.sectionSubtext]}>
                  How much training each muscle group received, and whether it falls within a helpful range for growth.
                </Text>
                <Card style={styles.cardNoPad}>
                  {trainedMuscles.map(([muscle, data], i) => (
                    <View
                      key={muscle}
                      style={[
                        styles.volumeRowWrap,
                        i < trainedMuscles.length - 1 && styles.volumeRowBorder,
                        i < trainedMuscles.length - 1 && live.volumeRowBorder,
                      ]}
                    >
                      <VolumeRow muscle={muscle} data={data} />
                    </View>
                  ))}
                </Card>
              </View>
            )}

            {/* -- What went well -- */}
            <View style={styles.section}>
              <SectionHeading title="What went well" />
              {optimalMuscles.length === 0 && progressionWins.length === 0 ? (
                <Card>
                  <Text style={[styles.emptySubText, live.emptySubText]}>
                    Keep logging sessions and patterns will show up here.
                  </Text>
                </Card>
              ) : (
                <Card style={styles.insightCard}>
                  {optimalMuscles.map(([muscle]) => (
                    <InsightRow
                      key={muscle}
                      icon="checkmark-circle-outline"
                      iconColor={t.colors.success}
                      text={`${MUSCLE_DISPLAY_NAMES[muscle] || muscle} training is in a good range`}
                      subtext="Enough sets to drive progress without overdoing it."
                    />
                  ))}
                  {progressionWins.map((win, i) => (
                    <InsightRow
                      key={`win-${i}`}
                      icon="trending-up-outline"
                      iconColor={t.colors.primary}
                      text={`${win.exerciseName} - ${win.detail}`}
                      subtext="Consistent small improvements are the foundation of long-term progress."
                    />
                  ))}
                </Card>
              )}
            </View>

            {/* -- What to watch -- */}
            <View style={styles.section}>
              <SectionHeading title="What to watch" />
              {watchMuscles.length === 0 && !deloadSuggestionEligible && !jointFlag ? (
                <Card>
                  <Text style={[styles.emptySubText, live.emptySubText]}>
                    Nothing to flag this week, your training is looking nicely balanced.
                  </Text>
                </Card>
              ) : (
                <Card style={styles.insightCard}>
                  {watchMuscles.map(([muscle, data]) => {
                    const { status } = getVolumeStatus(data.workingSets, muscle, _resolvedLandmarks);
                    const isOver = status === 'over_mrv';
                    const isNear = status === 'near_mrv';
                    const icon = isOver
                      ? 'arrow-up-circle-outline'
                      : isNear
                      ? 'alert-circle-outline'
                      : 'arrow-down-circle-outline';
                    const iconColor = isOver
                      ? t.colors.error
                      : isNear
                      ? t.colors.warning
                      : t.colors.textMuted;
                    const text = isOver
                      ? `${MUSCLE_DISPLAY_NAMES[muscle] || muscle} - more sets than you can comfortably recover from`
                      : isNear
                      ? `${MUSCLE_DISPLAY_NAMES[muscle] || muscle} - approaching the upper limit`
                      : `${MUSCLE_DISPLAY_NAMES[muscle] || muscle} - below the minimum for meaningful progress`;
                    const subtext = isOver
                      ? 'Reducing volume slightly next week will let your body recover and come back stronger.'
                      : isNear
                      ? 'You can keep the same volume next week, but avoid adding more sets for this muscle.'
                      : 'One extra session or a couple of additional sets would put this in a more productive range.';
                    return (
                      <InsightRow
                        key={muscle}
                        icon={icon}
                        iconColor={iconColor}
                        text={text}
                        subtext={subtext}
                      />
                    );
                  })}

                  {deloadSuggestionEligible && (
                    <InsightRow
                      icon="battery-half-outline"
                      iconColor={t.colors.warning}
                      text="Your recent training suggests a recovery week might help"
                      subtext="A lighter week every few weeks allows your nervous system and joints to reset, often leading to better performance afterwards."
                    />
                  )}

                  {jointFlag && (
                    <InsightRow
                      icon="medkit-outline"
                      iconColor={t.colors.error}
                      text="Joint discomfort noted during sessions this week"
                      subtext="Keep an eye on this. Prioritise movement quality over load, and consider swapping to a less demanding variation if it persists."
                    />
                  )}
                </Card>
              )}
            </View>

            {/* -- What to focus on next week -- */}
            <View style={styles.section}>
              <SectionHeading title="What to focus on next week" />
              <Card style={styles.insightCard}>
                {recommendations.map((rec, i) => (
                  <RecommendationRow key={i} index={i} text={rec} />
                ))}
              </Card>
            </View>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles -------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  bottomSpacer: {
    height: spacing.xxxl,
  },

  // Date range subline (BackHeader now carries the page title).
  headerDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: -spacing.sm,
  },

  // Cards
  cardNoPad: {
    padding: 0,
    overflow: 'hidden',
  },
  cardTitle: {
    ...type.overline,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },

  // Sessions stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.heavy, fontWeight: fontWeight.heavy,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  statLabel: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },

  // Sections
  section: {
    gap: spacing.sm,
  },
  sectionSubtext: {
    ...type.captionTight,
    color: colors.textMuted,
  },

  // Volume rows
  volumeRowWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  volumeRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  volumeDot: {
    width: 8,
    height: 8,
    borderRadius: circle(8),
  },
  volumeMuscleName: {
    flex: 1,
    fontSize: fontSize.md,
    fontFamily: fontFamily.medium, fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  volumeSetCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  volumeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  volumeBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold,
  },

  // Insight rows
  insightCard: {
    gap: spacing.md,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  insightIcon: {
    marginTop: spacing.xxs,
  },
  insightTextWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  insightText: {
    ...type.bodySm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  insightSubtext: {
    ...type.captionTight,
    color: colors.textSecondary,
  },

  // Recommendations
  recRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  recIndex: {
    width: 22,
    height: 22,
    borderRadius: circle(22),
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.mid),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.hair,
    flexShrink: 0,
  },
  recIndexText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold, fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  recText: {
    ...type.bodySm,
    flex: 1,
    color: colors.textSecondary,
  },

  emptySubText: {
    ...type.bodySm,
    color: colors.textMuted,
  },
});

// CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): buildLiveStyles
// mirrors only the colour/fontSize/type-bearing sub-properties of the frozen
// `styles` block above, at identical rest values; pure layout keys (flex/
// padding/gap, no token) are correctly omitted. Same pattern as
// WorkoutSummaryScreen.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    headerDate: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    cardTitle: { ...t.type.overline, color: t.colors.textMuted },
    statValue: { fontSize: t.fontSize.xl, color: t.colors.textPrimary },
    statLabel: { ...t.type.caption, color: t.colors.textSecondary },
    statDivider: { backgroundColor: t.colors.border },
    sectionSubtext: { ...t.type.captionTight, color: t.colors.textMuted },
    volumeRowBorder: { borderBottomColor: t.colors.border },
    volumeMuscleName: { fontSize: t.fontSize.md, color: t.colors.textPrimary },
    volumeSetCount: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    insightText: { ...t.type.bodySm, color: t.colors.textPrimary },
    insightSubtext: { ...t.type.captionTight, color: t.colors.textSecondary },
    recIndex: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.mid) },
    recIndexText: { fontSize: t.fontSize.xs, color: t.colors.primary },
    recText: { ...t.type.bodySm, color: t.colors.textSecondary },
    emptySubText: { ...t.type.bodySm, color: t.colors.textMuted },
  };
}
