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
 * correct whatever typeface is loaded (the platform system font on device).
 *
 * CAMPAIGN 30 (D108/D109-1, ELITE-SHARE-SPEC): per-type crafted backgrounds, a
 * tone-sampled photo scrim, per-moment visual signatures (PR glow, session
 * editorial, portrait/story rebalance with platform-chrome safe zones), a new
 * transparent sticker export, and a quiet one-line brand mark replacing the old
 * wordmark+tagline+underline lockup (tagline dropped everywhere, D109-1). The
 * module stays pure and import-free (no ESM imports) so it keeps running
 * unmodified under both Jest and the manual eval-based render harness.
 */

// react-native-skia PaintStyle / TileMode / BlurStyle are plain numeric enums;
// hardcoded here so the module needs no RN-only imports (keeps it Node-runnable).
const FILL = 0;
const STROKE = 1;
const CLAMP = 0;
const BLUR_NORMAL = 0;

// The share card's own palette. DESIGN_SYSTEM.md whitelists this offline canvas
// to hold its own values (it is not a screen/component bound by the no-hardcoded-
// hex rule); the values track the brand — amber #F5A623 for data, #FFD700 gold
// for trophy moments, the near-black tonal background, textPrimary/secondary/muted.
const PALETTE = {
  bg0: '#0D0D0D', bg1: '#141413', bg2: '#191917',
  surface: '#222220', surface2: '#2A2A27',
  // `border` tracks theme.js `border` (#6E6E6E), chosen for 3:1 WCAG 1.4.11.
  // It previously held #343431, which is theme.js `surface3` -- a fill colour,
  // not an outline one. Stat-box and chip outlines were near-invisible in the
  // exported PNG and disappeared entirely under platform re-compression.
  border: '#6E6E6E', divider: 'rgba(255,255,255,0.06)',
  accent: '#F5A623', gold: '#FFD700',
  // textSecondary tracks theme.js `textSecondary`; textMuted tracks theme.js
  // `textMuted` (#9C9C9C) -- it had drifted by a digit to #9B9B9B.
  text: '#FFFFFF', textSecondary: '#9E9E9E', textMuted: '#9C9C9C',
};

// Central number+unit join (P-15, ux-copy-polish audit 2026-07-12 / format.js).
// This file is deliberately import-free (see header), so `format.js`'s single
// source of truth is mirrored here rather than imported: a non-breaking space
// between a number and its unit so the pair never wraps mid-token. Campaign 30
// pillar 7 kills the last two call sites that had drifted from this law (the
// PR/top-lift weight strings joined the unit with NO space at all -- "120kg"
// -- while the weekly best-lift line used a plain breakable space -- "100 kg").
const NBSP = ' ';
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
// 20% (reply bar / actions). The bottom ratio previously only cleared
// Instagram's reply bar empirically (H2, 10%); D108 widens it to a stated 20%
// so the footer clears chrome on every platform, not just the one measured.
const STORY_TOP_SAFE_RATIO = 0.14;
const STORY_SAFE_BOTTOM_RATIO = 0.20;

// Optional user gym photo (SkImage) used as the card background. Set per-render
// at the top of drawShareCard; single-threaded so a module-level handle is safe.
let BG = null;

// amber/gold at an alpha, as an rgba() string Skia.Color parses on both runtimes.
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
// weekly card already solved this; the formula lives here now so all four
// layouts share one rule (audit R4/H3).
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

