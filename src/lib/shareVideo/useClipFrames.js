/**
 * useClipFrames: the live clip for the share preview, one Skia frame at a
 * time (D229; the thin wrapper over Skia.Video the native research asked
 * for, 01-NATIVE-RESEARCH.md section 7.3).
 *
 * Why not Skia's own useVideo: it loops the whole file, cannot play a trim
 * window, never draws a clip whose container reports no frame rate (Android
 * can report 0, which makes its frame interval infinite), and its seek can
 * spin at the end of the stream on Android. This hook keeps its shape (a
 * Reanimated frame callback feeding one shared SkImage) and adds:
 *   - a window: playback loops between `startMs` and `endMs`;
 *   - a 30 fps fallback when the file reports no frame rate;
 *   - every seek clamped two frames short of the end of the stream;
 *   - one frame held at a time (the previous one is disposed first);
 *   - the Android texture copy Skia's hook makes, for the same reason;
 *   - silence (volume 0 the moment the video loads);
 *   - a pause whenever the app leaves the foreground;
 *   - `scrub(ms)`: show the frame at a time while paused (the trim bar).
 *
 * Nothing here reads anything but the file. The clip never leaves the
 * device through this hook.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { Skia } from '@shopify/react-native-skia';
import {
  useSharedValue, useFrameCallback, useAnimatedReaction, runOnJS, runOnUI,
  createWorkletRuntime, runOnRuntime,
} from 'react-native-reanimated';

const FALLBACK_FPS = 30;
// A seek lands this many frames short of the end of the stream, so the
// Android decoder never has to look for a sample past the last one.
const END_GUARD_FRAMES = 2;

// The video is opened off the JS thread (opening a decoder blocks), on a
// worklet runtime of its own, the way Skia's own hook does it.
let clipRuntime = null;
function runtime() {
  if (!clipRuntime) clipRuntime = createWorkletRuntime('volyume-clip-runtime');
  return clipRuntime;
}

/** Open `source` (a file:// URL) as a Skia Video, or null while it loads. */
export function useClipVideo(source) {
  const [video, setVideo] = useState(null);
  // The source the screen wants NOW. A slow open that lands after the
  // person chose another video, or None, is disposed, never shown (fresh-eyes
  // review 2026-10-15, should-fix 20).
  const wantedRef = useRef(source);
  wantedRef.current = source;
  const opened = useCallback((src, vid) => {
    if (wantedRef.current !== src) {
      try { vid?.dispose?.(); } catch (_e) { /* best effort */ }
      return;
    }
    setVideo(vid);
  }, []);
  const open = useCallback((src) => {
    'worklet';
    let vid = null;
    try { vid = Skia.Video(src); } catch (_e) { vid = null; }
    runOnJS(opened)(src, vid);
  }, [opened]);
  useEffect(() => {
    setVideo(null);
    if (!source) return undefined;
    runOnRuntime(runtime(), open)(source);
    return undefined;
  }, [source, open]);
  return video;
}

/**
 * @param {string|null} source file:// URL of the clip
 * @param {{startMs?: number, endMs?: (number|null), paused?: boolean}} [opts]
 * @returns {{currentFrame: object, currentTime: object, meta: (object|null),
 *   ready: boolean, scrub: (ms: number) => void}} `currentFrame` and
 *   `currentTime` are Reanimated shared values; `meta` is
 *   `{ durationMs, framerate, width, height, rotation }` once loaded.
 */
