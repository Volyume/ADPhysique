/**
 * photoLookRender.test.js
 *
 * Founder order 2026-09-27: "Can we add an option of a tint or filter to the
 * images added as well ... Almost like Instagram filters but a select group
 * of them that enhance the look ... Maybe even the option to up and down the
 * filter." photoLooks.js supplies the looks and their maths (read, not
 * edited, here); this pins how drawShareCard.js WIRES them in.
 *
 * Pinned, all written to FAIL against the pre-look renderer:
 *
 *  - the athlete's photo alone carries the chosen look's colour filter, at
 *    the chosen strength -- no other draw (text, rules, the outline, the
 *    wordmark, the scrim, the before/after cells) ever carries one;
 *  - 'none' (or an absent photoLook) leaves every paint free of a colour
 *    filter, on every draw, including the photo itself;
 *  - the look's vignette is a radial gradient centred on, and reaching its
 *    full alpha by the corners of, the outline rectangle -- drawn only when
 *    there is a photo AND a look with a non-zero vignette, and drawn inside
 *    the SAME outline clip as the photo, on both the normal path and the
 *    OMIT_PHOTO path (the screen's positioning view lays this render over
 *    the real photo it moves, so the vignette must still land on top of it);
 *  - the sampled scrim tone answers to what the look actually draws (a lead
 *    update, 2026-09-27, relaying the founder: text must "still look good and
 *    stand out"), via applyLookToTone, pinned directly as a pure function.
 *
 * A recording canvas + stub Skia, extending the pattern in
 * sessionCardLayout.test.js: every draw call is captured (including, here,
 * the Paint each one used), so the things a screenshot can't assert directly
 * -- which paint got a colour filter, what a shader's own stops were -- are
 * checked exactly.
 */
import { drawShareCard, applyLookToTone } from '../drawShareCard';
import { lookMatrix, lookVignette } from '../photoLooks';

const stubFont = (px) => ({
  getSize: () => px,
  getGlyphIDs: (str) => new Array(String(str).length).fill(1),
  getGlyphWidths: (ids) => ids.map(() => px * 0.55),
});

function makeStubSkia() {
  return {
    Paint: () => {
      const p = {
        color: null, filter: null, shader: null, style: undefined, strokeWidth: undefined, alpha: undefined,
        setAntiAlias() {},
        setColor(c) { p.color = c; },
        setStyle(v) { p.style = v; },
        setStrokeWidth(v) { p.strokeWidth = v; },
        setMaskFilter() {},
        setShader(sh) { p.shader = sh; },
        setColorFilter(f) { p.filter = f; },
        setAlphaf(a) { p.alpha = a; },
      };
      return p;
    },
    Color: (c) => c,
    ColorFilter: { MakeMatrix: (m) => ({ kind: 'matrix', m }) },
    XYWHRect: (x, y, w, h) => ({ x, y, w, h }),
    RRectXY: (rect, rx, ry) => ({ rect, rx, ry }),
    Font: (_tf, px) => stubFont(px),
    MaskFilter: { MakeBlur: () => ({}) },
    Shader: {
      MakeLinearGradient: (start, end, colors, pos, mode) => ({ kind: 'linear', start, end, colors, pos, mode }),
      MakeRadialGradient: (center, radius, colors, pos, mode) => ({ kind: 'radial', center, radius, colors, pos, mode }),
    },
    Point: (x, y) => ({ x, y }),
    Data: { fromBytes: () => ({}) },
  };
}

function record(params, opts = {}) {
  const {
    width = 1080, bgPhoto = null, wordmark = null, wordmarkDark = null, omitPhoto = false,
  } = opts;
  const texts = [];
  const rrects = [];
  const rects = [];
  const clips = [];
  const images = [];
  const canvas = new Proxy({}, {
    get: (_t, key) => {
      if (key === 'clipRRect') return (r, op) => clips.push({ rect: r.rect || {}, op });
      if (key === 'drawText') return (str, x, y, paint) => texts.push({ str, x, y, paint });
      if (key === 'drawRRect') return (r, paint) => rrects.push({ ...(r.rect || {}), paint });
      if (key === 'drawRect') return (r, paint) => rects.push({ ...r, paint });
      if (key === 'drawImageRect') return (img, src, dst, paint) => images.push({ img, src, dst, paint });
      return () => undefined;
    },
  });
  const Skia = makeStubSkia();
  drawShareCard(canvas, {
    Skia, width, params, typefaces: { regular: {}, bold: {} }, wordmark, wordmarkDark, bgPhoto, omitPhoto,
  });
  return { texts, rrects, rects, clips, images, strings: texts.map((t) => t.str) };
}

