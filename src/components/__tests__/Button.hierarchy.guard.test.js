/**
 * D148 (founder, 2026-09-04): colour is hierarchy. The shared Button carries
 * five semantic treatments and the solid amber fill is reserved for the
 * `emphatic` variant, used for the one committing action in a region. The
 * default is the standard primary: a raised, bordered charcoal surface with
 * a white label, so routine actions read as primary through position, size
 * and contrast rather than fill. This pins the variant table, the icon tint,
 * the haptic gate and the curated emphatic set, so a future "make it orange"
 * cannot arrive silently.
 *
 * RE-ANCHORED under D174 (the amber census, 2026-09-15), which is the ruling
 * that D148's own logic pointed at: "amber marks 'now' and nothing else"
 * (plan section 3, discipline 1) leaves the accent on `emphatic`, the one
 * committing button, and nowhere else in this table. So `primary.iconFg`
 * moves from `c.primary` to `c.textSecondary` (33 icon-bearing call sites --
 * a routine action is not "now"), and `tertiary` -- which carried three amber
 * properties at once across 62 sites, a `primaryBg` wash, an amber label on a
 * button that commits to nothing, and a `withAlpha` border -- becomes a plain
 * bordered ghost. NOTHING about the emphatic half of D148 is relaxed: the
 * single-amber-fill assertion below is unchanged and still the point of the
 * suite.
 */
const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
const BUTTON = read('components/Button.js');

describe('the button variant table', () => {
  test('emphatic is the only amber fill; every other variant is neutral, glyphs included', () => {
    expect(BUTTON).toMatch(/emphatic: \{ bg: c\.primaryFill, fg: c\.onPrimary, border: 'transparent', iconFg: c\.onPrimary \}/);
    expect(BUTTON).toMatch(/primary: \{ bg: c\.surface2, fg: c\.textPrimary, border: c\.border, iconFg: c\.textSecondary \}/);
    expect(BUTTON).toMatch(/secondary: \{ bg: c\.surface, fg: c\.textSecondary, border: c\.border, iconFg: c\.textSecondary \}/);
    expect(BUTTON).toMatch(/outline: \{ bg: c\.surface, fg: c\.textSecondary, border: c\.border, iconFg: c\.textSecondary \}/);
    // D174: the ghost button keeps its BOX (a `border` edge is what makes it a
    // contained control rather than a bare text link) and loses every amber
    // property it had.
    expect(BUTTON).toMatch(/tertiary: \{ bg: 'transparent', fg: c\.textSecondary, border: c\.border, iconFg: c\.textSecondary \}/);
    expect((BUTTON.match(/bg: c\.primaryFill/g) || []).length).toBe(1);
    // The whole variant table, read as code: `emphatic` is the only row left
    // that names the accent at all.
    const table = BUTTON.slice(BUTTON.indexOf('function buildVariants'), BUTTON.indexOf('function buildSizes'))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    const amberRows = table.split('\n').filter((l) => /c\.(primary|primaryFill|primaryBg|primaryDim)\b/.test(l));
    expect(amberRows.map((l) => l.trim().split(':')[0])).toEqual(['emphatic']);
  });
  test('the default variant is the standard primary, and icons take the variant ink', () => {
    expect(BUTTON).toMatch(/variant = 'primary',/);
    expect(BUTTON).toMatch(/const iconFg = v\.iconFg \?\? v\.fg;/);
    expect(BUTTON).toMatch(/<Ionicons name=\{icon\} size=\{s\.icon\} color=\{iconFg\} \/>/);
  });
  test('the haptic tick fires for primary and emphatic only', () => {
    expect(BUTTON).toMatch(/onPress && \(v === VARIANTS\.primary \|\| v === VARIANTS\.emphatic\)/);
  });
});

