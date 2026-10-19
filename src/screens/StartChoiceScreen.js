import { useEffect, useRef, useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import Text from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontWeight, spacing } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Button from '../components/Button';
import Card from '../components/Card';
import { useToast } from '../components/Toast';
import useAppStore from '../store/useAppStore';
import { loadDraft } from '../lib/proOnboardingDraft';
import { logError } from '../lib/errorLog';
import { hasChallengeActiveFlag } from '../lib/challenges/pending';
import { COACHING_NOTE } from '../lib/challenges/copy';

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
  // Gym challenge: set by the join screen. Only adds one line; nothing else
  // on this screen depends on it.
  const [inChallenge, setInChallenge] = useState(false);

  useEffect(() => {
    let alive = true;
    hasChallengeActiveFlag().then((on) => { if (alive) setInChallenge(!!on); }).catch(() => {});
    return () => { alive = false; };
  }, []);

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

        <Card tone="primary" style={styles.card}>
          <Text style={[t.type.caption, styles.badge, { color: t.colors.primary }]}>Recommended</Text>
          <Text style={[t.type.h3, { color: t.colors.textPrimary }]}>Set up coaching</Text>
          <Text style={[t.type.body, styles.point, { color: t.colors.textSecondary }]}>
            A plan built from your goal, schedule and equipment.
          </Text>
          <Text style={[t.type.body, styles.point, { color: t.colors.textSecondary }]}>
            Weekly volume and nutrition adjustments from your real progress.
          </Text>
          <Text style={[t.type.body, styles.point, { color: t.colors.textSecondary }]}>
            Everything is free.
          </Text>
          {inChallenge ? (
            <Text style={[t.type.body, styles.point, { color: t.colors.textSecondary }]}>
              {COACHING_NOTE}
            </Text>
          ) : null}
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
});
