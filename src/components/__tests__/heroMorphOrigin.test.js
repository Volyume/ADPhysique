/**
 * Shared-element transitions, item 15 / D31
 * (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md).
 *
 * Two pieces are pinned here:
 *  1. PressableCard's origin-aware measure API (onPressWithLayout /
 *     onLongPressWithLayout): it measures the card's window rect at press time
 *     and hands it to the callback, and — crucially — never drops a tap when
 *     the native handle can't be measured (it fires the callback with null so
 *     the destination just falls back to centre zoom). Consumers that pass a
 *     plain onPress/onLongPress are byte-compatible (unchanged behaviour).
 *  2. The heroZoom stays a graceful centre zoom when no __heroOrigin param is
 *     supplied (the app-wide default and the cross-tab entry behaviour), with
 *     the defensive current.progress fallback intact.
 *
 * RE-ANCHORED 2026-09-15 (D180 part 2): the interpolator moved out of
 * RootNavigator.js into src/navigation/heroTransition.js so it could be
 * pinned by CALLING it rather than by reading its source. These assertions
 * keep their exact intent and now read the module that holds the code; the
 * behavioural versions of the same properties live in
 * src/navigation/__tests__/heroTransition.guard.test.js. The registration
 * assertion still reads RootNavigator.js, which is where registrations live.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import useAppStore from '../../store/useAppStore';
import PressableCard from '../PressableCard';

beforeEach(() => {
  act(() => {
    useAppStore.setState({ accessibility: { reduceMotion: false } });
  });
});

function firstPressHandler(tree, key) {
  const node = tree.root.findAll((n) => n.props && typeof n.props[key] === 'function')[0];
  return node ? node.props[key] : null;
}

describe('PressableCard origin-aware measure API', () => {
  test('onPressWithLayout fires (with a null rect) when the handle is unmeasurable — never a lost tap', () => {
    const cb = jest.fn();
    let tree;
    act(() => { tree = create(<PressableCard onPressWithLayout={cb}>x</PressableCard>); });
    const onPress = firstPressHandler(tree, 'onPress');
    expect(typeof onPress).toBe('function');
    act(() => { onPress(); });
    // react-test-renderer exposes no measureInWindow, so the fallback branch
    // runs: the callback still fires, with null, so the tap is honoured and
    // the destination falls back to centre zoom.
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(null);
  });

  test('onLongPressWithLayout fires (with a null rect) on the fallback path', () => {
    const cb = jest.fn();
    let tree;
    act(() => { tree = create(<PressableCard onLongPressWithLayout={cb}>x</PressableCard>); });
    const onLongPress = firstPressHandler(tree, 'onLongPress');
    expect(typeof onLongPress).toBe('function');
    act(() => { onLongPress(); });
    expect(cb).toHaveBeenCalledWith(null);
  });

  test('a plain onPress consumer is byte-compatible (fires directly, no measure)', () => {
    const onPress = jest.fn();
    let tree;
    act(() => { tree = create(<PressableCard onPress={onPress}>x</PressableCard>); });
    act(() => { firstPressHandler(tree, 'onPress')(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('no long-press handler is wired when neither long-press prop is set', () => {
    let tree;
    act(() => { tree = create(<PressableCard onPress={() => {}}>x</PressableCard>); });
    expect(firstPressHandler(tree, 'onLongPress')).toBeNull();
  });

  test('source: the measured path forwards a {x, y, width, height} rect, and cannot lose a tap', () => {
    // RE-POINTED 2026-09-16. This pinned PressableCard's own inline
    // `measureInWindow` call. That implementation covered the "no native
    // handle" case but not the one where the handle EXISTS and the callback
    // never arrives -- a node detached between press and measure, which a
    // recycled list row can do. That tap was lost outright.
    //
    // The card now delegates to `measureHeroOrigin`, which was written for the
    // same job on the newer call sites and already carried a fire-once guard,
    // a rect validity check and a watchdog. The intent of this case is
    // unchanged -- a proper rect reaches the callback -- and it is now asserted
    // where the code lives, plus the no-lost-tap property the old spelling
    // could not give.
    const card = fs.readFileSync(path.join(__dirname, '..', 'PressableCard.js'), 'utf8');
    expect(card).toContain("import { measureHeroOrigin } from '../navigation/heroTransition';");
    expect(card).toContain('measureHeroOrigin(viewRef.current, cb);');
    // And the delegate really does forward the rect and really does guard.
    const hero = fs.readFileSync(
      path.join(__dirname, '..', '..', 'navigation', 'heroTransition.js'), 'utf8',
    );
    expect(hero).toContain('node.measureInWindow((x, y, width, height) =>');
    expect(hero).toMatch(/setTimeout\(/);
    expect(hero).toMatch(/let settled = false;/);
  });
});

describe('RootNavigator heroZoom origin-aware extension (D31)', () => {
  const NAV = fs.readFileSync(
    path.join(__dirname, '..', '..', 'navigation', 'RootNavigator.js'),
    'utf8',
  );
  const HERO = fs.readFileSync(
    path.join(__dirname, '..', '..', 'navigation', 'heroTransition.js'),
    'utf8',
  );

  test('the defensive current.progress fallback is intact', () => {
    expect(HERO).toContain("if (!current?.progress) {\n      return { cardStyle: { opacity: 1 } };");
  });

  test('centre zoom (opacity 0->1, scale 0.92->1) is the exact fallback when no origin is present', () => {
    // The origin branch is guarded on a real measured rect; when it is absent
    // the interpolator returns the byte-identical centre zoom it always had.
    expect(HERO).toContain('outputRange: [0.92, 1],');
    expect(HERO).toContain('return { cardStyle: { opacity, transform: [{ scale }] } };');
  });

  test('the origin branch grows from the tapped rect only when a finite rect is supplied', () => {
    expect(HERO).toContain('if (origin && Number.isFinite(origin.width) && origin.width > 0 && screen?.width && screen?.height) {');
    expect(HERO).toContain('const startScale = Math.min(0.95, Math.max(0.85, origin.width / screen.width));');
  });

  test('heroZoomOptions reads the destination route __heroOrigin param', () => {
    // HERO_ORIGIN_PARAM is the literal '__heroOrigin'; the lookup is the same
    // read, named once so a call site and the interpolator cannot drift.
    expect(HERO).toContain("export const HERO_ORIGIN_PARAM = '__heroOrigin';");
    expect(HERO).toContain('cardStyleInterpolator: makeHeroZoomCardStyle(route?.params?.[HERO_ORIGIN_PARAM] || null),');
  });

  test('ExerciseDetail registrations use the origin-aware options', () => {
    const matches = NAV.match(/name="ExerciseDetail" component=\{ExerciseDetailScreen\} options=\{heroZoomOptions\(\{ headerShown: false \}\)\}/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
