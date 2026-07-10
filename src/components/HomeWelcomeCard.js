import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, circle, withAlpha, alpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Card from './Card';

// Extracted from HomeScreen.js (behaviour-preserving decomposition).
//
// First-launch orientation (founder 2026-06-30): a calm welcome for a
// brand-new user, shown only until the first session is logged
// (totalSessions === 0) and dismissible. The two steps are INSTRUCTION
// that points at the start action below, never duplicate buttons, so it
// orients without competing with the hero / starter cards. Research:
// docs competitive-mastery (Cronometer drip-one-pointer) + NN/G empty
// states. No weight/calorie line here (ED-safety).
//
// The gating condition (!initialLoading && totalSessions === 0 &&
// !welcomeDismissed && activePlan && nextWorkout) stays in HomeScreen.js;
// this component only renders the card's own content.
function HomeWelcomeCard({ onDismiss }) {
  // CP-10 stage 3 (theming batch 2): live theme (src/hooks/useTheme.js).
  // `styles` below stays frozen (byte-identical StyleSheet.create, matching
  // batch 1's pattern); `live` carries the colour AND fontSize-bearing keys
  // (fontSize also flips under Larger Text), appended AFTER the frozen base
  // in each style array so a theme change re-renders this card with no
  // restart, at identical rest values.
  const t = useTheme();
  const live = {
    welcomeTitle: { fontSize: t.fontSize.lg, color: t.colors.textPrimary },
    welcomeStepNum: { backgroundColor: withAlpha(t.colors.primary, alpha.tint) },
    welcomeStepNumText: { fontSize: t.fontSize.xs, color: t.colors.primary },
    welcomeStepTitle: { fontSize: t.fontSize.md, color: t.colors.textPrimary },
    welcomeStepBody: { fontSize: t.fontSize.sm, color: t.colors.textSecondary, lineHeight: t.fontSize.sm + 5 },
  };
  return (
    <Card style={styles.welcomeCard}>
      <View style={styles.welcomeHead}>
        <Text style={[styles.welcomeTitle, live.welcomeTitle]}>Welcome to Volyume</Text>
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss the welcome guide"
        >
          <Ionicons name="close" size={18} color={t.colors.textMuted} />
        </TouchableOpacity>
      </View>
      <View style={styles.welcomeStep}>
        <View style={[styles.welcomeStepNum, live.welcomeStepNum]}><Text style={[styles.welcomeStepNumText, live.welcomeStepNumText]}>1</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.welcomeStepTitle, live.welcomeStepTitle]}>Start a session below</Text>
          <Text style={[styles.welcomeStepBody, live.welcomeStepBody]}>Begin from your plan, or just log freely. Tap Start workout and log each set as you go.</Text>
        </View>
      </View>
      <View style={styles.welcomeStep}>
        <View style={[styles.welcomeStepNum, live.welcomeStepNum]}><Text style={[styles.welcomeStepNumText, live.welcomeStepNumText]}>2</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.welcomeStepTitle, live.welcomeStepTitle]}>Your coach learns as you train</Text>
          <Text style={[styles.welcomeStepBody, live.welcomeStepBody]}>Every session you log sharpens your plan. There is nothing to set up.</Text>
        </View>
      </View>
    </Card>
  );
}

export default React.memo(HomeWelcomeCard);

const styles = StyleSheet.create({
  // First-launch welcome guide
  welcomeCard: {
    gap: spacing.md,
  },
  welcomeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  welcomeStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  welcomeStepNum: {
    width: 22,
    height: 22,
    borderRadius: circle(22),
    backgroundColor: withAlpha(colors.primary, alpha.tint),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.hair,
  },
  welcomeStepNumText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  welcomeStepTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  welcomeStepBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: fontSize.sm + 5,
  },
});
