/**
 * LookStrengthSlider — a horizontal 0-100% drag control for how strongly a
 * photo look applies to the share image (founder, 2026-09-27: "Almost even
 * the option to up and down the filter").
 *
 * Dragging shows the live position immediately (`onValueChange`, cheap: a
 * label repaint, nothing else). The caller only learns the FINAL value once
 * -- on release, on a tap that jumps straight to a position, or on a
 * discrete accessibility action (`onSlidingComplete`) -- so the photo it is
 * applied to is re-processed once per gesture, never once per frame.
 *
 * Built on react-native-gesture-handler, which the share screen already
 * depends on, rather than a new slider package (no dependency added). A Pan
 * (drag) and a Tap (jump-to-position) race each other: Pan only activates
 * past a small horizontal offset and fails once the touch moves mostly
 * vertically, so a drag here can never fight the page's own vertical
 * scroll; a stationary press resolves through Tap instead. Both report
 * failure (a scroll that merely passed over the track) as no-ops -- neither
 * previews nor commits a value.
 *
 * The gesture path is not exercised by mounting in Jest: this repo's
 * react-native-gesture-handler has no JS gesture engine in the node test
 * env (every builder method is a no-op stub -- see
 * __mocks__/react-native-gesture-handler.js). The accessibility actions
 * below are plain callback props, not gesture-driven, and ARE covered.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, spacing, radius } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

function clampPct(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export default function LookStrengthSlider({
  value,
  onValueChange,
  onSlidingComplete,
  accessibilityLabel = 'Look strength',
}) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const widthRef = useRef(0);
  // Non-null only while an actual drag is in progress, so the thumb tracks
  // the finger; null the rest of the time, when the committed `value` prop
  // is what is shown.
  const [dragPct, setDragPct] = useState(null);

  const pctFromX = useCallback((x) => {
    const w = widthRef.current;
    if (!w) return clampPct(value);
    return clampPct((x / w) * 100);
  }, [value]);

  const gesture = useMemo(() => {
    // runOnJS(true): with Reanimated installed, gesture callbacks run on the
    // UI thread unless told otherwise, and these set React state, which
    // would throw there (the app's other gestures hop back with runOnJS).
    const pan = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-10, 10])
      .failOffsetY([-12, 12])
      .onUpdate((e) => {
        const p = pctFromX(e.x);
        setDragPct(p);
        if (onValueChange) onValueChange(p);
      })
      .onEnd((e, success) => {
        if (!success) return;
        if (onSlidingComplete) onSlidingComplete(pctFromX(e.x));
      })
      .onFinalize(() => setDragPct(null));
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDuration(250)
      .onEnd((e, success) => {
        if (!success) return;
        const p = pctFromX(e.x);
        if (onValueChange) onValueChange(p);
        if (onSlidingComplete) onSlidingComplete(p);
      });
    return Gesture.Race(pan, tap);
  }, [pctFromX, onValueChange, onSlidingComplete]);

  const shown = dragPct != null ? dragPct : clampPct(value);

  const step = useCallback((dir) => {
    const next = clampPct(clampPct(value) + dir * 10);
    if (onValueChange) onValueChange(next);
    if (onSlidingComplete) onSlidingComplete(next);
  }, [value, onValueChange, onSlidingComplete]);

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: shown }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const name = e?.nativeEvent?.actionName;
        if (name === 'increment') step(1);
        else if (name === 'decrement') step(-1);
      }}
    >
      <GestureDetector gesture={gesture}>
        <View
          style={styles.hit}
          onLayout={(e) => { widthRef.current = e.nativeEvent.layout.width; }}
        >
          <View style={[styles.base, live.base]} />
          <View style={[styles.fill, live.fill, { width: `${shown}%` }]} />
          <View style={[styles.thumb, live.thumb, { left: `${shown}%` }]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.xs },
  hit: { height: 28, justifyContent: 'center' },
  base: { height: 4, borderRadius: radius.hair, backgroundColor: colors.surface3 },
  // The same track, fill and handle as the app's photo compare slider
  // (ProgressPhotoCompare): the bright brand amber is the fill on both
  // themes, and the handle is the same size.
  fill: {
    position: 'absolute', left: 0, height: 4, borderRadius: radius.hair,
    backgroundColor: colors.primaryFill,
  },
  thumb: {
    position: 'absolute', width: 17, height: 17, marginLeft: -8.5,
    borderRadius: radius.full, backgroundColor: colors.primaryFill,
  },
});

// Frozen-plus-live pattern (ShareCardScreen.buildLiveStyles precedent): the
// frozen block above holds layout only, and every colour token is re-read
// from the live theme here.
function buildLiveStyles(t) {
  return {
    base: { backgroundColor: t.colors.surface3 },
    fill: { backgroundColor: t.colors.primaryFill },
    thumb: { backgroundColor: t.colors.primaryFill },
  };
}
