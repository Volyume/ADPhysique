import React from 'react';
import { View } from 'react-native';
import { Svg, Rect, Text as SvgText } from 'react-native-svg';
import useTheme from '../hooks/useTheme';

/**
 * Pure SVG bar sparkline. Shared visual language for FatigueTrend, MesocyclePulse,
 * and any other bar-style mini-chart so the app keeps a single chart aesthetic.
 *
 * Each data point: { value: number, label?: string, color?: string }
 *
 * Props:
 *   data         array of points (left-to-right rendering)
 *   maxValue     value that fills the full chart height (defaults to max of data)
 *   width        chart width in px (default 220)
 *   height       chart height in px (default 64), does not include label row
 *   barWidth     px per bar (default 22)
 *   barGap       px between bars (default 8)
 *   alignRight   right-align bars when fewer than fit (oldest falls off the left)
 *   showLabels   draw the optional `label` under each bar (default true)
 *   defaultColor fallback bar colour when a point has no explicit colour
 *   labelColor   colour for the under-bar labels
 *   minBarHeight smallest visible bar so zero-data points stay legible
 *   accessibilityLabel
 *                spoken summary for VoiceOver/TalkBack. SVG content is
 *                invisible to screen readers, so without this the chart reads
 *                as nothing. Defaults to a generated left-to-right summary of
 *                the points ("label value, label value, …"); pass a caller
 *                label for domain wording (e.g. "Fatigue trend: …").
 */
export default function SvgBarSparkline({
  data,
  maxValue,
  width = 220,
  height = 64,
  barWidth = 22,
  barGap = 8,
  alignRight = false,
  showLabels = true,
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): these two
  // were default parameters reading the frozen module `colors` singleton.
  // Defaults removed; resolved below against the live `t` from useTheme() so
  // an omitted prop tracks a live theme flip, same pattern as
  // VolyumeChart.js/Sparkline.js.
  defaultColor,
  labelColor,
  minBarHeight = 4,
  accessibilityLabel,
}) {
  const t = useTheme();
  if (!data || data.length === 0) return null;

  const resolvedDefaultColor = defaultColor ?? t.colors.primary;
  const resolvedLabelColor = labelColor ?? t.colors.textMuted;

  const a11yLabel = accessibilityLabel
    ?? `Bar chart: ${data
      .map(d => (d.label ? `${d.label} ${Math.round(d.value || 0)}` : `${Math.round(d.value || 0)}`))
      .join(', ')}`;

  const max = Math.max(maxValue ?? Math.max(...data.map(d => d.value || 0)), 1);
  const count = data.length;
  const totalBarSpace = count * barWidth + (count - 1) * barGap;
  const labelRow = showLabels ? 14 : 0;

  const startX = alignRight
    ? Math.max(0, width - totalBarSpace)
    : Math.max(0, (width - totalBarSpace) / 2);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={a11yLabel}>
      <Svg width={width} height={height + labelRow}>
      {data.map((point, i) => {
        const value = Math.max(0, point.value || 0);
        const ratio = max > 0 ? value / max : 0;
        const barHeight = Math.max(minBarHeight, ratio * height);
        const x = startX + i * (barWidth + barGap);
        const y = height - barHeight;
        const fill = point.color ?? resolvedDefaultColor;
        return (
          <React.Fragment key={i}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={fill}
              opacity={0.9}
            />
            {showLabels && point.label ? (
              <SvgText
                x={x + barWidth / 2}
                y={height + 11}
                fontSize={9}
                fill={resolvedLabelColor}
                textAnchor="middle"
              >
                {point.label}
              </SvgText>
            ) : null}
          </React.Fragment>
        );
      })}
      </Svg>
    </View>
  );
}
