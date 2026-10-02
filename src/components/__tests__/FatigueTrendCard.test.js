/**
 * FatigueTrendCard.test.js -- the fatigue-trend bars, moved from Consistency
 * to the Recovery screen under the ratings (D214 Q3 = A, lane 2, plan
 * section 7.2 item 4, CS-3 and CS-10).
 *
 * Pins what the move changed: the bars are ONE ink (`textSecondary`), not a
 * status colour per level (plan 7.0 rule 3, "facts are ink"); the scale
 * caption is a plain caption with no "Got it" button (the dismiss had no
 * handler, so it was a dead control); the card still hides itself under two
 * rated sessions; the read of the last two sessions still describes (D204: the
 * wording guard is in d204.consistencyDescribes.guard.test.js).
 *
 * RE-ANCHORED D214 addendum 9 (V5, rule 7): the read used to print ONE word for
 * the AVERAGE of the last two ratings, so Fresh plus Mild read "fresh" and High
 * plus Exhausted read "very tiring", words neither session was rated. It now
 * prints BOTH ratings in the scale's own words (lib/recovery/ratingWords.js,
 * the list the ratings card shares), lowest first, one word when they match.
 */
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';
import fs from 'fs';
import path from 'path';

jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));
// react-native-svg is native-only; the chart is stubbed so its props can be read.
jest.mock('../SvgBarSparkline', () => {
  const mockChart = jest.fn(() => null);
  return { __esModule: true, default: mockChart };
});

import FatigueTrendCard from '../FatigueTrendCard';
import { lastTwoSessionsLine as coachingLine } from '../../lib/recovery/ratingWords';
import SvgBarSparkline from '../SvgBarSparkline';
import { resolveTheme } from '../../styles/theme';

const THEME = resolveTheme({
  theme: undefined, largerText: undefined, higherContrast: undefined, colorBlindSafe: undefined,
});
const texts = (tree) => tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));
const NOW = new Date(2026, 8, 30, 12, 0, 0).getTime();
const DAY = 86400000;
const sessions = (levels) => levels.map((fatigueLevel, i) => ({ fatigueLevel, startedAt: NOW - i * DAY }));

beforeEach(() => { jest.clearAllMocks(); });

describe('FatigueTrendCard', () => {
  test('hides itself until two sessions carry a rating', () => {
    let tree;
    act(() => { tree = create(<FatigueTrendCard sessions={sessions([3])} />); });
    expect(tree.toJSON()).toBeNull();
    act(() => { tree = create(<FatigueTrendCard sessions={[]} />); });
    expect(tree.toJSON()).toBeNull();
    act(() => { tree = create(<FatigueTrendCard sessions={null} />); });
    expect(tree.toJSON()).toBeNull();
  });

  test('draws the title, the scale caption as plain text and the read of the last two sessions', () => {
    let tree;
    act(() => { tree = create(<FatigueTrendCard sessions={sessions([2, 4, 5])} />); });
    const all = texts(tree);
    expect(all).toContain('Fatigue trend');
    expect(all).toContain('Self-rated fatigue after each session, 1 (fresh) to 5 (exhausted).');
    // sessions([2, 4, 5]) is newest-first: the last two are mild (2) and high (4).
    expect(all).toContain('You rated your last two sessions mild and high.');
    expect(all.join(' ')).not.toMatch(/tiring|moderately/);
  });

  test('both ratings in the scale\'s own words, lowest first, in whichever order the sessions came', () => {
    const line = (levels) => coachingLine(sessions(levels));
    expect(line([1, 2])).toBe('You rated your last two sessions fresh and mild.');
    expect(line([2, 1])).toBe('You rated your last two sessions fresh and mild.');
    expect(line([4, 5])).toBe('You rated your last two sessions high and exhausted.');
    expect(line([5, 3])).toBe('You rated your last two sessions moderate and exhausted.');
    // One word when the two ratings are the same.
    expect(line([1, 1])).toBe('You rated your last two sessions fresh.');
    expect(line([3, 3])).toBe('You rated your last two sessions moderate.');
    expect(line([5, 5])).toBe('You rated your last two sessions exhausted.');
  });

  test('no average: Fresh plus Mild is never "fresh", and High plus Exhausted is never "very tiring"', () => {
    expect(coachingLine(sessions([1, 2]))).not.toBe('You rated your last two sessions fresh.');
    expect(coachingLine(sessions([4, 5]))).not.toMatch(/very tiring/);
    expect(coachingLine(sessions([4, 5]))).not.toBe('You rated your last two sessions exhausted.');
  });

  test('only the last two sessions are read, and fewer than two read nothing', () => {
    expect(coachingLine(sessions([2, 2, 5, 5]))).toBe('You rated your last two sessions mild.');
    expect(coachingLine(sessions([3]))).toBe('');
    expect(coachingLine([])).toBe('');
    expect(coachingLine(null)).toBe('');
  });

  test('snake_case rows read the same, and an unreadable level reads as the first word', () => {
    expect(coachingLine([{ fatigue_level: 2 }, { fatigue_level: 4 }])).toBe('You rated your last two sessions mild and high.');
    expect(coachingLine([{ fatigueLevel: null }, { fatigueLevel: 2 }])).toBe('You rated your last two sessions fresh and mild.');
  });

  test('no "Got it" button and no dead control: the caption has nothing to dismiss (CS-10)', () => {
    let tree;
    act(() => { tree = create(<FatigueTrendCard sessions={sessions([2, 4, 5])} />); });
    expect(texts(tree).some((t) => /Got it/i.test(t))).toBe(false);
    expect(tree.root.findAll((n) => n.props?.accessibilityRole === 'button')).toHaveLength(0);
    const src = fs.readFileSync(path.join(__dirname, '..', 'FatigueTrendCard.js'), 'utf8');
    expect(src).not.toMatch(/HintCaption|onDismiss/);
  });

  test('the bars are ONE ink, textSecondary, whatever the level (facts are ink)', () => {
    act(() => { create(<FatigueTrendCard sessions={sessions([1, 2, 3, 4, 5])} />); });
    const props = SvgBarSparkline.mock.calls[0][0];
    expect(props.maxValue).toBe(5);
    expect(props.data).toHaveLength(5);
    // Oldest on the left: the sessions arrive newest-first.
    expect(props.data.map((d) => d.value)).toEqual([5, 4, 3, 2, 1]);
    for (const bar of props.data) expect(bar.color).toBe(THEME.colors.textSecondary);
    expect(new Set(props.data.map((d) => d.color)).size).toBe(1);
  });

  test('the chart stays one labelled image that gives each level out of 5', () => {
    act(() => { create(<FatigueTrendCard sessions={sessions([2, 4])} />); });
    const { accessibilityLabel } = SvgBarSparkline.mock.calls[0][0];
    expect(accessibilityLabel).toMatch(/^Fatigue trend, oldest to newest: /);
    expect(accessibilityLabel).toContain('level 4 of 5');
    expect(accessibilityLabel).toContain('level 2 of 5');
  });

  test('source guard: no status colour and no amber in the card (D214 plan 7.0 rule 3)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'FatigueTrendCard.js'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/colors\.(primary|primaryBg|primaryFill|warning|success|error)\b/);
    expect(code).not.toMatch(/buildFatigueBarColor/);
  });
});
