import * as React from 'react';
import { plotPoints, smoothPath, linePath, areaPath, paddedDomain, type Box } from '../chartGeometry';

type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
  // Stroke colour token reference. Defaults to the chart amber.
  stroke?: string;
  fill?: string;
  smooth?: boolean;
  strokeWidth?: number;
  className?: string;
};

// Small trend line built on the shared chartGeometry, rendered as plain SVG so
// it is byte-identical in look to the mobile Sparkline. No chart library.
export function Sparkline({
  values,
  width = 120,
  height = 36,
  stroke = 'var(--c-chartLine)',
  fill,
  smooth = true,
  strokeWidth = 2,
  className,
}: SparklineProps) {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 2) {
    return <svg width={width} height={height} className={className} aria-hidden="true" />;
  }
  const pad = strokeWidth;
  const box: Box = { left: pad, top: pad, width: width - pad * 2, height: height - pad * 2 };
  const { min, max } = paddedDomain(finite, 0.15);
  const points = plotPoints(finite, box, min, max);
  const d = smooth ? smoothPath(points) : linePath(points);
  const area = fill ? areaPath(points, height - pad, smooth) : '';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-hidden="true"
    >
      {fill ? <path d={area} fill={fill} stroke="none" /> : null}
      <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
