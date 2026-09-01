const fs = require('fs');
const path = require('path');

const ROOT = fs.readFileSync(path.resolve(__dirname, '../RootNavigator.js'), 'utf8');

describe('RootNavigator account admission is a single publication boundary', () => {
  test('cold-start getSession preflights before publishing user or session', () => {
    const coldStart = ROOT.slice(
      ROOT.indexOf("const { data: { session } } = await client.auth.getSession()"),
      ROOT.indexOf('// No cloud session.'),
    );
    expect(coldStart).toMatch(
      /preflightIncomingSession\(client, session\)[\s\S]*if \(!admission\.ok\) return;[\s\S]*setSession\(session\)[\s\S]*setUser\(session\.user\)/,
    );
  });

  test('every auth event carrying a session preflights before publication', () => {
    const listener = ROOT.slice(ROOT.indexOf('client.auth.onAuthStateChange'));
    expect(listener).toMatch(
      /if \(session\?\.user\?\.id\) \{[\s\S]*preflightIncomingSession\(client, session\)[\s\S]*if \(!admission\.ok\) return;[\s\S]*setSession\(session\)[\s\S]*setUser\(session\?\.user \?\? null\)/,
    );
    expect(listener).not.toMatch(/if \(isAuthEnter\) \{[\s\S]{0,200}prepareIncomingAccount/);
  });

  test('SIGNED_OUT invalidates pending callback state before later auth events', () => {
    expect(ROOT).toMatch(
      /if \(event === 'SIGNED_OUT'\) \{[\s\S]*authCallbackState'\)\.clearAuthFlow\(\)/,
    );
  });

  test('the shared boundary verifies first-account residue and wipes all account state', () => {
    const admission = ROOT.slice(
      ROOT.indexOf('async function preflightIncomingSession'),
      ROOT.indexOf('async function bootstrap'),
    );
    expect(admission).toContain('verifyNoForeignLocalData(uid)');
    expect(admission).toContain('whenSyncIdle({ timeoutMs: 5000 })');
    expect(admission).toContain('wipeScheduledNotificationsWithRetry()');
    expect(admission).toContain('wipeAllUserDataWithRetry(uid)');
    expect(admission).toContain('wipeAsyncStorageWithRetry()');
    expect(admission).toContain('resetAccountMemoryForTransition()');
    expect(admission).toContain('validatePendingAuthCallbackAdmission(session.user)');
  });
});
