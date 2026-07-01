import { useState, useRef, useEffect } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import Button from '../components/Button';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

// First-run for Free users only. Pro signups go through ProOnboardingStack
// (profile → training → recovery → plan + nutrition generation). Free gets
// name + units, then the FreeStarter micro-quiz (B2, founder decision 4a):
// three plain questions that install a beginner plan from the library, with
// a visible skip for anyone who'd rather choose their own.
export default function FirstRunScreen({ navigation }) {
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, units: _units, setUnits, userProfile, saveLocalProfile } = useAppStore(useShallow(s => ({
    user: s.user,
    units: s.units,
    setUnits: s.setUnits,
    userProfile: s.userProfile,
    saveLocalProfile: s.saveLocalProfile,
  })));
  // Gym weights are kg-only (UK). No unit choice.
  const localUnits = 'kg';
  const [firstName, setFirstName] = useState('');
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);
  const hasName = firstName.trim().length > 0;

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  async function finish() {
    if (!hasName) return;
    setBusy(true);
    try {
      if (setUnits) setUnits(localUnits);
      const merged = { ...(userProfile || {}), units: localUnits, firstName: firstName.trim() };
      if (user?.id) await saveLocalProfile(user.id, merged);
      // B2: hand over to the starter micro-quiz. It calls completeFirstRun
      // itself, after a plan is installed or the user skips.
      navigation.navigate('FreeStarter', { fromFirstRun: true });
      setBusy(false);
    } catch (e) {
      appAlert('Something went wrong', e?.message ?? 'Try again.');
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>You&apos;re almost set up.</Text>
        <Text style={styles.subtitle}>
          Just your name, then a few quick questions to get you set up.
        </Text>

        <Text style={styles.fieldLabel}>What should we call you?</Text>
        <TextInput
          ref={nameRef}
          style={[styles.input, hasName && styles.inputActive]}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={finish}
        />

        <Button
          title="Continue"
          trailingIcon="arrow-forward"
          size="lg"
          loading={busy}
          disabled={!hasName}
          onPress={finish}
        />

        <View style={styles.hintCard}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.hintText}>
            Next, three quick questions and we'll suggest a starter plan.{' '}
            Prefer to pick your own? You can <Text style={styles.hintBold}>skip</Text>{' '}
            and browse the library instead.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg, flexGrow: 1 },
  title: { ...type.h2, color: colors.textPrimary, marginTop: spacing.lg },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  fieldLabel: { ...type.label, color: colors.textSecondary, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.lg, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
  },
  inputActive: { borderColor: colors.primary },
  hintCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginTop: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  hintText: { flex: 1, fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 17 },
  hintBold: { color: colors.textPrimary, fontWeight: fontWeight.semibold },
});
