import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontWeight, spacing, radius, withAlpha, alpha, type, iconSize } from '../styles/theme';

// Extracted from HomeScreen.js (behaviour-preserving decomposition).
// Pro teaser (free tier only, after 3+ sessions). Sits below the hero, same
// hero-first reorder as everything else on the free no-plan path.
function HomeProTeaserCard({ totalSessions, teaserInsight, onPress }) {
  return (
    <TouchableOpacity
      style={styles.proTeaserCard}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel="Learn about Pro coaching"
    >
      <View style={styles.proTeaserLeft}>
        <Ionicons name="barbell-outline" size={18} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.proTeaserTitle}>
            {teaserInsight?.progressed && teaserInsight?.stalled
              ? `${teaserInsight.progressed} went up. ${teaserInsight.stalled} held. Pro tells you what to do next.`
              : teaserInsight?.progressed
                ? `${teaserInsight.progressed} progressed this week. Pro builds on it.`
                : totalSessions >= 10
                  ? `${totalSessions} sessions logged. Pro coaching uses all of it.`
                  : 'Add a coach that adjusts your plan each week.'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export default React.memo(HomeProTeaserCard);

const styles = StyleSheet.create({
  proTeaserCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.edge),
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  proTeaserLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  proTeaserTitle: {
    ...type.bodySm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    flex: 1,
  },
});
