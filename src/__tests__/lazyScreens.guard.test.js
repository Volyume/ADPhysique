/**
 * lazyScreens.guard.test.js — source guards for the F6b boot-cost fixes
 * (audit PR-2 / PR-3 / UI-7).
 *
 * PR-3: RootNavigator used to statically import every screen, so the whole
 * ~80-screen module graph (react-native-vision-camera included) evaluated
 * synchronously in one turn at boot on the black pre-theme placeholder.
 * Screens are now defined via lazyScreen(() => require('../screens/X')),
 * which defers each module's evaluation to that screen's first render.
 * One static screen import quietly reintroduced at the top of the file
 * undoes the win for that screen and normalises the next one, so the
 * posture is pinned here: NO static screen imports, and every screen
 * require lives inside a lazyScreen loader.
 *
 * PR-2/UI-7: the bottom-tab navigator shipped with lazy={false} — a
 * deprecated navigator prop (silently ignored by react-navigation v7) that
 * mounted all five tab stacks and ran their data effects in one commit at
 * boot, with no recorded rationale. Tabs are now default-lazy; this suite
 * keeps the prop from creeping back in either spelling.
 */
import fs from 'fs';
import path from 'path';

const NAV = fs.readFileSync(
  path.resolve(__dirname, '..', 'navigation', 'RootNavigator.js'),
  'utf8'
);

describe('PR-3: screens are deferred, never statically imported', () => {
  test('no static import of a screen module remains', () => {
    // import Anything from '../screens/...' — the eager form this guard
    // exists to keep out. (Named-import form included for completeness.)
    const offences = NAV.split('\n').filter((line) =>
      /^import\s+[\w{},\s*]+\s+from\s+['"]\.\.\/screens\//.test(line)
    );
    expect(offences).toEqual([]);
  });

  test('every screen require sits inside a lazyScreen loader on the same line', () => {
    // A bare top-level require('../screens/X') would evaluate at module
    // scope — the same boot cost as a static import, just spelt
    // differently. Requiring the loader arrow on the same line keeps the
    // check honest without a parser. withProGuard composing inside the
    // loader is fine (the Gated* definitions); a require outside any
    // loader is not.
    const offences = NAV.split('\n').filter(
      (line) =>
        line.includes("require('../screens/") &&
        !/lazyScreen\(\(\)\s*=>/.test(line)
    );
    expect(offences).toEqual([]);
  });

  test('the lazy mechanism itself is present at real scale', () => {
    // The app registers ~80 screens. If this count collapses, either the
    // mechanism was deleted or screens moved somewhere this guard cannot
    // see — both need a deliberate review, not a quiet diff.
    const count = (NAV.match(/lazyScreen\(\(\)\s*=>/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(70);
  });

  test('every loader takes the module default export', () => {
    // require('../screens/X') without .default hands React the module
    // namespace object, which throws at first render of that screen only —
    // easy to miss in review, guaranteed crash in the field.
    const offences = NAV.split('\n').filter(
      (line) =>
        line.includes("require('../screens/") &&
        !/require\('\.\.\/screens\/\w+'\)\.default/.test(line)
    );
    expect(offences).toEqual([]);
  });
});

describe('PR-2/UI-7: bottom tabs stay default-lazy', () => {
  test('lazy={false} / lazy: false never reappears', () => {
    expect(NAV).not.toMatch(/lazy=\{false\}/);
    expect(NAV).not.toMatch(/lazy:\s*false/);
  });
});
