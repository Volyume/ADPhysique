/**
 * AC-08 (Codex adversarial audit, 2026-07-12) source guard.
 *
 * NutritionTargetsScreen's save path auto-seeds body_metric_log from the
 * weight/body-fat the user typed. Before this fix it validated only
 * truthiness, so a mistyped 99999 kg or a negative body fat was persisted
 * raw to AsyncStorage AND body_metric_log, while the engine silently clamped
 * for its own maths (so the stored figure diverged from the shown target).
 * These values feed BMR/TDEE and the calorie-floor logic, so a corrupt one
 * poisons coaching and charts across devices.
 *
 * The screen has a large live dependency surface and is impractical to mount,
 * so this is a scoped source guard (same convention as the other screen
 * guards): the shared bodyMetricValidate.js bounds must gate the save, with an
 * early return, BEFORE the persist/logBodyMetric call. Reject-not-clamp.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.resolve(__dirname, '../NutritionTargetsScreen.js'),
  'utf8',
);

describe('AC-08: NutritionTargetsScreen validates body metrics before persisting', () => {
  test('it imports the shared validators (not a local re-implementation)', () => {
    expect(SRC).toMatch(/import \{[^}]*isValidBodyWeightKg[^}]*isValidBodyFatPercent[^}]*\} from '\.\.\/lib\/bodyMetricValidate'/);
  });

  test('an out-of-range body weight returns early (rejected, not clamped)', () => {
    expect(SRC).toMatch(/if \(!isValidBodyWeightKg\(weightNum\)\) \{[\s\S]*?return;/);
  });

  test('an out-of-range body fat returns early (rejected, not clamped)', () => {
    expect(SRC).toMatch(/if \(bfNum != null && !isValidBodyFatPercent\(bfNum\)\) \{[\s\S]*?return;/);
  });

  test('the validation gates the persist: both checks sit before logBodyMetric', () => {
    const weightGuard = SRC.indexOf('isValidBodyWeightKg(weightNum)');
    const bfGuard = SRC.indexOf('isValidBodyFatPercent(bfNum)');
    const seed = SRC.indexOf('logBodyMetric(');
    expect(weightGuard).toBeGreaterThan(-1);
    expect(bfGuard).toBeGreaterThan(-1);
    expect(seed).toBeGreaterThan(weightGuard);
    expect(seed).toBeGreaterThan(bfGuard);
  });
});
