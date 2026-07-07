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
import { buildShareWinPreview } from '../shareWins';
import {
  createPartnerInvite, redeemPartnerInvite, sendCheer, blockPartner, unpairPartner,
  proposeSharedBlock, adoptSharedBlock, leaveSharedBlock,
  sendPartnerWinCard, revokePartnerWinCard,
} from '../service';

function fakeClient(overrides = {}) {
  const partnership = overrides.partnershipRow || {
    id: 'p1',
    member_a: 'u1',
    member_b: 'u2',
    status: 'active',
    streak_enabled: true,
    created_at: '2026-07-06T10:00:00.000Z',
    accepted_at: '2026-07-06T10:01:00.000Z',
    updated_at: '2026-07-06T10:01:00.000Z',
  };
  const calls = { cheerRows: [] };
  return {
    _calls: calls,
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
    from: jest.fn((table) => {
      if (table === 'partnerships') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: partnership, error: null })),
            })),
          })),
          upsert: jest.fn(() => Promise.resolve({ error: null })),
          update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })),
        };
      }
      if (table === 'partner_cheers') {
        return {
          insert: jest.fn((row) => {
            calls.cheerRows.push(row);
            return {
              select: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: { id: 'cheer1', ...row, created_at: '2026-07-06T10:02:00.000Z' },
                  error: overrides.cheerInsertError || null,
                })),
              })),
            };
          }),
        };
      }
      return {
        upsert: jest.fn(() => Promise.resolve({ error: null })),
        update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })),
      };
    }),
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

