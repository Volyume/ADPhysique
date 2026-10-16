/**
 * videoFrame: still frames of a video for the share screen (D229 addendum 17:
 * the frame at the chosen start is the preview's background, the strip of
 * this workout's videos shows a thumbnail each, and the trim bar lays the
 * whole video out as a strip of frames).
 *
 * Every frame comes from the app's own native module (extractFrames in
 * engine.js, modules/volyume-video-export): decoded off the JS thread, turned
 * upright natively, scaled so its longer edge fits the size asked for, and
 * written as a JPEG file in the caches directory. JS never rotates a frame.
 *
 * Skia's video object (Skia.Video, useVideo) is BANNED here and everywhere in
 * src/ (lead ruling 2026-10-16, after Sentry VOLYUME-3M, a native crash in
 * RNSkia; guarded by noSkiaVideo.guard.test.js). Read against the installed
 * @shopify/react-native-skia 2.2.12, it cannot give a still frame:
 *   - iOS (RNSkAppleVideo.mm): nextImage asks AVPlayerItemVideoOutput for a
 *     pixel buffer straight after construction and an asynchronous seek,
 *     before the item has loaded, so it returns nothing and every video read
 *     as "could not be opened";
 *   - Android (RNSkVideo.java): each Skia.Video builds a MediaExtractor, a
 *     hardware MediaCodec, an ImageReader and a MediaPlayer that starts
 *     playing (with sound for a gallery video); the native object's
 *     destructor never calls release(), so every grab leaked a hardware
 *     decoder; and its seek loops while the sample time is below the target,
 *     which never ends at the end of the stream (the sample time is -1
 *     there), freezing the JS thread for good on the strip's last frame.
 *
 * The one Skia use left is decoding the still's JPEG into an offscreen image
 * (Skia.Data.fromBase64 and Skia.Image.MakeImageFromEncoded), the same path
 * as a chosen photo. No live Skia view is ever mounted.
 *
 * Best effort throughout: a frame that fails is null and the caller shows
 * its empty state; nothing here throws.
 */
import { extractFrames, MAX_FRAME_TIMES } from './engine';

let FileSystem = null;
try {
  // eslint-disable-next-line global-require
  FileSystem = require('expo-file-system/legacy');
} catch (_e) {
  // A test or a build without it: the still is unavailable and says so.
  FileSystem = null;
}

/** The preview's still: the longer edge at most this many pixels. */
export const STILL_EDGE = 1440;
/** The workout strip's thumbnail (shown at 64 dp, sharp at 3x). */
export const THUMB_EDGE = 192;
/** The trim bar's frames (a 48 by 56 dp box, sharp at 2x). */
export const STRIP_EDGE = 112;
/** The strip's last frame sits at least this far before the end. */
export const STRIP_END_MARGIN_MS = 100;

const isUri = (s) => typeof s === 'string' && s.trim().length > 0;

async function framesOrNulls(uri, timesMs, maxEdge) {
  try {
    const out = await extractFrames(uri, timesMs, { maxEdge });
    return Array.isArray(out) ? out : timesMs.map(() => null);
  } catch (_e) {
    return timesMs.map(() => null);
  }
}

/**
 * The frame at `ms` as an offscreen Skia image, with its upright pixel size.
 * The JPEG is read once and then deleted.
 * @param {object} Skia  the Skia namespace (the caller's guarded require)
 * @param {string} uri   a file:// video
 * @param {number} ms    the moment to show (native keeps it inside the video)
 * @returns {Promise<{ image: object, width: number, height: number } | null>}
 */
export async function grabVideoFrame(Skia, uri, ms = 0) {
  if (!Skia?.Data?.fromBase64 || !Skia?.Image?.MakeImageFromEncoded || !isUri(uri)) return null;
  if (!FileSystem || typeof FileSystem.readAsStringAsync !== 'function') return null;
  const at = Math.max(0, Number(ms) || 0);
  const [frame] = await framesOrNulls(uri, [at], STILL_EDGE);
  if (!frame) return null;
  try {
    const b64 = await FileSystem.readAsStringAsync(frame.uri, {
      encoding: FileSystem.EncodingType?.Base64 || 'base64',
    });
    if (!b64) return null;
    const image = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBase64(b64));
    if (!image) return null;
    return { image, width: frame.width, height: frame.height };
  } catch (_e) {
    return null;
  } finally {
    // The still lives on as the Skia image; its file is no longer needed.
    if (typeof FileSystem.deleteAsync === 'function') {
      FileSystem.deleteAsync(frame.uri, { idempotent: true }).catch(() => {});
    }
  }
}

/**
 * A small thumbnail of a video's first frame, as a file URI for a plain
 * Image (the share screen's strip of this workout's videos). Null when the
 * video cannot be read; the caller shows a glyph instead.
 * @param {string} uri
 * @returns {Promise<string | null>}
 */
export async function videoThumbnailUri(uri) {
  if (!isUri(uri)) return null;
  const [frame] = await framesOrNulls(uri, [0], THUMB_EDGE);
  return frame ? frame.uri : null;
}

/**
 * The moments of a `count` frame strip: evenly spaced from 0 to a point at
 * least STRIP_END_MARGIN_MS before the end (native also keeps every time
 * inside the video).
 * @param {number} durationMs
 * @param {number} count
 * @returns {number[]}
 */
export function stripTimes(durationMs, count) {
  const n = Math.min(MAX_FRAME_TIMES, Math.max(0, Math.floor(Number(count) || 0)));
  const last = Math.max(0, (Number(durationMs) || 0) - STRIP_END_MARGIN_MS);
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.push(n === 1 ? 0 : Math.round((last * i) / (n - 1)));
  }
  return out;
}

/**
 * `count` frames evenly spaced across the video (stripTimes), in ONE native
 * call: each a file URI for a plain Image, or null where that frame failed.
 * @param {string} uri
 * @param {number} durationMs
 * @param {number} count
 * @returns {Promise<Array<string | null>>}
 */
export async function videoStripUris(uri, durationMs, count) {
  const times = stripTimes(durationMs, count);
  if (!times.length) return [];
  if (!isUri(uri)) return times.map(() => null);
  const frames = await framesOrNulls(uri, times, STRIP_EDGE);
  return times.map((_t, i) => (frames[i] ? frames[i].uri : null));
}
