/**
 * CC31 GATE - the section 23 reintroduction fixture: conservative,
 * explicit, formula-free, and the protected baseline is the target.
 *
 * REAL database (full init path). A six-week block is mid-flight; an
 * episode ends after week 2. The ramp must:
 *  - step the RELEASED muscle's remaining accumulation weeks from its
 *    current planned volume back toward the block's own planned peak
 *    (the plan is the protected baseline - never invented, never
 *    exceeded);
 *  - leave the deload week untouched;
 *  - leave unaffected muscles untouched;
 *  - leave a muscle still held by ANOTHER active episode untouched;
 *  - write source 'reintroduction' so the provenance is inspectable;
 *  - do nothing at all when current planned already meets the peak.
 * Loads need no fixture here by design: the C20 resolver's stale-history
 * gates already resolve returning movements conservatively (verified
 * uncontaminated in its own suite; NO percentages - CC-R3).
 */
jest.mock('../dbCrypto', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  const adapt = {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes ?? 0), lastInsertRowId: Number(r.lastInsertRowid ?? 0) };
    },
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../sync', () => ({ scheduleSync: () => {} }));

const {
  db, insertExerciseWithId, createCapabilityConstraints, endCapabilityConstraint,
  getPlannedMuscleVolume,
} = require('../database');
const { applyReintroductionRamp, reintroductionCopy } = require('../capability/reintroduction');
const { _resetCapabilityResolveCache } = require('../capability/resolve');

const USER = 'u-reintro';
const DAY = 86400000;
const WEEK = 7 * DAY;
const NOW = Date.now();
const BLOCK_START = NOW - 2 * WEEK - 3 * DAY; // week 3 in progress

const OHP = {
  name: 'RI Overhead Press', primaryMuscle: 'front_delts', equipment: 'barbell',
  movementPattern: 'vertical_push', compoundIsolation: 'compound',
  position: 'standing', gripDemand: 'bar', overheadPosition: true, floorAccess: false,
  bilateralUpper: true, bilateralLower: false, axialLoad: true, impact: false,
  unilateralLoadable: false, balanceDemand: 'stable',
};
const SQUAT = {
  name: 'RI Squat', primaryMuscle: 'quads', equipment: 'barbell',
  movementPattern: 'squat', compoundIsolation: 'compound',
  position: 'standing', gripDemand: 'bar', overheadPosition: false, floorAccess: false,
  bilateralUpper: true, bilateralLower: true, axialLoad: true, impact: false,
  unilateralLoadable: false, balanceDemand: 'stable',
};

let overheadId = null;

beforeAll(async () => {
  await db();
  const d = await db();
  await insertExerciseWithId('ri-ohp', { ...OHP, isCustom: false });
  await insertExerciseWithId('ri-squat', { ...SQUAT, isCustom: false });
  await d.runAsync(
    `INSERT INTO mesocycles (id, user_id, name, start_date, duration_weeks, planned_weeks,
       deload_week, is_active, created_at, updated_at)
     VALUES ('ri-meso', ?, 'RI block', ?, 6, 6, 6, 1, ?, ?)`,
    [USER, new Date(BLOCK_START).toISOString(), BLOCK_START, BLOCK_START],
  );
  // Weeks 1-2 completed; week 3 current; 4-5 remaining accumulation; 6 deload.
  for (let w = 1; w <= 6; w += 1) {
    const started = BLOCK_START + (w - 1) * WEEK;
    await d.runAsync(
      `INSERT INTO mesocycle_weeks (id, mesocycle_id, week_index, is_deload, rir_target, started_at, completed_at, created_at)
       VALUES (?, 'ri-meso', ?, ?, 2, ?, ?, ?)`,
      [`riw${w}`, w, w === 6 ? 1 : 0, started, w <= 2 ? started + 6 * DAY : null, BLOCK_START],
    );
    // The PLAN: front_delts ramps 8..12 across accumulation (peak 12 at
    // week 5); quads flat 12. The user's episode meant front_delts'
    // CURRENT week 3 planned was reduced to 4 (what a coach hold or the
    // reduced effective dose left planned).
    const deltsPlanned = w === 3 ? 4 : [0, 8, 9, 10, 11, 12, 6][w];
    for (const [muscle, sets] of [['front_delts', deltsPlanned], ['quads', 12]]) {
      // The canonical derived id (pmv_<week>_<muscle>) so the ramp's
      // upsert updates THIS row rather than adding a sibling.
      await d.runAsync(
        `INSERT INTO planned_muscle_volume (id, mesocycle_week_id, muscle, planned_sets,
           mev, mav, mrv, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, 4, 10, 16, 'template', ?, ?)`,
        [`pmv_riw${w}_${muscle}`, `riw${w}`, muscle, sets, BLOCK_START, BLOCK_START],
      );
    }
  }
  const ids = await createCapabilityConstraints(USER, [{
    role: 'episode', source: 'self', ruleKind: 'demand', ruleValue: 'overhead_position',
    startsAt: BLOCK_START, episodeGroupId: 'g-ri',
  }], { nowMs: BLOCK_START });
  overheadId = ids[0];
  _resetCapabilityResolveCache();
});

