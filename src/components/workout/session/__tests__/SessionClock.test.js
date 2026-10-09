/**
 * SessionClock (12-BUILD-SPEC section 1.6, register D220). Pins: the format,
 * the value derived from startTime, the spoken label, that no interval runs
 * under Jest, and, with the Jest switch turned off, that the one-second tick
 * re-renders the value and that unmount clears the interval and the app-state
 * subscription. Plus the token-only source guard.
 */
import fs from 'fs';
import path from 'path';
import { AppState } from 'react-native';
import { create, act } from 'react-test-renderer';
import { colors, type } from '../../../../styles/theme';
import SessionClock, { formatClock } from '../SessionClock';

const START = 1700000000000;
const MIN = 60 * 1000;
const SEC = 1000;

function render(element) {
  let tree;
  act(() => { tree = create(element); });
  return tree;
}
function textOf(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.children);
}
// The clock is ONE Text: the timer node is the Text itself, so its children
// are the numerals.
function pill(tree) {
  return tree.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'timer')[0];
}
const texts = (tree) => tree.root.findAll((n) => n.type === 'Text');
const numerals = (tree) => textOf(pill(tree));
const flat = (style) => Object.assign({}, ...[].concat(style).filter(Boolean));

afterEach(() => {
  jest.restoreAllMocks();
});

describe('formatClock', () => {
  test('minutes and padded seconds', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(9 * SEC)).toBe('0:09');
    expect(formatClock(12 * MIN + 6 * SEC)).toBe('12:06');
  });
  test('minutes are not wrapped at an hour', () => {
    expect(formatClock(75 * MIN + 4 * SEC)).toBe('75:04');
  });
  test('missing, negative and non-finite values read 0:00', () => {
    expect(formatClock(undefined)).toBe('0:00');
    expect(formatClock(NaN)).toBe('0:00');
    expect(formatClock(-5 * SEC)).toBe('0:00');
  });
});

describe('SessionClock render', () => {
  test('shows the time since startTime and speaks it as words', () => {
    jest.spyOn(Date, 'now').mockReturnValue(START + 12 * MIN + 6 * SEC);
    const tree = render(<SessionClock startTime={START} />);
    expect(numerals(tree)).toBe('12:06');
    const node = pill(tree);
    expect(node.props.accessibilityRole).toBe('timer');
    expect(node.props.accessibilityLabel).toBe('Elapsed 12 minutes 6 seconds');
  });

  test('speaks singular units', () => {
    jest.spyOn(Date, 'now').mockReturnValue(START + MIN + SEC);
    const tree = render(<SessionClock startTime={START} />);
    expect(pill(tree).props.accessibilityLabel).toBe('Elapsed 1 minute 1 second');
  });

  test('is not a live region (a screen reader must not speak every second)', () => {
    const tree = render(<SessionClock startTime={START} />);
    expect(pill(tree).props.accessibilityLiveRegion).toBeUndefined();
  });

  test('no startTime reads 0:00', () => {
    const tree = render(<SessionClock />);
    expect(numerals(tree)).toBe('0:00');
  });

  test('one Text only: no Elapsed caption, muted ink at the tabular bodySm numerals (the subtitle role), no fill, no edge, no minHeight', () => {
    jest.spyOn(Date, 'now').mockReturnValue(START + 12 * MIN + 6 * SEC);
    const tree = render(<SessionClock startTime={START} />);
    expect(texts(tree)).toHaveLength(1);
    expect(tree.root.findAll((n) => n.type === 'View')).toHaveLength(0);
    expect(textOf(tree.toJSON())).not.toContain('Elapsed');
    const node = pill(tree);
    expect(node.props.numberOfLines).toBe(1);
    const v = flat(node.props.style);
    expect(v.color).toBe(colors.textMuted);
    expect(v.fontSize).toBe(type.bodySm.fontSize);
    expect(v.fontFamily).toBe(type.num('bodySm').fontFamily);
    expect(v.fontVariant).toEqual(['tabular-nums']);
    expect(v.backgroundColor).toBeUndefined();
    expect(v.borderColor).toBeUndefined();
    expect(v.borderWidth).toBeUndefined();
    expect(v.minHeight).toBeUndefined();
  });
});

describe('SessionClock interval', () => {
  test('no interval is started under Jest', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    render(<SessionClock startTime={START} />);
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  describe('with the Jest switch off', () => {
    let saved;
    beforeEach(() => {
      saved = process.env.JEST_WORKER_ID;
      delete process.env.JEST_WORKER_ID;
    });
    afterEach(() => {
      process.env.JEST_WORKER_ID = saved;
    });

    test('ticks every second from startTime and re-reads the clock', () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(START + 5 * SEC);
      const setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation(() => 777);
      jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
      const tree = render(<SessionClock startTime={START} />);
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(setIntervalSpy.mock.calls[0][1]).toBe(1000);
      expect(numerals(tree)).toBe('0:05');
      nowSpy.mockReturnValue(START + 6 * SEC);
      act(() => { setIntervalSpy.mock.calls[0][0](); });
      expect(numerals(tree)).toBe('0:06');
    });

    test('unmount clears the interval and the app-state subscription', () => {
      const remove = jest.fn();
      AppState.addEventListener.mockReturnValueOnce({ remove });
      jest.spyOn(global, 'setInterval').mockImplementation(() => 777);
      const clearSpy = jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
      const tree = render(<SessionClock startTime={START} />);
      expect(clearSpy).not.toHaveBeenCalledWith(777);
      act(() => { tree.unmount(); });
      expect(clearSpy).toHaveBeenCalledWith(777);
      expect(remove).toHaveBeenCalledTimes(1);
    });

    test('returning to the foreground re-syncs at once', () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(START + 5 * SEC);
      jest.spyOn(global, 'setInterval').mockImplementation(() => 777);
      jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
      let handler;
      AppState.addEventListener.mockImplementationOnce((event, fn) => {
        handler = fn;
        return { remove: () => {} };
      });
      const tree = render(<SessionClock startTime={START} />);
      nowSpy.mockReturnValue(START + 65 * SEC);
      act(() => { handler('background'); });
      expect(numerals(tree)).toBe('0:05');
      act(() => { handler('active'); });
      expect(numerals(tree)).toBe('1:05');
    });

    test('no interval without a startTime', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation(() => 777);
      render(<SessionClock />);
      expect(setIntervalSpy).not.toHaveBeenCalled();
    });
  });
});

describe('SessionClock source guard (tokens only)', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'SessionClock.js'), 'utf8');
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
});
