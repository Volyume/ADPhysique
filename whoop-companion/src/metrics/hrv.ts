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
const MEDIAN_TOL = 0.2; // reject intervals >20% from the local median
const MEDIAN_RADIUS = 2;
const MIN_CLEAN_INTERVALS = 20;

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

/**
 * Validity mask over the raw R-R sequence: in physiological range AND within
 * MEDIAN_TOL of a short local median. Returns same-length boolean array.
 */
function validityMask(rr: number[]): boolean[] {
  return rr.map((v, i) => {
    if (v < RR_MIN_MS || v > RR_MAX_MS) return false;
    const neighbours: number[] = [];
    for (let j = Math.max(0, i - MEDIAN_RADIUS); j <= Math.min(rr.length - 1, i + MEDIAN_RADIUS); j += 1) {
      if (j === i) continue;
      const candidate = rr[j] as number;
      if (candidate >= RR_MIN_MS && candidate <= RR_MAX_MS) neighbours.push(candidate);
    }
    if (neighbours.length < 2) return true;
    const med = median(neighbours) || 0;
    if (med > 0 && Math.abs(v - med) > MEDIAN_TOL * med) return false;
    return true;
  });
}

export function computeHrv(rr: number[]): HrvResult | null {
  return computeHrvSegments([rr]);
}

/** Calculate HRV without treating the edges of missing-packet runs as adjacent beats. */
export function computeHrvSegments(segments: number[][]): HrvResult | null {
  const usable = segments.filter((segment) => segment.length > 0);
  const totalIntervals = usable.reduce((sum, segment) => sum + segment.length, 0);
  if (totalIntervals < MIN_CLEAN_INTERVALS) return null;
  const masks = usable.map(validityMask);
  const accepted = usable.flatMap((segment, segmentIndex) =>
    segment.filter((_, index) => masks[segmentIndex]?.[index]),
  );
  if (accepted.length < MIN_CLEAN_INTERVALS) return null;

  const n = accepted.length;
  const mean = accepted.reduce((a, b) => a + b, 0) / n;

  // RMSSD: only over consecutive ORIGINAL pairs where both beats are valid.
  let sumSqDiff = 0;
  let pairs = 0;
  let nn50 = 0;
  for (let segmentIndex = 0; segmentIndex < usable.length; segmentIndex += 1) {
    const segment = usable[segmentIndex]!;
    const valid = masks[segmentIndex]!;
    for (let i = 1; i < segment.length; i += 1) {
      if (!valid[i] || !valid[i - 1]) continue;
      const d = (segment[i] as number) - (segment[i - 1] as number);
      sumSqDiff += d * d;
      if (Math.abs(d) > 50) nn50 += 1;
      pairs += 1;
    }
  }
  if (pairs < MIN_CLEAN_INTERVALS - 1) return null;
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
