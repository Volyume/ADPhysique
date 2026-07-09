/**
 * Tests for the FFM-floor safety integration in runWeeklyCoach.
 *
 * Spec from MOVE_1_FOOD_FOUNDATION_AND_FFM.md and COACHING_VOICE_SYNTHESIS_LOCKED.md:
 * - The floor only fires with >=5 days of intake logged in the last 7.
 * - When intake <= floor AND a cut was suggested, the cut is held and
 *   a 'ffm_floor' held-decision surfaces.
 * - 'ffm_floor_hold' WHY key is selected when the floor fires.
 * - Calorie INCREASES are never blocked by the floor.
 * - When the floor doesn't fire, behaviour is unchanged.
 */
import { runWeeklyCoach } from '../weeklyCoach';

function checkin(over = {}) {
  return {
    energyScore: 4,
    recoveryScore: 4,
    stepsAdherence: 'hit',
    calsAdherence: 'hit',
    sorenessFlag: false,
    cycleOverride: false,
    ...over,
  };
}

function baseInputs(over = {}) {
  return {
    currentCalTarget: 1800,
    currentStepsTarget: 8000,
    sessionsCompleted: 4,
    sessionsPlanned: 4,
    morningWeights: trendRising(80, 0.03),
    goalPhase: 'mild_cut',
    weeksInPhase: 6,
    consecutiveOffTargetWeeks: 3,
    lastCalAdjustmentWeeksAgo: 4,
    scoffPositive: false,
    bodyweightKg: 80,
    ...over,
  };
}

// Build 14 days of weight rising slightly (triggers the "cut more" path
// in runWeeklyCoach when on a cut). Numbers chosen so consecutiveOffTargetWeeks
// can be set high and the engine wants to suggest a calorie reduction.
function trendRising(start = 80, perDayKg = 0.08) {
  const days = 14;
  const out = [];
  for (let i = 0; i < days; i++) {
    const daysAgo = days - 1 - i;
    out.push({
      weightKg: start + perDayKg * i,
      loggedAt: Date.now() - daysAgo * 86400000,
    });
  }
  return out;
}

