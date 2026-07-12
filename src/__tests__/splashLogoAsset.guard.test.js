/**
 * EP-05 / VR-01 (docs end-user-polish audit 2026-07-12) source guard.
 *
 * The splash source used to be assets/volyume-splash-hero.png, a 1242x2436
 * fully transparent canvas whose only visible artwork was an 836x353 wordmark
 * near the middle. The locked Expo splash pipeline treats its input as a logo
 * and contains the WHOLE canvas inside a small logo box (100pt iOS / 200dp
 * Android), so the wordmark rendered at roughly 34x15pt -- a tiny mark
 * floating in a large field, on every cold launch.
 *
 * Fix: ship a tightly cropped wordmark (assets/volyume-splash-logo.png) and
 * pass an explicit imageWidth so the pipeline scales the mark to a deliberate
 * size. This guard pins that the plugin points at the cropped asset (light and
 * dark), that an explicit imageWidth is set, and that the asset really is a
 * tight, wide wordmark rather than a tall full-screen canvas.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const APP_JSON = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const LOGO_REL = './assets/volyume-splash-logo.png';

function splashConfig() {
  const plugin = APP_JSON.expo.plugins.find(
    p => Array.isArray(p) && p[0] === 'expo-splash-screen',
  );
  return plugin && plugin[1];
}

// Minimal PNG dimension read: IHDR width/height are big-endian uint32 at
// byte offsets 16 and 20. Avoids pulling in an image library for a test.
function pngSize(absPath) {
  const buf = fs.readFileSync(absPath);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('EP-05/VR-01: splash uses a tightly cropped wordmark with an explicit width', () => {
  test('the splash plugin points at the cropped logo asset (light and dark)', () => {
    const config = splashConfig();
    expect(config).toBeTruthy();
    expect(config.image).toBe(LOGO_REL);
    expect(config.dark.image).toBe(LOGO_REL);
  });

  test('an explicit imageWidth is set so the mark is not left in the default logo box', () => {
    const config = splashConfig();
    expect(typeof config.imageWidth).toBe('number');
    expect(config.imageWidth).toBeGreaterThan(0);
  });

  test('the cropped asset exists and is a tight, wide wordmark, not a full-screen canvas', () => {
    const abs = path.join(ROOT, 'assets', 'volyume-splash-logo.png');
    expect(fs.existsSync(abs)).toBe(true);
    const { width, height } = pngSize(abs);
    // Much smaller than the old 1242x2436 canvas, and wider than it is tall.
    expect(width).toBeLessThan(1242);
    expect(height).toBeLessThan(1000);
    expect(width).toBeGreaterThan(height);
  });
});
