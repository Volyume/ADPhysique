import * as React from 'react';
import { scale, smoothPath, linePath, areaPath, ticks, paddedDomain, type Point } from '../chartGeometry';

export interface ChartSeries {
  points: { t: number; v: number }[];
  color?: string;
  fill?: string;
}

export interface LineChartProps {
  series: ChartSeries[];
  // Optional shaded target corridor (e.g. the coach's weight-rate band).
  band?: { min: number; max: number; color?: string };
  width?: number;
  height?: number;
  smooth?: boolean;
  yTicks?: number;
  formatY?: (n: number) => string;
  formatX?: (t: number) => string;
}

// SVG line chart on the shared chartGeometry: y grid + ticks, an optional target
// band, one or more series, and first/last x labels. Same amber language as
// mobile. No chart library.
export function LineChart({
  series,
  band,
  width = 640,
  height = 300,
  smooth = true,
  yTicks = 4,
  formatY = (n) => String(Math.round(n)),
  formatX,
}: LineChartProps) {
  const pad = { top: 12, right: 16, bottom: 26, left: 46 };
  const box = {
    left: pad.left,
    top: pad.top,
    width: width - pad.left - pad.right,
    height: height - pad.top - pad.bottom,
  };

  const allV = series.flatMap((s) => s.points.map((p) => p.v)).filter(Number.isFinite);
  if (band) allV.push(band.min, band.max);
  if (allV.length < 1) return <svg width={width} height={height} aria-hidden="true" />;

  const dom = paddedDomain(allV, 0.08);
  const allT = series.flatMap((s) => s.points.map((p) => p.t)).filter(Number.isFinite);
  const tmin = Math.min(...allT);
  const tmax = Math.max(...allT);

  const sx = (t: number) =>
    allT.length <= 1 || tmax === tmin ? box.left + box.width / 2 : scale(t, tmin, tmax, box.left, box.left + box.width);
  const sy = (v: number) => box.top + box.height - scale(v, dom.min, dom.max, 0, box.height);

  const yt = ticks(dom.min, dom.max, yTicks);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img">
      {/* y grid + labels */}
      {yt.map((v, i) => {
        const y = sy(v);
        return (
          <g key={i}>
            <line x1={box.left} y1={y} x2={box.left + box.width} y2={y} stroke="var(--c-borderSubtle)" strokeWidth={1} />
            <text x={box.left - 8} y={y + 3} textAnchor="end" fontSize={10} fill="var(--c-textMuted)">
              {formatY(v)}
            </text>
          </g>
        );
      })}

      {/* target band */}
      {band ? (
        <rect
          x={box.left}
          y={sy(band.max)}
          width={box.width}
          height={Math.max(0, sy(band.min) - sy(band.max))}
          fill={band.color ?? 'var(--c-primaryBg)'}
        />
      ) : null}

      {/* series */}
      {series.map((s, i) => {
        const pts: Point[] = s.points
          .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v))
          .map((p) => ({ x: sx(p.t), y: sy(p.v) }));
        if (pts.length === 0) return null;
        const d = smooth ? smoothPath(pts) : linePath(pts);
        const color = s.color ?? 'var(--c-chartLine)';
        const last = pts[pts.length - 1]!;
        return (
          <g key={i}>
            {s.fill ? <path d={areaPath(pts, box.top + box.height, smooth)} fill={s.fill} stroke="none" /> : null}
            <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={last.x} cy={last.y} r={3} fill={color} />
          </g>
        );
      })}

      {/* x labels: first and last */}
      {formatX && allT.length >= 1 ? (
        <>
          <text x={box.left} y={height - 6} textAnchor="start" fontSize={10} fill="var(--c-textMuted)">
            {formatX(tmin)}
          </text>
          <text x={box.left + box.width} y={height - 6} textAnchor="end" fontSize={10} fill="var(--c-textMuted)">
            {formatX(tmax)}
          </text>
        </>
      ) : null}
    </svg>
  );
}
