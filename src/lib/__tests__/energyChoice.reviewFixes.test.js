/**
 * energyChoice.reviewFixes.test.js -- pins the fixes from the D226 fresh-eyes
 * review (2026-10-12), each written to fail if the defect returns:
 *   D1  the floors never come from one input set alone: the strictest of the
 *       saved records and the last calculation holds the lowest point;
 *   D2  a choice at a lowest point a limit holds is marked floored, so the
 *       meal plan's band never reaches below it;
 *   D3  calm mode, an open ED flag, or a failed read puts the engine's own
 *       target back (the shared enforcement), and the choice record holds
 *       numbers only;
 *   D4  the held-decision sentence for an allowed faster gain never points to
 *       the private training status;
 *   D5  what the person is told reads the band itself (trendInBand), not the
 *       coach's decision read;
 *   N2  the value saved equals the value on the slider's grid.
 */

const mockStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k) => Promise.resolve(Object.prototype.hasOwnProperty.call(mockStore, k) ? mockStore[k] : null)),
  setItem: jest.fn((k, v) => { mockStore[k] = v; return Promise.resolve(); }),
  removeItem: jest.fn((k) => { delete mockStore[k]; return Promise.resolve(); }),
}));

const mockDb = { targets: null, flag: null, flagThrows: false, saved: [] };
jest.mock('../database', () => ({
  getOpenEdPatternFlag: jest.fn(() => (mockDb.flagThrows ? Promise.reject(new Error('read failed')) : Promise.resolve(mockDb.flag))),
  getNutritionTargets: jest.fn(() => Promise.resolve(mockDb.targets)),
  saveNutritionTargets: jest.fn((uid, t) => { mockDb.saved.push(t); mockDb.targets = { ...t }; return Promise.resolve('id'); }),
}));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

const fs = require('fs');
const path = require('path');
const {
  energyChoiceBounds, strictestBounds, resolveChosenTarget, choiceAtFloor, SAFE_MINIMUM_LINE, floorInputsFromProfile,
} = require('../energyChoice');
const { applyChoiceToResults } = require('../energyChoiceView');
const { enforceEnergyChoice, writeChoiceRecord, readChoiceRecord, ENERGY_CHOICE_KEY } = require('../energyChoiceEnforce');
const { targetWasFloored } = require('../food/mealPlanAssembler');
const { trendInBand } = require('../trendInBand');
const { WELLBEING_KEY } = require('../wellbeing');

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  Object.assign(mockDb, { targets: null, flag: null, flagThrows: false, saved: [] });
});

describe('D1: the strictest input set holds the lowest point', () => {
  test('a saved male profile keeps the 1,500 floor even if a calculation used female inputs', () => {
    const args = { targetKcal: 1500, maintenanceKcal: 1700 };
    const male = { sex: 'male', weightKg: 60, bodyFatPercent: null, bodyFatSource: null };
    const female = { sex: 'female', weightKg: 60, bodyFatPercent: null, bodyFatSource: null };
    const b = strictestBounds(args, [male, female]);
    expect(b.min).toBeGreaterThanOrEqual(1500);
    expect(b.min).toBe(energyChoiceBounds({ ...args, ...male }).min);
  });
  test('no complete input set offers no slider', () => {
    expect(strictestBounds({ targetKcal: 2000, maintenanceKcal: 2200 }, [null, null])).toBeNull();
    expect(floorInputsFromProfile({ sex: 'male' })).toBeNull();
  });
});

describe('D2: a choice at a held lowest point is floored everywhere', () => {
  test('floorApplied and the safe-minimum line, which the meal plan reads as floored', () => {
    const inputs = { sex: 'female', weightKg: 55, bodyFatPercent: null, bodyFatSource: null };
    const bounds = energyChoiceBounds({ targetKcal: 1300, maintenanceKcal: 1550, ...inputs });
    expect(bounds.heldBy).not.toBeNull();
    const raw = { targetKcal: 1300, proteinG: 110, fatG: 45, carbsG: 102, tdee: 1550, maintenanceKcal: 1550, warnings: [] };
    const base = { targetKcal: 1300, proteinG: 110, fatG: 45, carbsG: 102 };
    const out = applyChoiceToResults(raw, base, bounds.min, inputs, bounds);
    expect(choiceAtFloor(bounds.min, bounds)).toBe(true);
    expect(out.floorApplied).toBe(true);
    expect(out.warnings).toContain(SAFE_MINIMUM_LINE);
    expect(targetWasFloored({ warnings: out.warnings })).toBe(true);
    expect(out.targetKcal).toBeGreaterThanOrEqual(bounds.min);
  });
});

