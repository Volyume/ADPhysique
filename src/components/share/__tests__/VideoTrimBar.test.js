/**
 * VideoTrimBar (founder orders 2026-10-16, D229 addendum 17): a window of at
 * most 15 s slides along a strip of frames of the whole video, with handles
 * to shorten it. Pinned: the strip's frame count and that its frames come
 * from ONE videoStripUris call (the native module, lead ruling 2026-10-16:
 * never Skia's video object), shown as plain Images by file URI; a frame that
 * failed stays a tinted box; a request whose video or width changed, or whose
 * bar unmounted, is dropped when it lands; the caption; every window rule
 * through clampWindow directly (the worklets share its twin); the six
 * accessibility moves in 1 s steps with onChange fired and rounded to 100 ms;
 * and the short-video case.
 *
 * Gestures are not driven here: the repo's gesture-handler mock has no JS
 * gesture engine (__mocks__/react-native-gesture-handler.js), so the drag
 * rules are pinned through clampWindow, the function the worklets call.
 */
// A recording gesture-handler (this file only): every builder call is kept
// on the gesture it was made on, so the Pan's configuration can be read.
// Nothing is ever driven, as with the repo's global mock.
const mockGestures = [];
jest.mock('react-native-gesture-handler', () => {
  const mockReact = require('react');
  const make = (kind) => {
    const g = { kind, calls: [] };
    const proxy = new Proxy(g, {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        if (typeof prop === 'symbol') return undefined;
        return (...args) => { target.calls.push([prop, ...args]); return proxy; };
      },
    });
    mockGestures.push(proxy);
    return proxy;
  };
  const GestureDetector = ({ gesture, children }) => mockReact.createElement('GestureDetector', { gesture }, children);
  return {
    __esModule: true,
    GestureDetector,
    Gesture: {
      Pan: () => make('Pan'), Tap: () => make('Tap'), Pinch: () => make('Pinch'), Native: () => make('Native'),
      Race: () => make('Race'), Simultaneous: () => make('Simultaneous'), Exclusive: () => make('Exclusive'),
    },
    Directions: {},
    State: {},
  };
});
jest.mock('../../../lib/shareVideo/videoFrame', () => ({
  videoStripUris: jest.fn(async (uri, d, count) => new Array(count).fill(null).map((_x, i) => `file:///f${i}.jpg`)),
}));

const React = require('react');
const TestRenderer = require('react-test-renderer');
const { videoStripUris } = require('../../../lib/shareVideo/videoFrame');
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
const settle = () => TestRenderer.act(async () => { await Promise.resolve(); await Promise.resolve(); });
const deferred = () => {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
};
// Host nodes only: the react-native mock renders each Image as a component
// over a host element, and both carry the props.
const frameUris = (tree) => tree.root
  .findAll((n) => typeof n.type === 'string' && n.props.testID === 'video-trim-frame' && n.props.source)
  .map((n) => n.props.source.uri);
const bar = (tree) => tree.root.findAll((n) => n.props && n.props.accessibilityRole === 'adjustable')[0];
const fire = (tree, name) => TestRenderer.act(() => {
  bar(tree).props.onAccessibilityAction({ nativeEvent: { actionName: name } });
});

beforeEach(() => { videoStripUris.mockClear(); });

