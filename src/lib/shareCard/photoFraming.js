/**
 * photoFraming.js — the arithmetic behind moving and zooming a photo on the
 * share image (founder order 2026-09-26: "when adding a photo id like people
 * to be able to crop the photo or even move the alignment so that it shows
 * best in the background ... if I can move it up down left or right it will
 * show better").
 *
 * The positioning view (components/SharePhotoFramer.js) shows the photo at
 * its cover size inside a frame the card's shape, centred, and moves it with
 * a translate and a scale about the frame's centre. These helpers convert
 * between that on-screen transform and the renderer's resolution-free
 * framing ({ zoom, cx, cy }, drawShareCard.js photoCoverRect), so what the
 * athlete lines up in the frame is exactly what the exported card draws, at
 * any size and on any of the formats. Pure.
 */
import { MAX_PHOTO_ZOOM, photoCoverRect, photoCropFromRect } from './drawShareCard';

export { MAX_PHOTO_ZOOM };

/** The photo's size when it just covers the frame (zoom 1). */
export function coverSize(iw, ih, fw, fh) {
  const base = Math.max(fw / iw, fh / ih);
  return { w: iw * base, h: ih * base };
}

/**
 * The furthest the photo can move from centre along one axis at a zoom, so it
 * always covers the frame. `size` is the photo's cover size on that axis.
 */
export function maxOffset(size, frame, zoom) {
  return Math.max(0, (size * zoom - frame) / 2);
}

export function clampOffset(value, size, frame, zoom) {
  const m = maxOffset(size, frame, zoom);
  return Math.min(m, Math.max(-m, value));
}

export function clampZoom(zoom) {
  return Math.min(MAX_PHOTO_ZOOM, Math.max(1, Number.isFinite(zoom) ? zoom : 1));
}

/**
 * The framing -> the view's transform: { zoom, tx, ty }, where (tx, ty) moves
 * the photo's centre away from the frame's centre.
 */
export function transformFromCrop(iw, ih, fw, fh, crop) {
  const r = photoCoverRect(iw, ih, fw, fh, crop);
  const c = coverSize(iw, ih, fw, fh);
  const zoom = clampZoom(r.w / c.w);
  return {
    zoom,
    tx: r.x + r.w / 2 - fw / 2,
    ty: r.y + r.h / 2 - fh / 2,
  };
}

/** The view's transform -> the framing the renderer draws. */
export function cropFromTransform(iw, ih, fw, fh, { zoom, tx, ty }) {
  const c = coverSize(iw, ih, fw, fh);
  const z = clampZoom(zoom);
  const w = c.w * z;
  const h = c.h * z;
  const x = fw / 2 + clampOffset(tx, c.w, fw, z) - w / 2;
  const y = fh / 2 + clampOffset(ty, c.h, fh, z) - h / 2;
  return photoCropFromRect(iw, ih, fw, fh, { x, y, w, h });
}

/** True when the framing is the plain centre crop (nothing to reset). */
export function isCentreCrop(crop) {
  if (!crop) return true;
  const near = (a, b) => Math.abs((Number.isFinite(a) ? a : b) - b) < 0.002;
  return near(crop.zoom, 1) && near(crop.cx, 0.5) && near(crop.cy, 0.5);
}
