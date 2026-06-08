jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

import { Text } from 'react-native';
import { create, act } from 'react-test-renderer';
import CoachingNotesPanel from '../CoachingNotesPanel';
import { FORM_TIPS } from '../../lib/formTips';

function texts(tree) {
  return tree.root.findAllByType(Text)
    .map(n => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children))
    .filter(t => typeof t === 'string');
}

describe('CoachingNotesPanel = the Technique guide', () => {
  test('renders as "Technique guide" and is OPEN by default, showing the prose', () => {
    let tree;
    act(() => {
      tree = create(<CoachingNotesPanel formTip={FORM_TIPS['Face Pull']} />);
    });
    const t = texts(tree);
    // Labelled to match the card's "Technique guide below" promise
    expect(t).toContain('Technique guide');
    // The actual written technique is visible without tapping (open by default)
    expect(t.some(s => s.includes('Pull the rope toward your face'))).toBe(true);
  });

  test('renders nothing when there is genuinely no content', () => {
    let tree;
    act(() => { tree = create(<CoachingNotesPanel />); });
    expect(tree.root.findAllByType(Text).length).toBe(0);
  });
});
