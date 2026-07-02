/**
 * lazyScreens.guard.test.js — source guards for the F6b boot-cost fixes
 * (audit PR-2 / PR-3 / UI-7) and the lazy-tab navigation rule that keeps
 * them safe.
 *
 * PR-3: RootNavigator used to statically import every screen, so the whole
 * ~80-screen module graph (react-native-vision-camera included) evaluated
 * synchronously in one turn at boot on the black pre-theme placeholder.
 * Screens are now defined via lazyScreen(() => require('../screens/X')),
 * which defers each module's evaluation to that screen's first render.
 * One static screen import quietly reintroduced ANYWHERE in product source
 * re-eagerises that screen's whole graph at boot and normalises the next
 * one, so the posture is pinned across src/: no static screen imports in
 * any spelling (either quote style, multi-line, side-effect, export-from,
 * dynamic import()), and screen requires only inside RootNavigator's
 * lazyScreen loaders.
 *
 * PR-2/UI-7: the bottom-tab navigator shipped with lazy={false} — a
 * deprecated navigator prop (silently ignored by react-navigation v7) that
 * mounted all five tab stacks and ran their data effects in one commit at
 * boot, with no recorded rationale. Tabs are now default-lazy; this suite
 * keeps the prop from creeping back in either spelling.
 *
 * LAZY-TAB NAVIGATION RULE (Wave 4 review finding, verified against
 * @react-navigation/core useNavigationBuilder): a nested cross-tab
 * navigate('XTab', { screen: 'Y' }) into a NEVER-FOCUSED lazy tab mounts
 * that stack with Y as its ONLY route — no back button, and the tab's real
 * root is unreachable until app restart. initial: false restores the
 * eager-era push-over-root behaviour. Every nested cross-tab navigate in
 * product source must therefore carry initial: false; this suite enforces
 * it so the next call site cannot regress the fix.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');

const NAV = fs.readFileSync(path.join(SRC, 'navigation', 'RootNavigator.js'), 'utf8');

// Product source only (tests are not navigation or boot surfaces).
function listSourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) listSourceFiles(p, out);
    else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) out.push(p);
  }
  return out;
}

const sources = listSourceFiles(SRC).map((p) => ({
  file: path.relative(SRC, p).split(path.sep).join('/'),
  text: fs.readFileSync(p, 'utf8'),
}));

describe('PR-3: screens are deferred, never statically imported', () => {
  test('no eager screen-module reference exists anywhere in product source', () => {
    // Any module specifier pointing into the screens folder counts, in any
    // spelling: static import (with or without a binding, single- or
    // double-quoted, multi-line), export-from, or dynamic import(). The
    // sanctioned form — require() inside a lazyScreen loader — is handled
    // by the next test; requires are excluded here.
    const specifier = "(['\"])(?:\\.{1,2}\\/)+screens\\/\\w+\\1";
    const patterns = [
      new RegExp(`import\\s[\\s\\S]{0,200}?from\\s*${specifier}`),
      new RegExp(`import\\s*${specifier}`),
      new RegExp(`export\\s[\\s\\S]{0,100}?from\\s*${specifier}`),
      new RegExp(`import\\(\\s*${specifier}\\s*\\)`),
    ];
    const offences = sources
      .filter((s) => patterns.some((re) => re.test(s.text)))
      .map((s) => s.file);
    expect(offences).toEqual([]);
  });

  test('screen requires exist only in RootNavigator, inside lazyScreen loaders', () => {
    // A bare top-level require('../screens/X') anywhere would evaluate at
    // module scope — the same boot cost as a static import, just spelt
    // differently. In RootNavigator every screens require must share a line
    // with its lazyScreen loader arrow (withProGuard composing inside the
    // loader is fine); outside RootNavigator, none may exist at all.
    const requireRe = /require\(\s*(['"])(?:\.{1,2}\/)+screens\/\w+\1\s*\)/;
    const offences = [];
    for (const s of sources) {
      if (!requireRe.test(s.text)) continue;
      if (s.file !== 'navigation/RootNavigator.js') {
        offences.push(s.file);
        continue;
      }
      for (const line of s.text.split('\n')) {
        if (requireRe.test(line) && !/lazyScreen\(\(\)\s*=>/.test(line)) {
          offences.push(`${s.file}: ${line.trim()}`);
        }
      }
    }
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
        /require\(\s*['"](?:\.{1,2}\/)+screens\//.test(line) &&
        !/require\(\s*(['"])(?:\.{1,2}\/)+screens\/\w+\1\s*\)\.default/.test(line)
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

describe('lazy-tab rule: nested cross-tab navigates carry initial: false', () => {
  test('every navigate("XTab", { screen: ... }) includes initial: false', () => {
    // Bounded window: the options object (screen, params, comments) sits
    // within 600 characters of the opening brace in every current site;
    // a longer object should be restructured, not exempted.
    const navRe = /navigate\(\s*['"](\w+Tab)['"]\s*,\s*\{/g;
    const offences = [];
    for (const s of sources) {
      let m;
      while ((m = navRe.exec(s.text)) !== null) {
        const window = s.text.slice(m.index, m.index + 600);
        if (!/screen\s*:/.test(window)) continue; // tab-only navigate: exempt
        if (!/initial:\s*false/.test(window)) {
          const line = s.text.slice(0, m.index).split('\n').length;
          offences.push(`${s.file}:${line} navigate('${m[1]}', { screen: ... }) without initial: false`);
        }
      }
    }
    expect(offences).toEqual([]);
  });

  test('the notification-tap navigate carries initial: false', () => {
    // The onTap effect is the one cross-tab navigate that fires without any
    // user context on screen (cold-start included) — the exact scenario
    // that strands a lazy tab's root. Pinned directly.
    const onTapAt = NAV.indexOf('routeForNotificationType(type, data)');
    expect(onTapAt).toBeGreaterThanOrEqual(0);
    const onTapWindow = NAV.slice(onTapAt, onTapAt + 900);
    expect(onTapWindow).toMatch(/initial:\s*false/);
  });
});
