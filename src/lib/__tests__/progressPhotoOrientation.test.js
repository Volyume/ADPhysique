/**
 * Pins the pure orientation-decision core for progress-photo capture
 * (founder defect 2026-07-13: propped-phone captures saved sideways frames,
 * so the scorer saw a rotated body and the library thumbnail rendered
 * sideways). The contract that matters most is the scope guard: the module
 * repairs the CAMERA'S orientation bookkeeping only — a portrait frame is
 * never rotated, so a genuinely sideways SUBJECT stays untouched for the
 * body-tilt gate to catch (score-what-you-see, never fix-the-scene).
 */
import { requiredUprightRotation } from '../progressPhotoOrientation';

describe('requiredUprightRotation', () => {
  test('EXIF declarations are honoured exactly', () => {
    expect(requiredUprightRotation({ width: 3000, height: 4000, exifOrientation: 6 }).degrees).toBe(90);
    expect(requiredUprightRotation({ width: 3000, height: 4000, exifOrientation: 8 }).degrees).toBe(-90);
    expect(requiredUprightRotation({ width: 3000, height: 4000, exifOrientation: 3 }).degrees).toBe(180);
    expect(requiredUprightRotation({ width: 3000, height: 4000, exifOrientation: 1 }).degrees).toBe(0);
    // Mirrored variants carry the same rotation component.
    expect(requiredUprightRotation({ exifOrientation: 5 }).degrees).toBe(90);
    expect(requiredUprightRotation({ exifOrientation: 7 }).degrees).toBe(-90);
    expect(requiredUprightRotation({ exifOrientation: 4 }).degrees).toBe(180);
    expect(requiredUprightRotation({ exifOrientation: 2 }).degrees).toBe(0);
  });

  test('EXIF wins even when pixels look landscape', () => {
    const r = requiredUprightRotation({ width: 4000, height: 3000, exifOrientation: 6 });
    expect(r).toEqual({ degrees: 90, reason: 'exif_90' });
  });

  test('landscape pixels with no EXIF rotate back to portrait by lean sign', () => {
    expect(requiredUprightRotation({ width: 4000, height: 3000, rollSign: 1 }))
      .toEqual({ degrees: 90, reason: 'landscape_pixels_roll_positive' });
    expect(requiredUprightRotation({ width: 4000, height: 3000, rollSign: -1 }))
      .toEqual({ degrees: -90, reason: 'landscape_pixels_roll_negative' });
  });

  test('landscape pixels with no sensor still recover (deterministic default)', () => {
    expect(requiredUprightRotation({ width: 4000, height: 3000, rollSign: null }))
      .toEqual({ degrees: 90, reason: 'landscape_pixels_roll_unknown' });
  });

  test('SCOPE GUARD: a portrait frame is never rotated — a sideways subject is left for the body-tilt gate', () => {
    expect(requiredUprightRotation({ width: 3000, height: 4000, rollSign: 1 }))
      .toEqual({ degrees: 0, reason: 'portrait_pixels' });
    expect(requiredUprightRotation({ width: 3000, height: 4000, rollSign: -1 }).degrees).toBe(0);
  });

  test('missing everything is a safe no-op', () => {
    expect(requiredUprightRotation({}).degrees).toBe(0);
    expect(requiredUprightRotation().degrees).toBe(0);
    expect(requiredUprightRotation({ width: NaN, height: NaN }).degrees).toBe(0);
  });
});
