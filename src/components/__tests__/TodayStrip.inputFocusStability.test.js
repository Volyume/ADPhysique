/**
 * TodayStrip input focus/identity stability (founder device report,
 * 2026-10-02: "when I'm entering the weight for the morning I press one
 * number and the keyboard drops down", the second build to reach a device
 * with this symptom).
 *
 * Root cause: TodayStrip declared its weight row as a COMPONENT inside its
 * own render (`function WeightInputRow() { ... }` rendered as
 * `<WeightInputRow />`). Every keystroke re-rendered the strip, the function
 * had a new identity, React treated it as a different element type and
 * unmounted the row, so the TextInput remounted and the Android IME closed.
 * The rows are plain render helpers now, called as functions.
 *
 * What this suite pins and why:
 *  1. Typing a kg weight digit by digit mounts the field ONCE and never
 *     unmounts it (the TextField is instrumented to log every mount and
 *     unmount), and carries the exact value sequence, decimal point
 *     included. On the old strip the same test logs a mount and an unmount
 *     per keystroke.
 *  2. The stones path (two fields) mounts each field once through typing.
 *  3. Source guards: no inner component is declared in TodayStrip.js and
 *     no `<Weight... />` tag renders one. The repo-wide guard
 *     (src/__tests__/innerComponentRemount.guard.test.js) pins the rule for
 *     every file.
 */
import { create, act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import fs from 'fs';
import path from 'path';

jest.mock('../../lib/database', () => ({}));
jest.mock('../Sparkline', () => 'Sparkline');
// The field, instrumented: every mount and unmount of a TextField is logged
// by its accessibility label, so a remount (the defect's mechanism) shows up
// as a second "mount" or any "unmount" while the person is typing. The
// render itself is a plain TextInput carrying the same props.
jest.mock('../TextField', () => {
  const React = require('react');
  const { TextInput } = require('react-native');
  const log = [];
  const Mock = React.forwardRef((props, ref) => {
    React.useEffect(() => {
      log.push(`mount:${props.accessibilityLabel}`);
      return () => { log.push(`unmount:${props.accessibilityLabel}`); };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return React.createElement(TextInput, { ...props, ref });
  });
  Mock.displayName = 'TextFieldMock';
  Mock.__log = log;
  return { __esModule: true, default: Mock };
});
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import TodayStrip from '../TodayStrip';
import TextFieldMock from '../TextField';

const mountLog = () => TextFieldMock.__log;
beforeEach(() => { mountLog().length = 0; });

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'TodayStrip.js'), 'utf8');
// Code only: the file's header comment names the old tag to explain the defect.
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

function mount(props = {}) {
  let tree;
  act(() => {
    tree = create(<TodayStrip bwu="kg" todayWeight={null} onLogWeight={() => {}} {...props} />);
  });
  return tree;
}

function pressLog(tree) {
  const btn = tree.root.findAll((n) => n.props.accessibilityLabel === 'Log morning weight' && typeof n.props.onPress === 'function')[0];
  act(() => btn.props.onPress());
}

function hostInput(tree, label) {
  return tree.root.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === label)[0];
}

describe('kg: continuous entry keeps ONE TextInput instance', () => {
  test('typing "8" -> "82" -> "82." -> "82.4" never remounts the field and keeps the value verbatim', () => {
    const tree = mount();
    pressLog(tree);
    expect(hostInput(tree, 'Morning weight in kg')).toBeTruthy();
    expect(mountLog()).toEqual(['mount:Morning weight in kg']);
    for (const step of ['8', '82', '82.', '82.4']) {
      act(() => hostInput(tree, 'Morning weight in kg').props.onChangeText(step));
      expect(hostInput(tree, 'Morning weight in kg').props.value).toBe(step);
    }
    // One mount for the whole entry, no unmount: the field never remounted.
    expect(mountLog()).toEqual(['mount:Morning weight in kg']);
  });

  test('the Log button becoming enabled mid-typing (a layout change on the row) does not remount the input', () => {
    const tree = mount();
    pressLog(tree);
    act(() => hostInput(tree, 'Morning weight in kg').props.onChangeText('8'));
    const logBtn = tree.root.findAll((n) => n.props.accessibilityLabel === 'Log morning weight' && n.props.accessibilityState)[0];
    expect(logBtn.props.accessibilityState.disabled).toBe(false);
    expect(mountLog().filter((e) => e.startsWith('unmount:'))).toEqual([]);
    expect(mountLog().filter((e) => e === 'mount:Morning weight in kg')).toHaveLength(1);
  });
});

describe('stones: both fields keep their instances through typing', () => {
  test('"12" in stones then "7" in pounds, no remount of either', () => {
    const tree = mount({ bwu: 'st' });
    pressLog(tree);
    expect(mountLog()).toEqual(['mount:Morning weight in stones', 'mount:Morning weight remaining pounds']);
    act(() => hostInput(tree, 'Morning weight in stones').props.onChangeText('1'));
    act(() => hostInput(tree, 'Morning weight in stones').props.onChangeText('12'));
    act(() => hostInput(tree, 'Morning weight remaining pounds').props.onChangeText('7'));
    expect(hostInput(tree, 'Morning weight in stones').props.value).toBe('12');
    expect(hostInput(tree, 'Morning weight remaining pounds').props.value).toBe('7');
    expect(mountLog()).toEqual(['mount:Morning weight in stones', 'mount:Morning weight remaining pounds']);
  });
});

describe('source guards: no component declared inside the strip\'s render', () => {
  test('no inner capitalised function component and no <Weight... /> tag', () => {
    expect(CODE).not.toMatch(/^\s{2,}function [A-Z]\w*\(/m);
    expect(CODE).not.toMatch(/<Weight(InputRow|Logged|Empty)\b/);
    expect(CODE).toMatch(/renderWeightInputRow\(\)/);
  });
});
