// VOA (Valuation Office Agency) compiled rating list — PERMANENTLY DISABLED.
//
// GD-16 (2026-09-07): the VOA download page states "An open government
// licence does not apply" and confines use to non-domestic rating purposes
// with a deletion obligation. The 17,370-row extract acquired for research
// was deleted the same day; the raw/voa/ folder no longer exists. No VOA
// field is permitted to enter this pipeline.
//
// This stub exists only so the pipeline's per-source module list stays
// complete and self-documenting. It always yields nothing, regardless of
// whether a voa/ folder is ever present again — do not wire real reads
// into this file without a founder decision reversing GD-16 first.

/**
 * @param {string} rawDir - ignored, deliberately
 * @yields {never}
 */
// eslint-disable-next-line no-unused-vars
export async function* readRecords(rawDir, log = console.log) {
  log('voa: excluded by GD-16 (licence) - never read, regardless of folder contents');
  return;
}
