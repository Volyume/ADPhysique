/**
 * ExerciseSection (12-BUILD-SPEC sections 1.3, 2 and 3, register D220; the
 * header redrawn on the founder render verdicts 2026-10-09, addenda 9 and 10).
 * Pins: the three states (active mounts the children and footer; done shows
 * the green check alone, its count in the spoken label; upcoming is the header
 * alone), the header as ONE button (24 dp badge, one-line name at the label
 * role semibold, trailing state, no chevron), that the tools row is gone (no
 * Guide, History or Rest length control, and the onDetails, onHistory and
 * onRestLength props draw nothing), the card order header, children, footer,
 * every footer callback, that the bests line is gone, the accessibility labels
 * and hints, and the token-only source guard.
 */
import fs from 'fs';
import path from 'path';
import { Animated, Text } from 'react-native';
import { create, act } from 'react-test-renderer';
import { colors, type, radius, spacing, iconSize } from '../../../../styles/theme';
import { touchTarget } from '../../../../styles/layout';
import ExerciseSection from '../ExerciseSection';

// Kept from when the footer's Add set was the house Button (expo-haptics is
// not present under Jest); harmless now that the footer actions are chromeless.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));


function render(props, children) {
  let tree;
  act(() => {
    tree = create(
      <ExerciseSection index={2} name="Barbell Row (Bent Over)" state="active" doneSetCount={0} {...props}>
        {children === undefined ? <Text>TABLE_CHILD</Text> : children}
      </ExerciseSection>,
    );
  });
  return tree;
}
const hosts = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n.props || {}));
const byLabel = (tree, label) => hosts(tree, (p) => p.accessibilityLabel === label);
const one = (list) => { expect(list).toHaveLength(1); return list[0]; };
const press = (node) => act(() => { node.props.onPress(); });
const flat = (style) => Object.assign({}, ...[].concat(style).filter(Boolean).map((s) => (Array.isArray(s) ? flat(s) : s)));
function words(node) {
  if (node == null) return [];
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap(words);
  return words(node.children);
}
const joined = (tree) => words(tree.toJSON()).join('');
const textHost = (tree, content) => one(tree.root.findAll(
  (n) => n.type === 'Text' && words(n).join('') === content,
));

