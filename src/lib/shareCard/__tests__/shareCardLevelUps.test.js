/**
 * shareCardLevelUps.test.js
 *
 * Register D229 addendum 6 (founder, verbatim in part: "the share is
 * actually not full screen on most mobiles. It's kind of cut, even the
 * Instagram share. Can we, like, extend it ... not wider, taller", "We don't
 * want to encourage too much blank space", "elegant perhaps"), the two
 * renderer level-ups kept after the founder's correction of 2026-10-15:
 *
 *  1. THE BACKDROP BLEED, the default. With a photo, the photo in its look
 *     is drawn over the whole canvas first, softened by a Skia blur image
 *     filter (BLEED_BLUR_RATIO of W) and covered outside the outline by the
 *     theme's ground at BLEED_INK_ALPHA; inside the outline the sharp photo,
 *     the vignette and the scrim are unchanged. The OMIT_PHOTO render (the
 *     live photo preview, the video overlay) draws no photo and paints only
 *     the translucent ink outside the outline. A card with no photo gets a
 *     quiet gradient of two of the theme's own ground tones, every text role
 *     keeping its contrast against both.
 *  2. FULL SCREEN: height is width times the phone's own aspect, held to
 *     16:9..2.3, and the outline's band clears the phone's own status bar
 *     and home indicator (the passed ratios) instead of a story's chrome.
 *
 * Plus the two exports the clip tone sampler reads (addendum 4).
 *
 * Written to FAIL against the pre-level-up renderer: it drew the plain
 * ground outside the outline, never drew the photo there, had no gradient
 * ground, and knew no 'full' aspect.
 *
 * A recording canvas and a stub Skia (the shareCardTheme.test.js pattern:
 * Skia.Color is the identity, every draw is captured with its Paint), plus
 * real CanvasKit where it is available (the drawShareCard.test.js pattern:
 * self-guarding, never failing the build where it cannot run) to prove the
 * softening and the ink are really there in pixels.
 */
import * as Draw from '../drawShareCard';

const {
  drawShareCard, cardHeight, sessionLiftsThatFit, clampFullAspect,
  DARK_PALETTE, LIGHT_PALETTE, FULL_ASPECT_MIN, FULL_ASPECT_MAX,
  BLEED_BLUR_RATIO, BLEED_INK_ALPHA,
} = Draw;

const fs = require('fs');
const path = require('path');

const stubFont = (px) => ({
  getSize: () => px,
  getGlyphIDs: (str) => new Array(String(str).length).fill(1),
  getGlyphWidths: (ids) => ids.map(() => px * 0.55),
});

function makeStubSkia({ withBlur = true } = {}) {
  const Skia = {
    Paint: () => {
      const p = {
        color: null, filter: null, shader: null, imageFilter: null,
        setAntiAlias() {},
        setColor(c) { p.color = c; },
        setStyle() {},
        setStrokeWidth() {},
        setShader(sh) { p.shader = sh; },
        setColorFilter(f) { p.filter = f; },
        setAlphaf() {},
      };
      if (withBlur) p.setImageFilter = (f) => { p.imageFilter = f; };
      return p;
    },
    Color: (c) => c,
    ColorFilter: { MakeMatrix: (m) => ({ kind: 'matrix', m }) },
    XYWHRect: (x, y, w, h) => ({ x, y, w, h }),
    RRectXY: (rect, rx, ry) => ({ rect, rx, ry }),
    Font: (_tf, px) => stubFont(px),
    Shader: {
      MakeLinearGradient: (start, end, colors, pos) => ({ kind: 'linear', start, end, colors, pos }),
      MakeRadialGradient: (center, radius, colors, pos) => ({ kind: 'radial', center, radius, colors, pos }),
    },
    Point: (x, y) => ({ x, y }),
    Data: { fromBytes: () => ({}) },
  };
  if (withBlur) Skia.ImageFilter = { MakeBlur: (sx, sy, mode, input) => ({ kind: 'blur', sx, sy, mode, input }) };
  return Skia;
}