describe('strip and caption', () => {
  test('count is max(6, floor(width / 48)); ONE videoStripUris call; frames shown by file URI', async () => {
    expect(stripCount(340)).toBe(7);
    expect(stripCount(100)).toBe(6);
    const tree = mount({});
    await settle();
    expect(videoStripUris).toHaveBeenCalledTimes(1);
    expect(videoStripUris).toHaveBeenCalledWith('file:///v.mp4', 60000, 7);
    const uris = frameUris(tree);
    expect(uris.length).toBeGreaterThanOrEqual(7);
    expect(uris[0]).toBe('file:///f0.jpg');
    expect(uris.some((u) => /^data:/.test(u))).toBe(false);
  });

  test('a Skia prop from an older caller is accepted and ignored', async () => {
    const tree = mount({ Skia: { Video: () => { throw new Error('never called'); } } });
    await settle();
    expect(videoStripUris).toHaveBeenCalledWith('file:///v.mp4', 60000, 7);
    expect(frameUris(tree).length).toBeGreaterThanOrEqual(7);
  });

  test('a frame that failed stays a tinted box; a failed call leaves all boxes', async () => {
    videoStripUris.mockImplementationOnce(async (_u, _d, count) => new Array(count).fill(null).map((_x, i) => (i === 1 ? null : `file:///f${i}.jpg`)));
    const tree = mount({});
    await settle();
    expect(frameUris(tree)).toHaveLength(6);
    expect(tree.root.findAll((n) => n.props.testID === 'video-trim-box').length).toBeGreaterThanOrEqual(1);

    videoStripUris.mockImplementationOnce(async () => { throw new Error('E_SOURCE'); });
    const failed = mount({ uri: 'file:///other.mp4' });
    await settle();
    expect(frameUris(failed)).toHaveLength(0);
    expect(failed.root.findAll((n) => n.props.testID === 'video-trim-box').length).toBeGreaterThanOrEqual(7);
  });

  test('a request for an old video is dropped when it lands; the new one shows', async () => {
    const first = deferred();
    const second = deferred();
    videoStripUris.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    const tree = mount({});
    TestRenderer.act(() => {
      tree.update(React.createElement(VideoTrimBar, {
        uri: 'file:///new.mp4', durationMs: 60000, startMs: 2000, endMs: 14000, width: 340,
      }));
    });
    expect(videoStripUris).toHaveBeenCalledTimes(2);
    await TestRenderer.act(async () => { first.resolve(new Array(7).fill('file:///OLD.jpg')); await first.promise; });
    expect(frameUris(tree)).toHaveLength(0);
    await TestRenderer.act(async () => { second.resolve(new Array(7).fill('file:///NEW.jpg')); await second.promise; });
    expect(frameUris(tree)).toEqual(new Array(7).fill('file:///NEW.jpg'));
  });

  test('a request that lands after unmount is dropped without an error', async () => {
    const pending = deferred();
    videoStripUris.mockImplementationOnce(() => pending.promise);
    const tree = mount({});
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    TestRenderer.act(() => { tree.unmount(); });
    await TestRenderer.act(async () => { pending.resolve(new Array(7).fill('file:///LATE.jpg')); await pending.promise; });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test('no uri or no duration: tinted boxes, no request', async () => {
    const tree = mount({ uri: null });
    mount({ durationMs: 0, startMs: 0, endMs: 0 });
    await settle();
    expect(videoStripUris).not.toHaveBeenCalled();
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

// Audit 2026-10-16, item 5: a vertical page scroll that starts on the bar
// must scroll the page. Each of the three Pans (the window, the start and
// the end handles) activates only past 8 dp sideways and fails past 12 dp
// up or down. Written to FAIL against the bar before (no offsets were set).
describe('the bar never captures a vertical scroll (audit item 5)', () => {
  test('every Pan: activeOffsetX([-8, 8]) and failOffsetY([-12, 12])', async () => {
    mockGestures.length = 0;
    const tree = mount({});
    await settle();
    const detectors = tree.root.findAll((n) => n.type === 'GestureDetector');
    expect(detectors).toHaveLength(3);
    for (const d of detectors) {
      const g = d.props.gesture;
      expect(g.kind).toBe('Pan');
      expect(g.calls).toContainEqual(['activeOffsetX', [-8, 8]]);
      expect(g.calls).toContainEqual(['failOffsetY', [-12, 12]]);
    }
  });

  test('still enabled only when not disabled and not short', async () => {
    mockGestures.length = 0;
    const tree = mount({ disabled: true });
    await settle();
    const detectors = tree.root.findAll((n) => n.type === 'GestureDetector');
    for (const d of detectors) expect(d.props.gesture.calls).toContainEqual(['enabled', false]);
  });
});
