/**
 * Headless render harness for the Skia share card.
 *
 * Renders src/lib/shareCard/drawShareCard via CanvasKit (the SAME JsiSk* API
 * used on device) to real PNGs, so the card can be eyeballed without a build.
 * The draw module is pure and import-free, so it is loaded by stripping its ESM
 * `export ` keyword and evaluating — no Babel/RN runtime needed.
 *
 *   node scripts/render-share-card.cjs [outDir]   (default outDir: /tmp)
 *
 * Fonts: the app's own Inter faces from assets/fonts (what the screen loads on
 * device since the 2026-09-26 restyle), with Liberation Sans from the OS as the
 * fallback when an asset is missing. Layout is measured per-font, so it adapts
 * either way.
 */
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || '/tmp';
const FONT_BOLD = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
const FONT_REG = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';
const INTER = {
  regular: 'Inter-Regular.ttf',
  medium: 'Inter-Medium.ttf',
  semibold: 'Inter-SemiBold.ttf',
  bold: 'Inter-Bold.ttf',
  display: 'InterDisplay-Bold.ttf',
  displayHeavy: 'InterDisplay-ExtraBold.ttf',
};

// photoLooks.js has no imports of its own, so it loads the same way
// drawShareCard.js does below: strip its `export` keywords, eval as a plain
// script.
function loadPhotoLooksModule() {
  const src = fs.readFileSync(path.join(__dirname, '../src/lib/shareCard/photoLooks.js'), 'utf8')
    .replace(/export\s+(function|const|let|class)/g, '$1');
  const m = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', `${src}\nmodule.exports={PHOTO_LOOKS,DEFAULT_LOOK_STRENGTH,lookByKey,startStrengthFor,clampStrength,lookMatrix,lookVignette,lookPaint};`)(m, m.exports);
  return m.exports;
}

// drawShareCard.js now has ONE real import, from the sibling photoLooks
// module (see its own header comment): the looks' colour matrices and
// vignette maths. This loader strips that import line the same way it
// strips `export` keywords, and supplies the names it imports as extra
// Function parameters bound to the SAME photoLooks module this script uses
// below, so the harness exercises the identical look/vignette maths the
// device and Jest do, never a re-implementation.
function loadDrawModule(photoLooks) {
  const src = fs.readFileSync(path.join(__dirname, '../src/lib/shareCard/drawShareCard.js'), 'utf8')
    .replace(/^import\s*\{[^}]*\}\s*from\s*'\.\/photoLooks';\s*$/m, '')
    .replace(/export\s+(function|const|let|class)/g, '$1');
  const m = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function(
    'module', 'exports', 'clampStrength', 'lookVignette', 'lookPaint', 'lookMatrix',
    `${src}\nmodule.exports={drawShareCard,cardHeight,drawSticker,stickerHeight,photoCoverRect,applyLookToTone};`,
  )(m, m.exports, photoLooks.clampStrength, photoLooks.lookVignette, photoLooks.lookPaint, photoLooks.lookMatrix);
  return m.exports;
}