function winCardClient({ insertError = null, updateError = null } = {}) {
  const calls = { inserted: [], updated: [], eqs: [] };
  const insertedRow = () => ({
    id: 'win1',
    ...calls.inserted[0],
    created_at: '2026-07-06T10:00:00.000Z',
    updated_at: '2026-07-06T10:00:00.000Z',
    revoked_at: null,
  });
  const updatedRow = () => ({
    id: 'win1',
    pair_id: 'p1',
    sender_id: 'u1',
    card_type: 'workout_summary',
    title: 'Workout complete',
    summary: 'Pull session completed on 6 July 2026.',
    detail: 'Exercises, sets, reps, loads, notes and effort stay private.',
    visible_to_partner: 'Workout name, date and completed status.',
    remains_private: 'Exercises, sets, reps, loads, notes and effort stay private unless that card asks again.',
    created_at: '2026-07-06T10:00:00.000Z',
    updated_at: calls.updated[0]?.updated_at,
    revoked_at: calls.updated[0]?.revoked_at,
  });
  const selectSingle = (result) => ({
    select: jest.fn(() => ({ single: jest.fn(() => Promise.resolve(result)) })),
  });
  const updateChain = {
    eq: jest.fn((key, value) => { calls.eqs.push([key, value]); return updateChain; }),
    select: jest.fn(() => ({
      single: jest.fn(() => Promise.resolve(updateError
        ? { data: null, error: updateError }
        : { data: updatedRow(), error: null })),
    })),
  };
  return {
    _calls: calls,
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    functions: { invoke: jest.fn(() => Promise.resolve({ data: { ok: true }, error: null })) },
    from: jest.fn((table) => {
      if (table !== 'partner_win_cards') return {};
      return {
        insert: jest.fn((row) => {
          calls.inserted.push(row);
          return selectSingle(insertError
            ? { data: null, error: insertError }
            : { data: insertedRow(), error: null });
        }),
        update: jest.fn((row) => {
          calls.updated.push(row);
          return updateChain;
        }),
      };
    }),
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
    expect(r.data.partnership).toEqual(expect.objectContaining({ id: 'p1', partner_first_name: null }));
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
    expect(r.data).toEqual(expect.objectContaining({ partnershipId: 'p1', partnerFirstName: 'Sam' }));
    expect(r.data.partnership).toEqual(expect.objectContaining({ id: 'p1', partner_first_name: 'Sam' }));
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

describe('partner win cards', () => {
  test('sends one sanitized preview card to the selected pair', async () => {
    const c = winCardClient();
    _setClientForTests(c);
    const preview = buildShareWinPreview('workout_summary', {
      workoutName: 'Pull session',
      completedAt: '6 July 2026',
      sets: [{ reps: 8, load: 90 }],
    });

    const r = await sendPartnerWinCard('u1', { pairId: 'p1', preview });
    expect(r.ok).toBe(true);
    expect(c.from).toHaveBeenCalledWith('partner_win_cards');
    expect(c._calls.inserted[0]).toEqual({
      pair_id: 'p1',
      sender_id: 'u1',
      card_type: 'workout_summary',
      title: 'Workout complete',
      summary: 'Pull session completed on 6 July 2026.',
      detail: expect.stringContaining('sets, reps, loads, notes and effort stay private'),
      visible_to_partner: 'Workout name, date and completed status.',
      remains_private: 'Exercises, sets, reps, loads, notes and effort stay private unless that card asks again.',
    });
    expect(JSON.stringify(c._calls.inserted[0])).not.toContain('90');
  });

  test('rejects invalid win-card previews before writing', async () => {
    const c = winCardClient();
    _setClientForTests(c);
    const r = await sendPartnerWinCard('u1', {
      pairId: 'p1',
      preview: { draft: { type: 'workout_summary', title: 'x', summary: 'x', detail: 'x', reps: 10 } },
    });
    expect(r.ok).toBe(false);
    expect(c.from).not.toHaveBeenCalled();
  });

  test('normalises an unapplied cloud migration for win cards', async () => {
    const c = winCardClient({ insertError: { code: 'PGRST205', message: 'partner_win_cards not found' } });
    _setClientForTests(c);
    const preview = buildShareWinPreview('personal_record', {
      liftName: 'Incline press',
      recordLabel: 'New 8-rep best',
    });
    const r = await sendPartnerWinCard('u1', { pairId: 'p1', preview });
    expect(r).toEqual({ ok: false, error: 'win_cards_unavailable' });
  });

  test('revokes only the sender-owned win card', async () => {
    const c = winCardClient();
    _setClientForTests(c);
    const r = await revokePartnerWinCard('u1', { cardId: 'win1' });
    expect(r.ok).toBe(true);
    expect(c._calls.updated[0]).toEqual({
      revoked_at: expect.any(String),
      updated_at: expect.any(String),
    });
    expect(c._calls.eqs).toEqual([
      ['id', 'win1'],
      ['sender_id', 'u1'],
    ]);
  });
});

describe('sendCheer', () => {
  test('invokes the edge function with the sender local day and emits partner_cheer_sent with reciprocal', async () => {
    const client = fakeClient();
    _setClientForTests(client);
    const r = await sendCheer('u1', { pairId: 'p1', reciprocal: true });
    expect(r.ok).toBe(true);
    expect(client.functions.invoke).toHaveBeenCalledWith('partner-cheer', {
      body: { pairId: 'p1', kind: 'here', sentOn: expect.any(String) },
    });
    expect(postEvent).toHaveBeenCalledWith('u1', 'partner_cheer_sent', { reciprocal: true });
  });

  test('normalises the daily cheer limit instead of surfacing a generic edge error', async () => {
    const client = fakeClient({
      functions: {
        invoke: jest.fn(() => Promise.resolve({
          data: { ok: false, error: 'already_cheered' },
          error: { status: 429, message: 'Edge Function returned a non-2xx status code' },
        })),
      },
    });
    _setClientForTests(client);
    const r = await sendCheer('u1', { pairId: 'p1' });
    expect(r).toEqual({ ok: false, error: 'already_cheered' });
    expect(postEvent).not.toHaveBeenCalledWith('u1', 'partner_cheer_sent', expect.any(Object));
  });

  test('falls back to a direct RLS insert when the cheer edge function is unavailable', async () => {
    const client = fakeClient({
      functions: {
        invoke: jest.fn(() => Promise.resolve({
          data: null,
          error: { status: 404, message: 'Function not found' },
        })),
      },
    });
    _setClientForTests(client);
    const r = await sendCheer('u1', { pairId: 'p1', kind: 'proud', reciprocal: true });
    expect(r.ok).toBe(true);
    expect(client._calls.cheerRows[0]).toMatchObject({
      pair_id: 'p1',
      sender_id: 'u1',
      kind: 'proud',
    });
    expect(postEvent).toHaveBeenCalledWith('u1', 'partner_cheer_sent', { reciprocal: true });
  });

  test('normalises a direct-insert duplicate as already cheered', async () => {
    const client = fakeClient({
      functions: {
        invoke: jest.fn(() => Promise.resolve({
          data: null,
          error: { status: 404, message: 'Function not found' },
        })),
      },
      cheerInsertError: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });
    _setClientForTests(client);
    const r = await sendCheer('u1', { pairId: 'p1' });
    expect(r).toEqual({ ok: false, error: 'already_cheered' });
    expect(postEvent).not.toHaveBeenCalledWith('u1', 'partner_cheer_sent', expect.any(Object));
  });

  test('normalises cheer auth failures before blaming the user connection', async () => {
    const client = fakeClient({
      functions: {
        invoke: jest.fn(() => Promise.resolve({
          data: { ok: false, error: 'Unauthorised' },
          error: { status: 401, message: 'Edge Function returned a non-2xx status code' },
        })),
      },
      cheerInsertError: { status: 401, message: 'JWT expired' },
    });
    _setClientForTests(client);
    const r = await sendCheer('u1', { pairId: 'p1' });
    expect(r).toEqual({ ok: false, error: 'partner_auth_required' });
    expect(postEvent).not.toHaveBeenCalledWith('u1', 'partner_cheer_sent', expect.any(Object));
  });

  test('normalises a misconfigured cheer edge function as backend unavailable', async () => {
    const client = fakeClient({
      functions: {
        invoke: jest.fn(() => Promise.resolve({
          data: { ok: false, error: 'Server misconfigured' },
          error: { status: 500, message: 'missing env vars' },
        })),
      },
      cheerInsertError: { status: 500, message: 'Server misconfigured' },
    });
    _setClientForTests(client);
    const r = await sendCheer('u1', { pairId: 'p1' });
    expect(r).toEqual({ ok: false, error: 'server_misconfigured' });
    expect(postEvent).not.toHaveBeenCalledWith('u1', 'partner_cheer_sent', expect.any(Object));
  });

  test('normalises a missing cheer table as unavailable, not a connection fault', async () => {
    const client = fakeClient({
      functions: {
        invoke: jest.fn(() => Promise.resolve({
          data: null,
          error: { status: 404, message: 'Function not found' },
        })),
      },
      cheerInsertError: { code: 'PGRST205', message: "Could not find the table 'partner_cheers' in the schema cache" },
    });
    _setClientForTests(client);
    const r = await sendCheer('u1', { pairId: 'p1' });
    expect(r).toEqual({ ok: false, error: 'cheers_unavailable' });
    expect(postEvent).not.toHaveBeenCalledWith('u1', 'partner_cheer_sent', expect.any(Object));
  });

  test('normalises cheer schema drift as update-needed, not a connection fault', async () => {
    const client = fakeClient({
      functions: {
        invoke: jest.fn(() => Promise.resolve({
          data: null,
          error: { status: 404, message: 'Function not found' },
        })),
      },
      cheerInsertError: {
        code: 'PGRST204',
        message: "Could not find the 'sender_id' column of 'partner_cheers' in the schema cache",
      },
    });
    _setClientForTests(client);
    const r = await sendCheer('u1', { pairId: 'p1' });
    expect(r).toEqual({ ok: false, error: 'partner_update_needed' });
    expect(postEvent).not.toHaveBeenCalledWith('u1', 'partner_cheer_sent', expect.any(Object));
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
