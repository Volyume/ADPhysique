/**
 * Local migration durability (adversarial audit 2026-08-26, finding 3).
 *
 * THE DEFECT. Each schema version's statements and its `PRAGMA user_version`
 * bump were separate, unprotected writes. A process death part-way through a
 * version — an OOM kill, a flat battery, a user force-quitting an update that
 * felt stuck — therefore left the schema half-changed with the OLD version
 * still recorded, and the next launch re-ran that whole version against a
 * database it had already partly modified.
 *
 * For a version of plain additive DDL that was survivable: the benign-error
 * skip absorbs "duplicate column name" and "already exists". Two shipped
 * versions are not that shape.
 *
 *   v55 renames progress_photo_meta aside, builds a replacement, copies the
 *   rows across and drops the original. Die between the rename and the create
 *   and the re-run raises "no such table", which is not benign, so every launch
 *   from then on fails identically and the only route back is the COMP-009
 *   snapshot.
 *
 *   v18 rewrites exercise ids across routine_exercises, workout_sets,
 *   exercise_user_notes and exercise_goals before updating exercises itself.
 *   Its own comment says the references "stay valid throughout the
 *   transaction". There was no transaction. Half of that rewrite is logged
 *   training history pointing at ids that do not exist.
 *
 * These tests drive the REAL runMigrations against a REAL SQLite build
 * (node:sqlite) with a fault injected mid-version, because the property under
 * test is what the database is left holding, and only a real engine can answer
 * that. The four semantics the fix leans on are asserted here as executed
 * behaviour rather than quoted from documentation.
 */

const { DatabaseSync } = require('node:sqlite');
const { runMigrations, runInTransaction, CURRENT_SCHEMA_VERSION } = require('../database');

/**
 * expo-sqlite's async surface over node:sqlite, with two test affordances:
 * a fault hook, and on-demand creation of the base tables the earliest
 * migrations ALTER. The fixture builds itself so this file never has to track
 * v1's exact table list; what is under test is atomicity, not schema shape.
 */
function adapt(raw, onStatement = () => {}) {
  const exec = (sql) => {
    try {
      raw.exec(sql);
    } catch (e) {
      const miss = /no such table: (\w+)/.exec(e?.message || '');
      if (!miss) throw e;
      raw.exec(`CREATE TABLE IF NOT EXISTS ${miss[1]} (id TEXT PRIMARY KEY)`);
      raw.exec(sql);
    }
  };
  return {
    execAsync: async (sql) => { onStatement(String(sql)); return exec(String(sql)); },
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => raw.prepare(sql).run(...params),
    // A REAL transaction, unlike the pass-through fakes elsewhere: this file
    // exists to test rollback, so a no-op wrapper would assert nothing.
    withTransactionAsync: async (fn) => {
      exec('BEGIN');
      try {
        await fn();
        exec('COMMIT');
      } catch (e) {
        exec('ROLLBACK');
        throw e;
      }
    },
    isInTransactionSync: () => raw.isTransaction,
  };
}

const version = (raw) => raw.prepare('PRAGMA user_version').get().user_version;
const columns = (raw, table) => raw.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);

