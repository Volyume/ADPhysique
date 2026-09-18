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
//
// AX-02 (launch accessibility audit): this is decorative by default (the
// raw SVG curve carries no semantics a screen reader can use on its own).
// Pass `accessibilitySummary` (e.g. "Weight trend, falling") when a host
// wants the sparkline to read as one labelled node instead; a host that
// already speaks the trend elsewhere in its own text (the common case
// today) doesn't need to change anything.

import { Fragment, useMemo } from 'react';
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
  // Item 10 (campaign 2026-07-10, CP-5 residue): personal-best markers.
  // VolyumeChart's highlightIndices drew a small gold ring-and-dot on
  // ExerciseDetail's chart; LiftProgress's row sparkline (this component)
  // never got the same treatment. Same idiom, same token (t.colors.gold),
  // same ring/dot radii as VolyumeChart.js. Indices are into `data` as
  // passed in (pre-filter); an index whose value got filtered out (non-
  // finite) or is out of range draws nothing rather than the wrong point.
  highlightIndices = null,
  // AX-02: optional accessible name. When given, the sparkline exposes a
  // single labelled node; when omitted (the default), it stays decorative.
  accessibilitySummary,
}) {
  const t = useTheme();
  const resolvedColor = color ?? t.colors.primary;
  const values = useMemo(
    () => (data || []).filter(v => Number.isFinite(v)),
    [data],
  );

  // Maps an index into the raw `data` prop to its index in the filtered
  // `values`/`points` arrays, so a caller can pass highlightIndices sourced
  // from the same session ordering it built `data` from, without needing to
  // know whether any entries got filtered out.
  const dataIndexToPointIndex = useMemo(() => {
    const map = new Map();
    let vi = 0;
    (data || []).forEach((v, i) => {
      if (Number.isFinite(v)) { map.set(i, vi); vi += 1; }
    });
    return map;
  }, [data]);

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
      <View
        style={{
          width, height,
          borderBottomWidth: 1,
          borderBottomColor: t.colors.border,
          opacity: 0.3,
        }}
        accessible={!!accessibilitySummary}
        accessibilityLabel={accessibilitySummary}
        accessibilityElementsHidden={!accessibilitySummary}
        importantForAccessibility={accessibilitySummary ? 'auto' : 'no-hide-descendants'}
      />
    );
  }

  return (
    <View
      style={{ width, height, overflow: 'hidden' }}
      pointerEvents="none"
      // AX-02: a given summary makes this one labelled node; otherwise the
      // curve stays decorative so it never surfaces as an unlabelled node.
      // Either way the raw SVG below is separately marked decorative, since
      // its information (when there is any) is carried by this label, not
      // by the individually-unlabelled path/circle shapes.
      accessible={!!accessibilitySummary}
      accessibilityLabel={accessibilitySummary}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={width} height={height}>
          <Path d={smoothPath(points)} stroke={resolvedColor} strokeWidth={1.5} fill="none" />
          {showDots && points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={2} fill={resolvedColor} />
          ))}
          {/* Item 10: same gold ring-and-dot idiom as VolyumeChart's CP-5
              personal-best markers. */}
          {Array.isArray(highlightIndices) && highlightIndices.map((idx) => {
            const pointIdx = dataIndexToPointIndex.get(idx);
            const p = pointIdx != null && pointIdx < points.length ? points[pointIdx] : null;
            if (!p) return null;
            return (
              <Fragment key={`pr-${idx}`}>
                <Circle cx={p.x} cy={p.y} r={5} fill="none" stroke={t.colors.gold} strokeWidth={1.5} />
                <Circle cx={p.x} cy={p.y} r={1.5} fill={t.colors.gold} />
              </Fragment>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}
