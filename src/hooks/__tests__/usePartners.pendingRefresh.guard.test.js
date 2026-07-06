const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(path.resolve(__dirname, '../usePartners.js'), 'utf8');

describe('usePartners pending invite refresh guard', () => {
  test('pending invite polling pulls the cloud mirror before re-reading local state', () => {
    expect(SOURCE).toContain('const pendingRefreshKey = state.pendingInvite?.id');
    expect(SOURCE).toContain('pullPartnerMirrorNow(userId).finally(load)');
    expect(SOURCE).not.toContain('setInterval(() => { load(); }, PENDING_INVITE_REFRESH_MS)');
  });

  test('invite and redeem actions seed local partnership rows immediately', () => {
    expect(SOURCE).toContain('mirrorPendingInviteLocally(userId, r.data, opts)');
    expect(SOURCE).toContain('mirrorAcceptedPartnershipLocally(userId, r.data)');
  });
});
