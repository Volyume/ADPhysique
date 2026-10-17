/**
 * community.auditFixes.guard.test.js - source-level guards for the
 * 2026-10-17 Community audit fixes where rendering the whole screen is
 * impractical. Each pins one finding so it cannot quietly come back:
 *
 *  - item d: the block toast names the real settings label (the Hub row
 *    "Privacy and sharing") in both places a block can be made;
 *  - item 11: the person's name on PostRow, PersonRow and ConversationRow
 *    may wrap to two lines (largest text), never one;
 *  - item e: Group chat and the DM thread reload quietly after the first
 *    focus, as the Hub does;
 *  - item f: the DM thread catches up when the app returns to the front;
 *  - item 4: the DM poll merges (mergeNewestPage), never `setMessages(page.messages)`;
 *  - item 9: the Hub's foreground hook runs `clearStaleTrainingNow`.
 */
const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

test('item d: the block toast names the real settings label in both blockers', () => {
  expect(read('screens/CommunityHubScreen.js')).toContain('title="Privacy and sharing"');
  expect(read('components/community/ProfileMenuSheet.js'))
    .toContain("'Blocked. You can undo this in Privacy and sharing.'");
  expect(read('components/community/ProfileMenuSheet.js')).toMatch(/blockUser, \{[^}]*\}, BLOCKED_TOAST\)/);
  expect(read('screens/CommunityConversationScreen.js'))
    .toContain("run(blockUser, 'Blocked. You can undo this in Privacy and sharing.')");
});

test.each([
  ['components/community/PostRow.js', 'bodyStrong, styles.name'],
  ['components/community/PersonRow.js', '[styles.name, { color: t.colors.textPrimary }]'],
  ['components/community/ConversationRow.js', '[styles.name, { color: t.colors.textPrimary }]'],
])('item 11: %s lets the name wrap to two lines', (file, marker) => {
  const src = read(file);
  const at = src.indexOf(marker);
  expect(at).toBeGreaterThan(-1);
  const tag = src.slice(at, src.indexOf('>', at));
  expect(tag).toContain('numberOfLines={2}');
  expect(tag).not.toContain('numberOfLines={1}');
});

test.each(['screens/CommunityGroupChatScreen.js', 'screens/CommunityConversationScreen.js'])(
  'item e: %s reloads quietly after the first focus', (file) => {
    const src = read(file);
    expect(src).toContain('load({ quiet: focusedOnceRef.current })');
    expect(src).toMatch(/if \(!quiet\) setLoading\(true\)/);
  },
);

test('item f and 4: the DM thread polls on foreground and merges the newest page', () => {
  const src = read('screens/CommunityConversationScreen.js');
  expect(src).toMatch(/AppState\.addEventListener\('change'[\s\S]*?next === 'active'\) poll\(\)/);
  expect(src).toContain('mergeNewestPage(prev, cursorRef.current');
  expect(src).toContain('appendOlderPage(prev, page.messages)');
  expect(src).not.toMatch(/setMessages\(page\.messages\)/);
});

test('item 9: the Hub foreground hook runs clearStaleTrainingNow on mount and on active', () => {
  const src = read('screens/CommunityHubScreen.js');
  expect(src.match(/clearStaleTrainingNow\(consistencyUid\)/g)).toHaveLength(2);
});
