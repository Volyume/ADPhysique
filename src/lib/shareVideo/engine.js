/**
 * shareVideo/engine.js: the app's door to the native share video module
 * (modules/volyume-video-export, D229 and addenda 1 to 6).
 *
 * The share screen hands over the clip, the 15 second window, the look as the
 * final 20 numbers (lookMatrix(key, strength): strength is already inside
 * them, so it is never sent again), the placement rectangle (photoCoverRect's
 * output, so native holds no copy of the framing maths) and the card picture
 * at the output size. The card is completely still on the video, exactly as
 * on a photo: its picture carries the outline, the scrim and the data
 * (founder correction 2026-10-15). Native returns an H.264 MP4 in the cache
 * (`share-video/` under the caches directory, a file:/// URI with an
 * extension, ready for Sharing.shareAsync and MediaLibrary.saveToLibraryAsync).
 *
 * This wrapper:
 *   - finds the native module inside try/catch; without it every call rejects
 *     E_UNAVAILABLE and isAvailable() is false, so the screen hides video;
 *   - validates every option before it crosses (a NaN that reaches Kotlin
 *     saturates, one that reaches Swift traps; adversarial audit 2026-08-26);
 *   - allows one export at a time (E_BUSY), subscribes to progress before the
 *     call and removes the subscription in finally;
 *   - gives every failure a code from EXPORT_ERROR and a calm message, the
 *     same line lineForExportError returns, so nothing technical can reach a
 *     person by accident. The native detail rides on `error.detail` for logs.
 */
// expo-modules-core is required lazily inside getNative(): a test or a
// build without the native runtime must still be able to import this file
// (every call then rejects E_UNAVAILABLE and isAvailable() is false).

export const NATIVE_MODULE_NAME = 'VolyumeVideoExport';
export const PROGRESS_EVENT = 'onExportProgress';

/** D229 ruling 3: the 15 second cap. */
export const MAX_CLIP_MS = 15000;
/** Research report section 8.1: about 15 MB for 15 s at 1080 by 1920. */
export const DEFAULT_BITRATE = 8000000;

export const EXPORT_ERROR = Object.freeze({
  DECODE: 'E_DECODE', // A: the phone cannot open the clip
  ENCODE: 'E_ENCODE', // B: the video could not be made this time
  FRAME: 'E_FRAME', // C: the clip was too big to prepare
  SOURCE: 'E_SOURCE', // D: the clip could not be opened
  SPACE: 'E_SPACE', // E: not enough space
  ICLOUD: 'E_ICLOUD', // F: still downloading from iCloud
  BACKGROUND: 'E_BACKGROUND', // G: Volyume was closed while the video was being made
  CANCELLED: 'E_CANCELLED',
  BUSY: 'E_BUSY',
  UNAVAILABLE: 'E_UNAVAILABLE',
  INVALID: 'E_INVALID',
  UNSUPPORTED: 'E_UNSUPPORTED', // setLockScreenWallpaper: iOS, or a device that forbids it
  WALLPAPER: 'E_WALLPAPER', // setLockScreenWallpaper: the system refused
});

const KNOWN_CODES = new Set(Object.values(EXPORT_ERROR));

// Founder's copy, 2026-10-15: British English, plain, no technical words.
const EXPORT_LINES = Object.freeze({
  E_DECODE: 'This phone cannot open that clip. Some videos filmed at very high quality are too much for older phones. You could record a clip in Volyume instead, or choose a different one.',
  E_ENCODE: 'The video could not be made on this phone this time. Your photo card is ready to share instead.',
  E_FRAME: 'That clip was too big for this phone to prepare. A shorter clip, or one filmed at a lower quality, should work.',
  E_SOURCE: 'That clip could not be opened. It may have been moved or deleted.',
  E_SPACE: 'There is not enough space on your phone to make the video. Once some space is free you can try again.',
  E_ICLOUD: 'That clip is still downloading from iCloud. Try again once it has finished.',
  E_BACKGROUND: 'The video stops if Volyume is closed while it is being made. Keep Volyume open and it will start again.',
  E_UNAVAILABLE: 'Videos cannot be made in this version of Volyume. Your photo card is ready to share instead.',
});

/**
 * The calm line for a failure code, or null when nothing should be said: a
 * cancel the person chose, and a second tap while a video is already being
 * made (its progress is already on screen). An unknown code, or options that
 * failed validation, read as "could not be made this time".
 */
