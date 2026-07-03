/**
 * Partner adoption telemetry (STEP A). Counts only, no PII. Each tracker emits a
 * single allow-listed event through the engineTelemetry rail, resolving userId
 * from the store; a missing userId is a benign no-op.
 */
const mockTrack = jest.fn(() => Promise.resolve());
jest.mock('../../engineTelemetry', () => ({ track: (...a) => mockTrack(...a) }));

let mockUser = { id: 'u1' };
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ user: mockUser }) },
}));

import {
  trackPartnerSurfaceView, trackInviteJourneyStep, trackInviteMinted,
  trackInviteRedeemed, trackInviteDiedAtPaywall, trackCheerSent, trackUnpair,
  trackPairWeekActive,
} from '../telemetry';

beforeEach(() => { mockTrack.mockClear(); mockUser = { id: 'u1' }; });

test('surface view carries the source', () => {
  trackPartnerSurfaceView('you_row');
  expect(mockTrack).toHaveBeenCalledWith('u1', 'partner_surface_view', { source: 'you_row' });
});

test('journey step is clamped to 1..3', () => {
  trackInviteJourneyStep(9);
  expect(mockTrack).toHaveBeenCalledWith('u1', 'partner_invite_journey_step', { step: 3 });
});

test('mint / redeem / paywall / cheer / unpair each emit their event', () => {
  trackInviteMinted();
  trackInviteRedeemed();
  trackInviteDiedAtPaywall();
  trackCheerSent();
  trackUnpair();
  const events = mockTrack.mock.calls.map(c => c[1]);
  expect(events).toEqual([
    'partner_invite_minted', 'partner_invite_redeemed',
    'partner_invite_died_at_paywall', 'partner_cheer', 'partner_unpair',
  ]);
});

test('pair-week-active only emits for week 2 or 6', () => {
  trackPairWeekActive(3);
  expect(mockTrack).not.toHaveBeenCalled();
  trackPairWeekActive(2);
  trackPairWeekActive(6);
  expect(mockTrack).toHaveBeenCalledWith('u1', 'partner_pair_week_active', { week: 2 });
  expect(mockTrack).toHaveBeenCalledWith('u1', 'partner_pair_week_active', { week: 6 });
});

test('no signed-in user -> benign no-op', () => {
  mockUser = null;
  trackInviteMinted();
  expect(mockTrack).not.toHaveBeenCalled();
});
