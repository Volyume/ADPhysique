/**
 * The framing on a video is the framing on a photo (D229 addendum 5, ruling
 * 11; research report section 1.4).
 *
 * The share screen sends native `rect = photoCoverRect(iw, ih, W, H, crop)`
 * from drawShareCard.js, with the clip's UPRIGHT size from probeVideo, in
 * output pixels with a top-left origin. Native holds no copy of the framing
 * maths: Android turns the rect into Media3's Crop in normalised device
 * coordinates (y up) and stretches the window to the output; iOS scales the
 * upright frame to the rect and flips y for Core Image's bottom-left origin.
 *
 * Pinned: the two numeric cases the research report ran through the repo's
 * own photoCoverRect (the fill case, a 1920x1080 clip on a 1080x1920 story,
 * and a zoomed, off-centre 1080x1920 clip on a 1080x1350 feed card), a JS copy
 * of the Android Crop arithmetic, the crop window keeping the output's
 * aspect, and source guards that the Kotlin and Swift copies are the same
 * arithmetic and that neither holds any zoom or clamping rule of its own.
 */
import fs from 'fs';
import path from 'path';
import { photoCoverRect } from '../../shareCard/drawShareCard';

const ROOT = path.join(__dirname, '..', '..', '..', '..');
const MODULE = path.join(ROOT, 'modules', 'volyume-video-export');
const KOTLIN_DIR = path.join(MODULE, 'android', 'src', 'main', 'java', 'expo', 'modules', 'volyumevideoexport');
const KOTLIN = fs.readFileSync(path.join(KOTLIN_DIR, 'ShareVideoExporter.kt'), 'utf8');
const SWIFT = fs.readFileSync(path.join(MODULE, 'ios', 'ExportJob.swift'), 'utf8');
const ALL_NATIVE = [
  ...fs.readdirSync(KOTLIN_DIR).map((f) => fs.readFileSync(path.join(KOTLIN_DIR, f), 'utf8')),
  ...fs.readdirSync(path.join(MODULE, 'ios')).filter((f) => f.endsWith('.swift'))
    .map((f) => fs.readFileSync(path.join(MODULE, 'ios', f), 'utf8')),
];

const code = (src) => src.split('\n').filter((l) => {
  const t = l.trim();
  return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
}).join('\n');

/** JS copy of the Kotlin Crop arithmetic: the visible window of the source in NDC, y up. */
function cropFromRect(rect, W, H) {
  const u0 = -rect.x / rect.w;
  const u1 = (W - rect.x) / rect.w;
  const v0 = -rect.y / rect.h;
  const v1 = (H - rect.y) / rect.h;
  return { left: 2 * u0 - 1, right: 2 * u1 - 1, bottom: 1 - 2 * v1, top: 1 - 2 * v0, u0, u1, v0, v1 };
}

