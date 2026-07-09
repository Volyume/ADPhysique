/**
 * Integration tests: FFM floor clamps deficit suggestions inside
 * computeAdaptiveTDEEAdjustment.
 *
 * Locks the synthesis-spec behaviour:
 * - Without ffmFloorContext, function behaves as before (back-compat).
 * - With ffmFloorContext but < 5 days of intake data, floor does not
 *   fire (data sufficiency gate).
 * - With ffmFloorContext + >= 5 days + intake above floor: no clamp.
 * - With ffmFloorContext + >= 5 days + intake at/below floor +
 *   negative adjustment suggestion: clamp to 0, set floorHeld=true,
 *   replace insight with the safety-cold message.
 * - With ffmFloorContext + >= 5 days + intake at/below floor +
 *   positive adjustment suggestion: pass through unchanged
 *   (increases never blocked).
 */
import { computeAdaptiveTDEEAdjustment } from '../nutritionEngine';

// Build 21 days of EWMA that show steady weight LOSS to trigger a
// negative adjustment suggestion (the engine wants to add calories
// back, but the FFM floor logic only clamps NEGATIVE adjustments;
// so we actually need a scenario where the engine wants to cut more).
//
// Engine math: negative adjustment = "your weight has risen faster
// than planned, trim kcal". Positive adjustment = "weight moved
// slower than planned, add kcal".
//
// To make the engine want to CUT (negative adjustment), we need
// weight to be RISING. To make the floor matter, we then need the
// recent intake to be at or below the FFM floor. That's the
// scenario that the safety check is designed for: a user gaining
// despite low intake (likely TDEE is much lower than estimated,
// often signs of metabolic adaptation, and pushing the deficit
// further down is the wrong call).

function buildEwma({ start, perDayKg, days = 21 }) {
  const now = Date.now();
  const out = [];
  for (let i = 0; i < days; i++) {
    const daysAgo = days - 1 - i;
    out.push({
      ewma: start + perDayKg * i,
      day: now - daysAgo * 86400000,
    });
  }
  return out;
}

