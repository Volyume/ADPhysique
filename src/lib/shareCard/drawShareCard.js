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
 */

// react-native-skia PaintStyle / TileMode are plain numeric enums; hardcoded
// here so the module needs no RN-only imports (keeps it Node-runnable).
const FILL = 0;
const STROKE = 1;
const CLAMP = 0;

// The share card's own palette. DESIGN_SYSTEM.md whitelists this offline canvas
// to hold its own values (it is not a screen/component bound by the no-hardcoded-
// hex rule); the values track the brand — amber #F5A623 for data, #FFD700 gold
// for trophy moments, the near-black tonal background, textPrimary/secondary/muted.
const PALETTE = {
  bg0: '#0D0D0D', bg1: '#141413', bg2: '#191917',
  surface: '#222220', surface2: '#2A2A27',
  border: '#343431', divider: 'rgba(255,255,255,0.06)',
  accent: '#F5A623', gold: '#FFD700',
  text: '#FFFFFF', textSecondary: '#9E9E9E', textMuted: '#9B9B9B',
};

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

function drawBackground(canvas, Skia, W, H) {
  if (BG && BG.width && BG.width() && BG.height()) {
    // Gym photo background: cover-fit the photo, then a near-black scrim so the
    // white/amber text stays legible over any image.
    drawImageCover(canvas, Skia, BG, W, H);
    fillRect(canvas, Skia, 0, 0, W, H, rgba(PALETTE.bg0, 0.62));
  } else {
    const shader = Skia.Shader.MakeLinearGradient(
      { x: W / 2, y: 0 }, { x: W / 2, y: H },
      [Skia.Color(PALETTE.bg1), Skia.Color(PALETTE.bg0), Skia.Color(PALETTE.bg2)],
      [0, 0.5, 1], CLAMP,
    );
    const p = Skia.Paint();
    p.setShader(shader);
    canvas.drawRect(Skia.XYWHRect(0, 0, W, H), p);
  }
}

function drawAccentBar(canvas, Skia, W, s) {
  fillRect(canvas, Skia, 0, 0, W, Math.round(8 * s), PALETTE.accent);
}

function drawFooter(canvas, Skia, W, H, pad, isSquare, s, font, wordmark) {
  // The brand moment: a prominent centred Volyume wordmark, the SMARTER TRAINING
  // tagline, and the amber accent underline. Sized so the logo reads as the
  // logo (wordmark ~23% of the card width), aligned with the rest of the card.
  const footerH = Math.round((isSquare ? 162 : 250) * s);
  const fy = H - footerH;
  fillRect(canvas, Skia, pad, fy, W - pad * 2, Math.max(1, Math.round(1 * s)), PALETTE.divider);

  const markH = Math.round((isSquare ? 66 : 90) * s);
  const markY = fy + Math.round((isSquare ? 26 : 36) * s);
  if (wordmark && wordmark.width && wordmark.height) {
    const mw = markH * (wordmark.width() / wordmark.height());
    const p = Skia.Paint(); p.setAntiAlias(true);
    canvas.drawImageRect(wordmark, Skia.XYWHRect(0, 0, wordmark.width(), wordmark.height()), Skia.XYWHRect((W - mw) / 2, markY, mw, markH), p);
  } else {
    text(canvas, Skia, 'Volyume', W / 2, markY + markH * 0.78, font(Math.round(markH * 0.72 / s), 'bold'), PALETTE.text, 'center');
  }

  const taglineY = markY + markH + Math.round((isSquare ? 34 : 44) * s);
  text(canvas, Skia, 'SMARTER  TRAINING', W / 2, taglineY, font(isSquare ? 20 : 28), PALETTE.accent, 'center');
  const accW = (W - pad * 2) * 0.4;
  fillRect(canvas, Skia, (W - accW) / 2, taglineY + Math.round((isSquare ? 14 : 18) * s), accW, Math.round(3 * s), PALETTE.accent);

  if (!isSquare) text(canvas, Skia, 'volyume.app', W / 2, H - Math.round(36 * s), font(22, 'regular'), PALETTE.textMuted, 'center');
}

