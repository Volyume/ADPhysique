/**
 * Schema-drift smoke test — scans src/lib/database.js for SQL fragments that
 * reference table columns by qualified name and confirms each column actually
 * exists in a CREATE TABLE statement (initial schema OR a later migration).
 *
 * Catches the kind of bug we shipped in wave 2 where
 *   SELECT ex.primary_muscle_group AS muscle
 * referenced a column that didn't exist (real column was `primary_muscle`),
 * silently caught with a try/catch and the screen returned blank.
 *
 * Conservative — only checks `<alias>.<column>` patterns where `<alias>` was
 * declared with `FROM <table> <alias>` or `JOIN <table> <alias>` in the same
 * query string. Doesn't try to parse arbitrary SQL.
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../database.js');

function extractCreateTables(source) {
  // Match `CREATE TABLE IF NOT EXISTS foo (...)` and capture name + body.
  const tables = {};
  const re = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)\s*\(([\s\S]*?)\)\s*[;`]/g;
  let m;
  while ((m = re.exec(source))) {
    const name = m[1];
    const body = m[2];
    const cols = new Set();
    for (const line of body.split(/[\n,]/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Skip constraints
      if (/^(PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK|CONSTRAINT)/i.test(trimmed)) continue;
      const colMatch = trimmed.match(/^(\w+)\s+/);
      if (colMatch) cols.add(colMatch[1].toLowerCase());
    }
    tables[name] = cols;
  }
  return tables;
}

function extractAlterAddedColumns(source) {
  const added = []; // [{table, column}]
  const re = /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/gi;
  let m;
  while ((m = re.exec(source))) {
    added.push({ table: m[1], column: m[2].toLowerCase() });
  }
  return added;
}

function buildTableSchema(source) {
  const tables = extractCreateTables(source);
  for (const { table, column } of extractAlterAddedColumns(source)) {
    if (tables[table]) tables[table].add(column);
  }
  return tables;
}

function findAliasReferences(sqlBlock) {
  // sqlBlock is a string inside backticks/quotes — a SQL fragment.
  // Find FROM/JOIN <table> <alias> and then any <alias>.<column> references.
  const aliasToTable = {};
  const aliasRe = /\b(?:FROM|JOIN)\s+(\w+)\s+(\w+)\b/gi;
  let m;
  while ((m = aliasRe.exec(sqlBlock))) {
    const table = m[1].toLowerCase();
    const alias = m[2].toLowerCase();
    // Skip if `alias` is a SQL keyword (ON, AS, etc.)
    if (['on', 'as', 'where', 'group', 'order', 'inner', 'left', 'right', 'outer', 'cross', 'natural'].includes(alias)) continue;
    aliasToTable[alias] = table;
  }

  const refs = []; // [{alias, column}]
  const colRe = /\b([a-z]\w{0,3})\.([a-z_][a-z0-9_]*)\b/gi;
  while ((m = colRe.exec(sqlBlock))) {
    const alias = m[1].toLowerCase();
    const col = m[2].toLowerCase();
    if (aliasToTable[alias]) {
      refs.push({ alias, table: aliasToTable[alias], column: col });
    }
  }
  return refs;
}

describe('schema drift', () => {
  const source = fs.readFileSync(DB_PATH, 'utf-8');
  const tables = buildTableSchema(source);

  test('extracts a reasonable number of CREATE TABLEs', () => {
    expect(Object.keys(tables).length).toBeGreaterThanOrEqual(8);
  });

  test('every aliased column reference resolves to a real column', () => {
    // Extract every backtick block (multi-line SQL inside template literals).
    const blocks = source.match(/`[^`]+`/g) || [];

    const unknown = [];
    for (const block of blocks) {
      // Skip non-SQL blocks (no SQL keywords)
      if (!/\b(SELECT|FROM|JOIN|INSERT|UPDATE|DELETE)\b/i.test(block)) continue;

      const refs = findAliasReferences(block);
      for (const ref of refs) {
        const cols = tables[ref.table];
        if (!cols) continue; // not a known local table (might be a CTE / Postgres-only)
        if (!cols.has(ref.column)) {
          unknown.push(`${ref.table}.${ref.column} (via alias ${ref.alias})`);
        }
      }
    }

    if (unknown.length > 0) {
      // Allowlist for columns that genuinely exist via a different code path
      // (e.g., added via raw migration not visible to the parser, or
      // case-insensitive aliases like AS that we don't track here).
      const ALLOW = new Set([
        // These are columns added in migration strings we couldn't parse,
        // or column aliases ('AS x') that look like dotted references.
        // Add specific entries as the test surfaces them in CI.
      ]);
      const filtered = unknown.filter(u => !ALLOW.has(u));
      if (filtered.length > 0) {
        throw new Error(`Unknown columns in SQL queries:\n  ${filtered.join('\n  ')}`);
      }
    }
  });

  test('every workouts.* read column exists', () => {
    expect(tables.workouts).toBeDefined();
    expect(tables.workouts.has('started_at')).toBe(true);
    expect(tables.workouts.has('user_id')).toBe(true);
    expect(tables.workouts.has('is_completed')).toBe(true);
  });

  test('exercises table uses primary_muscle (not primary_muscle_group)', () => {
    expect(tables.exercises).toBeDefined();
    expect(tables.exercises.has('primary_muscle')).toBe(true);
    expect(tables.exercises.has('primary_muscle_group')).toBe(false);
  });

  test('coaching tables exist (morning_weights, weekly_checkins, coach_outputs)', () => {
    expect(tables.morning_weights).toBeDefined();
    expect(tables.weekly_checkins).toBeDefined();
    expect(tables.coach_outputs).toBeDefined();
  });
});
