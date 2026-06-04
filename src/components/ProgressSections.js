import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import SvgBarSparkline from './SvgBarSparkline';
import InfoTooltip from './InfoTooltip';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import { localDayKey } from '../lib/dayKey';

// Shared section cards for the Progress tab. These render the consistency and
// recovery views (training block, training load, session length, frequency,
// training-day calendar). They were lifted out of AnalyticsScreen so the
// landing and the Consistency surface draw the same cards from one place.
const { width: SCREEN_W } = Dimensions.get('window');
const FREQ_MAX_DISPLAY = 8;

export function MesocyclePulseCard({ meso, currentWeek, progress, tonnageBars, onPress, onBuild }) {
  const progWidth = `${Math.round(progress * 100)}%`;

  if (!meso) {
    return (
      <TouchableOpacity style={[styles.card, styles.mesoEmpty]} onPress={onBuild} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Browse plans">
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

  const mesoWeekText = isPlan
    ? (meso.splitType ? meso.splitType : 'Active plan')
    : `Week ${currentWeek}${meso.durationWeeks ? ` of ${meso.durationWeeks}` : ''}${meso.focus ? `, ${meso.focus}` : ''}`;

  return (
    <TouchableOpacity
      style={[styles.card, styles.mesoCard]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${meso.name ?? 'Training Block'}, ${mesoWeekText}`}
      accessibilityHint="Opens training block"
    >
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

export function TrainingCalendar({ values }) {
  const trainedDates = new Set(values.map(v => v.date));
  const trainedCount = values.length;
  const today = new Date();
  // Build 84 days oldest→newest, grouped into 12 weeks of 7 days
  const SQ = Math.max(10, Math.floor((SCREEN_W - 90) / 14)); // square size
  const weeks = Array.from({ length: 12 }, (_, wi) =>
    Array.from({ length: 7 }, (_, di) => {
      const dayOffset = 83 - (wi * 7 + di);
      const d = new Date(today.getTime() - dayOffset * 86400000);
      // Match on the LOCAL day key (loadCalendar emits the same), so the
      // squares line up with the user's UK calendar, not UTC.
      return trainedDates.has(localDayKey(d.getTime()));
    }),
  );
  return (
    <View style={styles.calWrap}>
      <View
        style={styles.calGrid}
        accessible
        accessibilityLabel={`Trained ${trainedCount} of the last 84 days`}
      >
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

export function SessionDurationChart({ bars }) {
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

export function MuscleFrequencyTable({ rows, showAll, onToggle }) {
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
          accessibilityRole="button"
          accessibilityState={{ expanded: showAll }}
          accessibilityLabel={showAll ? 'Show less' : `Show all ${rows.length}`}
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

export function WorkloadCard({ data }) {
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

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
});
