/**
 * The origin-aware hero-zoom: the two properties that must never regress, and
 * the exact set of routes and call sites that are wired to it.
 *
 * Authority: D180 part 2 (docs/ux-world-class-audit-2026-07-09/
 * DECISIONS-2026-07-09.md), parent
 * docs/design-redesign-2026-09-14/20-DIRECTION-AND-PLAN.md §7 stage 4, §5 law
 * 5 and §8 ("the origin-aware transition, which is well built and should be
 * extended rather than replaced").
 *
 * What this suite pins, and why each line is here:
 *
 *  1. THE FALLBACK. D180: "a missing or malformed rect falls back to the
 *     ordinary push". A row can be recycled between the measure and the
 *     navigate, so the interpolator is called here with null, with undefined,
 *     with a zero-size rect and with NaN fields, and each must produce the
 *     centre zoom the app has always had -- opacity 0->1 and ONE scale
 *     0.92->1, with no translate. These call the REAL factory, not a mock of
 *     it, which is why the mechanism was moved out of RootNavigator.js (that
 *     file is not importable under this jest config: see the header of
 *     rootNavigatorSheetIsolation.guard.test.js).
 *
 *  2. REDUCE MOTION. Plan §5 law 5: "Reduce Motion replaces motion with a
 *     cross-fade rather than removing the feedback." So the pin is two-sided:
 *     under Reduce Motion there IS still a transition, and it carries opacity
 *     and NO transform. A future change that turns the animation off entirely
 *     fails here.
 *
 *  3. THE WIRED SET. Every screen registered with the hero transition, and
 *     every call site that supplies an origin, is listed by name. Adding one
 *     is then a deliberate act with this list updated, rather than a drift:
 *     the effect is only honest where the tapped row IS the destination's
 *     subject, and that judgement has to be made once per call site.
 *
 *  4. NEVER A LOST TAP. measureHeroOrigin runs its callback exactly once on
 *     every path -- no node, no measureInWindow, a throwing handle, unusable
 *     numbers, and the detached-view case where the native callback simply
 *     never arrives.
 */
import fs from 'fs';
import path from 'path';
import { HERO_ORIGIN_PARAM, heroZoomTransitionSpec, crossFadeTransitionSpec, crossFadeCardStyle, makeHeroZoomCardStyle, heroZoomOptions, measureHeroOrigin, reducedMotionOptions } from '../heroTransition';
import useAppStore from '../../store/useAppStore';

// A stand-in for react-navigation's Animated progress value. It is NOT a mock
// of the interpolator under test: the interpolator is the real one, and this
// only records the ranges it was asked to interpolate over, which is exactly
// what the transition's shape is made of.
function fakeProgress() {
  return {
    interpolate: ({ inputRange, outputRange }) => ({ __interpolated: { inputRange, outputRange } }),
  };
}

const SCREEN = { width: 400, height: 800 };

function runInterpolator(interpolator) {
  return interpolator({ current: { progress: fakeProgress() }, layouts: { screen: SCREEN } });
}

function outputRangeOf(animated) {
  return animated?.__interpolated?.outputRange ?? null;
}

beforeEach(() => {
  useAppStore.setState({ accessibility: { reduceMotion: false } });
});

