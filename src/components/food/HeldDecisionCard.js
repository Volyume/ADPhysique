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
import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius } from '../../styles/theme';

const BEAT_URL = 'https://www.beateatingdisorders.org.uk/';

/**
 * @param {Object} props
 * @param {'ffm_floor'|'ed_pattern'|'rapid_loss'} props.type
 * @param {string} props.body - plain-English explanation
 * @param {() => void} [props.onWhy] - opens longer explanation
 */
export default function HeldDecisionCard({ type, body, onWhy }) {
  return (
    <View style={styles.card} accessibilityRole="text">
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Held this week</Text>
        </View>
      </View>
      <Text style={styles.body}>{body}</Text>
      {onWhy ? (
        <Pressable
          onPress={onWhy}
          accessibilityRole="button"
          accessibilityLabel="Why was this held"
          hitSlop={8}
        >
          <Text style={styles.why}>Why?</Text>
        </Pressable>
      ) : null}
      {type === 'ed_pattern' ? (
        <Pressable
          onPress={() => Linking.openURL(BEAT_URL).catch(() => {})}
          accessibilityRole="link"
          accessibilityLabel="Open Beat support"
          style={styles.supportButton}
        >
          <Text style={styles.supportText}>Get support</Text>
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
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  badgeText: {
    color: '#0D0D0D',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  body: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  why: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginTop: 4,
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
