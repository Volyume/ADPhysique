/**
 * VR-09 (docs audit 2026-07-09/2026-07-12): the native expo-splash-screen
 * plugin used #000000 while the Expo app background and the pre-theme React
 * placeholder in App.js used #0D0D0D, despite a comment there claiming they
 * matched. On OLED screens and slow cold starts this produced a visible
 * black-to-charcoal flash at splash dismissal.
 *
 * Fix: all three now share the single #0D0D0D value. This guard pins
 * app.json's root/adaptive-icon/splash backgroundColor keys and App.js's
 * placeholder so a future edit can't silently reintroduce a mismatch.
 * Only the colour values are pinned here -- not the splash image asset or
 * imageWidth, which are out of this task's scope.
 */
import fs from 'fs';
import path from 'path';

const APP_JSON = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'app.json'), 'utf8'));
const APP_JS = fs.readFileSync(path.join(__dirname, '..', '..', 'App.js'), 'utf8');

const CHARCOAL = '#0D0D0D';

describe('Splash and app background colours all match (#0D0D0D, no black flash)', () => {
  test('app.json root backgroundColor is the charcoal value', () => {
    expect(APP_JSON.expo.backgroundColor).toBe(CHARCOAL);
  });

  test('app.json android adaptiveIcon backgroundColor matches too', () => {
    expect(APP_JSON.expo.android.adaptiveIcon.backgroundColor).toBe(CHARCOAL);
  });

  test('the expo-splash-screen plugin config (light and dark) uses the charcoal value, not black', () => {
    const splashPlugin = APP_JSON.expo.plugins.find(
      p => Array.isArray(p) && p[0] === 'expo-splash-screen',
    );
    expect(splashPlugin).toBeTruthy();
    const [, config] = splashPlugin;
    expect(config.backgroundColor).toBe(CHARCOAL);
    expect(config.dark.backgroundColor).toBe(CHARCOAL);
    // The old mismatched value must not remain anywhere in the plugin config.
    expect(JSON.stringify(config)).not.toMatch(/#000000/i);
  });

  test('App.js pre-theme placeholder background uses the same charcoal value', () => {
    expect(APP_JS).toMatch(/#0D0D0D/);
  });
});