// Every draw in order, with the clip op active around it (null = no clip).
function record(params, opts = {}) {
  const {
    width = 1080, bgPhoto = null, omitPhoto = false, withBlur = true,
  } = opts;
  const ops = [];
  const clipStack = [null];
  const top = () => clipStack[clipStack.length - 1];
  const canvas = new Proxy({}, {
    get: (_t, key) => {
      if (key === 'save') return () => { clipStack.push(top()); };
      if (key === 'restore') return () => { clipStack.pop(); };
      if (key === 'clipRRect') return (r, op) => { clipStack[clipStack.length - 1] = op; ops.push({ kind: 'clip', op, rect: r.rect }); };
      if (key === 'drawRect') return (r, paint) => ops.push({ kind: 'rect', ...r, paint, clip: top() });
      if (key === 'drawRRect') return (r, paint) => ops.push({ kind: 'rrect', ...(r.rect || {}), paint, clip: top() });
      if (key === 'drawImageRect') return (img, src, dst, paint) => ops.push({ kind: 'image', img, dst, paint, clip: top() });
      if (key === 'drawText') return (str, x, y, paint) => ops.push({ kind: 'text', str, x, y, paint, clip: top() });
      return () => undefined;
    },
  });
  const Skia = makeStubSkia({ withBlur });
  const out = drawShareCard(canvas, {
    Skia, width, params, typefaces: { regular: {}, bold: {} }, wordmark: null, bgPhoto, omitPhoto,
  });
  return { ops, out };
}

const PHOTO = { width: () => 1000, height: () => 1500 };

const SESSION = (over = {}) => ({
  cardType: 'session',
  sessionName: 'Leg Day',
  showVolume: true,
  tonnage: 9340,
  workingSets: 18,
  duration: 45,
  prCount: 0,
  units: 'kg',
  aspect: 'story',
  ...over,
});

const isFullCanvas = (op, W, H) => op.x === 0 && op.y === 0 && op.w === W && op.h === H;

// ── 1. the backdrop bleed ──────────────────────────────────────────────────

