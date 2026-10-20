/**
 * otaUpdates.config.guard.test.js
 *
 * Owner order 2026-10-20 (item 41, F9). Pins the over-the-air update set-up:
 * the fingerprint runtime policy (a JavaScript update can never reach a binary
 * built from different native code), the production channel, no automatic
 * check, one background check at launch that applies on the next cold start
 * (no "Restart now" prompt mid-workout), and failures reported without PII.
 */
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..', '..');
const APP = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const EAS = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
const APP_JS = fs.readFileSync(path.join(root, 'App.js'), 'utf8');

describe('over-the-air update configuration', () => {
  test('runtime version follows the native fingerprint', () => {
    expect(APP.runtimeVersion).toEqual({ policy: 'fingerprint' });
  });
  test('updates point at this project, never check on their own, and ride the production channel', () => {
    expect(APP.updates.url).toBe(`https://u.expo.dev/${APP.extra.eas.projectId}`);
    expect(APP.updates.checkAutomatically).toBe('NEVER');
    expect(APP.updates.fallbackToCacheTimeout).toBe(0);
    expect(APP.updates.requestHeaders['expo-channel-name']).toBe('production');
    expect(EAS.build.production.channel).toBe('production');
  });
  test('the launch check downloads quietly and never restarts the app or prompts', () => {
    expect(APP_JS).toMatch(/Updates\.checkForUpdateAsync\(\)/);
    expect(APP_JS).toMatch(/Updates\.fetchUpdateAsync\(\)/);
    expect(APP_JS).not.toMatch(/Restart now/);
    expect(APP_JS).not.toMatch(/Update available/);
  });
  test('failures are reported under one tag, offline ones as warnings', () => {
    expect(APP_JS).toMatch(/logError\('App\.otaUpdate'/);
    expect(APP_JS).toMatch(/logWarn\('App\.otaUpdate'/);
  });
});
