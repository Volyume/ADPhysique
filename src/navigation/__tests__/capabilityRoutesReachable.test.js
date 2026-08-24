/**
 * Capability-lane route reachability sweep.
 *
 * What this pins: if any navigator stack in RootNavigator.js contains a screen
 * that navigates to HowYouTrain, TrainingConsiderations or SettingsWorkout,
 * that stack must also REGISTER the route. React Navigation drops a navigate()
 * to an unregistered name in silence, with no throw, no warning and no visible
 * effect, so the failure reaches users as a dead button rather than a crash.
 *
 * Why it exists: "Yes, let's set that up" in onboarding did nothing on a
 * founder's device. ProOnboardingScreen step 5 and FreeStarterScreen both
 * navigate to HowYouTrain, but neither FirstRunStack nor ProOnboardingStack
 * registered it. That was the THIRD tap this navigator had lost the same way
 * (NotificationSettings and Methodology carry the same note in the source), so
 * this is written as a SWEEP rather than a list of the routes known to be
 * broken: it derives the stacks, their registrations and their outbound
 * navigation from the source every run, so a stack added later, or a new
 * navigate() added to an already-registered screen, is covered without anyone
 * remembering to extend this file.
 *
 * The sweep is deliberately transitive by construction. It reads the outbound
 * targets of every REGISTERED screen, so registering HowYouTrain in a stack
 * immediately puts HowYouTrain's own targets (TrainingConsiderations,
 * SettingsWorkout) under the same requirement in that stack. That is the part
 * a hand-written list gets wrong: the first tap is fixed and the next one dies.
 *
 * Vacuity guard: a source-parsing test fails open if the parse silently stops
 * matching (a formatting change, a rename, a move to a different registration
 * helper). The final tests assert the parse actually found stacks, screen
 * registrations and resolvable screen files, so a broken parse fails loudly
 * instead of reporting a clean sweep over nothing.
 */
const fs = require('fs');
const path = require('path');

const NAV_DIR = path.join(__dirname, '..');
const ROOT_NAVIGATOR = path.join(NAV_DIR, 'RootNavigator.js');
const source = fs.readFileSync(ROOT_NAVIGATOR, 'utf8');

// The capability lane is free by law (CAP-19) and is offered from inside
// onboarding, so these three are the routes whose silent loss is a user-visible
// dead end rather than a developer inconvenience.
const CAPABILITY_ROUTES = ['HowYouTrain', 'TrainingConsiderations', 'SettingsWorkout'];

/**
 * Map a component identifier used in `component={X}` back to the screen file it
 * loads. Covers both shapes RootNavigator uses: the lazyScreen requires
 * (including the withProGuard / withReadOnlyProGuard wrappers, whose first
 * `../screens/...` require is the screen itself) and plain top-level imports.
 */
