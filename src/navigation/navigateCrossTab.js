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
 *
 * Stale-history reset (founder device report 2026-07-13): tab stacks are
 * retained, so a cross-tab jump used to PUSH the target screen on top of
 * whatever the destination tab last showed. Pressing back then surfaced
 * an unrelated old screen (e.g. Progress Photos under Nutrition Targets)
 * instead of anywhere the user had just been. The helper now pops the
 * destination tab's stack to its root before navigating, so back from a
 * cross-tab jump always lands on that tab's root: predictable, never a
 * ghost of an earlier visit. Same-stack pushes are untouched, so back
 * still returns to the true previous screen within a flow.
 */
import { StackActions } from '@react-navigation/native';

export function navigateCrossTab(navigation, tab, screen, params) {
  const parent = navigation?.getParent?.();
  if (!parent) return; // not inside a tab navigator (e.g. a modal stack); nothing to do
  if (screen) {
    // Clear the destination tab's retained history first (see header note).
    // Best-effort: an unmounted tab has no nested state and nothing to pop.
    try {
      const tabRoute = parent.getState?.()?.routes?.find((r) => r.name === tab);
      const nested = tabRoute?.state;
      if (nested?.key && Number(nested.index) > 0) {
        parent.dispatch({ ...StackActions.popToTop(), target: nested.key });
      }
    } catch (_) { /* best-effort: fall through to the plain navigate */ }
    parent.navigate?.(tab, params !== undefined
      ? { screen, params, initial: false }
      : { screen, initial: false });
  } else {
    parent.navigate?.(tab);
  }
}
