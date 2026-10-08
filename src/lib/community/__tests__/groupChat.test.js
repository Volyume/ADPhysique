/**
 * What this suite pins (D221 ruling 4, Stage 3 spec 3b; server migrate_191
 * Part 5): exact RPC names and parameter names; the 500 character cap and
 * the keyword filter are applied HERE before a doomed round trip (the
 * server remains the authority); list pages reduce to {messages, cursor};
 * delete and mark-read need an id; no wrapper touches the push.
 */

jest.mock('../transport', () => {
  class CommunityError extends Error {
    constructor(code) { super(code); this.name = 'CommunityError'; this.code = code; }
  }
  return { callCommunity: jest.fn(async () => ({})), CommunityError };
});

jest.mock('../notify', () => ({ notifyCommunityEvent: jest.fn() }));

const { callCommunity } = require('../transport');
const { notifyCommunityEvent } = require('../notify');

beforeEach(() => { jest.clearAllMocks(); callCommunity.mockResolvedValue({}); });

const {
  loadGroupMessages, sendGroupMessage, deleteGroupMessage, markGroupRead, GROUP_MESSAGE_MAX,
} = require('../groupChat');
const { BLOCKED_TERMS } = require('../keywordFilter');

test('loadGroupMessages reads the messages and cursor', async () => {
  callCommunity.mockResolvedValueOnce({ messages: [{ id: 'm1' }], cursor: 'c1' });
  const out = await loadGroupMessages('g1', { cursor: 'c0', limit: 10 });
  expect(callCommunity).toHaveBeenCalledWith('community_group_messages', {
    _group_id: 'g1', _cursor: 'c0', _limit: 10,
  });
  expect(out).toEqual({ messages: [{ id: 'm1' }], cursor: 'c1' });
});

test('loadGroupMessages answers an empty page for an empty reply and needs a group', async () => {
  expect(await loadGroupMessages('g1')).toEqual({ messages: [], cursor: null });
  await expect(loadGroupMessages(null)).rejects.toMatchObject({ code: 'invalid_input' });
});

test('sendGroupMessage sends the cleaned body', async () => {
  callCommunity.mockResolvedValueOnce({ message: { id: 'm1' } });
  const out = await sendGroupMessage('g1', '  Leg day at six  ');
  expect(callCommunity).toHaveBeenCalledWith('community_group_send_message', {
    _group_id: 'g1', _body: 'Leg day at six',
  });
  expect(out).toEqual({ message: { id: 'm1' } });
  // Best-effort push: target null, ref = the message id.
  expect(notifyCommunityEvent).toHaveBeenCalledWith('group_message', null, 'm1');
});

test('a refused send never requests a push', async () => {
  await expect(sendGroupMessage('g1', '  ')).rejects.toBeDefined();
  callCommunity.mockRejectedValueOnce(Object.assign(new Error('rate_limited'), { code: 'rate_limited' }));
  await expect(sendGroupMessage('g1', 'hi')).rejects.toBeDefined();
  expect(notifyCommunityEvent).not.toHaveBeenCalled();
});

test('sendGroupMessage refuses empty, over-long and filtered text before the network', async () => {
  await expect(sendGroupMessage('g1', '   ')).rejects.toMatchObject({ code: 'invalid_input' });
  await expect(sendGroupMessage('g1', 'a'.repeat(GROUP_MESSAGE_MAX + 1)))
    .rejects.toMatchObject({ code: 'invalid_input' });
  await expect(sendGroupMessage(null, 'hi')).rejects.toMatchObject({ code: 'invalid_input' });
  if (BLOCKED_TERMS.length > 0) {
    await expect(sendGroupMessage('g1', `well ${BLOCKED_TERMS[0]} then`))
      .rejects.toMatchObject({ code: 'content_not_allowed' });
  }
  expect(callCommunity).not.toHaveBeenCalled();
});

test('exactly 500 characters is accepted', async () => {
  await sendGroupMessage('g1', 'a'.repeat(500));
  expect(callCommunity).toHaveBeenCalledTimes(1);
});

test('deleteGroupMessage and markGroupRead use the declared parameter names', async () => {
  await deleteGroupMessage('m1');
  expect(callCommunity).toHaveBeenCalledWith('community_group_message_delete', { _id: 'm1' });
  await markGroupRead('g1');
  expect(callCommunity).toHaveBeenCalledWith('community_group_mark_read', { _group_id: 'g1' });
  await expect(deleteGroupMessage('')).rejects.toMatchObject({ code: 'invalid_input' });
  await expect(markGroupRead(undefined)).rejects.toMatchObject({ code: 'invalid_input' });
});

test('a server refusal propagates', async () => {
  callCommunity.mockRejectedValueOnce(Object.assign(new Error('rate_limited'), { code: 'rate_limited' }));
  await expect(sendGroupMessage('g1', 'hi')).rejects.toMatchObject({ code: 'rate_limited' });
});
