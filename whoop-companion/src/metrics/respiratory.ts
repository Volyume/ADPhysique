/**
 * Respiratory rate (breaths/min) from the R-R interval series, via respiratory
 * sinus arrhythmia (RSA). Breathing modulates heart rate: inhalation speeds it,
 * exhalation slows it, so the breathing rhythm shows up as the dominant
 * oscillation in the high-frequency (HF, ~0.1–0.4 Hz = 6–24 brpm) band of the
 * R-R tachogram. This is the standard ECG/PPG-derived-respiration method
 * (Schäfer & Kratky 2008; the same band WHOOP measures during sleep).
 *
 * We have R-R from the strap, so we can derive this honestly. WHOOP reports it
 * from sleep; feed this the R-R collected inside the detected sleep window.
 *
 * Pipeline: clean R-R -> build the irregularly-sampled tachogram RR(t) ->
 * resample to a uniform grid -> for each short window, find the peak frequency
 * in the respiratory band by a band-limited DFT -> take the median across
 * windows (robust to the odd noisy segment).
 */

const RR_MIN_MS = 300;
const RR_MAX_MS = 2000;
const MEDIAN_TOL = 0.25;
const FS = 4; // resample grid (Hz) — Nyquist 2 Hz, well above the ~0.4 Hz band
const F_LO = 0.1; // 6 brpm; use the standard HF respiration band, then guard its edges
const F_HI = 0.4; // 24 brpm
const EDGE_GUARD_HZ = 0.01;
const LOW_GUARD_LO = 0.04;
const WIN_SEC = 120; // estimate per 2-minute window
const STEP_SEC = 60; // 50% overlap

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

/** Clean the R-R series: physiological range + within MEDIAN_TOL of the median. */
function splitCleanRr(rr: number[]): number[][] {
  const inRange = rr.filter((v) => v >= RR_MIN_MS && v <= RR_MAX_MS);
  const med = median(inRange) || 0;
  const segments: number[][] = [];
  let current: number[] = [];
  for (const value of rr) {
    const valid =
      value >= RR_MIN_MS &&
      value <= RR_MAX_MS &&
      (med <= 0 || Math.abs(value - med) <= MEDIAN_TOL * med);
    if (!valid) {
      if (current.length) segments.push(current);
      current = [];
      continue;
    }
    current.push(value);
  }
  if (current.length) segments.push(current);
  return segments;
}

/**
 * Estimate respiratory rate (brpm) from a chronological list of R-R intervals
 * (ms). Returns null if there isn't enough clean signal.
 */
export function respiratoryRate(rr: number[]): number | null {
  return respiratoryRateSegments([rr]);
}

/** Estimate across explicitly contiguous R-R runs without joining missing or
 * rejected beats. Weak spectra return null rather than a credible-looking edge
 * frequency. */
export function respiratoryRateSegments(rawSegments: number[][]): number | null {
  const estimates: number[] = [];

  for (const clean of rawSegments.flatMap(splitCleanRr)) {
    if (clean.length < 180) continue;

    // Build the tachogram: time of each beat (s) and its R-R value (ms).
    const t: number[] = [];
    const v: number[] = [];
    let acc = 0;
    for (const interval of clean) {
      t.push(acc);
      v.push(interval);
      acc += interval / 1000;
    }
    const duration = acc;
    if (duration < WIN_SEC * 1.5) continue;

    // Resample onto a uniform grid by linear interpolation.
    const n = Math.floor(duration * FS);
    const grid = new Array<number>(n);
    let j = 0;
    for (let i = 0; i < n; i += 1) {
      const ti = i / FS;
      while (j < t.length - 1 && (t[j + 1] as number) < ti) j += 1;
      const t0 = t[j] as number;
      const t1 = t[Math.min(j + 1, t.length - 1)] as number;
      const v0 = v[j] as number;
      const v1 = v[Math.min(j + 1, v.length - 1)] as number;
      grid[i] = t1 > t0 ? v0 + ((v1 - v0) * (ti - t0)) / (t1 - t0) : v0;
    }

    // Per-window peak-frequency estimate in the respiratory band.
    const winN = Math.floor(WIN_SEC * FS);
    const stepN = Math.floor(STEP_SEC * FS);
    for (let start = 0; start + winN <= n; start += stepN) {
      const peak = peakFreqInBand(grid.slice(start, start + winN), FS, F_LO, F_HI);
      if (peak && peak.prominence >= 6 && peak.concentration >= 0.4) {
        estimates.push(peak.frequencyHz * 60);
      }
    }
  }

  if (estimates.length < 3) return null;
  const centre = median(estimates);
  const inliers = estimates.filter((value) => Math.abs(value - centre) <= 1.5);
  if (inliers.length < Math.max(3, Math.ceil(estimates.length * 0.6))) return null;
  const rate = Math.round(median(inliers) * 2) / 2;
  return rate >= 9 && rate <= 24 ? rate : null;
}