describe('runWeeklyCoach: FFM-floor safety integration', () => {
  test('without FFM context, floor never fires and behaviour is unchanged', () => {
    const out = runWeeklyCoach(baseInputs({
      checkin: checkin({ calsAdherence: 'hit' }),
      // No recentIntakeAvgKcal or recentIntakeDaysLogged supplied.
    }));
    expect(out.ffmFloorHeld).toBe(false);
    expect(out.ffmFloorContext).toBeNull();
  });

  test('with FFM context but <5 days of intake, floor does not fire (data gate)', () => {
    const out = runWeeklyCoach(baseInputs({
      checkin: checkin({ calsAdherence: 'hit' }),
      bodyFatPercent: 15,
      bodyFatSource: 'dexa',
      sex: 'male',
      recentIntakeAvgKcal: 1500, // would be below floor
      recentIntakeDaysLogged: 3,  // but below the 5-day gate
    }));
    expect(out.ffmFloorHeld).toBe(false);
  });

  test('with sufficient days and intake AT or BELOW floor + cut suggested, holds the cut', () => {
    const out = runWeeklyCoach(baseInputs({
      checkin: checkin({ calsAdherence: 'hit' }),
      bodyFatPercent: 15,
      bodyFatSource: 'dexa',
      sex: 'male',
      recentIntakeAvgKcal: 1900,
      recentIntakeDaysLogged: 7,
    }));
    expect(out.ffmFloorHeld).toBe(true);
    expect(out.ffmFloorContext).toMatchObject({
      floorKcal: 2040,
      ffmKg: 68.0,
      source: 'katch_mcardle',
      recentIntakeAvgKcal: 1900,
      recentIntakeDaysLogged: 7,
    });
    expect(out.adjustments.calories).toBeNull();
    expect(out.heldDecisions?.some(d => d.type === 'ffm_floor')).toBe(true);
  });

  // Wave-3 hostile-review BLOCKER (2026-07-02): the outer floor gate required
  // a profile bodyweightKg with no fallback, so a user with a null profile
  // weight could receive a calorie CUT while their 7-day intake sat at or
  // below the RED-S floor. The gate now falls back to the weigh-in series
  // (the same fallback the adaptive floor context has always used). These
  // two scenarios are the reviewer's verified repros and must never regress.
  test('BLOCKER repro: skipped check-in + food diary + NULL profile weight: the floor still holds the cut', () => {
    const flat90 = Array.from({ length: 28 }, (_, i) => ({
      weightKg: 90, loggedAt: Date.now() - (27 - i) * 86400000,
    }));
    const out = runWeeklyCoach(baseInputs({
      checkin: null,                    // B1 stands-in path
      // The stand-in window (founder decision 2026-07-02) is SENIOR to this
      // scenario: without a recent check-in the resize freezes before the
      // floor is needed. A last-week check-in opens the window on purpose,
      // so this repro still proves the floor beneath it.
      lastCheckinAt: Date.now() - 7 * 86400000,
      bodyweightKg: null,               // sync-degraded/legacy profile
      morningWeights: flat90,           // stalled cut: the engine wants a reduction
      currentCalTarget: 2000,
      recentIntakeAvgKcal: 1400,        // far below any 90 kg floor
      recentIntakeDaysLogged: 6,
      sex: 'male',
    }));
    expect(out.adjustments?.calories?.change ?? 0).toBeGreaterThanOrEqual(0);
    expect(out.ffmFloorHeld).toBe(true);
    expect(out.heldDecisions?.some(d => d.type === 'ffm_floor')).toBe(true);
  });

  test('BLOCKER repro (pre-existing shape): tracked check-in + NULL profile weight: the floor still holds the cut', () => {
    const flat90 = Array.from({ length: 28 }, (_, i) => ({
      weightKg: 90, loggedAt: Date.now() - (27 - i) * 86400000,
    }));
    const out = runWeeklyCoach(baseInputs({
      checkin: checkin({ calsAdherence: 'hit' }),
      bodyweightKg: null,
      morningWeights: flat90,
      currentCalTarget: 2000,
      recentIntakeAvgKcal: 1400,
      recentIntakeDaysLogged: 7,
      sex: 'male',
    }));
    expect(out.adjustments?.calories?.change ?? 0).toBeGreaterThanOrEqual(0);
    expect(out.ffmFloorHeld).toBe(true);
    expect(out.heldDecisions?.some(d => d.type === 'ffm_floor')).toBe(true);
  });

  test('FFM held-decision reason mirrors back the actual intake and floor', () => {
    const out = runWeeklyCoach(baseInputs({
      checkin: checkin({ calsAdherence: 'hit' }),
      bodyFatPercent: 15,
      bodyFatSource: 'dexa',
      sex: 'male',
      recentIntakeAvgKcal: 1800,
      recentIntakeDaysLogged: 7,
    }));
    const ffmDecision = out.heldDecisions.find(d => d.type === 'ffm_floor');
    expect(ffmDecision).toBeDefined();
    expect(ffmDecision.reason).toMatch(/1800/);
    expect(ffmDecision.reason).toMatch(/2040/);
    expect(ffmDecision.reason).not.toMatch(/together|let's work|let's decide/i);
    expect(ffmDecision.reason).not.toMatch(/you should|you must/i);
  });

  test('FFM floor never blocks a calorie INCREASE', () => {
    const out = runWeeklyCoach(baseInputs({
      currentCalTarget: 2000,
      morningWeights: trendRising(80, -0.12),
      goalPhase: 'lean_gain',
      checkin: checkin({ calsAdherence: 'hit' }),
      bodyFatPercent: 15,
      bodyFatSource: 'dexa',
      sex: 'male',
      recentIntakeAvgKcal: 1800,
      recentIntakeDaysLogged: 7,
    }));
    if (out.adjustments?.calories?.change > 0) {
      expect(out.ffmFloorHeld).toBe(false);
    }
  });

  test('FFM floor supersedes the standard calorie-held reasons', () => {
    const out = runWeeklyCoach(baseInputs({
      checkin: checkin({ calsAdherence: 'hit' }),
      bodyFatPercent: 15,
      bodyFatSource: 'dexa',
      sex: 'male',
      recentIntakeAvgKcal: 1700,
      recentIntakeDaysLogged: 7,
    }));
    expect(out.ffmFloorHeld).toBe(true);
    const types = out.heldDecisions.map(d => d.type);
    expect(types).toContain('ffm_floor');
    expect(types).not.toContain('calories');
  });

  test('whyThisWeek explains the FFM-floor hold when it fires', () => {
    const out = runWeeklyCoach(baseInputs({
      checkin: checkin({ calsAdherence: 'hit' }),
      bodyFatPercent: 15,
      bodyFatSource: 'dexa',
      sex: 'male',
      recentIntakeAvgKcal: 1800,
      recentIntakeDaysLogged: 7,
    }));
    expect(out.whyThisWeek).toMatch(/calorie target holds/);
    // 'fat-free mass' -> 'lean mass': commit de9a1653 (2026-07-09) restored the
    // ffm_floor_hold copy to comply with the plain-mechanism jargon rule in
    // docs/COACHING_VOICE_SYNTHESIS_LOCKED.md line 178 ("Substitute 'FFM' with
    // 'lean mass' or 'muscle'"). The floor threshold/maths are untouched -
    // floorKcal: 2040 is still asserted exactly by the test above this one.
    expect(out.whyThisWeek).toMatch(/lean mass/);
  });

  test('intake above the floor does not trigger the hold', () => {
    const out = runWeeklyCoach(baseInputs({
      checkin: checkin({ calsAdherence: 'hit' }),
      bodyFatPercent: 15,
      bodyFatSource: 'dexa',
      sex: 'male',
      recentIntakeAvgKcal: 2200,
      recentIntakeDaysLogged: 7,
    }));
    expect(out.ffmFloorHeld).toBe(false);
    expect(out.heldDecisions.find(d => d.type === 'ffm_floor')).toBeUndefined();
  });
});