function drawIntensityBadge(canvas, Skia, W, y, tier, s, font) {
  if (!tier) return y;
  let label; let color;
  if (tier === 'epic') { label = 'EPIC SESSION'; color = PALETTE.gold; }
  else if (tier === 'tough') { label = 'TOUGH SESSION'; color = PALETTE.accent; }
  else { label = 'SOLID SESSION'; color = PALETTE.textSecondary; }
  const f = font(22);
  const bw = measure(f, label) + 60 * s;
  const bh = Math.round(44 * s);
  const bx = (W - bw) / 2;
  fillRRect(canvas, Skia, bx, y, bw, bh, bh / 2, rgba(color, 0.125));
  strokeRRect(canvas, Skia, bx, y, bw, bh, bh / 2, rgba(color, 0.38), Math.max(1, 1.5 * s));
  text(canvas, Skia, label, W / 2, y + bh * 0.68, f, color, 'center');
  return y + bh + Math.round(28 * s);
}

function drawStatBoxes(canvas, Skia, W, pad, y, stats, isSquare, s, font) {
  if (!stats.length) return y;
  const statBoxH = Math.round((isSquare ? 100 : 130) * s);
  const gap = Math.round(14 * s);
  const boxW = Math.floor((W - pad * 2 - gap * (stats.length - 1)) / stats.length);
  stats.forEach((st, i) => {
    const bx = pad + i * (boxW + gap);
    fillRRect(canvas, Skia, bx, y, boxW, statBoxH, Math.round(16 * s), PALETTE.surface);
    strokeRRect(canvas, Skia, bx, y, boxW, statBoxH, Math.round(16 * s), PALETTE.border, Math.max(1, 1.2 * s));
    text(canvas, Skia, st.value, bx + boxW / 2, y + statBoxH * 0.5, font(isSquare ? 42 : 52), PALETTE.text, 'center');
    text(canvas, Skia, st.label.toUpperCase(), bx + boxW / 2, y + statBoxH - Math.round(18 * s), font(16), PALETTE.textMuted, 'center');
  });
  return y + statBoxH + Math.round(24 * s);
}

function drawExerciseChips(canvas, Skia, W, pad, y, exercises, s, font) {
  if (!exercises || !exercises.length) return y;
  // Entries may be plain names or { name } objects — coerce to a label.
  const names = exercises.map((ex) => (typeof ex === 'string' ? ex : (ex && ex.name) || '')).filter(Boolean);
  if (!names.length) return y;
  const f = font(22, 'regular');
  const rowH = Math.round(48 * s);
  const chipH = rowH - Math.round(8 * s);
  const gap = Math.round(10 * s);
  let x = pad;
  let drew = 0;
  names.slice(0, 6).forEach((name) => {
    const tw = measure(f, name);
    const chipW = tw + Math.round(36 * s);
    if (x + chipW > W - pad) return;
    fillRRect(canvas, Skia, x, y, chipW, chipH, chipH / 2, PALETTE.surface2);
    strokeRRect(canvas, Skia, x, y, chipW, chipH, chipH / 2, PALETTE.border, Math.max(1, 1 * s));
    text(canvas, Skia, name, x + chipW / 2, y + chipH * 0.66, f, PALETTE.textSecondary, 'center');
    x += chipW + gap;
    drew += 1;
  });
  if (names.length > drew) {
    const more = `+${names.length - drew} more`;
    if (x + measure(f, more) < W - pad) text(canvas, Skia, more, x, y + chipH * 0.66, f, PALETTE.textMuted, 'left');
  }
  return y + rowH + Math.round(16 * s);
}

// ── card layouts ─────────────────────────────────────────────────────────────