export default function useClipFrames(source, { startMs = 0, endMs = null, paused = false } = {}) {
  const video = useClipVideo(source);
  const meta = useMemo(() => {
    if (!video) return null;
    const fr = video.framerate();
    const size = video.size();
    return {
      durationMs: video.duration(),
      framerate: Number.isFinite(fr) && fr > 0 ? fr : FALLBACK_FPS,
      width: size.width,
      height: size.height,
      rotation: video.rotation(),
    };
  }, [video]);
  const frameMs = meta ? 1000 / meta.framerate : 1000 / FALLBACK_FPS;
  const durationMs = meta ? meta.durationMs : 0;
  const latestSeekable = Math.max(0, durationMs - END_GUARD_FRAMES * frameMs);

  const isPaused = useSharedValue(paused);
  const windowStart = useSharedValue(startMs);
  const windowEnd = useSharedValue(endMs);
  const seekCap = useSharedValue(latestSeekable);
  const frameInterval = useSharedValue(frameMs);
  const currentFrame = useSharedValue(null);
  const currentTime = useSharedValue(startMs);
  const lastTimestamp = useSharedValue(-1);

  useEffect(() => { isPaused.value = paused; }, [paused, isPaused]);
  useEffect(() => { seekCap.value = latestSeekable; frameInterval.value = frameMs; }, [latestSeekable, frameMs, seekCap, frameInterval]);
  useEffect(() => { windowEnd.value = endMs; }, [endMs, windowEnd]);

  // The window's start moves: play from there. Set after the end so a
  // window that moves as a whole never plays an old end against a new start.
  useEffect(() => { windowStart.value = startMs; }, [startMs, windowStart]);

  useAnimatedReaction(() => isPaused.value, (p) => {
    if (!video) return;
    if (p) {
      video.pause();
    } else {
      lastTimestamp.value = -1;
      video.play();
    }
  }, [video]);

  useAnimatedReaction(() => windowStart.value, (s, prev) => {
    if (!video || prev === null || prev === undefined || s === prev) return;
    const t = Math.min(seekCap.value, Math.max(0, s));
    video.seek(t);
    currentTime.value = t;
    lastTimestamp.value = -1;
    const img = video.nextImage();
    if (img) {
      if (currentFrame.value) currentFrame.value.dispose();
      currentFrame.value = Platform.OS === 'android' ? img.makeNonTextureImage() : img;
      if (Platform.OS === 'android') img.dispose();
    }
  }, [video]);

  useFrameCallback((info) => {
    'worklet';
    if (!video || isPaused.value) return;
    const now = info.timestamp;
    if (lastTimestamp.value === -1) { lastTimestamp.value = now; return; }
    const delta = now - lastTimestamp.value;
    if (delta < frameInterval.value) return;
    const end = windowEnd.value === null || windowEnd.value === undefined
      ? seekCap.value
      : Math.min(windowEnd.value, seekCap.value);
    let next = currentTime.value + delta;
    if (next >= end) {
      // The window's end: back to its start. The seek is clamped, so a
      // window that runs to the end of the stream never asks past it.
      const s = Math.min(seekCap.value, Math.max(0, windowStart.value));
      video.seek(s);
      next = s;
    }
    const img = video.nextImage();
    if (img) {
      if (currentFrame.value) currentFrame.value.dispose();
      if (Platform.OS === 'android') {
        // The decoder's texture is invalidated on the next frame; copy it.
        currentFrame.value = img.makeNonTextureImage();
        img.dispose();
      } else {
        currentFrame.value = img;
      }
    }
    currentTime.value = next;
    lastTimestamp.value = now;
  });

  // On load: silent, and positioned at the window's start.
  useEffect(() => {
    if (!video) return;
    const s = Math.min(latestSeekable, Math.max(0, startMs));
    runOnUI(() => {
      'worklet';
      video.setVolume(0);
      video.seek(s);
      currentTime.value = s;
      const img = video.nextImage();
      if (img) {
        if (currentFrame.value) currentFrame.value.dispose();
        currentFrame.value = Platform.OS === 'android' ? img.makeNonTextureImage() : img;
        if (Platform.OS === 'android') img.dispose();
      }
      if (!isPaused.value) video.play();
    })();
    // The window's start is read once here; later changes go through the reaction above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video]);

  // Leaving the foreground pauses the clip; coming back restores the
  // caller's own choice.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      isPaused.value = state !== 'active' ? true : paused;
    });
    return () => sub.remove();
  }, [paused, isPaused]);

  useEffect(() => () => {
    if (!video) return;
    runOnUI(() => {
      'worklet';
      if (currentFrame.value) { currentFrame.value.dispose(); currentFrame.value = null; }
      video.dispose();
    })();
  }, [video, currentFrame]);

  /** Show the frame at `ms` (while paused, the trim bar's scrub). */
  const scrub = useCallback((ms) => {
    if (!video) return;
    const t = Math.min(latestSeekable, Math.max(0, ms));
    runOnUI(() => {
      'worklet';
      video.seek(t);
      currentTime.value = t;
      lastTimestamp.value = -1;
      const img = video.nextImage();
      if (img) {
        if (currentFrame.value) currentFrame.value.dispose();
        currentFrame.value = Platform.OS === 'android' ? img.makeNonTextureImage() : img;
        if (Platform.OS === 'android') img.dispose();
      }
    })();
  }, [video, latestSeekable, currentTime, lastTimestamp, currentFrame]);

  return { currentFrame, currentTime, meta, ready: !!video, scrub };
}
