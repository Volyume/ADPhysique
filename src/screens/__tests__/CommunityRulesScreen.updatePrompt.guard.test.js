/**
 * CommunityRulesScreen.updatePrompt.guard.test.js - D160 (migrate_175).
 *
 * The server's rules gate now tolerates an older client and records the
 * version actually accepted, so an old build keeps its profile and is asked
 * for the current rules on the acts that need them. The one thing such a
 * build cannot do is satisfy that ask by accepting the text it carries: the
 * server's version is ahead of it. Before this, the re-consent card offered
 * "Accept the updated rules", the accept succeeded (recorded at the old
 * version), the act was refused again, and the person looped.
 *
 * Written to FAIL if: the screen stops reading `me` for the server's
 * version; the update card is not gated on `rulesTextBehindServer(me)`; the
 * accept card is shown while behind; the update card carries an accept
 * button; the copy drifts (British English, no em dash, calm, no shame).
 *
 * Source guard: the screen pulls the navigation and native import graph.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'CommunityRulesScreen.js'), 'utf8');
// The constants are read from the source text (the screen module pulls the
// native import graph, which this guard deliberately does not load).
function constant(name) {
  const m = SRC.match(new RegExp(`export const ${name} = '((?:[^'\\\\]|\\\\.)*)';`));
  expect(m).not.toBeNull();
  return m[1];
}
const RULES_UPDATE_APP_HEADING = constant('RULES_UPDATE_APP_HEADING');
const RULES_UPDATE_APP_LINE = constant('RULES_UPDATE_APP_LINE');
const ACCEPT_UPDATED_RULES_LABEL = constant('ACCEPT_UPDATED_RULES_LABEL');

describe('the rules screen asks for an app update when the server is ahead of the text it carries', () => {
  test('the server version is read from `me` through the shared helper', () => {
    expect(SRC).toMatch(/import \{ COMMUNITY_RULES_VERSION, acceptRules, rulesTextBehindServer \} from '\.\.\/lib\/community';/);
    expect(SRC).toMatch(/import useCommunityMe from '\.\.\/hooks\/useCommunityMe';/);
    expect(SRC).toContain('const { me } = useCommunityMe();');
    expect(SRC).toContain('const behindServer = rulesTextBehindServer(me);');
  });

  test('exactly one of the two cards renders on the re-consent path, decided by behindServer', () => {
    expect(SRC).toContain('{mustAccept && !accepted && behindServer ? (');
    expect(SRC).toContain('{mustAccept && !accepted && !behindServer ? (');
    const updateCard = SRC.slice(
      SRC.indexOf('{mustAccept && !accepted && behindServer ? ('),
      SRC.indexOf('{mustAccept && !accepted && !behindServer ? ('),
    );
    expect(updateCard).toContain('{RULES_UPDATE_APP_HEADING}');
    expect(updateCard).toContain('{RULES_UPDATE_APP_LINE}');
    // No accept button on the update card: accepting the old text cannot
    // satisfy the server, and would loop.
    expect(updateCard).not.toMatch(/ACCEPT_UPDATED_RULES_LABEL|onPress=\{accept\}|<Button/);
  });

  test('the accept card is unchanged for the ordinary re-consent', () => {
    const acceptCard = SRC.slice(
      SRC.indexOf('{mustAccept && !accepted && !behindServer ? ('),
      SRC.indexOf('{text.intro}'),
    );
    expect(acceptCard).toContain('{RULES_OUTDATED_LINE}');
    expect(acceptCard).toContain('title={ACCEPT_UPDATED_RULES_LABEL}');
    expect(acceptCard).toContain('onPress={accept}');
    expect(ACCEPT_UPDATED_RULES_LABEL).toBe('Accept the updated rules');
  });

  test('the copy is calm British English and says the one honest action', () => {
    expect(RULES_UPDATE_APP_HEADING).toBe('Update Volyume to continue');
    expect(RULES_UPDATE_APP_LINE).toBe('The Community rules have changed and this version of Volyume does not carry the new text yet. Update Volyume from the store, then accept the rules here.');
    for (const s of [RULES_UPDATE_APP_HEADING, RULES_UPDATE_APP_LINE]) {
      expect(s).not.toContain('—');
      expect(s).not.toMatch(/must|fail|error|sorry|oops/i);
    }
  });
});
