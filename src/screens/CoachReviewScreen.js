import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { startOfWeek, endOfWeek, format, isWithinInterval } from 'date-fns';
import { colors, spacing, fontSize, fontWeight, radius, type, withAlpha } from '../styles/theme';
import { getAllWorkouts, getCompletedWorkoutSets, getAllExercises, getRecentCheckins } from '../lib/database';
import { calculateWeeklyVolume, getVolumeStatus, shouldDeload, MUSCLE_DISPLAY_NAMES, VOLUME_LANDMARKS, detectLaggingMuscles } from '../lib/algorithms';
import { SkeletonCard } from '../components/Skeleton';
import useAppStore from '../store/useAppStore';
import Button from '../components/Button';
import Card from '../components/Card';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusDotColor(status) {
  switch (status) {
    case 'optimal': return colors.success;
    case 'minimum': return colors.warning;
    case 'near_mrv': return colors.warning;
    case 'over_mrv': return colors.error;
    default: return colors.textMuted; // below / unknown
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
function buildRecommendations({ volumeByMuscle, deloadResult, checkins, laggingMuscles = [] }) {
  const recs = [];

  // 1. Recovery week signal
  if (deloadResult?.deload && deloadResult.reasons.length > 0) {
    recs.push(
      'Consider making next week a lighter recovery week. Reduce your sets by around a third and keep the weights comfortable. Your body will come back stronger afterwards.',
    );
  }

  // 2. Muscles that are over volume
  const overMuscles = Object.entries(volumeByMuscle)
    .filter(([muscle, data]) => {
      const { status } = getVolumeStatus(data.workingSets, muscle);
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
      const { status } = getVolumeStatus(data.workingSets, muscle);
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeading({ title }) {
  return <Text style={styles.sectionHeading}>{title}</Text>;
}

function VolumeRow({ muscle, data }) {
  const { status } = getVolumeStatus(data.workingSets, muscle);
  const dot = statusDotColor(status);
  const label = volumeStatusLabel(status);
  const displayName = MUSCLE_DISPLAY_NAMES[muscle] || muscle;
  const sets = Math.round(data.workingSets);

  return (
    <View style={styles.volumeRow}>
      <View style={[styles.volumeDot, { backgroundColor: dot }]} />
      <Text style={styles.volumeMuscleName}>{displayName}</Text>
      <Text style={styles.volumeSetCount}>{sets} {sets === 1 ? 'set' : 'sets'}</Text>
      <View style={[styles.volumeBadge, { backgroundColor: withAlpha(dot, 0.133) }]}>
        <Text style={[styles.volumeBadgeText, { color: dot }]}>{label}</Text>
      </View>
    </View>
  );
}

function InsightRow({ icon, iconColor, text, subtext }) {
  return (
    <View style={styles.insightRow}>
      <Ionicons name={icon} size={16} color={iconColor || colors.textSecondary} style={styles.insightIcon} />
      <View style={styles.insightTextWrap}>
        <Text style={styles.insightText}>{text}</Text>
        {subtext ? <Text style={styles.insightSubtext}>{subtext}</Text> : null}
      </View>
    </View>
  );
}

function RecommendationRow({ index, text }) {
  return (
    <View style={styles.recRow}>
      <View style={styles.recIndex}>
        <Text style={styles.recIndexText}>{index + 1}</Text>
      </View>
      <Text style={styles.recText}>{text}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CoachReviewScreen() {
  const { user } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState([]);
  const [volumeByMuscle, setVolumeByMuscle] = useState({});
  const [progressionWins, setProgressionWins] = useState([]);
  const [deloadResult, setDeloadResult] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [weekRange, setWeekRange] = useState({ start: null, end: null });
  const [laggingMuscles, setLaggingMuscles] = useState([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    if (!user?.id) {
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

      const [allWorkouts, allSets, allExercises, recentCheckins] = await Promise.all([
        getAllWorkouts(user.id),
        getCompletedWorkoutSets(user.id),
        getAllExercises(),
        getRecentCheckins(user.id, 4),
      ]);

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

      // Progressive overload wins
      const wins = detectProgressionWins(thisWeekSets, allSets, exerciseMap);
      setProgressionWins(wins);

      // Deload check, build last-4-weeks data from workouts
      const fourWeeksMs = 28 * 24 * 60 * 60 * 1000;
      const last4Workouts = allWorkouts
        .filter(w => w.isCompleted && (w.startedAt || 0) >= Date.now() - fourWeeksMs)
        .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));

      // Group into 4 weekly buckets for shouldDeload + lagging muscle detection
      const weeklyVolumeHistory = [];
      const weeklyBuckets = [0, 1, 2, 3].map(offset => {
        const bucketStart = weekStartMs - (3 - offset) * 7 * 24 * 60 * 60 * 1000;
        const bucketEnd = bucketStart + 7 * 24 * 60 * 60 * 1000;
        const workoutsInWeek = last4Workouts.filter(
          w => (w.startedAt || 0) >= bucketStart && (w.startedAt || 0) < bucketEnd,
        );

        const setsInWeek = allSets.filter(
          s => (s.createdAt || 0) >= bucketStart && (s.createdAt || 0) < bucketEnd,
        );
        const weekVolume = calculateWeeklyVolume(setsInWeek, exerciseMap);
        // Capture per-muscle working sets for lagging muscle detection
        const muscleSets = {};
        for (const [muscle, data] of Object.entries(weekVolume)) {
          muscleSets[muscle] = data.workingSets || 0;
        }
        weeklyVolumeHistory.push(muscleSets);
        const hasOverMRV = Object.entries(weekVolume).some(([muscle, data]) => {
          const landmarks = VOLUME_LANDMARKS[muscle];
          return landmarks && data.workingSets > landmarks.mrv;
        });

        const avgSoreness =
          workoutsInWeek.length > 0
            ? workoutsInWeek.reduce((s, w) => s + (w.soreness24hBefore || 0), 0) /
              workoutsInWeek.length
            : 0;
        const avgReps =
          setsInWeek.length > 0
            ? setsInWeek.reduce((s, set) => s + (set.actualReps || set.actual_reps || 0), 0) /
              setsInWeek.length
            : 0;
        const avgJointDiscomfort =
          workoutsInWeek.length > 0
            ? workoutsInWeek.reduce((s, w) => s + (w.jointDiscomfort || 0), 0) /
              workoutsInWeek.length
            : 0;

        return { avgSoreness, avgReps, hasOverMRV, avgJointDiscomfort, weeksSinceLastDeload: 99 };
      });

      const deload = shouldDeload(weeklyBuckets);
      setDeloadResult(deload);

      // Detect persistently under-trained muscle groups (3+ weeks below MEV)
      const lagging = detectLaggingMuscles(weeklyVolumeHistory, 3);
      setLaggingMuscles(lagging);

      setCheckins(recentCheckins);
    } catch (_e) {
      // U-B-6: distinguish a genuine read failure from an empty week. Show a
      // retryable error state instead of the false "no sessions" card (parity
      // with the Pro CoachOutput screen). Data is not lost — this is a read fault.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  // Derived display data
  const trainedMuscles = Object.entries(volumeByMuscle)
    .filter(([, data]) => data.workingSets > 0)
    .sort(([, a], [, b]) => b.workingSets - a.workingSets);

  const optimalMuscles = trainedMuscles.filter(([muscle, data]) => {
    const { status } = getVolumeStatus(data.workingSets, muscle);
    return status === 'optimal';
  });

  const watchMuscles = trainedMuscles.filter(([muscle, data]) => {
    const { status } = getVolumeStatus(data.workingSets, muscle);
    return status === 'over_mrv' || status === 'near_mrv' || status === 'below' || status === 'minimum';
  });

  const totalSets = trainedMuscles.reduce((sum, [, data]) => sum + data.workingSets, 0);

  const topMuscle = trainedMuscles.length > 0
    ? (MUSCLE_DISPLAY_NAMES[trainedMuscles[0][0]] || trainedMuscles[0][0])
    : null;

  const recommendations = buildRecommendations({
    volumeByMuscle,
    deloadResult,
    checkins,
    laggingMuscles,
  });

  // Joint discomfort flag from recent workouts
  const jointFlag = weeklyWorkouts.some(w => (w.jointDiscomfort || 0) >= 2);

  const dateLabel =
    weekRange.start && weekRange.end
      ? `${format(weekRange.start, 'd MMM')} – ${format(weekRange.end, 'd MMM yyyy')}`
      : '';

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
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
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Weekly review</Text>
          </View>
          <Card>
            <Text style={styles.emptyText}>
              Couldn&apos;t load your review just now. Your sessions are safe. This is a read
              problem, not a lost week.
            </Text>
            <Button
              title="Try again"
              fullWidth={false}
              style={{ marginTop: spacing.md }}
              onPress={() => { setLoadError(false); setLoading(true); loadData(); }}
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const hasData = weeklyWorkouts.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Weekly review</Text>
          {dateLabel ? <Text style={styles.headerDate}>{dateLabel}</Text> : null}
        </View>

        {/* ── No data state ── */}
        {!hasData && (
          <Card>
            <Text style={styles.emptyText}>
              No sessions logged this week yet. Start one from the home screen whenever it suits you.
            </Text>
          </Card>
        )}

        {hasData && (
          <>
            {/* ── Sessions this week ── */}
            <Card>
              <Text style={styles.cardTitle}>Sessions this week</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{weeklyWorkouts.length}</Text>
                  <Text style={styles.statLabel}>{weeklyWorkouts.length === 1 ? 'session' : 'sessions'}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{Math.round(totalSets)}</Text>
                  <Text style={styles.statLabel}>total sets</Text>
                </View>
                {topMuscle && (
                  <>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue} numberOfLines={1}>{topMuscle}</Text>
                      <Text style={styles.statLabel}>most trained</Text>
                    </View>
                  </>
                )}
              </View>
            </Card>

            {/* ── Volume status ── */}
            {trainedMuscles.length > 0 && (
              <View style={styles.section}>
                <SectionHeading title="Volume this week" />
                <Text style={styles.sectionSubtext}>
                  How much training each muscle group received, and whether it falls within a helpful range for growth.
                </Text>
                <Card style={styles.cardNoPad}>
                  {trainedMuscles.map(([muscle, data], i) => (
                    <View
                      key={muscle}
                      style={[
                        styles.volumeRowWrap,
                        i < trainedMuscles.length - 1 && styles.volumeRowBorder,
                      ]}
                    >
                      <VolumeRow muscle={muscle} data={data} />
                    </View>
                  ))}
                </Card>
              </View>
            )}

            {/* ── What went well ── */}
            <View style={styles.section}>
              <SectionHeading title="What went well" />
              {optimalMuscles.length === 0 && progressionWins.length === 0 ? (
                <Card>
                  <Text style={styles.emptySubText}>
                    Keep logging sessions and patterns will show up here.
                  </Text>
                </Card>
              ) : (
                <Card style={styles.insightCard}>
                  {optimalMuscles.map(([muscle]) => (
                    <InsightRow
                      key={muscle}
                      icon="checkmark-circle-outline"
                      iconColor={colors.success}
                      text={`${MUSCLE_DISPLAY_NAMES[muscle] || muscle} training is in a good range`}
                      subtext="Enough sets to drive progress without overdoing it."
                    />
                  ))}
                  {progressionWins.map((win, i) => (
                    <InsightRow
                      key={`win-${i}`}
                      icon="trending-up-outline"
                      iconColor={colors.primary}
                      text={`${win.exerciseName} · ${win.detail}`}
                      subtext="Consistent small improvements are the foundation of long-term progress."
                    />
                  ))}
                </Card>
              )}
            </View>

            {/* ── What to watch ── */}
            <View style={styles.section}>
              <SectionHeading title="What to watch" />
              {watchMuscles.length === 0 && !deloadResult?.deload && !jointFlag ? (
                <Card>
                  <Text style={styles.emptySubText}>
                    Nothing to flag this week, your training is looking nicely balanced.
                  </Text>
                </Card>
              ) : (
                <Card style={styles.insightCard}>
                  {watchMuscles.map(([muscle, data]) => {
                    const { status } = getVolumeStatus(data.workingSets, muscle);
                    const isOver = status === 'over_mrv';
                    const isNear = status === 'near_mrv';
                    const icon = isOver
                      ? 'arrow-up-circle-outline'
                      : isNear
                      ? 'alert-circle-outline'
                      : 'arrow-down-circle-outline';
                    const iconColor = isOver
                      ? colors.error
                      : isNear
                      ? colors.warning
                      : colors.textMuted;
                    const text = isOver
                      ? `${MUSCLE_DISPLAY_NAMES[muscle] || muscle} · more sets than you can comfortably recover from`
                      : isNear
                      ? `${MUSCLE_DISPLAY_NAMES[muscle] || muscle} · approaching the upper limit`
                      : `${MUSCLE_DISPLAY_NAMES[muscle] || muscle} · below the minimum for meaningful progress`;
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

                  {deloadResult?.deload && (
                    <InsightRow
                      icon="battery-half-outline"
                      iconColor={colors.warning}
                      text="Your recent training suggests a recovery week might help"
                      subtext="A lighter week every few weeks allows your nervous system and joints to reset, often leading to better performance afterwards."
                    />
                  )}

                  {jointFlag && (
                    <InsightRow
                      icon="medkit-outline"
                      iconColor={colors.error}
                      text="Joint discomfort noted during sessions this week"
                      subtext="Keep an eye on this. Prioritise movement quality over load, and consider swapping to a less demanding variation if it persists."
                    />
                  )}
                </Card>
              )}
            </View>

            {/* ── What to focus on next week ── */}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  // Header
  header: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.heavy,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  // Cards
  cardNoPad: {
    padding: 0,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
    fontWeight: fontWeight.heavy,
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
  sectionHeading: {
    ...type.label,
    color: colors.textSecondary,
  },
  sectionSubtext: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 17,
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
    borderRadius: 4,
  },
  volumeMuscleName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
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
    fontWeight: fontWeight.semibold,
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
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  insightSubtext: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 17,
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
    borderRadius: 11,
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.333),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  recIndexText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  recText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Empty states
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
