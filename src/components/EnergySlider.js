/**
 * EnergySlider -- D226 (founder decision 2026-10-12): a horizontal drag
 * control for the daily energy target, inside the estimated range.
 *
 * Built the same way as share/LookStrengthSlider (react-native-gesture-handler,
 * no new dependency), generalised from 0-100% to `min`..`max` kcal in `step`s.
 *
 * Dragging reports the live value (`onValueChange`, cheap: the caller repaints
 * a number; `onDragEnd` fires when the gesture ends however it ends, so a
 * cancelled drag can drop its preview). The caller learns the FINAL value once per gesture
 * (`onSlidingComplete`: on release, on a tap that jumps to a position, or on
 * an accessibility action), so saving and the plan review happen once per
 * release, never once per frame.
 *
 * Values are always kcal; the caller formats for display (kcal or kJ) through
 * `formatValue` / `unitWord`, so the person's energy unit is respected in the
 * spoken value too. The bounds are the caller's (energyChoice.js owns every
 * floor); this component only clamps to them and never widens them.
 *
 * The gesture path is not exercised by mounting in Jest (the gesture-handler
 * mock has no gesture engine); the accessibility actions are plain callbacks
 * and are covered.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, spacing, radius } from '../styles/theme';
import useTheme from '../hooks/useTheme';

function snap(n, min, max, step) {
  if (!Number.isFinite(n)) return min;
  const s = step > 0 ? step : 1;
  const stepped = min + Math.round((n - min) / s) * s;
  return Math.min(max, Math.max(min, stepped));
}

export default function EnergySlider({
  value,
  min,
  max,
  step = 25,
  onValueChange,
  onSlidingComplete,
  onDragEnd,
  formatValue = (kcal) => String(kcal),
  unitWord = 'kilocalories',
  accessibilityLabel = 'Daily energy target',
}) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const widthRef = useRef(0);
  // Non-null only while a drag is in progress, so the thumb tracks the finger.
  const [dragValue, setDragValue] = useState(null);
  const span = max - min;

  const valueFromX = useCallback((x) => {
    const w = widthRef.current;
    if (!w || !(span > 0)) return snap(value, min, max, step);
    return snap(min + (x / w) * span, min, max, step);
  }, [value, min, max, step, span]);

  const gesture = useMemo(() => {
    // runOnJS(true): gesture callbacks set React state, so they must not run
    // on the UI thread (same as LookStrengthSlider).
    const pan = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-10, 10])
      .failOffsetY([-12, 12])
      .onUpdate((e) => {
        const v = valueFromX(e.x);
        setDragValue(v);
        if (onValueChange) onValueChange(v);
      })
      .onEnd((e, success) => {
        if (!success) return;
        if (onSlidingComplete) onSlidingComplete(valueFromX(e.x));
      })
      .onFinalize(() => { setDragValue(null); if (onDragEnd) onDragEnd(); });
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDuration(250)
      .onEnd((e, success) => {
        if (!success) return;
        const v = valueFromX(e.x);
        if (onValueChange) onValueChange(v);
        if (onSlidingComplete) onSlidingComplete(v);
      });
    return Gesture.Race(pan, tap);
  }, [valueFromX, onValueChange, onSlidingComplete, onDragEnd]);

  const shown = dragValue != null ? dragValue : snap(value, min, max, step);
  const pct = span > 0 ? Math.min(100, Math.max(0, ((shown - min) / span) * 100)) : 0;

  const nudge = useCallback((dir) => {
    const next = snap(snap(value, min, max, step) + dir * step, min, max, step);
    if (onValueChange) onValueChange(next);
    if (onSlidingComplete) onSlidingComplete(next);
  }, [value, min, max, step, onValueChange, onSlidingComplete]);

  const spoken = `${formatValue(shown)} ${unitWord}, between ${formatValue(min)} and ${formatValue(max)}`;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: shown, text: spoken }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const name = e?.nativeEvent?.actionName;
        if (name === 'increment') nudge(1);
        else if (name === 'decrement') nudge(-1);
      }}
    >
      <GestureDetector gesture={gesture}>
        <View
          style={styles.hit}
          onLayout={(e) => { widthRef.current = e.nativeEvent.layout.width; }}
        >
          <View style={[styles.base, live.base]} />
          <View style={[styles.fill, live.fill, { width: `${pct}%` }]} />
          <View style={[styles.thumb, live.thumb, { left: `${pct}%` }]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', paddingVertical: spacing.xs },
  // 44pt tall so the whole row is a comfortable target at any text size.
  hit: { height: 44, justifyContent: 'center' },
  base: { height: 4, borderRadius: radius.hair, backgroundColor: colors.surface3 },
  fill: {
    position: 'absolute', left: 0, height: 4, borderRadius: radius.hair,
    backgroundColor: colors.primaryFill,
  },
  thumb: {
    position: 'absolute', width: 20, height: 20, marginLeft: -10,
    borderRadius: radius.full, backgroundColor: colors.primaryFill,
  },
});

// Frozen-plus-live pattern: layout above, every colour re-read from the live
// theme here.
function buildLiveStyles(t) {
  return {
    base: { backgroundColor: t.colors.surface3 },
    fill: { backgroundColor: t.colors.primaryFill },
    thumb: { backgroundColor: t.colors.primaryFill },
  };
}
