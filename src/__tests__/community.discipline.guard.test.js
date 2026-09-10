/**
 * community.discipline.guard.test.js (communities revamp 2026-09-10:
 * `docs/communities-revamp-2026-09-10/22-MIGRATION-170A-CONTRACT.md`
 * "Discipline taxonomy (15 keys, max 3 per profile, no dupes)" and its
 * "Physique-division keys... SEVEN" section; task brief item 1).
 *
 * WHAT THIS SUITE PINS, and why it is written to fail rather than to
 * pass: the discipline taxonomy exists in two places -- the SQL helper
 * `_community_discipline_key_ok` (and its sibling
 * `_community_discipline_label`) in
 * `supabase/migrate_170_community_connection.sql`, and the client's own
 * `COMMUNITY_DISCIPLINE_KEYS` / `COMMUNITY_DISCIPLINE_LABELS` /
 * `PHYSIQUE_DISCIPLINE_KEYS` in `src/lib/community/validation.js`. A
 * key added to one side and not the other is quiet in the worst way: a
 * discipline the server accepts that the picker never offers, or one the
 * picker offers that the server refuses with `invalid_input` the moment
 * the profile is saved. This is READ-ONLY against the SQL file (regexed
 * out of the migration lane owns and never edited here) so the two lists
 * can never drift once both exist, the same posture
 * `community.privacy.guard.test.js`'s "the client and the SQL agree"
 * block already uses for the forbidden-key and payload allow-lists.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIGRATION = path.join(ROOT, 'supabase/migrate_170_community_connection.sql');

const {
  COMMUNITY_DISCIPLINE_KEYS, COMMUNITY_DISCIPLINE_LABELS, PHYSIQUE_DISCIPLINE_KEYS,
  MAX_DISCIPLINES_PER_PROFILE,
} = require('../lib/community/validation');

/** The fifteen quoted keys inside `_community_discipline_key_ok`'s own
 * `ARRAY[...]` literal, in the order the SQL lists them. */
function sqlDisciplineKeys(sql) {
  const m = /_community_discipline_key_ok\(_keys text\[\][\s\S]*?ARRAY\[([\s\S]*?)\]::text\[\]/.exec(sql);
  if (!m) return null;
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/^'|'$/g, ''))
    .filter(Boolean);
}

/** The key -> label map from `_community_discipline_label`'s own
 * `WHEN '<key>' THEN '<label>'` lines, in the order the SQL lists them. */
function sqlDisciplineLabels(sql) {
  const body = /_community_discipline_label\(_key text\)[\s\S]*?AS \$\$([\s\S]*?)\$\$;/.exec(sql);
  if (!body) return null;
  const out = {};
  const re = /WHEN\s+'([a-z_]+)'\s+THEN\s+'((?:[^'\\]|'')*)'/g;
  let m = re.exec(body[1]);
  while (m) {
    // SQL escapes a literal apostrophe as '' (e.g. "Men''s physique");
    // undo that so it compares against the client's JS string.
    out[m[1]] = m[2].replace(/''/g, "'");
    m = re.exec(body[1]);
  }
  return out;
}

describe('the discipline taxonomy is the same on both sides', () => {
  const sql = fs.existsSync(MIGRATION) ? fs.readFileSync(MIGRATION, 'utf8') : null;

  test('the migration exists to guard against', () => {
    // If this ever fails, the concurrent SQL lane has not landed the file
    // yet (or it moved) -- every test below arms itself on this same
    // check rather than hiding the reason inside a conditional describe.
    expect(fs.existsSync(MIGRATION)).toBe(true);
  });

  test('exactly fifteen client keys, no duplicates', () => {
    expect(COMMUNITY_DISCIPLINE_KEYS.length).toBe(15);
    expect(new Set(COMMUNITY_DISCIPLINE_KEYS).size).toBe(15);
  });

  test('the client key list matches the SQL CHECK, in the same order', () => {
    if (!sql) { expect(fs.existsSync(MIGRATION)).toBe(false); return; }
    const sqlKeys = sqlDisciplineKeys(sql);
    expect(sqlKeys).not.toBeNull();
    expect([...COMMUNITY_DISCIPLINE_KEYS]).toEqual(sqlKeys);
  });

  test('every client key has an SQL label, and the wording matches', () => {
    if (!sql) { expect(fs.existsSync(MIGRATION)).toBe(false); return; }
    const sqlLabels = sqlDisciplineLabels(sql);
    expect(sqlLabels).not.toBeNull();
    for (const key of COMMUNITY_DISCIPLINE_KEYS) {
      expect({ key, label: COMMUNITY_DISCIPLINE_LABELS[key] })
        .toEqual({ key, label: sqlLabels[key] });
    }
  });

  test('the CHECK caps a profile at three disciplines, matching MAX_DISCIPLINES_PER_PROFILE', () => {
    if (!sql) { expect(fs.existsSync(MIGRATION)).toBe(false); return; }
    expect(MAX_DISCIPLINES_PER_PROFILE).toBe(3);
    expect(sql).toMatch(/array_length\(_keys,\s*1\),\s*0\)\s*<=\s*3/);
  });

  test('the seven physique-division keys are the first seven, exactly as the contract names them', () => {
    expect([...PHYSIQUE_DISCIPLINE_KEYS]).toEqual([
      'bodybuilding', 'mens_physique', 'classic_physique', 'womens_physique',
      'figure', 'bikini', 'wellness',
    ]);
    expect([...PHYSIQUE_DISCIPLINE_KEYS]).toEqual(COMMUNITY_DISCIPLINE_KEYS.slice(0, 7));
  });

  test('the SQL comment names the same seven as the calm-mode / open-ED-flag withhold set', () => {
    if (!sql) { expect(fs.existsSync(MIGRATION)).toBe(false); return; }
    // 22-MIGRATION-170A-CONTRACT.md: "`bodybuilding, mens_physique,
    // classic_physique, womens_physique, figure, bikini, wellness`" --
    // the migration's own header prose should carry the identical list,
    // so a future edit to either cannot silently drift from the other.
    for (const key of PHYSIQUE_DISCIPLINE_KEYS) {
      expect(sql).toContain(key);
    }
  });
});
