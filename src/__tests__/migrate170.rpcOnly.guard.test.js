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
const ACCEPTANCE = SQL.slice(SQL.indexOf('-- ─── Acceptance check'));

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

// The eight the client may call, with the exact signature each REVOKE/GRANT
// pair names. A helper must never appear here. community_dimension_recent
// and community_group_get are part A2 additions (community_group_get was
// already a client RPC before migrate_170 touched it; it is re-issued here
// only to align its member_count, on the same unchanged signature).
const PUBLIC_RPCS = {
  community_upsert_profile: 'community_upsert_profile(jsonb)',
  community_dimension: 'community_dimension(text, text, text, int)',
  community_dimensions_me: 'community_dimensions_me(text)',
  community_board: 'community_board(text, text, text, text, integer, text)',
  community_hub_summary: 'community_hub_summary(text)',
  community_find_people: 'community_find_people(text, text, int, jsonb, text)',
  community_dimension_recent: 'community_dimension_recent(text, text, text, int)',
  community_group_get: 'community_group_get(uuid)',
};
const HELPERS = {
  _community_discipline_key_ok: '_community_discipline_key_ok(text[])',
  _community_discipline_label: '_community_discipline_label(text)',
  _community_profile_card: '_community_profile_card(uuid, uuid)',
  _community_cohort_stats: '_community_cohort_stats(uuid, text, text, text)',
};

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

  test('the GDPR note claims no new consent type and no new table', () => {
    const gdpr = HEADER.slice(HEADER.indexOf('-- GDPR note:'));
    expect(gdpr).toContain('community_visibility');
    expect(gdpr).toContain('not a');
    expect(HEADER).toContain('delete_user_data');
    // No new table means delete_user_data genuinely needs no branch: the file
    // must not silently redefine it either.
    expect(CODE).not.toContain('FUNCTION public.delete_user_data');
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

  test('nothing destructive touches an existing table, and no new table is created', () => {
    expect(CODE).not.toMatch(/DROP TABLE/i);
    expect(CODE).not.toMatch(/DROP COLUMN/i);
    expect(CODE).not.toMatch(/\bTRUNCATE\b/i);
    expect(CODE).not.toMatch(/CREATE TABLE/i);
    expect(CODE).not.toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(CODE).not.toMatch(/CREATE POLICY/i);
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

  test.each(Object.keys(HEADERS))('%s pins search_path to public, pg_temp', (name) => {
    // Both spellings are the same stored proconfig value
    // (`search_path=public, pg_temp`); community_board carries the
    // pg_get_functiondef form because migrate_169's body was pulled live.
    expect(HEADERS[name]).toMatch(
      /SET search_path (= public, pg_temp|TO 'public', 'pg_temp')/,
    );
  });

  test('the acceptance check re-asserts both facts against pg_proc', () => {
    expect(ACCEPTANCE).toContain("NOT ('search_path=public, pg_temp' = ANY (p.proconfig))");
    expect(ACCEPTANCE).toContain('NOT p.prosecdef');
  });
});

describe('EXECUTE is granted deliberately, never by default', () => {
  test.each(Object.entries(PUBLIC_RPCS))(
    '%s is revoked from PUBLIC and anon, then granted to authenticated only',
    (_name, sig) => {
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
    expect(grantLines).toHaveLength(Object.keys(PUBLIC_RPCS).length);
    for (const line of grantLines) {
      expect(line).not.toMatch(/public\._community_/);
      expect(line).toMatch(/TO authenticated;$/);
    }
  });

  test('nothing anywhere is granted to anon or to PUBLIC', () => {
    expect(CODE).not.toMatch(/GRANT[^\n]*TO (anon|PUBLIC)/i);
  });

  test('every declared function is either a public RPC or a revoked helper', () => {
    for (const name of DECLARED) {
      expect(
        Object.keys(PUBLIC_RPCS).includes(name) || Object.keys(HELPERS).includes(name),
      ).toBe(true);
    }
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

  test('the rate-railed set is exactly the six writers/reads plus the part A2 recent-stories read', () => {
    expect(RAILED.sort()).toEqual([
      'community_board', 'community_dimension_recent', 'community_dimensions_me',
      'community_find_people', 'community_hub_summary', 'community_upsert_profile',
    ]);
  });

  test.each(['community_board', 'community_dimension_recent', 'community_dimensions_me',
    'community_find_people', 'community_hub_summary', 'community_upsert_profile'])(
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
      'community_find_people', 'community_dimensions_me', 'community_dimension_recent']) {
      expect(ACCEPTANCE).toContain(`${name} is not VOLATILE`);
    }
  });

  test('the STABLE helpers really are read-only', () => {
    for (const name of ['_community_profile_card', '_community_cohort_stats']) {
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
    ['community_group_get', 1],
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
    // migrate_165); the two new/changed RPCs validate a SUPPLIED value and
    // fall back for an absent one (lead ruling 1). Either way a malformed
    // value is refused, and no function ever substitutes the server's date.
    expect((CODE.match(/(_today|v_today) !~ /g) || [])).toHaveLength(3);
    expect(CODE).not.toContain('now()::date');
    expect(BODIES.community_board).toContain('IF _today IS NULL OR _today !~ ');
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
  ])('%s calls _community_is_blocked on all %i of its query paths', (name, n) => {
    expect((BODIES[name].match(/_community_is_blocked/g) || [])).toHaveLength(n);
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
      groupGet.indexOf("v_out := v_out - 'member_count' - 'blurb';"),
    );
    // Deliberately NOT block-aware, unlike community_hub_summary's figure
    // (this card is shown to every member, and to a non-member browsing an
    // open group, not only the caller - see the contract doc).
    expect(groupGet).not.toContain('_community_is_blocked');
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
    expect(README).toContain('170 WRITTEN, NOT APPLIED');
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
});
