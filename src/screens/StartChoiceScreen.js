import { useEffect, useRef, useState } from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import Text from '../components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, radius, fontFamily, fontWeight, withAlpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Button from '../components/Button';
import { VolyumeIcon } from '../components/BrandMark';
import * as haptics from '../lib/haptics';
import { useToast } from '../components/Toast';
import useAppStore from '../store/useAppStore';
import { loadDraft } from '../lib/proOnboardingDraft';
import { logError } from '../lib/errorLog';

// Founder brief 2026-10-19: coaching-first onboarding with an optional quick
// start. After the Article 9 consent gate the person chooses between the full
// coaching setup (recommended) and going straight to training.
//
// Founder, same day: "MATCH WHAT IS USED EVERYWHERE". This screen is laid out
// as a step of the onboarding wizard (ProOnboardingScreen): the brand row,
// the h2 step title and its sub line, the wizard's selectable option rows
// (the protein target options: label, Recommended badge, description, a tick
// when chosen), the "Still needed" hint and the wizard's Continue button.
// Every style value below is copied from that screen. Nothing is pre-selected
// (onboarding enforcement: a choice is explicit).

const OPTIONS = [
  {
    key: 'coaching',
    label: 'Set up coaching',
    recommended: true,
    desc: 'A plan built from your goal, schedule and equipment, adjusted each week from your real progress.',
  },
  {
    key: 'library',
    label: 'Pick a ready-made plan',
    desc: 'Start logging straight away. You can set up coaching any time from the Coach tab.',
  },
  {
    key: 'builder',
    label: 'Build my own',
    desc: 'Make your own plan and start logging. You can set up coaching any time from the Coach tab.',
  },
];

export default function StartChoiceScreen({ navigation }) {
  const t = useTheme();
  const toast = useToast();
  const userId = useAppStore((s) => s.user?.id);
  const busy = useRef(false);
  // Hold a blank screen until the draft check settles, so a person who already
  // chose coaching never sees the choice flash.
  const [checked, setChecked] = useState(false);
  const [choice, setChoice] = useState(null);
  const [attempted, setAttempted] = useState(false);

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

  function onContinue() {
    if (!choice) { setAttempted(true); haptics.error(); return; }
    if (choice === 'coaching') { navigation.replace('ProOnboarding'); return; }
    quickStart(choice === 'library' ? 'PlanLibrary' : 'ManualBuilder');
  }

  if (!checked) {
    return <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} />;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerBlock}>
          <View style={styles.brandRow}>
            <VolyumeIcon size={22} />
          </View>
          <Text style={[styles.stepTitle, { ...t.type.h2, color: t.colors.textPrimary }]} accessibilityRole="header">
            How do you want to start?
          </Text>
          <Text style={[styles.stepSub, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
            Coaching is free, like everything else in Volyume. You can change your mind later.
          </Text>
        </View>

        <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel="How do you want to start?">
          {OPTIONS.map((o) => {
            const active = choice === o.key;
            return (
              <TouchableOpacity
                key={o.key}
                style={[
                  styles.opt,
                  { backgroundColor: t.colors.surface, borderColor: t.colors.border },
                  active && { borderColor: t.colors.primary },
                ]}
                onPress={() => { haptics.selection(); setChoice(o.key); }}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${o.label}${o.recommended ? ', recommended' : ''}. ${o.desc}`}
                testID={`start-choice-${o.key}`}
              >
                <View style={styles.optCopy}>
                  <View style={styles.optTop}>
                    <Text style={[styles.optLabel, { ...t.type.bodyStrong, color: t.colors.textPrimary }]}>{o.label}</Text>
                    {o.recommended ? (
                      <View style={[styles.recBadge, { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, 0.188) }]}>
                        <Text style={[styles.recBadgeText, { fontSize: t.fontSize.micro, color: t.colors.primary }]}>Recommended</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.optDesc, { ...t.type.captionTight, color: t.colors.textSecondary }]}>{o.desc}</Text>
                </View>
                {active ? <Ionicons name="checkmark-circle" size={20} color={t.colors.primary} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {attempted && !choice ? (
          <Text style={[styles.continueHint, { ...t.type.caption, color: t.colors.textSecondary }]}>
            Still needed: choose how you want to start.
          </Text>
        ) : null}

        <Button
          title="Continue"
          trailingIcon="arrow-forward"
          style={styles.primaryBtn}
          onPress={onContinue}
          accessibilityLabel="Continue"
          testID="start-choice-continue"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// Copied from ProOnboardingScreen's styles (safe, scroll, headerBlock,
// brandRow, stepTitle, stepSub, section, proteinOptions, proteinOpt and its
// parts, recBadge, continueHint, primaryBtn) so this step and the wizard's
// steps cannot look different.
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  headerBlock: { marginBottom: spacing.lg },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  stepTitle: { marginBottom: spacing.sm },
  stepSub: { lineHeight: 20 },
  options: { gap: spacing.sm, marginBottom: spacing.xl },
  opt: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.md, borderWidth: 1.5, padding: spacing.md, minHeight: 64,
  },
  optCopy: { flex: 1, minWidth: 0 },
  optTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxs, flexWrap: 'wrap' },
  optLabel: {},
  optDesc: {},
  recBadge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 1, borderWidth: 1 },
  recBadgeText: { fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },
  continueHint: { textAlign: 'center', marginTop: -spacing.sm, marginBottom: spacing.md },
  primaryBtn: { borderRadius: radius.lg, paddingVertical: spacing.lg, marginBottom: spacing.md },
});
