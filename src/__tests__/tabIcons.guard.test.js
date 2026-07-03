/**
 * tabIcons.guard.test.js — mixed-icon-weight guard.
 *
 * The bottom tab bar (RootNavigator screenOptions.tabBarIcon, rendered by
 * VolyumeTabBar) must use the standard Ionicons focused/unfocused pair for
 * every tab: `focused ? 'name' : 'name-outline'`. A baked-in filled icon on
 * any entry (e.g. always 'home' instead of 'home-outline' when unfocused)
 * makes that tab read as permanently selected regardless of which screen is
 * active. This guard pins the ternary pattern for every icon entry in the
 * `icons` map and fails if any unfocused branch resolves to a non-outline
 * icon name.
 */
import fs from 'fs';
import path from 'path';

function read(rel) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');
}

const ROOT_NAVIGATOR = 'src/navigation/RootNavigator.js';

describe('tab bar icon guard: every tab uses the focused/outline pair', () => {
  const src = read(ROOT_NAVIGATOR);

  test('tabBarIcon defines an icons map keyed by route name', () => {
    expect(src).toMatch(/tabBarIcon:\s*\(\{\s*focused,\s*color\s*\}\)\s*=>/);
    expect(src).toMatch(/const icons = \{/);
  });

  test('every icons map entry follows the focused ternary pattern with a matching -outline pair', () => {
    // Isolate the `const icons = { ... }` object body so the check cannot
    // accidentally match unrelated code elsewhere in the file.
    const mapMatch = src.match(/const icons = \{([\s\S]*?)\};/);
    expect(mapMatch).not.toBeNull();
    const body = mapMatch[1];

    // Every entry must read: SomeTab: focused ? 'name' : 'name-outline',
    const entryRe = /(\w+):\s*focused\s*\?\s*'([a-zA-Z0-9-]+)'\s*:\s*'([a-zA-Z0-9-]+)'/g;
    const entries = [];
    let m;
    while ((m = entryRe.exec(body)) !== null) {
      entries.push({ tab: m[1], focusedIcon: m[2], unfocusedIcon: m[3] });
    }

    // Every tab in the map must have been parsed by the ternary pattern —
    // a baked-in single icon (no ternary) would not match entryRe and would
    // fail this count check.
    const declaredTabs = body.match(/^\s*(\w+):/gm) || [];
    expect(entries.length).toBe(declaredTabs.length);
    expect(entries.length).toBeGreaterThan(0);

    const offences = [];
    for (const { tab, focusedIcon, unfocusedIcon } of entries) {
      // The unfocused branch must be the outline variant of the focused icon.
      if (unfocusedIcon !== `${focusedIcon}-outline`) {
        offences.push(`${tab}: focused='${focusedIcon}' unfocused='${unfocusedIcon}' (expected '${focusedIcon}-outline')`);
      }
      // Belt-and-braces: the unfocused branch must never be a filled name
      // (i.e. it must end in '-outline').
      if (!unfocusedIcon.endsWith('-outline')) {
        offences.push(`${tab}: unfocused icon '${unfocusedIcon}' is not an outline variant`);
      }
    }
    expect(offences).toEqual([]);
  });
});
