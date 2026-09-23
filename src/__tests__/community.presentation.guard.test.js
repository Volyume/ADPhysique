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
 * (d) RE-ANCHORED 2026-09-23 (founder order 2026-09-22 item 8, Q6
 *     recommendation, Part E): the `title` type role (17, `fontSize.lg`)
 *     is reserved for the ONE figure per screen that reads as the
 *     screen's result. It is used exactly once in `PersonRow.js` (the
 *     Hub's You-row metric, via `metricRole="title"`) and exactly once
 *     in `ProgressStrip.js` (the leading cell, "sessions this week"),
 *     never in any `src/screens/Community*.js` and never in any other
 *     file under `src/components/community/`; `metricRole="title"` is
 *     passed exactly once across `src/screens` and `src/components`, on
 *     `CommunityHubScreen.js`'s You row only.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SCREENS_DIR = path.join(ROOT, 'src/screens');
const COMPONENTS_DIR = path.join(ROOT, 'src/components');
const COMPONENTS_COMMUNITY_DIR = path.join(COMPONENTS_DIR, 'community');

const HUB = path.join(SCREENS_DIR, 'CommunityHubScreen.js');
const FOUR_REVAMPED_NAMES = [
  'CommunityHubScreen.js',
  'CommunityDimensionScreen.js',
  'CommunityGroupScreen.js',
  'CommunityProfileScreen.js',
];
const FOUR_REVAMPED = FOUR_REVAMPED_NAMES.map((f) => path.join(SCREENS_DIR, f));
const PERSON_ROW = path.join(COMPONENTS_COMMUNITY_DIR, 'PersonRow.js');
const PROGRESS_STRIP = path.join(COMPONENTS_COMMUNITY_DIR, 'ProgressStrip.js');

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

/** Every top-level file under `components/community/` (no subdirectory
 * there but `__tests__`, already excluded by the `.js`-only filter). */
function communityComponentFiles() {
  return fs.readdirSync(COMPONENTS_COMMUNITY_DIR)
    .filter((f) => f.endsWith('.js'))
    .map((f) => path.join(COMPONENTS_COMMUNITY_DIR, f));
}

/** Every `.js` file under `dir`, recursively, `__tests__` excluded --
 * rule (d)'s `metricRole="title"` census walks the whole of
 * `src/screens` and `src/components`, not just the Community corner of
 * each, since a stray second use anywhere in either tree would still
 * break the "one figure, one screen" rule. Same convention
 * `community.privacy.guard.test.js`'s own `walk()` uses. */
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : walk(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
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

// RE-ANCHORED 2026-09-23 (founder order 2026-09-22 item 8, Q6
// recommendation, Part E): rule (d), the `title` type role's own cap.
describe('presentation law (d): the title type role is reserved for one figure per screen', () => {
  /** How many call sites in `source` elevate to the `title` role: either
   * `num(...)` with a 'title' literal anywhere in its argument list (one
   * match per CALL, however many quoted 'title's that call's own text
   * happens to contain -- `num(metricRole === 'title' ? 'title' :
   * 'label')` is ONE call, not two), or a direct `type.title` /
   * `t.type.title` property access with no `num()` at all. */
  function titleRoleCount(source) {
    const numTitle = source.match(/\bnum\([^)]*['"]title['"]/g) || [];
    const directTitle = source.match(/\btype\.title\b/g) || [];
    return numTitle.length + directTitle.length;
  }

  test('PersonRow.js uses the title role exactly once (the Hub\'s You-row metric)', () => {
    const source = code(fs.readFileSync(PERSON_ROW, 'utf8'));
    expect(titleRoleCount(source)).toBe(1);
  });

  test('ProgressStrip.js uses the title role exactly once (the leading cell)', () => {
    const source = code(fs.readFileSync(PROGRESS_STRIP, 'utf8'));
    expect(titleRoleCount(source)).toBe(1);
  });

  test.each(communityScreenFiles().map((f) => [path.relative(ROOT, f), f]))(
    '%s never uses the title role',
    (rel, full) => {
      const source = code(fs.readFileSync(full, 'utf8'));
      expect({ rel, count: titleRoleCount(source) }).toEqual({ rel, count: 0 });
    },
  );

  test.each(
    communityComponentFiles()
      .filter((f) => f !== PERSON_ROW && f !== PROGRESS_STRIP)
      .map((f) => [path.relative(ROOT, f), f]),
  )(
    '%s never uses the title role',
    (rel, full) => {
      const source = code(fs.readFileSync(full, 'utf8'));
      expect({ rel, count: titleRoleCount(source) }).toEqual({ rel, count: 0 });
    },
  );

  test('metricRole="title" is passed exactly once across src/screens and src/components, on CommunityHubScreen.js', () => {
    const files = [...walk(SCREENS_DIR), ...walk(COMPONENTS_DIR)];
    // Sanity floor so a rename/move that quietly shrank the walk to
    // near-nothing fails honestly rather than passing by starvation.
    expect(files.length).toBeGreaterThan(100);
    const hits = files.flatMap((full) => {
      const source = code(fs.readFileSync(full, 'utf8'));
      const matches = source.match(/\bmetricRole\s*=\s*"title"/g) || [];
      return matches.map(() => path.relative(ROOT, full));
    });
    expect(hits).toEqual([path.relative(ROOT, HUB)]);
  });
});
