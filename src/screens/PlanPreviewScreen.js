/**
 * COMP-030, the pre-account plan PREVIEW (Variant B, §4B step 4).
 *
 * The reveal-lite "built for me" moment: the deterministic plan shape derived
 * locally from the quiz answers, with the endowment effect doing the work at the
 * account wall ("Save your plan", never "sign up to continue"). No calories or
 * macros, the honesty note says they come after, with permission.
 */
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight, type, letterSpacing } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Button from '../components/Button';
import Card from '../components/Card';
import useAppStore from '../store/useAppStore';
import { buildPlanPreview } from '../lib/onboarding/planPreview';

export default function PlanPreviewScreen({ navigation }) {
  const quiz = useAppStore((s) => s.onboardingQuiz || {});
  const p = buildPlanPreview(quiz);
  // CP-10 batch D (2026-07-10): live theme (src/hooks/useTheme.js). See
  // buildLiveStyles header comment after the frozen `styles` block below.
  const t = useTheme();
  const live = buildLiveStyles(t);

  function toAccount() {
    // Route to the existing account wall; the post-account wizard reads the
    // quiz slice to prefill, so nothing is re-asked.
    navigation.navigate('Login');
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.kicker, live.kicker]}>YOUR PLAN</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.h1, live.h1]}>{p.headline}</Text>
        <Card style={styles.card}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.splitName, live.splitName]}>{p.splitName}</Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.structure, live.structure]}>{p.structure}</Text>
          {p.phaseLabel ? <Text maxFontSizeMultiplier={1.3} style={[styles.phase, live.phase]}>{`Built ${p.phaseLine}.`}</Text> : null}
        </Card>
        <Text maxFontSizeMultiplier={1.3} style={[styles.note, live.note]}>{p.nutritionNote}</Text>
      </ScrollView>

      <View style={[styles.footer, live.footer]}>
        <Button
          title="Create an account to keep it"
          onPress={toAccount}
          style={[styles.cta, live.cta]}
          textStyle={[styles.ctaText, live.ctaText]}
          accessibilityLabel="Create an account to keep your plan"
        />
        <Text maxFontSizeMultiplier={1.3} style={[styles.fine, live.fine]}>No payment card. Nothing charged unless you choose.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  kicker: { color: colors.textSecondary, fontSize: fontSize.sm, letterSpacing: letterSpacing.overline, fontWeight: fontWeight.semibold },
  h1: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: fontWeight.black, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: { gap: spacing.sm },
  splitName: { color: colors.primary, fontSize: fontSize.xl, fontWeight: fontWeight.heavy },
  structure: { ...type.body, color: colors.textPrimary },
  phase: { ...type.body, color: colors.textSecondary },
  note: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.lg },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  cta: { backgroundColor: colors.primaryFill, borderRadius: radius.lg, alignItems: 'center', paddingVertical: spacing.md, minHeight: 50, justifyContent: 'center' },
  ctaText: { color: colors.onPrimary, fontSize: fontSize.md, fontWeight: fontWeight.heavy },
  fine: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.sm },
});

// CP-10 batch D (2026-07-10): the frozen `styles` block above stays
// byte-identical. This mirrors ONLY the colour/fontSize/type-bearing
// sub-properties of the matching frozen style, at identical rest values, so
// this screen's tokens stay live under a theme/accessibility toggle. Pure
// layout keys (flex/gap/padding/width, no token) and static (non-theme)
// tokens like fontWeight/letterSpacing are correctly omitted -- there is
// nothing to unfreeze for them. Same pattern as LogCardioScreen.js's
// buildLiveStyles.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    kicker: { color: t.colors.textSecondary, fontSize: t.fontSize.sm },
    h1: { color: t.colors.textPrimary, fontSize: t.fontSize.xxl },
    splitName: { color: t.colors.primary, fontSize: t.fontSize.xl },
    structure: { ...t.type.body, color: t.colors.textPrimary },
    phase: { ...t.type.body, color: t.colors.textSecondary },
    note: { color: t.colors.textSecondary, fontSize: t.fontSize.sm },
    footer: { borderTopColor: t.colors.borderSubtle },
    cta: { backgroundColor: t.colors.primaryFill },
    ctaText: { color: t.colors.onPrimary, fontSize: t.fontSize.md },
    fine: { color: t.colors.textSecondary, fontSize: t.fontSize.sm },
  };
}
