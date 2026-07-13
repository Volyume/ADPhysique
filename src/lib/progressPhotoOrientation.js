/**
 * progressPhotoOrientation — the pure decision core for straightening a
 * captured progress photo BEFORE it is saved, scored, or shown (founder
 * defect 2026-07-13: a propped/flat phone confuses the platform's
 * portrait-vs-landscape guess, so the camera wrote sideways frames; the
 * scorer then saw a rotated body — bodyTiltDegrees ~-44 on a straight
 * capture — and the library thumbnail rendered sideways).
 *
 * Design (one file, one truth): capture → decide rotation HERE → bake
 * upright pixels → save → score → display. The scorer and the gallery
 * consume the SAME already-upright file; nothing is ever scored sideways
 * and "flipped after the fact".
 *
 * Scope guard: this repairs the CAMERA'S orientation bookkeeping only. The
 * capture UI is portrait-locked (app.json orientation: portrait), so the
 * correct saved frame is always portrait — exactly what the user framed in
 * the preview. A user who is genuinely sideways INSIDE a correctly-
 * oriented frame is untouched by this module: the frame is already
 * portrait, rotation is 0, and the image-derived body-tilt gate
 * (progressScanVision, camera_tilted) abstains with the retake prompt as
 * designed. This module must never try to "fix" the scene.
 *
 * Pure: no I/O, no native calls — the caller applies `degrees` with
 * whatever image tool is wired (and passes the result to save + score).
 *
 * @param {object} args
 * @param {number|null} args.width           decoded pixel width of the captured file
 * @param {number|null} args.height          decoded pixel height of the captured file
 * @param {number|null} args.exifOrientation EXIF orientation tag (1..8) when the
 *                                           platform provided one, else null
 * @param {number|null} args.rollSign        sign of the accelerometer x-axis at the
 *                                           shutter (the level indicator's reading):
 *                                           which way the phone leaned. null when the
 *                                           sensor was unavailable.
 * @returns {{ degrees: 0|90|180|-90, reason: string }} clockwise rotation to
 *          bake so the frame is portrait-upright.
 */
export function requiredUprightRotation({
  width = null,
  height = null,
  exifOrientation = null,
  rollSign = null,
} = {}) {
  // 1. An EXIF orientation tag is the camera's own declaration — honour it
  //    exactly. (Tags 2/4/5/7 are mirrored variants; the front camera's
  //    mirroring is handled by the platform preview contract, so only the
  //    rotation component matters here.)
  if (exifOrientation === 3 || exifOrientation === 4) {
    return { degrees: 180, reason: 'exif_180' };
  }
  if (exifOrientation === 6 || exifOrientation === 5) {
    return { degrees: 90, reason: 'exif_90' };
  }
  if (exifOrientation === 8 || exifOrientation === 7) {
    return { degrees: -90, reason: 'exif_270' };
  }
  if (exifOrientation === 1 || exifOrientation === 2) {
    return { degrees: 0, reason: 'exif_upright' };
  }

  // 2. No EXIF declaration. The capture preview is portrait-locked, so
  //    landscape pixels mean the platform guessed wrong (the propped/flat
  //    phone case). Rotate back to portrait; the shutter-time lean sign
  //    says which way the platform rolled the frame.
  const w = Number.isFinite(width) ? width : null;
  const h = Number.isFinite(height) ? height : null;
  if (w != null && h != null && w > h) {
    if (rollSign != null && rollSign < 0) {
      return { degrees: -90, reason: 'landscape_pixels_roll_negative' };
    }
    // Positive or unknown lean: the common iOS flat-phone default writes
    // landscape-left, which +90 restores.
    return { degrees: 90, reason: rollSign != null ? 'landscape_pixels_roll_positive' : 'landscape_pixels_roll_unknown' };
  }

  // 3. Portrait pixels, no EXIF: the frame already matches the preview.
  //    (A genuinely sideways SUBJECT lands here on purpose — untouched.)
  return { degrees: 0, reason: 'portrait_pixels' };
}
