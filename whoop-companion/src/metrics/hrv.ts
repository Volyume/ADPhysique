/**
 * Heart-rate variability from R-R intervals (Task Force 1996 time-domain).
 *
 * IMPORTANT about magnitude: optical (PPG) R-R — what the strap broadcasts — is
 * noisy. A single missed/extra beat creates a huge successive difference that
 * massively inflates RMSSD. So we reject artifacts robustly (physiological range
 * + deviation from a local median) and, critically, only difference beats that
 * are ADJACENT in the original sequence and both clean — never across a removed
 * interval (doing so re-introduces a false spike and over-reports HRV).
 *
 * Also note WHOOP reports HRV measured during SLEEP (slow-wave sleep), a stable
 * resting value; an instantaneous awake reading is a different, higher/noisier
 * thing and should be labelled as such.
 */

export type HrvResult = {
  rmssd: number; // ms — the recovery-relevant metric
  sdnn: number; // ms
  pnn50: number; // %
  meanHr: number; // bpm
  count: number; // accepted intervals
};

const RR_MIN_MS = 300; // 200 bpm
const RR_MAX_MS = 2000; // 30 bpm
const MEDIAN_TOL = 0.25; // reject intervals >25% from the local median

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

/**
 * Validity mask over the raw R-R sequence: in physiological range AND within
 * MEDIAN_TOL of the overall median. Returns same-length boolean array.
 */
function validityMask(rr: number[]): boolean[] {
  const inRange = rr.filter((v) => v >= RR_MIN_MS && v <= RR_MAX_MS);
  const med = median(inRange) || 0;
  return rr.map((v) => {
    if (v < RR_MIN_MS || v > RR_MAX_MS) return false;
    if (med > 0 && Math.abs(v - med) > MEDIAN_TOL * med) return false;
    return true;
  });
}

export function computeHrv(rr: number[]): HrvResult | null {
  if (rr.length < 3) return null;
  const valid = validityMask(rr);
  const accepted = rr.filter((_, i) => valid[i]);
  if (accepted.length < 3) return null;

  const n = accepted.length;
  const mean = accepted.reduce((a, b) => a + b, 0) / n;

  // RMSSD: only over consecutive ORIGINAL pairs where both beats are valid.
  let sumSqDiff = 0;
  let pairs = 0;
  let nn50 = 0;
  for (let i = 1; i < rr.length; i += 1) {
    if (!valid[i] || !valid[i - 1]) continue;
    const d = (rr[i] as number) - (rr[i - 1] as number);
    sumSqDiff += d * d;
    if (Math.abs(d) > 50) nn50 += 1;
    pairs += 1;
  }
  if (pairs < 2) return null;
  const rmssd = Math.sqrt(sumSqDiff / pairs);

  let sumVar = 0;
  for (const v of accepted) sumVar += (v - mean) * (v - mean);
  const sdnn = Math.sqrt(sumVar / n);

  return {
    rmssd: round1(rmssd),
    sdnn: round1(sdnn),
    pnn50: round1((nn50 / pairs) * 100),
    meanHr: round1(60000 / mean),
    count: n,
  };
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