describe('the cases from section 1.4', () => {
  test('fill: a 1920x1080 clip at zoom 1 on 1080x1920 is a centred 9:16 slice', () => {
    const iw = 1920; const ih = 1080; const W = 1080; const H = 1920;
    const rect = photoCoverRect(iw, ih, W, H, { zoom: 1, cx: 0.5, cy: 0.5 });
    expect(rect).toEqual(photoCoverRect(iw, ih, W, H, null));
    expect(rect.w).toBeCloseTo(3413.3333, 3);
    expect(rect.h).toBeCloseTo(1920, 6);
    expect(rect.x).toBeCloseTo(-1166.6667, 3);
    expect(rect.y).toBeCloseTo(0, 6);

    const c = cropFromRect(rect, W, H);
    expect(c.left).toBeCloseTo(-0.316, 3);
    expect(c.right).toBeCloseTo(0.316, 3);
    expect(c.bottom).toBeCloseTo(-1, 9);
    expect(c.top).toBeCloseTo(1, 9);
    // The window in source pixels has the output's aspect, so the stretch to
    // the output is an identity in shape (607.5 x 1080, 0.5625).
    const ratio = ((c.u1 - c.u0) * iw) / ((c.v1 - c.v0) * ih);
    expect(ratio).toBeCloseTo(W / H, 9);
  });

  test('a 1080x1920 clip at zoom 2, centre (0.3, 0.6), on 1080x1350', () => {
    const iw = 1080; const ih = 1920; const W = 1080; const H = 1350;
    const rect = photoCoverRect(iw, ih, W, H, { zoom: 2, cx: 0.3, cy: 0.6 });
    expect(rect.x).toBeCloseTo(-108, 9);
    expect(rect.y).toBeCloseTo(-1629, 9);
    expect(rect.w).toBeCloseTo(2160, 9);
    expect(rect.h).toBeCloseTo(3840, 9);

    const c = cropFromRect(rect, W, H);
    expect(c.left).toBeCloseTo(-0.9, 9);
    expect(c.right).toBeCloseTo(0.1, 9);
    expect(c.bottom).toBeCloseTo(-0.552, 3);
    expect(c.top).toBeCloseTo(0.152, 3);
    const ratio = ((c.u1 - c.u0) * iw) / ((c.v1 - c.v0) * ih);
    expect(ratio).toBeCloseTo(0.8, 9);
    // iOS: Core Image's origin is bottom-left, so the rect lands at H - y - h.
    expect(H - rect.y - rect.h).toBeCloseTo(-861, 9);
  });

  test('a clip framed at fill or closer never leaves a gap (ruling 12): the window stays inside the source', () => {
    for (const [iw, ih] of [[1920, 1080], [1080, 1920], [3840, 2160], [1080, 1080]]) {
      for (const [W, H] of [[1080, 1920], [1080, 1350], [1080, 1080]]) {
        for (const crop of [{ zoom: 1, cx: 0.5, cy: 0.5 }, { zoom: 1.7, cx: 0.1, cy: 0.9 }, { zoom: 4, cx: 1, cy: 0 }]) {
          const c = cropFromRect(photoCoverRect(iw, ih, W, H, crop), W, H);
          expect(c.left).toBeGreaterThanOrEqual(-1 - 1e-9);
          expect(c.right).toBeLessThanOrEqual(1 + 1e-9);
          expect(c.bottom).toBeGreaterThanOrEqual(-1 - 1e-9);
          expect(c.top).toBeLessThanOrEqual(1 + 1e-9);
          expect(c.left).toBeLessThan(c.right);
          expect(c.bottom).toBeLessThan(c.top);
        }
      }
    }
  });
});

describe('source guards: native uses the rect as sent', () => {
  test('Kotlin Crop is the section 1.4 arithmetic, followed by a stretch to the output', () => {
    const src = code(KOTLIN);
    expect(src).toMatch(/val u0 = -spec\.rectX \/ spec\.rectW/);
    expect(src).toMatch(/val u1 = \(outW - spec\.rectX\) \/ spec\.rectW/);
    expect(src).toMatch(/val v0 = -spec\.rectY \/ spec\.rectH/);
    expect(src).toMatch(/val v1 = \(outH - spec\.rectY\) \/ spec\.rectH/);
    expect(src).toMatch(/Crop\(2f \* u0 - 1f, 2f \* u1 - 1f, 1f - 2f \* v1, 1f - 2f \* v0\)/);
    expect(src).toMatch(/Presentation\.createForWidthAndHeight\(spec\.outWidth, spec\.outHeight, Presentation\.LAYOUT_STRETCH_TO_FIT\)/);
  });

  test('Kotlin effect order is Crop, Presentation, RgbMatrix, then the card', () => {
    const src = code(KOTLIN);
    const at = (re) => src.search(re);
    expect(at(/Crop\(2f/)).toBeLessThan(at(/Presentation\.createForWidthAndHeight/));
    expect(at(/Presentation\.createForWidthAndHeight/)).toBeLessThan(at(/RgbMatrix \{/));
    expect(at(/RgbMatrix \{/)).toBeLessThan(at(/OverlayEffect\(/));
  });

  test('Swift places the upright frame at the rect with the y flip', () => {
    const src = code(SWIFT);
    expect(src).toMatch(/let sx = rect\.width \/ extent\.width/);
    expect(src).toMatch(/let sy = rect\.height \/ extent\.height/);
    expect(src).toMatch(/height - rect\.minY - rect\.height - placedExtent\.minY/);
    expect(src).toMatch(/CILanczosScaleTransform/);
  });

  test('no native file holds a zoom or clamping rule of its own', () => {
    for (const src of ALL_NATIVE) {
      const body = code(src);
      expect(body).not.toMatch(/zoom/i);
      expect(body).not.toMatch(/placeAxis|photoCoverRect|MAX_PHOTO_ZOOM/);
    }
  });

  test('the card is completely still: no outline draw-on in either platform (founder correction 2026-10-15)', () => {
    for (const src of ALL_NATIVE) {
      const body = code(src);
      expect(body).not.toMatch(/CanvasOverlay|PathMeasure|drawOnMs|setLineDash/);
      expect(body).not.toMatch(/outline/i);
    }
  });
});
