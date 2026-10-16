/**
 * shareCardLevelUps.test.js
 *
 * Register D229 addendum 6 (founder, verbatim in part: "the share is
 * actually not full screen on most mobiles. It's kind of cut, even the
 * Instagram share. Can we, like, extend it ... not wider, taller", "We don't
 * want to encourage too much blank space", "elegant perhaps"), the two
 * renderer level-ups kept after the founder's correction of 2026-10-15:
 *
 *  1. THE PICTURE ONLY INSIDE THE OUTLINE (re-pinned 2026-10-16 under the
 *     founder's decision, option A, which withdrew the backdrop bleed this
 *     item first pinned). With a photo, the photo in its look is drawn only
 *     inside the outline's rounded shape, with the vignette and the scrim;
 *     outside it the card draws exactly what a card with no photo draws
 *     there, the theme's ground and its quiet gradient, opaque. The
 *     OMIT_PHOTO render (the live photo preview, the video overlay) is
 *     opaque outside the outline in the same way and clear inside it, so
 *     the photo or clip under it shows only inside the outline. A card with
 *     no photo gets a quiet gradient of two of the theme's own ground
 *     tones, every text role keeping its contrast against both.
 *  2. FULL SCREEN: height is width times the phone's own aspect, held to
 *     16:9..2.3, and the outline's band clears the phone's own status bar
 *     and home indicator (the passed ratios) instead of a story's chrome.
 *
 * Plus the two exports the clip tone sampler reads (addendum 4).
 *
 * Written to FAIL against the pre-level-up renderer (no gradient ground,
 * no 'full' aspect) and, for item 1, against the bleed renderer of
 * 2026-10-15: it drew the photo softened outside the outline and a
 * translucent ink there on the overlay.
 *
 * A recording canvas and a stub Skia (the shareCardTheme.test.js pattern:
 * Skia.Color is the identity, every draw is captured with its Paint), plus
 * real CanvasKit where it is available (the drawShareCard.test.js pattern:
 * self-guarding, never failing the build where it cannot run) to prove in
 * pixels that the outside is the no-picture card's own and the overlay is
 * opaque there.
 */
import * as Draw from '../drawShareCard';

