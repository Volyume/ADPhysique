/**
 * RecordLine (D220 addendum 36, founder device verdict 2026-10-09: the
 * record pop-up "pops up at first just on the line of the set for half a
 * second and then pops up at the bottom on top of other data ... A
 * completely different way of doing it that fits in with the logger now!
 * Not moving it to be ON TOP of other data").
 *
 * Pins, against the REAL component, that the record is a line IN the card
 * and nothing floats:
 *   - it renders in flow (no absolute position, no top/bottom offset) with
 *     the record's own label, and nothing without a record;
 *   - celebrateRecord (called by the screen the moment a record is earned)
 *     announces it as a record and plays the record haptic ladder; a first
 *     lift is announced as the honest first with the light tick and no
 *     record wording; calm mode and reduce-motion keep the light tick;
 *   - the component itself never announces or buzzes (a jump back or a
 *     remount never celebrates twice);
 *   - the enter animation's easing is a FUNCTION (the theme's control-point
 *     array threw on the native driver; pre-build review 2026-10-09);
 *   - the glyph is gold for a record and muted for a first lift.
 */
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
const announce = jest.fn();
ReactNative.AccessibilityInfo = {
  announceForAccessibility: announce,
  isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
  isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
};

const haptics = require('../../../../lib/haptics');
const wellbeing = require('../../../../lib/wellbeing');
const { colors } = require('../../../../styles/theme');
const RecordLine = require('../RecordLine').default;
const { celebrateRecord } = require('../RecordLine');

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

function flattenStyle(style) {
  if (!style) return {};
  if (Array.isArray(style)) return style.reduce((acc, s) => ({ ...acc, ...flattenStyle(s) }), {});
  return style;
}

const RECORD = { type: 'heaviest_weight', weight: 72.5, reps: 8, value: 72.5, units: 'kg', label: 'New heaviest weight: 72.5kg × 8 reps', setId: 's2' };
const RECORD_TEXT = 'New heaviest weight \u00B7 72.5 kg \u00D7 8';
const FIRST = { type: 'first_lift', weight: 70, reps: 8, units: 'kg', setId: 's1' };
const FIRST_TEXT = 'First lift logged \u00B7 70 kg \u00D7 8';

beforeEach(() => {
  announce.mockClear();
  haptics.selection.mockClear();
  haptics.prAchieved.mockClear();
  wellbeing.getWellbeingMode.mockImplementation(() => Promise.resolve('standard'));
});

