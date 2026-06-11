/**
 * robustTrend.js — COMP-024 cycle-robust weight-trend smoothing
 *
 * A water-weight-robust trend smoother: an asymmetric Huber-clamped
 * robust-innovation EWMA (Candidate A, founder-approved §12). It damps upward
 * water-weight spikes (weekend carbs/salt, creatine, luteal-phase fluid) while
 * letting genuine downward (loss) movement pass through, keeping the same
 * memory length (alpha) as the plain EWMA so there is no blanket lag.
 *
 * Universal, not bioSex-conditioned (the noise is universal; no special-
 * category inference, no medical claim, framed as "water weight" never
 * "cycle"). Pure + deterministic; no React, no DB, no network.
 *
 * SAFETY (§4d): this is the COACHING / DISPLAY trend. The rapid-loss / ED
 * safety detectors deliberately read the LESS-damped (plain alpha-0.1) series,
 * and the asymmetric clamp here leaves real losses essentially undamped anyway
 * (downward knee = 4·s). Smoothing must never mask a genuine rapid loss; the
 * F4 engine-invariant locks that.
 *
 * Maths (daily readings x_t, trend m_t, innovation r_t = x_t - m_{t-1}):
 *   s     = robust scale = max(scaleFloor, 1.4826 · MAD of the last N innovations)
 *   knee  = (r_t > 0) ? k·s : downwardKnee·s   // upward tight, downward wide
 *   r*_t  = sign(r_t) · min(|r_t|, knee)
 *   m_t   = m_{t-1} + alpha · r*_t
 */

// Founder-approved constants (§12). Tunable at review; kept conservative.
export const ROBUST_DEFAULTS = Object.freeze({
  alpha: 0.1,        // memory, identical to the plain slow EWMA
  k: 1.5,            // Huber knee multiplier (upward)
  madWindow: 14,     // innovations in the robust-scale window
  scaleFloor: 0.25,  // kg — floors the knee so low-variance data isn't over-clamped
  downwardKnee: 4,   // downward innovations clamped at 4·s (≈ undamped: protects the safety read)
});

/** Median of a numeric array (does not mutate the input). Null when empty. */
export function median(values) {
  if (!values || values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Robust scale via the median absolute deviation (MAD), scaled to a
 * normal-consistent sigma. 0 when fewer than 2 points (caller floors it).
 */
export function mad(values) {
  if (!values || values.length < 2) return 0;
  const med = median(values);
  const devs = values.map((v) => Math.abs(v - med));
  return 1.4826 * median(devs);
}

/**
 * Asymmetric Huber-clamped robust-innovation EWMA over morning weigh-ins.
 *
 * @param {Array<{loggedAt:number, weightKg:number}>} weights
 * @param {object} [opts] overrides for ROBUST_DEFAULTS
 * @returns {Array<{loggedAt:number, rawKg:number, ewmaKg:number}>}
 *          same shape as weeklyCoach.computeEWMA, so callers stay symmetric.
 */
export function robustEwma(weights, opts = {}) {
  const { alpha, k, madWindow, scaleFloor, downwardKnee } = { ...ROBUST_DEFAULTS, ...opts };
  if (!Array.isArray(weights)) return [];
  // Same malformed-row filtering as the plain EWMA: one corrupt weigh-in must
  // never poison the trend with NaN.
  const clean = weights.filter((w) => w && Number.isFinite(Number(w.weightKg)));
  if (clean.length === 0) return [];
  const sorted = [...clean].sort((a, b) => a.loggedAt - b.loggedAt);

  const result = [];
  const innovations = []; // raw (pre-clamp) innovations, for the robust scale
  let m = Number(sorted[0].weightKg);

  for (const w of sorted) {
    const x = Number(w.weightKg);
    const r = x - m;
    // Robust scale from the trailing window of raw innovations seen so far.
    const windowInno = innovations.slice(-madWindow);
    const s = Math.max(scaleFloor, mad(windowInno));
    const knee = (r > 0 ? k : downwardKnee) * s;
    const rClamped = Math.sign(r) * Math.min(Math.abs(r), knee);
    m = m + alpha * rClamped;
    innovations.push(r);
    result.push({ loggedAt: w.loggedAt, rawKg: x, ewmaKg: Math.round(m * 100) / 100 });
  }
  return result;
}

/** Latest robust trend value, or null. Mirrors getLatestEwma. */
export function robustLatest(weights, opts = {}) {
  const series = robustEwma(weights, opts);
  return series.length ? series[series.length - 1].ewmaKg : null;
}

/** Robust trend value ~7 days ago, or null. Mirrors getEwmaSevenDaysAgo. */
export function robustSevenDaysAgo(weights, opts = {}) {
  const series = robustEwma(weights, opts);
  if (series.length < 2) return null;
  const cutoff = Date.now() - 7 * 86400000;
  const older = [...series].reverse().find((e) => e.loggedAt <= cutoff);
  return older?.ewmaKg ?? series[0].ewmaKg;
}
