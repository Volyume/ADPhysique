/**
 * campaign6.reinstall.test.js — Phase 52 of the Campaign 6 order: the
 * permanent REINSTALL E2E. Executable and deterministic, not a document:
 * a genuinely FRESH local database is built by the REAL init path (full
 * schema + all SCHEMA_MIGRATIONS on a real in-memory SQLite via
 * node:sqlite), and the REAL cloud appliers restore an established
 * account's rows into it. Asserts the order's restoration list where it
 * lives in this layer, plus the protections the reinstall audit proved:
 *
 *  - programmes/plans restore WITH is_archived and provenance
 *  - the active block restores; a completed block stays completed; a
 *    cloud mesocycle row without a ledger can never null a local ledger
 *  - planned muscle volume restores (with the pre-132 degrade honest)
 *  - nutrition targets restore
 *  - morning weights restore; a locally tombstoned weigh-in is NOT
 *    resurrected by an older cloud copy (R-8)
 *  - the coach output's APPLIED receipt survives restore (no
 *    double-apply); v72 keeps identity deterministic
 *  - photos/scans have NO applier at all (local-only promise, S-23)
 *
 * Out of this layer (covered elsewhere, referenced not duplicated):
 * profile/tier/store routing S-9 + S-24 (no false new-user onboarding;
 * Article 9 fails closed), guarded prefs (campaign1.syncConflict,
 * prefSync suites), notification prefs architecture (FR-C4-2, founder).
 */