describe('the fallback: a missing or malformed rect is the ordinary push (D180 part 2)', () => {
  // Each of these is a real way the measure can fail on a device.
  const badOrigins = [
    ['no origin at all (cross-tab push, programmatic navigation)', null],
    ['undefined (the param was never set)', undefined],
    ['a row recycled mid-scroll: measureInWindow handed back undefined fields', { x: undefined, y: undefined, width: undefined, height: undefined }],
    ['a zero-size rect (a detached or not-yet-laid-out view)', { x: 0, y: 0, width: 0, height: 0 }],
    ['NaN fields', { x: NaN, y: NaN, width: NaN, height: NaN }],
    ['a negative width', { x: 10, y: 10, width: -80, height: 40 }],
    ['a rect that is not an object', 'nonsense'],
  ];

  test.each(badOrigins)('%s -> the centre zoom, never a throw', (_label, origin) => {
    const style = runInterpolator(makeHeroZoomCardStyle(origin)).cardStyle;
    expect(outputRangeOf(style.opacity)).toEqual([0, 1]);
    // Exactly one transform, and it is the centre scale. A malformed rect must
    // never produce a translate (that is the "grows from an unrelated rect"
    // failure D180 calls worse than no zoom) and never a zero-size zoom.
    expect(style.transform).toHaveLength(1);
    expect(outputRangeOf(style.transform[0].scale)).toEqual([0.92, 1]);
  });

  test('a real measured rect DOES grow from that rect (so the fallback tests above mean something)', () => {
    const style = runInterpolator(makeHeroZoomCardStyle({ x: 20, y: 300, width: 360, height: 72 })).cardStyle;
    expect(style.transform).toHaveLength(3);
    const [tx, ty, sc] = style.transform;
    // Centre of the rect, carried to the centre of the screen.
    expect(outputRangeOf(tx.translateX)).toEqual([20 + 360 / 2 - SCREEN.width / 2, 0]);
    expect(outputRangeOf(ty.translateY)).toEqual([300 + 72 / 2 - SCREEN.height / 2, 0]);
    // Held inside the calm band: never a tiny-far zoom, never past 1.
    const [start, end] = outputRangeOf(sc.scale);
    expect(start).toBeGreaterThanOrEqual(0.85);
    expect(start).toBeLessThanOrEqual(0.95);
    expect(end).toBe(1);
  });

  test('a tiny row is clamped to 0.85, a full-width row to 0.95', () => {
    const tiny = runInterpolator(makeHeroZoomCardStyle({ x: 0, y: 0, width: 32, height: 32 })).cardStyle;
    expect(outputRangeOf(tiny.transform[2].scale)[0]).toBe(0.85);
    const wide = runInterpolator(makeHeroZoomCardStyle({ x: 0, y: 0, width: 400, height: 90 })).cardStyle;
    expect(outputRangeOf(wide.transform[2].scale)[0]).toBe(0.95);
  });

  test('a missing progress value (a pop gesture) returns a plain opaque card rather than throwing', () => {
    expect(makeHeroZoomCardStyle(null)({ current: {}, layouts: { screen: SCREEN } }))
      .toEqual({ cardStyle: { opacity: 1 } });
    expect(makeHeroZoomCardStyle({ x: 0, y: 0, width: 100, height: 50 })({ current: undefined }))
      .toEqual({ cardStyle: { opacity: 1 } });
    expect(crossFadeCardStyle({ current: {} })).toEqual({ cardStyle: { opacity: 1 } });
  });

  test('a missing screen layout falls back to the centre zoom', () => {
    const style = makeHeroZoomCardStyle({ x: 0, y: 0, width: 100, height: 50 })({
      current: { progress: fakeProgress() },
      layouts: undefined,
    }).cardStyle;
    expect(style.transform).toHaveLength(1);
    expect(outputRangeOf(style.transform[0].scale)).toEqual([0.92, 1]);
  });
});

