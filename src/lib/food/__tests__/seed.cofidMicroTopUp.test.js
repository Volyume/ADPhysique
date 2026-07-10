/**
 * seed.cofidMicroTopUp.test.js — MN-1 (item 16 data spike, 2026-07-10).
 *
 * Exercises the REAL seed.js import path (importCofidSnapshotIfNeeded) end
 * to end against a genuine SQLite engine (Node's built-in `node:sqlite`,
 * v22+), not a jest.fn() stub -- this repo has "no in-memory SQLite harness"
 * (per src/lib/food/__tests__/micronutrients.test.js's own header), which
 * meant the ON CONFLICT ... DO UPDATE SQL added to seed.js for this task was
 * previously untestable beyond "does it get called". Using node:sqlite here
 * lets this suite actually run the SQL and assert on the resulting rows.
 *
 * Pins:
 *   - idempotency: importing the same snapshot version twice does not
 *     duplicate rows or change anything on the second run;
 *   - the seed importer's INSERT ... ON CONFLICT(source, source_id) DO
 *     UPDATE top-up: re-importing under a NEW snapshot version that adds
 *     micronutrient data for an already-seeded source_id updates ONLY the
 *     micronutrient columns (+ updated_at), leaving id/name/macros/verified
 *     untouched on the existing row -- this is what makes bumping
 *     COFID_SNAPSHOT_VERSION actually deliver newly-added micro data to a
 *     device that seeded CoFID before this column set existed;
 *   - COALESCE never regresses a known micronutrient value back to unknown:
 *     a later import with a null for a column that was previously non-null
 *     keeps the old value, it does not blank it out.
 */
const { DatabaseSync } = require('node:sqlite');
import { MICRO_COLUMNS, microColumnsCreateFragment } from '../micronutrients';

// jest has no transformer for .dat assets (Metro-only); stub the module the
// same way seed.versionSkip.test.js does. The actual row content for each
// test comes from the FileSystem.readAsStringAsync mock below, not this file.
jest.mock('../../../../assets/seed/cofid_uk.dat', () => 102, { virtual: false });

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      downloadAsync: jest.fn(async () => {}),
      localUri: 'file:///seed/snapshot.dat',
    })),
  },
}));

