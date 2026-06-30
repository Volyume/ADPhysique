/**
 * effectiveTargets — diary day-type precedence. Tests lock the order
 * refeed > carb-cycle > bank > flat for both the resolved target and the chip.
 */
import { resolveEffectiveTargets, dayTypeLabel } from '../effectiveTargets';

const base = { targetKcal: 2000, proteinG: 180, carbsG: 200, fatG: 60 };

describe('resolveEffectiveTargets', () => {
  test('passes through a null target', () => {
    expect(resolveEffectiveTargets(null, {})).toBeNull();
  });

  test('returns the flat target with nothing applied', () => {
    expect(resolveEffectiveTargets(base, {})).toBe(base);
  });

  test('refeed wins over carb cycle and bank', () => {
    const refeed = { kcal: 2600, proteinG: 180, carbsG: 350, fatG: 60 };
    const macroCycle = { trainingDay: { kcal: 2300 }, restDay: { kcal: 1800 } };
    const out = resolveEffectiveTargets(base, {
      isRefeedDay: true, refeed, macroCycle, isTrainingDay: true, bankedDelta: 500,
    });
    expect(out.targetKcal).toBe(2600);
    expect(out.carbsG).toBe(350);
  });

  test('carb cycle picks the training-day or rest-day split', () => {
    const macroCycle = {
      trainingDay: { kcal: 2300, carbsG: 260 },
      restDay: { kcal: 1800, carbsG: 140 },
    };
    expect(resolveEffectiveTargets(base, { macroCycle, isTrainingDay: true }).targetKcal).toBe(2300);
    expect(resolveEffectiveTargets(base, { macroCycle, isTrainingDay: false }).carbsG).toBe(140);
  });

  test('carb-cycle day falls back to the flat field when the split omits it', () => {
    const macroCycle = { trainingDay: { kcal: 2300 }, restDay: {} };
    const out = resolveEffectiveTargets(base, { macroCycle, isTrainingDay: true });
    expect(out.proteinG).toBe(180); // unchanged from base
    expect(out.targetKcal).toBe(2300);
  });

  test('with no refeed or cycle, a banked delta shifts kcal via carbs', () => {
    const out = resolveEffectiveTargets(base, { bankedDelta: 400 });
    expect(out.targetKcal).toBe(2400);
    expect(out.carbsG).toBeGreaterThan(base.carbsG); // delta routed through carbs
  });

  test('a zero banked delta leaves the flat target untouched', () => {
    expect(resolveEffectiveTargets(base, { bankedDelta: 0 })).toBe(base);
  });

  // gap #13: per-day-of-week planning offset. Plain-day only, floor-clamped.
  describe('per-day-of-week offset (gap #13)', () => {
    test('a positive offset on a plain day shifts kcal via carbs', () => {
      const out = resolveEffectiveTargets(base, { perDayOffsetKcal: 300, floorKcal: 1500 });
      expect(out.targetKcal).toBe(2300);
      expect(out.carbsG).toBeGreaterThan(base.carbsG);
      expect(out.proteinG).toBe(base.proteinG); // protein protected
      expect(out.fatG).toBe(base.fatG);          // fat protected
    });

    test('a negative offset above the floor applies in full', () => {
      const out = resolveEffectiveTargets(base, { perDayOffsetKcal: -300, floorKcal: 1500 });
      expect(out.targetKcal).toBe(1700);
      expect(out.carbsG).toBeLessThan(base.carbsG);
    });

    test('INVARIANT: a negative offset can never push the day below the floor', () => {
      // base 2000, floor 1800, offset -500 would be 1500 — must clamp to 1800.
      const out = resolveEffectiveTargets(base, { perDayOffsetKcal: -500, floorKcal: 1800 });
      expect(out.targetKcal).toBeGreaterThanOrEqual(1800);
      expect(out.targetKcal).toBe(1800);
    });

    test('INVARIANT: the displayed target is never below the floor across a sweep of offsets', () => {
      // The engine guarantees the stored base is itself at/above the floor, so
      // the floors swept here are all <= base (2000). Under that guarantee, no
      // offset — however deep — can ever push the displayed day below the floor.
      for (let off = -1500; off <= 1500; off += 50) {
        for (const floor of [1200, 1500, 1800, 2000]) {
          const out = resolveEffectiveTargets(base, { perDayOffsetKcal: off, floorKcal: floor });
          expect(out.targetKcal).toBeGreaterThanOrEqual(floor);
        }
      }
    });

    test('a base already at/below the floor with a downward offset never cuts further', () => {
      const low = { targetKcal: 1500, proteinG: 150, carbsG: 120, fatG: 50 };
      const out = resolveEffectiveTargets(low, { perDayOffsetKcal: -400, floorKcal: 1500 });
      expect(out).toBe(low); // clamp resolves to no change, flat target returned
    });

    test('a refeed / carb cycle / bank takes precedence over the per-day offset', () => {
      const macroCycle = { trainingDay: { kcal: 2300 }, restDay: { kcal: 1800 } };
      const cycled = resolveEffectiveTargets(base, { macroCycle, isTrainingDay: true, perDayOffsetKcal: 500, floorKcal: 1500 });
      expect(cycled.targetKcal).toBe(2300); // cycle, not 2500
      const banked = resolveEffectiveTargets(base, { bankedDelta: 200, perDayOffsetKcal: 500, floorKcal: 1500 });
      expect(banked.targetKcal).toBe(2200); // bank, not 2500
    });

    test('a zero offset leaves the flat target untouched (same reference)', () => {
      expect(resolveEffectiveTargets(base, { perDayOffsetKcal: 0, floorKcal: 1500 })).toBe(base);
    });

    test('the stored target object is never mutated', () => {
      const snapshot = { ...base };
      resolveEffectiveTargets(base, { perDayOffsetKcal: -500, floorKcal: 1800 });
      expect(base).toEqual(snapshot);
    });

    test('with no floor passed, a negative offset still applies (clamp is a no-op)', () => {
      const out = resolveEffectiveTargets(base, { perDayOffsetKcal: -300 });
      expect(out.targetKcal).toBe(1700);
    });
  });
});

describe('dayTypeLabel', () => {
  test('refeed beats everything', () => {
    expect(dayTypeLabel({ isRefeedDay: true, macroCycle: {}, bankedDelta: 500 })).toBe('Refeed day');
  });

  test('carb cycle reads training vs rest', () => {
    expect(dayTypeLabel({ macroCycle: {}, isTrainingDay: true })).toBe('Training day');
    expect(dayTypeLabel({ macroCycle: {}, isTrainingDay: false })).toBe('Rest day');
  });

  test('bank direction labels higher / lower', () => {
    expect(dayTypeLabel({ bankedDelta: 300 })).toBe('Higher-calorie day');
    expect(dayTypeLabel({ bankedDelta: -300 })).toBe('Lower-calorie day');
  });

  test('a plain day has no chip', () => {
    expect(dayTypeLabel({ bankedDelta: 0 })).toBeNull();
    expect(dayTypeLabel({})).toBeNull();
  });
});
