/**
 * Source guard: every Pro-designated screen ships wrapped in a Pro guard.
 *
 * WHY THIS EXISTS: free/Pro gating is absolute and binary (CLAUDE.md §2 --
 * "never expose Pro to free"). RootNavigator.js declares every Pro-only
 * screen inside one deliberately fenced block (the "Pro-only screens."
 * comment through to the `heroZoomTransition` declaration) as a
 * `const Gated<Name> = lazyScreen(() => withProGuard(...))` or
 * `withReadOnlyProGuard(...)` wrapper (see src/components/ProGate.js for the
 * HOCs). That fenced block is the app's single canonical enumeration of every
 * Pro screen: nothing outside it declares a `Gated*` constant. If a future
 * Pro feature (food diary, barcode, meal suggestions, targets, macros,
 * cardio, check-ins, Precision Coaching, division plans, training partners,
 * progress-photos/body-metrics history, ...) is added to that block without
 * a guard call, a free user would reach it with no paywall -- silently
 * breaking the binary free/pro constitution. This guard would fail.
 *
 * STRATEGY CHOSEN (hybrid of the brief's (a) and (b), matching the
 * partnerPlacementSpine.guard.test.js fs.readFileSync + regex idiom):
 *   (a) self-maintaining sweep -- every `const Gated<Name>` declaration
 *       inside the fenced block must call withProGuard or
 *       withReadOnlyProGuard. This covers ANY future addition to the block
 *       with zero maintenance, so a new Pro screen dropped in ungated is
 *       caught automatically.
 *   (b) explicit critical-route cross-check -- a hard-coded list of today's
 *       known-critical Pro routes (lifted from the CLAUDE.md Pro feature
 *       set) is checked two ways: that its `Gated<Name>` constant exists and
 *       is guard-wrapped, AND that every `<Stack.Screen name="...">`
 *       registration for that route name wires the guarded `Gated<Name>`
 *       component, never the bare unguarded screen. (a) alone would miss a
 *       regression where the guard wrapper still exists but a screen
 *       registration is quietly repointed at the raw component (or a second
 *       registration is added elsewhere referencing the raw component); (b)
 *       alone would miss a wholly new Pro screen never added to this list.
 *       Together they close both gaps.
 *
 * Pure fs.readFileSync + regex against the real source; no rendering, no
 * React Navigation instantiation.
 */
import fs from 'fs';
import path from 'path';

const NAV = fs.readFileSync(
  path.join(__dirname, '..', 'navigation', 'RootNavigator.js'),
  'utf8'
);

// Isolate the fenced "Pro-only screens" block: from its header comment to the
// `heroZoomTransition` declaration that immediately follows it (CP-10 stage 2,
// docs/ux-world-class-audit-2026-07-09/CP-10-restart-free-theming-plan.md --
// the old module-scope `stackOptions` const that used to anchor this end
// moved into its own ./navTheme module for testability, so the boundary now
// anchors on the next stable declaration instead). This is the file's own
// canonical enumeration -- every Pro screen in the app is declared here,
// nowhere else (see the comment on that block in RootNavigator.js itself:
// "Pro-only screens. The guard renders an upgrade prompt for free users,
// enforcing Pro access no matter how the route is reached.").
const blockStart = NAV.indexOf('// Pro-only screens.');
const blockEnd = NAV.indexOf('\nconst heroZoomTransition', blockStart);
if (blockStart === -1 || blockEnd === -1) {
  throw new Error(
    'proScreenGating.guard.test.js: could not locate the fenced "Pro-only ' +
    'screens" block in RootNavigator.js (expected between the ' +
    '"// Pro-only screens." comment and the `heroZoomTransition` declaration). ' +
    'Has it been renamed or restructured? Update this guard to match before ' +
    'trusting it.'
  );
}
const PRO_BLOCK = NAV.slice(blockStart, blockEnd);

// Every `const Gated<Name> = ...` declaration line inside the block.
const gatedDeclLines = PRO_BLOCK
  .split('\n')
  .filter((line) => /^const Gated\w+\s*=/.test(line.trim()));