describe('ExerciseSection states', () => {
  test('active: header, children and the footer; Swap only when onSwap is given', () => {
    const tree = render({});
    expect(joined(tree)).toContain('TABLE_CHILD');
    expect(words(tree.toJSON())).toEqual(expect.arrayContaining(['2', 'Barbell Row (Bent Over)', 'Add set']));
    one(byLabel(tree, 'Add set'));
    expect(byLabel(tree, 'Swap exercise')).toHaveLength(0);
    one(byLabel(tree, 'More options for this exercise'));
    const withSwap = render({ onSwap: jest.fn() });
    expect(words(withSwap.toJSON())).toContain('Swap');
    one(byLabel(withSwap, 'Swap exercise'));
  });

  test('done: the green check alone, the count in the spoken label only', () => {
    const tree = render({ state: 'done', doneSetCount: 3 });
    expect(joined(tree)).not.toContain('TABLE_CHILD');
    // The text "3 sets" is no longer drawn; the badge, name and check remain.
    expect(words(tree.toJSON())).not.toContain('3 sets');
    expect(words(tree.toJSON())).toEqual(['2', 'Barbell Row (Bent Over)']);
    // The app's "done" mark: the filled success check, as the plan detail.
    const glyph = tree.root.findAll((n) => n.type === 'Ionicons' && n.props.name === 'checkmark-circle');
    expect(glyph).toHaveLength(1);
    expect(glyph[0].props.color).toBe(colors.success);
    expect(byLabel(tree, 'Add set')).toHaveLength(0);
    expect(byLabel(tree, 'Rest length for Barbell Row (Bent Over)')).toHaveLength(0);
    const slot = one(byLabel(tree, '3 sets done'));
    expect(slot.props.accessible).toBe(true);
    expect(slot.findAll((n) => n.type === 'Ionicons')).toHaveLength(1);
    expect(words(slot)).toEqual([]);
    expect(glyph[0].props.size).toBe(16);
  });

  test('done: one set is singular (in the spoken label only)', () => {
    const tree = render({ state: 'done', doneSetCount: 1 });
    one(byLabel(tree, '1 set done'));
    expect(words(tree.toJSON())).not.toContain('1 set');
  });

  test('upcoming: the header alone, no buttons even when every tool callback is given', () => {
    const tree = render({
      state: 'upcoming', onPressHeader: jest.fn(), onDetails: jest.fn(), onRestLength: jest.fn(), onHistory: jest.fn(),
    });
    expect(joined(tree)).not.toContain('TABLE_CHILD');
    expect(byLabel(tree, 'Add set')).toHaveLength(0);
    expect(byLabel(tree, 'History and records')).toHaveLength(0);
    expect(byLabel(tree, 'Guide for Barbell Row (Bent Over)')).toHaveLength(0);
    expect(byLabel(tree, 'Rest length for Barbell Row (Bent Over)')).toHaveLength(0);
    expect(byLabel(tree, 'History and records for Barbell Row (Bent Over)')).toHaveLength(0);
    // The header is the only pressable thing on the card.
    const pressable = hosts(tree, (p) => typeof p.onPress === 'function' || p.accessibilityRole === 'button');
    expect(pressable.map((n) => n.props.accessibilityLabel)).toEqual(['Exercise 2, Barbell Row (Bent Over)']);
  });

  test('done: no tools either, even when every tool callback is given', () => {
    const tree = render({
      state: 'done', doneSetCount: 3, onDetails: jest.fn(), onRestLength: jest.fn(), onHistory: jest.fn(),
    });
    expect(byLabel(tree, 'Guide for Barbell Row (Bent Over)')).toHaveLength(0);
    expect(byLabel(tree, 'Rest length for Barbell Row (Bent Over)')).toHaveLength(0);
    expect(byLabel(tree, 'History and records for Barbell Row (Bent Over)')).toHaveLength(0);
  });

  test('upcoming and partly done: "{done} of {total}" (no "sets" word) sits in the trailing slot at the caption role, not under the name', () => {
    const tree = render({ state: 'upcoming', doneSetCount: 2, totalSetCount: 4 });
    const count = flat(textHost(tree, '2 of 4').props.style);
    expect(count.color).toBe(colors.textSecondary);
    expect(count.fontSize).toBe(type.caption.fontSize);
    expect(count.fontFamily).toBe(type.caption.fontFamily);
    expect(words(tree.toJSON())).not.toContain('2 of 4 sets');
    one(byLabel(tree, 'Exercise 2, Barbell Row (Bent Over), 2 of 4 sets done'));
    // The name block holds the name alone (no groupLabel given), so the count
    // is a sibling of the block, after it.
    const block = one(hosts(tree, (p) => flat(p.style).flex === 1 && flat(p.style).minWidth === 0));
    expect(words(block)).toEqual(['Barbell Row (Bent Over)']);
    expect(joined(render({ state: 'upcoming', doneSetCount: 0, totalSetCount: 4 }))).not.toContain('of 4');
  });

  test('the tools row is gone: onDetails, onHistory and onRestLength as props draw nothing', () => {
    const none = render({});
    const given = render({ onDetails: jest.fn(), onHistory: jest.fn(), onRestLength: jest.fn() });
    ['Guide for', 'History and records for', 'Rest length for'].forEach((prefix) => {
      expect(hosts(given, (p) => typeof p.accessibilityLabel === 'string' && p.accessibilityLabel.startsWith(prefix))).toHaveLength(0);
    });
    expect(byLabel(given, 'History and records')).toHaveLength(0);
    expect(words(given.toJSON())).toEqual(words(none.toJSON()));
    expect(words(given.toJSON())).not.toContain('Guide');
    expect(words(given.toJSON())).not.toContain('History');
    expect(words(given.toJSON())).not.toContain('Rest length');
    expect(hosts(given, (p) => typeof p.onPress === 'function')).toHaveLength(hosts(none, (p) => typeof p.onPress === 'function').length);
  });

  test('groupLabel is a caption under the name and in the spoken label', () => {
    const tree = render({ state: 'upcoming', groupLabel: 'Superset' });
    textHost(tree, 'Superset');
    one(byLabel(tree, 'Exercise 2, Barbell Row (Bent Over), superset'));
  });

  test('skipped: muted name, "Left out" in the count slot at the caption role, still tappable', () => {
    const onPressHeader = jest.fn();
    const tree = render({ state: 'upcoming', skipped: true, onPressHeader });
    const left = flat(textHost(tree, 'Left out').props.style);
    expect(left.fontSize).toBe(type.caption.fontSize);
    expect(left.fontFamily).toBe(type.caption.fontFamily);
    expect(left.color).toBe(colors.textSecondary);
    const title = one(byLabel(tree, 'Exercise 2, Barbell Row (Bent Over), left out for time'));
    press(title);
    expect(onPressHeader).toHaveBeenCalledTimes(1);
    const name = textHost(tree, 'Barbell Row (Bent Over)');
    expect(flat(name.props.style).color).toBe(colors.textMuted);
  });

  test('moreHint: the word sits beside the overflow glyph in amber and the label says what is behind it', () => {
    const tree = render({ moreHint: 'Help' });
    textHost(tree, 'Help');
    one(byLabel(tree, 'More options for this exercise, including how logging works'));
    expect(byLabel(render({}), 'More options for this exercise')).toHaveLength(1);
  });

  test('state defaults to upcoming', () => {
    expect(joined(render({ state: undefined }))).not.toContain('TABLE_CHILD');
  });
});

