import { useState, useCallback } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, spacing, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { saveUserBodyProfile } from '../lib/database';
import { logError } from '../lib/errorLog';

const SCOFF_QUESTIONS = [
  'Have you ever made yourself sick after eating because you felt uncomfortably full?',
  'Do you worry that you have lost control over how much you eat?',
  'Have you lost a significant amount of weight in the past three months?',
  'Do you think of yourself as overweight even when others say you are not?',
  'Would you say that thoughts about food take up a large part of your day?',
];

const ANSWERS_KEY = '@volyume_scoff_answers';

export default function WellbeingCheckScreen({ navigation }) {
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, userProfile, saveLocalProfile } = useAppStore(useShallow(s => ({
    user: s.user,
    userProfile: s.userProfile,
    saveLocalProfile: s.saveLocalProfile,
  })));
  const [answers, setAnswers] = useState([null, null, null, null, null]);
  const [saving, setSaving] = useState(false);
  // CP-10 batch F (2026-07-11): live theme (src/hooks/useTheme.js). This
  // screen never renders a FlatList/FlashList/SectionList row (a single
  // ScrollView over a fixed 5-item .map), so an unmemoised call matches
  // AddCustomFoodScreen's own precedent (batch D). ED-SAFETY-ADJACENT:
  // theming only -- every string and the calm-mode/threshold logic below are
  // byte-identical; the selected/unselected colours here are a plain UI
  // selection indicator (same primary/primaryBg pair for either a "Yes" or
  // "No" tap), not a valence mapping, so they convert mechanically.
  const t = useTheme();
  const live = buildLiveStyles(t);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem(ANSWERS_KEY).then(raw => {
      try {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length === 5) {
          setAnswers(saved);
        }
      } catch (_) {}
    });
  }, []));

  const allAnswered = answers.every(a => a !== null);

  function toggle(index, value) {
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
  }

  async function handleSave() {
    if (!allAnswered || saving) return;
    setSaving(true);
    try {
      const score = answers.filter(a => a === true).length;
      await AsyncStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
      if (user?.id) {
        await saveLocalProfile(user.id, { ...(userProfile || {}), scoffScore: score });
        // SCOFF is a safety signal: the local profile write above is authoritative
        // for gating, but a swallowed cloud write left no trail (audit F-007). Log
        // the failure so a split-brain (UI says "noted" but the body-profile write
        // failed) is diagnosable. Still non-blocking: the local write governs.
        await saveUserBodyProfile(user.id, { scoffScore: score })
          .catch(e => logError('WellbeingCheck.saveScoffScore', e, { uid: user?.id }));
      }
      if (score >= 2) {
        appAlert(
          'Thank you for sharing that',
          "Some of your answers suggest it may be worth speaking to your GP or a registered dietitian alongside your training. We've noted this so your coaching focuses on performance and support rather than restriction.",
          [{ text: 'Got it', onPress: () => navigation.goBack() }],
        );
      } else {
        navigation.goBack();
      }
    } catch (_) {
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Wellbeing check" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Text style={[styles.intro, live.intro]}>
          Five questions about your relationship with food and eating. Your answers are private, stored only on this device, and help shape how your coaching is approached.
        </Text>

        <View style={styles.list}>
          {SCOFF_QUESTIONS.map((q, i) => (
            <View key={i} style={[styles.item, live.item]}>
              {/* AX-14 (launch accessibility audit): each question is a labelled
                  radiogroup with two mutually-exclusive radios, so a screen
                  reader hears the question as the group and each option as a
                  radio with a checked state -- instead of five identical
                  unqualified "Yes"/"No" buttons. The visible question is hidden
                  from assistive tech here because the radiogroup label already
                  carries it (otherwise it would be read twice). Answer/scoring
                  behaviour (toggle) is unchanged. */}
              <Text
                style={[styles.question, live.question]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {q}
              </Text>
              <View style={styles.btnRow} accessibilityRole="radiogroup" accessibilityLabel={q}>
                <TouchableOpacity
                  style={[styles.btn, live.btn, answers[i] === true && [styles.btnSelected, live.btnSelected]]}
                  onPress={() => toggle(i, true)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: answers[i] === true }}
                  accessibilityLabel="Yes"
                >
                  <Text style={[styles.btnText, live.btnText, answers[i] === true && [styles.btnTextSelected, live.btnTextSelected]]}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, live.btn, answers[i] === false && [styles.btnSelected, live.btnSelected]]}
                  onPress={() => toggle(i, false)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: answers[i] === false }}
                  accessibilityLabel="No"
                >
                  <Text style={[styles.btnText, live.btnText, answers[i] === false && [styles.btnTextSelected, live.btnTextSelected]]}>No</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <Button
          title="Save answers"
          size="lg"
          loading={saving}
          disabled={!allAnswered}
          onPress={handleSave}
        />

        {/* AX-14: Save is disabled until every question is answered. Without a
            visible reason a screen-reader user (and anyone) just meets a
            greyed-out button; this caption explains it and, as a polite live
            region, is announced when it appears/clears as answers change. */}
        {!allAnswered ? (
          <Text style={[styles.saveHint, live.saveHint]} accessibilityLiveRegion="polite">
            Answer all five questions to save.
          </Text>
        ) : null}

        <Text style={[styles.privacy, live.privacy]}>
          Your answers are stored on this device and never shared without your permission.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },

  intro: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  list: { gap: spacing.lg },

  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },

  question: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 22,
  },

  btnRow: { flexDirection: 'row', gap: spacing.md },

  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center',
  },
  btnSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  btnText: {
    ...type.label,
    color: colors.textMuted,
  },
  btnTextSelected: {
    color: colors.primary,
  },


  saveHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  privacy: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

// CP-10 batch F (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/gap/padding/borderWidth, no token) are correctly omitted --
// there is nothing to unfreeze for them. Same pattern as
// AddCustomFoodScreen.js's buildLiveStyles (batch D). ED-SAFETY-ADJACENT:
// btn/btnSelected/btnText/btnTextSelected are a plain selection indicator
// (identical pair for either answer), never an ED valence mapping -- see the
// comment at the useTheme() call site above.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    intro: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    item: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    question: { fontSize: t.fontSize.sm, color: t.colors.textPrimary },
    btn: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    btnSelected: { borderColor: t.colors.primary, backgroundColor: t.colors.primaryBg },
    btnText: { ...t.type.label, color: t.colors.textMuted },
    btnTextSelected: { color: t.colors.primary },
    saveHint: { fontSize: t.fontSize.xs, color: t.colors.textSecondary },
    privacy: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
  };
}
