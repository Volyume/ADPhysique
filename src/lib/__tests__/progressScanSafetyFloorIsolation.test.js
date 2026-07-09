import fs from 'fs';
import path from 'path';
import { estimateBodyFatFromScanAssets } from '../progressScanAnalysis';
import { computeFFMFloor, isAuthoritativeBodyFatSource, isBaselineBodyFatSource } from '../nutritionEngine';
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
    expect(isBaselineBodyFatSource('photo_scan')).toBe(false);
    expect(isBaselineBodyFatSource('visual')).toBe(true);
    expect(isAuthoritativeBodyFatSource('dexa')).toBe(true);
  });

  test('a high photo_scan body fat value cannot lower the FFM calorie floor', () => {
    const photoScan = computeFFMFloor(80, { bodyFatPercent: 45, bodyFatSource: 'photo_scan', sex: 'male' });
    const fallback = computeFFMFloor(80, { bodyFatPercent: null, bodyFatSource: null, sex: 'male' });
    const dangerousIfAuthoritative = computeFFMFloor(80, { bodyFatPercent: 45, bodyFatSource: 'dexa', sex: 'male' });

    expect(dangerousIfAuthoritative.floorKcal).toBeLessThan(fallback.floorKcal);
    expect(photoScan.source).toBe('fallback');
    expect(photoScan.floorKcal).toBe(fallback.floorKcal);
    expect(safeDayFloorKcal({ sex: 'male', ffmFloorKcal: photoScan.floorKcal })).toBe(fallback.floorKcal);
  });

  test('the actual Progress Scan estimator output still has no FFM-floor authority', () => {
    const estimate = estimateBodyFatFromScanAssets({
      sex: 'male',
      heightCm: 180,
      weightKg: 82,
      assets: [
        {
          pose: 'front',
          signals: {
            modelBacked: true,
            silhouetteRatios: {
              waistToShoulder: 0.64,
              waistToHip: 0.78,
              waistToHeight: 0.19,
              bodyAreaRatio: 0.30,
            },
          },
        },
        {
          pose: 'back',
          signals: {
            modelBacked: true,
            silhouetteRatios: {
              waistToShoulder: 0.62,
              waistToHip: 0.76,
              waistToHeight: 0.18,
              bodyAreaRatio: 0.29,
            },
          },
        },
      ],
    });
    expect(estimate.value).toBe(16.8);
    expect(estimate.source).toBe('photo_scan');

    const withPhotoScan = computeFFMFloor(82, {
      bodyFatPercent: estimate.value,
      bodyFatSource: estimate.source,
      sex: 'male',
    });
    const fallback = computeFFMFloor(82, {
      bodyFatPercent: null,
      bodyFatSource: null,
      sex: 'male',
    });
    expect(withPhotoScan.source).toBe('fallback');
    expect(withPhotoScan.floorKcal).toBe(fallback.floorKcal);
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

  // Wave 4 addition (integration blueprint §9 guard test 1): runWeeklyCoach's
  // output must be byte-identical whether or not ANY scan-evidence-shaped
  // data is present alongside otherwise-identical inputs. This does not
  // modify or weaken the five tests above; it adds a new, broader identity
  // check on top of them. runWeeklyCoach's destructuring has no rest-spread
  // (verified by scout 07), so unrecognised keys on the inputs object are a
  // structural no-op -- this proves that in practice, not just by reading
  // the destructuring list.
  test('runWeeklyCoach output is identical with and without scan evidence present in the inputs', () => {
    const withoutScanEvidence = runWeeklyCoach(coachCutInputs());
    const withScanEvidence = runWeeklyCoach(coachCutInputs({
      // None of these are real runWeeklyCoach parameters; they simulate a
      // future refactor accidentally passing scan evidence straight through.
      progressScanEvidence: {
        source: 'photo_scan',
        score: 92,
        band: 'Very lean',
        affectsTargets: true,
        usedFor: 'target_setting',
      },
      photo_scan: true,
      scanScore: 92,
      scanTrendDirection: 'down',
      scanConflictsWithWeight: true,
    }));
    expect(withScanEvidence).toEqual(withoutScanEvidence);
  });
});