describe('ExerciseSection header', () => {
  test('exercise name: label role semibold in primary ink on one line, shrinking a little; the index in a 24 dp order badge', () => {
    // Amber is spent on the set you are on, not on the name.
    const tree = render({});
    const name = textHost(tree, 'Barbell Row (Bent Over)');
    const s = flat(name.props.style);
    expect(s.color).toBe(colors.textPrimary);
    // One line, the whole width of the name block (founder render verdict
    // 2026-10-09); the trailing state is the only thing after it.
    expect(name.props.numberOfLines).toBe(1);
    expect(name.props.adjustsFontSizeToFit).toBe(true);
    expect(name.props.minimumFontScale).toBe(0.75);
    expect(s.fontFamily).toBe(type.w(type.label, 'semibold').fontFamily);
    expect(s.fontSize).toBe(type.label.fontSize);
    const indexText = textHost(tree, '2');
    const index = flat(indexText.props.style);
    expect(index.color).toBe(colors.textSecondary);
    expect(index.fontVariant).toEqual(['tabular-nums']);
    expect(index.fontSize).toBe(type.label.fontSize);
    expect(index.fontFamily).toBe(type.w(type.label, 'bold').fontFamily);
    const badge = flat(one(hosts(tree, (p) => flat(p.style).borderRadius === 12 && flat(p.style).width === 24)).props.style);
    expect(badge.width).toBe(24);
    expect(badge.height).toBe(24);
    expect(badge.borderRadius).toBe(12);
    expect(badge.backgroundColor).toBe(colors.surface2);
  });

  test('the header is ONE button: 56 dp row, badge, name block and trailing state; no chevron, no spacer, no Details or Make current button', () => {
    const tree = render({ state: 'upcoming', onPressHeader: jest.fn(), doneSetCount: 1, totalSetCount: 3 });
    const header = one(byLabel(tree, 'Exercise 2, Barbell Row (Bent Over), 1 of 3 sets done'));
    const s = flat(header.props.style);
    expect(s.minHeight).toBe(56);
    expect(s.flexDirection).toBe('row');
    expect(s.alignItems).toBe('center');
    expect(s.gap).toBe(spacing.sm);
    expect(s.gap).toBe(8);
    // The card grid (addendum 13): the table's 12 dp left inset and the
    // check column's 8 dp right inset, so the badge sits on the set numbers'
    // axis and the trailing state on the check column.
    expect(s.paddingLeft).toBe(spacing.md);
    expect(s.paddingRight).toBe(spacing.sm);
    expect(s.paddingHorizontal).toBeUndefined();
    // Badge, then the name block, then the trailing count.
    expect(words(header)).toEqual(['2', 'Barbell Row (Bent Over)', '1 of 3']);
    const nameBlock = one(hosts(tree, (p) => flat(p.style).flex === 1 && flat(p.style).minWidth === 0));
    expect(words(nameBlock)).toEqual(['Barbell Row (Bent Over)']);
    expect(tree.root.findAll((n) => n.type === 'Ionicons' && n.props.name === 'chevron-forward')).toHaveLength(0);
    expect(byLabel(tree, 'Details for Barbell Row (Bent Over)')).toHaveLength(0);
    expect(byLabel(tree, 'Make Barbell Row (Bent Over) current')).toHaveLength(0);
    expect(hosts(tree, (p) => p.accessible === false && p.importantForAccessibility === 'no')).toHaveLength(0);
    // The only pressable thing is the header itself.
    expect(hosts(tree, (p) => typeof p.onPress === 'function')).toHaveLength(1);
  });

  test('the header button names the exercise, carries the accordion state and a hint: the guide when active and pressable, make-current when collapsed', () => {
    const active = one(byLabel(render({}), 'Exercise 2, Barbell Row (Bent Over)'));
    expect(active.props.accessibilityState).toEqual({ expanded: true });
    // No onPressHeader: nothing opens, so no hint.
    expect(active.props.accessibilityHint).toBeUndefined();
    const activePressable = one(byLabel(render({ onPressHeader: jest.fn() }), 'Exercise 2, Barbell Row (Bent Over)'));
    expect(activePressable.props.accessibilityState).toEqual({ expanded: true });
    expect(activePressable.props.accessibilityHint).toBe('Opens the exercise guide');
    const upcoming = one(byLabel(render({ state: 'upcoming' }), 'Exercise 2, Barbell Row (Bent Over)'));
    expect(upcoming.props.accessibilityState).toEqual({ expanded: false });
    expect(upcoming.props.accessibilityHint).toBe('Makes this the current exercise');
  });

  test('the header is a button when onPressHeader is given, else a plain header', () => {
    const withPress = one(byLabel(render({ state: 'upcoming', onPressHeader: jest.fn() }), 'Exercise 2, Barbell Row (Bent Over)'));
    expect(withPress.props.accessibilityRole).toBe('button');
    const without = one(byLabel(render({ state: 'upcoming' }), 'Exercise 2, Barbell Row (Bent Over)'));
    expect(without.props.accessibilityRole).toBe('header');
  });

  test('onPressHeader fires from the header button, one press = one call', () => {
    const onPressHeader = jest.fn();
    const tree = render({ state: 'upcoming', onPressHeader });
    press(one(byLabel(tree, 'Exercise 2, Barbell Row (Bent Over)')));
    expect(onPressHeader).toHaveBeenCalledTimes(1);
    press(one(byLabel(tree, 'Exercise 2, Barbell Row (Bent Over)')));
    expect(onPressHeader).toHaveBeenCalledTimes(2);
  });
});