/**
 * Band-limited DFT: return the frequency (Hz) of maximum power within [fLo,fHi].
 * Mean-removed and Hann-windowed to suppress leakage.
 */
function peakFreqInBand(
  x: number[],
  fs: number,
  fLo: number,
  fHi: number,
): { frequencyHz: number; prominence: number; concentration: number } | null {
  const N = x.length;
  if (N < 16) return null;
  const meanX = (N - 1) / 2;
  const meanY = x.reduce((a, b) => a + b, 0) / N;
  const slope = x.reduce((sum, value, i) => sum + (i - meanX) * (value - meanY), 0)
    / x.reduce((sum, _, i) => sum + (i - meanX) ** 2, 0);
  const residual = x.map((value, i) => value - (meanY + slope * (i - meanX)));
  const variance = residual.reduce((sum, value) => sum + value * value, 0) / N;
  if (variance < 4) return null;

  const w = residual.map((value, i) => value * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))));

  const df = fs / N;
  const step = df / 4;
  const powers: Array<{ frequencyHz: number; power: number }> = [];
  for (let f = Math.min(LOW_GUARD_LO, fLo); f <= fHi + step / 2; f += step) {
    let re = 0;
    let im = 0;
    const k = (2 * Math.PI * f) / fs;
    for (let i = 0; i < N; i += 1) {
      const a = k * i;
      re += (w[i] as number) * Math.cos(a);
      im += (w[i] as number) * Math.sin(a);
    }
    const p = re * re + im * im;
    powers.push({ frequencyHz: f, power: p });
  }
  if (!powers.length) return null;
  const bestIndex = powers.reduce((index, point, i) => (point.power > (powers[index] as { power: number }).power ? i : index), 0);
  const best = powers[bestIndex] as { frequencyHz: number; power: number };
  if (best.power <= 0) return null;
  if (best.frequencyHz <= fLo + EDGE_GUARD_HZ || best.frequencyHz >= fHi - EDGE_GUARD_HZ) return null;
  if (bestIndex === 0 || bestIndex === powers.length - 1) return null;

  // A rhythm below the respiratory band can leak into the first in-band bins.
  // Treat a comparably strong low-frequency peak as evidence that the in-band
  // maximum is an edge lock, rather than respiratory physiology.
  const lowGuardPeak = powers
    .filter((point) => point.frequencyHz < fLo - step / 2)
    .reduce((peak, point) => (point.power > peak ? point.power : peak), 0);
  if (lowGuardPeak >= best.power * 0.5) return null;

  // Refine only a well-supported interior peak. The published value is still
  // rounded later, so this improves bin placement without implying precision.
  const left = powers[bestIndex - 1] as { power: number };
  const right = powers[bestIndex + 1] as { power: number };
  const curvature = left.power - 2 * best.power + right.power;
  const offset = curvature < 0 ? 0.5 * (left.power - right.power) / curvature : 0;
  const refinedFrequency = best.frequencyHz + Math.max(-0.5, Math.min(0.5, offset)) * step;
  const background = powers
    .filter((point) => Math.abs(point.frequencyHz - refinedFrequency) > 0.025)
    .map((point) => point.power);
  const backgroundMedian = median(background);
  const totalPower = powers.reduce((sum, point) => sum + point.power, 0);
  const peakBandPower = powers
    .filter((point) => Math.abs(point.frequencyHz - refinedFrequency) <= 0.025)
    .reduce((sum, point) => sum + point.power, 0);
  return {
    frequencyHz: refinedFrequency,
    prominence: backgroundMedian > 0 ? best.power / backgroundMedian : Number.POSITIVE_INFINITY,
    concentration: totalPower > 0 ? peakBandPower / totalPower : 0,
  };
}