describe('Reduce Motion replaces the zoom with a cross-fade, never with nothing (law 5)', () => {
  const route = { params: { [HERO_ORIGIN_PARAM]: { x: 20, y: 300, width: 360, height: 72 } } };

  test('with Reduce Motion OFF the measured rect is honoured', () => {
    const options = heroZoomOptions({ headerShown: false })({ route });
    expect(options.headerShown).toBe(false);
    expect(options.transitionSpec).toBe(heroZoomTransitionSpec);
    expect(runInterpolator(options.cardStyleInterpolator).cardStyle.transform).toHaveLength(3);
  });

  test('with Reduce Motion ON the transition still HAPPENS (the feedback is not removed)', () => {
    useAppStore.setState({ accessibility: { reduceMotion: true } });
    const options = heroZoomOptions({ headerShown: false })({ route });
    // Explicitly re-enabled: the stack-level Reduce Motion override turns
    // animation off for every other screen, and a screen option beats it.
    expect(options.animationEnabled).toBe(true);
    expect(options.transitionSpec).toBe(crossFadeTransitionSpec);
    expect(options.cardStyleInterpolator).toBe(crossFadeCardStyle);
  });

  test('with Reduce Motion ON the transition is opacity ONLY: no scale, no translate', () => {
    useAppStore.setState({ accessibility: { reduceMotion: true } });
    const options = heroZoomOptions({ headerShown: false })({ route });
    const { cardStyle } = runInterpolator(options.cardStyleInterpolator);
    expect(outputRangeOf(cardStyle.opacity)).toEqual([0, 1]);
    expect(cardStyle.transform).toBeUndefined();
  });

  test('the cross-fade is inside law 5\'s ceiling and the zoom is too', () => {
    // Law 5: feedback starts inside 100 ms and settles inside 400.
    expect(crossFadeTransitionSpec.open.config.duration).toBeLessThanOrEqual(400);
    expect(crossFadeTransitionSpec.close.config.duration).toBeLessThanOrEqual(400);
    expect(heroZoomTransitionSpec.open.config.duration).toBeLessThanOrEqual(400);
    expect(heroZoomTransitionSpec.close.config.duration).toBeLessThanOrEqual(400);
    // Law 5 again: decelerating in, accelerating out -- never the same both
    // ways, which for a timing spec is a shorter exit than enter.
    expect(heroZoomTransitionSpec.close.config.duration)
      .toBeLessThan(heroZoomTransitionSpec.open.config.duration);
  });

  test('an unreadable store is not a reason to drop the transition', () => {
    useAppStore.setState({ accessibility: undefined });
    const options = heroZoomOptions({ headerShown: false })({ route });
    expect(typeof options.cardStyleInterpolator).toBe('function');
    expect(options.transitionSpec).toBe(heroZoomTransitionSpec);
  });

  test('a route with no params at all still produces a working interpolator', () => {
    const options = heroZoomOptions({ headerShown: false })({ route: {} });
    expect(runInterpolator(options.cardStyleInterpolator).cardStyle.transform).toHaveLength(1);
    expect(heroZoomOptions()({ route: undefined }).cardStyleInterpolator).toBeInstanceOf(Function);
  });
});