describe('computeAdaptiveTDEEAdjustment + FFM floor integration', () => {
  test('without ffmFloorContext, floorHeld is always false', () => {
    const result = computeAdaptiveTDEEAdjustment({
      ewmaData: buildEwma({ start: 80, perDayKg: 0.03 }),
      prescribedKcal: 1500,
      currentTDEEEstimate: 2000,
      adherenceFactor: 1.0,
    });
    expect(result.floorHeld).toBe(false);
    // Behaviour unchanged: adjustmentKcal is whatever the math says.
    expect(result.adjustmentKcal).not.toBe(0);
  });

  test('with ffmFloorContext but only 3 days logged, floor does not fire (data gate)', () => {
    const result = computeAdaptiveTDEEAdjustment({
      ewmaData: buildEwma({ start: 80, perDayKg: 0.03 }),
      prescribedKcal: 1500,
      currentTDEEEstimate: 2000,
      adherenceFactor: 1.0,
      ffmFloorContext: {
        weightKg: 80,
        bodyFatPercent: 15,
        bodyFatSource: 'dexa',
        sex: 'male',
        recentIntakeAvgKcal: 1200, // well below floor of 2040
        recentIntakeDaysLogged: 3, // below the 5-day gate
      },
    });
    expect(result.floorHeld).toBe(false);
  });

  test('with sufficient days and intake ABOVE floor, no clamp', () => {
    const result = computeAdaptiveTDEEAdjustment({
      ewmaData: buildEwma({ start: 80, perDayKg: 0.03 }),
      prescribedKcal: 1500,
      currentTDEEEstimate: 2000,
      adherenceFactor: 1.0,
      ffmFloorContext: {
        weightKg: 80,
        bodyFatPercent: 15,
        bodyFatSource: 'dexa',
        sex: 'male',
        recentIntakeAvgKcal: 2100, // ABOVE floor of 2040
        recentIntakeDaysLogged: 7,
      },
    });
    expect(result.floorHeld).toBe(false);
  });

  test('with sufficient days and intake AT or BELOW floor + negative adjustment, clamps and sets floorHeld', () => {
    const result = computeAdaptiveTDEEAdjustment({
      ewmaData: buildEwma({ start: 80, perDayKg: 0.03 }), // gaining -> engine wants to cut
      prescribedKcal: 1500,
      currentTDEEEstimate: 2000,
      adherenceFactor: 1.0,
      ffmFloorContext: {
        weightKg: 80,
        bodyFatPercent: 15,
        bodyFatSource: 'dexa',
        sex: 'male',
        recentIntakeAvgKcal: 1800, // BELOW floor of 2040
        recentIntakeDaysLogged: 7,
      },
    });
    expect(result.floorHeld).toBe(true);
    expect(result.adjustmentKcal).toBe(0);
    expect(result.insight).toMatch(/Precision Coaching/);
    expect(result.insight).toMatch(/safety floor/);
    expect(result.insight).toMatch(/1800/); // mirrors back the actual intake
    expect(result.insight).toMatch(/2040/); // mirrors back the floor value
  });

  test('with sufficient days and intake AT or BELOW floor + positive adjustment, passes through unchanged', () => {
    // Weight losing FASTER than expected => engine wants to ADD kcal
    // (TDEE estimate is too low). Prescribed 1500 / TDEE 2000 implies
    // expected loss ~0.45 kg/week. Actual loss of ~0.80 kg/week sits
    // above that, so the math points to a positive adjustment.
    // perDayKg of -0.114 produces ~0.80 kg/week loss.
    const result = computeAdaptiveTDEEAdjustment({
      ewmaData: buildEwma({ start: 80, perDayKg: -0.114 }),
      prescribedKcal: 1500,
      currentTDEEEstimate: 2000,
      adherenceFactor: 1.0,
      ffmFloorContext: {
        weightKg: 80,
        bodyFatPercent: 15,
        bodyFatSource: 'dexa',
        sex: 'male',
        recentIntakeAvgKcal: 1500, // BELOW floor of 2040
        recentIntakeDaysLogged: 7,
      },
    });
    expect(result.adjustmentKcal).toBeGreaterThan(0);
    expect(result.floorHeld).toBe(false); // positive adjustment never blocked
  });

  test('fallback FFM path: female unknown BF, intake below sex-derived floor + negative adjustment, clamps', () => {
    // 70kg female fallback FFM = 70 * 0.72 = 50.4kg; floor = 1512 kcal.
    const result = computeAdaptiveTDEEAdjustment({
      ewmaData: buildEwma({ start: 70, perDayKg: 0.03 }),
      prescribedKcal: 1300,
      currentTDEEEstimate: 1700,
      adherenceFactor: 1.0,
      ffmFloorContext: {
        weightKg: 70,
        sex: 'female',
        recentIntakeAvgKcal: 1400, // below floor of 1512
        recentIntakeDaysLogged: 7,
      },
    });
    expect(result.floorHeld).toBe(true);
    expect(result.adjustmentKcal).toBe(0);
  });

  test('boundary: intake exactly equal to floor with negative adjustment, still clamps', () => {
    const result = computeAdaptiveTDEEAdjustment({
      ewmaData: buildEwma({ start: 80, perDayKg: 0.03 }),
      prescribedKcal: 1500,
      currentTDEEEstimate: 2000,
      adherenceFactor: 1.0,
      ffmFloorContext: {
        weightKg: 80,
        bodyFatPercent: 15,
        bodyFatSource: 'dexa',
        sex: 'male',
        recentIntakeAvgKcal: 2040, // EXACTLY at the floor
        recentIntakeDaysLogged: 7,
      },
    });
    expect(result.floorHeld).toBe(true);
    expect(result.adjustmentKcal).toBe(0);
  });

  test('honesty: clamp insight passes the "true if user kept logging" test', () => {
    const result = computeAdaptiveTDEEAdjustment({
      ewmaData: buildEwma({ start: 80, perDayKg: 0.03 }),
      prescribedKcal: 1500,
      currentTDEEEstimate: 2000,
      adherenceFactor: 1.0,
      ffmFloorContext: {
        weightKg: 80,
        bodyFatPercent: 15,
        bodyFatSource: 'dexa',
        sex: 'male',
        recentIntakeAvgKcal: 1700,
        recentIntakeDaysLogged: 7,
      },
    });
    // No false-collaboration or fake-autonomy phrasing
    expect(result.insight).not.toMatch(/let's|together|we'll work/i);
    expect(result.insight).not.toMatch(/you should|you must|you decide/i);
  });
});
