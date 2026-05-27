import React from 'react';
import { Svg, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '../styles/theme';

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
  defaultColor = colors.primary,
  labelColor = colors.textMuted,
  minBarHeight = 4,
}) {
  if (!data || data.length === 0) return null;

  const max = Math.max(maxValue ?? Math.max(...data.map(d => d.value || 0)), 1);
  const count = data.length;
  const totalBarSpace = count * barWidth + (count - 1) * barGap;
  const labelRow = showLabels ? 14 : 0;

  const startX = alignRight
    ? Math.max(0, width - totalBarSpace)
    : Math.max(0, (width - totalBarSpace) / 2);

  return (
    <Svg width={width} height={height + labelRow}>
      {data.map((point, i) => {
        const value = Math.max(0, point.value || 0);
        const ratio = max > 0 ? value / max : 0;
        const barHeight = Math.max(minBarHeight, ratio * height);
        const x = startX + i * (barWidth + barGap);
        const y = height - barHeight;
        const fill = point.color ?? defaultColor;
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
                fill={labelColor}
                textAnchor="middle"
              >
                {point.label}
              </SvgText>
            ) : null}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}
