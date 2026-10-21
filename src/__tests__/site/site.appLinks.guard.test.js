/**
 * volyume.app app-link guard: the files other systems depend on stay exactly
 * as they are, and every URL the app, the emails and the stores use keeps
 * working.
 *
 * Authority: docs/site-rebuild-2026-10/BRIEF.md ("Hosting and links":
 * /.well-known/assetlinks.json and /.well-known/apple-app-site-association
 * stay byte for byte, assetlinks is filled from secrets at deploy, .nojekyll
 * stays, the paths the app opens keep working: /partner, /u, /p, /s, /g/, /c/,
 * and 404.html's forwarding of /partner/CODE and /c/CODE; "Every URL that
 * exists today keeps working or redirects to its replacement") and
 * docs/site-rebuild-2026-10/SITE-INVENTORY.md section 3 (who depends on what).
 *
 * What this pins:
 *  1. assetlinks.json and apple-app-site-association are byte for byte what
 *     main holds today (sha-256 below). assetlinks keeps its two placeholder
 *     fingerprints, because the deploy workflow fills them from secrets and
 *     fails closed if one survives; the AASA keeps its app id and eight paths.
 *  2. public/.nojekyll (empty) and public/CNAME (volyume.app) are present and
 *     unchanged.
 *  3. The pages the app opens exist: /partner/, /u/, /p/, /s/, /g/, /c/, and
 *     the ones emails and the app link to: /challenge-terms/, /auth/confirm/,
 *     /auth/callback/, /email/preferences/, /email/unsubscribe/, /survey/,
 *     /members/.
 *  4. 404.html still forwards /partner/CODE to /partner/?c=CODE (upper-cased)
 *     and /c/CODE to /c/?code=code, and leaves every other path alone. The
 *     script is run here against a fake location, so a restyled 404 that loses
 *     the behaviour fails.
 *  5. Every file that an email, a store listing or an earlier page links to
 *     still resolves: the wordmark member emails embed, the favicon, the
 *     confirm-email script, the members script, the Markdown policy, /get/,
 *     and /privacy.html (which may be a redirect to /privacy/).
 *
 * Passing on the old pages today is the point: these pin what must NOT change.
 * They fail only if the rebuild moves or alters something other systems rely
 * on.
 */
'use strict';

const vm = require('vm');
const S = require('./siteScan');

// sha-256 of the files on main on 2026-10-21 (docs/site-rebuild-2026-10).
const PINNED = {
  '.well-known/assetlinks.json': '04c9f1c762d8910d8f7d24ad56c928b60de07e92ee9631a5e826ecf5b8d64af3',
  '.well-known/apple-app-site-association': '2a96267da4379141ac3232062d289863ec83660087188dfc26992f4135fb4c6c',
  '.nojekyll': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // the empty file
  CNAME: '742f5fe3955126ee8c14b6c19fb566310d6ffed5b749f54aaea58bc9798a0760',
};

describe('files that stay byte for byte', () => {
  test.each(Object.entries(PINNED))('%s', (rel, hash) => {
    expect(S.publicExists(rel)).toBe(true);
    expect(S.sha256(rel)).toBe(hash);
  });

  test('assetlinks.json still carries the two placeholders the deploy fills from secrets', () => {
    const text = S.readPublic('.well-known/assetlinks.json');
    expect(text).toContain('REPLACE_WITH_SHA256_OF_PLAY_APP_SIGNING_KEY_CERT');
    expect(text).toContain('REPLACE_WITH_SHA256_OF_UPLOAD_KEY_CERT');
    expect(JSON.parse(text)[0].target.package_name).toBe('app.volyume');
  });

  test('the association file keeps its app id and its eight paths', () => {
    const aasa = JSON.parse(S.readPublic('.well-known/apple-app-site-association'));
    expect(aasa.applinks.details[0].appID).toBe('K79JA5JUF8.app.volyume');
    expect(aasa.applinks.details[0].paths).toEqual(['/partner/*', '/auth/callback', '/auth/callback/', '/u/*', '/p/*', '/s/*', '/g/*', '/c/*']);
  });

  test('CNAME names the apex domain', () => {
    expect(S.readPublic('CNAME').trim()).toBe('volyume.app');
  });
});

