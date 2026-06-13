/**
 * U-B-1 §3/§6: the shared CollapsibleSection (the CoachOutput "More
 * adjustments" secondary uses it) must keep its children OUT of the rendered
 * tree until it is opened — that is what guarantees the non-hero adjustments are
 * not shown until the user expands them.
 */
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';
import CollapsibleSection from '../CollapsibleSection';

function json(open) {
  let tree;
  act(() => {
    tree = create(
      <CollapsibleSection title="More adjustments (2)" open={open} onToggle={() => {}}>
        <Text>SECONDARY_CHILD</Text>
      </CollapsibleSection>,
    );
  });
  return JSON.stringify(tree.toJSON());
}

describe('CollapsibleSection', () => {
  test('children are absent from the tree when collapsed', () => {
    const blob = json(false);
    expect(blob).toContain('More adjustments (2)'); // header always shows
    expect(blob).not.toContain('SECONDARY_CHILD'); // body hidden until opened
  });

  test('children render when open', () => {
    const blob = json(true);
    expect(blob).toContain('SECONDARY_CHILD');
  });

  test('legacy body string still renders when open and no children given', () => {
    let tree;
    act(() => {
      tree = create(<CollapsibleSection title="T" body="LEGACY_BODY" open onToggle={() => {}} />);
    });
    expect(JSON.stringify(tree.toJSON())).toContain('LEGACY_BODY');
  });
});
