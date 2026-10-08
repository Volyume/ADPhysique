/**
 * Round 3R, C7: a group message is reported with kind `group_message` and the
 * message id (not the author's profile).
 */
jest.mock('../transport', () => {
  class CommunityError extends Error {
    constructor(code) { super(code); this.name = 'CommunityError'; this.code = code; }
  }
  return { callCommunity: jest.fn(async () => ({ id: 'r1' })), CommunityError };
});
const { callCommunity } = require('../transport');
const { reportContent, REPORT_TARGET_KINDS } = require('../moderation');

test('group_message is an accepted report kind and goes to the server with the message id', async () => {
  expect(REPORT_TARGET_KINDS).toContain('group_message');
  await reportContent({ targetKind: 'group_message', targetId: 'm1', reason: 'harassment' });
  expect(callCommunity).toHaveBeenCalledWith('community_report',
    expect.objectContaining({ _target_kind: 'group_message', _target_id: 'm1', _reason: 'harassment' }));
});
