/**
 * clipTone: the card's scrim is set from the BRIGHTEST moment of a clip,
 * not its first frame (D229 addendum 4, rule 2). The photo path samples one
 * image's tone under the text bands (drawShareCard.sampleAverageTone); a
 * clip is sampled on several frames spaced through its trim window, each
 * placed exactly as the clip is framed, and the scrim takes the brightest
 * reading of each band, so the worst frame of the loop decides. The colour
 * is the brightest frame's, so the ink matches where legibility is tightest.
 *
 * Rule 3 (the bright tier): a clip never gets the lighter photo tier, so the
 * luminance handed to the scrim is lifted to at least the floor that puts
 * drawPhotoScrim on its bright tier, whatever the sampling found.
 */
import { sampleAverageTone } from '../shareCard/drawShareCard';

// drawShareCard's SCRIM_LEGIBILITY_LUMINANCE_FLOOR is 130: a luminance above
// it draws the deeper scrim. One above the floor keeps a clip on that tier.
export const VIDEO_SCRIM_TIER_LUMINANCE = 131;

/** The brightest band readings across sampled tones. Pure. */
export function brightestTone(tones) {
  const list = (tones || []).filter((t) => t && Number.isFinite(t.luminance));
  if (!list.length) return null;
  let best = list[0];
  let topMax = -Infinity;
  for (const t of list) {
    if (t.luminance > best.luminance) best = t;
    const top = Number.isFinite(t.topLuminance) ? t.topLuminance : t.luminance;
    if (top > topMax) topMax = top;
  }
  return {
    r: best.r, g: best.g, b: best.b,
    luminance: best.luminance,
    topLuminance: topMax,
  };
}

/** Lifts a tone onto the bright scrim tier (rule 3). Pure. */
export function videoTier(tone) {
  if (!tone) {
    return { r: 10, g: 10, b: 10, luminance: VIDEO_SCRIM_TIER_LUMINANCE, topLuminance: VIDEO_SCRIM_TIER_LUMINANCE };
  }
  return {
    ...tone,
    luminance: Math.max(VIDEO_SCRIM_TIER_LUMINANCE, tone.luminance),
    topLuminance: Math.max(VIDEO_SCRIM_TIER_LUMINANCE, Number.isFinite(tone.topLuminance) ? tone.topLuminance : tone.luminance),
  };
}

/**
 * The tone the card's scrim should be drawn from for a clip: frames sampled
 * the photo way, the brightest readings kept, lifted to the bright tier.
 *
 * @param {object} Skia
 * @param {object[]} frames SkImages spaced through the trim window (upright)
 * @param {number} W output width
 * @param {number} H output height
 * @param {object|null} crop the person's framing ({ zoom, cx, cy }) or null
 * @returns {{r: number, g: number, b: number, luminance: number, topLuminance: number}}
 */
export function sampleClipTone(Skia, frames, W, H, crop) {
  const tones = [];
  for (const frame of frames || []) {
    if (!frame) continue;
    try {
      const t = sampleAverageTone(Skia, frame, W, H, crop);
      if (t) tones.push(t);
    } catch (_e) { /* a frame that cannot be read is skipped */ }
  }
  return videoTier(brightestTone(tones));
}