describe('Pro-only screens block (RootNavigator.js): self-maintaining sweep', () => {
  test('the fenced block actually declares Pro screens (this guard has something to check)', () => {
    expect(gatedDeclLines.length).toBeGreaterThan(0);
  });

  test('every Gated<Name> declaration wraps its screen in withProGuard or withReadOnlyProGuard', () => {
    const unguarded = gatedDeclLines.filter(
      (line) => !/with(ReadOnly)?ProGuard\(/.test(line)
    );
    expect(unguarded).toEqual([]);
  });

  test('every Gated<Name> declaration names a real screen file under src/screens/', () => {
    const screenRefs = [...PRO_BLOCK.matchAll(/require\('\.\.\/screens\/(\w+)'\)/g)].map(
      (m) => m[1]
    );
    // One require(...screens/X) per Gated<Name> declaration -- a mismatch
    // means a declaration references something other than a direct screen
    // require (e.g. re-exporting an already-gated constant), which this
    // guard is not built to follow.
    expect(screenRefs.length).toBe(gatedDeclLines.length);
    for (const name of screenRefs) {
      const exists = fs.existsSync(path.join(__dirname, '..', 'screens', `${name}.js`));
      expect(exists).toBe(true);
    }
  });
});

// Today's known-critical Pro routes, lifted from the CLAUDE.md binary
// free/pro constitution: food diary, barcode/label scanning, meal
// suggestions/plan/recipes, nutrition targets/macros, cardio, check-ins,
// Precision Coaching, division/plan updates, and training partners, plus the
// read-only lapse views (body metrics, progress photos). Each entry pairs
// the `Gated<Name>` wrapper constant with every navigator route `name` it is
// registered under.
const CRITICAL_PRO_SCREENS = [
  { gated: 'GatedDiary', routes: ['Diary'] },
  { gated: 'GatedMealPlan', routes: ['MealPlan'] },
  { gated: 'GatedFoodSearch', routes: ['FoodSearch'] },
  { gated: 'GatedAddCustomFood', routes: ['AddCustomFood'] },
  { gated: 'GatedScanBarcode', routes: ['ScanBarcode'] },
  { gated: 'GatedScanLabel', routes: ['ScanLabel'] },
  { gated: 'GatedFoodInsights', routes: ['FoodInsights'] },
  { gated: 'GatedMyRecipes', routes: ['MyRecipes'] },
  { gated: 'GatedMyMeals', routes: ['MyMeals'] },
  { gated: 'GatedRecipeBuilder', routes: ['RecipeBuilder'] },
  { gated: 'GatedNutritionTargets', routes: ['NutritionTargets'] },
  { gated: 'GatedMealNames', routes: ['MealNames'] },
  { gated: 'GatedPerDayTargets', routes: ['PerDayTargets'] },
  // LogCardio, BodyMetrics and ProgressPhotos are each registered in more
  // than one tab stack (Diary/Home, and Progress) so free deep-linking
  // cannot bypass the guard via either entry point -- the regex below
  // matches every occurrence of the route name across the whole file, so one
  // list entry still checks ALL of a route's registrations.
  { gated: 'GatedLogCardio', routes: ['LogCardio'] },
  { gated: 'GatedCardioHistory', routes: ['CardioHistory'] },
  { gated: 'GatedWeeklyCheckIn', routes: ['WeeklyCheckIn'] },
  { gated: 'GatedCoachOutput', routes: ['CoachOutput'] },
  { gated: 'GatedProGoalSetup', routes: ['ProGoalSetup'] },
  { gated: 'GatedPlanUpdate', routes: ['PlanUpdate'] },
  { gated: 'GatedCoachingReminders', routes: ['CoachingReminders'] },
  { gated: 'GatedBodyMetrics', routes: ['BodyMetrics'] },
  { gated: 'GatedProgressPhotos', routes: ['ProgressPhotos'] },
  { gated: 'GatedPartner', routes: ['Partner'] },
];

describe('Critical Pro routes: declared with a guard AND registered via the guarded wrapper', () => {
  test.each(CRITICAL_PRO_SCREENS)(
    '$gated is declared in the fenced block with a guard HOC',
    ({ gated }) => {
      const declRegex = new RegExp(
        `const ${gated}\\s*=\\s*lazyScreen\\(\\(\\) => with(ReadOnly)?ProGuard\\(`
      );
      expect(PRO_BLOCK).toMatch(declRegex);
    }
  );

  test.each(CRITICAL_PRO_SCREENS)(
    'every Stack.Screen registration for $gated\'s route(s) wires the guarded component',
    ({ gated, routes }) => {
      for (const route of routes) {
        // name="Route" and component={X} sit on the same JSX tag, at most a
        // few short attributes apart (possibly across lines) -- bound the
        // gap so this cannot accidentally read into a neighbouring tag.
        const screenTagRegex = new RegExp(
          `<Stack\\.Screen\\s+name="${route}"[\\s\\S]{0,120}?component=\\{(\\w+)\\}`,
          'g'
        );
        const matches = [...NAV.matchAll(screenTagRegex)];
        // At least one registration must exist for every route this list
        // claims is registered; a route that has quietly been removed from
        // the navigator entirely is also a drift this guard should surface.
        expect(matches.length).toBeGreaterThan(0);
        for (const m of matches) {
          expect(m[1]).toBe(gated);
        }
      }
    }
  );
});