describe('ExerciseSection card order', () => {
  test('active: header, children, footer (no tools row between)', () => {
    const tree = render({ onDetails: jest.fn(), onHistory: jest.fn(), onRestLength: jest.fn() });
    const kids = tree.toJSON().children;
    expect(kids).toHaveLength(3);
    const [header, child, footer] = kids;
    expect(header.props.accessibilityLabel).toBe('Exercise 2, Barbell Row (Bent Over)');
    expect(words(child)).toEqual(['TABLE_CHILD']);
    expect(flat(footer.props.style).minHeight).toBe(52);
    expect(words(footer)).toContain('Add set');
  });
});

describe('ExerciseSection footer', () => {
  test('Add set, Swap and the overflow call their callbacks', () => {
    const cb = { onAddSet: jest.fn(), onSwap: jest.fn(), onMore: jest.fn() };
    const tree = render(cb);
    press(one(byLabel(tree, 'Add set')));
    press(one(byLabel(tree, 'Swap exercise')));
    press(one(byLabel(tree, 'More options for this exercise')));
    Object.values(cb).forEach((fn) => expect(fn).toHaveBeenCalledTimes(1));
  });

  test('Add set and Swap are chromeless actions (no fill, no border, 20 dp glyph and semibold label in primary ink); the overflow stays a chromeless glyph', () => {
    // A FooterAction is a TouchableOpacity holding a glyph and a label, never
    // a boxed Button (D220 addendum 15). Never a second primary (D8).
    const tree = render({ onSwap: jest.fn() });
    const add = one(hosts(tree, (p) => p.testID === 'volyume-btn-extra-set'));
    const addStyle = flat(add.props.style);
    expect(addStyle.backgroundColor).toBeUndefined();
    expect(addStyle.borderWidth).toBeUndefined();
    expect(addStyle.borderColor).toBeUndefined();
    expect(addStyle.borderRadius).toBeUndefined();
    expect(addStyle.minHeight).toBe(touchTarget.minimum);
    expect(addStyle.flexDirection).toBe('row');
    expect(addStyle.alignItems).toBe('center');
    expect(addStyle.gap).toBe(spacing.xs);
    expect(addStyle.paddingRight).toBe(spacing.sm);
    expect(add.props.accessibilityRole).toBe('button');
    const addGlyph = add.findAll((n) => n.type === 'Ionicons' && n.props.name === 'add');
    expect(addGlyph).toHaveLength(1);
    expect(addGlyph[0].props.size).toBe(iconSize.md);
    expect(addGlyph[0].props.size).toBe(20);
    expect(addGlyph[0].props.color).toBe(colors.textPrimary);
    const label = flat(textHost(tree, 'Add set').props.style);
    expect(label.color).toBe(colors.textPrimary);
    expect(label.fontFamily).toBe(type.w(type.label, 'semibold').fontFamily);
    expect(label.fontSize).toBe(type.label.fontSize);
    const swap = one(byLabel(tree, 'Swap exercise'));
    const swapStyle = flat(swap.props.style);
    expect(swapStyle.backgroundColor).toBeUndefined();
    expect(swapStyle.borderWidth).toBeUndefined();
    expect(swapStyle.minHeight).toBe(touchTarget.minimum);
    const swapGlyph = swap.findAll((n) => n.type === 'Ionicons' && n.props.name === 'swap-horizontal');
    expect(swapGlyph).toHaveLength(1);
    expect(swapGlyph[0].props.size).toBe(20);
    expect(swapGlyph[0].props.color).toBe(colors.textPrimary);
    const swapLabel = flat(textHost(tree, 'Swap').props.style);
    expect(swapLabel.color).toBe(colors.textPrimary);
    expect(swapLabel.fontFamily).toBe(type.w(type.label, 'semibold').fontFamily);
    const more = one(hosts(tree, (p) => p.testID === 'volyume-section-more'));
    const moreStyle = flat(more.props.style);
    expect(moreStyle.backgroundColor).toBeUndefined();
    expect(moreStyle.borderWidth).toBeUndefined();
    expect(moreStyle.height).toBe(touchTarget.minimum);
  });
});

