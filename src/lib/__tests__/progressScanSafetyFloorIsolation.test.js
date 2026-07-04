import fs from 'fs';
import path from 'path';
import { computeFFMFloor, isAuthoritativeBodyFatSource } from '../nutritionEngine';
import { safeDayFloorKcal } from '../food/calorieBank';
import { runWeeklyCoach } from '../weeklyCoach';

function risingWeights(start = 80, perDayKg = 0.08) {
  return Array.from({ length: 28 }, (_, i) => ({
    weightKg: start + perDayKg * i,
    loggedAt: Date.now() - (27 - i) * 86400000,
  }));
}

function coachCutInputs(over = {}) {
  return {
    currentCalTarget: 1900,
    currentStepsTarget: 8000,
    sessionsCompleted: 4,
    sessionsPlanned: 4,
    morningWeights: risingWeights(80, 0.04),
    goalPhase: 'mild_cut',
    weeksInPhase: 6,
    consecutiveOffTargetWeeks: 3,
    lastCalAdjustmentWeeksAgo: 4,
    checkin: {
      energyScore: 4,
      recoveryScore: 4,
      stepsAdherence: 'hit',
      calsAdherence: 'hit',
      sorenessFlag: false,
      cycleOverride: false,
    },
    scoffPositive: false,
    bodyweightKg: 80,
    sex: 'male',
    recentIntakeDaysLogged: 7,
    recentIntakeAvgKcal: 1700,
    ...over,
  };
}

describe('Progress Scan safety-floor isolation', () => {
  test('photo_scan is never an authoritative Katch-McArdle source', () => {
    expect(isAuthoritativeBodyFatSource('photo_scan')).toBe(false);
    expect(isAuthoritativeBodyFatSource('dexa')).toBe(true);
  });

  test('a high photo_scan body-fat value cannot lower the FFM calorie floor', () => {
    const photoScan = computeFFMFloor(80, { bodyFatPercent: 45, bodyFatSource: 'photo_scan', sex: 'male' });
    const fallback = computeFFMFloor(80, { bodyFatPercent: null, bodyFatSource: null, sex: 'male' });
    const dangerousIfAuthoritative = computeFFMFloor(80, { bodyFatPercent: 45, bodyFatSource: 'dexa', sex: 'male' });

    expect(dangerousIfAuthoritative.floorKcal).toBeLessThan(fallback.floorKcal);
    expect(photoScan.source).toBe('fallback');
    expect(photoScan.floorKcal).toBe(fallback.floorKcal);
    expect(safeDayFloorKcal({ sex: 'male', ffmFloorKcal: photoScan.floorKcal })).toBe(fallback.floorKcal);
  });

  test('photo_scan cannot authorise a deeper weekly-coach calorie cut', () => {
    const withoutScan = runWeeklyCoach(coachCutInputs({
      bodyFatPercent: null,
      bodyFatSource: null,
    }));
    const withPhotoScan = runWeeklyCoach(coachCutInputs({
      bodyFatPercent: 45,
      bodyFatSource: 'photo_scan',
    }));

    expect(withoutScan.ffmFloorHeld).toBe(true);
    expect(withPhotoScan.ffmFloorHeld).toBe(true);
    expect(withPhotoScan.adjustments?.calories?.change ?? 0).toBeGreaterThanOrEqual(0);
    expect(withPhotoScan.ffmFloorContext.floorKcal).toBe(withoutScan.ffmFloorContext.floorKcal);
  });

  test('nutrition and floor surfaces do not import or read Progress Scan tables', () => {
    const root = path.resolve(__dirname, '..', '..');
    const files = [
      path.join(root, 'lib', 'nutritionEngine.js'),
      path.join(root, 'lib', 'weeklyCoach.js'),
      path.join(root, 'lib', 'food', 'calorieBank.js'),
      path.join(root, 'screens', 'DiaryScreen.js'),
      path.join(root, 'screens', 'PerDayTargetsScreen.js'),
    ];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).not.toMatch(/progress_scan|progressScan|ProgressScan|photo_scan.*ffm/i);
    }
  });
});
