/**
 * The Community layout law, source-pinned (founder defect 2026-09-14:
 * "Look at the alignment of the lines", "it is meant to look like the rest
 * of the app").
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL. Community
 * grew two competing left edges: its pages pay the app's gutter on the
 * scroll container (16 dp, the house rule every non-Community screen
 * follows), and its row components paid it a SECOND time, so avatars sat
 * at 32 while the eyebrow above them sat at 16, and each row's divider was
 * a bright `border` hairline inset past the avatar, which the app's own
 * settings primitives name as "the wireframe look". None of this was
 * guarded: the presentation guard covers four files and three of the ten
 * rules. These are the rules a future edit must not quietly undo.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** Strip comments, so a rule NAMED in a docblock is never read as code. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const ROW_FILES = [
  'src/components/community/PersonRow.js',
  'src/components/community/CohortRow.js',
  'src/components/community/ActivityItemRow.js',
  'src/components/community/SkeletonPersonRow.js',
];

describe('one gutter, paid once by the page', () => {
  test.each(ROW_FILES)('%s pays no horizontal gutter of its own', (rel) => {
    const src = code(read(rel));
    const rowStyle = /row: \{[^}]*\}/.exec(src);
    expect({ rel, rowStyle: !!rowStyle }).toEqual({ rel, rowStyle: true });
    expect({ rel, padding: /padding(Horizontal|Left|Right)?: spacing\.(lg|xl)/.test(rowStyle[0]) })
      .toEqual({ rel, padding: false });
  });

  test('every Community screen that lists rows pays the house gutter on its list', () => {
    const screens = fs.readdirSync(path.join(ROOT, 'src/screens'))
      .filter((f) => /^Community.*\.js$/.test(f));
    const listers = screens.filter((f) => /PersonRow|CohortRow|GroupRow|ActivityItemRow|SkeletonPersonRow/.test(read(`src/screens/${f}`)));
    expect(listers.length).toBeGreaterThan(3);
    for (const f of listers) {
      const src = read(`src/screens/${f}`);
      expect({ f, gutter: /(list|content): \{[^}]*padding(?:Horizontal)?: spacing\.lg/.test(src) })
        .toEqual({ f, gutter: true });
    }
  });
});

describe('the house divider: a borderSubtle hairline spanning the row', () => {
  test.each(ROW_FILES.slice(0, 3))('%s draws borderSubtle, never the bright border', (rel) => {
    const src = code(read(rel));
    expect({ rel, subtle: /divider.*borderSubtle|borderSubtle.*divider/s.test(src) }).toEqual({ rel, subtle: true });
    expect({ rel, bright: /styles\.divider, \{ backgroundColor: t\.colors\.border \}/.test(src) })
      .toEqual({ rel, bright: false });
  });

  test.each(ROW_FILES.slice(0, 3))('%s gives its divider no left inset', (rel) => {
    const src = code(read(rel));
    const divider = /divider: \{[^}]*\}/.exec(src);
    expect({ rel, found: !!divider }).toEqual({ rel, found: true });
    expect({ rel, inset: /marginLeft/.test(divider[0]) }).toEqual({ rel, inset: false });
  });
});

describe('the reader\'s own row sits on the same left edge as everyone else', () => {
  const SRC = code(read('src/components/community/PersonRow.js'));

  test('the own-row tint bleeds to the screen edges and pays the gutter back', () => {
    const own = /own: \{[^}]*\}/.exec(SRC);
    expect(own).toBeTruthy();
    // A tint that simply padded itself would push the reader's own avatar
    // 16 dp right of every other avatar on the screen; the negative margin
    // is what keeps one left edge while the band reaches both edges.
    expect(own[0]).toContain('marginHorizontal: -spacing.lg');
    expect(own[0]).toContain('paddingHorizontal: spacing.lg');
  });

  test('and it carries no divider: it is a standalone row, not a list member', () => {
    expect(SRC).toContain('isOwn ? null : (');
  });
});

describe('the eight-week bars belong to the strip, not to one cell', () => {
  const SRC = read('src/components/community/ProgressStrip.js');

  test('they are a named footer band spanning the strip, with a visible floor', () => {
    expect(SRC).toContain('Last 8 weeks');
    expect(SRC).toContain('const BAR_MIN_HEIGHT = 2;');
    const bars = /barsRow: \{[^}]*\}/.exec(code(SRC));
    expect(bars).toBeTruthy();
    // Centring is what put eight weeks of history under "weeks in a row".
    expect(/justifyContent/.test(bars[0])).toBe(false);
    const col = /barCol: \{[^}]*\}/.exec(code(SRC));
    expect(col[0]).toContain('flex: 1');
  });

  test('a zero week is drawn in a colour that exists on the ground it sits on', () => {
    expect(SRC).toContain('v > 0 ? t.colors.primary : t.colors.border');
    expect(SRC).not.toContain('BAR_MIN_HEIGHT = StyleSheet.hairlineWidth');
  });
});

describe('a small avatar is a person, not a blob', () => {
  const SRC = read('src/components/ProfileAvatarMark.js');

  test('the glyph and badge floors scale with the mark instead of sitting at 20', () => {
    expect(SRC).toContain('Math.max(Math.round(size * 0.38), Math.min(20, Math.round(size * 0.5)))');
    expect(SRC).not.toContain('Math.max(20, Math.round(size * 0.38))');
  });

  test('the preset badge renders only where it can be read', () => {
    expect(SRC).toContain('const showBadge = selected || editable || size >= 40;');
    expect(SRC).toContain('{showBadge ? (');
  });
});

describe('a skeleton stands in the shape of the row it replaces', () => {
  test('Community lists use the Community skeleton, never the 36 dp square one', () => {
    const skel = read('src/components/community/SkeletonPersonRow.js');
    expect(skel).toContain('const AVATAR = 32;');
    expect(skel).toContain('radius={circle(AVATAR)}');
    for (const f of ['CommunityHubScreen', 'CommunityDimensionScreen', 'CommunityGroupScreen', 'CommunityProfileScreen']) {
      const src = read(`src/screens/${f}.js`);
      expect({ f, shared: /\bSkeletonRow\b/.test(src) }).toEqual({ f, shared: false });
      expect({ f, own: src.includes('SkeletonPersonRow') }).toEqual({ f, own: true });
    }
  });
});

describe('a section with nothing in it is one quiet line, not a poster', () => {
  test('the Hub and the profile say it in a line, and keep EmptyState for a screen with nothing on it', () => {
    const hub = read('src/screens/CommunityHubScreen.js');
    expect(hub).toContain('Follow people and their training shows up here.');
    expect(hub).not.toContain('title="Nothing here yet"');
    // The error and offline states keep the shared box: they carry a retry.
    expect(hub).toContain('Could not load Community');
    const profile = read('src/screens/CommunityProfileScreen.js');
    expect(profile).not.toContain('title="No training stories yet"');
    expect(profile).toContain('Their sessions and personal bests show up here.');
  });
});
