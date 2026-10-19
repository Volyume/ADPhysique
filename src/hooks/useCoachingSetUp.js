/**
 * useCoachingSetUp: whether the signed-in person has set up coaching (founder
 * brief 2026-10-19, coaching-first onboarding with an optional quick start).
 * Reads the profile with a single selector. `openCoachingSetup` opens the
 * CoachingSetup route, which lives in ProfileStack (the Coach tab).
 */
import useAppStore from '../store/useAppStore';
import { isCoachingSetUp } from '../lib/coachingSetup';
import { navigateCrossTab } from '../navigation/navigateCrossTab';

export default function useCoachingSetUp() {
  const userProfile = useAppStore((s) => s.userProfile);
  return isCoachingSetUp(userProfile);
}

/** From other tabs; inside ProfileStack a plain navigate('CoachingSetup') also works. */
export function openCoachingSetup(navigation) {
  navigateCrossTab(navigation, 'ProfileTab', 'CoachingSetup');
}
