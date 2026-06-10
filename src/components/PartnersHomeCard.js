/**
 * PartnersHomeCard
 *
 * A visible Training Partners entry on the Home/Train screen — the research
 * (phase2-07) is unambiguous that a re-engagement feature must NOT live buried
 * in a settings list. Shows a one-line state and opens the full screen.
 *
 * Deliberately defensive about data shape: it only relies on getMyCircles()
 * returning an array (length 0 vs >0). The richer signal detail lives on the
 * Training Partners screen, so a wrong assumption here can never break Home.
 * Renders nothing until loaded (no flash) and self-hides on any error.
 */

import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha } from '../styles/theme';
import { getMyCircles } from '../lib/partners/partnerService';

export default function PartnersHomeCard({ onPress }) {
  const [state, setState] = useState(null); // null = loading, { hasPartner }

  useFocusEffect(useCallback(() => {
    let alive = true;
    getMyCircles()
      .then(circles => { if (alive) setState({ hasPartner: Array.isArray(circles) && circles.length > 0 }); })
      .catch(() => { if (alive) setState({ hasPartner: false }); });
    return () => { alive = false; };
  }, []));

  if (!state) return null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel="Training Partners"
    >
      <View style={styles.iconWrap}>
        <Ionicons name="people" size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Training Partners</Text>
        <Text style={styles.sub}>
          {state.hasPartner
            ? 'See your partner’s week and share yours'
            : 'Invite a partner and keep each other honest'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.25),
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primaryBg,
  },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  sub: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 1 },
});