describe('D3: suppression puts the engine target back, and the record holds numbers only', () => {
  const base = { targetKcal: 2400, proteinG: 180, fatG: 70, carbsG: 262, floorApplied: false };
  async function seedChoice() {
    await writeChoiceRecord({ position: -1, appliedPosition: -1, chosenKcal: 2175, base });
    mockDb.targets = { targetKcal: 2175, proteinG: 180, fatG: 70, carbsG: 206, warnings: [] };
  }
  test('calm mode reverts a chosen target to the engine target', async () => {
    await seedChoice();
    mockStore[WELLBEING_KEY] = 'calm';
    expect(await enforceEnergyChoice('u1')).toBe('reverted');
    expect(mockDb.targets.targetKcal).toBe(2400);
    expect((await readChoiceRecord()).chosenKcal).toBe(2400);
  });
  test('an open ED flag reverts it', async () => {
    await seedChoice();
    mockDb.flag = { id: 'f1' };
    expect(await enforceEnergyChoice('u1')).toBe('reverted');
  });
  test('a failed flag read counts as suppressed (fail closed)', async () => {
    await seedChoice();
    mockDb.flagThrows = true;
    expect(await enforceEnergyChoice('u1')).toBe('reverted');
  });
  test('not suppressed: nothing changes', async () => {
    await seedChoice();
    expect(await enforceEnergyChoice('u1')).toBe('not_suppressed');
    expect(mockDb.saved).toHaveLength(0);
  });
  test('a target changed elsewhere (a coach adjustment) is left as it is', async () => {
    await seedChoice();
    mockDb.targets.targetKcal = 2300;
    mockStore[WELLBEING_KEY] = 'calm';
    expect(await enforceEnergyChoice('u1')).toBe('nothing_to_revert');
  });
  test('the record holds no sex, weight or body fat', async () => {
    await seedChoice();
    const raw = mockStore[ENERGY_CHOICE_KEY];
    expect(raw).not.toMatch(/sex|weight|bodyFat|inputs/i);
  });
  test('the record syncs; the training status never does', () => {
    const sync = fs.readFileSync(path.join(__dirname, '..', 'sync.js'), 'utf8');
    expect(sync).toMatch(/\^@volyume_energy_choice\$/);
    expect(sync).not.toMatch(/training_status/);
  });
  test('enforcement runs at start-up and sync, on the calm toggle and when a flag is raised', () => {
    const read = (p) => fs.readFileSync(path.join(__dirname, '..', '..', '..', p), 'utf8');
    expect(read('App.js')).toMatch(/enforceEnergyChoice\(localUserId\)/);
    expect(read('src/screens/SettingsCoachingScreen.js')).toMatch(/enforceEnergyChoice\(user\.id\)/);
    expect(read('src/screens/CoachOutputScreen.js')).toMatch(/raiseEdPatternFlag[\s\S]{0,1200}enforceEnergyChoice\(user\.id\)/);
  });
});

describe('D4 and D5: no hint of the training status; told what the band says', () => {
  test('the held-decision sentence for an allowed faster gain names no setting', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'weeklyCoach.js'), 'utf8');
    expect(src).not.toMatch(/nutrition settings/i);
    expect(src).toMatch(/still inside the range your coach allows for this phase/);
  });
  test('trendInBand reads the band, and falls back to onTarget for older outputs', () => {
    expect(trendInBand({ onTarget: true, inBand: false })).toBe(false);
    expect(trendInBand({ onTarget: true })).toBe(true);
    expect(trendInBand({ onTarget: false })).toBe(false);
    expect(trendInBand(null)).toBe(false);
  });
});

describe('N2: the value saved is on the slider grid', () => {
  test('a lowest point off the 25 kcal grid keeps saved values on the grid that starts there', () => {
    // An engine target of 1,537 below the 0.8% line: the lowest point is the
    // target itself, off the 25 kcal grid.
    const bounds = energyChoiceBounds({ targetKcal: 1537, maintenanceKcal: 2400, sex: 'male', weightKg: 60 });
    expect(bounds.min).toBe(1537);
    expect((bounds.max - bounds.min) % 25).toBe(0);
    for (const pos of [-0.9, -0.5, 0.3, 0.7, 1]) {
      const v = resolveChosenTarget({ position: pos, suppressed: false, bounds, targetKcal: 1537 });
      expect((v - bounds.min) % 25).toBe(0);
      expect(v).toBeGreaterThanOrEqual(bounds.min);
      expect(v).toBeLessThanOrEqual(bounds.max);
    }
  });
});
