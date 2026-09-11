/**
 * migrate_170_community_connection.sql (Communities revamp, part A) keeps the
 * house migration shape and the RPC-only security posture (SD-14, exactly as
 * 160-165), and keeps the tightenings the hostile review of 2026-09-10 added.
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL rather than to
 * pass: this file is WRITTEN, NOT APPLIED, so nothing but source can check it
 * until the founder's "run against production" lands. It pins the mandatory
 * header; re-runnability (ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT
 * EXISTS, CREATE OR REPLACE throughout, the two signature changes dropping
 * whatever overload is installed by pg_proc introspection first); that every
 * function is SECURITY DEFINER on a pinned search_path; that EXECUTE reaches
 * `authenticated` for the six public entry points and NOBODY for any
 * `_community_*` helper, and `anon` for nothing; migrate_167's volatility
 * lesson (every function that calls `_community_rate_check` is VOLATILE, and
 * the two STABLE helpers really are read-only); migrate_169's `u.x` alias
 * lesson; the fifteen-key discipline taxonomy and its British English labels
 * (20-BLUEPRINT.md section 12, Q1) exactly; and - the reason this suite
 * exists at all - the minor, consent, block and visibility predicates, each
 * counted per function body so that DELETING one fails a case rather than
 * quietly shipping.
 *
 * PART B (phase 3: ambient sharing, groups, Together, Respect, the daily
 * digest) is additive at the end of the same file, same "run against
 * production" gate. It pins: the two new tables (community_post_groups,
 * community_notify_daily) have RLS on and no grants; delete_user_data now
 * DOES name both (the "no new table" invariant above was true only of
 * Part A); community_respect_all excludes blocked pairs (both directions)
 * and muted people by the same regex-counted predicates the rest of this
 * suite already pins, is VOLATILE and rate-railed; every reader of post
 * visibility this part touches carries the new 'groups' branch; and the
 * connect-reasons list moves same_programme -> same_discipline in place.
 *
 * Contract for the client lanes:
 * docs/communities-revamp-2026-09-10/22-MIGRATION-170A-CONTRACT.md.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const MIGRATION = path.join(ROOT, 'supabase', 'migrate_170_community_connection.sql');
const SQL = fs.readFileSync(MIGRATION, 'utf8');

const CODE_LINES = SQL.split('\n').filter((l) => !l.trim().startsWith('--'));
const CODE = CODE_LINES.join('\n');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Part 1'));
// The three acceptance DO blocks ONLY, concatenated - not a blind slice from
// Part A's marker to end of file. Part B added real function/table code
// (including delete_user_data's own DELETE/UPDATE statements) between Part
// A2's acceptance block and Part B's own, so an unbounded slice would sweep
// genuine DML into what this suite treats as "the read-only acceptance
// text" and fail the read-only check below for reasons that have nothing to
// do with the acceptance blocks themselves.
const ACCEPTANCE = [
  SQL.slice(SQL.indexOf('-- ─── Acceptance check'), SQL.indexOf('-- ─── PART A2')),
  SQL.slice(SQL.indexOf('-- ─── Part A2 acceptance check'), SQL.indexOf('-- ─── PART B: ambient sharing')),
  SQL.slice(SQL.indexOf('-- ─── Part B acceptance check')),
].join('\n');

/** Every function this file declares, mapped to its comment-stripped body. */
function functionBodies() {
  const out = {};
  const re = /CREATE OR REPLACE FUNCTION\s+public\.([a-z_0-9]+)\s*\(/g;
  const marks = [];
  let m;
  while ((m = re.exec(CODE)) !== null) marks.push([m.index, m[1]]);
  marks.forEach(([start, name], i) => {
    const end = i + 1 < marks.length ? marks[i + 1][0] : CODE.length;
    out[name] = CODE.slice(start, end);
  });
  return out;
}

/** The declaration preamble only (everything before the body delimiter). */
function functionHeaders() {
  const out = {};
  for (const [name, body] of Object.entries(functionBodies())) {
    const at = body.search(/\nAS \$/);
    out[name] = at === -1 ? body : body.slice(0, at);
  }
  return out;
}

const BODIES = functionBodies();
const HEADERS = functionHeaders();
const DECLARED = Object.keys(BODIES);

// The current/effective signature for every public RPC this file declares,
// keyed by name (so a function re-issued more than once - community_
// upsert_profile and community_group_get, both re-issued again in Part B -
// appears once here, at its LATEST signature; functionBodies()/
// functionHeaders() below already resolve to each name's LAST occurrence in
// the file for the same reason CREATE OR REPLACE itself resolves that way).
// A helper must never appear here. community_dimension_recent and
// community_group_get were part A2 additions; community_create_post,
// community_post_set_note, community_get_post, community_feed,
// community_group_feed, community_get_profile and community_respect_all are
// part B (the first five pre-existed migrate_170 and are re-issued here for
// the 'groups' visibility branch; community_upsert_profile also gains
// _remove_shared, a real signature change).
const PUBLIC_RPCS = {
  community_upsert_profile: 'community_upsert_profile(jsonb, boolean)',
  community_dimension: 'community_dimension(text, text, text, int)',
  community_dimensions_me: 'community_dimensions_me(text)',
  community_board: 'community_board(text, text, text, text, integer, text)',
  community_hub_summary: 'community_hub_summary(text)',
  community_find_people: 'community_find_people(text, text, int, jsonb, text)',
  community_dimension_recent: 'community_dimension_recent(text, text, text, int)',
  community_group_get: 'community_group_get(uuid)',
  community_create_post: 'community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[])',
  community_post_set_note: 'community_post_set_note(uuid, text)',
  community_get_post: 'community_get_post(uuid)',
  community_feed: 'community_feed(text, int)',
  community_group_feed: 'community_group_feed(uuid, text, int)',
  community_get_profile: 'community_get_profile(text, uuid)',
  community_respect_all: 'community_respect_all(text, text, text)',
};
const HELPERS = {
  _community_discipline_key_ok: '_community_discipline_key_ok(text[])',
  _community_discipline_label: '_community_discipline_label(text)',
  _community_profile_card: '_community_profile_card(uuid, uuid)',
  _community_cohort_stats: '_community_cohort_stats(uuid, text, text, text)',
  _community_can_view_post: '_community_can_view_post(uuid, uuid)',
  _community_connect_reasons_list: '_community_connect_reasons_list()',
};

// delete_user_data is neither a community_* RPC nor a _community_* helper -
// it is the general account-erasure entry point that happens to touch
// community tables. Part A left it untouched (no new table); Part B
// re-issues it (two new tables). Tracked separately from PUBLIC_RPCS/
// HELPERS rather than forced into either bucket, and given its own REVOKE/
// GRANT + "every declared function" exemption below.
const DELETE_USER_DATA_SIG = 'delete_user_data()';

// Every (name, signature) EXECUTE grant that actually appears in the file,
// in file order, INCLUDING a name granted more than once: community_
// upsert_profile's Part A 1-arg grant line is still textually present even
// though that overload was DROPped before Part B's 2-arg CREATE OR REPLACE
// (so it no longer resolves to anything installable - the text is dead,
// not the privilege); community_group_get is granted again in Part B on
// its UNCHANGED uuid signature, the same "re-state REVOKE/GRANT after every
// CREATE OR REPLACE" pattern Part A2 already set for that exact function.
// This is the file's actual grant-line count; PUBLIC_RPCS above is a
// per-NAME map and can no longer stand in for it once a name is granted
// twice.
const GRANT_SIGS = [
  'community_upsert_profile(jsonb)',
  'community_dimension(text, text, text, int)',
  'community_dimensions_me(text)',
  'community_board(text, text, text, text, integer, text)',
  'community_hub_summary(text)',
  'community_find_people(text, text, int, jsonb, text)',
  'community_dimension_recent(text, text, text, int)',
  'community_group_get(uuid)',
  'community_upsert_profile(jsonb, boolean)',
  'community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[])',
  'community_post_set_note(uuid, text)',
  'community_get_post(uuid)',
  'community_feed(text, int)',
  'community_group_feed(uuid, text, int)',
  'community_get_profile(text, uuid)',
  'community_group_get(uuid)',
  'community_respect_all(text, text, text)',
  DELETE_USER_DATA_SIG,
];

// 20-BLUEPRINT.md section 12 (Q1, ruled): fifteen keys, "Getting back into
// training" out, "Women's physique" in, no adaptive/para tag.
const TAXONOMY = [
  ['bodybuilding', 'Bodybuilding'],
  ['mens_physique', "Men''s physique"],
  ['classic_physique', 'Classic physique'],
  ['womens_physique', "Women''s physique"],
  ['figure', 'Figure'],
  ['bikini', 'Bikini'],
  ['wellness', 'Wellness'],
  ['powerlifting', 'Powerlifting'],
  ['olympic_weightlifting', 'Olympic weightlifting'],
  ['strongman', 'Strongman and strongwoman'],
  ['crossfit_functional', 'CrossFit and functional fitness'],
  ['calisthenics', 'Calisthenics'],
  ['hybrid', 'Hybrid (lifting and endurance)'],
  ['sport_sc', 'Sport strength and conditioning'],
  ['general_strength', 'General strength and fitness'],
];

describe('the mandatory header is present and honest', () => {
  test.each([
    ['Purpose', /^-- Purpose:/m],
    ['Applied locally', /^-- Applied locally:/m],
    ['Applied remotely', /^-- Applied remotely:/m],
    ['Safe to re-run', /^-- Safe to re-run:/m],
    ['Rollback', /^-- Rollback:/m],
    ['GDPR note', /^-- GDPR note:/m],
  ])('the header states %s', (_label, re) => {
    expect(HEADER).toMatch(re);
  });

  test('it names its authority documents', () => {
    expect(HEADER).toContain('docs/communities-revamp-2026-09-10/');
    expect(HEADER).toContain('20-BLUEPRINT.md');
    expect(HEADER).toContain('21-PHASE1-SPEC.md');
  });

  test('Applied remotely still says NO, awaiting the founder phrase', () => {
    expect(HEADER).toMatch(/Applied remotely:\s+NO/);
    expect(HEADER).toContain('run against production');
  });

  test('Applied locally says N/A: Community has no local SQLite table', () => {
    expect(HEADER).toMatch(/Applied locally:\s+N\/A/);
  });

  test.each(['160', '161', '162', '163', '164', '165', '167', '169'])(
    'it records the dependency on migrate_%s', (n) => {
      expect(HEADER).toContain(n);
    },
  );

  test('the GDPR note claims no new consent type (Part A) and states Part B honestly', () => {
    const gdpr = HEADER.slice(HEADER.indexOf('-- GDPR note:'));
    expect(gdpr).toContain('community_visibility');
    expect(gdpr).toContain('not a');
    expect(HEADER).toContain('delete_user_data');
    // Part A truly added no table, so nothing there needed delete_user_data
    // touched; Part B DOES add two, so the note must say so honestly rather
    // than repeat Part A's "no new table" claim as if it still covered the
    // whole file.
    expect(gdpr).toContain('PART B');
    expect(gdpr).toContain('community_post_groups');
    expect(gdpr).toContain('community_notify_daily');
  });

  test('British English, no em dash anywhere in the file', () => {
    expect(SQL).not.toContain('—');
  });
});

describe('every statement is re-runnable', () => {
  test('added columns use ADD COLUMN IF NOT EXISTS', () => {
    const adds = CODE_LINES.filter((l) => /ADD COLUMN/i.test(l));
    expect(adds.length).toBeGreaterThan(0);
    for (const line of adds) expect(line).toMatch(/ADD COLUMN IF NOT EXISTS/i);
  });

  test('every index uses CREATE INDEX IF NOT EXISTS', () => {
    const idx = CODE_LINES.filter((l) => /CREATE INDEX/i.test(l));
    expect(idx.length).toBeGreaterThanOrEqual(2);
    for (const line of idx) expect(line).toMatch(/CREATE INDEX IF NOT EXISTS/i);
  });

  test('the discipline_keys CHECK is added inside a duplicate_object-tolerant block', () => {
    expect(CODE).toContain('ADD CONSTRAINT community_profiles_discipline_keys_check');
    expect(CODE).toContain('EXCEPTION WHEN duplicate_object THEN NULL; END $$;');
  });

  test('every function is CREATE OR REPLACE, never a bare CREATE FUNCTION', () => {
    expect(CODE).not.toMatch(/^CREATE FUNCTION/m);
    expect(DECLARED.length).toBeGreaterThanOrEqual(10);
  });

  test.each(['community_dimensions_me', 'community_find_people'])(
    '%s (parameter list changed) drops whatever overload is installed first',
    (name) => {
      expect(CODE).toContain(`WHERE p.proname = '${name}' AND n.nspname = 'public'`);
      expect(CODE).toContain('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE');
      expect(CODE).toContain('pg_get_function_identity_arguments(p.oid)');
      // The drop must come BEFORE the re-creation, or the new definition dies.
      expect(CODE.indexOf(`WHERE p.proname = '${name}'`))
        .toBeLessThan(CODE.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`));
    },
  );

  test('nothing destructive touches an existing table (Part A/A2, before Part B introduces its own two tables)', () => {
    // CODE strips comment-only lines, so the Part B comment header itself is
    // gone from it; anchor on Part B's first real statement instead.
    const prePartB = CODE.slice(0, CODE.indexOf('ADD COLUMN IF NOT EXISTS share_sessions'));
    expect(prePartB.length).toBeGreaterThan(0);
    expect(prePartB).not.toMatch(/DROP TABLE/i);
    expect(prePartB).not.toMatch(/DROP COLUMN/i);
    expect(prePartB).not.toMatch(/\bTRUNCATE\b/i);
    expect(prePartB).not.toMatch(/CREATE TABLE/i);
    expect(prePartB).not.toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(prePartB).not.toMatch(/CREATE POLICY/i);
  });

  test('nothing anywhere in the whole file (Part B included) is destructive, drops a column, or creates a policy', () => {
    // Part B legitimately adds two CREATE TABLE / ENABLE ROW LEVEL SECURITY
    // statements (community_post_groups, community_notify_daily - its own
    // dedicated describe block asserts there are exactly those two and
    // nothing else); DROP TABLE, DROP COLUMN, TRUNCATE and CREATE POLICY
    // stay forbidden everywhere, including Part B.
    expect(CODE).not.toMatch(/DROP TABLE/i);
    expect(CODE).not.toMatch(/DROP COLUMN/i);
    expect(CODE).not.toMatch(/\bTRUNCATE\b/i);
    expect(CODE).not.toMatch(/CREATE POLICY/i);
    expect((CODE.match(/CREATE TABLE IF NOT EXISTS/g) || [])).toHaveLength(2);
    expect((CODE.match(/ENABLE ROW LEVEL SECURITY/g) || [])).toHaveLength(2);
  });

  test('no table is granted to anyone: the tables stay RPC-only (SD-14)', () => {
    const grants = CODE_LINES.filter((l) => /^\s*GRANT\b/i.test(l));
    expect(grants.length).toBeGreaterThan(0);
    for (const line of grants) expect(line).toMatch(/GRANT EXECUTE ON FUNCTION/i);
  });

  test('it ends with a read-only acceptance check', () => {
    expect(ACCEPTANCE).toContain('information_schema.columns');
    expect(ACCEPTANCE).toContain('prosecdef');
    expect(ACCEPTANCE).toContain('provolatile');
    const acceptanceCode = ACCEPTANCE.split('\n')
      .filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(acceptanceCode).not.toMatch(/^\s*(INSERT|UPDATE|DELETE|ALTER|DROP)\s/im);
  });
});

describe('every function is a pinned SECURITY DEFINER', () => {
  test.each(Object.keys(HEADERS))('%s is SECURITY DEFINER', (name) => {
    expect(HEADERS[name]).toMatch(/SECURITY DEFINER/);
  });

  // delete_user_data pins search_path to `public` alone (migrate_165's own,
  // unchanged shape - it never calls a bare-named helper the way every
  // community_* RPC does, so it has no pg_temp shadowing risk to guard
  // against); it is asserted on its own further down, not forced into this
  // community_*-function pattern.
  test.each(Object.keys(HEADERS).filter((n) => n !== 'delete_user_data'))(
    '%s pins search_path to public, pg_temp',
    (name) => {
      // Both spellings are the same stored proconfig value
      // (`search_path=public, pg_temp`); community_board carries the
      // pg_get_functiondef form because migrate_169's body was pulled live.
      expect(HEADERS[name]).toMatch(
        /SET search_path (= public, pg_temp|TO 'public', 'pg_temp')/,
      );
    },
  );

  test('delete_user_data pins search_path to public alone, unchanged from migrate_165', () => {
    expect(HEADERS.delete_user_data).toMatch(/SET search_path = public$/m);
  });

  test('the acceptance check re-asserts both facts against pg_proc', () => {
    expect(ACCEPTANCE).toContain("NOT ('search_path=public, pg_temp' = ANY (p.proconfig))");
    expect(ACCEPTANCE).toContain('NOT p.prosecdef');
  });
});

describe('EXECUTE is granted deliberately, never by default', () => {
  test.each(GRANT_SIGS)(
    '%s is revoked from PUBLIC and anon, then granted to authenticated only',
    (sig) => {
      expect(CODE).toContain(`REVOKE ALL ON FUNCTION public.${sig} FROM PUBLIC, anon;`);
      expect(CODE).toContain(`GRANT EXECUTE ON FUNCTION public.${sig} TO authenticated;`);
    },
  );

  test.each(Object.entries(HELPERS))(
    '%s is revoked from PUBLIC, anon AND authenticated, and never granted',
    (name, sig) => {
      expect(CODE).toContain(
        `REVOKE ALL ON FUNCTION public.${sig} FROM PUBLIC, anon, authenticated;`,
      );
      expect(CODE).not.toContain(`GRANT EXECUTE ON FUNCTION public.${sig}`);
      expect(name.startsWith('_community_')).toBe(true);
    },
  );

  test('no _community_* helper is granted to anybody, anywhere in the file', () => {
    const grantLines = CODE_LINES.filter((l) => /GRANT EXECUTE ON FUNCTION/i.test(l));
    // GRANT_SIGS, not Object.keys(PUBLIC_RPCS): community_upsert_profile and
    // community_group_get are each granted twice (an old-then-superseded
    // signature and a same-signature re-statement, respectively - see
    // GRANT_SIGS' own comment), so the file's real grant-line count exceeds
    // its distinct-name count.
    expect(grantLines).toHaveLength(GRANT_SIGS.length);
    for (const line of grantLines) {
      expect(line).not.toMatch(/public\._community_/);
      expect(line).toMatch(/TO authenticated;$/);
    }
  });

  test('nothing anywhere is granted to anon or to PUBLIC', () => {
    expect(CODE).not.toMatch(/GRANT[^\n]*TO (anon|PUBLIC)/i);
  });

  test('every declared function is a public RPC, a revoked helper, or delete_user_data', () => {
    for (const name of DECLARED) {
      expect(
        Object.keys(PUBLIC_RPCS).includes(name)
          || Object.keys(HELPERS).includes(name)
          || name === 'delete_user_data',
      ).toBe(true);
    }
  });

  test('delete_user_data is revoked from PUBLIC/anon and granted to authenticated, like a public RPC', () => {
    expect(CODE).toContain(`REVOKE ALL ON FUNCTION public.${DELETE_USER_DATA_SIG} FROM PUBLIC, anon;`);
    expect(CODE).toContain(`GRANT EXECUTE ON FUNCTION public.${DELETE_USER_DATA_SIG} TO authenticated;`);
  });

  test('the acceptance check proves the helper ACLs at apply time', () => {
    expect(ACCEPTANCE).toContain("has_function_privilege('authenticated'");
    expect(ACCEPTANCE).toContain('a migrate_170 helper is executable by authenticated');
  });
});

describe('migrate_167 lesson: anything that calls _community_rate_check is VOLATILE', () => {
  const RAILED = Object.entries(BODIES)
    .filter(([, b]) => b.includes('_community_rate_check'))
    .map(([n]) => n);

  test('the rate-railed set is the part A/A2 six plus part B\'s three writers', () => {
    expect(RAILED.sort()).toEqual([
      'community_board', 'community_create_post', 'community_dimension_recent',
      'community_dimensions_me', 'community_find_people', 'community_hub_summary',
      'community_post_set_note', 'community_respect_all', 'community_upsert_profile',
    ]);
  });

  test.each(['community_board', 'community_create_post', 'community_dimension_recent',
    'community_dimensions_me', 'community_find_people', 'community_hub_summary',
    'community_post_set_note', 'community_respect_all', 'community_upsert_profile'])(
    '%s carries no STABLE/IMMUTABLE keyword (PostgREST would force a read-only txn)',
    (name) => {
      expect(HEADERS[name]).not.toMatch(/\n\s*(STABLE|IMMUTABLE)\s*\n/);
    },
  );

  test('the two expensive reads sit on the house 120/hour rail', () => {
    expect(BODIES.community_hub_summary).toContain(
      "_community_rate_check(v_uid, 'hub_summary', 120, 120, interval '1 hour')",
    );
    expect(BODIES.community_dimensions_me).toContain(
      "_community_rate_check(v_uid, 'dimensions_me', 120, 120, interval '1 hour')",
    );
  });

  test('community_dimension_recent (part A2) sits on the same house rail', () => {
    expect(BODIES.community_dimension_recent).toContain(
      "_community_rate_check(v_uid, 'dimension_recent', 120, 120, interval '1 hour')",
    );
  });

  test('the acceptance check re-asserts provolatile against pg_proc', () => {
    for (const name of ['community_hub_summary', 'community_board',
      'community_find_people', 'community_dimensions_me', 'community_dimension_recent',
      'community_upsert_profile', 'community_create_post', 'community_post_set_note',
      'community_respect_all']) {
      expect(ACCEPTANCE).toContain(`${name} is not VOLATILE`);
    }
  });

  test('the STABLE helpers really are read-only', () => {
    for (const name of ['_community_profile_card', '_community_cohort_stats',
      '_community_can_view_post']) {
      expect(HEADERS[name]).toMatch(/\nSTABLE\n/);
      expect(BODIES[name]).not.toContain('_community_rate_check');
      expect(BODIES[name]).not.toMatch(/\b(INSERT|UPDATE|DELETE)\s+(INTO|FROM|public\.)/i);
    }
  });

  test('the two taxonomy helpers are IMMUTABLE and touch no table', () => {
    for (const name of ['_community_discipline_key_ok', '_community_discipline_label']) {
      expect(HEADERS[name]).toMatch(/\nIMMUTABLE\n/);
      // The body only: BODIES runs to the next CREATE OR REPLACE, which for
      // these two sweeps up the CHECK and the indexes that follow them.
      const body = BODIES[name].slice(BODIES[name].indexOf('AS $$'));
      const inner = body.slice(0, body.indexOf('\n$$;'));
      expect(inner).not.toContain('public.community_');
      expect(inner).not.toMatch(/\bFROM\s+public\./);
    }
  });
});

describe('the discipline taxonomy is the fifteen ruled keys, labelled in British English', () => {
  const keyOk = BODIES._community_discipline_key_ok;
  const label = BODIES._community_discipline_label;

  test('exactly fifteen keys, and the <= 3 cap, live in the one validating helper', () => {
    for (const [key] of TAXONOMY) expect(keyOk).toContain(`'${key}'`);
    expect((keyOk.match(/'[a-z_]+'/g) || [])).toHaveLength(TAXONOMY.length);
    expect(keyOk).toContain('array_length(_keys, 1), 0) <= 3');
  });

  test.each(TAXONOMY)('%s is labelled %s', (key, text) => {
    expect(label).toContain(`WHEN '${key}'`);
    expect(label).toContain(`'${text}'`);
  });

  test('exactly fifteen labels, and anything outside the taxonomy is NULL', () => {
    expect((label.match(/\bWHEN '/g) || [])).toHaveLength(TAXONOMY.length);
    expect(label).toContain('ELSE NULL');
  });

  test('no adaptive or para tag exists (self-declaring disability is special-category data)', () => {
    expect(keyOk).not.toMatch(/adaptive|para_|disab/i);
    expect(label).not.toMatch(/adaptive|para_|disab/i);
  });

  test('the column CHECK and every write path go through that one helper', () => {
    expect(CODE).toContain('CHECK (public._community_discipline_key_ok(discipline_keys))');
    expect(BODIES.community_upsert_profile)
      .toContain('public._community_discipline_key_ok(v_discipline_keys)');
    expect(BODIES.community_find_people)
      .toContain('public._community_discipline_key_ok(ARRAY[v_discipline])');
    expect(BODIES.community_board)
      .toContain('public._community_discipline_key_ok(ARRAY[_scope_key])');
  });

  test('a discipline_keys value that is present but not an array is refused, never erased', () => {
    expect(BODIES.community_upsert_profile).toContain(
      "IF _p ? 'discipline_keys' AND jsonb_typeof(_p -> 'discipline_keys') <> 'array' THEN",
    );
  });

  test('the GIN index the array column needs is present and re-runnable', () => {
    expect(CODE).toContain(
      'CREATE INDEX IF NOT EXISTS community_profiles_discipline_keys_idx\n'
      + '  ON public.community_profiles USING gin (discipline_keys);',
    );
  });

  test('the new age-band cohort predicate has a supporting index too', () => {
    expect(CODE).toContain('CREATE INDEX IF NOT EXISTS community_profiles_tp_age_band_idx');
  });
});

describe('minors are excluded from every count, sample, roster and board row', () => {
  // One case per function, counting the predicate: deleting any single
  // `is_minor = false` drops the count and fails here.
  test.each([
    ['_community_cohort_stats', 2],
    ['community_dimension', 2],
    ['community_dimensions_me', 1],
    ['community_board', 1],
    ['community_hub_summary', 3],
    ['community_find_people', 2],
    ['community_dimension_recent', 1],
    // migrate_170 part B: member_count's own predicate (part A2, unchanged)
    // plus the Together sums' own (a second, independent p2.is_minor =
    // false on the same member set sharing_members counts).
    ['community_group_get', 2],
    // migrate_170 part B (phase3 spec section 8, safety verdict R4): the
    // scope_members CTE.
    ['community_respect_all', 1],
  ])('%s carries is_minor = false on all %i of its query paths', (name, n) => {
    expect((BODIES[name].match(/is_minor = false/g) || [])).toHaveLength(n);
  });

  test('the predicate is never made conditional anywhere', () => {
    expect(CODE).not.toMatch(/is_minor\s*=\s*true/);
    expect(CODE).not.toMatch(/CASE[^\n]*is_minor/);
    expect(CODE).not.toMatch(/is_minor\s+IS\s+NULL/);
    expect(CODE).not.toMatch(/OR\s+p\d?\.is_minor/);
  });

  test('the profile card refuses the counters to a minor owner as well', () => {
    expect(BODIES._community_profile_card).toContain('AND p.is_minor = false');
  });

  test('a minor caller cannot open an age-band cohort or board (they have no band)', () => {
    expect(BODIES.community_dimension)
      .toContain('IF v_my_age_band IS NULL OR v_my_age_band <> _key THEN');
    expect(BODIES.community_board)
      .toContain("IF _scope = 'age_band' AND v_me.tp_age_band IS NULL THEN");
    expect(BODIES.community_board).toContain("RAISE EXCEPTION USING message = 'not_allowed'");
  });
});

describe('consent: consistency data travels only while its owner shares it', () => {
  test('the profile card gate is viewability AND share_consistency AND active AND not a minor', () => {
    expect(BODIES._community_profile_card).toContain(
      'v_show_consistency := v_viewable AND coalesce(p.share_consistency, false)\n'
      + "    AND p.status = 'active' AND p.is_minor = false;",
    );
  });

  test('all nine counters are behind that one gate, with the key always present', () => {
    const card = BODIES._community_profile_card;
    expect((card.match(/CASE WHEN v_show_consistency THEN/g) || [])).toHaveLength(9);
    for (const key of ['c_sessions_week', 'c_sessions_month', 'c_weeks_streak',
      'c_planned_pct_4w', 'c_consistent_weeks_12w', 'c_trained_days_week',
      'c_last_trained_day', 'c_updated_at', 'c_weeks_history']) {
      expect(card).toContain(`'${key}',`);
    }
  });

  test('discipline fields ride the same viewability gate styles already uses', () => {
    expect(BODIES._community_profile_card).toContain(
      "'discipline_keys',   CASE WHEN v_viewable THEN to_jsonb(p.discipline_keys) ELSE '[]'::jsonb END",
    );
  });

  test.each([
    ['_community_cohort_stats', 2],
    ['community_hub_summary', 2],
    ['community_board', 1],
  ])('%s states share_consistency = true on all %i of its trained-today tests', (name, n) => {
    expect((BODIES[name].match(/share_consistency = true/g) || [])).toHaveLength(n);
  });

  test('the cohort helper gates BOTH the count and the sample flag, not just the count', () => {
    const h = BODIES._community_cohort_stats;
    expect(h).toContain(
      'WHERE p.share_consistency = true\n'
      + '             AND p.c_last_trained_day IS NOT NULL AND p.c_last_trained_day = _today',
    );
    expect(h).toContain(
      '(p.share_consistency = true\n'
      + '       AND p.c_last_trained_day IS NOT NULL AND p.c_last_trained_day = _today) AS trained_today',
    );
  });

  test('age-band cohorts are reciprocal: only ever the caller\'s own band', () => {
    expect(BODIES.community_dimension).toContain('SELECT tp_age_band INTO v_my_age_band');
    expect(BODIES.community_board)
      .toContain("_scope = 'age_band' AND v_me.tp_age_band IS NOT NULL AND p.tp_age_band = v_me.tp_age_band");
    expect(BODIES.community_hub_summary).toContain('IF v_me.tp_age_band IS NOT NULL THEN');
  });

  test('a supplied _today is always validated, and is never the server date', () => {
    // community_board refuses a missing _today outright (unchanged since
    // migrate_165); community_dimensions_me/community_hub_summary and part
    // B's community_respect_all validate a SUPPLIED value and fall back for
    // an absent one (lead ruling 1). Either way a malformed value is
    // refused, and no function ever substitutes the server's date.
    expect((CODE.match(/(_today|v_today) !~ /g) || [])).toHaveLength(4);
    expect(CODE).not.toContain('now()::date');
    expect(BODIES.community_board).toContain('IF _today IS NULL OR _today !~ ');
    expect(BODIES.community_respect_all).toContain("ELSIF v_today !~ '^\\d{4}-\\d{2}-\\d{2}$' THEN");
  });

  test('lead ruling 1: an absent _today falls back to the UK-local day key, never a refusal', () => {
    for (const name of ['community_dimensions_me', 'community_hub_summary']) {
      const body = BODIES[name];
      // Backwards compatibility for builds already on Google Play: they call
      // these with no _today at all. Deleting the fallback breaks them.
      expect(body).toContain("v_today := nullif(btrim(coalesce(_today, '')), '');");
      expect(body).toContain(
        "v_today := to_char(timezone('Europe/London', now()), 'YYYY-MM-DD');",
      );
      // ...and a value that IS supplied is still refused when malformed.
      expect(body).toContain("RAISE EXCEPTION USING message = 'invalid_input'");
      expect(body).not.toContain('IF _today IS NULL OR');
      // The day key format must match src/lib/dayKey.js's localDayKey().
      expect(body).not.toContain("'YYYY-MM-DD HH");
    }
  });

  test("the fallback matches src/lib/dayKey.js's zero-padded YYYY-MM-DD key", () => {
    const dayKey = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'dayKey.js'), 'utf8');
    expect(dayKey).toContain("padStart(2, '0')");
    expect(dayKey).toContain('return `${y}-${m}-${day}`;');
  });
});

describe('blocks and visibility are checked on every new query path', () => {
  test.each([
    ['_community_cohort_stats', 2],
    ['community_dimension', 2],
    ['community_dimensions_me', 1],
    ['community_board', 1],
    ['community_hub_summary', 3],
    ['community_find_people', 2],
    ['community_dimension_recent', 1],
    // migrate_170 part B (safety verdict R4): excludes a blocked pair in
    // EITHER direction, the same _community_is_blocked call every other
    // scoped query in this file uses (it is itself symmetrical - see its
    // own definition, migrate_160).
    ['community_respect_all', 1],
  ])('%s calls _community_is_blocked on all %i of its query paths', (name, n) => {
    expect((BODIES[name].match(/_community_is_blocked/g) || [])).toHaveLength(n);
  });

  test('community_respect_all also excludes people the caller has muted, by the same predicate shape _community_cohort_stats uses for its sample', () => {
    const body = BODIES.community_respect_all;
    expect(body).toContain(
      'AND NOT EXISTS (\n'
      + '          SELECT 1 FROM public.community_mutes mu\n'
      + '          WHERE mu.muter_id = v_uid AND mu.muted_id = p.user_id)',
    );
  });

  test('community_respect_all is VOLATILE and rate-railed at 10/hour (safety verdict R4, phase3 spec section 5)', () => {
    const body = BODIES.community_respect_all;
    expect(HEADERS.community_respect_all).not.toMatch(/\n\s*(STABLE|IMMUTABLE)\s*\n/);
    expect(body).toContain("_community_rate_check(v_uid, 'respect_all', 10, 10, interval '1 hour')");
  });

  test('lead ruling 5: cohort samples exclude muted people, counts do not', () => {
    const h = BODIES._community_cohort_stats;
    // One mute predicate only, and it sits in the SAMPLE subquery (after the
    // count query), never in the count: a mute must not shrink a cohort.
    expect((h.match(/community_mutes/g) || [])).toHaveLength(1);
    expect(h).toContain(
      'AND NOT EXISTS (\n'
      + '        SELECT 1 FROM public.community_mutes mu\n'
      + '        WHERE mu.muter_id = _uid AND mu.muted_id = p.user_id)',
    );
    expect(h.indexOf('community_mutes')).toBeGreaterThan(h.indexOf('INTO v_member_count'));
  });

  test('the cohort helper and the dimension roster count only public profiles', () => {
    for (const name of ['_community_cohort_stats', 'community_dimension']) {
      expect(BODIES[name]).toMatch(/visibility = 'public'/);
    }
  });

  test('all four new board scopes are ANDed with _community_can_view', () => {
    const board = BODIES.community_board;
    expect((board.match(/public\._community_can_view\(v_uid, p\.user_id\)/g) || []))
      .toHaveLength(4);
    for (const scope of ['area', 'style', 'discipline', 'age_band']) {
      const at = board.indexOf(`OR (_scope = '${scope}'`);
      expect(at).toBeGreaterThan(-1);
      expect(board.slice(at, at + 400)).toContain('_community_can_view(v_uid, p.user_id)');
    }
  });

  test('the hub group figures exclude blocked pairs and compute their own member_count', () => {
    const hub = BODIES.community_hub_summary;
    expect(hub).not.toContain("'member_count', g.member_count");
    expect(hub).toContain('FROM public.community_group_members gm1');
    expect(hub).toContain("WHERE m.user_id = v_uid AND m.state = 'member'");
    expect(hub).toContain('ORDER BY g.name, g.id');
  });
});

describe('migrate_169 lesson: the ranking CTEs alias the derived table', () => {
  test('community_board never writes the phantom `x` table alias', () => {
    expect(BODIES.community_board).not.toContain('SELECT x.*,');
    expect((BODIES.community_board.match(/FROM \(SELECT unnest\(v_items\) AS x\) u/g) || []))
      .toHaveLength(3);
  });

  test('the acceptance check re-asserts it against the installed definition', () => {
    expect(ACCEPTANCE).toContain('the x.* alias bug is present in community_board');
  });

  test('keyset paging tie-breaks stay total orders', () => {
    expect(BODIES.community_dimension).toContain('ORDER BY p.created_at DESC, p.user_id DESC');
    expect(BODIES._community_cohort_stats).toContain('ORDER BY trained_today DESC, p.user_id');
  });

  test('community_dimension_recent (part A2) never writes the phantom `x` alias either', () => {
    // It has no computed rank to page, so it never needed the array/unnest
    // 'u.x' idiom community_board/community_find_people use in the first
    // place - it pages real table columns the plain community_feed way.
    const body = BODIES.community_dimension_recent;
    expect(body).not.toContain('SELECT x.*,');
    expect(body).not.toContain('unnest(v_items)');
    expect(body).toContain('(v_ts IS NULL OR (r.created_at, r.id) < (v_ts, v_id))');
    expect(body).toContain('ORDER BY r.created_at DESC, r.id DESC');
    expect(body).toContain('public._community_cursor_parts(_cursor)');
    expect(body).toContain('public._community_cursor_of(v_lts, v_lid)');
  });
});

describe('the retired programme layer stays retired', () => {
  test('community_dimension returns the empty shape for a programme kind, reading nothing', () => {
    const body = BODIES.community_dimension;
    expect(body).toContain("IF _kind = 'programme' THEN");
    expect(body).not.toContain('community_programme_uses');
    expect(body).not.toContain('community_programmes');
  });

  test('community_dimensions_me does not enrich the dead programme rows', () => {
    const progAt = BODIES.community_dimensions_me.indexOf('community_programme_uses');
    expect(progAt).toBeGreaterThan(-1);
    expect(BODIES.community_dimensions_me.slice(progAt)).not.toContain('_community_cohort_stats');
  });

  test('community_dimension_recent (part A2) reads no programme table either', () => {
    expect(BODIES.community_dimension_recent).not.toContain('community_programme_uses');
    expect(BODIES.community_dimension_recent).not.toContain('community_programmes');
  });
});

describe('PART A2: community_dimension_recent (RECENT stories) and the community_group_get alignment', () => {
  const recent = BODIES.community_dimension_recent;
  const groupGet = BODIES.community_group_get;

  test('a NULL _key is invalid_input, checked before any real work', () => {
    const at = recent.indexOf("IF _key IS NULL THEN");
    expect(at).toBeGreaterThan(-1);
    expect(recent.slice(at, at + 80)).toContain("RAISE EXCEPTION USING message = 'invalid_input'");
    // The key check comes before the rate check and the kind dispatch, so a
    // malformed call fails fast rather than spending budget or falling
    // through to the wrong branch.
    expect(at).toBeLessThan(recent.indexOf('_community_rate_check'));
    expect(at).toBeLessThan(recent.indexOf("_kind NOT IN"));
  });

  test("'programme' and any kind outside the five cohorts get the empty shape, never invalid_input", () => {
    expect(recent).toContain(
      "IF _kind NOT IN ('gym', 'area', 'style', 'discipline', 'age_band') THEN",
    );
    const at = recent.indexOf("IF _kind NOT IN ('gym', 'area', 'style', 'discipline', 'age_band') THEN");
    expect(recent.slice(at, at + 200)).toContain("jsonb_build_object('rows', '[]'::jsonb, 'cursor', NULL)");
    // Five kinds only - never community_dimension's six ('programme' is
    // deliberately not in this list, so it falls into the branch above).
    expect(recent).not.toContain("'programme'");
  });

  test('age-band reciprocity is byte-identical in shape to community_dimension\'s gate', () => {
    expect(recent).toContain('SELECT tp_age_band INTO v_my_age_band');
    expect(recent).toContain('IF v_my_age_band IS NULL OR v_my_age_band <> _key THEN');
    expect(BODIES.community_dimension).toContain('IF v_my_age_band IS NULL OR v_my_age_band <> _key THEN');
  });

  test('the cohort membership OR-chain matches _community_cohort_stats/community_dimension exactly', () => {
    const chain = "(_kind = 'style'      AND _key = ANY (p.styles))\n"
      + "     OR (_kind = 'gym'        AND p.gym_key = _key)\n"
      + "     OR (_kind = 'area'       AND p.area_key = _key)\n"
      + "     OR (_kind = 'discipline' AND _key = ANY (p.discipline_keys))\n"
      + "     OR (_kind = 'age_band'   AND p.tp_age_band = _key)";
    expect(recent).toContain(chain);
  });

  test('posts are limited to exactly the community_discover_posts visibility predicate', () => {
    expect(recent).toContain("r.status = 'visible'");
    expect(recent).toContain("r.visibility = 'public'");
    expect(recent).toContain("p.status = 'active' AND p.visibility = 'public' AND p.is_minor = false");
    expect(recent).toContain(
      'AND NOT EXISTS (\n'
      + '        SELECT 1 FROM public.community_mutes m\n'
      + '        WHERE m.muter_id = v_uid AND m.muted_id = r.author_id)',
    );
    // Never the caller's own post: same "never yourself" rule
    // community_dimension's own roster query already applies.
    expect(recent).toContain('p.user_id <> v_uid');
  });

  test('rows carry the exact {post, author, my_reaction} shape community_feed returns, wrapped as {rows, cursor}', () => {
    expect(recent).toContain("'post',   public._community_post_json(page.rec)");
    expect(recent).toContain("'author', public._community_profile_card(page.author_id, v_uid)");
    expect(recent).toContain("'my_reaction', EXISTS (");
    expect(recent).toContain("RETURN jsonb_build_object(\n    'rows', coalesce(v_rows, '[]'::jsonb),");
    // The envelope key is 'rows' (the community_board-style paged-read
    // name), never 'posts' (the feed family's) - the contract is explicit
    // that this differs deliberately from community_feed's own envelope.
    expect(recent).not.toContain("'posts',");
  });

  test("community_group_get's member_count is computed on community_hub_summary's predicate, not the stored counter", () => {
    expect(groupGet).toContain(
      'SELECT count(*) INTO v_member_count\n'
      + '  FROM public.community_group_members gm\n'
      + '  JOIN public.community_profiles p ON p.user_id = gm.user_id\n'
      + "  WHERE gm.group_id = _group_id AND gm.state = 'member'\n"
      + "    AND p.status = 'active' AND p.is_minor = false;",
    );
    expect(groupGet).toContain("v_out := v_out || jsonb_build_object('member_count', v_member_count);");
    // The override happens before the existing invite-only stripping, so a
    // non-member of an invite-only group still loses the key exactly as
    // before - the override never re-adds what the strip removes.
    expect(groupGet.indexOf('v_member_count')).toBeLessThan(
      groupGet.indexOf("v_out := v_out - 'member_count' - 'blurb'"),
    );
    // member_count itself is deliberately NOT block-aware, unlike community_
    // hub_summary's figure (this card is shown to every member, and to a
    // non-member browsing an open group, not only the caller - see the
    // contract doc). Part B's Together figures (its own describe block
    // below) ARE block-aware - the SAME body now legitimately contains
    // _community_is_blocked for that reason, so this checks member_count's
    // OWN query specifically rather than the whole function.
    const memberCountQuery = groupGet.slice(
      groupGet.indexOf('SELECT count(*) INTO v_member_count'),
      groupGet.indexOf("v_out := v_out || jsonb_build_object('member_count', v_member_count);"),
    );
    expect(memberCountQuery).not.toContain('_community_is_blocked');
    // Signature is unchanged: CREATE OR REPLACE only, never the DROP-first
    // dance part 7/10 use for a real (parameter-list) signature change.
    expect(SQL).toContain('CREATE OR REPLACE FUNCTION public.community_group_get(_group_id uuid)');
    expect(CODE).not.toContain("p.proname = 'community_group_get'");
  });

  test("community_group_get's aligned predicate textually matches community_hub_summary's group block", () => {
    expect(BODIES.community_hub_summary).toContain(
      "AND p1.status = 'active' AND p1.is_minor = false\n",
    );
    expect(groupGet).toContain("AND p.status = 'active' AND p.is_minor = false;");
  });
});

describe('the file is registered in the tracker', () => {
  const README = fs.readFileSync(path.join(ROOT, 'supabase', 'README.md'), 'utf8');

  test('supabase/README.md carries the status entry and a ledger row', () => {
    // Applied to production 2026-09-10 (MCP path, checksum-verified); the
    // tracker must carry the applied status, never the pre-apply wording.
    expect(README).toContain('170 APPLIED 2026-09-10');
    expect(README).toContain('| 170 | `migrate_170_community_connection.sql` |');
  });

  test('community_hub_summary is inventoried as a client RPC in the security matrix', () => {
    const inventory = JSON.parse(fs.readFileSync(path.join(
      ROOT, 'scripts', 'security', 'supabase-matrix.targets.json',
    ), 'utf8'));
    for (const name of Object.keys(PUBLIC_RPCS)) {
      expect(inventory.clientRpcNames).toContain(name);
    }
    expect(inventory.clientRpcNames.filter((n) => n.startsWith('_community_'))).toEqual([]);
  });

  test('the contract names the seven physique-division keys for the Q1b withhold', () => {
    const contract = fs.readFileSync(path.join(
      ROOT, 'docs', 'communities-revamp-2026-09-10', '22-MIGRATION-170A-CONTRACT.md',
    ), 'utf8');
    const at = contract.indexOf('Physique-division keys');
    expect(at).toBeGreaterThan(-1);
    const section = contract.slice(at, at + 900);
    for (const key of ['bodybuilding', 'mens_physique', 'classic_physique',
      'womens_physique', 'figure', 'bikini', 'wellness']) {
      expect(section).toContain(key);
    }
    expect(section).toContain('SEVEN');
  });

  test('the client contract document exists and matches the taxonomy', () => {
    const contract = fs.readFileSync(path.join(
      ROOT, 'docs', 'communities-revamp-2026-09-10', '22-MIGRATION-170A-CONTRACT.md',
    ), 'utf8');
    for (const [key] of TAXONOMY) expect(contract).toContain(key);
    expect(contract).toContain('community_hub_summary(_today)');
  });

  test('the contract carries a PART B section naming community_respect_all', () => {
    const contract = fs.readFileSync(path.join(
      ROOT, 'docs', 'communities-revamp-2026-09-10', '22-MIGRATION-170A-CONTRACT.md',
    ), 'utf8');
    expect(contract).toContain('PART B');
    expect(contract).toContain('community_respect_all');
    expect(contract).toContain('community_post_set_note');
  });

  test('community_post_set_note and community_respect_all are inventoried in the security matrix (the genuinely new names)', () => {
    const inventory = JSON.parse(fs.readFileSync(path.join(
      ROOT, 'scripts', 'security', 'supabase-matrix.targets.json',
    ), 'utf8'));
    expect(inventory.clientRpcNames).toContain('community_post_set_note');
    expect(inventory.clientRpcNames).toContain('community_respect_all');
  });
});

describe('PART B: the two new tables are RLS-on, no-grants, RPC-only (SD-14)', () => {
  const PART_B = SQL.slice(SQL.indexOf('-- ─── PART B: ambient sharing'));

  test('the part B section exists and is additive to Part A/A2', () => {
    expect(PART_B.length).toBeGreaterThan(0);
    expect(PART_B).toContain('Additive to Part A and Part A2 above');
  });

  test.each(['community_post_groups', 'community_notify_daily'])(
    '%s: CREATE TABLE IF NOT EXISTS, RLS enabled, revoked from anon and authenticated',
    (table) => {
      expect(PART_B).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
      // Both tables are revoked/RLS'd through the FOREACH..EXECUTE format()
      // idiom migrate_160 Part 2 uses, not a literal per-table statement -
      // assert the array literal names the table, and that the format()
      // template itself does both things.
      const at = PART_B.indexOf(`ARRAY['${table}']`);
      expect(at).toBeGreaterThan(-1);
      const block = PART_B.slice(Math.max(0, at - 400), at + 200);
      expect(block).toContain("EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t)");
      expect(block).toContain("EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t)");
    },
  );

  test('no GRANT ever reaches either new table directly (RPC-only, not table access)', () => {
    expect(PART_B).not.toMatch(/GRANT[^\n]*ON (TABLE )?public\.community_post_groups/i);
    expect(PART_B).not.toMatch(/GRANT[^\n]*ON (TABLE )?public\.community_notify_daily/i);
  });

  test('the acceptance check proves RLS and no-grant at apply time for both', () => {
    expect(ACCEPTANCE).toContain('relrowsecurity');
    expect(ACCEPTANCE).toContain("has_table_privilege('authenticated', 'public.community_post_groups'");
    expect(ACCEPTANCE).toContain("has_table_privilege('authenticated', 'public.community_notify_daily'");
  });
});

describe("PART B: delete_user_data names both new tables (GDPR erasure completeness)", () => {
  const dud = BODIES.delete_user_data;

  test('community_post_groups is deleted for the caller\'s own posts', () => {
    expect(dud).toContain('DELETE FROM community_post_groups');
    expect(dud).toContain(
      'WHERE post_id IN (SELECT id FROM community_posts WHERE author_id = uid)',
    );
  });

  test('community_notify_daily is deleted by recipient', () => {
    expect(dud).toContain('DELETE FROM community_notify_daily WHERE recipient = uid;');
  });

  test('both deletes are wrapped in the same undefined_table-tolerant BEGIN block every other line in this function uses', () => {
    for (const needle of ['DELETE FROM community_post_groups', 'DELETE FROM community_notify_daily WHERE recipient = uid;']) {
      const at = dud.indexOf(needle);
      expect(at).toBeGreaterThan(-1);
      expect(dud.slice(at, at + 200)).toContain('EXCEPTION WHEN undefined_table THEN NULL; END;');
    }
  });

  test('the acceptance check re-asserts both table names against the installed function definition', () => {
    expect(ACCEPTANCE).toContain('does not name community_post_groups');
    expect(ACCEPTANCE).toContain('does not name community_notify_daily');
  });
});

describe("PART B: every reader of post visibility gains the 'groups' branch", () => {
  // _community_can_view_post is the shared gate react/comment/report/group
  // feed all already call; re-issuing it alone is what makes every one of
  // them groups-aware. The other four duplicate or run their own inline
  // visibility check and each needed the branch written out.
  test.each([
    '_community_can_view_post', 'community_get_post', 'community_feed',
    'community_group_feed', 'community_get_profile',
  ])("%s's body mentions community_post_groups and community_group_members", (name) => {
    const body = BODIES[name];
    expect(body).toContain('community_post_groups');
    expect(body).toContain('community_group_members');
  });

  // The three that decide "may I see this post" by an inclusive visibility
  // OR-chain spell the test as `visibility = 'groups'`. community_feed's
  // is an exception-style guard on the author-or-follows result it already
  // had (`visibility <> 'groups' OR ...`), and community_group_feed adds a
  // membership-based inclusion arm that never re-states the visibility
  // value at all (relying on _community_can_view_post, already covered
  // above, for the actual visibility check) - so those two are asserted on
  // their own shape rather than forced into the other three's pattern.
  test.each(['_community_can_view_post', 'community_get_post', 'community_get_profile'])(
    "%s's body checks visibility = 'groups' directly",
    (name) => {
      expect(BODIES[name]).toContain("visibility = 'groups'");
    },
  );

  test("community_feed excepts a 'groups' post unless the caller is the author or a named group's member", () => {
    expect(BODIES.community_feed).toContain("r.visibility <> 'groups'");
    expect(BODIES.community_feed).toContain('r.author_id = v_uid');
  });

  test('community_group_feed adds an audience-based inclusion arm and still gates every row through _community_can_view_post', () => {
    const body = BODIES.community_group_feed;
    expect(body).toContain('pg.group_id = _group_id');
    expect(body).toContain('public._community_can_view_post(v_uid, r.id)');
  });

  test('the author always sees their own post in every one of the five (never gated behind group membership)', () => {
    // _community_can_view_post and community_get_post: r.author_id = v_uid/
    // _viewer is checked BEFORE the visibility branch is ever reached.
    expect(BODIES._community_can_view_post).toContain('r.author_id = _viewer');
    expect(BODIES.community_get_post).toContain('v_r.author_id <> v_uid');
    // community_feed: the groups AND-clause explicitly excepts the author.
    expect(BODIES.community_feed).toContain('r.author_id = v_uid');
    // community_group_feed: _community_can_view_post (already author-safe)
    // gates every row regardless of which inclusion arm found it.
    expect(BODIES.community_group_feed).toContain('public._community_can_view_post(v_uid, r.id)');
    // community_get_profile: v_target = v_uid IS the "viewing your own
    // profile" case.
    expect(BODIES.community_get_profile).toContain('v_target = v_uid');
  });

  test('community_group_feed also includes posts whose audience names the group, not only current members\' posts', () => {
    const body = BODIES.community_group_feed;
    expect(body).toContain(
      'OR EXISTS (\n'
      + '          SELECT 1 FROM public.community_post_groups pg\n'
      + '          WHERE pg.post_id = r.id AND pg.group_id = _group_id)',
    );
  });

  test('community_discover_posts and community_dimension_recent are UNCHANGED (their hard public-only filter already excludes groups posts)', () => {
    expect(BODIES.community_discover_posts).toBeUndefined();
    expect(BODIES.community_dimension_recent).not.toContain('community_post_groups');
  });
});

describe('PART B: community_posts.auto/client_ref and the visibility CHECK', () => {
  const PART_B = SQL.slice(SQL.indexOf('-- ─── PART B: ambient sharing'));

  test('auto and client_ref are added with ADD COLUMN IF NOT EXISTS', () => {
    expect(PART_B).toContain(
      'ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS auto boolean NOT NULL DEFAULT false;',
    );
    expect(PART_B).toContain(
      'ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS client_ref text;',
    );
  });

  test('the (author_id, client_ref) unique index is partial on client_ref IS NOT NULL', () => {
    expect(PART_B).toContain('CREATE UNIQUE INDEX IF NOT EXISTS community_posts_author_client_ref_idx');
    expect(PART_B).toContain('ON public.community_posts (author_id, client_ref) WHERE client_ref IS NOT NULL;');
  });

  test("the visibility CHECK is widened idempotently via pg_constraint introspection, not the duplicate_object-tolerant DO block", () => {
    const at = PART_B.indexOf("conname = 'community_posts_visibility_check'");
    expect(at).toBeGreaterThan(-1);
    const block = PART_B.slice(Math.max(0, at - 300), at + 500);
    expect(block).toContain('FROM pg_constraint');
    expect(block).toContain('DROP CONSTRAINT community_posts_visibility_check');
    expect(block).toContain("CHECK (visibility IN ('public', 'followers', 'groups'));");
  });

  test('community_create_post upserts on (author_id, client_ref) and reports fresh-vs-conflict via xmax = 0', () => {
    const body = BODIES.community_create_post;
    expect(body).toContain('ON CONFLICT (author_id, client_ref) WHERE client_ref IS NOT NULL');
    expect(body).toContain('DO UPDATE SET id = community_posts.id');
    expect(body).toContain('RETURNING id, (xmax = 0) INTO v_id, v_inserted;');
  });

  test('community_create_post refuses a _group_ids caller who is a minor, with minor_restricted specifically', () => {
    const body = BODIES.community_create_post;
    const at = body.indexOf('_community_caller_is_minor(v_uid)');
    expect(at).toBeGreaterThan(-1);
    expect(body.slice(at, at + 110)).toContain("RAISE EXCEPTION USING message = 'minor_restricted'");
  });

  test("community_create_post requires every named group to have the caller as a current member", () => {
    const body = BODIES.community_create_post;
    expect(body).toContain("m.state = 'member'");
    expect(body).toContain("RAISE EXCEPTION USING message = 'not_allowed'");
  });

  test("a 'groups' post with zero group_ids, and a non-empty group_ids on a non-'groups' post, are both invalid_input", () => {
    const body = BODIES.community_create_post;
    expect(body).toContain("ELSIF v_vis = 'groups' THEN\n    RAISE EXCEPTION USING message = 'invalid_input';");
    const at = body.indexOf('IF _group_ids IS NOT NULL AND array_length(_group_ids, 1) > 0 THEN');
    expect(at).toBeGreaterThan(-1);
    expect(body.slice(at, at + 150)).toContain("IF v_vis <> 'groups' THEN");
  });
});

describe('PART B: community_profiles sharing columns and community_upsert_profile', () => {
  test('share_sessions, sessions_audience and c_planned_per_week are added additively', () => {
    expect(CODE).toContain(
      'ALTER TABLE public.community_profiles\n  ADD COLUMN IF NOT EXISTS share_sessions boolean NOT NULL DEFAULT false;',
    );
    expect(CODE).toContain(
      "ADD COLUMN IF NOT EXISTS sessions_audience text NOT NULL DEFAULT 'followers';",
    );
    expect(CODE).toContain('ADD COLUMN IF NOT EXISTS c_planned_per_week int;');
  });

  test('sessions_audience carries a named, idempotent CHECK for exactly the three values', () => {
    expect(CODE).toContain('ADD CONSTRAINT community_profiles_sessions_audience_check');
    expect(CODE).toContain("CHECK (sessions_audience IN ('followers', 'groups', 'everyone'));");
  });

  test('community_upsert_profile is DROPped and recreated for _remove_shared, the same pattern as the two Part A signature changes', () => {
    expect(CODE).toContain("WHERE p.proname = 'community_upsert_profile' AND n.nspname = 'public'");
    expect(CODE).toContain(
      'CREATE OR REPLACE FUNCTION public.community_upsert_profile(_p jsonb, _remove_shared boolean DEFAULT false)',
    );
  });

  test('a minor is refused everyone outright and forced to followers otherwise, never left at groups or everyone', () => {
    const body = BODIES.community_upsert_profile;
    const at = body.indexOf("v_sessions_audience := coalesce(nullif(btrim(coalesce(_p ->> 'sessions_audience'");
    expect(at).toBeGreaterThan(-1);
    const gate = body.slice(body.indexOf('IF v_minor THEN', at));
    expect(gate.slice(0, 200)).toContain("IF v_sessions_audience = 'everyone' THEN");
    expect(gate.slice(0, 200)).toContain("RAISE EXCEPTION USING message = 'invalid_input'");
    expect(gate.slice(0, 250)).toContain("v_sessions_audience := 'followers';");
  });

  test('_remove_shared deletes only when share_sessions actually resolves to off, and cleans comments/activity like community_delete_post does', () => {
    const body = BODIES.community_upsert_profile;
    expect(body).toContain('IF _remove_shared AND NOT v_share_sessions THEN');
    expect(body).toContain("DELETE FROM public.community_comments\n    WHERE target_kind = 'post'");
    expect(body).toContain("DELETE FROM public.community_activity\n    WHERE target_kind = 'post'");
    expect(body).toContain('DELETE FROM public.community_posts WHERE author_id = v_uid AND auto = true;');
  });

  test('the omit-key-to-keep-unchanged contract covers all three new fields, the same shape discipline_keys already has', () => {
    const body = BODIES.community_upsert_profile;
    const at = body.indexOf("'discipline_keys', to_jsonb(coalesce(v_existing.discipline_keys");
    expect(at).toBeGreaterThan(-1);
    const mergeBlock = body.slice(at, at + 400);
    expect(mergeBlock).toContain("'share_sessions',    coalesce(v_existing.share_sessions, false)");
    expect(mergeBlock).toContain("'sessions_audience', coalesce(v_existing.sessions_audience, 'followers')");
    expect(mergeBlock).toContain("'c_planned_per_week', v_existing.c_planned_per_week");
  });
});

describe('PART B: community_group_get returns Together this week', () => {
  const groupGetB = BODIES.community_group_get;

  test('together_sessions_week, together_planned_week and sharing_members are all present', () => {
    for (const key of ['together_sessions_week', 'together_planned_week', 'sharing_members']) {
      expect(groupGetB).toContain(`'${key}'`);
    }
  });

  test('together_planned_week only counts members who actually have a plan', () => {
    expect(groupGetB).toContain('FILTER (WHERE p2.c_planned_per_week IS NOT NULL)');
  });

  test('Together IS reduced by the caller\'s own blocks, unlike member_count', () => {
    const at = groupGetB.indexOf('together_sessions_week');
    const sumBlock = groupGetB.slice(groupGetB.lastIndexOf('SELECT', at), at + 600);
    expect(sumBlock).toContain('_community_is_blocked(v_uid, p2.user_id)');
  });

  // Lead ruling 2026-09-10 (B): Together is members-only. member_count and
  // blurb keep their own pre-part-B strip for a non-member of an invite-only
  // group; the three Together keys are null for EVERY non-member instead.
  test('member_count/blurb keep exactly their pre-part-B strip, with nothing else bolted on', () => {
    expect(groupGetB).toContain(
      "v_out := v_out - 'member_count' - 'blurb';",
    );
  });

  test('a non-member gets null for all three, and the sums are never computed for them', () => {
    expect(groupGetB).toContain(
      'IF v_role IS NULL THEN\n'
      + '    v_together_sessions := NULL;\n'
      + '    v_together_planned  := NULL;\n'
      + '    v_sharing_members   := NULL;\n'
      + '  ELSE\n'
      + '    SELECT',
    );
    // The aggregate sits inside that ELSE, never above the role check.
    expect(groupGetB.indexOf('IF v_role IS NULL THEN'))
      .toBeLessThan(groupGetB.indexOf('FROM public.community_group_members gm2'));
  });
});

describe('PART B: connect reasons - same_programme out, same_discipline in', () => {
  test('_community_connect_reasons_list is re-issued with same_discipline in the same position', () => {
    expect(BODIES._community_connect_reasons_list).toContain(
      "ARRAY['same_gym', 'same_discipline', 'train_like_me', 'train_together']::text[];",
    );
    expect(BODIES._community_connect_reasons_list).not.toContain('same_programme');
  });

  test('the contract states both the old and the new list for the client lane', () => {
    const contract = fs.readFileSync(path.join(
      ROOT, 'docs', 'communities-revamp-2026-09-10', '22-MIGRATION-170A-CONTRACT.md',
    ), 'utf8');
    expect(contract).toContain("['same_gym', 'same_programme', 'train_like_me', 'train_together']");
    expect(contract).toContain("['same_gym', 'same_discipline', 'train_like_me', 'train_together']");
  });
});

describe('PART B acceptance block exists and is read-only', () => {
  test('it ends with a read-only acceptance check naming its own tag', () => {
    expect(ACCEPTANCE).toContain('migrate_170 part B acceptance: OK');
    const acceptanceCode = ACCEPTANCE.split('\n')
      .filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(acceptanceCode).not.toMatch(/^\s*(INSERT|UPDATE|DELETE|ALTER|DROP)\s/im);
  });
});

// ───────────────────────────────────────────────────────────────────────
// Hostile review of PART B, 2026-09-10. Every case below is a defect that
// WAS present in the written-not-applied file and is now fixed; each one is
// written so that reverting the fix fails the case rather than quietly
// shipping. Each fix carries a `-- reviewer 2026-09-10 (B):` note at its
// own site in the SQL (or a `reviewer 2026-09-10 (B)` note in the edge
// function), so the two can always be read against each other.
// ───────────────────────────────────────────────────────────────────────

const NOTIFY_FN = fs.readFileSync(path.join(
  ROOT, 'supabase', 'functions', 'community-notify', 'index.ts',
), 'utf8');

describe("PART B review: a 'groups' post never reaches a mere follower", () => {
  // The defect: both OR-chains carried a bare `EXISTS (accepted follow)`
  // arm with no visibility test of its own. That was correct only while
  // visibility was {public, followers}. Adding 'groups' made it admit
  // EVERY accepted follower to a groups post they were not in the group
  // for - through _community_can_view_post, which is the single gate
  // community_react, community_comment, community_report, community_list_
  // comments, community_group_feed, the connect/share previews and
  // community_respect_all all call.
  test('_community_can_view_post scopes its follows arm to visibility = followers', () => {
    const body = BODIES._community_can_view_post;
    expect(body).toContain(
      "r.visibility = 'followers'\n"
      + '              AND EXISTS (\n'
      + '                SELECT 1 FROM public.community_follows f',
    );
    // The bare, visibility-less arm must not come back.
    expect(body).not.toMatch(
      /'public'\s*\n\s*OR EXISTS \(\s*\n\s*SELECT 1 FROM public\.community_follows/,
    );
  });

  test("community_get_profile's posts list scopes its follows arm the same way", () => {
    const body = BODIES.community_get_profile;
    expect(body).toContain("OR (p.visibility = 'followers'");
    expect(body).not.toMatch(
      /v_target = v_uid\s*\n\s*OR EXISTS \(SELECT 1 FROM public\.community_follows/,
    );
  });

  test('every follows test in either body sits inside a visibility branch', () => {
    for (const name of ['_community_can_view_post', 'community_get_profile']) {
      const body = BODIES[name];
      const follows = (body.match(/FROM public\.community_follows/g) || []).length;
      const scoped = (body.match(/visibility = 'followers'/g) || []).length;
      expect(follows).toBeGreaterThan(0);
      expect(scoped).toBeGreaterThanOrEqual(follows);
    }
  });

  test('a groups post reaches only the feeds of the groups it names', () => {
    // The defect: the pre-existing "author is a current member of this
    // group" arm had no visibility test either, so a post addressed to
    // group X surfaced in group Y's feed whenever its author was in Y and
    // the viewer happened to be in X (all _community_can_view_post asks).
    expect(BODIES.community_group_feed).toContain(
      "(r.visibility <> 'groups' AND EXISTS (",
    );
  });
});

describe('PART B review: an auto item is consent-gated on the server', () => {
  // The defect: _auto was stored "as-is on the row" on the client's word.
  // An ambient item is Article 9 training data published with no compose
  // step (20-BLUEPRINT.md section 8, tightening R3), so the toggle that is
  // its lawful basis has to be a fact this function establishes itself.
  test('community_create_post re-reads share_sessions and refuses when it is off', () => {
    const body = BODIES.community_create_post;
    expect(body).toContain('IF coalesce(_auto, false) THEN');
    expect(body).toContain('SELECT p.share_sessions, p.sessions_audience');
    expect(body).toContain(
      'IF NOT coalesce(v_share_sessions, false) THEN\n'
      + "      RAISE EXCEPTION USING message = 'not_allowed';",
    );
  });

  test('an auto item is never wider than the audience its owner chose', () => {
    const body = BODIES.community_create_post;
    expect(body).toContain("WHEN 'everyone' THEN 'public'");
    expect(body).toContain("WHEN 'groups'   THEN 'groups'");
    expect(body).toContain("IF v_vis <> 'followers' AND v_vis <> v_auto_vis THEN");
  });

  test('a minor never gets an auto item above followers, belt and braces', () => {
    expect(BODIES.community_create_post).toContain(
      "IF v_vis <> 'followers' AND public._community_caller_is_minor(v_uid) THEN\n"
      + "      RAISE EXCEPTION USING message = 'minor_restricted';",
    );
  });
});

describe('PART B review: a retried offline flush costs nothing', () => {
  // The defect: the ON CONFLICT made the WRITE idempotent, but the rate
  // rail was spent before it was ever reached. Three retries of one
  // pending item exhausted a new member's whole day of three, and the
  // queue could then never drain.
  test('an already-flushed client_ref returns before the rate rail runs', () => {
    const body = BODIES.community_create_post;
    const shortCircuit = body.indexOf('IF v_client_ref IS NOT NULL THEN\n    SELECT p.id INTO v_id');
    const rail = body.indexOf("_community_rate_check(v_uid, 'post', 3, 10)");
    expect(shortCircuit).toBeGreaterThan(-1);
    expect(rail).toBeGreaterThan(-1);
    expect(shortCircuit).toBeLessThan(rail);
  });

  test('the ON CONFLICT backstop is still there for two flushes landing at once', () => {
    expect(BODIES.community_create_post).toContain(
      'ON CONFLICT (author_id, client_ref) WHERE client_ref IS NOT NULL',
    );
  });
});

describe('PART B review: community_respect_all validates before it charges', () => {
  test('the group scope casts its key inside a guarded block, like the gym scope', () => {
    const body = BODIES.community_respect_all;
    expect(body).toContain('      v_group_id := _scope_key::uuid;');
    // The unguarded cast (a raw 22P02 reaching the client) must not return,
    // in the membership check or in the scope CTE.
    expect(body).not.toContain('m.group_id = _scope_key::uuid');
    expect(body).not.toContain('gm.group_id = _scope_key::uuid');
  });

  test('the 10/hour rail is spent only after every scope check has passed', () => {
    const body = BODIES.community_respect_all;
    const rail = body.indexOf("_community_rate_check(v_uid, 'respect_all'");
    expect(rail).toBeGreaterThan(-1);
    for (const check of [
      "IF _scope = 'group' THEN",
      "IF _scope = 'age_band' AND v_me.tp_age_band IS NULL THEN",
      "IF _scope = 'gym' THEN",
      "IF _scope = 'area' THEN",
    ]) {
      expect(body.indexOf(check)).toBeGreaterThan(-1);
      expect(body.indexOf(check)).toBeLessThan(rail);
    }
  });

  test('community_post_set_note is railed at a flat 10/hour, matching the contract', () => {
    expect(BODIES.community_post_set_note).toContain(
      "_community_rate_check(v_uid, 'post_set_note', 10, 10, interval '1 hour')",
    );
  });
});

describe('PART B review: the lead rulings of 2026-09-10', () => {
  test('an auto item sits on its own post_auto rail, 12 a UK-local day, flat', () => {
    const body = BODIES.community_create_post;
    expect(body).toContain(
      "PERFORM public._community_rate_check(v_uid, 'post_auto', 12, 12, now() - v_day_start);",
    );
    // A real UK-local day, not the helper's default rolling 24 hours.
    expect(body).toContain(
      "v_day_start := date_trunc('day', timezone('Europe/London', now())) AT TIME ZONE 'Europe/London';",
    );
  });

  test('a manual post keeps the untouched 3/10 rail, and neither rail can eat the other', () => {
    const body = BODIES.community_create_post;
    expect(body).toContain(
      "  ELSE\n    PERFORM public._community_rate_check(v_uid, 'post', 3, 10);\n  END IF;",
    );
    expect((body.match(/_community_rate_check/g) || [])).toHaveLength(2);
  });

  test('a note cannot be set on a post moderation has hidden', () => {
    expect(BODIES.community_post_set_note).toContain(
      "IF v_r.status <> 'visible' THEN RAISE EXCEPTION USING message = 'not_allowed'; END IF;",
    );
  });

  test('the contract states all three rulings for the client lane', () => {
    const contract = fs.readFileSync(path.join(
      ROOT, 'docs', 'communities-revamp-2026-09-10', '22-MIGRATION-170A-CONTRACT.md',
    ), 'utf8');
    expect(contract).toContain('**12 per UK-local day**');
    expect(contract).toContain('**`null` for any non-member**');
    expect(contract).toContain('`not_allowed` on one moderation has hidden');
  });
});

describe('PART B review: c_planned_per_week is bounded at 14', () => {
  test('the clamp is 0..14, never the old 21', () => {
    const body = BODIES.community_upsert_profile;
    expect(body).toContain(
      "greatest(0, least((_p ->> 'c_planned_per_week')::int, 14))",
    );
    expect(body).not.toContain("'c_planned_per_week')::int, 21");
  });
});

describe('PART B review: the acceptance block catches what it says it catches', () => {
  test('it proves the two OLD overloads are actually gone, not just that the new ones exist', () => {
    expect(ACCEPTANCE).toContain(
      "to_regprocedure('public.community_upsert_profile(jsonb)') IS NOT NULL",
    );
    expect(ACCEPTANCE).toContain(
      "to_regprocedure('public.community_create_post(text, jsonb, text, uuid, text)') IS NOT NULL",
    );
  });

  test('the new tables are proved free of WRITE grants too, not SELECT alone', () => {
    for (const t of ['community_post_groups', 'community_notify_daily']) {
      for (const role of ['authenticated', 'anon']) {
        expect(ACCEPTANCE).toContain(
          `has_table_privilege('${role}', 'public.${t}', 'SELECT, INSERT, UPDATE, DELETE')`,
        );
      }
    }
  });
});

describe('PART B review: the daily digest collapses even under a burst', () => {
  // The defect: SELECT, then send, then INSERT. Two Respects for the same
  // recipient landing in the same moment - exactly what several people
  // tapping "Respect everyone" produces - both read "no row", both pushed,
  // and the losing INSERT's duplicate key was only logged.
  test('the day is claimed with an INSERT before the send, not after it', () => {
    const claim = NOTIFY_FN.indexOf(
      ".insert({ recipient: targetUserId, day: notifyDailyDay, count: 1 })",
    );
    const send = NOTIFY_FN.indexOf('functions/v1/send-push');
    expect(claim).toBeGreaterThan(-1);
    expect(send).toBeGreaterThan(-1);
    expect(claim).toBeLessThan(send);
  });

  test('a duplicate key is the collapse signal, not an error to log and push through', () => {
    expect(NOTIFY_FN).toContain("(claimErr as { code?: string }).code !== '23505'");
  });

  test('a failed send releases the day rather than silencing it', () => {
    expect(NOTIFY_FN).toContain('if (notifyDailyClaimed && notifyDailyDay) {');
    expect(NOTIFY_FN).toContain("[community-notify] daily-collapse release failed");
  });

  test('the daily table has a stated retention rule and a prune that enforces it', () => {
    expect(SQL).toContain('reviewer 2026-09-10 (B): RETENTION.');
    expect(NOTIFY_FN).toContain('const NOTIFY_DAILY_RETENTION_DAYS = 7');
    expect(NOTIFY_FN).toContain('.lt(\'day\', cutoff)');
  });

  test('the collapsed push names nobody, in its body or in its payload', () => {
    expect(NOTIFY_FN).toContain(
      "return { title: 'Community', body: 'Someone gave your training respect' }",
    );
    expect(NOTIFY_FN).toContain(
      "...(kind === 'reaction' ? {} : { actor_handle: handle }),",
    );
    expect(NOTIFY_FN).not.toContain('\n          actor_handle: handle,\n');
  });

  test('the day key is UK-local and the collapse only ever touches a reaction', () => {
    expect(NOTIFY_FN).toContain("timeZone: 'Europe/London'");
    expect(NOTIFY_FN).toContain("if (kind === 'reaction') {\n    notifyDailyDay = ukLocalDayKey()");
    // Quiet hours and the ED flag both still return before the claim is
    // ever taken, so a held push never burns the day.
    const quiet = NOTIFY_FN.indexOf('Step 4a: quiet hours');
    const edFlag = NOTIFY_FN.indexOf("Step 5: the recipient's open ED/wellbeing flag");
    const claim = NOTIFY_FN.indexOf('Step 5c: the daily Respect collapse');
    expect(quiet).toBeLessThan(claim);
    expect(edFlag).toBeLessThan(claim);
  });
});
