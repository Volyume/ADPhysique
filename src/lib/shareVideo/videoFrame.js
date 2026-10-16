/**
 * videoFrame: one still frame of a video, decoded OFFSCREEN through Skia's
 * video decoder, for the share screen's preview (D229 addendum 17, the
 * founder's reversal of 2026-10-16).
 *
 * The share screen draws its preview the way it always has: an offscreen
 * Skia surface and a plain Image of the result. A video is a background like
 * a photo: the frame at the chosen start becomes `bgPhoto`, so every photo
 * option (the looks, the framing, the card over it) works on it unchanged,
 * and the finished video gets the same look and framing from the native
 * engine at export. No live Skia view is ever mounted (the live canvases
 * crashed inside RNSkia's redraw on iOS: Sentry VOLYUME-3M).
 *
 * Best effort: a decoder that fails returns null and the caller says so.
 */

/**
 * @param {object} Skia  the Skia namespace (the caller's guarded require)
 * @param {string} uri   a file:// video
 * @param {number} ms    the moment to decode, clamped into the video
 * @returns {{ image: object, width: number, height: number, durationMs: number } | null}
 */
export function grabVideoFrame(Skia, uri, ms = 0) {
  if (!Skia?.Video || typeof uri !== 'string' || !uri) return null;
  let video = null;
  try {
    video = Skia.Video(uri);
    if (!video) return null;
    const durationMs = Number(video.duration()) || 0;
    const size = typeof video.size === 'function' ? video.size() : null;
    const rotation = typeof video.rotation === 'function' ? Number(video.rotation()) || 0 : 0;
    const at = Math.max(0, Math.min(Number(ms) || 0, Math.max(0, durationMs - 1)));
    if (typeof video.seek === 'function') video.seek(at);
    const image = video.nextImage();
    if (!image) return null;
    const rotated = rotation === 90 || rotation === 270;
    const w = Number(size?.width) || image.width();
    const h = Number(size?.height) || image.height();
    return {
      image,
      width: rotated ? h : w,
      height: rotated ? w : h,
      durationMs,
    };
  } catch (_e) {
    return null;
  } finally {
    try { video?.dispose?.(); } catch (_e) { /* released either way */ }
  }
}

/**
 * A small square thumbnail of a video's first frame, as a base64 PNG for a
 * plain Image (the share screen's strip of this workout's videos). Drawn on
 * an offscreen surface at `px`, centre-cropped; null when the video cannot
 * be decoded, and the caller shows a glyph instead.
 * @param {object} Skia
 * @param {string} uri
 * @param {number} px
 * @returns {string | null}
 */
export function videoThumbnailBase64(Skia, uri, px = 192) {
  const frame = grabVideoFrame(Skia, uri, 0);
  if (!frame) return null;
  try {
    const surface = Skia.Surface?.MakeOffscreen?.(px, px);
    if (!surface) return null;
    const iw = frame.image.width();
    const ih = frame.image.height();
    const side = Math.min(iw, ih);
    const sx = (iw - side) / 2;
    const sy = (ih - side) / 2;
    const paint = Skia.Paint();
    paint.setAntiAlias?.(true);
    surface.getCanvas().drawImageRect(frame.image, Skia.XYWHRect(sx, sy, side, side), Skia.XYWHRect(0, 0, px, px), paint);
    surface.flush();
    const snap = surface.makeImageSnapshot();
    return snap?.encodeToBase64?.() || null;
  } catch (_e) {
    return null;
  } finally {
    try { frame.image?.dispose?.(); } catch (_e) { /* released either way */ }
  }
}

/**
 * The frame at `ms` as a base64 PNG, centre-cropped to a width:height box
 * drawn on an offscreen surface (the trim bar's strip of frames). Null when
 * the video cannot be decoded; never a throw.
 * @param {object} Skia
 * @param {string} uri
 * @param {number} ms
 * @param {number} width
 * @param {number} height
 * @returns {string | null}
 */
export function videoFrameBase64(Skia, uri, ms = 0, width = 48, height = 56) {
  const w = Math.max(1, Math.round(Number(width) || 0));
  const h = Math.max(1, Math.round(Number(height) || 0));
  const frame = grabVideoFrame(Skia, uri, ms);
  if (!frame) return null;
  try {
    const surface = Skia.Surface?.MakeOffscreen?.(w, h);
    if (!surface) return null;
    const iw = frame.image.width();
    const ih = frame.image.height();
    const box = w / h;
    let sw = iw;
    let sh = iw / box;
    if (sh > ih) { sh = ih; sw = ih * box; }
    const sx = (iw - sw) / 2;
    const sy = (ih - sh) / 2;
    const paint = Skia.Paint();
    paint.setAntiAlias?.(true);
    surface.getCanvas().drawImageRect(frame.image, Skia.XYWHRect(sx, sy, sw, sh), Skia.XYWHRect(0, 0, w, h), paint);
    surface.flush();
    const snap = surface.makeImageSnapshot();
    return snap?.encodeToBase64?.() || null;
  } catch (_e) {
    return null;
  } finally {
    try { frame.image?.dispose?.(); } catch (_e) { /* released either way */ }
  }
}

/**
 * `count` frames evenly spaced across the video (the first at 0, the last at
 * durationMs - 1), each a base64 PNG or null where a frame failed.
 * @param {object} Skia
 * @param {string} uri
 * @param {number} durationMs
 * @param {number} count
 * @param {number} width
 * @param {number} height
 * @returns {Array<string | null>}
 */
export function videoStripBase64(Skia, uri, durationMs, count, width, height) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  const last = Math.max(0, (Number(durationMs) || 0) - 1);
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const ms = n === 1 ? 0 : Math.round((last * i) / (n - 1));
    out.push(videoFrameBase64(Skia, uri, ms, width, height));
  }
  return out;
}
