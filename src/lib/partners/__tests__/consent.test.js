/**
 * Partner-sharing consent (STEP A, A4 §6). The accept act writes an append-only
 * consent_log row on the same rail as the Article 9 health consent, via the
 * record_partner_consent SECURITY DEFINER RPC. Unpair writes the withdrawal.
 */
import { _setClientForTests } from '../../supabase';
import { recordPartnerSharingConsent, PARTNER_PRIVACY_NOTICE_VERSION } from '../consent';

function client(rpc) {
  return { rpc, functions: { invoke: jest.fn() }, from: jest.fn() };
}

describe('recordPartnerSharingConsent', () => {
  test('records a grant through record_partner_consent with the notice version', async () => {
    const rpc = jest.fn(() => Promise.resolve({ error: null }));
    _setClientForTests(client(rpc));
    const r = await recordPartnerSharingConsent('u1', { granted: true });
    expect(r.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith('record_partner_consent', expect.objectContaining({
      _granted: true,
      _notice_version: String(PARTNER_PRIVACY_NOTICE_VERSION),
    }));
  });

  test('records a withdrawal (granted false)', async () => {
    const rpc = jest.fn(() => Promise.resolve({ error: null }));
    _setClientForTests(client(rpc));
    const r = await recordPartnerSharingConsent('u1', { granted: false });
    expect(r.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith('record_partner_consent', expect.objectContaining({ _granted: false }));
  });

  test('surfaces an RPC failure so the caller can fail closed', async () => {
    const rpc = jest.fn(() => Promise.resolve({ error: { message: 'nope' } }));
    _setClientForTests(client(rpc));
    const r = await recordPartnerSharingConsent('u1', { granted: true });
    expect(r.ok).toBe(false);
  });

  test('a missing userId is a benign non-ok, never a throw', async () => {
    _setClientForTests(client(jest.fn(() => Promise.resolve({ error: null }))));
    const r = await recordPartnerSharingConsent(null, { granted: true });
    expect(r.ok).toBe(false);
  });
});
