/**
 * community.copy.guard.test.js -- communities revamp 2026-09-10
 * (`docs/communities-revamp-2026-09-10/20-BLUEPRINT.md` section 10, CR-11;
 * `README.md`: "the app must never explain Community as programme or
 * routine sharing anywhere").
 *
 * WHAT THIS SUITE PINS, and why it is written to fail rather than to
 * pass: Community is never a place to share plans, programmes or
 * routines -- Volyume builds each person's plan. The failure mode is a
 * future string added to a Community screen or component that slips
 * back into that framing: a re-added door, a label copied from the old
 * rules text, a moderator screen's kind map growing a stale entry back.
 * A behavioural test only covers a screen that is actually mounted in
 * that test; this covers every string literal in the file, mounted or
 * not, the same source-level convention `community.privacy.guard.test.js`
 * and `community.rpcOnly.guard.test.js` already use (CLAUDE.md section 3:
 * "Source-level regression guards... lock founder rules").
 *
 * Comments are stripped before the scan. The module this guard exists to
 * catch a regression of legitimately DISCUSSES the retired feature in
 * prose -- "the 'programme' story kind is retired" is history, not
 * residue, and lives in a comment for exactly that reason. A string a
 * user or a moderator could actually read still fails, because none of
 * that lives inside a comment.
 *
 * Positive pins, so the guard cannot be satisfied by deleting all the
 * copy instead of correcting it: the intro card still says what
 * Community is FOR, the Rules screen still opens with the founder's own
 * definition, and the rules version has moved past the pre-revamp text
 * (version 2) so the existing updated-rules acceptance path shows it.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SCREENS_DIR = path.join(ROOT, 'src/screens');
const COMPONENTS_COMMUNITY_DIR = path.join(ROOT, 'src/components/community');
const INTRO_CARD = path.join(ROOT, 'src/components/HomeCommunityIntroCard.js');
const RULES_SCREEN = path.join(ROOT, 'src/screens/CommunityRulesScreen.js');
const LIMITS_FILE = path.join(ROOT, 'src/lib/community/limits.js');

/** Strip block and line comments so a rule NAMED or EXPLAINED in a
 * comment (this file is full of them, and so is the source) is never
 * mistaken for live copy. Identical to the stripper
 * `community.privacy.guard.test.js` uses, for the same reason. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Every quoted string's CONTENT (single, double, template), in the
 * order it appears. Call this AFTER `code()`, or a `//` inside a
 * comment's own prose could be misread as starting one. */
function stringLiterals(source) {
  const out = [];
  const re = /'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|`((?:\\.|[^`\\])*)`/g;
  let m = re.exec(source);
  while (m) {
    out.push(m[1] ?? m[2] ?? m[3] ?? '');
    m = re.exec(source);
  }
  return out;
}

/**
 * The three sites the founder named: every `Community*.js` screen, every
 * component under `components/community/`, and the intro card by its own
 * path (it lives one level up, named for what it is rather than for
 * Community). Both directories are read top-level only -- neither has a
 * subdirectory but `__tests__`, and a `.js`-only filter already leaves
 * that out.
 */
function targetFiles() {
  const screens = fs.readdirSync(SCREENS_DIR)
    .filter((f) => /^Community.*\.js$/.test(f))
    .map((f) => path.join(SCREENS_DIR, f));
  const components = fs.readdirSync(COMPONENTS_COMMUNITY_DIR)
    .filter((f) => f.endsWith('.js'))
    .map((f) => path.join(COMPONENTS_COMMUNITY_DIR, f));
  return [...screens, ...components, INTRO_CARD];
}

describe('no Community copy explains programme, plan or routine sharing', () => {
  test('there is Community copy to guard', () => {
    // If this ever falls near zero, the guard has quietly stopped
    // guarding anything (a folder rename, a moved file) rather than
    // passing honestly.
    expect(targetFiles().length).toBeGreaterThan(20);
  });

  test.each(targetFiles().map((f) => [path.relative(ROOT, f), f]))(
    '%s carries no "programme" string literal',
    (rel, full) => {
      const source = code(fs.readFileSync(full, 'utf8'));
      const hits = stringLiterals(source).filter((s) => /programme/i.test(s));
      expect({ rel, hits }).toEqual({ rel, hits: [] });
    },
  );
});

describe('the founder\'s definition is actually in place', () => {
  test('the Today intro card leads with connecting and respect', () => {
    const source = code(fs.readFileSync(INTRO_CARD, 'utf8'));
    const literals = stringLiterals(source);
    expect(literals.some((s) => /give respect/i.test(s))).toBe(true);
  });

  test('the Rules screen opens with "connect with people at your gym"', () => {
    const source = code(fs.readFileSync(RULES_SCREEN, 'utf8'));
    const literals = stringLiterals(source);
    expect(literals.some((s) => /connect with people at your gym/i.test(s))).toBe(true);
  });

  test('the rules version has moved past the pre-revamp text (version 2)', () => {
    const source = fs.readFileSync(LIMITS_FILE, 'utf8');
    const m = /export const COMMUNITY_RULES_VERSION = (\d+);/.exec(source);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeGreaterThanOrEqual(3);
  });
});
