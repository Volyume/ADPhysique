/**
 * ExerciseSection (12-BUILD-SPEC sections 1.3, 2 and 3, register D220; the
 * header redrawn on the founder render verdicts 2026-10-09, addenda 9 and 10;
 * redrawn with the kit in kit trial 2, LOC-412).
 * Pins: the three states (active mounts the children and footer; done shows
 * a plain tick alone, its count in the spoken label; upcoming is the header
 * alone), the header as ONE button (24 dp badge, one-line name semibold,
 * trailing state, no chevron), that the tools row is gone (no Guide, History
 * or Rest length control, and the onDetails, onHistory and onRestLength props
 * draw nothing), the card order header, children, footer, every footer
 * callback, that the bests line is gone, the accessibility labels and hints,
 * and the source guard.
 *
 * The look is the kit's (src/components/ui/exercise-card-kit.tsx): classes
 * resolved through NativeWind at render time and lucide icons, so these tests
 * render through the kit's real styling pipeline (src/components/ui/__tests__/
 * kitTestEnv.js) and read resolved styles, as kitTrial2Surfaces.test.js does.
 * Behaviour, props, callbacks, testIDs and spoken labels are pinned exactly as
 * before; only the presentation pins moved to the new look.
 */
jest.mock('react-native-svg', () => require('../../../ui/__tests__/kitTestEnv').svgMock());
jest.mock('react-native', () => require('../../../ui/__tests__/kitTestEnv').reactNativeMock());
const {
  loadNativeInteropRuntime, setUpKitStyles, setPalette, renderKit, hostNodes, normaliseColour, flatStyle,
} = require('../../../ui/__tests__/kitTestEnv');

loadNativeInteropRuntime();

// Plain requires, after loadNativeInteropRuntime(): an import would be hoisted
// above it and load the web runtime of css-interop.
const fs = require('fs');
const path = require('path');
const { Animated, Text } = require('react-native');
const { act } = require('react-test-renderer');
const { resolveTheme, fontScaleCaps, radius, spacing } = require('../../../../styles/theme');
const { touchTarget } = require('../../../../styles/layout');
const ExerciseSection = require('../ExerciseSection').default;
const { KitThemeProvider } = require('../../../ui/kit-theme-provider');

// The dark palette's tokens: the kit variables resolve to these.
const colors = resolveTheme({ theme: 'dark' }).colors;
const hex = (c) => normaliseColour(c).hex;
const SEMIBOLD = 'Inter-SemiBold';

beforeAll(() => { setUpKitStyles(); setPalette({ theme: 'dark' }); }, 120000);

// Kept from when the footer's Add set was the house Button (expo-haptics is
// not present under Jest); harmless now that the footer actions are kit buttons.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));


