import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontWeight, spacing, radius, withAlpha, alpha, type } from '../styles/theme';

// ── Coach Brief Card ──────────────────────────────────────────────────────────
// Extracted from HomeScreen.js (behaviour-preserving decomposition): the
// pre-workout coaching brief card shown in the hero when buildCoachBrief
// (src/lib/homeCoachBrief.js) has a real signal. Pure presentational
// component; the brief itself is computed by the caller.

const BRIEF_ICON = { go: 'fitness-outline', caution: 'warning-outline', recover: 'leaf-outline' };
const BRIEF_BORDER = {
  go:      withAlpha(colors.primary, alpha.soft),
  caution: withAlpha(colors.warning, alpha.soft),
  recover: withAlpha(colors.success, alpha.soft),
};
// Exported: HomeScreen's own readiness-summary chip (S15#7) reuses the same
// tone colours so the chip and this card read as one family.
export const BRIEF_ICON_COLOR = {
  go:      colors.primary,
  caution: colors.warning,
  recover: colors.success,
};

function CoachBriefCard({ brief, onDismiss }) {
  const borderColor = BRIEF_BORDER[brief.type] ?? BRIEF_BORDER.go;
  const iconColor   = BRIEF_ICON_COLOR[brief.type] ?? BRIEF_ICON_COLOR.go;
  const iconName    = BRIEF_ICON[brief.type] ?? BRIEF_ICON.go;

  return (
    <View style={[styles.coachBriefCard, { borderColor }]}>
      <Ionicons name={iconName} size={18} color={iconColor} style={{ marginTop: spacing.xxs }} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.coachBriefHeadline}>{brief.headline}</Text>
        <Text style={styles.coachBriefBody}>{brief.body}</Text>
      </View>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Dismiss coaching brief"
      >
        <Ionicons name="close" size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(CoachBriefCard);

const styles = StyleSheet.create({
  // Pre-workout coaching brief card
  coachBriefCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  coachBriefHeadline: {
    ...type.bodySm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  coachBriefBody: {
    ...type.captionTight,
    color: colors.textSecondary,
  },
});
