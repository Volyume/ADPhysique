/**
 * RecoveryScreen.weeklyVolumeReview.test.js (register D228 item 6).
 *
 * CoachReviewScreen is the per-muscle weekly volume review. Its only door (the
 * Today deload card) went in 24859ea, so D228 item 6 re-wires it as one row on
 * the Recovery screen, directly after Recovery by muscle. ReadinessCards stays
 * navigation-agnostic and draws whatever node the screen hands it through
 * `afterByMuscle`; this pins that the screen hands it ONE NavRow named
 * "Weekly volume review" with the agreed sub line, that a tap opens the
 * CoachReview route in the SAME (Progress) stack so Back returns to Recovery,
 * and that the row carries no Pro gate, price or upsell (the product is free).
 * ReadinessCards is mocked to a stub that draws the slot, the same style as
 * RecoveryScreen.rateLastSession.test.js.
 */
import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({ user: { id: 'u1' } })),
}));
jest.mock('../../components/BackHeader', () => () => null);
// PressableCard animates on the UI thread; here it is a host node so the props
// NavRow hands it (the spoken label, the press handler) can be read.
jest.mock('../../components/PressableCard', () => ({ __esModule: true, default: 'PressableCard' }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn() }));

let mockCardsProps = null;
jest.mock('../../components/ReadinessCards', () => {
  return function MockReadinessCards(props) {
    mockCardsProps = props;
    // Draw the slot exactly where the real component does: as a child.
    return props.afterByMuscle;
  };
});

import RecoveryScreen from '../RecoveryScreen';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

describe('RecoveryScreen offers the weekly volume review (D228 item 6)', () => {
  test('it hands the cards exactly one row, named and described as agreed, and a tap opens CoachReview', () => {
    const navigation = { navigate: jest.fn() };
    let tree;
    act(() => { tree = create(<RecoveryScreen navigation={navigation} />); });
    expect(mockCardsProps.afterByMuscle).toBeTruthy();

    const rows = tree.root.findAllByType('PressableCard');
    expect(rows).toHaveLength(1);
    expect(rows[0].props.accessibilityLabel)
      .toBe('Weekly volume review. Sets per muscle this week against your plan');
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Weekly volume review');
    expect(text).toContain('Sets per muscle this week against your plan');

    act(() => { rows[0].props.onPress(); });
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith('CoachReview');
  });

  test('the recovery section and its rate-last-session wiring are still asked for', () => {
    act(() => { create(<RecoveryScreen navigation={{ navigate: jest.fn() }} />); });
    expect(mockCardsProps.sections).toBe('recovery');
    expect(mockCardsProps.userId).toBe('u1');
    expect(typeof mockCardsProps.onRateLastSession).toBe('function');
  });
});