function drawSession(canvas, Skia, W, H, p, s, font, wordmark) {
  const pad = Math.round(W * 0.074);
  drawBackground(canvas, Skia, W, H);
  drawAccentBar(canvas, Skia, W, s);

  let y = pad + Math.round(60 * s);
  if (p.showDate && p.date) text(canvas, Skia, p.date, W - pad, y, font(22, 'regular'), PALETTE.textMuted, 'right');
  y += Math.round(70 * s);

  if (p.showPlanName && p.planName) {
    text(canvas, Skia, p.planName.toUpperCase(), pad, y, font(22), PALETTE.accent, 'left');
    y += Math.round(36 * s);
  }

  const heroFont = font(p.isSquare ? 64 : 78);
  const lines = wrapText(heroFont, p.sessionName || 'Workout complete', W - pad * 2).slice(0, 2);
  lines.forEach((l) => {
    text(canvas, Skia, l, pad, y + Math.round((p.isSquare ? 64 : 78) * 0.82 * s), heroFont, PALETTE.text, 'left');
    y += Math.round((p.isSquare ? 64 : 78) * 1.05 * s);
  });
  y += Math.round(30 * s);

  let heroValue; let heroLabel; let heroColor;
  if (p.prCount > 0) {
    heroValue = String(p.prCount);
    heroLabel = p.prCount === 1 ? 'NEW PERSONAL RECORD' : 'NEW PERSONAL RECORDS';
    heroColor = PALETTE.gold;
  } else if (p.showVolume && (p.tonnage || 0) > 0) {
    heroValue = Math.round(p.tonnage).toLocaleString('en-GB');
    heroLabel = 'TOTAL KG LIFTED';
    heroColor = PALETTE.accent;
  } else {
    heroValue = String(p.workingSets || 0);
    heroLabel = 'WORKING SETS COMPLETED';
    heroColor = PALETTE.text;
  }
  const heroNum = fitFont(null, heroValue, W - pad * 2, p.isSquare ? 140 : 220, (px) => font(px));
  const heroY = p.isSquare ? y + heroNum.getSize() : Math.round(H * 0.42);
  text(canvas, Skia, heroValue, W / 2, heroY, heroNum, heroColor, 'center');
  text(canvas, Skia, heroLabel, W / 2, heroY + Math.round((p.isSquare ? 30 : 50) * s), font(p.isSquare ? 18 : 24), PALETTE.textSecondary, 'center');

  y = heroY + Math.round((p.isSquare ? 60 : 90) * s);
  y = drawIntensityBadge(canvas, Skia, W, y, p.intensityTier, s, font);

  const stats = [
    { label: 'Sets', value: String(p.workingSets || 0) },
    { label: 'Time', value: `${p.duration || 0}m` },
  ];
  if (p.showVolume && (p.tonnage || 0) > 0 && p.prCount > 0) stats.push({ label: 'Total kg', value: Math.round(p.tonnage).toLocaleString('en-GB') });
  else if (p.exerciseCount > 0) stats.push({ label: 'Exercises', value: String(p.exerciseCount) });
  y = drawStatBoxes(canvas, Skia, W, pad, y, stats, p.isSquare, s, font);

  // Exercise names now honoured on BOTH formats (the toggle was previously dead
  // on square). Story has room for the top-lift card above the chips.
  if (!p.isSquare && p.topSet && p.topSet.weight > 0) {
    const cardW = W - pad * 2; const cardH = Math.round(130 * s);
    fillRRect(canvas, Skia, pad, y, cardW, cardH, Math.round(18 * s), PALETTE.surface);
    strokeRRect(canvas, Skia, pad, y, cardW, cardH, Math.round(18 * s), PALETTE.border, Math.max(1, 1.5 * s));
    fillRRect(canvas, Skia, pad, y, Math.round(6 * s), cardH, Math.round(3 * s), PALETTE.accent);
    text(canvas, Skia, 'TOP LIFT', pad + Math.round(28 * s), y + Math.round(36 * s), font(18), PALETTE.textMuted, 'left');
    text(canvas, Skia, `${p.topSet.weight}kg × ${p.topSet.reps}`, pad + Math.round(28 * s), y + Math.round(84 * s), font(46), PALETTE.text, 'left');
    if (p.topSet.exerciseName) text(canvas, Skia, p.topSet.exerciseName, pad + cardW - Math.round(28 * s), y + Math.round(84 * s), font(22, 'regular'), PALETTE.textSecondary, 'right');
    y += cardH + Math.round(24 * s);
  }
  if (p.showExercises && p.exercises && p.exercises.length) {
    y = drawExerciseChips(canvas, Skia, W, pad, y, p.exercises, s, font);
  }

  drawFooter(canvas, Skia, W, H, pad, p.isSquare, s, font, wordmark);
}

