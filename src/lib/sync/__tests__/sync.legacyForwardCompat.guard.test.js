/**
 * sync.legacyForwardCompat.guard.test.js — source guards for F5 Phase A's
 * two forward-compat changes in the legacy sync path (src/lib/sync.js).
 *
 * What this suite pins and why (Wave 4 review near-miss: both behaviours
 * shipped with no test locking them):
 *
 * 1. HONEST TIMESTAMPS IN THE BULK CYCLE (SD-3). bulkUploadLocalData
 *    re-uploads HISTORIC local rows; stamping them updated_at=now would
 *    make every bulk cycle look like a fresh edit of every row, which is
 *    exactly what Phase B's last-write-wins timestamp gating cannot
 *    survive (a stale device's bulk run would beat real edits). Every
 *    updated_at inside the bulk function must therefore derive from the
 *    row's own updatedAt/createdAt. The per-save push functions OUTSIDE
 *    the bulk cycle legitimately stamp now — the edit genuinely just
 *    happened — so the pin is scoped to the bulk function's body.
 *
 * 2. TOMBSTONE-AWARE PULLS (C1 mitigation). Phase B introduces soft
 *    deletes (deleted_at); a pull path without .is('deleted_at', null)
 *    would resurrect deleted rows onto this build. The filters are
 *    no-ops today (no tombstones exist) and would therefore never fail a
 *    behavioural test — which is precisely why their presence is pinned
 *    at source level, at scale and at the two structural chokepoints.
 */
import fs from 'fs';
import path from 'path';

const SYNC = fs.readFileSync(path.resolve(__dirname, '..', '..', 'sync.js'), 'utf8');

// Extract a function's body by brace matching from its declaration.
function fnBody(source, decl) {
  const start = source.indexOf(decl);
  if (start === -1) return null;
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

// Per-save push functions where updated_at = "now" is HONEST: the edit
// genuinely just happened when these run. Everything else in sync.js maps
// stored rows (the bulk cycle and its shared helpers), where "now" is the
// SD-3 regression. Adding a name here is a deliberate reviewed act.
const NOW_IS_HONEST_FUNCTIONS = [
  'syncProfile',
  'syncMorningWeight',
  'syncWeeklyCheckin',
  '_pushUserBodyProfile',
  'syncUserPref',
  // Recorded F5 Phase A exclusion, not an endorsement: local prefs carry no
  // updatedAt to derive from, and SD-8 (prefs out of the bulk cycle
  // entirely) is Phase B scope. Remove this entry when Phase B lands.
  '_pushAllUserPrefs',
];

// Name of the function enclosing a character offset (last declaration above).
function enclosingFunction(source, offset) {
  const before = source.slice(0, offset);
  const decls = [...before.matchAll(/(?:export )?(?:async )?function (\w+)/g)];
  return decls.length ? decls[decls.length - 1][1] : null;
}

describe('F5 Phase A: honest timestamps in the legacy push payloads', () => {
  test('updated_at: "now" appears only in the per-save allowlist', () => {
    const offences = [];
    const re = /updated_at:\s*new Date\(\)\.toISOString\(\)/g;
    let m;
    while ((m = re.exec(SYNC)) !== null) {
      const fn = enclosingFunction(SYNC, m.index);
      if (!NOW_IS_HONEST_FUNCTIONS.includes(fn)) {
        offences.push(`${fn}: updated_at stamped "now" outside the per-save allowlist`);
      }
    }
    expect(offences).toEqual([]);
  });

  test('the row-derived mappers exist at scale and read the row, not the clock', () => {
    // updated_at: new Date(<something>) with arguments must derive from the
    // row's own fields (updatedAt/createdAt/loggedAt fallbacks included).
    const lines = SYNC.split('\n').filter((l) => /updated_at:\s*new Date\([^)]+\)/.test(l));
    expect(lines.length).toBeGreaterThanOrEqual(12);
    for (const line of lines) {
      expect(line).toMatch(/\.(updatedAt|createdAt|loggedAt)\b/);
    }
  });
});

describe('F5 Phase A: tombstone-aware legacy pulls', () => {
  test('the deleted_at filter is present at scale', () => {
    const count = (SYNC.match(/\.is\('deleted_at', null\)/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(15);
  });

  test('the fetchByIdsChunked DEFAULT builder filters tombstones', () => {
    // The chunked fetcher is the chokepoint for child-row pulls (sets,
    // routine exercises); its default builder must carry the filter so
    // every caller that does not supply its own query inherits it.
    const chunked = fnBody(SYNC, 'export async function fetchByIdsChunked');
    expect(chunked).not.toBeNull();
    expect(chunked).toMatch(/\.in\(column, slice\)\.is\('deleted_at', null\)/);
  });

  test('the workouts delta pull filters tombstones', () => {
    // The highest-traffic legacy pull: the watermark delta on workouts
    // (from('workouts') ... gte('updated_at', watermark)).
    const at = SYNC.indexOf("gte('updated_at', isoFromMs(wmWorkouts))");
    expect(at).toBeGreaterThan(-1);
    const windowBefore = SYNC.slice(Math.max(0, at - 800), at);
    expect(windowBefore).toMatch(/from\('workouts'\)/);
    expect(windowBefore).toMatch(/\.is\('deleted_at', null\)/);
  });
});
