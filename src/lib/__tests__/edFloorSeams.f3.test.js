/**
 * F3 (Wave 1, founder-signed 2026-07-01): ED-floor seam repairs. Six audited
 * seams (01-codebase-audit EN-1/2/6/7/9/10) where two code paths could
 * disagree about the same user state or a floor could leak. Every change
 * STRENGTHENS or aligns; nothing lowers a floor or threshold. These tests are
 * the contract: they were written to fail against the pre-F3 code.
 */
import fs from 'fs';
import path from 'path';
import { computeMacroCycle, kcalFloorForSex } from '../coachApply';
import { robustSevenDaysAgo, robustTrackingSevenDaysAgo, robustEwma, robustTrackingEwma } from '../robustTrend';
import { computeEWMA } from '../weeklyCoach';
import { energyAvailabilityCaution } from '../nutritionEngine';
import { resolveEffectiveTargets } from '../food/effectiveTargets';

const DAY = 86400000;

// ── EN-2: the coach macro-cycle can never serve a day below the sex floor ────
describe('computeMacroCycle respects the sacred sex calorie floor (EN-2)', () => {
  test('a female target AT the 1200 floor proposes NO cycle (rest day would go under)', () => {
    // 1200 kcal, 100g carbs: a 25% rest-day carb cut would serve ~1100 kcal.
    const split = computeMacroCycle(
      { targetKcal: 1200, proteinG: 120, carbsG: 100, fatG: 40 },
      4,
      { sex: 'female' },
    );
    expect(split).toBeNull();
  });

  test('a male target near the 1500 floor proposes NO cycle', () => {
    const split = computeMacroCycle(
      { targetKcal: 1520, proteinG: 150, carbsG: 120, fatG: 45 },
      4,
      { sex: 'male' },
    );
    // Rest day would be 1520 - 30g*4 = 1400 < 1500.
    expect(split).toBeNull();
  });

  test('unknown sex uses the protective female floor, matching kcalFloorForSex', () => {
    expect(kcalFloorForSex(null)).toBe(1200);
    const split = computeMacroCycle(
      { targetKcal: 1210, proteinG: 120, carbsG: 100, fatG: 40 },
      4,
      { sex: null },
    );
    expect(split).toBeNull();
  });

  test('with real headroom the cycle still works and every day clears the floor', () => {
    const split = computeMacroCycle(
      { targetKcal: 2400, proteinG: 180, carbsG: 250, fatG: 70 },
      4,
      { sex: 'female' },
    );
    expect(split).not.toBeNull();
    expect(split.restDay.kcal).toBeGreaterThanOrEqual(1200);
    expect(split.trainingDay.kcal).toBeGreaterThanOrEqual(1200);
  });
});

// ── EN-2 defence-in-depth: a LEGACY persisted cycle can't render below floor ─
describe('resolveEffectiveTargets clamps a persisted sub-floor cycle day (EN-2)', () => {
  const targets = { targetKcal: 1200, proteinG: 120, carbsG: 100, fatG: 40 };
  const legacyCycle = {
    trainingDay: { kcal: 1275, proteinG: 120, carbsG: 119, fatG: 40 },
    restDay: { kcal: 1100, proteinG: 120, carbsG: 75, fatG: 40 }, // pre-F3 apply
  };

  test('a rest day persisted below the floor serves the floor, not 1100', () => {
    const out = resolveEffectiveTargets(targets, {
      macroCycle: legacyCycle, isTrainingDay: false, floorKcal: 1200,
    });
    expect(out.targetKcal).toBeGreaterThanOrEqual(1200);
    // The lift is routed through carbs so the day stays self-consistent.
    expect(out.carbsG).toBeGreaterThan(legacyCycle.restDay.carbsG);
  });

  test('days already at/above the floor are untouched', () => {
    const out = resolveEffectiveTargets(targets, {
      macroCycle: legacyCycle, isTrainingDay: true, floorKcal: 1200,
    });
    expect(out.targetKcal).toBe(1275);
    expect(out.carbsG).toBe(119);
  });
});