// A soft blurred glow (Skia MaskFilter blur), used for the PR numeral's warm
// amber halo (pillar 2) and the per-type background accent geometry (pillar 1).
// MaskFilter.MakeBlur is core Skia, present identically on the device JsiSk*
// path and the CanvasKit-in-Node harness path (both wrap the same C++ API).
// DECORATION IS NEVER LOAD-BEARING (founder device failure 2026-08-18: the
// share preview would not build at all on a plain dark session card - the
// exact path this glow runs on, and the only Skia call the rebuilt renderer
// added there). MaskFilter/blur support is the least portable corner of the
// Skia surface between the CanvasKit build the harness renders with and the
// JsiSk build on device, so a failure here must degrade to "no glow", never
// to "no card". Same law applied to every other ornament below.
function drawGlow(canvas, Skia, cx, cy, radius, colorStr, alpha, sigma) {
  try {
    const p = Skia.Paint();
    p.setAntiAlias(true);
    p.setColor(Skia.Color(rgba(colorStr, alpha)));
    if (Skia.MaskFilter && typeof Skia.MaskFilter.MakeBlur === 'function') {
      p.setMaskFilter(Skia.MaskFilter.MakeBlur(BLUR_NORMAL, Math.max(0.1, sigma), true));
    }
    canvas.drawCircle(cx, cy, radius, p);
  } catch (_e) { /* ornament only: a card without its glow is still a card */ }
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
// dropped (share-card audit M2): when the greedy wrap needed MORE lines than
// `maxLines`, the old `.slice(0, maxLines)` calls just cut the extra lines,
// so a long session/exercise/milestone name lost words with no visual sign
// anything was missing. The last kept line now gets an ellipsis appended
// (trimmed to still fit `maxW`).
function wrapTextCapped(font, str, maxW, maxLines) {
  const lines = wrapText(font, str, maxW);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = withEllipsis(font, kept[maxLines - 1], maxW);
  return kept;
}

// A no-op canvas for a dry-run "measure" pass (share-card audit R6/H5): every
// canvas method the layouts below call (drawText/drawRect/drawRRect/
// drawImageRect/drawCircle/save/restore/clipRRect) becomes a no-op via a Proxy,
// so a layout function can run TWICE with the EXACT same code -- once to
// discover the natural, unconstrained content height, once for real -- and the
// two can never drift out of sync the way a hand-duplicated height calculation
// would the moment either copy was edited alone.
function makeNoopCanvas() {
  return new Proxy({}, { get: () => () => undefined });
}

// ── fonts ─────────────────────────────────────────────────────────────────
// typefaces = { regular, bold }. Heavy weights (700–900) use `bold`.

function makeFonts(Skia, typefaces, s) {
  const cache = {};
  return function font(size, weight) {
    const px = Math.max(1, Math.round(size * s));
    const tf = weight === 'regular' ? typefaces.regular : typefaces.bold;
    const key = `${weight || 'bold'}-${px}`;
    if (!cache[key]) cache[key] = Skia.Font(tf, px);
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

// ── shared blocks ───────────────────────────────────────────────────────────

// Draw an image scaled to COVER w×h (centre-crop), like CSS object-fit: cover.
function drawImageCover(canvas, Skia, img, W, H) {
  const iw = img.width(); const ih = img.height();
  if (!iw || !ih) return;
  const scale = Math.max(W / iw, H / ih);
  const dw = iw * scale; const dh = ih * scale;
  const p = Skia.Paint(); p.setAntiAlias(true);
  canvas.drawImageRect(img, Skia.XYWHRect(0, 0, iw, ih), Skia.XYWHRect((W - dw) / 2, (H - dh) / 2, dw, dh), p);
}

// Downscale a photo into a tiny offscreen surface and average its pixels --
// the MacroFactor technique (ELITE-SHARE-SPEC pillar 1) -- so the background
// scrim can be built from the photo's OWN dominant tone instead of a generic
// flat black wash. Surface.MakeOffscreen + SkImage.readPixels are both plain
// Skia API, present identically on the device JsiSk* path and the
// CanvasKit-in-Node harness path, so this samples correctly on both.
// Bottom rows are weighted more heavily: the scrim sits over the BOTTOM of the
// photo, so its tone should match what is actually behind it there, not the
// photo as a whole (a bright-sky-top / dark-floor-bottom gym photo should
// scrim dark, not sky-blue). Returns null if the photo can't be read/sampled
// (missing readPixels, decode failure) so the caller can fall back safely.
function sampleAverageTone(Skia, img) {
  try {
    const N = 12;
    const surf = Skia.Surface.MakeOffscreen(N, N);
    if (!surf) return null;
    drawImageCover(surf.getCanvas(), Skia, img, N, N);
    surf.flush();
    const snap = surf.makeImageSnapshot();
    if (!snap) return null;
    // AlphaType.Unpremul = 3, ColorType.RGBA_8888 = 4 (numeric, matching the
    // FILL/STROKE/CLAMP convention above -- keeps the module RN-import-free).
    const px = snap.readPixels(0, 0, { width: N, height: N, alphaType: 3, colorType: 4 });
    if (!px || !px.length) return null;
    let rT = 0; let gT = 0; let bT = 0; let wT = 0;
    // The top band is tracked separately (unweighted): the date, kicker,
    // title and hero numeral all sit over the TOP of the photo, so the
    // scrim's opening stop must answer to what is actually behind THEM --
    // a bright-sky-top photo must not read "dark enough" just because its
    // floor is dark (lead render review, light-photo card).
    let topLumT = 0; let topN = 0;
    const topBand = Math.max(1, Math.round(N * 0.4));
    for (let y = 0; y < N; y += 1) {
      const rowWeight = 0.4 + 0.6 * (y / (N - 1));
      for (let x = 0; x < N; x += 1) {
        const i = (y * N + x) * 4;
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

// A UI-safe minimum: above this sampled luminance, a plain tone-tinted scrim
// alone does not give white text a reliable contrast floor, so the scrim
// deepens toward black instead of just tinting (ELITE-SHARE-SPEC pillar 1,
// "computed contrast check ... fall back to a deeper scrim").
const SCRIM_LEGIBILITY_LUMINANCE_FLOOR = 130;

// Tone-sampled, bottom-weighted gradient scrim over a photo background,
// replacing the old flat rgba(bg0,0.62) wash. Legible-by-construction: the
// deepen amount and peak alpha both increase once the sample is too bright.
function drawPhotoScrim(canvas, Skia, W, H, tone) {
  const t = tone || { r: 10, g: 10, b: 10, luminance: 8 };
  const bright = t.luminance > SCRIM_LEGIBILITY_LUMINANCE_FLOOR;
  // The top stop answers to the TOP band's own luminance, never the
  // bottom-weighted average: the date, kicker, title and most of the hero
  // numeral sit above the 45% stop, and a bright-sky-top / dark-floor photo
  // sampled "dark" overall while leaving all of them on near-raw pale photo
  // (lead render review, light-photo card). Dark-topped photos keep the
  // near-transparent opening - their upper region is already legible ground.
  const brightTop = (t.topLuminance != null ? t.topLuminance : t.luminance) > SCRIM_LEGIBILITY_LUMINANCE_FLOOR;
  const deepHex = darkenRgb(t.r, t.g, t.b, (bright || brightTop) ? 0.86 : 0.6);
  const topAlpha = brightTop ? 0.5 : 0.06;
  const midAlpha = (bright || brightTop) ? 0.62 : 0.32;
  const maxAlpha = bright ? 0.88 : 0.72;
  const shader = Skia.Shader.MakeLinearGradient(
    { x: W / 2, y: 0 }, { x: W / 2, y: H },
    [Skia.Color(rgba(deepHex, topAlpha)), Skia.Color(rgba(deepHex, midAlpha)), Skia.Color(rgba(deepHex, maxAlpha))],
    [0, 0.45, 1], CLAMP,
  );
  const p = Skia.Paint(); p.setShader(shader);
  canvas.drawRect(Skia.XYWHRect(0, 0, W, H), p);
}

// Per-type crafted dark-premium background (ELITE-SHARE-SPEC pillar 1): each
// card type gets its own gradient tone + direction instead of the single
// shared gradient every card used before. Still near-black, still calm --
// only the tonal lean and one restrained accent geometry (below) differ.
const BG_THEME = {
  pr: { stops: ['#17100A', PALETTE.bg0, '#0E0906'], dir: 'diagonal' },
  session: { stops: [PALETTE.bg1, PALETTE.bg0, PALETTE.bg2], dir: 'vertical' },
  milestone: { stops: [PALETTE.bg2, PALETTE.bg0, PALETTE.bg1], dir: 'diagonal' },
  weekly: { stops: [PALETTE.bg1, PALETTE.bg1, PALETTE.bg0], dir: 'vertical' },
  beforeAfter: { stops: [PALETTE.bg0, PALETTE.bg1, PALETTE.bg0], dir: 'vertical' },
};

// One restrained accent geometry per type (amber only, low alpha, never
// neon) -- the visual signature a no-photo card carries when there is no
// photo tone to lean on.
function drawBackgroundGeometry(canvas, Skia, W, H, cardType) {
  if (cardType === 'pr') {
    // The trophy moment's own light source: a soft glow seated top-right,
    // echoed by the numeral's own glow lower on the canvas. Kept small and
    // corner-anchored -- a large sigma here read as a wash across the whole
    // canvas rather than a restrained accent (rendered and corrected).
    drawGlow(canvas, Skia, W * 0.92, H * 0.05, W * 0.18, PALETTE.accent, 0.07, W * 0.05);
  } else if (cardType === 'milestone') {
    // One large, quiet ring, mostly off-canvas -- large-type editorial framing
    // for the big number, never competing with it.
    const paint = paintFor(Skia, rgba(PALETTE.accent, 0.09), STROKE, Math.max(1, W * 0.006));
    canvas.drawCircle(W * 1.04, H * 0.2, W * 0.5, paint);
  } else if (cardType === 'weekly') {
    // A calm row of seven ticks along the top edge -- one per day of the week,
    // data-forward rather than decorative.
    const y = H * 0.028;
    for (let i = 0; i < 7; i += 1) {
      const x = W * (0.6 + i * 0.045);
      fillRect(canvas, Skia, x, y, Math.max(1, W * 0.005), H * 0.018, rgba(PALETTE.accent, 0.16));
    }
  } else if (cardType === 'beforeAfter') {
    // A faint vertical seam echoing the gutter between the two photo cells.
    fillRect(canvas, Skia, W / 2 - Math.max(1, W * 0.0015), H * 0.05, Math.max(2, W * 0.003), H * 0.12, rgba(PALETTE.accent, 0.14));
  } else {
    // session (and any unrecognised type, matching the dispatcher's own
    // default): one quiet glow low-left, balancing the header's weight.
    drawGlow(canvas, Skia, W * 0.06, H * 0.96, W * 0.16, PALETTE.accent, 0.06, W * 0.05);
  }
}

function drawCraftedBackground(canvas, Skia, W, H, cardType) {
  // The floor: a plain opaque fill lands FIRST, so the card always has a
  // ground even if the gradient shader or the accent geometry cannot be
  // built on this Skia build (founder device failure 2026-08-18).
  fillRect(canvas, Skia, 0, 0, W, H, PALETTE.bg0);
  try {
    const theme = BG_THEME[cardType] || BG_THEME.session;
    const start = theme.dir === 'diagonal' ? { x: 0, y: 0 } : { x: W / 2, y: 0 };
    const end = theme.dir === 'diagonal' ? { x: W, y: H } : { x: W / 2, y: H };
    const shader = Skia.Shader.MakeLinearGradient(
      start, end, theme.stops.map((c) => Skia.Color(c)), [0, 0.5, 1], CLAMP,
    );
    const p = Skia.Paint(); p.setShader(shader);
    canvas.drawRect(Skia.XYWHRect(0, 0, W, H), p);
  } catch (_e) { /* the flat fill above stands as the background */ }
  try {
    drawBackgroundGeometry(canvas, Skia, W, H, cardType);
  } catch (_e) { /* accent geometry is ornament, never load-bearing */ }
}

function drawBackground(canvas, Skia, W, H, cardType) {
  if (BG && BG.width && BG.width() && BG.height()) {
    // Gym photo background: cover-fit the photo, then a tone-sampled,
    // bottom-weighted gradient scrim (pillar 1) instead of the old flat
    // rgba(bg0,0.62) wash, with a computed contrast floor. A failure in
    // either half falls back to the crafted background rather than
    // leaving the card groundless (2026-08-18 law: nothing decorative
    // may block a render).
    try {
      drawImageCover(canvas, Skia, BG, W, H);
      drawPhotoScrim(canvas, Skia, W, H, sampleAverageTone(Skia, BG));
      return;
    } catch (_e) { /* fall through to the crafted background */ }
  }
  drawCraftedBackground(canvas, Skia, W, H, cardType);
}

// Founder device order 2026-08-24 ("improve the share cards to look
// something like this"): the family's frame. A flat amber bar welded to the
// top edge read as a browser chrome bar once the card was posted on a dark
// feed; a card needs an EDGE, so the artwork sits inside a rounded amber
// rule with the corners lit. Same call site on every card type, so the whole
// family gains it at once rather than the session card drifting away from
// its siblings.
function drawCardFrame(canvas, Skia, W, H, s) {
  const inset = Math.round(14 * s);
  const r = Math.round(52 * s);
  const w = W - inset * 2;
  const h = H - inset * 2;
  // The lit corners, drawn UNDER the rule so the stroke stays crisp.
  const glow = Math.round(230 * s);
  drawGlow(canvas, Skia, inset + r, inset + r, glow, PALETTE.accent, 0.18, 90 * s);
  drawGlow(canvas, Skia, W - inset - r, H - inset - r, glow, PALETTE.accent, 0.13, 100 * s);
  strokeRRect(canvas, Skia, inset, inset, w, h, r, rgba(PALETTE.accent, 0.55), Math.max(1, 3 * s));
  // A second, wider and fainter rule just outside it: on a real feed this is
  // what stops the edge looking like a 1px hairline after re-compression.
  strokeRRect(canvas, Skia, inset, inset, w, h, r, rgba(PALETTE.accent, 0.12), Math.max(1, 9 * s));
}

// Letter-spaced text. Skia's font API has no tracking, and the mockup's
// eyebrow, hero label and stat captions all depend on it: without tracking a
// short uppercase caption reads as a cramped word rather than a label.
// Drawn per character so measurement stays honest for centring.
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

// ── icons ────────────────────────────────────────────────────────────────
//
// Drawn as Skia primitives rather than loaded from an icon font: this module
// is deliberately import-free and Node-runnable (see the header), and a
// missing glyph would ship a tofu box onto somebody's Instagram story. Each
// takes a centre and a size so the same mark scales across formats.
function iconBars(canvas, Skia, cx, cy, size, colorStr) {
  const w = size * 0.22;
  const gap = size * 0.14;
  const heights = [size * 0.45, size * 0.72, size];
  const totalW = w * 3 + gap * 2;
  let x = cx - totalW / 2;
  heights.forEach((h) => {
    fillRRect(canvas, Skia, x, cy + size / 2 - h, w, h, w * 0.35, colorStr);
    x += w + gap;
  });
}

function iconDumbbell(canvas, Skia, cx, cy, size, colorStr) {
  const barH = size * 0.16;
  const plateH = size * 0.56;
  const plateW = size * 0.2;
  const innerH = size * 0.78;
  fillRRect(canvas, Skia, cx - size / 2, cy - barH / 2, size, barH, barH / 2, colorStr);
  fillRRect(canvas, Skia, cx - size / 2, cy - plateH / 2, plateW, plateH, plateW * 0.3, colorStr);
  fillRRect(canvas, Skia, cx + size / 2 - plateW, cy - plateH / 2, plateW, plateH, plateW * 0.3, colorStr);
  fillRRect(canvas, Skia, cx - size * 0.28, cy - innerH / 2, plateW * 0.7, innerH, plateW * 0.3, colorStr);
  fillRRect(canvas, Skia, cx + size * 0.28 - plateW * 0.7, cy - innerH / 2, plateW * 0.7, innerH, plateW * 0.3, colorStr);
}

function iconClock(canvas, Skia, cx, cy, size, colorStr) {
  const r = size * 0.46;
  const lw = Math.max(1, size * 0.1);
  const paint = paintFor(Skia, colorStr, STROKE, lw);
  canvas.drawCircle(cx, cy, r, paint);
  // Hands: one up, one to the right, so it reads as a clock at any size.
  fillRRect(canvas, Skia, cx - lw / 2, cy - r * 0.62, lw, r * 0.68, lw / 2, colorStr);
  fillRRect(canvas, Skia, cx - lw / 2, cy - lw / 2, r * 0.58, lw, lw / 2, colorStr);
  // The little stem on top.
  fillRRect(canvas, Skia, cx - size * 0.12, cy - r - lw * 1.4, size * 0.24, lw, lw / 2, colorStr);
}

function iconList(canvas, Skia, cx, cy, size, colorStr) {
  const w = size * 0.78;
  const h = size;
  const lw = Math.max(1, size * 0.09);
  strokeRRect(canvas, Skia, cx - w / 2, cy - h / 2, w, h, size * 0.16, colorStr, lw);
  // The tab at the top of the clipboard.
  fillRRect(canvas, Skia, cx - w * 0.28, cy - h / 2 - lw, w * 0.56, lw * 2.2, lw, colorStr);
  for (let i = 0; i < 3; i += 1) {
    const ly = cy - h * 0.16 + i * h * 0.22;
    fillRRect(canvas, Skia, cx - w * 0.26, ly, lw * 1.1, lw * 1.1, lw * 0.5, colorStr);
    fillRRect(canvas, Skia, cx - w * 0.06, ly, w * 0.32, lw, lw / 2, colorStr);
  }
}

function iconTrophy(canvas, Skia, cx, cy, size, colorStr) {
  const lw = Math.max(1, size * 0.09);
  const top = cy - size * 0.44;
  // The bowl, tapered by stacking three bands rather than drawn as one
  // rounded box: a single rrect reads as a bucket at this size, and the
  // module has no path builder to spend on one glyph.
  const bands = [
    { w: size * 0.62, h: size * 0.2, r: size * 0.05 },
    { w: size * 0.5, h: size * 0.17, r: size * 0.05 },
    { w: size * 0.28, h: size * 0.13, r: size * 0.06 },
  ];
  let by = top;
  bands.forEach((b) => {
    fillRRect(canvas, Skia, cx - b.w / 2, by, b.w, b.h, b.r, colorStr);
    by += b.h;
  });
  // Handles, hooked off the widest band.
  const paint = paintFor(Skia, colorStr, STROKE, lw * 0.85);
  canvas.drawCircle(cx - size * 0.37, top + size * 0.16, size * 0.12, paint);
  canvas.drawCircle(cx + size * 0.37, top + size * 0.16, size * 0.12, paint);
  // Stem, then the plinth.
  fillRRect(canvas, Skia, cx - size * 0.06, by, size * 0.12, size * 0.14, size * 0.03, colorStr);
  fillRRect(canvas, Skia, cx - size * 0.26, by + size * 0.14, size * 0.52, size * 0.11, size * 0.05, colorStr);
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

// Founder device order 2026-08-24: each box gets the mark for what it
// counts. Three bare numbers in three identical boxes made the reader parse
// the captions to tell them apart; an icon is read before the word is.
const STAT_ICONS = {
  SETS: iconDumbbell,
  TIME: iconClock,
  EXERCISES: iconList,
};

function drawStatBoxes(canvas, Skia, W, pad, y, stats, isSquare, s, font) {
  if (!stats.length) return y;
  const statBoxH = Math.round((isSquare ? 132 : 186) * s);
  const gap = Math.round(14 * s);
  // Fixed box width (share-card audit R11/L3): boxes used to stretch to fill
  // the row width divided by the stat count, so the SAME "Sets" box was
  // half-width on a 2-stat card and quarter-width on a 4-stat card -- the
  // family had no consistent proportions. Size for the densest layout this
  // family ever shows (the weekly recap caps at 4) and centre shorter rows
  // instead of stretching them.
  const MAX_BOXES = 4;
  const boxW = Math.floor((W - pad * 2 - gap * (MAX_BOXES - 1)) / MAX_BOXES);
  const rowW = boxW * stats.length + gap * (stats.length - 1);
  const rowX = (W - rowW) / 2;
  stats.forEach((st, i) => {
    const bx = rowX + i * (boxW + gap);
    fillRRect(canvas, Skia, bx, y, boxW, statBoxH, Math.round(26 * s), rgba(PALETTE.surface, 0.5));
    // Quiet supports (ELITE-SHARE-SPEC pillar 2): a softened border alpha
    // rather than the old fully-opaque outline keeps the stat row calm
    // instead of reading as a checklist of bordered boxes.
    strokeRRect(canvas, Skia, bx, y, boxW, statBoxH, Math.round(26 * s), rgba(PALETTE.border, 0.45), Math.max(1, 1.2 * s));
    const caption = st.label.toUpperCase();
    const icon = STAT_ICONS[caption];
    // Positioned as fractions of the box rather than by fixed offsets, so
    // a format can size the box without the value landing on its caption.
    if (icon) icon(canvas, Skia, bx + boxW / 2, y + statBoxH * 0.24, Math.round((isSquare ? 32 : 40) * s), PALETTE.accent);
    text(canvas, Skia, st.value, bx + boxW / 2, y + statBoxH * 0.66, font(isSquare ? 44 : 58), PALETTE.text, 'center');
    textTracked(canvas, Skia, caption, bx + boxW / 2, y + statBoxH * 0.88, font(isSquare ? 16 : 19), PALETTE.textMuted, 'center', Math.round(1.6 * s));
  });
  return y + statBoxH + Math.round((isSquare ? 18 : 26) * s);
}

// Session editorial (ELITE-SHARE-SPEC pillar 2): six bordered chip boxes read
// as a checklist, not an editorial card. One quiet line names the session's
// exercises without competing with the hero stat.
function drawExerciseSummary(canvas, Skia, W, pad, y, exercises, s, font) {
  if (!exercises || !exercises.length) return y;
  const names = exercises.map((ex) => (typeof ex === 'string' ? ex : (ex && ex.name) || '')).filter(Boolean);
  if (!names.length) return y;
  // Founder device order 2026-08-24: two names and an honest remainder,
  // centred, with the separators in amber so the eye lands on the names
  // rather than on the punctuation. Five names ran the line to the edge and
  // the last one was ellipsised into nonsense on a long exercise title.
  const f = font(26, 'regular');
  const dotR = Math.max(1, Math.round(4 * s));
  const gap = Math.round(20 * s);
  const shown = names.slice(0, 2);
  const extra = names.length - shown.length;
  const parts = shown.concat(extra > 0 ? [`+${extra} more`] : []);
  // Shrink to fit rather than truncate: the whole point of the line is that
  // every word on it is readable.
  let fit = f;
  let widths = parts.map((t) => measure(fit, t));
  let total = widths.reduce((a, b) => a + b, 0) + (parts.length - 1) * (gap * 2 + dotR * 2);
  for (let px = 26; total > W - pad * 2 && px > 15; px -= 1) {
    fit = font(px, 'regular');
    widths = parts.map((t) => measure(fit, t));
    total = widths.reduce((a, b) => a + b, 0) + (parts.length - 1) * (gap * 2 + dotR * 2);
  }
  const baseline = y + Math.round(fit.getSize() * 0.9);
  let x = (W - total) / 2;
  parts.forEach((t, i) => {
    text(canvas, Skia, t, x, baseline, fit, PALETTE.textSecondary, 'left');
    x += widths[i];
    if (i < parts.length - 1) {
      x += gap;
      canvas.drawCircle(x + dotR, baseline - fit.getSize() * 0.3, dotR, paintFor(Skia, PALETTE.accent, FILL));
      x += dotR * 2 + gap;
    }
  });
  return y + Math.round(46 * s);
}

// ── format + safe-zone layout ────────────────────────────────────────────
//
// Every card type previously understood a binary p.isSquare true/false. Wiring
// portrait 4:5 through required a real THIRD mode (ELITE-SHARE-SPEC pillar 3/
// #4): 'square' stays top-anchored exactly as before; 'portrait' now gets the
// centred-body treatment 'story' already had, so a taller canvas doesn't leave
// a dead band under the content; only 'story' additionally respects the
// platform-chrome safe zones (a portrait feed post has no chrome overlay).

function bodyFormat(p) {
  if (p.aspect === 'portrait') return 'portrait';
  if (p.aspect === 'story') return 'story';
  if (p.aspect === 'square') return 'square';
  return p.isSquare ? 'square' : 'story'; // legacy callers with no aspect param
}

// The first content y (date/eyebrow/title row). Story clamps it below the
// top-14% chrome safe zone; square/portrait keep the card's own base offset.
function headerTopY(H, fmt, base) {
  return fmt === 'story' ? Math.max(base, Math.round(H * STORY_TOP_SAFE_RATIO)) : base;
}

// Runs `layoutBody(canvas, startY)` top-anchored on 'square' (unchanged), or
// measured once against a no-op canvas and re-run centred between `topY` and
// the footer on 'portrait'/'story' -- the shape 'story' already had hand-
// duplicated per card type (share-card audit R6/H5); weekly recap never had
// it at all, which was its own dead-band bug on a tall canvas. One shared
// runner now drives all four non-beforeAfter card types.
// `forceCentre` skips the square top-anchor branch: the PR card is a single
// hero moment on every format (unlike session/milestone/weekly, which carry a
// title/header worth anchoring near the top), and top-anchoring it on square
// left the exact dead band under "previous best" the spec calls out --
// enlarging the numeral closed most of it, but the remaining gap only fully
// closes once the whole block is centred, matching portrait/story.
function runBody(canvas, H, s, p, topY, footerH, layoutBody, forceCentre) {
  const fmt = bodyFormat(p);
  if (fmt === 'square' && !forceCentre) { layoutBody(canvas, topY); return; }
  const storyLift = fmt === 'story' ? Math.round(H * STORY_SAFE_BOTTOM_RATIO) : 0;
  const cellsBottom = H - footerH - storyLift - Math.round(24 * s);
  const naturalEnd = layoutBody(makeNoopCanvas(), topY);
  const naturalHeight = naturalEnd - topY;
  const available = Math.max(0, cellsBottom - topY);
  const startY = topY + Math.max(0, (available - naturalHeight) / 2);
  layoutBody(canvas, startY);
}

// ── card layouts ─────────────────────────────────────────────────────────────

// Shared with the session sticker: ONE hero stat, chosen the same way on both
// the full card and the compact sticker so the two never disagree.
function sessionHeroInfo(p, unit) {
  if (p.prCount > 0) {
    // Founder ruling 2026-08-23: prCount is the workout summary's
    // detectedPRs length, which is bestPRPerExercise's output - one entry
    // per LIFT, not one per record. Labelling it "NEW PERSONAL RECORDS"
    // undercounted a session where the athlete beat their best several
    // times on the same lift. The number is kept and the label now says
    // what it counts.
    return {
      value: String(p.prCount),
      label: p.prCount === 1 ? 'LIFT WITH A NEW BEST' : 'LIFTS WITH A NEW BEST',
      color: PALETTE.gold,
    };
  }
  if (p.showVolume && (p.tonnage || 0) > 0) {
    return {
      value: Math.round(p.tonnage).toLocaleString('en-GB'),
      label: `TOTAL ${unit.toUpperCase()} LIFTED`,
      color: PALETTE.accent,
    };
  }
  return { value: String(p.workingSets || 0), label: 'WORKING SETS COMPLETED', color: PALETTE.text };
}

function drawSession(canvas, Skia, W, H, p, s, font, wordmark) {
  const pad = Math.round(W * 0.074);
  const fmt = bodyFormat(p);
  drawBackground(canvas, Skia, W, H, p.cardType);
  drawCardFrame(canvas, Skia, W, H, s);
  // Gym weights are stored in the user's chosen unit (kg|lbs); the hero label,
  // the "Total ..." stat box and the top-lift line all used to hard-code "kg"
  // (share-card audit R8/M5), a latent lie for any lbs user.
  const unit = p.units || 'kg';

  let y = headerTopY(H, fmt, pad + Math.round(60 * s));
  if (p.showDate && p.date) text(canvas, Skia, p.date, W - pad, y, font(22, 'regular'), PALETTE.textMuted, 'right');
  y += Math.round(70 * s);

  if (p.showPlanName && p.planName) {
    // Founder device order 2026-08-24: the plan name becomes a pill with the
    // session mark on it. As plain amber capitals it sat at the same weight
    // as the date on the opposite side and read as a stray label; inside a
    // rule it reads as the badge for the session it belongs to. Content is
    // still the user's own plan name, still behind its own toggle - nothing
    // generic is invented to fill the pill when there is no plan.
    const chipFont = fitFont(null, p.planName.toUpperCase(), W - pad * 2 - Math.round(150 * s), 24, (px) => font(px), 13);
    const tracking = Math.round(2 * s);
    const iconSize = Math.round(26 * s);
    const labelW = trackedWidth(p.planName.toUpperCase(), chipFont, tracking);
    const chipH = Math.round(62 * s);
    const chipW = labelW + iconSize + Math.round(76 * s);
    fillRRect(canvas, Skia, pad, y, chipW, chipH, chipH / 2, rgba(PALETTE.accent, 0.1));
    strokeRRect(canvas, Skia, pad, y, chipW, chipH, chipH / 2, rgba(PALETTE.accent, 0.5), Math.max(1, 2 * s));
    iconBars(canvas, Skia, pad + Math.round(28 * s) + iconSize / 2, y + chipH / 2, iconSize, PALETTE.accent);
    textTracked(canvas, Skia, p.planName.toUpperCase(), pad + Math.round(56 * s) + iconSize, y + chipH * 0.63, chipFont, PALETTE.accent, 'left', tracking);
    y += chipH + Math.round((p.isSquare ? 22 : 30) * s);
  }

  const heroFont = font(p.isSquare ? 64 : 78);
  // Two-line cap with an ellipsis on the tail (audit M2): a long session name
  // used to lose its last word(s) with no visible sign of truncation.
  const lines = wrapTextCapped(heroFont, p.sessionName || 'Workout complete', W - pad * 2, 2);
  lines.forEach((l) => {
    text(canvas, Skia, l, pad, y + Math.round((p.isSquare ? 64 : 78) * 0.82 * s), heroFont, PALETTE.text, 'left');
    y += Math.round((p.isSquare ? 64 : 78) * 1.05 * s);
  });
  // The short rule under the title: it closes the header block, so the hero
  // number below reads as the card's subject rather than as a second title.
  y += Math.round(18 * s);
  fillRRect(canvas, Skia, pad, y, Math.round(118 * s), Math.round(5 * s), Math.round(3 * s), PALETTE.accent);
  y += Math.round((p.isSquare ? 26 : 34) * s);

  const heroInfo = sessionHeroInfo(p, unit);
  const { value: heroValue, label: heroLabel, color: heroColor } = heroInfo;

  const stats = [
    { label: 'Sets', value: String(p.workingSets || 0) },
  ];
  // A zero-length duration renders as a raw "0m" box (the exact failure the
  // inventory audit flagged); below one minute there is no honest time to
  // show, so the box is omitted rather than faked.
  if ((p.duration || 0) >= 1) stats.push({ label: 'Time', value: `${p.duration}m` });
  if (p.showVolume && (p.tonnage || 0) > 0 && p.prCount > 0) stats.push({ label: `Total ${unit}`, value: Math.round(p.tonnage).toLocaleString('en-GB') });
  else if (p.exerciseCount > 0) stats.push({ label: 'Exercises', value: String(p.exerciseCount) });

  function layoutBody(cv, startY, withTopSet) {
    const heroNum = fitFont(null, heroValue, W - pad * 2, p.isSquare ? 116 : 220, (px) => font(px));
    const heroY = startY + heroNum.getSize();
    text(cv, Skia, heroValue, W / 2, heroY, heroNum, heroColor, 'center');
    const heroLabelY = heroLabelBaseline(heroY, heroNum, p.isSquare, s);
    // Founder device order 2026-08-24: the label under the hero was a small
    // muted whisper under a 220px number. Tracked capitals at a readable
    // size give the number its unit without competing with it.
    textTracked(cv, Skia, heroLabel, W / 2, heroLabelY, font(p.isSquare ? 24 : 30), PALETTE.textSecondary, 'center', Math.round(3 * s));

    // The intensity badge ("EPIC SESSION" / "TOUGH SESSION" / "SOLID
    // SESSION") is RETIRED from this card on founder order 2026-08-24: "I
    // don't want the epic session thing in it either". It graded a session
    // from thresholds the athlete never agreed to, directly under their own
    // number, and a "SOLID SESSION" stamp on a hard day reads as a verdict.
    // The tier is still computed and still travels in sessionData; nothing
    // else consumes it visually here.
    let by = heroLabelY + Math.round((p.isSquare ? 22 : 52) * s);
    by = drawStatBoxes(cv, Skia, W, pad, by, stats, p.isSquare, s, font);

    // Exercise names now honoured on BOTH formats (the toggle was previously
    // dead on square), and they sit ABOVE the top-lift card: the names are
    // context for the session, the top lift is its closing statement.
    if (p.showExercises && p.exercises && p.exercises.length) {
      by = drawExerciseSummary(cv, Skia, W, pad, by, p.exercises, s, font);
    }
    // Founder device order 2026-08-24: the top lift appears on EVERY format
    // that has room for it. Square used to drop it unconditionally and end
    // on an empty band, which is exactly the space it belongs in, and the
    // 1:1 reference carries it. Whether it fits is measured, not assumed:
    // square is top-anchored with no overflow protection of its own, so an
    // unconditional card printed straight through the footer.
    if (withTopSet) {
      const cardW = W - pad * 2; const cardH = Math.round((p.isSquare ? 116 : 150) * s);
      const r = Math.round(24 * s);
      fillRRect(cv, Skia, pad, by, cardW, cardH, r, rgba(PALETTE.accent, 0.06));
      strokeRRect(cv, Skia, pad, by, cardW, cardH, r, rgba(PALETTE.accent, 0.65), Math.max(1, 2 * s));
      const midY = by + cardH / 2;
      const iconSize = Math.round(46 * s);
      iconTrophy(cv, Skia, pad + Math.round(46 * s), midY, iconSize, PALETTE.gold);
      const labelX = pad + Math.round(84 * s);
      textTracked(cv, Skia, 'TOP LIFT', labelX, midY + Math.round(8 * s), font(22), PALETTE.accent, 'left', Math.round(2 * s));
      // A hairline between the label and the number, so the pair reads as
      // one statement rather than two stacked fragments.
      const divX = labelX + trackedWidth('TOP LIFT', font(22), Math.round(2 * s)) + Math.round(34 * s);
      fillRect(cv, Skia, divX, by + Math.round(30 * s), Math.max(1, Math.round(2 * s)), cardH - Math.round(60 * s), rgba(PALETTE.accent, 0.4));
      const valX = divX + Math.round(34 * s);
      const hasName = !!p.topSet.exerciseName;
      text(cv, Skia, `${withUnit(String(p.topSet.weight), unit)} × ${p.topSet.reps}`, valX, midY - (hasName ? Math.round(8 * s) : -Math.round(16 * s)), font(48), PALETTE.text, 'left');
      if (hasName) {
        const nameFont = font(24, 'regular');
        const nameMax = pad + cardW - Math.round(28 * s) - valX;
        // withEllipsis appends the mark unconditionally - wrapTextCapped
        // needs that, because there its caller has already dropped words.
        // Here nothing has been dropped unless the name genuinely overruns,
        // so an unguarded call put "Lat Pulldown..." on a line with 600px
        // of room to spare and implied a truncation that never happened.
        const name = measure(nameFont, p.topSet.exerciseName) <= nameMax
          ? p.topSet.exerciseName
          : withEllipsis(nameFont, p.topSet.exerciseName, nameMax);
        text(cv, Skia, name, valX, midY + Math.round(42 * s), nameFont, PALETTE.textSecondary, 'left');
      }
      by += cardH + Math.round((p.isSquare ? 12 : 24) * s);
    }
    return by;
  }

  // Measure the body WITH the top-lift card before committing to it: the
  // bottom limit is the same one runBody uses for the centred formats, and
  // square gets the same protection here rather than trusting the layout.
  const footerH = footerHeight(p.isSquare, s);
  const storyLift = fmt === 'story' ? Math.round(H * STORY_SAFE_BOTTOM_RATIO) : 0;
  const bottomLimit = H - footerH - storyLift - Math.round(24 * s);
  const wantsTopSet = !!(p.topSet && p.topSet.weight > 0);
  const topSetFits = wantsTopSet && layoutBody(makeNoopCanvas(), y, true) <= bottomLimit;
  runBody(canvas, H, s, p, y, footerH, (cv, startY) => layoutBody(cv, startY, topSetFits));
  drawFooter(canvas, Skia, W, H, pad, p.isSquare, s, font, wordmark);
}

function drawPR(canvas, Skia, W, H, p, s, font, wordmark) {
  const pad = Math.round(W * 0.074);
  const fmt = bodyFormat(p);
  drawBackground(canvas, Skia, W, H, p.cardType);
  drawCardFrame(canvas, Skia, W, H, s);

  const brandY = headerTopY(H, fmt, pad + Math.round(60 * s));
  if (p.showDate && p.date) text(canvas, Skia, p.date, W - pad, brandY, font(22, 'regular'), PALETTE.textMuted, 'right');

  // The trophy card (ELITE-SHARE-SPEC pillar 2): the numeral scales up to
  // BE the hero -- previously it was sized smaller than even the milestone
  // and weekly heroes, which is exactly what left a dead zone around it on a
  // card whose entire job is celebrating one number. It now gets both the
  // bigger start size AND a warm amber glow (Skia blur) seated behind it.
  function layoutBody(cv, startY) {
    const by = startY;
    // Plain text in the pill (matches the intensity badge). No decorative
    // glyphs: the star (U+2605) is missing from some system fonts and renders
    // as tofu.
    const label = 'PERSONAL RECORD';
    const f = font(24);
    const bw = measure(f, label) + 60 * s; const bh = Math.round(56 * s);
    fillRRect(cv, Skia, (W - bw) / 2, by, bw, bh, bh / 2, rgba(PALETTE.gold, 0.15));
    strokeRRect(cv, Skia, (W - bw) / 2, by, bw, bh, bh / 2, rgba(PALETTE.gold, 0.44), Math.max(1, 2 * s));
    text(cv, Skia, label, W / 2, by + bh * 0.68, f, PALETTE.gold, 'center');

    const exFont = font(p.isSquare ? 56 : 72);
    let ey = by + bh + Math.round(70 * s);
    // Two-line cap with an ellipsis on the tail (audit M2): a long exercise
    // name used to lose its last word(s) with no visible sign of truncation.
    wrapTextCapped(exFont, p.exerciseName || 'Exercise', W - pad * 2, 2).forEach((l) => {
      text(cv, Skia, l, W / 2, ey, exFont, PALETTE.text, 'center');
      ey += Math.round((p.isSquare ? 56 : 72) * 1.08 * s);
    });
    ey += Math.round(34 * s);

    const wStr = p.showPRWeight
      ? `${withUnit(String(p.weight || '-'), p.units || 'kg')} × ${p.reps || '-'}`
      : `${p.reps || '-'} reps`;
    // Bumped from the old 110/160 start (share-card audit's reported ~250px
    // dead zone): this is the whole card's reason to exist, so it now starts
    // bigger than even the milestone/weekly heroes and only shrinks to fit a
    // genuinely long string.
    const wFont = fitFont(null, wStr, W - pad * 1.5, p.isSquare ? 200 : 270, (px) => font(px), 72);
    const wCy = ey + wFont.getSize() * 0.62;
    // A restrained halo, not a wash: sized off the numeral's own font size
    // (not the full multi-character string width) and a small blur sigma, so
    // the glow reads as warm light seated tightly behind the digits rather
    // than tinting the whole canvas (rendered and corrected twice -- the
    // first pass spanned the card, the second was still a hard-edged disc).
    drawGlow(cv, Skia, W / 2, wCy, wFont.getSize() * 0.62, PALETTE.accent, 0.16, wFont.getSize() * 0.16);
    text(cv, Skia, wStr, W / 2, ey + wFont.getSize(), wFont, PALETTE.accent, 'center');
    let endY = ey + wFont.getSize();

    if (p.showPrevBest && p.previousBest) {
      const prevY = ey + wFont.getSize() + Math.round(70 * s);
      text(cv, Skia, `Previous best: ${withUnit(String(p.previousBest), p.units || 'kg')}`, W / 2, prevY, font(28, 'regular'), PALETTE.textMuted, 'center');
      endY = prevY;
    }
    return endY;
  }

  runBody(canvas, H, s, p, brandY + Math.round(70 * s), footerHeight(p.isSquare, s), layoutBody, true);
  drawFooter(canvas, Skia, W, H, pad, p.isSquare, s, font, wordmark);
}

function drawMilestone(canvas, Skia, W, H, p, s, font, wordmark) {
  const pad = Math.round(W * 0.074);
  const fmt = bodyFormat(p);
  drawBackground(canvas, Skia, W, H, p.cardType);
  drawCardFrame(canvas, Skia, W, H, s);

  let y = headerTopY(H, fmt, pad + Math.round(60 * s));
  if (p.showDate && p.date) text(canvas, Skia, p.date, W - pad, y, font(22, 'regular'), PALETTE.textMuted, 'right');
  y += Math.round(70 * s);

  if (p.eyebrow) {
    // Width-fit (audit M3): an unfitted eyebrow ran past the right pad on a
    // long label. Matches the weekly card's hero-label fit floor.
    const eyebrowFont = fitFont(null, String(p.eyebrow).toUpperCase(), W - pad * 2, 22, (px) => font(px), 12);
    text(canvas, Skia, String(p.eyebrow).toUpperCase(), pad, y, eyebrowFont, PALETTE.accent, 'left');
    y += Math.round(36 * s);
  }
  const titleFont = font(p.isSquare ? 60 : 74);
  // Two-line cap with an ellipsis on the tail (audit M2): a long title used to
  // lose its last word(s) with no visible sign of truncation.
  wrapTextCapped(titleFont, p.title || '', W - pad * 2, 2).forEach((l) => {
    text(canvas, Skia, l, pad, y + Math.round((p.isSquare ? 60 : 74) * 0.82 * s), titleFont, PALETTE.text, 'left');
    y += Math.round((p.isSquare ? 60 : 74) * 1.05 * s);
  });
  y += Math.round(24 * s);

  const heroValue = String(p.heroValue != null ? p.heroValue : '');
  const stats = (p.stats || []).slice(0, 3).map((st) => ({ label: String(st.label || ''), value: String(st.value != null ? st.value : '') }));

  function layoutBody(cv, startY) {
    let by = startY;
    // An empty hero used to reserve the full hero band anyway, leaving a
    // ~300px void between the title and the caption (audit H4). Skip the
    // band entirely.
    if (heroValue) {
      const heroNum = fitFont(null, heroValue, W - pad * 2, p.isSquare ? 140 : 220, (px) => font(px));
      const heroY = by + heroNum.getSize();
      text(cv, Skia, heroValue, W / 2, heroY, heroNum, PALETTE.accent, 'center');
      const unitY = heroLabelBaseline(heroY, heroNum, p.isSquare, s);
      if (p.heroUnit) text(cv, Skia, String(p.heroUnit).toUpperCase(), W / 2, unitY, font(p.isSquare ? 18 : 24), PALETTE.textSecondary, 'center');
      by = (p.heroUnit ? unitY : heroY) + Math.round((p.isSquare ? 34 : 46) * s);
    } else {
      by += Math.round(8 * s);
    }

    if (p.caption) {
      const capFont = font(p.isSquare ? 22 : 28, 'regular');
      // Two-line cap with an ellipsis on the tail (audit M2).
      wrapTextCapped(capFont, String(p.caption), W - pad * 2, 2).forEach((l) => {
        text(cv, Skia, l, W / 2, by, capFont, PALETTE.textMuted, 'center');
        by += Math.round((p.isSquare ? 30 : 38) * s);
      });
      by += Math.round(16 * s);
    }
    if (stats.length) by = drawStatBoxes(cv, Skia, W, pad, by, stats, p.isSquare, s, font);
    return by;
  }

  runBody(canvas, H, s, p, y, footerHeight(p.isSquare, s), layoutBody);
  drawFooter(canvas, Skia, W, H, pad, p.isSquare, s, font, wordmark);
}

// Weekly Precision Coaching recap. Leads with the user's real goal achievement
// — the actual weight lost/gained this week — as the big amber data hero, then
// the best lift, the real stat wins (PRs / sessions / recovery) and a coach line
// that names the numbers. ED-safety lives in the param builder (greatWeek.js): under
// calm mode / an ED flag the progress hero, the lift hero and all weight
// language are already stripped before they reach here, and the card only ever
// renders for a verified-safe, on-target week. DATA LAWS UNCHANGED by campaign 30
// -- the only change here is wrapping the existing content in the same
// centred-body/safe-zone runner every other card type uses (it previously had
// none at all, which was its own dead-band bug on a tall canvas).
function drawWeeklyRecap(canvas, Skia, W, H, p, s, font, wordmark) {
  const pad = Math.round(W * 0.074);
  const fmt = bodyFormat(p);
  drawBackground(canvas, Skia, W, H, p.cardType);
  drawCardFrame(canvas, Skia, W, H, s);

  let y = headerTopY(H, fmt, pad + Math.round(56 * s));
  if (p.showDate && p.dateFormatted) {
    text(canvas, Skia, p.dateFormatted, W - pad, y, font(22, 'regular'), PALETTE.textMuted, 'right');
  }
  y += Math.round(64 * s);

  // Eyebrow: week + goal phase, e.g. "WEEK 4 · MODERATE CUT".
  if (p.weekLabel) {
    text(canvas, Skia, String(p.weekLabel).toUpperCase(), pad, y, font(22), PALETTE.accent, 'left');
    y += Math.round(38 * s);
  }

  // Tier headline.
  const titleFont = font(p.isSquare ? 56 : 70);
  // One-line cap with an ellipsis (audit M2): matches the rest of the family
  // rather than silently dropping a long tier label with no visible sign.
  wrapTextCapped(titleFont, p.tierLabel || 'Great Week', W - pad * 2, 1).forEach((l) => {
    text(canvas, Skia, l, pad, y + Math.round((p.isSquare ? 56 : 70) * 0.82 * s), titleFont, PALETTE.text, 'left');
    y += Math.round((p.isSquare ? 56 : 70) * 1.02 * s);
  });
  y += Math.round(20 * s);

  function layoutBody(cv, startY) {
    let by = startY;
    // HERO: the single biggest win (cut weight loss, else best lift, else
    // PRs) -- the big amber data numeral with ONE uppercase label beneath,
    // exactly like the session card's hero. greatWeek.js drops it under
    // suppress.
    if (p.hero && p.hero.value) {
      const phFont = fitFont(null, p.hero.value, W - pad * 2, p.isSquare ? 140 : 180, (px) => font(px));
      const heroBaseline = by + phFont.getSize();
      text(cv, Skia, p.hero.value, W / 2, heroBaseline, phFont, PALETTE.accent, 'center');
      // Clear the numeral's descenders (e.g. the "g" in "kg") before the label.
      by = heroBaseline + Math.round(phFont.getSize() * 0.24) + Math.round((p.isSquare ? 16 : 22) * s);
      const heroLabel = [p.hero.heading, p.hero.context].filter(Boolean).join(' · ').toUpperCase();
      if (heroLabel) {
        // Fit to width: the heading can be an arbitrary exercise name (best-lift
        // hero), so shrink before it would overflow.
        const lblFont = fitFont(null, heroLabel, W - pad * 2, p.isSquare ? 18 : 24, (px) => font(px), 12);
        text(cv, Skia, heroLabel, W / 2, by, lblFont, PALETTE.textSecondary, 'center');
        by += Math.round((p.isSquare ? 50 : 62) * s);
      }
    }

    // Best-lift feature: the standout set, a competence win, never a ranking.
    if (p.bestLift && p.bestLift.weight) {
      const bl = p.bestLift;
      text(cv, Skia, 'BEST LIFT', pad, by, font(p.isSquare ? 18 : 22), PALETTE.textMuted, 'left');
      if (bl.isNewBest) text(cv, Skia, 'NEW PR', W - pad, by, font(p.isSquare ? 18 : 22), PALETTE.gold, 'right');
      by += Math.round((p.isSquare ? 40 : 52) * s);
      const liftStr = `${bl.exerciseName} · ${withUnit(String(bl.weight), bl.units || 'kg')} × ${bl.reps}`;
      const blFont = fitFont(null, liftStr, W - pad * 2, p.isSquare ? 42 : 54, (px) => font(px));
      text(cv, Skia, liftStr, pad, by + blFont.getSize(), blFont, PALETTE.accent, 'left');
      by += Math.round(blFont.getSize() + (p.isSquare ? 30 : 38) * s);
    }

    const stats = (p.stats || []).slice(0, 4).map((st) => ({ label: String(st.label || ''), value: String(st.value != null ? st.value : '') }));
    if (stats.length) by = drawStatBoxes(cv, Skia, W, pad, by, stats, p.isSquare, s, font);

    // Coach line — names the real numbers, sits as a caption above the footer.
    if (p.coachLine) {
      const capFont = font(p.isSquare ? 24 : 30, 'regular');
      by += Math.round(8 * s);
      wrapText(capFont, String(p.coachLine), W - pad * 2).slice(0, 3).forEach((l) => {
        text(cv, Skia, l, pad, by + Math.round((p.isSquare ? 24 : 30) * 0.9 * s), capFont, PALETTE.textSecondary, 'left');
        by += Math.round((p.isSquare ? 38 : 46) * s);
      });
    }
    return by;
  }

  runBody(canvas, H, s, p, y, footerHeight(p.isSquare, s), layoutBody);
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
// bottom corners rather than overhanging them. Campaign 30 restyle: a slightly
// stronger scrim (0.62 -> 0.7) plus a hairline amber top edge, matching the new
// system's quieter-but-more-legible plates elsewhere on the family.
function drawCellCaption(canvas, Skia, x, y, w, h, r, cell, s, font) {
  const line = [cell && cell.date, cell && cell.scanRange, cell && cell.weight].filter(Boolean).join('  ·  ');
  if (!line) return;
  const plateH = Math.round(Math.min(Math.max(h * 0.16, 64 * s), h * 0.24));
  const py = y + h - plateH;
  canvas.save();
  canvas.clipRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r), CLIP_INTERSECT, true);
  fillRect(canvas, Skia, x, py, w, plateH, rgba(PALETTE.bg0, 0.7));
  fillRect(canvas, Skia, x, py, w, Math.max(1, Math.round(1 * s)), rgba(PALETTE.accent, 0.3));
  canvas.restore();
  const f = fitFont(null, line, w - Math.round(36 * s), 22, (px) => font(px, 'regular'), 12);
  text(canvas, Skia, line, x + w / 2, py + plateH * 0.62, f, PALETTE.text, 'center');
}

// The centred elapsed-time badge — the quiet headline that belongs to the PAIR,
// not either photo. Reuses the intensity-badge construction (fill rgba(accent,
// .11), hairline rgba(accent,.32) stroke, caps text): time stated neutrally,
// never "transformation", never an arrow.
function drawElapsedBadge(canvas, Skia, W, y, label, s, font) {
  if (!label) return y;
  const txt = String(label).toUpperCase();
  const f = font(22);
  const bw = measure(f, txt) + 60 * s;
  const bh = Math.round(48 * s);
  const bx = (W - bw) / 2;
  fillRRect(canvas, Skia, bx, y, bw, bh, bh / 2, rgba(PALETTE.accent, 0.11));
  strokeRRect(canvas, Skia, bx, y, bw, bh, bh / 2, rgba(PALETTE.accent, 0.32), Math.max(1, 1.5 * s));
  text(canvas, Skia, txt, W / 2, y + bh * 0.68, f, PALETTE.accent, 'center');
  return y + bh + Math.round(28 * s);
}

// Before/after progress card — TWO dated progress photos composited into ONE
// image: older-left / newer-right as identical cover-cropped cells (square /
// portrait), or older-top / newer-bottom stacked (story), each with its own
// date·weight caption plate, a centred elapsed-time badge and the shared
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
  drawBackground(canvas, Skia, W, H, p.cardType);
  drawCardFrame(canvas, Skia, W, H, s);

  const before = p.before || {};
  const after = p.after || {};
  const beforeImg = photos && photos.before;
  const afterImg = photos && photos.after;
  const r = Math.round(16 * s);
  const gap = Math.round(14 * s);

  let y = pad + Math.round(48 * s);
  y = drawElapsedBadge(canvas, Skia, W, y, p.elapsedLabel, s, font);
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
 * @param deps.typefaces { regular, bold } SkTypeface
 * @param deps.wordmark SkImage logo, or null
 * @param deps.photos { before, after } SkImages for the beforeAfter card, or null
 */
export function drawShareCard(canvas, {
  Skia, width, params, typefaces, wordmark, bgPhoto = null, photos = null,
}) {
  BG = bgPhoto || null; // optional gym photo background (all card types)
  // Every card type now drives its own three aspect presets ('square' |
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
  // re-thrown afterwards so the screen still LOGS the cause to Sentry - the
  // user gets a card, we still get the diagnosis.
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
 * blur, no offscreen surfaces - so it stands on any Skia build the app can
 * boot with. Never the intended design; strictly better than no card.
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
    drawFooter(canvas, Skia, W, H, s, font, wordmark, p);
  } catch (_e) { /* even the floor is best-effort; a dark card is acceptable */ }
}

// ── sticker export (ELITE-SHARE-SPEC pillar 3, Strava Sticker Stats) ──────
//
// A transparent-background PNG carrying just the compact stat block + a small
// trailing mark, meant to be pasted onto the user's OWN story/photo rather
// than shared as a full card. It is deliberately small in scope: no
// background, no accent geometry, no template picker -- just the strongest
// single number the moment has, drawn once, the same way every time.
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
    return { value, label: 'PERSONAL RECORD', sub: p.exerciseName || '', color: PALETTE.accent };
  }
  if (cardType === 'milestone') {
    if (p.heroValue) {
      return { value: String(p.heroValue), label: (p.heroUnit || p.eyebrow || 'MILESTONE'), sub: p.title || '', color: PALETTE.accent };
    }
    if (p.title) return { value: p.title, label: p.eyebrow || 'MILESTONE', sub: '', color: PALETTE.text };
    return null;
  }
  if (cardType === 'weekly') {
    if (p.hero && p.hero.value) {
      const label = [p.hero.heading, p.hero.context].filter(Boolean).join(' · ') || 'THIS WEEK';
      return { value: p.hero.value, label, sub: p.tierLabel || '', color: PALETTE.accent };
    }
    if (p.bestLift && p.bestLift.weight) {
      const bl = p.bestLift;
      return { value: withUnit(String(bl.weight), bl.units || 'kg'), label: 'BEST LIFT', sub: bl.exerciseName || '', color: PALETTE.accent };
    }
    const stats = p.stats || [];
    if (stats.length && stats[0].value) {
      return { value: String(stats[0].value), label: String(stats[0].label || '').toUpperCase(), sub: p.tierLabel || '', color: PALETTE.accent };
    }
    return null;
  }
  if (cardType === 'beforeAfter') {
    if (!p.elapsedLabel) return null;
    return { value: String(p.elapsedLabel), label: 'PROGRESS', sub: '', color: PALETTE.accent };
  }
  // session (and any unrecognised type, matching drawShareCard's own default).
  const heroInfo = sessionHeroInfo(p, unit);
  if (!heroInfo.value || heroInfo.value === '0') return null;
  return { value: heroInfo.value, label: heroInfo.label, sub: p.sessionName || '', color: heroInfo.color };
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
 * @param deps.typefaces { regular, bold } SkTypeface
 * @param deps.wordmark SkImage logo, or null
 */
export function drawSticker(canvas, {
  Skia, width, params, typefaces, wordmark,
}) {
  const s = width / 700;
  const H = stickerHeight(width);
  const font = makeFonts(Skia, typefaces, s);
  const pad = Math.round(width * 0.09);
  const r = Math.round(30 * s);

  // No drawBackground call: an untouched offscreen Surface starts fully
  // transparent on both the device and CanvasKit-in-Node runtimes, and the
  // rounded panel below is the ONLY opaque content, so the sticker can sit
  // directly on the user's own photo.
  fillRRect(canvas, Skia, 0, 0, width, H, r, rgba(PALETTE.bg0, 0.82));
  strokeRRect(canvas, Skia, 0, 0, width, H, r, rgba(PALETTE.accent, 0.3), Math.max(1, 1.5 * s));
  fillRRect(canvas, Skia, pad * 0.55, Math.round(16 * s), Math.max(3, Math.round(5 * s)), H - Math.round(32 * s), Math.round(3 * s), rgba(PALETTE.accent, 0.75));

  const content = stickerContentFor(params.cardType, params);
  const textX = pad + Math.round(16 * s);
  const maxW = width - textX - pad;
  if (content && content.value) {
    const labelY = Math.round(H * 0.34);
    if (content.label) {
      const labelFont = fitFont(null, String(content.label).toUpperCase(), maxW, 20, (px) => font(px), 12);
      text(canvas, Skia, String(content.label).toUpperCase(), textX, labelY, labelFont, PALETTE.textMuted, 'left');
    }
    const valFont = fitFont(null, content.value, maxW, 76, (px) => font(px), 34);
    const valY = labelY + valFont.getSize() * 0.92;
    text(canvas, Skia, content.value, textX, valY, valFont, content.color || PALETTE.accent, 'left');
    if (content.sub) {
      const subFont = font(18, 'regular');
      const subLine = wrapTextCapped(subFont, content.sub, maxW, 1)[0];
      text(canvas, Skia, subLine, textX, valY + Math.round(34 * s), subFont, PALETTE.textSecondary, 'left');
    }
  }
  drawStickerMark(canvas, Skia, width, H, pad, s, font, wordmark);
  return { width, height: H };
}
