/**
 * Stress from heart-rate variability — the Baevsky Stress Index (SI), a
 * long-published autonomic-balance metric (Baevsky & Berseneva), mapped onto
 * WHOOP's 0–3 Stress Monitor scale.
 *
 * WHOOP's Stress Monitor reports a continuous 0–3 value (higher = more
 * sympathetic / stressed) computed from real-time HR + HRV against your
 * baseline. The exact model is proprietary; the Baevsky SI is the standard
 * open equivalent and tracks the same physiology:
 *
 *   SI = AMo / (2 · Mo · MxDMn)
 *     Mo     = mode of the R-R intervals (s) — most frequent R-R
 *     AMo    = amplitude of the mode (% of R-R intervals in the modal bin)
 *     MxDMn  = variation range = max − min R-R (s)
 *
 * Low HRV (narrow R-R spread, tall mode) → high SI → high stress. SI is highly
 * skewed, so we map √SI onto 0–3 with empirical anchors (rest ≈ SI 50,
 * high stress ≈ SI 500+). Output is a labelled approximation.
 */

const RR_MIN_MS = 300;
const RR_MAX_MS = 2000;
const MEDIAN_TOL = 0.25;
const BIN_S = 0.05; // 50 ms histogram bins (Baevsky standard)

export type StressResult = {
  score: number; // 0..3
  level: 'low' | 'medium' | 'high';
  si: number; // raw Baevsky Stress Index
};

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

function cleanRr(rr: number[]): number[] {
  const inRange = rr.filter((v) => v >= RR_MIN_MS && v <= RR_MAX_MS);
  const med = median(inRange) || 0;
  return rr.filter((v) => {
    if (v < RR_MIN_MS || v > RR_MAX_MS) return false;
    if (med > 0 && Math.abs(v - med) > MEDIAN_TOL * med) return false;
    return true;
  });
}

/** Baevsky Stress Index from a window of R-R intervals (ms). */
export function stressIndex(rrMs: number[]): number | null {
  const clean = cleanRr(rrMs);
  if (clean.length < 20) return null;
  const rr = clean.map((v) => v / 1000); // seconds

  const min = Math.min(...rr);
  const max = Math.max(...rr);
  const mxdmn = max - min;
  if (mxdmn <= 0) return null;

  // Histogram in 50 ms bins; Mo = modal bin centre, AMo = % in that bin.
  const bins = new Map<number, number>();
  for (const v of rr) {
    const b = Math.round(v / BIN_S);
    bins.set(b, (bins.get(b) ?? 0) + 1);
  }
  let modeBin = 0;
  let modeCount = 0;
  for (const [b, c] of bins) {
    if (c > modeCount) {
      modeCount = c;
      modeBin = b;
    }
  }
  const mo = modeBin * BIN_S; // s
  const amo = (modeCount / rr.length) * 100; // %
  if (mo <= 0) return null;

  return amo / (2 * mo * mxdmn);
}

/** Map a Baevsky SI to WHOOP's 0–3 stress scale with √ compression. */
export function siToStress(si: number): number {
  // Anchors: SI ~50 ≈ calm (0.5), ~150 ≈ 1.5, ~500 ≈ 3.
  const s = Math.sqrt(si);
  const score = (s - Math.sqrt(20)) / (Math.sqrt(500) - Math.sqrt(20)) * 3;
  return Math.max(0, Math.min(3, Math.round(score * 10) / 10));
}

export function computeStress(rrMs: number[]): StressResult | null {
  const si = stressIndex(rrMs);
  if (si == null) return null;
  const score = siToStress(si);
  return {
    score,
    level: score >= 2 ? 'high' : score >= 1 ? 'medium' : 'low',
    si: Math.round(si),
  };
}
