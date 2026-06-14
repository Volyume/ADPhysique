// Pure geometry helpers for the SVG chart components. No React, no
// react-native, no theme. Kept dependency-free on purpose so the maths
// behind every chart can be unit-tested in isolation, away from the
// rendering layer. The SVG components (VolyumeChart, Sparkline) turn the
// {x,y} points and path strings these produce into actual <Path> nodes.

// Round to 2dp. SVG path strings don't need more, and shorter strings
// keep the rendered tree light.
function r(n) {
  return Math.round(n * 100) / 100;
}

// Map a value from a data domain onto a pixel range. When the domain is
// flat (min === max) the value sits in the middle of the range so a
// single repeated reading draws a centred flat line rather than NaN.
export function scale(value, domainMin, domainMax, rangeMin, rangeMax) {
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
  const t = (value - domainMin) / (domainMax - domainMin);
  return rangeMin + t * (rangeMax - rangeMin);
}

// Turn an array of raw values into {x,y} pixel points laid out across the
// plot box. x is evenly spaced left to right; y is inverted because SVG
// y grows downward, so the largest value sits at the top of the box.
//   box: { left, top, width, height }
//   min, max: the y-domain to map onto the box height
export function plotPoints(values, box, min, max) {
  const n = values.length;
  return values.map((v, i) => {
    const x = n <= 1 ? box.left + box.width / 2 : box.left + (i / (n - 1)) * box.width;
    const y = box.top + box.height - scale(v, min, max, 0, box.height);
    return { x: r(x), y: r(y) };
  });
}

// Straight-segment path through the points.
export function linePath(points) {
  if (!points || points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${r(p.x)} ${r(p.y)}`).join(' ');
}

// Smooth path through the points using a Catmull-Rom spline converted to
// cubic beziers. This is the curved look the old gifted-charts `curved`
// prop gave us. End points clamp to themselves so the curve doesn't
// overshoot past the first/last reading.
export function smoothPath(points) {
  if (!points || points.length < 3) return linePath(points);
  const p = points;
  let d = `M${r(p[0].x)} ${r(p[0].y)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
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
// baseline and closed. baselineY is usually the bottom of the plot box.
export function areaPath(points, baselineY, smooth = false) {
  if (!points || points.length < 2) return '';
  const top = smooth ? smoothPath(points) : linePath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${top} L${r(last.x)} ${r(baselineY)} L${r(first.x)} ${r(baselineY)} Z`;
}

// Evenly spaced tick values across [min, max] inclusive, for `sections`
// divisions (so sections + 1 ticks). Used for the horizontal rules and
// their y-axis labels.
export function ticks(min, max, sections) {
  if (!sections || sections <= 0) return [];
  const out = [];
  for (let i = 0; i <= sections; i++) {
    out.push(min + ((max - min) * i) / sections);
  }
  return out;
}

// Pad a [min, max] domain outwards by a fraction of its span so the line
// doesn't kiss the top and bottom edges. Flat domains get a small fixed
// pad so the chart still has height.
export function paddedDomain(values, fraction = 0.1) {
  const finite = values.filter(v => Number.isFinite(v));
  if (finite.length === 0) return { min: 0, max: 1 };
  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1;
    return { min: min - pad, max: max + pad };
  }
  const pad = (max - min) * fraction;
  return { min: min - pad, max: max + pad };
}

// COMP-019 Stage 1b — scrub hit-testing. Given plotted points ([{x, y}] in the
// same pixel space as the touch) and a touch x, return the index of the point
// nearest in x. Renderer-agnostic and pure so the scrub logic is unit-tested
// without a canvas. Returns -1 for empty input; ties resolve to the lower index.
export function nearestPointIndex(points, touchX) {
  if (!points || points.length === 0) return -1;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i++) {
    const dist = Math.abs((points[i]?.x ?? 0) - touchX);
    if (dist < bestDist) { bestDist = dist; best = i; }
  }
  return best;
}
