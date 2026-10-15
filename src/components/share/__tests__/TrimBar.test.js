/**
 * TrimBar (D229): the window maths every gesture and the accessible route
 * share, and the bar's spoken label. Pins: the window is never longer than
 * the cap or shorter than the floor, never leaves the clip, the body keeps
 * its length, and a move that meets a limit says so (the haptic tick).
 */
import { act, create } from 'react-test-renderer';

jest.mock('@shopify/react-native-skia', () => {
  const R = require('react');
  const pass = (name) => { const C = ({ children, ...p }) => R.createElement(name, p, children); C.displayName = name; return C; };
  return { Canvas: pass('Canvas'), Image: pass('SkiaImage'), Skia: {} };
});
jest.mock('../../../lib/haptics', () => ({ selection: jest.fn() }));

const { mmss, moveWindow } = require('../TrimBar');
const TrimBar = require('../TrimBar').default;

const limits = { durationMs: 42000, maxWindowMs: 15000, minWindowMs: 1000 };

describe('mmss', () => {
  test('formats seconds as m:ss', () => {
    expect(mmss(0)).toBe('0:00');
    expect(mmss(12400)).toBe('0:12');
    expect(mmss(61000)).toBe('1:01');
    expect(mmss(-5)).toBe('0:00');
    expect(mmss(NaN)).toBe('0:00');
  });
});

describe('moveWindow', () => {
  test('the body slides and keeps its length, stopping at the clip ends', () => {
    const w = { ...limits, startMs: 3000, endMs: 15000 };
    expect(moveWindow(w, 'body', 2000)).toEqual({ startMs: 5000, endMs: 17000, atLimit: false });
    expect(moveWindow(w, 'body', -9000)).toEqual({ startMs: 0, endMs: 12000, atLimit: true });
    expect(moveWindow(w, 'body', 99000)).toEqual({ startMs: 30000, endMs: 42000, atLimit: true });
  });
  test('the start handle never makes the window longer than the cap or shorter than the floor', () => {
    const w = { ...limits, startMs: 10000, endMs: 20000 };
    expect(moveWindow(w, 'start', -9000)).toEqual({ startMs: 5000, endMs: 20000, atLimit: true });
    expect(moveWindow(w, 'start', 9500)).toEqual({ startMs: 19000, endMs: 20000, atLimit: true });
    expect(moveWindow(w, 'start', 1000)).toEqual({ startMs: 11000, endMs: 20000, atLimit: false });
  });
  test('the end handle is capped by the window length and the clip', () => {
    const w = { ...limits, startMs: 30000, endMs: 38000 };
    expect(moveWindow(w, 'end', 9000)).toEqual({ startMs: 30000, endMs: 42000, atLimit: true });
    expect(moveWindow({ ...limits, startMs: 0, endMs: 5000 }, 'end', 20000)).toEqual({ startMs: 0, endMs: 15000, atLimit: true });
    expect(moveWindow(w, 'end', -7500)).toEqual({ startMs: 30000, endMs: 31000, atLimit: true });
  });
});

describe('<TrimBar>', () => {
  test('speaks the window and moves it a second at a time through the accessible route', () => {
    const onChange = jest.fn();
    let tree;
    act(() => {
      tree = create(
        <TrimBar width={300} durationMs={42000} startMs={3000} endMs={15000} onChange={onChange} />,
      );
    });
    const bar = tree.root.findAll((n) => n.props.accessibilityRole === 'adjustable')[0];
    expect(bar.props.accessibilityLabel).toBe('Trim. Start 0:03, end 0:15');
    act(() => { bar.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }); });
    expect(onChange).toHaveBeenCalledWith({ startMs: 4000, endMs: 16000 });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('0:12');
  });
});
