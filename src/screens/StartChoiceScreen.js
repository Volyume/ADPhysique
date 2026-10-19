import { useEffect, useRef, useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Text from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontWeight, spacing, radius, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Button from '../components/Button';
import Card from '../components/Card';
import { useToast } from '../components/Toast';
import useAppStore from '../store/useAppStore';
import { loadDraft } from '../lib/proOnboardingDraft';
import { logError } from '../lib/errorLog';

// Founder brief 2026-10-19: coaching-first onboarding with an optional quick
// start. After the Article 9 consent gate the person chooses between the full
// coaching setup (recommended) and going straight to training.

export default function StartChoiceScreen({ navigation }) {
  const t = useTheme();
  const toast = useToast();
  const userId = useAppStore((s) => s.user?.id);
  const busy = useRef(false);
  // Hold a blank screen until the draft check settles, so a person who already
  // chose coaching never sees the choice flash.
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const draft = userId ? await loadDraft(userId) : null;
        const hasAnswers = !!draft && draft.answers && Object.keys(draft.answers).length > 0;
        if (cancelled) return;
        if (hasAnswers) { navigation.replace('ProOnboarding'); return; }
      } catch (e) {
        logError('StartChoiceScreen.resume', e);
      }
      if (!cancelled) setChecked(true);
    })();
    return () => { cancelled = true; };
  }, [userId, navigation]);

  async function quickStart(openRoute) {
    if (busy.current) return;
    busy.current = true;
    try {
      const store = useAppStore.getState();
      const uid = store.user?.id;
      await store.saveLocalProfile(uid, { ...(store.userProfile || {}), coachingDeferred: true });
      store.setPostSetupLanding('PlansTab');
      store.setPostSetupOpen(openRoute);
      await store.completeFirstRun();
    } catch (e) {
      logError('StartChoiceScreen.quickStart', e);
      toast.show('That did not go through. Try again in a moment.', { variant: 'error' });
      busy.current = false;
    }
  }

  if (!checked) {
    return <SafeAreaView style={[styles.container, { backgroundColor: t.colors.background }]} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[t.type.h1, { color: t.colors.textPrimary }]} accessibilityRole="header">
          How would you like to start?
        </Text>
        <Text style={[t.type.body, styles.lead, { color: t.colors.textSecondary }]}>
          You can change your mind later.
        </Text>

        {/* Founder brief 2026-10-19: say plainly that everything is free. The
            app's note pattern (PlanRebuildNote): a plain card, an icon tile,
            a title and a supporting line, in full sentences. */}
        <Card style={styles.card} testID="start-choice-free">
          <View style={styles.noteHead}>
            <View style={[styles.noteIcon, { backgroundColor: t.colors.primaryBg }]}>
              <Ionicons name="lock-open-outline" size={iconSize.md} color={t.colors.primary} />
            </View>
            <View style={styles.noteCopy}>
              <Text style={[t.type.h3, { color: t.colors.textPrimary }]}>The whole app is free</Text>
              <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>
                Coaching, food logging, meal plans and Community are all included. There is no paid version and there are no adverts.
              </Text>
            </View>
          </View>
        </Card>

        <Card tone="primary" style={styles.card}>
          <Text style={[t.type.caption, styles.badge, { color: t.colors.primary }]}>Recommended</Text>
          <Text style={[t.type.h3, { color: t.colors.textPrimary }]}>Set up coaching</Text>
          <Text style={[t.type.body, styles.point, { color: t.colors.textSecondary }]}>
            A plan built from your goal, schedule and equipment.
          </Text>
          <Text style={[t.type.body, styles.point, { color: t.colors.textSecondary }]}>
            Weekly volume and nutrition adjustments from your real progress.
          </Text>
          <Button
            title="Set up coaching"
            onPress={() => navigation.replace('ProOnboarding')}
            accessibilityLabel="Set up coaching. Recommended."
            style={styles.cta}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={[t.type.h3, { color: t.colors.textPrimary }]}>Start training now</Text>
          <Text style={[t.type.body, styles.point, { color: t.colors.textSecondary }]}>
            Pick a ready-made plan or build your own and start logging. You can set up coaching any time.
          </Text>
          <Button
            title="Pick a ready-made plan"
            variant="secondary"
            onPress={() => quickStart('PlanLibrary')}
            accessibilityLabel="Pick a ready-made plan and start training"
            style={styles.cta}
          />
          <Button
            title="Build my own"
            variant="secondary"
            onPress={() => quickStart('ManualBuilder')}
            accessibilityLabel="Build my own plan and start training"
            style={styles.ctaGap}
          />
        </Card>

        <Text style={[t.type.caption, styles.reassure, { color: t.colors.textSecondary }]}>
          Coaching is one tap away later, on the Coach and Nutrition tabs.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  lead: { marginTop: spacing.sm, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  badge: { fontWeight: fontWeight.semibold, marginBottom: spacing.xs },
  point: { marginTop: spacing.sm },
  cta: { marginTop: spacing.md },
  ctaGap: { marginTop: spacing.sm },
  reassure: { marginTop: spacing.sm, textAlign: 'center' },
  noteHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  noteIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  noteCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
});