function drawPR(canvas, Skia, W, H, p, s, font, wordmark) {
  const pad = Math.round(W * 0.074);
  drawBackground(canvas, Skia, W, H);
  drawAccentBar(canvas, Skia, W, s);

  const brandY = pad + Math.round(60 * s);
  if (p.showDate && p.date) text(canvas, Skia, p.date, W - pad, brandY, font(22, 'regular'), PALETTE.textMuted, 'right');

  const badgeY = Math.round(H * 0.22);
  // Plain text in the pill (matches the intensity badge). No decorative glyphs:
  // the star (U+2605) is missing from some system fonts and renders as tofu.
  const label = 'PERSONAL RECORD';
  const f = font(24);
  const bw = measure(f, label) + 60 * s; const bh = Math.round(56 * s);
  fillRRect(canvas, Skia, (W - bw) / 2, badgeY, bw, bh, bh / 2, rgba(PALETTE.gold, 0.15));
  strokeRRect(canvas, Skia, (W - bw) / 2, badgeY, bw, bh, bh / 2, rgba(PALETTE.gold, 0.44), Math.max(1, 2 * s));
  text(canvas, Skia, label, W / 2, badgeY + bh * 0.66, f, PALETTE.gold, 'center');

  const exFont = font(p.isSquare ? 56 : 72);
  let ey = badgeY + bh + Math.round(70 * s);
  wrapText(exFont, p.exerciseName || 'Exercise', W - pad * 2).slice(0, 2).forEach((l) => {
    text(canvas, Skia, l, W / 2, ey, exFont, PALETTE.text, 'center');
    ey += Math.round((p.isSquare ? 56 : 72) * 1.08 * s);
  });
  ey += Math.round(30 * s);

  const wStr = p.showPRWeight
    ? `${p.weight || '-'}${p.units || 'kg'} × ${p.reps || '-'}`
    : `${p.reps || '-'} reps`;
  const wFont = fitFont(null, wStr, W - pad * 1.6, p.isSquare ? 110 : 160, (px) => font(px));
  text(canvas, Skia, wStr, W / 2, ey + wFont.getSize(), wFont, PALETTE.accent, 'center');

  if (p.showPrevBest && p.previousBest) {
    text(canvas, Skia, `Previous best: ${p.previousBest}${p.units || 'kg'}`, W / 2, ey + wFont.getSize() + Math.round(70 * s), font(28, 'regular'), PALETTE.textMuted, 'center');
  }

  drawFooter(canvas, Skia, W, H, pad, p.isSquare, s, font, wordmark);
}

function drawMilestone(canvas, Skia, W, H, p, s, font, wordmark) {
  const pad = Math.round(W * 0.074);
  drawBackground(canvas, Skia, W, H);
  drawAccentBar(canvas, Skia, W, s);

  let y = pad + Math.round(60 * s);
  if (p.showDate && p.date) text(canvas, Skia, p.date, W - pad, y, font(22, 'regular'), PALETTE.textMuted, 'right');
  y += Math.round(70 * s);

  if (p.eyebrow) {
    text(canvas, Skia, String(p.eyebrow).toUpperCase(), pad, y, font(22), PALETTE.accent, 'left');
    y += Math.round(36 * s);
  }
  const titleFont = font(p.isSquare ? 60 : 74);
  wrapText(titleFont, p.title || '', W - pad * 2).slice(0, 2).forEach((l) => {
    text(canvas, Skia, l, pad, y + Math.round((p.isSquare ? 60 : 74) * 0.82 * s), titleFont, PALETTE.text, 'left');
    y += Math.round((p.isSquare ? 60 : 74) * 1.05 * s);
  });
  y += Math.round(24 * s);

  const heroValue = String(p.heroValue != null ? p.heroValue : '');
  const heroNum = fitFont(null, heroValue, W - pad * 2, p.isSquare ? 140 : 220, (px) => font(px));
  const heroY = p.isSquare ? y + heroNum.getSize() : Math.round(H * 0.42);
  text(canvas, Skia, heroValue, W / 2, heroY, heroNum, PALETTE.accent, 'center');
  if (p.heroUnit) text(canvas, Skia, String(p.heroUnit).toUpperCase(), W / 2, heroY + Math.round((p.isSquare ? 30 : 50) * s), font(p.isSquare ? 18 : 24), PALETTE.textSecondary, 'center');
  y = heroY + Math.round((p.isSquare ? 64 : 100) * s);

  if (p.caption) {
    const capFont = font(p.isSquare ? 22 : 28, 'regular');
    wrapText(capFont, String(p.caption), W - pad * 2).slice(0, 2).forEach((l) => {
      text(canvas, Skia, l, W / 2, y, capFont, PALETTE.textMuted, 'center');
      y += Math.round((p.isSquare ? 30 : 38) * s);
    });
    y += Math.round(16 * s);
  }
  const stats = (p.stats || []).slice(0, 3).map((st) => ({ label: String(st.label || ''), value: String(st.value != null ? st.value : '') }));
  if (stats.length) y = drawStatBoxes(canvas, Skia, W, pad, y, stats, p.isSquare, s, font);

  drawFooter(canvas, Skia, W, H, pad, p.isSquare, s, font, wordmark);
}

