/**
 * D219 lane S1: the programmes push and `programmes.plan_facts` (register
 * D219 "Build rulings, 2026-10-04" item 2, the EL-9 pattern in
 * src/lib/sync/featureFlags.js).
 *
 * Why this exists: the programmes upsert is ONE request with no fallback
 * (sync.js _pushProgrammes), so a build that sent a column the cloud lacks
 * would reject every programme for every user and block ordinary sign-out.
 * plan_facts therefore goes in the payload ONLY while PLAN_FACTS_PUSH is on,
 * and the flag stays off until the founder applies migrate_188.
 *
 * Pins (each fails on the code before this lane):
 *  - the shipped flag is OFF (source pin on featureFlags.js);
 *  - with the flag off, the programmes upsert carries NO plan_facts key, even
 *    for a programme that holds facts, and every other field is unchanged;
 *  - with the flag on, the facts go out as an OBJECT for the jsonb column (a
 *    string would store double-encoded), and the key is omitted when the
 *    device holds no facts or unreadable text, so an upsert never erases a
 *    cloud value;
 *  - the cloud migration file exists, is additive and idempotent, and is
 *    recorded UNAPPLIED.
 *
 * Drives the real sync.js through bulkUploadLocalData with supabase and
 * database mocked at the boundary, the convention of
 * bulkUpload.routineExercisesOrphanFilter.test.js.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../supabase', () => ({ getSupabaseClient: jest.fn() }));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../database');

// A getter, so each test can flip the flag the real module would export.
const mockFlags = { planFactsPush: false };
jest.mock('../sync/featureFlags', () => ({
  get CIRCUIT_SYNC_COLUMNS_ENABLED() { return true; },
  get PLAN_FACTS_PUSH() { return mockFlags.planFactsPush; },
}));

const fs = require('fs');
const path = require('path');
const { getSupabaseClient } = require('../supabase');
const db = require('../database');
const { bulkUploadLocalData } = require('../sync');

function makeChain(result) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => result,
    then: (resolve) => resolve(result),
  };
  return chain;
}

function makeClient(captured) {
  return {
    from: jest.fn((table) => ({
      upsert: jest.fn((payload) => {
        if (table === 'programmes') captured.programmes.push(Array.isArray(payload) ? payload : [payload]);
        return makeChain({ error: null, data: [] });
      }),
      insert: jest.fn(() => makeChain({ error: null, data: [] })),
      update: jest.fn(() => makeChain({ error: null, data: [] })),
      delete: jest.fn(() => makeChain({ error: null, data: [] })),
      select: jest.fn(() => makeChain({ data: [], error: null })),
    })),
    rpc: jest.fn(async () => ({ data: null, error: null })),
  };
}

const FACTS = { version: 2, roles: { chest: 'standard' }, exposureShares: { chest: { r1: 0.6, r2: 0.4 } } };

function programme(overrides = {}) {
  return {
    id: 'p1', name: 'Upper/Lower 4x/week', description: null, isLibrary: 0, isActive: 1, isArchived: 0,
    sourceProgrammeId: null, folderId: null, createdAt: 1735000000000, updatedAt: 1735000500000, ...overrides,
  };
}

let captured;
beforeEach(() => {
  jest.clearAllMocks();
  mockFlags.planFactsPush = false;
  for (const k of Object.keys(db)) {
    if (typeof db[k] === 'function' && typeof db[k].mockResolvedValue === 'function') {
      db[k].mockResolvedValue([]);
    }
  }
  db.getAllWorkouts.mockResolvedValue([]);
  db.getWorkoutSetsForWorkout.mockResolvedValue([]);
  db.cleanupOrphanRoutineExercises.mockResolvedValue(undefined);
  captured = { programmes: [] };
  getSupabaseClient.mockReturnValue(makeClient(captured));
});

const pushedRow = () => captured.programmes[0][0];

describe('the flag', () => {
  test('PLAN_FACTS_PUSH ships OFF in featureFlags.js (flipped only after migrate_188 is applied)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'sync', 'featureFlags.js'), 'utf8');
    expect(src).toMatch(/^export const PLAN_FACTS_PUSH = false;$/m);
    expect(src).toContain('migrate_188');
  });
});

describe('the programmes upsert with the flag OFF (as shipped)', () => {
  test('a programme that holds plan facts goes up with NO plan_facts key at all', async () => {
    db.getAllProgrammes.mockResolvedValue([programme({ planFacts: JSON.stringify(FACTS) })]);

    await bulkUploadLocalData('cloud-uid', 'local-uid');

    expect(captured.programmes).toHaveLength(1);
    expect(Object.keys(pushedRow())).not.toContain('plan_facts');
  });

  test('every other programme field is unchanged', async () => {
    db.getAllProgrammes.mockResolvedValue([programme({ planFacts: JSON.stringify(FACTS) })]);

    await bulkUploadLocalData('cloud-uid', 'local-uid');

    expect(pushedRow()).toEqual({
      id: 'p1', user_id: 'cloud-uid', name: 'Upper/Lower 4x/week', description: null,
      is_library: false, is_active: true, is_archived: false, source_programme_id: null,
      folder_id: null, updated_at: new Date(1735000500000).toISOString(),
    });
  });
});

describe('the programmes upsert with the flag ON (after migrate_188 is applied)', () => {
  beforeEach(() => { mockFlags.planFactsPush = true; });

  test('the facts go up as an OBJECT for the jsonb column, never a string', async () => {
    db.getAllProgrammes.mockResolvedValue([programme({ planFacts: JSON.stringify(FACTS) })]);

    await bulkUploadLocalData('cloud-uid', 'local-uid');

    expect(pushedRow().plan_facts).toEqual(FACTS);
    expect(typeof pushedRow().plan_facts).toBe('object');
  });

  test('a programme with no facts omits the key, so an upsert never erases a cloud value', async () => {
    db.getAllProgrammes.mockResolvedValue([programme({ planFacts: null }), programme({ id: 'p2' })]);

    await bulkUploadLocalData('cloud-uid', 'local-uid');

    for (const row of captured.programmes[0]) expect(Object.keys(row)).not.toContain('plan_facts');
  });

  test('unreadable text, an array or a scalar omits the key rather than sending garbage', async () => {
    db.getAllProgrammes.mockResolvedValue([
      programme({ id: 'bad1', planFacts: '{not json' }),
      programme({ id: 'bad2', planFacts: '[1,2]' }),
      programme({ id: 'bad3', planFacts: '7' }),
      programme({ id: 'bad4', planFacts: '' }),
    ]);

    await bulkUploadLocalData('cloud-uid', 'local-uid');

    expect(captured.programmes[0]).toHaveLength(4);
    for (const row of captured.programmes[0]) expect(Object.keys(row)).not.toContain('plan_facts');
  });
});

describe('the cloud migration file', () => {
  // Read inside each test, so a missing file fails the tests that need it and
  // not the whole suite.
  const readSql = () => fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'supabase', 'migrate_188_programmes_plan_facts.sql'),
    'utf8',
  );

  test('adds one nullable jsonb column to programmes, additive and idempotent', () => {
    const sql = readSql();
    expect(sql).toMatch(/ALTER TABLE public\.programmes\s+ADD COLUMN IF NOT EXISTS plan_facts jsonb;/);
    // Nothing destructive, no default, no constraint, no backfill.
    expect(sql).not.toMatch(/\bDROP\b\s+(?!COLUMN plan_facts)/i);
    expect(sql).not.toMatch(/\bNOT NULL\b\s*;/i);
    expect(sql).not.toMatch(/\bUPDATE\b\s+public\./i);
    expect(sql).not.toMatch(/ADD COLUMN IF NOT EXISTS plan_facts jsonb\s+(DEFAULT|NOT NULL|CHECK)/i);
  });

  test('its header carries purpose, applied locally, applied remotely (UNAPPLIED), re-run safety and rollback', () => {
    const sql = readSql();
    for (const word of ['Purpose', 'Applied locally', 'Applied remotely', 'Safe to re-run', 'Rollback']) {
      expect(sql).toContain(word);
    }
    expect(sql).toMatch(/STATUS: UNAPPLIED/);
    expect(sql).toContain('"run against production"');
  });

  test('is numbered 188 and no other file claims that number', () => {
    const dir = fs.readdirSync(path.join(__dirname, '..', '..', '..', 'supabase'));
    const numbers = dir
      .map((f) => /^migrate_(\d+)_/.exec(f))
      .filter(Boolean)
      .map((m) => Number(m[1]));
    expect(numbers).toContain(188);
    expect(numbers.filter((n) => n === 188)).toHaveLength(1);
  });
});
