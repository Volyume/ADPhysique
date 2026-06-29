/**
 * Heart-rate variability from R-R intervals, using the Task Force (1996)
 * time-domain definitions. These are the same metrics WHOOP's recovery leans on
 * (RMSSD in particular). Inputs are R-R intervals in milliseconds.
 *
 * Artefact handling: ectopic beats / dropped beats produce wild R-R values, so
 * we filter to a physiological window and drop intervals that differ from the
 * previous accepted one by more than 20% (a standard, simple cleaner).
 */

export type HrvResult = {
  /** Root mean square of successive differences (ms) — the key recovery signal. */
  rmssd: number;
  /** Standard deviation of NN intervals (ms). */
  sdnn: number;
  /** Proportion of successive NN pairs differing by > 50 ms (%). */
  pnn50: number;
  /** Mean heart rate implied by the accepted intervals (bpm). */
  meanHr: number;
  /** Count of accepted intervals used. */
  count: number;
};

const RR_MIN_MS = 300; // 200 bpm
const RR_MAX_MS = 2000; // 30 bpm

/** Filter R-R intervals to physiological range + reject >20% jumps. */
export function cleanRr(rr: number[]): number[] {
  const out: number[] = [];
  let prev: number | null = null;
  for (const v of rr) {
    if (v < RR_MIN_MS || v > RR_MAX_MS) continue;
    if (prev !== null && Math.abs(v - prev) > 0.2 * prev) {
      // Likely ectopic/artefact; skip but don't reset the reference.
      continue;
    }
    out.push(v);
    prev = v;
  }
  return out;
}

export function computeHrv(rrRaw: number[]): HrvResult | null {
  const rr = cleanRr(rrRaw);
  if (rr.length < 2) return null;

  const n = rr.length;
  const mean = rr.reduce((a, b) => a + b, 0) / n;

  let sumSqDiff = 0; // for RMSSD
  let nn50 = 0;
  for (let i = 1; i < n; i += 1) {
    const d = (rr[i] as number) - (rr[i - 1] as number);
    sumSqDiff += d * d;
    if (Math.abs(d) > 50) nn50 += 1;
  }
  const rmssd = Math.sqrt(sumSqDiff / (n - 1));

  let sumVar = 0; // for SDNN
  for (const v of rr) sumVar += (v - mean) * (v - mean);
  const sdnn = Math.sqrt(sumVar / n);

  const pnn50 = (nn50 / (n - 1)) * 100;
  const meanHr = 60000 / mean;

  return {
    rmssd: round1(rmssd),
    sdnn: round1(sdnn),
    pnn50: round1(pnn50),
    meanHr: round1(meanHr),
    count: n,
  };
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
