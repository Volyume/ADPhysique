import { useRef, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { format } from 'date-fns';

import { colors, fontSize, fontWeight, spacing, radius, volumeColors, type } from '../styles/theme';
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
import { markMilestoneSeen } from '../lib/streakState';
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

export default function AnalyticsScreen({ navigation }) {
  const user = useAppStore(s => s.user);
  const userProfile = useAppStore(s => s.userProfile);
  const tier = useAppStore(s => s.tier);
  const bodyWeightUnits = useAppStore(s => s.bodyWeightUnits);

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

  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  useEffect(() => {
    return navigation.getParent()?.addListener('tabPress', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, [navigation]);

  const {
    loading, refreshing,
    insights, weeklyVolume, prBars, prWindow,
    recentSessions, allSets, earliestWorkoutAt, completedWorkoutCount,
    hasData, enoughForTrends,
    handleDismiss, handlePrWindowToggle, handleRefresh,
  } = useProgressData();

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
          </View>
        )}

        {/* ── Empty state ───────────────────────────────────── */}
        {!loading && allSets.length === 0 && (
          <View style={styles.emptyState}>
            <EmptyChartIllustration size={140} />
            <Text style={styles.emptyStateHeading}>No data yet</Text>
            <Text style={styles.emptyStateBody}>
              Your progress charts will appear here after your first few sessions. Log a workout to get started.
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
          <View style={styles.section}>
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

        {/* ── Quick nav tiles ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Explore</Text>
          <View style={styles.navGrid}>
            <NavTile icon="pulse" color={colors.success} label="Consistency" onPress={() => navigation.navigate('Consistency')} />
            <NavTile icon="barbell" color={colors.primary} label="Lifts" onPress={() => navigation.navigate('LiftProgress')} />
            {/* Weight trend lives in the Pro Body Metrics screen (EWMA + the
                up/down line chart). Surfacing it here makes it discoverable from
                Progress; the guard shows the upsell to free users. */}
            <NavTile icon="trending-up" color={colors.warning} label="Weight" onPress={() => navigation.navigate('BodyMetrics')} />
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
      <Text style={styles.insightCopy} numberOfLines={3}>{insight.copy}</Text>
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
function VolumeSummaryStrip({ volume, onPress }) {
  const trained = MUSCLES.filter(m => (volume[m]?.workingSets ?? 0) > 0);
  if (trained.length === 0) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="This week's volume. Open the heatmap."
      >
        <Text style={styles.volEmptyText}>Nothing logged this week yet.</Text>
      </TouchableOpacity>
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
    <TouchableOpacity
      style={[styles.card, styles.volSummary]}
      onPress={onPress}
      activeOpacity={0.7}
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
    </TouchableOpacity>
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

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

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
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, height: 60,
  },
  prBarCol:  { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  prBar:     { width: '100%', borderRadius: 2 },
  prBarCount: { fontSize: fontSize.micro, color: colors.gold, marginTop: spacing.xxs, fontWeight: fontWeight.bold, fontVariant: ['tabular-nums'] },
  prEmpty:   {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  prEmptyText: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 18 },

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
