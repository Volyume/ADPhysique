/**
 * importExternal.js
 *
 * Bulk-import a user's training history from another app's CSV
 * export. Supports Hevy and Strong, the two formats that cover the
 * overwhelming majority of switchers. JEFIT and others can be added
 * by writing a new parseXxx() and a detector branch.
 *
 * Pipeline:
 *   parseCSV(text)        → array of row objects (header-mapped)
 *   detectFormat(rows)    → 'hevy' | 'strong' | 'unknown'
 *   parseHevy / parseStrong → { workouts, exerciseNames }
 *   analyzeImport(userId, parsed)
 *                         → { workoutCount, setCount, mapped, unmapped }
 *   runImport(userId, parsed, opts)
 *                         → { workouts, sets, exercisesCreated, skipped }
 *
 * Design choices:
 *   - CSV parser is dependency-free and tolerates Hevy/Strong's
 *     quoted-field + escaped-quote conventions. We don't ship a full
 *     RFC-4180 parser, these two formats don't need one.
 *   - Exercise matching is fuzzy on a normalised name (lowercase,
 *     stripped of parenthetical equipment qualifiers, punctuation
 *     removed). Score ≥ 0.7 → match the existing exercise. Otherwise
 *     a custom exercise is created.
 *   - Duplicate detection: a workout is skipped if a local workout
 *     with the SAME user + SAME started_at (to the second) already
 *     exists. This makes re-imports idempotent.
 *   - All inserts are wrapped in a SQLite transaction so a mid-
 *     import error doesn't leave half a session on disk.
 */

// `db` is lazy-required inside analyzeImport / runImport rather than at
// module top so the pure parser functions (parseCSV, detectFormat,
// parseHevy, parseStrong) are testable without pulling in expo-sqlite.
// The test suite asserts CSV correctness without touching the DB.
async function getDb() {
  // eslint-disable-next-line global-require
  return require('./database').db();
}

// ─── CSV parsing ──────────────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of objects keyed by the header row.
 *
 * Handles:
 *   - Quoted fields containing commas: "Push, Pull"
 *   - Escaped quotes inside quoted fields: "He said ""hi"""
 *   - \r\n and \n line endings
 *   - Trailing newline / blank lines
 *
 * Does NOT handle:
 *   - Quoted newlines mid-field (rare in fitness exports, neither
 *     Hevy nor Strong write multi-line cells)
 *   - Multi-character delimiters
 */
// Cap the parser so a pathologically large CSV (millions of rows)
// can't OOM the device. 100k rows is comfortably above the largest
// realistic gym log (10 yrs × 5 sessions/wk × 30 sets ≈ 80k) so a
// legitimate import is never blocked by this.
const MAX_CSV_ROWS = 100_000;

export function parseCSV(text) {
  const rows = [];
  let cur = [];
  let field = '';
  let inQuote = false;
  let truncated = false;

  function pushField() { cur.push(field); field = ''; }
  function pushRow() {
    if (cur.length || field !== '') {
      pushField();
      rows.push(cur);
      cur = [];
      if (rows.length >= MAX_CSV_ROWS) truncated = true;
    }
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuote = false; }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuote = true;
      } else if (c === ',') {
        pushField();
      } else if (c === '\n') {
        pushRow();
      } else if (c === '\r') {
        // swallow; \r\n handled by the \n branch
      } else {
        field += c;
      }
    }
    // Stop parsing once we've hit the row cap. The remaining bytes
    // get dropped rather than allocated; the partial result is still
    // a valid CSV import for the rows we did read.
    if (truncated) break;
  }
  // Trailing field / row without a final newline
  if (inQuote) {
    // Unterminated quote, treat the rest as the field
    inQuote = false;
  }
  if (field !== '' || cur.length) pushRow();

  if (rows.length < 2) return [];
  const header = rows[0].map(h => String(h || '').trim());
  return rows.slice(1)
    .filter(r => r.some(c => String(c).trim() !== ''))
    .map(r => {
      const obj = {};
      for (let i = 0; i < header.length; i++) obj[header[i]] = r[i] ?? '';
      return obj;
    });
}