// Tiles every listed PNG into one labelled contact sheet, for a fast visual
// check of a batch of renders. A review aid only, never shipped.
function composeContactSheet(Skia, typefaces, tiles, outPath) {
  if (!tiles.length) return;
  const TILE_W = 260;
  const LABEL_H = 26;
  const PAD = 12;
  const COLS = 5;
  const labelFont = Skia.Font(typefaces.regular, 15);
  const loaded = tiles.map(({ path: p, label }) => {
    const bytes = fs.readFileSync(p);
    const img = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(new Uint8Array(bytes)));
    const h = Math.round(TILE_W * (img.height() / img.width()));
    return { img, h, label };
  });
  const maxH = Math.max(...loaded.map((t) => t.h));
  const cellW = TILE_W + PAD;
  const cellH = maxH + LABEL_H + PAD;
  const cols = Math.min(COLS, loaded.length);
  const rows = Math.ceil(loaded.length / cols);
  const sheetW = cellW * cols + PAD;
  const sheetH = cellH * rows + PAD;
  const surf = Skia.Surface.MakeOffscreen(sheetW, sheetH);
  const cv = surf.getCanvas();
  const bgPaint = Skia.Paint(); bgPaint.setColor(Skia.Color('#1A1A18'));
  cv.drawRect(Skia.XYWHRect(0, 0, sheetW, sheetH), bgPaint);
  const textPaint = Skia.Paint(); textPaint.setAntiAlias(true); textPaint.setColor(Skia.Color('#FFFFFF'));
  const imgPaint = Skia.Paint(); imgPaint.setAntiAlias(true);
  loaded.forEach((t, i) => {
    const col = i % cols; const row = Math.floor(i / cols);
    const x = PAD + col * cellW;
    const y = PAD + row * cellH;
    cv.drawImageRect(t.img, Skia.XYWHRect(0, 0, t.img.width(), t.img.height()), Skia.XYWHRect(x, y, TILE_W, t.h), imgPaint);
    cv.drawText(t.label, x, y + t.h + 18, textPaint, labelFont);
  });
  surf.flush();
  fs.writeFileSync(outPath, Buffer.from(surf.makeImageSnapshot().encodeToBytes()));
  console.log(`Wrote contact sheet: ${outPath} (${loaded.length} tiles)`);
}

