/**
 * Share-card renderer tests.
 *
 * - cardHeight: pure, always runs.
 * - render check: renders every card type/format with the SAME JsiSk* API used
 *   on device (via CanvasKit) and asserts a non-blank PNG comes out. It
 *   self-guards: where CanvasKit or the harness fonts aren't available (e.g. a
 *   bare CI image) it no-ops rather than failing, so it never breaks the build —
 *   but where they ARE available (local dev) it genuinely exercises the draw.
 * - Campaign 30 (D108/ELITE-SHARE-SPEC) additions: portrait 4:5 non-blank for
 *   every card type, a quantitative PR dead-zone tolerance pin, and a
 *   transparent-background non-blank check for the new sticker export.
 */
import {
  drawShareCard, cardHeight, drawSticker, stickerHeight, photoCoverRect, photoCropFromRect, photoZoomRange, MAX_PHOTO_ZOOM,
} from '../drawShareCard';
import { transformFromCrop, cropFromTransform } from '../photoFraming';

const fs = require('fs');
const path = require('path');

const FONT_BOLD = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
const FONT_REG = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';

let ckPkg = null;
try { ckPkg = require.resolve('canvaskit-wasm/package.json'); } catch (_) { /* absent */ }
const CAN_TRY = !!ckPkg && fs.existsSync(FONT_BOLD) && fs.existsSync(FONT_REG);

describe('cardHeight', () => {
  test('square is 1:1, story is 9:16, at any width', () => {
    expect(cardHeight(1080, true)).toBe(1080);
    expect(cardHeight(1080, false)).toBe(1920);
    expect(cardHeight(540, false)).toBe(960);
    expect(cardHeight(300, true)).toBe(300);
  });
  test('aspect preset overrides the isSquare boolean (beforeAfter card)', () => {
    // Additive third arg: square 1:1, portrait 4:5, story 9:16.
    expect(cardHeight(1080, false, 'square')).toBe(1080);
    expect(cardHeight(1080, true, 'portrait')).toBe(1350); // 1080 * 5/4
    expect(cardHeight(1080, true, 'story')).toBe(1920);
    // Omitting aspect keeps the legacy two-arg behaviour exactly.
    expect(cardHeight(1080, true)).toBe(1080);
    expect(cardHeight(1080, false)).toBe(1920);
  });
});

