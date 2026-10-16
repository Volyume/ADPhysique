/**
 * VideoTrimBar: choose which part of a video goes on the share (founder
 * orders 2026-10-16, D229 addendum 17: "There should also be the ability to
 * trim the length of the video somewhere because a 60 second video of you
 * moving about is pointless and looks stupid." and "So not just trim you
 * need to be able to select the window within the trim, much like other
 * video additions work in Instagram and such.").
 *
 * A strip of frames lays the whole video out left to right. Over it sits a
 * window of at most `maxWindowMs`: drag its middle to slide it along the
 * video (its length unchanged), or drag a handle to move its start or end.
 * A handle never comes closer than `minWindowMs` to the other, and a handle
 * dragged past the cap pushes the other one along, so the window slides
 * rather than stops and the end of a long video is reachable either way.
 *
 * Every drag runs on the UI thread with shared values; the caller learns the
 * window once, at the end of the gesture (`onChange`), rounded to 100 ms.
 * The frames come from the app's native module in ONE call (videoStripUris
 * in videoFrame.js: decoded off the JS thread, upright, written as small JPEG
 * files) and are shown as plain Images by file URI. Skia is not involved: no
 * live Skia view, and never Skia's video object (Sentry VOLYUME-3M, lead
 * ruling 2026-10-16). A `Skia` prop from an older caller is accepted and
 * ignored. The request is dropped if the bar unmounts or its video or width
 * changes before the frames arrive.
 *
 * Screen readers get the same control as actions on the bar, in 1 s steps.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import Text from '../Text';
import useTheme from '../../hooks/useTheme';
import { colors, radius, spacing, type, withAlpha } from '../../styles/theme';
import { formatClipDuration } from '../../lib/clips/rules';
import { videoStripUris } from '../../lib/shareVideo/videoFrame';

export const STRIP_HEIGHT = 56;
export const FRAME_BOX = 48;
// Each handle is drawn 24 dp wide and takes touches 10 dp beyond it on both
// sides, a 44 dp wide target the strip's 56 dp tall (render audit
// 2026-10-16, lead ruling 2; it was 20 dp with 8 dp outside, about 28 dp).
export const HANDLE_WIDTH = 24;
export const HANDLE_SLOP = 10;
const HANDLE_HIT_SLOP = { top: spacing.sm, bottom: spacing.sm, left: HANDLE_SLOP, right: HANDLE_SLOP };
const STEP_MS = 1000;

/** How many frames the strip shows for a bar `width` dp wide. */
export function stripCount(width) {
  return Math.max(6, Math.floor((Number(width) || 0) / FRAME_BOX));
}

/**
 * The one set of window rules, for the JS side and the tests. `moved` names
 * what the person moved: 'start', 'end' or the whole 'window'.
 */
export function clampWindow({ startMs, endMs, durationMs, minWindowMs = 1000, maxWindowMs = 15000, moved = 'window' }) {
  return clampWindowWorklet(startMs, endMs, durationMs, minWindowMs, maxWindowMs, moved);
}

// Worklet twin of clampWindow, called from the gesture callbacks (a plain
// helper called from a worklet is a fatal error on the new architecture:
// VOLUME-2A, SharePhotoFramer). clampWindow above only forwards to it.
function clampWindowWorklet(startMs, endMs, durationMs, minWindowMs, maxWindowMs, moved) {
  'worklet';
  const dur = Math.max(0, Number(durationMs) || 0);
  const min = Math.max(0, Math.min(Number(minWindowMs) || 0, dur));
  const max = Math.max(min, Math.min(Number(maxWindowMs) || dur, dur));
  let s = Number(startMs) || 0;
  let e = Number(endMs) || 0;
  if (dur <= min) return { startMs: 0, endMs: dur };
  if (moved === 'start') {
    e = Math.min(dur, Math.max(min, e));
    s = Math.max(0, Math.min(s, e - min));
    if (e - s > max) e = s + max;
  } else if (moved === 'end') {
    s = Math.max(0, Math.min(s, dur - min));
    e = Math.min(dur, Math.max(e, s + min));
    if (e - s > max) s = e - max;
  } else {
    const len = Math.max(min, Math.min(max, e - s));
    s = Math.max(0, Math.min(s, dur - len));
    e = s + len;
  }
  return { startMs: s, endMs: e };
}