describe('pages the app, emails and stores open', () => {
  test.each([
    ['/partner/', 'partner/index.html'], ['/u/', 'u/index.html'], ['/p/', 'p/index.html'], ['/s/', 's/index.html'],
    ['/g/', 'g/index.html'], ['/c/', 'c/index.html'], ['/challenge-terms/', 'challenge-terms/index.html'],
    ['/auth/confirm/', 'auth/confirm/index.html'], ['/auth/callback/', 'auth/callback/index.html'],
    ['/email/preferences/', 'email/preferences/index.html'], ['/email/unsubscribe/', 'email/unsubscribe/index.html'],
    ['/survey/', 'survey/index.html'], ['/members/', 'members/index.html'],
    ['/', 'index.html'], ['/support/', 'support/index.html'], ['/privacy/', 'privacy/index.html'], ['/404.html', '404.html'],
  ])('%s is served from %s', (url, file) => {
    expect(S.publicExists(file)).toBe(true);
    expect(S.urlOf(file)).toBe(url);
    expect(S.pathResolves(url)).toBe(true);
  });

  test('the Android app-link prefixes all land on a page', () => {
    // app.json: /c/, /g/, /p, /partner, /s, /u (campaign7.releaseConfig.test.js pins the set).
    ['/c/', '/g/', '/p/', '/partner/', '/s/', '/u/'].forEach((p) => expect({ p, ok: S.pathResolves(p) }).toEqual({ p, ok: true }));
  });
});

describe('404.html forwards the poster and invite links', () => {
  function forward(pathname) {
    const calls = [];
    const location = {
      pathname, search: '', hash: '', replace: (u) => calls.push(u), assign: (u) => calls.push(u),
      set href(u) { calls.push(u); },
      get href() { return `https://volyume.app${pathname}`; },
    };
    const ctx = vm.createContext({ location, window: { location }, document: {}, console });
    S.readPage('404.html').scripts.filter((s) => !s.attrs.src).forEach((s) => vm.runInContext(s.code, ctx));
    return calls;
  }

  test.each([
    ['/partner/ABCDEFGH23', ['/partner/?c=ABCDEFGH23']],
    ['/partner/abcdefgh23/', ['/partner/?c=ABCDEFGH23']],
    ['/c/volt-nov-3f9a1c2e', ['/c/?code=volt-nov-3f9a1c2e']],
    ['/c/ABC', ['/c/?code=abc']],
    ['/c/VOLT-Nov/', ['/c/?code=volt-nov']],
  ])('%s goes to the landing page', (pathname, expected) => {
    expect(forward(pathname)).toEqual(expected);
  });

  test.each(['/partner/short', '/c/ab', '/c/', '/partner/', '/anything/else', '/privacy/nope', '/u/nope'])('%s is left as a real 404', (pathname) => {
    expect(forward(pathname)).toEqual([]);
  });

  test('where it forwards to is a real page', () => {
    expect(S.pathResolves('/partner/')).toBe(true);
    expect(S.pathResolves('/c/')).toBe(true);
  });

  test('the 404 page itself is noindex and offers a way home', () => {
    const page = S.readPage('404.html');
    expect(page.metaContent('robots')).toMatch(/noindex/);
    expect(page.elements.some((e) => e.name === 'a' && e.attrs.href === '/')).toBe(true);
  });
});

describe('addresses other things link to keep working', () => {
  test.each([
    'volyume-wordmark.png', // member emails embed it (supabase/functions/_shared/memberEmail.ts WORDMARK_URL)
    'favicon.png',
    'auth/confirm/security.js', // the confirm-email page loads it
    'members/members.js', // the members page loads it
    'privacy-policy.md', // the Markdown source of the policy
    'get/index.html', // attribution links use /get?src=
    '.well-known/assetlinks.json',
    '.well-known/apple-app-site-association',
  ])('/%s is still served', (rel) => {
    expect(S.publicExists(rel)).toBe(true);
  });

  test('/privacy.html still works: a page, or a redirect to /privacy/', () => {
    expect(S.publicExists('privacy.html')).toBe(true);
  });
});
