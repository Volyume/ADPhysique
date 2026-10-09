/**
 * Round 3R, SF2 and SF3 and SF4: rows with inner actions expose them to
 * screen readers, a long section header wraps, and the post's own page shows
 * a milestone figure, a block's lift gains and a session's plan name.
 * Written to FAIL: each case asserts the `accessible` flag on the container
 * and a label on every inner control.
 */
import { create, act } from 'react-test-renderer';
import { Pressable } from 'react-native';
// D104-1 phase 2b (2026-10-09): Text/TextInput are the house primitives
import Text from '../../Text';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
const mockToast = { show: jest.fn() };
jest.mock('../../Toast', () => ({ useToast: () => mockToast }));
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));

import EntryRow from '../EntryRow';
import PersonRow from '../PersonRow';
import CohortRow from '../CohortRow';
import GroupRow from '../GroupRow';
import PostRow, { postRowLines } from '../PostRow';
import SectionHeader from '../SectionHeader';

function render(el) {
  let tree;
  act(() => { tree = create(el); });
  return tree;
}
const Btn = (p) => <Pressable accessibilityRole="button" {...p}><Text>{p.title}</Text></Pressable>;
const hasFalse = (tree) => tree.root.findAll((n) => n.props?.accessible === false).length > 0;

describe('EntryRow with an action in its trailing slot', () => {
  test('the container is not one accessible element; the text group is labelled; the button keeps its label', () => {
    const tree = render(
      <EntryRow title="Group A" subtitle="Invited you to join" onPress={() => {}}
        trailing={<Btn title="Accept" accessibilityLabel="Accept the invite to Group A" />} />,
    );
    expect(hasFalse(tree)).toBe(true);
    const group = tree.root.findAll((n) => n.props?.accessible === true && n.props?.accessibilityLabel === 'Group A. Invited you to join');
    expect(group.length).toBeGreaterThan(0);
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === 'Accept the invite to Group A').length).toBeGreaterThan(0);
  });
  test('a plain row (chevron, or a text count) is still one accessible element', () => {
    expect(hasFalse(render(<EntryRow title="Find people" onPress={() => {}} />))).toBe(false);
    expect(hasFalse(render(<EntryRow title="Requests" onPress={() => {}} trailing={<Text>3</Text>} />))).toBe(false);
  });
});

describe('PersonRow, CohortRow, GroupRow with a trailing action', () => {
  test('PersonRow', () => {
    const tree = render(
      <PersonRow person={{ user_id: 'a', display_name: 'Sam', handle: 'sam' }} onPress={() => {}}
        trailing={<Btn title="Follow" accessibilityLabel="Follow Sam" />} />,
    );
    expect(hasFalse(tree)).toBe(true);
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === 'Follow Sam').length).toBeGreaterThan(0);
    expect(hasFalse(render(<PersonRow person={{ user_id: 'a', display_name: 'Sam' }} onPress={() => {}} />))).toBe(false);
  });
  test('CohortRow and GroupRow', () => {
    for (const el of [
      <CohortRow title="Your gym" line="3 members" people={[]} onPress={() => {}} trailing={<Btn title="Join" accessibilityLabel="Join Your gym" />} />,
      <GroupRow group={{ name: 'Crew' }} line="3 members" people={[]} onPress={() => {}} trailing={<Btn title="Join" accessibilityLabel="Join Crew" />} />,
    ]) {
      const tree = render(el);
      expect(hasFalse(tree)).toBe(true);
      expect(tree.root.findAll((n) => /^Join /.test(n.props?.accessibilityLabel ?? '')).length).toBeGreaterThan(0);
    }
    expect(hasFalse(render(<CohortRow title="Your gym" line="3 members" people={[]} onPress={() => {}} />))).toBe(false);
  });
});

describe('PostRow', () => {
  const item = {
    post: { id: 'p1', kind: 'note', caption: 'Good session', created_at: new Date().toISOString(), reaction_count: 2, comment_count: 1 },
    author: { user_id: 'a', display_name: 'Sam' },
    myReaction: false,
  };
  test('the card is not one accessible element: the read-out, the heart and the comment glyph are each reachable', () => {
    const tree = render(<PostRow item={item} onPress={() => {}} onRespect={async () => {}} onOpenPerson={() => {}} />);
    expect(hasFalse(tree)).toBe(true);
    const labels = tree.root.findAll((n) => n.props?.accessible === true || n.props?.accessibilityRole === 'button')
      .map((n) => n.props.accessibilityLabel).filter(Boolean);
    expect(labels).toEqual(expect.arrayContaining(['Give this post Respect', 'Comments, 1', "Open Sam's profile"]));
    expect(labels.some((l) => /Sam, Good session/.test(l))).toBe(true);
  });
  test('detail mode on a post that does not open drops the button role (N8)', () => {
    const tree = render(<PostRow item={item} detail onRespect={async () => {}} />);
    const buttonish = tree.root.findAll((n) => n.props?.accessibilityRole === 'button' && /Sam, Good session/.test(n.props?.accessibilityLabel ?? ''));
    expect(buttonish).toHaveLength(0);
  });
  test('detail shows a milestone figure, a block\'s lift gains and a session\'s plan name; the list does not', () => {
    const milestone = { kind: 'milestone', payload: { title: '25 sessions', heroValue: 25, heroUnit: 'sessions', caption: 'Since March' } };
    expect(postRowLines(milestone, { detail: true }).achievement).toBe('25 sessions');
    expect(postRowLines(milestone, { detail: true }).stats).toBe('25 sessions · Since March');
    expect(postRowLines(milestone).achievement).toBe('25 sessions');
    const block = { kind: 'block', payload: { planName: 'Push Pull', weeks: 8, sessions: 24, lifts: [{ exerciseName: 'Squat', deltaKg: 10, units: 'kg' }] } };
    expect(postRowLines(block, { detail: true }).extra).toBe('Squat +10 kg');
    expect(postRowLines(block).extra).toBe('');
    const session = { kind: 'session', payload: { sessionName: 'Legs', planName: 'Upper Lower', duration: 50 } };
    expect(postRowLines(session, { detail: true }).extra).toBe('Plan: Upper Lower');
    expect(postRowLines(session).extra).toBe('');
    // Never a body figure.
    const all = JSON.stringify([postRowLines(milestone, { detail: true }), postRowLines(block, { detail: true }), postRowLines(session, { detail: true })]);
    expect(all).not.toMatch(/bodyweight|calorie|kcal/i);
  });
});

describe('SectionHeader (SF3)', () => {
  test('the title wraps to two lines and the header can grow past 44 dp', () => {
    const tree = render(<SectionHeader title="No body-shaming, no diet or calorie talk." />);
    const title = tree.root.findAll((n) => n.props?.accessibilityRole === 'header')[0];
    expect(title.props.numberOfLines).toBe(2);
    const wrap = tree.root.findAll((n) => n.props?.style && [].concat(n.props.style).flat().some((s) => s && s.minHeight === 44))[0];
    expect(wrap).toBeTruthy(); // a minHeight, not a fixed height
    const flatStyle = [].concat(wrap.props.style).flat().filter(Boolean).reduce((a, s) => ({ ...a, ...s }), {});
    expect(flatStyle.height).toBeUndefined();
  });
});
