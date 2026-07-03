/**
 * navigateCrossTab (T3, usability directive 2026-07-03)
 *
 * The one sanctioned way to navigate from inside one tab's stack to a
 * screen in ANOTHER tab's stack. A plain navigation.navigate('Screen')
 * silently no-ops when the target lives in a different stack (the F4
 * dead-tap bug class, already bitten once in production), so every
 * cross-tab jump must go through the tab navigator:
 *
 *   navigateCrossTab(navigation, 'ProfileTab', 'NutritionTargets');
 *   navigateCrossTab(navigation, 'ProgressTab', 'ExerciseDetail', { exerciseId });
 *   navigateCrossTab(navigation, 'PlansTab'); // tab root
 *
 * `initial: false` matters: without it the tab opens on its initial route
 * and ignores the requested screen when the stack is freshly mounted.
 * A source guard (navigationTargets.guard.test.js) bans hand-rolled
 * getParent()?.navigate calls outside this file so the idiom cannot
 * fragment again.
 */
export function navigateCrossTab(navigation, tab, screen, params) {
  const parent = navigation?.getParent?.();
  if (!parent) return; // not inside a tab navigator (e.g. a modal stack); nothing to do
  if (screen) {
    parent.navigate?.(tab, params !== undefined
      ? { screen, params, initial: false }
      : { screen, initial: false });
  } else {
    parent.navigate?.(tab);
  }
}
