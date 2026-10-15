/**
 * TrimBar: the clip's 15 second window on a strip of its frames (D229;
 * the UX research's 6.5). A handle at each end shortens the window, the
 * window itself slides along the clip, and a thin playhead moves as the
 * clip plays. Dragging a handle or the window scrubs: the parent shows
 * that frame (`onPreview`), and on release plays again from the window's
 * start (`onChange`). The window is never longer than `maxWindowMs` and
 * never shorter than `minWindowMs`; one haptic tick when a handle meets a
 * limit or the clip's end. Screen readers get an adjustable control that
 * moves the window a second at a time.
 *
 * Thumbnails are the parent's (clipThumbnails.js), drawn on one Skia
 * canvas; without them the strip is the card's ground.
 */
import { useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { Canvas, Image as SkiaImage } from '@shopify/react-native-skia';
import Text from '../Text';
import { colors, radius, spacing, fontFamily, fontSize, withAlpha } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import { CARD_GROUND } from '../../lib/shareCard/drawShareCard';
import { selection } from '../../lib/haptics';

export const TRIM_BAR_HEIGHT = 44;
const HANDLE_W = 12;
const PREVIEW_EVERY_MS = 80;

/** "0:12" for 12,400 ms. Pure. */
export function mmss(ms) {
  const s = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The next window after a handle or body move, clamped to the clip and
 * to the length limits. Pure, shared by the gestures and the accessible
 * route. `which` is 'start', 'end' or 'body'; `deltaMs` is the move.
 * Workletised: the pan gestures call it on the UI thread (the VOLYUME-2A
 * class, workletClosure.guard). */
export function moveWindow({ startMs, endMs, durationMs, maxWindowMs, minWindowMs }, which, deltaMs) {
  'worklet';

  const dur = Math.max(0, durationMs);
  if (which === 'body') {
    const len = endMs - startMs;
    let s = startMs + deltaMs;
    s = Math.max(0, Math.min(dur - len, s));
    return { startMs: s, endMs: s + len, atLimit: s === 0 || s === dur - len };
  }
  if (which === 'start') {
    let s = startMs + deltaMs;
    const lo = Math.max(0, endMs - maxWindowMs);
    const hi = endMs - minWindowMs;
    s = Math.max(lo, Math.min(hi, s));
    return { startMs: s, endMs, atLimit: s === lo || s === hi };
  }
  let e = endMs + deltaMs;
  const lo = startMs + minWindowMs;
  const hi = Math.min(dur, startMs + maxWindowMs);
  e = Math.max(lo, Math.min(hi, e));
  return { startMs, endMs: e, atLimit: e === lo || e === hi };
}

function tick() { selection(); }

export default function TrimBar({
  width,
  durationMs,
  startMs,
  endMs,
  maxWindowMs = 15000,
  minWindowMs = 1000,
  thumbnails = null,
  currentTime = null,
  onPreview,
  onChange,
  onInteractStart,
  onInteractEnd,
}) {
  const pxPerMs = durationMs > 0 ? width / durationMs : 0;
  const winStart = useSharedValue(startMs * pxPerMs);
  const winEnd = useSharedValue(endMs * pxPerMs);
  const savedStart = useSharedValue(0);
  const savedEnd = useSharedValue(0);
  const lastPreview = useSharedValue(0);
  const limitHeld = useSharedValue(false);

  useEffect(() => {
    winStart.value = startMs * pxPerMs;
    winEnd.value = endMs * pxPerMs;
  }, [startMs, endMs, pxPerMs, winStart, winEnd]);

  const preview = useCallback((ms) => { onPreview?.(ms); }, [onPreview]);
  const commit = useCallback((s, e) => { onChange?.({ startMs: Math.round(s), endMs: Math.round(e) }); onInteractEnd?.(); }, [onChange, onInteractEnd]);
  const began = useCallback(() => { onInteractStart?.(); }, [onInteractStart]);

  const limits = useMemo(() => ({ durationMs, maxWindowMs, minWindowMs }), [durationMs, maxWindowMs, minWindowMs]);

  // A handle is 12 dp wide on the strip but a full thumb wide to the finger
  // (the pan's own hit slop; the window's body keeps its own extent).
  const makePan = useCallback((which) => (which === 'body' ? Gesture.Pan() : Gesture.Pan().hitSlop({ horizontal: (touchTarget.minimum - HANDLE_W) / 2, vertical: spacing.xs }))
    .onStart(() => {
      'worklet';
      savedStart.value = winStart.value;
      savedEnd.value = winEnd.value;
      limitHeld.value = false;
      runOnJS(began)();
    })
    .onUpdate((e) => {
      'worklet';
      if (pxPerMs <= 0) return;
      const deltaMs = e.translationX / pxPerMs;
      const next = moveWindow({
        startMs: savedStart.value / pxPerMs,
        endMs: savedEnd.value / pxPerMs,
        durationMs: limits.durationMs,
        maxWindowMs: limits.maxWindowMs,
        minWindowMs: limits.minWindowMs,
      }, which, deltaMs);
      winStart.value = next.startMs * pxPerMs;
      winEnd.value = next.endMs * pxPerMs;
      if (next.atLimit && !limitHeld.value) { limitHeld.value = true; runOnJS(tick)(); }
      if (!next.atLimit) limitHeld.value = false;
      const now = Date.now();
      if (now - lastPreview.value >= PREVIEW_EVERY_MS) {
        lastPreview.value = now;
        runOnJS(preview)(which === 'end' ? next.endMs : next.startMs);
      }
    })
    .onEnd(() => {
      'worklet';
      if (pxPerMs <= 0) return;
      runOnJS(commit)(winStart.value / pxPerMs, winEnd.value / pxPerMs);
    }), [pxPerMs, limits, began, preview, commit, savedStart, savedEnd, winStart, winEnd, lastPreview, limitHeld]);

  const panStart = useMemo(() => makePan('start'), [makePan]);
  const panEnd = useMemo(() => makePan('end'), [makePan]);
  const panBody = useMemo(() => makePan('body'), [makePan]);

  const windowStyle = useAnimatedStyle(() => ({ left: winStart.value, width: Math.max(0, winEnd.value - winStart.value) }));
  const playheadStyle = useAnimatedStyle(() => ({
    left: currentTime ? Math.max(winStart.value, Math.min(winEnd.value, currentTime.value * pxPerMs)) : winStart.value,
  }));

  const nudge = useCallback((action) => {
    const delta = action === 'increment' ? 1000 : action === 'decrement' ? -1000 : 0;
    if (!delta) return;
    const next = moveWindow({ startMs, endMs, ...limits }, 'body', delta);
    commit(next.startMs, next.endMs);
  }, [startMs, endMs, limits, commit]);

  const thumbs = thumbnails?.images?.length ? thumbnails : null;
  const thumbW = thumbs ? width / thumbs.images.length : 0;

  return (
    <View
      style={[styles.bar, { width }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`Video window, from ${mmss(startMs)} to ${mmss(endMs)}`}
      accessibilityHint="Moves the window a second at a time."
      accessibilityActions={[{ name: 'increment', label: 'Later' }, { name: 'decrement', label: 'Earlier' }]}
      onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName)}
    >
      {thumbs ? (
        <Canvas style={{ width, height: TRIM_BAR_HEIGHT }} pointerEvents="none">
          {thumbs.images.map((img, i) => (
            <SkiaImage
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              image={img}
              x={i * thumbW}
              y={0}
              width={thumbW}
              height={TRIM_BAR_HEIGHT}
              fit="cover"
            />
          ))}
        </Canvas>
      ) : null}
      <GestureDetector gesture={panBody}>
        <Animated.View style={[styles.window, windowStyle]}>
          <GestureDetector gesture={panStart}>
            <View style={[styles.handle, styles.handleLeft]} accessibilityElementsHidden />
          </GestureDetector>
          <GestureDetector gesture={panEnd}>
            <View style={[styles.handle, styles.handleRight]} accessibilityElementsHidden />
          </GestureDetector>
        </Animated.View>
      </GestureDetector>
      <Animated.View pointerEvents="none" style={[styles.playhead, playheadStyle]} />
      <View pointerEvents="none" style={styles.duration}>
        <Text style={styles.durationText}>{mmss(endMs - startMs)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: TRIM_BAR_HEIGHT, borderRadius: radius.md, overflow: 'hidden', backgroundColor: CARD_GROUND },
  window: {
    position: 'absolute', top: 0, bottom: 0, borderWidth: 2, borderColor: colors.primary, borderRadius: radius.sm,
  },
  handle: { position: 'absolute', top: -2, bottom: -2, width: HANDLE_W, backgroundColor: colors.primary },
  handleLeft: { left: -2, borderTopLeftRadius: radius.sm, borderBottomLeftRadius: radius.sm },
  handleRight: { right: -2, borderTopRightRadius: radius.sm, borderBottomRightRadius: radius.sm },
  playhead: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.textPrimary },
  duration: {
    position: 'absolute', right: spacing.xs, bottom: spacing.xxs, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs / 2,
    borderRadius: radius.sm, backgroundColor: withAlpha(CARD_GROUND, 0.6),
  },
  durationText: { color: colors.textPrimary, fontFamily: fontFamily.medium, fontSize: fontSize.xs, fontVariant: ['tabular-nums'] },
});
