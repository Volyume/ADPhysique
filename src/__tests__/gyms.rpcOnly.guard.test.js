/**
 * The UK gym directory is RPC-only, exactly like Community (GD-01, GD-14,
 * authority docs/gym-database-2026-09-06/20-BLUEPRINT.md).
 *
 * WHAT THIS SUITE PINS, and why it is written to fail rather than to pass:
 * the directory reuses Community's whole security shape (SD-14) rather than
 * inventing a second one: `gym_brands`, `gym_venues` and `gym_postcode_
 * sectors` are global_read_only (RLS on, exactly one SELECT policy for
 * `authenticated`, no write policy at all -- the same disposition
 * `exercises`/`foods` already carry); `gym_venue_sources`, `gym_venue_
 * history`, `gym_submissions` and `gym_reports` are rpc_only (RLS on, NO
 * policy, ALL privileges revoked from anon and authenticated). Every
 * function this migration declares is SECURITY DEFINER, pinned to
 * `search_path = public, pg_temp`, and EXECUTE is granted deliberately, not
 * by default: gyms_* RPCs and community_set_gyms to `authenticated` only,
 * every `_gyms_*` helper and `_community_gym_key_sync` to nobody. It also
 * pins the founder brief's explicit acceptance lines: no venue data ships
 * in this migration (the seed is a separate, founder-gated file), both
 * moderator RPCs write gym_venue_history, and delete_user_data() covers the
 * two personal-data columns this file introduces.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const MIGRATION = path.join(ROOT, 'supabase', 'migrate_162_gym_directory.sql');
const SQL = fs.readFileSync(MIGRATION, 'utf8');

/** Statement lines only: a rule quoted in a comment proves nothing. */
const CODE_LINES = SQL.split('\n').filter((l) => !l.trim().startsWith('--'));
const CODE = CODE_LINES.join('\n');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Part 1'));

const GLOBAL_READ_ONLY_TABLES = ['gym_brands', 'gym_venues', 'gym_postcode_sectors'];
const RPC_ONLY_TABLES = [
  'gym_venue_sources', 'gym_venue_history', 'gym_submissions', 'gym_reports',
];
const ALL_TABLES = [...GLOBAL_READ_ONLY_TABLES, ...RPC_ONLY_TABLES];

/** Every function this migration declares, with its name and its full header. */
function declaredFunctions() {
  const out = [];
  const re = /CREATE OR REPLACE FUNCTION\s+public\.([a-z_0-9]+)\s*\(/g;
  let m;
  while ((m = re.exec(SQL)) !== null) {
    const name = m[1];
    const bodyStart = SQL.indexOf('AS $$', m.index);
    out.push({ name, header: SQL.slice(m.index, bodyStart === -1 ? m.index + 400 : bodyStart) });
  }
  return out;
}

function signatureList(revokeClause) {
  const at = SQL.indexOf(revokeClause);
  if (at === -1) return [];
  const arrayStart = SQL.lastIndexOf('FOREACH sig IN ARRAY ARRAY[', at);
  if (arrayStart === -1) return [];
  return [...SQL.slice(arrayStart, at).matchAll(/'([a-z_0-9\[\] .]+\([^']*\))'/g)].map((m) => m[1]);
}

const HELPER_SIGNATURES = signatureList(
  "REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated'",
);
const RPC_SIGNATURES = signatureList("REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon'");

const FUNCTIONS = declaredFunctions();
// delete_user_data is re-issued here too (Part 10) but it is not a gyms_*/
// _gyms_* function and its own privilege discipline is pinned by
// dbFunctionPrivilege.contract.test.js against migrate_152, not here.
const GYMS_FUNCTIONS = FUNCTIONS.filter(
  (f) => f.name.startsWith('gyms_') || f.name.startsWith('_gyms_')
    || f.name === 'community_set_gyms' || f.name === '_community_gym_key_sync'
    || f.name === 'community_gym_summary' || f.name === 'community_gym_suggest',
);
const RPCS = GYMS_FUNCTIONS.filter(
  (f) => f.name.startsWith('gyms_') || f.name === 'community_set_gyms'
    || f.name === 'community_gym_summary' || f.name === 'community_gym_suggest',
);
const HELPERS = GYMS_FUNCTIONS.filter(
  (f) => f.name.startsWith('_gyms_') || f.name === '_community_gym_key_sync',
);

