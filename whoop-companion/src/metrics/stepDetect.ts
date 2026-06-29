/**
 * Step detection from 3-axis accelerometer magnitude — a standard windowed
 * peak detector. Each foot strike produces a peak in |a| above a baseline; we
 * low-pass filter, then count upward threshold crossings spaced at least a
 * stride apart. Tuned for wrist accel (~25-50 Hz); robust to the exact sample
 * rate since it uses time gaps, not sample counts.
 *
 * This runs on the WHOOP band's accelerometer (streamed over BLE), so steps are
 * counted from the strap, not the phone.
 */

const MIN_STEP_MS = 260; // ~230 steps/min ceiling
const MAX_STEP_MS = 2000; // below this cadence we still accept (slow walk)
const THRESH_G = 0.10; // peak prominence above the filtered baseline (g)

export class StepCounter {
  private lpf = 1; // low-pass filtered magnitude (≈1g at rest)
  private baseline = 1;
  private above = false;
  private lastStepTs = 0;
  private peakInWindow = 0;
  private steps = 0;

  /** Feed one accel sample; magnitude computed internally. */
  add(x: number, y: number, z: number, tMs: number): void {
    const mag = Math.sqrt(x * x + y * y + z * z);
    // Low-pass for the signal, slower track for the baseline.
    this.lpf += 0.35 * (mag - this.lpf);
    this.baseline += 0.01 * (this.lpf - this.baseline);
    const prominence = this.lpf - this.baseline;

    if (!this.above && prominence > THRESH_G) {
      // Upward crossing — potential step onset.
      this.above = true;
      this.peakInWindow = prominence;
    } else if (this.above) {
      this.peakInWindow = Math.max(this.peakInWindow, prominence);
      if (prominence < THRESH_G * 0.5) {
        // Fell back below — register a step if spacing is plausible.
        const gap = tMs - this.lastStepTs;
        if (this.peakInWindow > THRESH_G && (this.lastStepTs === 0 || gap > MIN_STEP_MS)) {
          this.steps += 1;
          this.lastStepTs = tMs;
        }
        this.above = false;
        this.peakInWindow = 0;
      }
    }
    void MAX_STEP_MS;
  }

  get count(): number {
    return this.steps;
  }

  reset(): void {
    this.steps = 0;
    this.lastStepTs = 0;
    this.above = false;
  }
}
