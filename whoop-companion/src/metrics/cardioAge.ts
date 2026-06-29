/**
 * Cardiovascular fitness "heart age" ESTIMATE — inspired by Oura's Cardiovascular
 * Age, but explicitly NOT the same thing. Oura's CVA derives pulse-wave velocity
 * from the ring's raw finger PPG waveform; WHOOP exposes only HR + R-R over BLE,
 * so we cannot compute PWV. Instead this is a transparent wellness estimate from
 * two age-related cardiac markers we DO have: resting heart rate and overnight
 * HRV (RMSSD). Lower RHR and higher HRV than expected for your age read younger.
 *
 * Label it an estimate everywhere — it is not a medical or PWV-based figure.
 */

export function cardioAge(input: {
  age: number;
  rhr: number | null;
  rmssd: number | null;
}): number | null {
  const { age } = input;
  if (input.rhr == null && input.rmssd == null) return null;

  let est = age;

  // Resting HR: ~60 bpm is fitness-neutral; each bpm above adds ~0.3 yr.
  if (input.rhr != null) {
    est += (input.rhr - 60) * 0.3;
  }

  // HRV: RMSSD declines with age. Expected ≈ 60 − 0.45·age (floor 16 ms).
  // Higher-than-expected HRV reads younger.
  if (input.rmssd != null) {
    const expected = Math.max(16, 60 - 0.45 * age);
    est += -(input.rmssd - expected) * 0.15;
  }

  // Keep it within a sane band around chronological age.
  est = Math.max(age - 12, Math.min(age + 15, est));
  est = Math.max(18, Math.min(100, est));
  return Math.round(est);
}
