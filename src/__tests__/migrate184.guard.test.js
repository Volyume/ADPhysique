/**
 * migrate_184_community_sharing_default_on.sql and
 * migrate_185_community_sharing_flip_existing.sql: the server half of the
 * founder's order of 2026-09-26 (register D194 addendum 2), verbatim: "Flip
 * them all and I test with all. Make the decisions based on the best
 * product. It is on for all users by default. New and existing they can
 * turn it off if they want after."
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL: both files
 * were written before the founder's phrase, so only source could check
 * them; both were APPLIED 2026-09-26 (184 at 13:49 UTC, 185 at 13:50 UTC,
 * apply record in the supabase/README status block), and the suite keeps
 * pinning the source that ran.
 *   - 184 re-issues two long functions IN FULL. A re-issue that drifts from
 *     its source silently changes behaviour nobody asked to change, so the
 *     bodies are re-derived here from migrate_175 and migrate_161 and diffed
 *     line by line: the ONLY removed lines are the two old fallbacks and the
 *     closing line of get_me's result, and the only added lines are the
 *     marked replacements.
 *   - The minor-aware audience fallback: the clamp REFUSES 'everyone' from a
 *     minor, so a plain 'everyone' fallback would break a minor's profile
 *     save. The fallback must name the minor case itself, and the refusal
 *     must survive.
 *   - 185 flips only profiles created before the 2026-09-22 default, always
 *     keeps a minor at followers (stored flag OR a fresh derivation), is
 *     idempotent, and its acceptance block fails on any pre-default row
 *     still off or any minor wider than followers.
 *   - Both carry the house header, their headers record the apply, and
 *     both sit in the supabase/README ledger as applied with the apply
 *     record in the status block.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const M184 = read('supabase/migrate_184_community_sharing_default_on.sql');
const M185 = read('supabase/migrate_185_community_sharing_flip_existing.sql');
const M175 = read('supabase/migrate_175_community_rules_gate_tolerant.sql');
const M161 = read('supabase/migrate_161_community_connections.sql');

function fnSpan(text, startMarker) {
  const start = text.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const endMarker = '\nEND $$;';
  const end = text.indexOf(endMarker, start) + endMarker.length;
  return text.slice(start, end);
}

const UPSERT_SIG = 'CREATE OR REPLACE FUNCTION public.community_upsert_profile(_p jsonb, _remove_shared boolean DEFAULT false)';
const GETME_SIG = 'CREATE OR REPLACE FUNCTION public.community_get_me()';

// Multiset line diff: what the new body removed from, and added to, the old.
function lineDelta(oldBody, newBody) {
  const count = (lines) => lines.reduce((m, l) => m.set(l, (m.get(l) || 0) + 1), new Map());
  const a = count(oldBody.split('\n'));
  const b = count(newBody.split('\n'));
  const removed = [];
  const added = [];
  for (const [line, n] of a) for (let i = (b.get(line) || 0); i < n; i += 1) removed.push(line);
  for (const [line, n] of b) for (let i = (a.get(line) || 0); i < n; i += 1) added.push(line);
  return { removed, added };
}

describe('migrate_184: house shape', () => {
  const HEADER = M184.slice(0, M184.indexOf('-- ─── Part 1'));
  test('the header carries every mandatory field and quotes the order', () => {
    for (const field of ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:', 'Transaction:', 'Depends on:']) {
      expect(HEADER).toContain(field);
    }
    expect(HEADER).toContain('It is on for all users by default.');
    expect(HEADER).toContain('run against production');
    expect(HEADER).toMatch(/Applied remotely:\s+YES - 2026-09-26 13:49 UTC \(written 2026-09-26\)/);
  });

  test('the column default moves for share_sessions only; the audience keeps its narrow backstop', () => {
    expect(M184).toMatch(/ALTER TABLE public\.community_profiles\s+ALTER COLUMN share_sessions SET DEFAULT true;/);
    expect(M184).not.toMatch(/ALTER COLUMN sessions_audience SET DEFAULT/);
    expect(M184).not.toMatch(/\bDROP\s+(TABLE|COLUMN|FUNCTION)\b/i);
  });
});

describe('migrate_184: community_upsert_profile is 175 with two changes and nothing else', () => {
  const OLD = fnSpan(M175, UPSERT_SIG);
  const NEW = fnSpan(M184, UPSERT_SIG);
  const { removed, added } = lineDelta(OLD, NEW);

  test('only the two old fallbacks are removed', () => {
    expect(removed).toEqual([
      '  v_share_sessions := false;',
      "  v_sessions_audience := coalesce(nullif(btrim(coalesce(_p ->> 'sessions_audience', '')), ''), 'followers');",
    ]);
  });

  test('every added line is the ON fallback, the minor-aware audience fallback, or their comments', () => {
    const code = added.filter((l) => !/^\s*--/.test(l));
    expect(code).toEqual([
      '  v_share_sessions := true;',
      "  v_sessions_audience := coalesce(nullif(btrim(coalesce(_p ->> 'sessions_audience', '')), ''),",
      "                                  CASE WHEN v_minor THEN 'followers' ELSE 'everyone' END);",
    ]);
  });

  test('the minor refusal of an explicit everyone survives, after the fallback that avoids it', () => {
    const fallback = NEW.indexOf("CASE WHEN v_minor THEN 'followers' ELSE 'everyone' END");
    const refusal = NEW.indexOf("IF v_sessions_audience = 'everyone' THEN");
    const minorDerived = NEW.indexOf('v_minor := public._community_minor(v_uid);');
    expect(minorDerived).toBeGreaterThan(-1);
    expect(fallback).toBeGreaterThan(minorDerived);
    expect(refusal).toBeGreaterThan(fallback);
  });

  test('the grants are re-stated: authenticated only', () => {
    expect(M184).toContain('REVOKE ALL ON FUNCTION public.community_upsert_profile(jsonb, boolean) FROM PUBLIC, anon;');
    expect(M184).toContain('GRANT EXECUTE ON FUNCTION public.community_upsert_profile(jsonb, boolean) TO authenticated;');
  });
});

describe('migrate_184: community_get_me is 161 plus the two sharing keys', () => {
  const OLD = fnSpan(M161, GETME_SIG);
  const NEW = fnSpan(M184, GETME_SIG);
  const { removed, added } = lineDelta(OLD, NEW);

  test('only the old closing key line is removed (it gains a comma)', () => {
    expect(removed).toEqual(["    'tp_age_band',             v_p.tp_age_band"]);
  });

  test('the added lines are that key with its comma and the two sharing keys', () => {
    const code = added.filter((l) => !/^\s*--/.test(l));
    expect(code).toEqual([
      "    'tp_age_band',             v_p.tp_age_band,",
      "    'share_sessions',          v_p.share_sessions,",
      "    'sessions_audience',       v_p.sessions_audience",
    ]);
  });

  test('the grants are re-stated: authenticated only', () => {
    expect(M184).toContain('REVOKE ALL ON FUNCTION public.community_get_me() FROM PUBLIC, anon;');
    expect(M184).toContain('GRANT EXECUTE ON FUNCTION public.community_get_me() TO authenticated;');
  });
});

describe('migrate_184: the acceptance block checks every change and is read-only', () => {
  const ACCEPT = M184.slice(M184.indexOf('-- ─── Part 4'));
  test('it checks the default, both fallbacks, the refusal, the get_me keys and the grants', () => {
    expect(ACCEPT).toContain("column_name = 'share_sessions'");
    expect(ACCEPT).toContain("position('v_share_sessions := true;' IN v_up)");
    expect(ACCEPT).toContain("CASE WHEN v_minor THEN ''followers'' ELSE ''everyone'' END");
    expect(ACCEPT).toContain("IF v_sessions_audience = ''everyone'' THEN");
    expect(ACCEPT).toContain("'share_sessions''");
    expect(ACCEPT).toContain("'sessions_audience''");
    expect(ACCEPT).toContain("has_function_privilege('anon', 'public.community_get_me()', 'EXECUTE')");
    expect(ACCEPT).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|CREATE)\b/);
  });
});

describe('migrate_185: the one-off flip', () => {
  const HEADER = M185.slice(0, M185.indexOf('-- ─── Part 1'));
  const PART1 = M185.slice(M185.indexOf('-- ─── Part 1'), M185.indexOf('-- ─── Part 2'));
  const ACCEPT = M185.slice(M185.indexOf('-- ─── Part 2'));

  test('the header carries every mandatory field, the order and a rollback by handle', () => {
    for (const field of ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:', 'Transaction:', 'Depends on:']) {
      expect(HEADER).toContain(field);
    }
    expect(HEADER).toContain('Flip them all');
    expect(HEADER).toMatch(/Applied remotely:\s+YES - 2026-09-26 13:50 UTC \(written 2026-09-26\)/);
    expect(HEADER).toContain("WHERE handle = 'alland';");
    expect(HEADER).toContain("WHERE handle = 'allan';");
  });

  test('it flips only profiles created before the 2026-09-22 default', () => {
    expect(PART1).toMatch(/WHERE p\.created_at < timestamptz '2026-09-22 00:00:00\+00'/);
    expect(PART1.match(/UPDATE public\.community_profiles/g)).toHaveLength(1);
  });

  test('a minor is always followers: stored flag OR a fresh derivation, in the SET and the WHERE', () => {
    const minorCase = /WHEN p\.is_minor OR public\._community_minor\(p\.user_id\) THEN 'followers'/g;
    expect(PART1.match(minorCase)).toHaveLength(2);
    expect(PART1).toContain('share_sessions    = true');
  });

  test('it is idempotent: only a row that differs from the target is touched', () => {
    expect(PART1).toContain('p.share_sessions IS DISTINCT FROM true');
    expect(PART1).toContain('p.sessions_audience IS DISTINCT FROM');
  });

  test('the acceptance block fails on a pre-default row still off or a minor wider than followers', () => {
    expect(ACCEPT).toMatch(/pre-default profile\(s\) still have sharing off/);
    expect(ACCEPT).toMatch(/minor profile\(s\) share wider than followers/);
    expect(ACCEPT).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|CREATE)\b/);
  });
});

describe('both files are in the ledger as applied, with the apply record', () => {
  const README = read('supabase/README.md');
  test.each([
    ['184', '`migrate_184_community_sharing_default_on.sql`', '**APPLIED 2026-09-26 13:49 UTC**'],
    ['185', '`migrate_185_community_sharing_flip_existing.sql`', '**APPLIED 2026-09-26 13:50 UTC**'],
  ])('%s has a ledger row marked applied', (n, file, applied) => {
    const row = README.split('\n').find((l) => l.startsWith(`| ${n} | ${file} |`));
    expect(row).toBeDefined();
    expect(row).toContain(applied);
    expect(row).not.toContain('**PENDING');
  });

  test('the status block records the batch, both checksums and the sweep', () => {
    expect(README).toContain('- **184 AND 185 APPLIED 2026-09-26, 13:49 and 13:50 UTC');
    expect(README).toContain('`d8389c40349001b8c304c8ca843550fd` / 27,476 bytes');
    expect(README).toContain('`49898f45b38fbd2c945e23e558056801` / 5,723 bytes');
  });
});
