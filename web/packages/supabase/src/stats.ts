// Small pure stats helpers for dashboard figures. The Progress phase will reuse
// the mobile trend algorithm verbatim for full parity; this is a faithful
// first-pass EWMA for the dashboard hero only.

// Exponentially weighted moving average over an ordered series (oldest first).
export function ewma(values: number[], alpha = 0.25): number[] {
  const out: number[] = [];
  let prev = NaN;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    prev = Number.isFinite(prev) ? alpha * v + (1 - alpha) * prev : v;
    out.push(prev);
  }
  return out;
}

// Weekly rate (units/week) from dated readings, derived from the EWMA endpoints
// over the spanned days. Returns null when there isn't enough to be meaningful.
export function weeklyRate(points: { t: number; v: number }[], alpha = 0.25): number | null {
  const ordered = points.filter((p) => Number.isFinite(p.v) && Number.isFinite(p.t)).sort((a, b) => a.t - b.t);
  if (ordered.length < 2) return null;
  const smoothed = ewma(
    ordered.map((p) => p.v),
    alpha,
  );
  const first = smoothed[0]!;
  const last = smoothed[smoothed.length - 1]!;
  const days = (ordered[ordered.length - 1]!.t - ordered[0]!.t) / 86_400_000;
  if (days < 1) return null;
  return ((last - first) / days) * 7;
}
