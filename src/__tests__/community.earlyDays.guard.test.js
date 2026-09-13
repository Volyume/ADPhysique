/**
 * Early days (26-EARLY-DAYS-SPEC.md, CR-16 / D162), source-level guards.
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL: the invite
 * link plumbing is three files on two platforms plus a web page, and any
 * one of them missing turns a shared group link into a dead end for the
 * person invited; the host is read from ONE constant, never a second
 * literal; the store link placeholder that shipped on the profile, story
 * and programme pages for months must never come back; the cohort page
 * and the Hub render the honest lines through the shared helpers, not a
 * second copy of the wording.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('the group invite link works end to end', () => {
  test('Android: app.json carries the verified /g app link beside /u, /p and /s', () => {
    const app = JSON.parse(read('app.json'));
    const filters = app.expo.android.intentFilters;
    const prefixes = filters.flatMap((f) => (f.data ?? []).map((d) => d.pathPrefix)).filter(Boolean);
    // "/g/" with its slash: a bare "/g" would also claim the install page
    // at /get (Android pathPrefix is a prefix match).
    expect(prefixes).toEqual(expect.arrayContaining(['/u', '/p', '/s', '/g/']));
    expect(prefixes).not.toContain('/g');
    const g = filters.find((f) => (f.data ?? []).some((d) => d.pathPrefix === '/g/'));
    expect(g.autoVerify).toBe(true);
    expect(g.data[0]).toMatchObject({ scheme: 'https', host: 'volyume.app' });
  });

  test('iOS: the Apple site association carries /g/*', () => {
    const aasa = JSON.parse(read('public/.well-known/apple-app-site-association'));
    const paths = aasa.applinks.details[0].paths;
    expect(paths).toEqual(expect.arrayContaining(['/u/*', '/p/*', '/s/*', '/g/*']));
  });

  test('the web landing exists, hands the token on, fetches nothing, and offers both stores', () => {
    const page = read('public/g/index.html');
    expect(page).toContain("'volyume://g/?id=' + encodeURIComponent(id)");
    expect(page).toContain("'&t=' + encodeURIComponent(token)");
    expect(page).not.toMatch(/fetch\(/);
    expect(page).toContain('https://play.google.com/store/apps/details?id=app.volyume');
    expect(page).toContain('https://apps.apple.com/gb/app/volyume/id6777083702');
    expect(page).toContain('name="robots" content="noindex, nofollow"');
  });

  test('the share sheet builds the link through groupInviteUrl, never a second question mark', () => {
    const sheet = read('src/components/community/GroupInviteSheet.js');
    expect(sheet).toContain('groupInviteUrl(groupId, token)');
    expect(sheet).not.toMatch(/\?t=\$\{/);
  });

  test('the group screen reads the token from the route and consumes it', () => {
    const screen = read('src/screens/CommunityGroupScreen.js');
    expect(screen).toContain('route?.params?.t');
    expect(screen).toContain('acceptGroupInvite({ token: inviteToken })');
    expect(screen).toContain("'This invite link has expired.'");
    // The token names its own group; the requested state keeps its button.
    expect(screen).toContain('navigation.setParams({ id: joinedId, t: undefined });');
    expect(screen).toContain('{!isMember && !isMinor && inviteToken && !isRequested ? (');
  });
});

describe('the store links are real', () => {
  test('no App Store placeholder remains anywhere under public/', () => {
    const hits = [];
    (function walk(dir) {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (/\.html$/.test(name) && fs.readFileSync(full, 'utf8').includes('REPLACE_WITH_APP_STORE_ID')) hits.push(full);
      }
    }(path.join(ROOT, 'public')));
    expect(hits).toEqual([]);
  });

  test('the four share pages carry the same App Store link as the get page', () => {
    const id = 'https://apps.apple.com/gb/app/volyume/id6777083702';
    expect(read('public/get/index.html')).toContain(id);
    for (const dir of ['u', 's', 'p', 'partner', 'g']) {
      expect(read(`public/${dir}/index.html`)).toContain(id);
    }
  });
});

describe('the honest lines come from the shared helpers', () => {
  const HUB = read('src/screens/CommunityHubScreen.js');
  const DIM = read('src/screens/CommunityDimensionScreen.js');
  const EARLY = read('src/lib/community/earlyDays.js');

  test('the host handle is one constant, read only from earlyDays, pinned to one user id', () => {
    expect(EARLY).toMatch(/export const COMMUNITY_HOST_HANDLE = '[a-z0-9_]+';/);
    expect(EARLY).toMatch(/export const COMMUNITY_HOST_USER_ID = '[0-9a-f-]{36}';/);
    expect(EARLY).toContain('if (String(card.user_id) !== COMMUNITY_HOST_USER_ID) return false;');
    expect(EARLY).not.toMatch(/—/);
    expect(HUB).toContain('getProfile({ handle: COMMUNITY_HOST_HANDLE })');
    const screens = fs.readdirSync(path.join(ROOT, 'src/screens')).filter((f) => /^Community.*\.js$/.test(f));
    for (const f of screens) {
      expect({ f, literal: /'allan'/.test(read(`src/screens/${f}`)) }).toEqual({ f, literal: false });
    }
  });

  test('the Hub renders the first-here line, the invite and the HOST row through the helpers', () => {
    expect(HUB).toContain('firstHereLine(me?.profile?.gym_label)');
    expect(HUB).toContain('inviteLabel({ gymLabel: me?.profile?.gym_label })');
    expect(HUB).toContain('inviteMessage({ handle: me?.profile?.handle, gymLabel: me?.profile?.gym_label })');
    expect(HUB).toContain('hostRowVisible({ card, viewable: out?.viewable, uid })');
    expect(HUB).toContain('caption: hostCaption(host)');
    expect(HUB).toContain("<Eyebrow trailing={{ label: 'Not now', onPress: dismissHost }}>HOST</Eyebrow>");
    // The zero state needs a summary that answered and is empty, style
    // cohorts included (review blocker 2).
    expect(HUB).toContain('const summaryEmpty = !!summary && Array.isArray(summary.cohorts) && summary.cohorts.length === 0;');
    expect(HUB).toContain(') : cohorts.length || !summaryEmpty ? (');
  });

  test('the cohort page counts through cohortCountLine and gates the action on isOwnCohort', () => {
    expect(DIM).toContain('cohortCountLine({');
    expect(DIM).toMatch(/isOwnCohort\(\{\s*kind, key, me, venueId, ownGymByLabel: isOwnGym, label: route\?\.params\?\.label \?\? paramLabel,\s*\}\)/);
    expect(DIM).toContain('countLine={ownCohort ? cohortCountLine({ own: true, others: summary.count }) : null}');
    expect(DIM).toContain('{rosterThin && ownCohort ? (');
    expect(DIM).toContain('No one else here is sharing yet.');
    expect(DIM).not.toMatch(/\$\{memberCount\} \$\{memberCount === 1 \? 'member' : 'members'\}/);
  });
});
