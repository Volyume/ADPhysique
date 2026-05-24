// Sparkline — tiny inline chart for at-a-glance trend display.
//
// Wraps react-native-gifted-charts' LineChart with zero axes / labels /
// grid / interaction. Just the curve. Perfect for inside cards where
// the user wants to see "is this going up or down" without leaving
// the screen for a full chart view.
//
// Usage:
//   <Sparkline data={[80.1, 80.3, 80.0, 79.8, 79.9, 79.5, 79.7]} />
//   <Sparkline data={values} width={120} height={32} color={colors.success} />
//
// All values must be numeric. Nulls/undefined are filtered out
// (otherwise gifted-charts skips the segment and the line looks broken).

import React, { useMemo } from 'react';
import { View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { colors } from '../styles/theme';

export default function Sparkline({
  data = [],
  width = 100,
  height = 28,
  color = colors.primary,
  showDots = false,
}) {
  // Filter + map to gifted-charts shape. Returns null if there isn't
  // enough data to draw a line — caller renders the empty equivalent.
  const points = useMemo(() => (data || [])
    .filter(v => Number.isFinite(v))
    .map(v => ({ value: v })),
    [data]);

  if (points.length < 2) {
    // Not enough data — render a flat placeholder line at the midpoint
    // so the card layout doesn't jump when more data arrives.
    return (
      <View style={{
        width, height,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        opacity: 0.3,
      }} />
    );
  }

  return (
    <View style={{ width, height, overflow: 'hidden' }} pointerEvents="none">
      <LineChart
        data={points}
        width={width}
        height={height}
        // Strip every chart-chrome element so it's just a curve.
        hideDataPoints={!showDots}
        hideAxesAndRules
        hideYAxisText
        xAxisLabelsHeight={0}
        xAxisColor="transparent"
        yAxisColor="transparent"
        initialSpacing={0}
        endSpacing={0}
        spacing={Math.max(1, (width - 2) / Math.max(1, points.length - 1))}
        thickness={1.5}
        color={color}
        curved
        // Tight padding so the curve fills the box
        adjustToWidth
        disableScroll
        // No animation by default — sparklines are at-a-glance reads,
        // not animated reveals.
        isAnimated={false}
      />
    </View>
  );
}