function strictAdapt(raw, { beforeExec = () => {}, beforeGetAll = () => {} } = {}) {
  return {
    execAsync: async (sql) => {
      beforeExec(String(sql));
      raw.exec(String(sql));
    },
    getAllAsync: async (sql, params = []) => {
      beforeGetAll(String(sql));
      return raw.prepare(sql).all(...params);
    },
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => raw.prepare(sql).run(...params),
    withTransactionAsync: async (fn) => {
      raw.exec('BEGIN');
      try {
        await fn();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
    isInTransactionSync: () => raw.isTransaction,
  };
}

/** v1 is frozen by the append-only rule, so these two landmarks are stable. */
const V1_EARLY_COLUMN = 'starting_weight';               // first op of v1
const V1_LATER_STATEMENT = /CREATE TABLE IF NOT EXISTS programmes/;

/**
 * Runs the real runner until `stopAt` says to abort, and returns the raw
 * database so the caller can inspect exactly what survived.
 */
async function runUntil(stopAt) {
  const raw = new DatabaseSync(':memory:');
  raw.exec('CREATE TABLE routine_exercises (id TEXT PRIMARY KEY)');
  const err = new Error('SYNTHETIC: process died mid-migration');
  let thrown = null;
  const d = adapt(raw, (sql) => { if (stopAt(sql)) throw err; });
  try {
    await runMigrations(d);
  } catch (e) {
    thrown = e;
  }
  return { raw, thrown, synthetic: err };
}

describe('a version that fails part-way leaves nothing behind', () => {
  let raw;
  let thrown;
  let synthetic;

  beforeAll(async () => {
    // Fail on a statement that sits AFTER several successful ones in the same
    // version. Before the fix, those earlier ALTERs stayed applied.
    ({ raw, thrown, synthetic } = await runUntil((sql) => V1_LATER_STATEMENT.test(sql)));
  });

  test('the failure is surfaced, not swallowed', () => {
    expect(thrown).toBe(synthetic);
  });

  test('the recorded version never advanced', () => {
    expect(version(raw)).toBe(0);
  });

  test('a column added earlier in the SAME version is gone', () => {
    // The whole finding in one assertion: partial application is what made a
    // re-run meet a database it had already changed.
    expect(columns(raw, 'routine_exercises')).not.toContain(V1_EARLY_COLUMN);
  });

  test('no transaction is left open, so the connection is still usable', () => {
    // A dangling BEGIN would hold the write lock and fail every later write
    // with "cannot start a transaction within a transaction".
    expect(() => raw.exec('BEGIN IMMEDIATE; CREATE TABLE probe(x); COMMIT;')).not.toThrow();
    expect(raw.prepare("SELECT name FROM sqlite_master WHERE name='probe'").get()).toBeTruthy();
  });
});

describe('a version that succeeds is committed before the next one starts', () => {
  let raw;

  beforeAll(async () => {
    // Abort at the start of the SECOND version, identified by the statement
    // that follows v1's commit rather than by an index, so appending
    // migrations cannot age this test out.
    let committed = false;
    ({ raw } = await runUntil((sql) => {
      if (/PRAGMA user_version = 1$/.test(sql)) { committed = true; return false; }
      return committed && !/^(BEGIN|COMMIT|ROLLBACK)/.test(sql);
    }));
  });

  test('the first version is durable on its own', () => {
    expect(version(raw)).toBe(1);
    expect(columns(raw, 'routine_exercises')).toContain(V1_EARLY_COLUMN);
  });

  test('progress is per version, so a retry resumes rather than restarting', () => {
    // v1 committed; the failure in v2 costs v2 only.
    expect(raw.prepare("SELECT name FROM sqlite_master WHERE name='programmes'").get()).toBeTruthy();
  });
});

describe('the benign-error skip still behaves as it did', () => {
  test('re-running an already-applied version commits rather than aborting', async () => {
    // Every ALTER in v1 now raises "duplicate column name". If those errors
    // poisoned the transaction the version could never complete again, which
    // would brick the recovery path this fix exists to protect.
    const raw = new DatabaseSync(':memory:');
    raw.exec('CREATE TABLE routine_exercises (id TEXT PRIMARY KEY)');
    const stopAfterV1 = () => {
      let committed = false;
      return (sql) => {
        if (/PRAGMA user_version = 1$/.test(sql)) { committed = true; return false; }
        return committed && !/^(BEGIN|COMMIT|ROLLBACK)/.test(sql);
      };
    };
    const first = adapt(raw, ((f) => (sql) => { if (f(sql)) throw new Error('stop'); })(stopAfterV1()));
    await expect(runMigrations(first)).rejects.toThrow('stop');
    expect(version(raw)).toBe(1);

    // Wind the version back, exactly as an interrupted upgrade would leave it,
    // and run v1 again over a database that already has all of it.
    raw.exec('PRAGMA user_version = 0');
    const second = adapt(raw, ((f) => (sql) => { if (f(sql)) throw new Error('stop'); })(stopAfterV1()));
    await expect(runMigrations(second)).rejects.toThrow('stop');
    expect(version(raw)).toBe(1);
    expect(columns(raw, 'routine_exercises')).toContain(V1_EARLY_COLUMN);
  });
});

describe('current function migrations fail closed under real storage faults', () => {
  test('an unreadable user_version aborts before a transaction or write starts', async () => {
    const d = {
      getFirstAsync: jest.fn(async () => { throw new Error('disk I/O error reading header'); }),
      withTransactionAsync: jest.fn(),
      execAsync: jest.fn(),
    };
    await expect(runMigrations(d)).rejects.toThrow('disk I/O error reading header');
    expect(d.withTransactionAsync).not.toHaveBeenCalled();
    expect(d.execAsync).not.toHaveBeenCalled();
  });

  // The offsets below (-8, -5) are counts back from CURRENT_SCHEMA_VERSION to
  // specific named migrations (load_semantics, swap-cause/effective-choice),
  // so they must move whenever a migration lands after those targets. The
  // exercise library expansion (docs/exercise-library-expansion-2026-09-05/
  // 05-DECISIONS.md EL-9, EL-14/EL-19) appended two more versions after
  // adaptation_mode - routine_exercises.group_kind/round_rest_seconds +
  // workout_sets.evidence_class, then exercises.aliases/load_character -
  // which pushed CURRENT_SCHEMA_VERSION up by 2 without moving the targets
  // these offsets were written to hit. Re-anchored by +2 (-6->-8, -3->-5) so
  // they still land on the same migrations rather than drifting two versions
  // late into ones these fixtures never provisioned tables for.
  test('load-semantics disk-full rolls back the earlier column and version marker', async () => {
    const raw = new DatabaseSync(':memory:');
    raw.exec(`CREATE TABLE exercises (
      id TEXT PRIMARY KEY, name TEXT, equipment TEXT, exercise_type TEXT,
      is_custom INTEGER DEFAULT 0
    )`);
    raw.exec('CREATE TABLE custom_exercises (id TEXT PRIMARY KEY)');
    raw.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION - 8}`);
    const d = strictAdapt(raw, {
      beforeExec(sql) {
        if (/ALTER TABLE custom_exercises ADD COLUMN load_semantics/i.test(sql)) {
          throw new Error('database or disk is full');
        }
      },
    });

    await expect(runMigrations(d)).rejects.toThrow('database or disk is full');
    expect(version(raw)).toBe(CURRENT_SCHEMA_VERSION - 8);
    expect(columns(raw, 'exercises')).not.toContain('load_semantics');
    expect(columns(raw, 'custom_exercises')).not.toContain('load_semantics');
  });

  test('a failed schema readback rolls back the DDL instead of recording success', async () => {
    const raw = new DatabaseSync(':memory:');
    raw.exec(`CREATE TABLE exercises (
      id TEXT PRIMARY KEY, name TEXT, equipment TEXT, exercise_type TEXT,
      is_custom INTEGER DEFAULT 0
    )`);
    raw.exec('CREATE TABLE custom_exercises (id TEXT PRIMARY KEY)');
    raw.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION - 8}`);
    let customReads = 0;
    const d = strictAdapt(raw, {
      beforeGetAll(sql) {
        if (/PRAGMA table_info\(custom_exercises\)/i.test(sql) && ++customReads === 2) {
          throw new Error('disk I/O error during schema readback');
        }
      },
    });

    await expect(runMigrations(d)).rejects.toThrow('schema readback');
    expect(version(raw)).toBe(CURRENT_SCHEMA_VERSION - 8);
    expect(columns(raw, 'exercises')).not.toContain('load_semantics');
    expect(columns(raw, 'custom_exercises')).not.toContain('load_semantics');
  });

  test('a later helper failure rolls back earlier helper DDL in the same version', async () => {
    const raw = new DatabaseSync(':memory:');
    raw.exec('CREATE TABLE exercise_swaps (id TEXT PRIMARY KEY)');
    raw.exec('CREATE TABLE capability_constraints (id TEXT PRIMARY KEY)');
    raw.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION - 5}`);
    const d = strictAdapt(raw, {
      beforeExec(sql) {
        if (/ALTER TABLE capability_constraints ADD COLUMN effective_choice/i.test(sql)) {
          throw new Error('synthetic I/O failure on second ALTER');
        }
      },
    });

    await expect(runMigrations(d)).rejects.toThrow('second ALTER');
    expect(version(raw)).toBe(CURRENT_SCHEMA_VERSION - 5);
    expect(columns(raw, 'exercise_swaps')).not.toContain('cause');
    expect(columns(raw, 'capability_constraints')).not.toContain('effective_choice');
  });

  test('an exact already-present schema rerun advances without message-based swallowing', async () => {
    const raw = new DatabaseSync(':memory:');
    raw.exec('CREATE TABLE exercise_swaps (id TEXT PRIMARY KEY, cause TEXT)');
    raw.exec('CREATE TABLE capability_constraints (id TEXT PRIMARY KEY, effective_choice TEXT)');
    raw.exec(`CREATE TABLE exercises (
      id TEXT PRIMARY KEY, name TEXT, equipment TEXT, movement_pattern TEXT,
      primary_muscle TEXT, compound_isolation TEXT, is_custom INTEGER DEFAULT 0
    )`);
    // EL-9/EL-14/EL-19: the window now also crosses the two exercise-library
    // expansion versions, so their target tables must exist for the plain
    // ALTER statements to find.
    raw.exec('CREATE TABLE routine_exercises (id TEXT PRIMARY KEY)');
    raw.exec('CREATE TABLE workout_sets (id TEXT PRIMARY KEY)');
    raw.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION - 5}`);

    await expect(runMigrations(strictAdapt(raw))).resolves.not.toThrow();
    expect(version(raw)).toBe(CURRENT_SCHEMA_VERSION);
    expect(columns(raw, 'exercise_swaps')).toContain('cause');
    expect(columns(raw, 'capability_constraints')).toEqual(expect.arrayContaining([
      'effective_choice', 'adaptation_mode',
    ]));
    expect(columns(raw, 'exercises')).toEqual(expect.arrayContaining([
      'weight_bearing_hands', 'aliases', 'load_character',
    ]));
    expect(columns(raw, 'routine_exercises')).toEqual(expect.arrayContaining([
      'group_kind', 'round_rest_seconds',
    ]));
    expect(columns(raw, 'workout_sets')).toContain('evidence_class');
  });
});

