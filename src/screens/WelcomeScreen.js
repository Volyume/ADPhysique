import { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import InfoTooltip from '../components/InfoTooltip';
import { GLOSSARY } from '../lib/coachGlossary';
import useAppStore from '../store/useAppStore';
import { usePlayPrices } from '../lib/payments/usePlayPrices';
import { ONBOARDING_QUIZ_FIRST } from '../lib/onboarding/quizFlow';

const HERO = require('../../assets/volyume-wordmark.png');
const HERO_ASPECT = 1032 / 277;

const FREE_BULLETS = [
  'Unlimited workout logging',
  'Exercise library and Personal Records',
  'Plan library and custom plan builder',
  'Training blocks and full progress stats',
];

const PRO_BULLETS = [
  'A plan built around your schedule, goals, and experience level',
  'Precision Coaching™ that adjusts your training and nutrition as your body responds',
  'Personalised calorie and protein targets, updated as your goals change',
  'After every check-in, your coach explains what changed and why.',
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
      Animated.timing(fadeIn, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per IDENTITY_AND_OWNERSHIP_LOCKED.md decision 1: no anonymous
  // mode. Both Free and Pro CTAs route to the sign-up flow. Free
  // users still get the Free tier, they just create a real account
  // first so their data is cloud-backed and cross-device safe by
  // construction. Tier flip happens post-auth via
  // LoginScreen.newAccountSetup (Pro) or the same flow defaulting to
  // Free if the user doesn't enable Pro.
  function chooseTier(tier) {
    // COMP-030: when quiz-first is on, the Pro CTA opens the pre-account quiz
    // (the plan takes shape before the account wall). Free path is unchanged,
    // and when the flag is off both CTAs route straight to sign-up as before.
    if (tier === 'pro' && ONBOARDING_QUIZ_FIRST) {
      navigation.navigate('QuizTraining');
      return;
    }
    navigation.navigate('Login', { intent: tier === 'pro' ? 'pro_signup' : 'free_signup' });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.hero, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Image source={HERO} style={styles.logoImg} resizeMode="contain" />
          <Text style={styles.tagline}>Less thinking. More lifting.</Text>
          {/* COMP-006: the methodology promise, a claim no competitor makes.
              Reads as a secondary caption beneath the brand tagline. */}
          <Text style={styles.identityLine}>Every change has a reason. Every non-change has a reason too.</Text>
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
                    <Text style={styles.betaBadgeText}>Free for 14 days</Text>
                  </View>
                </View>
                <Text style={styles.proSubtitle}>A coach that reads your training and adjusts your plan.</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.bullets}>
              <Text style={styles.bulletHeader}>Everything in Free, plus:</Text>
              {PRO_BULLETS.map(b => (
                <View key={b} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                  <Text style={styles.bulletText}>{b}</Text>
                  {/* U-E-1: inline gloss for the brand term on first appearance. */}
                  {b.includes('Precision Coaching™') && (
                    <InfoTooltip text={GLOSSARY.precisionCoaching} size={13} />
                  )}
                </View>
              ))}
            </View>

            <Text style={styles.trialNote}>
              {monthlyPrice
                ? `Plus a free week on Google Play when you subscribe. Then ${monthlyPrice} a month.`
                : 'Plus a free week on Google Play when you subscribe. Then a monthly subscription.'}
            </Text>

            <View style={styles.proCtaRow}>
              <Text style={styles.proCtaText}>Go Pro</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} />
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
                <Text style={styles.freeSubtitle}>Everything you need to log your training.</Text>
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
          </TouchableOpacity>
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
            <Text style={styles.trustDot}>·</Text>
            <Ionicons name="download-outline" size={13} color={colors.textMuted} importantForAccessibility="no" />
            <Text style={styles.trustText}>Exports anytime</Text>
            <Text style={styles.trustDot}>·</Text>
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.textMuted} importantForAccessibility="no" />
            <Text style={styles.trustText}>No ads, ever</Text>
          </View>
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
  identityLine: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', lineHeight: 16, paddingHorizontal: spacing.lg },

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
  betaBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.black, color: colors.onPrimary, letterSpacing: 0.5 },
  proSubtitle: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },

  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg },

  bullets: { padding: spacing.lg, gap: spacing.sm },
  bulletHeader: { ...type.caption, color: colors.textMuted, marginBottom: spacing.xxs },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bulletText: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },

  trialNote: {
    fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17,
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

  signInLink: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  signInText: { fontSize: fontSize.sm, color: colors.textMuted },
  signInAction: { ...type.label, color: colors.primary },


});
