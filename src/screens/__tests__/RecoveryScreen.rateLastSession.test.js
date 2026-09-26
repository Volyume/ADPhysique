/**
 * RecoveryScreen.rateLastSession.test.js (register D208).
 *
 * The Recovery section moved from Consistency to its own screen, and the
 * rate-last-session control (progress-tab audit 2026-09-24, F3 / P3(a),
 * D200-2) moved with it. ReadinessCards stays navigation-agnostic and calls
 * back through `onRateLastSession(params)`; this pins that RecoveryScreen
 * wires that callback to `navigation.navigate('WorkoutSummary', params)`,
 * passing the params through unchanged, and that it asks ReadinessCards for
 * the recovery section only. ReadinessCards itself is mocked to a stub that
 * invokes the callback, the same style as the Consistency suite this came from.
 */
import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({ user: { id: 'u1' } })),
}));
jest.mock('../../components/BackHeader', () => () => null);

const RATE_PARAMS = { workoutId: 'w-last', durationMinutes: 30, readOnly: true, allowRating: true };
let mockCardsProps = null;
jest.mock('../../components/ReadinessCards', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockReadinessCards(props) {
    mockCardsProps = props;
    return (
      <TouchableOpacity
        accessibilityLabel="mock-rate-last-session"
        onPress={() => props.onRateLastSession(RATE_PARAMS)}
      >
        <Text>mock ReadinessCards</Text>
      </TouchableOpacity>
    );
  };
});

import RecoveryScreen from '../RecoveryScreen';

describe('RecoveryScreen draws the recovery section and wires rate-last-session (D208)', () => {
  test('pressing the rate-last-session control navigates to WorkoutSummary with the params ReadinessCards handed it', () => {
    const navigation = { navigate: jest.fn() };
    let tree;
    act(() => { tree = create(<RecoveryScreen navigation={navigation} />); });
    const control = tree.root.findByProps({ accessibilityLabel: 'mock-rate-last-session' });
    act(() => { control.props.onPress(); });
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith('WorkoutSummary', RATE_PARAMS);
  });

  test('it asks for the recovery section only, for the signed-in user', () => {
    act(() => { create(<RecoveryScreen navigation={{ navigate: jest.fn() }} />); });
    expect(mockCardsProps.sections).toBe('recovery');
    expect(mockCardsProps.userId).toBe('u1');
  });
});
