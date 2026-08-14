/**
 * effectiveTargets — ONE DAILY TRUTH (Campaign 17A, founder law).
 *
 * What this suite pins, and why: Volyume has the SAME base calorie and macro
 * target every day. The resolver used to run a four-way precedence (refeed >
 * carb cycle > bank > per-weekday offset > flat); three of those four are now
 * forbidden outright, because they made the day's target depend on knowing
 * which weekday the athlete trains, and a Volyume athlete trains whenever life
 * allows.
 *
 * So this suite pins BOTH halves of the law:
 *   - the positive: the stored target stands, and only a user-directed bank
 *     moves a day;
 *   - the negative: passing the OLD inputs (isRefeedDay/refeed, macroCycle,
 *     isTrainingDay, perDayOffsetKcal) changes nothing. Those tests exist so a
 *     future re-wiring of any retired path fails here rather than shipping.
 */
import { resolveEffectiveTargets, dayTypeLabel } from '../effectiveTargets';

const base = { targetKcal: 2000, proteinG: 180, carbsG: 200, fatG: 60 };

describe('resolveEffectiveTargets', () => {
  test('passes through a null target', () => {
    expect(resolveEffectiveTargets(null, {})).toBeNull();
  });

  test('returns the stored target with nothing applied', () => {
    expect(resolveEffectiveTargets(base, {})).toBe(base);
  });

  test('a banked delta shifts kcal via carbs, holding protein and fat', () => {
    const out = resolveEffectiveTargets(base, { bankedDelta: 400 });
    expect(out.targetKcal).toBe(2400);
    expect(out.carbsG).toBeGreaterThan(base.carbsG);
    expect(out.proteinG).toBe(base.proteinG);
    expect(out.fatG).toBe(base.fatG);
  });

  test('a negative banked delta shifts kcal down via carbs', () => {
    const out = resolveEffectiveTargets(base, { bankedDelta: -300 });
    expect(out.targetKcal).toBe(1700);
    expect(out.carbsG).toBeLessThan(base.carbsG);
    expect(out.proteinG).toBe(base.proteinG);
  });

  test('a zero banked delta leaves the stored target untouched (same reference)', () => {
    expect(resolveEffectiveTargets(base, { bankedDelta: 0 })).toBe(base);
  });

  test('the stored target object is never mutated', () => {
    const snapshot = { ...base };
    resolveEffectiveTargets(base, { bankedDelta: 400 });
    expect(base).toEqual(snapshot);
  });

  // ── The retired paths. These must stay dead. ─────────────────────────────
  describe('ONE DAILY TRUTH: retired day-type inputs change nothing', () => {
    test('a refeed day input does not raise the day', () => {
      const refeed = { kcal: 2600, proteinG: 180, carbsG: 350, fatG: 60 };
      expect(resolveEffectiveTargets(base, { isRefeedDay: true, refeed })).toBe(base);
    });

    test('a carb cycle input does not swap in a training-day or rest-day split', () => {
      const macroCycle = {
        trainingDay: { kcal: 2300, carbsG: 260 },
        restDay: { kcal: 1800, carbsG: 140 },
      };
      expect(resolveEffectiveTargets(base, { macroCycle, isTrainingDay: true })).toBe(base);
      expect(resolveEffectiveTargets(base, { macroCycle, isTrainingDay: false })).toBe(base);
    });

    test('a per-weekday planning offset does not shift the day', () => {
      expect(resolveEffectiveTargets(base, { perDayOffsetKcal: 300, floorKcal: 1500 })).toBe(base);
      expect(resolveEffectiveTargets(base, { perDayOffsetKcal: -300, floorKcal: 1500 })).toBe(base);
    });

    test('every retired input together still yields exactly the stored target', () => {
      const out = resolveEffectiveTargets(base, {
        isRefeedDay: true,
        refeed: { kcal: 2600, carbsG: 350 },
        macroCycle: { trainingDay: { kcal: 2300 }, restDay: { kcal: 1800 } },
        isTrainingDay: true,
        perDayOffsetKcal: 500,
        floorKcal: 1500,
      });
      expect(out).toBe(base);
    });

    test('the bank still applies while every retired input is present', () => {
      // The bank is the ONE user-directed exception and must survive the purge.
      const out = resolveEffectiveTargets(base, {
        isRefeedDay: true,
        refeed: { kcal: 2600, carbsG: 350 },
        macroCycle: { trainingDay: { kcal: 2300 }, restDay: { kcal: 1800 } },
        isTrainingDay: true,
        perDayOffsetKcal: 500,
        bankedDelta: 200,
      });
      expect(out.targetKcal).toBe(2200); // the bank, and only the bank
    });
  });
});

describe('dayTypeLabel', () => {
  test('bank direction labels higher / lower', () => {
    expect(dayTypeLabel({ bankedDelta: 300 })).toBe('Higher-calorie day');
    expect(dayTypeLabel({ bankedDelta: -300 })).toBe('Lower-calorie day');
  });

  test('an ordinary day has no chip', () => {
    expect(dayTypeLabel({ bankedDelta: 0 })).toBeNull();
    expect(dayTypeLabel({})).toBeNull();
  });

  test('ONE DAILY TRUTH: no refeed / training / rest chip can be produced', () => {
    expect(dayTypeLabel({ isRefeedDay: true, macroCycle: {}, isTrainingDay: true })).toBeNull();
    expect(dayTypeLabel({ macroCycle: {}, isTrainingDay: false })).toBeNull();
  });
});
