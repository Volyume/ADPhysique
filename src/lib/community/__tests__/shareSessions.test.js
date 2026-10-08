/**
 * saveShareSessions: the one setter behind "Share what I did" on both the
 * Training profile row and the Privacy screen's mirrored row (D221 L17).
 * Pins the order (device write, owed marker, publish), the minor clamp, the
 * rules-outdated revert and the queued outcome.
 */
const mockCalls = [];
jest.mock('../index', () => ({
  readShareSettings: jest.fn(),
  writeShareSettings: jest.fn(async (uid, s) => { mockCalls.push(['write', s]); }),
  setSharingPublishPending: jest.fn(async (uid, pending, opts) => { mockCalls.push(['pending', pending, opts]); }),
  publishSharingSettings: jest.fn(),
}));

const lib = require('../index');
const { saveShareSessions } = require('../shareSessions');

const PREV = { share_sessions: false, sessions_audience: 'everyone' };
const NEXT = { share_sessions: true, sessions_audience: 'everyone' };

beforeEach(() => { mockCalls.length = 0; jest.clearAllMocks(); });

test('writes, marks owed, publishes, then clears the marker when sent', async () => {
  lib.publishSharingSettings.mockResolvedValue({ sent: true, reason: null });
  const out = await saveShareSessions('u1', PREV, NEXT);
  expect(out).toEqual({ settings: NEXT, status: 'sent' });
  expect(mockCalls.map((c) => c[0] + (c[1] === true ? ':owed' : c[1] === false ? ':clear' : ''))).toEqual(['write', 'pending:owed', 'pending:clear']);
});

test('rules_outdated reverts the device copy and clears the marker', async () => {
  lib.publishSharingSettings.mockResolvedValue({ sent: false, reason: 'rules_outdated' });
  const out = await saveShareSessions('u1', PREV, NEXT);
  expect(out).toEqual({ settings: PREV, status: 'rules_outdated' });
  expect(lib.writeShareSettings).toHaveBeenLastCalledWith('u1', PREV);
  expect(lib.setSharingPublishPending).toHaveBeenLastCalledWith('u1', false);
});

test('a failed publish stays owed (with the removal intent) and reports queued', async () => {
  lib.publishSharingSettings.mockResolvedValue({ sent: false, reason: 'offline' });
  const out = await saveShareSessions('u1', NEXT, { ...NEXT, share_sessions: false }, { removeShared: true });
  expect(out.status).toBe('queued');
  expect(lib.setSharingPublishPending).toHaveBeenLastCalledWith('u1', true, { removeShared: true });
});

test('a minor never gets more than followers', async () => {
  lib.publishSharingSettings.mockResolvedValue({ sent: true, reason: null });
  const out = await saveShareSessions('u1', PREV, NEXT, { isMinor: true });
  expect(out.settings.sessions_audience).toBe('followers');
  expect(lib.publishSharingSettings.mock.calls[0][1].sessions_audience).toBe('followers');
});
