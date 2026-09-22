/**
 * notify.test.js - founder order 2026-09-22, item 1 ("wire the pushes";
 * audit A-adoption-visibility-look-copy.md A-01/Q5, B-functionality-
 * backend-safety-engineering.md B-01/B-09).
 *
 * What this suite pins:
 *  - COMMUNITY_NOTIFY_KINDS carries the three group kinds this order
 *    adds (group_request, group_accepted, group_invited) alongside the
 *    eight it already had, so a call naming one of them is no longer
 *    silently dropped before it ever reaches the community-notify edge
 *    function (B-09: the server's pushCopy/categoryFor already handled
 *    all three; only the client allow-list was missing them);
 *  - an unknown kind, or a falsy target, never reaches the transport;
 *  - a known kind with a target calls invokeCommunityFunction with
 *    exactly {kind, target_user_id, ref_id}, ref_id defaulting to null;
 *  - a transport failure is swallowed here, never thrown back at a
 *    caller (notifyCommunityEvent is fire-and-forget by contract).
 */

jest.mock('../transport', () => ({ invokeCommunityFunction: jest.fn() }));

const { invokeCommunityFunction } = require('../transport');
const { notifyCommunityEvent, COMMUNITY_NOTIFY_KINDS } = require('../notify');

beforeEach(() => {
  jest.clearAllMocks();
  invokeCommunityFunction.mockResolvedValue({ ok: true, delivered: 'push' });
});

describe('COMMUNITY_NOTIFY_KINDS', () => {
  test('carries the eight kinds already wired plus the three group kinds this order adds (B-09)', () => {
    expect(COMMUNITY_NOTIFY_KINDS).toEqual([
      'follow', 'follow_request', 'follow_accepted', 'reaction', 'comment',
      'connect_request', 'connect_accepted', 'message',
      'group_request', 'group_accepted', 'group_invited',
    ]);
  });
});

describe('notifyCommunityEvent', () => {
  test('a known kind with a target calls the edge function with the exact payload', () => {
    notifyCommunityEvent('group_accepted', 'u2', 'g1');
    expect(invokeCommunityFunction).toHaveBeenCalledWith('community-notify', {
      kind: 'group_accepted', target_user_id: 'u2', ref_id: 'g1',
    });
  });

  test('a newly added group kind is no longer dropped (B-09 regression)', () => {
    for (const kind of ['group_request', 'group_invited']) {
      notifyCommunityEvent(kind, 'u2', 'g1');
    }
    expect(invokeCommunityFunction).toHaveBeenCalledTimes(2);
  });

  test('ref_id defaults to null when omitted', () => {
    notifyCommunityEvent('follow', 'u2');
    expect(invokeCommunityFunction).toHaveBeenCalledWith('community-notify', {
      kind: 'follow', target_user_id: 'u2', ref_id: null,
    });
  });

  test('an unknown kind never reaches the transport', () => {
    notifyCommunityEvent('made_up_kind', 'u2', 'g1');
    expect(invokeCommunityFunction).not.toHaveBeenCalled();
  });

  test('a missing, empty or undefined target never reaches the transport', () => {
    notifyCommunityEvent('follow', null, 'g1');
    notifyCommunityEvent('follow', undefined, 'g1');
    notifyCommunityEvent('follow', '', 'g1');
    expect(invokeCommunityFunction).not.toHaveBeenCalled();
  });

  test('a transport failure is swallowed, never thrown back at the caller', () => {
    invokeCommunityFunction.mockRejectedValue(new Error('offline'));
    expect(() => notifyCommunityEvent('follow', 'u2', 'g1')).not.toThrow();
  });
});
