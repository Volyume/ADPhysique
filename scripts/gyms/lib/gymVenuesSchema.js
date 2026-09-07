// GD-26 point 4, pure, no I/O: does the live `gym_venues` CREATE TABLE in
// a migration file's text already declare a given column? seed-sql.mjs
// reads supabase/migrate_162_gym_directory.sql itself and calls this to
// decide, at generation time, whether `verification_status` and
// `needs_review_reason` can be carried straight through to the venues
// chunk, or whether the fallback applies instead (the existing boolean
// `needs_review` column set true, plus a `gym_venue_history` 'flag' row
// carrying the reason) — task instruction: "do not edit the migration".

/**
 * @param {string} migrationSql
 * @returns {string} the column-definition body between
 *   `CREATE TABLE IF NOT EXISTS public.gym_venues (` and its closing `);`,
 *   or '' when no such table is found.
 */
function extractGymVenuesTableBlock(migrationSql) {
  const match = /CREATE TABLE IF NOT EXISTS public\.gym_venues\s*\(([\s\S]*?)\n\);/.exec(migrationSql || '');
  return match ? match[1] : '';
}

/**
 * @param {string} migrationSql
 * @param {string} columnName
 * @returns {boolean} true when the gym_venues table block declares a
 *   column of this exact name (start of a definition line, followed by
 *   whitespace and a type) — not merely mentioned elsewhere in the file
 *   (e.g. in a function body or a comment).
 */
function gymVenuesHasColumn(migrationSql, columnName) {
  const block = extractGymVenuesTableBlock(migrationSql);
  if (!block) return false;
  const re = new RegExp(`(^|\\n)[ \\t]*${columnName}[ \\t]+\\S`);
  return re.test(block);
}

/**
 * @param {string} migrationSql
 * @param {string[]} columnNames
 * @returns {boolean} true only when EVERY named column is present.
 */
function gymVenuesHasAllColumns(migrationSql, columnNames) {
  return columnNames.every((c) => gymVenuesHasColumn(migrationSql, c));
}

module.exports = { extractGymVenuesTableBlock, gymVenuesHasColumn, gymVenuesHasAllColumns };
