/**
 * Navigation integrity test, verifies every `navigation.navigate('X')` and
 * `navigation.replace('X')` call in the codebase resolves to a screen that
 * is actually registered in RootNavigator. Catches "button tap → nothing
 * happens" bugs before they ship.
 *
 * Also runs in reverse: warns about screens registered in RootNavigator
 * that are never navigated to from anywhere (potential dead routes).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const NAV_PATH = path.join(ROOT, 'src/navigation/RootNavigator.js');
const SRC_DIRS = ['src/screens', 'src/components', 'App.js'];

/** Extract every Stack.Screen name="X" registration in RootNavigator. */
function collectRegisteredScreens() {
  const text = fs.readFileSync(NAV_PATH, 'utf-8');
  const names = new Set();
  const stackRe = /Stack\.Screen\s+name=["']([^"']+)["']/g;
  let m;
  while ((m = stackRe.exec(text))) names.add(m[1]);
  // Tabs registered in MainTabs (HomeTab/PlansTab/ProgressTab/YouTab)
  const tabRe = /Tab\.Screen\s+name=["']([^"']+)["']/g;
  while ((m = tabRe.exec(text))) names.add(m[1]);
  return names;
}

/** Extract every navigation target referenced from screens / components. */
function collectNavigationTargets() {
  const refs = []; // [{file, line, target, kind}]
  const navCallRe = /navigation\.(?:navigate|replace|push)\(\s*['"`]([A-Z][\w]+)['"`]/g;
  const navAttrRe = /\bgetParent\(\)\??\.(?:navigate|replace|push)\(\s*['"`]([A-Z][\w]+)['"`]/g;
  // Also catch screen-options style: `screen: 'X'` inside nested navigate calls
  const nestedScreenRe = /screen:\s*['"`]([A-Z][\w]+)['"`]/g;

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const stat = fs.statSync(dir);
    if (stat.isFile() && dir.endsWith('.js')) {
      const text = fs.readFileSync(dir, 'utf-8');
      const lines = text.split('\n');
      for (const re of [navCallRe, navAttrRe, nestedScreenRe]) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(text))) {
          const target = m[1];
          // Find the line number
          const before = text.slice(0, m.index);
          const line = (before.match(/\n/g) || []).length + 1;
          refs.push({ file: path.relative(ROOT, dir), line, target });
        }
      }
      return;
    }
    if (stat.isDirectory()) {
      for (const f of fs.readdirSync(dir)) {
        if (f === '__tests__' || f === 'node_modules') continue;
        walk(path.join(dir, f));
      }
    }
  }

  for (const d of SRC_DIRS) walk(path.join(ROOT, d));
  return refs;
}

describe('navigation integrity', () => {
  const registered = collectRegisteredScreens();
  const refs = collectNavigationTargets();

  test('RootNavigator registers a non-trivial number of screens', () => {
    expect(registered.size).toBeGreaterThanOrEqual(30);
  });

  test('every navigation target is registered somewhere', () => {
    // Tab roots (HomeTab/PlansTab/ProgressTab/YouTab) and pseudo-screens
    // used by nested navigators count as valid.
    const allowed = new Set([
      ...registered,
      // Add any deliberately-unregistered targets here if they're handled
      // by deep linking or external navigation.
    ]);
    const unknown = refs.filter(r => !allowed.has(r.target));
    if (unknown.length > 0) {
      const lines = unknown.map(r => `  ${r.file}:${r.line} → navigate('${r.target}')`).join('\n');
      throw new Error(`Unknown navigation targets:\n${lines}`);
    }
  });

  // Soft check, surfaces potentially dead routes but doesn't fail the build
  test('flag screens that are registered but never navigated to', () => {
    const referenced = new Set(refs.map(r => r.target));
    // Some registered names are tab roots or first screens, they're
    // entered by tab press / initial route, not via navigate(). Exempt
    // a small allowlist.
    const exempt = new Set([
      'HomeTab', 'PlansTab', 'ProgressTab', 'ProfileTab',
      'Home', 'Plans', 'Progress', 'You',
      'Welcome', 'Login', 'FirstRun',
    ]);
    const orphans = [];
    for (const name of registered) {
      if (referenced.has(name)) continue;
      if (exempt.has(name)) continue;
      orphans.push(name);
    }
    // Soft assertion, log but don't fail unless extreme
    if (orphans.length > 0) {
      // eslint-disable-next-line no-console
      console.log('[nav-integrity] registered but never navigated to:', orphans.join(', '));
    }
    // Hard cap to catch a future spike (e.g. 20+ dead routes)
    expect(orphans.length).toBeLessThan(20);
  });

  test('every navigate call uses a PascalCase screen name', () => {
    const badCase = refs.filter(r => !/^[A-Z][A-Za-z0-9]+$/.test(r.target));
    expect(badCase).toEqual([]);
  });
});