// ─── Format detection ────────────────────────────────────────────────────

export function detectFormat(rows) {
  if (!rows?.length) return 'unknown';
  const keys = Object.keys(rows[0]);
  const has = (k) => keys.includes(k);

  // Hevy fingerprint, has 'exercise_title' and 'set_index' (Hevy's
  // unmistakeable column names; neither Strong nor JEFIT uses these).
  if (has('exercise_title') && has('set_index')) return 'hevy';

  // Strong fingerprint, title-case columns "Exercise Name" and
  // "Set Order". Strong is the only app using that exact casing.
  if (has('Exercise Name') && has('Set Order')) return 'strong';

  return 'unknown';
}

// ─── Hevy parser ─────────────────────────────────────────────────────────
// Hevy CSV is one ROW per SET. Workouts are reconstructed by grouping
// on (title, start_time). Columns we read:
//   title, start_time, end_time, description,
//   exercise_title, set_index, set_type, weight_kg, reps, rpe,
//   exercise_notes

export function parseHevy(rows) {
  const byKey = new Map();
  const exerciseNames = new Set();

  for (const r of rows) {
    const title = String(r.title || '').trim() || 'Hevy session';
    const startedAt = parseISOms(r.start_time);
    if (!startedAt) continue;
    const key = `${title}::${startedAt}`;
    const exName = String(r.exercise_title || '').trim();
    if (!exName) continue;

    let w = byKey.get(key);
    if (!w) {
      w = {
        title,
        startedAt,
        endedAt: parseISOms(r.end_time) ?? null,
        description: String(r.description || '').trim() || null,
        sets: [],
        exerciseOrder: [],   // first-seen exercise order
      };
      byKey.set(key, w);
    }

    if (!w.exerciseOrder.includes(exName)) w.exerciseOrder.push(exName);
    exerciseNames.add(exName);

    w.sets.push({
      exerciseName: exName,
      setIndex: parseInt(r.set_index, 10) || 0,
      setType: mapHevySetType(r.set_type),
      weightKg: parseNum(r.weight_kg),
      reps: parseInt(r.reps, 10) || 0,
      rpe: parseNum(r.rpe),
      notes: String(r.exercise_notes || '').trim() || null,
    });
  }

  return {
    workouts: [...byKey.values()].sort((a, b) => a.startedAt - b.startedAt),
    exerciseNames,
  };
}

function mapHevySetType(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'warmup' || v === 'warm-up' || v === 'warm up') return 'warmup';
  if (v === 'dropset' || v === 'drop_set' || v === 'drop-set') return 'dropset';
  if (v === 'failure' || v === 'amrap') return 'amrap';
  return 'straight';
}

// ─── Strong parser ───────────────────────────────────────────────────────
// Strong CSV is also one ROW per SET. Columns we read:
//   Date, Workout Name, Exercise Name, Set Order, Weight, Reps,
//   Distance, Seconds, Notes, Workout Notes, RPE
//
// Date is "YYYY-MM-DD HH:MM:SS" in local time; we treat it as UTC for
// the purposes of sorting (rare edge case where strict local-tz
// fidelity matters; the user's training history is accurate enough).

export function parseStrong(rows) {
  const byKey = new Map();
  const exerciseNames = new Set();

  for (const r of rows) {
    const title = String(r['Workout Name'] || '').trim() || 'Strong session';
    const startedAt = parseStrongDate(r.Date);
    if (!startedAt) continue;
    const key = `${title}::${startedAt}`;
    const exName = String(r['Exercise Name'] || '').trim();
    if (!exName) continue;

    let w = byKey.get(key);
    if (!w) {
      w = {
        title,
        startedAt,
        endedAt: null,
        description: String(r['Workout Notes'] || '').trim() || null,
        sets: [],
        exerciseOrder: [],
      };
      byKey.set(key, w);
    }
    if (!w.exerciseOrder.includes(exName)) w.exerciseOrder.push(exName);
    exerciseNames.add(exName);

    w.sets.push({
      exerciseName: exName,
      setIndex: parseInt(r['Set Order'], 10) || 0,
      setType: 'straight',
      weightKg: parseNum(r.Weight),
      reps: parseInt(r.Reps, 10) || 0,
      rpe: parseNum(r.RPE),
      notes: String(r.Notes || '').trim() || null,
    });
  }

  return {
    workouts: [...byKey.values()].sort((a, b) => a.startedAt - b.startedAt),
    exerciseNames,
  };
}