describe('measureHeroOrigin never loses a tap (D180 part 2, property A)', () => {
  test('no node -> the callback fires once, with null', () => {
    const run = jest.fn();
    measureHeroOrigin(null, run);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(null);
  });

  test('a node with no measureInWindow -> null, once', () => {
    const run = jest.fn();
    measureHeroOrigin({}, run);
    expect(run).toHaveBeenCalledWith(null);
  });

  test('a measured rect is forwarded as {x, y, width, height}', () => {
    const run = jest.fn();
    measureHeroOrigin({ measureInWindow: (cb) => cb(12, 340, 360, 72) }, run);
    expect(run).toHaveBeenCalledWith({ x: 12, y: 340, width: 360, height: 72 });
  });

  test('unusable numbers become null rather than a zero-size zoom', () => {
    const cases = [
      (cb) => cb(undefined, undefined, undefined, undefined),
      (cb) => cb(0, 0, 0, 0),
      (cb) => cb(NaN, 0, 100, 40),
      (cb) => cb(0, 0, 100, -40),
    ];
    for (const measureInWindow of cases) {
      const run = jest.fn();
      measureHeroOrigin({ measureInWindow }, run);
      expect(run).toHaveBeenCalledWith(null);
    }
  });

  test('a throwing handle is an ordinary push, not a thrown tap', () => {
    const run = jest.fn();
    expect(() => measureHeroOrigin({
      measureInWindow: () => { throw new Error('detached'); },
    }, run)).not.toThrow();
    expect(run).toHaveBeenCalledWith(null);
  });

  test('a detached view whose native callback never arrives still navigates', () => {
    jest.useFakeTimers();
    try {
      const run = jest.fn();
      measureHeroOrigin({ measureInWindow: () => { /* never calls back */ } }, run);
      expect(run).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1000);
      expect(run).toHaveBeenCalledTimes(1);
      expect(run).toHaveBeenCalledWith(null);
    } finally {
      jest.useRealTimers();
    }
  });

  test('a late native callback after the timeout does not fire the tap twice', () => {
    jest.useFakeTimers();
    try {
      const run = jest.fn();
      let late = null;
      measureHeroOrigin({ measureInWindow: (cb) => { late = cb; } }, run);
      jest.advanceTimersByTime(1000);
      expect(run).toHaveBeenCalledTimes(1);
      late(1, 2, 300, 60);
      expect(run).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('the wired set: which routes and which call sites (D180 part 2)', () => {
  const read = (...parts) => fs.readFileSync(path.resolve(__dirname, '..', '..', ...parts), 'utf8');
  const NAV = read('navigation', 'RootNavigator.js');

  // Every screen registered with the hero transition. A hero destination that
  // is not on this list, or one of these losing the transition, is a change to
  // make on purpose.
  const HERO_ROUTES = [
    ['ActiveWorkout', 'ActiveWorkoutScreen', 1],
    ['WorkoutSummary', 'WorkoutSummaryScreen', 2],
    ['PlanDetail', 'PlanDetailScreen', 1],
    ['RoutineDetail', 'RoutineDetailScreen', 1],
    ['ExerciseDetail', 'ExerciseDetailScreen', 2],
  ];

  test.each(HERO_ROUTES)('%s is registered with heroZoomOptions on every stack that has it', (route, screen, count) => {
    const pattern = new RegExp(
      `name="${route}" component=\\{${screen}\\} options=\\{heroZoomOptions\\(\\{ headerShown: false \\}\\)\\}`,
      'g',
    );
    expect((NAV.match(pattern) || []).length).toBe(count);
  });

  test('no registration uses a static hero transition object any more', () => {
    // One entry point, so Reduce Motion cannot be honoured on some hero
    // destinations and not others.
    expect(NAV).not.toContain('heroZoomTransition}');
    expect(NAV).not.toContain('...heroZoomTransition');
  });

  test('every hero route is registered ONLY through heroZoomOptions', () => {
    for (const [route, screen] of HERO_ROUTES) {
      const all = new RegExp(`name="${route}" component=\\{${screen}\\} options=\\{([^}]*\\}?[^}]*)\\}`, 'g');
      for (const match of NAV.matchAll(all)) {
        expect(match[0]).toContain('heroZoomOptions(');
      }
    }
  });

  // The call sites that supply an origin. The test is the one D180 states:
  // the tapped row IS the destination's subject. Every entry names the row.
  const ORIGIN_CALL_SITES = [
    // file, the literal that proves the origin is passed, how many times
    ['screens/LiftProgressScreen.js', "__heroOrigin: originRect || undefined", 1], // the long-pressed lift row, via its peek menu
    ['screens/LiftProgressScreen.js', "__heroOrigin: rect || undefined", 1],       // a lift row -> that lift's detail
    ['screens/ExerciseDetailScreen.js', "__heroOrigin: rect || undefined", 1],     // a substitute card -> that exercise's detail
    ['screens/PlansScreen.js', "__heroOrigin: rect || undefined", 3],              // a plan row -> that plan (folder, unfiled, archived)
    ['screens/AnalyticsScreen.js', "__heroOrigin: rect || undefined", 1],          // a recent-session row -> that session's summary
    ['screens/PlanLibraryScreen.js', "__heroOrigin: rect || undefined", 1],        // a library plan card -> that plan
  ];

  test.each(ORIGIN_CALL_SITES)('%s supplies an origin %s time(s)', (file, literal, count) => {
    const src = read(...file.split('/'));
    expect(src.split(literal).length - 1).toBe(count);
  });

  test('the whole app has exactly these origin-supplying call sites and no others', () => {
    const roots = ['screens', 'components', 'navigation', 'lib', 'hooks', 'store'];
    const found = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__') continue;
          walk(full);
        } else if (entry.name.endsWith('.js')) {
          const src = fs.readFileSync(full, 'utf8');
          // The param being SET (a call site), not the interpolator reading it.
          if (/__heroOrigin:/.test(src)) found.push(path.relative(path.resolve(__dirname, '..', '..'), full));
        }
      }
    };
    for (const root of roots) walk(path.resolve(__dirname, '..', '..', root));
    expect(found.sort()).toEqual([
      'screens/AnalyticsScreen.js',
      'screens/ExerciseDetailScreen.js',
      'screens/LiftProgressScreen.js',
      'screens/PlanLibraryScreen.js',
      'screens/PlansScreen.js',
    ].map((p) => p.split('/').join(path.sep)));
  });

  test('the rows that were wired are rows, not buttons: each passes its own measured rect', () => {
    // PlansScreen: the compact plan row's own press, three lists.
    const plans = read('screens', 'PlansScreen.js');
    expect(plans).toContain('onPressWithLayout={onPressWithLayout}');
    expect(plans.split("onPressWithLayout={(rect) => navigation.navigate('PlanDetail'").length - 1).toBe(3);
    // AnalyticsScreen: the session card's own press.
    const analytics = read('screens', 'AnalyticsScreen.js');
    expect(analytics).toContain('onPressWithLayout={onPressWithLayout}');
    // PlanLibraryScreen: the card body is a TouchableOpacity, so it is
    // measured by ref, and the footer's "Preview plan" opens the same plan
    // from the same card rect rather than from a second, smaller origin.
    const library = read('screens', 'PlanLibraryScreen.js');
    expect(library).toContain('measureHeroOrigin(planCardNodes.current.get(planId)');
    expect(library.split('onPress={() => openPlan(plan.id)}').length - 1).toBe(2);
  });
});

describe('Reduce Motion replaces motion everywhere, not just on hero routes', () => {
  // D182 fixed the hero routes and named the rest as an open gap: every OTHER
  // screen was still getting `animationEnabled: false` from the navigator,
  // which deletes the feedback instead of replacing it. Law 5 is explicit that
  // it must be replaced. Closed 2026-09-16; these cases stop it reopening.
  const NAV = fs.readFileSync(
    path.join(__dirname, '..', 'RootNavigator.js'), 'utf8',
  );
  const code = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const NAV_CODE = code(NAV);

  test('the navigator override never disables animation outright', () => {
    // The exact spelling that deleted the feedback for two years.
    expect(NAV_CODE).not.toMatch(/animationEnabled:\s*false/);
  });

  test('the navigator override supplies the cross-fade instead', () => {
    expect(NAV_CODE).toContain('transitionSpec: crossFadeTransitionSpec');
    expect(NAV_CODE).toContain('cardStyleInterpolator: crossFadeCardStyle');
  });

  test('every modal registration goes through the one entry point', () => {
    // Modals cannot rely on the navigator override: a screen's own `options`
    // are applied AFTER `screenOptions`, so a bare `presentation: 'modal'`
    // could win and leave those screens on the old behaviour. Every one of them
    // is wrapped, and a bare spelling is banned so a new modal cannot be added
    // outside the rule.
    const wrapped = NAV_CODE.match(/reducedMotionOptions\(\{ headerShown: false, presentation: 'modal' \}\)/g) || [];
    expect(wrapped.length).toBeGreaterThanOrEqual(7);
    expect(NAV_CODE).not.toMatch(/options=\{\{[^}]*presentation: 'modal'/);
  });

  test('reducedMotionOptions adds nothing when Reduce Motion is off', () => {
    useAppStore.setState({ accessibility: { reduceMotion: false } });
    expect(reducedMotionOptions({ headerShown: false })()).toEqual({ headerShown: false });
  });

  test('and replaces the transition when it is on, inside law 5 ceiling', () => {
    useAppStore.setState({ accessibility: { reduceMotion: true } });
    const out = reducedMotionOptions({ headerShown: false })();
    expect(out.headerShown).toBe(false);
    expect(out.animationEnabled).toBe(true);
    expect(out.cardStyleInterpolator).toBe(crossFadeCardStyle);
    for (const phase of ['open', 'close']) {
      expect(out.transitionSpec[phase].config.duration).toBeLessThanOrEqual(400);
    }
  });
});
