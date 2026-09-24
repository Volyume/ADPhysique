/**
 * communityNotify.groupProof.guard.test.js - R-02 (item 1 reviewer, surfaced
 * to founder order 2026-09-22 item 9): the `group_accepted` proof branch in
 * `supabase/functions/community-notify/index.ts` had no recency filter,
 * unlike its two siblings `group_request` and `group_invited`.
 *
 * WHAT THIS SUITE PINS: all three group-proof branches carry the same
 * `.gte('joined_at', sinceIso)` recency bound. Source-pinned because this
 * is a Deno Edge Function this Jest suite cannot execute (the same reason
 * `edgeBodyLimits.guard.test.js` and `dbFunctionPrivilege.contract.test.js`
 * read source as text rather than run it). Deploys only by manual dispatch
 * under the founder's exact phrase, never CI (CLAUDE.md § 2, "Database
 * schema"; this is not a migration, but the same production gate applies
 * to any Edge Function redeploy - supabase/README.md's own 170 status
 * block records the deploy path used for this same function).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE = fs.readFileSync(
  path.join(ROOT, 'supabase', 'functions', 'community-notify', 'index.ts'), 'utf8',
);

const BRANCH_START = SOURCE.indexOf(
  "} else if (kind === 'group_request' || kind === 'group_accepted' || kind === 'group_invited') {",
);
const BRANCH_END = SOURCE.indexOf("} else if (kind === 'message') {", BRANCH_START);
const BRANCH = SOURCE.slice(BRANCH_START, BRANCH_END);

describe('community-notify: the three group proof branches (R-02)', () => {
  test('the group proof branches exist and are found', () => {
    expect(BRANCH_START).toBeGreaterThan(-1);
    expect(BRANCH_END).toBeGreaterThan(BRANCH_START);
  });

  test("all three branches carry the same recency bound, .gte('joined_at', sinceIso), exactly once each", () => {
    // Statement lines only: the comment above the branch also describes the
    // fix in prose and must not be counted as a fourth occurrence.
    const codeLines = BRANCH.split('\n').filter((l) => !l.trim().startsWith('//'));
    const matches = codeLines.join('\n').match(/\.gte\('joined_at', sinceIso\)/g) ?? [];
    // group_request, group_invited, group_accepted: one each, none doubled.
    expect(matches).toHaveLength(3);
  });

  test('group_accepted (the final else branch) selects joined_at and gates on it, matching its two siblings', () => {
    const elseAt = BRANCH.lastIndexOf('} else {');
    expect(elseAt).toBeGreaterThan(-1);
    const acceptedBranch = BRANCH.slice(elseAt);
    expect(acceptedBranch).toContain("select('user_id, state, joined_at')");
    expect(acceptedBranch).toContain("eq('state', 'member')");
    expect(acceptedBranch).toContain(".gte('joined_at', sinceIso)");
    // Built the same shape as its two siblings: eq(state) before
    // gte(joined_at), then limit/maybeSingle.
    const stateAt = acceptedBranch.indexOf("eq('state', 'member')");
    const gteAt = acceptedBranch.indexOf(".gte('joined_at', sinceIso)");
    const limitAt = acceptedBranch.indexOf('.limit(1)');
    const singleAt = acceptedBranch.indexOf('.maybeSingle()');
    expect(stateAt).toBeGreaterThan(-1);
    expect(gteAt).toBeGreaterThan(stateAt);
    expect(limitAt).toBeGreaterThan(gteAt);
    expect(singleAt).toBeGreaterThan(limitAt);
  });

  test('group_request and group_invited keep their own recency bound unweakened', () => {
    const requestAt = BRANCH.indexOf("if (kind === 'group_request') {");
    const invitedAt = BRANCH.indexOf("else if (kind === 'group_invited') {");
    const acceptedAt = BRANCH.lastIndexOf('} else {');
    const requestBranch = BRANCH.slice(requestAt, invitedAt);
    const invitedBranch = BRANCH.slice(invitedAt, acceptedAt);
    for (const branch of [requestBranch, invitedBranch]) {
      expect(branch).toContain("select('user_id, state, joined_at')");
      expect(branch).toContain(".gte('joined_at', sinceIso)");
    }
    expect(requestBranch).toContain("eq('state', 'requested')");
    expect(invitedBranch).toContain("eq('state', 'invited')");
  });

  test('the comment block records the fix, why it is sound, and that it is belt-and-braces only', () => {
    expect(BRANCH).toContain('RE-ANCHORED 2026-09-24');
    expect(BRANCH).toContain('R-02');
    expect(BRANCH).toContain('community_group_approve');
    expect(BRANCH).toContain('joined_at = now()');
    expect(BRANCH).toContain('ACTIVITY_BACKED_KINDS');
    expect(BRANCH).toMatch(/[Bb]elt and braces/);
  });

  test('the belt-and-braces activity-row recency check still exists downstream, unweakened', () => {
    const activityAt = SOURCE.indexOf('(ACTIVITY_BACKED_KINDS as string[]).includes(kind)');
    expect(activityAt).toBeGreaterThan(-1);
    const activityBlock = SOURCE.slice(activityAt, activityAt + 900);
    expect(activityBlock).toContain(".gte('created_at', sinceIso)");
    expect(activityBlock).toContain('pushed_at');
  });

  test('group_accepted is activity-backed, so the downstream replay/recency guard also applies to it', () => {
    const at = SOURCE.indexOf('const GROUP_KINDS');
    const line = SOURCE.slice(at, SOURCE.indexOf('\n', at));
    expect(line).toContain("'group_accepted'");
    const arrayStart = SOURCE.indexOf('= [', SOURCE.indexOf('const ACTIVITY_BACKED_KINDS'));
    const activityKindsBlock = SOURCE.slice(arrayStart, SOURCE.indexOf(']', arrayStart) + 1);
    expect(activityKindsBlock).toContain('...GROUP_KINDS');
  });

  test('sinceIso is the one shared ten-minute recency window, not a second one invented for this fix', () => {
    const sinceDecl = SOURCE.match(/const sinceMs = Date\.now\(\) - 10 \* 60 \* 1000\n\s*const sinceIso = new Date\(sinceMs\)\.toISOString\(\)/);
    expect(sinceDecl).not.toBeNull();
    // Declared exactly once in the whole file.
    expect(SOURCE.match(/const sinceIso = /g)).toHaveLength(1);
  });
});
