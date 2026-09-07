/**
 * What this suite pins (blueprint sections 5.6, 8; SD-16):
 *
 *  - the two live addresses build in the query form the static site needs
 *    (`/u/?h=`, `/s/?id=`), web and app scheme alike;
 *  - build and parse round-trip, including a handle or id that needs
 *    percent-encoding;
 *  - the host is matched EXACTLY. A `startsWith` test would accept
 *    `volyume.app.attacker.example`, which is the house rule
 *    `authDeepLink.isVolyumeLink` already holds;
 *  - `p` (programme) still parses -- it now resolves to the Community Hub,
 *    never a programme page, since Community programme-sharing was
 *    removed entirely (`docs/community-product-audit-2026-09-07/
 *    40-GAP-CLOSURE.md` §2).
 */

const {
  WEB_ORIGIN, profileUrl, storyUrl,
  appProfileUrl, appStoryUrl, parseCommunityLink,
} = require('../links');

describe('building', () => {
  test('the web forms are the query shape the static site can serve', () => {
    expect(WEB_ORIGIN).toBe('https://volyume.app');
    expect(profileUrl('alex_lifts')).toBe('https://volyume.app/u/?h=alex_lifts');
    expect(storyUrl('def-456')).toBe('https://volyume.app/s/?id=def-456');
  });

  test('the app forms carry the same path and query on the volyume scheme', () => {
    expect(appProfileUrl('alex_lifts')).toBe('volyume://u/?h=alex_lifts');
    expect(appStoryUrl('def-456')).toBe('volyume://s/?id=def-456');
  });
});

describe('parsing', () => {
  test.each([
    ['profile', 'alex_lifts', profileUrl, 'handle'],
    ['story', 'def-456', storyUrl, 'id'],
  ])('%s round-trips through the web form', (kind, value, build, field) => {
    expect(parseCommunityLink(build(value))).toEqual({ kind, [field]: value });
  });

  test.each([
    ['profile', 'alex_lifts', appProfileUrl, 'handle'],
    ['story', 'def-456', appStoryUrl, 'id'],
  ])('%s round-trips through the app form', (kind, value, build, field) => {
    expect(parseCommunityLink(build(value))).toEqual({ kind, [field]: value });
  });

  test('a handle is lowercased on the way in', () => {
    expect(parseCommunityLink('https://volyume.app/u/?h=ALEX')).toEqual({ kind: 'profile', handle: 'alex' });
  });

  test('a p (programme) link opens the Community Hub, not a programme page', () => {
    expect(parseCommunityLink('https://volyume.app/p?id=x')).toEqual({ kind: 'hub' });
    expect(parseCommunityLink('https://volyume.app/p/?id=x')).toEqual({ kind: 'hub' });
    expect(parseCommunityLink('https://volyume.app/p/')).toEqual({ kind: 'hub' });
  });

  test('a look-alike host is refused, never prefix-matched', () => {
    expect(parseCommunityLink('https://volyume.app.attacker.example/p/?id=x')).toBeNull();
    expect(parseCommunityLink('https://notvolyume.app/p/?id=x')).toBeNull();
    expect(parseCommunityLink('https://evil.example/?next=https://volyume.app/p/?id=x')).toBeNull();
  });

  test('http is not https and is refused', () => {
    expect(parseCommunityLink('http://volyume.app/p/?id=x')).toBeNull();
  });

  test('a Community path with no value is not a link', () => {
    expect(parseCommunityLink('https://volyume.app/u/')).toBeNull();
  });

  test('other Volyume paths are not Community links', () => {
    expect(parseCommunityLink('https://volyume.app/partner/ABCDEF1234')).toBeNull();
    expect(parseCommunityLink('https://volyume.app/')).toBeNull();
  });

  test('rubbish input is null, not a throw', () => {
    expect(parseCommunityLink(null)).toBeNull();
    expect(parseCommunityLink('')).toBeNull();
    expect(parseCommunityLink('not a url')).toBeNull();
  });
});

// ─── The static pages, against the builders above ───────────────────────
//
// Added by the product-review fix pass 2026-09-06 (items 15 and 23). The
// "Open in Volyume" button on `public/u` and `public/s` used to emit
// `volyume://u?h=` while the app builds `volyume://u/?h=`, and the exact
// string was untested on both sides. The pages are read as text here, so a
// hand edit that drifts from the builder fails this suite. `public/p`
// carries no such assertion any more: the programme page is retired
// alongside programme-sharing.
describe('the static share pages emit exactly what links.js builds', () => {
  const fs = require('fs');
  const path = require('path');

  const PUBLIC = path.resolve(__dirname, '../../../../public');
  const page = (dir) => fs.readFileSync(path.join(PUBLIC, dir, 'index.html'), 'utf8');

  test.each([
    ['u', appProfileUrl(''), 'h'],
    ['s', appStoryUrl(''), 'id'],
  ])('public/%s opens the app on the builder form', (dir, built, param) => {
    // e.g. "volyume://u/?h=" — the trailing slash before the query is the
    // half that used to be missing.
    expect(built.endsWith(`?${param}=`)).toBe(true);
    expect(page(dir)).toContain(`'${built}' + encodeURIComponent(`);
  });
});
