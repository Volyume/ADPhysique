import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, spacing, radius, type } from '../styles/theme';
import Button from '../components/Button';
import useAppStore from '../store/useAppStore';
import { saveUserBodyProfile } from '../lib/database';

const SCOFF_QUESTIONS = [
  'Have you ever made yourself sick after eating because you felt uncomfortably full?',
  'Do you worry that you have lost control over how much you eat?',
  'Have you lost a significant amount of weight in the past three months?',
  'Do you think of yourself as overweight even when others say you are not?',
  'Would you say that thoughts about food take up a large part of your day?',
];

const ANSWERS_KEY = '@volyume_scoff_answers';

export default function WellbeingCheckScreen({ navigation }) {
  const { user, userProfile, saveLocalProfile } = useAppStore();
  const [answers, setAnswers] = useState([null, null, null, null, null]);
  const [saving, setSaving] = useState(false);

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
        await saveUserBodyProfile(user.id, { scoffScore: score }).catch(() => {});
      }
      if (score >= 2) {
        Alert.alert(
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
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Text style={styles.intro}>
          Five questions about your relationship with food and eating. Your answers are private, stored only on this device, and help shape how your coaching is approached.
        </Text>

        <View style={styles.list}>
          {SCOFF_QUESTIONS.map((q, i) => (
            <View key={i} style={styles.item}>
              <Text style={styles.question}>{q}</Text>
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.btn, answers[i] === true && styles.btnSelected]}
                  onPress={() => toggle(i, true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.btnText, answers[i] === true && styles.btnTextSelected]}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, answers[i] === false && styles.btnSelected]}
                  onPress={() => toggle(i, false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.btnText, answers[i] === false && styles.btnTextSelected]}>No</Text>
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

        <Text style={styles.privacy}>
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


  privacy: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
