/**
 * Geometry behind the SVG charts. These are pure functions, so the maths
 * is checked here rather than by eyeballing a rendered chart:
 *  - scale: linear mapping, inverted ranges, flat-domain midpoint
 *  - plotPoints: even x spacing, inverted y, single/empty inputs
 *  - linePath / smoothPath / areaPath: well-formed, closed where expected
 *  - ticks and paddedDomain edge cases
 */
import {
  scale, plotPoints, linePath, smoothPath, areaPath, ticks, paddedDomain,
  nearestPointIndex,
} from '../chartGeometry';

describe('nearestPointIndex (COMP-019 scrub)', () => {
  const pts = [{ x: 0, y: 5 }, { x: 10, y: 4 }, { x: 20, y: 6 }, { x: 30, y: 3 }];
  test('returns the index of the point nearest in x', () => {
    expect(nearestPointIndex(pts, 0)).toBe(0);
    expect(nearestPointIndex(pts, 9)).toBe(1);
    expect(nearestPointIndex(pts, 24)).toBe(2);
    expect(nearestPointIndex(pts, 100)).toBe(3); // beyond last → clamps to last
    expect(nearestPointIndex(pts, -50)).toBe(0); // before first → clamps to first
  });
  test('ties resolve to the lower index', () => {
    expect(nearestPointIndex(pts, 5)).toBe(0); // equidistant from 0 and 10 → 0
  });
  test('empty / missing input returns -1', () => {
    expect(nearestPointIndex([], 5)).toBe(-1);
    expect(nearestPointIndex(null, 5)).toBe(-1);
  });
});

describe('scale', () => {
  test('maps domain onto range linearly', () => {
    expect(scale(5, 0, 10, 0, 100)).toBe(50);
    expect(scale(0, 0, 10, 0, 100)).toBe(0);
    expect(scale(10, 0, 10, 0, 100)).toBe(100);
  });
  test('supports inverted ranges (SVG y)', () => {
    expect(scale(0, 0, 10, 100, 0)).toBe(100);
    expect(scale(10, 0, 10, 100, 0)).toBe(0);
  });
  test('flat domain returns the range midpoint', () => {
    expect(scale(7, 7, 7, 0, 100)).toBe(50);
  });
});

describe('plotPoints', () => {
  const box = { left: 0, top: 0, width: 100, height: 50 };

  test('spaces x evenly and inverts y', () => {
    const pts = plotPoints([0, 10], box, 0, 10);
    expect(pts).toEqual([
      { x: 0, y: 50 },   // value 0 -> bottom
      { x: 100, y: 0 },  // value 10 -> top
    ]);
  });

  test('a single value is centred horizontally', () => {
    const pts = plotPoints([5], box, 0, 10);
    expect(pts[0].x).toBe(50);
    expect(pts[0].y).toBe(25);
  });

  test('empty input yields no points', () => {
    expect(plotPoints([], box, 0, 10)).toEqual([]);
  });

  test('honours a non-zero box origin', () => {
    const offset = { left: 20, top: 10, width: 80, height: 40 };
    const pts = plotPoints([0, 10], offset, 0, 10);
    expect(pts[0]).toEqual({ x: 20, y: 50 }); // top+height
    expect(pts[1]).toEqual({ x: 100, y: 10 });
  });
});

describe('linePath', () => {
  test('starts with M then L segments', () => {
    expect(linePath([{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 20, y: 2 }]))
      .toBe('M0 0 L10 5 L20 2');
  });
  test('empty input is an empty string', () => {
    expect(linePath([])).toBe('');
  });
});

describe('smoothPath', () => {
  test('falls back to a straight path under three points', () => {
    const two = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
    expect(smoothPath(two)).toBe(linePath(two));
  });
  test('emits cubic bezier segments for three or more points', () => {
    const d = smoothPath([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }]);
    expect(d.startsWith('M0 0')).toBe(true);
    expect(d).toContain('C');
    // one curve segment per gap between points
    expect(d.match(/C/g).length).toBe(2);
  });
});

describe('areaPath', () => {
  test('closes the line down to the baseline', () => {
    const d = areaPath([{ x: 0, y: 10 }, { x: 10, y: 5 }], 50);
    expect(d.startsWith('M0 10')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d).toContain('L10 50'); // last point dropped to baseline
    expect(d).toContain('L0 50');  // back to first x at baseline
  });
  test('needs at least two points', () => {
    expect(areaPath([{ x: 0, y: 0 }], 50)).toBe('');
  });
});

describe('ticks', () => {
  test('returns sections + 1 evenly spaced values', () => {
    expect(ticks(0, 30, 3)).toEqual([0, 10, 20, 30]);
  });
  test('zero or negative sections returns nothing', () => {
    expect(ticks(0, 10, 0)).toEqual([]);
  });
});

describe('paddedDomain', () => {
  test('pads a real range outward by the fraction', () => {
    expect(paddedDomain([0, 10], 0.1)).toEqual({ min: -1, max: 11 });
  });
  test('flat data still gets height', () => {
    const d = paddedDomain([80, 80, 80]);
    expect(d.max).toBeGreaterThan(d.min);
  });
  test('empty data is a safe unit domain', () => {
    expect(paddedDomain([])).toEqual({ min: 0, max: 1 });
  });
  test('ignores non-finite values', () => {
    expect(paddedDomain([5, NaN, undefined, 5], 0.1).min).toBeLessThan(5);
  });
});