const {
  drawShareCard, cardHeight, sessionLiftsThatFit, clampFullAspect,
  DARK_PALETTE, LIGHT_PALETTE, FULL_ASPECT_MIN, FULL_ASPECT_MAX,
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

// ── 1. the picture only inside the outline ─────────────────────────────────
//
// RE-PINNED 2026-10-16 (founder decision, option A: "You see this image
// here, where the back is visible beyond the [gold] outline, will that be
// hidden? It looks a bit silly. I think we only displayed from within the
// outline on photos?"). These tests pinned the backdrop bleed (the photo
// softened over the whole canvas under a 55% ink, and a translucent ink on
// the OMIT_PHOTO render); the founder withdrew it, so they now pin the
// opposite: the picture inside the outline only, and outside it exactly the
// no-picture card's ground and gradient, opaque, on the overlay too.

const CARD_TYPES = {
  session: SESSION,
  pr: (over = {}) => ({
    cardType: 'pr', exerciseName: 'Barbell Bench Press', showPRWeight: true, weight: 100, reps: 5, units: 'kg', aspect: 'story', ...over,
  }),
  milestone: (over = {}) => ({
    cardType: 'milestone', eyebrow: 'Lifetime total', title: 'Total weight lifted', heroValue: '1,000,000', heroUnit: 'kg lifted', stats: [{ label: 'Sessions', value: '186' }], aspect: 'story', ...over,
  }),
  weekly: (over = {}) => ({
    cardType: 'weekly', weekLabel: 'Week 6', tierLabel: 'Textbook Week', hero: { heading: 'Sessions', value: '4/4', context: 'on target' }, stats: [{ label: 'PRs', value: '2' }], aspect: 'story', ...over,
  }),
};
const FORMATS = {
  story: { aspect: 'story' },
  full: { aspect: 'full', fullAspect: 2340 / 1080, safeTopRatio: 0.03, safeBottomRatio: 0.02 },
  feed: { aspect: 'portrait' },
  square: { aspect: 'square' },
};

// The draws the background makes before the first Intersect clip, as
// comparable data: what lies outside the outline.
const outsideOps = (ops) => {
  const firstInside = ops.findIndex((o) => o.kind === 'clip' && o.op === 1);
  return ops.slice(0, firstInside < 0 ? ops.length : firstInside).filter((o) => o.kind === 'rect');
};
const groundOf = (o) => ({ x: o.x, y: o.y, w: o.w, h: o.h, color: o.paint.color, shader: o.paint.shader });

describe('the picture only inside the outline (founder decision 2026-10-16, A)', () => {
  test('outside the outline: the no-picture card\'s ground and gradient, under the outline-shaped hole', () => {
    const W = 1080; const H = 1920;
    const { ops } = record(SESSION({ photoLook: 'gold', photoLookStrength: 0.5 }), { bgPhoto: PHOTO });
    // The Difference clip comes first, then the flat ground and the gradient
    // over the whole canvas inside it.
    expect(ops[0].kind).toBe('clip');
    expect(ops[0].op).toBe(0);
    const out = outsideOps(ops);
    expect(out).toHaveLength(2);
    out.forEach((o) => { expect(o.clip).toBe(0); expect(isFullCanvas(o, W, H)).toBe(true); });
    expect(out[0].paint.color).toBe(DARK_PALETTE.bg0);
    expect(out[1].paint.shader.colors).toEqual([DARK_PALETTE.bg2, DARK_PALETTE.bg0]);
    // Exactly the no-picture card's own two ground draws.
    const plain = record(SESSION()).ops.filter((o) => o.kind === 'rect').slice(0, 2).map(groundOf);
    expect(out.map(groundOf)).toEqual(plain);
  });

  test('the photo is drawn once, sharp, inside the Intersect clip, and never outside the outline', () => {
    const { ops } = record(SESSION({ photoLook: 'gold', photoLookStrength: 0.5 }), { bgPhoto: PHOTO });
    const photoDraws = ops.filter((o) => o.kind === 'image' && o.img === PHOTO);
    expect(photoDraws).toHaveLength(1);
    expect(photoDraws[0].clip).toBe(1);
    expect(photoDraws[0].paint.imageFilter).toBeFalsy();
    expect(ops.filter((o) => o.kind === 'clip').map((o) => o.op)).toEqual([0, 1]);
    // No softening anywhere on the card.
    ops.forEach((o) => expect(o.paint && o.paint.imageFilter).toBeFalsy());
  });

  test('the light theme draws its own light ground and gradient outside the outline', () => {
    const { ops } = record(SESSION({ theme: 'light' }), { bgPhoto: PHOTO });
    const out = outsideOps(ops);
    expect(out[0].paint.color).toBe(LIGHT_PALETTE.bg0);
    expect(out[1].paint.shader.colors).toEqual([LIGHT_PALETTE.bg0, LIGHT_PALETTE.bg1]);
    const plain = record(SESSION({ theme: 'light' })).ops.filter((o) => o.kind === 'rect').slice(0, 2).map(groundOf);
    expect(out.map(groundOf)).toEqual(plain);
  });

  test.each(Object.keys(CARD_TYPES))('%s: every format and both themes draw the no-picture ground outside, with a photo and on the overlay', (type) => {
    Object.entries(FORMATS).forEach(([, fmt]) => {
      ['dark', 'light'].forEach((theme) => {
        const params = CARD_TYPES[type]({ ...fmt, theme });
        const plain = record(params).ops.filter((o) => o.kind === 'rect').slice(0, 2).map(groundOf);
        [false, true].forEach((omitPhoto) => {
          const { ops } = record(params, { bgPhoto: PHOTO, omitPhoto });
          expect(outsideOps(ops).map(groundOf)).toEqual(plain);
          expect(ops.filter((o) => o.kind === 'clip').map((o) => o.op)).toEqual([0, 1]);
          const photoDraws = ops.filter((o) => o.kind === 'image' && o.img === PHOTO);
          expect(photoDraws).toHaveLength(omitPhoto ? 0 : 1);
          photoDraws.forEach((d) => expect(d.clip).toBe(1));
        });
      });
    });
  });

  test('with OMIT_PHOTO no photo is drawn, the outside is opaque, and nothing opaque is drawn inside the outline\'s whole area', () => {
    const W = 1080; const H = 1920;
    const { ops } = record(SESSION(), { bgPhoto: PHOTO, omitPhoto: true });
    expect(ops.filter((o) => o.kind === 'image' && o.img === PHOTO)).toHaveLength(0);
    // The opaque ground is drawn only under the Difference clip; no
    // full-canvas fill is drawn inside the outline, or with no clip, so the
    // photo or clip underneath shows there.
    const fulls = ops.filter((o) => o.kind === 'rect' && isFullCanvas(o, W, H) && o.paint && o.paint.color && /^#/.test(String(o.paint.color)));
    expect(fulls.length).toBeGreaterThan(0);
    fulls.forEach((o) => expect(o.clip).toBe(0));
    expect(outsideOps(ops)[0].paint.color).toBe(DARK_PALETTE.bg0);
  });

  test('the bleed is gone from the renderer: no blur filter, no ink constants', () => {
    expect(Draw.BLEED_INK_ALPHA).toBeUndefined();
    expect(Draw.BLEED_BLUR_RATIO).toBeUndefined();
    const src = fs.readFileSync(path.join(__dirname, '../drawShareCard.js'), 'utf8');
    expect(src).not.toMatch(/ImageFilter\.MakeBlur|setImageFilter|bleedInk|softLookPaint/);
  });

  test('a Skia without the blur filter draws the same card (nothing reaches for it)', () => {
    const a = record(SESSION(), { bgPhoto: PHOTO, withBlur: false });
    const b = record(SESSION(), { bgPhoto: PHOTO, withBlur: true });
    expect(a.ops.length).toBe(b.ops.length);
    expect(a.ops.some((o) => o.kind === 'text' && o.str === 'Leg Day')).toBe(true);
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

describe('outside the outline, in pixels (CanvasKit)', () => {
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

  // RE-PINNED 2026-10-16 (founder decision, option A): these pixel tests
  // proved the bleed (the photo softened and darkened outside the outline,
  // and a translucent ink there on the overlay). They now prove the
  // opposite, in real pixels, on every format, both themes and every card
  // type: outside the outline the photo card and the overlay carry the
  // no-picture card's own pixels, opaque, and inside it the picture shows.
  const FMT = [
    { aspect: 'story' },
    { aspect: 'full', fullAspect: 2340 / 1080, safeTopRatio: 0.03, safeBottomRatio: 0.02 },
    { aspect: 'portrait' },
    { aspect: 'square' },
  ];
  // Points certainly outside every outline the card can draw: the margin
  // strips between the canvas edge and the band the outline lives in (the
  // panel of a card with no photo sits inside the same band), kept a stroke
  // and a few pixels clear of it.
  function outsidePoints(params, W, H) {
    const pad = Math.round(W * 0.074);
    const inset = Math.round(pad / 2);
    const x0 = pad - inset;
    let top; let bottom;
    if (params.aspect === 'full') {
      top = Math.max(inset, Math.round(H * params.safeTopRatio));
      bottom = H - Math.max(inset, Math.round(H * params.safeBottomRatio));
    } else if (params.aspect === 'story') {
      top = Math.max(inset, Math.round(H * 0.14));
      bottom = H - Math.max(inset, Math.round(H * 0.2));
    } else {
      top = inset; bottom = H - inset;
    }
    const clear = 6;
    const pts = [];
    for (let y = 1; y < H - 1; y += 37) { pts.push([1, y]); pts.push([x0 - clear, y]); pts.push([W - 2, y]); pts.push([W - x0 + clear, y]); }
    for (let x = 1; x < W - 1; x += 29) {
      for (let y = 1; y < top - clear; y += 23) pts.push([x, y]);
      for (let y = bottom + clear; y < H - 1; y += 23) pts.push([x, y]);
    }
    return pts.filter(([x, y]) => x >= 0 && x < W && y >= 0 && y < H);
  }
  const pixel = (px, W, x, y) => { const i = (y * W + x) * 4; return [px[i], px[i + 1], px[i + 2], px[i + 3]]; };

  test.each(['session', 'pr', 'milestone', 'weekly'])('%s: with a photo and on the overlay, every pixel outside the outline is the no-picture card\'s, opaque', (type) => {
    if (!env) return; // CanvasKit or fonts unavailable here: skip without failing
    FMT.forEach((fmt) => {
      ['dark', 'light'].forEach((theme) => {
        const params = CARD_TYPES[type]({ ...fmt, theme });
        const plain = render(params);
        const photo = render(params, { bgPhoto: stripes });
        const overlay = render(params, { bgPhoto: stripes, omitPhoto: true });
        const pts = outsidePoints(params, plain.W, plain.H);
        expect(pts.length).toBeGreaterThan(50);
        pts.forEach(([x, y]) => {
          const want = pixel(plain.px, plain.W, x, y);
          expect(want[3]).toBe(255);
          expect(pixel(photo.px, photo.W, x, y)).toEqual(want);
          expect(pixel(overlay.px, overlay.W, x, y)).toEqual(want);
        });
      });
    });
  });

  test('inside the outline the picture is drawn, sharp, on every format and theme', () => {
    if (!env) return;
    FMT.forEach((fmt) => {
      ['dark', 'light'].forEach((theme) => {
        const { px, W, H } = render(SESSION({ ...fmt, theme }), { bgPhoto: stripes });
        // Somewhere down the clear middle of the photo, a row runs the
        // stripes at full contrast.
        let best = 0;
        for (let y = Math.round(H * 0.3); y < Math.round(H * 0.6); y += 4) best = Math.max(best, rowStats(px, W, y, 60, W - 60).sd);
        expect(best).toBeGreaterThan(60);
      });
    });
  });

  test('the overlay is clear at a point inside the outline with no text, on every format and theme', () => {
    if (!env) return;
    FMT.forEach((fmt) => {
      ['dark', 'light'].forEach((theme) => {
        const { px, W, H } = render(CARD_TYPES.pr({ ...fmt, theme }), { bgPhoto: stripes, omitPhoto: true });
        let minAlpha = 255;
        for (let y = Math.round(H * 0.2); y < Math.round(H * 0.7); y += 1) minAlpha = Math.min(minAlpha, pixel(px, W, Math.round(W / 2), y)[3]);
        expect(minAlpha).toBe(0);
      });
    });
  });
});
