/**
 * Founder defect (2026-07-11): logged-set rows rendered vertically instead of
 * as a horizontal row once the zeego long-press menu (campaign item 14, D25)
 * wrapped them, in EVERY production render (ActiveWorkoutScreen always calls
 * `<LoggedSetRow onDelete={openDeleteFromMenu} ... />`, so the wrapped path
 * below is the ONLY path a real user ever sees). Root cause: zeego 3.0.6's
 * `asChild` Trigger (Android AND iOS) does
 * `cloneElement(children, { style, ...props })`; with no `style` prop of its
 * own that clobbers the row's whole style array to `undefined`, dropping
 * `flexDirection: 'row'` (see styles.loggedSetRow, now in
 * src/components/workout/LoggedSetRow.js after the D43 S1 extraction --
 * ActiveWorkoutScreen.js at the time of this defect held it directly).
 * The existing cp10Stage3WorkoutShellsLiveTheme.test.js only ever mounts
 * LoggedSetRow WITHOUT `onDelete` (the unwrapped, no-menu path), so it never
 * exercised the wrapped path and could not have caught this regression.
 *
 * This suite pins the wrapped path: LoggedSetRow mounted WITH `onDelete` set
 * (matching production, ActiveWorkoutScreen.js's `loggedSets.map(...)` call
 * site) must still carry `flexDirection: 'row'` on its rendered row. The
 * `__mocks__/zeego/context-menu.js` manual mock's `Trigger` deliberately
 * reproduces the real library's clobbering `cloneElement` (see that file's
 * header comment) rather than being a transparent passthrough -- a
 * passthrough mock would make this test lie by passing regardless of whether
 * the row's style actually survives the Trigger.
 */
jest.mock('expo-sqlite');
jest.mock('expo-secure-store');
jest.mock('expo-crypto');
jest.mock('expo-application');
jest.mock('expo-constants');

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: (res) => Promise.resolve({ data: [], error: null }).then(res),
    })),
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
  })),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: () => {} })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: () => {} })),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1, NONE: 0 },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  withScope: jest.fn(cb => cb({ setTag: () => {}, setContext: () => {}, setUser: () => {} })),
}));

// Local native modules referenced by package.json file: deps.
jest.mock('rest-timer-live', () => ({ start: jest.fn(), stop: jest.fn(), update: jest.fn() }));
jest.mock('live-activity', () => ({ start: jest.fn(), stop: jest.fn(), update: jest.fn() }));

jest.mock('../../components/Toast', () => {
  const React = require('react');
  return {
    useToast: () => ({ show: jest.fn(), hide: jest.fn() }),
    ToastProvider: ({ children }) => children,
    default: props => React.createElement('Toast', props),
  };
});

jest.mock('../../components/FeedbackSheet', () => {
  const React = require('react');
  return {
    useFeedback: () => ({ open: jest.fn(), close: jest.fn() }),
    FeedbackProvider: ({ children }) => children,
    default: props => React.createElement('FeedbackSheet', props),
  };
});

// NOTE: no jest.mock('zeego/context-menu', ...) call here -- the manual mock
// at __mocks__/zeego/context-menu.js is applied automatically (Jest's
// node_modules manual-mock convention), same as every other consumer of this
// module.

import { create, act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
// Re-pinned for D43 S1 extraction: LoggedSetRow moved out of
// ActiveWorkoutScreen.js into src/components/workout/LoggedSetRow.js (pure
// extraction, no behaviour/visual change). ActiveWorkoutScreen.js still
// re-exports it (`export { LoggedSetRow };`), but this suite now imports the
// real module directly rather than through that re-export, so it keeps
// pinning the actual component regardless of whether a later slot ever
// drops the re-export.
import { LoggedSetRow } from '../../components/workout/LoggedSetRow';

describe('ActiveWorkoutScreen/LoggedSetRow: zeego menu wrap does not clobber row layout (founder defect 2026-07-11)', () => {
  test('row mounted WITH onDelete (the only path production uses) still lays out horizontally', () => {
    const set = { id: 's1', weight: 100, actualReps: 8, setType: 'straight', leftReps: null, rightReps: null };
    let tree;
    act(() => {
      tree = create(
        <LoggedSetRow
          set={set}
          units="kg"
          progressNum={1}
          exerciseType="weight_reps"
          onEdit={() => {}}
          onDelete={() => {}}
        />,
      );
    });

    const row = tree.root.findByProps({ accessibilityHint: 'Opens a sheet to change or delete this logged set' });
    const flattened = StyleSheet.flatten(row.props.style);
    expect(flattened).toBeTruthy();
    expect(flattened.flexDirection).toBe('row');

    act(() => { tree.unmount(); });
  });
});
