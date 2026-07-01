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
  // never poison the trend with NaN. F3 (EN-6): non-positive weights are
  // corrupt rows too (import/sync artefacts) — a single 0 kg entry drags the
  // trend hard enough to fake a rapid-loss signal, so they are dropped here
  // exactly as in weeklyCoach.computeEWMA.
  const clean = weights.filter((w) => w && Number.isFinite(Number(w.weightKg)) && Number(w.weightKg) > 0);
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

/**
 * Robust smoother over a plain number array (mirrors nutritionEngine.ewmaValues
 * for the display surfaces, e.g. the BodyMetrics trend takeaway). Same
 * asymmetric Huber-clamped update; returns a number array rounded to 2dp.
 *
 * Display-only by intent: the asymmetric clamp damps sustained gains as well as
 * transient spikes, which is fine beside the visible raw dots but is why the
 * coaching DECISIONS stay on the plain EWMA (see weeklyCoach §12 note).
 */
export function robustValues(values, opts = {}) {
  const { alpha, k, madWindow, scaleFloor, downwardKnee } = { ...ROBUST_DEFAULTS, ...opts };
  if (!Array.isArray(values)) return [];
  const nums = values.map((v) => Number(v)).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return [];
  const out = [];
  const innovations = [];
  let m = nums[0];
  for (const x of nums) {
    const r = x - m;
    const s = Math.max(scaleFloor, mad(innovations.slice(-madWindow)));
    const knee = (r > 0 ? k : downwardKnee) * s;
    const rClamped = Math.sign(r) * Math.min(Math.abs(r), knee);
    m = m + alpha * rClamped;
    innovations.push(r);
    out.push(parseFloat(m.toFixed(2)));
  }
  return out;
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
  // F3 (EN-1, the D1 #3 bug in the robust twin): when no weigh-in is at least
  // 7 days old there is NO weekly rate to read. Falling back to the earliest
  // reading scaled a 2-4 day span as a full week (~2x overstated) and could
  // drive an off-target verdict and a cut. Null, exactly like the plain twin
  // (weeklyCoach.getEwmaSevenDaysAgo).
  return older?.ewmaKg ?? null;
}

// ───────────────────────────────────────────────────────────────────────────
// COMP-024 decision-promotion — the cycle-robust TREND-TRACKING smoother.
//
// The display smoother above (robustEwma / robustValues) clamps innovations
// against the LEVEL, so a sustained gain/loss produces a run of same-signed
// innovations whose robust scale (MAD) collapses towards zero, tightening the
// knee and damping the very trend we want to keep. That over-damping of
// SUSTAINED moves is why promoting it to the coaching DECISIONS regressed the
// bulk_aggressive simulator (a fast bulk stopped triggering the downward pull),
// so the promotion was held (FOUNDER-DECISIONS §12, START-HERE COMP-024 lesson).
//
// This variant fixes that with a Holt's-linear core (a level AND a slow trend
// term) and an asymmetric robust clamp on the residual-from-PREDICTION:
//   pred  = level + trend                 // the trend absorbs sustained drift
//   e     = x - pred                      // residual: a transient spike is large
//   s     = max(scaleFloor, MAD(recent residuals))
//   knee  = (e > 0) ? k·s : downwardKnee·s   // upward tight, downward wide (loss safe)
//   level = pred + alpha · clamp(e, knee)
//   trend = beta·(level_new - level_old) + (1-beta)·trend
// A sustained gain is carried by `trend`, so residuals stay small and nothing is
// clamped away; a water-weight spike is a large residual against a small scale
// and is clamped. Used ONLY for the off-target DECISION reads in weeklyCoach;
// the rapid-loss / ED SAFETY reads keep the plain less-damped EWMA. Pure +
// deterministic (the *SevenDaysAgo helper reads the clock, like its plain twin).
export const ROBUST_TRACKING_DEFAULTS = Object.freeze({
  alpha: 0.1,        // level memory, identical to the plain slow EWMA
  beta: 0.05,        // trend memory: slow, so a brief run cannot manufacture a trend
  k: 1.5,            // upward Huber knee multiplier (transient-spike clamp)
  madWindow: 14,     // residuals in the robust-scale window
  scaleFloor: 0.25,  // kg
  downwardKnee: 4,   // losses pass freely (≈ undamped), protecting the trend read
});

export function robustTrackingEwma(weights, opts = {}) {
  const { alpha, beta, k, madWindow, scaleFloor, downwardKnee } = { ...ROBUST_TRACKING_DEFAULTS, ...opts };
  if (!Array.isArray(weights)) return [];
  // F3 (EN-6): drop non-positive weights, matching computeEWMA/robustEwma.
  const clean = weights.filter((w) => w && Number.isFinite(Number(w.weightKg)) && Number(w.weightKg) > 0);
  if (clean.length === 0) return [];
  const sorted = [...clean].sort((a, b) => a.loggedAt - b.loggedAt);

  const result = [];
  const residuals = [];
  let level = Number(sorted[0].weightKg);
  let trend = 0;

  for (const w of sorted) {
    const x = Number(w.weightKg);
    const pred = level + trend;
    const e = x - pred;
    // Scale = typical residual MAGNITUDE (median |residual|), NOT MAD. MAD
    // measures spread around the median, so a run of consistent trend-residuals
    // collapses it towards zero and tightens the knee onto the very trend we want
    // to keep (the held-promotion bug). Median |residual| stays ~the residual's
    // own size during a sustained move, so a consistent trend passes (e < ~1.5·s)
    // while a lone outlier (e >> the typical residual) is still clamped.
    const recentAbs = residuals.slice(-madWindow).map(Math.abs);
    const s = Math.max(scaleFloor, median(recentAbs) ?? 0);
    const knee = (e > 0 ? k : downwardKnee) * s;
    const eClamped = Math.sign(e) * Math.min(Math.abs(e), knee);
    const newLevel = pred + alpha * eClamped;
    trend = beta * (newLevel - level) + (1 - beta) * trend;
    level = newLevel;
    residuals.push(e);
    result.push({ loggedAt: w.loggedAt, rawKg: x, ewmaKg: Math.round(level * 100) / 100 });
  }
  return result;
}

/** Latest trend-tracking value, or null. Mirrors getLatestEwma. */
export function robustTrackingLatest(weights, opts = {}) {
  const series = robustTrackingEwma(weights, opts);
  return series.length ? series[series.length - 1].ewmaKg : null;
}

/** Trend-tracking value ~7 days ago, or null. Mirrors getEwmaSevenDaysAgo. */
export function robustTrackingSevenDaysAgo(weights, opts = {}) {
  const series = robustTrackingEwma(weights, opts);
  if (series.length < 2) return null;
  const cutoff = Date.now() - 7 * 86400000;
  const older = [...series].reverse().find((e) => e.loggedAt <= cutoff);
  // F3 (EN-1): null on sub-week data — never scale a 2-4 day span as a weekly
  // rate. This is the DECISION read (weeklyCoach decisionRatePct), so the old
  // earliest-reading fallback could manufacture an on/off-target verdict the
  // safety read (plain EWMA, already fixed) correctly refused to give.
  return older?.ewmaKg ?? null;
}
