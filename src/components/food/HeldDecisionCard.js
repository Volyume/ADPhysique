/**
 * HeldDecisionCard: the card that appears in the weekly coach
 * output when the FFM floor, ED-pattern flag, or rapid-loss
 * safety override fires.
 *
 * Spec: UI_FLOWS_LOCKED.md lines 248-269.
 *   - Header: amber badge "Held this week"
 *   - Body: plain-English explanation
 *   - Optional "Why" link for the longer explanation
 *   - For ED-pattern only: "Get support" button linking to Beat
 */
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { appAlert } from '../AppAlert';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

const BEAT_URL = 'https://www.beateatingdisorders.org.uk/';

// The support path must never dead-end. If the link can't open, surface the
// address so the user can still reach help, rather than swallowing the error.
function openSupport() {
  Linking.openURL(BEAT_URL).catch(() => {
    appAlert('Get support', `You can reach Beat at ${BEAT_URL}`);
  });
}

/**
 * @param {Object} props
 * @param {'ffm_floor'|'ed_pattern'|'rapid_loss'} props.type
 * @param {string} props.body - plain-English explanation
 * @param {() => void} [props.onWhy] - opens longer explanation
 */
export default function HeldDecisionCard({ type, body, onWhy }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={[styles.card, live.card]} accessibilityRole="text">
      <View style={styles.badgeRow}>
        <View style={[styles.badge, live.badge]}>
          <Text style={[styles.badgeText, live.badgeText]}>Held this week</Text>
        </View>
      </View>
      <Text style={[styles.body, live.body]}>{body}</Text>
      {onWhy ? (
        <Pressable
          onPress={onWhy}
          accessibilityRole="button"
          accessibilityLabel="Why was this held"
          hitSlop={8}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.why, live.why]}>Why?</Text>
        </Pressable>
      ) : null}
      {type === 'ed_pattern' ? (
        <Pressable
          onPress={openSupport}
          accessibilityRole="link"
          accessibilityLabel="Open Beat support"
          style={({ pressed }) => [styles.supportButton, live.supportButton, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.supportText, live.supportText]}>Get support</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  badgeRow: { flexDirection: 'row', marginBottom: spacing.sm },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryFill,
  },
  badgeText: {
    ...type.captionStrong,
    color: colors.onPrimary,
  },
  body: {
    ...type.bodySm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  why: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.xs,
  },
  supportButton: {
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  supportText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. badgeRow has no colour tokens.
function buildLiveStyles(t) {
  return {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    badge: { backgroundColor: t.colors.primaryFill },
    badgeText: { color: t.colors.onPrimary },
    body: { color: t.colors.textPrimary },
    why: { color: t.colors.primary },
    supportButton: { backgroundColor: t.colors.background, borderColor: t.colors.primary },
    supportText: { color: t.colors.primary },
  };
}