function render(props, children) {
  return renderKit(
    <ExerciseSection index={2} name="Barbell Row (Bent Over)" state="active" doneSetCount={0} {...props}>
      {children === undefined ? <Text>TABLE_CHILD</Text> : children}
    </ExerciseSection>,
  );
}
const hosts = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n.props || {}));
const byLabel = (tree, label) => hosts(tree, (p) => p.accessibilityLabel === label);
const one = (list) => { expect(list).toHaveLength(1); return list[0]; };
const press = (node) => act(() => { node.props.onPress(); });
const flat = flatStyle;
// A lucide icon is a host node of type 'LucideIcon' (props.name is the icon).
const icons = (tree, name) => (tree.root ?? tree).findAll((n) => n.type === 'LucideIcon' && n.props.name === name);
const iconInk = (node) => hex(flat(node.props.style).color ?? node.props.color);
// The kit card: the one host with the card's radius and a border.
const cardsOf = (tree) => hostNodes(tree).filter((n) => {
  const s = flat(n.props.style);
  return s.borderRadius === radius.lg && s.borderWidth !== undefined;
});
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

  test('done: the tick alone, the count in the spoken label only', () => {
    const tree = render({ state: 'done', doneSetCount: 3 });
    expect(joined(tree)).not.toContain('TABLE_CHILD');
    // The text "3 sets" is no longer drawn; the badge, name and check remain.
    expect(words(tree.toJSON())).not.toContain('3 sets');
    expect(words(tree.toJSON())).toEqual(['2', 'Barbell Row (Bent Over)']);
    // kit trial 2 (LOC-412): the done mark was the green filled check-circle; it is now a
    // plain tick in the primary ink (the kit spends no green or amber on a finished exercise).
    const glyph = icons(tree, 'Check');
    expect(glyph).toHaveLength(1);
    expect(iconInk(glyph[0])).toBe(hex(colors.textPrimary));
    expect(tree.root.findAll((n) => n.type === 'LucideIcon')).toHaveLength(1);
    expect(byLabel(tree, 'Add set')).toHaveLength(0);
    expect(byLabel(tree, 'Rest length for Barbell Row (Bent Over)')).toHaveLength(0);
    const slot = one(byLabel(tree, '3 sets done'));
    expect(slot.props.accessible).toBe(true);
    expect(slot.findAll((n) => n.type === 'LucideIcon')).toHaveLength(1);
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
    // kit trial 2 (LOC-412): the caption is the kit's small muted text (11, textMuted, chrome cap),
    // not the type.caption role in secondary ink.
    const countHost = textHost(tree, '2 of 4');
    const count = flat(countHost.props.style);
    expect(hex(count.color)).toBe(hex(colors.textMuted));
    expect(count.fontSize).toBe(11);
    expect(countHost.props.maxFontSizeMultiplier).toBe(fontScaleCaps.chrome);
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
    // kit trial 2 (LOC-412): the kit caption (11, textMuted, chrome cap) replaces type.caption in secondary ink.
    const leftHost = textHost(tree, 'Left out');
    const left = flat(leftHost.props.style);
    expect(left.fontSize).toBe(11);
    expect(hex(left.color)).toBe(hex(colors.textMuted));
    expect(leftHost.props.maxFontSizeMultiplier).toBe(fontScaleCaps.chrome);
    const title = one(byLabel(tree, 'Exercise 2, Barbell Row (Bent Over), left out for time'));
    press(title);
    expect(onPressHeader).toHaveBeenCalledTimes(1);
    const name = textHost(tree, 'Barbell Row (Bent Over)');
    expect(hex(flat(name.props.style).color)).toBe(hex(colors.textMuted));
  });

  test('moreHint: the word sits beside the overflow glyph and the label says what is behind it', () => {
    const tree = render({ moreHint: 'More' });
    const hint = textHost(tree, 'More');
    // kit trial 2 (LOC-412): the hint is the kit caption (muted) and no longer amber; the glyph
    // takes the strong ink while a hint shows, the muted ink otherwise.
    expect(hex(flat(hint.props.style).color)).toBe(hex(colors.textMuted));
    expect(iconInk(one(icons(tree, 'Ellipsis')))).toBe(hex(colors.textPrimary));
    expect(iconInk(one(icons(render({}), 'Ellipsis')))).toBe(hex(colors.textMuted));
    one(byLabel(tree, 'More options for this exercise, including how logging works'));
    expect(byLabel(render({}), 'More options for this exercise')).toHaveLength(1);
  });

  test('state defaults to upcoming', () => {
    expect(joined(render({ state: undefined }))).not.toContain('TABLE_CHILD');
  });
});