function round100(ms) {
  'worklet';
  return Math.round(ms / 100) * 100;
}

/** "Start 0:02 to 0:14, 12 seconds" */
export function windowCaption(startMs, endMs) {
  const secs = Math.max(0, Math.round((endMs - startMs) / 1000));
  return `Start ${formatClipDuration(startMs)} to ${formatClipDuration(endMs)}, ${secs} ${secs === 1 ? 'second' : 'seconds'}`;
}

export const WHOLE_VIDEO_CAPTION = 'The whole video goes on the share.';

export default function VideoTrimBar({
  uri,
  durationMs,
  startMs,
  endMs,
  maxWindowMs = 15000,
  minWindowMs = 1000,
  width,
  onChange,
  blocksGesture = null,
  disabled = false,
}) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const dur = Math.max(0, Number(durationMs) || 0);
  const short = dur <= minWindowMs;
  const barW = Math.max(0, Number(width) || 0);
  const trackW = Math.max(1, barW - HANDLE_WIDTH * 2);
  const pxPerMs = dur > 0 ? trackW / dur : 0;
  const count = stripCount(barW);

  const [frames, setFrames] = useState(() => new Array(count).fill(null));
  useEffect(() => {
    let cancelled = false;
    setFrames(new Array(count).fill(null));
    if (!uri || !dur) return undefined;
    // Best effort: a frame that fails stays a tinted box.
    videoStripUris(uri, dur, count)
      .then((out) => { if (!cancelled && Array.isArray(out)) setFrames(out); })
      .catch(() => { /* the tinted boxes stay */ });
    return () => { cancelled = true; };
    // Read once per video and width (dur and count follow from them).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri, barW]);

  const committed = useMemo(
    () => clampWindow({ startMs, endMs, durationMs: dur, minWindowMs, maxWindowMs, moved: 'window' }),
    [startMs, endMs, dur, minWindowMs, maxWindowMs],
  );

  const s = useSharedValue(committed.startMs);
  const e = useSharedValue(committed.endMs);
  const savedS = useSharedValue(committed.startMs);
  const savedE = useSharedValue(committed.endMs);
  const lastSec = useSharedValue(-1);
  const [liveWin, setLiveWin] = useState(null);

  useEffect(() => {
    s.value = committed.startMs;
    e.value = committed.endMs;
    setLiveWin(null);
  }, [committed, s, e]);

  const commit = useCallback((a, b) => {
    setLiveWin(null);
    onChange?.({ startMs: a, endMs: b });
  }, [onChange]);
  const showLive = useCallback((a, b) => setLiveWin({ startMs: a, endMs: b }), []);

  const gestures = useMemo(() => {
    const build = (moved) => {
      // A drag must be mostly sideways to move the window: 8 dp across
      // activates it, and 12 dp up or down first hands the touch back to
      // the page, so a vertical scroll that starts on the bar scrolls the
      // page (audit 2026-10-16, item 5; LookStrengthSlider's own pairing).
      let g = Gesture.Pan()
        .activeOffsetX([-8, 8])
        .failOffsetY([-12, 12])
        .enabled(!disabled && !short)
        .onStart(() => {
          'worklet';
          savedS.value = s.value;
          savedE.value = e.value;
          lastSec.value = -1;
        })
        .onUpdate((ev) => {
          'worklet';
          const d = pxPerMs > 0 ? ev.translationX / pxPerMs : 0;
          const a = moved === 'end' ? savedS.value : savedS.value + d;
          const b = moved === 'start' ? savedE.value : savedE.value + d;
          const w = clampWindowWorklet(a, b, dur, minWindowMs, maxWindowMs, moved);
          s.value = w.startMs;
          e.value = w.endMs;
          // The caption follows in whole seconds, so JS repaints a line at
          // most once a second of movement, never once a frame.
          const key = Math.round(w.startMs / 1000) * 100000 + Math.round(w.endMs / 1000);
          if (key !== lastSec.value) {
            lastSec.value = key;
            runOnJS(showLive)(w.startMs, w.endMs);
          }
        })
        .onEnd(() => {
          'worklet';
          const w = clampWindowWorklet(round100(s.value), round100(e.value), dur, minWindowMs, maxWindowMs, moved);
          s.value = w.startMs;
          e.value = w.endMs;
          runOnJS(commit)(w.startMs, w.endMs);
        });
      // A handle takes touches beyond its drawn edge (the gesture's own
      // hitSlop, which Android's gesture handler reads; the view's hitSlop
      // below is iOS's hit test).
      if (moved !== 'window') g = g.hitSlop(HANDLE_HIT_SLOP);
      if (blocksGesture) g = g.blocksExternalGesture(blocksGesture);
      return g;
    };
    const start = build('start');
    const end = build('end');
    // Where a handle's slop lies over the window's edge, the handle wins:
    // the window's Pan waits for both handles' Pans to fail before it can
    // move (a touch outside both handles' slop never starts them, so the
    // window is not held up there). The handles are also drawn above it.
    const win = build('window').requireExternalGestureToFail(start, end);
    return { window: win, start, end };
  }, [disabled, short, pxPerMs, dur, minWindowMs, maxWindowMs, blocksGesture, commit, showLive, s, e, savedS, savedE, lastSec]);

  const windowStyle = useAnimatedStyle(() => ({
    left: HANDLE_WIDTH + s.value * pxPerMs,
    width: Math.max(0, (e.value - s.value) * pxPerMs),
  }));
  const leftScrimStyle = useAnimatedStyle(() => ({ width: s.value * pxPerMs }));
  const rightScrimStyle = useAnimatedStyle(() => ({ width: Math.max(0, (dur - e.value) * pxPerMs) }));
  const startHandleStyle = useAnimatedStyle(() => ({ left: s.value * pxPerMs }));
  const endHandleStyle = useAnimatedStyle(() => ({ left: HANDLE_WIDTH + e.value * pxPerMs }));

  const nudge = useCallback((action) => {
    if (disabled || short) return;
    const a = committed.startMs;
    const b = committed.endMs;
    let next = null;
    if (action === 'increment') next = { startMs: a + STEP_MS, endMs: b + STEP_MS, moved: 'window' };
    else if (action === 'decrement') next = { startMs: a - STEP_MS, endMs: b - STEP_MS, moved: 'window' };
    else if (action === 'startLater') next = { startMs: a + STEP_MS, endMs: b, moved: 'start' };
    else if (action === 'startEarlier') next = { startMs: a - STEP_MS, endMs: b, moved: 'start' };
    else if (action === 'endLater') next = { startMs: a, endMs: b + STEP_MS, moved: 'end' };
    else if (action === 'endEarlier') next = { startMs: a, endMs: b - STEP_MS, moved: 'end' };
    if (!next) return;
    const w = clampWindow({ ...next, durationMs: dur, minWindowMs, maxWindowMs });
    const r = clampWindow({
      startMs: round100(w.startMs), endMs: round100(w.endMs), durationMs: dur, minWindowMs, maxWindowMs, moved: next.moved,
    });
    s.value = r.startMs;
    e.value = r.endMs;
    commit(r.startMs, r.endMs);
  }, [disabled, short, committed, dur, minWindowMs, maxWindowMs, s, e, commit]);

  const shown = liveWin || committed;
  const caption = short ? WHOLE_VIDEO_CAPTION : windowCaption(shown.startMs, shown.endMs);
  const boxW = trackW / count;

  const strip = (
    <View style={[styles.strip, live.strip, { left: HANDLE_WIDTH, width: trackW }]}>
      {frames.map((frameUri, i) => (frameUri ? (
        <Image
          key={`f${i}`}
          testID="video-trim-frame"
          source={{ uri: frameUri }}
          style={{ width: boxW, height: STRIP_HEIGHT }}
          resizeMode="cover"
        />
      ) : (
        <View key={`f${i}`} testID="video-trim-box" style={[{ width: boxW, height: STRIP_HEIGHT }, live.box]} />
      )))}
    </View>
  );

  return (
    <View style={[styles.wrap, { width: barW }, disabled && styles.disabled]}>
      <View
        style={[styles.bar, { width: barW }]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Choose which part of the video goes on"
        accessibilityValue={{ text: caption }}
        accessibilityState={{ disabled: !!disabled }}
        accessibilityActions={short ? [] : [
          { name: 'increment', label: 'Move the window later' },
          { name: 'decrement', label: 'Move the window earlier' },
          { name: 'startLater', label: 'Start later' },
          { name: 'startEarlier', label: 'Start earlier' },
          { name: 'endLater', label: 'End later' },
          { name: 'endEarlier', label: 'End earlier' },
        ]}
        onAccessibilityAction={(ev) => nudge(ev.nativeEvent.actionName)}
      >
        {strip}
        {short ? null : (
          <>
            <Animated.View pointerEvents="none" style={[styles.scrim, styles.scrimLeft, live.scrim, leftScrimStyle]} />
            <Animated.View
              pointerEvents="none"
              style={[styles.scrim, styles.scrimRight, live.scrim, { width: 0 }, rightScrimStyle]}
            />
            <GestureDetector gesture={gestures.window}>
              <Animated.View style={[styles.window, live.window, windowStyle]} />
            </GestureDetector>
            <GestureDetector gesture={gestures.start}>
              <Animated.View
                style={[styles.handle, styles.handleStart, live.handle, startHandleStyle]}
                accessibilityLabel="Start handle"
                hitSlop={HANDLE_HIT_SLOP}
              >
                <View style={[styles.grip, live.grip]} />
              </Animated.View>
            </GestureDetector>
            <GestureDetector gesture={gestures.end}>
              <Animated.View
                style={[styles.handle, styles.handleEnd, live.handle, endHandleStyle]}
                accessibilityLabel="End handle"
                hitSlop={HANDLE_HIT_SLOP}
              >
                <View style={[styles.grip, live.grip]} />
              </Animated.View>
            </GestureDetector>
          </>
        )}
      </View>
      <Text style={[styles.caption, live.caption]} numberOfLines={2}>{caption}</Text>
    </View>
  );
}

function buildLiveStyles(t) {
  return {
    strip: { backgroundColor: t.colors.surface2 },
    box: { backgroundColor: withAlpha(t.colors.primary, 0.12) },
    scrim: { backgroundColor: withAlpha(t.colors.background, 0.6) },
    window: { borderColor: t.colors.primary },
    handle: { backgroundColor: t.colors.primary },
    grip: { backgroundColor: t.colors.background },
    caption: { ...t.type.captionTight, color: t.colors.textMuted, textAlign: 'center' },
  };
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
  disabled: { opacity: 0.5 },
  bar: { height: STRIP_HEIGHT, position: 'relative' },
  strip: {
    position: 'absolute', top: 0, height: STRIP_HEIGHT, flexDirection: 'row',
    overflow: 'hidden', borderRadius: radius.md,
  },
  scrim: { position: 'absolute', top: 0, height: STRIP_HEIGHT },
  scrimLeft: { left: HANDLE_WIDTH, borderTopLeftRadius: radius.md, borderBottomLeftRadius: radius.md },
  scrimRight: { right: HANDLE_WIDTH, borderTopRightRadius: radius.md, borderBottomRightRadius: radius.md },
  window: { position: 'absolute', top: 0, height: STRIP_HEIGHT, borderWidth: 2 },
  handle: {
    position: 'absolute', top: 0, width: HANDLE_WIDTH, height: STRIP_HEIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  handleStart: { borderTopLeftRadius: radius.md, borderBottomLeftRadius: radius.md },
  handleEnd: { borderTopRightRadius: radius.md, borderBottomRightRadius: radius.md },
  grip: { width: spacing.xxs, height: spacing.lg, borderRadius: radius.sm },
  // Centred under the screen's centred instruction above the bar (lead
  // ruling 7, render audit 2026-10-16).
  caption: { marginTop: spacing.sm, color: colors.textMuted, ...type.captionTight, textAlign: 'center' },
});
