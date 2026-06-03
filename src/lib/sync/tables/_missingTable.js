/**
 * Shared missing-table detector for additive sync tables.
 *
 * A brand-new additive table is absent from a given Supabase project until its
 * cloud migration is applied. PostgREST answers with PGRST205 ("Could not find
 * the table ... in the schema cache") or the underlying 42P01 ("relation ...
 * does not exist"). That is the expected pre-migration state, not a sync
 * failure: there is no cloud target yet, so there is no unsynced data to lose.
 *
 * Handlers for genuinely-additive tables treat this as a benign skip
 * (errors:0) so a not-yet-migrated table cannot trip the push-first sign-out
 * guard, which aborts sign-out on any errored table. The cardio_log incident
 * (one handler fixed, the pattern not) is why this lives in one place now.
 *
 * A genuinely missing COLUMN on an existing table is deliberately NOT matched:
 * the PostgREST message names the column, not the table, so real schema drift
 * still surfaces as an error. Only use this for tables that are legitimately
 * additive-and-possibly-unapplied; a table that should always exist returning
 * 42P01 is a real incident and must not be silently skipped.
 */
export function isMissingTableError(error, tableName) {
  if (!error) return false;
  const code = String(error.code || '');
  // Missing-COLUMN codes are real schema drift, never a benign skip. PGRST204
  // ("Could not find the 'x' column of 'Y' in the schema cache") and 42703
  // ("column ... does not exist") both name a column, and PGRST204's message
  // even carries the table name + "schema cache", so they must be excluded
  // before the message fallback below or a real drift would be skipped.
  if (code === 'PGRST204' || code === '42703') return false;
  // Missing-TABLE codes: the relation is absent. A handler only ever queries
  // its own table, so one of these during that handler is about that table.
  if (code === 'PGRST205' || code === '42P01') return true;
  if (!tableName) return false;
  const msg = String(error.message || error).toLowerCase();
  // Any column-level message names a column; never read it as a missing table.
  if (msg.includes('column')) return false;
  const t = String(tableName).toLowerCase();
  return msg.includes(t)
    && (msg.includes('does not exist') || msg.includes('schema cache'));
}