function parseStrongDate(s) {
  if (!s) return null;
  // Either "YYYY-MM-DD HH:MM:SS" or ISO. Both parse cleanly via Date.
  const ms = Date.parse(String(s).replace(' ', 'T'));
  return Number.isFinite(ms) ? ms : null;
}

// ─── Analysis + exercise matching ────────────────────────────────────────

/**
 * Inspect a parsed import against the user's local exercise library.
 * No writes. Returns the breakdown the UI shows on the preview screen.
 */
export async function analyzeImport(userId, parsed) {
  if (!userId || !parsed) return null;
  const d = await getDb();

  const exRows = await d.getAllAsync('SELECT id, name FROM exercises');
  const existing = exRows.map(r => ({ id: r.id, name: r.name, norm: normaliseName(r.name) }));

  const mapped = new Map();    // import name → existing exercise id
  const unmapped = [];         // import names with no good match

  for (const name of parsed.exerciseNames) {
    const m = bestMatch(name, existing);
    if (m) mapped.set(name, m.id);
    else unmapped.push(name);
  }

  // Duplicate detection: count how many of these workouts already
  // exist locally (same started_at to the second + same user).
  let alreadyImported = 0;
  for (const w of parsed.workouts) {
    const hit = await d.getFirstAsync(
      'SELECT 1 FROM workouts WHERE user_id = ? AND started_at = ? LIMIT 1',
      [userId, w.startedAt],
    );
    if (hit) alreadyImported++;
  }

  const setCount = parsed.workouts.reduce((n, w) => n + w.sets.length, 0);

  return {
    workoutCount: parsed.workouts.length,
    setCount,
    mappedCount: mapped.size,
    unmappedCount: unmapped.length,
    unmappedNames: unmapped.slice(0, 24),  // cap preview list
    alreadyImported,
    _mappedIndex: mapped,                  // internal, passed back to runImport
  };
}

/**
 * Commit the import. Idempotent, calling twice with the same parsed
 * set will only insert each workout once thanks to the started_at
 * duplicate check. Wrapped in a single SQLite transaction so a thrown
 * error in the middle rolls everything back.
 */