describe('the SQLite semantics the fix depends on, executed rather than assumed', () => {
  test('PRAGMA user_version is transactional', () => {
    // If it were not, the bump would survive a rolled-back version and the
    // schema and its recorded version would disagree permanently.
    const raw = new DatabaseSync(':memory:');
    raw.exec('BEGIN');
    raw.exec('PRAGMA user_version = 7');
    expect(version(raw)).toBe(7);
    raw.exec('ROLLBACK');
    expect(version(raw)).toBe(0);
  });

  test('DDL is transactional', () => {
    const raw = new DatabaseSync(':memory:');
    raw.exec('BEGIN');
    raw.exec('CREATE TABLE v (x)');
    raw.exec('ROLLBACK');
    expect(raw.prepare("SELECT name FROM sqlite_master WHERE name='v'").get()).toBeUndefined();
  });

  test('a duplicate column does not abort the surrounding transaction', () => {
    const raw = new DatabaseSync(':memory:');
    raw.exec('CREATE TABLE t (a INTEGER)');
    raw.exec('BEGIN');
    raw.exec('ALTER TABLE t ADD COLUMN b INTEGER');
    expect(() => raw.exec('ALTER TABLE t ADD COLUMN b INTEGER')).toThrow(/duplicate column/);
    raw.exec('INSERT INTO t(a, b) VALUES (1, 2)');
    raw.exec('COMMIT');
    expect(raw.prepare('SELECT count(*) c FROM t').get().c).toBe(1);
  });

  test('an already-existing table does not abort it either', () => {
    const raw = new DatabaseSync(':memory:');
    raw.exec('CREATE TABLE t (a INTEGER)');
    raw.exec('BEGIN');
    expect(() => raw.exec('CREATE TABLE t (a INTEGER)')).toThrow(/already exists/);
    raw.exec('CREATE TABLE u (x INTEGER)');
    raw.exec('COMMIT');
    expect(raw.prepare("SELECT name FROM sqlite_master WHERE name='u'").get()).toBeTruthy();
  });
});

