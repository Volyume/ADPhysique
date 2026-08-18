/**
 * VOLYUME-2V regression: a missing wordmark IMAGE must never stop a card.
 *
 * Founder device failure 2026-08-18 - the share screen showed "Couldn't
 * build the preview" and both share buttons were dead, on a plain dark
 * session card with no photo. The Sentry event named the cause exactly:
 * `renderer inputs missing`. The only asynchronously-loaded renderer input
 * is the wordmark PNG, and both the render guard AND `cardReady` (which
 * gates the buttons) required it - so one unavailable decorative asset took
 * the whole feature down, silently, because its loader swallowed errors.
 *
 * The law this pins: the brand mark is an ORNAMENT. The footer already
 * reserves its space and still prints "volyume.app", so a card without the
 * image is still a branded card - and it must render and export.
 */
import fs from 'fs';
import path from 'path';
import { drawShareCard, cardHeight } from '../drawShareCard';

const FONT_BOLD = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
const FONT_REG = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';
let ckPkg = null;
try { ckPkg = require.resolve('canvaskit-wasm/package.json'); } catch (_) { /* absent */ }
const CAN_TRY = !!ckPkg && fs.existsSync(FONT_BOLD) && fs.existsSync(FONT_REG);

const SCREEN = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'screens', 'ShareCardScreen.js'),
  'utf8',
);

describe('the wordmark image is an ornament, not a gate (VOLYUME-2V)', () => {
  test('readiness and the render guard do NOT require the wordmark image', () => {
    expect(SCREEN).toMatch(/const cardReady = !!\(Skia && typefaces\);/);
    expect(SCREEN).not.toMatch(/!Skia \|\| !typefaces \|\| !wordmark/);
    expect(SCREEN).not.toMatch(/if \(!typefaces \|\| !wordmark\)/);
  });

  test('the wordmark loader reports failures instead of swallowing them', () => {
    // The silent `catch (_) {}` is what made this invisible for a whole walk.
    expect(SCREEN).toMatch(/logError\('ShareCardScreen\.wordmarkLoad'/);
  });

  test('every card type still draws on the story aspect with wordmark = null', async () => {
    if (!CAN_TRY) return;
    const ckDir = path.dirname(ckPkg);
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const CK = await require(path.join(ckDir, 'bin/full/canvaskit.js'))({ locateFile: (f) => path.join(ckDir, 'bin/full', f) });
    const { JsiSkApi } = require('@shopify/react-native-skia/lib/commonjs/skia/web/JsiSkia.js');
    const Skia = JsiSkApi(CK);
    const tf = (p) => Skia.Typeface.MakeFreeTypeFaceFromData(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(p))));
    const typefaces = { bold: tf(FONT_BOLD), regular: tf(FONT_REG) };
    const base = {
      sessionName: 'Lower + Abs', workingSets: 6, duration: 13, tonnage: 318,
      exerciseCount: 7, exercises: ['Squat'], units: 'kg', intensityTier: 'solid',
      showVolume: true, showDate: true, date: 'Tue · 18 Aug 2026',
      exerciseName: 'Bench Press', weight: 120, reps: 5, showPRWeight: true,
      eyebrow: 'Year of Lifts', title: '2026', heroValue: '1,240,000', heroUnit: 'kg',
      tierLabel: 'Textbook Week', hero: { heading: 'weight lost', value: '0.7 kg' },
      stats: [{ label: 'Sessions', value: '4' }],
    };
    for (const cardType of ['session', 'pr', 'milestone', 'weekly']) {
      const width = 540;
      const H = cardHeight(width, false, 'story');
      const surface = Skia.Surface.MakeOffscreen(width, H);
      expect(() => {
        drawShareCard(surface.getCanvas(), {
          Skia, width, typefaces, wordmark: null,
          params: { ...base, cardType, aspect: 'story' },
        });
      }).not.toThrow();
      surface.flush();
      expect(surface.makeImageSnapshot().encodeToBytes().length).toBeGreaterThan(1000);
    }
  });
});