describe('drawShareCard renders to a non-blank PNG (CanvasKit)', () => {
  let env = null;
  beforeAll(async () => {
    if (!CAN_TRY) return;
    try {
      const ckDir = path.dirname(ckPkg);
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const CK = await require(path.join(ckDir, 'bin/full/canvaskit.js'))({ locateFile: (f) => path.join(ckDir, 'bin/full', f) });
      const { JsiSkApi } = require('@shopify/react-native-skia/lib/commonjs/skia/web/JsiSkia.js');
      const Skia = JsiSkApi(CK);
      const tf = (p) => Skia.Typeface.MakeFreeTypeFaceFromData(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(p))));
      const wmPath = path.join(__dirname, '../../../../assets/volyume-wordmark.png');
      const wordmark = fs.existsSync(wmPath)
        ? Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(wmPath))))
        : null;
      env = { Skia, typefaces: { bold: tf(FONT_BOLD), regular: tf(FONT_REG) }, wordmark };
    } catch (_) {
      env = null; // environment can't render Skia headless; tests below no-op
    }
  });

  const PARAMS = {
    cardType: 'session', showDate: true, showVolume: true, showPlanName: true,
    showPRWeight: true, showPrevBest: true,
    sessionName: 'Back + Delts (Width)', planName: 'Push Pull Legs', date: 'Sat · 20 Jun 2026',
    workingSets: 4, duration: 0, tonnage: 304, exerciseCount: 5,
    topSet: { weight: 90, reps: 8, exerciseName: 'Lat Pulldown' },
    intensityTier: 'solid',
    exerciseName: 'Barbell Bench Press', weight: 120, reps: 5, units: 'kg', previousBest: 115,
    eyebrow: 'Year of Lifts', title: '2026 in the gym', heroValue: '1,240,000', heroUnit: 'total kg lifted',
    caption: 'Across 186 sessions this year.', stats: [{ label: 'Sessions', value: '186' }],
    tierLabel: 'Textbook Week', weekLabel: 'Week 4 · Moderate cut', dateFormatted: 'Sun · 22 Jun 2026',
    coachLine: 'You hit all 4 sessions, set 2 new PRs, lost 0.7 kg and recovery was strong.',
    hero: { heading: 'weight lost this week', value: '0.7 kg', context: 'right on target' },
    weeklyStats: [{ label: 'PRs', value: '2' }, { label: 'Sessions', value: '4/4' }, { label: 'Recovery', value: 'Strong' }],
    bestLift: { exerciseName: 'Bench Press', weight: 100, reps: 5, isNewBest: true, units: 'kg' },
  };

  test.each([
    ['session', true], ['session', false],
    ['pr', true], ['pr', false],
    ['milestone', true], ['milestone', false],
    ['weekly', true], ['weekly', false],
  ])('%s card (square=%s)', (cardType, isSquare) => {
    if (!env) return; // CanvasKit/fonts unavailable here — skip without failing
    const width = 540;
    const H = cardHeight(width, isSquare);
    const surface = env.Skia.Surface.MakeOffscreen(width, H);
    const stats = cardType === 'weekly' ? PARAMS.weeklyStats : PARAMS.stats;
    drawShareCard(surface.getCanvas(), { Skia: env.Skia, width, params: { ...PARAMS, stats, cardType, isSquare }, typefaces: env.typefaces, wordmark: env.wordmark });
    surface.flush();
    const bytes = surface.makeImageSnapshot().encodeToBytes();
    expect(bytes.length).toBeGreaterThan(1000); // a real, non-empty PNG
  });

  // ELITE-SHARE-SPEC pillar 3/#4 (D108): portrait 4:5 is now wired for every
  // card type, not just beforeAfter. Pinned via params.aspect (the beforeAfter
  // card's own square/portrait/story test.each below already covers that
  // type), asserting a real non-blank PNG comes out for each of the other
  // four types on the portrait preset.
  test.each([
    ['session'], ['pr'], ['milestone'], ['weekly'],
  ])('%s card renders non-blank on the portrait aspect', (cardType) => {
    if (!env) return;
    const width = 540;
    const H = cardHeight(width, true, 'portrait');
    const surface = env.Skia.Surface.MakeOffscreen(width, H);
    const stats = cardType === 'weekly' ? PARAMS.weeklyStats : PARAMS.stats;
    drawShareCard(surface.getCanvas(), {
      Skia: env.Skia, width, params: { ...PARAMS, stats, cardType, aspect: 'portrait' }, typefaces: env.typefaces, wordmark: env.wordmark,
    });
    surface.flush();
    expect(surface.makeImageSnapshot().encodeToBytes().length).toBeGreaterThan(1000);
  });

  // ELITE-SHARE-SPEC pillar 2: the PR card's numeral scales up specifically to
  // close the ~250px empty band the audit reported between the exercise name
  // and the footer. Pinned quantitatively: scan the card's vertical body band
  // (below the header, above the footer) for rows containing a bright (text
  // or glow) pixel, and assert the longest unbroken empty run stays under a
  // stated tolerance -- a real dead zone would show up here as a tall gap.
  test('PR card has no dead zone beyond a stated tolerance (square)', () => {
    if (!env) return;
    const width = 540;
    const H = cardHeight(width, true);
    const surface = env.Skia.Surface.MakeOffscreen(width, H);
    drawShareCard(surface.getCanvas(), {
      Skia: env.Skia, width, params: { ...PARAMS, cardType: 'pr', isSquare: true }, typefaces: env.typefaces, wordmark: env.wordmark,
    });
    surface.flush();
    const img = surface.makeImageSnapshot();
    const px = img.readPixels(0, 0, { width, height: H, alphaType: 3, colorType: 4 });
    expect(px).toBeTruthy();
    const top = Math.round(H * 0.12);
    const bottom = Math.round(H * 0.82);
    const xs = [];
    for (let f = 0.15; f <= 0.85; f += 0.05) xs.push(Math.round(width * f));
    let longestEmpty = 0; let run = 0;
    for (let y = top; y < bottom; y += 1) {
      let bright = false;
      for (let i = 0; i < xs.length; i += 1) {
        const idx = (y * width + xs[i]) * 4;
        const lum = 0.2126 * px[idx] + 0.7152 * px[idx + 1] + 0.0722 * px[idx + 2];
        if (lum > 60) { bright = true; break; }
      }
      if (bright) { run = 0; } else { run += 1; if (run > longestEmpty) longestEmpty = run; }
    }
    // Stated tolerance: no unbroken empty band taller than 26% of the card.
    expect(longestEmpty / H).toBeLessThan(0.26);
  });

  // Two synthetic SkImages stand in for the user's before/after photos.
  function makeSwatch(Skia, hex) {
    const ps = Skia.Surface.MakeOffscreen(64, 96); // portrait-ish, deliberately non-square
    const pt = Skia.Paint(); pt.setColor(Skia.Color(hex));
    ps.getCanvas().drawRect(Skia.XYWHRect(0, 0, 64, 96), pt);
    ps.flush();
    return ps.makeImageSnapshot();
  }

  const BA_PARAMS = {
    cardType: 'beforeAfter',
    elapsedLabel: '14 weeks',
    before: { date: '3 Mar 2026', scanRange: 'Defined index 54', weight: '82.4 kg' },
    after: { date: '9 Jun 2026', scanRange: 'Lean index 66', weight: '78.1 kg' },
  };

  test.each([
    ['square'], ['portrait'], ['story'],
  ])('beforeAfter card composites two photos (aspect=%s)', (aspect) => {
    if (!env) return; // CanvasKit/fonts unavailable here — skip without failing
    const width = 540;
    const H = cardHeight(width, aspect !== 'story', aspect);
    const before = makeSwatch(env.Skia, '#8a8f7a');
    const after = makeSwatch(env.Skia, '#b0a890');
    const surface = env.Skia.Surface.MakeOffscreen(width, H);
    drawShareCard(surface.getCanvas(), {
      Skia: env.Skia, width, params: { ...BA_PARAMS, aspect }, typefaces: env.typefaces,
      wordmark: env.wordmark, photos: { before, after },
    });
    surface.flush();
    expect(surface.makeImageSnapshot().encodeToBytes().length).toBeGreaterThan(1000);
  });

  test('beforeAfter card tolerates a missing photo without throwing (calm cell)', () => {
    if (!env) return;
    const width = 540;
    const H = cardHeight(width, true, 'square');
    const before = makeSwatch(env.Skia, '#8a8f7a');
    const surface = env.Skia.Surface.MakeOffscreen(width, H);
    // after=null: the renderer must fall back to a neutral cell, never throw.
    expect(() => {
      drawShareCard(surface.getCanvas(), {
        Skia: env.Skia, width, params: { ...BA_PARAMS, aspect: 'square' }, typefaces: env.typefaces,
        wordmark: env.wordmark, photos: { before, after: null },
      });
    }).not.toThrow();
    surface.flush();
    expect(surface.makeImageSnapshot().encodeToBytes().length).toBeGreaterThan(1000);
  });

  test('renders with a gym-photo background (cover-fit + scrim path)', () => {
    if (!env) return;
    const width = 540;
    const H = cardHeight(width, true);
    // A small synthetic image stands in for the user's gym photo.
    const ps = env.Skia.Surface.MakeOffscreen(64, 64);
    const pt = env.Skia.Paint(); pt.setColor(env.Skia.Color('#c9c2b0'));
    ps.getCanvas().drawRect(env.Skia.XYWHRect(0, 0, 64, 64), pt);
    ps.flush();
    const bgPhoto = ps.makeImageSnapshot();
    const surface = env.Skia.Surface.MakeOffscreen(width, H);
    drawShareCard(surface.getCanvas(), { Skia: env.Skia, width, params: { ...PARAMS, cardType: 'weekly', stats: PARAMS.weeklyStats, isSquare: true }, typefaces: env.typefaces, wordmark: env.wordmark, bgPhoto });
    surface.flush();
    expect(surface.makeImageSnapshot().encodeToBytes().length).toBeGreaterThan(1000);
  });
});

