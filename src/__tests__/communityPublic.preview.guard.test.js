/**
 * communityPublic.preview.guard.test.js - Stage 3 spec 3f (D221): link
 * previews from `supabase/functions/community-public/index.ts` (NOT
 * DEPLOYED until the founder's go).
 *
 * WHAT THIS SUITE PINS, source-level (a Deno function Jest cannot run): the
 * preview text is built only by previewProfile / previewPost / previewGroup
 * from an allow-list; those builders never receive or read a note, caption
 * or payload object, and the only numbers they can print are a count of
 * sets (session) and a count of sessions (block); nothing is returned for a
 * private, minor, restricted, suspended or hidden row (the same 404 as
 * before); a group preview exists only for an open, active group and counts
 * members on the in-app predicate.
 */

const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', '..', 'supabase', 'functions', 'community-public', 'index.ts'), 'utf8',
);
const code = SOURCE.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

function fnBody(name) {
  const at = code.indexOf(`function ${name}(`);
  expect(at).toBeGreaterThan(-1);
  const open = code.indexOf('{\n', at);
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === '{') depth += 1;
    if (code[i] === '}') { depth -= 1; if (depth === 0) return code.slice(at, i + 1); }
  }
  throw new Error('unbalanced');
}

describe('community-public previews (3f)', () => {
  const profile = fnBody('previewProfile');
  const post = fnBody('previewPost');
  const group = fnBody('previewGroup');

  test('the exclusions are written into the file header', () => {
    for (const re of [/NEVER the note or caption/, /private profile, a minor, a restricted or suspended/, /OPEN, ACTIVE group only/, /DEPLOYED 2026-10-08/]) {
      expect(SOURCE).toMatch(re);
    }
  });

  test('the builders never receive a note, caption, payload or any other field', () => {
    for (const body of [profile, post, group]) {
      expect(body).not.toMatch(/caption|payload|note|bio|gym_label|area_label|follower|body\b/i);
    }
    expect(post).toMatch(/function previewPost\(displayName: string, postKind: string, sessionsOrSets: \{ sessions\?: unknown; sets\?: unknown \}\)/);
  });

  test('a post preview prints at most a set count (session) or a session count (block)', () => {
    const numbers = post.match(/\$\{[a-zA-Z]+\}/g) ?? [];
    expect(new Set(numbers)).toEqual(new Set(['${displayName}', '${headline}', '${sets}', '${sessions}']));
    expect(post).toMatch(/postKind === 'session' && sets !== null/);
    expect(post).toMatch(/postKind === 'block' && sessions !== null/);
    expect(fnBody('smallCount')).toMatch(/v <= 9999/);
    // The call site hands over exactly two payload members and never the object.
    const call = code.slice(code.indexOf('preview: previewPost('), code.indexOf('preview: previewPost(') + 500);
    expect(call).toMatch(/workingSets/);
    expect(call).toMatch(/\.sessions/);
    expect(call).not.toMatch(/payload: row\.payload|row\.caption|tonnage|weight|exercises|topSet/);
  });

  test('headlines are a fixed list and an unknown post kind falls back to the generic preview', () => {
    expect(post).toMatch(/if \(!headline\) return GENERIC_PREVIEW/);
    expect(code).toMatch(/POST_HEADLINES: Record<string, string> = \{[\s\S]*?note: 'a post',[\s\S]*?\}/);
  });

  test('profile preview: display name, handle and self-declared discipline labels only', () => {
    expect(profile).toMatch(/\$\{displayName\} \(@\$\{handle\}\) on Volyume/);
    expect(profile).toMatch(/\.slice\(0, 2\)/);
    const call = code.slice(code.indexOf('preview: previewProfile('), code.indexOf('preview: previewProfile(') + 120);
    expect(call).toMatch(/previewProfile\(p\.display_name, p\.handle, p\.discipline_keys\)/);
  });

  test('every preview is attached only after the existing visibility gates', () => {
    // post: status/visibility gate and publiclyVisible(author) come before the response
    const postAt = code.indexOf("if (kind === 'post') {");
    const postPreview = code.indexOf('preview: previewPost(');
    expect(code.indexOf("row.status !== 'visible' || row.visibility !== 'public'")).toBeGreaterThan(postAt);
    expect(code.indexOf("row.status !== 'visible' || row.visibility !== 'public'")).toBeLessThan(postPreview);
    expect(code.indexOf('if (!publiclyVisible(author as ProfileRow | null)) return notFound()')).toBeLessThan(postPreview);
    // profile
    const profAt = code.indexOf("if (kind === 'profile') {");
    expect(code.indexOf('if (!publiclyVisible(profile as ProfileRow | null)) return notFound()'))
      .toBeLessThan(code.indexOf('preview: previewProfile('));
    expect(code.indexOf('preview: previewProfile(')).toBeGreaterThan(profAt);
    // publiclyVisible still demands active, public and not a minor.
    expect(code).toMatch(/p\.status === 'active' && p\.visibility === 'public' && p\.is_minor === false/);
  });

  test('group preview: open and active only, members counted active and non-minor, no member names', () => {
    expect(code).toMatch(/g\.access !== 'open' \|\| g\.status !== 'active'\) return notFound\(\)/);
    expect(code).toMatch(/prof\?\.status === 'active' && prof\?\.is_minor === false/);
    expect(group).toMatch(/\$\{name\} on Volyume/);
    expect(group).toMatch(/members training together/);
    const gAt = code.indexOf("if (kind === 'group') {");
    const response = code.slice(gAt, code.indexOf("} catch (e)", gAt));
    expect(response).toMatch(/group: \{ name: g\.name, member_count: memberCount \}/);
    expect(response).not.toMatch(/display_name|handle|blurb|created_by|user_id\b[^']*,\s*$/m);
  });

  test('a hidden post, a private or minor profile and a programme still 404', () => {
    expect(code).toMatch(/if \(kind === 'programme'\) return notFound\(\)/);
    expect(code).toMatch(/row\.status !== 'visible' \|\| row\.visibility !== 'public'\) return notFound\(\)/);
  });

  test('no em dash in the file', () => {
    expect(SOURCE).not.toContain('—');
  });
});