export function lineForExportError(code) {
  if (code === EXPORT_ERROR.CANCELLED || code === EXPORT_ERROR.BUSY) return null;
  return EXPORT_LINES[code] || EXPORT_LINES.E_ENCODE;
}

function exportError(code, detail) {
  const err = new Error(lineForExportError(code) || (code === EXPORT_ERROR.BUSY ? 'A video is already being made.' : 'Stopped.'));
  err.code = code;
  if (detail) err.detail = detail;
  return err;
}

function fromNativeError(e, fallbackCode = EXPORT_ERROR.ENCODE) {
  const nativeCode = e && typeof e.code === 'string' ? e.code : null;
  const code = nativeCode && KNOWN_CODES.has(nativeCode) ? nativeCode : fallbackCode;
  const detail = [nativeCode, e && e.message ? String(e.message) : null].filter(Boolean).join(': ');
  return exportError(code, detail || null);
}

let resolved = false;
let nativeModule = null;

function getNative() {
  if (resolved) return nativeModule;
  resolved = true;
  try {
    // eslint-disable-next-line global-require
    const { requireNativeModule } = require('expo-modules-core');
    nativeModule = requireNativeModule(NATIVE_MODULE_NAME);
  } catch (_e) {
    // Expo Go, an older build without the module, or a test.
    nativeModule = null;
  }
  return nativeModule;
}

function requireFunction(name) {
  const native = getNative();
  if (!native || typeof native[name] !== 'function') {
    throw exportError(EXPORT_ERROR.UNAVAILABLE, `${name} missing`);
  }
  return native;
}

/** True only when the native module is compiled into this build. */
export function isAvailable() {
  const native = getNative();
  return !!native && typeof native.exportShareVideo === 'function';
}

const isFiniteNumber = (n) => typeof n === 'number' && Number.isFinite(n);
const isUri = (s) => typeof s === 'string' && s.trim().length > 0;

// H.264 needs even sides; 16 to 4096 covers every card fit.
const isEvenSize = (n) => Number.isInteger(n) && n >= 16 && n <= 4096 && n % 2 === 0;

/**
 * The exact payload native receives, or an E_INVALID error naming the field.
 * Only these keys cross: a caller's `strength`, `crop` or anything else is
 * dropped, so the look and the framing each have one copy (addendum 5,
 * ruling 11).
 */
function toNativeOptions(options) {
  const o = options || {};
  const invalid = (field) => exportError(EXPORT_ERROR.INVALID, `invalid ${field}`);
  if (!isUri(o.sourceUri)) throw invalid('sourceUri');
  if (!isUri(o.overlayPngUri)) throw invalid('overlayPngUri');
  if (!isFiniteNumber(o.startMs) || o.startMs < 0) throw invalid('startMs');
  if (!isFiniteNumber(o.durationMs) || o.durationMs <= 0 || o.durationMs > MAX_CLIP_MS) throw invalid('durationMs');
  if (!isEvenSize(o.outWidth)) throw invalid('outWidth');
  if (!isEvenSize(o.outHeight)) throw invalid('outHeight');
  const bitrate = o.bitrate == null ? DEFAULT_BITRATE : o.bitrate;
  if (!isFiniteNumber(bitrate) || bitrate < 1000000 || bitrate > 20000000) throw invalid('bitrate');
  const r = o.rect;
  if (!r || ![r.x, r.y, r.w, r.h].every(isFiniteNumber) || r.w <= 0 || r.h <= 0) throw invalid('rect');
  let matrix = null;
  if (o.matrix != null) {
    if (!Array.isArray(o.matrix) || o.matrix.length !== 20 || !o.matrix.every(isFiniteNumber)) throw invalid('matrix');
    matrix = o.matrix.slice();
  }
  return {
    sourceUri: o.sourceUri,
    startMs: o.startMs,
    durationMs: o.durationMs,
    matrix,
    rect: { x: r.x, y: r.y, w: r.w, h: r.h },
    overlayPngUri: o.overlayPngUri,
    outWidth: o.outWidth,
    outHeight: o.outHeight,
    bitrate: Math.round(bitrate),
  };
}

let busy = false;

