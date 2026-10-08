/**
 * navigateCommunity (D221): navigate to a Community screen from a screen that
 * may live in the Today stack or in the Community stack.
 *
 * Why it exists: Community is its own tab (CommunityStack), and HomeStack
 * registers only two duplicates, CommunityCompose and CommunityPost, so the
 * workout summary and the share card compose in-stack and Back returns to the
 * summary. Those two screens then navigate onward (Join, Profile,
 * Conversation) to routes HomeStack does not register, which would be silent
 * no-ops. This helper pushes in-stack when the current navigator knows the
 * route, and otherwise hops to the Community tab through navigateCrossTab.
 * `replace` keeps its meaning in-stack; when it cannot happen in-stack the
 * current screen is popped first so a half-finished form does not linger.
 */
import { navigateCrossTab } from './navigateCrossTab';

export function navigateCommunity(navigation, screen, params, { replace = false } = {}) {
  const names = navigation?.getState?.()?.routeNames;
  if (Array.isArray(names) && names.includes(screen)) {
    if (replace) navigation.replace(screen, params);
    else navigation.navigate(screen, params);
    return;
  }
  if (replace) navigation?.goBack?.();
  navigateCrossTab(navigation, 'CommunityTab', screen, params);
}
