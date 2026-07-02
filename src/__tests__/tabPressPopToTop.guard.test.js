/**
 * NAV-5 (audit 02): pressing the tab you are ALREADY on pops that tab's stack
 * to its root (the standard re-tap-to-root pattern). Switching tabs must NOT
 * pop, so returning to a tab preserves the user's place (mid-FoodSearch,
 * mid-workout-history, and so on).
 *
 * Source-level regression guard (same style as proOnboarding.sexGate.test.js):
 * every tabPress listener in RootNavigator must gate its popToTop dispatch on
 * navigation.isFocused(). A future edit that reintroduces an unconditional
 * pop fails here.
 */
import fs from 'fs';
import path from 'path';

function read(rel) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');
}

describe('tab press pops to root only when the tab is already focused (NAV-5)', () => {
  const src = read('src/navigation/RootNavigator.js');
  const blocks = src.split("addListener('tabPress'").slice(1);

  test('all five tab stacks register a tabPress listener', () => {
    expect(blocks).toHaveLength(5);
  });

  test('every tabPress listener guards popToTop on navigation.isFocused()', () => {
    for (const block of blocks) {
      // Look only at this listener's body (up to the effect's close).
      const body = block.slice(0, block.indexOf('}, [navigation]'));
      const popIdx = body.indexOf('popToTop');
      expect(popIdx).toBeGreaterThan(-1);
      const focusIdx = body.indexOf('isFocused()');
      // The focus check must exist and come BEFORE the pop dispatch.
      expect(focusIdx).toBeGreaterThan(-1);
      expect(focusIdx).toBeLessThan(popIdx);
    }
  });

  test('no unconditional popToTop dispatch remains in a tabPress listener', () => {
    for (const block of blocks) {
      const body = block.slice(0, block.indexOf('}, [navigation]'));
      expect(body).toMatch(/if\s*\(\s*!navigation\.isFocused\(\)\s*\)\s*return;/);
    }
  });
});
