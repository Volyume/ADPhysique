import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, alpha, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import SvgBarSparkline from './SvgBarSparkline';
import InfoTooltip from './InfoTooltip';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import { localDayKey } from '../lib/dayKey';
import { workloadTakeaway } from '../lib/chartWindows';

// Shared section cards for the Progress tab. These render the consistency and
// recovery views (training block, training load, session length, frequency,
// training-day calendar). They were lifted out of AnalyticsScreen so the
// landing and the Consistency surface draw the same cards from one place.
const FREQ_MAX_DISPLAY = 8;

export function MesocyclePulseCard({ meso, currentWeek, progress, tonnageBars, onPress, onBuild }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const progWidth = `${Math.round(progress * 100)}%`;

  if (!meso) {
    return (
      <TouchableOpacity style={[styles.card, live.card, styles.mesoEmpty]} onPress={onBuild} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Browse plans">
        <Ionicons name="layers-outline" size={32} color={t.colors.primaryDim} />
        <Text maxFontSizeMultiplier={1.3} style={[styles.mesoEmptyTitle, live.mesoEmptyTitle]}>No plan running yet</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.mesoEmptySub, live.mesoEmptySub]}>Browse the plan library or build your own. Your progress will appear right here once you start.</Text>
        <View style={[styles.mesoEmptyBtn, live.mesoEmptyBtn]}>
          {/* 2026-07-10 (CP-10 stage 4 batch C, theming): live-theme colour
              prop (t.colors.textSecondary); see noPlanJourneyCopy.guard.test.js
              for the mechanically-updated pin. */}
          <Ionicons name="compass-outline" size={14} color={t.colors.textSecondary} />
          <Text maxFontSizeMultiplier={1.3} style={[styles.mesoEmptyBtnText, live.mesoEmptyBtnText]}>Browse plans</Text>
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
      style={[styles.card, live.card, styles.mesoCard]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${meso.name ?? 'Training Block'}, ${mesoWeekText}`}
      accessibilityHint="Opens training block"
    >
      <View style={styles.mesoTop}>
        <View style={{ flex: 1 }}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.mesoName, live.mesoName]} numberOfLines={1}>{meso.name ?? 'Training Block'}</Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.mesoWeek, live.mesoWeek]}>
            {isPlan
              ? (meso.splitType ? meso.splitType : 'Active plan')
              : `Week ${currentWeek}${meso.durationWeeks ? ` of ${meso.durationWeeks}` : ''}${meso.focus ? `  ·  ${meso.focus}` : ''}`
            }
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
      </View>

      {/* Progress bar, only for mesocycles with a known duration */}
      {!isPlan && meso.durationWeeks > 0 && (
        <>
          <View style={[styles.mesoProgressTrack, live.mesoProgressTrack]}>
            <View style={[styles.mesoProgressFill, live.mesoProgressFill, { width: progWidth }]} />
          </View>
          <Text maxFontSizeMultiplier={1.3} style={[styles.mesoProgressLabel, live.mesoProgressLabel]}>{Math.round(progress * 100)}% complete</Text>
        </>
      )}

      {/* Tonnage sparkline, shared SvgBarSparkline style across the app */}
      {tonnageBars.some(b => b.value > 0) && (
        <View style={styles.sparkWrap}>
          <View style={styles.sparkLabelRow}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.sparkLabel, live.sparkLabel]}>Weekly load</Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.sparkValue, live.sparkValue]}>
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
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const { width: SCREEN_W } = useWindowDimensions();
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
    <View style={[styles.calWrap, live.calWrap]}>
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
                  backgroundColor: trained ? t.colors.primary : t.colors.surface2,
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.calLegend}>
        <View style={[styles.calDot, { backgroundColor: t.colors.surface2, borderWidth: 1, borderColor: t.colors.border }]} />
        <Text maxFontSizeMultiplier={1.3} style={[styles.calLegendText, live.calLegendText]}>Rest</Text>
        <View style={[styles.calDot, { backgroundColor: t.colors.primary }]} />
        <Text maxFontSizeMultiplier={1.3} style={[styles.calLegendText, live.calLegendText]}>Trained</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.calLegendText, live.calLegendText, { marginLeft: 'auto' }]}>{trainedCount} days trained</Text>
      </View>
    </View>
  );
}

// CP-10 theming batch (component sweep, 2026-07-10): live colour resolver
// replacing the frozen barColor() function, same "build" pattern as
// CardioHistoryScreen's buildMarkStyle(c) -- resolves the same avgMin ->
// colour mapping off the passed-in live t.colors instead of the frozen
// colors singleton.
function buildBarColor(c) {
  return function barColor(avgMin) {
    if (avgMin <= 0) return c.surface2;
    if (avgMin < 45) return c.textMuted;
    if (avgMin <= 75) return c.success;
    return c.warning;
  };
}

export function SessionDurationChart({ bars }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const barColor = buildBarColor(t.colors);
  const BAR_MAX_H = 40;
  const BAR_W = 20;
  const durations = bars.map(b => b.avgMin).filter(v => v > 0);
  const maxDur = durations.length > 0 ? Math.max(...durations) : 1;

  // Coaching line: compare last 3 bars with a recorded avg
  const recent = bars.filter(b => b.avgMin > 0);
  let coachingLine = 'Your session lengths are steady.';
  if (recent.length >= 3) {
    const last = recent.slice(-3).map(b => b.avgMin);
    const isDown = last[2] < last[0] - 5;
    if (isDown) coachingLine = 'Your sessions are getting shorter, which might mean fatigue.';
  }

  return (
    <View style={[styles.durationWrap, live.durationWrap]}>
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
                <Text maxFontSizeMultiplier={1.3} style={[styles.durationBarValue, live.durationBarValue]}>{bar.avgMin}m</Text>
              )}
              <Text maxFontSizeMultiplier={1.3} style={[styles.durationBarLabel, live.durationBarLabel]}>{bar.weekLabel}</Text>
            </View>
          );
        })}
      </View>
      <Text maxFontSizeMultiplier={1.3} style={[styles.durationCoach, live.durationCoach]}>{coachingLine}</Text>
    </View>
  );
}

export function MuscleFrequencyTable({ rows, showAll, onToggle }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const visible = showAll ? rows : rows.slice(0, FREQ_MAX_DISPLAY);
  const hasMore = rows.length > FREQ_MAX_DISPLAY;

  return (
    <View style={[styles.freqWrap, live.freqWrap]}>
      {visible.map(({ muscle, thisWeek, lastWeek }) => (
        <View key={muscle} style={[styles.freqRow, live.freqRow]}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.freqMuscle, live.freqMuscle]} numberOfLines={1}>
            {MUSCLE_DISPLAY_NAMES[muscle] ?? muscle}
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.freqCounts, live.freqCounts]}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.freqCountBold, live.freqCountBold, thisWeek > lastWeek && [styles.freqCountUp, live.freqCountUp]]}>
              {thisWeek}
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.freqDivider, live.freqDivider]}> this · </Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.freqLastWeek, live.freqLastWeek]}>{lastWeek} last</Text>
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
          <Text maxFontSizeMultiplier={1.3} style={[styles.freqToggleText, live.freqToggleText]}>
            {showAll ? 'Show less' : `Show all (${rows.length})`}
          </Text>
          <Ionicons
            name={showAll ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={t.colors.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

export function WorkloadCard({ data }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  if (!data || data.ratio === null) return null;

  const { acute, chronic, ratio } = data;

  let statusColor = t.colors.textMuted;
  let statusText = 'Below your recent average (under 0.8). Room for more volume if you feel fresh.';
  if (ratio >= 1.5) {
    statusColor = t.colors.error;
    statusText = 'High load this week (above 1.5). Consider an easier session.';
  } else if (ratio >= 1.3) {
    statusColor = t.colors.warning;
    statusText = 'Load is elevated (above 1.3). Monitor how you feel.';
  } else if (ratio >= 0.8) {
    statusColor = t.colors.success;
    statusText = 'In your optimal range (0.8 to 1.3).';
  }

  // Simple visual bar: fill proportional to ratio, capped at 2.0
  const fillPct = Math.min(ratio / 2.0, 1);

  const takeaway = workloadTakeaway(ratio, acute, chronic);

  return (
    <View style={[styles.workloadCard, live.workloadCard]}>
      <View style={styles.rowBetween}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.workloadTitle, live.workloadTitle]}>Training load</Text>
        <InfoTooltip text="Compares this week's tonnage to your recent average. 0.8 to 1.3 is the optimal range. Above 1.5 signals high fatigue risk." />
      </View>

      <View style={[styles.workloadBarBg, live.workloadBarBg]}>
        <View style={[styles.workloadBarFill, { width: `${Math.round(fillPct * 100)}%`, backgroundColor: statusColor }]} />
      </View>

      <View style={styles.workloadStats}>
        <View style={styles.workloadStat}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.workloadStatValue, live.workloadStatValue]}>{(ratio).toFixed(2)}</Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.workloadStatLabel, live.workloadStatLabel]}>vs recent average</Text>
        </View>
        <View style={styles.workloadStat}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.workloadStatValue, live.workloadStatValue]}>{acute.toLocaleString('en-GB')}</Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.workloadStatLabel, live.workloadStatLabel]}>This week (kg)</Text>
        </View>
        <View style={styles.workloadStat}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.workloadStatValue, live.workloadStatValue]}>{chronic.toLocaleString('en-GB')}</Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.workloadStatLabel, live.workloadStatLabel]}>4-wk avg (kg)</Text>
        </View>
      </View>

      <Text maxFontSizeMultiplier={1.3} style={[styles.workloadStatus, { color: statusColor }]}>{statusText}</Text>
      {!!takeaway && <Text maxFontSizeMultiplier={1.3} style={[styles.workloadTakeaway, live.workloadTakeaway]}>{takeaway}</Text>}
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
  mesoEmptySub:     { ...type.bodySm, color: colors.textSecondary, textAlign: 'center' },
  mesoEmptyBtn:     {
    minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.surface2, borderRadius: radius.full,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.border, marginTop: spacing.xs,
  },
  mesoEmptyBtnText: { ...type.label, color: colors.textPrimary },
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
    // R2 (cohesion sweep, 2026-07-11): the per-bar minutes readout is a data
    // numeral -> tabular figures, matching every other numeral in the tab.
    // fontSize.micro + fontWeight.semibold has no exact type.* role (theme
    // gap logged in the R2 report); the raw pair stays rather than dropping
    // emphasis.
    fontSize: fontSize.micro, color: colors.textSecondary, fontWeight: fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  durationBarLabel: {
    fontSize: fontSize.micro, color: colors.textMuted,
  },
  durationCoach: {
    ...type.captionTight, color: colors.textSecondary, fontStyle: 'italic',
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
    borderBottomWidth: 1, borderBottomColor: withAlpha(colors.border, alpha.strong),
  },
  freqMuscle: {
    ...type.label, color: colors.textPrimary,
    flex: 1,
  },
  freqCounts: {
    ...type.caption, color: colors.textSecondary,
  },
  freqCountBold: {
    // R2 (cohesion sweep, 2026-07-11): per-muscle session counts are data
    // numerals -> tabular figures so the "N this / M last" columns align down
    // the table. fontSize.sm + fontWeight.bold has no exact type.* role (theme
    // gap logged in the R2 report); the raw pair stays rather than dropping
    // emphasis.
    fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  freqCountUp: {
    color: colors.success,
  },
  freqDivider: {
    color: colors.textMuted,
  },
  freqLastWeek: {
    // R2: the "M last" count is also a data numeral -> tabular figures.
    color: colors.textMuted, fontVariant: ['tabular-nums'],
  },
  freqToggle: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    alignSelf: 'flex-start', marginTop: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  freqToggleText: {
    ...type.captionStrong, color: colors.primary,
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
  // R2 (cohesion sweep, 2026-07-11): the training-load meter joins the
  // pill/bar radius family (radius.full), matching the mesocycle progress
  // meter above (mesoProgressTrack/Fill) instead of a one-off radius.sm.
  workloadBarBg: {
    height: 8,
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  workloadBarFill: {
    height: 8,
    borderRadius: radius.full,
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
    ...type.captionTight,
  },
  workloadTakeaway: {
    ...type.bodySm,
    color: colors.textSecondary,
  },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. rowBetween/mesoCard/mesoEmpty/
// mesoTop/sparkWrap/sparkLabelRow/sparkChartCentered/calGrid/calCol/calLegend/
// calDot/durationBarsRow/durationBarCol/durationBar/freqToggle/
// workloadStats/workloadStat/workloadBarFill/workloadStatus have no colour
// tokens baked at module scope (workloadBarFill/workloadStatus take their
// colour from the statusColor variable computed inline against t.colors).
function buildLiveStyles(t) {
  return {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    mesoEmptyTitle: { color: t.colors.textPrimary },
    mesoEmptySub: { color: t.colors.textSecondary },
    mesoEmptyBtn: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    mesoEmptyBtnText: { color: t.colors.textPrimary },
    mesoName: { color: t.colors.textPrimary },
    mesoWeek: { color: t.colors.textSecondary },
    mesoProgressTrack: { backgroundColor: t.colors.surface2 },
    mesoProgressFill: { backgroundColor: t.colors.primary },
    mesoProgressLabel: { color: t.colors.textMuted },
    sparkLabel: { color: t.colors.textMuted },
    sparkValue: { color: t.colors.textPrimary },
    calWrap: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    calLegendText: { color: t.colors.textMuted },
    durationWrap: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    durationBarValue: { color: t.colors.textSecondary },
    durationBarLabel: { color: t.colors.textMuted },
    durationCoach: { color: t.colors.textSecondary },
    freqWrap: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    freqRow: { borderBottomColor: withAlpha(t.colors.border, alpha.strong) },
    freqMuscle: { color: t.colors.textPrimary },
    freqCounts: { color: t.colors.textSecondary },
    freqCountBold: { color: t.colors.textPrimary },
    freqCountUp: { color: t.colors.success },
    freqDivider: { color: t.colors.textMuted },
    freqLastWeek: { color: t.colors.textMuted },
    freqToggleText: { color: t.colors.primary },
    workloadCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    workloadTitle: { color: t.colors.textMuted },
    workloadBarBg: { backgroundColor: t.colors.surface2 },
    workloadStatValue: { color: t.colors.textPrimary },
    workloadStatLabel: { color: t.colors.textMuted },
    workloadTakeaway: { color: t.colors.textSecondary },
  };
}
