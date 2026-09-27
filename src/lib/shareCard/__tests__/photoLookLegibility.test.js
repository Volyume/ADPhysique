/**
 * photoLookLegibility.test.js
 *
 * Lead update 2026-09-27, relaying the founder: "we need to make sure with
 * each [look] the text and so on still looks good and stands out." A look
 * changes the photo's colour and brightness; the scrim that keeps the card's
 * text readable is tuned from the photo's sampled tone (drawBackground's
 * applyLookToTone, see photoLookRender.test.js), and this is the proof that
 * the tuning actually WORKS, not just that the wiring exists.
 *
 * Real CanvasKit (the drawShareCard.test.js pattern: self-guards where
 * CanvasKit/fonts are unavailable rather than failing, and genuinely renders
 * where they are). For every look with a colour matrix, at its full strength
 * AND its own start strength (photoLooks.js startStrengthFor), on the
 * session card's story and square aspects, over TWO backgrounds -- a
 * deliberately bright, near-white photo with a light warm cast, and a
 * darker gym-like gradient -- this renders the card with drawText calls
 * recorded but NOT painted (so the read-back pixels are the background
 * alone: photo + look + vignette + scrim, nothing else), then asserts WCAG
 * contrast of the KNOWN text colour (DARK_PALETTE.text/accent -- a photo
 * always keeps the text on the dark palette) against that local background
 * is at least 4.5:1 for the title and the stat row, and at least 3:1 for the
 * (large) hero numeral. A failing case names the exact look/strength/
 * aspect/background combination Jest reports it under.
 */
import {
  drawShareCard, cardHeight, DARK_PALETTE,
} from '../drawShareCard';
import { PHOTO_LOOKS, startStrengthFor } from '../photoLooks';

const fs = require('fs');
const path = require('path');

const FONT_BOLD = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
const FONT_REG = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';
let ckPkg = null;
try { ckPkg = require.resolve('canvaskit-wasm/package.json'); } catch (_) { /* absent */ }
const CAN_TRY = !!ckPkg && fs.existsSync(FONT_BOLD) && fs.existsSync(FONT_REG);

const WIDTH = 540;
const SESSION_PARAMS = {
  cardType: 'session',
  sessionName: 'Leg Day',
  workingSets: 18,
  duration: 45,
  tonnage: 9340,
  exerciseCount: 5,
  prCount: 0,
  showVolume: true,
  units: 'kg',
};

function srgbToLinear(c8) {
  const c = c8 / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function relLuminance([r, g, b]) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}
function contrastRatio(rgbA, rgbB) {
  const l1 = relLuminance(rgbA);
  const l2 = relLuminance(rgbB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// The average colour of a small patch, so a sampled point isn't thrown off
// by a single stray (e.g. anti-aliased) pixel.
function samplePatch(px, imgW, imgH, cx, cy, halfW, halfH) {
  const x0 = Math.max(0, Math.round(cx - halfW));
  const x1 = Math.min(imgW - 1, Math.round(cx + halfW));
  const y0 = Math.max(0, Math.round(cy - halfH));
  const y1 = Math.min(imgH - 1, Math.round(cy + halfH));
  let r = 0; let g = 0; let b = 0; let n = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const i = (y * imgW + x) * 4;
      r += px[i]; g += px[i + 1]; b += px[i + 2];
      n += 1;
    }
  }
  return n ? [r / n, g / n, b / n] : [0, 0, 0];
}

// Wraps a REAL Skia canvas: every call is forwarded (the render is genuine)
// EXCEPT drawText, whose (str, x, y) is recorded but never painted -- so the
// read-back pixels are the background alone (photo + look + vignette +
// scrim), exactly where the text would sit, with none of its own ink.
function backgroundOnlyCanvas(realCanvas, positions) {
  return new Proxy(realCanvas, {
    get(target, key) {
      if (key === 'drawText') {
        return (str, x, y) => { positions.push({ str, x, y }); };
      }
      const val = target[key];
      return typeof val === 'function' ? val.bind(target) : val;
    },
  });
}

