/**
 * narrowBucket.test.js: pins D104-2 (Campaign 27 phase 2c, built 2026-10-09,
 * D220 addendum 32): below 390 dp of window width the three display sizes
 * step down one notch and body stays 16; Larger text applies on top; the
 * screen padding drops from lg to md; useTheme passes the bucket from the
 * live window width. Written to FAIL if the step ever becomes a continuous
 * scale, touches body, or applies at 390 dp and above.
 */
import { resolveTheme, NARROW_WIDTH_DP, spacing } from '../theme';

describe('D104-2 narrow-device bucket', () => {
  test('the threshold is 390 dp', () => {
    expect(NARROW_WIDTH_DP).toBe(390);
  });

  test('below the threshold the display sizes step one notch; body and the small sizes do not move', () => {
    const wide = resolveTheme({ theme: 'dark' });
    const narrow = resolveTheme({ theme: 'dark', narrow: true });
    expect(wide.fontSize.display).toBe(40);
    expect(wide.fontSize.xxxl).toBe(32);
    expect(wide.fontSize.xxl).toBe(24);
    expect(narrow.fontSize.display).toBe(36);
    expect(narrow.fontSize.xxxl).toBe(29);
    expect(narrow.fontSize.xxl).toBe(22);
    for (const k of ['micro', 'xs', 'sm', 'md', 'lg', 'xl']) expect(narrow.fontSize[k]).toBe(wide.fontSize[k]);
    expect(narrow.fontSize.md).toBe(16);
    expect(narrow.type.h1.fontSize).toBe(29);
    expect(narrow.type.body.fontSize).toBe(16);
  });

  test('Larger text applies on top of the stepped sizes', () => {
    const t = resolveTheme({ theme: 'dark', narrow: true, largerText: true });
    expect(t.fontSize.display).toBe(43);
    expect(t.fontSize.xxxl).toBe(35);
    expect(t.fontSize.xxl).toBe(26);
    expect(t.fontSize.md).toBe(19);
  });

  test('the screen padding drops one step when narrow, and the bucket is reported', () => {
    expect(resolveTheme({ theme: 'dark' }).screenPadding).toBe(spacing.lg);
    expect(resolveTheme({ theme: 'dark' }).narrow).toBe(false);
    expect(resolveTheme({ theme: 'dark', narrow: true }).screenPadding).toBe(spacing.md);
    expect(resolveTheme({ theme: 'dark', narrow: true }).narrow).toBe(true);
  });

  test('useTheme reads the bucket from the live window width', () => {
    const RN = require('react-native');
    const spy = jest.spyOn(RN, 'useWindowDimensions');
    const { create, act } = require('react-test-renderer');
    const useTheme = require('../../hooks/useTheme').default;
    const seen = [];
    function Probe() { const t = useTheme(); seen.push([t.narrow, t.fontSize.display]); return null; }
    try {
      spy.mockReturnValue({ width: 360, height: 780, scale: 3, fontScale: 1 });
      let tree;
      act(() => { tree = create(<Probe />); });
      act(() => { tree.unmount(); });
      spy.mockReturnValue({ width: 393, height: 852, scale: 3, fontScale: 1 });
      act(() => { tree = create(<Probe />); });
      act(() => { tree.unmount(); });
    } finally {
      spy.mockRestore();
    }
    expect(seen[0]).toEqual([true, 36]);
    expect(seen[seen.length - 1]).toEqual([false, 40]);
  });
});