export async function runImport(userId, parsed, analysis) {
  if (!userId || !parsed || !analysis) {
    return { workouts: 0, sets: 0, exercisesCreated: 0, skipped: 0 };
  }
  const d = await getDb();

  // Names that didn't match an existing exercise → create as custom.
  const newExerciseIds = new Map();   // name → new id
  for (const name of analysis.unmappedNames || []) {
    const id = await createCustomExerciseRow(d, name);
    newExerciseIds.set(name, id);
  }
  // Names that didn't even fit in the preview list (unmappedCount may
  // be larger than the unmappedNames array, which is capped), we
  // still need to create them. analysis.unmappedNames is the full list
  // when ≤ 24 names; for longer lists we re-derive from parsed and
  // skip ones we already mapped.
  if ((analysis.unmappedCount ?? 0) > newExerciseIds.size) {
    for (const name of parsed.exerciseNames) {
      if (analysis._mappedIndex?.has(name)) continue;
      if (newExerciseIds.has(name)) continue;
      const id = await createCustomExerciseRow(d, name);
      newExerciseIds.set(name, id);
    }
  }

  let workouts = 0;
  let sets = 0;
  let skipped = 0;

  await d.execAsync('BEGIN');
  try {
    for (const w of parsed.workouts) {
      // Duplicate skip, match on user + started_at.
      const hit = await d.getFirstAsync(
        'SELECT id FROM workouts WHERE user_id = ? AND started_at = ? LIMIT 1',
        [userId, w.startedAt],
      );
      if (hit) { skipped++; continue; }

      const wid = uuid();
      const ended = w.endedAt ?? null;
      const duration = ended ? Math.max(0, Math.round((ended - w.startedAt) / 60000)) : null;
      const now = Date.now();

      await d.runAsync(
        `INSERT INTO workouts
          (id, user_id, routine_id, mesocycle_id, started_at, ended_at,
           duration_minutes, notes, is_completed, name, created_at, updated_at)
         VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [
          wid, userId, w.startedAt, ended, duration,
          w.description || null, w.title || null, now, now,
        ],
      );
      workouts++;

      // Stable set numbering within (workout, exercise). Hevy gives
      // set_index but it's zero-indexed and not always present in
      // older exports. Strong uses Set Order which is 1-indexed.
      // Normalise to 1-indexed per-exercise.
      const perExCounter = new Map();
      for (const s of w.sets) {
        const exerciseId = analysis._mappedIndex?.get(s.exerciseName)
          ?? newExerciseIds.get(s.exerciseName);
        if (!exerciseId) { continue; }

        const setNum = (perExCounter.get(exerciseId) ?? 0) + 1;
        perExCounter.set(exerciseId, setNum);

        const sid = uuid();
        // Denormalise the exercise name onto the row, this is what
        // makes cross-device sync recoverable when a future install's
        // canonical exercise IDs differ.
        await d.runAsync(
          `INSERT INTO workout_sets
            (id, user_id, workout_id, exercise_id, exercise_name, set_number, set_type,
             actual_reps, weight, rpe, notes, failed, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          [
            sid, userId, wid, exerciseId, s.exerciseName, setNum, s.setType || 'straight',
            s.reps || 0, s.weightKg ?? null, s.rpe ?? null,
            s.notes || null, now, now,
          ],
        );
        sets++;
      }
    }
    await d.execAsync('COMMIT');
  } catch (e) {
    try { await d.execAsync('ROLLBACK'); } catch (_) {}
    throw e;
  }

  return { workouts, sets, exercisesCreated: newExerciseIds.size, skipped };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function parseISOms(s) {
  if (!s) return null;
  const ms = Date.parse(String(s));
  return Number.isFinite(ms) ? ms : null;
}

function parseNum(s) {
  if (s == null || s === '') return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// Strips parenthetical qualifiers ("(Barbell)", "(Dumbbell)") and
// punctuation, lower-cases everything, collapses whitespace. The
// resulting form is what we compare for fuzzy matching.
function normaliseName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Score: Jaccard-style token overlap on normalised names. Returns 0..1.
function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ta = new Set(a.split(' ').filter(Boolean));
  const tb = new Set(b.split(' ').filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / new Set([...ta, ...tb]).size;
}

// Pick the best existing exercise above a 0.7 threshold. Ties broken
// by preferring the more-specific local name (longer normalised
// form). Returns the matched exercise or null.
function bestMatch(importedName, existing) {
  const norm = normaliseName(importedName);
  if (!norm) return null;
  let best = null;
  let bestScore = 0;
  for (const ex of existing) {
    const s = similarity(norm, ex.norm);
    if (s > bestScore || (s === bestScore && best && ex.norm.length > best.norm.length)) {
      best = ex; bestScore = s;
    }
  }
  return bestScore >= 0.7 ? best : null;
}

// Create a is_custom=1 row for an unmatched name. primary_muscle stays
// null, the user can edit it later in the exercise library.
async function createCustomExerciseRow(d, name) {
  const id = uuid();
  const now = Date.now();
  await d.runAsync(
    `INSERT OR IGNORE INTO exercises
      (id, name, primary_muscle, secondary_muscles, equipment, movement_pattern,
       is_custom, created_at, updated_at, exercise_category, increment_kg)
     VALUES (?, ?, NULL, NULL, NULL, NULL, 1, ?, ?, 'compound', 2.5)`,
    [id, name, now, now],
  );
  return id;
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
