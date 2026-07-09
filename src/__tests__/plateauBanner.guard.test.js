/**
 * B3 (audit/05-enhancements.md): proactive plateau-break surfacing on Home.
 *
 * Priority-slot mechanics updated for AC-6/CP-1 (design-usability-audit-
 * 2026-07-09), founder decision D7: the old strict one-banner invariant
 * (every lower banner hidden until the winner above it was dismissed) is
 * replaced by a ranked list that shows the top two eligible banners and
 * collapses the rest behind one "more updates" affordance. The plateau
 * banner's own trigger (plateauBannerEligible) is untouched; only how many
 * banners can show alongside it changed. These are scoped source guards in
 * the checkinCoachAudit/navigationTargets style (screen wiring is exercised
 * on device, not jest-mounted). They pin:
 *  - the banner's eligibility trigger, unchanged by D7;
 *  - its priority rank in BANNER_PRIORITY: below coach, trial, deload and
 *    phase (recovery and targets still outrank a lift plateau), above the
 *    free/differential attention slot;
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

describe('B3 plateau banner priority slot (D7 ranked-list mechanics)', () => {
  test('the eligibility trigger is unchanged: plateauBanner set and not dismissed', () => {
    expect(HOME).toMatch(
      /const plateauBannerEligible = !!plateauBanner && !plateauBannerDismissed;/,
    );
  });

  test('ranks below coach, trial, deload and phase; above the activation and attention slots', () => {
    const site = HOME.indexOf('const BANNER_PRIORITY = [');
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, HOME.indexOf('];', site));
    const order = ['coach', 'trial', 'deload', 'phase', 'plateau', 'activation', 'attention']
      .map((key) => block.indexOf(`key: '${key}'`));
    expect(order.every((i) => i > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test('renders only when it wins one of the top two slots (direct or expanded-overflow)', () => {
    expect(HOME).toMatch(
      /const showPlateauBanner = topBannerKeys\.has\('plateau'\) \|\| \(bannersExpanded && overflowBannerKeys\.has\('plateau'\)\);/,
    );
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
