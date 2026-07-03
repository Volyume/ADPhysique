/**
 * NEW-002 partner service — drives the create/redeem/cheer/block/unpair RPCs
 * against an injected fake client and asserts the four derived telemetry events
 * fire (counts/booleans only). Also the catalogue's emitter for those events.
 */
import { _setClientForTests } from '../../supabase';
import { setTelemetryEnabled } from '../../telemetry/transport';

jest.mock('../../telemetry/transport', () => {
  const actual = jest.requireActual('../../telemetry/transport');
  return { ...actual, postEvent: jest.fn(() => Promise.resolve('id')) };
});

// The STEP A partner telemetry module resolves userId from the store; stub it so
// the service tests stay isolated from the store and assert legacy events only.
jest.mock('../telemetry', () => ({
  trackInviteMinted: jest.fn(),
  trackInviteRedeemed: jest.fn(),
  trackCheerSent: jest.fn(),
  trackUnpair: jest.fn(),
}));
// Partner-sharing consent: default to a successful write; individual tests
// override it to drive the fail-closed rollback.
jest.mock('../consent', () => ({
  PARTNER_PRIVACY_NOTICE_VERSION: 1,
  recordPartnerSharingConsent: jest.fn(() => Promise.resolve({ ok: true })),
}));

import { postEvent } from '../../telemetry/transport';
import { recordPartnerSharingConsent } from '../consent';
import {
  createPartnerInvite, redeemPartnerInvite, sendCheer, blockPartner, unpairPartner,
  proposeSharedBlock, adoptSharedBlock, leaveSharedBlock,
} from '../service';

function fakeClient(overrides = {}) {
  return {
    rpc: jest.fn((name) => {
      if (name === 'create_partner_invite') {
        return Promise.resolve({ data: [{ partnership_id: 'p1', invite_code: 'ABCD1234EF' }], error: null });
      }
      if (name === 'redeem_partner_invite') {
        return Promise.resolve({ data: 'p1', error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }),
    functions: { invoke: jest.fn(() => Promise.resolve({ data: { ok: true }, error: null })) },
    from: jest.fn(() => ({
      upsert: jest.fn(() => Promise.resolve({ error: null })),
      update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })),
    })),
    ...overrides,
  };
}

// Chainable fake for the shared-block table ops (delete/insert/update with
// eq/neq/select). Records every call so tests can assert the written row.
function sharedBlockClient({ insertError = null, adopted = [{ pair_id: 'p1' }] } = {}) {
  const calls = { inserted: [], deleted: 0, updated: [] };
  const chain = (result) => {
    const c = {
      eq: jest.fn(() => c), neq: jest.fn(() => c),
      select: jest.fn(() => Promise.resolve(result)),
      then: (res, rej) => Promise.resolve(result).then(res, rej),
    };
    return c;
  };
  return {
    _calls: calls,
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    functions: { invoke: jest.fn(() => Promise.resolve({ data: { ok: true }, error: null })) },
    from: jest.fn(() => ({
      delete: jest.fn(() => { calls.deleted += 1; return chain({ data: null, error: null }); }),
      insert: jest.fn((row) => { calls.inserted.push(row); return Promise.resolve({ error: insertError }); }),
      update: jest.fn((row) => { calls.updated.push(row); return chain({ data: adopted, error: null }); }),
    })),
  };
}

beforeEach(() => {
  postEvent.mockClear();
  recordPartnerSharingConsent.mockClear();
  recordPartnerSharingConsent.mockResolvedValue({ ok: true });
  _setClientForTests(fakeClient());
});

describe('createPartnerInvite', () => {
  test('returns the share links and emits partner_invite_sent', async () => {
    const r = await createPartnerInvite('u1', { streakEnabled: true });
    expect(r.ok).toBe(true);
    expect(r.data.deepLink).toBe('volyume://partner/ABCD1234EF');
    expect(r.data.webLink).toBe('https://volyume.app/partner/ABCD1234EF');
    expect(r.data.shareMessage).toContain('No numbers, no feed');
    expect(postEvent).toHaveBeenCalledWith('u1', 'partner_invite_sent', expect.any(Object));
  });
});

