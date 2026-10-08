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

  test.each(ALL.map((f) => [rel(f), f]))('%s has no Eyebrow and no square SkeletonRow', (r, f) => {
    const src = read(f);
    expect({ r, eyebrow: /\bEyebrow\b/.test(src) }).toEqual({ r, eyebrow: false });
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
    // Round 3R (SF5): the bare "inBand appears" check is retired; the layout guard now
    // asserts, per converted screen, no gutter on the scroll container and a Band drawn.
    // The post and its comments sit in bands of their own (PostRow, CommentRow).
    if (name === 'CommunityPostScreen.js') expect(src).toMatch(/<Band>\s*<CommentRow/);
  });
});

// Lane 2B: the form, staff and reading screens converted to bands, and the
// section titles each must carry. `wells` marks the screens with a text field.
const FORMS = {
  'CommunityJoinScreen.js': { titles: ['About you', 'Avatar', 'Your training profile', 'Four rules'], wells: true },
  'CommunityEditProfileScreen.js': { titles: ['Avatar', 'About you', 'Goal', 'Trains at', 'Who can follow you'], wells: true },
  'CommunityTrainingProfileScreen.js': { titles: ['What other people see', 'Your bands'], wells: false },
  'CommunityComposeScreen.js': { titles: ['Preview', 'Who can see it'], wells: true },
  'CommunityGroupCreateScreen.js': { titles: ['The group', 'Who can join'], wells: true },
  'CommunityPrivacyScreen.js': { titles: ['Who can follow you', 'Blocked', 'Muted'], wells: false },
  'CommunityRulesScreen.js': { titles: [], wells: false },
  'CommunityConversationScreen.js': { titles: [], wells: false },
  'CommunityModerationScreen.js': { titles: ['Gym submissions', 'Gym reports'], wells: false },
  'CommunityGymAddScreen.js': { titles: ['The gym', 'Optional'], wells: true },
};

describe('lane 2B: the form screens follow V1, V2, V8, V9, V10', () => {
  const names = Object.keys(FORMS);

  test.each(names)('%s has no SectionLabel, no Card, and builds on Band', (name) => {
    const src = read(convertedPath(name));
    expect({ name, label: /\bSectionLabel\b/.test(src) }).toEqual({ name, label: false });
    expect({ name, card: /<Card\b/.test(src) }).toEqual({ name, card: false });
    if (name !== 'CommunityConversationScreen.js') {
      expect({ name, band: /from '\.\.\/components\/community\/Band'/.test(src) }).toEqual({ name, band: true });
    }
  });

  test.each(names)('%s carries a SectionHeader for each section', (name) => {
    const src = read(convertedPath(name));
    for (const title of FORMS[name].titles) {
      const hit = new RegExp(`<SectionHeader[^>]*title="${title}"`).test(src);
      expect({ name, title, hit }).toEqual({ name, title, hit: true });
    }
  });

  test.each(names)('%s has at most two header glyphs and no circle behind one', (name) => {
    const src = read(convertedPath(name));
    expect((src.match(/<HeaderGlyph\b/g) || []).length).toBeLessThanOrEqual(2);
    expect({ name, circle: /headerBtn|styles\.headerAction/.test(src) }).toEqual({ name, circle: false });
  });

  test.each(names.filter((n) => FORMS[n].wells))('%s inputs are wells (V9)', (name) => {
    const src = read(convertedPath(name));
    const fields = src.match(/<(TextField|ComposerInput)\b[\s\S]*?\/>/g) || [];
    expect(fields.length).toBeGreaterThan(0);
    for (const field of fields) expect({ name, field: field.slice(0, 40), well: /\bwell\b/.test(field) }).toEqual({ name, field: field.slice(0, 40), well: true });
  });

  test('the well is the house input extended, not a hand-rolled one', () => {
    const field = read(path.join(ROOT, 'src/components/TextField.js'));
    expect(field).toMatch(/well = false/);
    expect(field).toMatch(/t\.colors\.background/);
    expect(field).toMatch(/borderColor: t\.colors\.borderSubtle/);
    expect(field).toMatch(/WELL_HEIGHT = 44/);
    expect(read(path.join(COMPONENTS_DIR, 'ComposerInput.js'))).toMatch(/well = false/);
  });
});

describe('lane 2B: the components follow the law', () => {
  test.each(COMPONENTS.map((f) => [rel(f), f]))('%s has no SectionLabel', (r, f) => {
    expect({ r, label: /\bSectionLabel\b/.test(read(f)) }).toEqual({ r, label: false });
  });

  test('a Card survives in components only for the hero receipt and the shared-post card', () => {
    const withCard = COMPONENTS.filter((f) => /<Card\b/.test(read(f))).map((f) => path.basename(f)).sort();
    expect(withCard).toEqual(['PostCard.js', 'PrivacyReceipt.js']);
  });

  test('the retired files are gone', () => {
    expect(fs.existsSync(path.join(COMPONENTS_DIR, 'ActivityItemRow.js'))).toBe(false);
  });

  test('the privacy receipt renders as a band of plain text on the Community screens', () => {
    for (const name of ['CommunityJoinScreen.js', 'CommunityPrivacyScreen.js', 'CommunityComposeScreen.js']) {
      expect(read(convertedPath(name))).toMatch(/<PrivacyReceipt inBand \/>/);
    }
  });

  test('every sheet section title is a SectionHeader, and a menu row can be disabled', () => {
    for (const f of ['ConnectSheet.js', 'SessionSheet.js', 'PeopleFiltersSheet.js', 'GroupInviteSheet.js']) {
      expect(read(path.join(COMPONENTS_DIR, f))).toMatch(/<SectionHeader flush/);
    }
    const menu = read(path.join(COMPONENTS_DIR, 'MenuSheet.js'));
    expect(menu).toMatch(/disabled=\{!!row\.disabled\}/);
    expect(menu).toMatch(/<EntryRow/);
    expect(menu).not.toMatch(/SettingRow/);
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
