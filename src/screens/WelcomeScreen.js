import { useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, spacing, radius, type, motion, fontFamily, fontWeight, withAlpha, alpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import InfoTooltip from '../components/InfoTooltip';
import Card from '../components/Card';
import Button from '../components/Button';
import BlockShapeCard from '../components/BlockShapeCard';
import { GLOSSARY } from '../lib/coachGlossary';
import useAppStore from '../store/useAppStore';
import { ONBOARDING_QUIZ_FIRST } from '../lib/onboarding/quizFlow';
import { touchTarget } from '../styles/layout';

const HERO = require('../../assets/volyume-wordmark.png');
const HERO_ASPECT = 1032 / 277;

// First launch (founder decision 2026-09-03: Volyume is a complete free
// product; D137). The screen answers "what is this, what will it do for me,
// what do I do next" by SHOWING the product rather than describing it: one
// headline, one line of promise, then an example week rendered from the
// app's own visual language (a planned session carrying last time's numbers,
// a coaching decision with its reason, and the training block), then one
// action. No tier, no price, no trial, no bullets to read. The example is
// labelled as an example and carries no real user data. The coach gloss
// stays on the first screen where the word is first met (C5-P34-01).
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
        <Animated.View style={[styles.hero, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Image source={HERO} style={styles.logoImg} resizeMode="contain" accessibilityLabel="Volyume" />
          <Text style={[styles.headline, live.headline]} accessibilityRole="header">Less thinking. More lifting.</Text>
          <Text style={[styles.promise, live.promise]}>A training plan, food targets and a weekly coach that adjust to what you log.</Text>
        </Animated.View>

        {/* The example week. Static, from the app's own components and
            tokens, so the first screen looks like the product it opens
            into rather than a brochure about it. */}
        <Animated.View style={[styles.previewWrap, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Card padding="none" surface="surfaceElevated" style={styles.preview}>
            <View style={styles.previewRow}>
              <Text style={[styles.overline, live.overline]}>Train</Text>
              <Text style={[styles.sessionName, live.sessionName]}>Upper body A</Text>
              <Text style={[styles.sessionMeta, live.sessionMeta]}>6 exercises</Text>
              <View style={[styles.lastRow, live.lastRow]}>
                <Ionicons name="time-outline" size={13} color={t.colors.textSecondary} importantForAccessibility="no" />
                <Text style={[styles.lastText, live.lastText]}>
                  <Text style={[styles.lastLabel, live.lastLabel]}>Last session: </Text>80 kg x 8
                </Text>
              </View>
            </View>

            <View style={[styles.previewDivider, live.previewDivider]} />

            <View style={styles.previewRow}>
              <Text style={[styles.overline, live.overline]}>Coach</Text>
              <View style={styles.coachRow}>
                <View style={[styles.coachIcon, live.coachIcon]}>
                  <Ionicons name="pulse" size={14} color={t.colors.primary} importantForAccessibility="no" />
                </View>
                <Text style={[styles.coachText, live.coachText]}>Targets adjusted from your weigh-ins. See why.</Text>
                {/* U-E-1 / C5-P34-01: the coach term is glossed where it is
                    first met, on the app's first screen. */}
                <InfoTooltip text={GLOSSARY.precisionCoaching} size={13} />
              </View>
            </View>

            <View style={[styles.previewDivider, live.previewDivider]} />

            <View style={styles.previewRow}>
              <Text style={[styles.overline, live.overline]}>Progress</Text>
              <BlockShapeCard weekIndex={3} plannedWeeks={5} compact />
            </View>
          </Card>
          <Text style={[styles.previewCaption, live.previewCaption]}>An example week. Yours is built around you.</Text>
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
        </Animated.View>

        {/* Trust row (COMP-012): one muted, non-interactive line, hit at the
            moment of CTA hesitation. Claims are all structurally true (no ad
            SDK, CSV/file export, data never sold). 'No trackers' is
            deliberately NOT claimed. */}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxl },

  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.lg },
  // Sized as a brand mark, not a billboard; the headline carries the screen.
  logoImg: { width: 132, height: Math.round(132 / HERO_ASPECT) },
  headline: { ...type.h1, color: colors.textPrimary, textAlign: 'center', marginTop: spacing.sm },
  promise: { ...type.body, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.md },

  previewWrap: { gap: spacing.sm },
  preview: { overflow: 'hidden' },
  previewRow: { padding: spacing.lg, gap: spacing.xs },
  previewDivider: { height: 1, backgroundColor: colors.border },
  overline: { ...type.overline, color: colors.textMuted, marginBottom: spacing.xxs },
  sessionName: { ...type.h3, color: colors.textPrimary },
  sessionMeta: { ...type.caption, color: colors.textMuted },
  lastRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start',
    marginTop: spacing.xs, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  lastText: { ...type.caption, color: colors.textPrimary, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },
  lastLabel: { color: colors.textSecondary, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular },
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  coachIcon: {
    width: 28, height: 28, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(colors.primary, alpha.edge),
  },
  coachText: { ...type.bodySm, color: colors.textPrimary, flex: 1 },
  previewCaption: { ...type.caption, color: colors.textMuted, textAlign: 'center' },

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
    gap: spacing.xs, paddingHorizontal: spacing.lg,
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
    headline: { ...t.type.h1, color: t.colors.textPrimary },
    promise: { ...t.type.body, color: t.colors.textSecondary },
    previewDivider: { backgroundColor: t.colors.border },
    overline: { ...t.type.overline, color: t.colors.textMuted },
    sessionName: { ...t.type.h3, color: t.colors.textPrimary },
    sessionMeta: { ...t.type.caption, color: t.colors.textMuted },
    lastRow: { backgroundColor: t.colors.surface2, borderColor: t.colors.borderSubtle },
    lastText: { ...t.type.caption, color: t.colors.textPrimary },
    lastLabel: { color: t.colors.textSecondary },
    coachIcon: { backgroundColor: withAlpha(t.colors.primary, alpha.edge) },
    coachText: { ...t.type.bodySm, color: t.colors.textPrimary },
    previewCaption: { ...t.type.caption, color: t.colors.textMuted },
    signInLink: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    signInText: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    signInAction: { ...t.type.label, color: t.colors.textPrimary },
    trustText: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    trustDot: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
  };
}
