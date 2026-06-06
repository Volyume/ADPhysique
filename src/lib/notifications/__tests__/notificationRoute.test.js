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

  test('an unknown or no-op type returns null (no navigation)', () => {
    expect(routeForNotificationType('morning_weight')).toBeNull();
    expect(routeForNotificationType('unknown')).toBeNull();
    expect(routeForNotificationType(undefined)).toBeNull();
  });
});
