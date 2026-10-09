/**
 * SessionToolbar (12-BUILD-SPEC sections 2 to 4, register D220; laid out again
 * on the founder's verdict of 2026-10-09, D220 addendum 15). Pins: five
 * controls in ONE style (Cancel, Rest, Notes, History, Finish), spaced evenly
 * by a space-between row; each a 48 dp target holding one 24 dp glyph with no
 * fill, no border and no caption; the glyph names and inks (text ink on every
 * control, amber on Finish alone); no text anywhere in the bar; the test ids
 * (four without onHistory, History only when onHistory is given); the spoken
 * labels and hints; the icon-only Finish and its busy state; every callback
 * firing once; and the token-only source guard.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { colors, iconSize, spacing } from '../../../../styles/theme';
import { touchTarget } from '../../../../styles/layout';
import SessionToolbar from '../SessionToolbar';

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
const flatten = (style) => Object.assign({}, ...[].concat(style).filter(Boolean));
function allText(node) {
  if (node == null) return [];
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap(allText);
  return allText(node.children);
}
const glyphs = (node) => (node.root || node).findAll((n) => n.type === 'Ionicons');

const CLOSE = 'volyume-workout-close';
const REST = 'volyume-tool-rest';
const NOTES = 'volyume-tool-notes';
const HISTORY = 'volyume-tool-history';
const FINISH = 'volyume-workout-finish';
const ALL_IDS = [CLOSE, REST, NOTES, HISTORY, FINISH];
const IDS_WITHOUT_HISTORY = [CLOSE, REST, NOTES, FINISH];

describe('SessionToolbar', () => {
  test('carries the four test ids; the History tool only when onHistory is given', () => {
    const tree = render({});
    IDS_WITHOUT_HISTORY.forEach((id) => byId(tree, id));
    expect(hosts(tree, (p) => p.testID === HISTORY)).toHaveLength(0);
    const withHistory = render({ onHistory: jest.fn() });
    ALL_IDS.forEach((id) => byId(withHistory, id));
  });

  test('the five controls sit in one row in order: Cancel, Rest, Notes, History, Finish', () => {
    const tree = render({ onHistory: jest.fn() });
    const order = hosts(tree, (p) => typeof p.testID === 'string' && p.testID.startsWith('volyume-')).map((n) => n.props.testID);
    expect(order).toEqual(ALL_IDS);
  });

  test('even spacing: the bar is a space-between row, centred, 56 dp minimum, 4 dp side padding, no fill', () => {
    const tree = render({ onHistory: jest.fn() });
    const bar = flatten(tree.toJSON().props.style);
    expect(bar.flexDirection).toBe('row');
    expect(bar.justifyContent).toBe('space-between');
    expect(bar.alignItems).toBe('center');
    expect(bar.minHeight).toBe(56);
    expect(bar.paddingHorizontal).toBe(spacing.xs);
    expect(bar.paddingHorizontal).toBe(4);
    // Founder, 2026-10-09: a 2 dp amber line, the rest strip's drain line.
    expect(bar.borderBottomWidth).toBe(2);
    expect(bar.borderBottomColor).toBe(colors.primaryFill);
    expect(bar.backgroundColor).toBeUndefined();
  });

  test('all five controls share one style: a 48 by 48 target, no fill, no border', () => {
    const tree = render({ onHistory: jest.fn() });
    const styles = ALL_IDS.map((id) => flatten(byId(tree, id).props.style));
    styles.forEach((s) => {
      expect(s.width).toBe(touchTarget.minimum);
      expect(s.width).toBe(48);
      expect(s.height).toBe(touchTarget.minimum);
      expect(s.height).toBe(48);
      expect(s.backgroundColor).toBeUndefined();
      expect(s.borderWidth).toBeUndefined();
      expect(s.borderColor).toBeUndefined();
      expect(s.borderRadius).toBeUndefined();
    });
    styles.forEach((s) => expect(s).toEqual(styles[0]));
    // The only thing with an edge is the bar's own bottom hairline.
    const edged = tree.root.findAll((n) => typeof n.type === 'string'
      && (flatten(n.props.style).borderLeftWidth !== undefined || flatten(n.props.style).borderRightWidth !== undefined
        || flatten(n.props.style).width === 1));
    expect(edged).toHaveLength(0);
  });

  test('glyphs: one Ionicons of 24 dp per control with the named icon', () => {
    const tree = render({ onHistory: jest.fn() });
    const names = {
      [CLOSE]: 'close',
      [REST]: 'timer-outline',
      [NOTES]: 'create-outline',
      [HISTORY]: 'stats-chart-outline',
      [FINISH]: 'checkmark-done',
    };
    Object.entries(names).forEach(([id, name]) => {
      const g = glyphs(byId(tree, id));
      expect(g).toHaveLength(1);
      expect(g[0].props.name).toBe(name);
      expect(g[0].props.size).toBe(iconSize.lg);
      expect(g[0].props.size).toBe(24);
    });
  });

  test('inks: text ink on Cancel, Rest, Notes and History; amber on Finish alone', () => {
    const tree = render({ onHistory: jest.fn() });
    [CLOSE, REST, NOTES, HISTORY].forEach((id) => {
      expect(glyphs(byId(tree, id))[0].props.color).toBe(colors.textPrimary);
    });
    expect(glyphs(byId(tree, FINISH))[0].props.color).toBe(colors.primary);
  });

  test('no text anywhere in the bar: no captions, no Rest, Notes, History or Finish word', () => {
    [render({}), render({ onHistory: jest.fn() }), render({ finishBusy: true })].forEach((tree) => {
      expect(tree.root.findAll((n) => n.type === 'Text')).toHaveLength(0);
      expect(allText(tree.toJSON())).toEqual([]);
    });
  });

  test('the History tool: spoken name and hint, a button, calls onHistory once', () => {
    const onHistory = jest.fn();
    const tree = render({ onHistory });
    const tool = byId(tree, HISTORY);
    expect(tool.props.accessibilityRole).toBe('button');
    expect(tool.props.accessibilityLabel).toBe('History and records');
    expect(tool.props.accessibilityHint).toBe('Previous sessions and records for the current exercise');
    press(tool);
    expect(onHistory).toHaveBeenCalledTimes(1);
  });

  test('every callback fires once, each from its own control', () => {
    const cb = {
      onClose: jest.fn(), onRest: jest.fn(), onNotes: jest.fn(), onHistory: jest.fn(), onFinish: jest.fn(),
    };
    const tree = render(cb);
    press(byId(tree, CLOSE));
    Object.entries(cb).forEach(([key, fn]) => expect(fn).toHaveBeenCalledTimes(key === 'onClose' ? 1 : 0));
    press(byId(tree, REST));
    press(byId(tree, NOTES));
    press(byId(tree, HISTORY));
    press(byId(tree, FINISH));
    Object.values(cb).forEach((fn) => expect(fn).toHaveBeenCalledTimes(1));
  });

  test('accessibility labels, hints and roles; only Finish carries an accessibilityState', () => {
    const tree = render({ onHistory: jest.fn() });
    expect(byId(tree, CLOSE).props.accessibilityLabel).toBe('Cancel workout');
    expect(byId(tree, FINISH).props.accessibilityLabel).toBe('Finish workout');
    expect(byId(tree, REST).props.accessibilityLabel).toBe('Rest timer');
    expect(byId(tree, REST).props.accessibilityHint).toBe('Opens the full rest view');
    expect(byId(tree, NOTES).props.accessibilityLabel).toBe('Session notes');
    expect(byId(tree, NOTES).props.accessibilityHint).toBe('Add or edit a note for this workout');
    ALL_IDS.forEach((id) => expect(byId(tree, id).props.accessibilityRole).toBe('button'));
    [CLOSE, REST, NOTES, HISTORY].forEach((id) => expect(byId(tree, id).props.accessibilityState).toBeUndefined());
  });

  test('the clock is not in the bar: no timer node, no Elapsed text, no numerals', () => {
    const tree = render({ onHistory: jest.fn() });
    expect(hosts(tree, (p) => p.accessibilityRole === 'timer')).toHaveLength(0);
    expect(allText(tree.toJSON())).toEqual([]);
  });

  describe('finishBusy', () => {
    test('idle: enabled, not busy, the glyph and no spinner', () => {
      const tree = render({});
      const node = byId(tree, FINISH);
      expect(node.props.disabled).toBe(false);
      expect(node.props.accessibilityState).toEqual({ busy: false, disabled: false });
      expect(glyphs(node)).toHaveLength(1);
      expect(node.findAll((n) => n.type === 'ActivityIndicator')).toHaveLength(0);
    });

    test('busy: disabled, busy state, a spinner instead of the glyph, same spoken name', () => {
      const tree = render({ finishBusy: true });
      const node = byId(tree, FINISH);
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
