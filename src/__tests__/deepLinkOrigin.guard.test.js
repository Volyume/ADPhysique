/**
 * A deep link's host is a host, not a string prefix (adversarial audit
 * 2026-08-26, finding 18).
 *
 * THE DEFECT. handleAuthDeepLink admitted any URL matching
 * `url.startsWith('https://volyume.app')`. A prefix test treats the boundary
 * between host and path as if it were part of the string, and it is not, so
 * that also accepts https://volyume.app.evil.com and https://volyume.appXYZ —
 * both attacker-controlled hosts, feeding a handler that calls
 * supabase.auth.setSession.
 *
 * WHAT IT IS AND IS NOT. Nothing routes such a URL to the app today: the
 * Android App Link filter is scoped to host volyume.app with pathPrefix
 * /partner, and iOS declares no associatedDomains at all, so https links never
 * reach the app there. This is a latent footgun, one config change from being a
 * live hole, and an exact host comparison costs nothing. Recording the
 * difference rather than dressing it up.
 *
 * THE PART THAT IS STILL OPEN, AND IS THE FOUNDER'S CALL. Any installed app can
 * send volyume://#access_token=...&refresh_token=..., and the implicit-flow
 * branch will adopt whatever session it carries. An attacker with a real
 * session of their own can sign a victim's device into their account and
 * collect whatever the user logs next. The shape check below stops malformed
 * input reaching setSession; it does not stop that, and these tests say so
 * rather than implying the hole is closed. The real fix is dropping the
 * implicit fallback for PKCE alone, which the client already defaults to, and
 * that could affect email verification depending on the project's email
 * templates.
 */

const fs = require('fs');
const path = require('path');

const APP = fs.readFileSync(path.join(__dirname, '..', '..', 'App.js'), 'utf8');
const code = APP.split('\n')
  .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
  .join('\n');

/** The real predicate, lifted out so its behaviour is tested, not its text. */
function isVolyumeLink(url) {
  const s = String(url ?? '');
  if (s.startsWith('volyume://')) return true;
  const m = /^https:\/\/([^/?#]+)/i.exec(s);
  return !!m && m[1].toLowerCase() === 'volyume.app';
}

function looksLikeJwt(token) {
  return typeof token === 'string'
    && token.length >= 20 && token.length <= 8192
    && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
}

describe('the predicate in App.js is the one tested here', () => {
  test('its source matches the copy below, so these tests are not about a fiction', () => {
    expect(code).toMatch(/const m = \/\^https:\\\/\\\/\(\[\^\/\?#\]\+\)\/i\.exec\(s\);/);
    expect(code).toMatch(/m\[1\]\.toLowerCase\(\) === 'volyume\.app'/);
  });

  test('the old prefix test is gone', () => {
    expect(code).not.toMatch(/url\.startsWith\('https:\/\/volyume\.app'\)/);
  });
});

describe('hosts that are not ours are refused', () => {
  test.each([
    ['https://volyume.app.evil.com/#access_token=x', 'a subdomain suffix'],
    ['https://volyume.appevil.com/', 'no delimiter at all'],
    ['https://volyume.app.co/', 'a different TLD'],
    ['https://notvolyume.app/', 'a prefixed host'],
    ['https://evil.com/?volyume.app', 'ours only in the query'],
    ['https://evil.com/#https://volyume.app', 'ours only in the fragment'],
    ['http://volyume.app/', 'plain http, which we never issue'],
    ['https://volyume.app:8443/', 'a port we do not use'],
    ['https://user@volyume.app/', 'a userinfo prefix'],
  ])('%s (%s)', (url) => {
    expect(isVolyumeLink(url)).toBe(false);
  });
});

describe('our own links still work', () => {
  test.each([
    'volyume://',
    'volyume://?code=abc123',
    'volyume://#access_token=a.b.c&refresh_token=d.e.f',
    'volyume://partner/invite/xyz',
    'https://volyume.app/partner/invite/xyz',
    'https://VOLYUME.APP/partner/invite/xyz',
    'https://volyume.app?code=abc',
    'https://volyume.app#fragment',
  ])('%s', (url) => {
    expect(isVolyumeLink(url)).toBe(true);
  });

  test('nothing at all is refused rather than throwing', () => {
    expect(isVolyumeLink(null)).toBe(false);
    expect(isVolyumeLink(undefined)).toBe(false);
    expect(isVolyumeLink('')).toBe(false);
    expect(isVolyumeLink(12345)).toBe(false);
  });
});

describe('the implicit-flow branch checks the token shape', () => {
  test('a real JWT shape passes', () => {
    expect(looksLikeJwt('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghijk')).toBe(true);
  });

  test.each([
    ['', 'empty'],
    ['short.a.b', 'too short to be a token'],
    ['notajwt', 'no segments'],
    ['a.b', 'two segments'],
    ['a.b.c.d', 'four segments'],
    ['aaaaaaaaaaaaaaaaaaaaaa.bbbb.<script>', 'markup in the signature'],
    ['aaaaaaaaaaaaaaaaaaaaaa.bbbb.cc dd', 'whitespace'],
    [`a${'x'.repeat(9000)}.b.c`, 'absurdly long'],
  ])('%s (%s) is refused', (token) => {
    expect(looksLikeJwt(token)).toBe(false);
  });

  test.each([null, undefined, 42, {}, []])('%p is refused', (token) => {
    expect(looksLikeJwt(token)).toBe(false);
  });

  test('the handler refuses and reports rather than calling setSession', () => {
    const branch = code.slice(code.indexOf('if (params.access_token && params.refresh_token)'));
    const check = branch.indexOf('!looksLikeJwt(params.access_token)');
    const setSession = branch.indexOf('supabase.auth.setSession');
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(setSession);
    expect(branch).toMatch(/logError\('auth\.deepLink\.malformedTokens'/);
  });

  test('adopting a session from a link leaves a breadcrumb', () => {
    // It used to be entirely silent, so a fixation attempt left no trace at all.
    expect(code).toMatch(/logInfo\('auth\.deepLink\.implicitSession'/);
  });
});

describe('the residual risk is written down where the code is, not just here', () => {
  test('the source says the shape check is not a security boundary', () => {
    // A future reader must not mistake this for the hole being closed.
    expect(APP).toMatch(/SHAPE check, not a security boundary/);
  });

  test('and names the actual fix and why it is not taken unilaterally', () => {
    expect(APP).toMatch(/dropping the\n\s*\/\/ implicit fallback and relying on PKCE alone/);
    expect(APP).toMatch(/founder call/);
  });
});

describe('PKCE remains the primary path', () => {
  test('the code exchange is tried before the implicit fallback', () => {
    const pkce = code.indexOf('exchangeCodeForSession');
    const implicit = code.indexOf("fragment.includes('access_token')");
    expect(pkce).toBeGreaterThan(-1);
    expect(pkce).toBeLessThan(implicit);
  });

  test('a link carrying a code returns without reaching the fallback', () => {
    const between = code.slice(code.indexOf('exchangeCodeForSession'), code.indexOf("fragment.includes('access_token')"));
    expect(between).toMatch(/return;/);
  });
});
