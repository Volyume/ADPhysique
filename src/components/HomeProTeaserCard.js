import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontWeight, spacing, radius, withAlpha, alpha, type, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';

// Extracted from HomeScreen.js (behaviour-preserving decomposition).
// Pro teaser (free tier only, after 3+ sessions). Sits below the hero, same
// hero-first reorder as everything else on the free no-plan path.
function HomeProTeaserCard({ totalSessions, teaserInsight, onPress }) {
  // CP-10 stage 3 (theming batch 2): live theme, same append-after pattern
  // as batch 1 (see HomeWelcomeCard.js). `styles` stays frozen; `live`
  // carries the colour-bearing keys only.
  const t = useTheme();
  const live = {
    proTeaserCard: { backgroundColor: t.colors.surface, borderColor: withAlpha(t.colors.primary, alpha.edge) },
    proTeaserTitle: { ...t.type.bodySm, fontWeight: fontWeight.semibold, color: t.colors.textPrimary },
  };
  return (
    <TouchableOpacity
      style={[styles.proTeaserCard, live.proTeaserCard]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel="Learn about Pro coaching"
    >
      <View style={styles.proTeaserLeft}>
        <Ionicons name="barbell-outline" size={18} color={t.colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.proTeaserTitle, live.proTeaserTitle]}>
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
      <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
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