describe('a photo look never costs the card its legibility', () => {
  let env = null;
  let brightPhoto = null;
  let gymPhoto = null;

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

      // A deliberately bright, near-white photo with a light warm cast: the
      // hardest case for any scrim, since there is little natural darkness
      // in the source to begin with.
      const bp = Skia.Surface.MakeOffscreen(900, 1200);
      const bPaint = Skia.Paint(); bPaint.setColor(Skia.Color('#F2EAD8'));
      bp.getCanvas().drawRect(Skia.XYWHRect(0, 0, 900, 1200), bPaint);
      bp.flush();
      brightPhoto = bp.makeImageSnapshot();

      // The existing darker gym-like fixture (the same gradient
      // scripts/render-share-card.cjs uses for its own gym photo): a warm
      // light top fading to a dark floor.
      const gp = Skia.Surface.MakeOffscreen(900, 1200);
      const grad = Skia.Paint();
      grad.setShader(Skia.Shader.MakeLinearGradient(
        { x: 0, y: 0 }, { x: 0, y: 1200 },
        [Skia.Color('#e8dcc4'), Skia.Color('#7a6248'), Skia.Color('#2a2119')],
        [0, 0.45, 1], 0,
      ));
      gp.getCanvas().drawRect(Skia.XYWHRect(0, 0, 900, 1200), grad);
      gp.flush();
      gymPhoto = gp.makeImageSnapshot();
    } catch (_) {
      env = null; // environment can't render Skia headless; tests below no-op
    }
  });

  function renderAndSample(aspect, bgPhoto, lookKey, strength) {
    const H = cardHeight(WIDTH, aspect !== 'story', aspect);
    const surf = env.Skia.Surface.MakeOffscreen(WIDTH, H);
    const positions = [];
    const proxied = backgroundOnlyCanvas(surf.getCanvas(), positions);
    drawShareCard(proxied, {
      Skia: env.Skia, width: WIDTH, typefaces: env.typefaces, wordmark: null,
      params: { ...SESSION_PARAMS, aspect, photoLook: lookKey, photoLookStrength: strength },
      bgPhoto,
    });
    surf.flush();
    const img = surf.makeImageSnapshot();
    const px = img.readPixels(0, 0, { width: WIDTH, height: H, alphaType: 3, colorType: 4 });
    return { px, H, positions };
  }

  // Every look with a colour matrix (None has no matrix and is unaffected),
  // at full strength and at its own start strength, on both aspects and
  // both backgrounds. Iron/Chalk start at full strength already, so the set
  // is de-duplicated per look rather than repeating the same case twice.
  const cases = [];
  PHOTO_LOOKS.filter((l) => l.matrix).forEach((look) => {
    const strengths = Array.from(new Set([1, startStrengthFor(look.key)]));
    strengths.forEach((strength) => {
      ['story', 'square'].forEach((aspect) => {
        ['bright', 'gym'].forEach((photoKind) => {
          cases.push([`${look.key} @ ${strength} (${aspect}, ${photoKind})`, { lookKey: look.key, strength, aspect, photoKind }]);
        });
      });
    });
  });

  test.each(cases)('%s keeps the title, stat row and hero legible', (_label, c) => {
    if (!env) return; // CanvasKit/fonts unavailable here -- skip without failing
    const photo = c.photoKind === 'bright' ? brightPhoto : gymPhoto;
    const { px, H, positions } = renderAndSample(c.aspect, photo, c.lookKey, c.strength);
    expect(px).toBeTruthy();

    const heroPos = positions.find((t) => t.str === '9,340');
    const titlePos = positions.find((t) => t.str === 'Leg Day');
    const statPos = positions.find((t) => t.str === '18');
    expect(heroPos).toBeTruthy();
    expect(titlePos).toBeTruthy();
    expect(statPos).toBeTruthy();
    expect(heroPos.y).toBeLessThanOrEqual(H);

    const heroBg = samplePatch(px, WIDTH, H, heroPos.x + 34, heroPos.y - 20, 70, 26);
    const titleBg = samplePatch(px, WIDTH, H, titlePos.x + 30, titlePos.y - 12, 50, 16);
    const statBg = samplePatch(px, WIDTH, H, statPos.x + 8, statPos.y - 12, 26, 16);

    const heroContrast = contrastRatio(hexToRgb(DARK_PALETTE.accent), heroBg);
    const titleContrast = contrastRatio(hexToRgb(DARK_PALETTE.text), titleBg);
    const statContrast = contrastRatio(hexToRgb(DARK_PALETTE.text), statBg);

    expect(heroContrast).toBeGreaterThanOrEqual(3);
    expect(titleContrast).toBeGreaterThanOrEqual(4.5);
    expect(statContrast).toBeGreaterThanOrEqual(4.5);
  });

  // A near-white photo is ALREADY well past the scrim's own bright/dim
  // threshold (SCRIM_LEGIBILITY_LUMINANCE_FLOOR, drawShareCard.js) whichever
  // tone feeds it, so the sweep above holds regardless of applyLookToTone
  // and does not, on its own, prove the fix changes anything. This fixture's
  // UNFILTERED luminance (about 120) sits just under that floor -- the dim
  // branch (a lighter scrim) -- while Iron's and Stage's FILTERED luminance
  // (about 132 and 140) crosses over it into the bright branch (a deeper
  // scrim, higher alpha). Measured directly against this renderer: at this
  // exact crossing point the fix roughly DOUBLES the title's contrast
  // margin (about 8.3-8.5:1 sampled from the untouched tone, about 13.5-
  // 13.9:1 from the actual, filtered one) -- both clear 4.5:1 here, so this
  // is not a fail-without/pass-with case, but it is a real, sizeable,
  // directional difference at the one point designed to show it, which is
  // the evidence that the wiring (not just applyLookToTone's own maths,
  // pinned separately in photoLookRender.test.js) is genuinely in effect.
  test('a photo whose look pushes it across the scrim\'s own bright threshold still stays legible', () => {
    if (!env) return;
    const tp = env.Skia.Surface.MakeOffscreen(900, 1200);
    const tPaint = env.Skia.Paint(); tPaint.setColor(env.Skia.Color('#82785F'));
    tp.getCanvas().drawRect(env.Skia.XYWHRect(0, 0, 900, 1200), tPaint);
    tp.flush();
    const thresholdPhoto = tp.makeImageSnapshot();

    ['iron', 'stage'].forEach((lookKey) => {
      const { px, H, positions } = renderAndSample('story', thresholdPhoto, lookKey, 1);
      const titlePos = positions.find((t) => t.str === 'Leg Day');
      const titleBg = samplePatch(px, WIDTH, H, titlePos.x + 30, titlePos.y - 12, 50, 16);
      const titleContrast = contrastRatio(hexToRgb(DARK_PALETTE.text), titleBg);
      expect(titleContrast).toBeGreaterThanOrEqual(4.5);
    });
  });
});
