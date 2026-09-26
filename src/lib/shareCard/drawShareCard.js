/**
 * Share card — single source of truth (Skia).
 *
 * One pure, imperative Skia draw routine used for BOTH the on-screen preview
 * AND the exported PNG, so what you see is exactly what you share. Previously
 * the preview (React Native views) and the export (a hand-coded HTML canvas in
 * a hidden WebView) were two independent renderers that drifted apart — that is
 * the bug this replaces.
 *
 * It is written against the react-native-skia JsiSk* API, which is identical on
 * device and under CanvasKit in Node — so the verification harness
 * (scripts/render-share-card.cjs) renders the exact same code path and the PNGs
 * it produces are what ship.
 *
 * Everything is laid out in a 1080-wide design space and scaled by `s = W/1080`,
 * so a single layout serves the preview (small) and the export (1080) at any
 * size. Text is MEASURED with the active font, so centring and wrapping are
 * correct whatever typeface is loaded.
 *
 * THE 2026-09-26 RESTYLE (founder order, verbatim: "I also think it looks too
 * AI generated at the moment. Use styles from the rest of the app and none of
 * the pill nonsense and so on. Put thought into how to display it better.")
 * The card now speaks the app's own visual language instead of a poster
 * template's: the app's typefaces (Inter for text, Inter Display for titles
 * and numbers, loaded by the screen; the system face is only a fallback), the
 * app's near-black ground with no glow, gradient orb, lit frame or bloom (the
 * theme.js materials policy allows one glow in the whole app, and it is not
 * here), section labels in the app's uppercase SectionLabel style, hairline
 * rules between sections the way the app's cards divide their rows, and ONE
 * amber object per card: the hero number. No pills, no icons, no trophy. The
 * exercise-name line is gone from the session card (founder: "I don't want
 * exercise names list to be an option or show at all"), and the top lift is
 * the lift the athlete chose on the share screen, drawn as a plain row. Over a
 * photo, the title sits at the top and the numbers at the bottom so the middle
 * of the photo stays clear, and the photo is framed where the athlete moved
 * and zoomed it (`photoCrop`), never only a centre crop.
 *
 * The module stays pure and import-free (no ESM imports) so it keeps running
 * unmodified under both Jest and the manual eval-based render harness.
 */

// react-native-skia PaintStyle / TileMode are plain numeric enums; hardcoded
// here so the module needs no RN-only imports (keeps it Node-runnable).
const FILL = 0;
const STROKE = 1;
const CLAMP = 0;

// The share card's own palette. DESIGN_SYSTEM.md whitelists this offline canvas
// to hold its own values (it is not a screen/component bound by the no-hardcoded-
// hex rule); every value tracks src/styles/theme.js: the near-black background,
// the surface ladder, amber for the one key number, and textPrimary/secondary/
// muted for everything else.
const PALETTE = {
  bg0: '#0D0D0D', bg1: '#141413', bg2: '#191917',
  surface: '#222220', surface2: '#2A2A27',
  // `border` tracks theme.js `border` (#6E6E6E), chosen for 3:1 WCAG 1.4.11.
  border: '#6E6E6E', divider: 'rgba(255,255,255,0.06)',
  // The hairline between a card's sections, the card-scale twin of theme.js
  // `borderSubtle`: white at a low alpha rather than a flat grey, so the same
  // rule reads on the dark ground and over a scrimmed photo.
  rule: 'rgba(255,255,255,0.16)',
  accent: '#F5A623',
  // textSecondary tracks theme.js `textSecondary`; textMuted tracks theme.js
  // `textMuted` (#9C9C9C).
  text: '#FFFFFF', textSecondary: '#9E9E9E', textMuted: '#9C9C9C',
};

// The card's ground, shown wherever a zoomed-out photo leaves the canvas
// uncovered. Exported so the screen's positioning view paints the same
// colour behind the photo it moves.
export const CARD_GROUND = PALETTE.bg0;

// Central number+unit join (P-15, ux-copy-polish audit 2026-07-12 / format.js).
// This file is deliberately import-free (see header), so `format.js`'s single
// source of truth is mirrored here rather than imported: a non-breaking space
// between a number and its unit so the pair never wraps mid-token.
const NBSP = ' ';
function withUnit(value, unit) {
  return `${value}${NBSP}${unit}`;
}

// The brand lockup is a fixed fraction of the canvas width on every format, so
// the logo is identical across square, portrait and story (audit R3). D109-1
// shrank it as part of dropping the loud stacked lockup for one quiet trailing
// line (footer mark + sticker mark both derive from a ratio, per spec pillar 6).
const MARK_WIDTH_RATIO = 0.16;
const STICKER_MARK_WIDTH_RATIO = 0.15;
// Story 9:16 platform-chrome safe zones (ELITE-SHARE-SPEC pillar 3): nothing
// meaningful renders in the top 14% (platform header/controls) or the bottom
// 20% (reply bar / actions).
const STORY_TOP_SAFE_RATIO = 0.14;
const STORY_SAFE_BOTTOM_RATIO = 0.20;

// How far the athlete can zoom into their photo on top of the cover fit. The
// screen's positioning view clamps to the same value.
export const MAX_PHOTO_ZOOM = 4;

// Optional user photo (SkImage) used as the card background, the athlete's
// framing of it, and whether this render leaves the photo itself out (the
// screen's positioning view draws the photo underneath and lays this render
// over it). Set per-render at the top of drawShareCard; single-threaded, so
// module-level handles are safe.
let BG = null;
let BG_CROP = null;
let OMIT_PHOTO = false;

function hasPhoto() {
  return !!(BG && BG.width && BG.height && BG.width() && BG.height());
}

