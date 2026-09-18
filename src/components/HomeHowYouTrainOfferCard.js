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
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, type, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { touchTarget } from '../styles/layout';

// D192 (finish spec 4.3, 4.7; 2026-09-18): the offer keeps D134's shape in
// substance -- an offer in the person's words, once, either action retiring
// it -- and loses its card, its three-line paragraph and its two buttons.
// It is a ROW now: a glyph, the offer as the title, the one line of what it
// covers, a "Set it up" text action and a quiet dismiss. On the founder's
// build-3583 walk this card sat above the session hero as the first thing
// on Today.
export default function HomeHowYouTrainOfferCard({ onSetUp, onDismiss }) {
  const t = useTheme();
  return (
    <View
      style={[styles.row, { borderTopColor: t.colors.borderSubtle, borderBottomColor: t.colors.borderSubtle }]}
      accessibilityLabel="Anything Volyume should build your training around? Injuries, pain, long-term conditions or disabilities. Entirely optional."
    >
      <Ionicons name="body-outline" size={iconSize.md} color={t.colors.textSecondary} style={styles.glyph} />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: t.colors.textPrimary }]}>Anything Volyume should build your training around?</Text>
        <Text style={[styles.body, { color: t.colors.textSecondary }]} numberOfLines={1}>
          Injuries, pain, long-term conditions or disabilities.
        </Text>
        <TouchableOpacity onPress={onSetUp} accessibilityRole="button" accessibilityLabel="Set it up. Entirely optional." style={styles.action}>
          <Text style={[styles.actionText, { color: t.colors.textPrimary }]}>Set it up</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="No thanks. Hides this offer for good."
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.dismiss}
      >
        <Ionicons name="close" size={iconSize.sm} color={t.colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    paddingVertical: spacing.md, marginBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  glyph: { marginTop: spacing.xxs },
  copy: { flex: 1, minWidth: 0, gap: spacing.xxs },
  title: { ...type.title },
  body: { ...type.bodySm },
  action: { alignSelf: 'flex-start', minHeight: touchTarget.minimum, justifyContent: 'center', marginTop: spacing.xs },
  actionText: { ...type.title },
  dismiss: { width: touchTarget.minimum, height: touchTarget.minimum, alignItems: 'center', justifyContent: 'center', marginRight: -spacing.sm, marginTop: -spacing.sm },
});