// Weekly Precision Coaching recap. Leads with the user's real goal achievement
// — the actual weight lost/gained this week — as the big amber data hero, then
// the best lift, the real stat wins (PRs / sessions / recovery) and a coach line
// that names the numbers. ED-safety lives in the param builder (greatWeek.js): under
// calm mode / an ED flag the progress hero, the lift hero and all weight
// language are already stripped before they reach here, and the card only ever
// renders for a verified-safe, on-target week.
function drawWeeklyRecap(canvas, Skia, W, H, p, s, font, wordmark) {
  const pad = Math.round(W * 0.074);
  drawBackground(canvas, Skia, W, H);
  drawAccentBar(canvas, Skia, W, s);

  let y = pad + Math.round(56 * s);
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
  wrapText(titleFont, p.tierLabel || 'Great Week', W - pad * 2).slice(0, 1).forEach((l) => {
    text(canvas, Skia, l, pad, y + Math.round((p.isSquare ? 56 : 70) * 0.82 * s), titleFont, PALETTE.text, 'left');
    y += Math.round((p.isSquare ? 56 : 70) * 1.02 * s);
  });
  y += Math.round(20 * s);

  // HERO: the single biggest win (cut weight loss, else best lift, else PRs) —
  // the big amber data numeral with ONE uppercase label beneath, exactly like the
  // session card's hero. greatWeek.js drops it under suppress.
  if (p.hero && p.hero.value) {
    const phFont = fitFont(null, p.hero.value, W - pad * 2, p.isSquare ? 140 : 180, (px) => font(px));
    const heroBaseline = y + phFont.getSize();
    text(canvas, Skia, p.hero.value, W / 2, heroBaseline, phFont, PALETTE.accent, 'center');
    // Clear the numeral's descenders (e.g. the "g" in "kg") before the label.
    y = heroBaseline + Math.round(phFont.getSize() * 0.24) + Math.round((p.isSquare ? 16 : 22) * s);
    const heroLabel = [p.hero.heading, p.hero.context].filter(Boolean).join(' · ').toUpperCase();
    if (heroLabel) {
      // Fit to width: the heading can be an arbitrary exercise name (best-lift
      // hero), so shrink before it would overflow.
      const lblFont = fitFont(null, heroLabel, W - pad * 2, p.isSquare ? 18 : 24, (px) => font(px), 12);
      text(canvas, Skia, heroLabel, W / 2, y, lblFont, PALETTE.textSecondary, 'center');
      y += Math.round((p.isSquare ? 50 : 62) * s);
    }
  }

  // Best-lift feature: the standout set, a competence win, never a ranking.
  if (p.bestLift && p.bestLift.weight) {
    const bl = p.bestLift;
    text(canvas, Skia, 'BEST LIFT', pad, y, font(p.isSquare ? 18 : 22), PALETTE.textMuted, 'left');
    if (bl.isNewBest) text(canvas, Skia, 'NEW PB', W - pad, y, font(p.isSquare ? 18 : 22), PALETTE.gold, 'right');
    y += Math.round((p.isSquare ? 40 : 52) * s);
    const liftStr = `${bl.exerciseName} · ${bl.weight} ${bl.units || 'kg'} × ${bl.reps}`;
    const blFont = fitFont(null, liftStr, W - pad * 2, p.isSquare ? 42 : 54, (px) => font(px));
    text(canvas, Skia, liftStr, pad, y + blFont.getSize(), blFont, PALETTE.accent, 'left');
    y += Math.round(blFont.getSize() + (p.isSquare ? 30 : 38) * s);
  }

  const stats = (p.stats || []).slice(0, 4).map((st) => ({ label: String(st.label || ''), value: String(st.value != null ? st.value : '') }));
  if (stats.length) y = drawStatBoxes(canvas, Skia, W, pad, y, stats, p.isSquare, s, font);

  // Coach line — names the real numbers, sits as a caption above the footer.
  if (p.coachLine) {
    const capFont = font(p.isSquare ? 24 : 30, 'regular');
    y += Math.round(8 * s);
    wrapText(capFont, String(p.coachLine), W - pad * 2).slice(0, 3).forEach((l) => {
      text(canvas, Skia, l, pad, y + Math.round((p.isSquare ? 24 : 30) * 0.9 * s), capFont, PALETTE.textSecondary, 'left');
      y += Math.round((p.isSquare ? 38 : 46) * s);
    });
  }

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
// bottom corners rather than overhanging them.
function drawCellCaption(canvas, Skia, x, y, w, h, r, cell, s, font) {
  const line = [cell && cell.date, cell && cell.scanRange, cell && cell.weight].filter(Boolean).join('  ·  ');
  if (!line) return;
  const plateH = Math.round(Math.min(Math.max(h * 0.16, 64 * s), h * 0.24));
  const py = y + h - plateH;
  canvas.save();
  canvas.clipRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r), CLIP_INTERSECT, true);
  fillRect(canvas, Skia, x, py, w, plateH, rgba(PALETTE.bg0, 0.62));
  canvas.restore();
  const f = fitFont(null, line, w - Math.round(36 * s), 22, (px) => font(px, 'regular'), 12);
  text(canvas, Skia, line, x + w / 2, py + plateH * 0.62, f, PALETTE.text, 'center');
}

