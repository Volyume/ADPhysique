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
 * Fonts: uses Liberation Sans (Arial-metric-compatible) from the OS if present;
 * device builds use the platform system font. Layout is measured per-font, so it
 * adapts either way.
 */
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || '/tmp';
const FONT_BOLD = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
const FONT_REG = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';

function loadDrawModule() {
  const src = fs.readFileSync(path.join(__dirname, '../src/lib/shareCard/drawShareCard.js'), 'utf8')
    .replace(/export\s+(function|const|let|class)/g, '$1');
  const m = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', `${src}\nmodule.exports={drawShareCard,cardHeight};`)(m, m.exports);
  return m.exports;
}

async function main() {
  const { drawShareCard, cardHeight } = loadDrawModule();
  const ckDir = path.dirname(require.resolve('canvaskit-wasm/package.json'));
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const CK = await require(path.join(ckDir, 'bin/full/canvaskit.js'))({ locateFile: (f) => path.join(ckDir, 'bin/full', f) });
  const { JsiSkApi } = require('@shopify/react-native-skia/lib/commonjs/skia/web/JsiSkia.js');
  const Skia = JsiSkApi(CK);

  const tf = (p) => Skia.Typeface.MakeFreeTypeFaceFromData(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(p))));
  const typefaces = { bold: tf(FONT_BOLD), regular: tf(FONT_REG) };
  const wordmark = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(path.join(__dirname, '../assets/volyume-wordmark.png')))));

  const session = {
    cardType: 'session', sessionName: 'Back + Delts (Width)', planName: 'Push Pull Legs',
    date: 'Sat · 20 Jun 2026', showDate: true, showPlanName: true, showVolume: true, showExercises: true,
    workingSets: 4, duration: 0, tonnage: 304, exerciseCount: 5, prCount: 0, intensityTier: 'solid',
    exercises: ['Lat Pulldown', 'Seated Row', 'Lateral Raise', 'Face Pull', 'Rear Delt Fly'],
    topSet: { weight: 90, reps: 8, exerciseName: 'Lat Pulldown' },
  };
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
    const H = cardHeight(width, params.isSquare);
    const surf = Skia.Surface.MakeOffscreen(width, H);
    drawShareCard(surf.getCanvas(), { Skia, width, params, typefaces, wordmark });
    surf.flush();
    fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(surf.makeImageSnapshot().encodeToBytes()));
    console.log(`${name}  ${width}x${H}`);
  };

  const premiumMilestone = { cardType: 'milestone', premium: true, eyebrow: 'Perfect month', title: 'A perfect month', showDate: true, date: 'Sun · 22 Jun 2026', heroValue: '4', heroUnit: 'weeks on target', caption: 'Four weeks running, every session and target met.', stats: [{ label: 'Weeks', value: '4' }, { label: 'Sessions', value: '16' }] };
  const tonnage = { cardType: 'milestone', premium: true, eyebrow: 'Lifetime total', title: 'Total weight lifted', showDate: true, date: 'Sun · 22 Jun 2026', heroValue: '1,000,000', heroUnit: 'kg lifted', caption: 'Every working set you have ever logged, added up.', stats: [] };

  [['session', session], ['pr', pr], ['milestone', milestone], ['weekly', weekly], ['weeklyLift', weeklyLift], ['premium', premiumMilestone], ['tonnage', tonnage]].forEach(([n, p]) => {
    render({ ...p, isSquare: true }, 1080, `card_${n}_square`);
    render({ ...p, isSquare: false }, 1080, `card_${n}_story`);
  });

  // Gym-photo background: a synthetic bright/varied "photo" to check the scrim +
  // cover-fit keep white/amber text legible over a real image.
  const ps = Skia.Surface.MakeOffscreen(600, 600); const pc = ps.getCanvas();
  const block = (x, y, w, h, hex) => { const pt = Skia.Paint(); pt.setColor(Skia.Color(hex)); pc.drawRect(Skia.XYWHRect(x, y, w, h), pt); };
  block(0, 0, 600, 600, '#d8d2c4'); block(0, 0, 300, 600, '#b9a886'); block(150, 350, 450, 250, '#5a4a2e'); block(380, 60, 220, 220, '#e9e4d6');
  ps.flush(); const photo = ps.makeImageSnapshot();
  const renderPhoto = (params, name) => {
    const H = cardHeight(1080, params.isSquare);
    const surf = Skia.Surface.MakeOffscreen(1080, H);
    drawShareCard(surf.getCanvas(), { Skia, width: 1080, params, typefaces, wordmark, bgPhoto: photo });
    surf.flush();
    fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(surf.makeImageSnapshot().encodeToBytes()));
    console.log(`${name}  1080x${H}`);
  };
  renderPhoto({ ...weekly, isSquare: true }, 'photo_weekly');
  renderPhoto({ ...session, isSquare: true }, 'photo_session');
  renderPhoto({ ...pr, isSquare: true }, 'photo_pr');
  console.log(`\nWrote PNGs to ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
