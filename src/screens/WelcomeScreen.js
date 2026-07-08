import { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, motion } from '../styles/theme';
import InfoTooltip from '../components/InfoTooltip';
import Card from '../components/Card';
import { GLOSSARY } from '../lib/coachGlossary';
import { storeName } from '../lib/storeName';
import useAppStore from '../store/useAppStore';
import { usePlayPrices } from '../lib/payments/usePlayPrices';
import { ONBOARDING_QUIZ_FIRST } from '../lib/onboarding/quizFlow';

const HERO = require('../../assets/volyume-wordmark.png');
const HERO_ASPECT = 1032 / 277;

// OB-1 (founder decision 2026-07-02): Welcome is TRIAL-FIRST. The old
// Free/Pro pair was a dead control: both cards routed to the same sign-up
// (the intent param had no consumer) and every consenting new user starts
// the 14-day trial at Article 9 regardless. One honest CTA now says what
// actually happens, and the free tier is stated as what remains after the
// trial rather than sold as a competing choice.
const TRIAL_BULLETS = [
  'A plan built around your schedule, goals, and experience level.',
  'Your training and nutrition adjust as your body responds.',
  'Personalised calorie and protein targets, updated as your goals change.',
  'The Coach explains what changed, what stayed the same, and why.',
];

const AFTER_TRIAL_BULLETS = [
  'Unlimited workout logging',
  'Exercise library and Personal Records',
  'Plan library and custom plan builder',
  'Training blocks and full progress stats',
];

