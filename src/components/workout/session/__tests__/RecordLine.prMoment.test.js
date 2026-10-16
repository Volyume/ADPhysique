/**
 * RecordLine, the PR moment's two video actions (D229 addendum 9, items 1 and
 * 2: "This set would be a new PR" with Record it before the set; Share after it).
 * The row is still ONE row of the exercise card (D220 addendum 36: "No
 * floating surface of any kind"), so the actions live in it, not beside it.
 *
 * Pins, against the REAL component:
 *   - the offer form renders its words, the flag glyph and the text action
 *     after a middle dot, and the action calls back; it is the same band as
 *     the earned record (in flow, centred both ways, the hairline, 48 dp);
 *   - the action is a button with its own label and a 48 dp hit area, and
 *     with an action on it the row is no longer one accessible element, so
 *     the words and the action are each reached on their own;
 *   - the offer never animates, even if asked to celebrate;
 *   - an earned record wins over an offer;
 *   - Share renders only with a real record (never the first lift, never
 *     without a record) and is reachable;
 *   - with no offer and no action given (what the screen passes under calm
 *     mode or an open ED flag) there is no action at all, and no record plus
 *     no offer is nothing;
 *   - the words are the one rule's (CLIP_STRINGS), the text is the house Text.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';

jest.mock('../../../../lib/haptics', () => ({ selection: jest.fn(), prAchieved: jest.fn() }));
jest.mock('../../../../lib/wellbeing', () => ({
  getWellbeingMode: jest.fn(() => Promise.resolve('standard')),
  isCalm: jest.fn((m) => m === 'calm'),
}));
jest.mock('@expo/vector-icons/Ionicons', () => (props) => {
  const React = require('react');
  return React.createElement('Ionicons', props);
});

const ReactNative = require('react-native');
const { CLIP_STRINGS } = require('../../../../lib/clips/rules');
const { touchTarget } = require('../../../../styles/layout');
const RecordLine = require('../RecordLine').default;

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'RecordLine.js'), 'utf8');

function flattenStyle(style) {
  if (!style) return {};
  if (Array.isArray(style)) return style.reduce((acc, s) => ({ ...acc, ...flattenStyle(s) }), {});
  return style;
}

const RECORD = { type: 'heaviest_weight', weight: 72.5, reps: 8, value: 72.5, units: 'kg', label: 'New heaviest weight: 72.5kg × 8 reps', setId: 's2', setNumber: 2 };
const RECORD_TEXT = 'New heaviest weight · 72.5 kg × 8';
const FIRST = { type: 'first_lift', weight: 70, reps: 8, units: 'kg', setId: 's1' };

function offer(onAction = jest.fn()) {
  return { text: CLIP_STRINGS.prOfferText, actionLabel: CLIP_STRINGS.prOfferAction, a11y: CLIP_STRINGS.rowA11y, onAction };
}
function share(onPress = jest.fn()) {
  return { label: CLIP_STRINGS.prShareAction, a11y: CLIP_STRINGS.prShareA11y, onPress };
}

function render(props) {
  let tree;
  act(() => { tree = create(<RecordLine reduceMotion={false} {...props} />); });
  return tree;
}

// Host nodes only (the Pressable mock renders a wrapper and a host).
const buttons = (tree) => tree.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'button');
const hasText = (tree, text) => tree.root.findAll((n) => n.props.children === text).length > 0;

describe('the offer: "This set would be a new PR", then Record it', () => {
  test('renders the words, the flag glyph and the action after a middle dot, and the action records', () => {
    const onAction = jest.fn();
    const tree = render({ record: null, offer: offer(onAction) });
    expect(hasText(tree, 'This set would be a new PR')).toBe(true);
    expect(hasText(tree, 'Film it')).toBe(true);
    expect(hasText(tree, '·')).toBe(true);
    expect(tree.root.findByType('Ionicons').props.name).toBe('flag-outline');
    const [action] = buttons(tree);
    expect(action.props.accessibilityLabel).toBe('Film this set');
    act(() => action.props.onPress());
    expect(onAction).toHaveBeenCalledTimes(1);
    act(() => { tree.unmount(); });
  });

  test('is the same band as the earned record: in flow, centred both ways, the hairline, 48 dp', () => {
    const tree = render({ record: null, offer: offer() });
    const band = flattenStyle(tree.root.findByProps({ testID: 'volyume-record-line' }).props.style);
    expect(band.position).toBeUndefined();
    expect(band.top).toBeUndefined();
    expect(band.bottom).toBeUndefined();
    expect(band.flexDirection).toBe('row');
    expect(band.alignItems).toBe('center');
    expect(band.justifyContent).toBe('center');
    expect(band.borderBottomWidth).toBe(1);
    expect(band.minHeight).toBe(48);
    // At the largest text sizes the action wraps under the words, never clips.
    expect(band.flexWrap).toBe('wrap');
    act(() => { tree.unmount(); });
  });

  test('the action is a button with a 48 dp hit area, and the words and the action are reached apart', () => {
    const tree = render({ record: null, offer: offer() });
    const band = tree.root.findByProps({ testID: 'volyume-record-line' });
    expect(band.props.accessible).toBe(false);
    const [action] = buttons(tree);
    const hit = flattenStyle(action.props.style);
    expect(hit.minHeight).toBeGreaterThanOrEqual(touchTarget.minimum);
    expect(hit.minWidth).toBeGreaterThanOrEqual(touchTarget.minimum);
    expect(touchTarget.minimum).toBe(48);
    const words = tree.root.findAll((n) => typeof n.type === 'string' && n.props.accessible === true && n.props.accessibilityRole === 'text');
    expect(words.map((n) => n.props.accessibilityLabel)).toEqual(['This set would be a new PR']);
    // The middle dot is decoration, never read aloud.
    const dot = tree.root.findAll((n) => n.props.children === '·' && n.props.importantForAccessibility === 'no');
    expect(dot.length).toBeGreaterThan(0);
    act(() => { tree.unmount(); });
  });

  test('never animates, even when asked to celebrate', () => {
    const timing = jest.spyOn(ReactNative.Animated, 'timing');
    const tree = render({ record: null, offer: offer(), celebrate: true });
    expect(timing).not.toHaveBeenCalled();
    const band = flattenStyle(tree.root.findByProps({ testID: 'volyume-record-line' }).props.style);
    expect(band.opacity).not.toBe(0);
    timing.mockRestore();
    act(() => { tree.unmount(); });
  });

  test('an earned record wins: the offer is not shown beside it', () => {
    const tree = render({ record: RECORD, offer: offer() });
    expect(hasText(tree, RECORD_TEXT)).toBe(true);
    expect(hasText(tree, 'This set would be a new PR')).toBe(false);
    expect(buttons(tree)).toHaveLength(0);
    act(() => { tree.unmount(); });
  });

  test('an offer without its words or its handler is nothing', () => {
    for (const bad of [{ ...offer(), text: '' }, { ...offer(), onAction: undefined }, { ...offer(), actionLabel: '' }]) {
      const tree = render({ record: null, offer: bad });
      expect(tree.toJSON()).toBeNull();
      act(() => { tree.unmount(); });
    }
  });

  test('when the set is logged the earned record takes the row and animates in once', () => {
    const timing = jest.spyOn(ReactNative.Animated, 'timing');
    let tree;
    act(() => { tree = create(<RecordLine record={null} offer={offer()} celebrate={false} reduceMotion={false} />); });
    expect(timing).not.toHaveBeenCalled();
    act(() => { tree.update(<RecordLine record={RECORD} offer={null} celebrate reduceMotion={false} />); });
    expect(timing.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(hasText(tree, RECORD_TEXT)).toBe(true);
    expect(hasText(tree, 'This set would be a new PR')).toBe(false);
    timing.mockRestore();
    act(() => { tree.unmount(); });
  });
});

describe('Share, on an earned record with its video', () => {
  test('renders after a middle dot on a real record and opens the share', () => {
    const onPress = jest.fn();
    const tree = render({ record: RECORD, action: share(onPress) });
    expect(hasText(tree, RECORD_TEXT)).toBe(true);
    expect(hasText(tree, 'Share')).toBe(true);
    const [action] = buttons(tree);
    expect(action.props.accessibilityLabel).toBe('Share this PR with its video');
    act(() => action.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
    // The record keeps its own spoken label, apart from the action.
    const words = tree.root.findAll((n) => typeof n.type === 'string' && n.props.accessible === true && n.props.accessibilityRole === 'text');
    expect(words.map((n) => n.props.accessibilityLabel)).toEqual([`Personal record. ${RECORD_TEXT}`]);
    expect(tree.root.findByProps({ testID: 'volyume-record-line' }).props.accessible).toBe(false);
    // Gold glyph, as the record has without an action.
    expect(tree.root.findByType('Ionicons').props.color).toBe(require('../../../../styles/theme').colors.gold);
    act(() => { tree.unmount(); });
  });

  test('never on the first lift, and nothing without a record', () => {
    const first = render({ record: FIRST, action: share() });
    expect(buttons(first)).toHaveLength(0);
    expect(hasText(first, 'Share')).toBe(false);
    act(() => { first.unmount(); });
    const none = render({ record: null, action: share() });
    expect(none.toJSON()).toBeNull();
    act(() => { none.unmount(); });
  });
});

describe('with nothing offered (calm mode or an open ED flag: the screen passes neither)', () => {
  test('a record row has no action and stays one accessible line', () => {
    const tree = render({ record: RECORD, offer: null, action: null });
    expect(buttons(tree)).toHaveLength(0);
    expect(hasText(tree, '·')).toBe(false);
    const band = tree.root.findByProps({ testID: 'volyume-record-line' });
    expect(band.props.accessible).toBe(true);
    expect(band.props.accessibilityLabel).toBe(`Personal record. ${RECORD_TEXT}`);
    act(() => { tree.unmount(); });
  });

  test('no record and no offer renders nothing', () => {
    const tree = render({ record: null, offer: null, action: null });
    expect(tree.toJSON()).toBeNull();
    act(() => { tree.unmount(); });
  });
});

describe('source', () => {
  test('the house Text, a Pressable for the action, and the 48 dp token', () => {
    expect(SOURCE).toContain("import Text from '../../Text';");
    expect(SOURCE).not.toMatch(/import \{[^}]*\bText\b[^}]*\} from 'react-native'/);
    expect(SOURCE).toMatch(/import \{[^}]*\bPressable\b[^}]*\} from 'react-native'/);
    expect(SOURCE).toContain('minHeight: touchTarget.minimum,');
    expect(SOURCE).toContain('accessibilityRole="button"');
    // The row draws only what it is given: its code holds no video words.
    const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).toContain("'flag-outline'");
    expect(code).not.toMatch(/['"`][^'"`\n]*\b(video|Film it|Share)\b[^'"`\n]*['"`]/);
  });
});
