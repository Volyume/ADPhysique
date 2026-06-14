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

import { postEvent } from '../../telemetry/transport';
import {
  createPartnerInvite, redeemPartnerInvite, sendCheer, blockPartner, unpairPartner,
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

beforeEach(() => {
  postEvent.mockClear();
  _setClientForTests(fakeClient());
});

describe('createPartnerInvite', () => {
  test('returns the share links and emits partner_invite_sent', async () => {
    const r = await createPartnerInvite('u1', { streakEnabled: true });
    expect(r.ok).toBe(true);
    expect(r.data.deepLink).toBe('volyume://partner/ABCD1234EF');
    expect(r.data.webLink).toBe('https://volyume.app/partner/ABCD1234EF');
    expect(r.data.shareMessage).toContain('literally nothing else');
    expect(postEvent).toHaveBeenCalledWith('u1', 'partner_invite_sent', expect.any(Object));
  });
});

describe('redeemPartnerInvite', () => {
  test('emits partner_invite_accepted on success', async () => {
    const r = await redeemPartnerInvite('u2', 'ABCD1234EF');
    expect(r.ok).toBe(true);
    expect(r.data.partnershipId).toBe('p1');
    expect(postEvent).toHaveBeenCalledWith('u2', 'partner_invite_accepted', expect.any(Object));
  });

  test('maps any RPC error to a single indistinguishable invite_invalid', async () => {
    _setClientForTests(fakeClient({
      rpc: jest.fn(() => Promise.resolve({ data: null, error: { message: 'block hit' } })),
    }));
    const r = await redeemPartnerInvite('u2', 'ABCD1234EF');
    expect(r).toEqual({ ok: false, error: 'invite_invalid' });
    expect(postEvent).not.toHaveBeenCalled();
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
  test('marks the partnership ended', async () => {
    const r = await unpairPartner('u1', 'p1');
    expect(r.ok).toBe(true);
  });
});

afterAll(() => setTelemetryEnabled(true));
