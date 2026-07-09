// Wave 3 (results-ui-and-copy-blueprint.md §1, exact copy). One-time meaning
// moment before a user's first-ever score render.
jest.mock('../../lib/haptics', () => ({ selection: jest.fn() }));

import { create, act } from 'react-test-renderer';
import ProgressScanMeaningMoment from '../ProgressScanMeaningMoment';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

describe('ProgressScanMeaningMoment', () => {
  test('renders the exact results-blueprint §1 copy and a single Understood action', async () => {
    let tree;
    await act(async () => { tree = create(<ProgressScanMeaningMoment onDismiss={jest.fn()} />); });
    const text = flattenText(tree.toJSON());
    expect(text).toContain(
      'The Volyume Score is a progress read from your own photos. It is not a body fat measurement, '
      + 'a medical assessment, or a comparison with anyone else.',
    );
    expect(text).toContain('Understood');
  });

  test('pressing Understood calls onDismiss', async () => {
    const onDismiss = jest.fn();
    let tree;
    await act(async () => { tree = create(<ProgressScanMeaningMoment onDismiss={onDismiss} />); });
    const button = tree.root.findAll(
      (n) => typeof n.props?.accessibilityLabel === 'string' && n.props.accessibilityLabel === 'Understood',
    )[0];
    expect(button).toBeTruthy();
    await act(async () => { button.props.onPress(); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('carries no em dash and no numeric range/percentage', async () => {
    let tree;
    await act(async () => { tree = create(<ProgressScanMeaningMoment onDismiss={jest.fn()} />); });
    const text = flattenText(tree.toJSON());
    expect(text).not.toContain('—');
    expect(text).not.toMatch(/\d+\s*-\s*\d+%|\d+%/);
  });
});