// A colour at an alpha, as an rgba() string Skia.Color parses on both runtimes.
function rgba(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// Mix an {r,g,b} triple toward black by `amount` (0..1) and return a hex string,
// used to deepen a photo's sampled tone into a scrim colour (pillar 1).
function darkenRgb(r, g, b, amount) {
  const dr = Math.round(r * (1 - amount));
  const dg = Math.round(g * (1 - amount));
  const db = Math.round(b * (1 - amount));
  return `#${[dr, dg, db].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
}

// ── primitives ──────────────────────────────────────────────────────────────

function measure(font, str) {
  if (!str) return 0;
  const ids = font.getGlyphIDs(str);
  const widths = font.getGlyphWidths(ids);
  let total = 0;
  for (let i = 0; i < widths.length; i += 1) total += widths[i];
  return total;
}

function paintFor(Skia, colorStr, style, strokeWidth) {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(colorStr));
  if (style === STROKE) { p.setStyle(STROKE); p.setStrokeWidth(strokeWidth || 1); }
  return p;
}

// Draw text with left | center | right alignment (Skia has no textAlign).
function text(canvas, Skia, str, x, y, font, colorStr, align) {
  if (str == null || str === '') return;
  let dx = x;
  if (align === 'center') dx = x - measure(font, str) / 2;
  else if (align === 'right') dx = x - measure(font, str);
  canvas.drawText(String(str), dx, y, paintFor(Skia, colorStr, FILL), font);
}

// Baseline for the label that sits under a hero numeral. Digits with descenders
// (commas in "1,240,000") struck straight through labels placed at a flat
// offset -- rendered and confirmed on the session and milestone cards. The
// formula lives here so every layout shares one rule (audit R4/H3).
function heroLabelBaseline(heroBaseline, heroFont, isSquare, s) {
  return heroBaseline
    + Math.round(heroFont.getSize() * 0.24)
    + Math.round((isSquare ? 16 : 22) * s);
}

function fillRect(canvas, Skia, x, y, w, h, colorStr) {
  canvas.drawRect(Skia.XYWHRect(x, y, w, h), paintFor(Skia, colorStr, FILL));
}

function fillRRect(canvas, Skia, x, y, w, h, r, colorStr) {
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r), paintFor(Skia, colorStr, FILL));
}

function strokeRRect(canvas, Skia, x, y, w, h, r, colorStr, lw) {
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r), paintFor(Skia, colorStr, STROKE, lw));
}

// Greedy word wrap to a max pixel width, using the active font.
function wrapText(font, str, maxW) {
  const words = String(str || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach((w) => {
    const trial = line ? `${line} ${w}` : w;
    if (measure(font, trial) <= maxW || !line) line = trial;
    else { lines.push(line); line = w; }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

// Trim `line` (character by character, from the end) until `line + '…'` fits
// `maxW`, so the ellipsis itself never overflows the box it is meant to signal
// truncation inside.
function withEllipsis(font, line, maxW) {
  const ELLIPSIS = '…';
  let trimmed = String(line || '');
  if (measure(font, trimmed + ELLIPSIS) <= maxW) return trimmed + ELLIPSIS;
  while (trimmed.length > 0 && measure(font, `${trimmed}${ELLIPSIS}`) > maxW) {
    trimmed = trimmed.slice(0, -1).trimEnd();
  }
  return trimmed ? `${trimmed}${ELLIPSIS}` : ELLIPSIS;
}

// wrapText + a hard line cap, but with the tail marked rather than silently
// dropped (share-card audit M2): the last kept line gets an ellipsis appended
// (trimmed to still fit `maxW`) whenever the wrap needed more lines.
function wrapTextCapped(font, str, maxW, maxLines) {
  const lines = wrapText(font, str, maxW);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = withEllipsis(font, kept[maxLines - 1], maxW);
  return kept;
}

// A no-op canvas for a dry-run "measure" pass (share-card audit R6/H5): every
// canvas method the layouts below call becomes a no-op via a Proxy, so a
// layout function can run TWICE with the EXACT same code -- once to discover
// the height it needs, once for real -- and the two can never drift apart.
function makeNoopCanvas() {
  return new Proxy({}, { get: () => () => undefined });
}

// ── fonts ─────────────────────────────────────────────────────────────────
// typefaces = { regular, medium, semibold, bold, display, displayHeavy }: the
// app's Inter faces (src/styles/fontFamily.js), loaded by the screen. Only
// { regular, bold } are required; each missing face falls back to the
// nearest one supplied, so the system-font fallback and the test harness
// (which pass two faces) still draw every role.

function makeFonts(Skia, typefaces, s) {
  const tf = typefaces || {};
  const faceFor = (weight) => {
    switch (weight) {
      case 'regular': return tf.regular || tf.bold;
      case 'medium': return tf.medium || tf.regular || tf.bold;
      case 'semibold': return tf.semibold || tf.bold || tf.regular;
      case 'display': return tf.display || tf.bold || tf.regular;
      case 'displayHeavy': return tf.displayHeavy || tf.display || tf.bold || tf.regular;
      default: return tf.bold || tf.regular;
    }
  };
  const cache = {};
  return function font(size, weight) {
    const px = Math.max(1, Math.round(size * s));
    const key = `${weight || 'bold'}-${px}`;
    if (!cache[key]) cache[key] = Skia.Font(faceFor(weight), px);
    return cache[key];
  };
}

// Shrink a font until `str` fits `maxW`. `minPx` floors the shrink (default 24,
// suited to the big hero numbers; pass a lower floor for small labels).
function fitFont(font, str, maxW, startPx, makeAt, minPx = 24) {
  let px = startPx;
  let f = makeAt(px);
  while (measure(f, str) > maxW && px > minPx) { px -= 6; f = makeAt(px); }
  return f;
}

// ── the photo ───────────────────────────────────────────────────────────────

/**
 * How far a photo can zoom on a W x H canvas, relative to the cover fit
 * (zoom 1). Zooming out stops where the whole photo fits inside the canvas
 * (the contain fit), so a landscape photo on a story can be shown in full;
 * zooming in stops at MAX_PHOTO_ZOOM.
 *
 * @returns {{min:number, max:number}}
 */
export function photoZoomRange(iw, ih, W, H) {
  const cover = Math.max(W / iw, H / ih);
  const contain = Math.min(W / iw, H / ih);
  return { min: Math.min(1, contain / cover), max: MAX_PHOTO_ZOOM };
}

// One axis of the placement: a photo larger than the canvas on this axis
// may not leave a gap at either edge; a smaller one may not leave the canvas.
function placeAxis(pos, size, frame) {
  return size >= frame
    ? Math.min(0, Math.max(frame - size, pos))
    : Math.max(0, Math.min(frame - size, pos));
}

/**
 * Where a photo lands on a W x H canvas after the athlete's own framing.
 * Founder, 2026-09-26: "it just sticks it one size in the middle it might
 * not show my biceps if I can move it up down left or right it will show
 * better", and then: "Both should be adjustable in position and size".
 * `crop` is { zoom, cx, cy }: `zoom` relative to the cover fit (1 covers the
 * canvas exactly; below 1, down to the contain fit, the whole photo can sit
 * inside it on the card's ground), and (cx, cy) the point of the photo, as
 * fractions of its width and height, that sits at the centre of the canvas.
 * The rectangle is clamped so a photo that covers leaves no gap and a photo
 * that sits inside never leaves the canvas. Storing a point of the PHOTO
 * rather than a pixel offset keeps the framing when the athlete switches
 * between story, square and 4:5. With no crop this is the centre crop every
 * card has always used. Pure, and exported so the screen's positioning view
 * uses the same arithmetic as the renderer.
 *
 * @returns {{x:number, y:number, w:number, h:number}}
 */
export function photoCoverRect(iw, ih, W, H, crop) {
  const range = photoZoomRange(iw, ih, W, H);
  const zoom = crop && Number.isFinite(crop.zoom) ? Math.min(range.max, Math.max(range.min, crop.zoom)) : 1;
  const cx = crop && Number.isFinite(crop.cx) ? crop.cx : 0.5;
  const cy = crop && Number.isFinite(crop.cy) ? crop.cy : 0.5;
  const scale = Math.max(W / iw, H / ih) * zoom;
  const w = iw * scale;
  const h = ih * scale;
  return { x: placeAxis(W / 2 - cx * w, w, W), y: placeAxis(H / 2 - cy * h, h, H), w, h };
}

/**
 * The inverse of photoCoverRect: the framing a placed photo rectangle stands
 * for. The positioning view tracks the photo in its own on-screen pixels and
 * turns the result into this resolution-free form as the athlete lets go.
 *
 * @returns {{zoom:number, cx:number, cy:number}}
 */
export function photoCropFromRect(iw, ih, W, H, rect) {
  const base = Math.max(W / iw, H / ih);
  const range = photoZoomRange(iw, ih, W, H);
  const zoom = Math.min(range.max, Math.max(range.min, rect.w / (iw * base)));
  return { zoom, cx: (W / 2 - rect.x) / rect.w, cy: (H / 2 - rect.y) / rect.h };
}

// Draw an image on W x H, framed by `crop` (see photoCoverRect). Where a
// zoomed-out photo leaves the canvas uncovered, the caller's ground shows.
function drawImageCover(canvas, Skia, img, W, H, crop) {
  const iw = img.width(); const ih = img.height();
  if (!iw || !ih) return;
  const r = photoCoverRect(iw, ih, W, H, crop);
  const p = Skia.Paint(); p.setAntiAlias(true);
  canvas.drawImageRect(img, Skia.XYWHRect(0, 0, iw, ih), Skia.XYWHRect(r.x, r.y, r.w, r.h), p);
}

// Downscale the VISIBLE part of the photo (the card's own aspect and the
// athlete's framing) into a tiny offscreen surface and average its pixels --
// the MacroFactor technique (ELITE-SHARE-SPEC pillar 1) -- so the scrim is
// built from the photo's own tone instead of a flat black wash. The top band
// (where the title sits) and the bottom band (where the numbers sit) are
// judged separately: a bright-sky-top / dark-floor photo must scrim its top
// as a bright photo even though its average is dark (lead render review,
// light-photo card). Surface.MakeOffscreen + SkImage.readPixels are plain
// Skia API on both the device and the CanvasKit harness. Returns null if the
// photo can't be sampled so the caller falls back safely.
function sampleAverageTone(Skia, img, W, H, crop) {
  try {
    const NW = 12;
    const NH = Math.max(6, Math.round(NW * (H / W)));
    const surf = Skia.Surface.MakeOffscreen(NW, NH);
    if (!surf) return null;
    // The ground first, as on the card, so a zoomed-out photo is sampled
    // with the dark around it rather than with transparent pixels.
    fillRect(surf.getCanvas(), Skia, 0, 0, NW, NH, PALETTE.bg0);
    drawImageCover(surf.getCanvas(), Skia, img, NW, NH, crop);
    surf.flush();
    const snap = surf.makeImageSnapshot();
    if (!snap) return null;
    // AlphaType.Unpremul = 3, ColorType.RGBA_8888 = 4 (numeric, matching the
    // FILL/STROKE/CLAMP convention above -- keeps the module RN-import-free).
    const px = snap.readPixels(0, 0, { width: NW, height: NH, alphaType: 3, colorType: 4 });
    if (!px || !px.length) return null;
    let rT = 0; let gT = 0; let bT = 0; let wT = 0;
    let topLumT = 0; let topN = 0;
    const topBand = Math.max(1, Math.round(NH * 0.4));
    for (let y = 0; y < NH; y += 1) {
      const rowWeight = 0.4 + 0.6 * (y / (NH - 1));
      for (let x = 0; x < NW; x += 1) {
        const i = (y * NW + x) * 4;
        rT += px[i] * rowWeight; gT += px[i + 1] * rowWeight; bT += px[i + 2] * rowWeight;
        wT += rowWeight;
        if (y < topBand) {
          topLumT += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
          topN += 1;
        }
      }
    }
    if (!wT) return null;
    const r = rT / wT; const g = gT / wT; const b = bT / wT;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b; // 0..255
    return { r, g, b, luminance, topLuminance: topN ? topLumT / topN : luminance };
  } catch (_e) {
    return null; // never let a sampling failure break the export
  }
}

// A UI-safe minimum: above this sampled luminance, a tone-tinted scrim alone
// does not give white text a reliable contrast floor, so the scrim deepens
// toward black instead of just tinting (ELITE-SHARE-SPEC pillar 1).
const SCRIM_LEGIBILITY_LUMINANCE_FLOOR = 130;

// The scrim is drawn from where the text actually is (`bands`, measured by
// composeCard): dark behind the title at the top, fading out just below it,
// clear through the middle of the photo, then darkening again a little above
// the numbers and holding to the bottom edge. Legible by construction: the
// top stop answers to the TOP band's own luminance and both deepen once the
// photo is bright. With no bands (a caller outside composeCard) the title is
// taken to end at 30% and the numbers to start at 50%.
function drawPhotoScrim(canvas, Skia, W, H, tone, bands) {
  const t = tone || { r: 10, g: 10, b: 10, luminance: 8 };
  const bright = t.luminance > SCRIM_LEGIBILITY_LUMINANCE_FLOOR;
  const brightTop = (t.topLuminance != null ? t.topLuminance : t.luminance) > SCRIM_LEGIBILITY_LUMINANCE_FLOOR;
  const deepHex = darkenRgb(t.r, t.g, t.b, (bright || brightTop) ? 0.86 : 0.65);
  const topAlpha = brightTop ? 0.74 : 0.52;
  const maxAlpha = bright ? 0.9 : 0.8;
  const frac = (v, d) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v / H)) : d);
  const headEnd = frac(bands && bands.headBottom, 0.3);
  const bodyStart = Math.max(headEnd, frac(bands && bands.bodyTop, 0.5));
  const topClear = Math.min(1, headEnd + 0.1);
  const bottomFrom = Math.min(1, Math.max(topClear, bodyStart - 0.14));
  const bottomFull = Math.min(1, Math.max(bottomFrom, bodyStart + 0.04));
  const shader = Skia.Shader.MakeLinearGradient(
    { x: W / 2, y: 0 }, { x: W / 2, y: H },
    [
      Skia.Color(rgba(deepHex, topAlpha)),
      Skia.Color(rgba(deepHex, topAlpha)),
      Skia.Color(rgba(deepHex, 0)),
      Skia.Color(rgba(deepHex, 0)),
      Skia.Color(rgba(deepHex, maxAlpha)),
      Skia.Color(rgba(deepHex, maxAlpha)),
    ],
    [0, headEnd, topClear, bottomFrom, bottomFull, 1], CLAMP,
  );
  const p = Skia.Paint(); p.setShader(shader);
  canvas.drawRect(Skia.XYWHRect(0, 0, W, H), p);
}

// The ground when there is no photo: the app's own background, flat. The
// per-type gradients, corner glows, rings and ticks of the previous design
// are gone with the restyle (theme.js materials policy: no glow, gradient orb
// or bloom outside the one sanctioned surface).
function drawCraftedBackground(canvas, Skia, W, H) {
  fillRect(canvas, Skia, 0, 0, W, H, PALETTE.bg0);
}

function drawBackground(canvas, Skia, W, H, bands) {
  if (hasPhoto()) {
    // The athlete's photo, framed where they put it, under a tone-sampled
    // scrim drawn from the measured text bands. A failure in either half
    // falls back to the plain ground rather than leaving the card groundless
    // (2026-08-18 law: nothing decorative may block a render).
    try {
      if (!OMIT_PHOTO) {
        // The ground under the photo: seen only where a zoomed-out photo
        // leaves the canvas uncovered.
        fillRect(canvas, Skia, 0, 0, W, H, PALETTE.bg0);
        drawImageCover(canvas, Skia, BG, W, H, BG_CROP);
      }
      drawPhotoScrim(canvas, Skia, W, H, sampleAverageTone(Skia, BG, W, H, BG_CROP), bands);
      return;
    } catch (_e) { /* fall through to the plain ground */ }
  }
  drawCraftedBackground(canvas, Skia, W, H);
}

// Letter-spaced text. Skia's font API has no tracking, and the uppercase
// section labels depend on it: without tracking a short uppercase label reads
// as a cramped word. Drawn per character so measurement stays honest.
function textTracked(canvas, Skia, str, x, y, font, colorStr, align, tracking) {
  const chars = String(str).split('');
  const advances = chars.map((c) => measure(font, c));
  const total = advances.reduce((a, b) => a + b, 0) + tracking * Math.max(0, chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  chars.forEach((c, i) => {
    text(canvas, Skia, c, cx, y, font, colorStr, 'left');
    cx += advances[i] + tracking;
  });
  return total;
}

function trackedWidth(str, font, tracking) {
  const chars = String(str).split('');
  return chars.reduce((a, c) => a + measure(font, c), 0) + tracking * Math.max(0, chars.length - 1);
}


// Footer block height, ONE definition. D109-1 drops the tagline band
// everywhere and replaces the stacked wordmark/tagline+underline/url lockup
// with a single quiet trailing line (mark + volyume.app side by side), so the
// footer needs far less vertical room than the old three-tier lockup did.
const FOOTER_H_SQUARE = 128;
const FOOTER_H_TALL = 150;
function footerHeight(isSquare, s) {
  return Math.round((isSquare ? FOOTER_H_SQUARE : FOOTER_H_TALL) * s);
}

// D109-1: "Footer replaced by a small trailing mark: compact wordmark +
// volyume.app in one quiet line. The tagline band is dropped ... small
// trailing mark is the elite norm; the loud lockup is the anti-pattern."
// Keeps the MARK_WIDTH_RATIO proportionality law and the story safe-bottom
// law (brandLockup.guard R3/H2) -- only the lockup's own shape changes, from
// three stacked tiers to one centred line.
function drawFooter(canvas, Skia, W, H, pad, isSquare, s, font, wordmark) {
  const footerH = footerHeight(isSquare, s);
  // On a 9:16 story the footer used to sit in the last ~10% of the canvas,
  // which is exactly where platform chrome (reply bar / actions) overlays --
  // so the logo and URL were the FIRST things a viewer lost (audit H2). D108
  // widens that clearance to a stated bottom-20% platform-chrome safe zone.
  const storyLift = isSquare ? 0 : Math.round(H * STORY_SAFE_BOTTOM_RATIO);
  const fy = H - footerH - storyLift;
  fillRect(canvas, Skia, pad, fy, W - pad * 2, Math.max(1, Math.round(1 * s)), PALETTE.divider);

  // ONE lockup, ONE relative size, on every format (share-card audit R3) --
  // deriving the width as a fraction of canvas width keeps the brand
  // identical everywhere regardless of the asset's pixel dimensions.
  const markW = W * MARK_WIDTH_RATIO;
  const hasMark = !!(wordmark && wordmark.width && wordmark.height && wordmark.width() && wordmark.height());
  const markH = hasMark
    ? Math.round(markW / (wordmark.width() / wordmark.height()))
    : Math.round((isSquare ? 30 : 36) * s);
  // No fake wordmark. This used to draw the plain system-font word "Volyume"
  // when the asset was missing, which shipped an off-brand card that LOOKED
  // deliberate -- the reported "some don't have the logo". The screen refuses
  // to export until the mark has loaded (ShareCardScreen `cardReady`), so in
  // the app this branch is unreachable; it exists only so the Node render
  // harness and layout tests, which pass no wordmark, still lay out and do
  // not throw. Space is reserved either way so the footer geometry never
  // shifts, and the URL still centres alone rather than the pair looking
  // lopsided.
  const urlFont = font(isSquare ? 20 : 24, 'regular');
  const urlStr = 'volyume.app';
  const gap = Math.round(14 * s);
  const rowW = (hasMark ? markW + gap : 0) + measure(urlFont, urlStr);
  const rowX = (W - rowW) / 2;
  const lineY = fy + footerH / 2;
  if (hasMark) {
    const p = Skia.Paint(); p.setAntiAlias(true);
    canvas.drawImageRect(
      wordmark,
      Skia.XYWHRect(0, 0, wordmark.width(), wordmark.height()),
      Skia.XYWHRect(rowX, lineY - markH / 2, markW, markH),
      p,
    );
  }
  const urlX = rowX + (hasMark ? markW + gap : 0);
  text(canvas, Skia, urlStr, urlX, lineY + urlFont.getSize() * 0.34, urlFont, PALETTE.textMuted, 'left');
}

// ── the card's building blocks (2026-09-26 restyle) ─────────────────────────
//
// Each block draws from a top edge `y` and returns the y it ends at, so the
// same code measures (on the no-op canvas) and draws. All sizes are design px
// in the 1080-wide space.

// The app's section-label style (SectionLabel / type.overline) at card scale:
// uppercase, semibold, letter-spaced.
function overlineTracking(size, s) {
  return Math.max(1, Math.round(size * 0.1 * s));
}

// Fit an uppercase label into `maxW`: shrink to a floor, then trim with an
// ellipsis, so a long plan name never runs into the date beside it.
function fitOverline(font, str, maxW, size, s) {
  const label = String(str || '').toUpperCase();
  let sz = size;
  let f = font(sz, 'semibold');
  let tr = overlineTracking(sz, s);
  while (trackedWidth(label, f, tr) > maxW && sz > 15) {
    sz -= 1; f = font(sz, 'semibold'); tr = overlineTracking(sz, s);
  }
  let out = label;
  if (trackedWidth(out, f, tr) > maxW) {
    while (out.length > 1 && trackedWidth(`${out}…`, f, tr) > maxW) out = out.slice(0, -1).trimEnd();
    out = `${out}…`;
  }
  return { label: out, font: f, tracking: tr };
}

// The label row at the top of a card: what the card is on the left (the plan
// name, "Personal record", a milestone's own label) and the date on the
// right. Either may be absent; a lone date takes the left.
function drawOverlineRow(cv, Skia, x, w, y, left, right, size, s, font) {
  const l = String(left || '').trim();
  const r = String(right || '').trim();
  if (!l && !r) return y;
  const baseline = y + Math.round(size * 0.8 * s);
  if (l && r) {
    const rf = fitOverline(font, r, w * 0.5, size, s);
    const rw = trackedWidth(rf.label, rf.font, rf.tracking);
    textTracked(cv, Skia, rf.label, x + w, baseline, rf.font, PALETTE.textMuted, 'right', rf.tracking);
    const lf = fitOverline(font, l, w - rw - Math.round(28 * s), size, s);
    textTracked(cv, Skia, lf.label, x, baseline, lf.font, PALETTE.textSecondary, 'left', lf.tracking);
  } else {
    const only = fitOverline(font, l || r, w, size, s);
    textTracked(cv, Skia, only.label, x, baseline, only.font, l ? PALETTE.textSecondary : PALETTE.textMuted, 'left', only.tracking);
  }
  return y + Math.round(size * 1.2 * s);
}

// The card's title in the app's display face. Capped at `maxLines` with the
// tail marked (audit M2).
function drawTitle(cv, Skia, x, w, y, str, size, maxLines, s, font) {
  const f = font(size, 'display');
  const lines = wrapTextCapped(f, str, w, maxLines);
  const lineH = Math.round(size * 1.08 * s);
  let baseline = y + Math.round(size * 0.98 * s);
  lines.forEach((l, i) => {
    text(cv, Skia, l, x, baseline, f, PALETTE.text, 'left');
    if (i < lines.length - 1) baseline += lineH;
  });
  return baseline + Math.round(size * 0.28 * s);
}

// A number with a smaller unit after it on the same baseline ("12,450 kg",
// "52 min"), the way the app sets a numeral and its unit. `parts` after the
// unit (the PR card's "× 5") draw at their own ratio of `size`.
function valueRunsWidth(font, runs, size, weight) {
  let w = 0;
  runs.forEach((r, i) => {
    if (!r.t) return;
    const f = font(Math.max(10, Math.round(size * r.ratio)), weight);
    if (i > 0) w += measure(f, ' ');
    w += measure(f, r.t);
  });
  return w;
}

function drawValueRuns(cv, Skia, x, baseline, runs, size, weight, colorStr, font, align) {
  const total = valueRunsWidth(font, runs, size, weight);
  let cx = align === 'right' ? x - total : x;
  runs.forEach((r, i) => {
    if (!r.t) return;
    const f = font(Math.max(10, Math.round(size * r.ratio)), weight);
    if (i > 0) cx += measure(f, ' ');
    text(cv, Skia, r.t, cx, baseline, f, colorStr, 'left');
    cx += measure(f, r.t);
  });
  return total;
}

// The hero: the card's one amber object, left-aligned, with its caption
// under it in the app's secondary text. It shrinks to fit the width.
function drawHero(cv, Skia, x, w, y, runs, caption, size, capSize, isSquare, s, font) {
  let sz = size;
  while (valueRunsWidth(font, runs, sz, 'displayHeavy') > w && sz > 48) sz -= 4;
  const heroFont = font(sz, 'displayHeavy');
  const baseline = y + Math.round(sz * 0.74 * s);
  drawValueRuns(cv, Skia, x, baseline, runs, sz, 'displayHeavy', PALETTE.accent, font);
  if (!caption) return baseline + Math.round(sz * 0.24 * s);
  const capFont = fitFont(null, caption, w, capSize, (px) => font(px, 'medium'), 14);
  const capBaseline = heroLabelBaseline(baseline, heroFont, isSquare, s) + Math.round(capSize * 0.5 * s);
  text(cv, Skia, caption, x, capBaseline, capFont, PALETTE.textSecondary, 'left');
  return capBaseline + Math.round(capSize * 0.3 * s);
}

// A hairline between sections, the way the app's cards divide their rows.
function drawRule(cv, Skia, x, w, y, s) {
  const t = Math.max(1, Math.round(1.5 * s));
  fillRect(cv, Skia, x, y, w, t, PALETTE.rule);
  return y + t;
}

// Up to four numbers in equal columns, each a value (with its unit) over a
// plain caption. No boxes, no icons: the columns and the hairlines around
// the row are the structure.
function drawStatRow(cv, Skia, x, w, y, stats, valSize, capSize, s, font) {
  const shown = (stats || []).filter((st) => st && st.value !== '' && st.value != null).slice(0, 4);
  if (!shown.length) return y;
  const colW = w / shown.length;
  const valBaseline = y + Math.round(valSize * 0.74 * s);
  const capBaseline = valBaseline + Math.round(valSize * 0.22 * s) + Math.round(capSize * 1.15 * s);
  shown.forEach((st, i) => {
    const cx = x + i * colW;
    const maxW = colW - Math.round(20 * s);
    const runs = [{ t: String(st.value), ratio: 1 }, { t: st.unit || '', ratio: 0.46 }];
    let sz = valSize;
    while (valueRunsWidth(font, runs, sz, 'display') > maxW && sz > 20) sz -= 2;
    drawValueRuns(cv, Skia, cx, valBaseline, runs, sz, 'display', PALETTE.text, font);
    const capFont = fitFont(null, String(st.label || ''), maxW, capSize, (px) => font(px, 'regular'), 12);
    text(cv, Skia, String(st.label || ''), cx, capBaseline, capFont, PALETTE.textSecondary, 'left');
  });
  return capBaseline + Math.round(capSize * 0.3 * s);
}

// One lift as a row, the way the app lists a set: the section label (and an
// optional amber marker on the right, e.g. "NEW PR"), then the exercise on
// the left and the set on the right. A name too long to sit beside the set
// takes its own line (two at most) with the set under it, so the name the
// athlete chose is never cut to fit.
function drawLiftRow(cv, Skia, x, w, y, label, marker, name, value, ovSize, nameSize, valSize, s, font) {
  let by = y;
  if (label) {
    const baseline = by + Math.round(ovSize * 0.8 * s);
    const f = font(ovSize, 'semibold');
    const tr = overlineTracking(ovSize, s);
    textTracked(cv, Skia, label, x, baseline, f, PALETTE.textSecondary, 'left', tr);
    if (marker) textTracked(cv, Skia, marker, x + w, baseline, f, PALETTE.accent, 'right', tr);
    by += Math.round(ovSize * 1.2 * s) + Math.round(ovSize * 0.45 * s);
  }
  const valFont = font(valSize, 'display');
  const nameFont = font(nameSize, 'semibold');
  const nameMax = w - measure(valFont, value) - Math.round(32 * s);
  if (measure(nameFont, name) <= nameMax) {
    const baseline = by + Math.round(valSize * 0.76 * s);
    text(cv, Skia, name, x, baseline, nameFont, PALETTE.text, 'left');
    text(cv, Skia, value, x + w, baseline, valFont, PALETTE.text, 'right');
    return baseline + Math.round(valSize * 0.26 * s);
  }
  const lines = wrapTextCapped(nameFont, name, w, 2);
  let baseline = by + Math.round(nameSize * 0.8 * s);
  lines.forEach((l, i) => {
    text(cv, Skia, l, x, baseline, nameFont, PALETTE.text, 'left');
    if (i < lines.length - 1) baseline += Math.round(nameSize * 1.2 * s);
  });
  baseline += Math.round(valSize * 1.12 * s);
  text(cv, Skia, value, x, baseline, valFont, PALETTE.text, 'left');
  return baseline + Math.round(valSize * 0.26 * s);
}

// A short paragraph in the app's secondary text (a milestone's caption, the
// weekly coach line).
function drawParagraph(cv, Skia, x, w, y, str, size, maxLines, s, font) {
  if (!str) return y;
  const f = font(size, 'regular');
  const lines = wrapTextCapped(f, String(str), w, maxLines);
  const lineH = Math.round(size * 1.4 * s);
  let baseline = y + Math.round(size * 0.9 * s);
  lines.forEach((l, i) => {
    text(cv, Skia, l, x, baseline, f, PALETTE.textSecondary, 'left');
    if (i < lines.length - 1) baseline += lineH;
  });
  return baseline + Math.round(size * 0.35 * s);
}

// Type sizes per format. Over a photo the photo is the subject, so the text
// steps down and packs tighter, and more of the photo shows between the title
// at the top and the numbers at the bottom.
function cardSizes(fmt, photo) {
  const base = fmt === 'square'
    ? { overline: 22, title: 60, hero: 150, heroCap: 30, statVal: 52, statCap: 25, liftName: 34, liftVal: 38, gap: 30, headGap: 40 }
    : fmt === 'portrait'
      ? { overline: 24, title: 72, hero: 196, heroCap: 32, statVal: 60, statCap: 27, liftName: 38, liftVal: 42, gap: 38, headGap: 60 }
      : { overline: 26, title: 82, hero: 228, heroCap: 34, statVal: 64, statCap: 28, liftName: 40, liftVal: 46, gap: 44, headGap: 76 };
  if (!photo) return base;
  return {
    ...base,
    title: Math.round(base.title * 0.86),
    hero: Math.round(base.hero * 0.6),
    statVal: Math.round(base.statVal * 0.85),
    liftName: Math.round(base.liftName * 0.9),
    liftVal: Math.round(base.liftVal * 0.9),
    gap: Math.round(base.gap * 0.62),
  };
}

// ── format + safe-zone layout ────────────────────────────────────────────

function bodyFormat(p) {
  if (p.aspect === 'portrait') return 'portrait';
  if (p.aspect === 'story') return 'story';
  if (p.aspect === 'square') return 'square';
  return p.isSquare ? 'square' : 'story'; // legacy callers with no aspect param
}

// The first content y. Story clamps it below the top-14% chrome safe zone;
// square/portrait keep the card's own base offset.
function headerTopY(H, fmt, base) {
  return fmt === 'story' ? Math.max(base, Math.round(H * STORY_TOP_SAFE_RATIO)) : base;
}

/**
 * Compose a card from its head (the label row and the title) and its body
 * (the numbers), then draw the ground under them.
 *
 * Without a photo the two sit together as one block, centred between the
 * safe zones on every format, so no format ends on an empty band above the
 * footer (the dead zone the share-card audit measured on the square). With a
 * photo the head stays at the top and the body sits at the bottom, so the
 * middle of the photo stays clear for what the athlete framed there; the
 * scrim is then drawn from where the text actually is. The hero numeral is
 * the one flexible element: when the content is tall it steps down until
 * everything fits above the footer, and only then does the title drop to one
 * line. The top-lift row is never dropped to make room: the athlete chose it.
 */
function composeCard(canvas, Skia, W, H, s, p, drawHead, drawBody) {
  const fmt = bodyFormat(p);
  const photo = hasPhoto();
  const pad = Math.round(W * 0.074);
  const footerH = footerHeight(p.isSquare, s);
  const storyLift = fmt === 'story' ? Math.round(H * STORY_SAFE_BOTTOM_RATIO) : 0;
  const topY = headerTopY(H, fmt, pad + Math.round(28 * s));
  const bottomY = H - footerH - storyLift - Math.round(28 * s);
  const available = bottomY - topY;
  const z = cardSizes(fmt, photo);
  const gap = Math.round(z.headGap * s);
  // Over a photo, keep at least this much of it clear between head and body.
  const clear = photo ? Math.round(H * (fmt === 'story' ? 0.16 : 0.1)) : gap;
  const noop = makeNoopCanvas();
  let compact = false;
  let headH = drawHead(noop, 0, compact);
  let scale = 1;
  let bodyH = drawBody(noop, 0, scale);
  while (headH + clear + bodyH > available && scale > 0.62) {
    scale = Math.round((scale - 0.06) * 100) / 100;
    bodyH = drawBody(noop, 0, scale);
  }
  if (headH + clear + bodyH > available) {
    compact = true;
    headH = drawHead(noop, 0, compact);
  }
  let headY;
  let bodyY;
  if (photo) {
    headY = topY;
    bodyY = Math.max(headY + headH + gap, bottomY - bodyH);
  } else {
    headY = topY + Math.max(0, Math.round((available - (headH + gap + bodyH)) / 2));
    bodyY = headY + headH + gap;
  }
  drawBackground(canvas, Skia, W, H, { headBottom: headY + headH, bodyTop: bodyY });
  drawHead(canvas, headY, compact);
  drawBody(canvas, bodyY, scale);
}

// ── card layouts ─────────────────────────────────────────────────────────────

// Shared with the session sticker: ONE hero stat, chosen the same way on both
// the full card and the compact sticker so the two never disagree. Founder
// ruling 2026-08-23: prCount is the workout summary's detectedPRs length,
// which is bestPRPerExercise's output - one entry per LIFT, not one per
// record - so the label says what it counts. "Total lifted" is the workout
// summary's own label for the same number.
function sessionHeroInfo(p, unit) {
  if (p.prCount > 0) {
    return {
      value: String(p.prCount),
      unit: '',
      label: p.prCount === 1 ? 'Lift with a new best' : 'Lifts with a new best',
    };
  }
  if (p.showVolume && (p.tonnage || 0) > 0) {
    return { value: Math.round(p.tonnage).toLocaleString('en-GB'), unit, label: 'Total lifted' };
  }
  return { value: String(p.workingSets || 0), unit: '', label: 'Working sets' };
}

// The set as the app writes it: "90 kg × 8", or the weight alone when no reps
// were logged.
function setString(weight, reps, unit) {
  const w = withUnit(String(weight), unit);
  return reps ? `${w} × ${reps}` : w;
}

function drawSession(canvas, Skia, W, H, p, s, font, wordmark) {
  const pad = Math.round(W * 0.074);
  const cw = W - pad * 2;
  const z = cardSizes(bodyFormat(p), hasPhoto());
  // Gym weights are stored in the user's chosen unit (kg|lbs), never assumed
  // (share-card audit R8/M5).
  const unit = p.units || 'kg';
  const hero = sessionHeroInfo(p, unit);

  const stats = [{ label: 'Sets', value: String(p.workingSets || 0) }];
  // Below one minute there is no honest time to show, so the column is
  // omitted rather than faked as "0 min".
  if ((p.duration || 0) >= 1) stats.push({ label: 'Time', value: String(p.duration), unit: 'min' });
  if (p.showVolume && (p.tonnage || 0) > 0 && p.prCount > 0) stats.push({ label: 'Total lifted', value: Math.round(p.tonnage).toLocaleString('en-GB'), unit });
  else if (p.exerciseCount > 0) stats.push({ label: 'Exercises', value: String(p.exerciseCount) });

  // The lift the athlete chose on the share screen (null when they chose
  // none). There is no exercise-name line any more: founder order
  // 2026-09-26, "I don't want exercise names list to be an option or show at
  // all as it does not fit in the share and looks stupid."
  const lift = p.topSet && p.topSet.weight > 0 ? p.topSet : null;

  const drawHead = (cv, y, compact) => {
    const by = drawOverlineRow(cv, Skia, pad, cw, y, p.showPlanName ? p.planName : '', p.showDate ? p.date : '', z.overline, s, font);
    return drawTitle(cv, Skia, pad, cw, by, p.sessionName || 'Workout complete', z.title, compact ? 1 : 2, s, font);
  };
  const drawBody = (cv, y, scale) => {
    const gap = Math.round(z.gap * s);
    let by = drawHero(cv, Skia, pad, cw, y, [{ t: hero.value, ratio: 1 }, { t: hero.unit, ratio: 0.3 }], hero.label, Math.round(z.hero * scale), z.heroCap, p.isSquare, s, font);
    by = drawRule(cv, Skia, pad, cw, by + gap, s) + gap;
    by = drawStatRow(cv, Skia, pad, cw, by, stats, z.statVal, z.statCap, s, font);
    if (lift) {
      by = drawRule(cv, Skia, pad, cw, by + gap, s) + gap;
      by = drawLiftRow(cv, Skia, pad, cw, by, 'TOP LIFT', '', lift.exerciseName || 'Top lift', setString(lift.weight, lift.reps, unit), z.overline, z.liftName, z.liftVal, s, font);
    }
    return by;
  };
  composeCard(canvas, Skia, W, H, s, p, drawHead, drawBody);
  drawFooter(canvas, Skia, W, H, pad, p.isSquare, s, font, wordmark);
}

function drawPR(canvas, Skia, W, H, p, s, font, wordmark) {
  const pad = Math.round(W * 0.074);
  const cw = W - pad * 2;
  const z = cardSizes(bodyFormat(p), hasPhoto());
  const unit = p.units || 'kg';
  // The record as the lifting vernacular writes it: the weight large with a
  // small unit, then the reps. With the weight toggled off, the reps alone.
  const runs = p.showPRWeight
    ? [{ t: String(p.weight || '-'), ratio: 1 }, { t: unit, ratio: 0.3 }, { t: `× ${p.reps || '-'}`, ratio: 0.56 }]
    : [{ t: String(p.reps || '-'), ratio: 1 }, { t: 'reps', ratio: 0.3 }];
  const caption = p.showPrevBest && p.previousBest ? `Previous best: ${withUnit(String(p.previousBest), unit)}` : '';

  const drawHead = (cv, y, compact) => {
    const by = drawOverlineRow(cv, Skia, pad, cw, y, 'Personal record', p.showDate ? p.date : '', z.overline, s, font);
    return drawTitle(cv, Skia, pad, cw, by, p.exerciseName || 'Exercise', z.title, compact ? 1 : 2, s, font);
  };
  // The record is the whole card's reason to exist, so its numeral starts a
  // step above the other heroes.
  const drawBody = (cv, y, scale) => drawHero(cv, Skia, pad, cw, y, runs, caption, Math.round(z.hero * 1.12 * scale), z.heroCap, p.isSquare, s, font);
  composeCard(canvas, Skia, W, H, s, p, drawHead, drawBody);
  drawFooter(canvas, Skia, W, H, pad, p.isSquare, s, font, wordmark);
}

function drawMilestone(canvas, Skia, W, H, p, s, font, wordmark) {
  const pad = Math.round(W * 0.074);
  const cw = W - pad * 2;
  const z = cardSizes(bodyFormat(p), hasPhoto());
  const heroValue = String(p.heroValue != null ? p.heroValue : '');
  const stats = (p.stats || []).slice(0, 3).map((st) => ({ label: String(st.label || ''), value: String(st.value != null ? st.value : '') }));

  const drawHead = (cv, y, compact) => {
    const by = drawOverlineRow(cv, Skia, pad, cw, y, p.eyebrow || '', p.showDate ? p.date : '', z.overline, s, font);
    return drawTitle(cv, Skia, pad, cw, by, p.title || '', z.title, compact ? 1 : 2, s, font);
  };
  const drawBody = (cv, y, scale) => {
    const gap = Math.round(z.gap * s);
    let by = y;
    // An empty hero skips its band entirely rather than reserving a void
    // (audit H4).
    if (heroValue) {
      by = drawHero(cv, Skia, pad, cw, by, [{ t: heroValue, ratio: 1 }], p.heroUnit ? String(p.heroUnit) : '', Math.round(z.hero * scale), z.heroCap, p.isSquare, s, font);
    }
    if (p.caption) {
      if (heroValue) by += Math.round(gap * 0.6);
      by = drawParagraph(cv, Skia, pad, cw, by, p.caption, z.heroCap - 2, 2, s, font);
    }
    if (stats.length) {
      by = drawRule(cv, Skia, pad, cw, by + gap, s) + gap;
      by = drawStatRow(cv, Skia, pad, cw, by, stats, z.statVal, z.statCap, s, font);
    }
    return by;
  };
  composeCard(canvas, Skia, W, H, s, p, drawHead, drawBody);
  drawFooter(canvas, Skia, W, H, pad, p.isSquare, s, font, wordmark);
}

// Weekly Precision Coaching recap. Leads with the user's real goal achievement
// as the amber hero, then the best lift, the real stat wins and a coach line
// that names the numbers. ED-safety lives in the param builder (greatWeek.js):
// under calm mode / an ED flag the progress hero, the lift hero and all weight
// language are already stripped before they reach here, and the card only
// ever renders for a verified-safe, on-target week. DATA LAWS UNCHANGED by the
// 2026-09-26 restyle: only the drawing changed.
function drawWeeklyRecap(canvas, Skia, W, H, p, s, font, wordmark) {
  const pad = Math.round(W * 0.074);
  const cw = W - pad * 2;
  const z = cardSizes(bodyFormat(p), hasPhoto());
  const stats = (p.stats || []).slice(0, 4).map((st) => ({ label: String(st.label || ''), value: String(st.value != null ? st.value : '') }));
  const heroCaption = p.hero ? [p.hero.heading, p.hero.context].filter(Boolean).join(' · ') : '';
  const capitalised = heroCaption ? heroCaption.charAt(0).toUpperCase() + heroCaption.slice(1) : '';

  const drawHead = (cv, y) => {
    const by = drawOverlineRow(cv, Skia, pad, cw, y, p.weekLabel || '', p.showDate ? p.dateFormatted : '', z.overline, s, font);
    return drawTitle(cv, Skia, pad, cw, by, p.tierLabel || 'Great Week', z.title, 1, s, font);
  };
  const drawBody = (cv, y, scale) => {
    const gap = Math.round(z.gap * s);
    let by = y;
    let drewAny = false;
    if (p.hero && p.hero.value) {
      by = drawHero(cv, Skia, pad, cw, by, [{ t: String(p.hero.value), ratio: 1 }], capitalised, Math.round(z.hero * 0.86 * scale), z.heroCap, p.isSquare, s, font);
      drewAny = true;
    }
    // Best-lift feature: the standout set, a competence win, never a ranking.
    if (p.bestLift && p.bestLift.weight) {
      const bl = p.bestLift;
      if (drewAny) by = drawRule(cv, Skia, pad, cw, by + gap, s) + gap;
      by = drawLiftRow(cv, Skia, pad, cw, by, 'BEST LIFT', bl.isNewBest ? 'NEW PR' : '', bl.exerciseName || 'Best lift', setString(bl.weight, bl.reps, bl.units || 'kg'), z.overline, z.liftName, z.liftVal, s, font);
      drewAny = true;
    }
    if (stats.length) {
      if (drewAny) by = drawRule(cv, Skia, pad, cw, by + gap, s) + gap;
      by = drawStatRow(cv, Skia, pad, cw, by, stats, z.statVal, z.statCap, s, font);
      drewAny = true;
    }
    // Coach line: names the real numbers, as a caption under the numbers.
    if (p.coachLine) {
      if (drewAny) by += gap;
      by = drawParagraph(cv, Skia, pad, cw, by, p.coachLine, z.heroCap - 4, 3, s, font);
    }
    return by;
  };
  composeCard(canvas, Skia, W, H, s, p, drawHead, drawBody);
  drawFooter(canvas, Skia, W, H, pad, p.isSquare, s, font, wordmark);
}

// ── before/after progress card (progress-photos §3.8; S1/S2) ──────────────────
//
// Skia ClipOp.Intersect. On device JsiSkCanvas takes the numeric ClipOp
// directly; the CanvasKit/Node path maps it through PathOp, whose Intersect
// shares the same value (1) — so this one constant is correct on both runtimes.
const CLIP_INTERSECT = 1;

// Draw an SkImage COVER-cropped (object-fit: cover) into a rounded cell rect,
// clipped so the crop never bleeds past the cell corners. Like drawImageCover
// but targeting an arbitrary x/y/w/h with a corner radius. A missing or
// undecodable image leaves a neutral surface fill (no black hole, never throws);
// the sheet still validates BOTH images up-front and calm-aborts (S2 guard 1).
function drawPhotoCell(canvas, Skia, img, x, y, w, h, r) {
  fillRRect(canvas, Skia, x, y, w, h, r, PALETTE.surface);
  if (!(img && img.width && img.width() && img.height && img.height())) return;
  const iw = img.width(); const ih = img.height();
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale; const dh = ih * scale;
  const dx = x + (w - dw) / 2; const dy = y + (h - dh) / 2;
  canvas.save();
  canvas.clipRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r), CLIP_INTERSECT, true);
  const p = Skia.Paint(); p.setAntiAlias(true);
  // Two source photos of any aspect resolve to the SAME dst cell here, so the
  // pair is always identical cells regardless of source dimensions (S2 guard 2).
  canvas.drawImageRect(img, Skia.XYWHRect(0, 0, iw, ih), Skia.XYWHRect(dx, dy, dw, dh), p);
  canvas.restore();
}

// The per-photo caption plate: a bottom scrim bar carrying "date · weight",
// sitting ON its own photo cell so which weight belongs to which shot is never
// ambiguous. Weight is optional — suppressed/toggled-off callers pass '' and
// only the date shows. Clipped to the cell so the plate shares its rounded
// bottom corners rather than overhanging them. Campaign 30 strengthened the
// scrim (0.62 -> 0.7); the 2026-09-26 restyle drops its amber top edge (one
// amber object per card, and on this card that is nothing).
function drawCellCaption(canvas, Skia, x, y, w, h, r, cell, s, font) {
  const line = [cell && cell.date, cell && cell.scanRange, cell && cell.weight].filter(Boolean).join('  ·  ');
  if (!line) return;
  const plateH = Math.round(Math.min(Math.max(h * 0.16, 64 * s), h * 0.24));
  const py = y + h - plateH;
  canvas.save();
  canvas.clipRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r), CLIP_INTERSECT, true);
  fillRect(canvas, Skia, x, py, w, plateH, rgba(PALETTE.bg0, 0.7));
  canvas.restore();
  const f = fitFont(null, line, w - Math.round(36 * s), 22, (px) => font(px, 'medium'), 12);
  text(canvas, Skia, line, x + w / 2, py + plateH * 0.62, f, PALETTE.text, 'center');
}

// The centred elapsed time: the quiet headline that belongs to the PAIR, not
// either photo, set as a section label (the 2026-09-26 restyle retired the
// amber pill it used to sit in). Time stated neutrally, never
// "transformation", never an arrow.
function drawElapsedLabel(canvas, Skia, W, y, label, s, font) {
  if (!label) return y;
  const size = 24;
  const f = font(size, 'semibold');
  const tr = overlineTracking(size, s);
  textTracked(canvas, Skia, String(label).toUpperCase(), W / 2, y + Math.round(size * 0.8 * s), f, PALETTE.textSecondary, 'center', tr);
  return y + Math.round(size * 1.2 * s) + Math.round(28 * s);
}

// Before/after progress card — TWO dated progress photos composited into ONE
// image: older-left / newer-right as identical cover-cropped cells (square /
// portrait), or older-top / newer-bottom stacked (story), each with its own
// date·weight caption plate, a centred elapsed-time label and the shared
// wordmark footer.
//
// WEIGHT-ON-CARD is a FOUNDER-APPROVED override of the locked "share cards never
// include name/bodyweight/measurements/private notes" rule (progress-photos
// DECISIONS #2, 2026-07-03). It is bounded, not a general loosening:
//   - the whole card is WITHHELD under calm mode OR an open ED-pattern flag —
//     BeforeAfterShareSheet gates on usePhotoSuppression, fail-closed, BEFORE
//     compose/encode/share, so a suppressed user never reaches this renderer;
//   - weight is a user toggle (default on); dropping it leaves photos+dates+
//     elapsed only;
//   - name, measurements and private notes stay banned — bodyweight only, here
//     only. The integrator records the decision and updates the locked-rule note
//     + the screen's privacy line.
function drawBeforeAfter(canvas, Skia, W, H, p, s, font, wordmark, photos) {
  const pad = Math.round(W * 0.074);
  drawBackground(canvas, Skia, W, H, null);

  const before = p.before || {};
  const after = p.after || {};
  const beforeImg = photos && photos.before;
  const afterImg = photos && photos.after;
  const r = Math.round(16 * s);
  const gap = Math.round(14 * s);

  let y = pad + Math.round(48 * s);
  y = drawElapsedLabel(canvas, Skia, W, y, p.elapsedLabel, s, font);
  y += Math.round(8 * s);

  const footerH = footerHeight(p.isSquare, s);
  // On the 'story' aspect the footer itself lifts clear of the platform-chrome
  // safe zone (STORY_SAFE_BOTTOM_RATIO, drawFooter above); missing that lift
  // here meant the bottom cell's photo (and its date/weight caption) rendered
  // UNDER the lifted footer, so the wordmark and URL painted straight over the
  // photo and its caption instead of below it -- found by actually rendering
  // this card (share-card audit R10/M7, the first time this card type had any
  // rendered-output coverage at all).
  const storyLift = p.isSquare ? 0 : Math.round(H * STORY_SAFE_BOTTOM_RATIO);
  const cellsTop = y;
  const cellsBottom = H - footerH - storyLift - Math.round(24 * s);
  const cellsH = Math.max(1, cellsBottom - cellsTop);

  if (p.aspect === 'story') {
    // Stacked: older on top, newer below (two portraits each get a landscape-ish
    // cell in the tall 9:16 frame — side-by-side would slice each to a sliver).
    const cellW = W - pad * 2;
    const cellH = Math.floor((cellsH - gap) / 2);
    drawPhotoCell(canvas, Skia, beforeImg, pad, cellsTop, cellW, cellH, r);
    drawCellCaption(canvas, Skia, pad, cellsTop, cellW, cellH, r, before, s, font);
    const y2 = cellsTop + cellH + gap;
    drawPhotoCell(canvas, Skia, afterImg, pad, y2, cellW, cellH, r);
    drawCellCaption(canvas, Skia, pad, y2, cellW, cellH, r, after, s, font);
  } else {
    // Side-by-side: older-left / newer-right, identical cells, hairline gutter.
    const cellW = Math.floor((W - pad * 2 - gap) / 2);
    const cellH = cellsH;
    drawPhotoCell(canvas, Skia, beforeImg, pad, cellsTop, cellW, cellH, r);
    drawCellCaption(canvas, Skia, pad, cellsTop, cellW, cellH, r, before, s, font);
    const x2 = pad + cellW + gap;
    drawPhotoCell(canvas, Skia, afterImg, x2, cellsTop, cellW, cellH, r);
    drawCellCaption(canvas, Skia, x2, cellsTop, cellW, cellH, r, after, s, font);
  }

  drawFooter(canvas, Skia, W, H, pad, p.isSquare, s, font, wordmark);
}


/**
 * The card pixel height for a given width + format.
 *
 * The back-compatible two-arg form (isSquare boolean) drives every existing
 * card type unchanged. The optional third `aspect` is used by every card type
 * that wants the ('square'|'portrait'|'story') preset: 'square' 1:1, 'portrait'
 * 4:5 (the IG-feed ratio) and 'story' 9:16. When `aspect` is omitted the legacy
 * isSquare behaviour is preserved exactly.
 */
export function cardHeight(width, isSquare, aspect) {
  if (aspect === 'square') return width;
  if (aspect === 'portrait') return Math.round((width * 5) / 4);
  if (aspect === 'story') return Math.round((width * 16) / 9);
  return isSquare ? width : Math.round((width * 16) / 9);
}

/**
 * Draw the whole card onto an SkCanvas. ONE renderer for preview + export.
 * @param canvas    SkCanvas (from an offscreen Surface or an on-screen Canvas)
 * @param deps.Skia the react-native-skia Skia API (or JsiSkApi(CanvasKit) in Node)
 * @param deps.width pixel width (export 1080, preview smaller)
 * @param deps.params buildParams() output (cardType, isSquare, toggles, data)
 * @param deps.typefaces { regular, bold } SkTypeface, plus optionally
 *   { medium, semibold, display, displayHeavy } (the app's Inter faces)
 * @param deps.wordmark SkImage logo, or null
 * @param deps.bgPhoto SkImage for the card background, or null
 * @param deps.photoCrop the athlete's framing of bgPhoto ({ zoom, cx, cy },
 *   see photoCoverRect), or null for the centre crop
 * @param deps.omitPhoto true to draw everything EXCEPT the photo itself (the
 *   scrim and the text over a transparent ground): the screen's positioning
 *   view lays this over the photo it moves underneath
 * @param deps.photos { before, after } SkImages for the beforeAfter card, or null
 */
export function drawShareCard(canvas, {
  Skia, width, params, typefaces, wordmark, bgPhoto = null, photoCrop = null, omitPhoto = false, photos = null,
}) {
  BG = bgPhoto || null; // optional photo background (all card types)
  BG_CROP = photoCrop || null;
  OMIT_PHOTO = !!omitPhoto;
  // Every card type drives its own three aspect presets ('square' |
  // 'portrait' | 'story') via params.aspect (ELITE-SHARE-SPEC pillar 3/#4);
  // callers that pass no aspect keep the legacy isSquare boolean untouched.
  const aspect = params.aspect || null;
  const isSquare = aspect ? aspect !== 'story' : !!params.isSquare;
  const W = width;
  const H = cardHeight(width, isSquare, aspect);
  const s = W / 1080;
  const font = makeFonts(Skia, typefaces, s);
  const p = { ...params, isSquare, aspect };
  // A CARD ALWAYS COMES OUT (founder device failure 2026-08-18: "this still
  // does not render"). If any composition throws on a Skia build the harness
  // cannot reproduce, the canvas still carries a legible dark card with the
  // moment's own headline rather than the caller getting null and the whole
  // screen dead-ending on "Couldn't build the preview". The failure is
  // reported through onDrawError so the screen still LOGS the cause.
  try {
    if (params.cardType === 'pr') drawPR(canvas, Skia, W, H, p, s, font, wordmark);
    else if (params.cardType === 'milestone') drawMilestone(canvas, Skia, W, H, p, s, font, wordmark);
    else if (params.cardType === 'weekly') drawWeeklyRecap(canvas, Skia, W, H, p, s, font, wordmark);
    else if (params.cardType === 'beforeAfter') drawBeforeAfter(canvas, Skia, W, H, p, s, font, wordmark, photos);
    else drawSession(canvas, Skia, W, H, p, s, font, wordmark);
  } catch (e) {
    drawMinimalFallbackCard(canvas, Skia, W, H, p, s, font, wordmark);
    if (typeof params.onDrawError === 'function') {
      try { params.onDrawError(e); } catch (_) { /* reporting is best-effort */ }
    }
  }
  return { width: W, height: H };
}

/**
 * The floor card: plain fill, the moment's headline, one hero value, the
 * quiet mark. Uses ONLY the primitives that have shipped since the first
 * renderer (fillRect + drawText + the wordmark image) - no gradients, no
 * offscreen surfaces - so it stands on any Skia build the app can boot with.
 * Never the intended design; strictly better than no card.
 */
function drawMinimalFallbackCard(canvas, Skia, W, H, p, s, font, wordmark) {
  try {
    fillRect(canvas, Skia, 0, 0, W, H, PALETTE.bg0);
    const pad = Math.round(W * 0.08);
    const title = p.cardType === 'pr' ? 'Personal record'
      : p.cardType === 'weekly' ? (p.tierLabel || 'Your week')
        : p.cardType === 'milestone' ? (p.title || 'Milestone')
          : (p.sessionName || 'Workout complete');
    const hero = p.cardType === 'pr'
      ? `${withUnit(String(p.weight ?? ''), p.units || 'kg')}${p.reps ? ` × ${p.reps}` : ''}`
      : p.cardType === 'milestone' ? String(p.heroValue ?? '')
        : p.cardType === 'weekly' ? String(p.hero?.value ?? '')
          : String(p.workingSets ? `${p.workingSets} sets` : '');
    const titleFont = fitFont(null, title, W - pad * 2, 64, (px) => font(px), 22);
    text(canvas, Skia, title, pad, Math.round(H * 0.42), titleFont, PALETTE.text, 'left');
    if (hero) {
      const heroFont = fitFont(null, hero, W - pad * 2, 96, (px) => font(px), 28);
      text(canvas, Skia, hero, pad, Math.round(H * 0.42) + Math.round(110 * s), heroFont, PALETTE.accent, 'left');
    }
    // The footer takes the card's own geometry. This call used to pass its
    // arguments in the wrong order, which threw inside this try and left the
    // floor card with no mark at all.
    drawFooter(canvas, Skia, W, H, pad, p.isSquare, s, font, wordmark);
  } catch (_e) { /* even the floor is best-effort; a dark card is acceptable */ }
}

// ── sticker export (ELITE-SHARE-SPEC pillar 3, Strava Sticker Stats) ──────
//
// A transparent-background PNG carrying just the compact stat block + a small
// trailing mark, meant to be pasted onto the user's OWN story/photo rather
// than shared as a full card. It is deliberately small in scope: no
// background, no template picker -- just the strongest single number the
// moment has, drawn once, the same way every time. The 2026-09-26 restyle
// gives it the app's card material (the dark surface with a hairline edge)
// in place of the amber outline and amber side rail.
//
// SUPPRESSION LAW: a sticker has NO data path of its own. `stickerContentFor`
// reads ONLY fields already present on the caller's `params` object -- the
// exact same object the full card draws from. Whatever calm mode / an open
// ED-pattern flag already strips upstream (greatWeek.js et al -- "the
// progress hero, the lift hero and all weight language are already stripped
// before they reach here") is equally absent here: there is no alternate
// derivation that could reconstruct suppressed content, so suppression
// carries over automatically, fail closed, exactly like the Strava-precedent
// rule the spec names. beforeAfter deliberately omits bodyweight from its
// sticker even though the full card may show it (progress-photos DECISIONS
// #2): that founder-approved exception named one specific card, and this file
// lane doesn't extend a privacy-sensitive exception onto a brand-new export
// surface on its own authority.

function stickerContentFor(cardType, p) {
  const unit = p.units || 'kg';
  if (cardType === 'pr') {
    const value = p.showPRWeight
      ? withUnit(String(p.weight || '-'), p.units || 'kg')
      : `${p.reps || '-'} reps`;
    return { value, label: 'Personal record', sub: p.exerciseName || '' };
  }
  if (cardType === 'milestone') {
    if (p.heroValue) {
      return { value: String(p.heroValue), label: (p.heroUnit || p.eyebrow || 'Milestone'), sub: p.title || '' };
    }
    if (p.title) return { value: p.title, label: p.eyebrow || 'Milestone', sub: '', plain: true };
    return null;
  }
  if (cardType === 'weekly') {
    if (p.hero && p.hero.value) {
      const label = [p.hero.heading, p.hero.context].filter(Boolean).join(' · ') || 'This week';
      return { value: p.hero.value, label, sub: p.tierLabel || '' };
    }
    if (p.bestLift && p.bestLift.weight) {
      const bl = p.bestLift;
      return { value: withUnit(String(bl.weight), bl.units || 'kg'), label: 'Best lift', sub: bl.exerciseName || '' };
    }
    const stats = p.stats || [];
    if (stats.length && stats[0].value) {
      return { value: String(stats[0].value), label: String(stats[0].label || ''), sub: p.tierLabel || '' };
    }
    return null;
  }
  if (cardType === 'beforeAfter') {
    if (!p.elapsedLabel) return null;
    return { value: String(p.elapsedLabel), label: 'Progress', sub: '' };
  }
  // session (and any unrecognised type, matching drawShareCard's own default).
  const heroInfo = sessionHeroInfo(p, unit);
  if (!heroInfo.value || heroInfo.value === '0') return null;
  return { value: heroInfo.value, unit: heroInfo.unit, label: heroInfo.label, sub: p.sessionName || '' };
}

// A small trailing mark, proportioned like the main footer's but smaller
// again -- the sticker's own quiet signature (D109-1 "small trailing mark",
// keeping MARK_WIDTH_RATIO-style proportionality on a second, sticker-scaled
// ratio).
function drawStickerMark(canvas, Skia, width, panelH, pad, s, font, wordmark) {
  const markW = width * STICKER_MARK_WIDTH_RATIO;
  const hasMark = !!(wordmark && wordmark.width && wordmark.height && wordmark.width() && wordmark.height());
  const markH = hasMark ? Math.round(markW / (wordmark.width() / wordmark.height())) : Math.round(16 * s);
  const urlFont = font(15, 'regular');
  const urlStr = 'volyume.app';
  const gap = Math.round(8 * s);
  const totalW = (hasMark ? markW + gap : 0) + measure(urlFont, urlStr);
  const x0 = width - pad - totalW;
  const y0 = panelH - Math.round(pad * 0.55) - markH;
  if (hasMark) {
    const p = Skia.Paint(); p.setAntiAlias(true); p.setAlphaf(0.72);
    canvas.drawImageRect(
      wordmark,
      Skia.XYWHRect(0, 0, wordmark.width(), wordmark.height()),
      Skia.XYWHRect(x0, y0, markW, markH),
      p,
    );
  }
  const urlX = x0 + (hasMark ? markW + gap : 0);
  text(canvas, Skia, urlStr, urlX, y0 + markH * 0.82, urlFont, PALETTE.textMuted, 'left');
}

/** The sticker panel's pixel height for a given width (fixed compact ratio). */
export function stickerHeight(width) {
  return Math.round(width * 0.56);
}

/**
 * Draw a transparent-background stat sticker. ONE call per export, same
 * pattern as drawShareCard: pass an offscreen Surface's canvas, then encode.
 * @param canvas SkCanvas from an offscreen Surface (must start transparent)
 * @param deps.Skia the react-native-skia Skia API (or JsiSkApi(CanvasKit) in Node)
 * @param deps.width pixel width
 * @param deps.params the SAME params object the full card for this cardType
 *   would receive (buildParams output) -- already gated upstream
 * @param deps.typefaces { regular, bold } SkTypeface (plus the optional Inter faces)
 * @param deps.wordmark SkImage logo, or null
 */
export function drawSticker(canvas, {
  Skia, width, params, typefaces, wordmark,
}) {
  const s = width / 700;
  const H = stickerHeight(width);
  const font = makeFonts(Skia, typefaces, s);
  const pad = Math.round(width * 0.08);
  const r = Math.round(28 * s);

  // No drawBackground call: an untouched offscreen Surface starts fully
  // transparent on both the device and CanvasKit-in-Node runtimes, and the
  // rounded panel below is the ONLY opaque content, so the sticker can sit
  // directly on the user's own photo.
  fillRRect(canvas, Skia, 0, 0, width, H, r, rgba(PALETTE.bg0, 0.84));
  strokeRRect(canvas, Skia, 0, 0, width, H, r, PALETTE.rule, Math.max(1, 1.5 * s));

  const content = stickerContentFor(params.cardType, params);
  const textX = pad;
  const maxW = width - pad * 2;
  if (content && content.value) {
    const labelY = Math.round(H * 0.3);
    if (content.label) {
      const lf = fitOverline(font, content.label, maxW, 17, s);
      textTracked(canvas, Skia, lf.label, textX, labelY, lf.font, PALETTE.textSecondary, 'left', lf.tracking);
    }
    const runs = [{ t: String(content.value), ratio: 1 }, { t: content.unit || '', ratio: 0.34 }];
    let sz = 84;
    const weight = content.plain ? 'display' : 'displayHeavy';
    while (valueRunsWidth(font, runs, sz, weight) > maxW && sz > 34) sz -= 4;
    const valY = labelY + Math.round(sz * 0.9 * s);
    drawValueRuns(canvas, Skia, textX, valY, runs, sz, weight, content.plain ? PALETTE.text : PALETTE.accent, font);
    if (content.sub) {
      const subFont = font(19, 'medium');
      const subLine = wrapTextCapped(subFont, content.sub, maxW * 0.62, 1)[0];
      text(canvas, Skia, subLine, textX, valY + Math.round(40 * s), subFont, PALETTE.textSecondary, 'left');
    }
  }
  drawStickerMark(canvas, Skia, width, H, pad, s, font, wordmark);
  return { width, height: H };
}
