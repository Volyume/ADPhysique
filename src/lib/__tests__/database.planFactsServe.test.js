/**
 * D219 lane B7: two writes the new planner relies on, in the local database
 * (lead rulings 5 and 6, docs/audit/plan-builder-science-2026-10-04/
 * 00-AUDIT-AND-PLAN.md sections 4.3 and 4.14; register D219 founder answer Q5
 * and build ruling 4).
 *
 * BEHAVIOURAL, real SQLite (node:sqlite) through the REAL init path, the same
 * harness as database.planFacts.test.js. It pins, each of which fails on the
 * code before this lane:
 *  - the effort ladder (founder Q5, "Stop 1 rep short"): activatePlanWithBlock
 *    writes [3,2,2,1,1,4] (science.js BLOCK.rirLadder) to every block it
 *    activates, and the block's weeks carry those effort targets; the old
 *    default [3,2,1,0,0,4] sent two weeks to failure. A block already running
 *    keeps the ladder it was stored with: the keep-block rebuild
 *    (activatePlanKeepingBlock, D140) never rewrites it (build ruling 4);
 *  - typed set counts (design 4.3): recordTypedSetCount adds
 *    facts.typed[routineExerciseId] = n to a plan the new planner built
 *    (facts version 2), keeps every other fact and every earlier typed count,
 *    replaces a count typed again, and records nothing for a plan the new
 *    planner did not build or for an unusable count.
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
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

const {
  db,
  createProgramme,
  activatePlanWithBlock,
  activatePlanKeepingBlock,
  getProgrammePlanFacts,
  setProgrammePlanFacts,
  recordTypedSetCount,
} = require('../database');
const { BLOCK } = require('../plan/science');

const U = 'user-b7-1';

let conn;
beforeAll(async () => {
  conn = await db();
});

const newProgramme = async (name) => (await createProgramme(U, name, '', 0, null, null, null, false)).id;
const blockRow = (id) => conn.getFirstAsync('SELECT * FROM mesocycles WHERE id = ?', [id]);
const weekTargets = (blockId) => conn.getAllAsync(
  'SELECT week_index, rir_target FROM mesocycle_weeks WHERE mesocycle_id = ? ORDER BY week_index', [blockId],
);

describe('the effort ladder (founder Q5): [3,2,2,1,1,4] for every block activated from now', () => {
  test('the new ladder is the science module\'s own', () => {
    expect([...BLOCK.rirLadder]).toEqual([3, 2, 2, 1, 1, 4]);
  });

  test('activatePlanWithBlock stores it, and the block\'s six weeks carry those efforts', async () => {
    const planId = await newProgramme('Ladder plan');
    const blockId = await activatePlanWithBlock(U, planId, 'Ladder plan', { allowLearnedCarry: false });
    expect(typeof blockId).toBe('string');

    expect((await blockRow(blockId)).rir_ladder).toBe('[3,2,2,1,1,4]');
    const weeks = await weekTargets(blockId);
    expect(weeks.map((w) => w.rir_target)).toEqual([3, 2, 2, 1, 1, 4]);
    expect(weeks.map((w) => w.week_index)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test('a second activation gives the next block the same ladder', async () => {
    const planId = await newProgramme('Second plan');
    const blockId = await activatePlanWithBlock(U, planId, 'Second plan', { allowLearnedCarry: false });
    expect((await blockRow(blockId)).rir_ladder).toBe('[3,2,2,1,1,4]');
  });

  test('a running block keeps the ladder it was stored with: the keep-block rebuild never rewrites it', async () => {
    const planId = await newProgramme('Running plan');
    const runningId = await activatePlanWithBlock(U, planId, 'Running plan', { allowLearnedCarry: false });
    // A block that started under the old default.
    await conn.runAsync('UPDATE mesocycles SET rir_ladder = ? WHERE id = ?', ['[3,2,1,0,0,4]', runningId]);

    const rebuilt = await newProgramme('Rebuilt plan');
    expect(await activatePlanKeepingBlock(U, rebuilt)).toBe(runningId);
    expect((await blockRow(runningId)).rir_ladder).toBe('[3,2,1,0,0,4]');
  });
});

describe('recordTypedSetCount (design 4.3: a typed count is served as typed)', () => {
  const FACTS = { version: 2, roles: { chest: 'standard' }, slots: { r1: { bench: { muscle: 'chest', kind: 'heavy_compound', credits: {} } } } };

  test('adds facts.typed[routineExerciseId], keeping every other fact', async () => {
    const planId = await newProgramme('Typed plan');
    await setProgrammePlanFacts(planId, FACTS);

    expect(await recordTypedSetCount(planId, 're-1', 5)).toBe(true);
    expect(await getProgrammePlanFacts(planId)).toEqual({ ...FACTS, typed: { 're-1': 5 } });
  });

  test('keeps the counts typed earlier, and a count typed again replaces its own', async () => {
    const planId = await newProgramme('Typed twice');
    await setProgrammePlanFacts(planId, FACTS);
    await recordTypedSetCount(planId, 're-1', 5);
    await recordTypedSetCount(planId, 're-2', 6);
    await recordTypedSetCount(planId, 're-1', 3);
    expect((await getProgrammePlanFacts(planId)).typed).toEqual({ 're-1': 3, 're-2': 6 });
  });

  test('bumps the programme\'s updated_at, which the pull and the push order by', async () => {
    const planId = await newProgramme('Typed stamp');
    await setProgrammePlanFacts(planId, FACTS);
    await conn.runAsync('UPDATE programmes SET updated_at = 1 WHERE id = ?', [planId]);
    await recordTypedSetCount(planId, 're-1', 4);
    const row = await conn.getFirstAsync('SELECT updated_at FROM programmes WHERE id = ?', [planId]);
    expect(row.updated_at).toBeGreaterThan(1);
  });

  test('a plan the new planner did not build records nothing: no facts, another version, unreadable facts', async () => {
    const none = await newProgramme('No facts');
    expect(await recordTypedSetCount(none, 're-1', 5)).toBe(false);
    expect(await getProgrammePlanFacts(none)).toBeNull();

    const older = await newProgramme('Another version');
    await setProgrammePlanFacts(older, { version: 1, roles: {} });
    expect(await recordTypedSetCount(older, 're-1', 5)).toBe(false);
    expect(await getProgrammePlanFacts(older)).toEqual({ version: 1, roles: {} });

    const broken = await newProgramme('Unreadable');
    await conn.runAsync('UPDATE programmes SET plan_facts = ? WHERE id = ?', ['{not json', broken]);
    expect(await recordTypedSetCount(broken, 're-1', 5)).toBe(false);
  });

  test.each([[0], [-2], [NaN], [null], [undefined], ['five'], [Infinity]])(
    'an unusable count (%p) records nothing', async (bad) => {
      const planId = await newProgramme('Bad count');
      await setProgrammePlanFacts(planId, FACTS);
      expect(await recordTypedSetCount(planId, 're-1', bad)).toBe(false);
      expect(await getProgrammePlanFacts(planId)).toEqual(FACTS);
    },
  );

  test('no programme or no routine exercise records nothing', async () => {
    expect(await recordTypedSetCount(null, 're-1', 5)).toBe(false);
    const planId = await newProgramme('No row');
    await setProgrammePlanFacts(planId, FACTS);
    expect(await recordTypedSetCount(planId, null, 5)).toBe(false);
    expect(await getProgrammePlanFacts(planId)).toEqual(FACTS);
  });

  test('a count typed as text is read as a whole number', async () => {
    const planId = await newProgramme('Text count');
    await setProgrammePlanFacts(planId, FACTS);
    expect(await recordTypedSetCount(planId, 're-1', '5')).toBe(true);
    expect((await getProgrammePlanFacts(planId)).typed).toEqual({ 're-1': 5 });
  });
});