describe('ExerciseSection bests line is gone', () => {
  test('a bests prop draws nothing: no History and records row, no Last session text', () => {
    const bests = { lastDateLabel: '6 Oct', heaviest: { weight: 75, reps: 6 }, atWeight: { weight: 70, reps: 8 } };
    const tree = render({ bests, onHistory: jest.fn() });
    expect(byLabel(tree, 'History and records')).toHaveLength(0);
    expect(joined(tree)).not.toContain('Last session');
    expect(joined(tree)).not.toContain('Best');
  });
});

describe('ExerciseSection surface', () => {
  test('the house card: surface fill, radius.lg, 1 px borderSubtle, no band of its own', () => {
    // Card.js geometry, so the section sits in the page gap like every other
    // card in the app rather than a full-bleed band of its own.
    const root = render({}).toJSON();
    const s = flat(root.props.style);
    expect(s.backgroundColor).toBe(colors.surface);
    expect(s.borderRadius).toBe(radius.lg);
    expect(s.borderWidth).toBe(1);
    expect(s.borderColor).toBe(colors.borderSubtle);
    expect(s.overflow).toBe('hidden');
    expect(s.marginTop).toBeUndefined();
  });
});

describe('ExerciseSection countdown line', () => {
  const line = (tree) => hosts(tree, (p) => p.testID === 'volyume-countdown-line');
  const fill = (tree) => one(line(tree)).findAll((n) => typeof n.type === 'string')[1];

  test('nothing is drawn without a countdown, or while it is not active', () => {
    expect(line(render({}))).toHaveLength(0);
    expect(line(render({ countdown: null }))).toHaveLength(0);
    expect(line(render({ countdown: { active: false, ms: 1800, reduceMotion: false } }))).toHaveLength(0);
  });

  test('active: a 2 dp amber line along the top edge of the footer, hidden from the accessibility tree', () => {
    const tree = render({ countdown: { active: true, ms: 1800, reduceMotion: false } });
    const track = one(line(tree));
    const s = flat(track.props.style);
    expect(s.height).toBe(2);
    expect(s.position).toBe('absolute');
    expect(s.top).toBe(0);
    expect(s.left).toBe(0);
    expect(s.right).toBe(0);
    expect(track.props.accessibilityElementsHidden).toBe(true);
    expect(track.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(flat(fill(tree).props.style).backgroundColor).toBe(colors.primary);
    expect(flat(fill(tree).props.style).height).toBe(2);
  });

  test('the line sits inside the footer, so its top edge is the footer\'s', () => {
    const tree = render({ countdown: { active: true, ms: 1800, reduceMotion: false } });
    const footer = one(hosts(tree, (p) => flat(p.style).minHeight === 52));
    expect(footer.findAll((n) => n.props && n.props.testID === 'volyume-countdown-line').length).toBeGreaterThan(0);
  });

  test('it fills over ms with the width animation, and every fresh arming restarts it', () => {
    const timing = jest.spyOn(Animated, 'timing');
    try {
      const section = (countdown) => (
        <ExerciseSection index={2} name="Row" state="active" countdown={countdown}><Text>x</Text></ExerciseSection>
      );
      const tree = render({ countdown: { active: true, ms: 1000, reduceMotion: false } });
      expect(timing).toHaveBeenCalledTimes(1);
      expect(timing.mock.calls[0][1]).toEqual({ toValue: 1, duration: 1000, useNativeDriver: false });
      act(() => { tree.update(section({ active: false, ms: 1000, reduceMotion: false })); });
      expect(line(tree)).toHaveLength(0);
      act(() => { tree.update(section({ active: true, ms: 1800, reduceMotion: false })); });
      expect(timing).toHaveBeenCalledTimes(2);
      expect(timing.mock.calls[1][1]).toEqual({ toValue: 1, duration: 1800, useNativeDriver: false });
    } finally {
      timing.mockRestore();
    }
  });

  test('reduceMotion draws the full line at once and runs no animation', () => {
    const timing = jest.spyOn(Animated, 'timing');
    try {
      const tree = render({ countdown: { active: true, ms: 1800, reduceMotion: true } });
      expect(flat(fill(tree).props.style).width).toBe('100%');
      expect(flat(fill(tree).props.style).height).toBe(2);
      expect(flat(fill(tree).props.style).backgroundColor).toBe(colors.primary);
      expect(timing).not.toHaveBeenCalled();
    } finally {
      timing.mockRestore();
    }
  });

  test('it is not a control and does not take a press', () => {
    const tree = render({ countdown: { active: true, ms: 1800, reduceMotion: false } });
    expect(one(line(tree)).props.pointerEvents).toBe('none');
  });
});

describe('ExerciseSection footer test ids', () => {
  test('Add set is volyume-btn-extra-set and the overflow is volyume-section-more', () => {
    const tree = render({});
    expect(one(byLabel(tree, 'Add set')).props.testID).toBe('volyume-btn-extra-set');
    expect(one(byLabel(tree, 'More options for this exercise')).props.testID).toBe('volyume-section-more');
  });

  test('neither id exists outside the active state', () => {
    const tree = render({ state: 'upcoming' });
    expect(hosts(tree, (p) => p.testID === 'volyume-btn-extra-set' || p.testID === 'volyume-section-more')).toHaveLength(0);
  });
});

describe('ExerciseSection source guard (tokens only)', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'ExerciseSection.js'), 'utf8');
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
  test('no estimated max, plate readout, RPE or RIR', () => {
    expect(SRC).not.toMatch(/\b(e1rm|1rm|est\.? ?max|plate|rpe|rir)\b/i);
  });
});
