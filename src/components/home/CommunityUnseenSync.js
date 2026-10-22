/**
 * CommunityUnseenSync - D231 (app layout rework, batch 1).
 *
 * Renders nothing. It mounts `useCommunityMe`, the one hook that publishes the
 * Community tab's amber dot (`community.unseen` in the store, via
 * src/lib/community/unseen.js, from the cached `me` payload: unseen activity,
 * a request, or an unread message).
 *
 * Why it exists: the Today header's Community button used to be the thing that
 * mounted that hook when the app opened on Today, so the tab dot lit without
 * the person ever visiting Community. The button is gone (Today's header now
 * carries the brand mark like the other tabs), and the tab dot is the one
 * signal left for new Community activity and messages, so Today keeps the hook
 * alive here. It reads the same cached `me` the button read and adds no new
 * request or data. A separate null component keeps the hook's own state updates
 * from re-rendering the whole of Today.
 */
import useCommunityMe from '../../hooks/useCommunityMe';

export default function CommunityUnseenSync() {
  useCommunityMe();
  return null;
}
