const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

describe('Campaign 19 live consumer chain', () => {
  test('weekly coach resolves, observes and persists through the canonical authority', () => {
    const screen = read('src/screens/CoachOutputScreen.js');
    expect(screen).toMatch(/resolveEffectiveMaintenanceForUser\(user\.id/);
    expect(screen).toMatch(/maintenanceAuthority: maintenanceAuthority\.resolved/);
    expect(screen).toMatch(/learnEffectiveMaintenanceForUser\(/);
    expect(screen).toMatch(/effectiveMaintenanceReceipt\(receiptAuthority\)/);
    expect(screen).not.toMatch(/targetCalories \|\| userProfile\?\.targetKcal \|\| 2500/);
  });

  test('goal and target regeneration apply the canonical residual exactly once', () => {
    for (const file of ['src/screens/NutritionTargetsScreen.js', 'src/screens/ProGoalSetupScreen.js']) {
      const screen = read(file);
      expect(screen).toMatch(/resolveEffectiveMaintenanceForUser/);
      expect(screen).toMatch(/effectiveMaintenanceResidualKcal:/);
    }
  });

  test('diet breaks use a fresh resolved authority and receipts preserve it', () => {
    const screen = read('src/screens/CoachOutputScreen.js');
    expect(screen).toMatch(/const freshAuthority = await resolveEffectiveMaintenanceForUser/);
    expect(screen).toMatch(/freshAuthority\.resolved\.effectiveMaintenanceKcal/);
    expect(read('src/lib/coachIntervention.js')).toMatch(/maintenanceAuthority:/);
  });

  test('maintenance displays resolve the memo and never infer maintenance from target', () => {
    expect(read('src/hooks/useWeightTrend.js')).toMatch(/resolveEffectiveMaintenanceForUser/);
    expect(read('src/screens/BodyMetricsScreen.js')).toMatch(/resolveEffectiveMaintenanceForUser/);
    const view = read('src/lib/nutritionTargetsView.js');
    expect(view).toMatch(/raw\.maintenanceKcal \?\? raw\.tdee \?\? null/);
    expect(view).not.toMatch(/targetKcal \|\| null/);
  });

  test('learning service never writes the nutrition prescription', () => {
    const service = read('src/lib/effectiveMaintenanceService.js');
    expect(service).toMatch(/saveEffectiveMaintenanceMemo/);
    expect(service).not.toMatch(/saveNutritionTargets/);
  });
});
