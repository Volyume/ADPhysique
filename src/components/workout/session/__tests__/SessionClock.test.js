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
function pill(tree) {
  return tree.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'timer')[0];
}
const texts = (tree) => tree.root.findAll((n) => n.type === 'Text');
// The numerals sit under the "Elapsed" overline label; the value is the last Text.
const numerals = (tree) => textOf(texts(tree)[texts(tree).length - 1]);
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
    expect(node.props.accessible).toBe(true);
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

  test('no pill: a block with no fill and no edge, the Elapsed overline label above the numerals', () => {
    jest.spyOn(Date, 'now').mockReturnValue(START + 12 * MIN + 6 * SEC);
    const tree = render(<SessionClock startTime={START} />);
    const merged = flat(pill(tree).props.style);
    expect(merged.backgroundColor).toBeUndefined();
    expect(merged.borderColor).toBeUndefined();
    expect(merged.borderWidth).toBeUndefined();
    const [label, value] = texts(tree);
    expect(texts(tree)).toHaveLength(2);
    expect(textOf(label)).toBe('Elapsed');
    const l = flat(label.props.style);
    expect(l.color).toBe(colors.textMuted);
    expect(l.fontSize).toBe(type.overline.fontSize);
    expect(l.fontFamily).toBe(type.overline.fontFamily);
    expect(l.textTransform).toBe('uppercase');
    const v = flat(value.props.style);
    expect(v.color).toBe(colors.textPrimary);
    expect(v.fontSize).toBe(type.title.fontSize);
    expect(v.fontFamily).toBe(type.num('title').fontFamily);
    expect(v.fontVariant).toEqual(['tabular-nums']);
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