// ELITE-SHARE-SPEC pillar 3 (Strava Sticker Stats): a new transparent-
// background export path, compact stat block + small trailing mark only.
describe('drawSticker renders a transparent, non-blank PNG (CanvasKit)', () => {
  let env = null;
  beforeAll(async () => {
    if (!CAN_TRY) return;
    try {
      const ckDir = path.dirname(ckPkg);
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const CK = await require(path.join(ckDir, 'bin/full/canvaskit.js'))({ locateFile: (f) => path.join(ckDir, 'bin/full', f) });
      const { JsiSkApi } = require('@shopify/react-native-skia/lib/commonjs/skia/web/JsiSkia.js');
      const Skia = JsiSkApi(CK);
      const tf = (p) => Skia.Typeface.MakeFreeTypeFaceFromData(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(p))));
      const wmPath = path.join(__dirname, '../../../../assets/volyume-wordmark.png');
      const wordmark = fs.existsSync(wmPath)
        ? Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(wmPath))))
        : null;
      env = { Skia, typefaces: { bold: tf(FONT_BOLD), regular: tf(FONT_REG) }, wordmark };
    } catch (_) {
      env = null;
    }
  });

  const PR_PARAMS = {
    cardType: 'pr', exerciseName: 'Barbell Bench Press', showPRWeight: true, showPrevBest: true,
    weight: 120, reps: 5, units: 'kg', previousBest: 115,
  };
  const SESSION_PARAMS = {
    cardType: 'session', sessionName: 'Back + Delts', showVolume: true, tonnage: 304, workingSets: 4, prCount: 0,
  };

  test.each([
    ['pr', PR_PARAMS], ['session', SESSION_PARAMS],
  ])('%s sticker renders a real, non-blank, transparent-cornered PNG', (cardType, params) => {
    if (!env) return;
    const width = 480;
    const H = stickerHeight(width);
    const surface = env.Skia.Surface.MakeOffscreen(width, H);
    drawSticker(surface.getCanvas(), {
      Skia: env.Skia, width, params, typefaces: env.typefaces, wordmark: env.wordmark,
    });
    surface.flush();
    const img = surface.makeImageSnapshot();
    const bytes = img.encodeToBytes();
    expect(bytes.length).toBeGreaterThan(300); // a real, non-empty PNG

    // Transparent background: the rounded panel is the only opaque content,
    // so the untouched corner pixel (outside the rounded rect) stays alpha 0
    // -- this is what makes it pasteable onto the user's own photo.
    const px = img.readPixels(0, 0, { width, height: H, alphaType: 3, colorType: 4 });
    expect(px).toBeTruthy();
    expect(px[3]).toBe(0); // top-left corner: fully transparent
    const centre = ((Math.round(H / 2) * width) + Math.round(width / 2)) * 4;
    expect(px[centre + 3]).toBeGreaterThan(0); // panel centre: opaque
  });

  // SUPPRESSION LAW (ELITE-SHARE-SPEC pillar 5): a sticker has no data path of
  // its own -- it reads only fields already present on the params object the
  // caller passes, the same object the full card draws from. If an upstream
  // gate (calm mode / an open ED flag) has already stripped the hero fields
  // before the params reach here, the sticker must render without throwing
  // and without fabricating a placeholder value in their place.
  test('weekly sticker with no hero/bestLift/stats data renders without throwing or fabricating content', () => {
    if (!env) return;
    const width = 480;
    const H = stickerHeight(width);
    const surface = env.Skia.Surface.MakeOffscreen(width, H);
    expect(() => {
      drawSticker(surface.getCanvas(), {
        Skia: env.Skia, width, params: { cardType: 'weekly', tierLabel: 'Textbook Week' }, typefaces: env.typefaces, wordmark: env.wordmark,
      });
    }).not.toThrow();
    surface.flush();
    // Still a valid PNG (mark-only panel), never a crash or a blank buffer.
    expect(surface.makeImageSnapshot().encodeToBytes().length).toBeGreaterThan(300);
  });
});

