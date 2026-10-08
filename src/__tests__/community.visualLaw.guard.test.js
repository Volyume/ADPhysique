/**
 * community.visualLaw.guard.test.js (D221 ruling 7; `13-VISUAL-LAW.md`).
 *
 * WHAT THIS SUITE PINS, and why it is written to fail: the Community visual
 * law is a set of source-level facts a future edit could quietly undo, so
 * each is read from the SOURCE (comments stripped, so a rule named in a
 * docblock is never read as a use):
 *
 *  - V2: `Eyebrow` is gone from Community and `SectionLabel` is gone from
 *    every screen converted to bands; each converted screen carries the
 *    `SectionHeader` for each section it has.
 *  - V10: the square `SkeletonRow` is banned in Community; a converted
 *    screen loads with `SkeletonPersonRow` / `SkeletonPostRow`.
 *  - V1/V3: no `Card` wraps a `PersonRow`, `GroupRow` or `PostRow`; a
 *    converted screen builds its content from `Band`, and its rows are
 *    `inBand`.
 *  - V8: header glyphs are `HeaderGlyph` (textPrimary, no container), at most
 *    two on a pushed screen.
 *  - Tokens only: no literal `fontSize`, `fontWeight` or hex colour in any
 *    `src/screens/Community*.js` or `src/components/community/*.js`.
 *  - D188 / V12: the origin-aware zoom is registered on the three
 *    destinations and the rows thread `onPressWithLayout`.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SCREENS_DIR = path.join(ROOT, 'src/screens');
const COMPONENTS_DIR = path.join(ROOT, 'src/components/community');

function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}
const read = (full) => code(fs.readFileSync(full, 'utf8'));

const SCREENS = fs.readdirSync(SCREENS_DIR).filter((f) => /^Community.*Screen\.js$/.test(f))
  .map((f) => path.join(SCREENS_DIR, f));
const COMPONENTS = fs.readdirSync(COMPONENTS_DIR).filter((f) => f.endsWith('.js'))
  .map((f) => path.join(COMPONENTS_DIR, f));
const ALL = [...SCREENS, ...COMPONENTS];
const rel = (f) => path.relative(ROOT, f);

// Lane 2A: the list and detail screens converted to bands, and the section
// titles each must carry.
const CONVERTED = {
  'CommunityProfileScreen.js': ['Activity'],
  'CommunityPostScreen.js': ['Comments'],
  'CommunityGroupScreen.js': ['Members', 'Activity'],
  'CommunityDimensionScreen.js': ['People', 'Recent'],
  'CommunityActivityScreen.js': ['Connection requests', 'Follow requests', 'Activity'],
  'CommunityBoardScreen.js': ['boardLabel'],
  'CommunityFollowersScreen.js': [],
  'CommunityConnectionsScreen.js': [],
  'CommunityConversationsScreen.js': [],
  'CommunitySearchScreen.js': ['Recent searches'],
  'CommunityPeopleListScreen.js': ['More people on Volyume'],
  'CommunityFindPeopleScreen.js': [],
  'CommunityGroupMembersScreen.js': ['Members'],
};
const convertedPath = (f) => path.join(SCREENS_DIR, f);

describe('the law holds across Community', () => {
  test('there is source to guard', () => {
    expect(SCREENS.length).toBeGreaterThan(20);
    expect(COMPONENTS.length).toBeGreaterThan(30);
  });

  // Screens owned by lane 2B (do-not-touch in lane 2A): their square
  // SkeletonRow is converted there, and this entry is then deleted.
  const PENDING_2B = [
    'CommunityEditProfileScreen.js', 'CommunityPrivacyScreen.js', 'CommunityTrainingProfileScreen.js',
  ];

  test.each(ALL.map((f) => [rel(f), f]))('%s has no Eyebrow and no square SkeletonRow', (r, f) => {
    const src = read(f);
    expect({ r, eyebrow: /\bEyebrow\b/.test(src) }).toEqual({ r, eyebrow: false });
    if (PENDING_2B.includes(path.basename(f))) return;
    expect({ r, square: /\bSkeletonRow\b/.test(src) }).toEqual({ r, square: false });
  });

  test.each(ALL.map((f) => [rel(f), f]))('%s has no literal fontSize, fontWeight or hex', (r, f) => {
    const src = read(f);
    expect({ r, size: /\bfontSize\s*:\s*\d/.test(src) }).toEqual({ r, size: false });
    expect({ r, weight: /\bfontWeight\s*:\s*['"\d]/.test(src) }).toEqual({ r, weight: false });
    expect({ r, hex: /['"`]#[0-9a-fA-F]{3,8}['"`]/.test(src) }).toEqual({ r, hex: false });
  });

  test.each(ALL.map((f) => [rel(f), f]))('%s never wraps a PersonRow, GroupRow or PostRow in a Card', (r, f) => {
    const src = read(f);
    const spans = src.match(/<Card\b[\s\S]*?<\/Card>/g) || [];
    const bad = spans.filter((s) => /<(PersonRow|GroupRow|PostRow|ProfileCard)\b/.test(s));
    expect({ r, bad: bad.length }).toEqual({ r, bad: 0 });
  });
});

describe('the converted screens follow V1, V2, V8, V10', () => {
  const names = Object.keys(CONVERTED);

  test.each(names)('%s has no SectionLabel and builds on Band', (name) => {
    const src = read(convertedPath(name));
    expect({ name, label: /\bSectionLabel\b/.test(src) }).toEqual({ name, label: false });
    expect({ name, band: /from '\.\.\/components\/community\/Band'/.test(src) }).toEqual({ name, band: true });
  });

  test.each(names)('%s carries a SectionHeader for each section', (name) => {
    const src = read(convertedPath(name));
    for (const title of CONVERTED[name]) {
      const hit = title === 'boardLabel'
        ? /<SectionHeader title=\{boardLabel\}/.test(src)
        : new RegExp(`<SectionHeader[^>]*title="${title}"`).test(src)
          || new RegExp(`<SectionHeader[^>]*title=\\{[^}]*'${title}'`).test(src)
          || new RegExp(`<SectionHeader\\s+title="${title}"`).test(src);
      expect({ name, title, hit }).toEqual({ name, title, hit: true });
    }
    if (CONVERTED[name].length) expect(src).toContain("from '../components/community/SectionHeader'");
  });

  test.each(names)('%s loads in the true shape (person or post skeleton)', (name) => {
    const src = read(convertedPath(name));
    expect({ name, skeleton: /Skeleton(Person|Post)Row/.test(src) }).toEqual({ name, skeleton: true });
  });

  test.each(names)('%s has at most two header glyphs and none is a circle', (name) => {
    const src = read(convertedPath(name));
    const glyphs = (src.match(/<HeaderGlyph\b/g) || []).length;
    expect(glyphs).toBeLessThanOrEqual(2);
    expect({ name, circle: /headerBtn|styles\.headerAction/.test(src) }).toEqual({ name, circle: false });
  });

  test.each(names)('%s rows are inBand', (name) => {
    const src = read(convertedPath(name));
    const rows = /<(PersonRow|GroupRow|ProfileCard|ActivityRow|ConversationRow|ConnectRequestRow)\b/.test(src);
    if (rows && name !== 'CommunityPostScreen.js' && name !== 'CommunityProfileScreen.js') expect({ name, inBand: /\binBand\b/.test(src) }).toEqual({ name, inBand: true });
    // The post and its comments sit in bands of their own (PostRow, CommentRow).
    if (name === 'CommunityPostScreen.js') expect(src).toMatch(/<Band>\s*<CommentRow/);
  });
});

describe('D188 / V12: the origin-aware zoom', () => {
  test('heroZoomOptions is registered on CommunityProfile, CommunityGroup and CommunityPost', () => {
    const nav = fs.readFileSync(path.join(ROOT, 'src/navigation/RootNavigator.js'), 'utf8');
    for (const n of ['CommunityProfile', 'CommunityGroup', 'CommunityPost']) {
      expect(nav).toMatch(new RegExp(`name="${n}" component=\\{\\w+\\} options=\\{heroZoomOptions\\(`));
    }
  });

  test.each(['PersonRow.js', 'CohortRow.js', 'GroupRow.js', 'ProfileCard.js', 'PostRow.js'])(
    '%s accepts onPressWithLayout',
    (f) => {
      expect(read(path.join(COMPONENTS_DIR, f))).toContain('onPressWithLayout');
    },
  );
});
