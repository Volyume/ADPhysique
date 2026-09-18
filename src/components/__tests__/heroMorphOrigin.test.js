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
 *  2. RootNavigator's heroZoom stays a graceful centre zoom when no
 *     __heroOrigin param is supplied (the app-wide default and the cross-tab
 *     entry behaviour), with the defensive current.progress fallback intact —
 *     a source guard, since the interpolator is internal to the navigator.
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

  test('source: the measured path forwards a {x, y, width, height} rect via measureInWindow', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'PressableCard.js'), 'utf8');
    expect(src).toContain('node.measureInWindow((x, y, width, height) => cb({ x, y, width, height }));');
  });
});

describe('RootNavigator heroZoom origin-aware extension (D31)', () => {
  const NAV = fs.readFileSync(
    path.join(__dirname, '..', '..', 'navigation', 'RootNavigator.js'),
    'utf8',
  );

  test('the defensive current.progress fallback is intact', () => {
    expect(NAV).toContain("if (!current?.progress) {\n      return { cardStyle: { opacity: 1 } };");
  });

  test('centre zoom (opacity 0->1, scale 0.92->1) is the exact fallback when no origin is present', () => {
    // The origin branch is guarded on a real measured rect; when it is absent
    // the interpolator returns the byte-identical centre zoom it always had.
    expect(NAV).toContain('outputRange: [0.92, 1],');
    expect(NAV).toContain('return { cardStyle: { opacity, transform: [{ scale }] } };');
  });

  test('the origin branch grows from the tapped rect only when a finite rect is supplied', () => {
    expect(NAV).toContain('if (origin && Number.isFinite(origin.width) && origin.width > 0 && screen?.width && screen?.height) {');
    expect(NAV).toContain('const startScale = Math.min(0.95, Math.max(0.85, origin.width / screen.width));');
  });

  test('heroZoomOptions reads the destination route __heroOrigin param', () => {
    expect(NAV).toContain('cardStyleInterpolator: makeHeroZoomCardStyle(route?.params?.__heroOrigin || null),');
  });

  test('ExerciseDetail registrations use the origin-aware options', () => {
    const matches = NAV.match(/name="ExerciseDetail" component=\{ExerciseDetailScreen\} options=\{heroZoomOptions\(\{ headerShown: false \}\)\}/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
