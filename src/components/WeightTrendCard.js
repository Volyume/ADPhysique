import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius, type, stateColors, circle } from '../styles/theme';
import VolyumeChart from './VolyumeChart';
import { formatBodyWeight } from '../lib/units';

/**
 * "Your trend" card (COMP-004). Renders the calm, no-shame weight-trend
 * read on the Progress tab: a smoothed line over the faint raw weights, the
 * current EWMA value, the weekly rate, one plain-English insight sentence,
 * and the adaptive maintenance estimate.
 *
 * All interpretation comes pre-derived from useWeightTrend / deriveWeightTrend
 * (the `vm` prop). This component is presentation only and enforces COMP-027's
 * Class B rules: the weight numeral is always textPrimary (never a state
 * colour), the state dot caps at watch, and under an open ED flag the rate,
 * maintenance and dot are already stripped from the view-model.
 *
 * The dashed goal-band overlay from the blueprint is intentionally deferred
 * (visual polish): band membership is conveyed by the dot + insight line.
 */
const DOT_COLORS = {
  onTrack: () => stateColors.onTrack,
  watch: () => stateColors.watch,
  neutral: () => stateColors.neutral,
};

export default function WeightTrendCard({ vm, bodyWeightUnits = 'st' }) {
  const [chartWidth, setChartWidth] = useState(0);

  if (!vm || !vm.render) return null;

  const {
    state, ewmaNow, ewmaData = [], rawData = [],
    showRate, weeklyChange, dot, insight, maintenance,
    hasSparkline, showRaw = true, stepTrendLine = null,
  } = vm;

  const dotColor = dot && DOT_COLORS[dot] ? DOT_COLORS[dot]() : null;

  const lineData = ewmaData
    .map((p) => ({ value: p?.ewma }))
    .filter((p) => Number.isFinite(p.value));
  const rawSeries = showRaw
    ? rawData.map((p) => ({ value: p?.weightKg })).filter((p) => Number.isFinite(p.value))
    : null;

  // Weekly rate in kg (rate of change is conventionally read in kg, and the
  // blueprint copy uses kg). One decimal, explicit sign, neutral colour.
  const rateText = Number.isFinite(weeklyChange)
    ? `${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)} kg this week`
    : null;

  const a11y = [
    'Your trend.',
    ewmaNow != null && state >= 2 ? `${formatBodyWeight(ewmaNow, bodyWeightUnits)} now.` : '',
    showRate && rateText ? rateText + '.' : '',
    insight,
    stepTrendLine,
  ].filter(Boolean).join(' ');

  return (
    <View style={styles.card} accessible accessibilityLabel={a11y}>
      <Text style={styles.label}>Your trend</Text>

      {hasSparkline && lineData.length >= 2 && (
        <View
          style={styles.chartWrap}
          onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
        >
          {chartWidth > 0 && (
            <VolyumeChart
              data={lineData}
              data2={rawSeries}
              width={chartWidth}
              height={88}
              color={colors.primary}
              curved
            />
          )}
        </View>
      )}

      {/* Stat row: EWMA value (never coloured) + neutral weekly rate. Only
          once there is a meaningful smoothed value (state 2+). */}
      {state >= 2 && ewmaNow != null && (
        <View style={styles.statRow}>
          <Text style={styles.ewmaValue}>{formatBodyWeight(ewmaNow, bodyWeightUnits)}</Text>
          {showRate && rateText && <Text style={styles.rateValue}>{rateText}</Text>}
        </View>
      )}

      {/* Insight line with the state dot. Dot is decorative; its meaning is
          carried by the sentence (non-colour redundancy). */}
      <View style={styles.insightRow}>
        {dotColor && (
          <View style={[styles.dot, { backgroundColor: dotColor }]} accessibilityElementsHidden importantForAccessibility="no" />
        )}
        <Text style={styles.insight}>{insight}</Text>
      </View>

      {maintenance && (
        maintenance.building ? (
          <Text style={styles.maintenanceBuilding}>
            The Coach is building your estimate. Keep logging and it appears in about a week.
          </Text>
        ) : (
          <View style={styles.maintenanceBlock}>
            <Text style={styles.maintenanceValue}>
              ~{maintenance.kcal.toLocaleString()} kcal/day estimated maintenance
            </Text>
            <Text style={styles.maintenanceLabel}>{maintenance.label}</Text>
          </View>
        )
      )}

      {/* COMP-026 (B): step-trend line, only in a week the modifier sized the
          change. Already suppressed under an open ED flag by the view-model. */}
      {stepTrendLine && <Text style={styles.stepTrendLine}>{stepTrendLine}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  // B-5 uppercase consolidation: type.caption + a manual uppercase/overline
  // override reproduced type.overline's fontSize/lineHeight/letterSpacing/
  // textTransform exactly (no fontWeight override here), so this is a
  // like-for-like swap onto the named shared token.
  label: { ...type.overline, color: colors.textMuted },
  chartWrap: { width: '100%' },
  statRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  ewmaValue: { ...type.num('h3'), color: colors.textPrimary },
  rateValue: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.semibold, fontVariant: ['tabular-nums'] },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs2 },
  dot: { width: 6, height: 6, borderRadius: circle(6), marginTop: 6 },
  insight: { ...type.bodySm, flex: 1, color: colors.textSecondary },
  maintenanceBlock: { gap: spacing.xxs },
  maintenanceValue: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: fontWeight.semibold },
  maintenanceLabel: { ...type.caption, color: colors.textMuted },
  maintenanceBuilding: { ...type.bodySm, color: colors.textMuted },
  stepTrendLine: { ...type.captionTight, color: colors.textMuted, fontStyle: 'italic' },
});
