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

import { View, StyleSheet } from 'react-native';
import Text from './Text';
import Card from './Card';
import Button from './Button';
import { COACHING_SETUP_COPY } from '../lib/coachingSetup';
import { spacing, fontSize, fontWeight } from '../styles/theme';
import useTheme from '../hooks/useTheme';

export default function CoachingSetupCard({ variant = 'coach', onPress }) {
  const { colors } = useTheme();
  const body = variant === 'nutrition' ? COACHING_SETUP_COPY.nutritionBody : COACHING_SETUP_COPY.body;
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
        onPress={onPress}
        accessibilityLabel="Set up coaching"
        testID="coaching-setup-card-action"
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  text: { gap: spacing.xs },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  body: { fontSize: fontSize.md },
});
