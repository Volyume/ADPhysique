/**
 * Step detection from accelerometer magnitude, for when the band's IMU stream is
 * available (or as a phone-pedometer fallback). Classic peak-detection on the
 * gravity-removed acceleration magnitude with a refractory period — the standard
 * approach for wrist pedometers.
 *
 * Input: samples of 3-axis acceleration in g, at a known sample rate.
 */

export type AccelSample = { x: number; y: number; z: number };

export type StepResult = {
  steps: number;
  cadenceSpm: number; // steps per minute over the window
};

const MIN_PEAK_G = 0.12; // threshold above the smoothed baseline
const REFRACTORY_MS = 250; // min time between steps (~240 spm max)

export function detectSteps(samples: AccelSample[], sampleRateHz: number): StepResult {
  if (samples.length < 3 || sampleRateHz <= 0) return { steps: 0, cadenceSpm: 0 };

  // Magnitude with gravity (~1g) removed via a running mean.
  const dtMs = 1000 / sampleRateHz;
  let mean = 1;
  const alpha = 0.05;
  const detrended: number[] = [];
  for (const s of samples) {
    const mag = Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z);
    mean = (1 - alpha) * mean + alpha * mag;
    detrended.push(mag - mean);
  }

  let steps = 0;
  let lastStepMs = -REFRACTORY_MS;
  for (let i = 1; i < detrended.length - 1; i += 1) {
    const v = detrended[i] as number;
    const prev = detrended[i - 1] as number;
    const next = detrended[i + 1] as number;
    const isPeak = v > prev && v >= next && v > MIN_PEAK_G;
    const tMs = i * dtMs;
    if (isPeak && tMs - lastStepMs >= REFRACTORY_MS) {
      steps += 1;
      lastStepMs = tMs;
    }
  }

  const windowMin = (samples.length * dtMs) / 60000;
  const cadenceSpm = windowMin > 0 ? Math.round(steps / windowMin) : 0;
  return { steps, cadenceSpm };
}
