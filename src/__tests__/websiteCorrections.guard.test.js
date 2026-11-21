/**
 * The published website (public/) says only what the app does today, and every
 * store link on it is marked (LOC-663; plan LOC-583 revision 7).
 *
 * What this suite pins:
 *  - no page says the iPhone app is "coming soon" (it is live in the UK App
 *    Store, id 6777083702), states a price, a paid plan or its vocabulary,
 *    names a feature the website no longer claims, or says there is no social
 *    feed (scripts/site/publicStatements.cjs holds the rules);
 *  - every link to the App Store or Google Play carries the one marking
 *    scheme, with a campaign name per page, so installs that start on the
 *    website show in each store's own figures (scripts/site/storeLinks.cjs,
 *    docs/website-store-link-marking.md);
 *  - the marking is a plain link: no script file, tag, pixel or analytics
 *    service was added to the site, and the home page offers both stores;
 *  - the rules themselves catch what they are for, so they cannot be loosened
 *    to nothing without this suite noticing.
 */
const fs = require('fs');
const path = require('path');
const { scanTree, RULES } = require('../../scripts/site/publicStatements.cjs');
const { MIRRORS, checkTree, appleLink, playLink, CAMPAIGNS, STORE_URL } = require('../../scripts/site/storeLinks.cjs');

const root = path.join(__dirname, '..', '..');
const publicDir = path.join(root, 'public');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

test('no page under public/ (or its docs/web mirror) makes a forbidden statement', () => {
  for (const dir of MIRRORS) expect(scanTree(path.join(root, dir))).toEqual([]);
});

test('the statement rules catch each kind of statement they exist for', () => {
  const hit = (s) => RULES.some(([re]) => re.test(s));
  for (const s of [
    'Volyume for iOS is coming to the App Store very soon.',
    'iOS coming soon',
    'Pro is £4.99 a month',
    'Start your free trial',
    'Upgrade to Pro',
    '$9.99/month',
    '<span class="price">Free</span>',
    'Advanced progression',
    'Progress Scan, a progress score from your own photos',
    'no social feed',
    'A shared streak that you build together',
    'your workout count, sessions and streak',
    'A cheer you can send each other once a day',
    'Your invite code:',
    'Either of you can end the partnership whenever you want.',
    'Someone invited you to be their training partner on Volyume.',
    '551 exercises plus your own',
    'Plan library, 31 built-in training plans',
  ]) expect([s, hit(s)]).toEqual([s, true]);
  for (const s of ['Volyume is free.', 'Download on the App Store', 'Unsubscribe', 'Free. No card needed.', 'Partner invites now open Community']) {
    expect([s, hit(s)]).toEqual([s, false]);
  }
});

test('every store link on the site carries the marking, and the home page offers both stores', () => {
  let total = 0;
  for (const dir of MIRRORS) {
    const { problems, links } = checkTree(path.join(root, dir));
    expect([dir, problems]).toEqual([dir, []]);
    total += links;
  }
  expect(total).toBeGreaterThan(30);
  const home = read('public', 'index.html');
  expect(home).toContain(appleLink('home'));
  expect(home).toContain(playLink('home'));
});

test('the marking scheme is the documented one', () => {
  expect(playLink('home')).toBe(
    'https://play.google.com/store/apps/details?id=app.volyume&referrer=utm_source%3Dvolyume.app%26utm_medium%3Dwebsite%26utm_campaign%3Dhome',
  );
  expect(appleLink('home')).toMatch(/^https:\/\/apps\.apple\.com\/gb\/app\/volyume\/id6777083702\?(?:pt=[A-Za-z0-9]+&)?ct=home&mt=8$/);
  for (const [file, name] of Object.entries(CAMPAIGNS)) {
    expect(name).toMatch(/^[a-z0-9-]{1,40}$/);
    expect(fs.existsSync(path.join(publicDir, file))).toBe(true);
  }
});

test('an unmarked or unlisted store link is caught', () => {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'site-'));
  fs.writeFileSync(path.join(tmp, 'index.html'), '<a href="https://apps.apple.com/gb/app/volyume/id6777083702">x</a>');
  fs.mkdirSync(path.join(tmp, 'new'));
  fs.writeFileSync(path.join(tmp, 'new', 'index.html'), `<a href="${playLink('new')}">x</a>`);
  const { problems } = checkTree(tmp);
  expect(problems.length).toBe(2);
  expect(problems[0]).toMatch(/index\.html: .*should be/);
  expect(problems[1]).toMatch(/new\/index\.html: has a store link but no campaign name/);
  expect(STORE_URL.global).toBe(true);
});

test('no script, tag or third-party host was added for the marking', () => {
  const external = /<script[^>]+src=["']https?:\/\/(?!volyume\.app)/i;
  for (const file of fs.readdirSync(publicDir, { recursive: true })) {
    if (!/\.html$/.test(file)) continue;
    expect([file, external.test(read('public', file))]).toEqual([file, false]);
  }
  const home = read('public', 'index.html');
  expect(home).not.toMatch(/<script/i);
  expect(home).not.toMatch(/gtag|googletagmanager|fbq\(|plausible|matomo|segment\.com|<img[^>]*(?:pixel|beacon)/i);
  expect(fs.existsSync(path.join(publicDir, 'store-links.js'))).toBe(false);
});

test('the Play referrer of a challenge link still carries the code the app reads', () => {
  const landing = read('public', 'c', 'index.html');
  expect(landing).toContain(`PLAY + encodeURIComponent('&challenge=' + code)`);
});
