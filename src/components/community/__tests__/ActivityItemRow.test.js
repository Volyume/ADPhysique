/**
 * ActivityItemRow (communities revamp 2026-09-10:
 * `docs/communities-revamp-2026-09-10/21-PHASE1-SPEC.md` section 1).
 *
 * What this suite pins: every story kind in
 * `src/lib/community/validation.js`'s `POST_PAYLOAD_KEYS` (pr, session,
 * block, milestone) renders its two lines from the payload fields
 * `PostCard.js` reads, matching section 1's own worked examples; the
 * note text (`post.caption`) shows when present and nowhere otherwise;
 * the amber "PR" mark appears only on a pr-kind row, never inside a
 * session row's own "2 PRs" figure; `onRespect`, `onOpenPerson` and
 * `onPress` each fire from their own control; the ring dot tracks
 * whether the post happened today.
 */

import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));

import ActivityItemRow, { activityItemLines } from '../ActivityItemRow';
import { resolveTheme, hitSlop } from '../../../styles/theme';

const THEME = resolveTheme({
  theme: undefined, largerText: undefined, higherContrast: undefined, colorBlindSafe: undefined,
});

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

/** Collapses the join-spaces `flattenText` inserts between sibling text
 * nodes (name/headline render as adjacent nested `Text`s, not one string)
 * down to single spaces, so an assertion can match the visible phrase
 * without caring how many host-tree levels produced it. */