describe('the backdrop bleed, the default with a photo', () => {
  test('the photo is drawn over the whole canvas first, softened, then covered by the ink outside the outline', () => {
    const W = 1080; const H = 1920;
    const { ops } = record(SESSION({ photoLook: 'gold', photoLookStrength: 0.5 }), { bgPhoto: PHOTO });
    const photoDraws = ops.filter((o) => o.kind === 'image' && o.img === PHOTO);
    expect(photoDraws).toHaveLength(2);
    const [bleed, sharp] = photoDraws;
    // Under everything, with no clip, softened by the Skia blur filter.
    expect(bleed.clip).toBeNull();
    expect(bleed.paint.imageFilter).toEqual({ kind: 'blur', sx: W * BLEED_BLUR_RATIO, sy: W * BLEED_BLUR_RATIO, mode: 0, input: null });
    // In the chosen look, as the sharp photo is.
    expect(bleed.paint.filter).toEqual(sharp.paint.filter);
    // Before it, the theme's ground across the whole canvas (where a
    // zoomed-out photo leaves the canvas uncovered).
    const firstOp = ops[0];
    expect(firstOp.kind).toBe('rect');
    expect(isFullCanvas(firstOp, W, H)).toBe(true);
    expect(firstOp.paint.color).toBe(DARK_PALETTE.bg0);
    // Then the ink outside the outline (clip op 0, Difference), before the
    // sharp photo inside it (clip op 1, Intersect), which is NOT softened.
    const ink = ops.find((o) => o.kind === 'rect' && o.clip === 0);
    expect(ink).toBeTruthy();
    expect(isFullCanvas(ink, W, H)).toBe(true);
    expect(ink.paint.color).toBe(`rgba(13,13,13,${BLEED_INK_ALPHA})`);
    expect(ops.indexOf(ink)).toBeGreaterThan(ops.indexOf(bleed));
    expect(sharp.clip).toBe(1);
    expect(sharp.paint.imageFilter).toBeFalsy();
    expect(ops.indexOf(sharp)).toBeGreaterThan(ops.indexOf(ink));
  });

  test('the light theme washes the outside with its own light ground, so the outside still follows the theme', () => {
    const { ops } = record(SESSION({ theme: 'light' }), { bgPhoto: PHOTO });
    const ink = ops.find((o) => o.kind === 'rect' && o.clip === 0);
    expect(ink.paint.color).toBe(`rgba(250,250,247,${BLEED_INK_ALPHA})`);
    expect(ops[0].paint.color).toBe(LIGHT_PALETTE.bg0);
  });

  test('the ink is about 55 percent', () => {
    expect(BLEED_INK_ALPHA).toBe(0.55);
    expect(BLEED_BLUR_RATIO).toBe(0.015);
  });

  test('a Skia without the blur filter still draws the bleed, unsoftened, and never fails the card', () => {
    const { ops } = record(SESSION(), { bgPhoto: PHOTO, withBlur: false });
    const photoDraws = ops.filter((o) => o.kind === 'image' && o.img === PHOTO);
    expect(photoDraws).toHaveLength(2);
    expect(ops.some((o) => o.kind === 'text' && o.str === 'Leg Day')).toBe(true);
  });

  test('with OMIT_PHOTO no photo is drawn at all: only the translucent ink outside the outline, nothing opaque', () => {
    const W = 1080; const H = 1920;
    const { ops } = record(SESSION(), { bgPhoto: PHOTO, omitPhoto: true });
    expect(ops.filter((o) => o.kind === 'image' && o.img === PHOTO)).toHaveLength(0);
    // No opaque fill of the canvas anywhere (the framer's photo, or the
    // clip, must show through inside, and darkened outside).
    expect(ops.some((o) => o.kind === 'rect' && isFullCanvas(o, W, H) && /^#/.test(String(o.paint.color)))).toBe(false);
    const ink = ops.find((o) => o.kind === 'rect' && o.clip === 0);
    expect(ink.paint.color).toBe(`rgba(13,13,13,${BLEED_INK_ALPHA})`);
    expect(ops.filter((o) => o.kind === 'clip').map((o) => o.op)).toEqual([0, 1]);
  });
});

describe('the quiet ground of a card with no photo', () => {
  const linearRects = (ops) => ops.filter((o) => o.kind === 'rect' && o.paint && o.paint.shader && o.paint.shader.kind === 'linear');

  test('dark: the flat ground first, then a vertical gradient from bg2 at the top to bg0 at the foot', () => {
    const { ops } = record(SESSION());
    expect(ops[0].paint.color).toBe(DARK_PALETTE.bg0);
    const [g] = linearRects(ops);
    expect(g).toBeTruthy();
    expect(g.paint.shader.colors).toEqual([DARK_PALETTE.bg2, DARK_PALETTE.bg0]);
    expect(g.paint.shader.start.x).toBe(g.paint.shader.end.x);
    expect(g.paint.shader.start.y).toBe(0);
    expect(ops.some((o) => o.kind === 'image')).toBe(false);
  });

  test('light: from bg0 at the top to bg1 at the foot', () => {
    const { ops } = record(SESSION({ theme: 'light' }));
    expect(ops[0].paint.color).toBe(LIGHT_PALETTE.bg0);
    expect(linearRects(ops)[0].paint.shader.colors).toEqual([LIGHT_PALETTE.bg0, LIGHT_PALETTE.bg1]);
  });

  test('no colour cast: each stop is a tone of the theme\'s own ground ladder', () => {
    const dark = linearRects(record(SESSION()).ops)[0].paint.shader.colors;
    const light = linearRects(record(SESSION({ theme: 'light' })).ops)[0].paint.shader.colors;
    dark.forEach((c) => expect([DARK_PALETTE.bg0, DARK_PALETTE.bg1, DARK_PALETTE.bg2]).toContain(c));
    light.forEach((c) => expect([LIGHT_PALETTE.bg0, LIGHT_PALETTE.bg1, LIGHT_PALETTE.bg2]).toContain(c));
  });

  // The grounds' contrast promises hold against BOTH stops: every text role
  // at 4.5:1 or better.
  function lin(c8) { const c = c8 / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
  function lum(hex) {
    const h = hex.replace('#', '');
    return 0.2126 * lin(parseInt(h.slice(0, 2), 16)) + 0.7152 * lin(parseInt(h.slice(2, 4), 16)) + 0.0722 * lin(parseInt(h.slice(4, 6), 16));
  }
  const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  test.each([
    ['dark', DARK_PALETTE, [DARK_PALETTE.bg2, DARK_PALETTE.bg0]],
    ['light', LIGHT_PALETTE, [LIGHT_PALETTE.bg0, LIGHT_PALETTE.bg1]],
  ])('%s: text, secondary, muted and the hero amber clear 4.5:1 on both stops', (_name, pal, stops) => {
    stops.forEach((ground) => {
      ['text', 'textSecondary', 'textMuted', 'accent'].forEach((role) => {
        expect(ratio(pal[role], ground)).toBeGreaterThanOrEqual(4.5);
      });
    });
  });
});

// ── 2. Full screen ─────────────────────────────────────────────────────────

describe('Full screen: the phone\'s own shape', () => {
  test('height is width times the passed aspect, held between 16:9 and 2.3', () => {
    expect(cardHeight(1080, false, 'full', 2340 / 1080)).toBe(2340);
    expect(cardHeight(540, false, 'full', 2.0)).toBe(1080);
    expect(cardHeight(1080, false, 'full', 1.2)).toBe(1920); // never shorter than a story
    expect(cardHeight(1080, false, 'full', 3)).toBe(Math.round(1080 * 2.3));
    expect(cardHeight(1080, false, 'full')).toBe(1920); // unknown: a story's shape
    expect(clampFullAspect('x')).toBe(FULL_ASPECT_MIN);
    expect(FULL_ASPECT_MIN).toBeCloseTo(16 / 9, 10);
    expect(FULL_ASPECT_MAX).toBe(2.3);
  });

  test('the other formats are unchanged by the fourth argument', () => {
    expect(cardHeight(1080, false, 'story', 2.2)).toBe(1920);
    expect(cardHeight(1080, true, 'portrait', 2.2)).toBe(1350);
    expect(cardHeight(1080, true, 'square', 2.2)).toBe(1080);
  });

  test('the outline\'s band clears the passed status bar and home indicator, not a story\'s chrome', () => {
    const params = SESSION({
      aspect: 'full', fullAspect: 2340 / 1080, safeTopRatio: 0.03, safeBottomRatio: 0.02,
    });
    const { ops, out } = record(params, { bgPhoto: PHOTO });
    expect(out.height).toBe(2340);
    const outline = ops.filter((o) => o.kind === 'rrect').pop();
    // With a photo the panel fills the band exactly.
    expect(outline.y).toBe(Math.round(2340 * 0.03));
    expect(outline.y + outline.h).toBe(2340 - Math.round(2340 * 0.02));
    // A story's 14% top and 20% foot would have been far lower and higher.
    expect(outline.y).toBeLessThan(Math.round(2340 * 0.14));
    expect(outline.y + outline.h).toBeGreaterThan(2340 - Math.round(2340 * 0.2));
  });

  test('with no safe areas passed the band keeps the card\'s own edge margin', () => {
    const { ops } = record(SESSION({ aspect: 'full', fullAspect: 2.1 }), { bgPhoto: PHOTO });
    const outline = ops.filter((o) => o.kind === 'rrect').pop();
    const H = Math.round(1080 * 2.1);
    const edge = Math.round(Math.round(1080 * 0.074) / 2);
    expect(outline.y).toBe(edge);
    expect(outline.y + outline.h).toBe(H - edge);
  });

  test('an out-of-range safe ratio is held to a quarter of the height', () => {
    const { ops } = record(SESSION({ aspect: 'full', fullAspect: 2, safeTopRatio: 0.9, safeBottomRatio: -1 }), { bgPhoto: PHOTO });
    const outline = ops.filter((o) => o.kind === 'rrect').pop();
    expect(outline.y).toBe(Math.round(2160 * 0.25));
  });

  test('every word sits inside the outline, and the card uses more height than a story', () => {
    const full = record(SESSION({ aspect: 'full', fullAspect: 2340 / 1080, safeTopRatio: 0.03, safeBottomRatio: 0.02 }), { bgPhoto: PHOTO });
    const story = record(SESSION({ aspect: 'story' }), { bgPhoto: PHOTO });
    const fo = full.ops.filter((o) => o.kind === 'rrect').pop();
    const so = story.ops.filter((o) => o.kind === 'rrect').pop();
    expect(fo.h).toBeGreaterThan(so.h);
    full.ops.filter((o) => o.kind === 'text').forEach((t) => {
      expect(t.y).toBeGreaterThan(fo.y);
      expect(t.y).toBeLessThan(fo.y + fo.h);
    });
  });

  test('the lifts that fit are worked out on the same tall layout', () => {
    const Skia = makeStubSkia();
    const lifts = [1, 2, 3, 4, 5, 6].map((i) => ({ weight: 100 + i, reps: 5, exerciseName: `Lift ${i}` }));
    const story = sessionLiftsThatFit({ Skia, params: SESSION({ aspect: 'story' }), typefaces: { regular: {}, bold: {} }, lifts });
    const full = sessionLiftsThatFit({
      Skia, params: SESSION({ aspect: 'full', fullAspect: 2.3, safeTopRatio: 0, safeBottomRatio: 0 }), typefaces: { regular: {}, bold: {} }, lifts,
    });
    expect(full).toBeGreaterThanOrEqual(story);
  });
});

// ── the clip tone sampler's two reads (addendum 4) ─────────────────────────

describe('the exports the clip tone sampler reads', () => {
  test('sampleAverageTone and drawImageCover are exported functions', () => {
    expect(typeof Draw.sampleAverageTone).toBe('function');
    expect(typeof Draw.drawImageCover).toBe('function');
  });
});

// ── in real pixels (CanvasKit) ─────────────────────────────────────────────

const FONT_BOLD = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
const FONT_REG = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';
let ckPkg = null;
try { ckPkg = require.resolve('canvaskit-wasm/package.json'); } catch (_) { /* absent */ }
const CAN_TRY = !!ckPkg && fs.existsSync(FONT_BOLD) && fs.existsSync(FONT_REG);

describe('the bleed in pixels (CanvasKit)', () => {
  let env = null;
  let stripes = null;
  beforeAll(async () => {
    if (!CAN_TRY) return;
    try {
      const ckDir = path.dirname(ckPkg);
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const CK = await require(path.join(ckDir, 'bin/full/canvaskit.js'))({ locateFile: (f) => path.join(ckDir, 'bin/full', f) });
      const { JsiSkApi } = require('@shopify/react-native-skia/lib/commonjs/skia/web/JsiSkia.js');
      const Skia = JsiSkApi(CK);
      const tf = (p) => Skia.Typeface.MakeFreeTypeFaceFromData(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(p))));
      env = { Skia, typefaces: { bold: tf(FONT_BOLD), regular: tf(FONT_REG) } };
      // Sharp black and white vertical stripes: a softening shows as the
      // stripes running together.
      const surf = Skia.Surface.MakeOffscreen(600, 1000);
      const white = Skia.Paint(); white.setColor(Skia.Color('#FFFFFF'));
      const black = Skia.Paint(); black.setColor(Skia.Color('#000000'));
      surf.getCanvas().drawRect(Skia.XYWHRect(0, 0, 600, 1000), white);
      for (let x = 0; x < 600; x += 24) surf.getCanvas().drawRect(Skia.XYWHRect(x, 0, 12, 1000), black);
      surf.flush();
      stripes = surf.makeImageSnapshot();
    } catch (_) {
      env = null;
    }
  });

  function render(params, extra = {}) {
    const W = 540;
    const H = cardHeight(W, false, params.aspect, params.fullAspect);
    const surf = env.Skia.Surface.MakeOffscreen(W, H);
    drawShareCard(surf.getCanvas(), {
      Skia: env.Skia, width: W, params, typefaces: env.typefaces, wordmark: null, ...extra,
    });
    surf.flush();
    const px = surf.makeImageSnapshot().readPixels(0, 0, { width: W, height: H, alphaType: 3, colorType: 4 });
    return { px, W, H };
  }
  // Mean and spread of the luminance along one row, between two x's.
  function rowStats(px, W, y, x0, x1) {
    const vals = [];
    for (let x = x0; x < x1; x += 1) {
      const i = (y * W + x) * 4;
      vals.push(0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]);
    }
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
    return { mean, sd };
  }

  test('outside the outline the photo is softened and darkened; inside it stays sharp', () => {
    if (!env) return; // CanvasKit or fonts unavailable here: skip without failing
    const { px, W, H } = render(SESSION({ aspect: 'story' }), { bgPhoto: stripes });
    // Above the outline (a story's top 14%), and in the clear middle of
    // the photo inside it.
    const outside = rowStats(px, W, Math.round(H * 0.06), 40, W - 40);
    const inside = rowStats(px, W, Math.round(H * 0.45), 60, W - 60);
    expect(inside.sd).toBeGreaterThan(80); // the stripes, sharp
    expect(outside.sd).toBeLessThan(inside.sd / 3); // run together
    // Darkened: the stripes average about half white; under the 55% ink it
    // is well under that.
    expect(outside.mean).toBeLessThan(90);
    expect(outside.mean).toBeGreaterThan(5); // but the photo is there, not a flat ground
  });

  test('the OMIT_PHOTO render is translucent ink outside the outline and clear in the photo\'s middle', () => {
    if (!env) return;
    const { px, W, H } = render(SESSION({ aspect: 'story' }), { bgPhoto: stripes, omitPhoto: true });
    const at = (x, y) => { const i = (y * W + x) * 4; return { r: px[i], a: px[i + 3] }; };
    const out = at(Math.round(W / 2), Math.round(H * 0.05));
    expect(out.a).toBeGreaterThanOrEqual(Math.floor(255 * BLEED_INK_ALPHA) - 2);
    expect(out.a).toBeLessThanOrEqual(Math.ceil(255 * BLEED_INK_ALPHA) + 2);
    expect(out.r).toBeLessThan(30);
    // Somewhere in the photo's middle, between the title and the numbers,
    // the render is fully clear, so the photo or clip shows untouched.
    let minAlpha = 255;
    for (let y = Math.round(H * 0.25); y < Math.round(H * 0.65); y += 2) minAlpha = Math.min(minAlpha, at(Math.round(W / 2), y).a);
    expect(minAlpha).toBe(0);
  });
});
