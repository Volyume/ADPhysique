import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';

/**
 * Food layer intro screen.
 *
 * Locked copy in docs/ONBOARDING_SEQUENCE_LOCKED.md screen 10. Shown
 * once per user during the new-user flow, after equipment + frequency
 * and before notifications permission. Two paths out: "Set it up
 * later" closes the intro and continues; "Add a food now" routes to
 * the Food Search screen. Barcode CTA waits for Move #1.5; until then
 * the action button reads "Add a food now" and goes to text search.
 *
 * Navigation contract:
 * - route.params.onComplete (optional): called when either CTA is
 *   tapped. ProOnboardingScreen passes this in to chain back into
 *   the step machine after intro is dismissed.
 */
export default function FoodLayerIntroScreen({ navigation, route }) {
  const onComplete = route?.params?.onComplete;

  function handleLater() {
    if (onComplete) onComplete({ openedSearch: false });
    else navigation.goBack();
  }

  function handleAddNow() {
    if (onComplete) onComplete({ openedSearch: true });
    // Route into the food layer's main entry. Diary tab opens with
    // the meal slot picker; user taps "Add food" to reach Search.
    navigation.navigate('Diary');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.iconWrap}>
          <Ionicons name="restaurant-outline" size={42} color={colors.primary} />
        </View>

        <Text style={styles.title}>Food tracking, made light</Text>

        <Text style={styles.body}>Volyume can use your food data to:</Text>

        <View style={styles.bullets}>
          {[
            'Tell you if a stalled lift is training or fuel',
            'Catch low-fuelling before it becomes a problem',
            'Adapt your calorie target as you go',
          ].map((line, i) => (
            <View key={i} style={styles.bulletRow}>
              <Ionicons name="ellipse" size={6} color={colors.primary} style={styles.bulletDot} />
              <Text style={styles.bulletText}>{line}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.body}>
          You can log foods by scanning a barcode, typing a name, or snapping a label. Most things resolve in under a second.
        </Text>

        <Text style={styles.prompt}>Want to try it now or set it up later?</Text>

        <TouchableOpacity onPress={handleAddNow} style={styles.ctaPrimary} accessibilityRole="button">
          <Text style={styles.ctaPrimaryText}>Add a food now</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLater} style={styles.ctaGhost} accessibilityRole="button">
          <Text style={styles.ctaGhostText}>Set it up later</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  iconWrap: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  body: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  bullets: { gap: spacing.xs, marginVertical: spacing.sm },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bulletDot: { marginTop: 9 },
  bulletText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  prompt: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  ctaPrimary: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  ctaPrimaryText: { color: '#000', fontWeight: fontWeight.bold, fontSize: fontSize.md },
  ctaGhost: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  ctaGhostText: { color: colors.textSecondary, fontWeight: fontWeight.medium, fontSize: fontSize.md },
});