jest.mock('../../errorLog', () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

let mockSqlite;
let mockIdCounter;
jest.mock('../../database', () => ({
  db: jest.fn(async () => ({
    execAsync: async (sql) => { mockSqlite.exec(sql); },
    runAsync: async (sql, params = []) => mockSqlite.prepare(sql).run(...params),
  })),
  uid: jest.fn(() => `test-id-${++mockIdCounter}`),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const FileSystem = require('expo-file-system/legacy');
const { importCofidSnapshotIfNeeded } = require('../seed');

const COFID_FLAG_KEY = '@volyume_cofid_snapshot_loaded_v1';

function freshFoodsDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE foods (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_id TEXT,
    barcode_ean TEXT,
    name TEXT NOT NULL,
    brand TEXT,
    serving_g REAL NOT NULL,
    serving_label TEXT,
    kcal_100g REAL NOT NULL,
    protein_100g REAL NOT NULL,
    carbs_100g REAL NOT NULL,
    fat_100g REAL NOT NULL,
    fibre_100g REAL,
    sodium_100g REAL,
    sugar_100g REAL,
    ${microColumnsCreateFragment('    ')},
    verified INTEGER DEFAULT 0,
    fetched_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);
  db.exec('CREATE UNIQUE INDEX uq_foods_source_source_id ON foods(source, source_id)');
  return db;
}

function selectAckee() {
  return mockSqlite.prepare('SELECT * FROM foods WHERE source = ? AND source_id = ?').get('cofid', '13-145');
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockSqlite = freshFoodsDb();
  mockIdCounter = 0;
});

const V1 = '2026-01-01T00:00:00.000Z'; // pre-MN-1: no micronutrient fields
const V2 = '2026-07-10T05:22:13.191Z'; // post-MN-1: micros added for the same food

const ackeeRowV1 = {
  ean: '13-145', name: 'Ackee, canned, drained', brand: null,
  serving_g: 100, kcal_100g: 151, protein_100g: 2.9, carbs_100g: 0.8, fat_100g: 15.2,
  fibre_100g: null, sodium_100g: null, sugar_100g: 0.8,
  // no micronutrient keys at all in the v1 snapshot row
};

const ackeeRowV2 = {
  ...ackeeRowV1,
  potassium_100g: 270, calcium_100g: 35, magnesium_100g: 40, phosphorus_100g: 47,
  iron_100g: 0.7, copper_100g: 0.27, zinc_100g: 0.6, chloride_100g: 340,
  vit_d_100g: 0, thiamin_100g: 0.03, riboflavin_100g: 0.07, niacin_100g: 1.1,
  vit_b6_100g: 0.06, vit_b12_100g: 0, folate_100g: 41, vit_c_100g: 30,
  // manganese/selenium/iodine/vit_a/vit_e/vit_k/pantothenic/biotin genuinely
  // unknown for this food ("N"/"Tr" in the source) -- omitted, must stay null.
};

async function importSnapshot(generatedAt, rows) {
  FileSystem.readAsStringAsync.mockResolvedValueOnce(JSON.stringify({
    _meta: { generatedAt }, rows,
  }));
  return importCofidSnapshotIfNeeded();
}

test('first import: inserts the row, all omitted micronutrients are null (never 0)', async () => {
  const res = await importSnapshot(V1, [ackeeRowV1]);
  expect(res.reason).toBe('imported');
  expect(res.importedRows).toBe(1);

  const row = selectAckee();
  expect(row.name).toBe('Ackee, canned, drained');
  expect(row.kcal_100g).toBe(151);
  for (const col of MICRO_COLUMNS) {
    expect(row[col]).toBeNull();
  }
});

test('idempotency: re-running the SAME version does nothing (fast-path skip, no duplicate row)', async () => {
  await importSnapshot(V1, [ackeeRowV1]);
  await AsyncStorage.setItem(COFID_FLAG_KEY, V1); // simulate the flag the first run would have set
  const res = await importSnapshot(V1, [ackeeRowV1]);
  expect(res.reason).toBe('already_loaded');

  const all = mockSqlite.prepare('SELECT * FROM foods WHERE source = ?').all('cofid');
  expect(all).toHaveLength(1);
});

test('version bump top-up: a later snapshot with micronutrient data updates ONLY the micro columns + updated_at', async () => {
  await importSnapshot(V1, [ackeeRowV1]);
  const afterV1 = selectAckee();
  expect(afterV1.vit_c_100g).toBeNull();

  const res = await importSnapshot(V2, [ackeeRowV2]);
  expect(res.reason).toBe('imported');
  expect(res.importedRows).toBe(1);

  const all = mockSqlite.prepare('SELECT * FROM foods WHERE source = ?').all('cofid');
  expect(all).toHaveLength(1); // no duplicate row -- topped up in place

  const afterV2 = selectAckee();
  // Same row identity preserved across the top-up.
  expect(afterV2.id).toBe(afterV1.id);
  // Non-micro fields untouched by the top-up.
  expect(afterV2.name).toBe(afterV1.name);
  expect(afterV2.kcal_100g).toBe(afterV1.kcal_100g);
  expect(afterV2.created_at).toBe(afterV1.created_at);
  // Newly-supplied micronutrients are now populated.
  expect(afterV2.potassium_100g).toBe(270);
  expect(afterV2.vit_c_100g).toBe(30);
  expect(afterV2.niacin_100g).toBe(1.1);
  // A genuine measured zero (vit_d/vit_b12) is stored as 0, not null.
  expect(afterV2.vit_d_100g).toBe(0);
  expect(afterV2.vit_b12_100g).toBe(0);
  // Nutrients CoFID never carries for this food stay null (unknown), never 0.
  expect(afterV2.manganese_100g).toBeNull();
  expect(afterV2.selenium_100g).toBeNull();
  expect(afterV2.iodine_100g).toBeNull();
  expect(afterV2.vit_a_100g).toBeNull();
  expect(afterV2.vit_e_100g).toBeNull();
  expect(afterV2.vit_k_100g).toBeNull();
  expect(afterV2.pantothenic_100g).toBeNull();
  expect(afterV2.biotin_100g).toBeNull();
});

test('COALESCE never regresses a known micronutrient back to unknown', async () => {
  await importSnapshot(V1, [ackeeRowV1]);
  await importSnapshot(V2, [ackeeRowV2]); // sets vit_c_100g = 30

  // Force the import path to run again for the SAME version rather than
  // hitting the version-flag fast path (the app's real fast path is keyed
  // off the fixed COFID_SNAPSHOT_VERSION constant, so a genuinely later
  // version can't be simulated from a test without changing that constant;
  // an absent/lost flag -- e.g. the best-effort `AsyncStorage.setItem` in
  // step 4 of `_run()` having failed on a previous attempt, which the code
  // explicitly tolerates -- is the realistic way this branch re-runs for an
  // already-imported row). A row that (bug, or a source pass that genuinely
  // omits the field) does not carry vit_c_100g this time must not blank out
  // the value already stored.
  await AsyncStorage.removeItem(COFID_FLAG_KEY);
  const ackeeRowV3 = { ...ackeeRowV2 };
  delete ackeeRowV3.vit_c_100g;
  const res = await importSnapshot(V2, [ackeeRowV3]);
  expect(res.reason).toBe('imported');

  const row = selectAckee();
  // The previously-known value survives; the importer never blanks out a
  // real value just because a later pass didn't repeat it.
  expect(row.vit_c_100g).toBe(30);
});

test('a brand-new source_id in the same import still inserts a full new row', async () => {
  await importSnapshot(V1, [ackeeRowV1]);
  const otherRow = {
    ean: '13-147', name: 'Agar, dried, soaked and drained', brand: null,
    serving_g: 100, kcal_100g: 3, protein_100g: 0.3, carbs_100g: 0.3, fat_100g: 0,
    fibre_100g: null, sodium_100g: null, sugar_100g: 0,
  };
  const res = await importSnapshot(V2, [ackeeRowV2, otherRow]);
  expect(res.importedRows).toBe(2);

  const all = mockSqlite.prepare('SELECT * FROM foods ORDER BY source_id').all();
  expect(all).toHaveLength(2);
  expect(all.map((r) => r.source_id)).toEqual(['13-145', '13-147']);
});
