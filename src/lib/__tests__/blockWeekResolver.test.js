/**
 * Wave 2 (cross-surface-consistency-audit-2026-07-30) -- the single
 * date-based block/week resolver. The audit found "which week of my
 * training block am I in" answered FIVE different ways; this pins the fix:
 *
 *   1. getCurrentBlockWeekIndex (mesocycle.js) resolves the exact week for
 *      a block starting 18 Jul 2026 with 6 planned weeks, viewed
 *      30 Jul 2026 (week 2 of 6).
 *   2. getCurrentMesocycleWeek (database.js) reads isDeload/rirTarget off
 *      the TRUE current week's row -- not week 1's, which is what the old
 *      "most recent workout's mesocycle_week_id" heuristic was pinned to
 *      forever, since createWorkout always linked to
 *      `ORDER BY week_index ASC LIMIT 1`.
 *   3. createWorkout links the new workout to the TRUE current week's row,
 *      not that `week_index ASC LIMIT 1` root-cause query.
 *   4. A source-level guard: no other screen/hook re-implements block/week
 *      date maths independently of this shared resolver family
 *      (getCurrentMesoWeek / getBlockStatus / getCurrentBlockWeekIndex, all
 *      in mesocycle.js).
 */
jest.mock('expo-sqlite');
jest.mock('../sync', () => ({ scheduleSync: jest.fn() }));

const fs = require('fs');
const path = require('path');
const database = require('../database');
const { getCurrentBlockWeekIndex } = require('../mesocycle');

function mesoRow({ id = 'meso-1', startDate, plannedWeeks, durationWeeks = plannedWeeks } = {}) {
  return {
    id, user_id: 'u1', name: 'Test Block', start_date: startDate,
    end_date: null, duration_weeks: durationWeeks, planned_weeks: plannedWeeks,
    focus: null, block_type: 'offseason_hypertrophy', rir_ladder: '[3,2,1,0,0,4]',
    deload_protocol: 'rp_classic', status: 'active', is_active: 1,
    auto_regulation_enabled: 1, deload_week: plannedWeeks, created_at: 1000, updated_at: 1000,
  };
}

function weekRow({ id, mesocycleId = 'meso-1', weekIndex, isDeload = 0, rirTarget = 2 }) {
  return {
    id, mesocycle_id: mesocycleId, week_index: weekIndex, is_deload: isDeload,
    rir_target: rirTarget, notes: null, created_at: 1000, updated_at: 1000,
  };
}

describe('getCurrentBlockWeekIndex (mesocycle.js, pure date maths)', () => {
  test('a block starting 18 Jul 2026 with 6 planned weeks reports week 2 of 6 on 30 Jul 2026', () => {
    const start = new Date(2026, 6, 18).getTime(); // 18 Jul 2026, local midnight
    const now = new Date(2026, 6, 30).getTime(); // 30 Jul 2026
    expect(getCurrentBlockWeekIndex(start, 6, now)).toBe(2);
  });

  test('clamps at plannedWeeks once the block has run past its schedule (no row exists beyond it)', () => {
    const start = new Date(2026, 6, 18).getTime();
    const now = new Date(2026, 8, 30).getTime(); // ~10 weeks later
    expect(getCurrentBlockWeekIndex(start, 6, now)).toBe(6);
  });
});

describe('getCurrentMesocycleWeek (database.js) -- the single resolver', () => {
  let connection;

  beforeAll(async () => {
    connection = await database.db();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (Date.now.mockRestore) Date.now.mockRestore();
  });

  test('reports the TRUE current week (not week 1) with that week\'s own isDeload/rirTarget', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date(2026, 6, 30).getTime()); // 30 Jul 2026

    connection.getFirstAsync.mockImplementation((sql) => {
      if (sql.startsWith('SELECT * FROM mesocycles')) {
        return Promise.resolve(mesoRow({ startDate: '2026-07-18', plannedWeeks: 6 }));
      }
      if (sql.startsWith('SELECT * FROM mesocycle_weeks')) {
        // The TRUE current week (2), NOT week 1 -- a stuck resolver would
        // have read week 1's row (rir_target 3, isDeload false) regardless.
        return Promise.resolve(weekRow({ id: 'week-2', weekIndex: 2, isDeload: 0, rirTarget: 1 }));
      }
      return Promise.resolve(null);
    });

    const result = await database.getCurrentMesocycleWeek('u1');
    expect(result.weekIndex).toBe(2);
    expect(result.plannedWeeks).toBe(6);
    expect(result.isDeload).toBe(false);
    expect(result.rirTarget).toBe(1);
    expect(result.weekRowId).toBe('week-2');
    expect(result.blockId).toBe('meso-1');
  });

  test('a deload week correctly reports isDeload true', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date(2026, 6, 18 + 35).getTime()); // week 6 of 6

    connection.getFirstAsync.mockImplementation((sql) => {
      if (sql.startsWith('SELECT * FROM mesocycles')) {
        return Promise.resolve(mesoRow({ startDate: '2026-07-18', plannedWeeks: 6 }));
      }
      if (sql.startsWith('SELECT * FROM mesocycle_weeks')) {
        return Promise.resolve(weekRow({ id: 'week-6', weekIndex: 6, isDeload: 1, rirTarget: 4 }));
      }
      return Promise.resolve(null);
    });

    const result = await database.getCurrentMesocycleWeek('u1');
    expect(result.weekIndex).toBe(6);
    expect(result.isDeload).toBe(true);
    expect(result.rirTarget).toBe(4);
  });
});

