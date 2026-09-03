import { useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, motion, shadow, fontFamily } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import InfoTooltip from '../components/InfoTooltip';
import Card from '../components/Card';
import Button from '../components/Button';
import { GLOSSARY } from '../lib/coachGlossary';
import { storeName } from '../lib/storeName';
import useAppStore from '../store/useAppStore';
import { usePlayPrices } from '../lib/payments/usePlayPrices';
import { ONBOARDING_QUIZ_FIRST } from '../lib/onboarding/quizFlow';
import { touchTarget } from '../styles/layout';

const HERO = require('../../assets/volyume-wordmark.png');
const HERO_ASPECT = 1032 / 277;

// OB-1 (founder decision 2026-07-02): Welcome is TRIAL-FIRST. The old
// Free/Pro pair was a dead control: both cards routed to the same sign-up
// (the intent param had no consumer) and every consenting new user starts
// the 14-day trial at Article 9 regardless. One honest CTA now says what
// actually happens, and the free tier is stated as what remains after the
// trial rather than sold as a competing choice.
const TRIAL_BULLETS = [
  'A plan built around your schedule, goals and experience.',
  'Calorie and protein targets that update as your body responds.',
  'A coach that explains every change, and why.',
];

export default function WelcomeScreen({ navigation }) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  // PLAY-002: show the active store's localised price, or drop the figure
  // until it loads. Never a hardcoded fallback.
  const priceFor = usePlayPrices();
  const monthlyPrice = priceFor('pro', 'monthly');
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);

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
    // E-1 (D96): the intent is READ now (LoginScreen opens its email form in
    // create-account mode for it), so the sign-up CTA no longer lands on a
    // form whose primary button says "Sign in". The "Already have an account?"
    // link below navigates without it and still opens sign-in.
    navigation.navigate('Login', { intent: 'pro_signup' });
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.hero, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Image source={HERO} style={styles.logoImg} resizeMode="contain" />
          <Text style={[styles.tagline, live.tagline]}>Less thinking. More lifting.</Text>
          <Text style={[styles.valueLine, live.valueLine]}>A training plan that adjusts to what you log.</Text>
        </Animated.View>

        <Animated.View style={[styles.cards, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

          {/* OB-1: the one trial card. Everyone starts with the full app for
              14 days; the CTA says exactly that. */}
          <Card radius="xl" padding="none" style={[styles.proCard, live.proCard]} onPress={startTrial}>
            <View style={styles.proCardHeader}>
              <View style={[styles.proIconWrap, live.proIconWrap]}>
                <Ionicons name="barbell-outline" size={20} color={t.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.proTitleRow}>
                  <Text style={[styles.proTitle, live.proTitle]}>The full app, free for 14 days</Text>
                </View>
              </View>
            </View>

            <View style={[styles.divider, live.divider]} />

            <View style={styles.bullets}>
              {TRIAL_BULLETS.map(b => (
                <View key={b} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={15} color={t.colors.primary} />
                  <Text style={[styles.bulletText, live.bulletText]}>{b}</Text>
                  {/* U-E-1: inline gloss for the coach term on first appearance.
                      C5-P34-01 (D96): the gate was `b.includes('Coach')` and
                      String.includes is case-sensitive, so the one bullet
                      carrying the word ("Your coach explains what changed...")
                      never matched and the gloss never rendered on the app's
                      first screen. Lower-cased comparison, same gloss, same
                      bullet, no copy change. */}
                  {b.toLowerCase().includes('coach') && (
                    <InfoTooltip text={GLOSSARY.precisionCoaching} size={13} />
                  )}
                </View>
              ))}
            </View>

            <Text style={[styles.trialNote, live.trialNote]}>
              {monthlyPrice
                ? `No payment card needed. After 14 days, Pro is ${monthlyPrice} a month on ${storeName()}, or you keep the free version.`
                : `No payment card needed. After 14 days you subscribe on ${storeName()}, or you keep the free version.`}
            </Text>

            <View style={styles.proCtaWrap}>
              <Button variant="primary" title="Start your 14 days" onPress={startTrial} accessibilityLabel="Start your 14 days" />
            </View>
          </Card>
        </Animated.View>

        {/* OB-1: the free tier stated honestly as what remains after the
            trial, in place of the old second "free version" card.
            Informational, not a competing choice (the old Free CTA was a
            dead control: it routed to the identical sign-up). */}
        <Animated.View style={{ opacity: fadeIn }}>
          <Text style={[styles.freeNote, live.freeNote]}>
            The free version stays yours after the trial, no card and no time limit: workout logging, exercise library and records, plans and progress stats.
          </Text>
        </Animated.View>

        {/* Trust row (COMP-012): one muted, non-interactive line that
            applies to both tiers, hit at the moment of CTA hesitation.
            Claims are all structurally true (no ad SDK, CSV/file export,
            data never sold). 'No trackers' is deliberately NOT claimed. */}
        <Animated.View style={{ opacity: fadeIn }}>
          <View
            style={styles.trustRow}
            accessible
            accessibilityLabel="Works fully offline. Your data exports anytime. No ads."
          >
            <Ionicons name="cloud-offline-outline" size={13} color={t.colors.textMuted} importantForAccessibility="no" />
            <Text style={[styles.trustText, live.trustText]}>Works fully offline</Text>
            <Text style={[styles.trustDot, live.trustDot]}>-</Text>
            <Ionicons name="download-outline" size={13} color={t.colors.textMuted} importantForAccessibility="no" />
            <Text style={[styles.trustText, live.trustText]}>Exports anytime</Text>
            <Text style={[styles.trustDot, live.trustDot]}>-</Text>
            <Ionicons name="shield-checkmark-outline" size={13} color={t.colors.textMuted} importantForAccessibility="no" />
            <Text style={[styles.trustText, live.trustText]}>No ads</Text>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeIn }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Already have an account? Sign in"
            style={[styles.signInLink, live.signInLink]}
            onPress={() => navigation.navigate('Login')}
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          >
            <Text style={[styles.signInText, live.signInText]}>Already have an account?</Text>
            <Text style={[styles.signInAction, live.signInAction]}> Sign in</Text>
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
    fontSize: 28, fontFamily: fontFamily.heavy, fontWeight: fontWeight.black, color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  tagline: { fontSize: fontSize.sm, color: colors.textMuted },
  valueLine: { ...type.bodySm, color: colors.textSecondary, textAlign: 'center' },

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
    ...shadow.glow,
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
  proTitle: { fontSize: fontSize.lg, fontFamily: fontFamily.heavy, fontWeight: fontWeight.black, color: colors.textPrimary },

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

  proCtaWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },

  // Muted caption stating the free tier stays, in place of the old second
  // "free version" card (OB-1: informational, not a competing choice).
  freeNote: {
    ...type.bodySm, color: colors.textSecondary, textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },

  signInLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    minHeight: touchTarget.minimum,
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

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/gap/padding/width/borderRadius/borderWidth, no token) are
// correctly omitted -- there is nothing to unfreeze for them. Same pattern
// as ConsistencyScreen.js's buildLiveStyles (batch F).
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    // wordmark's fontSize is a raw display literal in the frozen block
    // (intentional hero size, theme-invariant) -- only its ink is mirrored.
    wordmark: { color: t.colors.textPrimary },
    tagline: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    valueLine: { ...t.type.bodySm, color: t.colors.textSecondary },
    proCard: { borderColor: t.colors.primary },
    proIconWrap: { backgroundColor: t.colors.primaryBg },
    proTitle: { fontSize: t.fontSize.lg, color: t.colors.textPrimary },
    divider: { backgroundColor: t.colors.border },
    bulletText: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    trialNote: { ...t.type.captionTight, color: t.colors.textMuted },
    trustText: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    trustDot: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    freeNote: { ...t.type.bodySm, color: t.colors.textSecondary },
    signInLink: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    signInText: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    signInAction: { ...t.type.label, color: t.colors.textPrimary },
  };
}
