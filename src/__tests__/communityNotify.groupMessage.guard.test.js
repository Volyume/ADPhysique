/**
 * communityNotify.groupMessage.guard.test.js - Stage 3 spec 3b (D221): the
 * `group_message` kind of `supabase/functions/community-notify/index.ts`
 * (NOT DEPLOYED; version note stays 5).
 *
 * WHAT THIS SUITE PINS, source-level (a Deno function Jest cannot run):
 * the kind exists under the existing `community_message` category; it is
 * proved by the message's author calling within ten minutes, with the
 * recipients resolved SERVER-side; it is collapsed to one push per group per
 * recipient per 15 minutes on community_group_members.last_push_at; the
 * body is "New messages in {group name}"; the data carries `kind` and
 * `group_id` and never a handle or any content; quiet hours, the budget
 * category, mute, block and the fail-closed ED check all still sit in front
 * of it.
 */

const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', '..', 'supabase', 'functions', 'community-notify', 'index.ts'), 'utf8',
);
const code = SOURCE.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

describe('community-notify: group_message (3b)', () => {
  test('the version note stays 5 and lists the addition', () => {
    expect(SOURCE).toMatch(/VERSION 5 \(D221, 2026-10-08\), NOT DEPLOYED/);
    expect(SOURCE).toMatch(/Version 5 also adds \(Stage 3, spec 3b, lane 3S\) the kind `group_message`/);
    expect(SOURCE).not.toMatch(/VERSION 6/);
  });

  test('it is a known kind under community_message, not a follow or activity kind', () => {
    expect(code).toMatch(/\| 'group_message'/);
    expect(code).toMatch(/'reaction', 'comment', 'message', 'group_message',\s*\]/);
    expect(code).toMatch(/kind === 'message' \|\| kind === 'group_message'\) return 'community_message'/);
    const follow = code.slice(code.indexOf('const FOLLOW_KINDS'), code.indexOf('const CONNECT_KINDS'));
    expect(follow).not.toContain('group_message');
    const activity = code.slice(code.indexOf('const ACTIVITY_BACKED_KINDS'), code.indexOf('const MESSAGE_PUSH_COLLAPSE_MS'));
    expect(activity).not.toContain('group_message');
  });

  test('a mute silences it (as it does a DM)', () => {
    expect(code).toMatch(/MUTE_SILENCED_KINDS: Kind\[\] = \[\.\.\.CONNECT_KINDS, 'message', 'group_message'\]/);
  });

  test('ONE call: no target needed, the server resolves recipients through the service-role RPC', () => {
    expect(code).toMatch(/kind !== 'group_message' && !UUID_RE\.test\(targetUserId\)/);
    expect(code).toMatch(/if \(kind === 'group_message'\) \{\s+return await fanOutGroupMessage\(admin, supabaseUrl, serviceRoleKey, actorId, refId\)/);
    const fn = code.slice(code.indexOf('async function fanOutGroupMessage'), code.indexOf('serve(async'));
    expect(fn).toMatch(/admin\.rpc\('community_group_message_recipients', \{\s+_message_id: messageId,/);
    // Proof: caller is the author, message under ten minutes old.
    expect(fn).toMatch(/info\.author_id !== actorId/);
    expect(fn).toMatch(/createdMs < Date\.now\(\) - 10 \* 60 \* 1000/);
    expect(fn).toMatch(/\.slice\(0, 200\)/);
  });

  test('per recipient: toggle, quiet hours, fail-closed ED, 15-minute collapse, then send, then stamp', () => {
    const fn = code.slice(code.indexOf('async function fanOutGroupMessage'), code.indexOf('serve(async'));
    const order = ["eq('category', 'community_message')", "'quiet_hours'", "from('ed_pattern_flags')",
      "select('last_read_at, last_push_at')", '/functions/v1/send-push', 'last_push_at: new Date()'];
    let last = -1;
    for (const needle of order) {
      const at = fn.indexOf(needle);
      expect(at).toBeGreaterThan(last);
      last = at;
    }
    expect(fn).toMatch(/if \(flagErr \|\| openFlag\) continue/);
    expect(fn).toMatch(/prefErr \|\|/);
    expect(fn).toMatch(/MESSAGE_PUSH_COLLAPSE_MS/);
    expect(fn).toMatch(/stillUnread/);
    expect(code).toMatch(/const MESSAGE_PUSH_COLLAPSE_MS = 15 \* 60 \* 1000/);
    // One recipient's failure never stops the rest.
    expect(fn).toMatch(/catch \(e\) \{\s+console\.error\('\[community-notify\] group fan-out failed for one recipient'/);
  });

  test('copy is "New messages in {name}" and carries no content or handle', () => {
    expect(code).toMatch(/case 'group_message':[\s\S]*?body: `New messages in \$\{groupName \?\? 'your group'\}`/);
    const fn = code.slice(code.indexOf('async function fanOutGroupMessage'), code.indexOf('serve(async'));
    expect(fn).toMatch(/data: \{ type: 'community_message', ref_id: groupId, kind: 'group_message', group_id: groupId \}/);
    expect(fn).not.toMatch(/actor_handle|handle|select\('[^']*\bbody\b/);
  });

  test('no em dash in the file', () => {
    expect(SOURCE).not.toContain('—');
  });
});
