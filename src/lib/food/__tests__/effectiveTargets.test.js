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
