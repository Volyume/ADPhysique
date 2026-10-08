/**
 * SessionToolbar (12-BUILD-SPEC sections 2 to 4, register D220). Pins: the four
 * test ids, every callback, the icon-only Finish with its full spoken name, the
 * busy state, the clock it contains, the tool labels, and the token-only
 * source guard.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { colors } from '../../../../styles/theme';
import SessionToolbar from '../SessionToolbar';

function render(props) {
  let tree;
  act(() => { tree = create(<SessionToolbar startTime={1700000000000} {...props} />); });
  return tree;
}
const hosts = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n.props || {}));
const byId = (tree, id) => {
  const found = hosts(tree, (p) => p.testID === id);
  expect(found).toHaveLength(1);
  return found[0];
};
const press = (node) => act(() => { node.props.onPress(); });
function allText(node) {
  if (node == null) return [];
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap(allText);
  return allText(node.children);
}
const glyphs = (node) => (node.root || node).findAll((n) => n.type === 'Ionicons');

describe('SessionToolbar', () => {
  test('carries the three test ids', () => {
    const tree = render({});
    ['volyume-workout-close', 'volyume-workout-finish', 'volyume-tool-rest']
      .forEach((id) => byId(tree, id));
    // The Notes tool was removed (founder device verdict 2026-10-08): the
    // note line under the title is the one way into the session note.
    expect(tree.root.findAll((n) => n.props && n.props.testID === 'volyume-tool-notes')).toHaveLength(0);
  });

  test('every callback fires once', () => {
    const cb = { onClose: jest.fn(), onRest: jest.fn(), onFinish: jest.fn() };
    const tree = render(cb);
    press(byId(tree, 'volyume-workout-close'));
    press(byId(tree, 'volyume-tool-rest'));
    press(byId(tree, 'volyume-workout-finish'));
    Object.values(cb).forEach((fn) => expect(fn).toHaveBeenCalledTimes(1));
  });

  test('accessibility labels and roles', () => {
    const tree = render({});
    expect(byId(tree, 'volyume-workout-close').props.accessibilityLabel).toBe('Cancel workout');
    expect(byId(tree, 'volyume-workout-finish').props.accessibilityLabel).toBe('Finish workout');
    expect(byId(tree, 'volyume-tool-rest').props.accessibilityLabel).toBe('Rest timer');
    ['volyume-workout-close', 'volyume-workout-finish', 'volyume-tool-rest']
      .forEach((id) => expect(byId(tree, id).props.accessibilityRole).toBe('button'));
  });

  test('tools are named under their glyphs; Finish shows no word (icon only)', () => {
    const tree = render({});
    const words = allText(tree.toJSON());
    expect(words).toContain('Rest');
    expect(words).not.toContain('Notes');
    expect(words).not.toContain('Finish');
    expect(words).not.toContain('Finish workout');
  });

  test('Finish is the amber double check; the tools are 22 dp in primary ink', () => {
    const tree = render({});
    const finish = glyphs(byId(tree, 'volyume-workout-finish'));
    expect(finish).toHaveLength(1);
    expect(finish[0].props.name).toBe('checkmark-done');
    expect(finish[0].props.color).toBe(colors.primary);
    const rest = glyphs(byId(tree, 'volyume-tool-rest'))[0];
    expect(rest.props.name).toBe('timer-outline');
    expect(rest.props.size).toBe(22);
    expect(rest.props.color).toBe(colors.textPrimary);
  });

  test('contains the session clock', () => {
    const tree = render({});
    const clock = hosts(tree, (p) => p.accessibilityRole === 'timer');
    expect(clock).toHaveLength(1);
  });

  describe('finishBusy', () => {
    test('idle: enabled, not busy', () => {
      const node = byId(render({}), 'volyume-workout-finish');
      expect(node.props.disabled).toBe(false);
      expect(node.props.accessibilityState).toEqual({ busy: false, disabled: false });
    });

    test('busy: disabled, busy state, a spinner instead of the glyph, same spoken name', () => {
      const tree = render({ finishBusy: true });
      const node = byId(tree, 'volyume-workout-finish');
      expect(node.props.disabled).toBe(true);
      expect(node.props.accessibilityState).toEqual({ busy: true, disabled: true });
      expect(node.props.accessibilityLabel).toBe('Finish workout');
      expect(glyphs(node)).toHaveLength(0);
      const spinner = node.findAll((n) => n.type === 'ActivityIndicator');
      expect(spinner).toHaveLength(1);
      expect(spinner[0].props.color).toBe(colors.primary);
    });
  });

  test('hit targets: the controls are at least 48 dp', () => {
    const tree = render({});
    const flat = (style) => Object.assign({}, ...[].concat(style).filter(Boolean));
    ['volyume-workout-close', 'volyume-workout-finish'].forEach((id) => {
      const s = flat(byId(tree, id).props.style);
      expect(s.width).toBe(48);
      expect(s.height).toBe(48);
    });
    ['volyume-tool-rest'].forEach((id) => {
      const s = flat(byId(tree, id).props.style);
      expect(s.width).toBe(56);
      expect(s.minHeight).toBe(48);
    });
  });
});

describe('SessionToolbar source guard (tokens only)', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'SessionToolbar.js'), 'utf8');
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
  test('the visible word Finish is not drawn', () => {
    expect(SRC).not.toMatch(/>\s*Finish\s*</);
  });
});
