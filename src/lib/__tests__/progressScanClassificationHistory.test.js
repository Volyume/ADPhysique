/**
 * Guard suite for the progress-scan classification history (D18, founder
 * decision 2026-07-09; plan-F §4.3). Pins the invariants that make this table
 * safe: enum-only shape, engine never reads it, device-local (never synced),
 * and wiped on every user boundary.
 */
const fs = require('fs');
const path = require('path');

const mockRunCalls = [];
let mockRows = [];

jest.mock('../database', () => ({
  db: jest.fn(async () => ({
    runAsync: async (sql, params) => {
      mockRunCalls.push({ sql, params });
      return { changes: 1 };
    },
    getAllAsync: async () => mockRows,
  })),
}));

jest.mock('../errorLog', () => ({ logError: jest.fn() }));
jest.mock('../uuid', () => ({ generateUUID: jest.fn(() => 'hist-id') }));

const {
  recordScanClassification,
  listScanClassificationHistory,
} = require('../progressScanClassificationHistory');

beforeEach(() => {
  mockRunCalls.length = 0;
  mockRows = [];
});

describe('recordScanClassification: enum-only shape', () => {
  test('persists exactly id/user_id/assessment/status/created_at and nothing else', async () => {
    const id = await recordScanClassification('user-1', {
      assessment: 'supports',
      status: 'valid',
      nowMs: 1234,
    });
    expect(id).toBe('hist-id');
    expect(mockRunCalls).toHaveLength(1);
    const { sql, params } = mockRunCalls[0];
    // The INSERT column list is exactly the five enum/id/time columns.
    expect(sql).toMatch(/INSERT INTO progress_scan_classification_history/);
    expect(sql).toMatch(/\(id, user_id, assessment, status, created_at\)/);
    // No photo / score / body-fat / free-text column can appear.
    expect(sql).not.toMatch(/photo|score|body_fat|bodyfat|note|summary|uri|signals/i);
    expect(params).toEqual(['hist-id', 'user-1', 'supports', 'valid', 1234]);
  });

  test('rejects an assessment outside the closed vocabulary (no write)', async () => {
    const id = await recordScanClassification('user-1', {
      assessment: 'looking_leaner', // not a PROGRESS_SCAN_ASSESSMENT value
      status: 'valid',
    });
    expect(id).toBeNull();
    expect(mockRunCalls).toHaveLength(0);
  });

  test('rejects a status outside the closed vocabulary (no write)', async () => {
    const id = await recordScanClassification('user-1', {
      assessment: 'supports',
      status: 'body_fat_18pct', // not a PROGRESS_SCAN_EVIDENCE_STATUS value
    });
    expect(id).toBeNull();
    expect(mockRunCalls).toHaveLength(0);
  });

  test('a missing user id writes nothing', async () => {
    expect(await recordScanClassification(null, { assessment: 'supports', status: 'valid' })).toBeNull();
    expect(mockRunCalls).toHaveLength(0);
  });

  test('every real assessment/status enum value is accepted', async () => {
    const {
      PROGRESS_SCAN_ASSESSMENT,
      PROGRESS_SCAN_EVIDENCE_STATUS,
    } = require('../progressScanCheckInEvidence');
    for (const assessment of PROGRESS_SCAN_ASSESSMENT) {
      // eslint-disable-next-line no-await-in-loop
      const id = await recordScanClassification('user-1', { assessment, status: 'valid' });
      expect(id).toBe('hist-id');
    }
    for (const status of PROGRESS_SCAN_EVIDENCE_STATUS) {
      // eslint-disable-next-line no-await-in-loop
      const id = await recordScanClassification('user-1', { assessment: 'inconclusive', status });
      expect(id).toBe('hist-id');
    }
  });
});

describe('listScanClassificationHistory: read shape', () => {
  test('maps rows to enum-only view objects, newest first, and only for a user', async () => {
    mockRows = [
      { id: 'a', assessment: 'supports', status: 'valid', created_at: 3 },
      { id: 'b', assessment: 'conflicts', status: 'valid', created_at: 2 },
    ];
    const out = await listScanClassificationHistory('user-1', 5);
    expect(out).toEqual([
      { id: 'a', assessment: 'supports', status: 'valid', createdAt: 3 },
      { id: 'b', assessment: 'conflicts', status: 'valid', createdAt: 2 },
    ]);
    expect(await listScanClassificationHistory(null)).toEqual([]);
  });
});

describe('source invariants (device-local, engine-isolated, wiped)', () => {
  const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

  test('no coaching-engine module imports the classification history', () => {
    for (const rel of [
      '../weeklyCoach.js',
      '../coachApply.js',
      '../nutritionEngine.js',
      '../planEngine.js',
    ]) {
      const src = read(rel);
      expect(src).not.toMatch(/progressScanClassificationHistory/);
    }
  });

  test('the module itself makes no network/cloud/upload call', () => {
    const src = read('../progressScanClassificationHistory.js');
    expect(src).not.toMatch(/supabase|fetch\(|http|upload|POST|\.storage/i);
  });

  test('the table is absent from the sync layer (device-local, never leaves the phone)', () => {
    const registry = read('../sync/registry.js');
    const syncLegacy = read('../sync.js');
    expect(registry).not.toMatch(/progress_scan_classification_history/);
    expect(syncLegacy).not.toMatch(/progress_scan_classification_history/);
  });

  test('wipeAllUserData clears the table (per-user boundary)', () => {
    const db = read('../database.js');
    // The table must be in the wiped set AND created by a migration.
    expect(db).toMatch(/'progress_scan_classification_history'/);
    expect(db).toMatch(/CREATE TABLE IF NOT EXISTS progress_scan_classification_history/);
  });
});
