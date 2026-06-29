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
const F_LO = 0.1; // 6 brpm
const F_HI = 0.4; // 24 brpm
const WIN_SEC = 120; // estimate per 2-minute window
const STEP_SEC = 60; // 50% overlap

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

/** Clean the R-R series: physiological range + within MEDIAN_TOL of the median. */
function cleanRr(rr: number[]): number[] {
  const inRange = rr.filter((v) => v >= RR_MIN_MS && v <= RR_MAX_MS);
  const med = median(inRange) || 0;
  return rr.filter((v) => {
    if (v < RR_MIN_MS || v > RR_MAX_MS) return false;
    if (med > 0 && Math.abs(v - med) > MEDIAN_TOL * med) return false;
    return true;
  });
}

/**
 * Estimate respiratory rate (brpm) from a chronological list of R-R intervals
 * (ms). Returns null if there isn't enough clean signal.
 */
export function respiratoryRate(rr: number[]): number | null {
  const clean = cleanRr(rr);
  if (clean.length < 60) return null; // need ~1 min of beats

  // Build the tachogram: time of each beat (s) and its R-R value (ms).
  const t: number[] = [];
  const v: number[] = [];
  let acc = 0;
  for (const interval of clean) {
    acc += interval / 1000;
    t.push(acc);
    v.push(interval);
  }
  const duration = acc;
  if (duration < WIN_SEC) return null;

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
  const estimates: number[] = [];
  for (let start = 0; start + winN <= n; start += stepN) {
    const seg = grid.slice(start, start + winN);
    const peak = peakFreqInBand(seg, FS, F_LO, F_HI);
    if (peak != null) estimates.push(peak * 60);
  }
  if (estimates.length === 0) {
    const peak = peakFreqInBand(grid.slice(0, Math.min(n, winN)), FS, F_LO, F_HI);
    return peak != null ? round1(peak * 60) : null;
  }
  return round1(median(estimates));
}

/**
 * Band-limited DFT: return the frequency (Hz) of maximum power within [fLo,fHi].
 * Mean-removed and Hann-windowed to suppress leakage.
 */
function peakFreqInBand(x: number[], fs: number, fLo: number, fHi: number): number | null {
  const N = x.length;
  if (N < 16) return null;
  const mean = x.reduce((a, b) => a + b, 0) / N;
  const w = x.map((xi, i) => (xi - mean) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))));

  const df = fs / N;
  let bestF = 0;
  let bestP = -1;
  for (let f = fLo; f <= fHi; f += df / 2) {
    let re = 0;
    let im = 0;
    const k = (2 * Math.PI * f) / fs;
    for (let i = 0; i < N; i += 1) {
      const a = k * i;
      re += (w[i] as number) * Math.cos(a);
      im += (w[i] as number) * Math.sin(a);
    }
    const p = re * re + im * im;
    if (p > bestP) {
      bestP = p;
      bestF = f;
    }
  }
  return bestP > 0 ? bestF : null;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
