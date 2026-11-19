/**
 * HomeCommunityTodayRow -- the Today root's one live Community row,
 * members only (founder order 2026-09-22, item 2 merged with item 4a;
 * audit A-03/A-04/Q1/Q5,
 * docs/audit/community-audit-2026-09-22/A-adoption-visibility-look-copy.md).
 *
 * One compact row, directly under the ScreenHeader: what is true today,
 * "{n} people you follow trained today" (singular handled), or an honest
 * zero line with a trailing Invite action that opens the native share
 * sheet with the member's own profile link (reusing the Hub's own invite
 * path -- src/lib/community/earlyDays.js's inviteMessage/inviteLabel and
 * src/lib/community/links.js's shareCommunityMessage).
 *
 * All gating (membership, calm mode, the ED flag, the 15-minute refresh)
 * lives in HomeScreen.js; this file renders only the content, on the
 * shared Card primitive with `padding="none"`, the same shape
 * HomeLastSessionCard already uses for a slim full-bleed row (no new
 * card pattern, no new amber).
 */
import { Users } from 'lucide-react-native';
import { TodayInfoRow } from './ui/today-offer-kit';
import { friendsTrainedTodayLine } from '../lib/community/homeFriendsRow';
import { inviteLabel } from '../lib/community/earlyDays';

/** L10 (D221): the line when the member follows nobody, so "nobody you
 * follow has trained" never greets someone with no one to follow. */
export const FIND_PEOPLE_LINE = 'Find people to follow';

// Kit trial 2 (LOC-412, rule 1): drawn with the kit's slim row, so the icon and
// the "Find people" / "Invite" actions are neutral ink, not amber. The row and
// the action are siblings, each its own 48 dp target.
export default function HomeCommunityTodayRow({
  count, gymLabel, onOpen, onInvite, followingNone = false, onFindPeople,
}) {
  const n = Math.max(0, Number(count) || 0);
  const findPeople = followingNone && n === 0;
  const line = findPeople ? FIND_PEOPLE_LINE : friendsTrainedTodayLine(n);

  let action = null;
  if (n === 0) {
    action = findPeople
      ? { label: 'Find people', onPress: () => onFindPeople?.(), accessibilityLabel: 'Find people to follow' }
      : { label: 'Invite', onPress: () => onInvite?.(), accessibilityLabel: inviteLabel({ gymLabel }) };
  }

  return (
    <TodayInfoRow
      icon={Users}
      line={line}
      onPress={findPeople ? onFindPeople : onOpen}
      accessibilityLabel={line}
      testID="home-community-today-row"
      action={action}
    />
  );
}