describe('createWorkout links to the TRUE current week', () => {
  let connection;

  beforeAll(async () => {
    connection = await database.db();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (Date.now.mockRestore) Date.now.mockRestore();
  });

  test('links the new workout to the current week row, not `ORDER BY week_index ASC LIMIT 1` (root cause)', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date(2026, 6, 30).getTime()); // week 2 of 6

    connection.getFirstAsync.mockImplementation((sql) => {
      if (sql.startsWith('SELECT id FROM mesocycles')) {
        return Promise.resolve({ id: 'meso-1' });
      }
      if (sql.startsWith('SELECT * FROM mesocycles')) {
        return Promise.resolve(mesoRow({ startDate: '2026-07-18', plannedWeeks: 6 }));
      }
      if (sql.startsWith('SELECT * FROM mesocycle_weeks')) {
        return Promise.resolve(weekRow({ id: 'week-2', weekIndex: 2 }));
      }
      return Promise.resolve(null);
    });

    await database.createWorkout('u1', null, {});

    const insertCall = connection.runAsync.mock.calls.find(([sql]) => sql.includes('INSERT INTO workouts'));
    expect(insertCall).toBeTruthy();
    const [, params] = insertCall;
    // Column order: id, user_id, routine_id, mesocycle_id, mesocycle_week_id, ...
    expect(params[3]).toBe('meso-1');
    expect(params[4]).toBe('week-2');
  });

  test('never links a week_index ASC / LIMIT 1 query (the retired root-cause query is gone)', async () => {
    connection.getFirstAsync.mockResolvedValue(null);
    await database.createWorkout('u2', null, {});
    const badQuery = connection.getFirstAsync.mock.calls.find(
      ([sql]) => /mesocycle_weeks/.test(sql) && /ORDER BY week_index ASC/.test(sql),
    );
    expect(badQuery).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Source-level guard: exactly ONE resolver family answers "which week of
// which block". This bug returned because nothing stopped a second
// implementation being added (the audit's own "PERMANENT GUARD" ruling) --
// so this scans the real source of every surface the audit named as a
// competing/retired implementation and asserts the competing date maths is
// gone, in favour of the shared resolver (getCurrentMesocycleWeek /
// getBlockStatus / getCurrentBlockWeekIndex / getCurrentMesoWeek).
// ---------------------------------------------------------------------------
describe('single-resolver guard: no surface computes block week independently', () => {
  function read(relPath) {
    return fs.readFileSync(path.join(__dirname, '..', '..', relPath), 'utf8');
  }

  test('MesocycleBuilderScreen no longer runs its own differenceInWeeks week calculation', () => {
    const src = read('screens/MesocycleBuilderScreen.js');
    expect(src).not.toMatch(/import\s*\{\s*differenceInWeeks/);
    expect(src).not.toMatch(/differenceInWeeks\(new Date\(\)/);
    expect(src).toContain("import { getBlockStatus } from '../lib/mesocycle'");
  });

  test('useProgressData no longer computes mesoCurrentWeek from raw ms against durationWeeks', () => {
    const src = read('hooks/useProgressData.js');
    expect(src).not.toMatch(/Math\.ceil\(\(Date\.now\(\) - start\) \/ WEEK_MS\)/);
    // Retired: passed user.id where getPlannedMuscleVolume expects a week id.
    expect(src).not.toMatch(/getPlannedMuscleVolume\(user\.id\)/);
  });

  test('getCurrentMesocycleWeek resolves by date against the block\'s own start_date, not the most-recent-workout heuristic', () => {
    const src = read('lib/database.js');
    // The retired join that resolved "current week" off the most recently
    // linked workout, instead of the block's own dates.
    expect(src).not.toMatch(/JOIN workouts w ON w\.mesocycle_week_id = mw\.id/);
    expect(src).toContain('getCurrentBlockWeekIndex(meso.startDate, plannedWeeks)');
  });

  test('createWorkout no longer pins every workout to week 1 via a week_index-ascending, limit-1 query', () => {
    const src = read('lib/database.js');
    // Matches the retired root-cause query even if reflowed; excludes the
    // header comments (that reference it by name deliberately) by checking
    // only actual SQL fragments (mesocycle_weeks ... WHERE mesocycle_id ...).
    expect(src).not.toMatch(/mesocycle_weeks WHERE mesocycle_id = \? ORDER BY week_index ASC LIMIT 1/);
  });

  test('getBlockStatus no longer silently defaults plannedWeeks to 5', () => {
    const src = read('lib/mesocycle.js');
    expect(src).not.toContain('getBlockStatus(startDateMs, plannedWeeks = 5');
  });

  test('the widget writer no longer applies its own +1 on top of an already 1-indexed weekIndex', () => {
    const src = read('lib/widgets/writer.js');
    expect(src).not.toMatch(/mesoWeek\.weekIndex \?\? 0\) \+ 1/);
  });
});