describe('redeemPartnerInvite', () => {
  test('emits partner_invite_accepted on success (legacy 081 uuid shape)', async () => {
    const r = await redeemPartnerInvite('u2', 'ABCD1234EF');
    expect(r.ok).toBe(true);
    expect(r.data.partnershipId).toBe('p1');
    // Pre-102 RPC carries no name; the 'Your partner' fallback holds downstream.
    expect(r.data.partnerFirstName).toBe(null);
    expect(postEvent).toHaveBeenCalledWith('u2', 'partner_invite_accepted', expect.any(Object));
  });

  test("returns the inviter's first name from the migrate_102 table shape", async () => {
    _setClientForTests(fakeClient({
      rpc: jest.fn((name) => {
        if (name === 'redeem_partner_invite') {
          return Promise.resolve({ data: [{ partnership_id: 'p1', partner_first_name: 'Sam' }], error: null });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    }));
    const r = await redeemPartnerInvite('u2', 'ABCD1234EF');
    expect(r.ok).toBe(true);
    expect(r.data).toEqual({ partnershipId: 'p1', partnerFirstName: 'Sam' });
  });

  test('a 102 row without a name maps to null (fallback holds)', async () => {
    _setClientForTests(fakeClient({
      rpc: jest.fn(() => Promise.resolve({ data: [{ partnership_id: 'p1', partner_first_name: null }], error: null })),
    }));
    const r = await redeemPartnerInvite('u2', 'ABCD1234EF');
    expect(r.ok).toBe(true);
    expect(r.data.partnerFirstName).toBe(null);
  });

  test('maps any RPC error to a single indistinguishable invite_invalid', async () => {
    _setClientForTests(fakeClient({
      rpc: jest.fn(() => Promise.resolve({ data: null, error: { message: 'block hit' } })),
    }));
    const r = await redeemPartnerInvite('u2', 'ABCD1234EF');
    expect(r).toEqual({ ok: false, error: 'invite_invalid' });
    expect(postEvent).not.toHaveBeenCalled();
  });

  test('writes a partner_sharing consent row on the accept path', async () => {
    const r = await redeemPartnerInvite('u2', 'ABCD1234EF');
    expect(r.ok).toBe(true);
    expect(recordPartnerSharingConsent).toHaveBeenCalledWith('u2', { granted: true });
  });

  test('FAIL CLOSED: a failed consent write rolls the pairing back and does not complete', async () => {
    recordPartnerSharingConsent.mockResolvedValue({ ok: false, error: 'offline' });
    const client = fakeClient();
    _setClientForTests(client);
    const r = await redeemPartnerInvite('u2', 'ABCD1234EF');
    expect(r).toEqual({ ok: false, error: 'consent_failed' });
    // The just-redeemed partnership is torn down (the deletion-promise RPC).
    expect(client.rpc).toHaveBeenCalledWith('end_partnership', { _pair_id: 'p1' });
    // Never reports the pairing as accepted when consent did not record.
    expect(postEvent).not.toHaveBeenCalledWith('u2', 'partner_invite_accepted', expect.anything());
  });
});

describe('shared training block (Wave 5 C5 A1)', () => {
  test('propose replaces any previous row and writes ONLY the §5-reviewed columns', async () => {
    const c = sharedBlockClient();
    _setClientForTests(c);
    const r = await proposeSharedBlock('u1', { pairId: 'p1', blockName: '  X-Frame  ' });
    expect(r.ok).toBe(true);
    expect(c._calls.deleted).toBe(1); // re-proposal mints a fresh server ref
    const row = c._calls.inserted[0];
    expect(row).toEqual({
      pair_id: 'p1',
      block_name: 'X-Frame', // trimmed
      proposed_by: 'u1',
      status: 'proposed',
      updated_at: expect.any(String),
    });
    // block_ref is server-minted, never client-written.
    expect('block_ref' in row).toBe(false);
    expect(postEvent).toHaveBeenCalledWith('u1', 'partner_block_proposed', expect.any(Object));
  });

  test('propose caps the shared name at 80 characters', async () => {
    const c = sharedBlockClient();
    _setClientForTests(c);
    await proposeSharedBlock('u1', { pairId: 'p1', blockName: 'x'.repeat(200) });
    expect(c._calls.inserted[0].block_name).toHaveLength(80);
  });

  test('propose with an empty name never writes', async () => {
    const c = sharedBlockClient();
    _setClientForTests(c);
    const r = await proposeSharedBlock('u1', { pairId: 'p1', blockName: '   ' });
    expect(r.ok).toBe(false);
    expect(c.from).not.toHaveBeenCalled();
  });

  test('adopt flips proposed -> active and emits partner_block_adopted', async () => {
    const c = sharedBlockClient();
    _setClientForTests(c);
    const r = await adoptSharedBlock('u2', 'p1');
    expect(r.ok).toBe(true);
    expect(c._calls.updated[0]).toMatchObject({ status: 'active' });
    expect(postEvent).toHaveBeenCalledWith('u2', 'partner_block_adopted', expect.any(Object));
  });

  test('adopt fails closed when no proposed row matched (proposer cannot self-adopt)', async () => {
    const c = sharedBlockClient({ adopted: [] });
    _setClientForTests(c);
    const r = await adoptSharedBlock('u1', 'p1');
    expect(r).toEqual({ ok: false, error: 'not_adoptable' });
    expect(postEvent).not.toHaveBeenCalled();
  });

  test('leave deletes the row for both sides and emits partner_block_left', async () => {
    const c = sharedBlockClient();
    _setClientForTests(c);
    const r = await leaveSharedBlock('u1', 'p1');
    expect(r.ok).toBe(true);
    expect(c._calls.deleted).toBe(1);
    expect(postEvent).toHaveBeenCalledWith('u1', 'partner_block_left', expect.any(Object));
  });
});

describe('sendCheer', () => {
  test('invokes the edge function and emits partner_cheer_sent with reciprocal', async () => {
    const r = await sendCheer('u1', { pairId: 'p1', reciprocal: true });
    expect(r.ok).toBe(true);
    expect(postEvent).toHaveBeenCalledWith('u1', 'partner_cheer_sent', { reciprocal: true });
  });
});

describe('blockPartner', () => {
  test('emits partner_blocked', async () => {
    const r = await blockPartner('u1', 'u9');
    expect(r.ok).toBe(true);
    expect(postEvent).toHaveBeenCalledWith('u1', 'partner_blocked', expect.any(Object));
  });
});

describe('unpairPartner', () => {
  test('goes through the end_partnership RPC (which purges signals + cheers), not a bare status update', async () => {
    const client = fakeClient();
    _setClientForTests(client);
    const r = await unpairPartner('u1', 'p1');
    expect(r.ok).toBe(true);
    // INVARIANT (deletion promise, blueprint §5): unpair MUST route through the
    // server-side purge RPC, never a status-only UPDATE that leaves shared data
    // behind. Guards the exact defect this fix closes.
    expect(client.rpc).toHaveBeenCalledWith('end_partnership', { _pair_id: 'p1' });
  });

  test('records a partner_sharing consent WITHDRAWAL (best-effort) on unpair', async () => {
    const r = await unpairPartner('u1', 'p1');
    expect(r.ok).toBe(true);
    expect(recordPartnerSharingConsent).toHaveBeenCalledWith('u1', { granted: false });
  });

  test('surfaces an RPC failure instead of reporting a false success', async () => {
    _setClientForTests(fakeClient({
      rpc: jest.fn(() => Promise.resolve({ data: null, error: { message: 'not_a_member' } })),
    }));
    const r = await unpairPartner('u1', 'p1');
    expect(r.ok).toBe(false);
  });
});

afterAll(() => setTelemetryEnabled(true));
