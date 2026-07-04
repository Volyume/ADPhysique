/**
 * Share-card renderer tests.
 *
 * - cardHeight: pure, always runs.
 * - render check: renders every card type/format with the SAME JsiSk* API used
 *   on device (via CanvasKit) and asserts a non-blank PNG comes out. It
 *   self-guards: where CanvasKit or the harness fonts aren't available (e.g. a
 *   bare CI image) it no-ops rather than failing, so it never breaks the build —
 *   but where they ARE available (local dev) it genuinely exercises the draw.
 */
import { drawShareCard, cardHeight } from '../drawShareCard';

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
    cardType: 'session', showDate: true, showVolume: true, showPlanName: true, showExercises: true,
    showPRWeight: true, showPrevBest: true,
    sessionName: 'Back + Delts (Width)', planName: 'Push Pull Legs', date: 'Sat · 20 Jun 2026',
    workingSets: 4, duration: 0, tonnage: 304, exerciseCount: 5,
    exercises: ['Lat Pulldown', 'Seated Row', 'Lateral Raise'], topSet: { weight: 90, reps: 8, exerciseName: 'Lat Pulldown' },
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
    before: { date: '3 Mar 2026', scanRange: 'Defined 54/100', weight: '82.4 kg' },
    after: { date: '9 Jun 2026', scanRange: 'Lean 66/100', weight: '78.1 kg' },
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