const PHOTO = { width: () => 1000, height: () => 1500 };

const SESSION = (over = {}) => ({
  cardType: 'session',
  sessionName: 'Leg Day',
  showVolume: true,
  tonnage: 9340,
  workingSets: 18,
  prCount: 0,
  units: 'kg',
  aspect: 'story',
  ...over,
});

const isRadialVignette = (r) => r.paint && r.paint.shader && r.paint.shader.kind === 'radial';

describe('the photo look colours the athlete\'s photo alone', () => {
  test('the photo draw carries the chosen look at the chosen strength', () => {
    const { images } = record(SESSION({ photoLook: 'gold', photoLookStrength: 0.5 }), { bgPhoto: PHOTO });
    const photoDraws = images.filter((im) => im.img === PHOTO);
    expect(photoDraws).toHaveLength(1);
    expect(photoDraws[0].paint.filter).toEqual({ kind: 'matrix', m: lookMatrix('gold', 0.5) });
  });

  test('no other draw -- text, rules, the outline, the wordmark -- ever carries a colour filter', () => {
    const WM = { width: () => 1032, height: () => 277 };
    const { texts, rrects, rects, images } = record(
      SESSION({ photoLook: 'pump', photoLookStrength: 1, showPlanName: true, planName: 'Push Pull Legs', showDate: true, date: 'Sat' }),
      { bgPhoto: PHOTO, wordmark: WM },
    );
    texts.forEach((t) => expect(t.paint && t.paint.filter).toBeFalsy());
    rrects.forEach((r) => expect(r.paint && r.paint.filter).toBeFalsy());
    rects.forEach((r) => expect(r.paint && r.paint.filter).toBeFalsy());
    images.filter((im) => im.img !== PHOTO).forEach((im) => expect(im.paint && im.paint.filter).toBeFalsy());
  });

  test('None, or no photoLook at all, leaves every paint free of a colour filter -- including the photo', () => {
    const a = record(SESSION({ photoLook: 'none' }), { bgPhoto: PHOTO });
    const b = record(SESSION(), { bgPhoto: PHOTO }); // photoLook omitted -> defaults to 'none'
    [a, b].forEach(({ images }) => {
      images.forEach((im) => expect(im.paint && im.paint.filter).toBeFalsy());
    });
  });

  test('strength 0 is the untouched photo, whatever look is named', () => {
    const { images } = record(SESSION({ photoLook: 'iron', photoLookStrength: 0 }), { bgPhoto: PHOTO });
    expect(images.find((im) => im.img === PHOTO).paint.filter).toBeFalsy();
  });
});

