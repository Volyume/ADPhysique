/**
 * ClipFramer (D229): the decoder's unrotated frames are turned upright on
 * the canvas; the preview draws only once the clip is open; a clip's
 * smallest zoom is fill; the paused state shows a play glyph; the control
 * is accessible as an adjustable with a pause action.
 */
import { act, create } from 'react-test-renderer';

jest.mock('@shopify/react-native-skia', () => {
  const R = require('react');
  const pass = (name) => { const C = ({ children, ...p }) => R.createElement(name, p, children); C.displayName = name; return C; };
  return { Canvas: pass('Canvas'), Image: pass('SkiaImage'), ColorMatrix: pass('ColorMatrix'), Group: pass('Group'), Skia: {} };
});
jest.mock('@expo/vector-icons', () => {
  const R = require('react');
  return { Ionicons: (p) => R.createElement('Ionicons', p) };
});
jest.mock('../../../lib/haptics', () => ({ selection: jest.fn() }));

const { uprightDraw } = require('../ClipFramer');
const ClipFramer = require('../ClipFramer').default;

describe('uprightDraw', () => {
  test('swaps the draw size and rotates for 90 and 270, flips for 180, and leaves 0 alone', () => {
    expect(uprightDraw(0, 300, 533)).toEqual({ transform: [], drawWidth: 300, drawHeight: 533 });
    const r90 = uprightDraw(90, 300, 533);
    expect(r90.drawWidth).toBe(533); expect(r90.drawHeight).toBe(300);
    expect(r90.transform[0]).toEqual({ translateX: 300 });
    const r270 = uprightDraw(270, 300, 533);
    expect(r270.drawWidth).toBe(533); expect(r270.transform[0]).toEqual({ translateY: 533 });
    const r180 = uprightDraw(180, 300, 533);
    expect(r180.drawWidth).toBe(300); expect(r180.transform).toHaveLength(3);
  });
});

function mount(props) {
  let tree;
  act(() => {
    tree = create(
      <ClipFramer
        clip={props.clip}
        mediaWidth={1080}
        mediaHeight={1920}
        frameWidth={300}
        frameHeight={533}
        crop={{ zoom: 1, cx: 0.5, cy: 0.5 }}
        lookKey={'lookKey' in props ? props.lookKey : 'iron'}
        lookStrength={0.8}
        overlayUri="file:///overlay.png"
        paused={!!props.paused}
        onTogglePause={props.onTogglePause}
        onChange={() => {}}
      />,
    );
  });
  return tree;
}

describe('<ClipFramer>', () => {
  test('draws nothing until the clip is open, then the frame in the look', () => {
    const notReady = mount({ clip: { ready: false, meta: null, currentFrame: { value: null } } });
    expect(notReady.root.findAll((n) => n.type === 'Canvas')).toHaveLength(0);
    const ready = mount({ clip: { ready: true, meta: { rotation: 0 }, currentFrame: { value: {} } } });
    expect(ready.root.findAll((n) => n.type === 'Canvas')).toHaveLength(1);
    expect(ready.root.findAll((n) => n.type === 'ColorMatrix')).toHaveLength(1);
    const noLook = mount({ clip: { ready: true, meta: { rotation: 0 }, currentFrame: { value: {} } }, lookKey: null });
    expect(noLook.root.findAll((n) => n.type === 'ColorMatrix')).toHaveLength(0);
  });
  test('is an adjustable control with a pause action, and shows the play glyph while paused', () => {
    const onTogglePause = jest.fn();
    const tree = mount({ clip: { ready: true, meta: { rotation: 0 }, currentFrame: { value: {} } }, paused: true, onTogglePause });
    const frame = tree.root.findAll((n) => n.props.accessibilityRole === 'adjustable')[0];
    expect(frame.props.accessibilityLabel).toBe('Your clip on the share image');
    expect(frame.props.accessibilityActions.map((a) => a.name)).toEqual(
      expect.arrayContaining(['increment', 'decrement', 'moveUp', 'moveDown', 'moveLeft', 'moveRight', 'activate']),
    );
    act(() => { frame.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } }); });
    expect(onTogglePause).toHaveBeenCalledTimes(1);
    expect(tree.root.findAll((n) => n.type === 'Ionicons' && n.props.name === 'play')).toHaveLength(1);
  });
  test('source: a clip always fills the card (minimum zoom 1), and the frames are shared, not owned', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'ClipFramer.js'), 'utf8');
    expect(src).toMatch(/minZoom: 1,/);
    expect(src).not.toMatch(/useClipFrames\(/);
  });
});
