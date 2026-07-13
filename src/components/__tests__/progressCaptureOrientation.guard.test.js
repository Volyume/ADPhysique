/**
 * Founder defect + design ruling (2026-07-13): captured progress photos must
 * be straightened BEFORE anything reads them — one upright file consumed by
 * the approval preview, the save, the SCORER, and the library alike. Never
 * score-then-flip. This source guard pins the capture wiring in
 * ProgressGhostCapture so no refactor can quietly reorder it:
 *
 *   takePictureAsync (with exif) → normaliseCapturedPhoto → the pending
 *   preview uri is the NORMALISED uri (norm.uri, never pic.uri).
 *
 * The scope guard itself (a portrait frame is never rotated, so a genuinely
 * sideways subject stays a retake prompt via the body-tilt gate) is pinned
 * behaviourally in progressPhotoOrientation.test.js; this file pins the
 * wiring only.
 */
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '..', 'ProgressGhostCapture.js'),
  'utf8',
);

describe('ProgressGhostCapture orientation wiring (founder ruling 2026-07-13)', () => {
  test('the camera is asked for its EXIF orientation declaration', () => {
    expect(src).toMatch(/takePictureAsync\(\{ quality: 0\.92, exif: true \}\)/);
  });

  test('the capture is normalised before the approval preview, and the preview uses the normalised uri', () => {
    const captureAt = src.indexOf('takePictureAsync({ quality: 0.92, exif: true })');
    const normaliseAt = src.indexOf('await normaliseCapturedPhoto({', captureAt);
    const pendingAt = src.indexOf('setPendingCaptureUri(norm.uri)', normaliseAt);
    expect(captureAt).toBeGreaterThan(-1);
    expect(normaliseAt).toBeGreaterThan(captureAt);
    expect(pendingAt).toBeGreaterThan(normaliseAt);
    // The raw camera uri must never reach the preview/save path directly.
    expect(src).not.toMatch(/setPendingCaptureUri\(pic\.uri\)/);
  });

  test('the normaliser receives the full decision context (dimensions, EXIF, shutter-time lean)', () => {
    expect(src).toMatch(/uri: pic\.uri,\s*width: pic\.width \?\? null,\s*height: pic\.height \?\? null,\s*exifOrientation: pic\.exif\?\.Orientation \?\? null,\s*rollSign: rollRef\.current != null \? \(Math\.sign\(rollRef\.current\) \|\| null\) : null,/);
  });

  test('the shutter-time lean comes from a ref, never a stale closure', () => {
    expect(src).toMatch(/const rollRef = useRef\(null\)/);
    expect(src).toMatch(/rollRef\.current = roll;/);
  });

  test('front-camera saves are mirrored to match the preview the user approves', () => {
    // Founder defect (2026-07-13): the front preview is mirrored but the
    // captured file was not, so saves looked left-right flipped against what
    // was framed. What you saw is what is saved and scored.
    expect(src).toMatch(/mirror=\{facing === 'front'\}/);
  });
});