describe('the runner keeps the version bump inside the transaction', () => {
  const fs = require('fs');
  const path = require('path');
  const DB = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');
  const body = DB.slice(DB.indexOf('export async function runMigrations'));
  const code = body.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  test('the version rides the handle transaction, not a raw BEGIN (D74)', () => {
    expect(code).toMatch(/await d\.withTransactionAsync\(async \(\) => \{/);
    expect(code).not.toMatch(/execAsync\(\s*['"`]BEGIN/);
  });

  test('NOT runInTransaction: that would deadlock the v22 nested call', () => {
    // runInTransaction sets _txQueueActive, which sends the inner call down
    // the queued path to await the very transaction it is running inside.
    const wrapper = code.slice(code.indexOf('for (let v = current'));
    expect(wrapper.slice(0, wrapper.indexOf('withTransactionAsync'))).not.toMatch(/runInTransaction\(/);
  });

  test('the bump is the last statement inside the transaction', () => {
    const open = code.indexOf('withTransactionAsync');
    const bump = code.indexOf('PRAGMA user_version = ${v + 1}', open);
    const close = code.indexOf('});', bump);
    expect(bump).toBeGreaterThan(open);
    expect(close).toBeGreaterThan(bump);
    // Nothing between the bump and the close but whitespace and the brace.
    expect(code.slice(bump, close)).toMatch(/^PRAGMA user_version = \$\{v \+ 1\}`\);\s*$/);
  });

  test('the real cause is logged before the rollback can mask it', () => {
    const bump = code.indexOf('PRAGMA user_version = ${v + 1}');
    const log = code.indexOf("logWarn('database.migration'");
    expect(log).toBeGreaterThan(-1);
    expect(log).toBeLessThan(bump); // inside the transaction, at the throw site
  });
});

describe('a function migration may still use the transaction queue', () => {
  // v22 (mesocycle-week re-id) calls runInTransaction from inside a migration.
  // That is now a nested call, and getting the nesting wrong deadlocks the
  // FIRST LAUNCH AFTER AN UPDATE, which is the worst place for one. Both tests
  // race against a timeout so a hang fails loudly instead of stalling Jest.
  const withTimeout = (promise, ms, label) => Promise.race([
    promise.then(() => 'completed'),
    new Promise((resolve) => setTimeout(() => resolve(`TIMED OUT: ${label}`), ms)),
  ]);

  test('nested inside the handle transaction, it inline-joins and completes', async () => {
    const raw = new DatabaseSync(':memory:');
    raw.exec('CREATE TABLE t (a INTEGER)');
    const d = adapt(raw);
    let ran = false;
    const outcome = await withTimeout(
      d.withTransactionAsync(async () => {
        await runInTransaction(d, async () => {
          await d.runAsync('INSERT INTO t(a) VALUES (?)', [1]);
          ran = true;
        });
      }),
      2000, 'nested runInTransaction',
    );
    expect(outcome).toBe('completed');
    expect(ran).toBe(true);
    expect(raw.prepare('SELECT count(*) c FROM t').get().c).toBe(1);
  });

  test('the rejected alternative really does deadlock, which is why it was rejected', async () => {
    // Wrapping each version in runInTransaction sets _txQueueActive, so the
    // inner call misses the inline-join and queues behind _txTail — the
    // promise for the transaction it is running inside. Stated as an executed
    // fact rather than a claim in a comment.
    //
    // A fresh module registry, because the hung promise poisons _txTail for
    // the life of the module instance.
    let outcome;
    await jest.isolateModulesAsync(async () => {
      // eslint-disable-next-line global-require
      const fresh = require('../database');
      const raw = new DatabaseSync(':memory:');
      raw.exec('CREATE TABLE t (a INTEGER)');
      const d = adapt(raw);
      outcome = await withTimeout(
        fresh.runInTransaction(d, async () => {
          await fresh.runInTransaction(d, async () => {
            await d.runAsync('INSERT INTO t(a) VALUES (?)', [1]);
          });
        }),
        400, 'runInTransaction wrapping runInTransaction',
      );
    });
    expect(outcome).toMatch(/^TIMED OUT/);
  });
});
