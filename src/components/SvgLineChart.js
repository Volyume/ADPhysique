// SvgLineChart, the app's single line/area chart, drawn with
// react-native-svg. Replaces the old react-native-gifted-charts and
// victory-native line charts so the whole app shares one chart engine
// and one look. Body metrics, PRs and exercise history all render
// through here.
//
// Data shape: [{ value:number, label?:string }]. A point's `label`, when
// present, is drawn under it on the x-axis (callers usually label only
// the first and last). Pass `data2` for a faint secondary series (e.g.
// raw readings behind a smoothed trend); it shares the main y-domain.
//
// The maths (point placement, smoothing, area close, axis ticks) lives in
// ../lib/chartGeometry and is unit-tested there. This file is only the
// rendering.

import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import Svg, {
  Path, Line, Circle, Text as SvgText, Defs, LinearGradient, Stop,
} from 'react-native-svg';
import { colors as theme, withAlpha } from '../styles/theme';
import {
  plotPoints, linePath, smoothPath, areaPath, ticks, paddedDomain,
} from '../lib/chartGeometry';

// Axis label formatting: integers for wide ranges, one decimal when the
// whole chart spans only a few units (e.g. body-fat percentage).
function formatTick(value, span) {
  if (span <= 4) return (Math.round(value * 10) / 10).toString();
  return Math.round(value).toString();
}

export default function SvgLineChart({
  data = [],
  data2 = null,
  width = 300,
  height = 120,
  color = theme.primary,
  color2 = withAlpha(theme.textMuted, 0.4),
  thickness = 2,
  thickness2 = 1,
  area = false,
  areaTopColor,
  areaBottomColor,
  min: minProp,
  max: maxProp,
  yAxisSuffix = '',
  sections = 0,
  showDots = false,
  dotRadius = 3,
  curved = true,
  axisColor = theme.border,
  rulesColor = theme.border,
  labelColor = theme.textMuted,
  backgroundColor = 'transparent',
}) {
  // Unique per instance so the area gradient never collides with another
  // chart's gradient when several render on the same screen.
  const gradId = useRef(`svgLineFill${Math.random().toString(36).slice(2, 9)}`).current;

  const values = useMemo(() => data.map(d => d.value).filter(Number.isFinite), [data]);
  const values2 = useMemo(
    () => (data2 ? data2.map(d => d.value).filter(Number.isFinite) : []),
    [data2],
  );

  const { min, max } = useMemo(() => {
    if (Number.isFinite(minProp) && Number.isFinite(maxProp) && maxProp > minProp) {
      return { min: minProp, max: maxProp };
    }
    return paddedDomain([...values, ...values2]);
  }, [minProp, maxProp, values, values2]);

  if (values.length < 2) return null;

  // Reserve gutters for axis chrome only when it's actually drawn.
  const hasYLabels = sections > 0;
  const hasXLabels = data.some(d => d.label);
  const leftPad = hasYLabels ? 34 : 0;
  const bottomPad = hasXLabels ? 16 : 0;
  const topPad = 4;
  const rightPad = 6;

  const box = {
    left: leftPad,
    top: topPad,
    width: Math.max(1, width - leftPad - rightPad),
    height: Math.max(1, height - topPad - bottomPad),
  };
  const baselineY = box.top + box.height;
  const span = max - min;

  const points = plotPoints(values, box, min, max);
  const points2 = values2.length >= 2 ? plotPoints(values2, box, min, max) : null;
  const mainPath = curved ? smoothPath(points) : linePath(points);
  const fillPath = area ? areaPath(points, baselineY, curved) : '';
  const topFill = areaTopColor || withAlpha(color, 0.188);
  const botFill = areaBottomColor || withAlpha(color, 0.02);
  const tickVals = ticks(min, max, sections);

  return (
    <View style={{ width, height, backgroundColor, overflow: 'hidden' }} pointerEvents="none">
      <Svg width={width} height={height}>
        {area && (
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={topFill} />
              <Stop offset="1" stopColor={botFill} />
            </LinearGradient>
          </Defs>
        )}

        {/* Horizontal rules + y-axis labels */}
        {tickVals.map((tv, i) => {
          const y = baselineY - (box.height * i) / sections;
          return (
            <React.Fragment key={`rule-${i}`}>
              <Line
                x1={box.left}
                y1={y}
                x2={box.left + box.width}
                y2={y}
                stroke={rulesColor}
                strokeWidth={1}
                strokeDasharray="3 4"
                opacity={0.5}
              />
              <SvgText
                x={box.left - 6}
                y={y + 3}
                fontSize={9}
                fill={labelColor}
                textAnchor="end"
              >
                {`${formatTick(tv, span)}${yAxisSuffix}`}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Baseline axis line */}
        <Line
          x1={box.left}
          y1={baselineY}
          x2={box.left + box.width}
          y2={baselineY}
          stroke={axisColor}
          strokeWidth={1}
        />

        {area && fillPath ? <Path d={fillPath} fill={`url(#${gradId})`} /> : null}

        {/* Secondary (faint) series behind the main line */}
        {points2 ? (
          <Path
            d={curved ? smoothPath(points2) : linePath(points2)}
            stroke={color2}
            strokeWidth={thickness2}
            fill="none"
          />
        ) : null}

        <Path d={mainPath} stroke={color} strokeWidth={thickness} fill="none" />

        {showDots && points.map((p, i) => (
          <Circle key={`dot-${i}`} cx={p.x} cy={p.y} r={dotRadius} fill={color} />
        ))}

        {/* X-axis labels */}
        {hasXLabels && data.map((d, i) => {
          if (!d.label || !points[i]) return null;
          // Keep the first and last labels inside the box edges.
          const anchor = i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle';
          return (
            <SvgText
              key={`xl-${i}`}
              x={points[i].x}
              y={height - 4}
              fontSize={9}
              fill={labelColor}
              textAnchor={anchor}
            >
              {d.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