describe('the record is a line of the card, not a floating surface', () => {
  test('renders the record label in flow, never positioned', () => {
    let tree;
    act(() => { tree = create(<RecordLine record={RECORD} celebrate={false} />); });
    const line = tree.root.findByProps({ testID: 'volyume-record-line' });
    const style = flattenStyle(line.props.style);
    expect(style.position).toBeUndefined();
    expect(style.top).toBeUndefined();
    expect(style.bottom).toBeUndefined();
    expect(style.flexDirection).toBe('row');
    // Centred in its band, both ways, as a row of the table.
    expect(style.alignItems).toBe('center');
    expect(style.justifyContent).toBe('center');
    expect(style.borderBottomWidth).toBe(1);
    // The logger's own grammar ("72.5 kg × 8"), never detectPR's summary label.
    const texts = tree.root.findAll((n) => typeof n.props.children === 'string' && n.props.children === RECORD_TEXT);
    expect(texts.length).toBeGreaterThan(0);
    expect(tree.root.findAll((n) => n.props.children === RECORD.label)).toHaveLength(0);
    const glyph = tree.root.findByType('Ionicons');
    expect(glyph.props.name).toBe('barbell');
    expect(glyph.props.color).toBe(colors.gold);
    act(() => { tree.unmount(); });
  });

  test('renders nothing without a record', () => {
    let tree;
    act(() => { tree = create(<RecordLine record={null} celebrate />); });
    expect(tree.toJSON()).toBeNull();
    act(() => { tree.unmount(); });
  });

  test('celebrateRecord: announced as a record with the PR ladder', async () => {
    celebrateRecord(RECORD, { reduceMotion: false });
    await flush();
    expect(announce).toHaveBeenCalledWith(`Personal record. ${RECORD_TEXT}.`);
    expect(haptics.prAchieved).toHaveBeenCalledTimes(1);
    expect(haptics.selection).not.toHaveBeenCalled();
    const better = { type: '1rm_estimate', weight: 80, reps: 8, value: 95.04, units: 'kg', label: 'New estimated max: 95.0kg', setId: 's3' };
    celebrateRecord(better, { reduceMotion: false });
    await flush();
    expect(announce).toHaveBeenLastCalledWith('Personal record. New estimated max \u00B7 95 kg.');
    expect(haptics.prAchieved).toHaveBeenCalledTimes(2);
  });

  test('the component itself never announces or buzzes, celebrating or not', async () => {
    let tree;
    act(() => { tree = create(<RecordLine record={RECORD} celebrate />); });
    await flush();
    act(() => { tree.update(<RecordLine record={RECORD} celebrate={false} />); });
    await flush();
    act(() => { tree.unmount(); });
    act(() => { tree = create(<RecordLine record={RECORD} celebrate={false} />); });
    await flush();
    expect(announce).not.toHaveBeenCalled();
    expect(haptics.prAchieved).not.toHaveBeenCalled();
    expect(haptics.selection).not.toHaveBeenCalled();
    act(() => { tree.unmount(); });
  });

  test('the enter animation passes Animated a real easing function', () => {
    // The Jest react-native mock stubs Easing (every curve is a number), so
    // the proof is in two halves: the component builds its curve through
    // Easing.bezier from the theme's control points (source), and the REAL
    // Easing module turns those points into a function (the production
    // value). The raw control-point array is what threw on the device.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'RecordLine.js'), 'utf8');
    expect(src).toContain('const EASE_DECELERATE = Easing.bezier(...motion.easeDecelerate);');
    expect(src).toMatch(/easing: EASE_DECELERATE, useNativeDriver: true/);
    expect(src).not.toMatch(/easing: motion\./);
    const RealEasing = jest.requireActual('react-native/Libraries/Animated/Easing').default;
    const { motion } = require('../../../../styles/theme');
    expect(typeof RealEasing.bezier(...motion.easeDecelerate)).toBe('function');
    // And the timings that run are native-driver timings with that curve.
    const timing = jest.spyOn(ReactNative.Animated, 'timing');
    let tree;
    act(() => { tree = create(<RecordLine record={RECORD} celebrate />); });
    const configs = timing.mock.calls.map((c) => c[1]);
    expect(configs.length).toBeGreaterThanOrEqual(2);
    for (const c of configs) expect(c.useNativeDriver).toBe(true);
    timing.mockRestore();
    act(() => { tree.unmount(); });
  });

  test('a first lift is the honest first: muted glyph, light tick, no record wording', async () => {
    celebrateRecord(FIRST, { reduceMotion: false });
    await flush();
    expect(announce).toHaveBeenCalledWith(`First lift logged. ${FIRST_TEXT}.`);
    expect(announce.mock.calls.join(' ')).not.toMatch(/record/i);
    expect(haptics.selection).toHaveBeenCalledTimes(1);
    expect(haptics.prAchieved).not.toHaveBeenCalled();
    let tree;
    act(() => { tree = create(<RecordLine record={FIRST} celebrate />); });
    const glyph = tree.root.findByType('Ionicons');
    expect(glyph.props.name).toBe('barbell-outline');
    expect(glyph.props.color).not.toBe(colors.gold);
    const line = tree.root.findByProps({ testID: 'volyume-record-line' });
    expect(line.props.accessibilityLabel).toBe(FIRST_TEXT);
    act(() => { tree.unmount(); });
  });

  test('calm mode and reduce-motion keep the light tick for a real record', async () => {
    wellbeing.getWellbeingMode.mockImplementation(() => Promise.resolve('calm'));
    celebrateRecord(RECORD, { reduceMotion: false });
    await flush();
    expect(haptics.selection).toHaveBeenCalledTimes(1);
    expect(haptics.prAchieved).not.toHaveBeenCalled();
    haptics.selection.mockClear();
    wellbeing.getWellbeingMode.mockClear();
    wellbeing.getWellbeingMode.mockImplementation(() => Promise.resolve('standard'));
    celebrateRecord(RECORD, { reduceMotion: true });
    await flush();
    expect(haptics.selection).toHaveBeenCalledTimes(1);
    expect(haptics.prAchieved).not.toHaveBeenCalled();
    expect(wellbeing.getWellbeingMode).not.toHaveBeenCalled();
  });
});
