/**
 * A2-004 regression guard: the two auth-callback exchange paths in
 * App.js (PKCE `exchangeCodeForSession` and implicit `setSession`) used
 * to swallow failures in empty `catch (_) {}` blocks, so a tapped email
 * link that failed (expired/used code, network drop) left the user
 * staring at an app that did nothing, with no reason given.
 *
 * Both catch sites must now surface the failure to the user. App.js is
 * not importable under this jest config (no native-module mocks; the
 * module graph won't evaluate), so this is a source-level guard in the
 * same style as the sync-trigger guards in sync.runner.triggers.test.js.
 */

const fs = require('fs');
const path = require('path');

const APP = fs.readFileSync(path.resolve(__dirname, '../../App.js'), 'utf8');

const handlerStart = APP.indexOf('async function handleAuthDeepLink');
const handlerEnd = APP.indexOf('const CRASH_LOG_KEY');
const handlerBody = APP.slice(handlerStart, handlerEnd);

describe('A2-004 auth deep-link failures are surfaced to the user', () => {
  test('the handler body is located', () => {
    expect(handlerStart).toBeGreaterThan(-1);
    expect(handlerEnd).toBeGreaterThan(handlerStart);
  });

  test('there are no bare empty catches left in the handler', () => {
    // The previous code had `catch (_) {}` on both exchange calls. A
    // populated catch (whitespace/newline + a statement) is required.
    expect(handlerBody).not.toMatch(/catch\s*\(\s*_\s*\)\s*\{\s*\}/);
  });

  test('both exchange paths route their failure through the notifier', () => {
    // notifyAuthLinkFailed() should appear twice: once for the PKCE
    // exchangeCodeForSession catch, once for the implicit setSession catch.
    const calls = handlerBody.match(/notifyAuthLinkFailed\s*\(\s*\)/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  test('the notifier shows a user-facing Alert', () => {
    const notifierStart = APP.indexOf('function notifyAuthLinkFailed');
    expect(notifierStart).toBeGreaterThan(-1);
    const notifierBody = APP.slice(notifierStart, handlerStart);
    expect(notifierBody).toMatch(/Alert\.alert\s*\(/);
  });
});
