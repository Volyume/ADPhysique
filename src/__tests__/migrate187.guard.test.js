/**
 * migrate_187_community_posts_accept_everyone.sql: automatic Community posts
 * from the builds already installed reach the server. Founder report
 * 2026-09-27: his workout was not shared automatically. The production log
 * showed the app sent its automatic posts with visibility 'everyone' (the
 * sharing setting's word) and community_create_post refused every one as
 * invalid_input, because a post's visibility is 'public', 'followers' or
 * 'groups'. The app now sends 'public'; this file protects the builds that
 * cannot be replaced now.
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL: the file is
 * WRITTEN, NOT APPLIED until the founder's phrase, so only source can check it.
 *   - It re-issues community_create_post IN FULL from migrate_178, and a
 *     re-issue that drifts from its source silently changes behaviour nobody
 *     asked to change, so the body is diffed against 178's line by line:
 *     nothing removed, and the only added lines are the 'everyone' reading
 *     and its marked comment, placed before the visibility check.
 *   - The automatic-post rule (the person's own setting, minors held to
 *     followers) and the grants are untouched.
 *   - The house header, the acceptance block, and a ledger row.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const M187 = read('supabase/migrate_187_community_posts_accept_everyone.sql');
const M178 = read('supabase/migrate_178_community_note_posts.sql');
const README = read('supabase/README.md');

const SIG = 'CREATE OR REPLACE FUNCTION public.community_create_post(';

function fnSpan(text) {
  const start = text.indexOf(SIG);
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf('$$;', text.indexOf('AS $$', start) + 5) + 3;
  return text.slice(start, end);
}

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

describe('migrate_187: house shape', () => {
  const HEADER = M187.slice(0, M187.indexOf('-- ─── Part 1'));

  test('the header carries every mandatory field and names the report it answers', () => {
    for (const field of ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:', 'Transaction:', 'Depends on:']) {
      expect(HEADER).toContain(field);
    }
    expect(HEADER).toContain('run against production');
    expect(HEADER).toContain('2026-09-27');
    expect(HEADER).toContain('invalid_input');
  });

  test('outside the one function it only re-grants: no table, column or data change', () => {
    const rest = M187.replace(fnSpan(M187), '');
    const beforeAcceptance = rest.slice(rest.indexOf('-- ─── Part 1'), rest.indexOf('-- ─── Part 2'));
    const statements = beforeAcceptance.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--'));
    expect(statements).toEqual([
      'REVOKE ALL ON FUNCTION public.community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[]) FROM PUBLIC, anon;',
      'GRANT EXECUTE ON FUNCTION public.community_create_post(text, jsonb, text, uuid, text, boolean, text, uuid[]) TO authenticated;',
    ]);
    // The function's own INSERTs are 178's, checked line by line below; the
    // rest of the file changes no table, column or row.
    const code = rest.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--')).join('\n');
    expect(code).not.toMatch(/\b(ALTER|DROP|INSERT|UPDATE|DELETE|TRUNCATE)\b/);
  });
});

describe('migrate_187: community_create_post is 178 plus the one reading', () => {
  const body178 = fnSpan(M178);
  const body187 = fnSpan(M187);

  test('nothing removed; the only additions are the reading and its marked comment', () => {
    const { removed, added } = lineDelta(body178, body187);
    expect(removed).toEqual([]);
    expect(added.filter((l) => !l.trim().startsWith('--'))).toEqual([
      "  IF v_vis = 'everyone' THEN v_vis := 'public'; END IF;",
    ]);
    expect(added.filter((l) => l.trim().startsWith('--')).join(' ')).toContain('migrate_187');
  });

  test("the reading comes after the visibility is read and before it is checked", () => {
    const read = body187.indexOf("v_vis := coalesce(nullif(btrim(coalesce(_visibility, '')), ''), 'public');");
    const reading = body187.indexOf("IF v_vis = 'everyone' THEN v_vis := 'public'; END IF;");
    const check = body187.indexOf("IF v_vis NOT IN ('public', 'followers', 'groups') THEN");
    expect(read).toBeGreaterThan(-1);
    expect(reading).toBeGreaterThan(read);
    expect(check).toBeGreaterThan(reading);
  });

  test("the automatic-post rule is unchanged: the person's own setting, and minors held to followers", () => {
    expect(body187).toContain("WHEN 'everyone' THEN 'public'");
    expect(body187).toContain("IF v_vis <> 'followers' AND v_vis <> v_auto_vis THEN");
    expect(body187).toContain("IF v_vis <> 'followers' AND public._community_caller_is_minor(v_uid) THEN");
    expect(body187).toContain('IF NOT coalesce(v_share_sessions, false) THEN');
  });
});

describe('migrate_187: acceptance and ledger', () => {
  test('the acceptance block checks the live body and the grants, read-only', () => {
    const acceptance = M187.slice(M187.indexOf('-- ─── Part 2'));
    expect(acceptance).toContain("IF v_vis = ''everyone'' THEN v_vis := ''public''; END IF;");
    expect(acceptance).toContain("has_function_privilege('anon'");
    expect(acceptance).toContain("has_function_privilege('authenticated'");
    expect(acceptance).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|DROP)\b/);
  });

  test('the README ledger carries a row for 187', () => {
    expect(README).toMatch(/\| 187 \| `migrate_187_community_posts_accept_everyone\.sql` \|/);
  });
});