function buildComponentFileMap(src) {
  const map = {};
  const declaration = /(?:const|let)\s+(\w+)\s*=\s*([^\n]*require\(\s*'(\.\.\/screens\/[\w/]+)'[^\n]*)/g;
  let m;
  while ((m = declaration.exec(src)) !== null) map[m[1]] = m[3];

  const imported = /import\s+(\w+)\s+from\s+'(\.\.\/screens\/[\w/]+)'/g;
  while ((m = imported.exec(src)) !== null) map[m[1]] = m[2];

  return map;
}

/**
 * Split the source into `function <Name>Stack(...)` bodies. Brace matching from
 * the opening brace rather than a "next line starting with }" heuristic, so a
 * nested closure inside a stack cannot truncate the body early.
 *
 * The body brace is found by first walking to the end of the PARAMETER list.
 * Taking the first `{` after the function name instead is wrong and fails
 * silently: five of these stacks are declared `function XStack({ navigation })`,
 * so the first brace is the destructuring pattern and every one of them parses
 * as a 14-character body with no registrations at all. That bug was in the
 * first draft of this file and made the sweep pass over the whole main tree
 * while reporting success, which is why the vacuity guards below count
 * registrations per stack rather than merely counting stacks.
 */
function parseStackBodies(src) {
  const bodies = {};
  const header = /^function\s+(\w+Stack)\s*\(/gm;
  let m;
  while ((m = header.exec(src)) !== null) {
    const paramOpen = src.indexOf('(', m.index);
    let paramDepth = 0;
    let paramEnd = -1;
    for (let i = paramOpen; i < src.length; i++) {
      if (src[i] === '(') paramDepth++;
      else if (src[i] === ')') {
        paramDepth--;
        if (paramDepth === 0) { paramEnd = i; break; }
      }
    }
    if (paramEnd === -1) continue;
    const open = src.indexOf('{', paramEnd);
    if (open === -1) continue;
    let depth = 0;
    let end = -1;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end !== -1) bodies[m[1]] = src.slice(open, end + 1);
  }
  return bodies;
}

/** Collect `<Stack.Screen name="X" component={Y}` pairs from one stack body. */
function parseRegistrations(body) {
  const registrations = {};
  const screen = /<Stack\.Screen\s+name="(\w+)"\s+component=\{(\w+)\}/g;
  let m;
  while ((m = screen.exec(body)) !== null) registrations[m[1]] = m[2];
  return registrations;
}

/**
 * Outbound route names a screen file navigates to. push and replace are
 * included alongside navigate because all three resolve against the same
 * registered-route set and fail the same silent way.
 */
function parseNavigationTargets(file) {
  const src = fs.readFileSync(file, 'utf8');
  const targets = new Set();
  const call = /navigation\.(?:navigate|push|replace)\(\s*['"](\w+)['"]/g;
  let m;
  while ((m = call.exec(src)) !== null) targets.add(m[1]);
  return targets;
}

const componentFiles = buildComponentFileMap(source);
const stackBodies = parseStackBodies(source);
const stackNames = Object.keys(stackBodies);

const resolvedScreenFiles = [];

/**
 * For every stack, every registered screen whose file we can resolve, and every
 * capability route that screen navigates to: record a gap if the stack does not
 * register that route.
 */
function findGaps() {
  const gaps = [];
  stackNames.forEach((stackName) => {
    const registrations = parseRegistrations(stackBodies[stackName]);
    const registered = Object.keys(registrations);

    registered.forEach((routeName) => {
      const relative = componentFiles[registrations[routeName]];
      if (!relative) return; // nested navigator or non-screen component
      const file = path.join(NAV_DIR, `${relative}.js`);
      if (!fs.existsSync(file)) return;
      resolvedScreenFiles.push(file);

      const targets = parseNavigationTargets(file);
      CAPABILITY_ROUTES.forEach((route) => {
        if (targets.has(route) && !registered.includes(route)) {
          gaps.push({ stack: stackName, from: routeName, missing: route });
        }
      });
    });
  });
  return gaps;
}

describe('capability-lane routes are registered in every stack that navigates to them', () => {
  it('has no stack that navigates to a capability route it does not register', () => {
    const gaps = findGaps();
    const report = gaps
      .map((g) => `  ${g.stack}: ${g.from} navigates to '${g.missing}', which ${g.stack} does not register`)
      .join('\n');
    expect(gaps.length === 0 ? '' : `\n${report}\n`).toBe('');
  });

  // Vacuity guards. Without these the sweep reports success when the parse
  // finds nothing at all, which is the failure mode of every source-reading
  // test. Thresholds are floors well under the real counts, not exact numbers,
  // so ordinary navigator growth never fails them.
  it('parsed at least 3 stacks, each with screen registrations', () => {
    const withRegistrations = stackNames.filter(
      (name) => Object.keys(parseRegistrations(stackBodies[name])).length > 0,
    );
    expect(withRegistrations.length).toBeGreaterThanOrEqual(3);
  });

  it('resolved registered components back to real screen files', () => {
    findGaps();
    expect(resolvedScreenFiles.length).toBeGreaterThanOrEqual(20);
  });

  it('sees the capability routes registered in both onboarding stacks', () => {
    ['FirstRunStack', 'ProOnboardingStack'].forEach((stackName) => {
      const registered = Object.keys(parseRegistrations(stackBodies[stackName]));
      CAPABILITY_ROUTES.forEach((route) => {
        expect({ stack: stackName, route, registered: registered.includes(route) })
          .toEqual({ stack: stackName, route, registered: true });
      });
    });
  });
});
