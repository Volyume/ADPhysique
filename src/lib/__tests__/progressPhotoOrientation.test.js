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

// ── normaliseCapturedPhoto: applies the decision via the founder-approved
// image tool, fail-open so a failed rotate can never lose a capture. ──
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('../errorLog', () => ({ logWarn: jest.fn(), logError: jest.fn(), logInfo: jest.fn() }));

const { manipulateAsync } = require('expo-image-manipulator');
const { logWarn } = require('../errorLog');
const { normaliseCapturedPhoto } = require('../progressPhotoOrientation');

describe('normaliseCapturedPhoto', () => {
  beforeEach(() => jest.clearAllMocks());

  test('a portrait frame never touches the manipulator (score-what-you-see)', async () => {
    const r = await normaliseCapturedPhoto({ uri: 'file:///p.jpg', width: 3000, height: 4000 });
    expect(r).toEqual({ uri: 'file:///p.jpg', rotated: false, degrees: 0, reason: 'portrait_pixels' });
    expect(manipulateAsync).not.toHaveBeenCalled();
  });

  test('a sideways frame is baked upright BEFORE anything downstream reads it', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'file:///upright.jpg' });
    const r = await normaliseCapturedPhoto({ uri: 'file:///p.jpg', width: 4000, height: 3000, rollSign: -1 });
    expect(manipulateAsync).toHaveBeenCalledWith('file:///p.jpg', [{ rotate: -90 }], { compress: 0.92, format: 'jpeg' });
    expect(r.uri).toBe('file:///upright.jpg');
    expect(r.rotated).toBe(true);
    expect(r.degrees).toBe(-90);
  });

  test('EXIF declaration drives the bake even when pixels look landscape', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'file:///upright.jpg' });
    const r = await normaliseCapturedPhoto({ uri: 'file:///p.jpg', width: 4000, height: 3000, exifOrientation: 6 });
    expect(manipulateAsync).toHaveBeenCalledWith('file:///p.jpg', [{ rotate: 90 }], expect.any(Object));
    expect(r.uri).toBe('file:///upright.jpg');
  });

  test('fail-open: a manipulator throw keeps the original capture and logs once', async () => {
    manipulateAsync.mockRejectedValue(new Error('native fail'));
    const r = await normaliseCapturedPhoto({ uri: 'file:///p.jpg', width: 4000, height: 3000 });
    expect(r).toEqual({ uri: 'file:///p.jpg', rotated: false, degrees: 0, reason: 'manipulator_failed' });
    expect(logWarn).toHaveBeenCalledTimes(1);
  });

  test('fail-open: empty manipulator output keeps the original capture', async () => {
    manipulateAsync.mockResolvedValue({});
    const r = await normaliseCapturedPhoto({ uri: 'file:///p.jpg', width: 4000, height: 3000 });
    expect(r.uri).toBe('file:///p.jpg');
    expect(r.rotated).toBe(false);
  });

  test('missing uri is a safe no-op', async () => {
    const r = await normaliseCapturedPhoto({ width: 4000, height: 3000 });
    expect(r.rotated).toBe(false);
    expect(manipulateAsync).not.toHaveBeenCalled();
  });
});
