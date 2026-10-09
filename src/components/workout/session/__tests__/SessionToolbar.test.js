/**
 * SessionToolbar (12-BUILD-SPEC sections 2 to 4, register D220). Pins: the four
 * test ids plus the History tool that renders only when onHistory is given
 * (D220 addendum 10), every callback, the icon-only Finish with its full spoken
 * name, the busy state, the clock it contains, the tool labels, and the
 * token-only source guard.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { colors, type } from '../../../../styles/theme';
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
const ALL_IDS = ['volyume-workout-close', 'volyume-workout-finish', 'volyume-tool-rest', 'volyume-tool-notes', 'volyume-tool-history'];
const glyphs = (node) => (node.root || node).findAll((n) => n.type === 'Ionicons');

describe('SessionToolbar', () => {
  test('carries the four test ids; the History tool only when onHistory is given', () => {
    const tree = render({});
    ['volyume-workout-close', 'volyume-workout-finish', 'volyume-tool-rest', 'volyume-tool-notes']
      .forEach((id) => byId(tree, id));
    expect(hosts(tree, (p) => p.testID === 'volyume-tool-history')).toHaveLength(0);
    expect(allText(tree.toJSON())).not.toContain('History');
    const withHistory = render({ onHistory: jest.fn() });
    [...ALL_IDS].forEach((id) => byId(withHistory, id));
  });

  test('the History tool sits after Notes: stats glyph, History caption, spoken name and hint, calls onHistory once', () => {
    const onHistory = jest.fn();
    const tree = render({ onHistory });
    const tool = byId(tree, 'volyume-tool-history');
    expect(tool.props.accessibilityRole).toBe('button');
    expect(tool.props.accessibilityLabel).toBe('History and records');
    expect(tool.props.accessibilityHint).toBe('Previous sessions and records for the current exercise');
    const glyph = glyphs(tool);
    expect(glyph).toHaveLength(1);
    expect(glyph[0].props.name).toBe('stats-chart-outline');
    expect(glyph[0].props.size).toBe(22);
    expect(glyph[0].props.color).toBe(colors.textSecondary);
    expect(allText(tool)).toEqual(['History']);
    const order = hosts(tree, (p) => typeof p.testID === 'string' && p.testID.startsWith('volyume-tool-')).map((n) => n.props.testID);
    expect(order).toEqual(['volyume-tool-rest', 'volyume-tool-notes', 'volyume-tool-history']);
    press(tool);
    expect(onHistory).toHaveBeenCalledTimes(1);
  });

  test('every callback fires once', () => {
    const cb = { onClose: jest.fn(), onRest: jest.fn(), onNotes: jest.fn(), onFinish: jest.fn() };
    const tree = render(cb);
    press(byId(tree, 'volyume-workout-close'));
    press(byId(tree, 'volyume-tool-rest'));
    press(byId(tree, 'volyume-tool-notes'));
    press(byId(tree, 'volyume-workout-finish'));
    Object.values(cb).forEach((fn) => expect(fn).toHaveBeenCalledTimes(1));
  });

  test('accessibility labels and roles', () => {
    const tree = render({});
    expect(byId(tree, 'volyume-workout-close').props.accessibilityLabel).toBe('Cancel workout');
    expect(byId(tree, 'volyume-workout-finish').props.accessibilityLabel).toBe('Finish workout');
    expect(byId(tree, 'volyume-tool-rest').props.accessibilityLabel).toBe('Rest timer');
    expect(byId(tree, 'volyume-tool-notes').props.accessibilityLabel).toBe('Session notes');
    ['volyume-workout-close', 'volyume-workout-finish', 'volyume-tool-rest', 'volyume-tool-notes']
      .forEach((id) => expect(byId(tree, id).props.accessibilityRole).toBe('button'));
  });

  test('tools are named under their glyphs; Finish shows no word (icon only)', () => {
    const tree = render({});
    const words = allText(tree.toJSON());
    expect(words).toContain('Rest');
    expect(words).toContain('Notes');
    expect(words).not.toContain('Finish');
    expect(words).not.toContain('Finish workout');
  });

  test('Finish is the amber double check; the tools are 22 dp in secondary ink under a caption label; Cancel is a muted X', () => {
    const tree = render({});
    const finish = glyphs(byId(tree, 'volyume-workout-finish'));
    expect(finish).toHaveLength(1);
    expect(finish[0].props.name).toBe('checkmark-done');
    expect(finish[0].props.color).toBe(colors.primary);
    ['volyume-tool-rest', 'volyume-tool-notes'].forEach((id) => {
      const glyph = glyphs(byId(tree, id))[0];
      expect(glyph.props.size).toBe(22);
      expect(glyph.props.color).toBe(colors.textSecondary);
    });
    expect(glyphs(byId(tree, 'volyume-tool-rest'))[0].props.name).toBe('timer-outline');
    ['Rest', 'Notes'].forEach((word) => {
      const label = tree.root.findAll((n) => n.type === 'Text' && allText(n).join('') === word)[0];
      const s = Object.assign({}, ...[].concat(label.props.style).filter(Boolean));
      expect(s.color).toBe(colors.textSecondary);
      expect(s.fontSize).toBe(type.caption.fontSize);
      expect(s.fontFamily).toBe(type.caption.fontFamily);
    });
    const close = glyphs(byId(tree, 'volyume-workout-close'))[0];
    expect(close.props.name).toBe('close');
    expect(close.props.color).toBe(colors.textMuted);
  });

  test('chromeless: a bottom hairline and no fill on the bar, no divider, no border or fill on Finish or the tools', () => {
    const tree = render({ onHistory: jest.fn() });
    const flatten = (style) => Object.assign({}, ...[].concat(style).filter(Boolean));
    const bar = flatten(tree.toJSON().props.style);
    expect(bar.borderBottomWidth).toBe(1);
    expect(bar.borderBottomColor).toBe(colors.borderSubtle);
    expect(bar.backgroundColor).toBeUndefined();
    ['volyume-workout-finish', 'volyume-workout-close', 'volyume-tool-rest', 'volyume-tool-notes', 'volyume-tool-history'].forEach((id) => {
      const s = flatten(byId(tree, id).props.style);
      expect(s.backgroundColor).toBeUndefined();
      expect(s.borderWidth).toBeUndefined();
      expect(s.borderColor).toBeUndefined();
    });
    // The only things with an edge are the bar's own bottom hairline.
    const edged = tree.root.findAll((n) => typeof n.type === 'string'
      && (flatten(n.props.style).borderLeftWidth !== undefined || flatten(n.props.style).borderRightWidth !== undefined
        || flatten(n.props.style).width === 1));
    expect(edged).toHaveLength(0);
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
    const tree = render({ onHistory: jest.fn() });
    const flat = (style) => Object.assign({}, ...[].concat(style).filter(Boolean));
    ['volyume-workout-close', 'volyume-workout-finish'].forEach((id) => {
      const s = flat(byId(tree, id).props.style);
      expect(s.width).toBe(48);
      expect(s.height).toBe(48);
    });
    ['volyume-tool-rest', 'volyume-tool-notes', 'volyume-tool-history'].forEach((id) => {
      const s = flat(byId(tree, id).props.style);
      expect(s.width).toBe(52);
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
