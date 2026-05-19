import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import useAppStore from '../store/useAppStore';

const HERO = require('../../assets/volyume-icon.png');

const FREE_BULLETS = [
  'Unlimited workout logging',
  'Exercise library and Personal Records',
  'Works offline, no account needed',
  'Create an account anytime to back up your data',
];

const PRO_BULLETS = [
  'Weekly coaching and volume tracking',
  'Nutrition and body composition tools',
  'Training block planner',
  'Progress insights and coach export PDF',
];

export default function WelcomeScreen({ navigation }) {
  const { setTier } = useAppStore();

  const fadeIn   = useRef(new Animated.Value(0)).current;
  const slideUp  = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  async function chooseTier(tier) {
    await setTier(tier);
    // Navigation resolves automatically — RootNavigator re-renders on tier change
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.hero, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Image source={HERO} style={styles.logoImg} resizeMode="contain" />
          <Text style={styles.wordmark}>VOLYUME</Text>
          <Text style={styles.tagline}>Less thinking. More lifting.</Text>
        </Animated.View>

        <Animated.View style={[styles.cards, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

          {/* Pro card — top, prominent */}
          <TouchableOpacity style={styles.proCard} onPress={() => chooseTier('pro')} activeOpacity={0.88}>
            <View style={styles.proCardHeader}>
              <View style={styles.proIconWrap}>
                <Ionicons name="sparkles" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.proTitleRow}>
                  <Text style={styles.proTitle}>Pro</Text>
                  <View style={styles.betaBadge}>
                    <Text style={styles.betaBadgeText}>FREE BETA</Text>
                  </View>
                </View>
                <Text style={styles.proSubtitle}>The full coaching experience. Account required.</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.bullets}>
              <Text style={styles.bulletHeader}>Everything in Free, plus:</Text>
              {PRO_BULLETS.map(b => (
                <View key={b} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>

            <View style={styles.proCtaRow}>
              <Text style={styles.proCtaText}>Go Pro, it's free right now</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.background} />
            </View>
          </TouchableOpacity>

          {/* Free card — secondary */}
          <TouchableOpacity style={styles.freeCard} onPress={() => chooseTier('free')} activeOpacity={0.88}>
            <View style={styles.freeCardHeader}>
              <View style={styles.freeIconWrap}>
                <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.freeTitle}>Free</Text>
                <Text style={styles.freeSubtitle}>Log your training, track your PRs.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>

            <View style={styles.freeBullets}>
              {FREE_BULLETS.map(b => (
                <View key={b} style={styles.bulletRow}>
                  <Ionicons name="checkmark" size={14} color={colors.textSecondary} />
                  <Text style={styles.freeBulletText}>{b}</Text>
                </View>
              ))}
            </View>

            <View style={styles.freeBackupNote}>
              <Ionicons name="shield-checkmark-outline" size={13} color={colors.textMuted} />
              <Text style={styles.freeBackupText}>
                Your data stays on your device. Sign up anytime to sync and protect it.
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ opacity: fadeIn }}>
          <TouchableOpacity
            style={styles.signInLink}
            onPress={() => navigation.navigate('Login')}
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          >
            <Text style={styles.signInText}>Already have an account?</Text>
            <Text style={styles.signInAction}> Sign in</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  scroll: { flexGrow: 1, padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxl },

  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl },
  logoImg: { width: 88, height: 88, borderRadius: 20 },
  wordmark: {
    fontSize: 28, fontWeight: fontWeight.black, color: colors.textPrimary,
    letterSpacing: 5, marginTop: spacing.xs,
  },
  tagline: { fontSize: fontSize.sm, color: colors.textMuted, letterSpacing: 0.3 },

  cards: { gap: spacing.md },

  // Pro card
  proCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.primary,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  proCardHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    padding: spacing.lg,
  },
  proIconWrap: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  proTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  proTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.textPrimary },
  betaBadge: {
    backgroundColor: colors.primary, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  betaBadgeText: { fontSize: 9, fontWeight: fontWeight.black, color: colors.background, letterSpacing: 0.5 },
  proSubtitle: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },

  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg },

  bullets: { padding: spacing.lg, gap: spacing.sm },
  bulletHeader: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 2 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bulletText: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },

  proCtaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, paddingVertical: spacing.md, margin: spacing.md,
    borderRadius: radius.lg,
  },
  proCtaText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.background },

  // Free card
  freeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  freeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  freeIconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  freeTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  freeSubtitle: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  freeBullets: { gap: spacing.xs, paddingLeft: spacing.xs },
  freeBulletText: { fontSize: fontSize.xs, color: colors.textMuted, flex: 1 },
  freeBackupNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    marginTop: spacing.xs, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  freeBackupText: { fontSize: 11, color: colors.textMuted, flex: 1, lineHeight: 16 },

  signInLink: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  signInText: { fontSize: fontSize.sm, color: colors.textMuted },
  signInAction: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
});
