import { useRef, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing, Image, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, spacing, radius, type, motion, withAlpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { VolyumeMark } from '../components/BrandMark';
import Button from '../components/Button';
import useAppStore from '../store/useAppStore';
import { ONBOARDING_QUIZ_FIRST } from '../lib/onboarding/quizFlow';
import { touchTarget } from '../styles/layout';
import AuthSheet from '../components/auth/AuthSheet';

// The product, as captured for the store listing (marketing/hq/assets/
// screenshots, resized to 480px wide for the bundle). Real screens, real
// states: Today, a set being logged, the day's nutrition. Nothing drawn.
const SHOTS = {
  today: require('../../assets/welcome/today.jpg'),
  workout: require('../../assets/welcome/workout.jpg'),
  nutrition: require('../../assets/welcome/nutrition.jpg'),
};
const SHOT_ASPECT = 709 / 1388; // width / height of the captures

// First launch. Founder spec 2026-09-04 (D145): premium, dark, product-led.
// A small brand mark, one benefit headline, one support line, then the
// product itself as the hero (three real captures with depth, fading into
// the page), the free truth in one quiet line, one primary action and a
// text sign-in. No paragraph, no mock-up, no tier, no price, no trial (D137).
//
// Sizes are chosen so nothing dices on a 360dp phone: the headline is the
// display face at the h2 size (about 24 characters a line, so the line
// breaks after "to"), the support line is body. The hero takes whatever
// height is left between the words and the actions, so the CTA is never
// below the fold and a tall phone gets a taller composition, not dead space.
//
// Per IDENTITY_AND_OWNERSHIP_LOCKED.md decision 1: no anonymous mode. The
// primary action routes to sign-up; the text action to sign-in.

export default function WelcomeScreen({ navigation, route }) {
  // D145 (third pass): the account step is a sheet over this screen. Get
  // started opens it in create-account mode, Sign in in sign-in mode; the
  // Login route arrives with `sheet` set so it opens at once.
  const [sheet, setSheet] = useState(route?.params?.sheet ?? null);
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  // The composition is sized from the height the words and the actions
  // leave, so it fills the viewport on a tall phone and shrinks on a short
  // one instead of leaving a dead band. Measured by onLayout; the initial
  // guesses keep the first frame close to the settled one.
  const [pageH, setPageH] = useState(windowHeight);
  const [wordsH, setWordsH] = useState(178);
  const [actionsH, setActionsH] = useState(166);

  const heroOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const heroY = useRef(new Animated.Value(reduceMotion ? 0 : 14)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: motion.hero, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(heroY, { toValue: 0, duration: motion.hero, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
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
    // E-1 (D96): the sheet opens in create-account mode; "Sign in" below
    // opens it in sign-in mode.
    setSheet('signup');
  }

  function closeSheet() {
    setSheet(null);
    // Arrived on the Login route from elsewhere in the app: closing the
    // sheet is the way back there, not a Welcome screen with nothing open.
    if (route?.params?.sheet && navigation?.canGoBack?.()) navigation.goBack();
  }

  // Composition: the main capture centred, two behind it at a smaller scale,
  // a little lower and turned a few degrees, so the three read as depth
  // rather than a row. The captures run past the hero's bottom edge and
  // fade into the page, so the composition sinks into the screen instead
  // of ending on a hard edge above the actions. The main capture is as
  // wide as the free height allows, capped at just over half the screen.
  const available = Math.max(160, pageH - wordsH - actionsH - spacing.xl);
  const phoneW = Math.min(Math.round(windowWidth * 0.55), Math.round((available / 0.9) * SHOT_ASPECT));
  const phoneH = Math.round(phoneW / SHOT_ASPECT);
  const heroH = Math.min(available, Math.round(phoneH * 0.9));
  const sideW = Math.round(phoneW * 0.84);
  const sideH = Math.round(sideW / SHOT_ASPECT);
  const sideOffset = Math.round(phoneW * 0.74);
  const sideDrop = Math.round(phoneH * 0.07);

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <View style={styles.page} onLayout={(e) => setPageH(Math.round(e.nativeEvent.layout.height))}>
        <View style={styles.words} onLayout={(e) => setWordsH(Math.round(e.nativeEvent.layout.height))}>
          <VolyumeMark size={24} />
          <Text style={[styles.headline, live.headline]} accessibilityRole="header">
            Everything you need to build your physique.
          </Text>
          <Text style={[styles.support, live.support]}>
            Training, nutrition, progress and coaching, connected in one app.
          </Text>
        </View>

        <View style={styles.spacer} />
        <Animated.View
          style={[styles.hero, { height: heroH, opacity: heroOpacity, transform: [{ translateY: heroY }] }]}
          accessible
          accessibilityRole="image"
          accessibilityLabel="Three screens from the app: today's session, a set being logged, and the day's nutrition"
        >
          <View style={[styles.shotFrame, live.shotFrame, styles.shotSide, {
            width: sideW, height: sideH, left: '50%', marginLeft: -Math.round(sideW / 2) - sideOffset, top: sideDrop,
            transform: [{ rotate: '-5deg' }],
          }]}>
            <Image source={SHOTS.nutrition} style={styles.shot} resizeMode="cover" />
          </View>
          <View style={[styles.shotFrame, live.shotFrame, styles.shotSide, {
            width: sideW, height: sideH, left: '50%', marginLeft: -Math.round(sideW / 2) + sideOffset, top: sideDrop,
            transform: [{ rotate: '5deg' }],
          }]}>
            <Image source={SHOTS.workout} style={styles.shot} resizeMode="cover" />
          </View>
          <View style={[styles.shotFrame, live.shotFrame, styles.shotMain, {
            width: phoneW, height: phoneH, left: '50%', marginLeft: -Math.round(phoneW / 2), top: 0,
          }]}>
            <Image source={SHOTS.today} style={styles.shot} resizeMode="cover" />
          </View>
          <LinearGradient
            colors={[withAlpha(t.colors.background, 0), t.colors.background]}
            locations={[0, 0.92]}
            style={styles.fade}
            pointerEvents="none"
          />
        </Animated.View>
        <View style={styles.spacer} />

        <View style={styles.actions} onLayout={(e) => setActionsH(Math.round(e.nativeEvent.layout.height))}>
          <Text style={[styles.free, live.free]}>Completely free · No ads</Text>
          <Button variant="emphatic" size="lg" title="Get started" onPress={getStarted} accessibilityLabel="Get started" />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Already have an account? Sign in"
            style={styles.signInLink}
            onPress={() => setSheet('signin')}
          >
            <Text style={[styles.signInText, live.signInText]}>
              Already have an account?
              <Text style={[styles.signInAction, live.signInAction]}> Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <AuthSheet
        visible={sheet != null}
        initialMode={sheet ?? 'signup'}
        onClose={closeSheet}
        navigation={navigation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1, paddingHorizontal: spacing.xl },

  words: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg },
  // The display face at the h2 size: strong without a 32px line that
  // cannot hold "Everything you need" on a 360dp phone.
  headline: {
    ...type.h1, fontSize: fontSize.xxl, lineHeight: Math.round(fontSize.xxl * 1.2),
    color: colors.textPrimary, textAlign: 'center', marginTop: spacing.sm,
  },
  support: { ...type.body, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.sm },

  // The two spacers split whatever height the composition does not need,
  // so it always sits centred between the words and the actions.
  spacer: { flex: 1 },
  hero: { marginTop: spacing.xl, marginHorizontal: -spacing.xl, overflow: 'hidden' },
  shotFrame: {
    position: 'absolute', borderRadius: radius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surface,
  },
  shotSide: { opacity: 0.72 },
  shotMain: { zIndex: 2, elevation: 2 },
  shot: { width: '100%', height: '100%' },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', zIndex: 3, elevation: 3 },

  actions: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.md },
  free: { ...type.label, color: colors.textSecondary, textAlign: 'center' },
  // A text action, not a second button: centred, with a full touch target.
  signInLink: { minHeight: touchTarget.minimum, alignItems: 'center', justifyContent: 'center' },
  signInText: { ...type.bodySm, color: colors.textSecondary, textAlign: 'center' },
  signInAction: { ...type.bodyStrong, fontSize: fontSize.sm, color: colors.primary },
});

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays the
// base. This mirrors ONLY the colour/fontSize/type-bearing sub-properties of
// the matching frozen style, so the screen carries no static island under a
// live theme toggle. Pure layout keys are correctly omitted.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    headline: {
      ...t.type.h1, fontSize: t.fontSize.xxl, lineHeight: Math.round(t.fontSize.xxl * 1.2),
      color: t.colors.textPrimary,
    },
    support: { ...t.type.body, color: t.colors.textSecondary },
    shotFrame: { borderColor: t.colors.borderSubtle, backgroundColor: t.colors.surface },
    free: { ...t.type.label, color: t.colors.textSecondary },
    signInText: { ...t.type.bodySm, color: t.colors.textSecondary },
    signInAction: { ...t.type.bodyStrong, fontSize: t.fontSize.sm, color: t.colors.primary },
  };
}