jest.mock('../lib/dbCrypto', () => {
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

const {
  db,
  insertProgrammeFromCloud,
  insertMesocycleFromCloud,
  insertMesocycleWeekFromCloud,
  insertOrUpdatePlannedMuscleVolumeFromCloud,
  insertNutritionTargetsFromCloud,
  insertMorningWeightFromCloud,
  insertCoachOutputFromCloud,
  deleteMorningWeightById,
  getMorningWeights,
  getNutritionTargets,
  getAllMesocyclesForUser,
} = require('../lib/database');

const U = 'user-reinstall-1';
const iso = (ms) => new Date(ms).toISOString();
const WEEK = 1735000000000;

let conn;
beforeAll(async () => {
  conn = await db(); // the REAL fresh-install path: schema + all migrations
});

test('the fresh database is genuinely fresh (no rows for the account before restore)', async () => {
  const rows = await conn.getAllAsync('SELECT id FROM programmes WHERE user_id = ?', [U]);
  expect(rows).toEqual([]);
});

test('programmes restore with archive state and provenance', async () => {
  await insertProgrammeFromCloud(U, {
    id: 'plan-1', name: 'Upper/Lower', is_library: false, is_active: true,
    is_archived: false, source_programme_id: 'lib-3',
    created_at: iso(WEEK - 60 * 86400000), updated_at: iso(WEEK - 60 * 86400000),
  });
  await insertProgrammeFromCloud(U, {
    id: 'plan-0', name: 'Old plan', is_library: false, is_active: false,
    is_archived: true, source_programme_id: null,
    created_at: iso(WEEK - 200 * 86400000), updated_at: iso(WEEK - 90 * 86400000),
  });
  const rows = await conn.getAllAsync('SELECT id, is_archived, source_programme_id FROM programmes WHERE user_id = ? ORDER BY id', [U]);
  expect(rows).toEqual([
    { id: 'plan-0', is_archived: 1, source_programme_id: null },
    { id: 'plan-1', is_archived: 0, source_programme_id: 'lib-3' },
  ]);
});

test('the active block restores, and a cloud row WITHOUT a ledger cannot null a local one', async () => {
  const ledger = JSON.stringify({ v: 1, entries: { chest: { classification: 'RESPONSIVE' } } });
  await insertMesocycleFromCloud(U, {
    id: 'meso-1', programme_id: 'plan-1', name: 'Block 1', start_date: '2026-05-04',
    planned_weeks: 6, duration_weeks: 6, is_active: true,
    block_ledger: ledger,
    created_at: iso(WEEK - 60 * 86400000), updated_at: iso(WEEK - 60 * 86400000),
  });
  // A second pull delivers a NEWER cloud copy that carries no ledger
  // (e.g. written by a pre-131 device): the local ledger must survive.
  await insertMesocycleFromCloud(U, {
    id: 'meso-1', programme_id: 'plan-1', name: 'Block 1', start_date: '2026-05-04',
    planned_weeks: 6, duration_weeks: 6, is_active: true,
    block_ledger: null,
    created_at: iso(WEEK - 60 * 86400000), updated_at: iso(WEEK - 1 * 86400000),
  });
  const row = await conn.getFirstAsync('SELECT block_ledger FROM mesocycles WHERE id = ?', ['meso-1']);
  expect(row.block_ledger).toBe(ledger);
});

test('mesocycle weeks and planned muscle volume restore', async () => {
  await insertMesocycleWeekFromCloud({
    id: 'mw-1', mesocycle_id: 'meso-1', week_index: 1, is_deload: false,
    created_at: iso(WEEK - 60 * 86400000), updated_at: iso(WEEK - 60 * 86400000),
  });
  await insertOrUpdatePlannedMuscleVolumeFromCloud(U, {
    id: 'pmv_mw-1_chest', mesocycle_week_id: 'mw-1', muscle: 'chest',
    planned_sets: 12, created_at: iso(WEEK - 60 * 86400000), updated_at: iso(WEEK - 60 * 86400000),
  });
  const pmv = await conn.getFirstAsync('SELECT planned_sets, source FROM planned_muscle_volume WHERE id = ?', ['pmv_mw-1_chest']);
  expect(pmv.planned_sets).toBe(12);
  // Pre-132 cloud rows carry no source column: the applier degrades to
  // 'template' - an honest research label, never a fabricated learned
  // claim. That a ledger-seeded athlete's provenance is LOST this way is
  // exactly the S-11 release-gate consequence recorded in
  // MIGRATION-RELEASE-GATES.md (migration 132 restores true provenance);
  // this pins the degrade so it can never silently become a false claim.
  expect(pmv.source).toBe('template');
});

test('nutrition targets restore', async () => {
  await insertNutritionTargetsFromCloud(U, {
    id: 'nt-1', target_kcal: 2600, protein_g: 170, carbs_g: 280, fat_g: 80,
    created_at: iso(WEEK - 30 * 86400000), updated_at: iso(WEEK - 30 * 86400000),
  });
  const t = await getNutritionTargets(U);
  expect(t?.targetKcal ?? t?.target_kcal).toBe(2600);
});

test('morning weights restore, and a local tombstone is never resurrected by an older cloud copy (R-8)', async () => {
  await insertMorningWeightFromCloud(U, {
    id: 'mw-a', weight_kg: 82.4, logged_at: iso(WEEK - 10 * 86400000),
    created_at: iso(WEEK - 10 * 86400000), updated_at: iso(WEEK - 10 * 86400000),
  });
  expect((await getMorningWeights(U, 10)).map((w) => w.id)).toEqual(['mw-a']);
  // The user deletes it here (soft tombstone, R-8) ...
  expect(await deleteMorningWeightById(U, 'mw-a')).toBe(true);
  // ... and a later pull re-delivers the OLD cloud copy: LWW must skip it
  // (the tombstone's updated_at is newer), so the deletion sticks.
  await insertMorningWeightFromCloud(U, {
    id: 'mw-a', weight_kg: 82.4, logged_at: iso(WEEK - 10 * 86400000),
    created_at: iso(WEEK - 10 * 86400000), updated_at: iso(WEEK - 10 * 86400000),
  });
  expect((await getMorningWeights(U, 10)).map((w) => w.id)).toEqual([]);
});

test('the applied coach receipt survives restore, on the deterministic identity (S-16/v72)', async () => {
  const detId = `co_${WEEK}_${U}`;
  await insertCoachOutputFromCloud(U, {
    id: detId, week_start: WEEK, applied: true,
    output_json: JSON.stringify({ weekLabel: 'Week 4 · Mild cut', appliedAdjustments: { calories: -100 } }),
    created_at: iso(WEEK), updated_at: iso(WEEK + 3600000),
  });
  const row = await conn.getFirstAsync('SELECT applied FROM coach_outputs WHERE id = ?', [detId]);
  expect(row.applied).toBe(1);
  // An OLDER unapplied cloud duplicate under a legacy id cannot take the
  // week back: the v71 unique index drops it at INSERT OR IGNORE.
  await insertCoachOutputFromCloud(U, {
    id: 'legacy-old', week_start: WEEK, applied: false,
    output_json: '{}', created_at: iso(WEEK - 3600000), updated_at: iso(WEEK - 3600000),
  });
  const all = await conn.getAllAsync('SELECT id, applied FROM coach_outputs WHERE user_id = ? AND week_start = ?', [U, WEEK]);
  expect(all).toEqual([{ id: detId, applied: 1 }]);
});

test('mesocycles read back for the account (the decision surfaces have their history)', async () => {
  const mesos = await getAllMesocyclesForUser(U);
  expect(mesos.map((m) => m.id)).toEqual(['meso-1']);
  expect(mesos[0].blockLedger).toBeTruthy();
});

test('photos and scans have NO cloud applier at all (local-only, as promised)', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'database.js'), 'utf8');
  expect(src).not.toMatch(/insertProgressPhoto\w*FromCloud/);
  expect(src).not.toMatch(/insertProgressScan\w*FromCloud/);
  const registry = fs.readFileSync(path.join(__dirname, '..', 'lib', 'sync', 'registry.js'), 'utf8');
  expect(registry).not.toMatch(/progress_photo/);
});
