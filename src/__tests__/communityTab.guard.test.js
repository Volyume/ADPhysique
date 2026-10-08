/**
 * D221 / build spec 2.1 and 2.5: Community is the sixth bottom tab.
 *
 * Pins, from source: every Community* screen except the two deliberate
 * HomeStack duplicates (CommunityCompose, CommunityPost) is registered in
 * CommunityStack; HomeTab stays the initial tab; no Community deep link or
 * notification route names HomeTab; the tab bar and navigator carry six
 * tabs; the tab-bar dot reads only the `community.unseen` slice, and the
 * unseen module never reads the ED flag or the tier.
 */
const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');
const NAV = read('src/navigation/RootNavigator.js');

function fnBody(name) {
  const start = NAV.indexOf(`function ${name}(`);
  const next = NAV.indexOf('\nfunction ', start + 1);
  return NAV.slice(start, next === -1 ? NAV.length : next);
}
const screensIn = (body) =>
  [...body.matchAll(/<Stack\.Screen\s+name="([A-Za-z0-9]+)"/g)].map((m) => m[1]);

const DUPLICATES = ['CommunityCompose', 'CommunityPost'];

describe('CommunityStack registration', () => {
  const community = screensIn(fnBody('CommunityStack'));
  const home = screensIn(fnBody('HomeStack'));
  const lazyCommunity = [...NAV.matchAll(/^const (Community[A-Za-z]+)Screen = lazyScreen/gm)].map((m) => m[1]);

  test('every Community* screen is registered in CommunityStack, the hub first', () => {
    expect(lazyCommunity.length).toBeGreaterThan(20);
    for (const name of lazyCommunity) {
      expect(community).toContain(name === 'CommunityHub' ? 'Community' : name);
    }
    expect(fnBody('CommunityStack')).toMatch(/initialRouteName="Community"/);
  });

  test('HomeStack keeps only the two compose-in-stack duplicates', () => {
    expect(home.filter((n) => n.startsWith('Community')).sort()).toEqual([...DUPLICATES].sort());
    expect(home).not.toContain('Community');
  });

  test('the tab is registered between Progress and Coach, Today stays initial', () => {
    expect(NAV).toMatch(
      /name="ProgressTab"[^\n]*\n\s*<Tab\.Screen name="CommunityTab" component=\{CommunityStack\} options=\{\{ title: 'Community' \}\} \/>\s*\n\s*<Tab\.Screen name="ProfileTab"/,
    );
    expect(NAV).toMatch(/postSetupLanding \|\| 'HomeTab'/);
    expect(NAV).toMatch(/CommunityTab: focused \? 'people' : 'people-outline'/);
    expect([...NAV.matchAll(/<Tab\.Screen\s+name="/g)]).toHaveLength(6);
  });

  test('the Community tab re-tap pops to the hub (NAV-5 listener)', () => {
    const body = fnBody('CommunityStack');
    expect(body).toMatch(/addListener\('tabPress'/);
    expect(body.indexOf('isFocused()')).toBeLessThan(body.indexOf('popToTop'));
  });
});

describe('no Community link or notification route names HomeTab', () => {
  test('deep links', () => {
    const linking = NAV.slice(NAV.indexOf('const linking = {'));
    const homeBlock = linking.slice(linking.indexOf('HomeTab: {'), linking.indexOf('CommunityTab: {'));
    expect(homeBlock).not.toMatch(/^\s*Community\w*: '/m);
    const communityBlock = linking.slice(linking.indexOf('CommunityTab: {'), linking.indexOf('DiaryTab: {'));
    for (const [screen, p] of [['Community', 'community'], ['CommunityProfile', 'u'], ['CommunityPost', 's'],
      ['CommunityConversation', 'm'], ['CommunityGroup', 'g']]) {
      expect(communityBlock).toMatch(new RegExp(`${screen}: '${p}'`));
    }
  });

  test('notification routes', () => {
    const src = read('src/lib/notifications/notificationRoute.js');
    expect(src).not.toMatch(/tab: 'HomeTab', screen: 'Community/);
    expect(src).not.toMatch(/tab: 'HomeTab',\s*\n\s*screen: 'Community/);
    const { routeForNotificationType } = require('../lib/notifications/notificationRoute');
    for (const type of ['community_follow', 'community_activity', 'community_message',
      'partner_cheer', 'partner_streak', 'partner_joined']) {
      expect(routeForNotificationType(type, {}).tab).toBe('CommunityTab');
    }
  });
});

describe('tab bar and unseen dot', () => {
  const BAR = read('src/components/VolyumeTabBar.js');
  const UNSEEN = read('src/lib/community/unseen.js');

  test('the bar reads community.unseen and labels the dot', () => {
    expect(BAR).toMatch(/s\.community\?\.unseen/);
    expect(BAR).toMatch(/route\.name === 'CommunityTab'/);
    expect(BAR).toMatch(/, something new`/);
  });

  test('the unseen module never reads the ED flag or the tier', () => {
    const code = UNSEEN.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/edFlag|ed_flag|edPattern|wellbeing|tier|proGate|calm/i);
  });
});