describe('lead render-review pins (source guards)', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '..', 'drawShareCard.js'), 'utf8');

  test('the session Time stat box is gated on a real duration, never a raw "0m"', () => {
    // Lead render review 2026-08-17: a zero-length session drew a "0m" TIME
    // box -- the exact raw failure the share-card inventory audit flagged.
    // Below one minute there is no honest time to show, so the box must be
    // conditional, and no unconditional zero-defaulted duration string may
    // return.
    expect(SRC).toMatch(/if \(\(p\.duration \|\| 0\) >= 1\) stats\.push\(\{ label: 'Time'/);
    expect(SRC).not.toMatch(/value: `\$\{p\.duration \|\| 0\}m`/);
  });

  test('a bright-TOPPED photo scrims from the top of the canvas, judged by the top band itself', () => {
    // Lead render review 2026-08-17: on a light photo the 0.06 opening alpha
    // left the date, kicker, title and hero numeral on near-raw pale photo --
    // and the bottom-weighted average alone never tripped the bright branch
    // for a bright-sky-top / dark-floor photo. The sampler must report the
    // top band separately and the opening stop must answer to it.
    // RE-ANCHORED 2026-09-26: with the title at the top of a photo card
    // (the restyle's split layout) the top band always carries a scrim, and
    // a bright top gets the deeper one.
    expect(SRC).toMatch(/topLuminance/);
    expect(SRC).toMatch(/const topAlpha = brightTop \? 0\.74 : 0\.52;/);
  });
});

