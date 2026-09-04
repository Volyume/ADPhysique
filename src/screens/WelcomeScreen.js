import { useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, spacing, radius, type, motion } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Button from '../components/Button';
import useAppStore from '../store/useAppStore';
import { ONBOARDING_QUIZ_FIRST } from '../lib/onboarding/quizFlow';
import { TAGLINE } from '../lib/brand';
import { touchTarget } from '../styles/layout';

const HERO = require('../../assets/volyume-wordmark.png');
const HERO_ASPECT = 1032 / 277;

// First launch. Founder ruling 2026-09-04 on the device: the D137 layout
// (a mocked "example week" card built from the app's own components, under a
// two-fragment headline) read as a brochure with mismatched sizes, and the
// example carried invented numbers on the app's first screen. Now the screen
// is the wordmark, one plain sentence, one line that says what the product
// does, and one action. Nothing on it is a mock-up, and every size is a
// theme role: h2 for the headline (the wordmark is the hero, the headline
// supports it), body for the promise. No tier, no price, no trial (D137).
//
// Per IDENTITY_AND_OWNERSHIP_LOCKED.md decision 1: no anonymous mode. The
// one CTA routes to sign-up.

export default function WelcomeScreen({ navigation }) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
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

  function getStarted() {
    // COMP-030: when quiz-first is on, the CTA opens the pre-account quiz
    // (the plan takes shape before the account wall). Founder-flagged.
    if (ONBOARDING_QUIZ_FIRST) {
      navigation.navigate('QuizTraining');
      return;
    }
    // E-1 (D96): the intent is READ by LoginScreen, which opens in
    // create-account mode for it. The "Already have an account?" link below
    // navigates without it and opens sign-in.
    navigation.navigate('Login', { intent: 'pro_signup' });
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* The hero takes the free height above the actions, so the wordmark
            and the two lines sit in the upper half on every phone instead of
            being pushed about by whatever sits below them. */}
        <Animated.View style={[styles.hero, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Image source={HERO} style={styles.logoImg} resizeMode="contain" accessibilityLabel="Volyume" />
          <Text style={[styles.headline, live.headline]} accessibilityRole="header">{TAGLINE}</Text>
          <Text style={[styles.promise, live.promise]}>
            Volyume builds your training and food targets around you, then checks in each week and explains any change it suggests.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.actions, { opacity: fadeIn }]}>
          <Button variant="primary" size="lg" title="Get started" onPress={getStarted} accessibilityLabel="Get started" />
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

          {/* Trust row (COMP-012): one muted, non-interactive line, hit at the
              moment of CTA hesitation. Claims are all structurally true (no ad
              SDK, CSV/file export, data never sold). 'No trackers' is
              deliberately NOT claimed. */}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xxl },

  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  // The wordmark is the hero of this screen; the headline supports it, one
  // type role down from the mark's visual weight rather than shouting over it.
  logoImg: { width: 200, height: Math.round(200 / HERO_ASPECT), marginBottom: spacing.sm },
  headline: { ...type.h2, color: colors.textPrimary, textAlign: 'center' },
  promise: { ...type.body, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.sm },

  actions: { gap: spacing.md },
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

  trustRow: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingHorizontal: spacing.lg, marginTop: spacing.xs,
  },
  trustText: { fontSize: fontSize.xs, color: colors.textMuted },
  trustDot: { fontSize: fontSize.xs, color: colors.textMuted },
});

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays the
// base. This mirrors ONLY the colour/fontSize/type-bearing sub-properties of
// the matching frozen style, so the screen carries no static island under a
// live theme toggle. Pure layout keys are correctly omitted.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    headline: { ...t.type.h2, color: t.colors.textPrimary },
    promise: { ...t.type.body, color: t.colors.textSecondary },
    signInLink: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    signInText: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    signInAction: { ...t.type.label, color: t.colors.textPrimary },
    trustText: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    trustDot: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
  };
}
