import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import useAppStore from '../store/useAppStore';

const HERO = require('../../assets/volyume-wordmark.png');
const HERO_ASPECT = 1032 / 277;

const FREE_BULLETS = [
  'Unlimited workout logging, fully offline',
  'Exercise library and Personal Records',
  'Plan library and custom plan builder',
  'Training blocks and full progress stats',
];

const PRO_BULLETS = [
  'A plan built around your schedule, goals, and experience level',
  'Precision Coaching that adjusts your training and nutrition as your body responds',
  'Personalised calorie and protein targets, updated as your goals change',
  'After every check-in, your coach explains every decision. What changed, what was left alone, and why.',
];

export default function WelcomeScreen({ navigation }) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);

  const fadeIn   = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const slideUp  = useRef(new Animated.Value(reduceMotion ? 0 : 24)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  // Per IDENTITY_AND_OWNERSHIP_LOCKED.md decision 1: no anonymous
  // mode. Both Free and Pro CTAs route to the sign-up flow. Free
  // users still get the Free tier, they just create a real account
  // first so their data is cloud-backed and cross-device safe by
  // construction. Tier flip happens post-auth via
  // LoginScreen.newAccountSetup (Pro) or the same flow defaulting to
  // Free if the user doesn't enable Pro.
  function chooseTier(tier) {
    navigation.navigate('Login', { intent: tier === 'pro' ? 'pro_signup' : 'free_signup' });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.hero, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Image source={HERO} style={styles.logoImg} resizeMode="contain" />
          <Text style={styles.tagline}>Less thinking. More lifting.</Text>
        </Animated.View>

        <Animated.View style={[styles.disqualifier, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Text style={styles.disqualifierTitle}>Who Volyume is for</Text>
          <Text style={styles.disqualifierBody}>
            Lifters who want a coach reading their weight, food, energy, and training together, then adjusting each week. The Free tier is a clean logbook. Pro is the weekly read.
          </Text>
          <Text style={styles.disqualifierBody}>
            Volyume is built for a few weeks of consistent data: that is when the weekly read earns its place. If you only want a quick tap-to-log or a standalone calorie counter, it is more than you need.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.cards, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

          {/* Pro card, top, prominent */}
          <TouchableOpacity style={styles.proCard} onPress={() => chooseTier('pro')} activeOpacity={0.88}>
            <View style={styles.proCardHeader}>
              <View style={styles.proIconWrap}>
                <Ionicons name="sparkles" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.proTitleRow}>
                  <Text style={styles.proTitle}>Pro</Text>
                  <View style={styles.betaBadge}>
                    <Text style={styles.betaBadgeText}>Free beta</Text>
                  </View>
                </View>
                <Text style={styles.proSubtitle}>The coach who writes back.</Text>
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
              <Text style={styles.proCtaText}>Go Pro</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.background} />
            </View>
          </TouchableOpacity>

          {/* Free card, secondary */}
          <TouchableOpacity style={styles.freeCard} onPress={() => chooseTier('free')} activeOpacity={0.88}>
            <View style={styles.freeCardHeader}>
              <View style={styles.freeIconWrap}>
                <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.freeTitle}>Free</Text>
                <Text style={styles.freeSubtitle}>The logbook a coach would write in. Yours forever.</Text>
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
                Your free account keeps every session backed up and synced across devices. No card, no ads.
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ opacity: fadeIn }}>
          <Text style={styles.tierNote}>
            Both tiers are a free account. No card. About a minute to set up.
          </Text>
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

        <Animated.View style={{ opacity: fadeIn }}>
          <Text style={styles.founderNote}>
            Built by a lifter, for lifters. Not a generic fitness app.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxl },

  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl },
  // Sized down so the wordmark reads as a brand mark, not a billboard.
  // Dialled from 200→150, at 200 it was still overpowering the Pro
  // card below; 150 keeps the brand visible without dominating.
  logoImg: { width: 150, height: Math.round(150 / HERO_ASPECT) },
  wordmark: {
    // eslint-disable-next-line no-restricted-syntax -- welcome hero title, intentional display size
    fontSize: 28, fontWeight: fontWeight.black, color: colors.textPrimary,
    letterSpacing: 5, marginTop: spacing.xs,
  },
  tagline: { fontSize: fontSize.sm, color: colors.textMuted, letterSpacing: 0.3 },

  disqualifier: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  disqualifierTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  disqualifierBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },

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
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
  },
  betaBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.black, color: colors.background, letterSpacing: 0.5 },
  proSubtitle: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },

  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg },

  bullets: { padding: spacing.lg, gap: spacing.sm },
  bulletHeader: { ...type.caption, color: colors.textMuted, marginBottom: spacing.xxs },
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
  freeSubtitle: { ...type.caption, color: colors.textMuted, marginTop: 1 },
  freeBullets: { gap: spacing.xs, paddingLeft: spacing.xs },
  freeBulletText: { ...type.caption, color: colors.textMuted, flex: 1 },
  freeBackupNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    marginTop: spacing.xs, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  freeBackupText: { fontSize: fontSize.xs, color: colors.textMuted, flex: 1, lineHeight: 16 },

  tierNote: {
    fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center',
    letterSpacing: 0.2,
  },

  signInLink: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  signInText: { fontSize: fontSize.sm, color: colors.textMuted },
  signInAction: { ...type.label, color: colors.primary },


  founderNote: {
    ...type.caption, color: colors.textMuted, textAlign: 'center',
    paddingBottom: spacing.md, opacity: 0.6,
  },
});
