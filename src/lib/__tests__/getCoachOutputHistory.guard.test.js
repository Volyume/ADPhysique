/**
 * getCoachOutputHistory.guard.test.js
 *
 * Approved-but-unbuilt fix (docs/ux-world-class-audit-2026-07-09/
 * parked-items-triage.md section 3a, A5 quick-win basket): getCoachOutputHistory
 * (src/lib/database.js) read every coach_outputs row for the user, including
 * soft-deleted ones (deleted_at IS NOT NULL), unlike sibling recency-filtered
 * reads such as getRecentEdPatternFlags. A coach_outputs row can be
 * tombstoned by a cross-device delete flowing through the sync layer, so an
 * unfiltered history read could resurface a deleted week's coaching output.
 *
 * Source-level regex guard (repo convention: raw CRUD is exercised on
 * device, see database.writeGuards.test.js / workoutHistoryLimit.guard.test.js)
 * rather than a live SQLite run.
 */
const fs = require('fs');
const path = require('path');

const DB_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');

describe('getCoachOutputHistory soft-delete filter', () => {
  test('filters out soft-deleted coach_outputs rows, matching sibling reads', () => {
    const start = DB_SOURCE.indexOf('export async function getCoachOutputHistory');
    expect(start).toBeGreaterThan(-1);
    const end = DB_SOURCE.indexOf('\n}', start);
    const body = DB_SOURCE.slice(start, end);
    expect(body).toMatch(/WHERE user_id = \? AND deleted_at IS NULL/);
    expect(body).toMatch(/ORDER BY week_start DESC LIMIT \?/);
  });
});
