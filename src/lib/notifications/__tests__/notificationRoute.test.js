/**
 * Every notification type the scheduler sets must have a tap route, or the
 * notification dead-ends. This locks the mapping, in particular the day-14
 * trial gate (cascade_gate) and the weekly-coach-ready tap, which both
 * previously fell through the navigator's inline router.
 */
import { routeForNotificationType } from '../notificationRoute';

describe('routeForNotificationType', () => {
  test('weekly_checkin opens the check-in in the You tab', () => {
    expect(routeForNotificationType('weekly_checkin')).toEqual({
      tab: 'ProfileTab', screen: 'WeeklyCheckIn',
    });
  });

  test('year_of_lifts_unlock opens Year of Lifts in the Progress tab', () => {
    expect(routeForNotificationType('year_of_lifts_unlock')).toEqual({
      tab: 'ProgressTab', screen: 'YearOfLifts',
    });
  });

  test('cascade_gate opens the trial gate with the day14 variant (the conversion moment)', () => {
    expect(routeForNotificationType('cascade_gate')).toEqual({
      tab: 'ProfileTab', screen: 'CascadeGate', params: { variant: 'day14' },
    });
  });

  test('weekly_coach_ready opens Precision Coaching', () => {
    expect(routeForNotificationType('weekly_coach_ready')).toEqual({
      tab: 'ProfileTab', screen: 'CoachOutput',
    });
  });

  test('trial_day3 S1/S2 land on the check-in gate screen', () => {
    expect(routeForNotificationType('trial_day3', { variant: 'S1' })).toEqual({
      tab: 'ProfileTab', screen: 'WeeklyCheckIn',
    });
    expect(routeForNotificationType('trial_day3', { variant: 'S2' })).toEqual({
      tab: 'ProfileTab', screen: 'WeeklyCheckIn',
    });
  });

  test('trial_day3 S3 (no sessions yet) lands on Home for re-onboarding', () => {
    expect(routeForNotificationType('trial_day3', { variant: 'S3' })).toEqual({
      tab: 'HomeTab',
    });
  });

  test('trial_day3 with no variant data defaults to the check-in gate (not a dead-end)', () => {
    expect(routeForNotificationType('trial_day3')).toEqual({
      tab: 'ProfileTab', screen: 'WeeklyCheckIn',
    });
  });

  test('winback opens the Subscription screen in the You tab (COMP-025-A/B)', () => {
    expect(routeForNotificationType('winback')).toEqual({
      // COMP-025-B: fromWinback carries through so the resubscribe prefers the
      // win-back Play offer (inert when none is configured).
      tab: 'ProfileTab', screen: 'Subscription', params: { fromWinback: true },
    });
  });

  test('NEW-002: a partner cheer lands on the Progress consistency screen', () => {
    expect(routeForNotificationType('partner_cheer')).toEqual({
      tab: 'ProgressTab', screen: 'Consistency',
    });
  });

  test('an unknown or no-op type returns null (no navigation)', () => {
    expect(routeForNotificationType('morning_weight')).toBeNull();
    expect(routeForNotificationType('unknown')).toBeNull();
    expect(routeForNotificationType(undefined)).toBeNull();
  });
});