// ── EN-1: no fabricated weekly rate from sub-week data ───────────────────────
describe('robust 7-days-ago helpers return null on sub-week data (EN-1 / D1 #3)', () => {
  const now = Date.now();
  const subWeek = [0, 1, 2, 3].map((d) => ({ weightKg: 80 - d * 0.3, loggedAt: now - (3 - d) * DAY }));

  test('robustSevenDaysAgo: all weigh-ins inside 7 days -> null (was: earliest reading)', () => {
    expect(robustSevenDaysAgo(subWeek)).toBeNull();
  });

  test('robustTrackingSevenDaysAgo: all weigh-ins inside 7 days -> null', () => {
    expect(robustTrackingSevenDaysAgo(subWeek)).toBeNull();
  });

  test('with a genuine >=7-day anchor both still return a value', () => {
    const withAnchor = [{ weightKg: 81, loggedAt: now - 9 * DAY }, ...subWeek];
    expect(robustSevenDaysAgo(withAnchor)).not.toBeNull();
    expect(robustTrackingSevenDaysAgo(withAnchor)).not.toBeNull();
  });
});

// ── EN-6: zero/negative weigh-ins never reach the trend ──────────────────────
describe('corrupt weigh-in rows are filtered before smoothing (EN-6)', () => {
  const now = Date.now();
  const rows = [
    { weightKg: 80, loggedAt: now - 3 * DAY },
    { weightKg: 0, loggedAt: now - 2 * DAY },     // corrupt import/sync row
    { weightKg: -5, loggedAt: now - 1.5 * DAY },  // corrupt
    { weightKg: 79.8, loggedAt: now - DAY },
  ];

  test('computeEWMA drops non-positive weights (a zero row faked rapid loss)', () => {
    const series = computeEWMA(rows);
    expect(series).toHaveLength(2);
    expect(series.every((p) => p.rawKg > 0)).toBe(true);
  });

  test('robustEwma and robustTrackingEwma apply the same > 0 filter', () => {
    expect(robustEwma(rows).every((p) => p.rawKg > 0)).toBe(true);
    expect(robustTrackingEwma(rows).every((p) => p.rawKg > 0)).toBe(true);
  });
});

// ── EN-7: unknown sex gets the MORE cautious EA line ─────────────────────────
describe('energy-availability caution errs safer on unknown sex (EN-7)', () => {
  test('unknown sex uses the female 40 kcal/kg line, not the male 35', () => {
    // 60 kg, unknown sex. FFM fallback (male 0.78 by deliberate floor-safety)
    // gives 46.8 kg FFM; 1700 kcal -> EA ~36.3: below 40, above 35. The
    // caution MUST fire (female line), where the old male line stayed silent.
    const r = energyAvailabilityCaution(1700, 2200, { weightKg: 60, sex: null });
    expect(r).not.toBeNull();
    expect(r.cautionKcalPerKg).toBe(40);
  });

  test('known sexes keep their lines (male 35 / female 40)', () => {
    const male = energyAvailabilityCaution(2000, 2600, { weightKg: 80, sex: 'male' });
    expect(male?.cautionKcalPerKg).toBe(35);
    const female = energyAvailabilityCaution(1500, 2000, { weightKg: 60, sex: 'female' });
    expect(female?.cautionKcalPerKg).toBe(40);
  });
});

// ── EN-9 / EN-10: source-level guards on the weeklyCoach seams ───────────────
describe('weeklyCoach boundary and held-row seams (EN-9 / EN-10)', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../weeklyCoach.js'), 'utf8');

  test('EN-9: no strict `< -1.5` remains — every rapid-loss read shares the <= boundary', () => {
    expect(src).not.toMatch(/actualRatePct\s*<\s*-1\.5/);
    expect(src).toMatch(/actualRatePct\s*<=\s*-1\.5/);
  });

  test('EN-10: the generic calories-held row is skipped under an ED lockout', () => {
    // The generic held-row condition must exclude the ED-held state so the
    // lockout card is never contradicted by a second "calories held" reason.
    expect(src).toMatch(/&&\s*!edPatternHeld/);
  });
});
