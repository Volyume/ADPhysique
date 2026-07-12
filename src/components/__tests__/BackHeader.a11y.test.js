/**
 * AX-07 (launch accessibility audit, 2026-07-12): native heading navigation
 * was almost absent -- the audit counted 61 BackHeader call sites but only
 * 10 accessibilityRole="header" uses in the whole native source, so
 * VoiceOver/TalkBack heading navigation could not scan long screens. This
 * suite pins that BackHeader's title -- the screen's primary heading at
 * every call site -- carries accessibilityRole="header" by default, with no
 * opt-in required, and that this doesn't disturb existing layout/props.
 */
import { Text } from 'react-native';
import { create, act } from 'react-test-renderer';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

import BackHeader from '../BackHeader';

describe('BackHeader accessibility (AX-07)', () => {
  test('the title carries accessibilityRole="header" by default', () => {
    let tree;
    act(() => { tree = create(<BackHeader title="Settings" />); });
    const title = tree.root.findAllByType(Text).find((n) => n.props.children === 'Settings');
    expect(title).toBeTruthy();
    expect(title.props.accessibilityRole).toBe('header');
  });

  test('numberOfLines and the back button/right slot are unaffected', () => {
    let tree;
    act(() => { tree = create(<BackHeader title="Settings" right={<Text>Add</Text>} />); });
    const title = tree.root.findAllByType(Text).find((n) => n.props.children === 'Settings');
    expect(title.props.numberOfLines).toBe(1);
    expect(tree.root.findByProps({ accessibilityLabel: 'Go back' })).toBeTruthy();
  });
});
