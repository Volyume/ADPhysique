/**
 * scripts/paper-render/registry.js
 *
 * Reads src/navigation/RootNavigator.js as TEXT and answers "which screens
 * does the app register, in which stack, under which route name, and what are
 * the tabs". The harness takes its tab-bar fixture, its every-screen list and
 * each screen's group from here, so a screen added to (or removed from) the
 * navigator is picked up on the next run instead of the harness going stale
 * the way it did when D231 changed the tabs.
 *
 * Plain Node, no Jest, no React. It parses three shapes, each of which
 * paper-render.test.js cross-checks against its own explicit fixture:
 *   - `<Stack.Screen name="X" component={YScreen} .../>` (one line or split
 *     over three), attributed to the `function ...Stack()` it sits in;
 *   - `<Tab.Screen name="XTab" component={XStack} options={{ title: 'T' }} />`
 *     in MainTabs;
 *   - the `icons` map in MainTabs' tabBarIcon
 *     (`HomeTab: focused ? 'today' : 'today-outline'`).
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const NAVIGATOR = path.join(REPO_ROOT, 'src', 'navigation', 'RootNavigator.js');

// Stacks that are not tabs: the signed-out, consent and onboarding flows.
const PRE_MAIN_STACKS = new Set(['WelcomeStack', 'Article9ConsentStack', 'ProOnboardingStack']);

function readNavigator() {
  return fs.readFileSync(NAVIGATOR, 'utf8');
}

function enclosingFunctionStarts(src) {
  const starts = [];
  const re = /^function (\w+Stack|MainTabs)\b/gm;
  let m;
  while ((m = re.exec(src))) starts.push({ index: m.index, name: m[1] });
  return starts;
}

/** Every `<Stack.Screen>` registration: { stack, route, component }. */
function parseStackScreens(src = readNavigator()) {
  const starts = enclosingFunctionStarts(src);
  const rows = [];
  const patterns = [
    /<Stack\.Screen\s+name="(\w+)"\s+component=\{(\w+)\}/g,
    /<Stack\.Screen\s*\n\s*name="(\w+)"\s*\n\s*component=\{(\w+)\}/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(src))) {
      let stack = null;
      for (const s of starts) if (s.index < m.index) stack = s.name;
      rows.push({ stack, route: m[1], component: m[2], index: m.index });
    }
  }
  rows.sort((a, b) => a.index - b.index);
  return rows.map(({ stack, route, component }) => ({ stack, route, component }));
}

/** The tabs, in order: [{ name, stack, title, icon, iconOutline }]. */
function parseTabs(src = readNavigator()) {
  const tabs = [];
  const re = /<Tab\.Screen name="(\w+)" component=\{(\w+)\} options=\{\{ title: '([^']+)' \}\}/g;
  let m;
  while ((m = re.exec(src))) tabs.push({ name: m[1], stack: m[2], title: m[3] });
  const iconRe = /(\w+Tab): focused \? '([\w-]+)' : '([\w-]+)'/g;
  const icons = {};
  while ((m = iconRe.exec(src))) icons[m[1]] = { icon: m[2], iconOutline: m[3] };
  return tabs.map((t) => ({ ...t, ...(icons[t.name] || { icon: null, iconOutline: null }) }));
}

/**
 * Every registered screen, de-duplicated by component. Each entry:
 *   { component, name (file/component name without "Screen" suffix kept as
 *     the file name), routes: [{ stack, route }], stacks: [stack...],
 *     firstTab (title of the first tab whose stack registers it, tab order)
 *     or null }
 * in navigator source order of first registration, tab stacks first in TAB
 * order so a tab's root sorts before its pushed screens.
 */
function registeredScreens(src = readNavigator()) {
  const tabs = parseTabs(src);
  const rows = parseStackScreens(src);
  const byComponent = new Map();
  for (const r of rows) {
    if (!byComponent.has(r.component)) byComponent.set(r.component, { component: r.component, routes: [] });
    byComponent.get(r.component).routes.push({ stack: r.stack, route: r.route });
  }
  const tabIndexOfStack = (stack) => tabs.findIndex((t) => t.stack === stack);
  const out = [];
  for (const entry of byComponent.values()) {
    const stacks = [...new Set(entry.routes.map((r) => r.stack))];
    const tabIdxs = stacks.map(tabIndexOfStack).filter((i) => i >= 0).sort((a, b) => a - b);
    const firstTabIndex = tabIdxs.length ? tabIdxs[0] : null;
    out.push({
      ...entry,
      stacks,
      firstTabIndex,
      firstTab: firstTabIndex === null ? null : tabs[firstTabIndex].title,
      // The route to show under the first tab: the name it is registered
      // under in that tab's stack.
      firstTabRoute: firstTabIndex === null
        ? null
        : entry.routes.find((r) => r.stack === tabs[firstTabIndex].stack).route,
    });
  }
  return { tabs, screens: out };
}

module.exports = { parseStackScreens, parseTabs, registeredScreens, PRE_MAIN_STACKS, NAVIGATOR };
