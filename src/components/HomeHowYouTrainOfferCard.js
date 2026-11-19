/**
 * HomeHowYouTrainOfferCard - the one-time Injuries & limitations offer on
 * Home (founder decision D134, 2026-09-03; renamed in copy by D152, the
 * file name is deliberately unchanged).
 *
 * Shown to a person with nothing set up under Injuries & limitations,
 * once the welcome card has retired and only when no ranked banner holds Home's attention
 * slot. It is an OFFER in the person's words, never a question that asks
 * them to classify themselves (banked research: the DfE door). Either
 * button dismisses it forever; HomeScreen also retires it by itself the
 * moment anything is set up. The gating lives in HomeScreen.js; this file
 * renders only the card's content, on the shared Card and Button.
 */
import { PersonStanding } from 'lucide-react-native';
import { TodayOfferActions, TodayOfferButton, TodayOfferCard } from './ui/today-offer-kit';

// Kit trial 2 (LOC-412, rule 1): drawn with the kit's offer card, so the icon,
// the tint and the buttons spend no amber. The words, the two actions and the
// labels are as they were.
export default function HomeHowYouTrainOfferCard({ onSetUp, onDismiss }) {
  return (
    <TodayOfferCard
      icon={PersonStanding}
      title="Anything Volyume should build your training around?"
      body="Injuries, pain, long-term conditions or disabilities. Tell Volyume once and it takes them into account when choosing exercises and building your training. Entirely optional, and you can change it any time."
      accessibilityLabel="Anything Volyume should build your training around? Injuries, pain, long-term conditions or disabilities. Entirely optional."
    >
      <TodayOfferActions>
        <TodayOfferButton label="Set it up" onPress={onSetUp} />
        <TodayOfferButton look="plain" label="No thanks" onPress={onDismiss} accessibilityLabel="No thanks. Hides this offer for good." />
      </TodayOfferActions>
    </TodayOfferCard>
  );
}
