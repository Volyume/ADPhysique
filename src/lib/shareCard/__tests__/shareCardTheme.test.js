/**
 * shareCardTheme.test.js
 *
 * Founder order 2026-09-27: "maybe different share themes (light and dark)?"
 * Pinned, all written to FAIL against the pre-theme renderer:
 *
 *  - light theme with NO photo draws LIGHT_PALETTE: the light ground, dark
 *    text, the light-theme hero amber (#B45309) and the F5A623 outline, and
 *    the dark-lettered wordmark when one is supplied;
 *  - light theme WITH a photo keeps the text on DARK_PALETTE (light on the
 *    dark scrim, exactly as a dark-theme photo card always has), but the
 *    ground OUTSIDE the outline and the outline colour still follow the
 *    theme, and the ORDINARY (light-on-dark) wordmark is drawn, not the
 *    dark-lettered one;
 *  - dark theme (the default, and every card with no `theme` param at all)
 *    is unchanged: same ground, same white text, same F5A623 hero/outline,
 *    same wordmark choice as before this feature existed.
 *
 * A recording canvas + stub Skia, extending the pattern in
 * sessionCardLayout.test.js: every draw call is captured with the Paint it
 * used, so the exact colour string each one was given (Skia.Color is the
 * identity in this stub) can be asserted against DARK_PALETTE/LIGHT_PALETTE
 * directly, rather than duplicating hex literals that could drift from the
 * source of truth.
 */
import {
  drawShareCard, DARK_PALETTE, LIGHT_PALETTE,
} from '../drawShareCard';

const stubFont = (px) => ({
  getSize: () => px,
  getGlyphIDs: (str) => new Array(String(str).length).fill(1),
  getGlyphWidths: (ids) => ids.map(() => px * 0.55),
});

function makeStubSkia() {
  return {
    Paint: () => {
      const p = {
        color: null, filter: null, shader: null,
        setAntiAlias() {},
        setColor(c) { p.color = c; },
        setStyle() {},
        setStrokeWidth() {},
        setMaskFilter() {},
        setShader(sh) { p.shader = sh; },
        setColorFilter(f) { p.filter = f; },
        setAlphaf() {},
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
      MakeLinearGradient: () => ({ kind: 'linear' }),
      MakeRadialGradient: () => ({ kind: 'radial' }),
    },
    Point: (x, y) => ({ x, y }),
    Data: { fromBytes: () => ({}) },
  };
}

function record(params, opts = {}) {
  const { width = 1080, bgPhoto = null, wordmark = null, wordmarkDark = null } = opts;
  const texts = [];
  const rrects = [];
  const rects = [];
  const images = [];
  const canvas = new Proxy({}, {
    get: (_t, key) => {
      if (key === 'clipRRect') return () => undefined;
      if (key === 'drawText') return (str, x, y, paint) => texts.push({ str, x, y, paint });
      if (key === 'drawRRect') return (r, paint) => rrects.push({ ...(r.rect || {}), paint });
      if (key === 'drawRect') return (r, paint) => rects.push({ ...r, paint });
      if (key === 'drawImageRect') return (img, src, dst, paint) => images.push({ img, src, dst, paint });
      return () => undefined;
    },
  });
  const Skia = makeStubSkia();
  drawShareCard(canvas, {
    Skia, width, params, typefaces: { regular: {}, bold: {} }, wordmark, wordmarkDark, bgPhoto,
  });
  return { texts, rrects, rects, images, strings: texts.map((t) => t.str) };
}

const PHOTO = { width: () => 1000, height: () => 1500 };
const WM = { width: () => 1032, height: () => 277 };
const WMD = { width: () => 1032, height: () => 277 };

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

describe('light theme with no photo', () => {
  test('draws the light ground, dark text, the light-theme hero amber and the F5A623 outline', () => {
    const { rects, rrects, texts } = record(SESSION({ theme: 'light' }), { wordmark: WM, wordmarkDark: WMD });
    // drawBackground (drawCraftedBackground) is the very first canvas call.
    expect(rects[0].paint.color).toBe(LIGHT_PALETTE.bg0);
    const title = texts.find((t) => t.str === 'Leg Day');
    expect(title.paint.color).toBe(LIGHT_PALETTE.text);
    expect(title.paint.color).toBe('#1A1A18');
    const hero = texts.find((t) => t.str === '9,340');
    expect(hero.paint.color).toBe(LIGHT_PALETTE.accent);
    expect(hero.paint.color).toBe('#B45309');
    expect(rrects).toHaveLength(1);
    expect(rrects[0].paint.color).toBe('#F5A623');
  });

  test('draws the dark-lettered wordmark when one is supplied, not the ordinary one', () => {
    const { images } = record(SESSION({ theme: 'light' }), { wordmark: WM, wordmarkDark: WMD });
    expect(images.some((im) => im.img === WMD)).toBe(true);
    expect(images.some((im) => im.img === WM)).toBe(false);
  });

  test('falls back to the ordinary wordmark when no dark one is supplied', () => {
    const { images } = record(SESSION({ theme: 'light' }), { wordmark: WM });
    expect(images.some((im) => im.img === WM)).toBe(true);
  });
});

describe('light theme with a photo', () => {
  test('keeps the text on the dark palette (light on the dark scrim), but the ground outside the outline and the outline stay theme-light', () => {
    const { rects, rrects, texts } = record(SESSION({ theme: 'light' }), { bgPhoto: PHOTO });
    const title = texts.find((t) => t.str === 'Leg Day');
    expect(title.paint.color).toBe(DARK_PALETTE.text); // white, over the dark scrim
    const hero = texts.find((t) => t.str === '9,340');
    expect(hero.paint.color).toBe(DARK_PALETTE.accent);
    // the ground fill (outside the outline, and under a zoomed-out photo)
    // is still the LIGHT ground even though the text stayed dark-palette.
    expect(rects.some((r) => r.paint && r.paint.color === LIGHT_PALETTE.bg0)).toBe(true);
    expect(rrects[0].paint.color).toBe('#F5A623');
  });

  test('draws the ordinary wordmark, not the dark-lettered one, even when both are supplied', () => {
    const { images } = record(SESSION({ theme: 'light' }), { bgPhoto: PHOTO, wordmark: WM, wordmarkDark: WMD });
    expect(images.some((im) => im.img === WM)).toBe(true);
    expect(images.some((im) => im.img === WMD)).toBe(false);
  });
});

describe('dark theme is unchanged', () => {
  test('the default (no theme param) and an explicit dark theme match, and match today\'s known values', () => {
    const a = record(SESSION());
    const b = record(SESSION({ theme: 'dark' }));
    [a, b].forEach(({ rects, rrects, texts }) => {
      expect(rects[0].paint.color).toBe(DARK_PALETTE.bg0);
      expect(rects[0].paint.color).toBe('#0D0D0D');
      const hero = texts.find((t) => t.str === '9,340');
      expect(hero.paint.color).toBe('#F5A623');
      expect(rrects[0].paint.color).toBe('#F5A623');
    });
  });

  test('never substitutes the dark wordmark, even when one is supplied', () => {
    const { images } = record(SESSION({ theme: 'dark' }), { wordmark: WM, wordmarkDark: WMD });
    expect(images.some((im) => im.img === WM)).toBe(true);
    expect(images.some((im) => im.img === WMD)).toBe(false);
  });

  test('an unrecognised theme value is treated as dark, never as light', () => {
    const { rects } = record(SESSION({ theme: 'sepia' }));
    expect(rects[0].paint.color).toBe(DARK_PALETTE.bg0);
  });
});
