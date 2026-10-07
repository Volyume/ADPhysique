/**
 * ExerciseSection (12-BUILD-SPEC sections 1.3, 2, 2a, 2b and 3, register D220).
 * Pins: the three states (active mounts children, bests and footer; done shows
 * the green check and the count; upcoming is the header only), every callback,
 * the bests line text, its omissions, its numeric spans and its pressable row,
 * the history and rest buttons, the accessibility labels, and the token-only
 * source guard.
 */
import fs from 'fs';
import path from 'path';
import { Text } from 'react-native';
import { create, act } from 'react-test-renderer';
import { colors, type, iconSize } from '../../../../styles/theme';
import ExerciseSection from '../ExerciseSection';

const DOT = String.fromCharCode(0x00b7);
const TIMES = String.fromCharCode(0x00d7);
const BESTS = {
  lastDateLabel: '6 Oct',
  heaviest: { weight: 75, reps: 6 },
  atWeight: { weight: 70, reps: 8 },
};

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
const bestsRow = (tree) => one(byLabel(tree, 'History and records'));

describe('ExerciseSection states', () => {
  test('active: header, children and the footer', () => {
    const tree = render({});
    expect(joined(tree)).toContain('TABLE_CHILD');
    expect(words(tree.toJSON())).toEqual(expect.arrayContaining(['2', 'Barbell Row (Bent Over)', 'Add set', 'Swap']));
    one(byLabel(tree, 'Add set'));
    one(byLabel(tree, 'Swap exercise'));
    one(byLabel(tree, 'More options for this exercise'));
  });

  test('done: green check and the count, nothing else', () => {
    const tree = render({ state: 'done', doneSetCount: 3 });
    expect(joined(tree)).not.toContain('TABLE_CHILD');
    expect(words(tree.toJSON())).toContain('3 sets');
    const glyph = tree.root.findAll((n) => n.type === 'Ionicons' && n.props.name === 'checkmark');
    expect(glyph).toHaveLength(1);
    expect(glyph[0].props.color).toBe(colors.success);
    expect(byLabel(tree, 'Add set')).toHaveLength(0);
    expect(byLabel(tree, 'Rest length for Barbell Row (Bent Over)')).toHaveLength(0);
    expect(byLabel(tree, '3 sets done')).toHaveLength(1);
  });

  test('done: one set is singular', () => {
    expect(words(render({ state: 'done', doneSetCount: 1 }).toJSON())).toContain('1 set');
  });

  test('upcoming: the header and its two small buttons only', () => {
    const tree = render({ state: 'upcoming', bests: BESTS, onRestLength: jest.fn(), onHistory: jest.fn() });
    expect(joined(tree)).not.toContain('TABLE_CHILD');
    expect(byLabel(tree, 'Add set')).toHaveLength(0);
    expect(byLabel(tree, 'History and records')).toHaveLength(0);
    one(byLabel(tree, 'Rest length for Barbell Row (Bent Over)'));
    one(byLabel(tree, 'History and records for Barbell Row (Bent Over)'));
  });

  test('a square well renders only when its callback is given (no dead control before its sheet is wired)', () => {
    const none = render({ state: 'upcoming' });
    expect(byLabel(none, 'Rest length for Barbell Row (Bent Over)')).toHaveLength(0);
    expect(byLabel(none, 'History and records for Barbell Row (Bent Over)')).toHaveLength(0);
    const restOnly = render({ state: 'upcoming', onRestLength: jest.fn() });
    one(byLabel(restOnly, 'Rest length for Barbell Row (Bent Over)'));
    expect(byLabel(restOnly, 'History and records for Barbell Row (Bent Over)')).toHaveLength(0);
  });

  test('groupLabel is a caption under the name and in the spoken label', () => {
    const tree = render({ state: 'upcoming', groupLabel: 'Superset' });
    textHost(tree, 'Superset');
    one(byLabel(tree, 'Exercise 2, Barbell Row (Bent Over), superset'));
  });

  test('skipped: muted name, "Left out" in the count slot, no wells, still tappable', () => {
    const onPressHeader = jest.fn();
    const tree = render({ state: 'upcoming', skipped: true, onPressHeader, onRestLength: jest.fn() });
    textHost(tree, 'Left out');
    expect(byLabel(tree, 'Rest length for Barbell Row (Bent Over)')).toHaveLength(0);
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
  test('exercise name: semibold role in primary ink, one line; index in secondary ink', () => {
    const tree = render({});
    const name = textHost(tree, 'Barbell Row (Bent Over)');
    const s = flat(name.props.style);
    expect(s.color).toBe(colors.primary);
    expect(name.props.numberOfLines).toBe(1);
    expect(s.fontFamily).toBe(type.w(type.title, 'semibold').fontFamily);
    expect(s.fontSize).toBe(type.title.fontSize);
    const index = flat(textHost(tree, '2').props.style);
    expect(index.color).toBe(colors.textSecondary);
    expect(index.fontVariant).toEqual(['tabular-nums']);
    expect(index.fontSize).toBe(type.title.fontSize);
  });

  test('chevron is a 16 dp amber glyph', () => {
    const tree = render({});
    const chevron = tree.root.findAll((n) => n.type === 'Ionicons' && n.props.name === 'chevron-forward')[0];
    expect(chevron.props.size).toBe(16);
    expect(chevron.props.color).toBe(colors.primary);
  });

  test('title button names the exercise, carries the accordion state and a hint when inactive', () => {
    const active = one(byLabel(render({}), 'Exercise 2, Barbell Row (Bent Over)'));
    expect(active.props.accessibilityState).toEqual({ expanded: true });
    expect(active.props.accessibilityHint).toBeUndefined();
    const upcoming = one(byLabel(render({ state: 'upcoming' }), 'Exercise 2, Barbell Row (Bent Over)'));
    expect(upcoming.props.accessibilityState).toEqual({ expanded: false });
    expect(upcoming.props.accessibilityHint).toBe('Makes this the current exercise');
  });

  test('onPressHeader fires from the title and from the empty space; the spacer is hidden from TalkBack', () => {
    const onPressHeader = jest.fn();
    const tree = render({ state: 'upcoming', onPressHeader });
    press(one(byLabel(tree, 'Exercise 2, Barbell Row (Bent Over)')));
    const fill = hosts(tree, (p) => p.accessible === false && p.onPress === onPressHeader);
    expect(fill).toHaveLength(1);
    expect(fill[0].props.importantForAccessibility).toBe('no');
    press(fill[0]);
    expect(onPressHeader).toHaveBeenCalledTimes(2);
  });

  test('onDetails fires from the chevron only', () => {
    const onDetails = jest.fn();
    const onPressHeader = jest.fn();
    const tree = render({ onDetails, onPressHeader });
    press(one(byLabel(tree, 'Details for Barbell Row (Bent Over)')));
    expect(onDetails).toHaveBeenCalledTimes(1);
    expect(onPressHeader).not.toHaveBeenCalled();
  });

  test('rest and history buttons are 40 dp wells with 48 dp reach; onRestLength and onHistory fire', () => {
    const onRestLength = jest.fn();
    const onHistory = jest.fn();
    const tree = render({ onRestLength, onHistory });
    const rest = one(byLabel(tree, 'Rest length for Barbell Row (Bent Over)'));
    const history = one(byLabel(tree, 'History and records for Barbell Row (Bent Over)'));
    [rest, history].forEach((node) => {
      const s = flat(node.props.style);
      expect(s.width).toBe(40);
      expect(s.height).toBe(40);
      expect(s.backgroundColor).toBe(colors.background);
      expect(s.borderColor).toBe(colors.borderSubtle);
      expect(node.props.hitSlop).toEqual({ top: 4, bottom: 4, left: 4, right: 4 });
    });
    expect(tree.root.findAll((n) => n.type === 'Ionicons' && n.props.name === 'timer-outline')).toHaveLength(1);
    const stats = tree.root.findAll((n) => n.type === 'Ionicons' && n.props.name === 'stats-chart-outline');
    expect(stats).toHaveLength(1);
    expect(stats[0].props.size).toBe(iconSize.md);
    press(rest);
    press(history);
    expect(onRestLength).toHaveBeenCalledTimes(1);
    expect(onHistory).toHaveBeenCalledTimes(1);
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

  test('footer glyphs are 20 dp; the labels are semibold label role in primary ink', () => {
    const tree = render({});
    const add = tree.root.findAll((n) => n.type === 'Ionicons' && n.props.name === 'add-circle-outline')[0];
    expect(add.props.size).toBe(20);
    expect(add.props.color).toBe(colors.textPrimary);
    const label = flat(textHost(tree, 'Add set').props.style);
    expect(label.color).toBe(colors.textPrimary);
    expect(label.fontSize).toBe(type.label.fontSize);
    expect(label.fontFamily).toBe(type.w(type.label, 'semibold').fontFamily);
  });
});

describe('ExerciseSection bests line (2a, 2b)', () => {
  test('the full line, with the numbers as their own spans', () => {
    const tree = render({ bests: BESTS });
    const row = bestsRow(tree);
    expect(words(row).join('')).toBe(`Last session 6 Oct ${DOT} Best 75 kg ${TIMES} 6 ${DOT} at 70 kg: 8 reps`);
    const nums = row.findAll((n) => n.type === 'Text' && flat(n.props.style).color === colors.textPrimary);
    expect(nums.flatMap((n) => words(n))).toEqual(['75', '6', '70', '8']);
    const s = flat(nums[0].props.style);
    expect(s.fontVariant).toEqual(['tabular-nums']);
    expect(s.fontSize).toBe(type.label.fontSize);
  });

  test('the line is label role in secondary ink and may wrap', () => {
    const row = bestsRow(render({ bests: BESTS }));
    const line = row.findAll((n) => n.type === 'Text' && flat(n.props.style).color === colors.textSecondary)[0];
    const s = flat(line.props.style);
    expect(s.fontSize).toBe(type.label.fontSize);
    expect(line.props.numberOfLines).toBeUndefined();
  });

  test('null parts are left out with their separator', () => {
    expect(words(bestsRow(render({ bests: { ...BESTS, heaviest: null } }))).join(''))
      .toBe(`Last session 6 Oct ${DOT} at 70 kg: 8 reps`);
    expect(words(bestsRow(render({ bests: { ...BESTS, atWeight: null } }))).join(''))
      .toBe(`Last session 6 Oct ${DOT} Best 75 kg ${TIMES} 6`);
    expect(words(bestsRow(render({ bests: { lastDateLabel: null, heaviest: BESTS.heaviest, atWeight: BESTS.atWeight } }))).join(''))
      .toBe(`Best 75 kg ${TIMES} 6 ${DOT} at 70 kg: 8 reps`);
    expect(words(bestsRow(render({ bests: { lastDateLabel: '6 Oct', heaviest: null, atWeight: null } }))).join(''))
      .toBe('Last session 6 Oct');
  });

  test('no parts, or bests null or absent: no line', () => {
    expect(byLabel(render({ bests: { lastDateLabel: '', heaviest: null, atWeight: null } }), 'History and records')).toHaveLength(0);
    expect(byLabel(render({ bests: null }), 'History and records')).toHaveLength(0);
    expect(byLabel(render({}), 'History and records')).toHaveLength(0);
  });

  test('one rep is singular; a unit can be supplied', () => {
    const row = bestsRow(render({ bests: { lastDateLabel: '6 Oct', heaviest: null, atWeight: { weight: 100, reps: 1 }, unit: 'lb' } }));
    expect(words(row).join('')).toContain('at 100 lb: 1 rep');
    expect(words(row).join('')).not.toContain('1 reps');
  });

  test('a pressable 48 dp row: History and records, spoken value, trailing muted chevron, calls onHistory', () => {
    const onHistory = jest.fn();
    const row = bestsRow(render({ bests: BESTS, onHistory }));
    expect(row.props.accessibilityRole).toBe('button');
    expect(flat(row.props.style).minHeight).toBe(48);
    expect(row.props.accessibilityValue.text).toBe(
      'Last session 6 Oct. Best 75 kilograms for 6 reps. At 70 kilograms, 8 reps.',
    );
    const chevron = row.findAll((n) => n.type === 'Ionicons');
    expect(chevron).toHaveLength(1);
    expect(chevron[0].props.name).toBe('chevron-forward');
    expect(chevron[0].props.color).toBe(colors.textMuted);
    expect(chevron[0].props.size).toBe(iconSize.sm);
    act(() => { row.props.onPress(); });
    expect(onHistory).toHaveBeenCalledTimes(1);
  });

  test('sits under the header and before the children', () => {
    const text = joined(render({ bests: BESTS }));
    expect(text.indexOf('Barbell Row')).toBeLessThan(text.indexOf('Last session'));
    expect(text.indexOf('Last session')).toBeLessThan(text.indexOf('TABLE_CHILD'));
  });

  test('done sections do not show it', () => {
    expect(byLabel(render({ state: 'done', bests: BESTS }), 'History and records')).toHaveLength(0);
  });
});

describe('ExerciseSection surface', () => {
  test('full-bleed section colour with a 10 dp band above, no radius or border', () => {
    const root = render({}).toJSON();
    const s = flat(root.props.style);
    expect(s.backgroundColor).toBe(colors.surface);
    expect(s.marginTop).toBe(10);
    expect(s.borderRadius).toBeUndefined();
    expect(s.borderWidth).toBeUndefined();
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
