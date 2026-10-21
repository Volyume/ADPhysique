/**
 * volyume.app store-link and contact guard.
 *
 * Authority: docs/site-rebuild-2026-10/BRIEF.md ("Hosting and links": the site
 * only LINKS to the App Store and Google Play; "iPhone is in the App Store
 * (page live 2026-10-21): say iPhone and Android"; "Support contact shown on
 * the site: allansdouglas1983@gmail.com (owner answer)... Legal texts keep
 * their own wording"), docs/site-rebuild-2026-10/FACTS.md section 1.2, and
 * marketing/hq/PRODUCT-FACTS.md section A (both stores live).
 *
 * What this pins, over every HTML page under public/ (members excluded):
 *  1. A store link is the exact store address: the Google Play listing for
 *     app.volyume and the App Store listing id6777083702, the same id the app
 *     holds for its own "rate" link (a referrer or other query string after
 *     the address is fine).
 *  2. A page that links one store links both, counting the links the page's
 *     own script builds. Every indexable page, and the challenge landing page,
 *     links both.
 *  3. No old store wording: no "coming soon", no "TestFlight", and no "iOS" in
 *     copy (the brief says iPhone), apart from the one legal sentence in the
 *     privacy policy that names the iOS Keychain.
 *  4. The support contact is allansdouglas1983@gmail.com on every page that is
 *     not a legal text. The privacy policy and the challenge terms keep
 *     support@volyume.app, their own wording.
 *
 * These fail on the old pages (the home page said "iOS coming soon" until the
 * 2026-10-21 fix; articles, /privacy/ and the challenge terms still link only
 * Google Play; the support page shows support@volyume.app) and pass once the
 * rebuilt pages land.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const S = require('./siteScan');

const GOOGLE = 'https://play.google.com/store/apps/details?id=app.volyume';
const APPLE = 'https://apps.apple.com/gb/app/volyume/id6777083702';
const SUPPORT_EMAIL = 'allansdouglas1983@gmail.com';
const LEGAL_EMAIL = 'support@volyume.app';

const PAGES = S.htmlFiles();
const isStub = (rel) => S.readPage(rel).elements.some((e) => e.name === 'meta' && /refresh/i.test(e.attrs['http-equiv'] || ''));
const LIVE = PAGES.filter((rel) => !isStub(rel));
const POLICY_PAGES = ['privacy/index.html', 'privacy.html'];
const LEGAL_PAGES = [...POLICY_PAGES, 'challenge-terms/index.html'];
const NOINDEX_PREFIXES = ['c/', 'challenge-terms/', 'auth/', 'email/', 'survey/', 'g/', 'u/', 's/', 'p/', 'partner/', 'members/'];
const INDEXABLE = LIVE.filter((rel) => rel !== '404.html' && !NOINDEX_PREFIXES.some((p) => rel.startsWith(p)));

/** Store links on a page: those in anchors and those its script builds. */
function storeLinks(rel) {
  const page = S.readPage(rel);
  const urls = page.elements.filter((e) => e.name === 'a' && e.attrs.href).map((e) => e.attrs.href);
  page.scripts.forEach((s) => {
    if (!s.attrs.src) for (const m of s.code.matchAll(/https:\/\/(?:play\.google\.com|apps\.apple\.com)[^'"`\s)]*/g)) urls.push(m[0]);
  });
  return {
    play: urls.filter((u) => /^https:\/\/play\.google\.com\//.test(u)),
    apple: urls.filter((u) => /^https:\/\/apps\.apple\.com\//.test(u)),
  };
}

describe('store links', () => {
  test('are the exact store addresses', () => {
    const out = [];
    LIVE.forEach((rel) => {
      const { play, apple } = storeLinks(rel);
      play.filter((u) => !u.startsWith(GOOGLE)).forEach((u) => out.push(`${rel}: ${u}`));
      apple.filter((u) => !u.startsWith(APPLE)).forEach((u) => out.push(`${rel}: ${u}`));
    });
    expect(out).toEqual([]);
  });

  test('match what the app itself holds', () => {
    const about = fs.readFileSync(path.join(S.REPO, 'src', 'screens', 'SettingsAboutScreen.js'), 'utf8');
    const appJson = JSON.parse(fs.readFileSync(path.join(S.REPO, 'app.json'), 'utf8'));
    expect(about).toContain('6777083702');
    expect(GOOGLE.endsWith(`id=${appJson.expo.android.package}`)).toBe(true);
    expect(APPLE).toContain('id6777083702');
  });

  test('a page that links one store links both', () => {
    const out = LIVE.filter((rel) => {
      const { play, apple } = storeLinks(rel);
      return (play.length > 0) !== (apple.length > 0);
    });
    expect(out).toEqual([]);
  });

  test('every indexable page and the challenge landing page link both stores', () => {
    const out = [...INDEXABLE, 'c/index.html'].filter((rel) => {
      const { play, apple } = storeLinks(rel);
      return !(play.length > 0 && apple.length > 0);
    });
    expect(out).toEqual([]);
  });
});

describe('old store wording', () => {
  const units = (rel) => {
    const page = S.readPage(rel);
    const out = S.copyUnits(page);
    S.scriptCopy(page).forEach((t) => S.sentencesOf(t).forEach((s) => out.push({ where: 'script', text: s })));
    return out;
  };
  const KEYCHAIN = 'On your phone, your data sits in encrypted local storage: EncryptedSharedPreferences on Android and Keychain on iOS for tokens, and SQLite for your training history, food diary, progress metadata and rollups.';
  const hits = (re, { exempt = [] } = {}) => {
    const out = [];
    LIVE.forEach((rel) => units(rel).forEach((u) => {
      if (re.test(u.text) && !exempt.includes(`${rel}|${u.text}`)) out.push(`${rel} [${u.where}] ${u.text.slice(0, 140)}`);
    }));
    return out;
  };

  test('no "coming soon" anywhere', () => {
    expect(hits(/coming soon|coming (to|in) [^.]{0,40}\bsoon\b|\b(very|launching|available|arriving) soon\b|join the waitlist/i)).toEqual([]);
  });

  test('no TestFlight', () => {
    expect(hits(/test ?flight|beta (programme|program|testers?)/i)).toEqual([]);
  });

  test('copy says iPhone, not iOS, except in the policy\'s one legal sentence', () => {
    expect(hits(/\biOS\b/, { exempt: POLICY_PAGES.map((p) => `${p}|${KEYCHAIN}`) })).toEqual([]);
  });

  test('copy names both phones where it names one: no "Android only" or "iPhone only" app claim', () => {
    expect(hits(/\b(only (on|for) android|android[- ]only app|only (on|for) iphone|iphone[- ]only app)\b/i)).toEqual([]);
  });
});

describe('the support contact', () => {
  const mailtos = (rel) => S.readPage(rel).elements.filter((e) => e.name === 'a' && /^mailto:/i.test(e.attrs.href || '')).map((e) => e.attrs.href.replace(/^mailto:/i, '').split('?')[0].toLowerCase());
  const textEmails = (rel) => (S.bodyBlocks(S.readPage(rel)).join(' ').match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).map((m) => m.toLowerCase());

  test('is the owner\'s address on every page that is not a legal text', () => {
    const out = [];
    LIVE.filter((rel) => !LEGAL_PAGES.includes(rel)).forEach((rel) => {
      [...mailtos(rel), ...textEmails(rel)].filter((a) => a !== SUPPORT_EMAIL).forEach((a) => out.push(`${rel}: ${a}`));
    });
    expect(out).toEqual([]);
  });

  test('the legal texts keep their own address', () => {
    const out = [];
    LEGAL_PAGES.filter((rel) => !isStub(rel)).forEach((rel) => {
      [...mailtos(rel), ...textEmails(rel)].filter((a) => ![LEGAL_EMAIL, SUPPORT_EMAIL].includes(a)).forEach((a) => out.push(`${rel}: ${a}`));
      if (!mailtos(rel).includes(LEGAL_EMAIL)) out.push(`${rel}: lost its ${LEGAL_EMAIL} link`);
    });
    expect(out).toEqual([]);
  });

  test('the support page and every other indexable page that is not a legal text link the support address', () => {
    const missing = INDEXABLE.filter((rel) => !LEGAL_PAGES.includes(rel) && !mailtos(rel).includes(SUPPORT_EMAIL));
    expect(missing).toEqual([]);
  });
});
