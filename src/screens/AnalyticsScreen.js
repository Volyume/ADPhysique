import { useRef, useEffect, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useScrollToTop } from '@react-navigation/native';
import { format } from 'date-fns/format';

import { colors, fontSize, fontWeight, spacing, radius, volumeColors, volumeStatusColor, type, circle } from '../styles/theme';
import Card from '../components/Card';
import SectionLabel from '../components/SectionLabel';
import RollingNumber from '../components/RollingNumber';
import ScreenHeader from '../components/ScreenHeader';
import { SkeletonCard } from '../components/Skeleton';
import AnimatedEntrance from '../components/AnimatedEntrance';
import VolyumeChart from '../components/VolyumeChart';
import { ProBadge } from '../components/ProGate';
import EmptyState from '../components/EmptyState';
import InfoTooltip from '../components/InfoTooltip';
import CardioPlanCard from '../components/CardioPlanCard';
import useAppStore from '../store/useAppStore';
import useProgressData from '../hooks/useProgressData';
import useWeightTrend from '../hooks/useWeightTrend';
import WeightTrendCard from '../components/WeightTrendCard';
import useWeeklyStreak from '../hooks/useWeeklyStreak';
import WeeklyStreakStrip from '../components/WeeklyStreakStrip';
import { markMilestoneSeen, markPerfectMonthSeen, markLongestRunPbSeen } from '../lib/streakState';
import { getLifetimeTonnage } from '../lib/database';
import { pendingTonnageMilestone, loadSeenTonnage, markTonnageMilestoneSeen, formatTonnage } from '../lib/tonnageMilestone';
import { formatNumber } from '../lib/format';
import { track } from '../lib/engineTelemetry';
import { trackPartnerSurfaceView } from '../lib/partners/telemetry';
import { VOLUME_LANDMARKS, getVolumeStatus } from '../lib/algorithms';
import { buildWeeklyLoadSeries, buildWeeklySessionCounts } from '../lib/progressSeries';

// COMP-018 milestone copy (§4.6.8). Weeks of showing up against your own plan,
// no comparison, no rank. Founder copy review at PR.
const STREAK_MILESTONE_COPY = {
  4: '4 weeks of showing up.',
  12: '12 weeks of showing up. That\'s a habit.',
  26: 'Half a year of showing up.',
  52: 'A year of showing up. Few do that.',
};

// Severity → icon + color mapping (jargon-free UI)
const SEVERITY_STYLE = {
  0: { icon: 'information-circle-outline', color: colors.primary },
  1: { icon: 'alert-circle-outline',       color: colors.warning },
  2: { icon: 'warning-outline',            color: colors.error },
};

// COMP-005: which monthly recap the Recaps tile / ephemeral card opens. The last
// completed calendar month when the user was training before this month began;
// otherwise the current month-to-date (so a just-unlocked user in their first
// month sees "June so far" rather than an empty last month). Local time, like
// the app's week rule. Returns RecapStory route params.
function recentMonthRecapParams(earliestWorkoutAt) {
  const now = new Date();
  const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  if (earliestWorkoutAt != null && earliestWorkoutAt < curMonthStart) {
    return {
      variant: 'month',
      startMs: prevMonthStart,
      endMs: curMonthStart,
      monthLabel: format(new Date(prevMonthStart), 'MMMM'),
    };
  }
  return {
    variant: 'month',
    startMs: curMonthStart,
    endMs: startOfTomorrow,
    monthLabel: `${format(new Date(curMonthStart), 'MMMM')} so far`,
  };
}

