/**
 * The Community tab's unseen dot (D221, build spec 2.5).
 *
 * One boolean, `community.unseen` in the store, so VolyumeTabBar reads it with
 * a single selector. It is derived from the signed-in person's own `me`
 * payload by the SAME predicate the Today header dot uses (`hasUnseen`: unseen
 * activity, a follow or connection request, or an unread message), published
 * by `useCommunityMe` whenever a load settles. Activity and Conversations
 * already refresh `me` when opened, which republishes and so clears it; the
 * Activity screen also clears it optimistically through the setter below.
 *
 * It never reads the ED flag or the tier: the dot is a presence marker with no
 * weight, food or body content, and the tab itself is tier-blind.
 */
import { hasUnseen } from './profile';

/** Set or clear the tab dot. Safe to call from anywhere (no hooks). */
export function setCommunityUnseen(value) {
  try {
    // Lazy require: lib modules avoid a static store import (import cycles).
    require('../../store/useAppStore').default.getState().setCommunityUnseen(!!value);
  } catch (_) { /* best-effort: a dot must never break the screen it is on */ }
}

/** Publish the dot from a `me` payload (the single derivation). */
export function publishCommunityUnseenFromMe(me) {
  setCommunityUnseen(hasUnseen(me));
}

/** @returns {boolean} whether the Community tab should show its dot. */
export function useCommunityUnseen() {
  const useAppStore = require('../../store/useAppStore').default;
  return useAppStore((s) => !!s.community?.unseen);
}
