/**
 * Step detection from 3-axis accelerometer magnitude — a windowed peak detector
 * with a motion gate. Each foot strike makes a peak in |a|; we low-pass filter,
 * then count threshold crossings spaced at least a stride apart.
 *
 * Runs on the WHOOP band's accelerometer (streamed over BLE), so steps come from
 * the strap, not the phone.
 *
 * IMPORTANT — this is BETA. The band's accelerometer byte layout is reverse-
 * engineered and not yet confirmed against captured frames, so the peak detector
 * is gated behind a scale-robust "is actually moving" check (coefficient of
 * variation of magnitude over a rolling window). At true rest a strap is steady →
 * low CV → ZERO steps, regardless of the decode scale; only sustained rhythmic
 * motion accrues steps. This kills the "1 step/second while sitting" false count.
 */

const MIN_STEP_MS = 260; // ~230 steps/min ceiling
const THRESH_G = 0.10; // peak prominence above the filtered baseline (g)
const WINDOW_MS = 3000; // motion-gate window
const MOVE_CV = 0.04; // min coefficient of variation of |a| to be "moving"
const MIN_WINDOW_SAMPLES = 8;

export class StepCounter {
  private lpf = 1; // low-pass filtered magnitude (≈1g at rest)
  private baseline = 1;
  private above = false;
  private lastStepTs = 0;
  private peakInWindow = 0;
  private steps = 0;
  // Rolling window of recent magnitudes for the motion gate.
  private win: Array<{ t: number; mag: number }> = [];

  /** Feed one accel sample; magnitude computed internally. */
  add(x: number, y: number, z: number, tMs: number): void {
    const mag = Math.sqrt(x * x + y * y + z * z);

    // ---- motion gate: only count when genuinely moving ----
    this.win.push({ t: tMs, mag });
    while (this.win.length > 0 && tMs - this.win[0]!.t > WINDOW_MS) this.win.shift();
    const moving = this.isMoving();

    // Low-pass for the signal, slower track for the baseline.
    this.lpf += 0.35 * (mag - this.lpf);
    this.baseline += 0.01 * (this.lpf - this.baseline);
    const prominence = this.lpf - this.baseline;

    if (!moving) {
      // Not moving — never accrue steps, and let the peak state settle.
      this.above = false;
      this.peakInWindow = 0;
      return;
    }

    if (!this.above && prominence > THRESH_G) {
      this.above = true;
      this.peakInWindow = prominence;
    } else if (this.above) {
      this.peakInWindow = Math.max(this.peakInWindow, prominence);
      if (prominence < THRESH_G * 0.5) {
        const gap = tMs - this.lastStepTs;
        if (this.peakInWindow > THRESH_G && (this.lastStepTs === 0 || gap > MIN_STEP_MS)) {
          this.steps += 1;
          this.lastStepTs = tMs;
        }
        this.above = false;
        this.peakInWindow = 0;
      }
    }
  }

  /** Coefficient of variation of magnitude over the window — scale-independent. */
  private isMoving(): boolean {
    if (this.win.length < MIN_WINDOW_SAMPLES) return false;
    const mags = this.win.map((w) => w.mag);
    const mean = mags.reduce((a, b) => a + b, 0) / mags.length;
    if (mean <= 0) return false;
    const variance = mags.reduce((a, b) => a + (b - mean) ** 2, 0) / mags.length;
    const cv = Math.sqrt(variance) / mean;
    return cv > MOVE_CV;
  }

  get count(): number {
    return this.steps;
  }

  reset(): void {
    this.steps = 0;
    this.lastStepTs = 0;
    this.above = false;
    this.peakInWindow = 0;
    this.win = [];
  }
}
