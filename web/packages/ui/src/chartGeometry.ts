// Pure geometry helpers for the SVG chart components. No React, no framework,
// no theme. Ported VERBATIM from the mobile app's src/lib/chartGeometry.js
// (only TypeScript annotations added) so web charts use identical geometry and
// the same amber language as mobile. Kept dependency-free so the maths can be
// unit-tested in isolation.

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Round to 2dp. SVG path strings don't need more.
function r(n: number): number {
  return Math.round(n * 100) / 100;
}

// Map a value from a data domain onto a pixel range. A flat domain centres the
// value so a single repeated reading draws a centred flat line rather than NaN.
export function scale(
  value: number,
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): number {
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
  const t = (value - domainMin) / (domainMax - domainMin);
  return rangeMin + t * (rangeMax - rangeMin);
}

// Turn raw values into {x,y} pixel points across the plot box. y is inverted
// because SVG y grows downward, so the largest value sits at the top.
export function plotPoints(values: number[], box: Box, min: number, max: number): Point[] {
  const n = values.length;
  return values.map((v, i) => {
    const x = n <= 1 ? box.left + box.width / 2 : box.left + (i / (n - 1)) * box.width;
    const y = box.top + box.height - scale(v, min, max, 0, box.height);
    return { x: r(x), y: r(y) };
  });
}

// Straight-segment path through the points.
export function linePath(points: Point[]): string {
  if (!points || points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${r(p.x)} ${r(p.y)}`).join(' ');
}

// Smooth path through the points using a Catmull-Rom spline converted to cubic
// beziers. End points clamp to themselves so the curve doesn't overshoot.
export function smoothPath(points: Point[]): string {
  if (!points || points.length < 3) return linePath(points);
  const p = points;
  let d = `M${r(p[0]!.x)} ${r(p[0]!.y)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i]!;
    const p1 = p[i]!;
    const p2 = p[i + 1]!;
    const p3 = p[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${r(cp1x)} ${r(cp1y)}, ${r(cp2x)} ${r(cp2y)}, ${r(p2.x)} ${r(p2.y)}`;
  }
  return d;
}

// Closed path for an area (gradient) fill: the line on top, dropped to a
// baseline and closed.
export function areaPath(points: Point[], baselineY: number, smooth = false): string {
  if (!points || points.length < 2) return '';
  const top = smooth ? smoothPath(points) : linePath(points);
  const last = points[points.length - 1]!;
  const first = points[0]!;
  return `${top} L${r(last.x)} ${r(baselineY)} L${r(first.x)} ${r(baselineY)} Z`;
}

// Evenly spaced tick values across [min, max] inclusive, for `sections`
// divisions (so sections + 1 ticks).
export function ticks(min: number, max: number, sections: number): number[] {
  if (!sections || sections <= 0) return [];
  const out: number[] = [];
  for (let i = 0; i <= sections; i++) {
    out.push(min + ((max - min) * i) / sections);
  }
  return out;
}

// Pad a [min, max] domain outwards by a fraction of its span so the line
// doesn't kiss the edges. Flat domains get a small fixed pad.
export function paddedDomain(values: number[], fraction = 0.1): { min: number; max: number } {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1;
    return { min: min - pad, max: max + pad };
  }
  const pad = (max - min) * fraction;
  return { min: min - pad, max: max + pad };
}
