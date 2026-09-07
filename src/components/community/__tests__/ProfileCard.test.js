/**
 * ProfileCard (visual ruling V8/V8a; community-product-audit-2026-09-07
 * `docs/community-product-audit-2026-09-07/30-IMPLEMENTATION.md` section
 * 1.3).
 *
 * What this suite pins:
 *
 *   1. `placeLine`: `place_label` (migration 163) leads, `area_label` is
 *      the fallback for a pre-163 card, and the gym half is unaffected.
 *   2. The reasons line runs through `reasonLines`, so the fixed-token
 *      reasons (`same_place`, `near_place`, `within_25_miles`,
 *      `same_age_band`) read as copy, never a raw key.
 *   3. The age band joins the handle/place caption line when the card
 *      carries one.
 *   4. `connectDenyLine`: the one deterministic case (already following,
 *      still refused) reads "Not taking requests"; every other case
 *      names the thing that might open it, never a guess dressed as fact.
 *   5. `can_connect === false` hides Connect and renders Follow with that
 *      line; a fallback row (empty reasons) never shows a reasons line.
 *
 * The client library is mocked: this is about what the card composes
 * from a card object, not about the RPC.
 */

import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

// ConnectButton's own Connected-state menu (MenuSheet -> BottomSheet)
// needs a SafeAreaProvider this suite never mounts; same visible-gated
// stand-in CommunityConnect.test.js uses for the same reason.
jest.mock('../../BottomSheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, children }) => (visible ? React.createElement(View, null, children) : null),
    InsideBottomSheetContext: React.createContext(false),
  };
});

jest.mock('../../../lib/community', () => ({
  COMMUNITY_STYLE_KEYS: { strength: 'Strength', kettlebell: 'Kettlebell' },
  COMMUNITY_GOALS: { get_stronger: 'Get stronger' },
  COMMUNITY_SETTINGS: { home_gym: 'Home gym' },
  TP_AGE_BANDS: {
    '18_24': '18 to 24', '25_34': '25 to 34', '35_44': '35 to 44', '45_54': '45 to 54', '55_plus': '55 or over',
  },
  connectionState: (card) => {
    const v = card?.connection ?? null;
    return ['none', 'requested_by_me', 'requested_by_them', 'connected'].includes(v) ? v : 'none';
  },
  reasonLines: (reasons, card) => (Array.isArray(reasons) ? reasons : []).map((r) => {
    if (r === 'same_place') return `In ${card?.place_label || card?.area_label || 'your place'}`;
    if (r === 'same_age_band') return 'Same age band';
    if (r === 'near_place') return 'Near you';
    if (r === 'within_25_miles') return 'Within 25 miles';
    return r;
  }),
  follow: jest.fn(),
  unfollow: jest.fn(),
}));

import ProfileCard, { placeLine, connectDenyLine } from '../ProfileCard';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); });
}

function baseCard(over = {}) {
  return {
    user_id: 'u2', handle: 'priya_kb', display_name: 'Priya K',
    relationship: { following: 'none', followed_by: false, muted: false, blocked: false },
    ...over,
  };
}

const ME = { profile: { user_id: 'u1' }, is_minor: false };

describe('placeLine: place_label leads, area_label is the pre-163 fallback', () => {
  test('gym and place both set', () => {
    expect(placeLine({ gym_label: 'PureGym Leeds', place_label: 'Motherwell' }))
      .toBe('Trains at PureGym Leeds · Motherwell');
  });

  test('place_label wins over area_label when both are set', () => {
    expect(placeLine({ place_label: 'Motherwell', area_label: 'Leeds' })).toBe('Motherwell');
  });

  test('a pre-163 card with only area_label still shows a place', () => {
    expect(placeLine({ area_label: 'Leeds' })).toBe('Leeds');
  });

  test('neither set: null, not an empty string or a dash', () => {
    expect(placeLine({})).toBeNull();
  });
});

describe('connectDenyLine: what it can state as fact versus what it can only invite', () => {
  test('already following, still refused: only "nobody" fits, so it says so', () => {
    expect(connectDenyLine({ relationship: { following: 'accepted' } })).toBe('Not taking requests');
  });

  test('not yet following: names the one thing that might open it', () => {
    expect(connectDenyLine({ relationship: { following: 'none' } }))
      .toBe('Accepts requests from people who follow them');
  });
});

describe('rendering', () => {
  async function mount(props) {
    let tree;
    await act(async () => { tree = create(<ProfileCard {...props} />); });
    await flush();
    return tree;
  }

  test('the reasons line runs fixed tokens through reasonLines, never a raw key', async () => {
    const tree = await mount({
      card: baseCard({ place_label: 'Motherwell' }),
      reasons: ['same_place', 'same_age_band'],
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('In Motherwell · Same age band');
    expect(text).not.toContain('same_place');
  });

  test('a fallback row (empty reasons) renders no reasons line', async () => {
    const tree = await mount({ card: baseCard(), reasons: [] });
    expect(flattenText(tree.toJSON())).not.toMatch(/same_|Trains at|Also trains/);
  });

  test('the age band joins the handle/place caption line when present', async () => {
    const tree = await mount({ card: baseCard({ age_band: '25_34' }) });
    expect(flattenText(tree.toJSON())).toContain('@priya_kb · 25 to 34');
  });

  test('no age band on the card: nothing extra on the line', async () => {
    const tree = await mount({ card: baseCard() });
    expect(flattenText(tree.toJSON())).toContain('@priya_kb');
    expect(flattenText(tree.toJSON())).not.toMatch(/·\s*$/);
  });

  test('can_connect false hides Connect, shows Follow, and the deny line', async () => {
    const tree = await mount({
      card: baseCard({ can_connect: false }), me: ME, showConnect: true,
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Accepts requests from people who follow them');
    expect(text).not.toContain('Connect');
  });

  test('can_connect true (or absent): the deny line never appears', async () => {
    const tree = await mount({ card: baseCard(), me: ME, showConnect: true });
    expect(flattenText(tree.toJSON())).not.toContain('Accepts requests from people who follow them');
    expect(flattenText(tree.toJSON())).not.toContain('Not taking requests');
  });
});
