jest.mock('../database', () => ({
  getEffectiveMaintenanceMemo: jest.fn(),
  getMorningWeights: jest.fn(),
  saveEffectiveMaintenanceMemo: jest.fn(),
}));
jest.mock('../food/db', () => ({ getRecentIntakeSummary: jest.fn() }));

const db = require('../database');
const food = require('../food/db');
const {
  effectiveMaintenanceVersionKey,
  formulaContextSignature,
} = require('../effectiveMaintenance');
const { resolveEffectiveMaintenanceForUser } = require('../effectiveMaintenanceService');

const NOW = Date.UTC(2026, 7, 15, 12);
const oldContext = {
  sex: 'male', heightCm: 180, bodyweightKg: 80, activityLevel: 'moderate',
  formulaMethod: 'mifflin', goalPhase: 'cut',
};

function storedMemo() {
  const value = {
    cumulativeResidualKcal: 150,
    formulaPriorKcalAtDerivation: 2500,
    effectiveMaintenanceKcalAtDerivation: 2650,
    source: 'athlete_history', status: 'current',
    reason: 'judgeable_actual_intake_and_weight_history',
    algorithmVersion: 1, asOf: NOW - 30 * 86400000,
    evidenceSignature: 'em1_old', foodDaysLogged: 7, weightPoints: 28,
    bodyweightKg: 80, goalPhase: 'cut', activityLevel: 'moderate',
    formulaMethod: 'mifflin', formulaContextSignature: formulaContextSignature(oldContext),
    largeDivergence: false,
  };
  value.versionKey = effectiveMaintenanceVersionKey(value);
  return value;
}

beforeEach(() => {
  jest.clearAllMocks();
  const weights = Array.from({ length: 28 }, (_, i) => ({
    loggedAt: NOW - (27 - i) * 86400000,
    weightKg: 80,
  }));
  db.getMorningWeights.mockResolvedValue(weights);
  food.getRecentIntakeSummary.mockResolvedValue({
    avgKcal: 2400, daysLogged: 7,
    days: Array.from({ length: 7 }, (_, i) => ({ entryDate: `2026-08-${String(9 + i).padStart(2, '0')}`, kcalTotal: 2400 })),
  });
  db.getEffectiveMaintenanceMemo.mockResolvedValue(storedMemo());
  db.saveEffectiveMaintenanceMemo.mockImplementation(async (_userId, memo) => ({ ...memo, updatedAt: NOW }));
});

test('a formula-driving activity change persists one revalidation start without erasing history', async () => {
  const authority = await resolveEffectiveMaintenanceForUser('u1', {
    sex: 'male', ageYears: 35, heightCm: 180, weightKg: 80,
    activityLevel: 'very_active', goalPhase: 'cut',
  }, { nowMs: NOW });

  expect(db.saveEffectiveMaintenanceMemo).toHaveBeenCalledTimes(1);
  const marker = db.saveEffectiveMaintenanceMemo.mock.calls[0][1];
  expect(marker).toMatchObject({
    cumulativeResidualKcal: 150,
    asOf: NOW - 30 * 86400000,
    status: 'revalidating',
    reason: 'formula_context_changed',
    revalidationStartedAt: NOW,
  });
  expect(authority.resolved).toMatchObject({
    appliedResidualKcal: 0,
    status: 'revalidating',
    reason: 'formula_context_changed',
    revalidationStartedAt: NOW,
  });
});

test('a read-only preview holds a stale residual without writing a marker', async () => {
  const authority = await resolveEffectiveMaintenanceForUser('u1', {
    sex: 'male', ageYears: 35, heightCm: 180, weightKg: 80,
    activityLevel: 'very_active', goalPhase: 'cut',
  }, { nowMs: NOW, persistRevalidationMarker: false });

  expect(db.saveEffectiveMaintenanceMemo).not.toHaveBeenCalled();
  expect(authority.resolved).toMatchObject({
    appliedResidualKcal: 0,
    status: 'revalidating',
    reason: 'formula_context_changed',
  });
});
