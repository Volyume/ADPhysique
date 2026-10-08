/**
 * SectionHeader (D221 visual law V2): the title is announced as a header, the
 * row is 56 dp, the one optional trailing action is a button with a 48 dp
 * target, and nothing in the file is amber or uppercase.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';

import SectionHeader, { SECTION_HEADER_HEIGHT } from '../SectionHeader';

function render(props) {
  let tree;
  act(() => { tree = create(<SectionHeader {...props} />); });
  return tree;
}

describe('SectionHeader', () => {
  test('the title carries the header role', () => {
    const tree = render({ title: 'Your gym' });
    const header = tree.root.findAll((n) => n.props?.accessibilityRole === 'header')[0];
    expect(header).toBeTruthy();
    expect(header.props.children).toBe('Your gym');
  });

  test('44 dp tall (the house SectionLabel eyebrow, founder verdict 2026-10-08)', () => {
    expect(SECTION_HEADER_HEIGHT).toBe(44);
    const tree = render({ title: 'Groups' });
    const flat = [].concat(...tree.root.findAll((n) => n.props?.style).map((n) => [].concat(n.props.style)));
    expect(flat.some((s) => s && s.minHeight === 44)).toBe(true);
  });

  test('the trailing action is a button, 48 dp, and fires', () => {
    const onPress = jest.fn();
    const tree = render({ title: 'Host', trailing: { label: 'Not now', onPress } });
    const button = tree.root.findAll((n) => n.props?.accessibilityRole === 'button' && typeof n.props.onPress === 'function')[0];
    expect(button.props.accessibilityLabel).toBe('Not now');
    const flat = [].concat(button.props.style);
    expect(flat.some((s) => s && s.minHeight === 48 && s.minWidth === 48)).toBe(true);
    act(() => { button.props.onPress(); });
    expect(onPress).toHaveBeenCalled();
  });

  test('no trailing action by default', () => {
    const tree = render({ title: 'Disciplines' });
    expect(tree.root.findAll((n) => n.props?.accessibilityRole === 'button')).toHaveLength(0);
  });

  test('source: no amber, no uppercase, no hex', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../SectionHeader.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    expect(src).not.toMatch(/primary/);
    expect(src).not.toMatch(/uppercase|textTransform/);
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
