/**
 * Irregular-rhythm (AFib) SCREENING from R-R intervals — mirrors WHOOP MG's
 * irregular-heart-rhythm notification in spirit. This is a wellness screen, NOT
 * a diagnosis and NOT an ECG: the strap gives R-R timing, not electrical signal.
 *
 * Atrial fibrillation is "irregularly irregular" — sustained high beat-to-beat
 * variation with no organised pattern. We compute, over a rest/sleep window:
 *   - CV of R-R (sdRR / meanRR)
 *   - pNN50 (share of successive R-R differing > 50 ms)
 * and only flag when BOTH are extreme and sustained over many beats. Thresholds
 * are deliberately conservative to avoid alarming users — normal high HRV at rest
 * (respiratory sinus arrhythmia) is organised and should read "regular".
 */

export type RhythmStatus = 'insufficient' | 'regular' | 'monitor' | 'irregular';
export type RhythmResult = {
  status: RhythmStatus;
  cvRR: number | null; // coefficient of variation of R-R
  pnn50: number | null; // %
  beats: number;
  note: string;
};

const MIN_BEATS = 150;

function physiologic(rr: number[]): number[] {
  return rr.filter((v) => v >= 300 && v <= 2000);
}

export function rhythmScreen(rrAll: number[]): RhythmResult {
  const rr = physiologic(rrAll);
  if (rr.length < MIN_BEATS) {
    return {
      status: 'insufficient',
      cvRR: null,
      pnn50: null,
      beats: rr.length,
      note: 'Not enough resting beat data yet — wear the strap overnight to run a rhythm screen.',
    };
  }
  const mean = rr.reduce((a, b) => a + b, 0) / rr.length;
  const sd = Math.sqrt(rr.reduce((a, b) => a + (b - mean) ** 2, 0) / (rr.length - 1));
  const cvRR = sd / mean;
  let nn50 = 0;
  for (let i = 1; i < rr.length; i += 1) if (Math.abs(rr[i]! - rr[i - 1]!) > 50) nn50 += 1;
  const pnn50 = (nn50 / (rr.length - 1)) * 100;

  let status: RhythmStatus = 'regular';
  let note =
    'No irregular rhythm detected in your resting heart-beat timing. This is a wellness screen, not a medical diagnosis.';
  if (cvRR > 0.2 && pnn50 > 60) {
    status = 'irregular';
    note =
      'Possible irregular beats detected in your resting rhythm. This is NOT a diagnosis and not an ECG — if this persists or you have symptoms, please consult a doctor.';
  } else if (cvRR > 0.15 && pnn50 > 45) {
    status = 'monitor';
    note =
      'Your resting rhythm shows higher-than-usual beat-to-beat variation. This is often just normal high HRV; keep an eye on it over a few nights.';
  }
  return {
    status,
    cvRR: Math.round(cvRR * 1000) / 1000,
    pnn50: Math.round(pnn50),
    beats: rr.length,
    note,
  };
}