describe('the emphatic set is curated: committing actions only', () => {
  const emphatic = [];
  const walk = (dir) => {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) { if (f !== '__tests__') walk(p); continue; }
      if (!f.endsWith('.js')) continue;
      const src = fs.readFileSync(p, 'utf8');
      const n = (src.match(/variant="emphatic"/g) || []).length;
      if (n) emphatic.push([path.relative(path.join(__dirname, '..', '..'), p), n]);
    }
  };
  walk(path.join(__dirname, '..', '..', 'screens'));
  walk(path.join(__dirname, '..', '..', 'components'));

  test('every emphatic usage is on the reviewed list', () => {
    const allowed = new Set([
      'screens/WelcomeScreen.js', 'components/auth/AuthSheet.js', 'screens/ProOnboardingScreen.js',
      'screens/ProSetupCompleteScreen.js', 'screens/PlanPreviewScreen.js',
      'screens/HowYouTrainAddScreen.js', 'screens/ManualBuilderScreen.js', 'screens/PlansScreen.js',
      'screens/ImportScreen.js', 'screens/GoalLockConsentScreen.js', 'screens/PlanDetailScreen.js',
      'components/PlanPreviewSheet.js', 'screens/BuildWorkoutScreen.js',
      // Community (social-discovery blueprint sections 6 and 13, 2026-09-06;
      // visual rulings 2026-09-07, V1). Each of these is a committing step
      // and the only emphatic action on its screen: create the profile
      // (on Join, where the commitment happens), post the story. The Hub's
      // own "Create my profile" moved to `primary` (V1) since Join carries
      // the emphatic moment instead.
      'screens/CommunityJoinScreen.js',
      'screens/CommunityComposeScreen.js',
      // Accept the rules: the one committing action on the rules screen.
      'screens/CommunityRulesScreen.js',
    ]);
    for (const [file] of emphatic) expect(allowed.has(file)).toBe(true);
    expect(emphatic.length).toBeGreaterThan(10);
  });

  test('the routine daily actions are NOT emphatic', () => {
    expect(read('screens/HomeScreen.js')).not.toMatch(/variant="emphatic"[\s\S]{0,200}Start workout/);
    expect(read('screens/PlansScreen.js')).not.toMatch(/variant="emphatic"[\s\S]{0,120}title="Start next workout"/);
    expect(read('components/food/EmptyDiary.js')).not.toMatch(/variant="emphatic"/);
    expect(read('components/workout/WorkoutBottomBar.js')).not.toMatch(/variant="emphatic"/);
  });
});

describe('the hand-rolled fills on the reviewed screens follow the same rule', () => {
  // Renamed and re-anchored 2026-09-15 (D174). The case is about BUTTON
  // HIERARCHY: the scanner is a raised neutral disc, not an emphatic amber
  // fill -- that first assertion is untouched and is the point. The glyph's
  // amber was incidental, and D174's first REMOVE row (an unconditional
  // `primary` on an Ionicon) takes it to `textSecondary`, which is exactly
  // what Button's own `primary` variant already passes as its `iconFg`
  // (Button.js:73). So the FAB now agrees with the variant it hand-rolls.
  test('the Nutrition scanner is a raised disc, not an emphatic fill', () => {
    const diary = read('screens/DiaryScreen.js');
    expect(diary).toMatch(/scanFab: \{[\s\S]{0,300}backgroundColor: colors\.surface2, borderWidth: 1, borderColor: colors\.border,/);
    expect(diary).toMatch(/<Ionicons name="barcode-outline" size=\{26\} color=\{t\.colors\.textSecondary\} \/>/);
    expect(diary).not.toMatch(/scanFab: \{[\s\S]{0,300}colors\.primaryFill/);
  });
  test('the workout logger primaries are raised surfaces with white labels', () => {
    const aw = read('screens/ActiveWorkoutScreen.js');
    for (const k of ['completeBtn', 'supPrimaryBtn', 'staleResume', 'keepTrainingBtn']) {
      expect(aw).toMatch(new RegExp(`  ${k}: \\{[^\\n]*backgroundColor: colors\\.surface2, borderWidth: 1, borderColor: colors\\.border`));
    }
    expect(aw).not.toMatch(/completeBtnText: \{[^}]*onPrimary/);
  });
  test('the in-app splash is gone: the boot hold is a bare background', () => {
    expect(read('navigation/RootNavigator.js')).toMatch(/function SplashScreen\(\) \{\s*return <View style=\{splashStyles\.container\} \/>;\s*\}/);
  });
});