describe('section 23: the return ramp', () => {
  test('ending the episode ramps the released muscle toward the plan\'s own peak, and nothing else moves', async () => {
    // A second, STILL-ACTIVE episode holds quads only (both-legs work;
    // the press is bilateralLower false) - the ramp must not touch a
    // muscle another live episode still covers.
    await createCapabilityConstraints(USER, [{
      role: 'episode', source: 'self', ruleKind: 'demand', ruleValue: 'bilateral_lower',
      startsAt: BLOCK_START, episodeGroupId: 'g-ri-2',
    }], { nowMs: BLOCK_START });
    const endedAt = NOW;
    await endCapabilityConstraint(USER, overheadId, 'user_ended', { nowMs: endedAt });
    _resetCapabilityResolveCache();

    const { ramped } = await applyReintroductionRamp(USER, { endedAtMs: endedAt });
    expect(ramped).toEqual([{ muscle: 'front_delts', from: 4, to: 12 }]);

    // Remaining accumulation weeks 4 and 5 step 4 -> 8 -> 12: whole sets,
    // monotone, ending exactly at the plan's own peak.
    const w4 = await getPlannedMuscleVolume('riw4');
    const w5 = await getPlannedMuscleVolume('riw5');
    const delts4 = w4.find((r) => r.muscle === 'front_delts');
    const delts5 = w5.find((r) => r.muscle === 'front_delts');
    expect(delts4.planned_sets).toBe(8);
    expect(delts5.planned_sets).toBe(12);
    expect(delts4.source).toBe('reintroduction');
    // The deload week and every quads row are untouched.
    const w6 = await getPlannedMuscleVolume('riw6');
    expect(w6.find((r) => r.muscle === 'front_delts').planned_sets).toBe(6);
    expect(w4.find((r) => r.muscle === 'quads').planned_sets).toBe(12);
    expect(w5.find((r) => r.muscle === 'quads').planned_sets).toBe(12);
  });

  test('a repeat run changes nothing (current already on the ramp; peak never exceeded)', async () => {
    const again = await applyReintroductionRamp(USER, { endedAtMs: NOW + 1000 });
    expect(again.ramped).toEqual([]);
    const w5 = await getPlannedMuscleVolume('riw5');
    expect(w5.find((r) => r.muscle === 'front_delts').planned_sets).toBe(12);
  });

  test('the copy is trajectory only - no promises, no timelines, no medical words', () => {
    const line = reintroductionCopy('Front delts');
    // Natural coach-language order (2026-08-21): the muscle is named in
    // plain words and "restriction ended" never reaches the user.
    expect(line).toBe('Your front delts work builds back up to your plan from here.');
    expect(line).not.toMatch(/rehab|heal|safe|recover in|weeks|days|%/i);
    expect(line).not.toMatch(/restriction|episode/i);
  });
});
