/**
 * PostRow (D221 build spec 2.4; visual law V4). Pins:
 *   - the render per kind (session, pr, block, milestone, note): achievement
 *     line, stats line, the PR mark only on a record, the note;
 *   - `postTimeLabel` at its boundaries (Today, Yesterday, weekday within 7
 *     days, "12 Oct" beyond, no clock time, local calendar days);
 *   - optimistic Respect: the heart and count move on the tap and revert, with
 *     the calm toast, when the call fails; the restricted and rate-limit lines;
 *   - a source guard: the stats line never reads body weight, measurement or
 *     calorie keys;
 *   - 48 dp targets on the reaction bar.
 */

import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
const mockToast = { show: jest.fn() };
jest.mock('../../Toast', () => ({ useToast: () => mockToast }));
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));

import PostRow, { postRowLines } from '../PostRow';
import { postTimeLabel } from '../../../lib/community/postTime';
import { respectFailureLine } from '../../../lib/community/restriction';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}
const norm = (s) => s.replace(/\s+/g, ' ').trim();

function item(over = {}, postOver = {}) {
  return {
    post: {
      id: 'p1', kind: 'session', payload: {}, caption: null, created_at: Date.now(), reaction_count: 3, comment_count: 2, ...postOver,
    },
    author: { user_id: 'u2', handle: 'sam', display_name: 'Sam', avatar_preset: null },
    myReaction: false,
    ...over,
  };
}

function render(props) {
  let tree;
  act(() => { tree = create(<PostRow {...props} />); });
  return tree;
}

const SESSION = {
  sessionName: 'Upper A', duration: 52, workingSets: 18, tonnage: 4200, prCount: 0, units: 'kg',
};

describe('render per kind', () => {
  test('session: name, minutes, sets, lift volume; no PR mark without a record', () => {
    const text = norm(flattenText(render({ item: item({}, { kind: 'session', payload: SESSION }) }).toJSON()));
    expect(text).toContain('Sam');
    expect(text).toContain('Upper A');
    expect(text).toContain('52 min');
    expect(text).toContain('18 sets');
    expect(text).toMatch(/4,200\s*kg/);
    expect(text).not.toMatch(/\bPR\b/);
    expect(text).toContain('Today');
  });

  test('session with a PR count gets the PR mark and the count in the stats', () => {
    const text = norm(flattenText(render({ item: item({}, { kind: 'session', payload: { ...SESSION, prCount: 2 } }) }).toJSON()));
    expect(text).toContain('2 PRs');
    expect(text).toMatch(/\bPR\b/);
  });

  test('pr: the lift line, the previous best, and the PR mark', () => {
    const lines = postRowLines({
      kind: 'pr', payload: { exerciseName: 'Squat', weight: 140, reps: 5, units: 'kg', previousBest: 135 }, caption: null,
    });
    expect(lines.achievement).toBe('Squat 140 kg x 5');
    expect(lines.stats).toBe('was 135 kg');
    expect(lines.record).toBe(true);
  });

  test('block: the plan name with weeks and sessions', () => {
    const lines = postRowLines({ kind: 'block', payload: { planName: 'Build 2', weeks: 6, sessions: 18 } });
    expect(lines).toMatchObject({ achievement: 'Build 2', stats: '6 weeks \u00B7 18 sessions', record: false });
  });

  test('milestone: the title, with its caption as the stats line', () => {
    const lines = postRowLines({ kind: 'milestone', payload: { title: '100 sessions', caption: 'Since March' } });
    expect(lines).toMatchObject({ achievement: '100 sessions', stats: 'Since March' });
  });

  test('note: the first line leads, the rest is the note; no stats', () => {
    const lines = postRowLines({ kind: 'note', payload: {}, caption: 'Knee felt fine today\nBox squats at last.' });
    expect(lines).toMatchObject({ achievement: 'Knee felt fine today', stats: '', noteRest: 'Box squats at last.' });
    const text = norm(flattenText(render({ item: item({}, { kind: 'note', caption: 'Hello there' }) }).toJSON()));
    expect(text).toContain('Hello there');
  });

  test('a long note shows "more"; a short one does not', () => {
    const long = 'word '.repeat(60);
    expect(norm(flattenText(render({ item: item({}, { kind: 'session', payload: SESSION, caption: long }) }).toJSON()))).toContain('more');
    expect(norm(flattenText(render({ item: item({}, { kind: 'session', payload: SESSION, caption: 'Short.' }) }).toJSON()))).not.toContain('more');
  });
});

