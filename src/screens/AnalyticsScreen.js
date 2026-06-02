import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { format } from 'date-fns';

import { colors, fontSize, fontWeight, spacing, radius, volumeColors, type } from '../styles/theme';
import ScreenHeader from '../components/ScreenHeader';
import { EmptyChartIllustration } from '../components/Illustrations';
import InfoTooltip from '../components/InfoTooltip';
import useAppStore from '../store/useAppStore';
import useProgressData from '../hooks/useProgressData';
import { VOLUME_LANDMARKS } from '../lib/algorithms';

// Severity → icon + color mapping (jargon-free UI)
const SEVERITY_STYLE = {
  0: { icon: 'information-circle-outline', color: colors.primary },
  1: { icon: 'alert-circle-outline',       color: colors.warning },
  2: { icon: 'warning-outline',            color: colors.error },
};

export default function AnalyticsScreen({ navigation }) {
  const units = useAppStore(s => s.units);

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
    recentSessions, allSets, earliestWorkoutAt,
    hasData, enoughForTrends,
    handleDismiss, handlePrWindowToggle, handleRefresh,
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

        {/* ── Quick nav tiles ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Explore</Text>
          <View style={styles.navGrid}>
            <NavTile icon="pulse" color={colors.success} label="Consistency" onPress={() => navigation.navigate('Consistency')} />
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
