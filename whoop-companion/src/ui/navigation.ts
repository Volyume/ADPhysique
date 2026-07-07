/**
 * Lightweight in-app navigation: a single push/pop stack over a set of named
 * routes, with five bottom tabs as stack roots. Built without a nav library to
 * stay inside the Expo managed workflow with zero extra native deps.
 *
 * The owner's rule: EVERY metric/option is tappable into its own detail screen.
 * So routes include a generic `metric` detail (keyed) plus dedicated screens.
 */

export type TabKey = 'today' | 'recovery' | 'sleep' | 'strain' | 'more';

export type MetricKey =
  | 'rhr'
  | 'hrv'
  | 'respiratory'
  | 'spo2'
  | 'skin_temp'
  | 'recovery'
  | 'strain'
  | 'sleep_performance'
  | 'sleep_need'
  | 'sleep_debt'
  | 'sleep_efficiency'
  | 'calories'
  | 'avg_hr'
  | 'max_hr'
  | 'hrv_balance'
  | 'cardio_age';

export type Route =
  | { name: 'today' }
  | { name: 'recovery' }
  | { name: 'sleep' }
  | { name: 'strain' }
  | { name: 'more' }
  | { name: 'health' }
  | { name: 'stress' }
  | { name: 'trends' }
  | { name: 'journal' }
  | { name: 'device' }
  | { name: 'settings' }
  | { name: 'sleepCoach' }
  | { name: 'logActivity' }
  | { name: 'editSleep' }
  | { name: 'sleepTrends' }
  | { name: 'training' }
  | { name: 'readiness' }
  | { name: 'workouts' }
  | { name: 'startMenu' }
  | { name: 'liveSession' }
  | { name: 'resilience' }
  | { name: 'illness' }
  | { name: 'day'; day: string }
  | { name: 'metric'; key: MetricKey }
  | { name: 'activity'; id: string };

export type RouteName = Route['name'];

export const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'today', label: 'Home', icon: 'home' },
  { key: 'recovery', label: 'Recovery', icon: 'heart' },
  { key: 'sleep', label: 'Sleep', icon: 'moon' },
  { key: 'strain', label: 'Strain', icon: 'flash' },
  { key: 'more', label: 'More', icon: 'ellipsis-horizontal' },
];

export interface Nav {
  navigate: (route: Route) => void;
  back: () => void;
  setTab: (tab: TabKey) => void;
  canBack: boolean;
  tab: TabKey;
}
