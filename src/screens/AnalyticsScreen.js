import { useRef, useEffect, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { format } from 'date-fns';

import { colors, fontSize, fontWeight, spacing, radius, volumeColors, type } from '../styles/theme';
import Card from '../components/Card';
import ScreenHeader from '../components/ScreenHeader';
import { EmptyChartIllustration } from '../components/Illustrations';
import InfoTooltip from '../components/InfoTooltip';
import CardioPlanCard from '../components/CardioPlanCard';
import useAppStore from '../store/useAppStore';
import useProgressData from '../hooks/useProgressData';
import useWeightTrend from '../hooks/useWeightTrend';
import WeightTrendCard from '../components/WeightTrendCard';
import useWeeklyStreak from '../hooks/useWeeklyStreak';
import WeeklyStreakStrip from '../components/WeeklyStreakStrip';
import { markMilestoneSeen, markPerfectMonthSeen } from '../lib/streakState';
import { getLifetimeTonnage } from '../lib/database';
import { pendingTonnageMilestone, loadSeenTonnage, markTonnageMilestoneSeen, formatTonnage } from '../lib/tonnageMilestone';
import { formatNumber } from '../lib/format';
import { track } from '../lib/engineTelemetry';
import { VOLUME_LANDMARKS } from '../lib/algorithms';

// COMP-018 milestone copy (§4.6.8). Weeks of showing up against your own plan —
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
  // "Make a card", so a share CTA never vanishes before it can be used.
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
    insights, weeklyVolume, prBars, prWindow,
    recentSessions, allSets, earliestWorkoutAt, completedWorkoutCount,
    hasData, enoughForTrends,
    handleDismiss, handlePrWindowToggle, handleRefresh,
  } = useProgressData();

  // R3 lifetime-stats panel: total reps performed across every working set
  // ever logged. Derived from the already-loaded set list (no new query),
  // using the same filter as getLifetimeTonnage — warmups excluded, only
  // sets with a positive weight and reps — so reps and tonnage describe the
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

  // COMP-005: ephemeral recap card — for the first 7 days of the month, once
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
  // user taps "Make a card" (markTonnageMilestoneSeen on tap), so it never
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

        {/* ── This week (COMP-018): the first thing on Progress is a
            one-glance answer to "am I on track?" — sessions this week and
            the run state. Free for all tiers; self-hides for a brand-new
            user and under an open wellbeing flag. ── */}
        {weeklyStreak.render && (
          <View style={styles.section}>
            <WeeklyStreakStrip vm={weeklyStreak} />
            {pendingMilestone ? (
              <View style={styles.milestoneRow}>
                <Ionicons name="ribbon-outline" size={16} color={colors.primary} />
                <Text style={styles.milestoneText}>{STREAK_MILESTONE_COPY[pendingMilestone]}</Text>
                {pendingMilestone >= 12 ? (
                  <TouchableOpacity
                    onPress={() => makeStreakCard(pendingMilestone)}
                    accessibilityRole="button"
                    accessibilityLabel="Make a card"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.milestoneCta}>Make a card</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
            {perfectMonth ? (
              <View style={styles.milestoneRow}>
                <Ionicons name="ribbon-outline" size={16} color={colors.primary} />
                <Text style={styles.milestoneText}>A perfect month. Four weeks, every target met.</Text>
                <TouchableOpacity
                  onPress={makePerfectMonthCard}
                  accessibilityRole="button"
                  accessibilityLabel="Make a card"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.milestoneCta}>Make a card</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        {/* Phase-2 lifetime-tonnage landmark — independent of the streak strip. */}
        {tonnageLandmark ? (
          <View style={styles.section}>
            <View style={styles.milestoneRow}>
              <Ionicons name="barbell-outline" size={16} color={colors.primary} />
              <Text style={styles.milestoneText}>
                {formatTonnage(tonnageLandmark)} {units === 'lbs' ? 'lbs' : 'kg'} lifted all-time. A landmark.
              </Text>
              <TouchableOpacity
                onPress={makeTonnageCard}
                accessibilityRole="button"
                accessibilityLabel="Make a card"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.milestoneCta}>Make a card</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* ── Empty state (U-D-4: encouragement-framed, matching BodyMetrics) ── */}
        {!loading && allSets.length === 0 && (
          <View style={styles.emptyState}>
            <EmptyChartIllustration size={140} />
            <Text style={styles.emptyStateHeading}>Your progress starts here</Text>
            <Text style={styles.emptyStateBody}>
              Log your first session and these charts begin filling in. Every workout you log adds to the picture.
            </Text>
          </View>
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
              Your {recentMonthRecapParams(earliestWorkoutAt).monthLabel.replace(' so far', '')} recap is ready · 45 seconds
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
            <Text style={styles.sectionLabel}>For you</Text>
            {insights.map(ins => (
              <InsightRow key={ins.id} insight={ins} onDismiss={() => handleDismiss(ins.id)} />
            ))}
          </View>
        )}

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
              <Text style={styles.sectionLabel}>Recent sessions</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('WorkoutHistory')}
                accessibilityRole="button"
                accessibilityLabel="See all sessions"
              >
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
            <Text style={styles.sectionLabel}>This week's volume</Text>
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

        {/* ── 4 · PR Rate Sparkline ─────────────────────────── */}
        {enoughForTrends && (
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={styles.sectionLabel}>New personal bests</Text>
            </View>
            <TouchableOpacity
              style={styles.windowToggle}
              onPress={handlePrWindowToggle}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Personal-bests window, ${prWindow} days. Tap to change.`}
            >
              <Text style={styles.windowToggleText}>{prWindow}d</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <PRSparkline bars={prBars} windowDays={prWindow} />
        </View>
        )}

        {/* ── Lifetime totals (R3): a standing read-only panel of all-time
            numbers — sessions, total weight lifted, total reps. No
            comparison, no rank; just your own running totals. Self-hides
            until there is something logged. ── */}
        {hasData && completedWorkoutCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Lifetime totals</Text>
            <View style={styles.lifetimePanel}>
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
            </View>
          </View>
        )}

        {/* ── Quick nav tiles ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Explore</Text>
          <View style={styles.navGrid}>
            <NavTile icon="pulse" color={colors.success} label="Consistency" onPress={() => navigation.navigate('Consistency')} />
            <NavTile icon="barbell" color={colors.primary} label="Lifts" onPress={() => navigation.navigate('LiftProgress')} />
            {/* Body Metrics carries the weight EWMA trend once 2+ logs exist,
                but it is a metrics screen, so the tile says what it opens
                (founder device-walk 2026-06-12: a "Weight" tile promised a
                progress chart and landed on a logging form). The IA pass will
                lead that screen with the trend; the label stops over-promising
                now. */}
            <NavTile icon="body" color={colors.warning} label="Body Metrics" onPress={() => navigation.navigate('BodyMetrics')} />
            {/* NEW-002 rebuild: the partner's first-class destination (Apple
                Fitness pattern: minimal-signal sharing still gets a proper
                named home, never a buried row). */}
            <NavTile icon="people" color={colors.primary} label="Partner" onPress={() => navigation.navigate('Partner')} />
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
                        `Your first monthly recap unlocks after ${RECAP_GATE} logged sessions. ${toGo} to go.`,
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
    <View style={[styles.insightRow, { borderLeftColor: sev.color }]}>
      <Ionicons name={sev.icon} size={18} color={sev.color} style={{ marginTop: 1 }} />
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
    </View>
  );
}

const MUSCLES = Object.keys(VOLUME_LANDMARKS);

// Compact landing read for weekly volume. The full per-muscle picture lives on
// the heatmap (the one volume home); this is a glanceable summary that drills
// in: how many muscles were trained, and how many sit outside their target.
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
  return (
    <Card
      style={styles.volSummary}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="This week's volume. Open the heatmap."
    >
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
    </Card>
  );
}

function PRSparkline({ bars, windowDays }) {
  const total = bars.reduce((s, b) => s + b.value, 0);
  if (total === 0) {
    return (
      <View style={styles.prEmpty}>
        <Text style={styles.prEmptyText}>No new bests in the last {windowDays} days.</Text>
      </View>
    );
  }
  const maxVal = Math.max(...bars.map(b => b.value), 1);
  const BAR_MAX_H = 56;
  return (
    <View style={styles.prWrap}>
      <Text style={styles.prTotal}>{total} new bests in {windowDays} days</Text>
      <View style={styles.prBarsRow}>
        {bars.map((bar, i) => {
          const barH = bar.value > 0
            ? Math.max(8, Math.round((bar.value / maxVal) * BAR_MAX_H))
            : 3;
          return (
            <View key={i} style={styles.prBarCol}>
              <View style={[
                styles.prBar,
                {
                  height: barH,
                  backgroundColor: bar.value > 0 ? colors.gold : colors.surface3,
                },
              ]} />
              {bar.value > 0 && (
                <Text style={styles.prBarCount}>{bar.value}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SessionCard({ workout }) {
  const name = workout.name || 'Session';
  const at = workout.startedAt ?? workout.createdAt ?? workout.created_at ?? 0;
  const diff = workout.sessionDifficulty ?? null;
  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionLeft}>
        <Text style={styles.sessionName} numberOfLines={1}>{name}</Text>
        <Text style={styles.sessionMeta}>
          {at ? format(new Date(at), 'EEE d MMM') : ''}
          {workout.durationMinutes ? ` · ${workout.durationMinutes}m` : ''}
        </Text>
      </View>
      {diff != null && (
        <View style={[styles.diffChip, { backgroundColor: diffChipBg(diff) }]}>
          <Text style={[styles.diffText, { color: diffChipColor(diff) }]}>
            {diff}/10
          </Text>
        </View>
      )}
    </View>
  );
}

function NavTile({ icon, color, label, onPress, locked, lockedSub }) {
  // When locked, the tile is dimmed and onPress fires an inline
  // explanation rather than navigating. Used for features that need
  // accumulated training data (e.g. Year of Lifts needs a year).
  return (
    <TouchableOpacity
      style={[styles.navTile, locked && styles.navTileLocked]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${label}. Locked. ${lockedSub ?? ''}` : label}
      accessibilityState={{ disabled: !!locked }}
    >
      <Ionicons
        name={locked ? 'lock-closed-outline' : icon}
        size={22}
        color={locked ? colors.textMuted : color}
      />
      <Text style={[styles.navTileLabel, locked && styles.navTileLabelLocked]}>{label}</Text>
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
  milestoneCta: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  sectionLabel: {
    ...type.label,
    color: colors.textSecondary,
  },
  rowBetween:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll:      { ...type.label, color: colors.primary },

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
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3,
  },
  insightCopy:    { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
  insightDismiss: { padding: spacing.xxs },

  // ── Volume snapshot ──
  volEmptyText: { fontSize: fontSize.sm, color: colors.textMuted },
  volSummary:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  volSummaryMain:  { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  volSummaryCount: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  volSummaryLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  volSummaryFlags: { flex: 1, alignItems: 'flex-end', gap: spacing.xxs },
  volSummaryFlagText: { fontSize: fontSize.micro, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  volSummaryClear: { fontSize: fontSize.micro, color: colors.textMuted },
  volLegendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  volLegendDot: { width: 8, height: 8, borderRadius: 4 },

  // ── PR Sparkline ──
  windowToggle: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xxs,
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.primary,
  },
  windowToggleText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.bold },
  prWrap:    { gap: spacing.sm },
  prTotal:   { ...type.num('caption'), color: colors.textMuted },
  prBarsRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, minHeight: 60,
  },
  prBarCol:  { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  prBar:     { width: '100%', borderRadius: 2 },
  prBarCount: { fontSize: fontSize.micro, color: colors.gold, marginTop: spacing.xxs, fontWeight: fontWeight.bold, fontVariant: ['tabular-nums'] },
  prEmpty:   {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  prEmptyText: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 18 },

  // ── Lifetime totals panel ──
  lifetimePanel: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
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
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
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
  navTileLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textSecondary, textAlign: 'center',
  },
  // Locked tile variant, used while accumulating training data needed
  // for a feature (e.g. Year of Lifts requires 365 days of history).
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
  emptyStateHeading: {
    ...type.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyStateBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
