/**
 * D74 / D77.8 enforcement (2026-07-13): every SQLite transaction in the app
 * rides database.js's runInTransaction queue. A raw BEGIN anywhere else can
 * interleave with a queued transaction on the single shared connection and
 * die with 'cannot commit - no transaction is active' (the founder-hit
 * VOLYUME-1N class: food/seed.js, then importExternal.js, food/
 * libraryDelta.js, then deleteOrphanedRoutines were all found running one).
 * The 2026-07-12 sweep claimed the class closed and was wrong once; this
 * scan makes the claim mechanical instead of a promise.
 *
 * Bans execAsync('BEGIN'...) across ALL of src (production code, tests
 * excluded). There is deliberately no allowlist: runInTransaction itself
 * uses withTransactionAsync, not a raw BEGIN, so ZERO matches is the
 * correct steady state.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..', '..');

function walk(dir, hits = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === '__mocks__') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, hits);
    else if (entry.name.endsWith('.js')) hits.push(p);
  }
  return hits;
}

describe('no raw SQLite transactions outside the runInTransaction queue (D74)', () => {
  test('no production file issues a raw BEGIN', () => {
    const offenders = [];
    for (const file of walk(SRC)) {
      const text = fs.readFileSync(file, 'utf8');
      if (/execAsync\(\s*['"`]BEGIN/.test(text)) {
        offenders.push(path.relative(SRC, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
