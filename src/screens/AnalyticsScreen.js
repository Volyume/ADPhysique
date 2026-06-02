import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { format } from 'date-fns';

import { colors, fontSize, fontWeight, spacing, radius, volumeColors, motion, type, withAlpha } from '../styles/theme';
import AnimatedEntrance from '../components/AnimatedEntrance';
import ScreenHeader from '../components/ScreenHeader';
import { EmptyChartIllustration } from '../components/Illustrations';
import InfoTooltip from '../components/InfoTooltip';
import SvgBarSparkline from '../components/SvgBarSparkline';
import FatigueTrendCard from '../components/FatigueTrendCard';
import BlockProgressCard from '../components/BlockProgressCard';
import ReadinessCards from '../components/ReadinessCards';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import useProgressData from '../hooks/useProgressData';
import { VOLUME_LANDMARKS, MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';

const { width: SCREEN_W } = Dimensions.get('window');

// Severity → icon + color mapping (jargon-free UI)
const SEVERITY_STYLE = {
  0: { icon: 'information-circle-outline', color: colors.primary },
  1: { icon: 'alert-circle-outline',       color: colors.warning },
  2: { icon: 'warning-outline',            color: colors.error },
};

export default function AnalyticsScreen({ navigation }) {
  const { user, units, tier } = useAppStore(useShallow(s => ({ user: s.user, units: s.units, tier: s.tier })));

  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  useEffect(() => {
    return navigation.getParent()?.addListener('tabPress', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, [navigation]);

  const {
    loading, refreshing,
    activeMeso, mesoTonnage, insights, weeklyVolume, prBars, prWindow,
    calValues, recentSessions, allSets, deloadAlert,
    durationBars, muscleFreq, showAllMuscles, setShowAllMuscles,
    workloadData, fatigueSessions, blockProgress, earliestWorkoutAt,
    currentMesoWeek,
    hasData, enoughForTrends,
    handleDismiss, handlePrWindowToggle, handleRefresh,
    mesoProgress, mesoCurrentWeek,
  } = useProgressData();

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

        {/* ── 1 · Mesocycle Pulse Card ───────────────────────── */}
        <AnimatedEntrance index={0}>
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={styles.sectionLabel}>Training block</Text>
              <InfoTooltip text={
                'Training gets harder each week across the block, then a lighter recovery week lets your body catch up.\n\n' +
                'After the recovery week, a new block starts slightly heavier than the last. That is how you keep improving over months, not just weeks.'
              } />
            </View>
          </View>
          <MesocyclePulseCard
            meso={activeMeso}
            currentWeek={mesoCurrentWeek()}
            progress={mesoProgress()}
            tonnageBars={mesoTonnage}
            onPress={() => navigation.getParent()?.navigate('PlansTab', { screen: 'MesocycleBuilder', initial: false })}
            onBuild={() => navigation.getParent()?.navigate('PlansTab', { screen: 'PlanLibrary', initial: false })}
          />

          {/* Training trend (last 6 sessions' fatigue), moved from Train tab */}
          <FatigueTrendCard sessions={fatigueSessions} />

          {/* This week's planned vs actual volume per muscle, moved from Train tab */}
          <BlockProgressCard
            blockProgress={blockProgress}
            currentMesoWeek={currentMesoWeek}
          />
        </View>
        </AnimatedEntrance>

        {/* ── Readiness (milestones, recovery signals, muscle
            readiness, recovery trend), moved inline from the retired
            Athlete Hub dashboard. ──────────────────────────────── */}
        <ReadinessCards userId={user?.id} tier={tier} />

        {/* Steps moved to the Train tab (under the morning weight) as a small
            just-info line, founder 2026-05-31. */}

        {/* ── Lighter week banner ──────────────────────────────── */}
        {deloadAlert && (
          <View style={styles.deloadBanner}>
            <Ionicons name="moon-outline" size={18} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.deloadTitle}>Lighter week recommended</Text>
              <Text style={styles.deloadSub}>
                {deloadAlert.reasons?.[0] ?? 'Your body is signalling it needs a recovery week.'}
              </Text>
            </View>
            <InfoTooltip text={
              'A lighter recovery week means keeping the same exercises but dropping the weights by around 10–20%. ' +
              'Stop well before failure. Sessions should feel almost too easy.\n\n' +
              'This gives your body a chance to recover and absorb all the work you have been putting in.\n\n' +
              'Most people feel noticeably stronger in the first session back after a proper recovery week.'
            } size={13} />
          </View>
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

        {/* ── Recent sessions: what you actually did, kept high up (above the
            analytical charts) so it is the first concrete thing you see. ── */}
        {recentSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionLabel}>Recent sessions</Text>
              <TouchableOpacity onPress={() => navigation.navigate('WorkoutHistory')}>
                <Text style={styles.seeAll}>All sessions</Text>
              </TouchableOpacity>
            </View>
            {recentSessions.map(w => (
              <SessionCard key={w.id} workout={w} units={units} />
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

        {/* ── 3b · Training Load (ACWR) ─────────────────────── */}
        {workloadData && workloadData.ratio !== null && (
          <View style={styles.section}>
            <WorkloadCard data={workloadData} />
          </View>
        )}

        {/* ── 3d · Session Length Trend ─────────────────────── */}
        {enoughForTrends && durationBars.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={styles.sectionLabel}>Session length trend</Text>
            </View>
            <SessionDurationChart bars={durationBars} />
          </View>
        )}

        {/* ── 3e · Training Frequency ───────────────────────── */}
        {enoughForTrends && muscleFreq.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={styles.sectionLabel}>Training frequency</Text>
              <InfoTooltip text="How many sessions included each muscle group this week vs last." />
            </View>
            <MuscleFrequencyTable
              rows={muscleFreq}
              showAll={showAllMuscles}
              onToggle={() => setShowAllMuscles(v => !v)}
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
            >
              <Text style={styles.windowToggleText}>{prWindow}d</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <PRSparkline bars={prBars} windowDays={prWindow} />
        </View>
        )}

        {/* ── 5 · Training Day Calendar ─────────────────────── */}
        {enoughForTrends && (
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text style={styles.sectionLabel}>Training days (last 12 weeks)</Text>
          </View>
          <TrainingCalendar values={calValues} />
        </View>
        )}

        {/* ── Quick nav tiles ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Explore</Text>
          <View style={styles.navGrid}>
            <NavTile icon="barbell" color={colors.primary} label="Lifts" onPress={() => navigation.navigate('LiftProgress')} />
            <NavTile icon="time" color={colors.textSecondary} label="Full History" onPress={() => navigation.navigate('WorkoutHistory')} />
            {(() => {
              // Year of Lifts unlocks once the user has 365 days of
              // training history. Until then it shows a locked state
              // with the remaining days so the user has a concrete
              // milestone to look forward to.
              const YEAR_MS = 365 * 86400000;
              const elapsed = earliestWorkoutAt ? Date.now() - earliestWorkoutAt : 0;
              const unlocked = elapsed >= YEAR_MS;
              const daysLeft = earliestWorkoutAt
                ? Math.max(0, Math.ceil((YEAR_MS - elapsed) / 86400000))
                : 365;
              return (
                <NavTile
                  icon="calendar-outline"
                  color={colors.textSecondary}
                  label="Year of Lifts"
                  locked={!unlocked}
                  lockedSub={
                    earliestWorkoutAt
                      ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} to go`
                      : 'Start training to unlock'
                  }
                  onPress={() => {
                    if (!unlocked) {
                      Alert.alert(
                        'Year of Lifts',
                        earliestWorkoutAt
                          ? `Your wrap-up unlocks after a full year of training. ${daysLeft} day${daysLeft === 1 ? '' : 's'} to go.`
                          : 'Log your first session to start the year-long countdown.',
                      );
                      return;
                    }
                    navigation.navigate('YearOfLifts');
                  }}
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

function MesocyclePulseCard({ meso, currentWeek, progress, tonnageBars, onPress, onBuild }) {
  const progWidth = `${Math.round(progress * 100)}%`;

  if (!meso) {
    return (
      <TouchableOpacity style={[styles.card, styles.mesoEmpty]} onPress={onBuild} activeOpacity={0.8}>
        <Ionicons name="layers-outline" size={32} color={colors.primaryDim} />
        <Text style={styles.mesoEmptyTitle}>No active plan</Text>
        <Text style={styles.mesoEmptySub}>Browse the plan library or build your own. Your progress will appear right here once you start.</Text>
        <View style={styles.mesoEmptyBtn}>
          <Text style={styles.mesoEmptyBtnText}>Browse plans</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const isPlan = meso._isPlan;

  return (
    <TouchableOpacity style={[styles.card, styles.mesoCard]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.mesoTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.mesoName} numberOfLines={1}>{meso.name ?? 'Training Block'}</Text>
          <Text style={styles.mesoWeek}>
            {isPlan
              ? (meso.splitType ? meso.splitType : 'Active plan')
              : `Week ${currentWeek}${meso.durationWeeks ? ` of ${meso.durationWeeks}` : ''}${meso.focus ? `  ·  ${meso.focus}` : ''}`
            }
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>

      {/* Progress bar, only for mesocycles with a known duration */}
      {!isPlan && meso.durationWeeks > 0 && (
        <>
          <View style={styles.mesoProgressTrack}>
            <View style={[styles.mesoProgressFill, { width: progWidth }]} />
          </View>
          <Text style={styles.mesoProgressLabel}>{Math.round(progress * 100)}% complete</Text>
        </>
      )}

      {/* Tonnage sparkline, shared SvgBarSparkline style across the app */}
      {tonnageBars.some(b => b.value > 0) && (
        <View style={styles.sparkWrap}>
          <View style={styles.sparkLabelRow}>
            <Text style={styles.sparkLabel}>Weekly load</Text>
            <Text style={styles.sparkValue}>
              {(tonnageBars[tonnageBars.length - 1]?.value ?? 0).toLocaleString('en-GB')} kg
            </Text>
          </View>
          <View style={styles.sparkChartCentered}>
            <SvgBarSparkline
              data={tonnageBars}
              width={240}
              height={56}
              barWidth={36}
              barGap={12}
            />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

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
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
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
    <TouchableOpacity style={[styles.card, styles.volSummary]} onPress={onPress} activeOpacity={0.7}>
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
        <Text style={styles.prEmptyText}>No new bests in the last {windowDays} days. Keep pushing.</Text>
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

function TrainingCalendar({ values }) {
  const trainedDates = new Set(values.map(v => v.date));
  const trainedCount = values.length;
  const today = new Date();
  // Build 84 days oldest→newest, grouped into 12 weeks of 7 days
  const SQ = Math.max(10, Math.floor((SCREEN_W - 90) / 14)); // square size
  const weeks = Array.from({ length: 12 }, (_, wi) =>
    Array.from({ length: 7 }, (_, di) => {
      const dayOffset = 83 - (wi * 7 + di);
      const d = new Date(today.getTime() - dayOffset * 86400000);
      return trainedDates.has(d.toISOString().slice(0, 10));
    }),
  );
  return (
    <View style={styles.calWrap}>
      <View style={styles.calGrid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.calCol}>
            {week.map((trained, di) => (
              <View
                key={di}
                style={{
                  width: SQ, height: SQ, borderRadius: 2,
                  backgroundColor: trained ? colors.primary : colors.surface2,
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.calLegend}>
        <View style={[styles.calDot, { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border }]} />
        <Text style={styles.calLegendText}>Rest</Text>
        <View style={[styles.calDot, { backgroundColor: colors.primary }]} />
        <Text style={styles.calLegendText}>Trained</Text>
        <Text style={[styles.calLegendText, { marginLeft: 'auto' }]}>{trainedCount} days trained</Text>
      </View>
    </View>
  );
}

function SessionCard({ workout, units }) {
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

function SessionDurationChart({ bars }) {
  const BAR_MAX_H = 40;
  const BAR_W = 20;
  const durations = bars.map(b => b.avgMin).filter(v => v > 0);
  const maxDur = durations.length > 0 ? Math.max(...durations) : 1;

  // Coaching line: compare last 3 bars with a recorded avg
  const recent = bars.filter(b => b.avgMin > 0);
  let coachingLine = 'Consistent session lengths.';
  if (recent.length >= 3) {
    const last = recent.slice(-3).map(b => b.avgMin);
    const isDown = last[2] < last[0] - 5;
    if (isDown) coachingLine = 'Sessions getting shorter. Might be fatigue.';
  }

  function barColor(avgMin) {
    if (avgMin <= 0) return colors.surface2;
    if (avgMin < 45) return colors.textMuted;
    if (avgMin <= 75) return colors.success;
    return colors.warning;
  }

  return (
    <View style={styles.durationWrap}>
      <View style={styles.durationBarsRow}>
        {bars.map((bar, i) => {
          const barH = bar.avgMin > 0
            ? Math.max(4, Math.round((bar.avgMin / maxDur) * BAR_MAX_H))
            : 4;
          return (
            <View key={i} style={styles.durationBarCol}>
              <View style={[
                styles.durationBar,
                { height: barH, width: BAR_W, backgroundColor: barColor(bar.avgMin) },
              ]} />
              {bar.avgMin > 0 && (
                <Text style={styles.durationBarValue}>{bar.avgMin}m</Text>
              )}
              <Text style={styles.durationBarLabel}>{bar.weekLabel}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.durationCoach}>{coachingLine}</Text>
    </View>
  );
}

const FREQ_MAX_DISPLAY = 8;

function MuscleFrequencyTable({ rows, showAll, onToggle }) {
  const visible = showAll ? rows : rows.slice(0, FREQ_MAX_DISPLAY);
  const hasMore = rows.length > FREQ_MAX_DISPLAY;

  return (
    <View style={styles.freqWrap}>
      {visible.map(({ muscle, thisWeek, lastWeek }) => (
        <View key={muscle} style={styles.freqRow}>
          <Text style={styles.freqMuscle} numberOfLines={1}>
            {MUSCLE_DISPLAY_NAMES[muscle] ?? muscle}
          </Text>
          <Text style={styles.freqCounts}>
            <Text style={[styles.freqCountBold, thisWeek > lastWeek && styles.freqCountUp]}>
              {thisWeek}
            </Text>
            <Text style={styles.freqDivider}> this · </Text>
            <Text style={styles.freqLastWeek}>{lastWeek} last</Text>
          </Text>
        </View>
      ))}
      {hasMore && (
        <TouchableOpacity
          style={styles.freqToggle}
          onPress={onToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.freqToggleText}>
            {showAll ? 'Show less' : `Show all (${rows.length})`}
          </Text>
          <Ionicons
            name={showAll ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={colors.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

function WorkloadCard({ data }) {
  if (!data || data.ratio === null) return null;

  const { acute, chronic, ratio } = data;

  let statusColor = colors.textMuted;
  let statusText = 'Below training average. Consider more volume.';
  if (ratio >= 1.5) {
    statusColor = colors.error;
    statusText = 'High load this week. Consider an easier session.';
  } else if (ratio >= 1.3) {
    statusColor = colors.warning;
    statusText = 'Load is elevated. Monitor how you feel.';
  } else if (ratio >= 0.8) {
    statusColor = colors.success;
    statusText = 'Load is in the optimal training zone.';
  }

  // Simple visual bar: fill proportional to ratio, capped at 2.0
  const fillPct = Math.min(ratio / 2.0, 1);

  return (
    <View style={styles.workloadCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.workloadTitle}>Training load</Text>
        <InfoTooltip text="Compares this week's tonnage to your recent average. 0.8–1.3 is the optimal range. Above 1.5 signals high fatigue risk." />
      </View>

      <View style={styles.workloadBarBg}>
        <View style={[styles.workloadBarFill, { width: `${Math.round(fillPct * 100)}%`, backgroundColor: statusColor }]} />
        {/* Optimal zone marker at 0.8 and 1.3 */}
      </View>

      <View style={styles.workloadStats}>
        <View style={styles.workloadStat}>
          <Text style={styles.workloadStatValue}>{(ratio).toFixed(2)}</Text>
          <Text style={styles.workloadStatLabel}>Ratio</Text>
        </View>
        <View style={styles.workloadStat}>
          <Text style={styles.workloadStatValue}>{acute.toLocaleString('en-GB')}</Text>
          <Text style={styles.workloadStatLabel}>This week (kg)</Text>
        </View>
        <View style={styles.workloadStat}>
          <Text style={styles.workloadStatValue}>{chronic.toLocaleString('en-GB')}</Text>
          <Text style={styles.workloadStatLabel}>4-wk avg (kg)</Text>
        </View>
      </View>

      <Text style={[styles.workloadStatus, { color: statusColor }]}>{statusText}</Text>
    </View>
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
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle:   { ...type.h3, color: colors.textPrimary },

  section:     { gap: spacing.md },
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

  // ── Mesocycle card ──
  mesoCard:         { gap: spacing.md },
  mesoEmpty:        { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  mesoEmptyTitle:   { ...type.bodyStrong, color: colors.textPrimary },
  mesoEmptySub:     { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  mesoEmptyBtn:     {
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.primary, marginTop: spacing.xs,
  },
  mesoEmptyBtnText: { ...type.label, color: colors.primary },
  mesoTop:          { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  mesoName:         { ...type.bodyStrong, color: colors.textPrimary, flex: 1 },
  mesoWeek:         { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  mesoProgressTrack: {
    height: 4, borderRadius: radius.full,
    backgroundColor: colors.surface2, overflow: 'hidden',
  },
  mesoProgressFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },
  mesoProgressLabel: { ...type.num('caption'), color: colors.textMuted },
  sparkWrap:           { marginTop: spacing.xs },
  sparkLabelRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.xs },
  sparkLabel:          { ...type.caption, color: colors.textMuted },
  sparkValue:          { ...type.num('bodyStrong'), color: colors.textPrimary },
  sparkChartCentered:  { alignItems: 'center', paddingTop: spacing.xs },

  // ── Insight rows ──
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

  // ── Calendar ──
  calWrap: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    gap: spacing.md,
  },
  calGrid:       { flexDirection: 'row', gap: 3 },
  calCol:        { flex: 1, gap: 3 },
  calLegend:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  calDot:        { width: 10, height: 10, borderRadius: 2 },
  calLegendText: { ...type.caption, color: colors.textMuted },

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
  deloadBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: withAlpha(colors.warning, 0.376),
    padding: spacing.lg,
  },
  deloadTitle: {
    ...type.bodyStrong,
    color: colors.warning, marginBottom: spacing.xxs,
  },
  deloadSub: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },

  // ── Session Duration Trend ──
  durationWrap: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    gap: spacing.md,
  },
  durationBarsRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    height: 72,
  },
  durationBarCol: {
    alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xxs,
  },
  durationBar: {
    borderRadius: 3,
  },
  durationBarValue: {
    fontSize: fontSize.micro, color: colors.textSecondary, fontWeight: fontWeight.semibold,
  },
  durationBarLabel: {
    fontSize: fontSize.micro, color: colors.textMuted,
  },
  durationCoach: {
    fontSize: fontSize.xs, color: colors.textSecondary,
    lineHeight: 17, fontStyle: 'italic',
  },

  // ── Muscle Frequency Table ──
  freqWrap: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    gap: spacing.xxs,
  },
  freqRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1, borderBottomColor: withAlpha(colors.border, 0.376),
  },
  freqMuscle: {
    ...type.label, color: colors.textPrimary,
    flex: 1,
  },
  freqCounts: {
    ...type.caption, color: colors.textSecondary,
  },
  freqCountBold: {
    fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary,
  },
  freqCountUp: {
    color: colors.success,
  },
  freqDivider: {
    color: colors.textMuted,
  },
  freqLastWeek: {
    color: colors.textMuted,
  },
  freqToggle: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    alignSelf: 'flex-start', marginTop: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  freqToggleText: {
    fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium,
  },

  // ── Workload Card (ACWR) ──
  workloadCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  workloadTitle: {
    ...type.label,
    color: colors.textMuted,
  },
  workloadBarBg: {
    height: 8,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  workloadBarFill: {
    height: 8,
    borderRadius: radius.sm,
  },
  workloadStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workloadStat: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  workloadStatValue: {
    ...type.num('title'),
    color: colors.textPrimary,
  },
  workloadStatLabel: {
    ...type.caption,
    color: colors.textMuted,
  },
  workloadStatus: {
    fontSize: fontSize.xs,
    lineHeight: 17,
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
