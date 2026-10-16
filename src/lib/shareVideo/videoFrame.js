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
