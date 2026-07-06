/**
 * U3 preventive low-energy-availability caution (founder 2026-07-01). Fires when
 * a PLANNED deficit target sits below the sex-aware caution line (men 35 / women
 * 40 kcal/kg fat-free mass) — above the 30 kcal/kg hard floor, so it warns
 * BEFORE a user is under-fuelled. The suggested eased target can only ever RAISE
 * calories: it lifts EA to the line, capped at maintenance, never below the sex
 * calorie floor (1500 male / 1200 female).
 */
import { energyAvailabilityCaution, EA_CAUTION_KCAL_PER_KG } from '../nutritionEngine';

describe('energyAvailabilityCaution', () => {
  test('fires for a male deficit below 35 kcal/kg FFM, and suggests a higher target', () => {
    // 80 kg, no BF% → fallback FFM 0.78 → 62.4 kg. 2000 kcal → EA 32.05 < 35.
    const r = energyAvailabilityCaution(2000, 2600, { weightKg: 80, sex: 'male' });
    expect(r).not.toBeNull();
    expect(r.cautionKcalPerKg).toBe(35);
    expect(r.proxyEA).toBeLessThan(35);
    expect(r.suggestedKcal).toBeGreaterThan(2000);
    expect(r.suggestedKcal).toBeLessThanOrEqual(2600); // capped at maintenance
  });

  test('fires for a female deficit below 40 kcal/kg FFM', () => {
    // 60 kg, fallback FFM 0.72 → 43.2 kg. 1500 kcal → EA 34.7 < 40.
    const r = energyAvailabilityCaution(1500, 2000, { weightKg: 60, sex: 'female' });
    expect(r).not.toBeNull();
    expect(r.cautionKcalPerKg).toBe(40);
    expect(r.suggestedKcal).toBeGreaterThan(1500);
  });

  test('does NOT fire when EA is at or above the sex line', () => {
    // Male 80 kg, FFM 62.4. 2300 kcal → EA 36.9 >= 35.
    expect(energyAvailabilityCaution(2300, 2600, { weightKg: 80, sex: 'male' })).toBeNull();
    // Female 60 kg, FFM 43.2. 1800 kcal → EA 41.7 >= 40.
    expect(energyAvailabilityCaution(1800, 2200, { weightKg: 60, sex: 'female' })).toBeNull();
  });

  test('does NOT fire at maintenance or in a surplus (no deficit)', () => {
    expect(energyAvailabilityCaution(2600, 2600, { weightKg: 80, sex: 'male' })).toBeNull();
    expect(energyAvailabilityCaution(2800, 2600, { weightKg: 80, sex: 'male' })).toBeNull();
  });

  test('the suggested target NEVER drops below the sex calorie floor', () => {
    // Contrived tiny FFM so line*FFM would fall under the 1200 female floor.
    // 40 kg female → FFM 28.8; line 40 → 1152 (< 1200). Target 1100 (EA 38.2 < 40).
    const r = energyAvailabilityCaution(1100, 1400, { weightKg: 40, sex: 'female' });
    expect(r).not.toBeNull();
    expect(r.suggestedKcal).toBeGreaterThanOrEqual(1200);
    expect(r.suggestedKcal).toBeGreaterThan(1100); // still raises
  });

  test('uses a credible body fat % for FFM when provided (not the fallback)', () => {
    // 80 kg at 10% BF (DEXA) → FFM 72 kg. 2000 kcal → EA 27.8 < 35.
    const r = energyAvailabilityCaution(2000, 2600, {
      weightKg: 80, sex: 'male', bodyFatPercent: 10, bodyFatSource: 'dexa',
    });
    expect(r).not.toBeNull();
    expect(r.ffmKg).toBe(72);
  });

  test('returns null on unusable inputs, never throws', () => {
    expect(energyAvailabilityCaution(NaN, 2600, { weightKg: 80, sex: 'male' })).toBeNull();
    expect(energyAvailabilityCaution(2000, 2600, { weightKg: 0, sex: 'male' })).toBeNull();
    expect(energyAvailabilityCaution(2000, 2600, {})).toBeNull();
  });

  test('caution lines are sex-aware (male 35 / female 40)', () => {
    expect(EA_CAUTION_KCAL_PER_KG).toEqual({ male: 35, female: 40 });
  });
});
