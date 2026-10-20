/**
 * CoachingSetupCard
 *
 * The calm, non-blocking card every coach-owned surface shows until a
 * quick-start person sets up coaching (founder brief 2026-10-19,
 * "coaching-first onboarding with an optional quick start"). Copy comes from
 * src/lib/coachingSetup.js; no alarm colours or icons, just the house card
 * surface and one primary action. `variant` picks the body: 'coach' (default)
 * or 'nutrition'.
 */

import { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Text from './Text';
import Card from './Card';
import Button from './Button';
import { COACHING_SETUP_COPY } from '../lib/coachingSetup';
import { spacing, fontSize, fontWeight, radius } from '../styles/theme';
import { touchTarget } from '../styles/layout';
import useTheme from '../hooks/useTheme';
import { trackNow, trackOncePerDay, trackFeatureSeen } from '../lib/telemetry/growth';

// `body` replaces the variant's sentence for a surface that has its own reason
// to set coaching up (the gym challenge screen); the title and action stay.
// `mode` 'compact' is one quiet row for a surface that has already shown the
// full card; `onNotNow` (full mode) adds a quiet "Not now" under the action.
export default function CoachingSetupCard({ variant = 'coach', onPress, surface = 'unknown', body: bodyOverride, mode = 'full', onNotNow }) {
  const { colors } = useTheme();
  useEffect(() => {
    try {
      trackOncePerDay('coaching_setup_card_shown', { surface, mode }, `${surface}:${mode}`);
      trackFeatureSeen('coaching_setup_card');
    } catch (_) { /* telemetry never blocks the card */ }
  }, [surface, mode]);
  if (mode === 'compact') {
    return (
      <Pressable
        testID="coaching-setup-row"
        onPress={() => {
          try { trackNow('coaching_setup_started', { entry: surface }); } catch (_) { /* telemetry only */ }
          if (onPress) onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel="Coaching isn't set up yet. Set up coaching"
        style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
      >
        <Text style={[styles.rowText, { color: colors.textSecondary }]}>{COACHING_SETUP_COPY.compact}</Text>
        <View style={styles.rowAction}>
          <Text style={[styles.rowActionText, { color: colors.textPrimary }]}>{COACHING_SETUP_COPY.compactAction}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </View>
      </Pressable>
    );
  }
  const body = bodyOverride ?? (variant === 'nutrition' ? COACHING_SETUP_COPY.nutritionBody : COACHING_SETUP_COPY.body);
  return (
    <Card testID="coaching-setup-card" style={styles.card}>
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.textPrimary }]} accessibilityRole="header">
          {COACHING_SETUP_COPY.title}
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
      </View>
      <Button
        title={COACHING_SETUP_COPY.action}
        onPress={() => {
          try { trackNow('coaching_setup_started', { entry: surface }); } catch (_) { /* telemetry only */ }
          if (onPress) onPress();
        }}
        accessibilityLabel="Set up coaching"
        testID="coaching-setup-card-action"
      />
      {onNotNow ? (
        <Button
          title={COACHING_SETUP_COPY.notNow}
          variant="secondary"
          onPress={() => {
            try { trackNow('coaching_setup_card_snoozed', { surface }); } catch (_) { /* telemetry only */ }
            onNotNow();
          }}
          accessibilityLabel={COACHING_SETUP_COPY.notNow}
          testID="coaching-setup-card-not-now"
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  text: { gap: spacing.xs },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  body: { fontSize: fontSize.md },
  row: {
    minHeight: touchTarget.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  rowText: { flex: 1, fontSize: fontSize.md },
  rowAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowActionText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
