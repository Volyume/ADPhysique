/**
 * SessionHeader (12-BUILD-SPEC sections 2 and 3, register D220). Pins: the title
 * at the h2 role, the placeholder and the real note, the note line as a 48 dp
 * button that calls onNotes, the glyph, and the token-only source guard.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { colors, type } from '../../../../styles/theme';
import SessionHeader from '../SessionHeader';

function render(props) {
  let tree;
  act(() => { tree = create(<SessionHeader name="Upper A" {...props} />); });
  return tree;
}
const hosts = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n.props || {}));
const flat = (style) => Object.assign({}, ...[].concat(style).filter(Boolean));
function allText(node) {
  if (node == null) return [];
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap(allText);
  return allText(node.children);
}
const noteButton = (tree) => hosts(tree, (p) => p.accessibilityRole === 'button')[0];

describe('SessionHeader', () => {
  test('the title is a header at the h2 role in primary ink', () => {
    const tree = render({});
    const title = hosts(tree, (p) => p.accessibilityRole === 'header')[0];
    expect(allText(title)).toEqual(['Upper A']);
    const s = flat(title.props.style);
    expect(s.fontSize).toBe(type.h2.fontSize);
    expect(s.fontFamily).toBe(type.h2.fontFamily);
    expect(s.color).toBe(colors.textPrimary);
  });

  // Founder device verdict 2026-10-08: no "Add notes here" control under the
  // title (the toolbar's Notes tool is the one way in); a written note shows
  // quietly and opens the same sheet.
  test.each([[undefined], [null], [''], ['   ']])('no note (%p) shows nothing under the title', (note) => {
    const tree = render({ note });
    expect(allText(tree.toJSON())).not.toContain('Add notes here');
    expect(hosts(tree, (p) => p.accessibilityRole === 'button')).toHaveLength(0);
  });

  test('a written note shows, is spoken, and is a 48 dp button that calls onNotes with no arguments', () => {
    const onNotes = jest.fn();
    const tree = render({ note: '  Shoulder felt tight  ', onNotes });
    expect(allText(tree.toJSON())).toContain('Shoulder felt tight');
    const button = noteButton(tree);
    expect(button.props.accessibilityLabel).toBe('Session note: Shoulder felt tight');
    expect(flat(button.props.style).minHeight).toBe(48);
    act(() => { button.props.onPress(); });
    expect(onNotes).toHaveBeenCalledTimes(1);
    expect(onNotes).toHaveBeenCalledWith();
    const text = hosts(tree, (p) => p.numberOfLines === 2 && p.accessibilityRole !== 'header')[0];
    const s = flat(text.props.style);
    expect(s.color).toBe(colors.textMuted);
    expect(s.fontSize).toBe(type.bodySm.fontSize);
    expect(tree.root.findAll((n) => n.type === 'Ionicons')).toHaveLength(0);
  });

  test('the surface is the section colour', () => {
    const tree = render({});
    expect(flat(tree.toJSON().props.style).backgroundColor).toBe(colors.surface);
  });
});

describe('SessionHeader source guard (tokens only)', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'SessionHeader.js'), 'utf8');
  test('no hex or rgb literal', () => {
    expect(SRC).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(SRC).not.toMatch(/rgba?\(/);
  });
  test('no fontSize or fontWeight literal', () => {
    expect(SRC).not.toMatch(/fontSize\s*:/);
    expect(SRC).not.toMatch(/fontWeight\s*:/);
  });
  test('no em dash', () => {
    expect(SRC).not.toContain(String.fromCharCode(0x2014));
  });
});
