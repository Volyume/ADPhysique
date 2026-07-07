const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(path.resolve(__dirname, '../usePartners.js'), 'utf8');

describe('usePartners pending invite refresh guard', () => {
  test('pending invite and connected partner polling pull the cloud mirror before re-reading local state', () => {
    expect(SOURCE).toContain('const pendingRefreshKey = state.pendingInvite?.id');
    expect(SOURCE).toContain('const activeRefreshKey = (state.pairs || []).map((pair) => pair?.id).filter(Boolean).join');
    expect(SOURCE).toContain('const ACTIVE_PARTNER_REFRESH_MS = 10000');
    expect(SOURCE).toContain('pullPartnerMirrorNow(userId).finally(() => load({ silent: true }))');
    expect(SOURCE).toContain('loading: silent ? prev.loading : true');
    expect(SOURCE).toContain('return Number(result?.errors || 0) === 0 || Number(result?.count || 0) > 0;');
    expect(SOURCE).not.toContain('setInterval(() => { load(); }, PENDING_INVITE_REFRESH_MS)');
  });

  test('invite and redeem actions seed local partnership rows immediately', () => {
    expect(SOURCE).toContain('mirrorPendingInviteLocally(userId, r.data, opts)');
    expect(SOURCE).toContain('mirrorAcceptedPartnershipLocally(userId, r.data)');
  });
});
