/**
 * VideoTrimBar (founder orders 2026-10-16, D229 addendum 17): a window of at
 * most 15 s slides along a strip of frames of the whole video, with handles
 * to shorten it. Pinned: the strip's frame count and that its frames come
 * from videoStripBase64; the caption; every window rule through clampWindow
 * directly (the worklets share its twin); the six accessibility moves in 1 s
 * steps with onChange fired and rounded to 100 ms; and the short-video case.
 *
 * Gestures are not driven here: the repo's gesture-handler mock has no JS
 * gesture engine (__mocks__/react-native-gesture-handler.js), so the drag
 * rules are pinned through clampWindow, the function the worklets call.
 */
jest.mock('../../../lib/shareVideo/videoFrame', () => ({
  videoStripBase64: jest.fn((Skia, uri, d, count) => new Array(count).fill('F')),
}));

const React = require('react');
const TestRenderer = require('react-test-renderer');
const { videoStripBase64 } = require('../../../lib/shareVideo/videoFrame');
const VideoTrimBar = require('../VideoTrimBar').default;
const { clampWindow, windowCaption, stripCount } = require('../VideoTrimBar');

const base = { durationMs: 60000, minWindowMs: 1000, maxWindowMs: 15000 };

function mount(props) {
  let tree = null;
  TestRenderer.act(() => {
    tree = TestRenderer.create(React.createElement(VideoTrimBar, {
      uri: 'file:///v.mp4', durationMs: 60000, startMs: 2000, endMs: 14000, width: 340, ...props,
    }));
  });
  return tree;
}
const bar = (tree) => tree.root.findAll((n) => n.props && n.props.accessibilityRole === 'adjustable')[0];
const fire = (tree, name) => TestRenderer.act(() => {
  bar(tree).props.onAccessibilityAction({ nativeEvent: { actionName: name } });
});

beforeEach(() => { jest.useFakeTimers(); videoStripBase64.mockClear(); });
afterEach(() => { jest.useRealTimers(); });

describe('strip and caption', () => {
  test('count is max(6, floor(width / 48)) and frames come from videoStripBase64', () => {
    expect(stripCount(340)).toBe(7);
    expect(stripCount(100)).toBe(6);
    const tree = mount({ Skia: {} });
    TestRenderer.act(() => { jest.runAllTimers(); });
    expect(videoStripBase64).toHaveBeenCalledWith({}, 'file:///v.mp4', 60000, 7, 48, 56);
    const frames = tree.root.findAll((n) => n.props.testID === 'video-trim-frame' && n.props.source);
    expect(frames.length).toBeGreaterThanOrEqual(7);
    expect(frames[0].props.source.uri).toBe('data:image/png;base64,F');
  });

  test('no Skia: tinted boxes, no decode', () => {
    const tree = mount({ Skia: null });
    TestRenderer.act(() => { jest.runAllTimers(); });
    expect(videoStripBase64).not.toHaveBeenCalled();
    expect(tree.root.findAll((n) => n.props.testID === 'video-trim-box').length).toBeGreaterThanOrEqual(7);
  });

  test('the caption names the window', () => {
    expect(windowCaption(2000, 14000)).toBe('Start 0:02 to 0:14, 12 seconds');
    const tree = mount({});
    expect(bar(tree).props.accessibilityValue).toEqual({ text: 'Start 0:02 to 0:14, 12 seconds' });
    expect(bar(tree).props.accessibilityLabel).toBe('Choose which part of the video goes on');
    expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'Start handle').length).toBeGreaterThan(0);
    expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'End handle').length).toBeGreaterThan(0);
  });
});

describe('clampWindow', () => {
  test('sliding keeps the length and stops at 0 and at the end', () => {
    expect(clampWindow({ ...base, startMs: 10000, endMs: 22000, moved: 'window' })).toEqual({ startMs: 10000, endMs: 22000 });
    expect(clampWindow({ ...base, startMs: -5000, endMs: 7000, moved: 'window' })).toEqual({ startMs: 0, endMs: 12000 });
    expect(clampWindow({ ...base, startMs: 55000, endMs: 67000, moved: 'window' })).toEqual({ startMs: 48000, endMs: 60000 });
  });

  test('a handle never crosses the other minus the minimum', () => {
    expect(clampWindow({ ...base, startMs: 13500, endMs: 14000, moved: 'start' })).toEqual({ startMs: 13000, endMs: 14000 });
    expect(clampWindow({ ...base, startMs: 2000, endMs: 1000, moved: 'end' })).toEqual({ startMs: 2000, endMs: 3000 });
  });

  test('a handle dragged past the cap pushes the other along', () => {
    expect(clampWindow({ ...base, startMs: 2000, endMs: 20000, moved: 'end' })).toEqual({ startMs: 5000, endMs: 20000 });
    expect(clampWindow({ ...base, startMs: 0, endMs: 20000, moved: 'start' })).toEqual({ startMs: 0, endMs: 15000 });
  });

  test('the end of a 60 s video is reachable by sliding and by the end handle', () => {
    expect(clampWindow({ ...base, startMs: 70000, endMs: 85000, moved: 'window' })).toEqual({ startMs: 45000, endMs: 60000 });
    expect(clampWindow({ ...base, startMs: 0, endMs: 99000, moved: 'end' })).toEqual({ startMs: 45000, endMs: 60000 });
  });
});

describe('accessibility moves', () => {
  test.each([
    ['increment', { startMs: 3000, endMs: 15000 }],
    ['decrement', { startMs: 1000, endMs: 13000 }],
    ['startLater', { startMs: 3000, endMs: 14000 }],
    ['startEarlier', { startMs: 1000, endMs: 14000 }],
    ['endLater', { startMs: 2000, endMs: 15000 }],
    ['endEarlier', { startMs: 2000, endMs: 13000 }],
  ])('%s moves 1 s and fires onChange', (name, want) => {
    const onChange = jest.fn();
    const tree = mount({ onChange });
    expect(bar(tree).props.accessibilityActions.map((a) => a.name)).toContain(name);
    fire(tree, name);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(want);
  });

  test('onChange is rounded to 100 ms', () => {
    const onChange = jest.fn();
    const tree = mount({ onChange, startMs: 2040, endMs: 14260 });
    fire(tree, 'increment');
    const got = onChange.mock.calls[0][0];
    expect(got.startMs % 100).toBe(0);
    expect(got.endMs % 100).toBe(0);
    expect(got).toEqual({ startMs: 3000, endMs: 15300 });
  });
});

test('a video no longer than the minimum has no handles and says the whole video goes on', () => {
  const onChange = jest.fn();
  const tree = mount({ durationMs: 800, startMs: 0, endMs: 800, onChange });
  expect(tree.root.findAll((n) => n.props.accessibilityLabel === 'Start handle')).toHaveLength(0);
  expect(bar(tree).props.accessibilityValue).toEqual({ text: 'The whole video goes on the share.' });
  fire(tree, 'increment');
  expect(onChange).not.toHaveBeenCalled();
});
