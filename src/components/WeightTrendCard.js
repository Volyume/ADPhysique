import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius, type, circle } from '../styles/theme';
import useTheme from '../hooks/useTheme';
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
// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// variant of the frozen DOT_COLORS map this file used to define inline
// (module-scope, aliasing `stateColors.*` at call time), same "build"
// pattern as theme.js's buildVolumeStatusColor -- resolves the SAME
// state -> tone mapping (onTrack -> success, watch -> warning, neutral ->
// textMuted, matching stateColors' own aliasing) off the passed-in live
// t.colors instead of the frozen stateColors singleton, so the trend dot's
// colour stays in step with a theme flip. No frozen twin kept: DOT_COLORS
// was file-private and untested, so there is no unmigrated caller to
// preserve it for.
function buildDotColour(c) {
  return {
    onTrack: c.success,
    watch: c.warning,
    neutral: c.textMuted,
  };
}

export default function WeightTrendCard({ vm, bodyWeightUnits = 'st' }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  const [chartWidth, setChartWidth] = useState(0);

  if (!vm || !vm.render) return null;

  const {
    state, ewmaNow, ewmaData = [], rawData = [],
    showRate, weeklyChange, dot, insight, maintenance,
    hasSparkline, showRaw = true, stepTrendLine = null,
  } = vm;

  const dotColours = buildDotColour(t.colors);
  const dotColor = dot && dotColours[dot] ? dotColours[dot] : null;

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
    <View style={[styles.card, live.card]} accessible accessibilityLabel={a11y}>
      <Text maxFontSizeMultiplier={1.3} style={[styles.label, live.label]}>Your trend</Text>

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
              color={t.colors.primary}
              curved
            />
          )}
        </View>
      )}

      {/* Stat row: EWMA value (never coloured) + neutral weekly rate. Only
          once there is a meaningful smoothed value (state 2+). */}
      {state >= 2 && ewmaNow != null && (
        <View style={styles.statRow}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.ewmaValue, live.ewmaValue]}>{formatBodyWeight(ewmaNow, bodyWeightUnits)}</Text>
          {showRate && rateText && <Text maxFontSizeMultiplier={1.3} style={[styles.rateValue, live.rateValue]}>{rateText}</Text>}
        </View>
      )}

      {/* Insight line with the state dot. Dot is decorative; its meaning is
          carried by the sentence (non-colour redundancy). */}
      <View style={styles.insightRow}>
        {dotColor && (
          <View style={[styles.dot, { backgroundColor: dotColor }]} accessibilityElementsHidden importantForAccessibility="no" />
        )}
        <Text maxFontSizeMultiplier={1.3} style={[styles.insight, live.insight]}>{insight}</Text>
      </View>

      {maintenance && (
        maintenance.building ? (
          <Text maxFontSizeMultiplier={1.3} style={[styles.maintenanceBuilding, live.maintenanceBuilding]}>
            Your coach is building your estimate. Keep logging and it appears in about a week.
          </Text>
        ) : (
          <View style={styles.maintenanceBlock}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.maintenanceValue, live.maintenanceValue]}>
              ~{maintenance.kcal.toLocaleString()} kcal/day estimated maintenance
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.maintenanceLabel, live.maintenanceLabel]}>{maintenance.label}</Text>
          </View>
        )
      )}

      {/* COMP-026 (B): step-trend line, only in a week the modifier sized the
          change. Already suppressed under an open ED flag by the view-model. */}
      {stepTrendLine && <Text maxFontSizeMultiplier={1.3} style={[styles.stepTrendLine, live.stepTrendLine]}>{stepTrendLine}</Text>}
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

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles.
// chartWrap/statRow/insightRow/maintenanceBlock have no colour tokens.
function buildLiveStyles(t) {
  return {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    label: { ...t.type.overline, color: t.colors.textMuted },
    ewmaValue: { ...t.type.num('h3'), color: t.colors.textPrimary },
    rateValue: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    insight: { ...t.type.bodySm, color: t.colors.textSecondary },
    maintenanceValue: { fontSize: t.fontSize.sm, color: t.colors.textPrimary },
    maintenanceLabel: { ...t.type.caption, color: t.colors.textMuted },
    maintenanceBuilding: { ...t.type.bodySm, color: t.colors.textMuted },
    stepTrendLine: { ...t.type.captionTight, color: t.colors.textMuted },
  };
}