// Founder order 2026-09-26: "if I can move it up down left or right it will
// show better". The framing is a point of the photo plus a zoom, and the
// renderer and the positioning view share one piece of arithmetic.
describe('photo framing', () => {
  test('no framing is the centre crop the card always used', () => {
    expect(photoCoverRect(1000, 1500, 1080, 1920, null)).toEqual(photoCoverRect(1000, 1500, 1080, 1920, { zoom: 1, cx: 0.5, cy: 0.5 }));
    const r = photoCoverRect(1000, 1500, 1080, 1920, null);
    expect(r.x).toBeCloseTo((1080 - r.w) / 2, 6);
    expect(r.y).toBeCloseTo((1920 - r.h) / 2, 6);
  });

  test('at cover size or bigger the photo always covers the card, however far it is pushed', () => {
    for (const crop of [{ zoom: 1, cx: 0, cy: 0 }, { zoom: 1, cx: 1, cy: 1 }, { zoom: 3, cx: -5, cy: 9 }, { zoom: 99, cx: 0.5, cy: 0.5 }]) {
      const r = photoCoverRect(1000, 1500, 1080, 1920, crop);
      expect(r.x).toBeLessThanOrEqual(0);
      expect(r.y).toBeLessThanOrEqual(0);
      expect(r.x + r.w).toBeGreaterThanOrEqual(1080 - 1e-6);
      expect(r.y + r.h).toBeGreaterThanOrEqual(1920 - 1e-6);
    }
    // Zoom is capped.
    const capped = photoCoverRect(1000, 1500, 1080, 1920, { zoom: 99, cx: 0.5, cy: 0.5 });
    const cover = Math.max(1080 / 1000, 1920 / 1500);
    expect(capped.w).toBeCloseTo(1000 * cover * MAX_PHOTO_ZOOM, 6);
  });

  // Founder, 2026-09-26: "adjustable in position and size". Resizing down
  // stops where the whole photo fits; a smaller photo stays on the card.
  test('resizing down stops where the whole photo fits, and a smaller photo never leaves the card', () => {
    // A landscape photo on a story: the contain fit is much smaller than the cover fit.
    const range = photoZoomRange(1200, 900, 1080, 1920);
    const cover = Math.max(1080 / 1200, 1920 / 900);
    const contain = Math.min(1080 / 1200, 1920 / 900);
    expect(range.min).toBeCloseTo(contain / cover, 6);
    const fit = photoCoverRect(1200, 900, 1080, 1920, { zoom: 0.01, cx: 0.5, cy: 0.5 });
    expect(fit.w).toBeCloseTo(1080, 6); // the whole width, no smaller
    for (const crop of [{ zoom: range.min, cx: 0.5, cy: -3 }, { zoom: range.min, cx: 0.5, cy: 4 }, { zoom: 0.7, cx: 9, cy: 0.5 }]) {
      const r = photoCoverRect(1200, 900, 1080, 1920, crop);
      expect(r.y).toBeGreaterThanOrEqual(-1e-6);
      expect(r.y + r.h).toBeLessThanOrEqual(1920 + 1e-6);
      expect(r.x + r.w).toBeGreaterThanOrEqual(Math.min(1080, r.w) - 1e-6);
    }
    // And the framing of a smaller photo survives the round trip.
    const placed = photoCoverRect(1200, 900, 1080, 1920, { zoom: 0.6, cx: 0.5, cy: 0.35 });
    const back = photoCropFromRect(1200, 900, 1080, 1920, placed);
    expect(back.zoom).toBeCloseTo(0.6, 6);
    expect(photoCoverRect(1200, 900, 1080, 1920, back)).toEqual(placed);
  });

  test('moving the photo up shows more of its lower half, and the framing survives a round trip', () => {
    const lower = photoCoverRect(1000, 1500, 1080, 1920, { zoom: 2, cx: 0.5, cy: 0.7 });
    const centre = photoCoverRect(1000, 1500, 1080, 1920, { zoom: 2, cx: 0.5, cy: 0.5 });
    expect(lower.y).toBeLessThan(centre.y);
    const back = photoCropFromRect(1000, 1500, 1080, 1920, lower);
    expect(back.zoom).toBeCloseTo(2, 6);
    expect(back.cx).toBeCloseTo(0.5, 6);
    expect(back.cy).toBeCloseTo(0.7, 6);
  });

  test('the framing is the same on the preview and the 1080 export', () => {
    const crop = { zoom: 1.6, cx: 0.42, cy: 0.33 };
    const small = photoCoverRect(1000, 1500, 300, cardHeight(300, false, 'story'), crop);
    const big = photoCoverRect(1000, 1500, 1080, 1920, crop);
    expect(small.x / 300).toBeCloseTo(big.x / 1080, 2);
    expect(small.y / cardHeight(300, false, 'story')).toBeCloseTo(big.y / 1920, 2);
  });

  test("the positioning view's transform converts to the renderer's framing and back", () => {
    const crop = { zoom: 1.8, cx: 0.4, cy: 0.62 };
    const view = transformFromCrop(1200, 900, 300, 533, crop);
    const again = cropFromTransform(1200, 900, 300, 533, view);
    expect(again.zoom).toBeCloseTo(1.8, 6);
    expect(again.cx).toBeCloseTo(0.4, 6);
    expect(again.cy).toBeCloseTo(0.62, 6);
    // A drag past the edge is clamped to the edge, never beyond it.
    const pushed = cropFromTransform(1200, 900, 300, 533, { zoom: 1, tx: 5000, ty: 0 });
    const r = photoCoverRect(1200, 900, 300, 533, pushed);
    expect(r.x).toBeCloseTo(0, 6);
  });
});
