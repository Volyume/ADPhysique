/**
 * useFramingGestures (D229): the one placement hook the photo and clip
 * framers share. Pins: the cover size and the smallest zoom follow the
 * media unless the caller fixes the smallest zoom (a clip passes 1); the
 * accessible nudges clamp and hand up the renderer's framing; the action
 * list names the media.
 */
import { act, create } from 'react-test-renderer';

jest.mock('../../../lib/haptics', () => ({ selection: jest.fn() }));

const useFramingGestures = require('../useFramingGestures').default;
const { framingActions } = require('../useFramingGestures');

let last = null;
function Probe(props) {
  last = useFramingGestures(props);
  return null;
}

describe('useFramingGestures', () => {
  test('a landscape photo on a story frame: cover size and the contain-fit minimum zoom', () => {
    let tree;
    act(() => {
      tree = create(<Probe mediaWidth={1920} mediaHeight={1080} frameWidth={300} frameHeight={533} crop={{ zoom: 1, cx: 0.5, cy: 0.5 }} onChange={() => {}} />);
    });
    expect(last.cover.h).toBe(533);
    expect(last.cover.w).toBeCloseTo(947.6, 0);
    expect(last.minZoom).toBeLessThan(1);
    expect(last.maxZoom).toBe(4);
    act(() => tree.unmount());
  });
  test('a clip fixes the smallest zoom at 1, so it always fills the card', () => {
    let tree;
    act(() => {
      tree = create(<Probe mediaWidth={1920} mediaHeight={1080} frameWidth={300} frameHeight={533} crop={{ zoom: 1, cx: 0.5, cy: 0.5 }} onChange={() => {}} minZoom={1} />);
    });
    expect(last.minZoom).toBe(1);
    act(() => { last.nudge('decrement'); });
    act(() => tree.unmount());
  });
  test('an accessible nudge hands up the renderer framing, zoom clamped to the range', () => {
    const onChange = jest.fn();
    let tree;
    act(() => {
      tree = create(<Probe mediaWidth={1080} mediaHeight={1920} frameWidth={300} frameHeight={533} crop={{ zoom: 1, cx: 0.5, cy: 0.5 }} onChange={onChange} minZoom={1} />);
    });
    act(() => { last.nudge('increment'); });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].zoom).toBeCloseTo(1.25, 5);
    act(() => { last.nudge('decrement'); });
    act(() => { last.nudge('decrement'); });
    expect(onChange.mock.calls[2][0].zoom).toBe(1);
    act(() => { last.nudge('nothing'); });
    expect(onChange).toHaveBeenCalledTimes(3);
    act(() => tree.unmount());
  });
  test('the action list names the media', () => {
    expect(framingActions('video').map((a) => a.label)).toEqual(['Zoom in', 'Zoom out', 'Move video up', 'Move video down', 'Move video left', 'Move video right']);
  });
});