export default function AnalyticsScreen({ navigation, route }) {
  const user = useAppStore(s => s.user);
  const userProfile = useAppStore(s => s.userProfile);
  const tier = useAppStore(s => s.tier);
  const bodyWeightUnits = useAppStore(s => s.bodyWeightUnits);
  const units = useAppStore(s => s.units);

  // COMP-004 "Your trend": Pro-only weight-trend read (morning weighing is a
  // Pro feature, so the card never appears for free users). The hook always
  // runs (hooks are unconditional); the card self-hides until there is data.
  const weightTrend = useWeightTrend(tier === 'pro' ? user?.id : null);

  // COMP-018 "This week": training consistency is a free feature, so it runs
  // for all tiers. Self-hides until the first session; suppressed under an
  // open ED/wellbeing flag.
  const weeklyStreak = useWeeklyStreak(user?.id, userProfile?.scoffScore);

  // COMP-018 milestone: when the run crosses 4/12/26/52, the strip shows a
  // one-line celebration this view, then marks it seen so it fires once (next
  // focus reload returns null). In-app only, no push, no confetti.
  const pendingMilestone = weeklyStreak.pendingMilestone;
  const streakRenders = weeklyStreak.render;
  useEffect(() => {
    // Only consume + fire when the strip actually renders, so a milestone is
    // never marked seen on a view the user couldn't see it on.
    if (pendingMilestone && streakRenders && user?.id) {
      markMilestoneSeen(user.id, pendingMilestone).catch(() => {});
      try { track(user.id, 'streak_milestone_reached', { milestone: pendingMilestone })?.catch?.(() => {}); } catch (_) {}
    }
  }, [pendingMilestone, streakRenders, user?.id]);

  // Landmark telemetry fires once per landmark per app run (a render-time event,
  // deduped here); the "seen" record is written only when the user actually taps
  // "Create share image", so a share CTA never vanishes before it can be used.
  const firedLandmarks = useRef(new Set());
  function fireLandmarkOnce(key, userId, event, payload) {
    if (!userId || firedLandmarks.current.has(key)) return;
    firedLandmarks.current.add(key);
    try { track(userId, event, payload)?.catch?.(() => {}); } catch (_) {}
  }

  // Phase-2 landmark: a perfect month (4 weeks all on target). Keyed off the
  // month's last week, in-app only, never under ED/calm suppression (the hook
  // already returns null then).
  const perfectMonth = weeklyStreak.pendingPerfectMonth;
  useEffect(() => {
    if (perfectMonth && streakRenders && user?.id) {
      fireLandmarkOnce(`pm:${perfectMonth.lastWeekKey}`, user.id, 'perfect_month_reached', { sessions: perfectMonth.sessions });
    }
  }, [perfectMonth, streakRenders, user?.id]);

  // S2c landmark: a new longest-run personal best. Same pattern as the perfect
  // month: telemetry fires once per PB value per app run (counts only, never a
  // body value); the "seen" record is written only when the user taps Make a
  // card, so the CTA never vanishes before it can be used. Absent under ED /
  // SCOFF / calm (the hook returns null then).
  const longestRunPb = weeklyStreak.longestRunPb;
  useEffect(() => {
    if (longestRunPb && streakRenders && user?.id) {
      fireLandmarkOnce(`pb:${longestRunPb}`, user.id, 'longest_run_pb_reached', { weeks: longestRunPb });
    }
  }, [longestRunPb, streakRenders, user?.id]);

  function makeStreakCard(m) {
    navigation.navigate('ShareCard', {
      milestoneData: {
        eyebrow: 'Weeks running',
        heroValue: String(m),
        heroUnit: m === 1 ? 'week' : 'weeks',
        title: STREAK_MILESTONE_COPY[m] || `${m} weeks of showing up.`,
        caption: '',
        stats: [],
      },
    });
  }

  function makeLongestRunPbCard() {
    if (!longestRunPb) return;
    if (user?.id) markLongestRunPbSeen(user.id, longestRunPb).catch(() => {});
    navigation.navigate('ShareCard', {
      milestoneData: {
        eyebrow: 'Longest run',
        title: 'A new personal best.',
        heroValue: String(longestRunPb),
        heroUnit: longestRunPb === 1 ? 'week' : 'weeks',
        caption: 'Your longest run of weeks yet. It carries on.',
        date: Date.now(),
        stats: [],
      },
    });
  }

  function makePerfectMonthCard() {
    if (!perfectMonth) return;
    if (user?.id) markPerfectMonthSeen(user.id, perfectMonth.lastWeekKey).catch(() => {});
    navigation.navigate('ShareCard', {
      milestoneData: {
        eyebrow: 'Month complete',
        title: 'Textbook Month',
        heroValue: String(perfectMonth.weeks),
        heroUnit: 'weeks on target',
        caption: `${perfectMonth.sessions} sessions over four weeks, every target met.`,
        date: Date.now(),
        stats: [
          { label: 'Weeks', value: String(perfectMonth.weeks) },
          { label: 'Sessions', value: String(perfectMonth.sessions) },
        ],
      },
    });
  }

  // Phase-2 landmark: lifetime tonnage (total weight lifted all-time). A pure
  // training-volume win, so it is never ED-gated. Re-checked whenever the
  // completed-workout count changes; fires once per threshold.
  const [tonnageLandmark, setTonnageLandmark] = useState(null);
  // R3 lifetime-stats panel: the all-time tonnage total (not just a pending
  // milestone threshold). Read from the same getLifetimeTonnage query as the
  // landmark below, so the panel and the share card never disagree.
  const [lifetimeTonnage, setLifetimeTonnage] = useState(null);

  function makeTonnageCard() {
    if (!tonnageLandmark) return;
    if (user?.id) markTonnageMilestoneSeen(user.id, tonnageLandmark).catch(() => {});
    const u = units === 'lbs' ? 'lbs' : 'kg';
    navigation.navigate('ShareCard', {
      milestoneData: {
        eyebrow: 'Lifetime total',
        title: 'Total weight lifted',
        heroValue: formatTonnage(tonnageLandmark),
        heroUnit: `${u} lifted`,
        caption: 'Every working set you have ever logged, added up.',
        date: Date.now(),
        stats: [],
      },
    });
  }

  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  useEffect(() => {
    return navigation.getParent()?.addListener('tabPress', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, [navigation]);

  // COMP-004 door: arriving from the Home TodayStrip weight cell scrolls the
  // "Your trend" section into view (once the card has rendered), then clears
  // the param so a normal re-focus does not re-scroll. Programmatic navigation
  // does not fire 'tabPress', so this never fights the scroll-to-top above.
  const trendSectionY = useRef(0);
  useEffect(() => {
    if (!route?.params?.focusWeightTrend || !weightTrend.render) return undefined;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, trendSectionY.current - 12), animated: true });
    }, 350);
    navigation.setParams({ focusWeightTrend: undefined });
    return () => clearTimeout(t);
  }, [route?.params?.focusWeightTrend, weightTrend.render, navigation]);

  const {
    loading, refreshing,
    insights, weeklyVolume, prBars,
    recentSessions, allSets, exerciseMap, earliestWorkoutAt, completedWorkoutCount,
    hasData, enoughForTrends,
    handleDismiss, handleRefresh,
  } = useProgressData();

  // A5 dashboard series (design audit 03's elite description for this
  // screen). All derived from the already-loaded data via memoised pure
  // builders (progressSeries caps every window), so nothing recomputes per
  // render (F7) and no new queries run.
  const exerciseTypeById = useMemo(
    () => Object.fromEntries(
      Object.entries(exerciseMap).map(([id, e]) => [id, e.exerciseType ?? e.exercise_type ?? 'weight_reps']),
    ),
    [exerciseMap],
  );
  const weeklyLoad = useMemo(
    () => buildWeeklyLoadSeries(allSets, { exerciseTypeById }),
    [allSets, exerciseTypeById],
  );

  // S4 (world-class audit 04a): share image extended to training load. A
  // pure training-volume read (kg lifted), never ED-gated (same reasoning as
  // makeTonnageCard above) and never a comparison to anyone else, just this
  // week's number against the plain average of the weeks already on screen.
  function makeTrainingLoadCard() {
    if (!weeklyLoad || weeklyLoad.length < 2) return;
    const u = units === 'lbs' ? 'lbs' : 'kg';
    const latest = weeklyLoad[weeklyLoad.length - 1]?.value || 0;
    const avg = Math.round(weeklyLoad.reduce((t, p) => t + p.value, 0) / weeklyLoad.length);
    navigation.navigate('ShareCard', {
      milestoneData: {
        eyebrow: 'Training load',
        title: 'Your training load',
        heroValue: Math.round(latest).toLocaleString('en-GB'),
        heroUnit: `${u} lifted, this week`,
        caption: `Averaging ${avg.toLocaleString('en-GB')} ${u} a week over the last ${weeklyLoad.length} weeks.`,
        date: Date.now(),
        stats: [],
      },
    });
  }

  const sessionSpark = useMemo(() => {
    const { bins, total } = buildWeeklySessionCounts(allSets);
    return {
      total,
      bars: bins.map((v, i) => ({
        value: v,
        color: v > 0 ? (i === bins.length - 1 ? colors.primary : colors.primaryDim) : colors.surface3,
      })),
    };
  }, [allSets]);
  const prSpark = useMemo(() => ({
    total: prBars.reduce((s, b) => s + b.value, 0),
    bars: prBars.map(b => ({ value: b.value, color: b.value > 0 ? colors.gold : colors.surface3 })),
  }), [prBars]);

  // R3 lifetime-stats panel: total reps performed across every working set
  // ever logged. Derived from the already-loaded set list (no new query),
  // using the same filter as getLifetimeTonnage, warmups excluded, only
  // sets with a positive weight and reps, so reps and tonnage describe the
  // same body of work.
  const lifetimeReps = useMemo(() => {
    let total = 0;
    for (const s of allSets) {
      if (s.setType === 'warmup') continue;
      const reps = s.actualReps ?? s.actual_reps ?? 0;
      const weight = s.weight ?? 0;
      if (reps > 0 && weight > 0) total += reps;
    }
    return total;
  }, [allSets]);

  // COMP-005: ephemeral recap card, for the first 7 days of the month, once
  // the user has unlocked recaps, a one-line nudge at the top of the insight
  // stack. Dismissable; gone after first open or day 7 (per-month key).
  const [recapCardHidden, setRecapCardHidden] = useState(true);
  const recapMonthKey = format(new Date(), 'yyyy-MM');
  useEffect(() => {
    if (new Date().getDate() > 7 || completedWorkoutCount < 10) { setRecapCardHidden(true); return; }
    AsyncStorage.getItem(`@volyume_recap_card_${recapMonthKey}`)
      .then(v => setRecapCardHidden(v === 'dismissed'))
      .catch(() => setRecapCardHidden(false));
  }, [completedWorkoutCount, recapMonthKey]);
  const dismissRecapCard = () => {
    setRecapCardHidden(true);
    AsyncStorage.setItem(`@volyume_recap_card_${recapMonthKey}`, 'dismissed').catch(() => {});
  };

  // Re-check the lifetime-tonnage landmark whenever the workout count changes
  // (tonnage only grows when a session is logged). The CTA persists until the
  // user taps the share-image CTA (markTonnageMilestoneSeen on tap), so it never
  // vanishes before it can be used; telemetry fires once per app run.
  useEffect(() => {
    let cancelled = false;
    if (!user?.id || completedWorkoutCount < 1) { setTonnageLandmark(null); setLifetimeTonnage(null); return undefined; }
    (async () => {
      try {
        const [tonnage, seen] = await Promise.all([getLifetimeTonnage(user.id), loadSeenTonnage(user.id)]);
        const pending = pendingTonnageMilestone(tonnage, seen);
        if (cancelled) return;
        setLifetimeTonnage(tonnage);
        setTonnageLandmark(pending);
        if (pending) fireLandmarkOnce(`tn:${pending}`, user.id, 'tonnage_milestone_reached', { milestone: pending });
      } catch (_) { if (!cancelled) { setTonnageLandmark(null); setLifetimeTonnage(null); } }
    })();
    return () => { cancelled = true; };
  }, [user?.id, completedWorkoutCount]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Header ────────────────────────────────────────── */}
        <ScreenHeader title="Progress" />

        {/* ── A5 dashboard opener (design audit 03): one large owned
            visual, the weekly training-load hero with this week
            highlighted and a display-size numeral, then sessions and
            new-bests as two half-width sparkline cards. Free-safe training
            data only (tonnage, sessions, PRs); weight stays on its
            existing Pro trend card further down. Held back until there
            are enough sessions for the trend to be honest. ── */}
        {loading && (
          <View style={styles.section}>
            <SkeletonCard height={176} />
            <View style={styles.sparkRow}>
              <SkeletonCard height={116} style={styles.sparkCard} />
              <SkeletonCard height={116} style={styles.sparkCard} />
            </View>
          </View>
        )}
        {!loading && enoughForTrends && (
          <AnimatedEntrance>
            <View style={styles.section}>
              <TrainingLoadHero series={weeklyLoad} units={units} onMakeCard={makeTrainingLoadCard} />
              <View style={styles.sparkRow}>
                <SparkCard
                  label="Sessions"
                  value={sessionSpark.total}
                  sub="Last 30 days"
                  bars={sessionSpark.bars}
                  onPress={() => navigation.navigate('Consistency')}
                  accessibilityLabel={`Sessions. ${sessionSpark.total} in the last 30 days. Opens consistency.`}
                />
                <SparkCard
                  label="New bests"
                  value={prSpark.total}
                  sub="Last 30 days"
                  bars={prSpark.bars}
                  onPress={() => navigation.navigate('LiftProgress')}
                  accessibilityLabel={`New personal bests. ${prSpark.total} in the last 30 days. Opens lifts.`}
                />
              </View>
            </View>
          </AnimatedEntrance>
        )}

        {/* ── This week (COMP-018): the one-glance answer to "am I on
            track?", sessions this week and the run state, directly under
            the training-load hero. Free for all tiers; self-hides for a
            brand-new user and under an open wellbeing flag. ── */}
        {weeklyStreak.render && (
          <View style={styles.section}>
            <WeeklyStreakStrip vm={weeklyStreak} />
            {pendingMilestone ? (
              <View style={styles.milestoneRow}>
                <Ionicons name="ribbon-outline" size={16} color={colors.primary} />
                <Text style={styles.milestoneText}>{STREAK_MILESTONE_COPY[pendingMilestone]}</Text>
                {pendingMilestone >= 12 ? (
                  <TouchableOpacity
                    style={styles.milestoneCtaButton}
                    onPress={() => makeStreakCard(pendingMilestone)}
                    accessibilityRole="button"
                    accessibilityLabel="Create share image"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.milestoneCta}>Create share image</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
            {perfectMonth ? (
              <View style={styles.milestoneRow}>
                <Ionicons name="ribbon-outline" size={16} color={colors.primary} />
                <Text style={styles.milestoneText}>A perfect month. Four weeks, every target met.</Text>
                <TouchableOpacity
                  style={styles.milestoneCtaButton}
                  onPress={makePerfectMonthCard}
                  accessibilityRole="button"
                  accessibilityLabel="Create share image"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.milestoneCta}>Create share image</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {longestRunPb ? (
              <View style={styles.milestoneRow}>
                <Ionicons name="ribbon-outline" size={16} color={colors.primary} />
                <Text style={styles.milestoneText}>
                  {`A new personal best. ${longestRunPb} ${longestRunPb === 1 ? 'week' : 'weeks'} running, your longest yet.`}
                </Text>
                <TouchableOpacity
                  style={styles.milestoneCtaButton}
                  onPress={makeLongestRunPbCard}
                  accessibilityRole="button"
                  accessibilityLabel="Create share image"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.milestoneCta}>Create share image</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        {/* Phase-2 lifetime-tonnage landmark, independent of the streak strip.
            T9 (world-class audit 2026-07-03, identity-copy sweep): matches the
            "showing up" identity register the streak-milestone copy above
            already uses, rather than a bare number with a generic label. */}
        {tonnageLandmark ? (
          <View style={styles.section}>
            <View style={styles.milestoneRow}>
              <Ionicons name="barbell-outline" size={16} color={colors.primary} />
              <Text style={styles.milestoneText}>
                {formatTonnage(tonnageLandmark)} {units === 'lbs' ? 'lbs' : 'kg'} lifted all-time. That's what showing up adds up to.
              </Text>
              <TouchableOpacity
                style={styles.milestoneCtaButton}
                onPress={makeTonnageCard}
                accessibilityRole="button"
                accessibilityLabel="Create share image"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.milestoneCta}>Create share image</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Skeleton placeholders during the initial cold-load, in the same
            layout slots the loaded content fills (insight rows, recent
            sessions, the volume summary) so the dashboard doesn't pop in
            with a layout shift once the SQLite reads finish. Mirrors the
            HomeScreen cold-load pattern. */}
        {loading && (
          <View style={styles.section}>
            <SkeletonCard height={64} />
            <SkeletonCard height={64} />
            <SkeletonCard height={92} />
          </View>
        )}

        {/* ── Empty state (U-D-4: encouragement-framed, matching BodyMetrics) ── */}
        {!loading && allSets.length === 0 && (
          <EmptyState
            icon="analytics-outline"
            title="No training trends yet"
            text="Training charts appear here once sessions are logged. Body metrics, progress photos and scans are still available below."
          />
        )}

        {/* ── Near-empty (U-D-4): a session or two in, frame it as momentum ── */}
        {!loading && allSets.length > 0 && completedWorkoutCount > 0 && completedWorkoutCount < 3 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateBody}>
              Good start. A couple more sessions and your trends really take shape.
            </Text>
          </View>
        )}

        {/* COMP-005: ephemeral recap nudge */}
        {!recapCardHidden && (
          <TouchableOpacity
            style={styles.recapCard}
            activeOpacity={0.85}
            onPress={() => { dismissRecapCard(); navigation.navigate('RecapStory', recentMonthRecapParams(earliestWorkoutAt)); }}
            accessibilityRole="button"
            accessibilityLabel="Open your monthly recap, about 45 seconds"
          >
            <Ionicons name="sparkles" size={18} color={colors.primary} />
            <Text style={styles.recapCardText}>
              Your {recentMonthRecapParams(earliestWorkoutAt).monthLabel.replace(' so far', '')} recap is ready - 45 seconds
            </Text>
            <TouchableOpacity
              onPress={dismissRecapCard}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
            >
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* ── 2 · Insight Stack ─────────────────────────────── */}
        {insights.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>For you</SectionLabel>
            {insights.map(ins => (
              <InsightRow key={ins.id} insight={ins} onDismiss={() => handleDismiss(ins.id)} />
            ))}
          </View>
        )}

        {/* ── Partners (spec B8): promoted from the Explore grid to directly
            after the insight stack. A NavTile in a full-width row so it reads
            as a proper destination, not a buried grid cell. Keeps the Pro
            lock; label only (NavTile shows no sub-line outside the locked
            countdown state, so no component surgery). ── */}
        <View style={styles.section}>
          <View style={styles.navGrid}>
            <NavTile
              icon="people"
              color={colors.primary}
              label="Partners"
              pro={tier !== 'pro'}
              onPress={() => {
                trackPartnerSurfaceView('progress_tile');
                navigation.navigate('Partner', { source: 'progress_tile' });
              }}
            />
            {/* Progress photos promoted to a front-and-central Progress
                destination (founder device-walk 2026-07-03: it was buried in
                Body Metrics and effectively undiscoverable). Same promoted
                treatment and Pro lock as Partners; the screen's own
                withReadOnlyProGuard still governs view-only lapse access. */}
            <NavTile
              icon="camera"
              color={colors.primary}
              label="Progress photos"
              pro={tier !== 'pro'}
              onPress={() => navigation.navigate('ProgressPhotos')}
            />
          </View>
        </View>

        {/* ── Your trend (COMP-004): the calm weight-trend read, between the
            insight stack and recent sessions. Pro-only; self-hides until
            there are morning weights to interpret. ── */}
        {tier === 'pro' && weightTrend.render && (
          <View
            style={styles.section}
            onLayout={(e) => { trendSectionY.current = e.nativeEvent.layout.y; }}
          >
            <WeightTrendCard vm={weightTrend} bodyWeightUnits={bodyWeightUnits || 'st'} />
          </View>
        )}

        {/* ── Recent sessions: what you actually did, kept high up (above the
            analytical charts) so it is the first concrete thing you see. ── */}
        {recentSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <SectionLabel>Recent sessions</SectionLabel>
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={() => navigation.navigate('WorkoutHistory')}
                accessibilityRole="button"
                accessibilityLabel="See all sessions"
              >
                <Ionicons name="list-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.seeAll}>All sessions</Text>
              </TouchableOpacity>
            </View>
            {recentSessions.map(w => (
              <SessionCard key={w.id} workout={w} />
            ))}
          </View>
        )}

        {/* ── 3 · Volume summary, drills into the heatmap (the one volume home) ── */}
        {hasData && (
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <SectionLabel>This week's volume</SectionLabel>
            <InfoTooltip text={
              'Working sets per muscle this week, measured against your targets.\n\n' +
              'Tap to see every muscle on the heatmap.'
            } />
          </View>
          <VolumeSummaryStrip
            volume={weeklyVolume}
            loading={loading}
            onPress={() => navigation.navigate('VolumeHeatmap')}
          />
        </View>
        )}

        {/* ── Cardio this week (Pro, available not allocated). Moved here from
            Plans: it is a tracking surface. ── */}
        {tier === 'pro' && user?.id && userProfile?.cardioEnabled !== false && (
          <View style={styles.section}>
            <CardioPlanCard
              userId={user.id}
              target={userProfile?.cardioTarget}
              onPress={() => navigation.navigate('LogCardio')}
              onHistory={() => navigation.navigate('CardioHistory')}
            />
          </View>
        )}

        {/* The old full-width "New personal bests" sparkline section moved
            into the half-width New bests card at the top of the dashboard
            (A5); the detail per lift lives on LiftProgress, which that card
            opens. */}

        {/* ── Lifetime totals (R3): a standing read-only panel of all-time
            numbers, sessions, total weight lifted, total reps. No
            comparison, no rank; just your own running totals. Self-hides
            until there is something logged. ── */}
        {hasData && completedWorkoutCount > 0 && (
          <View style={styles.section}>
            <SectionLabel>Lifetime totals</SectionLabel>
            <Card radius="md" padding="none" style={styles.lifetimePanel}>
              <View style={styles.lifetimeCell}>
                <Text style={styles.lifetimeValue}>{formatNumber(completedWorkoutCount)}</Text>
                <Text style={styles.lifetimeLabel}>
                  {completedWorkoutCount === 1 ? 'session' : 'sessions'}
                </Text>
              </View>
              <View style={styles.lifetimeDivider} />
              <View style={styles.lifetimeCell}>
                <Text style={styles.lifetimeValue}>
                  {formatNumber(lifetimeTonnage)}
                </Text>
                <Text style={styles.lifetimeLabel}>{units === 'lbs' ? 'lbs lifted' : 'kg lifted'}</Text>
              </View>
              <View style={styles.lifetimeDivider} />
              <View style={styles.lifetimeCell}>
                <Text style={styles.lifetimeValue}>{formatNumber(lifetimeReps)}</Text>
                <Text style={styles.lifetimeLabel}>
                  {lifetimeReps === 1 ? 'rep' : 'reps'}
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* ── Quick nav tiles ────────────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel>Explore</SectionLabel>
          <View style={styles.navGrid}>
            <NavTile icon="pulse" color={colors.success} label="Consistency" onPress={() => navigation.navigate('Consistency')} />
            <NavTile icon="barbell" color={colors.primary} label="Lifts" onPress={() => navigation.navigate('LiftProgress')} />
            {/* Body Metrics carries the weight EWMA trend once 2+ logs exist,
                but it is a metrics screen, so the tile says what it opens
                (founder device-walk 2026-06-12: a "Weight" tile promised a
                progress chart and landed on a logging form). The IA pass will
                lead that screen with the trend; the label stops over-promising
                now. */}
            <NavTile icon="body" color={colors.warning} label="Body Metrics" pro={tier !== 'pro'} onPress={() => navigation.navigate('BodyMetrics')} />
            {/* Partners moved out of the grid to a promoted slot directly under
                the insight stack (spec B8). */}
            <NavTile icon="time" color={colors.textSecondary} label="Full History" onPress={() => navigation.navigate('WorkoutHistory')} />
            {(() => {
              // COMP-005: Recaps replaces the year-long locked Year-of-Lifts
              // tile. It unlocks after 10 logged sessions (~a fortnight, not a
              // year) and opens the most recent monthly recap. Year of Lifts
              // stays the annual crown but only appears once it has unlocked,
              // so it is never shown dimmed for a year.
              const RECAP_GATE = 10;
              const recapUnlocked = completedWorkoutCount >= RECAP_GATE;
              const toGo = Math.max(0, RECAP_GATE - completedWorkoutCount);
              return (
                <NavTile
                  icon="sparkles-outline"
                  color={colors.textSecondary}
                  label="Recaps"
                  locked={!recapUnlocked}
                  lockedSub={`${toGo} session${toGo === 1 ? '' : 's'} to go`}
                  onPress={() => {
                    if (!recapUnlocked) {
                      appAlert(
                        'Recaps',
                        `Your first monthly recap is ready after ${RECAP_GATE} logged sessions. ${toGo} to go.`,
                      );
                      return;
                    }
                    navigation.navigate('RecapStory', recentMonthRecapParams(earliestWorkoutAt));
                  }}
                />
              );
            })()}
            {(() => {
              // Year of Lifts: the annual crown, shown only once unlocked.
              const YEAR_MS = 365 * 86400000;
              const unlocked = earliestWorkoutAt && (Date.now() - earliestWorkoutAt) >= YEAR_MS;
              if (!unlocked) return null;
              return (
                <NavTile
                  icon="calendar-outline"
                  color={colors.textSecondary}
                  label="Year of Lifts"
                  onPress={() => navigation.navigate('YearOfLifts')}
                />
              );
            })()}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InsightRow({ insight, onDismiss }) {
  const sev = SEVERITY_STYLE[insight.severity ?? 0] ?? SEVERITY_STYLE[0];
  return (
    <Card padding="md" radius="md" style={[styles.insightRow, { borderLeftColor: sev.color }]}>
      <Ionicons name={sev.icon} size={18} color={sev.color} style={{ marginTop: spacing.hair }} />
      <Text style={styles.insightCopy} numberOfLines={5}>{insight.copy}</Text>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.insightDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss insight"
      >
        <Ionicons name="close" size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </Card>
  );
}

const MUSCLES = Object.keys(VOLUME_LANDMARKS);

// Compact landing read for weekly volume. The full per-muscle picture lives on
// the heatmap (the one volume home); this is a glanceable summary that drills
// in: how many muscles were trained, how many sit outside their target, and
// (A5) an inline stacked bar, one segment per trained muscle, sized by its
// working sets and coloured through the volumeStatusColor grammar, so the
// week's volume shape is visible without leaving the dashboard.
function VolumeSummaryStrip({ volume, loading, onPress }) {
  const trained = MUSCLES.filter(m => (volume[m]?.workingSets ?? 0) > 0);
  if (trained.length === 0) {
    // Don't flash "Nothing logged" while the underlying data is still
    // resolving; only show the empty state once the load has finished.
    if (loading) return null;
    return (
      <Card
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="This week's volume. Open the heatmap."
      >
        <Text style={styles.volEmptyText}>Nothing logged this week yet.</Text>
      </Card>
    );
  }
  let below = 0;
  let over = 0;
  for (const m of trained) {
    const ws = volume[m]?.workingSets ?? 0;
    const lm = VOLUME_LANDMARKS[m];
    if (!lm) continue;
    if (ws < lm.mev) below += 1;
    else if (ws > lm.mrv) over += 1;
  }
  const flags = [];
  if (below > 0) flags.push({ key: 'below', n: below, label: 'below target', color: volumeColors.below });
  if (over > 0) flags.push({ key: 'over', n: over, label: 'over max', color: volumeColors.overMrv });
  // A5 inline stacked bar: one segment per trained muscle, widest first,
  // width proportional to its working sets, coloured by its volume status.
  const segments = trained
    .map(m => {
      const ws = volume[m]?.workingSets ?? 0;
      return { muscle: m, sets: ws, color: volumeStatusColor(getVolumeStatus(ws, m).status) };
    })
    .sort((a, b) => b.sets - a.sets);
  return (
    <Card
      style={styles.volSummary}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="This week's volume by muscle. Open the heatmap."
    >
      <View style={styles.volSummaryTop}>
        <View style={styles.volSummaryMain}>
          <Text style={styles.volSummaryCount}>{trained.length}</Text>
          <Text style={styles.volSummaryLabel}>
            {trained.length === 1 ? 'muscle trained' : 'muscles trained'}
          </Text>
        </View>
        <View style={styles.volSummaryFlags}>
          {flags.length === 0 ? (
            <Text style={styles.volSummaryClear}>All in range</Text>
          ) : flags.map(f => (
            <View key={f.key} style={styles.volLegendItem}>
              <View style={[styles.volLegendDot, { backgroundColor: f.color }]} />
              <Text style={styles.volSummaryFlagText}>{f.n} {f.label}</Text>
            </View>
          ))}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
      <View style={styles.volStackBar}>
        {segments.map(seg => (
          <View
            key={seg.muscle}
            style={[styles.volStackSegment, { flex: Math.max(seg.sets, 0.5), backgroundColor: seg.color }]}
          />
        ))}
      </View>
    </Card>
  );
}

// A5 hero: the dashboard opens on weekly training load (tonnage) over the
// last 8 rolling weeks, drawn with the app's one chart engine (VolyumeChart's
// bar variant, scrub haptics already no-op under Reduce Motion). The
// display-size numeral reads the week under the finger while scrubbing and
// the current week otherwise. Scrub state lives here so a scrub re-renders
// this card only, never the whole screen (F7).
function TrainingLoadHero({ series, units, onMakeCard }) {
  const [chartW, setChartW] = useState(0);
  const [scrubIdx, setScrubIdx] = useState(null);
  const lastIdx = series.length - 1;
  const bars = useMemo(
    () => series.map((pt, i) => ({
      value: pt.value,
      color: i === lastIdx ? colors.primary : colors.primaryDim,
    })),
    [series, lastIdx],
  );
  if (series.length < 2) return null;
  const activeIdx = scrubIdx != null && scrubIdx >= 0 && scrubIdx < series.length ? scrubIdx : lastIdx;
  const active = series[activeIdx];
  const weekLabel = active.weeksAgo === 0
    ? 'This week'
    : active.weeksAgo === 1 ? 'Last week' : `${active.weeksAgo} weeks ago`;
  const unit = units === 'lbs' ? 'lbs' : 'kg';
  return (
    <Card accessibilityLabel={`Training load. ${weekLabel}: ${formatNumber(active.value)} ${unit} lifted.`}>
      <Text style={styles.heroEyebrow}>Training load</Text>
      <View style={styles.heroValueRow}>
        <RollingNumber
          value={active.value}
          style={styles.heroValue}
          accessibilityLabel={`${formatNumber(active.value)} ${unit}`}
        />
        <Text style={styles.heroUnit}>{unit}</Text>
      </View>
      <Text style={styles.heroSub}>{weekLabel} - weight lifted</Text>
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
            accessibilityLabel={`Weekly training load, last ${series.length} weeks. This week highlighted.`}
          />
        )}
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.heroAxisLabel}>{series.length - 1} weeks ago</Text>
        <Text style={styles.heroAxisLabel}>this week</Text>
      </View>
      {/* S4: share image extended to training load, reflective and factual,
          never a comparison to anyone else. */}
      <TouchableOpacity
        style={[styles.trainingLoadCtaRow, styles.milestoneCtaButton]}
        onPress={onMakeCard}
        accessibilityRole="button"
        accessibilityLabel="Create share image"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.milestoneCta}>Create share image</Text>
      </TouchableOpacity>
    </Card>
  );
}

// A5 half-width sparkline card: a headline numeral over a compact 30-day
// weekly series, doubling as the door to its detail screen. Free-safe
// training data only (sessions, PRs), never weight or calories.
function SparkCard({ label, value, sub, bars, onPress, accessibilityLabel }) {
  const [chartW, setChartW] = useState(0);
  return (
    <Card
      style={styles.sparkCard}
      padding="md"
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.sparkLabel}>{label}</Text>
      <Text style={styles.sparkValue}>{formatNumber(value)}</Text>
      <View
        style={styles.sparkChartSlot}
        onLayout={e => setChartW(Math.round(e.nativeEvent.layout.width))}
      >
        {chartW > 0 && (
          <VolyumeChart
            variant="bar"
            data={bars}
            width={chartW}
            height={32}
            barGap={spacing.xxs}
          />
        )}
      </View>
      <Text style={styles.sparkSub}>{sub}</Text>
    </Card>
  );
}

function SessionCard({ workout }) {
  const name = workout.name || 'Session';
  const at = workout.startedAt ?? workout.createdAt ?? workout.created_at ?? 0;
  const diff = workout.sessionDifficulty ?? null;
  return (
    <Card radius="md" style={styles.sessionCard}>
      <View style={styles.sessionLeft}>
        <Text style={styles.sessionName} numberOfLines={1}>{name}</Text>
        <Text style={styles.sessionMeta}>
          {at ? format(new Date(at), 'EEE d MMM') : ''}
          {workout.durationMinutes ? ` - ${workout.durationMinutes}m` : ''}
        </Text>
      </View>
      {diff != null && (
        <View style={[styles.diffChip, { backgroundColor: diffChipBg(diff) }]}>
          <Text style={[styles.diffText, { color: diffChipColor(diff) }]}>
            {diff}/10
          </Text>
        </View>
      )}
    </Card>
  );
}

function NavTile({ icon, color, label, onPress, locked, lockedSub, pro }) {
  // `locked` = not-enough-data-yet (the Recaps countdown pattern): dimmed
  // tile, a progress icon and a countdown sub-line, so it reads as "keep
  // going" rather than a paywall. Tapping fires an inline explanation
  // rather than navigating. Used for features that need accumulated
  // training data (e.g. Recaps needs RECAP_GATE logged sessions).
  // `pro` marks a tile whose destination is Pro-gated, shown to free users
  // only as an undimmed icon + PRO badge. The two never share a look (T6,
  // world-class-audit-2026-07-03/01-newbie-journey.md #11: both used to
  // read as the same dimmed padlock; time-outline replaces the padlock
  // here so a not-enough-data tile can never be misread as a paywall).
  return (
    <TouchableOpacity
      style={[styles.navTile, locked && styles.navTileLocked]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${label}. ${lockedSub ?? 'Not ready yet.'}` : pro ? `${label}. Part of Pro.` : label}
      accessibilityState={{ disabled: !!locked }}
    >
      <Ionicons
        name={locked ? 'time-outline' : icon}
        size={22}
        color={locked ? colors.textMuted : color}
      />
      <View style={styles.navTileLabelRow}>
        <Text style={[styles.navTileLabel, locked && styles.navTileLabelLocked]}>{label}</Text>
        {pro ? <ProBadge size="sm" /> : null}
      </View>
      {locked && lockedSub ? (
        <Text style={styles.navTileSub} numberOfLines={1}>{lockedSub}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function diffChipBg(d) {
  if (d >= 8) return colors.errorBg;
  if (d >= 6) return colors.warningBg;
  return colors.surface2;
}
function diffChipColor(d) {
  if (d >= 8) return colors.error;
  if (d >= 6) return colors.warning;
  return colors.textSecondary;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.background },
  content:     { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  section:     { gap: spacing.md },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs },
  milestoneText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  milestoneCtaButton: {
    minHeight: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneCta: { ...type.label, color: colors.textPrimary },
  rowBetween:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAllButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  seeAll:      { ...type.label, color: colors.textPrimary },

  // ── Insight rows ──
  recapCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.primary,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.md,
  },
  recapCardText: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: fontWeight.semibold },
  insightRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    borderLeftWidth: 3,
  },
  insightCopy:    { ...type.bodySm, flex: 1, color: colors.textSecondary },
  insightDismiss: { padding: spacing.xxs },

  // ── A5 dashboard: training-load hero + sparkline cards ──
  heroEyebrow:   { ...type.label, color: colors.textSecondary },
  heroValueRow:  { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: spacing.xs },
  heroValue:     { ...type.num('display'), color: colors.textPrimary },
  heroUnit:      { ...type.title, color: colors.textSecondary },
  heroSub:       { ...type.num('caption'), color: colors.textMuted, marginTop: spacing.xxs },
  heroChartSlot: { marginTop: spacing.md, minHeight: 64 },
  // S4: share image extended to training load, same text style as the
  // milestone CTAs (milestoneCta) but right-aligned under the axis row.
  trainingLoadCtaRow: { alignSelf: 'flex-end', marginTop: spacing.sm },
  heroAxisLabel: { ...type.captionTight, color: colors.textMuted, marginTop: spacing.xs },
  sparkRow:      { flexDirection: 'row', gap: spacing.md },
  sparkCard:     { flex: 1 },
  sparkLabel:    { ...type.label, color: colors.textSecondary },
  sparkValue:    { ...type.num('h2'), color: colors.textPrimary, marginTop: spacing.xxs },
  sparkChartSlot: { marginTop: spacing.sm, minHeight: 32 },
  sparkSub:      { ...type.captionTight, color: colors.textMuted, marginTop: spacing.xs },

  // ── Volume snapshot ──
  volEmptyText: { fontSize: fontSize.sm, color: colors.textMuted },
  volSummary:      { gap: spacing.md },
  volSummaryTop:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  volStackBar:     { flexDirection: 'row', height: 8, gap: spacing.xxs },
  volStackSegment: { borderRadius: radius.hair },
  volSummaryMain:  { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  volSummaryCount: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  volSummaryLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  volSummaryFlags: { flex: 1, alignItems: 'flex-end', gap: spacing.xxs },
  volSummaryFlagText: { fontSize: fontSize.micro, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  volSummaryClear: { fontSize: fontSize.micro, color: colors.textMuted },
  volLegendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  volLegendDot: { width: 8, height: 8, borderRadius: circle(8) },

  // ── Lifetime totals panel ──
  lifetimePanel: {
    flexDirection: 'row', alignItems: 'stretch',
    paddingVertical: spacing.lg, paddingHorizontal: spacing.md,
  },
  lifetimeCell: { flex: 1, alignItems: 'center', gap: spacing.xxs },
  lifetimeValue: {
    fontSize: fontSize.xl, fontWeight: fontWeight.bold,
    color: colors.textPrimary, fontVariant: ['tabular-nums'],
  },
  lifetimeLabel: { fontSize: fontSize.micro, color: colors.textSecondary, textAlign: 'center' },
  lifetimeDivider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.xxs },

  // ── Recent sessions ──
  sessionCard: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.md,
  },
  sessionLeft:  { flex: 1 },
  sessionName:  { ...type.bodyStrong, color: colors.textPrimary },
  sessionMeta:  { ...type.num('caption'), color: colors.textSecondary, marginTop: spacing.xxs },
  diffChip:     { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 3 },
  diffText:     { fontSize: fontSize.xs, fontWeight: fontWeight.bold },

  // ── Nav tiles ──
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  navTile: {
    flex: 1, minWidth: '45%',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  navTileLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  navTileLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textSecondary, textAlign: 'center',
  },
  // Not-enough-data-yet tile variant (Recaps countdown pattern, T6): dimmed
  // while a feature is still accumulating data (e.g. Recaps needs
  // RECAP_GATE logged sessions). Never used for a Pro lock, which stays
  // undimmed with a PRO badge instead, so the two states never look alike.
  navTileLocked: { opacity: 0.55 },
  navTileLabelLocked: { color: colors.textMuted },
  navTileSub: {
    ...type.num('caption'),
    color: colors.textMuted,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  // ── Analytics empty state ──
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl,
    gap: spacing.md,
  },
  emptyStateBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
