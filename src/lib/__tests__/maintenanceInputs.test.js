/**
 * D214 addendum 4 (BM-14): one mapping from the stored reads to the
 * effective-maintenance resolver's inputs, so the hook, Body metrics, the
 * coach screen and Nutrition targets build the same formula context. Pins
 * the order of precedence, the latest-weigh-in rule, the body-fat source
 * (which Body metrics used to lose), the age rule (a known birthday beats a
 * stored age), the canonical reads and their fail-soft, and that the named
 * surfaces import the helper and keep no inline mapping.
 */
const fs = require('fs');
const path = require('path');

jest.mock('../database', () => ({
  getUserBodyProfile: jest.fn(),
  getNutritionTargets: jest.fn(),
  getLatestBodyComposition: jest.fn(),
  getMorningWeights: jest.fn(),
}));

const db = require('../database');
const { buildMaintenanceInputs, latestWeighIn, readMaintenanceInputs } = require('../maintenanceInputs');

const profile = { sex: 'female', dateOfBirth: '1990-04-02', heightCm: 168 };
const userProfile = { sex: 'male', dateOfBirth: '1985-01-01', ageYears: 41, heightCm: 180, weightKg: 90, activityLevel: 'high', goalPhase: 'mild_bulk' };
const targets = { activityLevel: 'moderate', goal: 'mild_cut' };
const composition = { bodyFatPercent: 24.5, bodyFatSource: 'calipers' };
const latestWeight = { weightKg: 71.2, loggedAt: 1_700_000_000_000 };

describe('buildMaintenanceInputs: the one order of precedence', () => {
  test('the stored profile over the in-memory one; the weigh-in over the profile weight; targets over the profile; body fat from the composition row with its source', () => {
    expect(buildMaintenanceInputs({ profile, userProfile, targets, latestWeight, composition })).toEqual({
      sex: 'female', dateOfBirth: '1990-04-02', ageYears: null, heightCm: 168, weightKg: 71.2,
      bodyFatPercent: 24.5, bodyFatSource: 'calipers', activityLevel: 'moderate', goalPhase: 'mild_cut',
    });
  });
  test('every fallback: the in-memory profile when the reads are empty; the stored age only without a birthday', () => {
    expect(buildMaintenanceInputs({ userProfile: { ...userProfile, dateOfBirth: null } })).toEqual({
      sex: 'male', dateOfBirth: null, ageYears: 41, heightCm: 180, weightKg: 90,
      bodyFatPercent: null, bodyFatSource: null, activityLevel: 'high', goalPhase: 'mild_bulk',
    });
    expect(buildMaintenanceInputs({ userProfile: { age: 33 } }).ageYears).toBe(33);
    expect(buildMaintenanceInputs({ userProfile }).ageYears).toBeNull();
  });
  test('targets.phase stands in for targets.goal; nothing at all gives nulls, never undefined', () => {
    expect(buildMaintenanceInputs({ targets: { phase: 'maint' } }).goalPhase).toBe('maint');
    const empty = buildMaintenanceInputs();
    Object.values(empty).forEach(v => expect(v).toBeNull());
    expect(Object.keys(empty).sort()).toEqual(['activityLevel', 'ageYears', 'bodyFatPercent', 'bodyFatSource', 'dateOfBirth', 'goalPhase', 'heightCm', 'sex', 'weightKg']);
  });
  test('latestWeighIn: the newest row with a positive weight and a readable time', () => {
    expect(latestWeighIn([
      { weightKg: 80, loggedAt: 10 }, { weightKg: 81, loggedAt: 30 }, { weightKg: 0, loggedAt: 40 }, { weightKg: 79, loggedAt: 'x' },
    ])).toEqual({ weightKg: 81, loggedAt: 30 });
    expect(latestWeighIn([])).toBeNull();
    expect(latestWeighIn(null)).toBeNull();
  });
});

describe('readMaintenanceInputs: the canonical reads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.getUserBodyProfile.mockResolvedValue(profile);
    db.getNutritionTargets.mockResolvedValue(targets);
    db.getLatestBodyComposition.mockResolvedValue(composition);
    db.getMorningWeights.mockResolvedValue([{ weightKg: 70, loggedAt: 1 }, latestWeight]);
  });
  test('reads the body profile, the nutrition targets, the latest body composition and the morning weights, and maps them', async () => {
    const out = await readMaintenanceInputs('u1', { userProfile });
    expect(db.getUserBodyProfile).toHaveBeenCalledWith('u1');
    expect(db.getNutritionTargets).toHaveBeenCalledWith('u1');
    expect(db.getLatestBodyComposition).toHaveBeenCalledWith('u1');
    expect(db.getMorningWeights).toHaveBeenCalledWith('u1', 90);
    expect(out).toMatchObject({ sex: 'female', weightKg: 71.2, bodyFatSource: 'calipers', activityLevel: 'moderate', goalPhase: 'mild_cut' });
  });
  test('a read the caller already holds is not repeated; null counts as read', async () => {
    const out = await readMaintenanceInputs('u1', { targets: null, weights: [], profile: { sex: 'male', heightCm: 170 } });
    expect(db.getNutritionTargets).not.toHaveBeenCalled();
    expect(db.getMorningWeights).not.toHaveBeenCalled();
    expect(db.getUserBodyProfile).not.toHaveBeenCalled();
    expect(db.getLatestBodyComposition).toHaveBeenCalledTimes(1);
    expect(out).toMatchObject({ sex: 'male', heightCm: 170, weightKg: null, activityLevel: null, bodyFatPercent: 24.5 });
  });
  test('a failed read degrades that field and never throws', async () => {
    db.getUserBodyProfile.mockRejectedValue(new Error('locked'));
    db.getMorningWeights.mockRejectedValue(new Error('locked'));
    const out = await readMaintenanceInputs('u1', { userProfile });
    expect(out).toMatchObject({ sex: 'male', heightCm: 180, weightKg: 90, bodyFatSource: 'calipers' });
  });
});

describe('source: the surfaces build their inputs through the helper and keep no inline mapping', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');
  // RE-ANCHORED D214 addendum 4 (Body metrics, lane 7; spec section 6 table:
  // `maintenanceInputs.test.js` guard list, BM-14): BodyMetricsScreen.js joins
  // this list now that lane 7 has rebuilt it on the helper; it resolves with
  // the same inputs as the hook and the coach, and never persists a
  // revalidation marker.
  test.each([
    ['hooks/useWeightTrend.js', /from '\.\.\/lib\/maintenanceInputs'/],
    ['screens/CoachOutputScreen.js', /from '\.\.\/lib\/maintenanceInputs'/],
    ['screens/NutritionTargetsScreen.js', /from '\.\.\/lib\/maintenanceInputs'/],
    ['screens/BodyMetricsScreen.js', /from '\.\.\/lib\/maintenanceInputs'/],
  ])('%s', (file, importRe) => {
    const src = read(file);
    expect(src).toMatch(importRe);
    // No resolver call builds its inputs inline: every call passes what the
    // helper returned. (The coach screen's OWN engine inputs, which carry a
    // bodyFatSource too, are not the resolver's and are untouched.)
    expect(src).not.toMatch(/resolveEffectiveMaintenanceForUser\((user\??\.id|userId),\s*\{/);
  });
  test('the helper is pure at the mapping and reads only lazily', () => {
    const src = read('lib/maintenanceInputs.js');
    expect(src).not.toMatch(/^import .*database/m);
    expect(src).not.toMatch(/AsyncStorage|useAppStore|from 'react/);
  });
});