// The centred elapsed-time badge — the quiet headline that belongs to the PAIR,
// not either photo. Reuses the intensity-badge construction (fill rgba(accent,
// .125), hairline rgba(accent,.38) stroke, caps text): time stated neutrally,
// never "transformation", never an arrow.
function drawElapsedBadge(canvas, Skia, W, y, label, s, font) {
  if (!label) return y;
  const txt = String(label).toUpperCase();
  const f = font(22);
  const bw = measure(f, txt) + 60 * s;
  const bh = Math.round(48 * s);
  const bx = (W - bw) / 2;
  fillRRect(canvas, Skia, bx, y, bw, bh, bh / 2, rgba(PALETTE.accent, 0.125));
  strokeRRect(canvas, Skia, bx, y, bw, bh, bh / 2, rgba(PALETTE.accent, 0.38), Math.max(1, 1.5 * s));
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
  drawBackground(canvas, Skia, W, H);
  drawAccentBar(canvas, Skia, W, s);

  const before = p.before || {};
  const after = p.after || {};
  const beforeImg = photos && photos.before;
  const afterImg = photos && photos.after;
  const r = Math.round(16 * s);
  const gap = Math.round(14 * s);

  let y = pad + Math.round(48 * s);
  y = drawElapsedBadge(canvas, Skia, W, y, p.elapsedLabel, s, font);
  y += Math.round(8 * s);

  const footerH = Math.round((p.isSquare ? 162 : 250) * s);
  const cellsTop = y;
  const cellsBottom = H - footerH - Math.round(24 * s);
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
 * card type unchanged. The optional third `aspect` is used by the before/after
 * progress card, which ships three presets: 'square' 1:1, 'portrait' 4:5 (the
 * IG-feed ratio) and 'story' 9:16. When `aspect` is omitted the legacy isSquare
 * behaviour is preserved exactly.
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
  // The beforeAfter card drives its own three aspect presets ('square' |
  // 'portrait' | 'story') via params.aspect; every other card type keeps the
  // legacy isSquare boolean untouched (aspect stays undefined for them).
  const aspect = params.aspect || null;
  const isSquare = aspect ? aspect !== 'story' : !!params.isSquare;
  const W = width;
  const H = cardHeight(width, isSquare, aspect);
  const s = W / 1080;
  const font = makeFonts(Skia, typefaces, s);
  const p = { ...params, isSquare, aspect };
  if (params.cardType === 'pr') drawPR(canvas, Skia, W, H, p, s, font, wordmark);
  else if (params.cardType === 'milestone') drawMilestone(canvas, Skia, W, H, p, s, font, wordmark);
  else if (params.cardType === 'weekly') drawWeeklyRecap(canvas, Skia, W, H, p, s, font, wordmark);
  else if (params.cardType === 'beforeAfter') drawBeforeAfter(canvas, Skia, W, H, p, s, font, wordmark, photos);
  else drawSession(canvas, Skia, W, H, p, s, font, wordmark);
  return { width: W, height: H };
}