describe('the mandatory header is present and honest', () => {
  test.each([
    ['Purpose', /^-- Purpose:/m],
    ['Push', /Push:/],
    ['Pull', /Pull:/],
    ['Applied locally', /^-- Applied locally:/m],
    ['Applied remotely', /^-- Applied remotely:/m],
    ['Safe to re-run', /^-- Safe to re-run:/m],
    ['Rollback', /^-- Rollback:/m],
    ['GDPR note', /^-- GDPR note:/m],
  ])('the header states %s', (_label, re) => {
    expect(HEADER).toMatch(re);
  });

  test('it names its authority document', () => {
    expect(HEADER).toContain('docs/gym-database-2026-09-06/');
    expect(HEADER).toContain('20-BLUEPRINT.md');
  });

  test('Applied remotely still says NO, awaiting the founder phrase', () => {
    expect(HEADER).toMatch(/Applied remotely:\s+NO/);
    expect(HEADER).toContain('run against production');
  });

  test('it records that it depends on 160 and 161 and must never run before them', () => {
    expect(HEADER).toContain('migrate_160_community.sql');
    expect(HEADER).toContain('migrate_161_community_connections.sql');
  });

  test('Applied locally says N/A: this adds no local SQLite table either', () => {
    expect(HEADER).toMatch(/Applied locally:\s+N\/A/);
  });

  test('the seeding convention is stated: schema only, seed is a separate founder-gated file', () => {
    expect(HEADER).toContain('seed_gyms_v1.sql');
    expect(HEADER).toMatch(/SCHEMA[\s\S]{0,40}ONLY/);
  });
});

describe('every statement is re-runnable', () => {
  test('tables and indexes use IF NOT EXISTS', () => {
    const creates = CODE.split('\n').filter((l) => /^CREATE (TABLE|INDEX|UNIQUE INDEX)/i.test(l.trim()));
    expect(creates.length).toBeGreaterThan(0);
    for (const line of creates) expect(line).toMatch(/IF NOT EXISTS/i);
  });

  test('added columns use ADD COLUMN IF NOT EXISTS', () => {
    const adds = CODE.split('\n').filter((l) => /ADD COLUMN/i.test(l));
    expect(adds.length).toBeGreaterThan(0);
    for (const line of adds) expect(line).toMatch(/ADD COLUMN IF NOT EXISTS/i);
  });

  test('every named CHECK is added inside a duplicate_object-tolerant block', () => {
    const blocks = SQL.match(/DO \$\$ BEGIN\s+ALTER TABLE[\s\S]*?EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;/g) || [];
    expect(blocks.length).toBeGreaterThanOrEqual(5);
    const guarded = (blocks.join('\n').match(/ADD CONSTRAINT/g) || []).length;
    const all = (CODE.match(/ADD CONSTRAINT/g) || []).length;
    // Every ADD CONSTRAINT in this file is a NEW constraint on a NEW (or, for
    // community_profiles, additively-widened) table, so all of them go
    // through the duplicate_object-tolerant form; none replaces an existing
    // CHECK the way migrate_161's three widenings did.
    expect(all).toBe(guarded);
  });

  test('every function is CREATE OR REPLACE, never a bare CREATE FUNCTION', () => {
    expect(CODE).not.toMatch(/^CREATE FUNCTION/m);
    expect((CODE.match(/CREATE OR REPLACE FUNCTION/g) || []).length).toBeGreaterThanOrEqual(28);
  });

  test('the one trigger is dropped before it is created', () => {
    const created = [...CODE.matchAll(/CREATE TRIGGER\s+([a-z_0-9]+)/g)].map((m) => m[1]);
    expect(created.length).toBeGreaterThanOrEqual(1);
    for (const name of created) {
      expect(CODE).toMatch(new RegExp(`DROP TRIGGER IF EXISTS ${name} ON`));
    }
  });

  test('every policy is dropped before it is created', () => {
    expect(CODE).toContain("DROP POLICY IF EXISTS %I ON public.%I");
  });

  test('nothing destructive touches an existing table', () => {
    expect(CODE).not.toMatch(/DROP TABLE/i);
    expect(CODE).not.toMatch(/DROP COLUMN/i);
    expect(CODE).not.toMatch(/TRUNCATE/i);
    const drops = CODE.split('\n').filter((l) => /^\s*(ALTER TABLE|DROP)/i.test(l) && /DROP/i.test(l));
    for (const line of drops) {
      expect(line).toMatch(/DROP (TRIGGER IF EXISTS|POLICY IF EXISTS|CONSTRAINT IF EXISTS)/i);
    }
  });

  test('it ends with an acceptance check over the catalogues', () => {
    expect(SQL).toContain('information_schema.tables');
    expect(SQL).toContain('relrowsecurity');
    expect(SQL).toContain('pg_policy');
    expect(SQL).toContain('prosecdef');
  });
});

