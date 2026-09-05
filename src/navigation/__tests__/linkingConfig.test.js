/**
 * Deep-link routing — the navigator's REAL linking config, resolved through
 * the same `getStateFromPath` the navigator installs.
 *
 * What this pins: every URL the app itself mints or hands to the OS resolves
 * to a registered route in the right tab, with the params that route reads.
 * The config is read out of RootNavigator.js rather than restated here, so a
 * path deleted or renamed in the navigator fails this suite instead of
 * quietly passing against a copy.
 *
 * Why it exists: route-graph certification 2026-09-05.
 *   A2 — `src/lib/partners/link.js:18-19` mints volyume://partner/<CODE> and
 *        https://volyume.app/partner/<CODE>, app.json carries the autoVerify
 *        intent filter for /partner, PartnerScreen.js:635 reads
 *        route.params.code — and no path in the config matched, so the whole
 *        invite path was unwired and the code had to be typed by hand.
 *   A3 — the Android foreground-service notification hands
 *        volyume://active-workout to the OS
 *        (lib/notifications/activeWorkout.js:152) and nothing matched it.
 *
 * Params are asserted, not just route names: A2's sibling failure (audit
 * 2026-07-01) was a path whose param was named `:id` while the screen read
 * `planId`, which routes perfectly and dead-ends on a blank screen.
 */
const fs = require('fs');
const path = require('path');

const { safeGetStateFromPath } = require('../safeGetStateFromPath');
const { parseInviteCode } = require('../../lib/partners/link');

const extractPathFromURL = require(
  '@react-navigation/native/lib/commonjs/extractPathFromURL',
).default;

const ROOT_NAVIGATOR = path.join(__dirname, '..', 'RootNavigator.js');
const source = fs.readFileSync(ROOT_NAVIGATOR, 'utf8');

/**
 * Strip line comments outside string literals, so a `{` written inside an
 * explanatory comment cannot throw the brace count off.
 */
function stripLineComments(src) {
  return src.split('\n').map((line) => {
    let quote = null;
    for (let i = 0; i < line.length; i += 1) {
      const c = line[i];
      if (quote) {
        if (c === '\\') { i += 1; continue; }
        if (c === quote) quote = null;
        continue;
      }
      if (c === '\'' || c === '"' || c === '`') { quote = c; continue; }
      if (c === '/' && line[i + 1] === '/') return line.slice(0, i);
    }
    return line;
  }).join('\n');
}

/** Extract the `config: { ... }` object literal from the `linking` constant. */
function readLinkingConfig(src) {
  const clean = stripLineComments(src);
  const start = clean.indexOf('const linking = {');
  if (start < 0) throw new Error('linking constant not found in RootNavigator.js');
  const configAt = clean.indexOf('config: {', start);
  if (configAt < 0) throw new Error('linking.config not found in RootNavigator.js');
  const open = clean.indexOf('{', configAt);
  let depth = 0;
  let quote = null;
  for (let i = open; i < clean.length; i += 1) {
    const c = clean[i];
    if (quote) {
      if (c === '\\') { i += 1; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '\'' || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    if (c === '}') {
      depth -= 1;
      // eslint-disable-next-line no-eval
      if (depth === 0) return eval(`(${clean.slice(open, i + 1)})`);
    }
  }
  throw new Error('linking.config braces never closed');
}

const config = readLinkingConfig(source);
const PREFIXES = ['volyume://', 'https://volyume.app'];

/** The exact pair the navigator uses: prefix extraction, then its resolver. */
function routeFor(url) {
  const p = extractPathFromURL(PREFIXES, url);
  if (p === undefined) return undefined;
  const state = safeGetStateFromPath(p, config);
  // Walk to the deepest route: [MainTabs-level tab] → [stack screen].
  let route = state?.routes?.[0];
  const tab = route?.name;
  while (route?.state?.routes?.length) route = route.state.routes[route.state.routes.length - 1];
  return route ? { tab, name: route.name, params: route.params } : undefined;
}

describe('linking config — partner invite links (A2)', () => {
  test.each([
    'volyume://partner/ABCD12',
    'https://volyume.app/partner/ABCD12',
  ])('%s opens Partner in the Progress tab with the code', (url) => {
    expect(routeFor(url)).toEqual({
      tab: 'ProgressTab',
      name: 'Partner',
      params: { code: 'ABCD12' },
    });
  });

  test('a real server-issued code survives the route and PartnerScreen parse', () => {
    // Codes are uppercase hex, 8 characters or more (link.js isValidInviteCode);
    // PartnerScreen.js:635 feeds route.params.code straight to parseInviteCode.
    const route = routeFor('volyume://partner/9F3A1C7B');

    expect(route).toMatchObject({ name: 'Partner', params: { code: '9F3A1C7B' } });
    expect(parseInviteCode(route.params.code)).toBe('9F3A1C7B');
  });

  test('a lower-case code from a pasted link is normalised by the screen', () => {
    expect(parseInviteCode(routeFor('https://volyume.app/partner/9f3a1c7b').params.code))
      .toBe('9F3A1C7B');
  });

  test('a bare partner link still opens the pairing screen', () => {
    expect(routeFor('volyume://partner')).toMatchObject({
      tab: 'ProgressTab',
      name: 'Partner',
    });
  });
});

describe('linking config — active workout notification (A3)', () => {
  // The foreground-service notification survives a force-close, so this can
  // arrive on a cold start with no session in memory. It maps to Today, which
  // rehydrates the session (HomeScreen restoreActiveWorkout) and shows the
  // "Continue active workout" card — not to ActiveWorkout, which would mount
  // with nothing to show.
  test('volyume://active-workout opens the Today tab root', () => {
    expect(routeFor('volyume://active-workout')).toMatchObject({
      tab: 'HomeTab',
      name: 'Home',
    });
  });
});

describe('linking config — existing paths still resolve', () => {
  test.each([
    ['volyume://workout/start', 'HomeTab', 'BuildWorkout'],
    ['volyume://diary/2026-09-02', 'DiaryTab', 'Diary'],
    ['volyume://routine/plan-7', 'PlansTab', 'PlanDetail'],
    ['volyume://progress', 'ProgressTab', 'Analytics'],
    ['volyume://coach', 'ProfileTab', 'CoachOutput'],
    ['volyume://checkin', 'ProfileTab', 'WeeklyCheckIn'],
  ])('%s → %s / %s', (url, tab, name) => {
    expect(routeFor(url)).toMatchObject({ tab, name });
  });

  test('the plan deep link still names the param PlanDetailScreen reads', () => {
    expect(routeFor('volyume://routine/plan-7').params).toEqual({ planId: 'plan-7' });
  });

  test('an unowned host is still rejected', () => {
    expect(routeFor('https://evil.example/partner/9F3A1C7B')).toBeUndefined();
  });

  // Vacuity guard: a parse that silently stopped matching would let every
  // assertion above run against an empty config and fail loudly rather than
  // pass — but an over-permissive parse (e.g. one that returned `{}`) is
  // caught here, at the source.
  test('the config was actually parsed out of RootNavigator.js', () => {
    expect(Object.keys(config.screens).sort())
      .toEqual(['DiaryTab', 'HomeTab', 'PlansTab', 'ProfileTab', 'ProgressTab']);
    expect(config.screens.ProgressTab.screens.Partner).toBe('partner/:code?');
    expect(config.screens.HomeTab.screens.Home).toBe('active-workout');
  });
});
