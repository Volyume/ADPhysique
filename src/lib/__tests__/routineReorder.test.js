/**
 * routineReorder.test.js
 *
 * Day-level plan reorder (old founder-GO item, verified unbuilt: routines had
 * no position column, so a plan's days could never be reordered independently
 * of routine_exercises.order_in_routine, which only orders exercises WITHIN a
 * day). Pins the persistence contract added to database.js:
 *
 *   - createRoutine appends a new day after the current last position within
 *     its plan (or the templates pool when it has no programme_id).
 *   - updateRoutinePosition writes the new position + bumps updated_at (so
 *     the change reaches sync.scheduleSync like every other mutation).
 *   - getRoutinesForPlan (and the two plan-duplication reads) order by
 *     position first, falling back to created_at for any row still NULL.
 *   - insertRoutineFromCloud carries the cloud row's position through a pull
 *     (or null when the cloud row predates migrate_113).
 *
 * The expo-sqlite mock is a shape stub (no real SQL engine), so we drive it
 * the way the rest of the repo's database.js tests do: control
 * getFirstAsync/getAllAsync and assert on the SQL + params runAsync receives
 * (repo convention: CRUD itself is exercised on device; here we pin the
 * contract).
 */

jest.mock('expo-sqlite');

const {
  db, createRoutine, updateRoutinePosition, getRoutinesForPlan, insertRoutineFromCloud,
} = require('../database');

let conn;

beforeEach(async () => {
  conn = await db();
  conn.runAsync.mockClear();
  conn.getAllAsync.mockReset();
  conn.getFirstAsync.mockReset();
  conn.getFirstAsync.mockResolvedValue(null);
});

function lastCallMatching(mockFn, re) {
  const calls = mockFn.mock.calls.filter(([sql]) => re.test(sql));
  return calls.length ? calls[calls.length - 1] : null;
}

// Maps an INSERT's column list to its VALUES tuple positionally, so a test
// can ask "what did column X get bound to" without hardcoding an index that
// silently drifts whenever a column is added, or breaks on a column whose
// value is a literal (e.g. `is_active` is hardcoded `1`, not a `?`).
function paramForColumn(sql, params, columnName) {
  const columnsStr = sql.slice(sql.indexOf('(') + 1, sql.indexOf(')'));
  const columns = columnsStr.split(',').map((c) => c.trim());
  const valuesStart = sql.indexOf('VALUES (') + 'VALUES ('.length;
  const valuesStr = sql.slice(valuesStart, sql.indexOf(')', valuesStart));
  const values = valuesStr.split(',').map((v) => v.trim());
  let paramIdx = 0;
  for (let i = 0; i < columns.length; i++) {
    if (values[i] === '?') {
      if (columns[i] === columnName) return params[paramIdx];
      paramIdx += 1;
    } else if (columns[i] === columnName) {
      return values[i]; // a literal, e.g. "1"
    }
  }
  throw new Error(`column ${columnName} not found in INSERT`);
}

describe('createRoutine position assignment', () => {
  test('a first day in a plan gets position 0', async () => {
    conn.getFirstAsync.mockResolvedValue({ maxPos: null });
    const routine = await createRoutine('u1', 'Push Day', null, null, 0, null, 'plan1');

    const insert = lastCallMatching(conn.runAsync, /INSERT INTO routines/);
    expect(insert).not.toBeNull();
    const [sql, params] = insert;
    expect(paramForColumn(sql, params, 'position')).toBe(0);
    expect(routine.position).toBe(0);
  });

  test("a new day is appended after the plan's current last day", async () => {
    conn.getFirstAsync.mockResolvedValue({ maxPos: 2 });
    const routine = await createRoutine('u1', 'Pull Day', null, null, 0, null, 'plan1');
    expect(routine.position).toBe(3);

    const insert = lastCallMatching(conn.runAsync, /INSERT INTO routines/);
    const [sql, params] = insert;
    expect(paramForColumn(sql, params, 'position')).toBe(3);

    // Scoped to this plan, not every routine in the database.
    const maxLookup = conn.getFirstAsync.mock.calls[0];
    expect(maxLookup[0]).toMatch(/WHERE programme_id = \?/);
    expect(maxLookup[1]).toEqual(['plan1']);
  });

  test('a template with no plan is scoped to the null-programme pool', async () => {
    conn.getFirstAsync.mockResolvedValue({ maxPos: 1 });
    const routine = await createRoutine('u1', 'Template');
    expect(routine.position).toBe(2);

    const maxLookup = conn.getFirstAsync.mock.calls[0];
    expect(maxLookup[0]).toMatch(/WHERE programme_id IS NULL/);
  });
});