export default function WelcomeScreen({ navigation }) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  // PLAY-002: show Google Play's localised price, or drop the figure until it
  // loads. Never a hardcoded fallback.
  const priceFor = usePlayPrices();
  const monthlyPrice = priceFor('pro', 'monthly');

  const fadeIn   = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const slideUp  = useRef(new Animated.Value(reduceMotion ? 0 : 24)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: motion.hero, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: motion.hero, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per IDENTITY_AND_OWNERSHIP_LOCKED.md decision 1: no anonymous mode.
  // The one CTA routes to sign-up; the trial starts at Article 9 as it
  // always did (that locked rule is untouched by this reframe), and a
  // non-subscriber steps down to the free tier afterwards.
  function startTrial() {
    // COMP-030: when quiz-first is on, the CTA opens the pre-account quiz
    // (the plan takes shape before the account wall).
    if (ONBOARDING_QUIZ_FIRST) {
      navigation.navigate('QuizTraining');
      return;
    }
    navigation.navigate('Login', { intent: 'pro_signup' });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.hero, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Image source={HERO} style={styles.logoImg} resizeMode="contain" />
          <Text style={styles.tagline}>Less thinking. More lifting.</Text>
        </Animated.View>

        <Animated.View style={[styles.cards, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

          {/* OB-1: the one trial card. Everyone starts with the full app for
              14 days; the CTA says exactly that. */}
          <Card radius="xl" padding="none" style={styles.proCard} onPress={startTrial}>
            <View style={styles.proCardHeader}>
              <View style={styles.proIconWrap}>
                <Ionicons name="sparkles" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.proTitleRow}>
                  <Text style={styles.proTitle}>The full app, free for 14 days</Text>
                </View>
                <Text style={styles.proSubtitle}>A deterministic coaching system that adjusts from your logged training.</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.bullets}>
              {TRIAL_BULLETS.map(b => (
                <View key={b} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                  <Text style={styles.bulletText}>{b}</Text>
                  {/* U-E-1: inline gloss for the coach term on first appearance. */}
                  {b.includes('Coach') && (
                    <InfoTooltip text={GLOSSARY.precisionCoaching} size={13} />
                  )}
                </View>
              ))}
            </View>

            <Text style={styles.trialNote}>
              {monthlyPrice
                ? `No card needed. Afterwards it's ${monthlyPrice} a month on ${storeName()}, or carry on free.`
                : `No card needed. Afterwards it's a monthly subscription on ${storeName()}, or carry on free.`}
            </Text>

            <View style={styles.proCtaRow}>
              <Text style={styles.proCtaText}>Start your 14 days</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} />
            </View>
          </Card>

          {/* OB-1: the free tier stated honestly as what remains after the
              trial. Informational, not a competing choice (the old Free CTA
              was a dead control: it routed to the identical sign-up). */}
          <Card radius="xl" style={styles.freeCard}>
            <View style={styles.freeCardHeader}>
              <View style={styles.freeIconWrap}>
                <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.freeTitle}>Yours free, always</Text>
                <Text style={styles.freeSubtitle}>If you don&apos;t subscribe after the trial, these stay.</Text>
              </View>
            </View>

            <View style={styles.freeBullets}>
              {AFTER_TRIAL_BULLETS.map(b => (
                <View key={b} style={styles.bulletRow}>
                  <Ionicons name="checkmark" size={14} color={colors.textSecondary} />
                  <Text style={styles.freeBulletText}>{b}</Text>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>

        {/* Trust row (COMP-012): one muted, non-interactive line that
            applies to both tiers, hit at the moment of CTA hesitation.
            Claims are all structurally true (no ad SDK, CSV/file export,
            data never sold). 'No trackers' is deliberately NOT claimed. */}
        <Animated.View style={{ opacity: fadeIn }}>
          <View
            style={styles.trustRow}
            accessible
            accessibilityLabel="Works fully offline. Your data exports anytime. No ads, ever."
          >
            <Ionicons name="cloud-offline-outline" size={13} color={colors.textMuted} importantForAccessibility="no" />
            <Text style={styles.trustText}>Works fully offline</Text>
            <Text style={styles.trustDot}>-</Text>
            <Ionicons name="download-outline" size={13} color={colors.textMuted} importantForAccessibility="no" />
            <Text style={styles.trustText}>Exports anytime</Text>
            <Text style={styles.trustDot}>-</Text>
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.textMuted} importantForAccessibility="no" />
            <Text style={styles.trustText}>No ads, ever</Text>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeIn }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Already have an account? Sign in"
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
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxl },

  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl },
  // Sized down so the wordmark reads as a brand mark, not a billboard.
  // Dialled from 200 to 150; at 200 it was still overpowering the Pro
  // card below; 150 keeps the brand visible without dominating.
  logoImg: { width: 150, height: Math.round(150 / HERO_ASPECT) },
  wordmark: {
    // eslint-disable-next-line no-restricted-syntax -- welcome hero title, intentional display size
    fontSize: 28, fontWeight: fontWeight.black, color: colors.textPrimary,
    letterSpacing: 0, marginTop: spacing.xs,
  },
  tagline: { fontSize: fontSize.sm, color: colors.textMuted, letterSpacing: 0 },

  cards: { gap: spacing.md },

  // Pro card. backgroundColor/borderRadius/padding now come from Card
  // (surface, radius="xl", padding="none"); borderWidth/borderColor stay
  // explicit because this card's accent border is solid primary, not
  // Card's tone (a translucent tint), and the shadow is unique to this
  // hero card so it isn't part of Card's own styling.
  proCard: {
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
  proSubtitle: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },

  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg },

  bullets: { padding: spacing.lg, gap: spacing.sm },
  bulletHeader: { ...type.caption, color: colors.textMuted, marginBottom: spacing.xxs },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bulletText: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },

  trialNote: {
    ...type.captionTight, color: colors.textMuted,
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  trustRow: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingHorizontal: spacing.lg,
  },
  trustText: { fontSize: fontSize.xs, color: colors.textMuted },
  trustDot: { fontSize: fontSize.xs, color: colors.textMuted },

  proCtaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, paddingVertical: spacing.md, margin: spacing.md,
    borderRadius: radius.lg,
  },
  proCtaText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.onPrimary },

  // Free card. backgroundColor/borderWidth/borderColor/padding now come
  // from Card's defaults (surface, 1px colors.border, spacing.lg); only
  // the radius="xl" override and this card's own gap stay local.
  freeCard: {
    gap: spacing.sm,
  },
  freeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  freeIconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  freeTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  freeSubtitle: { ...type.caption, color: colors.textMuted, marginTop: spacing.hair },
  freeBullets: { gap: spacing.xs, paddingLeft: spacing.xs },
  freeBulletText: { ...type.caption, color: colors.textMuted, flex: 1 },

  signInLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    minHeight: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  signInText: { fontSize: fontSize.sm, color: colors.textMuted },
  signInAction: { ...type.label, color: colors.textPrimary },


});
