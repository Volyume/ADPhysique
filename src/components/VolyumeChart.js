// VolyumeChart, the app's single line/area chart (COMP-019 Stage 1b).
//
// Renders through the hand-rolled SVG engine (react-native-svg + the
// unit-tested maths in ../lib/chartGeometry). On top of that static render it
// adds a tap-and-hold scrub: long-press (300ms) shows a crosshair + tooltip,
// dragging snaps to the nearest point with a selection haptic per point
// (haptics.selection() already no-ops under Reduce Motion, the off-switch the
// proposal requires). No pinch/pan (evidence: windowing > scrubbing > zoom).
//
// With `interactive={false}` (the default) it is a plain static chart, this is
// what the body-metrics, weight-trend and other non-scrub hosts use, so the app
// keeps ONE line-chart engine. (It superseded the old standalone SvgLineChart,
// now removed.)
//
// IMPLEMENTATION NOTE: the COMP-019 blueprint proposed redrawing the line in
// Skia. The chart is static during a scrub (only the crosshair + tooltip move),
// so Skia buys no user-visible benefit for snap-to-point scrubbing while adding
// font/canvas complexity; rendering through the existing SVG engine keeps a
// single chart engine and is the lower-risk path. The interaction (windows,
// scrub, haptics, a11y) is identical to the spec. Swappable to Skia later behind
// this same API if the founder wants UI-thread scrub smoothness.
//
// Data shape: [{ value:number, label?:string }]; pass
// `data2` for a faint secondary series (e.g. raw behind a smoothed trend).
// `interactive` enables the scrub; `formatTooltip(index) => { title, sub }` lets
// the host phrase the tooltip from its own (dated) data. `highlightIndices`
// (line variant only) marks personal-best points with a small gold ring, and
// folds "Personal best" into the scrub announcement for a marked point.

