/**
 * clipThumbnails: a handful of still frames spaced through a clip, as small
 * Skia images, for the trim bar's strip and the look tiles (D229; the UX
 * research's "cut from inside the trim window, not frame zero").
 *
 * Runs on the clip worklet runtime so opening the decoder never blocks the
 * JS thread. Every seek is clamped two frames short of the end of the
 * stream (the Android seek defect in 01-NATIVE-RESEARCH.md 7.3). Each frame
 * is drawn into an offscreen surface at thumbnail size and snapshotted, so
 * the full-size decoded frame is disposed at once and nothing holds more
 * than one of them.
 */
import { Skia } from '@shopify/react-native-skia';
import { runOnJS, createWorkletRuntime, runOnRuntime } from 'react-native-reanimated';

let thumbRuntime = null;
function runtime() {
  if (!thumbRuntime) thumbRuntime = createWorkletRuntime('volyume-clip-thumbs');
  return thumbRuntime;
}

/** The times, in ms, at which `count` frames are taken from a clip of
 * `durationMs` inside [fromMs, toMs], the first at the window's start and
 * the last two frames short of its end. Pure. */
export function thumbnailTimes(durationMs, count, { fromMs = 0, toMs = null, frameMs = 1000 / 30 } = {}) {
  const n = Math.max(1, Math.floor(count));
  const end = Math.max(0, Math.min(toMs == null ? durationMs : toMs, durationMs - 2 * frameMs));
  const start = Math.max(0, Math.min(fromMs, end));
  if (n === 1) return [start];
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(Math.round(start + ((end - start) * i) / (n - 1)));
  return out;
}

/**
 * @param {string} source file:// URL
 * @param {{count?: number, thumbWidth?: number, fromMs?: number, toMs?: number}} [opts]
 * @returns {Promise<{images: object[], times: number[], width: number, height: number}>}
 *   `images` are SkImages at thumbnail size (upright); empty on failure.
 */
export function extractClipThumbnails(source, { count = 12, thumbWidth = 96, fromMs = 0, toMs = null } = {}) {
  return new Promise((resolve) => {
    const done = (out) => resolve(out);
    const job = (src, n, tw, from, to) => {
      'worklet';
      let video = null;
      try { video = Skia.Video(src); } catch (_e) { video = null; }
      if (!video) { runOnJS(done)({ images: [], times: [], width: 0, height: 0 }); return; }
      const fr = video.framerate();
      const frameMs = 1000 / (Number.isFinite(fr) && fr > 0 ? fr : 30);
      const duration = video.duration();
      const size = video.size();
      const rot = video.rotation();
      const swap = rot === 90 || rot === 270;
      const uprightW = swap ? size.height : size.width;
      const uprightH = swap ? size.width : size.height;
      const th = Math.max(1, Math.round((tw * uprightH) / Math.max(1, uprightW)));
      const end = Math.max(0, Math.min(to == null ? duration : to, duration - 2 * frameMs));
      const start = Math.max(0, Math.min(from, end));
      const times = [];
      for (let i = 0; i < n; i += 1) times.push(Math.round(start + ((end - start) * i) / Math.max(1, n - 1)));
      const images = [];
      video.setVolume(0);
      for (let i = 0; i < times.length; i += 1) {
        video.seek(times[i]);
        const frame = video.nextImage();
        if (!frame) continue;
        const surf = Skia.Surface.MakeOffscreen(tw, th);
        if (!surf) { frame.dispose(); continue; }
        const canvas = surf.getCanvas();
        canvas.save();
        // Draw the decoded (unrotated) frame upright into the thumbnail.
        if (rot === 90) { canvas.translate(tw, 0); canvas.rotate(90, 0, 0); }
        else if (rot === 180) { canvas.translate(tw, th); canvas.rotate(180, 0, 0); }
        else if (rot === 270) { canvas.translate(0, th); canvas.rotate(270, 0, 0); }
        const dw = swap ? th : tw;
        const dh = swap ? tw : th;
        canvas.drawImageRect(
          frame,
          { x: 0, y: 0, width: size.width, height: size.height },
          { x: 0, y: 0, width: dw, height: dh },
          Skia.Paint(),
        );
        canvas.restore();
        surf.flush();
        const snap = surf.makeImageSnapshot();
        frame.dispose();
        if (snap) images.push(snap.makeNonTextureImage ? snap.makeNonTextureImage() : snap);
      }
      video.dispose();
      runOnJS(done)({ images, times, width: tw, height: th });
    };
    try {
      runOnRuntime(runtime(), job)(source, Math.max(1, Math.floor(count)), thumbWidth, fromMs, toMs);
    } catch (_e) {
      done({ images: [], times: [], width: 0, height: 0 });
    }
  });
}
