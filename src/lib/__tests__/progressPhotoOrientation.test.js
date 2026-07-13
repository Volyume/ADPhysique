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

  test('a sideways NO-EXIF frame gets an explicit rotate (decode alone fixes nothing)', async () => {
    manipulateAsync.mockResolvedValue({ uri: 'file:///upright.jpg' });
    const r = await normaliseCapturedPhoto({ uri: 'file:///p.jpg', width: 4000, height: 3000, rollSign: -1 });
    expect(manipulateAsync).toHaveBeenCalledWith('file:///p.jpg', [{ rotate: -90 }], { compress: 0.92, format: 'jpeg' });
    expect(r.uri).toBe('file:///upright.jpg');
    expect(r.rotated).toBe(true);
    expect(r.degrees).toBe(-90);
  });

  test('an EXIF-declared frame bakes via decode-normalisation with NO extra rotate (double-rotate regression)', async () => {
    // The manipulator decodes with EXIF applied, so an explicit rotate on an
    // EXIF-tagged file would rotate PAST upright. EXIF cases must send an
    // EMPTY action list - the re-encode itself bakes the upright pixels.
    manipulateAsync.mockResolvedValue({ uri: 'file:///upright.jpg' });
    const r = await normaliseCapturedPhoto({ uri: 'file:///p.jpg', width: 4000, height: 3000, exifOrientation: 6 });
    expect(manipulateAsync).toHaveBeenCalledWith('file:///p.jpg', [], expect.any(Object));
    expect(r.uri).toBe('file:///upright.jpg');
    expect(r.rotated).toBe(true);
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

// ── jpegExifOrientation + the orientation-safe strip (founder repro:
// preview upright, saved sideways — the save stripped the EXIF rotate tag
// while keeping raw pixels). ──
const fs = require('fs');
const path = require('path');
const { jpegExifOrientation, stripJpegExifBytes } = require('../progressPhotos');

// Minimal JPEG: SOI + APP1(Exif, TIFF, IFD0 with orientation tag) + EOI.
function jpegWithOrientation(value, { little = true } = {}) {
  const tiff = little
    ? [0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, // II, 42, IFD0 @8
       0x01, 0x00,                                     // 1 entry
       0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, value, 0x00, 0x00, 0x00,
       0x00, 0x00, 0x00, 0x00]                         // next IFD
    : [0x4D, 0x4D, 0x00, 0x2A, 0x00, 0x00, 0x00, 0x08,
       0x00, 0x01,
       0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, value, 0x00, 0x00,
       0x00, 0x00, 0x00, 0x00];
  const exif = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
  const len = exif.length + 2;
  return new Uint8Array([0xFF, 0xD8, 0xFF, 0xE1, (len >> 8) & 0xFF, len & 0xFF, ...exif, 0xFF, 0xD9]);
}

describe('iPhone XMP-first APP1 layout (founder native-camera photo scored 33/100, 2026-07-13)', () => {
  function iphoneStyleJpeg({ xmpFirst = true } = {}) {
    const xmpBody = Array.from('http://ns.adobe.com/xap/1.0/ <x:xmpmeta/>').map((c) => c.charCodeAt(0));
    const xmp = [0xFF, 0xE1, (xmpBody.length + 2) >> 8, (xmpBody.length + 2) & 0xFF, ...xmpBody];
    const tiff = [
      0x4D, 0x4D, 0x00, 0x2A, 0x00, 0x00, 0x00, 0x08,
      0x00, 0x01,
      0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x06, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
    ];
    const exifBody = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
    const exif = [0xFF, 0xE1, (exifBody.length + 2) >> 8, (exifBody.length + 2) & 0xFF, ...exifBody];
    const sos = [0xFF, 0xDA, 0x00, 0x02, 0x11, 0x22, 0x33];
    const eoi = [0xFF, 0xD9];
    const segs = xmpFirst ? [...xmp, ...exif] : [...exif, ...xmp];
    return new Uint8Array([0xFF, 0xD8, ...segs, ...sos, ...eoi]);
  }

  test('orientation is read past a leading XMP APP1 (the layout real iPhone JPEGs use)', () => {
    expect(jpegExifOrientation(iphoneStyleJpeg({ xmpFirst: true }))).toBe(6);
    expect(jpegExifOrientation(iphoneStyleJpeg({ xmpFirst: false }))).toBe(6);
  });

  test('REGRESSION: the old first-APP1-only read skipped the bake while the strip still deleted the tag, leaving the photo permanently sideways', () => {
    // With the fix, the orientation IS readable, so copyPhotoStrippingExif
    // bakes the pixels upright BEFORE the strip runs. The strip itself
    // removing every APP1 is then lossless by construction.
    const jpg = iphoneStyleJpeg({ xmpFirst: true });
    expect(jpegExifOrientation(jpg)).toBe(6);
    const stripped = stripJpegExifBytes(jpg);
    expect(jpegExifOrientation(stripped)).toBeNull();
  });
});

describe('jpegExifOrientation', () => {
  test('reads orientation 6 (little-endian TIFF)', () => {
    expect(jpegExifOrientation(jpegWithOrientation(6))).toBe(6);
  });
  test('reads orientation 8 (big-endian TIFF)', () => {
    expect(jpegExifOrientation(jpegWithOrientation(8, { little: false }))).toBe(8);
  });
  test('upright and absent tags read as 1 / null', () => {
    expect(jpegExifOrientation(jpegWithOrientation(1))).toBe(1);
    expect(jpegExifOrientation(new Uint8Array([0xFF, 0xD8, 0xFF, 0xD9]))).toBe(null);
  });
  test('malformed input is null, never a throw', () => {
    expect(jpegExifOrientation(new Uint8Array([0x00, 0x01]))).toBe(null);
    expect(jpegExifOrientation(new Uint8Array([]))).toBe(null);
  });
});

describe('the save path bakes orientation before stripping (source pin)', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'progressPhotos.js'), 'utf8');
  test('copyPhotoStrippingExif reads the tag, bakes when rotated, then strips', () => {
    const fnAt = src.indexOf('async function copyPhotoStrippingExif');
    const readTagAt = src.indexOf('jpegExifOrientation(bytes)', fnAt);
    const bakeAt = src.indexOf('manipulateAsync(from, [],', fnAt);
    const stripAt = src.indexOf('stripJpegExifBytes(bytes)', fnAt);
    expect(fnAt).toBeGreaterThan(-1);
    expect(readTagAt).toBeGreaterThan(fnAt);
    expect(bakeAt).toBeGreaterThan(readTagAt);
    expect(stripAt).toBeGreaterThan(bakeAt);
  });
});