import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import Svg, {
  Path, Line, Circle, Rect, Text as SvgText, Defs, LinearGradient, Stop,
} from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { colors as theme, withAlpha, alpha, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import {
  plotPoints, linePath, smoothPath, areaPath, ticks, paddedDomain, nearestPointIndex,
} from '../lib/chartGeometry';
import * as haptics from '../lib/haptics';

function formatTick(value, span) {
  if (span <= 4) return (Math.round(value * 10) / 10).toString();
  return Math.round(value).toString();
}

export default function VolyumeChart({
  data = [],
  data2 = null,
  width = 300,
  height = 120,
  // CP-10 stage 4 (theming, Skia/chart consumers, 2026-07-10): these five
  // colour props were default PARAMETERS reading the frozen module `theme`
  // singleton (already call-time-evaluated, CP-10 plan section 1.4 class 3,
  // but only reflects a theme change if something re-renders this component
  // AFTER a cold-boot re-bake). Defaults removed here; each is resolved
  // below against the live `t` from useTheme() so an omitted prop tracks a
  // live theme flip, same pattern as TextField.js's resolvedPlaceholderColor.
  color,
  color2,
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
  axisColor,
  rulesColor,
  labelColor,
  backgroundColor = 'transparent',
  interactive = false,
  formatTooltip = null,
  accessibilityLabel,
  // COMP-019 Stage 1b bar variant. variant='bar' renders compact bars (no axes)
  // with per-bar colour from data[i].color; scrub dims the non-active bars and
  // reports the active index via onScrubIndex so a host with no tooltip room
  // (e.g. the 24px per-muscle volume rows) can show the value in its own layout.
  variant = 'line',
  barWidth = null,
  barGap = 2,
  onScrubIndex = null,
  // CP-5 (scorecard): indices into `data` (line variant only) that earned a
  // personal best. Rendered as a small ring-and-dot marker in the gold trophy
  // token (matching the app's existing PR iconography, e.g. ExerciseDetailScreen's
  // "Personal bests" card) and folded into the scrub announcement ("Personal
  // best") where the chart already speaks the scrubbed point. No celebratory
  // copy beyond that: training-performance data, not weight/body, so no
  // ED-suppression gating applies (ED-safety note, CP-5).
  highlightIndices = null,
}) {
  const t = useTheme();
  // CP-10 stage 4: an explicit prop always wins; an omitted prop falls back
  // to the LIVE theme (t.colors.*) instead of the frozen module `theme`
  // singleton, so it tracks a theme flip once this component re-renders.
  const resolvedColor = color ?? t.colors.primary;
  const resolvedColor2 = color2 ?? withAlpha(t.colors.textMuted, alpha.strong);
  const resolvedAxisColor = axisColor ?? t.colors.border;
  const resolvedRulesColor = rulesColor ?? t.colors.border;
  const resolvedLabelColor = labelColor ?? t.colors.textMuted;
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const isBar = variant === 'bar';
  const gradId = useRef(`volyumeFill${Math.random().toString(36).slice(2, 9)}`).current;
  const [activeIndex, setActiveIndex] = useState(-1);
  const activeRef = useRef(-1);

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

  // Bar layout (variant='bar'): 0-based heights, left-aligned, fixed or
  // distributed width. Independent of the line `box`/padded domain.
  const barMax = Math.max(...values, 1);
  const barW = isBar
    ? (barWidth ?? (values.length > 0 ? Math.max(1, (width - barGap * (values.length - 1)) / values.length) : 1))
    : 0;
  const bars = isBar ? values.map((v, i) => {
    const h = v <= 0 ? 2 : Math.max(2, Math.round((v / barMax) * (height - 2)));
    const x = i * (barW + barGap);
    return { x, y: height - h, w: barW, h, cx: x + barW / 2, color: data[i]?.color || resolvedColor };
  }) : [];

  const points = isBar
    ? bars.map(b => ({ x: b.cx, y: b.y }))
    : (values.length >= 2 ? plotPoints(values, box, min, max) : []);

  function scrubTo(touchX) {
    if (!points.length) return;
    const idx = nearestPointIndex(points, touchX);
    if (idx !== activeRef.current) {
      activeRef.current = idx;
      setActiveIndex(idx);
      haptics.selection();
      if (onScrubIndex) onScrubIndex(idx);
      if (formatTooltip) {
        // CP-10 stage 4: renamed from `t` to `tt` -- `t` now names the live
        // theme object (`const t = useTheme()`) in this component's scope,
        // and this local would otherwise shadow it. No behaviour change.
        const tt = formatTooltip(idx);
        if (tt) {
          const isPR = Array.isArray(highlightIndices) && highlightIndices.includes(idx);
          const announcement = `${tt.title}${tt.sub ? `, ${tt.sub}` : ''}${isPR ? ', Personal best' : ''}`;
          AccessibilityInfo.announceForAccessibility(announcement);
        }
      }
    }
  }
  function endScrub() {
    activeRef.current = -1;
    setActiveIndex(-1);
    if (onScrubIndex) onScrubIndex(null);
  }

  // Keep the latest scrub handlers in a ref so the (stable) gesture always calls
  // the CURRENT closure, never a stale `points`/`formatTooltip` captured when
  // the gesture was first built. Assigning in render is the standard latest-ref
  // pattern; it makes the gesture immune to data changes that leave point count
  // and domain unchanged (e.g. an in-place weight edit within the same range).
  const handlersRef = useRef({ scrub: scrubTo, end: endScrub });
  handlersRef.current.scrub = scrubTo;
  handlersRef.current.end = endScrub;

  // Long-press-then-drag so a quick swipe still scrolls the page; only a
  // deliberate hold begins a scrub. Stable (deps []), freshness via the ref.
  const pan = useMemo(() => {
    const onScrub = (x) => handlersRef.current.scrub(x);
    const onEnd = () => handlersRef.current.end();
    return Gesture.Pan()
      .activateAfterLongPress(300)
      .onBegin((e) => { runOnJS(onScrub)(e.x); })
      .onUpdate((e) => { runOnJS(onScrub)(e.x); })
      .onFinalize(() => { runOnJS(onEnd)(); });
  }, []);

  if (values.length < 2) return null;

  // Bar variant render: compact bars, the non-active bars dim while scrubbing.
  // No axes and no overlay tooltip (the host shows the value via onScrubIndex).
  if (isBar) {
    const barChart = (
      <View
        style={{ width, height, backgroundColor }}
        pointerEvents={interactive ? 'auto' : 'none'}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={interactive ? 'Touch and hold, then drag to read each bar.' : undefined}
      >
        <Svg width={width} height={height}>
          {bars.map((b, i) => (
            <Rect
              key={`bar-${i}`}
              x={b.x} y={b.y} width={b.w} height={b.h} rx={2}
              fill={b.color}
              // Bound by bars.length so a stale index (e.g. after the window
              // narrows) dims nothing rather than every bar.
              opacity={activeIndex >= 0 && activeIndex < bars.length && activeIndex !== i ? 0.4 : 1}
            />
          ))}
        </Svg>
      </View>
    );
    if (!interactive) return barChart;
    return <GestureDetector gesture={pan}>{barChart}</GestureDetector>;
  }

  const points2 = values2.length >= 2 ? plotPoints(values2, box, min, max) : null;
  const mainPath = curved ? smoothPath(points) : linePath(points);
  const fillPath = area ? areaPath(points, baselineY, curved) : '';
  const topFill = areaTopColor || withAlpha(resolvedColor, 0.188);
  const botFill = areaBottomColor || withAlpha(resolvedColor, 0.02);
  const tickVals = ticks(min, max, sections);

  const active = activeIndex >= 0 && activeIndex < points.length ? points[activeIndex] : null;
  const tip = active && formatTooltip ? formatTooltip(activeIndex) : null;
  const TIP_W = 132;
  const tipLeft = active ? Math.max(0, Math.min(width - TIP_W, active.x - TIP_W / 2)) : 0;

  const chart = (
    <View
      style={{ width, height, backgroundColor, overflow: 'hidden' }}
      pointerEvents={interactive ? 'auto' : 'none'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={interactive ? 'Touch and hold the chart, then drag to read each point.' : undefined}
    >
      <Svg width={width} height={height}>
        {area && (
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={topFill} />
              <Stop offset="1" stopColor={botFill} />
            </LinearGradient>
          </Defs>
        )}

        {tickVals.map((tv, i) => {
          const y = baselineY - (box.height * i) / sections;
          return (
            <React.Fragment key={`rule-${i}`}>
              <Line x1={box.left} y1={y} x2={box.left + box.width} y2={y}
                stroke={resolvedRulesColor} strokeWidth={1} strokeDasharray="3 4" />
              <SvgText x={box.left - 6} y={y + 3} fontSize={9} fill={resolvedLabelColor} textAnchor="end">
                {`${formatTick(tv, span)}${yAxisSuffix}`}
              </SvgText>
            </React.Fragment>
          );
        })}

        <Line x1={box.left} y1={baselineY} x2={box.left + box.width} y2={baselineY}
          stroke={resolvedAxisColor} strokeWidth={1} />

        {area && fillPath ? <Path d={fillPath} fill={`url(#${gradId})`} /> : null}

        {points2 ? (
          <Path d={curved ? smoothPath(points2) : linePath(points2)}
            stroke={resolvedColor2} strokeWidth={thickness2} fill="none" />
        ) : null}

        <Path d={mainPath} stroke={resolvedColor} strokeWidth={thickness} fill="none" />

        {showDots && points.map((p, i) => (
          <Circle key={`dot-${i}`} cx={p.x} cy={p.y} r={dotRadius} fill={resolvedColor} />
        ))}

        {/* CP-5 personal-best markers: a ring-and-dot in the gold trophy token,
            bounded by points.length so a stale index (e.g. a narrower window)
            marks nothing rather than the wrong point. */}
        {Array.isArray(highlightIndices) && highlightIndices.map((idx) => {
          const p = idx >= 0 && idx < points.length ? points[idx] : null;
          if (!p) return null;
          return (
            <React.Fragment key={`pr-${idx}`}>
              <Circle cx={p.x} cy={p.y} r={5} fill="none" stroke={t.colors.gold} strokeWidth={1.5} />
              <Circle cx={p.x} cy={p.y} r={1.5} fill={t.colors.gold} />
            </React.Fragment>
          );
        })}

        {/* Scrub crosshair + active point */}
        {active ? (
          <>
            <Line x1={active.x} y1={box.top} x2={active.x} y2={baselineY}
              stroke={resolvedColor} strokeWidth={1} strokeDasharray="2 3" opacity={0.7} />
            <Circle cx={active.x} cy={active.y} r={4} fill={resolvedColor} stroke={t.colors.surface} strokeWidth={1.5} />
          </>
        ) : null}

        {hasXLabels && data.map((d, i) => {
          if (!d.label || !points[i]) return null;
          const anchor = i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle';
          return (
            <SvgText key={`xl-${i}`} x={points[i].x} y={height - 4} fontSize={9}
              fill={resolvedLabelColor} textAnchor={anchor}>
              {d.label}
            </SvgText>
          );
        })}
      </Svg>

      {/* Tooltip card (RN overlay, easier to style than SVG text) */}
      {tip ? (
        <View style={[styles.tooltip, live.tooltip, { left: tipLeft, width: TIP_W }]} pointerEvents="none">
          <Text maxFontSizeMultiplier={1.3} style={[styles.tooltipTitle, live.tooltipTitle]} numberOfLines={1}>{tip.title}</Text>
          {tip.sub ? <Text maxFontSizeMultiplier={1.3} style={[styles.tooltipSub, live.tooltipSub]} numberOfLines={1}>{tip.sub}</Text> : null}
        </View>
      ) : null}
    </View>
  );

  if (!interactive) return chart;
  return <GestureDetector gesture={pan}>{chart}</GestureDetector>;
}

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    top: 2,
    backgroundColor: theme.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tooltipTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: theme.textPrimary },
  tooltipSub: { ...type.caption, color: theme.textSecondary },
});

// CP-10 stage 4 (theming, Skia/chart consumers, 2026-07-10): live override
// for the tooltip chrome above, same "frozen base + live override" pattern
// as WorkoutSummaryScreen.js's buildLiveStyles -- the component calls
// `const t = useTheme(); const live = buildLiveStyles(t);` and appends
// `live.KEY` after `styles.KEY` in each style array. Only mirrors the
// colour/fontSize sub-properties of the matching frozen style, at identical
// rest values; fontWeight is theme-invariant (not part of useTheme()'s
// returned `t`), so tooltipTitle's fontWeight.bold stays the static import,
// untouched.
function buildLiveStyles(t) {
  return {
    tooltip: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    tooltipTitle: { fontSize: t.fontSize.sm, color: t.colors.textPrimary },
    tooltipSub: { ...t.type.caption, color: t.colors.textSecondary },
  };
}