describe('no venue data ships in this migration', () => {
  test('gym_venues is never populated with a literal row', () => {
    // Every real INSERT INTO gym_venues in this file (inside gyms_submit)
    // uses plpgsql variables (v_id, v_name, ...), never a quoted string
    // literal as the first VALUES element. A seeded/hardcoded row would show
    // up as `VALUES (\n    'something'` or `VALUES ('something'`.
    expect(CODE).not.toMatch(/INSERT INTO public\.gym_venues[\s\S]{0,200}VALUES\s*\(\s*'/);
  });

  test('no brand or venue name is hardcoded anywhere in the file', () => {
    for (const name of ['PureGym', 'Pure Gym', 'The Gym Group', 'Volt Gym', 'Bannatyne',
      'David Lloyd', 'JD Gyms']) {
      expect(SQL).not.toContain(name);
    }
  });
});

describe('every table gets the disposition-exact RLS and grant shape', () => {
  test.each(ALL_TABLES)('%s exists and has RLS enabled', (table) => {
    expect(CODE).toContain(`CREATE TABLE IF NOT EXISTS public.${table} `);
    expect(CODE).toMatch(/ENABLE ROW LEVEL SECURITY/);
  });

  test('the global_read_only loop covers exactly the three catalogue tables, one SELECT policy each', () => {
    const at = CODE.indexOf("FOREACH t IN ARRAY ARRAY['gym_brands', 'gym_venues', 'gym_postcode_sectors']");
    expect(at).toBeGreaterThan(-1);
    const loop = CODE.slice(at, CODE.indexOf('END $$;', at));
    for (const table of GLOBAL_READ_ONLY_TABLES) expect(loop).toContain(`'${table}'`);
    expect(loop).toContain('REVOKE ALL ON public.%I FROM anon, authenticated');
    expect(loop).toContain('GRANT SELECT ON public.%I TO authenticated');
    expect(loop).toContain('FOR SELECT TO authenticated USING (true)');
    // No write verb anywhere in this loop's policy creation.
    expect(loop).not.toMatch(/FOR (INSERT|UPDATE|DELETE)/i);
  });

  test('the rpc_only loop covers exactly the four write-through tables, no policy at all', () => {
    const at = CODE.lastIndexOf("FOREACH t IN ARRAY ARRAY[");
    expect(at).toBeGreaterThan(-1);
    const loop = CODE.slice(at, CODE.indexOf('END $$;', at));
    for (const table of RPC_ONLY_TABLES) expect(loop).toContain(`'${table}'`);
    expect(loop).toContain('REVOKE ALL ON public.%I FROM anon, authenticated');
    expect(loop).not.toMatch(/CREATE POLICY/i);
  });

  test('the migration creates no policy at all for the four rpc_only tables', () => {
    for (const table of RPC_ONLY_TABLES) {
      expect(CODE).not.toMatch(new RegExp(`CREATE POLICY[\\s\\S]{0,80}${table}`));
    }
  });

  test('nothing grants a gym table to anon or authenticated beyond the SELECT loop', () => {
    const grants = CODE_LINES.filter(
      (l) => /GRANT\s/i.test(l) && /gym_/i.test(l) && !/ON FUNCTION/i.test(l),
    );
    for (const line of grants) {
      expect(line).toMatch(/GRANT SELECT ON public\.%I TO authenticated/);
    }
  });
});

describe('every gyms function is a pinned SECURITY DEFINER', () => {
  test('the migration declares both the RPCs and the internal helpers', () => {
    expect(RPCS.length).toBeGreaterThanOrEqual(13);
    expect(HELPERS.length).toBeGreaterThanOrEqual(14);
  });

  test.each(GYMS_FUNCTIONS.map((f) => [f.name, f]))(
    '%s is SECURITY DEFINER with a pinned search_path',
    (_name, fn) => {
      expect(fn.header).toMatch(/SECURITY DEFINER/);
      expect(fn.header).toMatch(/SET search_path = public, pg_temp/);
    },
  );

  test('community_set_gyms is declared', () => {
    expect(RPCS.map((f) => f.name)).toContain('community_set_gyms');
  });
});

describe('EXECUTE is granted deliberately, never by default', () => {
  test('the two privilege loops exist and say the right thing', () => {
    expect(CODE).toContain("REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated'");
    expect(CODE).toContain("REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon'");
    expect(CODE).toContain("GRANT EXECUTE ON FUNCTION public.%s TO authenticated'");
    expect(HELPER_SIGNATURES.length).toBeGreaterThanOrEqual(14);
    expect(RPC_SIGNATURES.length).toBeGreaterThanOrEqual(13);
  });

  test.each(RPCS.map((f) => f.name))('%s is in the grant-to-authenticated list', (name) => {
    expect(RPC_SIGNATURES.some((sig) => sig.startsWith(`${name}(`))).toBe(true);
    expect(HELPER_SIGNATURES.some((sig) => sig.startsWith(`${name}(`))).toBe(false);
  });

  test.each(HELPERS.map((f) => f.name))('%s is in the revoke-from-authenticated list', (name) => {
    expect(HELPER_SIGNATURES.some((sig) => sig.startsWith(`${name}(`))).toBe(true);
    expect(RPC_SIGNATURES.some((sig) => sig.startsWith(`${name}(`))).toBe(false);
  });

  test('no helper is granted to authenticated anywhere', () => {
    const grantLines = CODE_LINES.filter((l) => /GRANT EXECUTE ON FUNCTION/i.test(l));
    for (const line of grantLines) {
      expect(line).not.toMatch(/public\._gyms_/);
      expect(line).not.toMatch(/public\._community_gym_key_sync/);
    }
  });
});

describe('history is written by both moderator review RPCs (GD-12)', () => {
  test.each(['gyms_review_submission', 'gyms_review_report'])('%s writes gym_venue_history on every action', (fn) => {
    const at = CODE.indexOf(`CREATE OR REPLACE FUNCTION public.${fn}(`);
    expect(at).toBeGreaterThan(-1);
    const nextFn = CODE.indexOf('CREATE OR REPLACE FUNCTION public.', at + 10);
    const body = CODE.slice(at, nextFn === -1 ? CODE.length : nextFn);
    expect(body).toMatch(/INSERT INTO public\.gym_venue_history/);
  });

  test('both review RPCs require community_is_moderator()', () => {
    for (const fn of ['gyms_review_submission', 'gyms_review_report']) {
      const at = CODE.indexOf(`CREATE OR REPLACE FUNCTION public.${fn}(`);
      const nextFn = CODE.indexOf('CREATE OR REPLACE FUNCTION public.', at + 10);
      const body = CODE.slice(at, nextFn === -1 ? CODE.length : nextFn);
      expect(body).toContain('community_is_moderator()');
    }
  });
});

describe('GD-11: submission and confirmation follow the founder brief exactly', () => {
  test('gyms_submit rate-limits to 3 a day via the existing rail', () => {
    const at = CODE.indexOf('CREATE OR REPLACE FUNCTION public.gyms_submit(');
    const body = CODE.slice(at, CODE.indexOf('END $$;', at));
    expect(body).toMatch(/_community_rate_check\(v_uid, 'gyms_submit', 3, 3, interval '24 hours'\)/);
  });

  test('gyms_submit returns duplicate_of instead of inserting when GD-06 signals match', () => {
    const at = CODE.indexOf('CREATE OR REPLACE FUNCTION public.gyms_submit(');
    const body = CODE.slice(at, CODE.indexOf('END $$;', at));
    expect(body).toMatch(/RETURN jsonb_build_object\('duplicate_of', v_dup_id, 'display_name', v_dup_name\)/);
    // Review 35 finding 9: every submission is geocoded to the postcode
    // SECTOR centroid, so a 150 m distance test is meaningless and was
    // dropped; the duplicate test is text-only (postcode unit >= 0.6,
    // outward >= 0.85), bounded to the outward code (finding 15) and
    // restricted to a row this caller may SEE (finding 4).
    expect(body).not.toMatch(/<= 150/);
    expect(body).toMatch(/>= 0\.6/);
    expect(body).toMatch(/>= 0\.85/);
    expect(body).toContain('v.outward = public._gyms_outward_of(v_postcode)');
    expect(body).toContain('public._gyms_visible(v, v_uid)');
  });

  test('a second distinct confirmer flips the venue open and verified', () => {
    const at = CODE.indexOf('CREATE OR REPLACE FUNCTION public.gyms_confirm_submission(');
    const body = CODE.slice(at, CODE.indexOf('END $$;', at));
    expect(body).toMatch(/v_distinct >= 2/);
    expect(body).toContain("SET status = 'open', verification_status = 'user_submitted_verified'");
    expect(body).toContain("RAISE EXCEPTION USING message = 'not_allowed'");
  });

  test('gyms_report flags needs_review at two distinct reporters of the same kind', () => {
    const at = CODE.indexOf('CREATE OR REPLACE FUNCTION public.gyms_report(');
    const body = CODE.slice(at, CODE.indexOf('END $$;', at));
    expect(body).toMatch(/v_distinct >= 2/);
    expect(body).toContain('SET needs_review = true');
  });
});

describe('the gyms_* RPCs raise the client contract already committed in src/lib/gyms (GD-09..GD-12)', () => {
  // src/lib/gyms/transport.js GYM_ERROR_CODES is the authoritative client
  // vocabulary for every RPC reached through `callGyms`: `invalid`,
  // `invalid_postcode`, `not_found`, `rate_limited` (from
  // `_community_rate_check`) and `not_signed_in` (from
  // `_community_caller()`). `invalid_input` is Community's OWN convention
  // and belongs only to community_set_gyms (routed through
  // `callCommunity`, not `callGyms`).
  function bodyOf(fnHeader) {
    const at = CODE.indexOf(fnHeader);
    expect(at).toBeGreaterThan(-1);
    const nextFn = CODE.indexOf('CREATE OR REPLACE FUNCTION public.', at + 10);
    return CODE.slice(at, nextFn === -1 ? CODE.length : nextFn);
  }

  test('gyms_submit raises invalid_postcode for postcode failures and invalid for everything else', () => {
    const body = bodyOf('CREATE OR REPLACE FUNCTION public.gyms_submit(');
    expect(body).toContain("RAISE EXCEPTION USING message = 'invalid_postcode'");
    expect(body).toContain("RAISE EXCEPTION USING message = 'invalid'");
    expect(body).not.toContain("'invalid_input'");
  });

  test.each(['gyms_near', 'gyms_report', 'gyms_review_submission', 'gyms_review_report'])(
    '%s never raises invalid_input', (fn) => {
      const body = bodyOf(`CREATE OR REPLACE FUNCTION public.${fn}(`);
      expect(body).not.toContain("'invalid_input'");
    },
  );

  test('gyms_get returns source_names (a flat array), matching src/lib/gyms/index.js get()', () => {
    const body = bodyOf('CREATE OR REPLACE FUNCTION public.gyms_get(');
    expect(body).toContain("'source_names', v_source_names");
    expect(body).not.toMatch(/'sources',\s*v_sources/);
  });

  test('community_set_gyms keeps the Community-side invalid_input convention (routed through callCommunity)', () => {
    const body = bodyOf('CREATE OR REPLACE FUNCTION public.community_set_gyms(');
    expect(body).toContain("RAISE EXCEPTION USING message = 'invalid_input'");
  });
});

describe('GD-14: Community integration', () => {
  test('community_profiles gains gym_id and other_gym_ids, additive and capped at 3', () => {
    expect(CODE).toMatch(/ADD COLUMN IF NOT EXISTS gym_id uuid REFERENCES public\.gym_venues/);
    expect(CODE).toMatch(/ADD COLUMN IF NOT EXISTS other_gym_ids uuid\[\] NOT NULL DEFAULT '\{\}'/);
    expect(CODE).toContain('community_profiles_other_gym_ids_check');
    expect(CODE).toMatch(/array_length\(other_gym_ids, 1\) <= 3/);
  });

  test('the trigger derives gym_key/gym_label from gym_id, never the reverse', () => {
    const at = CODE.indexOf('CREATE OR REPLACE FUNCTION public._community_gym_key_sync()');
    const body = CODE.slice(at, CODE.indexOf('END $$;', at));
    expect(body).toContain("NEW.gym_key := 'gym:' || NEW.gym_id::text");
    // Review 35 findings 1/2: clamped to the same 60 characters
    // community_upsert_profile's own gym_label cap enforces.
    expect(body).toContain('NEW.gym_label := left(v_display, 60)');
    expect(CODE).toMatch(/BEFORE INSERT OR UPDATE OF gym_id ON public\.community_profiles/);
  });

  test('review 35 finding 5: the trigger clears a picker-linked gym_key/gym_label when gym_id goes back to NULL', () => {
    const at = CODE.indexOf('CREATE OR REPLACE FUNCTION public._community_gym_key_sync()');
    const body = CODE.slice(at, CODE.indexOf('END $$;', at));
    expect(body).toMatch(/ELSIF TG_OP = 'UPDATE' AND coalesce\(OLD\.gym_key, ''\) LIKE 'gym:%' THEN/);
    expect(body).toContain('NEW.gym_key := NULL');
    expect(body).toContain('NEW.gym_label := NULL');
  });

  test('community_set_gyms validates every id and caps other gyms at 3', () => {
    const at = CODE.indexOf('CREATE OR REPLACE FUNCTION public.community_set_gyms(');
    const body = CODE.slice(at, CODE.indexOf('END $$;', at));
    expect(body).toMatch(/array_length\(v_others, 1\) > 3/);
    expect(body).toContain('_gyms_selectable(_gym_id, v_uid)');
    expect(body).toContain('_gyms_selectable(v_id, v_uid)');
  });

  test('community_gym_summary resolves a gym:<uuid> key from gym_venues and keeps the legacy path', () => {
    const at = CODE.indexOf('CREATE OR REPLACE FUNCTION public.community_gym_summary(');
    const body = CODE.slice(at, CODE.indexOf("CREATE OR REPLACE FUNCTION public.community_gym_suggest(", at));
    expect(body).toMatch(/v_key LIKE 'gym:%'/);
    // Review 35 finding 4: the gym: branch now applies _gyms_visible, so a
    // pending venue is disclosed only to its submitter.
    expect(body).toMatch(/FROM public\.gym_venues gv\s+WHERE gv\.id = v_gym_uuid AND public\._gyms_visible\(gv, v_uid\)/);
    expect(body).toMatch(
      /SELECT gym_label INTO v_label FROM public\.community_profiles\s+WHERE gym_key = v_key AND status = 'active' AND visibility = 'public'/,
    );
    expect(body).toContain('_community_require_profile(');
    expect(body).toContain("_community_rate_check(v_uid, 'gym_summary'");
  });

  test('community_gym_suggest delegates to gyms_suggest and keeps its own signature', () => {
    const at = CODE.indexOf('CREATE OR REPLACE FUNCTION public.community_gym_suggest(_area_key text, _prefix text DEFAULT NULL)');
    expect(at).toBeGreaterThan(-1);
    const body = CODE.slice(at, CODE.indexOf('END $$;', at));
    expect(body).toMatch(/v_result := public\.gyms_suggest\(v_pre, NULL, NULL\)/);
    expect(body).toContain("RETURN jsonb_build_object('gyms', v_out)");
    expect(body).toContain('_community_require_profile(');
    expect(body).toContain("_community_rate_check(v_uid, 'gym_suggest'");
  });
});

describe('erasure covers the two personal-data columns this file introduces', () => {
  const DELETE_BODY = SQL.slice(
    SQL.indexOf('CREATE OR REPLACE FUNCTION public.delete_user_data()'),
    SQL.indexOf('GRANT EXECUTE ON FUNCTION public.delete_user_data() TO authenticated'),
  );

  test('delete_user_data is re-issued in this migration, keeping every earlier table', () => {
    expect(DELETE_BODY).toContain('CREATE OR REPLACE FUNCTION public.delete_user_data()');
    for (const table of ['workout_sets', 'food_entries', 'users_profile', 'user_prefs',
      'community_profiles', 'community_connections', 'community_messages']) {
      expect(DELETE_BODY).toContain(table);
    }
  });

  test('gym_submissions.submitter_id and gym_reports.reporter_id are anonymised, not deleted', () => {
    expect(DELETE_BODY).toMatch(/UPDATE gym_submissions SET submitter_id = NULL WHERE submitter_id = uid/);
    expect(DELETE_BODY).toMatch(/UPDATE gym_reports SET reporter_id = NULL WHERE reporter_id = uid/);
  });

  test('the users_profile delete stays last', () => {
    const gymIdx = DELETE_BODY.indexOf('gym_submissions SET submitter_id');
    const profileIdx = DELETE_BODY.indexOf('DELETE FROM users_profile WHERE id = uid;');
    expect(gymIdx).toBeGreaterThan(-1);
    expect(profileIdx).toBeGreaterThan(gymIdx);
  });
});

describe('the file is registered in the tracker', () => {
  const README = fs.readFileSync(path.join(ROOT, 'supabase', 'README.md'), 'utf8');

  test('supabase/README.md carries the status entry and a ledger row', () => {
    expect(README).toContain('162 WRITTEN, NOT APPLIED');
    expect(README).toContain('| 162 | `migrate_162_gym_directory.sql` |');
  });
});

describe('the security matrix inventory is updated', () => {
  const inventory = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'scripts', 'security', 'supabase-matrix.targets.json'), 'utf8',
  ));
  const byName = new Map(
    inventory.directPostgrestTables.map((item) => [`${item.schema || 'public'}.${item.table}`, item]),
  );

  test.each(GLOBAL_READ_ONLY_TABLES)('%s is inventoried as global_read_only', (table) => {
    const entry = byName.get(`public.${table}`);
    expect(entry).toBeDefined();
    expect(entry.disposition).toBe('global_read_only');
  });

  test.each(RPC_ONLY_TABLES)('%s is inventoried as rpc_only', (table) => {
    const entry = byName.get(`public.${table}`);
    expect(entry).toBeDefined();
    expect(entry.disposition).toBe('rpc_only');
  });

  test('every gyms_* RPC and community_set_gyms is inventoried', () => {
    for (const name of [
      'gyms_search', 'gyms_near', 'gyms_in_place', 'gyms_get', 'gyms_suggest',
      'gyms_submit', 'gyms_confirm_submission', 'gyms_report',
      'gyms_review_submission', 'gyms_review_report', 'community_set_gyms',
    ]) {
      expect(inventory.clientRpcNames).toContain(name);
    }
    // The internal helpers are NOT client RPCs and must never be listed.
    expect(inventory.clientRpcNames.filter((n) => n.startsWith('_gyms_'))).toEqual([]);
  });
});