describe('postTimeLabel boundaries', () => {
  const NOW = new Date(2026, 9, 8, 12, 0, 0).getTime(); // Thu 8 Oct 2026, noon
  const day = (n, hour = 9) => new Date(2026, 9, 8 - n, hour, 0, 0).getTime();

  test('today, including late last night is yesterday', () => {
    expect(postTimeLabel(day(0, 0), NOW)).toBe('Today');
    expect(postTimeLabel(NOW, NOW)).toBe('Today');
    expect(postTimeLabel(day(1, 23), NOW)).toBe('Yesterday');
    expect(postTimeLabel(day(1, 0), NOW)).toBe('Yesterday');
  });

  test('2 to 6 days back is the weekday; 7 days back is the date', () => {
    expect(postTimeLabel(day(2), NOW)).toBe('Tue');
    expect(postTimeLabel(day(6), NOW)).toBe('Fri');
    expect(postTimeLabel(day(7), NOW)).toBe('1 Oct');
    expect(postTimeLabel(new Date(2026, 8, 12, 9).getTime(), NOW)).toBe('12 Sep');
  });

  test('never a clock time; an unreadable value is empty; ISO strings work', () => {
    for (const ms of [day(0), day(1), day(3), day(20)]) expect(postTimeLabel(ms, NOW)).not.toMatch(/\d:\d/);
    expect(postTimeLabel('nonsense', NOW)).toBe('');
    expect(postTimeLabel(new Date(day(0)).toISOString(), NOW)).toBe('Today');
  });
});

describe('optimistic Respect', () => {
  beforeEach(() => { mockToast.show.mockClear(); });

  function heart(tree) {
    return tree.root.findAll(
      (n) => /Respect/.test(n.props?.accessibilityLabel ?? '') && typeof n.props.onPress === 'function',
    )[0];
  }

  test('the count moves on the tap and the call is made with the next state', async () => {
    const onRespect = jest.fn(() => Promise.resolve());
    const onRespected = jest.fn();
    const tree = render({ item: item({}, { payload: SESSION }), onRespect, onRespected });
    await act(async () => { await heart(tree).props.onPress(); });
    expect(onRespect).toHaveBeenCalledWith(true);
    expect(onRespected).toHaveBeenCalledWith(true);
    expect(heart(tree).props.accessibilityState.selected).toBe(true);
    expect(norm(flattenText(tree.toJSON()))).toContain('4');
  });

  test('a failed call reverts the heart and count and shows the calm toast', async () => {
    const onRespect = jest.fn(() => Promise.reject(Object.assign(new Error('x'), { code: 'offline' })));
    const tree = render({ item: item({}, { payload: SESSION }), onRespect });
    await act(async () => { await heart(tree).props.onPress(); });
    expect(heart(tree).props.accessibilityState.selected).toBe(false);
    expect(mockToast.show).toHaveBeenCalledWith('Could not send that. Try again in a moment.', { variant: 'error' });
  });

  test('the toast lines: rate limit, restricted, everything else', () => {
    expect(respectFailureLine('rate_limited')).toBe('You have given a lot of Respect today. It will be back tomorrow.');
    expect(respectFailureLine('profile_restricted')).toBe(respectFailureLine('profile_suspended'));
    expect(respectFailureLine('profile_restricted')).not.toMatch(/try again/i);
    expect(respectFailureLine('offline')).toBe('Could not send that. Try again in a moment.');
  });

  test('a reader without a profile is routed by onRespectBlocked, never the call', async () => {
    const onRespect = jest.fn();
    const onRespectBlocked = jest.fn();
    const tree = render({ item: item({}, { payload: SESSION }), onRespect, onRespectBlocked });
    await act(async () => { await heart(tree).props.onPress(); });
    expect(onRespectBlocked).toHaveBeenCalled();
    expect(onRespect).not.toHaveBeenCalled();
  });
});

describe('targets and source guards', () => {
  const raw = fs.readFileSync(path.resolve(__dirname, '../PostRow.js'), 'utf8');
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  test('the reaction bar targets are 48 dp', () => {
    expect(code).toMatch(/reaction: \{[^}]*minHeight: touchTarget\.minimum[^}]*minWidth: touchTarget\.minimum/);
  });

  test('the stats line never reads body weight, weight_kg, measurements, calories or kcal', () => {
    expect(code).not.toMatch(/bodyweight|body_weight|bodyWeight|weight_kg|weightKg|measurement|calorie|kcal/i);
    expect(code).not.toMatch(/private|notes?_private/i);
  });

  test('payload fields are read by name, never spread', () => {
    expect(code).not.toMatch(/\.\.\.\s*(p|post\.payload|payload)\b/);
  });

  test('only the allow-listed payload keys are read', () => {
    const { POST_PAYLOAD_KEYS } = require('../../../lib/community/validation');
    const allowed = new Set(Object.values(POST_PAYLOAD_KEYS).flat());
    const read = [...code.matchAll(/\bp\.([A-Za-z]+)/g)].map((m) => m[1]);
    for (const key of read) expect({ key, ok: allowed.has(key) }).toEqual({ key, ok: true });
  });
});
