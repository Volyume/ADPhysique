/**
 * HomeCommunityIntroCard (social-discovery blueprint section 14).
 *
 * Pins: the card names Community once with the differentiator first,
 * offers exactly two actions, and both retire it; HomeScreen shows it only
 * after a completed session, only without a cached profile, only when no
 * ranked banner holds the slot, and never before the stored flag and the
 * cached profile have been read.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ accessibility: { reduceMotion: true } }),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
import fs from 'fs';
import path from 'path';
import HomeCommunityIntroCard, { COMMUNITY_INTRO_TITLE, COMMUNITY_INTRO_BODY } from '../HomeCommunityIntroCard';

function textOf(tree) {
  const out = [];
  const walk = (n) => {
    if (n == null) return;
    if (typeof n === 'string') { out.push(n); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    walk(n.children);
  };
  walk(tree.toJSON());
  return out.join(' ');
}

function pressTitled(tree, title) {
  const node = tree.root.findAll((n) => n.props && n.props.title === title && typeof n.props.onPress === 'function')[0];
  act(() => { node.props.onPress(); });
}

describe('HomeCommunityIntroCard', () => {
  test('names the differentiator, with two actions', () => {
    const onOpen = jest.fn();
    const onDismiss = jest.fn();
    let tree;
    act(() => { tree = create(<HomeCommunityIntroCard onOpen={onOpen} onDismiss={onDismiss} />); });
    expect(textOf(tree)).toContain(COMMUNITY_INTRO_TITLE);
    expect(COMMUNITY_INTRO_BODY).toMatch(/give respect/);
    // V3a (81-VISUAL-RULINGS.md): the closing privacy sentence is dropped
    // from the body copy, matching the Community hub hero.
    expect(COMMUNITY_INTRO_BODY).not.toMatch(/Nothing about your body, food or coaching is ever shared\./);
    pressTitled(tree, 'Have a look');
    pressTitled(tree, 'Not now');
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('carries no em dash and no clipped slogan pair', () => {
    expect(`${COMMUNITY_INTRO_TITLE} ${COMMUNITY_INTRO_BODY}`).not.toMatch(/—/);
  });
});

describe('HomeScreen gating (source-level guard)', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../screens/HomeScreen.js'), 'utf8');

  test('defaults dismissed, reads the flag and the cached profile together', () => {
    expect(src).toMatch(/const \[communityIntroDismissed, setCommunityIntroDismissed\] = useState\(true\);/);
    expect(src).toMatch(/AsyncStorage\.getItem\(communityIntroKey\),\s*readCachedMe\(user\.id\),/);
    expect(src).toMatch(/setCommunityIntroDismissed\(flag === 'true' \|\| hasProfile\(me\)\);/);
  });

  test('renders only after a session, without a ranked banner, and both actions dismiss', () => {
    expect(src).toMatch(/totalSessions > 0 && !communityIntroDismissed && shownBannerKey == null && \(\s*<HomeCommunityIntroCard/);
    expect(src).toMatch(/onOpen=\{\(\) => \{ haptics\.selection\(\); dismissCommunityIntro\(\); navigation\.navigate\('Community'\); \}\}/);
    expect(src).toMatch(/onDismiss=\{\(\) => \{ haptics\.selection\(\); dismissCommunityIntro\(\); \}\}/);
  });

  test('the introduction sits after the last-session card, never above the hero', () => {
    const hero = src.indexOf('Primary workout area');
    const last = src.indexOf('<HomeLastSessionCard');
    const intro = src.indexOf('<HomeCommunityIntroCard');
    expect(hero).toBeGreaterThan(0);
    expect(last).toBeGreaterThan(hero);
    expect(intro).toBeGreaterThan(last);
  });
});

describe('Plan library (source-level guard)', () => {
  test('the library carries no Community programme-sharing entry point', () => {
    // Community programme-sharing was removed entirely
    // (`docs/community-product-audit-2026-09-07/40-GAP-CLOSURE.md` §2).
    const lib = fs.readFileSync(path.join(__dirname, '../../screens/PlanLibraryScreen.js'), 'utf8');
    expect(lib).not.toMatch(/Programmes from other lifters/);
  });
});
