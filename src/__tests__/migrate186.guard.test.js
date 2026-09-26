/**
 * migrate_186_community_sharing_never_on_unasked.sql (register D212): the
 * server never switches Community sharing on without the person's own on.
 *
 * Found 2026-09-26 after migrate_184 was applied: the Join screen created a
 * profile without the "Share what I did" choice and published it afterwards
 * only when it was on, while 184 made an omitted choice on a NEW profile mean
 * ON, so a person who switched sharing off before "Create profile" would have
 * been stored as sharing. The app now sends the choice with the create
 * (CommunityJoin.test.js pins it); this file protects the builds already
 * installed.
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL: the file is
 * WRITTEN, NOT APPLIED until the founder's phrase, so only source can check it.
 *   - It re-issues community_upsert_profile IN FULL from migrate_184, and a
 *     re-issue that drifts from its source silently changes behaviour nobody
 *     asked to change, so the body is diffed against 184's line by line: the
 *     ONLY removed line is 184's ON fallback, and the only added lines are
 *     the OFF fallback and its marked comment.
 *   - The audience fallback (everyone for an adult, followers for a minor),
 *     the minor refusal of everyone and the grants are untouched.
 *   - The house header, the acceptance block, and a ledger row marked
 *     pending until an apply record exists.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const M186 = read('supabase/migrate_186_community_sharing_never_on_unasked.sql');
const M184 = read('supabase/migrate_184_community_sharing_default_on.sql');

const UPSERT_SIG = 'CREATE OR REPLACE FUNCTION public.community_upsert_profile(_p jsonb, _remove_shared boolean DEFAULT false)';

function fnSpan(text, startMarker) {
  const start = text.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const endMarker = '\nEND $$;';
  const end = text.indexOf(endMarker, start) + endMarker.length;
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

describe('migrate_186: house shape', () => {
  const HEADER = M186.slice(0, M186.indexOf('-- ─── Part 1'));

  test('the header carries every mandatory field and names the defect it closes', () => {
    for (const field of ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:', 'Transaction:', 'Depends on:']) {
      expect(HEADER).toContain(field);
    }
    expect(HEADER).toContain('run against production');
    expect(HEADER).toMatch(/Applied remotely:\s+NO/);
    expect(HEADER).toContain('D212');
  });

  test('outside the one function it only re-grants: no table, column or data change', () => {
    const body = fnSpan(M186, UPSERT_SIG);
    const rest = M186.replace(body, '');
    const beforeAcceptance = rest.slice(0, rest.indexOf('-- ─── Part 2'));
    const code = beforeAcceptance.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--'));
    expect(code).toEqual([
      'REVOKE ALL ON FUNCTION public.community_upsert_profile(jsonb, boolean) FROM PUBLIC, anon;',
      'GRANT EXECUTE ON FUNCTION public.community_upsert_profile(jsonb, boolean) TO authenticated;',
    ]);
    const codeOnly = M186.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect((codeOnly.match(/CREATE OR REPLACE FUNCTION/g) || []).length).toBe(1);
  });
});

describe('migrate_186: community_upsert_profile is 184\'s body with one change', () => {
  const oldBody = fnSpan(M184, UPSERT_SIG);
  const newBody = fnSpan(M186, UPSERT_SIG);

  test('the only line removed is 184\'s ON fallback, and the only code line added is the OFF fallback', () => {
    const { removed, added } = lineDelta(oldBody, newBody);
    expect(removed).toEqual(['  v_share_sessions := true;']);
    const addedCode = added.filter((l) => !l.trim().startsWith('--'));
    expect(addedCode).toEqual(['  v_share_sessions := false;']);
    // Every added comment line is marked as this migration's.
    const addedComments = added.filter((l) => l.trim().startsWith('--'));
    expect(addedComments[0]).toContain('migrate_186 (register D212');
  });

  test('the audience fallback, the minor refusal and the explicit-value path are untouched', () => {
    expect(newBody).toContain("CASE WHEN v_minor THEN 'followers' ELSE 'everyone' END");
    expect(newBody).toContain("IF v_sessions_audience = 'everyone' THEN");
    expect(newBody).toContain("IF jsonb_typeof(_p -> 'share_sessions') = 'boolean' THEN");
    expect(newBody).toContain("v_share_sessions := (_p ->> 'share_sessions')::boolean;");
  });

  test('grants: executable by authenticated, never by anon', () => {
    expect(M186).toContain('REVOKE ALL ON FUNCTION public.community_upsert_profile(jsonb, boolean) FROM PUBLIC, anon;');
    expect(M186).toContain('GRANT EXECUTE ON FUNCTION public.community_upsert_profile(jsonb, boolean) TO authenticated;');
  });
});

describe('migrate_186: the acceptance block', () => {
  const ACCEPT = M186.slice(M186.indexOf('-- ─── Part 2'));

  test('fails if the fallback is not off, or if the audience fallback, minor refusal or grants moved', () => {
    expect(ACCEPT).toContain("position('v_share_sessions := false;' IN v_up) = 0");
    expect(ACCEPT).toContain("position('v_share_sessions := true;' IN v_up) > 0");
    expect(ACCEPT).toMatch(/minor-aware audience fallback is missing/);
    expect(ACCEPT).toMatch(/minor refusal of everyone is missing/);
    expect(ACCEPT).toMatch(/grants are wrong/);
    expect(ACCEPT).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|CREATE)\b/);
  });
});

describe('migrate_186 is in the ledger as pending, never as applied', () => {
  test('its ledger row is marked PENDING', () => {
    const README = read('supabase/README.md');
    const row = README.split('\n').find((l) => l.startsWith('| 186 | `migrate_186_community_sharing_never_on_unasked.sql` |'));
    expect(row).toBeDefined();
    expect(row).toContain('**PENDING');
    expect(row).not.toMatch(/\*\*APPLIED/);
  });
});
