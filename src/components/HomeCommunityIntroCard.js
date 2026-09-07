/**
 * HomeCommunityIntroCard - the one-time Community introduction on Today
 * (social-discovery blueprint section 14, 2026-09-06).
 *
 * A new person has no labelled path to Community on Today until their
 * first workout summary; the header action is a glyph with no name. This
 * card names it once, after the first completed session, and leads with
 * the one thing Volyume does that other apps do not: another lifter's
 * programme refitted to your kit. Either button dismisses it for good;
 * HomeScreen also never shows it to someone who already has a profile.
 * The gating lives in HomeScreen.js; this file renders only the content,
 * on the shared Card and Button, mirroring HomeHowYouTrainOfferCard.
 *
 * Lead visual review 2026-09-06, ruling V3: same shape as the Community
 * hub hero — `type.h3` title, `type.bodySm` `textSecondary` body, both
 * actions `sm`.
 */
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, type, radius } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Card from './Card';
import Button from './Button';

export const COMMUNITY_INTRO_TITLE = 'Other lifters, their programmes, your stories';
// V3a (docs/social-discovery-2026-09-06/81-VISUAL-RULINGS.md): drops the
// closing privacy sentence, matching the Community hub hero.
export const COMMUNITY_INTRO_BODY = 'Use a programme another lifter built, as-is or refitted to your kit, and share the training you actually did.';

export default function HomeCommunityIntroCard({ onOpen, onDismiss }) {
  const t = useTheme();
  return (
    <Card style={styles.card} accessibilityLabel={`${COMMUNITY_INTRO_TITLE}. ${COMMUNITY_INTRO_BODY}`}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: t.colors.primaryBg }]}>
          <Ionicons name="people-outline" size={20} color={t.colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: t.colors.textPrimary }]}>{COMMUNITY_INTRO_TITLE}</Text>
          <Text style={[styles.body, { color: t.colors.textSecondary }]}>{COMMUNITY_INTRO_BODY}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button title="Have a look" icon="people-outline" size="sm" onPress={onOpen} fullWidth={false} accessibilityLabel="Have a look at Community" />
        <Button title="Not now" variant="secondary" size="sm" onPress={onDismiss} fullWidth={false} accessibilityLabel="Not now. Hides this introduction for good." />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  copy: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: { ...type.h3 },
  body: { ...type.bodySm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
