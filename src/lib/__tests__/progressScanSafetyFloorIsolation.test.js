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

  // ── D18 (founder decision 2026-07-09; plan-F §4.4) ─────────────────────────
  // BOUNDED-DELTA GUARD. This NARROWS the historic byte-identical guarantee for
  // the ONE real, named, bounded scan input (`photoCorroboration`) that D18
  // authorised: a strong, already-agreeing progress-photo trend may raise the
  // EMITTED `confidence` caption by EXACTLY ONE step and nothing else. The
  // guarantee becomes: output is byte-identical when photoCorroboration is
  // absent, ineligible, non-supporting, or suppressed; and when present and
  // eligible it moves `confidence` by at most one step in ONE direction (toward
  // higher confidence only) plus the two `photoCorroboration*` telemetry flags,
  // with adjustments, heldDecisions and every floor/gate field byte-identical
  // in every case. The old "any scan-shaped key is inert" guard above still
  // holds for every accidental/unrecognised key; only this named parameter has
  // a defined, bounded effect.
  //
  // Helper: strips the fields D18 permits to move, so `toEqual` on the
  // remainder proves nothing else (no calorie/macro/training/floor value)
  // changed.
  const withoutMovableFields = (out) => {
    const clone = { ...out };
    delete clone.confidence;
    delete clone.photoCorroborationApplied;
    delete clone.photoCorroborationBlocked;
    return clone;
  };
  // Untracked calorie adherence => assessDataConfidence returns 'medium' (a
  // full week of weigh-ins and >=2 weeks in phase keep it off the data_hold and
  // baseline-output paths), giving headroom to observe a single upward step to
  // 'high'. weeksInPhase < 2 would instead route to _buildBaselineOutput, which
  // never reaches the confidence field, so it is deliberately NOT used here.
  const UNTRACKED_CHECKIN = {
    energyScore: 4, recoveryScore: 4, stepsAdherence: 'hit',
    calsAdherence: 'untracked', sorenessFlag: false, cycleOverride: false,
  };
  // recentIntakeAvgKcal 2500 keeps intake clear of the FFM safety floor so no
  // hold is open — corroboration can only be observed on a hold-free week
  // (the point of the separate suppression tests below is the inverse).
  const midConfidenceInputs = (over = {}) => coachCutInputs({
    checkin: UNTRACKED_CHECKIN, recentIntakeAvgKcal: 2500, ...over,
  });
  const eligibleSupports = { eligible: true, direction: 'supports' };

  test('an eligible, supporting scan raises confidence by exactly one step and nothing else', () => {
    const base = runWeeklyCoach(midConfidenceInputs());
    const corroborated = runWeeklyCoach(midConfidenceInputs({ photoCorroboration: eligibleSupports }));

    expect(base.confidence).toBe('medium');
    expect(corroborated.confidence).toBe('high'); // exactly one step up
    expect(corroborated.photoCorroborationApplied).toBe(true);
    // Every other field — adjustments, heldDecisions, floors — is byte-identical.
    expect(withoutMovableFields(corroborated)).toEqual(withoutMovableFields(base));
  });

  test('the step is clamped at high (never above the ceiling)', () => {
    // Default cut inputs (weeksInPhase 6, >=5 weigh-ins, adherence known) => 'high'.
    const base = runWeeklyCoach(coachCutInputs());
    const corroborated = runWeeklyCoach(coachCutInputs({ photoCorroboration: eligibleSupports }));
    expect(base.confidence).toBe('high');
    expect(corroborated.confidence).toBe('high');
    expect(corroborated.photoCorroborationApplied).toBe(false);
    expect(corroborated).toEqual(base);
  });

  test('a conflicting scan never moves confidence (never lowers, never originates)', () => {
    const base = runWeeklyCoach(midConfidenceInputs());
    const conflicting = runWeeklyCoach(midConfidenceInputs({
      photoCorroboration: { eligible: true, direction: 'conflicts' },
    }));
    expect(conflicting).toEqual(base);
  });

  test('an ineligible scan is inert (kill switch: null / eligible:false restore base exactly)', () => {
    const base = runWeeklyCoach(midConfidenceInputs());
    const nullCorr = runWeeklyCoach(midConfidenceInputs({ photoCorroboration: null }));
    const ineligible = runWeeklyCoach(midConfidenceInputs({
      photoCorroboration: { eligible: false, direction: 'supports' },
    }));
    expect(nullCorr).toEqual(base);
    expect(ineligible).toEqual(base);
  });

  test('corroboration is suppressed under calm mode (a safety hold) even when eligible', () => {
    const base = runWeeklyCoach(midConfidenceInputs({ calmMode: true }));
    const corroborated = runWeeklyCoach(midConfidenceInputs({
      calmMode: true,
      photoCorroboration: eligibleSupports,
    }));
    expect(base.photoCorroborationBlocked).toBe(true);
    expect(corroborated.confidence).toBe('medium'); // unchanged under the hold
    expect(corroborated.photoCorroborationApplied).toBe(false);
    expect(corroborated).toEqual(base);
  });

  test('corroboration never moves a data_hold, and is reported blocked there', () => {
    // Fewer than 3 weigh-ins => data_hold early return (a safety hold).
    const held = runWeeklyCoach(coachCutInputs({
      morningWeights: [{ weightKg: 80, loggedAt: Date.now() }],
      photoCorroboration: eligibleSupports,
    }));
    expect(held.confidence).toBe('data_hold');
    expect(held.photoCorroborationApplied).toBe(false);
    expect(held.photoCorroborationBlocked).toBe(true);
  });

  test('the corroboration input never reaches the ED-pattern detector', () => {
    // recentWeeklyHistory drives detectEdPatternFlag; the scan input must not
    // change what it fires or the signals it reports.
    const history = Array.from({ length: 4 }, () => ({
      energy: 1, adherence: 'under', hasCheckin: true, hasFoodData: true,
    }));
    const withoutCorr = runWeeklyCoach(midConfidenceInputs({ recentWeeklyHistory: history }));
    const withCorr = runWeeklyCoach(midConfidenceInputs({
      recentWeeklyHistory: history,
      photoCorroboration: eligibleSupports,
    }));
    expect(withCorr.edPatternFired).toBe(withoutCorr.edPatternFired);
    expect(withCorr.edPatternSignals).toEqual(withoutCorr.edPatternSignals);
  });
});