describe('ExerciseSection header', () => {
  test('exercise name: semibold 16 in primary ink on one line, shrinking a little; the index in a 24 dp order badge', () => {
    // Amber is spent on the set you are on, not on the name.
    // kit trial 2 (LOC-412): the name and badge are kit Text with resolved classes (16 semibold,
    // 11 muted tabular badge, 999 radius) instead of the type.label role and the 12 dp circle.
    const tree = render({});
    const name = textHost(tree, 'Barbell Row (Bent Over)');
    const s = flat(name.props.style);
    expect(hex(s.color)).toBe(hex(colors.textPrimary));
    // One line, the whole width of the name block (founder render verdict
    // 2026-10-09); the trailing state is the only thing after it.
    expect(name.props.numberOfLines).toBe(1);
    expect(name.props.adjustsFontSizeToFit).toBe(true);
    expect(name.props.minimumFontScale).toBe(0.75);
    expect(name.props.maxFontSizeMultiplier).toBe(fontScaleCaps.chrome);
    expect(s.fontFamily).toBe(SEMIBOLD);
    expect(s.fontSize).toBe(16);
    const indexHost = textHost(tree, '2');
    const index = flat(indexHost.props.style);
    expect(hex(index.color)).toBe(hex(colors.textMuted));
    expect(index.fontVariant).toEqual(['tabular-nums']);
    expect(index.fontSize).toBe(11);
    expect(indexHost.props.maxFontSizeMultiplier).toBe(fontScaleCaps.chrome);
    const badge = flat(one(hostNodes(tree).filter((n) => flat(n.props.style).borderRadius === 999 && flat(n.props.style).width === 24)).props.style);
    expect(badge.width).toBe(24);
    expect(badge.height).toBe(24);
    expect(badge.borderRadius).toBe(999);
    expect(hex(badge.backgroundColor)).toBe(hex(colors.surface2));
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
    expect(icons(tree, 'ChevronRight')).toHaveLength(0);
    expect(byLabel(tree, 'Details for Barbell Row (Bent Over)')).toHaveLength(0);
    expect(byLabel(tree, 'Make Barbell Row (Bent Over) current')).toHaveLength(0);
    expect(hosts(tree, (p) => p.accessible === false && p.importantForAccessibility === 'no')).toHaveLength(0);
    // The only pressable thing is the header itself.
    expect(hosts(tree, (p) => typeof p.onPress === 'function')).toHaveLength(1);
  });

  // Item 18 (option A): the active header's empty right slot carries an information
  // glyph, a cue for the tap that opens the exercise guide. Decoration only.
  test('active and pressable: an information glyph in the right-hand slot, hidden from the accessibility tree; no other state shows it', () => {
    // kit trial 2 (LOC-412): the glyph is the lucide 'Info' (18 dp) in place of Ionicons' outline info circle.
    const glyph = (tree) => icons(tree, 'Info');
    const active = render({ state: 'active', onPressHeader: jest.fn() });
    expect(glyph(active)).toHaveLength(1);
    expect(glyph(active)[0].props.size).toBe(18);
    const cue = one(hosts(active, (p) => p.testID === 'volyume-exercise-info-cue'));
    expect(cue.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(cue.props.accessibilityElementsHidden).toBe(true);
    // Still ONE pressable thing: the header.
    expect(hosts(active, (p) => typeof p.onPress === 'function' && p.testID !== 'volyume-section-more'
      && p.testID !== 'volyume-btn-extra-set')).toHaveLength(1);
    expect(glyph(render({ state: 'active' }))).toHaveLength(0);
    expect(glyph(render({ state: 'done', onPressHeader: jest.fn() }))).toHaveLength(0);
    expect(glyph(render({ state: 'upcoming', onPressHeader: jest.fn() }))).toHaveLength(0);
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
    // renderKit mounts a KitThemeProvider view, whose one child is the card's own provider view,
    // whose one child is the kit card.
    const outer = tree.toJSON();
    expect(outer.children).toHaveLength(1);
    expect(outer.children[0].children).toHaveLength(1);
    const kids = outer.children[0].children[0].children;
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

  test('Add set and Swap are ghost kit buttons (no fill, no border, 48 dp, an 18 dp lucide glyph and a semibold label in primary ink); the overflow stays a chromeless glyph', () => {
    // kit trial 2 (LOC-412): the footer actions were TouchableOpacity rows with 20 dp Ionicons;
    // they are now the kit's ghost Button (a Pressable with role 'button') with a lucide icon and
    // a Text label. The grammar (no fill, no border, 48 dp target, never a second primary, D8) holds.
    const tree = render({ onSwap: jest.fn() });
    const add = one(hosts(tree, (p) => p.testID === 'volyume-btn-extra-set'));
    const addStyle = flat(add.props.style);
    expect(addStyle.backgroundColor).toBeUndefined();
    expect(addStyle.borderWidth).toBeUndefined();
    expect(addStyle.borderColor).toBeUndefined();
    expect(addStyle.minHeight).toBe(touchTarget.minimum);
    expect(addStyle.flexDirection).toBe('row');
    expect(addStyle.alignItems).toBe('center');
    expect(add.props.role).toBe('button');
    const addGlyph = icons(add, 'Plus');
    expect(addGlyph).toHaveLength(1);
    expect(addGlyph[0].props.size).toBe(18);
    expect(iconInk(addGlyph[0])).toBe(hex(colors.textPrimary));
    const addLabel = textHost(tree, 'Add set');
    const label = flat(addLabel.props.style);
    expect(hex(label.color)).toBe(hex(colors.textPrimary));
    expect(label.fontFamily).toBe(SEMIBOLD);
    expect(addLabel.props.maxFontSizeMultiplier).toBe(fontScaleCaps.chrome);
    const swap = one(byLabel(tree, 'Swap exercise'));
    const swapStyle = flat(swap.props.style);
    expect(swapStyle.backgroundColor).toBeUndefined();
    expect(swapStyle.borderWidth).toBeUndefined();
    expect(swapStyle.minHeight).toBe(touchTarget.minimum);
    const swapGlyph = icons(swap, 'ArrowLeftRight');
    expect(swapGlyph).toHaveLength(1);
    expect(swapGlyph[0].props.size).toBe(18);
    expect(iconInk(swapGlyph[0])).toBe(hex(colors.textPrimary));
    const swapLabel = flat(textHost(tree, 'Swap').props.style);
    expect(hex(swapLabel.color)).toBe(hex(colors.textPrimary));
    expect(swapLabel.fontFamily).toBe(SEMIBOLD);
    // The overflow is still a TouchableOpacity, now drawing the lucide Ellipsis.
    const more = one(hosts(tree, (p) => p.testID === 'volyume-section-more'));
    expect(more.type).toBe('TouchableOpacity');
    const moreStyle = flat(more.props.style);
    expect(moreStyle.backgroundColor).toBeUndefined();
    expect(moreStyle.borderWidth).toBeUndefined();
    expect(moreStyle.height).toBe(touchTarget.minimum);
    expect(icons(more, 'Ellipsis')).toHaveLength(1);
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
  test('the kit card: surface fill, radius.lg, 1 px borderSubtle, no band, no shadow, no padding of its own', () => {
    // kit trial 2 (LOC-412): the "house card" (Card.js geometry) is now the kit Card inside a
    // KitThemeProvider view, with the same surface, radius and hairline border resolved from
    // classes. The card still carries no band of its own: the page gap spaces it.
    const card = one(cardsOf(render({})));
    const s = flat(card.props.style);
    expect(hex(s.backgroundColor)).toBe(hex(colors.surface));
    expect(s.borderRadius).toBe(radius.lg);
    expect(s.borderWidth).toBe(1);
    expect(hex(s.borderColor)).toBe(hex(colors.borderSubtle));
    expect(s.overflow).toBe('hidden');
    expect(s.rowGap ?? s.gap).toBe(0);
    expect(s.marginTop).toBeUndefined();
    expect(s.paddingTop ?? 0).toBe(0);
    expect(s.paddingBottom ?? 0).toBe(0);
    expect(s.shadowOpacity === undefined || s.shadowColor === undefined || s.elevation === 0 || s.shadowRadius === 0).toBe(true);
  });

  test('embedded (kit trial 2): draws no card of its own, still the header and the footer', () => {
    // New in LOC-412: a row of the "still to do" list; the list is the card.
    const tree = render({ embedded: true });
    expect(cardsOf(tree)).toHaveLength(0);
    one(byLabel(tree, 'Exercise 2, Barbell Row (Bent Over)'));
    one(byLabel(tree, 'Add set'));
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

  test('active: a 2 dp quiet line along the top edge of the footer, hidden from the accessibility tree', () => {
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
    // kit trial 2 (LOC-412): the line was amber (colors.primary); amber is now reserved for "act here"
    // (the one solid button, the field ring), so the auto-advance line is the quiet secondary ink.
    expect(hex(flat(fill(tree).props.style).backgroundColor)).toBe(hex(colors.textSecondary));
    expect(hex(flat(fill(tree).props.style).backgroundColor)).not.toBe(hex(colors.primary));
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
      // renderKit mounts under a KitThemeProvider; update with the same root so the tree is kept.
      const section = (countdown) => (
        <KitThemeProvider>
          <ExerciseSection index={2} name="Row" state="active" countdown={countdown}><Text>x</Text></ExerciseSection>
        </KitThemeProvider>
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
      // kit trial 2 (LOC-412): quiet secondary ink, not amber (see the active test).
      expect(hex(flat(fill(tree).props.style).backgroundColor)).toBe(hex(colors.textSecondary));
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
  // kit trial 2 (LOC-412): the source legitimately changed to draw with the kit and lucide, so
  // the guard now also pins that: no Ionicons and no theme `colors` read for a fill (the only
  // colour passed is the countdown's quiet ink, from the theme hook).
  test('draws with the kit parts and lucide icons, not Ionicons or inline fills', () => {
    expect(SRC).toMatch(/from '\.\.\/\.\.\/ui\/exercise-card-kit'/);
    expect(SRC).toMatch(/from 'lucide-react-native'/);
    expect(SRC).not.toMatch(/Ionicons/);
    expect(SRC).not.toMatch(/colors\.(primary|success|surface)/);
    expect(SRC).toMatch(/t\.colors\.textSecondary/);
  });
});

// Founder request 2026-10-17 ("delete a set if you've added too many or want to
// do less"): a Remove set action beside Add set, the same ghost 48 dp
// footer action, only when the screen gives onRemoveSet.
describe('ExerciseSection footer, Remove set', () => {
  test('absent without onRemoveSet', () => {
    const tree = render({});
    expect(byLabel(tree, 'Remove a set from Barbell Row (Bent Over)')).toHaveLength(0);
    expect(joined(tree)).not.toContain('Remove set');
  });

  test('present beside Add set, named for the exercise, and calls its callback', () => {
    const onRemoveSet = jest.fn();
    const tree = render({ onRemoveSet });
    const remove = one(byLabel(tree, 'Remove a set from Barbell Row (Bent Over)'));
    expect(remove.props.testID).toBe('volyume-btn-remove-set');
    expect(remove.props.role).toBe('button');
    expect(flat(remove.props.style).minHeight).toBe(touchTarget.minimum);
    expect(flat(remove.props.style).backgroundColor).toBeUndefined();
    expect(flat(remove.props.style).borderWidth).toBeUndefined();
    expect(icons(remove, 'Minus')).toHaveLength(1);
    expect(textHost(tree, 'Remove set')).toBeTruthy();
    press(remove);
    expect(onRemoveSet).toHaveBeenCalledTimes(1);
    // Add set comes first, then Remove set.
    const footerWords = joined(tree);
    expect(footerWords.indexOf('Add set')).toBeLessThan(footerWords.indexOf('Remove set'));
  });

  test('a done or upcoming section never shows it', () => {
    expect(byLabel(render({ onRemoveSet: jest.fn(), state: 'done' }), 'Remove a set from Barbell Row (Bent Over)')).toHaveLength(0);
    expect(byLabel(render({ onRemoveSet: jest.fn(), state: 'upcoming' }), 'Remove a set from Barbell Row (Bent Over)')).toHaveLength(0);
  });

  test('the footer wraps so four actions stay reachable at the largest text size', () => {
    const tree = render({ onRemoveSet: jest.fn(), onSwap: jest.fn(), onFilm: jest.fn() });
    const footer = one(hosts(tree, (p) => flat(p.style).minHeight === 52));
    expect(flat(footer.props.style).flexWrap).toBe('wrap');
  });
});