describe('updateRoutinePosition', () => {
  test('persists the new position and touches updated_at', async () => {
    await updateRoutinePosition('r1', 2);
    const update = lastCallMatching(conn.runAsync, /UPDATE routines SET position/);
    expect(update).not.toBeNull();
    const [sql, params] = update;
    expect(sql).toContain('updated_at');
    expect(params[0]).toBe(2);
    expect(typeof params[1]).toBe('number'); // updated_at epoch ms
    expect(params[2]).toBe('r1');
  });
});

describe('getRoutinesForPlan ordering', () => {
  test('orders by position, falling back to created_at for NULL rows', async () => {
    conn.getAllAsync.mockResolvedValue([]);
    await getRoutinesForPlan('plan1');

    const [sql, params] = conn.getAllAsync.mock.calls[0];
    expect(sql).toMatch(/ORDER BY \(position IS NULL\), position ASC, created_at ASC/);
    expect(params).toEqual(['plan1']);
  });
});

describe('insertRoutineFromCloud carries position through pull', () => {
  test("writes the cloud row's position", async () => {
    await insertRoutineFromCloud('u1', {
      id: 'r1', name: 'Push Day', programme_id: 'plan1', position: 1, created_at: Date.now(),
    });
    const insert = lastCallMatching(conn.runAsync, /INSERT OR IGNORE INTO routines/);
    expect(insert).not.toBeNull();
    const [sql, params] = insert;
    expect(paramForColumn(sql, params, 'position')).toBe(1);
  });

  test('falls back to null when the cloud row predates migrate_113', async () => {
    await insertRoutineFromCloud('u1', {
      id: 'r1', name: 'Push Day', programme_id: 'plan1', created_at: Date.now(),
    });
    const insert = lastCallMatching(conn.runAsync, /INSERT OR IGNORE INTO routines/);
    const [sql, params] = insert;
    expect(paramForColumn(sql, params, 'position')).toBeNull();
  });
});

describe('SCHEMA_MIGRATIONS v61 (routines.position)', () => {
  const { runMigrations } = require('../database');

  // Same fake handle shape as migrations.cardioLog.test.js: a real
  // PRAGMA user_version counter plus a recorded exec log, so the runner's
  // own idempotency/ordering logic is exercised for real rather than mocked
  // away.
  function makeFakeDb(startVersion, { existingRoutines = [] } = {}) {
    let version = startVersion;
    const exec = [];
    const updates = [];
    return {
      _exec: exec,
      _updates: updates,
      get _version() { return version; },
      getFirstAsync: async (sql) => {
        if (/user_version/i.test(String(sql))) return { user_version: version };
        return null;
      },
      getAllAsync: async (sql) => {
        if (/SELECT id, programme_id FROM routines/i.test(String(sql))) return existingRoutines;
        return [];
      },
      runAsync: async (sql, params) => { updates.push([sql, params]); return {}; },
      execAsync: async (sql) => {
        const s = String(sql);
        exec.push(s);
        const m = /PRAGMA user_version = (\d+)/.exec(s);
        if (m) version = Number(m[1]);
      },
      withTransactionAsync: async (fn) => fn(),
      isInTransactionSync: () => false,
    };
  }

  test('a fresh install adds the routines.position column', async () => {
    const d = makeFakeDb(0);
    await runMigrations(d);
    expect(d._exec.some((s) => /ALTER TABLE routines ADD COLUMN position INTEGER/i.test(s))).toBe(true);
  });

  test('backfill assigns each existing routine a 0-based rank, restarting per plan', async () => {
    const existingRoutines = [
      { id: 'a', programme_id: 'plan1' },
      { id: 'b', programme_id: 'plan1' },
      { id: 'c', programme_id: 'plan2' },
      { id: 'd', programme_id: null },
    ];
    const d = makeFakeDb(0, { existingRoutines });
    await runMigrations(d);

    const posFor = (id) => {
      const call = d._updates.find(([sql, params]) => /UPDATE routines SET position/.test(sql) && params[1] === id);
      return call?.[1]?.[0];
    };
    expect(posFor('a')).toBe(0);
    expect(posFor('b')).toBe(1);
    expect(posFor('c')).toBe(0); // restarts for the next plan
    expect(posFor('d')).toBe(0); // the null-programme (templates) pool
  });

  test('an install already at the top version runs nothing further (idempotent)', async () => {
    const probe = makeFakeDb(0);
    await runMigrations(probe);
    const total = probe._version;

    const d = makeFakeDb(total);
    await runMigrations(d);
    expect(d._exec.length).toBe(0);
    expect(d._updates.length).toBe(0);
  });
});