describe('the look\'s vignette', () => {
  test('is drawn only with a photo AND a look whose vignette is non-zero, inside the outline clip', () => {
    const withLook = record(SESSION({ photoLook: 'stage' }), { bgPhoto: PHOTO });
    expect(withLook.rects.filter(isRadialVignette)).toHaveLength(1);
    // clipRRect ops: 0 = everything but the outline (the ground), 1 = inside
    // it -- the same pair the photo itself draws inside.
    expect(withLook.clips.map((c) => c.op)).toEqual([0, 1]);

    expect(record(SESSION({ photoLook: 'none' }), { bgPhoto: PHOTO }).rects.filter(isRadialVignette)).toHaveLength(0);
    expect(record(SESSION({ photoLook: 'stage' })).rects.filter(isRadialVignette)).toHaveLength(0); // no photo at all
  });

  test('still draws when the photo itself is omitted from this render (OMIT_PHOTO)', () => {
    const { images, rects } = record(SESSION({ photoLook: 'stage' }), { bgPhoto: PHOTO, omitPhoto: true });
    expect(images.filter((im) => im.img === PHOTO)).toHaveLength(0); // the photo itself is skipped
    expect(rects.filter(isRadialVignette)).toHaveLength(1); // the vignette is not
  });

  test('is centred on the outline and reaches the look\'s vignette alpha by its corners', () => {
    const { rects, rrects } = record(SESSION({ photoLook: 'stage', photoLookStrength: 1 }), { bgPhoto: PHOTO });
    const [outline] = rrects;
    const v = rects.find(isRadialVignette);
    const sh = v.paint.shader;
    expect(sh.center.x).toBeCloseTo(outline.x + outline.w / 2, 3);
    expect(sh.center.y).toBeCloseTo(outline.y + outline.h / 2, 3);
    expect(sh.radius).toBeCloseTo(Math.sqrt((outline.w / 2) ** 2 + (outline.h / 2) ** 2), 3);
    expect(sh.colors[0]).toBe('rgba(0,0,0,0)');
    expect(sh.colors[sh.colors.length - 1]).toBe(`rgba(0,0,0,${lookVignette('stage', 1)})`);
    expect(sh.pos[0]).toBe(0);
    expect(sh.pos[sh.pos.length - 1]).toBe(1);
  });

  test('scales with strength, exactly as lookVignette says', () => {
    const half = record(SESSION({ photoLook: 'forge', photoLookStrength: 0.5 }), { bgPhoto: PHOTO });
    const sh = half.rects.find(isRadialVignette).paint.shader;
    expect(sh.colors[sh.colors.length - 1]).toBe(`rgba(0,0,0,${lookVignette('forge', 0.5)})`);
  });
});

// Lead update 2026-09-27, relaying the founder: "we need to make sure ...
// the text ... still looks good and stands out." The scrim must be built
// from the photo AS THE LOOK DRAWS IT, not the untouched original -- pinned
// directly against applyLookToTone (the pure function drawBackground calls
// before handing the tone to the scrim).
describe('the scrim answers to what the look actually draws (applyLookToTone)', () => {
  const baseTone = { r: 40, g: 35, b: 30, luminance: 36, topLuminance: 50 };

  test('None, or strength 0, leaves the sampled tone byte-identical (the same object)', () => {
    expect(applyLookToTone(baseTone, 'none', 1)).toBe(baseTone);
    expect(applyLookToTone(baseTone, 'gold', 0)).toBe(baseTone);
    expect(applyLookToTone(null, 'gold', 1)).toBeNull();
  });

  test('a brightening look (Gold) lifts the tone the scrim is built from', () => {
    expect(applyLookToTone(baseTone, 'gold', 1).luminance).toBeGreaterThan(baseTone.luminance);
  });

  test('a darkening look (Iron) lowers the tone the scrim is built from', () => {
    expect(applyLookToTone(baseTone, 'iron', 1).luminance).toBeLessThan(baseTone.luminance);
  });

  test('is exactly the look\'s matrix applied to the sampled colour, clamped to 0..1', () => {
    const m = lookMatrix('stage', 0.6);
    const filtered = applyLookToTone(baseTone, 'stage', 0.6);
    const r0 = baseTone.r / 255; const g0 = baseTone.g / 255; const b0 = baseTone.b / 255;
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const r = clamp01(m[0] * r0 + m[1] * g0 + m[2] * b0 + m[3] + m[4]);
    const g = clamp01(m[5] * r0 + m[6] * g0 + m[7] * b0 + m[8] + m[9]);
    const b = clamp01(m[10] * r0 + m[11] * g0 + m[12] * b0 + m[13] + m[14]);
    expect(filtered.r).toBeCloseTo(r * 255, 6);
    expect(filtered.g).toBeCloseTo(g * 255, 6);
    expect(filtered.b).toBeCloseTo(b * 255, 6);
    expect(filtered.luminance).toBeCloseTo((0.2126 * r + 0.7152 * g + 0.0722 * b) * 255, 6);
  });

  test('the top band\'s luminance scales by the same before/after ratio as the whole photo', () => {
    const filtered = applyLookToTone(baseTone, 'forge', 0.8);
    const ratio = filtered.luminance / baseTone.luminance;
    expect(filtered.topLuminance).toBeCloseTo(baseTone.topLuminance * ratio, 6);
  });

  test('never divides by zero when the sampled tone is black', () => {
    expect(() => applyLookToTone({ r: 0, g: 0, b: 0, luminance: 0, topLuminance: 0 }, 'gold', 1)).not.toThrow();
  });
});
