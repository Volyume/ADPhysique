/**
 * SessionHeader (12-BUILD-SPEC sections 2 and 3, register D220). Pins: the title
 * at the title role (semibold; a label over the cards, not an h2 page heading,
 * founder render verdict 2026-10-09), a name-only prop surface (a note prop
 * draws nothing: the note lives behind the toolbar's Notes tool, D220 addendum
 * 10), no button, no glyph, and the token-only source guard.
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

describe('SessionHeader', () => {
  test('the title is a header at the title role, semibold, in primary ink', () => {
    const tree = render({});
    const title = hosts(tree, (p) => p.accessibilityRole === 'header')[0];
    expect(allText(title)).toEqual(['Upper A']);
    const s = flat(title.props.style);
    expect(s.fontSize).toBe(type.title.fontSize);
    expect(s.fontFamily).toBe(type.w(type.title, 'semibold').fontFamily);
    expect(s.color).toBe(colors.textPrimary);
  });

  // Founder verdict 2026-10-09 (D220 addendum 10): the session note is not
  // echoed on the page; the toolbar's Notes tool is the one way in.
  test.each([[undefined], [''], ['  Shoulder felt tight  ']])('a note prop (%p) draws nothing extra: one Text, no button, no glyph', (note) => {
    const tree = render({ note, onNotes: jest.fn() });
    expect(tree.root.findAll((n) => n.type === 'Text')).toHaveLength(1);
    expect(allText(tree.toJSON())).toEqual(['Upper A']);
    expect(hosts(tree, (p) => p.accessibilityRole === 'button')).toHaveLength(0);
    expect(hosts(tree, (p) => typeof p.onPress === 'function')).toHaveLength(0);
    expect(tree.root.findAll((n) => n.type === 'Ionicons')).toHaveLength(0);
  });

  test('the title is capped at two lines', () => {
    const title = hosts(render({}), (p) => p.accessibilityRole === 'header')[0];
    expect(title.props.numberOfLines).toBe(2);
  });

  test('no surface fill on the wrapper: it sits on the page with vertical padding only', () => {
    const tree = render({});
    const wrap = flat(tree.toJSON().props.style);
    expect(wrap.backgroundColor).toBeUndefined();
    expect(wrap.paddingVertical).toBe(4);
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