async function main() {
  const photoLooks = loadPhotoLooksModule();
  const {
    drawShareCard, cardHeight, drawSticker, stickerHeight,
  } = loadDrawModule(photoLooks);
  const ckDir = path.dirname(require.resolve('canvaskit-wasm/package.json'));
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const CK = await require(path.join(ckDir, 'bin/full/canvaskit.js'))({ locateFile: (f) => path.join(ckDir, 'bin/full', f) });
  const { JsiSkApi } = require('@shopify/react-native-skia/lib/commonjs/skia/web/JsiSkia.js');
  const Skia = JsiSkApi(CK);

  const tf = (p) => Skia.Typeface.MakeFreeTypeFaceFromData(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(p))));
  const typefaces = { bold: tf(FONT_BOLD), regular: tf(FONT_REG) };
  Object.entries(INTER).forEach(([role, file]) => {
    const p = path.join(__dirname, '../assets/fonts', file);
    if (fs.existsSync(p)) typefaces[role] = tf(p);
  });
  const wordmark = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(path.join(__dirname, '../assets/volyume-wordmark.png')))));
  // The dark-lettered wordmark for a light card with no photo (drawFooter
  // picks this over `wordmark` itself). Harmless on every other render: it
  // is only read when the light theme's text palette is in use.
  const wordmarkDark = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(path.join(__dirname, '../assets/volyume-wordmark-dark.png')))));

  // The session card carries no exercise-name line (founder order
  // 2026-09-26); `topSet` is the lift the athlete chose on the share screen.
  const session = {
    cardType: 'session', sessionName: 'Back + Delts (Width)', planName: 'Push Pull Legs',
    date: 'Sat · 20 Jun 2026', showDate: true, showPlanName: true, showVolume: true,
    workingSets: 18, duration: 52, tonnage: 9340, exerciseCount: 5, prCount: 0, intensityTier: 'solid',
    topSet: { weight: 90, reps: 8, exerciseName: 'Lat Pulldown' },
  };
  const sessionPRs = {
    ...session, sessionName: 'Upper A', planName: 'Upper Lower', prCount: 2,
    topSet: { weight: 42.5, reps: 10, exerciseName: 'Seated Dumbbell Shoulder Press' },
  };
  const sessionNoLift = { ...session, topSet: null, showPlanName: false };
  // Three lifts chosen (founder, 2026-09-26: "they can select more than one
  // if they'd fit"): the card shows as many as fit, under "TOP LIFTS".
  const sessionLifts = {
    ...session,
    topSet: null,
    topLifts: [
      { exerciseName: 'Lat Pulldown', weight: 90, reps: 8 },
      { exerciseName: 'Seated Cable Row', weight: 75, reps: 10 },
      { exerciseName: 'Dumbbell Lateral Raise', weight: 14, reps: 15 },
    ],
  };
  // Long exercise names (founder, 2026-09-27: "longer exercises don't fit
  // in"): each steps down before it wraps.
  const sessionLongLifts = {
    ...session,
    topSet: null,
    topLifts: [
      { exerciseName: 'Plate-Loaded High Row', weight: 140, reps: 12 },
      { exerciseName: 'Chest-Supported T-Bar Row', weight: 120, reps: 8 },
      { exerciseName: 'Single-Arm Cable Lateral Raise (Behind Back)', weight: 12.5, reps: 15 },
    ],
  };
  // The optional extras (founder, 2026-09-26): a quote with its source, the
  // athlete's own caption, and highlight lines the app already showed them.
  const sessionExtras = {
    ...session,
    quote: { text: 'Stimulate, don\u2019t annihilate.', by: 'Lee Haney' },
    highlights: ['Lifted 12% more than usual'],
  };
  const sessionCaption = { ...session, quote: { text: 'Back day done before work \u{1F4AA}', by: null }, highlights: ['Strongest workout in 4 weeks'] };
  const sessionLongQuote = { ...session, quote: { text: 'It\u2019s about how hard you can get hit and keep moving forward.', by: 'Rocky Balboa' }, highlights: ['Strongest workout in 4 weeks'] };
  const pr = { cardType: 'pr', exerciseName: 'Barbell Bench Press', date: 'Sat · 20 Jun 2026', showDate: true, showPRWeight: true, showPrevBest: true, weight: 120, reps: 5, units: 'kg', previousBest: 115 };
  const milestone = { cardType: 'milestone', eyebrow: 'Year of Lifts', title: '2026 in the gym', showDate: false, heroValue: '1,240,000', heroUnit: 'total kg lifted', caption: 'Across 186 sessions this year.', stats: [{ label: 'Sessions', value: '186' }, { label: 'PRs', value: '42' }, { label: 'Hours', value: '210' }] };
  const weekly = {
    cardType: 'weekly', weekLabel: 'Week 4 · Moderate cut', dateFormatted: 'Sun · 22 Jun 2026', showDate: true,
    tierLabel: 'Textbook Week',
    hero: { heading: 'weight lost this week', value: '0.7 kg', context: 'right on target' },
    coachLine: 'You hit all 4 sessions, set 2 new PRs, lost 0.7 kg and recovery was strong.',
    bestLift: { exerciseName: 'Barbell Bench Press', weight: 100, reps: 5, isNewBest: true, units: 'kg' },
    stats: [{ label: 'PRs', value: '2' }, { label: 'Sessions', value: '4/4' }, { label: 'Recovery', value: 'Strong' }],
  };
  const weeklyLift = {
    cardType: 'weekly', weekLabel: 'Week 6 · Lean bulk', dateFormatted: 'Sun · 22 Jun 2026', showDate: true,
    tierLabel: 'Textbook Week',
    hero: { heading: 'Barbell Bench Press', value: '100 kg × 5', context: 'new personal best' },
    coachLine: 'You hit all 4 sessions, set 2 new PRs and recovery was strong.',
    bestLift: null,
    stats: [{ label: 'PRs', value: '2' }, { label: 'Sessions', value: '4/4' }, { label: 'Recovery', value: 'Strong' }],
  };

  const render = (params, width, name) => {
    const H = cardHeight(width, params.isSquare, params.aspect);
    const surf = Skia.Surface.MakeOffscreen(width, H);
    drawShareCard(surf.getCanvas(), { Skia, width, params, typefaces, wordmark, wordmarkDark });
    surf.flush();
    fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(surf.makeImageSnapshot().encodeToBytes()));
    console.log(`${name}  ${width}x${H}`);
  };

  const renderSticker = (params, width, name) => {
    const H = stickerHeight(width);
    const surf = Skia.Surface.MakeOffscreen(width, H);
    drawSticker(surf.getCanvas(), { Skia, width, params, typefaces, wordmark });
    surf.flush();
    fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(surf.makeImageSnapshot().encodeToBytes()));
    console.log(`${name}  ${width}x${H} (sticker)`);
  };

  // Share-card audit R10/M7: `premium` was a dead fixture key here -- drawShareCard
  // never reads params.premium (there is no premium/free branch in the renderer;
  // free/pro gating happens at the screen, not the card). Deleted from both
  // fixtures below rather than carried forward as cargo-cult data.
  const premiumMilestone = { cardType: 'milestone', eyebrow: 'Perfect month', title: 'A perfect month', showDate: true, date: 'Sun · 22 Jun 2026', heroValue: '4', heroUnit: 'weeks on target', caption: 'Four weeks running, every session and target met.', stats: [{ label: 'Weeks', value: '4' }, { label: 'Sessions', value: '16' }] };
  const tonnage = { cardType: 'milestone', eyebrow: 'Lifetime total', title: 'Total weight lifted', showDate: true, date: 'Sun · 22 Jun 2026', heroValue: '1,000,000', heroUnit: 'kg lifted', caption: 'Every working set you have ever logged, added up.', stats: [] };

  // Campaign 30 (ELITE-SHARE-SPEC pillar 3/#4): every non-beforeAfter card
  // type now renders all THREE aspect presets, not just square/story --
  // portrait 4:5 was previously only wired for beforeAfter.
  [['session', session], ['sessionPRs', sessionPRs], ['sessionNoLift', sessionNoLift], ['sessionLifts', sessionLifts], ['sessionLongLifts', sessionLongLifts], ['sessionExtras', sessionExtras], ['sessionCaption', sessionCaption], ['sessionLongQuote', sessionLongQuote], ['pr', pr], ['milestone', milestone], ['weekly', weekly], ['weeklyLift', weeklyLift], ['premium', premiumMilestone], ['tonnage', tonnage]].forEach(([n, p]) => {
    render({ ...p, aspect: 'square' }, 1080, `card_${n}_square`);
    render({ ...p, aspect: 'portrait' }, 1080, `card_${n}_portrait`);
    render({ ...p, aspect: 'story' }, 1080, `card_${n}_story`);
  });

  // Sticker export (pillar 3, Strava Sticker Stats): transparent-background
  // compact stat block + small trailing mark, at least two card types.
  renderSticker({ ...pr }, 700, 'sticker_pr');
  renderSticker({ ...session }, 700, 'sticker_session');
  renderSticker({ ...weekly }, 700, 'sticker_weekly');

  // Share-card audit R10/M7: the before/after progress card is the ONLY Pro
  // card and the only one carrying bodyweight, and had NO rendered-output
  // coverage here at all. Two synthetic portrait-ish swatches stand in for the
  // user's before/after photos (matches drawShareCard.test.js's makeSwatch).
  const baBefore = { ps: Skia.Surface.MakeOffscreen(64, 96) };
  baBefore.ps.getCanvas().drawRect(Skia.XYWHRect(0, 0, 64, 96), (() => { const pt = Skia.Paint(); pt.setColor(Skia.Color('#8a8f7a')); return pt; })());
  baBefore.ps.flush();
  const baBeforeImg = baBefore.ps.makeImageSnapshot();
  const baAfter = { ps: Skia.Surface.MakeOffscreen(64, 96) };
  baAfter.ps.getCanvas().drawRect(Skia.XYWHRect(0, 0, 64, 96), (() => { const pt = Skia.Paint(); pt.setColor(Skia.Color('#b0a890')); return pt; })());
  baAfter.ps.flush();
  const baAfterImg = baAfter.ps.makeImageSnapshot();
  const beforeAfterBase = {
    cardType: 'beforeAfter',
    elapsedLabel: '14 weeks',
    before: { date: '3 Mar 2026', scanRange: 'Defined index 54', weight: '82.4 kg' },
    after: { date: '9 Jun 2026', scanRange: 'Lean index 66', weight: '78.1 kg' },
  };
  const renderBeforeAfter = (aspect, name) => {
    const H = cardHeight(1080, aspect !== 'story', aspect);
    const surf = Skia.Surface.MakeOffscreen(1080, H);
    drawShareCard(surf.getCanvas(), {
      Skia, width: 1080, params: { ...beforeAfterBase, aspect }, typefaces, wordmark,
      photos: { before: baBeforeImg, after: baAfterImg },
    });
    surf.flush();
    fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(surf.makeImageSnapshot().encodeToBytes()));
    console.log(`${name}  1080x${H}`);
  };
  renderBeforeAfter('square', 'card_beforeAfter_square');
  renderBeforeAfter('portrait', 'card_beforeAfter_portrait');
  renderBeforeAfter('story', 'card_beforeAfter_story');

  // Gym-photo background: a synthetic bright/varied "photo" to check the scrim +
  // cover-fit keep white/amber text legible over a real image.
  const ps = Skia.Surface.MakeOffscreen(600, 600); const pc = ps.getCanvas();
  const block = (x, y, w, h, hex) => { const pt = Skia.Paint(); pt.setColor(Skia.Color(hex)); pc.drawRect(Skia.XYWHRect(x, y, w, h), pt); };
  block(0, 0, 600, 600, '#d8d2c4'); block(0, 0, 300, 600, '#b9a886'); block(150, 350, 450, 250, '#5a4a2e'); block(380, 60, 220, 220, '#e9e4d6');
  ps.flush(); const photo = ps.makeImageSnapshot();
  const renderPhoto = (params, name, image = photo, crop = null) => {
    const aspect = params.aspect || (params.isSquare ? 'square' : 'story');
    const H = cardHeight(1080, aspect !== 'story', aspect);
    const surf = Skia.Surface.MakeOffscreen(1080, H);
    drawShareCard(surf.getCanvas(), {
      Skia, width: 1080, params: { ...params, aspect }, typefaces, wordmark, wordmarkDark, bgPhoto: image, photoCrop: crop,
    });
    surf.flush();
    fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(surf.makeImageSnapshot().encodeToBytes()));
    console.log(`${name}  1080x${H}`);
  };
  renderPhoto({ ...weekly, isSquare: true }, 'photo_weekly');
  renderPhoto({ ...session, isSquare: true }, 'photo_session');
  renderPhoto({ ...pr, isSquare: true }, 'photo_pr');

  // A portrait "gym photo" with a subject in the middle third, to check that
  // the title and the numbers leave the middle of the photo clear, and that
  // the athlete's framing (photoCrop) moves what the card shows.
  const gp = Skia.Surface.MakeOffscreen(900, 1200); const gc = gp.getCanvas();
  const grad = Skia.Paint();
  grad.setShader(Skia.Shader.MakeLinearGradient({ x: 0, y: 0 }, { x: 0, y: 1200 }, [Skia.Color('#e8dcc4'), Skia.Color('#7a6248'), Skia.Color('#2a2119')], [0, 0.45, 1], 0));
  gc.drawRect(Skia.XYWHRect(0, 0, 900, 1200), grad);
  const fillC = (hex) => { const pt = Skia.Paint(); pt.setAntiAlias(true); pt.setColor(Skia.Color(hex)); return pt; };
  gc.drawCircle(450, 430, 120, fillC('#c98f68')); // head
  gc.drawRRect(Skia.RRectXY(Skia.XYWHRect(250, 540, 400, 520), 120, 120), fillC('#b87c57')); // torso
  gc.drawCircle(250, 640, 90, fillC('#c98f68')); gc.drawCircle(650, 640, 90, fillC('#c98f68')); // arms
  gp.flush(); const gymPhoto = gp.makeImageSnapshot();
  renderPhoto({ ...session, aspect: 'story' }, 'gym_session_story', gymPhoto);
  renderPhoto({ ...session, aspect: 'story' }, 'gym_session_story_framed', gymPhoto, { zoom: 1.6, cx: 0.5, cy: 0.5 });
  renderPhoto({ ...session, aspect: 'square' }, 'gym_session_square', gymPhoto);
  renderPhoto({ ...session, aspect: 'portrait' }, 'gym_session_portrait', gymPhoto);
  renderPhoto({ ...pr, aspect: 'story' }, 'gym_pr_story', gymPhoto);

  // A landscape photo resized down on a story until the whole photo shows,
  // sitting on the card's ground (founder: "adjustable in position and size").
  const lp = Skia.Surface.MakeOffscreen(1200, 900); const lc = lp.getCanvas();
  const lgrad = Skia.Paint();
  lgrad.setShader(Skia.Shader.MakeLinearGradient({ x: 0, y: 0 }, { x: 1200, y: 900 }, [Skia.Color('#8fa3b8'), Skia.Color('#4b5563'), Skia.Color('#1f2937')], [0, 0.5, 1], 0));
  lc.drawRect(Skia.XYWHRect(0, 0, 1200, 900), lgrad);
  lc.drawCircle(600, 330, 110, fillC('#c98f68'));
  lc.drawRRect(Skia.RRectXY(Skia.XYWHRect(420, 430, 360, 470), 110, 110), fillC('#b87c57'));
  lp.flush(); const landscape = lp.makeImageSnapshot();
  renderPhoto({ ...session, aspect: 'story' }, 'gym_landscape_story_fitted', landscape, { zoom: 0.01, cx: 0.5, cy: 0.5 });
  renderPhoto({ ...session, aspect: 'story' }, 'gym_landscape_story_cover', landscape);
  renderPhoto({ ...sessionExtras, aspect: 'story' }, 'gym_session_story_extras', gymPhoto, { zoom: 1.2, cx: 0.5, cy: 0.42 });

  // ── Photo looks (founder, 2026-09-27: "a tint or filter ... Almost like
  // Instagram filters") -- every look, at its default strength, on the
  // existing gym-photo fixture, as a session story.
  const sheetTiles = [];
  photoLooks.PHOTO_LOOKS.forEach((look) => {
    const name = `look_${look.key}_gym_story`;
    renderPhoto({ ...session, aspect: 'story', photoLook: look.key, photoLookStrength: photoLooks.DEFAULT_LOOK_STRENGTH }, name, gymPhoto);
    sheetTiles.push({ path: path.join(OUT, `${name}.png`), label: `${look.key} gym` });
  });

  // ── Legibility (lead update, 2026-09-27, relaying the founder: "make sure
  // ... the text ... still looks good and stands out") -- a deliberately
  // bright, near-white photo with a light warm cast, every look at its OWN
  // start strength (photoLooks.js startStrengthFor), same session story.
  // Paired with the pinned CanvasKit contrast test in
  // photoLookLegibility.test.js; these are for eyeballing only.
  const bp = Skia.Surface.MakeOffscreen(900, 1200);
  const brightPaint = Skia.Paint(); brightPaint.setColor(Skia.Color('#F2EAD8'));
  bp.getCanvas().drawRect(Skia.XYWHRect(0, 0, 900, 1200), brightPaint);
  bp.flush();
  const brightPhoto = bp.makeImageSnapshot();
  photoLooks.PHOTO_LOOKS.forEach((look) => {
    const name = `look_${look.key}_bright_story`;
    const strength = photoLooks.startStrengthFor(look.key);
    renderPhoto({ ...session, aspect: 'story', photoLook: look.key, photoLookStrength: strength }, name, brightPhoto);
    sheetTiles.push({ path: path.join(OUT, `${name}.png`), label: `${look.key} bright ${strength}` });
  });

  // ── Light theme (founder, 2026-09-27: "different share themes (light and
  // dark)") -- the session card in every format, the PR/milestone/weekly
  // cards with no photo, and a session story WITH a photo.
  ['square', 'portrait', 'story'].forEach((aspect) => {
    const name = `light_session_${aspect}`;
    render({ ...session, aspect, theme: 'light' }, 1080, name);
    sheetTiles.push({ path: path.join(OUT, `${name}.png`), label: name });
  });
  [['pr', pr], ['milestone', milestone], ['weekly', weekly]].forEach(([n, prm]) => {
    const name = `light_${n}_square`;
    render({ ...prm, aspect: 'square', theme: 'light' }, 1080, name);
    sheetTiles.push({ path: path.join(OUT, `${name}.png`), label: name });
  });
  {
    const name = 'light_session_story_photo';
    renderPhoto({ ...session, aspect: 'story', theme: 'light' }, name, gymPhoto);
    sheetTiles.push({ path: path.join(OUT, `${name}.png`), label: name });
  }

  composeContactSheet(Skia, typefaces, sheetTiles, path.join(OUT, 'sheet.png'));

  console.log(`\nWrote PNGs to ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
