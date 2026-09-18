/**
 * community.presentation.guard.test.js (communities revamp 2026-09-10:
 * `docs/communities-revamp-2026-09-10/21-PHASE1-SPEC.md` section 6 (a),
 * (b), (c) -- the lane brief scopes this new file to those three; (d) is
 * a property of `DayDots`/`AvatarStack` already covered by
 * `community.privacy.guard.test.js`'s walk of every file under
 * `src/components/community/`, and (e) is already pinned by
 * `rows.amber.guard.test.js` in that same folder's `__tests__`, so
 * neither is duplicated here. Authority for the rules themselves:
 * `20-BLUEPRINT.md` section 9's ten rules -- rule 1 ("Two prominent type
 * sizes per screen... No h1, h2 or h3 on any list screen; the one h3
 * allowed in Community is the not-joined hero on the Hub") and rule 2
 * ("No Card for people, groups, cohorts or activity... Card is allowed
 * only for the not-joined hero and the moderated-person notice").
 *
 * WHAT THIS SUITE PINS, and why it is written to fail rather than pass:
 * a source-level guard, not a rendered one, because the failure mode is
 * a future edit reaching for a bigger type role or a `Card` wrapper to
 * make one row "read better" on a screen the ten rules deliberately keep
 * flat -- a behavioural snapshot test would not catch that unless it
 * happened to render the exact branch that changed, and these four
 * screens have plenty of branches (joined/not-joined, member/non-member,
 * loading/error/empty) a snapshot would not all hit. Grepping the SOURCE
 * for every `type.*` / `<Card` / `SectionLabel` occurrence, after
 * stripping comments (the same `code()` stripper
 * `community.privacy.guard.test.js` and `rows.amber.guard.test.js` use,
 * so a rule NAMED in a comment -- this file's own header included -- is
 * never mistaken for a live use), pins each rule whether or not a test
 * happens to render the branch that would break it.
 *
 * (a) No `type.display`, `type.h1` or `type.h2` in any
 *     `src/screens/Community*.js`. `type.h3` is used on
 *     `CommunityHubScreen.js` ONLY (the not-joined hero title) and
 *     nowhere else.
 * (b) `<Card` appears at most twice in `CommunityHubScreen.js` (the
 *     not-joined hero and the legacy partner card; the moderated-person
 *     notice is a plain styled `View`, not the `Card` component, so it
 *     never counted against this even before the revamp) and not at all
 *     in `CommunityDimensionScreen.js`, `CommunityGroupScreen.js`,
 *     `CommunityProfileScreen.js`.
 * (c) None of those same four screens imports `SectionLabel` (`Eyebrow`
 *     replaces it there). `SectionLabel` stays in place everywhere else
 *     in Community -- `CommunityBoardScreen.js` included, unchanged by
 *     this phase -- so the walk here is exactly those four files, not
 *     every Community screen.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SCREENS_DIR = path.join(ROOT, 'src/screens');

const HUB = path.join(SCREENS_DIR, 'CommunityHubScreen.js');
const FOUR_REVAMPED_NAMES = [
  'CommunityHubScreen.js',
  'CommunityDimensionScreen.js',
  'CommunityGroupScreen.js',
  'CommunityProfileScreen.js',
];
const FOUR_REVAMPED = FOUR_REVAMPED_NAMES.map((f) => path.join(SCREENS_DIR, f));

/** Strip block and line comments so a rule NAMED in a comment (this file
 * is full of them, and so is the source) is never mistaken for a live
 * use. Identical to `community.privacy.guard.test.js`'s stripper, for
 * the same reason. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function communityScreenFiles() {
  return fs.readdirSync(SCREENS_DIR)
    .filter((f) => /^Community.*\.js$/.test(f))
    .map((f) => path.join(SCREENS_DIR, f));
}

describe('presentation law (a): no display/h1/h2 anywhere in Community, h3 only on the Hub', () => {
  test('there is Community screen source to guard', () => {
    // If this ever fails, the guard has quietly stopped guarding
    // anything (a folder rename, a moved file) rather than passing.
    expect(communityScreenFiles().length).toBeGreaterThan(10);
  });

  test.each(communityScreenFiles().map((f) => [path.relative(ROOT, f), f]))(
    '%s never uses type.display, type.h1 or type.h2',
    (rel, full) => {
      const source = code(fs.readFileSync(full, 'utf8'));
      for (const pattern of [/\btype\.display\b/, /\btype\.h1\b/, /\btype\.h2\b/]) {
        expect({ rel, pattern: String(pattern), matched: pattern.test(source) })
          .toEqual({ rel, pattern: String(pattern), matched: false });
      }
    },
  );

  test.each(communityScreenFiles().filter((f) => f !== HUB).map((f) => [path.relative(ROOT, f), f]))(
    '%s never uses type.h3 (reserved for the Hub\'s not-joined hero)',
    (rel, full) => {
      const source = code(fs.readFileSync(full, 'utf8'));
      expect({ rel, matched: /\btype\.h3\b/.test(source) }).toEqual({ rel, matched: false });
    },
  );

  test('CommunityHubScreen.js is the one screen that does use type.h3, for the not-joined hero', () => {
    const source = code(fs.readFileSync(HUB, 'utf8'));
    expect(/\btype\.h3\b/.test(source)).toBe(true);
  });
});

describe('presentation law (b): <Card is capped on the Hub and banned on the other three revamped screens', () => {
  function cardCount(full) {
    const source = code(fs.readFileSync(full, 'utf8'));
    const matches = source.match(/<Card\b/g);
    return matches ? matches.length : 0;
  }

  test('CommunityHubScreen.js uses <Card at most twice (the not-joined hero and the legacy partner card)', () => {
    expect(cardCount(HUB)).toBeLessThanOrEqual(2);
  });

  test.each(FOUR_REVAMPED_NAMES.filter((f) => f !== 'CommunityHubScreen.js'))(
    '%s never uses <Card',
    (name) => {
      expect(cardCount(path.join(SCREENS_DIR, name))).toBe(0);
    },
  );
});

describe('presentation law (c): SectionLabel is retired from the four revamped screens only', () => {
  const SECTION_LABEL_IMPORT = /from ['"][^'"]*\/SectionLabel['"]/;

  test.each(FOUR_REVAMPED.map((f) => [path.relative(ROOT, f), f]))(
    '%s never imports SectionLabel',
    (rel, full) => {
      const source = code(fs.readFileSync(full, 'utf8'));
      expect({ rel, matched: SECTION_LABEL_IMPORT.test(source) }).toEqual({ rel, matched: false });
    },
  );

  test('CommunityBoardScreen.js still imports SectionLabel (unchanged by this phase)', () => {
    const source = code(fs.readFileSync(path.join(SCREENS_DIR, 'CommunityBoardScreen.js'), 'utf8'));
    expect(SECTION_LABEL_IMPORT.test(source)).toBe(true);
  });
});
