import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontWeight, spacing, radius, withAlpha, alpha, type, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import useAppStore from '../store/useAppStore';
import { localWeekStartMs } from '../lib/dayKey';

// Extracted from HomeScreen.js (behaviour-preserving decomposition).
// Pro teaser (free tier only, after 3+ sessions). Sits below the hero, same
// hero-first reorder as everything else on the free no-plan path.
//
// FM-05 (D96): this was the only permanent, undismissible card on Home.
// From session 3 it rendered on every Home load for the rest of the user's
// life, while every sibling on the screen carries a close control (coach
// banner, trial card, recovery week, phase, plateau, activation, the free
// weekly line). It now takes the SAME per-week dismissal the free weekly
// line already uses, keyed per user per local week, so it returns quietly
// each week instead of never ending. Nothing about who sees it, when it
// first appears, or what it says has changed - frequency only, no tier or
// scope change.
const dismissKey = (uid, weekMs) => `@volyume_pro_teaser_dismissed_${uid}_${weekMs}`;

function HomeProTeaserCard({ totalSessions, teaserInsight, onPress }) {
  const userId = useAppStore(s => s.user?.id);
  // Defaults to dismissed so a card the user already closed can never flash
  // for a frame before the stored read resolves (the trial-banner /
  // free-coach-line pattern).
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!userId) { setDismissed(true); return () => { alive = false; }; }
    AsyncStorage.getItem(dismissKey(userId, localWeekStartMs()))
      .then(v => { if (alive) setDismissed(v === 'true'); })
      .catch(() => { if (alive) setDismissed(false); });
    return () => { alive = false; };
  }, [userId]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    if (userId) {
      AsyncStorage.setItem(dismissKey(userId, localWeekStartMs()), 'true').catch(() => {});
    }
  }, [userId]);

  // CP-10 stage 3 (theming batch 2): live theme, same append-after pattern
  // as batch 1 (see HomeWelcomeCard.js). `styles` stays frozen; `live`
  // carries the colour-bearing keys only.
  const t = useTheme();
  const live = {
    proTeaserCard: { backgroundColor: t.colors.surface, borderColor: withAlpha(t.colors.primary, alpha.edge) },
    proTeaserTitle: { ...t.type.bodySm, fontWeight: fontWeight.semibold, color: t.colors.textPrimary },
  };
  if (dismissed) return null;
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
            {/* C6 RD6-6 (D97-25): the comparison reads MAX WEIGHT only,
                so the copy names the weight rather than passing a verdict
                on the lift - "held" contradicted a genuine rep PR. */}
            {teaserInsight?.progressed && teaserInsight?.stalled
              ? `${teaserInsight.progressed} added weight. ${teaserInsight.stalled} stayed at the same top weight. Pro tells you what to do next.`
              : teaserInsight?.progressed
                ? `${teaserInsight.progressed} added weight last session. Pro builds on it.`
                : totalSessions >= 10
                  ? `${totalSessions} sessions logged. Pro coaching uses all of it.`
                  : 'Add a coach that adjusts your plan each week.'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
      <TouchableOpacity
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss the Pro suggestion"
      >
        <Ionicons name="close" size={16} color={t.colors.textMuted} />
      </TouchableOpacity>
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
