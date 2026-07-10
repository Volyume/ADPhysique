// Sparkline, tiny inline chart for at-a-glance trend display.
//
// Just the curve: no axes, labels, grid or interaction. Perfect inside
// cards where the user wants to see "is this going up or down" without
// leaving the screen for a full chart view. Drawn with react-native-svg
// (the same engine as the full charts, VolyumeChart).
//
// Usage:
//   <Sparkline data={[80.1, 80.3, 80.0, 79.8, 79.9, 79.5, 79.7]} />
//   <Sparkline data={values} width={120} height={32} color={colors.success} />
//
// All values must be numeric. Nulls/undefined are filtered out so the
// line doesn't break across a missing reading.

import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import useTheme from '../hooks/useTheme';
import { plotPoints, smoothPath, paddedDomain } from '../lib/chartGeometry';

export default function Sparkline({
  data = [],
  width = 100,
  height = 28,
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): this was
  // a default parameter reading the frozen module `colors` singleton
  // (already call-time-evaluated, but only reflects a theme change if
  // something re-renders this component after a cold-boot re-bake). Default
  // removed; resolved below against the live `t` from useTheme() so an
  // omitted prop tracks a live theme flip, same pattern as VolyumeChart.js.
  color,
  showDots = false,
}) {
  const t = useTheme();
  const resolvedColor = color ?? t.colors.primary;
  const values = useMemo(
    () => (data || []).filter(v => Number.isFinite(v)),
    [data],
  );

  const points = useMemo(() => {
    if (values.length < 2) return [];
    const { min, max } = paddedDomain(values, 0.12);
    // Small top/bottom inset so the curve doesn't clip against the edges.
    const box = { left: 1, top: 2, width: width - 2, height: height - 4 };
    return plotPoints(values, box, min, max);
  }, [values, width, height]);

  if (points.length < 2) {
    // Not enough data, render a flat placeholder line at the midpoint
    // so the card layout doesn't jump when more data arrives.
    return (
      <View style={{
        width, height,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.border,
        opacity: 0.3,
      }} />
    );
  }

  return (
    <View style={{ width, height, overflow: 'hidden' }} pointerEvents="none">
      <Svg width={width} height={height}>
        <Path d={smoothPath(points)} stroke={resolvedColor} strokeWidth={1.5} fill="none" />
        {showDots && points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={2} fill={resolvedColor} />
        ))}
      </Svg>
    </View>
  );
}
