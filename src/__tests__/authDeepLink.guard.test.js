const fs = require('fs');
const path = require('path');

const APP = fs.readFileSync(path.resolve(__dirname, '../../App.js'), 'utf8');
const HANDLER = fs.readFileSync(path.resolve(__dirname, '../lib/authDeepLink.js'), 'utf8');

describe('auth callback failures stay visible and the production handler stays wired', () => {
  test('App delegates to the hardened module and supplies the notifier', () => {
    expect(APP).toMatch(/require\('\.\/src\/lib\/authDeepLink'\)/);
    expect(APP).toMatch(/handleAuthDeepLink\(url, \{ supabase, notifyAuthLinkFailed \}\)/);
  });

  test('all three exchange mechanisms handle returned errors', () => {
    expect(HANDLER).toMatch(/verifyOtp[\s\S]*if \(error\) throw error/);
    expect(HANDLER).toMatch(/exchangeCodeForSession[\s\S]*if \(error\) throw error/);
    expect(HANDLER).toMatch(/setSession[\s\S]*if \(error\) throw error/);
  });

  test('the notifier shows a user-facing Alert', () => {
    expect(APP.slice(APP.indexOf('function notifyAuthLinkFailed'))).toMatch(/Alert\.alert\s*\(/);
  });
});
