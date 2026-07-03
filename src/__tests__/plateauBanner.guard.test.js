/**
 * B3 (audit/05-enhancements.md): proactive plateau-break surfacing on Home.
 *
 * The selection logic is behavioural-tested in lib/__tests__/plateauSurfacing;
 * the Home wiring is a screen load effect + JSX, exercised on device per the
 * repo convention, so these are scoped source guards in the
 * checkinCoachAudit/navigationTargets style. They pin:
 *  - the banner's priority slot: BELOW coach review, trial ledger, deload and
 *    phase (recovery and targets outrank a lift plateau), ABOVE the free
 *    coach line, keeping the one-banner invariant;
 *  - the cross-stack navigation form (ExerciseDetail lives in the Progress
 *    stack; a bare navigate from Home is the F4/NAV-1 silent no-op);
 *  - per-plateau dismissal keyed by exercise + local week;
 *  - the loader's input being training data only (workout sets), so the
 *    banner stays outside COMP-004's weight/food suppression scope;
 *  - errors swallowed to null like every other banner loader.
 */
import fs from 'fs';
import path from 'path';

const HOME = fs.readFileSync(
  path.resolve(__dirname, '../screens/HomeScreen.js'),
  'utf8',
);

// Slice one inner function body: from its declaration to the next top-level
// function declaration, so a regex can't match an unrelated loader.
function fnBody(src, decl) {
  const start = src.indexOf(decl);
  if (start === -1) throw new Error(`not found: ${decl}`);
  const next = src.slice(start + decl.length).search(/\n  (async )?function /);
  return next === -1 ? src.slice(start) : src.slice(start, start + decl.length + next);
}

describe('B3 plateau banner priority slot', () => {
  test('renders only when coach, trial, deload AND phase banners are absent', () => {
    expect(HOME).toMatch(
      /const showPlateauBanner = !!plateauBanner && !plateauBannerDismissed\s*\n\s*&& !showCoachBanner && !showTrialCountdownBanner && !showDeloadBanner && !showPhaseBanner;/,
    );
  });

  test('the free coach line stays lowest: it also yields to the plateau banner', () => {
    const site = HOME.indexOf('const showFreeCoachLine');
    expect(site).toBeGreaterThan(-1);
    expect(HOME.slice(site, site + 400)).toMatch(/!showPlateauBanner/);
  });

  test('the existing banners above it do not consult the plateau banner (their priorities untouched)', () => {
    for (const decl of ['const showCoachBanner', 'const showTrialCountdownBanner', 'const showDeloadBanner', 'const showPhaseBanner']) {
      const site = HOME.indexOf(decl);
      expect(site).toBeGreaterThan(-1);
      const next = HOME.indexOf('const show', site + decl.length);
      expect(HOME.slice(site, next)).not.toMatch(/PlateauBanner/);
    }
  });
});

describe('B3 plateau banner navigation (F4/NAV-1 bug class)', () => {
  test('no bare navigate to ExerciseDetail from the Home stack', () => {
    expect(HOME).not.toMatch(/navigation\.navigate\(\s*['"]ExerciseDetail['"]/);
  });

  test('routes via the parent tab navigator into the Progress stack', () => {
    // T3: the parent-tab idiom (including the F6b initial: false rule) lives
    // in navigateCrossTab; the banner must route through it.
    expect(HOME).toMatch(
      /navigateCrossTab\(navigation,\s*'ProgressTab',\s*'ExerciseDetail',\s*\{\s*exerciseId:\s*plateauBanner\.exerciseId\s*\}\)/,
    );
  });
});

describe('B3 plateau banner loader', () => {
  const loader = fnBody(HOME, 'async function loadPlateauBanner');

  test('detection input is training data only (workout sets), never weight or food', () => {
    expect(loader).toMatch(/getWorkoutSetsSince\(user\.id/);
    expect(loader).toMatch(/selectPlateauForBanner\(recentSets\)/);
    // Nothing weight-, food- or calorie-derived may ever feed this banner
    // without adding the ED-flag/calm suppression the COMP-004 rules require.
    expect(loader).not.toMatch(/MorningWeight|weightKg|nutrition|calorie|kcal|food/i);
  });

  test('errors swallow to null (banner-loader pattern)', () => {
    expect(loader).toMatch(/catch \(_\) \{\s*\n\s*setPlateauBanner\(null\);/);
  });

  test('dismissal is per detected plateau: keyed by user + exercise + local week, read before reveal', () => {
    const key = /@volyume_plateau_banner_dismissed_\$\{user\.id\}_\$\{picked\.exerciseId\}_\$\{localWeekStartMs\(\)\}/;
    expect(loader).toMatch(key);
    // The read lands before the banner state is revealed.
    expect(loader.indexOf('@volyume_plateau_banner_dismissed_')).toBeLessThan(loader.indexOf('setPlateauBanner({'));
    // The dismiss handler writes the matching key.
    const dismiss = fnBody(HOME, 'function dismissPlateauBanner');
    expect(dismiss).toMatch(/@volyume_plateau_banner_dismissed_\$\{user\.id\}_\$\{plateauBanner\.exerciseId\}_\$\{localWeekStartMs\(\)\}/);
  });
});