/**
 * Makes the share video. Resolves { uri, width, height, durationMs,
 * fileSizeBytes } with the real output size (an Android encoder may fall
 * back to another size). Rejects with an EXPORT_ERROR code; the message is
 * the calm line.
 *
 * @param {{ sourceUri: string, startMs: number, durationMs: number,
 *   matrix: number[] | null, rect: { x: number, y: number, w: number, h: number },
 *   overlayPngUri: string, outWidth: number, outHeight: number, bitrate?: number }} options
 * @param {(progress: number) => void} [onProgress] 0 to 1
 */
export async function exportShareVideo(options, onProgress) {
  const native = requireFunction('exportShareVideo');
  if (busy) throw exportError(EXPORT_ERROR.BUSY, 'already running');
  const payload = toNativeOptions(options);
  busy = true;
  let subscription = null;
  try {
    if (typeof onProgress === 'function' && typeof native.addListener === 'function') {
      subscription = native.addListener(PROGRESS_EVENT, (event) => {
        const p = Number(event && event.progress);
        if (!Number.isFinite(p)) return;
        try {
          onProgress(Math.min(1, Math.max(0, p)));
        } catch (_e) {
          // A progress callback never stops the video being made.
        }
      });
    }
    let result;
    try {
      result = await native.exportShareVideo(payload);
    } catch (e) {
      throw fromNativeError(e);
    }
    if (!result || !isUri(result.uri)) throw exportError(EXPORT_ERROR.ENCODE, 'no file returned');
    const num = (v, fallback) => (isFiniteNumber(Number(v)) && Number(v) > 0 ? Number(v) : fallback);
    return {
      uri: result.uri,
      width: num(result.width, payload.outWidth),
      height: num(result.height, payload.outHeight),
      durationMs: num(result.durationMs, payload.durationMs),
      fileSizeBytes: isFiniteNumber(Number(result.fileSizeBytes)) ? Number(result.fileSizeBytes) : 0,
    };
  } finally {
    if (subscription) {
      try {
        subscription.remove();
      } catch (_e) {
        // Already removed with the module.
      }
    }
    busy = false;
  }
}

/** Stops the running video, which then rejects E_CANCELLED; native deletes the partial file. */
export async function cancelExport() {
  const native = requireFunction('cancelExport');
  try {
    await native.cancelExport();
  } catch (e) {
    throw fromNativeError(e);
  }
}

const ROTATIONS = new Set([0, 90, 180, 270]);

/**
 * Upright facts about a clip: { width, height, rotation, durationMs,
 * fps | null, codec | null, hdr, hasAudio, fileSizeBytes | null }, or null
 * when the file cannot be read as a video.
 */
export async function probeVideo(uri) {
  const native = requireFunction('probeVideo');
  if (!isUri(uri)) return null;
  let raw;
  try {
    raw = await native.probeVideo(uri);
  } catch (_e) {
    return null;
  }
  if (!raw) return null;
  const width = Number(raw.width);
  const height = Number(raw.height);
  const durationMs = Number(raw.durationMs);
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (!Number.isFinite(durationMs) || durationMs < 0) return null;
  const fps = Number(raw.fps);
  const size = raw.fileSizeBytes == null ? NaN : Number(raw.fileSizeBytes);
  const rotation = Number(raw.rotation);
  return {
    width: Math.round(width),
    height: Math.round(height),
    rotation: ROTATIONS.has(rotation) ? rotation : 0,
    durationMs,
    fps: raw.fps != null && Number.isFinite(fps) && fps > 0 ? fps : null,
    codec: typeof raw.codec === 'string' && raw.codec ? raw.codec : null,
    hdr: raw.hdr === true,
    hasAudio: raw.hasAudio === true,
    fileSizeBytes: Number.isFinite(size) && size >= 0 ? size : null,
  };
}

/**
 * Sets the lock screen picture (D229 addendum 6, level-up 2). Android only;
 * iOS rejects E_UNSUPPORTED, where the screen offers "Save, then set from
 * Photos" instead. Resolves true once set.
 */
export async function setLockScreenWallpaper(uri) {
  const native = requireFunction('setLockScreenWallpaper');
  if (!isUri(uri)) throw exportError(EXPORT_ERROR.SOURCE, 'invalid uri');
  try {
    await native.setLockScreenWallpaper(uri);
    return true;
  } catch (e) {
    throw fromNativeError(e, EXPORT_ERROR.WALLPAPER);
  }
}
