/**
 * D149 (founder, 2026-09-05): no splash screen at all.
 *
 * History: EP-05 / VR-01 (2026-07-12) shipped a tightly cropped wordmark as
 * the native splash image; D148 (2026-09-04) removed the in-app brand
 * splash; D149 removes the brand mark from the native launch frame too.
 * The OS insists on a launch frame (an iOS launch storyboard, the Android
 * 12+ system splash), so the nearest thing to "no splash" is a plain
 * charcoal frame: the expo-splash-screen plugin points at a fully
 * transparent image, the frame is the app background colour, and the
 * first screen fades in the moment the boot gate lifts.
 *
 * This guard pins: the plugin (light and dark) points at the blank asset;
 * that asset really is fully transparent; the old wordmark assets are gone
 * so nobody re-points at them; and RootNavigator holds the frame for no
 * minimum time (the 1.6 s first-run "brand hold" is gone).
 */
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const ROOT = path.join(__dirname, '..', '..');
const APP_JSON = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const NAV = fs.readFileSync(path.join(ROOT, 'src', 'navigation', 'RootNavigator.js'), 'utf8');
const BLANK_REL = './assets/volyume-splash-blank.png';

function splashConfig() {
  const plugin = APP_JSON.expo.plugins.find(
    p => Array.isArray(p) && p[0] === 'expo-splash-screen',
  );
  return plugin && plugin[1];
}

describe('D149: the native launch frame is a plain charcoal frame, not a splash', () => {
  test('the splash plugin points at the blank asset (light and dark)', () => {
    const config = splashConfig();
    expect(config).toBeTruthy();
    expect(config.image).toBe(BLANK_REL);
    expect(config.dark.image).toBe(BLANK_REL);
    expect(typeof config.imageWidth).toBe('number');
    expect(config.imageWidth).toBeGreaterThan(0);
  });

  test('the blank asset exists and every pixel is fully transparent', () => {
    const abs = path.join(ROOT, 'assets', 'volyume-splash-blank.png');
    expect(fs.existsSync(abs)).toBe(true);
    const png = PNG.sync.read(fs.readFileSync(abs));
    expect(png.width).toBeGreaterThan(0);
    expect(png.height).toBeGreaterThan(0);
    let maxAlpha = 0;
    for (let i = 3; i < png.data.length; i += 4) maxAlpha = Math.max(maxAlpha, png.data[i]);
    expect(maxAlpha).toBe(0);
  });

  test('the old wordmark splash assets are gone', () => {
    expect(fs.existsSync(path.join(ROOT, 'assets', 'volyume-splash-logo.png'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'assets', 'volyume-splash-hero.png'))).toBe(false);
    expect(JSON.stringify(APP_JSON)).not.toMatch(/volyume-splash-(logo|hero)/);
  });

  test('RootNavigator holds the launch frame for no minimum time', () => {
    expect(NAV).not.toMatch(/SPLASH_MIN_MS\s*=/);
    expect(NAV).not.toMatch(/setTimeout\(\(\) => setSplashReady\(true\)/);
    // splashReady is released purely by the readiness flags, for first-run
    // users as much as returning ones.
    expect(NAV).toMatch(/if \(firstRunChecked && tierChecked\) \{\s*setSplashReady\(true\);/);
  });
});
