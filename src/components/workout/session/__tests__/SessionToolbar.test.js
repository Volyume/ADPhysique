/**
 * SessionToolbar (register D220 addendum 14: the logger's header is the app's
 * modal chrome). The toolbar is a ModalHeader and nothing else: the X on the
 * left (Cancel workout), the session name centred at the title role with the
 * elapsed clock as its subtitle, and on the right the History glyph (only when
 * onHistory is given) and the amber icon-only Finish. There are no Rest or
 * Notes tools; those are rows on the exercise overflow sheet.
 *
 * Pins: the test ids present with and without onHistory, the spoken labels and
 * roles, the glyph names, sizes and colours, Finish icon only (no visible
 * word), the busy state, the 48 dp boxes, the bar's hairline and absent fill,
 * the title role and centring, the subtitle clock with and without startTime,
 * every callback firing once, and the token-only source guard.
 */
import fs from 'fs';
import path from 'path';
import { StyleSheet } from 'react-native';
import { create, act } from 'react-test-renderer';
import { colors, type } from '../../../../styles/theme';
import SessionToolbar from '../SessionToolbar';

const START = 1700000000000;
const MIN = 60 * 1000;
const SEC = 1000;

function render(props) {
  let tree;
  act(() => { tree = create(<SessionToolbar {...props} />); });
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
const flat = (style) => Object.assign({}, ...[].concat(style).filter(Boolean));
const glyphs = (node) => (node.root || node).findAll((n) => n.type === 'Ionicons');
const titleNode = (tree, title) => tree.root.findAll((n) => n.type === 'Text' && allText(n).join('') === title)[0];

afterEach(() => {
  jest.restoreAllMocks();
});

describe('SessionToolbar', () => {
  test('carries the close and finish test ids; the History glyph only when onHistory is given', () => {
    const tree = render({});
    byId(tree, 'volyume-workout-close');
    byId(tree, 'volyume-workout-finish');
    expect(hosts(tree, (p) => p.testID === 'volyume-tool-history')).toHaveLength(0);
    const withHistory = render({ onHistory: jest.fn() });
    ['volyume-workout-close', 'volyume-workout-finish', 'volyume-tool-history'].forEach((id) => byId(withHistory, id));
  });

  test('there are no Rest or Notes tools and no visible tool words', () => {
    const tree = render({ title: 'Push day', onHistory: jest.fn() });
    ['volyume-tool-rest', 'volyume-tool-notes'].forEach((id) => {
      expect(hosts(tree, (p) => p.testID === id)).toHaveLength(0);
    });
    // The only text is the title: no Rest, Notes or History caption.
    expect(allText(tree.toJSON())).toEqual(['Push day']);
  });

  test('every callback fires once', () => {
    const cb = { onClose: jest.fn(), onHistory: jest.fn(), onFinish: jest.fn() };
    const tree = render(cb);
    press(byId(tree, 'volyume-workout-close'));
    press(byId(tree, 'volyume-tool-history'));
    press(byId(tree, 'volyume-workout-finish'));
    Object.values(cb).forEach((fn) => expect(fn).toHaveBeenCalledTimes(1));
  });

  test('accessibility labels and roles', () => {
    const tree = render({ onHistory: jest.fn() });
    expect(byId(tree, 'volyume-workout-close').props.accessibilityLabel).toBe('Cancel workout');
    expect(byId(tree, 'volyume-workout-finish').props.accessibilityLabel).toBe('Finish workout');
    expect(byId(tree, 'volyume-tool-history').props.accessibilityLabel).toBe('History and records for the current exercise');
    ['volyume-workout-close', 'volyume-workout-finish', 'volyume-tool-history']
      .forEach((id) => expect(byId(tree, id).props.accessibilityRole).toBe('button'));
  });

  test('Close is the 24 dp X in primary ink', () => {
    const tree = render({});
    const close = glyphs(byId(tree, 'volyume-workout-close'));
    expect(close).toHaveLength(1);
    expect(close[0].props.name).toBe('close');
    expect(close[0].props.size).toBe(24);
    expect(close[0].props.color).toBe(colors.textPrimary);
  });

  test('History is the outlined stats glyph at 24 dp in primary ink', () => {
    const tree = render({ onHistory: jest.fn() });
    const glyph = glyphs(byId(tree, 'volyume-tool-history'));
    expect(glyph).toHaveLength(1);
    expect(glyph[0].props.name).toBe('stats-chart-outline');
    expect(glyph[0].props.size).toBe(24);
    expect(glyph[0].props.color).toBe(colors.textPrimary);
  });

  test('Finish is the amber double check at 24 dp, icon only: no visible word', () => {
    const tree = render({ title: 'Push day', startTime: START, onHistory: jest.fn() });
    const finish = glyphs(byId(tree, 'volyume-workout-finish'));
    expect(finish).toHaveLength(1);
    expect(finish[0].props.name).toBe('checkmark-done');
    expect(finish[0].props.size).toBe(24);
    expect(finish[0].props.color).toBe(colors.primary);
    expect(allText(byId(tree, 'volyume-workout-finish'))).toEqual([]);
    const words = allText(tree.toJSON());
    expect(words).not.toContain('Finish');
    expect(words).not.toContain('Finish workout');
  });

  test('the right accessory is a centred row with an 8 dp gap, History before Finish', () => {
    const tree = render({ onHistory: jest.fn() });
    const rows = hosts(tree, (p) => flat(p.style).flexDirection === 'row' && flat(p.style).gap === 8);
    expect(rows).toHaveLength(1);
    expect(flat(rows[0].props.style).alignItems).toBe('center');
    const order = rows[0].findAll((n) => typeof n.type === 'string' && typeof n.props.testID === 'string')
      .map((n) => n.props.testID);
    expect(order).toEqual(['volyume-tool-history', 'volyume-workout-finish']);
  });

  test('the bar: a bottom hairline in the subtle border colour, 16/12 padding, and no fill', () => {
    const tree = render({ onHistory: jest.fn() });
    const bar = flat(tree.toJSON().props.style);
    expect(typeof StyleSheet.hairlineWidth).toBe('number');
    expect(bar.borderBottomWidth).toBe(StyleSheet.hairlineWidth);
    expect(bar.borderBottomColor).toBe(colors.borderSubtle);
    expect(bar.paddingHorizontal).toBe(16);
    expect(bar.paddingVertical).toBe(12);
    expect(bar.backgroundColor).toBeUndefined();
  });

  test('chromeless controls: no fill, border or divider on Close, History or Finish', () => {
    const tree = render({ onHistory: jest.fn() });
    ['volyume-workout-close', 'volyume-tool-history', 'volyume-workout-finish'].forEach((id) => {
      const s = flat(byId(tree, id).props.style);
      expect(s.backgroundColor).toBeUndefined();
      expect(s.borderWidth).toBeUndefined();
      expect(s.borderColor).toBeUndefined();
    });
    const edged = tree.root.findAll((n) => typeof n.type === 'string'
      && (flat(n.props.style).borderLeftWidth !== undefined || flat(n.props.style).borderRightWidth !== undefined
        || flat(n.props.style).width === 1));
    expect(edged).toHaveLength(0);
  });

  test('hit targets: Close is a 48 dp wide box with a 48 dp minimum height; History and Finish are 48 by 48', () => {
    const tree = render({ onHistory: jest.fn() });
    const close = flat(byId(tree, 'volyume-workout-close').props.style);
    expect(close.width).toBe(48);
    expect(close.minHeight).toBe(48);
    ['volyume-tool-history', 'volyume-workout-finish'].forEach((id) => {
      const s = flat(byId(tree, id).props.style);
      expect(s.width).toBe(48);
      expect(s.height).toBe(48);
    });
  });

  test('the title is the title prop at the title role in primary ink, one line, centred', () => {
    const tree = render({ title: 'Push day' });
    const node = titleNode(tree, 'Push day');
    expect(node).toBeDefined();
    expect(node.props.numberOfLines).toBe(1);
    const s = flat(node.props.style);
    expect(s.color).toBe(colors.textPrimary);
    expect(s.fontSize).toBe(type.title.fontSize);
    expect(s.fontFamily).toBe(type.title.fontFamily);
    expect(s.textAlign).toBe('center');
  });

  describe('subtitle clock', () => {
    test('with startTime: a timer node under the title showing the elapsed time', () => {
      jest.spyOn(Date, 'now').mockReturnValue(START + 12 * MIN + 6 * SEC);
      const tree = render({ title: 'Push day', startTime: START });
      const timers = hosts(tree, (p) => p.accessibilityRole === 'timer');
      expect(timers).toHaveLength(1);
      expect(timers[0].props.accessibilityLabel).toBe('Elapsed 12 minutes 6 seconds');
      expect(allText(timers[0])).toEqual(['12:06']);
      expect(allText(tree.toJSON())).toEqual(['Push day', '12:06']);
    });

    test('without startTime: no timer node and no numerals', () => {
      const tree = render({ title: 'Push day', onHistory: jest.fn() });
      expect(hosts(tree, (p) => p.accessibilityRole === 'timer')).toHaveLength(0);
      const words = allText(tree.toJSON());
      expect(words.join(' ')).not.toContain('Elapsed');
      expect(words.filter((w) => /^\d+:\d{2}$/.test(w))).toHaveLength(0);
    });
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
