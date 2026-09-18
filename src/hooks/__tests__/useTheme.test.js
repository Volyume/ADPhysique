/**
 * useTheme — CP-10 stage 0 pins:
 *   1. it derives from the SAME resolveTheme() the legacy applyAccessibility()
 *      delegates to, so the live hook and the boot-mutated singletons never
 *      disagree for the same four raw preferences (theme.js's own
 *      applyAccessibility test coverage in theme.test.js already asserts the
 *      underlying palette math; this file pins the WIRING — that the hook
 *      reads the store's accessibility slice and reacts to it correctly);
 *   2. it recomputes ONLY when one of the four raw preferences changes, not
 *      on unrelated accessibility.* writes (risk register #8, CP-10 plan) —
 *      an unmemoized recompute per unrelated re-render is exactly the
 *      low-end-Android performance risk the plan calls out;
 *   3. it reacts live when a raw preference DOES change, with no reload —
 *      the whole point of the primitive.
 *
 * Uses the real useAppStore (not a mock) and the react-test-renderer "Probe
 * component" pattern already used by useProgressData.test.js, so the
 * assertions exercise the actual Zustand subscription rather than a stand-in.
 */
import { create, act } from 'react-test-renderer';
import useAppStore from '../../store/useAppStore';
import useTheme from '../useTheme';
import { resolveTheme } from '../../styles/theme';

function renderThemeHook() {
  const ref = { current: null };
  const renders = { count: 0 };
  function Probe() {
    ref.current = useTheme();
    renders.count += 1;
    return null;
  }
  let tree;
  act(() => { tree = create(<Probe />); });
  return { ref, renders, tree };
}

function setAccessibility(overrides) {
  act(() => {
    useAppStore.setState({
      accessibility: { ...useAppStore.getState().accessibility, ...overrides },
    });
  });
}

describe('useTheme: derives from the store and matches resolveTheme()', () => {
  const COMBINATIONS = [
    { theme: 'dark' },
    { theme: 'light' },
    { theme: 'dark', higherContrast: true },
    { theme: 'light', higherContrast: true },
    { theme: 'dark', colorBlindSafe: true },
    { theme: 'light', colorBlindSafe: true },
    { theme: 'dark', largerText: true },
    { theme: 'dark', higherContrast: true, colorBlindSafe: true, largerText: true },
    { theme: 'light', higherContrast: true, colorBlindSafe: true, largerText: true },
  ];

  test.each(COMBINATIONS)('matches resolveTheme() for %j', (prefs) => {
    setAccessibility({
      theme: prefs.theme,
      higherContrast: !!prefs.higherContrast,
      colorBlindSafe: !!prefs.colorBlindSafe,
      largerText: !!prefs.largerText,
    });
    const { ref } = renderThemeHook();
    const expected = resolveTheme(prefs);

    expect(ref.current.resolvedTheme).toBe(expected.resolvedTheme);
    expect(ref.current.colors).toEqual(expected.colors);
    expect(ref.current.fontSize).toEqual(expected.fontSize);
    expect(ref.current.type.body).toEqual(expected.type.body);
    expect(ref.current.type.h1).toEqual(expected.type.h1);
    expect(ref.current.shadow.sm).toEqual(expected.shadow.sm);
    expect(ref.current.shadow.card).toBe(expected.shadow.card); // theme-invariant, shared by reference
    expect(ref.current.shadow.glow.shadowColor).toBe(expected.shadow.glow.shadowColor);
  });
});

describe('useTheme: reacts live to a preference change (the point of CP-10)', () => {
  test('flips colors/resolvedTheme when the store theme preference changes, no reload', () => {
    setAccessibility({ theme: 'dark', higherContrast: false, colorBlindSafe: false, largerText: false });
    const { ref } = renderThemeHook();
    expect(ref.current.resolvedTheme).toBe('dark');
    const darkSurface = ref.current.colors.surface;

    setAccessibility({ theme: 'light' });
    expect(ref.current.resolvedTheme).toBe('light');
    expect(ref.current.colors.surface).not.toBe(darkSurface);
    expect(ref.current.colors.surface).toBe(resolveTheme({ theme: 'light' }).colors.surface);
  });

  test('flips fontSize when largerText toggles', () => {
    setAccessibility({ theme: 'dark', higherContrast: false, colorBlindSafe: false, largerText: false });
    const { ref } = renderThemeHook();
    const baseMd = ref.current.fontSize.md;

    setAccessibility({ largerText: true });
    expect(ref.current.fontSize.md).toBe(Math.round(baseMd * 1.2));
  });
});

describe('useTheme: memoization (risk register #8 — no recompute on unrelated writes)', () => {
  test('an unrelated accessibility field (e.g. showFibre) does not produce a new resolved object', () => {
    setAccessibility({ theme: 'dark', higherContrast: false, colorBlindSafe: false, largerText: false, showFibre: true });
    const { ref } = renderThemeHook();
    const first = ref.current;

    setAccessibility({ showFibre: false });
    expect(ref.current).toBe(first); // same reference: useMemo did not recompute
  });

  test('reduceMotion (unrelated to colour/type) does not produce a new resolved object', () => {
    setAccessibility({ theme: 'dark', higherContrast: false, colorBlindSafe: false, largerText: false, reduceMotion: false });
    const { ref } = renderThemeHook();
    const first = ref.current;

    setAccessibility({ reduceMotion: true });
    expect(ref.current).toBe(first);
  });
});

describe('useTheme: coexistence — agrees with the legacy applyAccessibility() path', () => {
  test('for the same prefs, the hook and applyAccessibility()-mutated singletons agree', () => {
    // eslint-disable-next-line global-require
    const themeModule = require('../../styles/theme');
    const prefs = { theme: 'light', higherContrast: true, colorBlindSafe: false, largerText: true };
    themeModule.applyAccessibility(prefs);

    setAccessibility(prefs);
    const { ref } = renderThemeHook();

    expect(ref.current.resolvedTheme).toBe(themeModule.resolvedTheme);
    expect(ref.current.colors).toEqual(themeModule.colors);
    expect(ref.current.fontSize).toEqual(themeModule.fontSize);
    expect(ref.current.type.body).toEqual(themeModule.type.body);

    themeModule.applyAccessibility({}); // reset the shared singleton for other suites
  });
});
