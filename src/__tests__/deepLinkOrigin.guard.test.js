const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(path.resolve(__dirname, '../lib/authDeepLink.js'), 'utf8');

describe('deep-link origin and implicit callback source guards', () => {
  test('HTTPS callbacks require the exact Volyume host', () => {
    expect(SOURCE).toMatch(/m\[1\]\.toLowerCase\(\) === 'volyume\.app'/);
    expect(SOURCE).not.toMatch(/startsWith\('https:\/\/volyume\.app'\)/);
  });

  test('server token validation and identity binding precede setSession', () => {
    const getUser = SOURCE.indexOf('auth.getUser(params.access_token)');
    const identity = SOURCE.indexOf('auth.deepLink.identityMismatch');
    const setSession = SOURCE.indexOf('auth.setSession');
    expect(getUser).toBeGreaterThan(-1);
    expect(identity).toBeGreaterThan(getUser);
    expect(setSession).toBeGreaterThan(identity);
  });

  test('refresh tokens are treated as opaque credentials, not JWTs', () => {
    expect(SOURCE).toMatch(/Supabase refresh tokens are opaque strings/);
    expect(SOURCE).toMatch(/looksLikeRefreshToken\(params\.refresh_token\)/);
  });
});
