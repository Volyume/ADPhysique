/**
 * COMP-030 — the pre-account plan PREVIEW (Variant B, §4B step 4).
 *
 * The reveal-lite "built for me" moment: the deterministic plan shape derived
 * locally from the quiz answers, with the endowment effect doing the work at the
 * account wall ("Save your plan", never "sign up to continue"). No calories or
 * macros — the honesty note says they come after, with permission.
 */
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight, type } from '../styles/theme';
import Card from '../components/Card';
import useAppStore from '../store/useAppStore';
import { buildPlanPreview } from '../lib/onboarding/planPreview';

export default function PlanPreviewScreen({ navigation }) {
  const quiz = useAppStore((s) => s.onboardingQuiz || {});
  const p = buildPlanPreview(quiz);

  function toAccount() {
    // Route to the existing account wall; the post-account wizard reads the
    // quiz slice to prefill, so nothing is re-asked.
    navigation.navigate('Login');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>YOUR PLAN</Text>
        <Text style={styles.h1}>{p.headline}</Text>
        <Card style={styles.card}>
          <Text style={styles.splitName}>{p.splitName}</Text>
          <Text style={styles.structure}>{p.structure}</Text>
          {p.phaseLabel ? <Text style={styles.phase}>{`Built ${p.phaseLine}.`}</Text> : null}
        </Card>
        <Text style={styles.note}>{p.nutritionNote}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cta} onPress={toAccount} accessibilityRole="button"
          accessibilityLabel="Create an account to keep your plan">
          <Text style={styles.ctaText}>Create an account to keep it</Text>
        </TouchableOpacity>
        <Text style={styles.fine}>No card. Nothing charged unless you choose.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  kicker: { color: colors.textSecondary, fontSize: fontSize.sm, letterSpacing: 1, fontWeight: fontWeight.semibold },
  h1: { color: colors.textPrimary, fontSize: fontSize.xxl, fontWeight: fontWeight.black, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: { gap: spacing.sm },
  splitName: { color: colors.primary, fontSize: fontSize.xl, fontWeight: fontWeight.heavy },
  structure: { ...type.body, color: colors.textPrimary },
  phase: { ...type.body, color: colors.textSecondary },
  note: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.lg },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  cta: { backgroundColor: colors.primary, borderRadius: radius.lg, alignItems: 'center', paddingVertical: spacing.md, minHeight: 50, justifyContent: 'center' },
  ctaText: { color: colors.onPrimary, fontSize: fontSize.md, fontWeight: fontWeight.heavy },
  fine: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.sm },
});
