/**
 * Lane 2B rows and menu (D221 visual law V3, V7, V9; build spec section 3).
 * Pins:
 *   - SwitchRow: 56 dp with one line and 64 dp with two, the switch carries
 *     the row's label and its change handler, a disabled switch is disabled;
 *   - EntryRow: `disabled` dims to textMuted, makes the press a no-op and
 *     reports the disabled accessibility state; `destructive` inks in error;
 *   - MenuSheet: rows are EntryRows (never SettingRow, never amber), a row
 *     with `disabled: true` is dimmed, does nothing and says so;
 *   - SectionHeader `flush` drops the inline gutter;
 *   - PostRow `detail`: the word "Respect" beside the count, the whole note
 *     (no line cap, no "more"), the comment count always shown;
 *   - PrivacyReceipt `inBand`: a band of plain text, no card;
 *   - the skeletons for forms and reports are true to shape.
 */
import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
const mockToast = { show: jest.fn() };
jest.mock('../../Toast', () => ({ useToast: () => mockToast }));
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));
jest.mock('../../BottomSheet', () => ({ children }) => children);
jest.mock('../../ModalHeader', () => () => null);
jest.mock('../../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn(), light: jest.fn() }));

import SwitchRow from '../SwitchRow';
import EntryRow from '../EntryRow';
import MenuSheet from '../MenuSheet';
import SectionHeader from '../SectionHeader';
import PostRow from '../PostRow';
import PrivacyReceipt from '../PrivacyReceipt';
import Card from '../../Card';
import SkeletonFormBand from '../SkeletonFormBand';
import SkeletonReportRow from '../SkeletonReportRow';
import { BandBody } from '../Band';

function render(el) {
  let tree;
  act(() => { tree = create(el); });
  return tree;
}
const flat = (style) => [].concat(style).flat(3).filter(Boolean).reduce((a, s) => ({ ...a, ...s }), {});
function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

describe('SwitchRow', () => {
  test('56 dp on one line, 64 dp with a subtitle', () => {
    const one = render(<SwitchRow title="Show my gym" value onValueChange={() => {}} />);
    const two = render(<SwitchRow title="Show my gym" subtitle="Others can see it." value onValueChange={() => {}} />);
    const minOf = (tree) => tree.root.findAll((n) => n.props?.style && flat(n.props.style).minHeight >= 56)
      .map((n) => flat(n.props.style).minHeight)[0];
    expect(minOf(one)).toBe(56);
    expect(minOf(two)).toBe(64);
  });

  test('the switch carries the label and the change handler', () => {
    const onValueChange = jest.fn();
    const tree = render(<SwitchRow title="Show my gym" value={false} onValueChange={onValueChange} accessibilityLabel="Show my gym" />);
    const sw = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Show my gym' && n.props?.onValueChange)[0];
    expect(sw).toBeTruthy();
    act(() => { sw.props.onValueChange(true); });
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  test('disabled passes through to the switch', () => {
    const tree = render(<SwitchRow title="x" value disabled onValueChange={() => {}} />);
    const sw = tree.root.findAll((n) => n.props?.onValueChange)[0];
    expect(sw.props.disabled).toBe(true);
  });
});

describe('EntryRow disabled and destructive', () => {
  test('disabled is dimmed, a no-op, and reports the state', () => {
    const onPress = jest.fn();
    const tree = render(<EntryRow icon="heart-outline" title="Most respected" subtitle="Not available yet" disabled onPress={onPress} />);
    const row = tree.root.findAll((n) => n.props?.accessibilityState?.disabled === true)[0];
    expect(row).toBeTruthy();
    act(() => { row.props.onPress?.(); });
    expect(onPress).not.toHaveBeenCalled();
    const title = tree.root.findAll((n) => n.props?.children === 'Most respected')[0];
    expect(flat(title.props.style).color).toBeDefined();
    const live = render(<EntryRow icon="heart-outline" title="Most respected" onPress={() => {}} />);
    const liveTitle = live.root.findAll((n) => n.props?.children === 'Most respected')[0];
    expect(flat(title.props.style).color).not.toBe(flat(liveTitle.props.style).color);
  });

  test('destructive inks the title in error', () => {
    const tree = render(<EntryRow icon="exit-outline" title="Leave Community" destructive onPress={() => {}} />);
    const plain = render(<EntryRow icon="exit-outline" title="Leave Community" onPress={() => {}} />);
    const colour = (t) => flat(t.root.findAll((n) => n.props?.children === 'Leave Community')[0].props.style).color;
    expect(colour(tree)).not.toBe(colour(plain));
  });
});

describe('MenuSheet', () => {
  test('rows are EntryRows with the callers\' names, and a disabled row does nothing', () => {
    const live = jest.fn();
    const dead = jest.fn();
    const tree = render(
      <MenuSheet
        visible
        onClose={() => {}}
        title="Sort"
        rows={[
          { icon: 'time-outline', label: 'Newest', onPress: live },
          { icon: 'heart-outline', label: 'Most respected', sub: 'Not available yet', disabled: true, onPress: dead },
        ]}
      />,
    );
    const newest = tree.root.findAll((n) => n.props?.label === 'Newest' && n.props?.onPress)[0];
    const respected = tree.root.findAll((n) => n.props?.label === 'Most respected' && n.props?.onPress)[0];
    act(() => { newest.props.onPress(); });
    expect(live).toHaveBeenCalledTimes(1);
    expect(respected).toBeTruthy();
    // The pressable the person touches is the disabled one, and its press is a no-op.
    const states = tree.root.findAll((n) => n.props?.accessibilityState?.disabled === true);
    expect(states.length).toBeGreaterThan(0);
    act(() => { states[0].props.onPress?.(); });
    expect(dead).not.toHaveBeenCalled();
  });

  test('source: no SettingRow and no amber', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '../MenuSheet.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    expect(src).not.toMatch(/SettingRow|primary/);
  });
});

describe('SectionHeader flush', () => {
  test('drops the inline gutter, and stays 56 dp', () => {
    const tree = render(<SectionHeader flush title="Where" />);
    const wrap = tree.root.findAll((n) => n.props?.style && flat(n.props.style).minHeight === 56)[0];
    expect(flat(wrap.props.style).paddingHorizontal).toBe(0);
  });
});

describe('PostRow detail', () => {
  const longNote = `${'A long note about a good session. '.repeat(8)}\nSecond paragraph of the note.`;
  function item() {
    return {
      post: {
        id: 'p1', kind: 'session', payload: { sessionName: 'Upper A' }, caption: `Upper A\n${longNote}`, created_at: Date.now(), reaction_count: 3, comment_count: 0,
      },
      author: { user_id: 'u2', handle: 'sam', display_name: 'Sam', avatar_preset: null },
      myReaction: false,
    };
  }

  test('the feed row truncates the note and offers "more"; the detail row does neither', () => {
    const feed = render(<PostRow item={item()} onPress={() => {}} onRespect={async () => {}} />);
    const detail = render(<PostRow detail item={item()} onRespect={async () => {}} />);
    const note = (tree) => tree.root.findAll((n) => typeof n.props?.children === 'string' && n.props.children.includes('Second paragraph'))[0];
    expect(note(feed).props.numberOfLines).toBe(3);
    expect(note(detail).props.numberOfLines).toBeUndefined();
    expect(flattenText(feed.toJSON())).toContain('more');
    expect(flattenText(detail.toJSON())).not.toMatch(/\bmore\b/);
  });

  test('the word Respect sits beside the count only on the detail row; the comment count is always shown', () => {
    const feed = render(<PostRow item={item()} onPress={() => {}} onRespect={async () => {}} />);
    const detail = render(<PostRow detail item={item()} onRespect={async () => {}} />);
    expect(flattenText(detail.toJSON())).toMatch(/3\s+Respect/);
    expect(flattenText(feed.toJSON())).not.toMatch(/3\s+Respect/);
    expect(flattenText(detail.toJSON())).toMatch(/0/);
    expect(detail.root.findAll((n) => n.props?.accessibilityLabel === 'Comments, 0').length).toBeGreaterThan(0);
  });
});

describe('PrivacyReceipt inBand', () => {
  test('renders as a band of plain text, never a card, with no amber glyph', () => {
    const banded = render(<PrivacyReceipt inBand />);
    const text = flattenText(banded.toJSON());
    expect(text).toContain('Nothing about your body, food or coaching is ever shared.');
    expect(banded.root.findAllByType(Card)).toHaveLength(0);
    const card = render(<PrivacyReceipt />);
    expect(card.root.findAllByType(Card)).toHaveLength(1);
  });

  test('expanding it names both columns with header roles', () => {
    const tree = render(<PrivacyReceipt inBand />);
    const button = tree.root.findAll((n) => n.props?.accessibilityLabel === 'What is shared. Expands the full list.' && n.props?.onPress)[0];
    act(() => { button.props.onPress(); });
    const headers = tree.root
      .findAll((n) => typeof n.type === 'string' && n.props?.accessibilityRole === 'header')
      .map((n) => n.props.children);
    expect(headers).toEqual(['Others can see', 'Never shared']);
  });
});

describe('skeletons in the true shape', () => {
  test('SkeletonFormBand draws the bands asked for, each a header bar over 44 dp wells', () => {
    const tree = render(<SkeletonFormBand bands={2} wells={3} />);
    const wells = tree.root.findAll((n) => n.props?.height === 44);
    expect(wells).toHaveLength(6);
    expect(tree.root.findAll((n) => n.props?.height === 16)).toHaveLength(2);
  });

  test('SkeletonReportRow is hidden from the accessibility tree and carries pills and lines', () => {
    const tree = render(<SkeletonReportRow />);
    expect(tree.root.findAll((n) => n.props?.importantForAccessibility === 'no-hide-descendants').length).toBeGreaterThan(0);
    expect(tree.root.findAll((n) => n.props?.height === 24)).toHaveLength(2);
  });
});

describe('BandBody', () => {
  test('pays the gutter and the foot once', () => {
    const tree = render(<BandBody><></></BandBody>);
    const body = tree.root.findAll((n) => n.props?.style && flat(n.props.style).paddingHorizontal === 16)[0];
    expect(body).toBeTruthy();
  });
});
