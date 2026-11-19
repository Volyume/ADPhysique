/**
 * HomeCommunityIntroCard - the one-time Community introduction on Today
 * (social-discovery blueprint section 14, 2026-09-06).
 *
 * A new person has no labelled path to Community on Today until their
 * first workout summary; the header action is a glyph with no name. This
 * card names it once, after the first completed session, and leads with
 * what Community is for: connecting with people at your gym and your
 * friends, seeing each other's training weeks, and giving respect. Either
 * button dismisses it for good; HomeScreen also never shows it to someone
 * who already has a profile.
 * The gating lives in HomeScreen.js; this file renders only the content,
 * on the shared Card and Button, mirroring HomeHowYouTrainOfferCard.
 *
 * Lead visual review 2026-09-06, ruling V3: same shape as the Community
 * hub hero — `type.h3` title, `type.bodySm` `textSecondary` body, both
 * actions `sm`.
 */
import { Users } from 'lucide-react-native';
import { TodayOfferActions, TodayOfferButton, TodayOfferCard } from './ui/today-offer-kit';

export const COMMUNITY_INTRO_TITLE = 'See who is training';
// V3a (docs/social-discovery-2026-09-06/81-VISUAL-RULINGS.md): drops the
// closing privacy sentence, matching the Community hub hero.
export const COMMUNITY_INTRO_BODY = 'Connect with people at your gym and your friends, see each other\'s training weeks, and give respect.';

// Kit trial 2 (LOC-412, rule 1): drawn with the kit's offer card, so the icon,
// the tint and the buttons spend no amber; the words and actions are as they were.
export default function HomeCommunityIntroCard({ onOpen, onDismiss }) {
  return (
    <TodayOfferCard
      icon={Users}
      title={COMMUNITY_INTRO_TITLE}
      body={COMMUNITY_INTRO_BODY}
      accessibilityLabel={`${COMMUNITY_INTRO_TITLE}. ${COMMUNITY_INTRO_BODY}`}
    >
      <TodayOfferActions>
        <TodayOfferButton icon={Users} label="Have a look" onPress={onOpen} accessibilityLabel="Have a look at Community" />
        <TodayOfferButton look="plain" label="Not now" onPress={onDismiss} accessibilityLabel="Not now. Hides this introduction for good." />
      </TodayOfferActions>
    </TodayOfferCard>
  );
}