function norm(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function render(props) {
  let tree;
  act(() => { tree = create(<ActivityItemRow {...props} />); });
  return tree;
}

const AUTHOR = {
  user_id: 'u2', display_name: 'Sam Rees', handle: 'sam_rees', avatar_preset: null,
};

function item(kind, payload, postOver = {}) {
  return {
    post: {
      id: 'p1', kind, payload, caption: null, created_at: Date.now(), comment_count: 0, ...postOver,
    },
    author: AUTHOR,
    myReaction: false,
  };
}

describe('activityItemLines: every kind reads the allow-listed payload fields', () => {
  test('pr: "new best" then the lift, with the previous best', () => {
    const lines = activityItemLines({
      kind: 'pr',
      payload: {
        exerciseName: 'Bench press', weight: 100, reps: 5, units: 'kg', previousBest: 97.5,
      },
    });
    expect(lines.headline).toBe('new best');
    expect(lines.figures).toBe('Bench press 100 kg × 5 · was 97.5 kg');
  });

  test('session: the session name, then duration, sets, PRs and the weekday', () => {
    const lines = activityItemLines({
      kind: 'session',
      created_at: Date.now(),
      payload: {
        sessionName: 'Upper A', workingSets: 18, duration: 52, prCount: 2, date: '2026-09-08T09:00:00.000Z',
      },
    });
    expect(lines.headline).toBe('Upper A');
    expect(lines.figures).toBe('52 min · 18 sets · 2 PRs · Tue');
  });

  test('block: the plan name, then weeks and sessions', () => {
    const lines = activityItemLines({
      kind: 'block',
      payload: { planName: 'Upper/Lower', weeks: 6, sessions: 18 },
    });
    expect(lines.headline).toBe('Upper/Lower');
    expect(lines.figures).toBe('6 weeks · 18 sessions');
  });

  test('milestone: the title, then its own caption', () => {
    const lines = activityItemLines({
      kind: 'milestone',
      payload: { title: 'Year of Lifts', caption: '312 sessions logged' },
    });
    expect(lines.headline).toBe('Year of Lifts');
    expect(lines.figures).toBe('312 sessions logged');
  });
});

describe('ActivityItemRow rendering', () => {
  test('returns null with no post, no crash', () => {
    expect(() => render({ item: {} })).not.toThrow();
    expect(render({ item: {} }).toJSON()).toBeNull();
  });

  test.each([
    ['pr', {
      exerciseName: 'Bench press', weight: 100, reps: 5, units: 'kg', previousBest: 97.5,
    }, 'new best', 'Bench press 100 kg × 5 · was 97.5 kg'],
    ['block', { planName: 'Upper/Lower', weeks: 6, sessions: 18 }, 'Upper/Lower', '6 weeks · 18 sessions'],
    ['milestone', { title: 'Year of Lifts', caption: '312 sessions logged' }, 'Year of Lifts', '312 sessions logged'],
  ])('%s: renders both lines from the fixture payload', (kind, payload, headline, figures) => {
    const tree = render({ item: item(kind, payload) });
    const text = norm(flattenText(tree.toJSON()));
    expect(text).toContain(norm(`Sam Rees · ${headline}`));
    expect(text).toContain(norm(figures));
  });

  test('session: renders both lines from the fixture payload', () => {
    const tree = render({
      item: item('session', {
        sessionName: 'Upper A', workingSets: 18, duration: 52, prCount: 2, date: '2026-09-08T09:00:00.000Z',
      }),
    });
    const text = norm(flattenText(tree.toJSON()));
    expect(text).toContain('Sam Rees · Upper A');
    expect(text).toContain('52 min · 18 sets · 2 PRs · Tue');
  });

  test('renders the note text when the post carries one', () => {
    const tree = render({
      item: item('block', { planName: 'Upper/Lower', weeks: 6, sessions: 18 }, { caption: 'Tough one but done.' }),
    });
    expect(norm(flattenText(tree.toJSON()))).toContain('Tough one but done.');
  });

  test('renders no note line when the post carries none', () => {
    const tree = render({
      item: item('block', { planName: 'Upper/Lower', weeks: 6, sessions: 18 }, { caption: null }),
    });
    expect(norm(flattenText(tree.toJSON()))).not.toContain('Tough one');
  });

  test('the amber PR mark shows only on a pr-kind row, never on a session row\'s own "2 PRs"', () => {
    const hasPrMark = (tree) => tree.root.findAll((n) => n.props?.children === 'PR ').length > 0;

    const prRow = render({
      item: item('pr', {
        exerciseName: 'Bench press', weight: 100, reps: 5, units: 'kg',
      }),
    });
    expect(hasPrMark(prRow)).toBe(true);

    const sessionRow = render({
      item: item('session', {
        sessionName: 'Upper A', workingSets: 18, duration: 52, prCount: 2, date: '2026-09-08T09:00:00.000Z',
      }),
    });
    expect(hasPrMark(sessionRow)).toBe(false);
  });

  test('the ring dot shows when the post happened today, not otherwise', () => {
    // `ProfileAvatarMark`'s own base style also carries a borderColor AND a
    // backgroundColor together, so this matches the ring dot's exact fill
    // colour (width 10, distinct from the 32 dp avatar) rather than "has
    // both properties", which the avatar itself would always satisfy.
    const hasRing = (tree) => tree.root.findAll(
      (n) => n.props?.style && [].concat(n.props.style).some(
        (s) => s && s.backgroundColor === THEME.colors.primary && s.width === 10,
      ),
    ).length > 0;

    const today = render({
      item: item('block', { planName: 'Upper/Lower', weeks: 6, sessions: 18 }, { created_at: Date.now() }),
    });
    expect(hasRing(today)).toBe(true);

    const tenDaysAgo = Date.now() - (10 * 24 * 60 * 60 * 1000);
    const notToday = render({
      item: item('block', { planName: 'Upper/Lower', weeks: 6, sessions: 18 }, { created_at: tenDaysAgo }),
    });
    expect(hasRing(notToday)).toBe(false);
  });

  test('calls onRespect with the next state, toggling either way', () => {
    const onRespect = jest.fn();
    const tree = render({
      item: item('pr', { exerciseName: 'Bench press', weight: 100, reps: 5 }),
      onRespect,
    });
    const heart = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Give this respect')[0];
    act(() => { heart.props.onPress(); });
    expect(onRespect).toHaveBeenCalledWith(true);
  });

  test('calls onOpenPerson with the author', () => {
    const onOpenPerson = jest.fn();
    const tree = render({
      item: item('pr', { exerciseName: 'Bench press', weight: 100, reps: 5 }),
      onOpenPerson,
    });
    const avatarButton = tree.root.findAll(
      (n) => n.props?.accessibilityLabel === "Open Sam Rees's profile",
    )[0];
    act(() => { avatarButton.props.onPress(); });
    expect(onOpenPerson).toHaveBeenCalledWith(AUTHOR);
  });

  // F10 (fresh-eyes review): the 32 dp author-avatar target had no
  // hitSlop. Fixed to the same theme token the Respect glyph beside it
  // already uses, so the two targets now match.
  test('the author-avatar target carries the same hitSlop as the Respect glyph', () => {
    const tree = render({
      item: item('pr', { exerciseName: 'Bench press', weight: 100, reps: 5 }),
      onOpenPerson: jest.fn(),
      onRespect: jest.fn(),
    });
    const avatarButton = tree.root.findAll(
      (n) => n.props?.accessibilityLabel === "Open Sam Rees's profile",
    )[0];
    const heart = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Give this respect')[0];
    expect(avatarButton.props.hitSlop).toEqual(hitSlop);
    expect(avatarButton.props.hitSlop).toEqual(heart.props.hitSlop);
  });

  test('opens the item on press', () => {
    const onPress = jest.fn();
    const tree = render({
      item: item('pr', { exerciseName: 'Bench press', weight: 100, reps: 5 }),
      onPress,
    });
    const button = tree.root.findAll((n) => n.props?.accessibilityRole === 'button')[0];
    act(() => { button.props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
